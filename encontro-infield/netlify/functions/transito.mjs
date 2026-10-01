// Trânsito aeroporto → hotel (TomTom Routing API, tráfego ao vivo).
// A chave fica só no servidor (env TOMTOM_API_KEY). A resposta é cacheada
// no CDN da Netlify por 10 min: o volume de chamadas à TomTom independe do
// número de participantes (~290/dia para 2 trajetos).

const HOTEL = { lat: -23.0045, lon: -43.3187 }; // Grand Hyatt · Barra da Tijuca

const ROUTES = [
  { code: 'GIG', lat: -22.8099, lon: -43.2506 }, // Galeão (Terminal 2)
  { code: 'SDU', lat: -22.9105, lon: -43.1631 }, // Santos Dumont
];

const CACHE_SECONDS = 600;

// Atraso total → nível do trajeto
function routeLevel(travel, free) {
  const ratio = free > 0 ? travel / free : 1;
  if (ratio < 1.15) return 'ok';
  if (ratio < 1.4) return 'mid';
  return 'bad';
}

// magnitudeOfDelay da TomTom: 0 desconhecido · 1 leve · 2 moderado · 3 intenso · 4 via bloqueada
function sectionLevel(section) {
  const m = section.magnitudeOfDelay;
  if (m >= 3) return 'bad';
  if (m >= 1 || section.simpleCategory === 'JAM') return 'mid';
  return 'ok';
}

function distance(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// Converte as seções de tráfego em trechos proporcionais à distância (para a barra do widget)
function buildSegments(route) {
  const points = route.legs.flatMap((leg) => leg.points);
  if (points.length < 2) return [];
  const levels = new Array(points.length - 1).fill('ok');
  for (const s of route.sections || []) {
    if (s.sectionType !== 'TRAFFIC') continue;
    const lv = sectionLevel(s);
    for (let i = s.startPointIndex; i < s.endPointIndex && i < levels.length; i++) levels[i] = lv;
  }
  const segments = [];
  let total = 0;
  levels.forEach((lv, i) => {
    const d = distance(points[i], points[i + 1]);
    total += d;
    const last = segments[segments.length - 1];
    if (last && last.level === lv) last.share += d;
    else segments.push({ level: lv, share: d });
  });
  return segments
    .map((s) => ({ level: s.level, share: +(s.share / total).toFixed(4) }))
    .filter((s) => s.share >= 0.01);
}

async function fetchRoute(origin, key) {
  const path = `${origin.lat},${origin.lon}:${HOTEL.lat},${HOTEL.lon}`;
  const params = new URLSearchParams({
    key,
    traffic: 'true',
    travelMode: 'car',
    routeType: 'fastest',
    computeTravelTimeFor: 'all',
    sectionType: 'traffic',
  });
  const res = await fetch(`https://api.tomtom.com/routing/1/calculateRoute/${path}/json?${params}`);
  if (!res.ok) throw new Error(`TomTom ${origin.code}: HTTP ${res.status}`);
  const route = (await res.json()).routes[0];
  const { travelTimeInSeconds: travel, noTrafficTravelTimeInSeconds: free } = route.summary;
  return {
    code: origin.code,
    minutes: Math.round(travel / 60),
    normalMin: Math.round(free / 60),
    delayMin: Math.max(0, Math.round((travel - free) / 60)),
    level: routeLevel(travel, free),
    segments: buildSegments(route),
  };
}

export default async () => {
  const key = process.env.TOMTOM_API_KEY;
  if (!key) {
    return Response.json({ error: 'TOMTOM_API_KEY não configurada' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const routes = await Promise.all(ROUTES.map((r) => fetchRoute(r, key)));
    return Response.json({ updated: new Date().toISOString(), routes }, {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Netlify-CDN-Cache-Control': `public, durable, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=120`,
      },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Trânsito indisponível' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
};

export const config = { path: '/api/transito' };
