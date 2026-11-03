// Encontro Infield 2026 · dados ao vivo no servidor (funções Vercel e Netlify).
// Sem dependências. As chaves ficam em variáveis de ambiente, nunca no navegador.
//   /api/aeroportos  METAR oficial do Galeão (SBGL) e do Santos Dumont (SBRJ) via aviationweather.gov
//   /api/transito    tempo de rota com trânsito (TomTom), só quando TOMTOM_KEY estiver configurada
// O CDN guarda as respostas (CDN-Cache-Control): 247 participantes geram poucas chamadas às fontes.

const UA = 'EncontroInfield2026/1.0 (pagina interna do evento)';

export const AIRPORTS = [
  { iata: 'GIG', icao: 'SBGL', name: 'Galeão', lat: -22.8099, lon: -43.2505 },
  { iata: 'SDU', icao: 'SBRJ', name: 'Santos Dumont', lat: -22.9105, lon: -43.1631 },
];
const HOTEL_QUERY = 'Avenida Lúcio Costa 9600, Barra da Tijuca, Rio de Janeiro';
const HOTEL_FALLBACK = { lat: -23.011, lon: -43.4 };

export function json(body, { status = 200, cdnSeconds = 300, browserSeconds = 60 } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${browserSeconds}`,
      'cdn-cache-control': `public, s-maxage=${cdnSeconds}, stale-while-revalidate=${cdnSeconds * 3}`,
      'x-content-type-options': 'nosniff',
    },
  });
}

async function getJSON(url, { timeout = 8000, headers = {} } = {}) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', ...headers }, signal: AbortSignal.timeout(timeout) });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${new URL(url).host}`);
  return res.json();
}

/* ------------------------------------------------------------------ METAR */

function parseVisibility(v) {
  if (v == null || v === '') return { sm: null, plus: false };
  const s = String(v).trim();
  const plus = s.endsWith('+');
  const n = Number.parseFloat(s.replace('+', ''));
  return { sm: Number.isFinite(n) ? n : null, plus };
}

function ceilingFt(clouds, vertVis) {
  const layers = (Array.isArray(clouds) ? clouds : [])
    .filter((c) => ['BKN', 'OVC', 'OVX', 'VV'].includes(String(c.cover).toUpperCase()) && Number.isFinite(Number(c.base)))
    .map((c) => Number(c.base));
  if (Number.isFinite(Number(vertVis))) layers.push(Number(vertVis) * (Number(vertVis) < 100 ? 100 : 1));
  return layers.length ? Math.min(...layers) : null;
}

/** Categoria de voo (critério FAA usado pelo aviationweather.gov). */
export function flightCategory(visSm, ceilFt) {
  const v = visSm ?? Infinity;
  const c = ceilFt ?? Infinity;
  if (c < 500 || v < 1) return 'LIFR';
  if (c < 1000 || v < 3) return 'IFR';
  if (c <= 3000 || v <= 5) return 'MVFR';
  return 'VFR';
}

function observedAt(m) {
  if (Number.isFinite(Number(m.obsTime))) return new Date(Number(m.obsTime) * 1000).toISOString();
  const t = Date.parse(m.reportTime ?? m.receiptTime ?? '');
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function normalizeMetar(m, airport) {
  if (!m) return { ...airport, available: false };
  const { sm, plus } = parseVisibility(m.visib);
  const ceil = ceilingFt(m.clouds, m.vertVis);
  const cavok = (Array.isArray(m.clouds) ? m.clouds : []).some((c) => String(c.cover).toUpperCase() === 'CAVOK') || /\bCAVOK\b/.test(m.rawOb ?? '');
  const category = ['VFR', 'MVFR', 'IFR', 'LIFR'].includes(m.fltCat) ? m.fltCat : flightCategory(sm, ceil);
  return {
    ...airport,
    available: true,
    category,
    visibilityKm: sm == null ? null : Math.round(sm * 1.609344 * 10) / 10,
    visibility10Plus: cavok || (plus && sm >= 6),
    ceilingFt: ceil,
    windDir: m.wdir ?? null,
    windKt: Number.isFinite(Number(m.wspd)) ? Number(m.wspd) : null,
    gustKt: Number.isFinite(Number(m.wgst)) ? Number(m.wgst) : null,
    tempC: Number.isFinite(Number(m.temp)) ? Number(m.temp) : null,
    weather: m.wxString || null,
    observed: observedAt(m),
    raw: m.rawOb ?? null,
  };
}

export async function airportsResponse() {
  try {
    const ids = AIRPORTS.map((a) => a.icao).join(',');
    const list = (await getJSON(`https://aviationweather.gov/api/data/metar?ids=${ids}&format=json`)) ?? [];
    const byId = new Map((Array.isArray(list) ? list : []).map((m) => [m.icaoId, m]));
    return json({ source: 'METAR · aviationweather.gov', fetched: new Date().toISOString(), airports: AIRPORTS.map((a) => normalizeMetar(byId.get(a.icao), a)) }, { cdnSeconds: 300 });
  } catch (err) {
    return json({ error: 'metar_indisponivel', detail: String(err.message ?? err) }, { status: 502, cdnSeconds: 30, browserSeconds: 0 });
  }
}

/* ------------------------------------------------------------------ Trânsito (TomTom) */

let hotelCache = null;

async function hotelPosition(key) {
  if (hotelCache) return hotelCache;
  try {
    const q = encodeURIComponent(HOTEL_QUERY);
    const r = await getJSON(`https://api.tomtom.com/search/2/geocode/${q}.json?key=${key}&countrySet=BR&limit=1&language=pt-BR`);
    const pos = r?.results?.[0]?.position;
    hotelCache = pos && Number.isFinite(pos.lat) ? { lat: pos.lat, lon: pos.lon, geocoded: true } : { ...HOTEL_FALLBACK, geocoded: false };
  } catch {
    hotelCache = { ...HOTEL_FALLBACK, geocoded: false };
  }
  return hotelCache;
}

export function normalizeRoute(airport, summary) {
  if (!summary) return { iata: airport.iata, name: airport.name, available: false };
  const travel = Number(summary.travelTimeInSeconds);
  const delay = Number(summary.trafficDelayInSeconds) || 0;
  const free = Number(summary.noTrafficTravelTimeInSeconds) || Math.max(travel - delay, 1);
  const ratio = travel / free;
  return {
    iata: airport.iata,
    name: airport.name,
    available: true,
    minutes: Math.round(travel / 60),
    delayMinutes: Math.round(delay / 60),
    km: Math.round(Number(summary.lengthInMeters) / 100) / 10,
    level: ratio >= 1.6 ? 'intenso' : ratio >= 1.25 ? 'moderado' : 'fluido',
  };
}

export async function trafficResponse(env = process.env) {
  const key = env.TOMTOM_KEY;
  if (!key) return json({ configured: false }, { cdnSeconds: 3600 });
  try {
    const hotel = await hotelPosition(key);
    const routes = await Promise.all(AIRPORTS.map(async (a) => {
      try {
        const path = `${a.lat},${a.lon}:${hotel.lat},${hotel.lon}`;
        const r = await getJSON(`https://api.tomtom.com/routing/1/calculateRoute/${path}/json?key=${key}&traffic=true&travelMode=car&routeType=fastest&computeTravelTimeFor=all`);
        return normalizeRoute(a, r?.routes?.[0]?.summary);
      } catch {
        return normalizeRoute(a, null);
      }
    }));
    return json({ configured: true, source: 'TomTom Traffic', fetched: new Date().toISOString(), routes }, { cdnSeconds: 180 });
  } catch (err) {
    return json({ configured: true, error: 'transito_indisponivel', detail: String(err.message ?? err) }, { status: 502, cdnSeconds: 30, browserSeconds: 0 });
  }
}
