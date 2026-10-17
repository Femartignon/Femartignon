// Status dos voos do grupo (AviationStack). GET /api/voos
// GET /api/voos?chegadas=1 -> chegadas reais em voo agora para GIG e SDU (modo ao vivo, sem planilha).
// - Lista de voos: /data/voos.json (gerado a partir da planilha Excel final).
// - Chave só no servidor: env AVIATIONSTACK_API_KEY.
// - Plano gratuito: 100 consultas/mês e sem HTTPS -> 1 consulta por aeroporto de destino,
//   resposta cacheada no CDN por 30 min (o volume independe do nº de participantes).

const API = 'http://api.aviationstack.com/v1/flights';
const CACHE_SECONDS = 1800;

const json = (body, status = 200, cache = 'no-store') =>
  Response.json(body, {
    status,
    headers: cache === 'no-store'
      ? { 'Cache-Control': 'no-store' }
      : { 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': cache },
  });

// A AviationStack devolve o horário local do aeroporto marcado como UTC: usar HH:MM literal.
const hhmm = (iso) => (iso && iso.length >= 16 ? iso.slice(11, 16) : null);

function statusText(f) {
  const arr = f.arrival || {};
  switch (f.flight_status) {
    case 'landed':    return { codigo: 'pousou',   texto: `pousou ${hhmm(arr.actual) || hhmm(arr.estimated) || ''}`.trim() };
    case 'active':    return { codigo: 'em_voo',   texto: `em voo · previsão ${hhmm(arr.estimated) || hhmm(arr.scheduled) || ''}`.trim() };
    case 'cancelled': return { codigo: 'cancelado', texto: 'cancelado' };
    case 'diverted':  return { codigo: 'desviado', texto: 'desviado' };
    case 'scheduled':
      return arr.delay > 0
        ? { codigo: 'atrasado', texto: `atrasado ${arr.delay} min` }
        : { codigo: 'no_horario', texto: `no horário · ${hhmm(arr.scheduled) || ''}`.trim() };
    default:          return { codigo: 'sem_info', texto: 'sem informação' };
  }
}

// Terminal e portão de desembarque, quando a API informa (SDU não tem terminais numerados).
const desembarque = (f) => ({ terminal: (f.arrival && f.arrival.terminal) || null, portao: (f.arrival && f.arrival.gate) || null });

async function arrivals(iata, key, extra = {}) {
  const params = new URLSearchParams({ access_key: key, arr_iata: iata, limit: '100', ...extra });
  const res = await fetch(`${API}?${params}`);
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(`AviationStack ${iata}: ${body.error ? body.error.code || body.error.message : res.status}`);
  return body.data || [];
}

const CHEGADAS_DESTINOS = ['GIG', 'SDU'];
const CHEGADAS_MAX = 10;
const eta = (f) => (f.arrival && (f.arrival.estimated || f.arrival.scheduled)) || '';

// Modo ao vivo: voos em voo agora com destino GIG/SDU, ordenados pela previsão de chegada (sem codeshare duplicado).
async function chegadas(key) {
  const listas = await Promise.all(CHEGADAS_DESTINOS.map((d) => arrivals(d, key, { flight_status: 'active' })));
  return listas.flat()
    .filter((f) => f.flight && f.flight.iata && !f.flight.codeshared)
    .sort((a, b) => eta(a).localeCompare(eta(b)))
    .slice(0, CHEGADAS_MAX)
    .map((f) => ({
      voo: f.flight.iata, cia: f.airline && f.airline.name,
      origem: f.departure && f.departure.iata, destino: f.arrival && f.arrival.iata, ...statusText(f), ...desembarque(f),
    }));
}

export default async (req) => {
  const key = process.env.AVIATIONSTACK_API_KEY;
  if (new URL(req.url).searchParams.has('chegadas')) {
    if (!key) return json({ ok: false, erro: 'AVIATIONSTACK_API_KEY não configurada', voos: [] }, 500);
    try {
      return json({ ok: true, atualizado: new Date().toISOString(), voos: await chegadas(key), amostra: [] }, 200,
        `public, durable, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=300`);
    } catch (err) {
      console.error(err);
      return json({ ok: false, erro: String(err.message || err), voos: [] }, 502);
    }
  }
  let lista;
  try {
    lista = await (await fetch(new URL('/data/voos.json', req.url))).json();
  } catch {
    return json({ ok: false, erro: 'lista de voos não encontrada', voos: [] }, 500);
  }
  if (!key) return json({ ok: false, erro: 'AVIATIONSTACK_API_KEY não configurada', voos: [] }, 500);

  try {
    const destinos = [...new Set(lista.voos.map((v) => v.destino))];
    const porDestino = Object.fromEntries(await Promise.all(destinos.map(async (d) => [d, await arrivals(d, key)])));

    const voos = lista.voos.map((v) => {
      const f = (porDestino[v.destino] || []).find((x) => x.flight && x.flight.iata === v.voo);
      return { ...v, ...(f ? { ...statusText(f), ...desembarque(f) } : { codigo: 'sem_info', texto: `previsto ${v.horario_chegada}` }) };
    });

    // Modo teste: inclui 3 chegadas reais do momento, para provar que a integração funciona.
    const amostra = lista.modo_teste
      ? Object.values(porDestino).flat().filter((f) => f.flight && f.flight.iata).slice(0, 3).map((f) => ({
          voo: f.flight.iata, origem: f.departure && f.departure.iata, destino: f.arrival && f.arrival.iata, ...statusText(f),
        }))
      : [];

    return json({ ok: true, atualizado: new Date().toISOString(), voos, amostra }, 200,
      `public, durable, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=300`);
  } catch (err) {
    console.error(err);
    return json({ ok: false, erro: String(err.message || err), voos: [] }, 502);
  }
};

export const config = { path: '/api/voos' };
