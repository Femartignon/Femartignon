/* ================================================================ Meu Voo (v0.4.0)
   Página pessoal. Os dados chegam só pelo fragmento do link (#), com as merge tags do SpotMe: os campos já
   cadastrados no Backstage (os mesmos do cartão de embarque nativo). Nada vai a servidor: o fragmento não
   entra na requisição e a CSP não tem connect-src. Rótulos, regras e textos: DATA.voo (fonte única).
   Estados (antes, check-in, embarque, em voo, chegada, evento, volta) pelo relógio do aparelho, no fuso de
   cada aeroporto. Valores do link entram só como texto (h() usa textContent). */

const VOO = DATA.voo ?? null;
const VOO_KEYS = new Set((VOO?.fields ?? []).map(([k]) => k));
const DAY = 864e5;
const HOUR = 36e5;
const MIN = 6e4;
const TZ_RIO = parseOffset(OFFSET);
const WD_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
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

/** Lê o fragmento sem URLSearchParams: "+" fica "+" e um "&" dentro do valor (ex.: &nbsp; vindo do Backstage)
    volta para o valor em vez de abrir um parâmetro falso. Só um trecho "chave=" com cara de chave abre parâmetro. */
function readVooHash() {
  if (PAGE !== 'meu-voo' || !VOO) return null;
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
const VOO_LINK = readVooHash();
if (VOO_LINK) store.set('voo-link', VOO_LINK, 'session');
STATE.vooPersona = store.get('voo-persona', 'session') ?? VOO?.preview?.persona ?? null;

/* ---------------------------------------------------------------- normalização e leitura dos campos */

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
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  return { y: y < 100 ? 2000 + y : y, m, d };
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
const apMaps = (a) => DATA.airports.find((x) => x.iata === a.code)?.mapsQuery ?? `Aeroporto ${a.name} ${a.city} ${a.code}`.replace(/\s+/g, ' ');

/* ---------------------------------------------------------------- modelo da viagem */

const V = { trip: null, cards: new Map(), tl: [], heroKey: '', count: null, cleared: false };

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

function vooSourceMap() {
  if (STATE.qa && STATE.vooPersona) {
    const p = VOO.qa.personas.find((x) => x.id === STATE.vooPersona);
    if (p) {
      const map = p.values === 'raw' ? Object.fromEntries(VOO.fields.map(([k, f]) => [k, `{{activatedPerson.${f}}}`])) : { ...p.values };
      return [map, `qa:${p.id}`];
    }
  }
  if (V.cleared) return [{}, 'vazio'];
  if (VOO_LINK) return [VOO_LINK, 'link'];
  const saved = store.get('voo-link', 'session');
  return saved ? [saved, 'sessao'] : [{}, 'vazio'];
}
const sourceLabel = (s) => (s === 'link' ? 'link do SpotMe' : s === 'sessao' ? 'link do SpotMe (guardado nesta aba)' : s.startsWith('qa:') ? 'participante de teste' : 'nenhum dado no link');

/* ---------------------------------------------------------------- fases de cada trecho */

function legPhase(l, now) {
  if (l.dep == null) return 'semHora';
  if (now < l.dep - VOO.arriveEarlyMin * MIN) return 'antes';
  if (now < l.dep) return 'embarque';
  if (l.arr != null ? now < l.arr : now < l.dep + 3 * HOUR) return 'voando';
  return 'concluido';
}
function legProgress(l, now) {
  if (l.dep == null || now < l.dep) return 0;
  if (l.arr != null) return Math.min(1, (now - l.dep) / (l.arr - l.dep));
  return now < l.dep + 3 * HOUR ? 0.5 : 1;
}
function legTag(l, now) {
  const ph = legPhase(l, now);
  if (ph === 'semHora') return null;
  if (ph === 'antes') {
    const n = vCalDays(now, l.dep, l.o.tz);
    return [n <= 0 ? 'Hoje' : n === 1 ? 'Amanhã' : `Em ${n} dias`, n <= 0];
  }
  if (ph === 'embarque') return ['Embarque em breve', true];
  if (ph === 'voando') return [l.arr != null ? 'Em voo' : 'Decolou', true];
  return [now < (l.arr ?? l.dep) + 6 * HOUR ? 'Pousou' : 'Concluído', false];
}

/* ---------------------------------------------------------------- capa: o que fazer agora */

function heroModel(trip, now) {
  if (trip.state !== 'ok') return { kind: trip.state };
  const { ida, volta } = trip.legs;
  const legs = [ida, volta].filter(Boolean);
  const active = legs.find((l) => legPhase(l, now) !== 'concluido');
  if (!active) {
    const last = legs[legs.length - 1];
    const end = last.arr ?? last.dep;
    if (last.key === 'ida') return now < end + 6 * HOUR ? { kind: 'chegou', leg: last } : { kind: 'evento' }; // só ida: depois da chegada, o Encontro
    return { kind: now < end + 12 * HOUR ? 'casa' : 'fim', leg: last };
  }
  const ph = legPhase(active, now);
  if (ph === 'semHora') return { kind: 'semHora', leg: active };
  if (ph === 'antes') {
    const today = vCalDays(now, active.dep, active.o.tz) === 0;
    if (active.key === 'volta' && ida && ida.arr != null && now < ida.arr + 6 * HOUR) return { kind: 'chegou', leg: ida };
    if (active.key === 'volta' && today) return { kind: 'diaVolta', leg: active };
    if (active.checkinOpen != null && now >= active.checkinOpen) return { kind: 'checkin', leg: active };
    return { kind: active.key === 'volta' && ida ? 'evento' : 'antes', leg: active };
  }
  return { kind: ph, leg: active };
}

const vRoute = (l) => h('span', { class: 'trip-route' }, l.o.city, icon('plane', 'i--sm'), l.d.city);
const vMeta = (...items) => h('p', { class: 'now-meta' }, items.filter(Boolean).map(([ic, txt]) => h('span', null, icon(ic, 'i--sm'), txt)));
const legMeta = (l) => vMeta(
  l.day && ['calendar', vDayShort(l.day)],
  l.depText && ['clock', l.o.tz !== TZ_RIO ? `${l.depText} (horário de ${l.o.city})` : l.depText],
  l.flight && ['plane', l.flight]);
const cardLink = (l) => h('a', { class: 'btn', href: `#${l.key}` }, icon('ticket'), 'Ver cartão');
const checkinLink = (l, primary = true) => (l.airline?.checkinUrl
  ? h('a', { class: primary ? 'btn btn--primary' : 'btn', href: l.airline.checkinUrl, target: '_blank', rel: 'noopener noreferrer' },
    icon('ticket'), `Fazer check-in na ${l.airline.name}`, h('span', { class: 'sr-only' }, ' (site da companhia)'))
  : null);

function vCountEl(target) {
  const unit = (k) => h('div', { class: 'count-unit' }, h('span', { class: 'count-num', 'data-k': k }, '00'), h('span', { class: 'count-lbl', 'data-l': k }, ''));
  const bead = (grey) => h('span', { class: grey ? 'bead bead--grey' : 'bead', 'aria-hidden': 'true' });
  const el = h('div', { class: 'count', role: 'timer' }, unit('a'), bead(), unit('b'), bead(true), unit('c'));
  V.count = { el, target };
  return el;
}
function vooSecond(now) {
  const c = V.count;
  if (!c || !c.el.isConnected) return;
  let t = Math.max(0, c.target - now);
  const D = Math.floor(t / DAY); t -= D * DAY;
  const H = Math.floor(t / HOUR); t -= H * HOUR;
  const M = Math.floor(t / MIN); t -= M * MIN;
  const S = Math.floor(t / 1000);
  const parts = D > 0 ? [[D, 'dia', 'dias'], [H, 'hora', 'horas'], [M, 'min', 'min']] : [[H, 'hora', 'horas'], [M, 'min', 'min'], [S, 'seg', 'seg']];
  ['a', 'b', 'c'].forEach((k, i) => {
    const [v, one, many] = parts[i];
    const n = c.el.querySelector(`[data-k="${k}"]`);
    const l = c.el.querySelector(`[data-l="${k}"]`);
    if (n.textContent !== pad2(v)) n.textContent = pad2(v);
    if (l.textContent !== plural(v, one, many)) l.textContent = plural(v, one, many);
  });
  const label = `Faltam ${D ? `${D} ${plural(D, 'dia', 'dias')}, ` : ''}${H} ${plural(H, 'hora', 'horas')} e ${M} ${plural(M, 'minuto', 'minutos')}`;
  if (c.el.getAttribute('aria-label') !== label) c.el.setAttribute('aria-label', label);
}

function heroCard(trip, m, now) {
  const l = m.leg;
  const T = VOO.texts;
  const top = (txt) => h('p', { class: 'now-top' }, h('span', { class: 'bead', 'aria-hidden': 'true' }), txt);
  const title = (...kids) => h('p', { class: 'now-title' }, ...kids);
  const sub = (txt) => (txt ? h('p', { class: 'now-sub' }, txt) : null);
  const row = (...btns) => (btns.some(Boolean) ? h('div', { class: 'btn-row' }, btns) : null);
  const card = (...kids) => h('div', { class: 'now-card' }, ...kids);
  const rel = (tag) => (tag ? tag[0].toLowerCase() : '');
  switch (m.kind) {
    case 'semDados':
    case 'cru':
      return card(top('Meu Voo'), title('Abra pelo app do evento'), sub(m.kind === 'cru' ? T.rawTags : T.noData));
    case 'semVoo':
      return card(top('Meu Voo'), title(trip.air === false ? T.noAir : 'Seus voos ainda não aparecem aqui'),
        sub(trip.air === false ? null : 'Se a agência emitiu a sua passagem, fale com o Help Desk.'));
    case 'semHora':
      return card(top(`Voo de ${l.label.toLowerCase()}`), title(vRoute(l)), legMeta(l), row(cardLink(l)));
    case 'antes':
    case 'evento':
      if (!l) return card(top(DATA.event.name), title('Aproveite o Encontro'), sub('A sua programação completa está na Agenda do app.'));
      return card(top(`${m.kind === 'evento' ? 'Sua volta' : `Voo de ${l.label.toLowerCase()}`} · ${rel(legTag(l, now))}`), title(vRoute(l)), legMeta(l),
        vCountEl(l.dep), row(cardLink(l)));
    case 'checkin':
      return card(top(l.key === 'volta' ? 'Check-in da volta liberado' : 'Check-in liberado'), title(l.flight ? `Faça o check-in do voo ${l.flight}` : 'Faça o check-in do seu voo'),
        legMeta(l), sub(`Decola ${relIn(l.dep - now)}.`), row(checkinLink(l), cardLink(l)));
    case 'embarque':
      return card(top('Hora de ir para o aeroporto'), title(`Embarque em ${apPlace(l.o)}`), legMeta(l), sub(`Decola ${relIn(l.dep - now)}.`),
        row(h('button', { class: 'btn btn--primary', type: 'button', onclick: () => openCounter(trip, l) }, icon('expand'), 'Mostrar no balcão'), checkinLink(l, false)));
    case 'voando': {
      const p = legProgress(l, now);
      const bar = h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Andamento do voo', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(p * 100) }, h('span'));
      bar.firstChild.style.setProperty('--p', p.toFixed(3));
      return card(top('Em voo'), title(vRoute(l)), bar,
        h('p', { class: 'bar-cap' }, h('span', null, `${l.o.code} · ${l.depText ?? ''}`), h('span', null, l.arrText ? `${l.d.code} · ${l.arrText}` : l.d.code)),
        sub(l.arr != null ? `Chegada ${l.arrEstimated ? 'prevista ' : ''}às ${l.arrText}, ${relIn(l.arr - now)}.` : `Decolou às ${l.depText}.`));
    }
    case 'chegou': {
      const arrivedRio = DATA.airports.some((a) => a.iata === l.d.code);
      return card(top(arrivedRio ? 'Bem-vindo ao Rio' : `Chegada em ${l.d.city}`),
        title(trip.transfer === false ? `Siga para o ${DATA.venue.name}` : 'Procure o receptivo com a placa do Encontro Infield 2026'),
        sub(DATA.traffic.typical),
        row(h('a', { class: 'btn btn--primary', href: routeLink(apMaps(l.d)), target: '_blank', rel: 'noopener noreferrer' }, icon('compass'), 'Rota até o hotel')));
    }
    case 'diaVolta':
      return card(top('Hoje é dia de voltar'), title(`Check-out até 12h`),
        vMeta(trip.tv && ['van', `Transfer: ${trip.tv}`], l.depText && ['plane', `${l.flight ? `Voo ${l.flight}` : 'Voo'} às ${l.depText}`]),
        sub(l.day && vDayKey(l.day) === '2026-11-19' ? 'Na quinta (19/11), faça o check-out antes da sua primeira reunião.' : null), row(cardLink(l)));
    case 'casa':
    case 'fim':
      return card(top(m.kind === 'casa' ? 'Boa volta para casa' : DATA.event.name), title(T.epilogueTitle), sub(T.epilogueText));
    default:
      return card(top('Meu Voo'), title(vRoute(l)));
  }
}

function renderVooHero(trip, now) {
  const m = heroModel(trip, now);
  V.heroKey = `${m.kind}:${m.leg?.key ?? ''}`;
  V.count = null;
  $('#voo-status').replaceChildren(heroCard(trip, m, now));
  vooSecond(now);
  return m;
}

function renderVooLead(trip) {
  const el = $('#voo-lead');
  const demo = VOO.preview && trip.source.startsWith('qa:') ? [h('span', { class: 'tag' }, 'Prévia · dados fictícios'), ' '] : null;
  if (trip.state === 'semDados' || trip.state === 'cru') { fill(el, demo, VOO.texts.leadNoData); return; }
  fill(el, demo, trip.name ? ['Olá, ', h('strong', null, trip.name), '! '] : null, VOO.texts.lead);
}

/* ---------------------------------------------------------------- o fio do trecho (SVG na largura real) */

const vThreadObs = 'ResizeObserver' in window ? new ResizeObserver((entries) => entries.forEach((e) => drawThread(e.target))) : null;
function svgEl(tag, cls) {
  const el = doc.createElementNS(SVG_NS, tag);
  if (cls) el.setAttribute('class', cls);
  return el;
}
function threadEl(l) {
  const svg = svgEl('svg');
  svg.setAttribute('focusable', 'false');
  const base = svgEl('path', 't-base');
  const done = svgEl('path', 't-done');
  svg.append(base, done);
  const box = h('div', { class: 'bp-thread is-instant', 'aria-hidden': 'true', 'data-cx': l.cx ? 'true' : null });
  const v = { svg, base, done, o: h('span', { class: 'tb' }), d: h('span', { class: 'tb tb--ring' }), plane: h('span', { class: 'tb-plane' }, icon('plane')), p: 0, drawn: false };
  const kids = [svg, v.o, v.d];
  if (l.cx) { v.x = h('span', { class: 'tb tb--ring tb--sm' }); v.xl = h('span', { class: 'tb-label' }, l.cx.code); kids.push(v.x, v.xl); }
  box.append(...kids, v.plane);
  box.vthread = v;
  vThreadObs?.observe(box);
  return box;
}
const setPos = (el, pt) => { el.style.setProperty('--x', `${pt.x.toFixed(1)}px`); el.style.setProperty('--y', `${pt.y.toFixed(1)}px`); };
function drawThread(box) {
  const v = box.vthread;
  const W = box.clientWidth;
  const H = box.clientHeight;
  if (!v || !W || !H) return;
  const m = 16;
  const yb = H - 16;
  const yc = 2 * 10 - yb; // pico da curva perto de y = 10
  const x0 = m;
  const x2 = W - m;
  const x1 = W / 2;
  const d = box.dataset.cx
    ? `M${x0} ${yb} Q${(x0 + x1) / 2} ${yc} ${x1} ${yb} Q${(x1 + x2) / 2} ${yc} ${x2} ${yb}`
    : `M${x0} ${yb} Q${x1} ${yc} ${x2} ${yb}`;
  v.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  v.base.setAttribute('d', d);
  v.done.setAttribute('d', d);
  const L = v.done.getTotalLength();
  const at = (len) => v.done.getPointAtLength(Math.min(L, Math.max(0, len)));
  const p = v.p;
  setPos(v.o, at(0));
  setPos(v.d, at(L));
  v.o.className = p > 0 ? 'tb tb--grey' : 'tb';
  v.d.className = p >= 1 ? 'tb' : 'tb tb--ring';
  if (v.x) {
    setPos(v.x, at(L / 2));
    setPos(v.xl, at(L / 2));
    v.x.className = p >= 0.5 ? 'tb tb--grey tb--sm' : 'tb tb--ring tb--sm';
  }
  const place = (pp) => {
    const len = L * pp;
    const a = at(len - 1);
    const b = at(len + 1);
    setPos(v.plane, at(len));
    v.plane.style.setProperty('--a', `${(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90).toFixed(1)}deg`);
    v.done.style.strokeDasharray = `${L} ${L}`;
    v.done.style.strokeDashoffset = `${L * (1 - pp)}`;
  };
  if (!v.drawn && !reducedMotion() && p > 0) {
    place(0); // o fio nasce na origem, depois se desenha até onde o avião está
    v.drawn = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { box.classList.remove('is-instant'); place(v.p); }));
    return;
  }
  v.drawn = true;
  place(p);
  if (!reducedMotion()) requestAnimationFrame(() => box.classList.remove('is-instant'));
}
function setThreadProgress(box, p) {
  box.vthread.p = p;
  if (box.isConnected) drawThread(box);
}

/* ---------------------------------------------------------------- cartão do trecho */

function pnrEl(l) {
  const code = h('span', { class: 'pnr-code', 'aria-hidden': 'true' }, vMask(l.pnr));
  const sr = h('span', { class: 'sr-only' }, `oculto, termina em ${l.pnr.slice(-2).split('').join(' ')}`);
  const eye = h('button', { class: 'icon-btn', type: 'button', 'aria-pressed': 'false', 'aria-label': 'Mostrar localizador' }, icon('eye'));
  eye.addEventListener('click', () => {
    const show = eye.getAttribute('aria-pressed') !== 'true';
    eye.setAttribute('aria-pressed', String(show));
    eye.setAttribute('aria-label', show ? 'Ocultar localizador' : 'Mostrar localizador');
    eye.replaceChildren(icon(show ? 'eye-off' : 'eye'));
    code.textContent = show ? l.pnr : vMask(l.pnr);
    sr.textContent = show ? l.pnr.split('').join(' ') : `oculto, termina em ${l.pnr.slice(-2).split('').join(' ')}`;
  });
  return h('span', { class: 'pnr' }, code, sr, eye,
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Copiar localizador', onclick: () => copyText(l.pnr, 'Localizador copiado.') }, icon('copy')));
}

const legCal = (l) => ({
  uid: `voo-${l.key}`,
  title: `Voo ${[l.flight, `${l.o.code} → ${l.d.code}`].filter(Boolean).join(' · ')} · ${DATA.event.name}`,
  s: l.dep, e: l.arr ?? l.dep + 60 * MIN, location: `Aeroporto ${apPlace(l.o)}`,
  description: `Voo de ${l.label.toLowerCase()} do ${DATA.event.name}. Faça o check-in online no app da companhia e chegue ao aeroporto com 2 horas de antecedência.`,
  whenText: [l.day && vDayShort(l.day), l.depText].filter(Boolean).join(' · '),
  alarm: '-PT2H', alarmText: 'Inclui lembrete 2 horas antes do voo.',
});

function legNotes(l, ph, now) {
  const notes = [];
  const note = (ic, txt, fact) => h('p', { class: 'bp-note', ...factProps(fact) }, icon(ic), txt);
  if (ph !== 'concluido' && ph !== 'voando') {
    if (l.checkinOpen != null) {
      const when = `${vDayShort(vDayOf(l.checkinOpen, l.o.tz))}, às ${vClockTz(l.checkinOpen, l.o.tz)}`;
      notes.push(now < l.checkinOpen
        ? note('ticket', `Check-in online abre ${l.airline.checkinHours} h antes: ${when}.`, l.airline.fact)
        : note('ticket', `Check-in online liberado desde ${when}.`, l.airline.fact));
    } else notes.push(note('ticket', 'Faça o check-in online no app ou no site da companhia aérea.', ''));
  }
  const tz = [];
  if (l.o.tz !== TZ_RIO) tz.push(`partida no horário de ${l.o.city} (${vTzName(l.o.tz)})`);
  if (l.d.tz !== TZ_RIO) tz.push(`chegada no horário de ${l.d.city} (${vTzName(l.d.tz)})`);
  if (tz.length) notes.push(note('clock', `Horários locais: ${tz.join('; ')}.`, ''));
  return notes;
}

function srSummary(l, ph, p) {
  const from = `Partida de ${l.o.city}${l.o.name ? `, ${l.o.name}` : ''}${l.depText ? `, às ${l.depText}` : ''}`;
  const to = `chegada em ${l.d.city}${l.d.name ? `, ${l.d.name}` : ''}${l.arrText ? `, às ${l.arrText}` : ''}`;
  const via = l.cx ? `, com conexão em ${l.cx.city}` : '';
  const st = { antes: '', embarque: ' Embarque em breve.', voando: ` Em voo, ${Math.round(p * 100)}% do trajeto.`, concluido: ' Voo concluído.', semHora: '' }[ph] ?? '';
  return `${from}${via}; ${to}.${st}`;
}

function legCard(trip, l, now) {
  const tagEl = h('span', { class: 'tag' });
  const thread = threadEl(l);
  const sr = h('p', { class: 'sr-only' });
  const notes = h('div', { class: 'bp-notes' });
  const pax = [trip.name, trip.surname].filter(Boolean).join(' ');
  const times = l.depText
    ? h('div', { class: 'bp-times', 'aria-hidden': 'true' },
      h('div', null, h('b', { class: 'bp-time' }, l.depText), h('span', { class: 'bp-tlbl' }, l.o.name || 'partida')),
      h('div', { class: 'bp-dur' }, l.dur ? vDur(l.dur) : null, l.cx ? h('span', { class: 'bp-tlbl' }, `via ${l.cx.code}`) : null),
      h('div', null,
        l.arrText ? h('b', { class: 'bp-time' }, l.arrText, l.overnight ? h('sup', null, '+1') : null) : null,
        h('span', { class: 'bp-tlbl' }, l.arrEstimated ? 'chegada prevista' : l.d.name || (l.arrText ? 'chegada' : ''))))
    : null;
  const checkinBtn = l.airline?.checkinUrl
    ? h('a', { class: 'btn btn--primary btn--block', href: l.airline.checkinUrl, target: '_blank', rel: 'noopener noreferrer' },
      icon('ticket'), `Fazer check-in na ${l.airline.name}`, h('span', { class: 'sr-only' }, ' (site da companhia)'))
    : null;
  const track = fr24(l.flight);
  const card = h('article', { class: 'bp reveal', 'data-leg': l.key, 'aria-labelledby': `bp-${l.key}-t` },
    h('div', { class: 'bp-main' },
      h('div', { class: 'bp-head' }, h('p', { class: 'kicker' }, [l.label, l.day && vDayShort(l.day)].filter(Boolean).join(' · ')), tagEl),
      h('h3', { class: 'sr-only', id: `bp-${l.key}-t` }, `Voo de ${l.label.toLowerCase()}: ${l.o.city} para ${l.d.city}`),
      h('div', { class: 'bp-codes', 'aria-hidden': 'true' },
        h('div', { class: 'bp-end' }, h('span', { class: 'bp-code' }, l.o.code), h('span', { class: 'bp-city' }, l.o.city)),
        h('div', { class: 'bp-end bp-end--to' }, h('span', { class: 'bp-code' }, l.d.code), h('span', { class: 'bp-city' }, l.d.city))),
      thread, times, sr),
    h('div', { class: 'bp-tear', 'aria-hidden': 'true' }, h('span', { class: 'bp-notch' }), h('span', { class: 'bp-notch' })),
    h('div', { class: 'bp-stub' },
      h('dl', { class: 'bp-meta' },
        pax && h('div', { class: 'wide' }, h('dt', null, 'Passageiro'), h('dd', null, pax)),
        l.flight && h('div', null, h('dt', null, 'Voo'), h('dd', null, l.flight)),
        (l.op || l.airline) && h('div', null, h('dt', null, 'Operado por'), h('dd', null, l.op ?? l.airline.name)),
        l.cx && h('div', { class: 'wide' }, h('dt', null, 'Conexão'), h('dd', null, `${l.cx.city} (${l.cx.code})${l.cxFlight ? ` · voo ${l.cxFlight}` : ''}`)),
        l.pnr && h('div', { class: 'wide' }, h('dt', null, 'Localizador'), h('dd', null, pnrEl(l)))),
      checkinBtn,
      h('div', { class: 'bp-quick' },
        track && h('a', { class: 'qbtn', href: track, target: '_blank', rel: 'noopener noreferrer' }, icon('radar'), 'Acompanhar voo', h('span', { class: 'sr-only' }, ` ${l.flight} no Flightradar24`)),
        l.dep != null && calButton(legCal(l), { label: 'Salvar na agenda', cls: 'qbtn' }),
        h('button', { class: 'qbtn', type: 'button', onclick: () => openCounter(trip, l) }, icon('expand'), 'Mostrar no balcão')),
      notes,
      h('p', { class: 'fine bp-support' }, VOO.texts.support)));
  const c = { l, card, tagEl, thread, sr, notes, checkinBtn };
  V.cards.set(l.key, c);
  updateLegCard(c, now);
  return card;
}

function updateLegCard(c, now) {
  const { l } = c;
  const ph = legPhase(l, now);
  if (c.card.dataset.phase !== ph) c.card.dataset.phase = ph;
  const tag = legTag(l, now);
  c.tagEl.hidden = !tag;
  if (tag) { c.tagEl.textContent = tag[0]; c.tagEl.className = tag[1] ? 'tag tag--you' : 'tag'; }
  const p = legProgress(l, now);
  setThreadProgress(c.thread, p);
  c.sr.textContent = srSummary(l, ph, p);
  if (c.checkinBtn) c.checkinBtn.hidden = ph === 'concluido' || ph === 'voando';
  fill(c.notes, legNotes(l, ph, now));
}

function emptyCard(ic, title, ...body) {
  return h('article', { class: 'card trip-empty reveal' }, cardHead(ic, title), ...body);
}
function rulesBox() {
  const seen = new Set();
  const rules = Object.values(VOO.airlines).filter((a) => a.name && !seen.has(a.name) && seen.add(a.name));
  return h('div', { class: 'rules' }, rules.map((a) => h('div', { class: 'rule', ...factProps(a.fact) }, h('span', null, a.name), h('b', null, `${a.checkinHours} h`))));
}
function renderLegSection(trip, key, now) {
  const box = $(`#leg-${key}`);
  const l = trip.legs[key];
  const T = VOO.texts;
  if (l) { box.replaceChildren(legCard(trip, l, now)); return; }
  if (trip.state === 'semDados' || trip.state === 'cru') {
    box.replaceChildren(key === 'ida'
      ? emptyCard('ticket', 'Seus voos aparecem aqui', h('p', null, trip.state === 'cru' ? T.rawTags : T.noData),
        h('p', { class: 'wx-label' }, 'Check-in online abre antes do voo'), rulesBox(), h('p', { class: 'fine' }, DATA.arrival.flight.items[0]))
      : emptyCard('calendar', DATA.departure.title, bullets(DATA.departure.items)));
    return;
  }
  if (trip.air === false) {
    box.replaceChildren(key === 'ida' ? emptyCard('ticket', 'Sem passagem pela agência', h('p', null, T.noAir)) : emptyCard('calendar', DATA.departure.title, bullets(DATA.departure.items)));
    return;
  }
  box.replaceChildren(emptyCard('ticket', `Voo de ${VOO.legs[key].label.toLowerCase()}`, h('p', null, tplV(T.noLegFlights, { perna: VOO.legs[key].label.toLowerCase() }))));
}

/* ---------------------------------------------------------------- jornada: o fio da viagem */

function parseTvAt(tv, D) {
  const s = vClean(tv);
  if (!s || !D) return null;
  const t = /(\d{1,2})\s*[h:]\s*(\d{2})?/.exec(s.replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, ' '));
  if (!t) return null;
  const dm = /(\d{1,2})\/(\d{1,2})/.exec(s);
  const day = dm ? vMkDay(D.y, +dm[2], +dm[1]) ?? D : D;
  const H = +t[1];
  const M = t[2] ? +t[2] : 0;
  return H < 24 && M < 60 ? vInstant(day, { H, M }, TZ_RIO) : null;
}

function journeyItems(trip) {
  const items = [];
  const add = (it) => { if (Number.isFinite(it.at)) items.push(it); };
  const T = VOO.texts;
  const ok = trip.state === 'ok';
  const { ida, volta } = ok ? trip.legs : {};
  const early = VOO.arriveEarlyMin * MIN;
  if (ida && ida.dep != null) {
    if (ida.checkinOpen != null) add({ id: 'ida-checkin', at: ida.checkinOpen, tz: ida.o.tz, tzCity: ida.o.city, icon: 'ticket', title: 'Check-in online liberado', place: `No app ou no site da ${ida.airline.name}`, fact: ida.airline.fact });
    add({ id: 'ida-aeroporto', at: ida.dep - early, tz: ida.o.tz, tzCity: ida.o.city, icon: 'clock', title: 'Chegada ao aeroporto', place: apPlace(ida.o), note: '2 horas antes do voo.' });
    add({ id: 'ida-voo', at: ida.dep, tz: ida.o.tz, tzCity: ida.o.city, icon: 'takeoff', kind: 'voo', title: ida.flight ? `Voo ${ida.flight}` : 'Voo de ida', place: `${ida.o.code} → ${ida.d.code}${ida.arrText ? ` · chegada às ${ida.arrText}` : ''}`, note: ida.cx ? `Conexão em ${ida.cx.city} (${ida.cx.code})${ida.cxFlight ? `, voo ${ida.cxFlight}` : ''}.` : null });
    if (ida.arr != null) {
      const rio = DATA.airports.some((a) => a.iata === ida.d.code);
      add({ id: 'ida-chegada', at: ida.arr, tz: ida.d.tz, tzCity: ida.d.city, icon: 'landing', kind: 'voo', title: rio ? 'Chegada ao Rio' : `Chegada em ${ida.d.city}`, place: apPlace(ida.d),
        note: trip.transfer === false ? T.noTransfer : `${T.arrival} ${DATA.traffic.typical}`, fact: trip.transfer === false ? DATA.traffic.typicalFact : `${T.arrivalFact} ${DATA.traffic.typicalFact}` });
    }
  }
  // o Encontro (fatos da Agenda, fonte única)
  const cred = ITEM.get('d1-chegada');
  const room = ITEM.get('d1-checkin');
  const plen = ITEM.get('d1-plenaria');
  const landed = ida?.arr ?? null;
  const late = landed != null && landed + HOUR > cred.s;
  add({ id: 'credenciamento', at: late ? landed + HOUR : cred.s, tz: TZ_RIO, icon: 'id', title: 'Credenciamento', timeLabel: late ? 'ao chegar ao hotel' : null, place: cred.place, note: cred.note, fact: cred.fact });
  if (landed != null) {
    const D = vDayOf(landed, TZ_RIO);
    const at15 = vInstant(D, { H: 15, M: 0 }, TZ_RIO);
    add({ id: 'quarto', at: Math.max(at15, landed + 70 * MIN), tz: TZ_RIO, icon: 'building', title: room.title, timeLabel: landed + 70 * MIN > at15 ? 'ao chegar' : room.label.toLowerCase(), place: room.place, note: room.note, fact: room.fact });
  } else add({ id: 'quarto', at: room.s + MIN, tz: TZ_RIO, icon: 'building', title: room.title, timeLabel: room.label.toLowerCase(), place: room.place, note: `No dia da sua chegada. ${room.note}`, fact: room.fact });
  add({ id: 'plenaria', at: plen.s, tz: TZ_RIO, icon: 'flag', kind: 'evento', title: `${plen.title} · ${DATA.event.name}`, place: plen.place, note: 'A sua programação completa está na Agenda do app.', fact: plen.fact });
  // volta
  const out = ITEM.get('d4-checkout');
  if (volta && volta.dep != null) {
    const D = volta.day ?? vDayOf(volta.dep, TZ_RIO);
    const goAirport = volta.dep - early;
    const noon = vInstant(D, { H: 12, M: 0 }, TZ_RIO);
    const tvAt = parseTvAt(trip.tv, D);
    const is19 = vDayKey(D) === '2026-11-19';
    add({ id: 'checkout', at: Math.min(vInstant(D, { H: 7, M: 0 }, TZ_RIO), goAirport - HOUR), tz: TZ_RIO, icon: 'luggage', title: 'Check-out', timeLabel: noon <= goAirport - HOUR ? 'até 12h' : 'antes de sair para o aeroporto', place: out.place, note: is19 ? out.note : DATA.departure.items[1], fact: out.fact });
    if (volta.checkinOpen != null) add({ id: 'volta-checkin', at: volta.checkinOpen, tz: volta.o.tz, tzCity: volta.o.city, icon: 'ticket', title: 'Check-in da volta liberado', place: `No app ou no site da ${volta.airline.name}`, fact: volta.airline.fact });
    if (trip.transfer !== false) {
      add(tvAt != null
        ? { id: 'transfer-volta', at: tvAt, tz: TZ_RIO, icon: 'van', title: 'Transfer para o aeroporto', place: trip.tv, fact: '' }
        : { id: 'transfer-volta', at: goAirport - 75 * MIN, tz: TZ_RIO, icon: 'van', title: 'Transfer para o aeroporto', timeLabel: 'horário em Minha Logística', place: trip.tv ?? DATA.departure.items[2], fact: 'F18', pending: trip.tv ? null : 'P09' });
    }
    add({ id: 'volta-aeroporto', at: goAirport, tz: volta.o.tz, tzCity: volta.o.city, icon: 'clock', title: 'Chegada ao aeroporto', place: apPlace(volta.o), note: '2 horas antes do voo.' });
    add({ id: 'volta-voo', at: volta.dep, tz: volta.o.tz, tzCity: volta.o.city, icon: 'takeoff', kind: 'voo', title: volta.flight ? `Voo ${volta.flight}` : 'Voo de volta', place: `${volta.o.code} → ${volta.d.code}${volta.arrText ? ` · chegada às ${volta.arrText}` : ''}`, note: volta.cx ? `Conexão em ${volta.cx.city} (${volta.cx.code})${volta.cxFlight ? `, voo ${volta.cxFlight}` : ''}.` : null });
    if (volta.arr != null) add({ id: 'volta-chegada', at: volta.arr, tz: volta.d.tz, tzCity: volta.d.city, icon: 'landing', kind: 'voo', title: `Chegada em ${volta.d.city}`, place: apPlace(volta.d), note: `Boa volta para casa. ${T.epilogueTitle}.` });
  } else add({ id: 'checkout', at: out.s, tz: TZ_RIO, icon: 'luggage', title: out.title, timeLabel: out.label.toLowerCase(), place: out.place, note: DATA.departure.items[0], fact: out.fact });
  return items.sort((a, b) => a.at - b.at);
}

function renderJourney(trip, now) {
  const box = $('#journey');
  V.tl = [];
  const groups = [];
  for (const it of journeyItems(trip)) {
    const D = vDayOf(it.at, it.tz);
    const k = vDayKey(D);
    if (groups.at(-1)?.k !== k) groups.push({ k, D, items: [] });
    groups.at(-1).items.push(it);
  }
  box.replaceChildren(...groups.map((g) => h('div', { class: 'journey-day' },
    h('div', { class: 'day-head reveal' }, h('h3', { class: 'day-title' }, WD_LONG[vWd(g.D)], ' ', h('span', { class: 'c' }, `${pad2(g.D.d)}/${pad2(g.D.m)}`))),
    h('ol', { class: 'tl', role: 'list' }, g.items.map((it) => {
      const li = h('li', { class: 'tl-item', 'data-kind': it.kind ?? 'etapa', ...factProps(it.fact) },
        h('div', { class: 'tl-card' },
          h('p', { class: 'tl-time' }, icon(it.icon, 'i--sm'), it.timeLabel ?? vClockTz(it.at, it.tz),
            !it.timeLabel && it.tz !== TZ_RIO ? h('span', { class: 'tz' }, ` · horário de ${it.tzCity}`) : null,
            h('span', { class: 'badge-now' }, 'Agora')),
          h('p', { class: 'tl-title' }, it.title),
          it.place && h('p', { class: 'tl-place' }, icon('pin', 'i--sm'), it.place),
          it.note && h('p', { class: 'tl-note' }, rich(it.note)),
          pendingSlot(it.pending, it.title)));
      V.tl.push({ it, li });
      return li;
    })))));
  updateJourney(now);
}

function updateJourney(now) {
  let cur = -1;
  V.tl.forEach((x, i) => { if (x.it.at <= now) cur = i; });
  const last = V.tl.at(-1);
  if (last && cur === V.tl.length - 1 && now > last.it.at + 12 * HOUR) cur = V.tl.length; // depois do fim: tudo passado
  V.tl.forEach((x, i) => {
    const st = i < cur ? 'past' : i === cur ? 'now' : i === cur + 1 ? 'next' : 'future';
    if (x.li.dataset.state !== st) x.li.dataset.state = st;
  });
}

/* ---------------------------------------------------------------- chegada, checklist, ajuda e privacidade */

function renderVooArrival(trip) {
  const box = $('#voo-arrival');
  const ida = trip.state === 'ok' ? trip.legs.ida : null;
  const ap = ida ? DATA.airports.find((a) => a.iata === ida.d.code) : null;
  const live = h('a', { class: 'btn', href: VOO.logisticaUrl }, icon('van'), 'Trânsito ao vivo'); // absoluto: a Logística mora em outro projeto da Vercel
  if (!ap) {
    const t = DATA.arrival.transfer;
    box.replaceChildren(h('article', { class: 'card reveal', ...factProps(t.fact) }, cardHead('van', t.title), bullets(t.items),
      h('p', { class: 'fine', ...factProps(DATA.traffic.typicalFact) }, DATA.traffic.typical), h('div', { class: 'btn-row' }, live)));
    return;
  }
  const transfer = trip.transfer === false ? [VOO.texts.noTransfer] : [DATA.arrival.transfer.items[1]];
  box.replaceChildren(h('article', { class: 'card reveal', ...factProps(`F24 F25 ${DATA.traffic.typicalFact}`) },
    h('h3', { class: 'ap-head' }, h('span', { class: 'ap-code' }, ap.iata), h('span', { class: 'ap-name' }, ap.full)),
    h('div', { class: 'facts-2' },
      ida.arrText ? factBox(ida.arrEstimated ? 'Chegada prevista' : 'Sua chegada', `${ida.arrText}${ida.overnight ? ' (+1)' : ''}`) : null,
      factBox('Até o hotel', DATA.traffic.typicalShort)),
    bullets(transfer),
    h('div', { class: 'btn-row' },
      h('a', { class: 'btn btn--primary', href: routeLink(ap.mapsQuery), target: '_blank', rel: 'noopener noreferrer' }, icon('compass'), 'Rota até o hotel'),
      live,
      ap.boards?.[0] ? h('a', { class: 'btn', href: ap.boards[0][1], target: '_blank', rel: 'noopener noreferrer' }, icon('external'), ap.boards[0][0]) : null)));
}

function renderVooChecklist(trip) {
  const box = $('#voo-check');
  const saved = store.get('voo-check') ?? {};
  const leg = trip.legs.ida ?? trip.legs.volta;
  const air = trip.state === 'ok' ? leg?.airline : null;
  const vars = {
    checkin: air ? `Abre ${air.checkinHours} h antes, no app ou no site da ${air.name}.` : 'No app ou no site da companhia: LATAM e GOL abrem 48 h antes; Azul, 72 h.',
    checkinFact: air ? air.fact : 'F43 F44 F45',
  };
  const items = VOO.checklist.map((c) => ({ ...c, note: tplV(c.note, vars), fact: tplV(c.fact, vars) }));
  const meter = h('div', { class: 'meter', role: 'progressbar', 'aria-label': 'Itens concluídos', 'aria-valuemin': 0, 'aria-valuemax': items.length }, h('span'));
  const count = h('p', { class: 'fine', 'aria-live': 'polite' });
  const sync = () => {
    const done = items.filter((c) => saved[c.id]).length;
    meter.firstChild.style.setProperty('--p', (done / items.length).toFixed(3));
    meter.setAttribute('aria-valuenow', done);
    count.textContent = done === items.length ? 'Tudo pronto. Bom voo!' : `${done} de ${items.length} itens · fica salvo só neste aparelho`;
  };
  box.replaceChildren(h('article', { class: 'card reveal' }, cardHead('check', 'Antes de embarcar'), meter, count,
    h('div', { class: 'checklist' }, items.map((c) => h('label', { class: 'check', ...factProps(c.fact) },
      h('input', { type: 'checkbox', checked: saved[c.id] || null, onchange: (e) => { saved[c.id] = e.target.checked; store.set('voo-check', saved); sync(); } }),
      h('span', { class: 'check-box', 'aria-hidden': 'true' }, icon('check')),
      h('span', { class: 'check-text' }, c.text, c.note ? h('small', null, c.note) : null))))));
  sync();
}

function renderVooHelp(trip) {
  const T = VOO.texts;
  const own = trip.source === 'link' || trip.source === 'sessao';
  fill($('#voo-help'),
    h('article', { class: 'card reveal', ...factProps(T.helpFact) }, cardHead('message', 'Mudou alguma coisa?'), bullets(T.help)),
    pendingSlot(DATA.help.helpdesk.pending, DATA.help.helpdesk.title),
    pendingSlot(DATA.help.agency.pending, DATA.help.agency.title),
    h('article', { class: 'card privacy reveal' }, cardHead('lock', 'Seus dados'), h('p', null, T.privacy),
      own ? h('button', { class: 'btn', type: 'button', onclick: () => {
        store.set('voo-link', null, 'session');
        store.set('voo-check', null);
        V.cleared = true;
        renderVoo();
        toast('Dados apagados deste aparelho.');
      } }, icon('x'), 'Apagar dados deste aparelho') : null));
}

/* ---------------------------------------------------------------- modo balcão (tela acesa) */

let vooWake = null;
const releaseWake = () => { try { vooWake?.release(); } catch { /* já liberada */ } vooWake = null; };
async function openCounter(trip, l) {
  const dlg = $('#counter');
  const status = h('p', { class: 'fine' });
  dlg.replaceChildren(
    h('div', { class: 'counter-top' }, h('p', { class: 'kicker' }, `${DATA.event.name} · ${l.label}`),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fechar', onclick: () => dlg.close() }, icon('x'))),
    h('div', { class: 'counter-body' },
      h('h2', { class: 'counter-name', id: 'counter-title' }, [trip.name, trip.surname].filter(Boolean).join(' ') || 'Passageiro'),
      h('p', { class: 'counter-route', 'aria-label': `${l.o.city} para ${l.d.city}` }, l.o.code, icon('plane'), l.d.code),
      h('p', { class: 'counter-meta' }, [l.flight, l.day && vDayShort(l.day), l.depText].filter(Boolean).join(' · ')),
      l.pnr ? h('div', { class: 'counter-pnr' }, h('p', { class: 'kicker' }, 'Localizador'), h('b', null, l.pnr),
        h('div', { class: 'btn-row', role: 'group' }, h('button', { class: 'btn', type: 'button', onclick: () => copyText(l.pnr, 'Localizador copiado.') }, icon('copy'), 'Copiar'))) : null,
      h('div', { class: 'counter-foot' }, status, h('p', { class: 'fine' }, VOO.texts.support))));
  dlg.showModal();
  try {
    vooWake = navigator.wakeLock ? await navigator.wakeLock.request('screen') : null;
    status.textContent = vooWake ? VOO.texts.counterNote : VOO.texts.counterNoWake;
  } catch { status.textContent = VOO.texts.counterNoWake; }
}

/* ---------------------------------------------------------------- página */

function renderVoo() {
  if (!VOO) return;
  const [map, source] = vooSourceMap();
  const trip = tripFromMap(map, source);
  V.trip = trip;
  const now = clock.now();
  renderVooLead(trip);
  renderVooHero(trip, now);
  for (const c of V.cards.values()) vThreadObs?.unobserve(c.thread);
  V.cards.clear();
  renderLegSection(trip, 'ida', now);
  renderLegSection(trip, 'volta', now);
  renderJourney(trip, now);
  renderVooArrival(trip);
  renderVooChecklist(trip);
  renderVooHelp(trip);
}

function refreshVoo(now) {
  const trip = V.trip;
  if (!trip) return;
  const before = V.heroKey;
  const m = heroModel(trip, now);
  const key = `${m.kind}:${m.leg?.key ?? ''}`;
  if (key !== before || ['checkin', 'embarque', 'voando', 'chegou', 'diaVolta'].includes(m.kind)) renderVooHero(trip, now);
  if (key !== before && before) $('#live-announcer').textContent = $('#voo-status .now-top')?.textContent ?? '';
  for (const c of V.cards.values()) updateLegCard(c, now);
  updateJourney(now);
}

function initVoo() {
  $('#counter')?.addEventListener('close', releaseWake);
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) releaseWake(); });
}

/* ---------------------------------------------------------------- modo QA do Meu Voo */

function vooPresets(trip) {
  const out = [];
  const P = (label, ms) => { if (Number.isFinite(ms)) out.push([label, ms]); };
  const { ida, volta } = trip.state === 'ok' ? trip.legs : {};
  if (ida?.dep != null) {
    P('10 dias antes', ida.dep - 10 * DAY);
    if (ida.checkinOpen != null) P('Check-in aberto', ida.checkinOpen + 30 * MIN);
    P('Indo ao aeroporto', ida.dep - 60 * MIN);
    if (ida.arr != null) { P('Em voo', ida.dep + (ida.arr - ida.dep) * 0.45); P('Pousou', ida.arr + 20 * MIN); } else P('Decolou', ida.dep + 30 * MIN);
  } else P('Antes', Date.parse('2026-11-10T09:00:00-03:00'));
  P('Evento · 17/11 10h', Date.parse('2026-11-17T10:00:00-03:00'));
  if (volta?.dep != null) {
    if (volta.checkinOpen != null) P('Check-in da volta', volta.checkinOpen + 30 * MIN);
    P('Dia da volta · 9h', vInstant(volta.day ?? vDayOf(volta.dep, TZ_RIO), { H: 9, M: 0 }, TZ_RIO));
    if (volta.arr != null) P('Volta em voo', volta.dep + (volta.arr - volta.dep) * 0.5);
    P('Depois', (volta.arr ?? volta.dep) + 14 * HOUR);
  } else P('Depois', Date.parse('2026-11-20T10:00:00-03:00'));
  return out.sort((a, b) => a[1] - b[1]);
}

function fillQAVoo(sheet) {
  const trip = V.trip;
  const setTime = (value) => {
    if (!value) return;
    clock.set(Date.parse(`${value}:00${OFFSET}`));
    store.set('qa-now', value, 'session');
    rerender();
  };
  const timeInput = h('input', { type: 'datetime-local', id: 'qa-time', value: inputValue(clock.now()), min: '2026-11-01T00:00', max: '2026-11-30T23:59', onchange: (e) => setTime(e.target.value) });
  const persona = h('select', {
    'aria-label': 'Participante de teste',
    onchange: (e) => {
      STATE.vooPersona = e.target.value || null;
      store.set('voo-persona', STATE.vooPersona, 'session');
      clock.reset();
      store.set('qa-now', null, 'session');
      rerender();
      fillQAVoo(sheet);
    },
  }, h('option', { value: '' }, 'Link do SpotMe (dados reais)'), VOO.qa.personas.map((p) => h('option', { value: p.id, selected: STATE.vooPersona === p.id || null }, p.label)));
  const toggle = (key, label) => h('label', null, h('input', { type: 'checkbox', checked: STATE[key] || null, onchange: (e) => { STATE[key] = e.target.checked; saveQA(); rerender(); } }), label);
  const n = (st) => trip.report.filter((r) => r.st === st).length;
  const mark = { ok: '✓', vazio: '○', ausente: '—', cru: '!' };
  const base = ONLINE_HOST && !VOO.preview ? `${location.origin}${location.pathname}` : VOO.baseUrl;
  const link = `${base}#${VOO.params}`;
  sheet.replaceChildren(
    ...sheetHead(sheet, 'qa-title', 'Painel de QA · Meu Voo', 'Visível só com qa=1 no endereço. Nada aqui é salvo no servidor.'),
    h('div', { class: 'qa-panel' },
      h('fieldset', null, h('legend', null, 'Participante'), persona, h('p', { class: 'fine' }, `Fonte atual: ${sourceLabel(trip.source)}.`)),
      h('fieldset', null, h('legend', null, 'Horário (Rio, UTC−3)'), timeInput,
        h('div', { class: 'btn-row' }, vooPresets(trip).map(([label, ms]) => h('button', { class: 'btn', type: 'button', onclick: () => { const v = inputValue(ms); timeInput.value = v; setTime(v); } }, label)),
          h('button', { class: 'btn', type: 'button', onclick: () => { clock.reset(); store.set('qa-now', null, 'session'); timeInput.value = inputValue(Date.now()); rerender(); } }, 'Tempo real'))),
      h('fieldset', null, h('legend', null, 'Diagnóstico do link'),
        h('p', { class: 'qa-stats' }, `${n('ok')} com valor · ${n('vazio')} vazias · ${n('ausente')} não recebidas · ${n('cru')} sem resolver`),
        h('details', { class: 'acc' }, h('summary', null, 'Campo a campo', icon('chevron-down')),
          h('div', { class: 'acc-body' }, h('ul', null, trip.report.map((r) => h('li', null, `${mark[r.st]} ${r.field} · ${r.label}`)))))),
      h('fieldset', null, h('legend', null, 'Exibir'), toggle('qaPending', 'Pendências (D06)'), toggle('qaFacts', 'Fatos da Base (F##)')),
      h('fieldset', null, h('legend', null, 'Link do item de menu (SpotMe)'), h('p', { class: 'qa-code' }, link),
        h('button', { class: 'btn', type: 'button', onclick: () => copyText(link, 'Link com merge tags copiado.') }, icon('copy'), 'Copiar link'),
        h('p', { class: 'fine' }, VOO.note)),
      h('fieldset', null, h('legend', null, 'Botão na página nativa (editor HTML do SpotMe)'),
        h('button', { class: 'btn', type: 'button', onclick: () => copyText(VOO.snippet, 'HTML do botão copiado.') }, icon('copy'), 'Copiar HTML do botão'),
        h('p', { class: 'fine' }, 'Markup validado no app: tabela, font, b e link com merge tag. Sem unless, que derruba a página.')),
      h('p', { class: 'qa-stats', id: 'qa-stats', 'aria-live': 'polite' }),
      h('button', { class: 'btn', type: 'button', onclick: () => {
        STATE.qa = false;
        STATE.vooPersona = null;
        store.set('voo-persona', null, 'session');
        clock.reset();
        store.set('qa-now', null, 'session');
        saveQA();
        hideSheet(sheet);
        initQA();
        rerender();
      } }, icon('x'), 'Sair do modo QA')));
  syncQAStats();
}

