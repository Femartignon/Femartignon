/* Camada de dados do Meu Voo: leitura do fragmento do link, normalização e modelo da viagem.
   Mesmo código da v0.5.0 (fonte/src/meu-voo.js), sem a parte de tela. */
const DAY = 864e5;
const HOUR = 36e5;
const MIN = 6e4;
const WD_SHORT = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
const MONTH_PT = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
const RAW_TAG = /\{\{|\}\}|activatedPerson/;
const ENTITIES = { amp: '&', nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'" };

/* ---------------------------------------------------------------- leitura do link (antes do cleanUrl do boot) */

const vDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const unEntity = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? m;
  const n = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
});

/* Lê o fragmento sem URLSearchParams: "+" fica "+" e um "&" dentro do valor (ex.: &nbsp;) volta para o valor. */
const TZ_RIO = -180;
function readVooHash() {
  const raw = location.hash.slice(1);
  if (!raw.includes('=')) return null;
  const map = {};
  let cur = null;
  for (const part of raw.split('&')) {
    const i = part.indexOf('=');
    const key = i > 0 ? vDecode(part.slice(0, i)).trim() : '';
    if (/^[A-Za-z][\w.]{0,15}$/.test(key)) {
      cur = VOO_KEYS.has(key) ? key : null;
      if (cur) map[cur] = part.slice(i + 1);
    } else if (cur) map[cur] += `&${part}`;
  }
  for (const k of Object.keys(map)) map[k] = unEntity(vDecode(map[k]));
  return Object.keys(map).length ? map : null;
}
const vStrip = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
function vClass(v) {
  if (v === undefined) return 'ausente';
  const s = vStrip(v);
  if (!s) return 'vazio';
  return RAW_TAG.test(s) ? 'cru' : 'ok';
}
const vClean = (v) => { const s = vStrip(v); return !s || RAW_TAG.test(s) || s.length > 80 ? null : s; };
const pad2 = (n) => String(n).padStart(2, '0');
const tplV = (s, vars) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? '');

function vMkDay(y, m, d) {
  const Y = y < 100 ? 2000 + y : y;
  // Data inexistente (31/09, 30/02) é rejeitada: o campo some e o QA aponta, em vez de virar o dia seguinte.
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(Y, m, 0)).getUTCDate())) return null;
  return { y: Y, m, d };
}
/** "Ter. 13 out. 2026", "16/11/2026", "16/11", "2026-11-16", "16 de novembro". Ano padrão: 2026. */
function vParseDay(txt) {
  const s = vClean(txt);
  if (!s) return null;
  let m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return vMkDay(+m[1], +m[2], +m[3]);
  m = /(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*(\d{2,4}))?/.exec(s);
  if (m) return vMkDay(m[3] ? +m[3] : 2026, +m[2], +m[1]);
  const t = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  m = /(\d{1,2})\s*(?:de\s+)?([a-z]{3})[a-z.]*\s*(?:de\s+)?(\d{4})?/.exec(t);
  return m && MONTH_PT[m[2]] ? vMkDay(m[3] ? +m[3] : 2026, MONTH_PT[m[2]], +m[1]) : null;
}
/** "06:40", "6h40", "6h", "0640". */
function vParseClock(txt) {
  const s = vClean(txt);
  if (!s) return null;
  const m = /^(\d{2})(\d{2})$/.exec(s) ?? /(\d{1,2})\s*(?:[:hH]\s*(\d{2})?)/.exec(s) ?? /^(\d{1,2})$/.exec(s);
  if (!m) return null;
  const H = +m[1];
  const M = m[2] ? +m[2] : 0;
  return H < 24 && M < 60 ? { H, M } : null;
}
/** "1h 05m", "1h05", "1:05", "65 min". */
function vParseDur(txt) {
  const s = vClean(txt);
  if (!s) return null;
  let m = /(\d{1,2})\s*h\s*(\d{1,2})?/i.exec(s);
  if (m) return +m[1] * 60 + (m[2] ? +m[2] : 0);
  m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (m) return +m[1] * 60 + +m[2];
  m = /(\d{2,3})\s*min/i.exec(s);
  return m ? +m[1] : null;
}
/** Código IATA dentro do texto ("GRU", "Guarulhos (GRU)"); prefere um aeroporto conhecido. */
function vIata(v) {
  const s = vClean(v);
  if (!s) return null;
  const all = [...s.toUpperCase().matchAll(/\b([A-Z]{3})\b/g)].map((m) => m[1]);
  return all.find((c) => VOO.airports[c]) ?? (all.length === 1 ? all[0] : null);
}
function vAirport(code, cityOverride) {
  const a = VOO.airports[code];
  return { code, city: vClean(cityOverride) ?? a?.[0] ?? code, name: a?.[1] ?? '', tz: a?.[2] ?? TZ_RIO };
}
function vFlight(v) {
  const s = vClean(v);
  if (!s) return null;
  const m = /\b([A-Z0-9]{2})\s*-?\s*(\d{1,4})\b/i.exec(s);
  return m ? `${m[1].toUpperCase()} ${m[2]}` : s;
}
function vAirline(flight, op) {
  const pick = (code) => {
    let a = VOO.airlines[code];
    if (a?.alias) a = VOO.airlines[a.alias];
    return a ? { code, ...a } : null;
  };
  let a = flight ? pick(flight.slice(0, 2).toUpperCase()) : null;
  if (!a && op) {
    const up = op.toUpperCase();
    const hit = Object.entries(VOO.airlineNames).find(([name]) => up.includes(name));
    if (hit) a = pick(hit[1]);
  }
  return a;
}
function vPnr(v) {
  const s = vClean(v);
  if (!s) return null;
  const t = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return t.length >= 5 && t.length <= 8 ? t : s.toUpperCase();
}
const vMask = (p) => `${'•'.repeat(Math.max(2, p.length - 2))}${p.slice(-2)}`;
function fr24(flight) {
  const m = /^([A-Z0-9]{2}) (\d{1,4})$/.exec(flight ?? '');
  return m ? `https://www.flightradar24.com/data/flights/${m[1].toLowerCase()}${m[2]}` : null;
}

/* ---------------------------------------------------------------- tempo no fuso de cada aeroporto */

const vInstant = (D, t, tz) => Date.UTC(D.y, D.m - 1, D.d, t.H, t.M) - tz * MIN;
const vShift = (ms, tz) => new Date(ms + tz * MIN);
function vDayOf(ms, tz) { const d = vShift(ms, tz); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; }
const vWd = (D) => new Date(Date.UTC(D.y, D.m - 1, D.d)).getUTCDay();
const vDayKey = (D) => `${D.y}-${pad2(D.m)}-${pad2(D.d)}`;
const vDayShort = (D) => `${WD_SHORT[vWd(D)]}, ${pad2(D.d)}/${pad2(D.m)}`;
function vClockTz(ms, tz) {
  const d = vShift(ms, tz);
  const H = d.getUTCHours();
  const M = d.getUTCMinutes();
  return M ? `${H}h${pad2(M)}` : `${H}h`;
}
const vClockOf = (t) => (t.M ? `${t.H}h${pad2(t.M)}` : `${t.H}h`);
const vTzName = (tz) => `UTC−${Math.abs(tz / 60)}`;
function vCalDays(now, ms, tz) {
  const a = vDayOf(now, tz);
  const b = vDayOf(ms, tz);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / DAY);
}
function vDur(min) {
  const H = Math.floor(min / 60);
  const M = Math.round(min % 60);
  return H ? (M ? `${H} h ${pad2(M)} min` : `${H} h`) : `${M} min`;
}
const apPlace = (a) => `${a.name || a.city} (${a.code})`;
function buildLeg(key, get) {
  const p = (s) => get(`${key}.${s}`);
  const oc = vIata(p('o'));
  const dc = vIata(p('d'));
  if (!oc || !dc) return null; // sem origem e destino o trecho não existe (mesma regra do cartão nativo)
  const o = vAirport(oc, p('oc'));
  const d = vAirport(dc, p('dc'));
  const day = vParseDay(p('dt'));
  const tDep = vParseClock(p('h'));
  const tArr = vParseClock(p('c'));
  const dep = day && tDep ? vInstant(day, tDep, o.tz) : null;
  let arr = null;
  let arrEstimated = false;
  if (day && tArr) {
    arr = vInstant(day, tArr, d.tz);
    if (dep != null && arr <= dep) arr += DAY;
  }
  const durTxt = vParseDur(p('du'));
  if (arr == null && dep != null && durTxt) { arr = dep + durTxt * MIN; arrEstimated = true; }
  const flight = vFlight(p('v'));
  const op = p('op');
  const airline = vAirline(flight, op);
  const cx = vIata(p('x'));
  return {
    key, label: VOO.legs[key].label, o, d, day, dep, arr, arrEstimated,
    overnight: arr != null && day != null && vDayKey(vDayOf(arr, d.tz)) !== vDayKey(day),
    depText: tDep ? vClockOf(tDep) : null,
    arrText: arr != null ? vClockTz(arr, d.tz) : null,
    dur: dep != null && arr != null ? Math.round((arr - dep) / MIN) : durTxt,
    flight, op, airline, pnr: vPnr(p('l')),
    cx: cx ? vAirport(cx, '') : null, cxFlight: vFlight(p('xv')),
    checkinOpen: dep != null && airline ? dep - airline.checkinHours * HOUR : null,
  };
}

function tripFromMap(map, source) {
  const get = (k) => vClean(map?.[k]);
  const report = VOO.fields.map(([k, field, label]) => ({ k, field, label, st: vClass(map?.[k]) }));
  const ok = report.filter((r) => r.st === 'ok').length;
  const raw = report.filter((r) => r.st === 'cru').length;
  const legs = { ida: buildLeg('ida', get), volta: buildLeg('volta', get) };
  const pac = get('pac');
  const pacN = (pac ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return {
    source, report, ok, raw, legs, pac,
    name: get('n'), surname: get('sn'), tv: get('tv'),
    transfer: pac ? pacN.includes('transfer') : null,
    air: pac ? pacN.includes('aereo') || pacN.includes('especial') : null,
    state: ok === 0 ? (raw ? 'cru' : 'semDados') : legs.ida || legs.volta ? 'ok' : 'semVoo',
  };
}
