/* Encontro Infield 2026 · páginas autocontidas · v0.3.1
   ES module sem dependências, o mesmo nas 6 páginas (body[data-page] escolhe o que montar).
   Conteúdo embutido em <script id="infield-data"> (fonte única: src/data.json, gerado pelo build).
   Dados ao vivo: Open-Meteo (clima), api/aeroportos (METAR) e api/transito (TomTom), quando a hospedagem
   tiver as funções; sem elas, plano B. Mapa do Waze. Agente: /api/agente no mesmo endereço da página.
   Sem innerHTML: DOM montado por h(); CSP com hash, sem nada inline fora do que o build calculou. */

const doc = document;
const root = doc.documentElement;
const PAGE = doc.body.dataset.page;
const DATA = JSON.parse(doc.getElementById('infield-data').textContent);
const ONLINE_HOST = /^https?:$/.test(location.protocol);

const $ = (sel, ctx = doc) => ctx.querySelector(sel);
const $$ = (sel, ctx = doc) => [...ctx.querySelectorAll(sel)];
const SVG_NS = 'http://www.w3.org/2000/svg';
const PFX = DATA.meta.storagePrefix;
const OFFSET = DATA.meta.offset;
const OFFSET_MS = parseOffset(OFFSET) * 60_000;
const HAS_POPOVER = Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const enc = encodeURIComponent;

/* ================================================================ utilidades */

function parseOffset(s) {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(s);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

const store = {
  area(kind) { try { return kind === 'session' ? window.sessionStorage : window.localStorage; } catch { return null; } },
  get(key, kind = 'local') {
    try { const v = this.area(kind)?.getItem(`${PFX}:${key}`); return v == null ? null : JSON.parse(v); } catch { return null; }
  },
  set(key, value, kind = 'local') {
    try { this.area(kind)?.setItem(`${PFX}:${key}`, JSON.stringify(value)); } catch { /* armazenamento bloqueado: segue em memória */ }
  },
};

function h(tag, props, ...kids) {
  const el = doc.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  return el;
}

function icon(name, cls = '') {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `i ${cls}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  const use = doc.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

/** Texto com **negrito** (único markup aceito nos dados). */
function rich(text) {
  const frag = doc.createDocumentFragment();
  for (const part of String(text).split(/(\*\*[^*]+\*\*)/g)) {
    if (!part) continue;
    frag.append(part.startsWith('**') && part.endsWith('**') ? h('strong', null, part.slice(2, -2)) : part);
  }
  return frag;
}

const FACT_RANK = { confirmado: 0, validar: 1, pendente: 2 };
function factProps(fact) {
  const ids = String(fact ?? '').split(/\s+/).filter(Boolean);
  if (!ids.length) return {};
  const worst = ids.map((id) => DATA.facts[id] ?? 'confirmado').sort((a, b) => FACT_RANK[b] - FACT_RANK[a])[0];
  return { 'data-fact': ids.join(' '), 'data-fact-status': worst };
}

/** replaceChildren sem nós vazios (null viraria o texto "null"). */
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(Boolean));
const cardHead = (ic, title) => h('h3', { class: 'card-title' }, icon(ic), title);
const bullets = (items) => h('ul', null, items.map((t) => h('li', null, t)));
const factBox = (label, value) => h('div', { class: 'fact-box' }, h('span', null, label), h('b', null, value));
const fmtNum = (n, d = 0) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);

/* ================================================================ tempo (Rio, UTC−3 fixo) */

const at = (date, hm) => Date.parse(`${date}T${hm}:00${OFFSET}`);
const shifted = (ms) => new Date(ms + OFFSET_MS);
const ymd = (ms) => shifted(ms).toISOString().slice(0, 10);
const inputValue = (ms) => shifted(ms).toISOString().slice(0, 16);
const plural = (n, one, many) => (n === 1 ? one : many);
function hm(ms) {
  const d = shifted(ms);
  const H = d.getUTCHours();
  const M = d.getUTCMinutes();
  return M ? `${H}h${String(M).padStart(2, '0')}` : `${H}h`;
}
function relIn(ms) {
  const min = Math.round(ms / 60_000);
  if (min < 1) return 'em instantes';
  if (min < 60) return `em ${min} min`;
  const H = Math.floor(min / 60);
  const M = min % 60;
  if (H < 24) return M ? `em ${H} h ${M} min` : `em ${H} h`;
  const D = Math.round(H / 24);
  return `em ${D} ${plural(D, 'dia', 'dias')}`;
}
function relAgo(ms) {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const H = Math.round(min / 60);
  return `há ${H} h`;
}
const dm = (ms) => { const d = shifted(ms); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

const clock = {
  offset: 0,
  now() { return Date.now() + this.offset; },
  set(ms) { this.offset = ms - Date.now(); },
  reset() { this.offset = 0; },
};

/* ================================================================ modelo */

const EVENT_START = Date.parse(DATA.event.start);
const EVENT_END = Date.parse(DATA.event.end);
const SURVEY_OPEN = Date.parse(DATA.survey.opensAt);
const DAYS = DATA.days.map((d, index) => ({
  ...d,
  index,
  items: d.items.map((it) => ({
    ...it, dayIndex: index, date: d.date, s: at(d.date, it.start), e: at(d.date, it.end),
    nowable: it.nowable ?? !(it.kind === 'acao' || (it.kind === 'marco' && !it.exactEnd)),
  })),
}));
const ITEMS = DAYS.flatMap((d) => d.items);
const ITEM = new Map(ITEMS.map((it) => [it.id, it]));
const KIND_RANK = { sessao: 1, refeicao: 2, acao: 3, marco: 4 };
const STATE = { persona: {}, qa: false, qaAll: false, qaPending: true, qaFacts: true, day: null };

const phase = (now) => (now < EVENT_START ? 'pre' : now < EVENT_END ? 'live' : 'post');
const dayIndexFor = (now) => DAYS.findIndex((d) => d.date === ymd(now));

function personaSees(it) {
  const p = STATE.persona;
  switch (it.audience) {
    case undefined: return true;
    case 'lideranca': return !!p.lid;
    case 'jubilando': return !!p.jub;
    case 'almoco17': return p.alm === '17';
    case 'almoco18': return p.alm === '18';
    default: return false;
  }
}
const visible = (it) => personaSees(it) || (STATE.qa && STATE.qaAll);
const rank = (it) => (it.audience && personaSees(it) ? 0 : KIND_RANK[it.kind] ?? 5);
const nowItem = (now) => ITEMS.filter((it) => visible(it) && it.nowable && it.s <= now && now < it.e).sort((a, b) => rank(a) - rank(b) || b.s - a.s)[0] ?? null;
const nextItem = (now) => ITEMS.filter((it) => visible(it) && it.s > now && it.kind !== 'acao').sort((a, b) => a.s - b.s || rank(a) - rank(b))[0] ?? null;

function audienceTag(it) {
  if (!it.audience) return null;
  return personaSees(it)
    ? h('span', { class: 'tag tag--you' }, 'Para você')
    : h('span', { class: 'tag' }, `Segmentado · ${DATA.audiences[it.audience]}`);
}

function pendingSlot(pid, context) {
  if (!(STATE.qa && STATE.qaPending) || !pid) return null;
  const p = DATA.pending[pid] ?? { item: pid, owner: '' };
  return h('div', { class: 'pending-slot', role: 'note' },
    h('b', null, `Pendente · ${pid}${context ? ` · ${context}` : ''}`),
    `${p.item} · ${p.owner}`,
    h('span', null, 'Oculto para participantes até ser preenchido (D06).'));
}

/* ================================================================ personalização via URL (SpotMe) */

function readParams() {
  const raw = [location.hash.slice(1), location.search.slice(1)].filter((s) => s.includes('=')).join('&');
  const q = new URLSearchParams(raw);
  const clean = (v) => {
    if (v == null) return null;
    const s = v.trim().replace(/\s+/g, ' ');
    return !s || s.length > 40 || /[{}<>]/.test(s) ? null : s; // merge tag não renderizada vira null
  };
  const truthy = (v) => /^(true|1|sim|yes|verdadeiro|x)$/i.test(String(v ?? '').trim());
  const persona = {};
  if (q.has('n')) persona.name = clean(q.get('n'));
  if (q.has('g')) persona.groups = (clean(q.get('g')) ?? '').split(/[\s,;|]+/).map((c) => c.toUpperCase()).filter((c) => DATA.groups[c]);
  if (q.has('lid')) persona.lid = truthy(q.get('lid'));
  if (q.has('jub')) persona.jub = truthy(q.get('jub'));
  if (q.has('alm')) { const a = clean(q.get('alm')) ?? ''; persona.alm = /\b17\b/.test(a) ? '17' : /\b18\b/.test(a) ? '18' : null; }
  for (const k of Object.keys(persona)) if (persona[k] == null || (Array.isArray(persona[k]) && !persona[k].length)) delete persona[k];
  const qa = q.has('qa') ? (q.get('qa') === '' || truthy(q.get('qa'))) : null;
  return { persona, hasPersona: [...q.keys()].some((k) => ['n', 'g', 'lid', 'jub', 'alm'].includes(k)), qa, now: q.get('now') };
}

function cleanUrl() {
  if (!location.hash.includes('=') && !/[?&](n|g|lid|jub|alm|qa|now)=/.test(location.search)) return;
  try { history.replaceState(null, '', location.pathname); } catch { /* contexto sem histórico */ }
}

/* ================================================================ avisos, cópia e folhas */

let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

async function copyText(text, msg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    const ta = h('textarea', { readonly: true, 'aria-hidden': 'true' });
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    doc.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = doc.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    toast(ok ? msg : 'Não foi possível copiar. Toque e segure para selecionar.');
  }
}

function hideSheet(el) {
  if (el.tagName === 'DIALOG') { el.close(); return; }
  if (HAS_POPOVER) { try { el.hidePopover(); } catch { /* já fechada */ } } else el.classList.remove('is-open');
}
const closeBtn = (el) => h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fechar', onclick: () => hideSheet(el) }, icon('x'));
function sheetHead(el, id, title, sub) {
  return [
    h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
    h('div', { class: 'sheet-head' }, h('div', null, h('h2', { class: 'sheet-title', id }, title), sub ? h('p', { class: 'sheet-sub' }, sub) : null), closeBtn(el)),
  ];
}

function initPopoverFallback() {
  if (HAS_POPOVER) return;
  root.classList.add('no-popover');
  doc.addEventListener('click', (e) => {
    const inv = e.target.closest('[popovertarget]');
    if (inv) {
      const target = doc.getElementById(inv.getAttribute('popovertarget'));
      if (target) { $$('[popover].is-open').forEach((p) => p !== target && p.classList.remove('is-open')); target.classList.toggle('is-open'); }
      return;
    }
    $$('[popover].is-open').forEach((p) => { if (!p.contains(e.target)) p.classList.remove('is-open'); });
  });
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('[popover].is-open').forEach((p) => p.classList.remove('is-open')); });
}

/* ================================================================ agenda (.ics e Google) */

const icsStamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEsc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function icsFold(line) {
  const te = new TextEncoder();
  let out = '';
  let cur = '';
  let n = 0;
  for (const ch of line) {
    const b = te.encode(ch).length;
    if (n + b > 75) { out += `${cur}\r\n `; cur = ''; n = 1; }
    cur += ch;
    n += b;
  }
  return out + cur;
}
function buildICS(t) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Takeda Brasil//Encontro Infield 2026//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${t.uid}@encontro-infield-2026`, `DTSTAMP:${icsStamp(Date.now())}`];
  if (t.allDay) L.push(`DTSTART;VALUE=DATE:${t.startDate}`, `DTEND;VALUE=DATE:${t.endDate}`);
  else { L.push(`DTSTART:${icsStamp(t.s)}`); if (t.e) L.push(`DTEND:${icsStamp(t.e)}`); }
  L.push(`SUMMARY:${icsEsc(t.title)}`, `LOCATION:${icsEsc(t.location)}`, `DESCRIPTION:${icsEsc(t.description)}`);
  if (!t.allDay) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(t.title)}`, 'TRIGGER:-PT30M', 'END:VALARM');
  L.push('END:VEVENT', 'END:VCALENDAR');
  return `${L.map(icsFold).join('\r\n')}\r\n`;
}
function downloadICS(t) {
  const url = URL.createObjectURL(new Blob([buildICS(t)], { type: 'text/calendar;charset=utf-8' }));
  const a = h('a', { href: url, download: `encontro-infield-2026-${t.uid}.ics` });
  doc.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  toast('Arquivo de agenda gerado.');
}
function googleCalUrl(t) {
  const dates = t.allDay ? `${t.startDate}/${t.endDate}` : `${icsStamp(t.s)}/${icsStamp(t.e ?? t.s)}`;
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: t.title, dates, details: t.description, location: t.location, ctz: DATA.meta.tz })}`;
}
const venueLine = () => `${DATA.venue.name}, ${DATA.venue.address} · ${DATA.venue.district} · ${DATA.venue.city}`;
const eventTarget = () => ({
  uid: 'evento', title: DATA.event.name, allDay: true, startDate: '20261116', endDate: '20261120',
  location: venueLine(), description: `${DATA.event.theme}. ${DATA.event.signature}`, whenText: `${DATA.event.datesShort} · ${DATA.event.weekdays}`,
});
const itemTarget = (it) => ({
  uid: it.id, title: `${it.title} · ${DATA.event.name}`, s: it.s, e: it.exactEnd ? it.e : null,
  location: it.external ? it.place : it.placeKind === 'agenda' ? DATA.venue.name : `${it.place} · ${DATA.venue.name}`,
  description: [it.note, 'Horários e salas: Agenda do app do evento.'].filter(Boolean).join(' '),
  whenText: `${DAYS[it.dayIndex].weekday}, ${DAYS[it.dayIndex].dm} · ${it.label}`,
});
function calButton(target, { label = 'Salvar na agenda', cls = 'btn', iconOnly = false } = {}) {
  return h('button', {
    class: cls, type: 'button', popovertarget: 'cal-sheet', 'aria-label': iconOnly ? `Salvar na agenda: ${target.title}` : null,
    onclick: () => fillCalSheet(target),
  }, icon('calendar-plus'), iconOnly ? null : label);
}
function fillCalSheet(t) {
  const sheet = $('#cal-sheet');
  sheet.replaceChildren(
    ...sheetHead(sheet, 'cal-title', 'Salvar na agenda', `${t.title.replace(` · ${DATA.event.name}`, '')} · ${t.whenText}`),
    h('div', { class: 'sheet-list' },
      h('button', { class: 'btn', type: 'button', onclick: () => { downloadICS(t); hideSheet(sheet); } }, icon('calendar'), 'Apple, Outlook e outros (.ics)'),
      h('a', { class: 'btn', href: googleCalUrl(t), target: '_blank', rel: 'noopener noreferrer', onclick: () => hideSheet(sheet) }, icon('external'), 'Google Agenda')),
    h('p', { class: 'fine' }, t.allDay ? 'Evento de dia inteiro, de 16 a 19/11.' : 'Inclui lembrete 30 minutos antes.'));
}

/* ================================================================ mapas e rotas */

const mapsLinks = (query) => [
  ['Google Maps', `https://www.google.com/maps/search/?api=1&query=${enc(query)}`],
  ['Apple Mapas', `https://maps.apple.com/?q=${enc(query)}`],
  ['Waze', `https://waze.com/ul?q=${enc(query)}&navigate=yes`],
];
const routeLink = (from) => `https://www.google.com/maps/dir/?api=1&origin=${enc(from)}&destination=${enc(DATA.venue.mapsQuery)}&travelmode=driving`;
const wazeToHotel = () => `https://waze.com/ul?q=${enc(DATA.venue.mapsQuery)}&navigate=yes`;

function fillRouteSheet(title, query, copy) {
  const sheet = $('#route-sheet');
  sheet.replaceChildren(
    ...sheetHead(sheet, 'route-title', 'Como chegar', title),
    h('div', { class: 'sheet-list' },
      mapsLinks(query).map(([label, href]) => h('a', { class: 'btn', href, target: '_blank', rel: 'noopener noreferrer', onclick: () => hideSheet(sheet) }, icon('compass'), label)),
      h('button', { class: 'btn', type: 'button', onclick: () => { copyText(copy, 'Endereço copiado.'); hideSheet(sheet); } }, icon('copy'), 'Copiar endereço')));
}

/* ================================================================ capa (Informações Gerais) */

function greeting(prefix) {
  const name = STATE.persona.name;
  return name ? h('p', { class: 'greet' }, `${prefix}, `, h('span', { class: 'r' }, name), '!') : null;
}
function groupChips() {
  const gs = STATE.persona.groups ?? [];
  if (!gs.length) return null;
  return h('div', { class: 'row' }, gs.map((c) => h('span', { class: 'chip group-chip' }, icon('users', 'i--sm'), `${DATA.groups[c].name} · ${DATA.groups[c].bu}`)));
}
function countdownEl() {
  const unit = (k, l) => h('div', { class: 'count-unit' }, h('span', { class: 'count-num', 'data-k': k }, '00'), h('span', { class: 'count-lbl', 'data-l': k }, l));
  const bead = (grey) => h('span', { class: grey ? 'bead bead--grey' : 'bead', 'aria-hidden': 'true' });
  return h('div', { class: 'count', role: 'timer' }, unit('d', 'dias'), bead(), unit('h', 'horas'), bead(true), unit('m', 'min'), bead(), unit('s', 'seg'));
}
function updateCountdown(now) {
  const box = $('#hero-state .count');
  if (!box) return;
  let t = Math.max(0, EVENT_START - now);
  const D = Math.floor(t / 864e5); t -= D * 864e5;
  const H = Math.floor(t / 36e5); t -= H * 36e5;
  const M = Math.floor(t / 6e4); t -= M * 6e4;
  const S = Math.floor(t / 1e3);
  const set = (k, v, one, many) => {
    const n = box.querySelector(`[data-k="${k}"]`);
    const txt = String(v).padStart(2, '0');
    if (n.textContent !== txt) n.textContent = txt;
    if (one) box.querySelector(`[data-l="${k}"]`).textContent = plural(v, one, many);
  };
  set('d', D, 'dia', 'dias'); set('h', H, 'hora', 'horas'); set('m', M); set('s', S);
  const label = `Faltam ${D} ${plural(D, 'dia', 'dias')}, ${H} ${plural(H, 'hora', 'horas')} e ${M} ${plural(M, 'minuto', 'minutos')}`;
  if (box.getAttribute('aria-label') !== label) box.setAttribute('aria-label', label);
}
const placeLine = (it) => h('span', null, icon(it.placeKind === 'agenda' ? 'info' : 'pin', 'i--sm'), it.place);
function nowCard(it, now) {
  const exact = it.exactStart && it.exactEnd;
  const p = exact ? Math.min(1, Math.max(0, (now - it.s) / (it.e - it.s))) : 0;
  let bar = null;
  if (exact) {
    bar = h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Andamento', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(p * 100) }, h('span'));
    bar.firstChild.style.setProperty('--p', p.toFixed(3));
  }
  return h('article', { class: 'now-card', ...factProps(it.fact) },
    h('p', { class: 'now-top' }, h('span', { class: 'bead', 'aria-hidden': 'true' }), `Agora · ${it.label}`),
    h('p', { class: 'now-title' }, it.title),
    h('p', { class: 'now-meta' }, placeLine(it), it.exactEnd ? h('span', null, icon('clock', 'i--sm'), `termina ${relIn(it.e - now)}`) : null),
    audienceTag(it), bar);
}
function nextCard(it, now) {
  const same = ymd(it.s) === ymd(now);
  const tomorrow = ymd(it.s) === ymd(now + 864e5);
  const dayWord = same ? '' : tomorrow ? 'Amanhã · ' : `${DAYS[it.dayIndex].weekday} · `;
  const when = same && it.exactStart ? relIn(it.s - now) : null;
  return h('article', { class: 'next-card', ...factProps(it.fact) },
    h('p', { class: 'now-top' }, `Depois · ${dayWord}${it.label}`),
    h('p', { class: 'now-title' }, it.title),
    h('p', { class: 'now-meta' }, placeLine(it), when ? h('span', null, icon('clock', 'i--sm'), when) : null),
    audienceTag(it));
}
function surveyCard(now) {
  const open = now >= SURVEY_OPEN;
  return h('article', { class: 'card', ...factProps(DATA.survey.fact) },
    h('h3', { class: 'card-title' }, icon('star'), 'Avaliação do Evento'),
    h('p', { class: 'lead' }, DATA.survey.lead),
    open
      ? h('a', { class: 'btn btn--primary', href: DATA.survey.url, target: '_blank', rel: 'noopener noreferrer' }, DATA.survey.cta, icon('external', 'i--sm'))
      : h('p', null, DATA.survey.before));
}
function renderHero() {
  const el = $('#hero-state');
  if (!el) return;
  const now = clock.now();
  const ph = phase(now);
  el.dataset.phase = ph;
  const kids = [];
  if (ph === 'pre') {
    kids.push(greeting('Olá') ?? h('p', { class: 'greet' }, 'Boas-vindas!'));
    kids.push(groupChips(), h('p', { class: 'kicker' }, 'Faltam'), countdownEl());
    kids.push(h('p', { class: 'count-cap', ...factProps(DATA.event.fact) }, DATA.event.countdownLabel));
    kids.push(h('div', { class: 'btn-row' }, calButton(eventTarget(), { cls: 'btn btn--primary' }), h('a', { class: 'btn', href: '#programacao' }, 'Ver programação')));
  } else if (ph === 'live') {
    const di = dayIndexFor(now);
    const day = DAYS[di];
    kids.push(h('p', { class: 'kicker' }, day ? `Dia ${di + 1} de ${DAYS.length} · ${day.weekday}, ${day.dm}` : DATA.event.name));
    kids.push(greeting('Olá'), groupChips());
    const cur = nowItem(now);
    const nxt = nextItem(now);
    if (cur) kids.push(nowCard(cur, now));
    else if (nxt) kids.push(h('article', { class: 'next-card' }, h('p', { class: 'now-top' }, 'Agora'), h('p', { class: 'now-title' }, 'Intervalo na programação')));
    if (nxt) kids.push(nextCard(nxt, now));
    else kids.push(h('article', { class: 'now-card' }, h('p', { class: 'now-top' }, 'Boa viagem'),
      h('p', { class: 'now-title' }, 'Obrigado por construir essa história com a gente.'),
      h('p', { class: 'now-meta' }, h('span', null, icon('info', 'i--sm'), 'O horário do seu transfer está em Minha Logística, no app.'))));
    if (di >= 0) kids.push(h('div', { class: 'btn-row' }, h('a', { class: 'btn btn--primary', href: '#programacao', onclick: () => selectDay(di, { animate: false }) }, 'Ver a programação de hoje')));
  } else {
    kids.push(greeting('Obrigado') ?? h('p', { class: 'greet' }, 'Obrigado!'));
    kids.push(h('p', { class: 'count-cap' }, `O ${DATA.event.name} terminou. Obrigado por construir essa história com a gente.`));
    kids.push(surveyCard(now));
  }
  el.replaceChildren(...kids.filter(Boolean));
  if (ph === 'pre') updateCountdown(now);
}

/* ================================================================ programação */

const itemEls = new Map();
function renderItem(it) {
  const bar = h('div', { class: 'bar', 'aria-hidden': 'true' }, h('span'));
  const li = h('li', {
    class: 'tl-item reveal', 'data-id': it.id, 'data-state': 'future', 'data-highlight': it.highlight || null,
    'data-exact-end': (it.exactStart && it.exactEnd) || null, ...factProps(it.fact),
  },
  h('div', { class: 'tl-card' },
    h('p', { class: 'tl-time' }, h('time', { datetime: `${it.date}T${it.start}${OFFSET}` }, it.label), h('span', { class: 'badge-now' }, 'Agora'), audienceTag(it)),
    h('h4', { class: 'tl-title' }, it.title),
    h('p', { class: 'tl-place', 'data-kind': it.placeKind ?? null }, icon(it.placeKind === 'agenda' ? 'info' : 'pin', 'i--sm'), it.place),
    it.note ? h('p', { class: 'tl-note' }, it.note) : null,
    pendingSlot(it.pendingNote, it.title),
    bar,
    it.ics && it.exactStart ? calButton(itemTarget(it), { cls: 'icon-btn tl-cal', iconOnly: true }) : null));
  itemEls.set(it.id, { li, bar: bar.firstChild });
  return li;
}
function renderProgram() {
  if (!$('#day-tabs')) return;
  itemEls.clear();
  $('#day-tabs').replaceChildren(...DAYS.map((d, i) => h('button', {
    class: 'tab', type: 'button', role: 'tab', id: `tab-${i}`, 'aria-controls': `panel-${i}`, 'aria-selected': 'false', tabindex: '-1',
    onclick: () => selectDay(i), onkeydown: tabKeys,
  }, d.short, ' ', h('small', null, d.dm.slice(0, 2)), h('span', { class: 'sr-only tab-sr' }, `, ${d.weekday.toLowerCase()}, ${d.dm}`),
  h('span', { class: 'bead today-bead', 'aria-hidden': 'true', hidden: true }))));
  $('#day-panels').replaceChildren(...DAYS.map((d, i) => h('div', { class: 'day-panel', role: 'tabpanel', id: `panel-${i}`, 'aria-labelledby': `tab-${i}`, tabindex: '0', hidden: true },
    h('header', { class: 'day-head' }, h('p', { class: 'kicker' }, d.chapter), h('h3', { class: 'day-title' }, `${d.weekday}, ${d.dm} `, h('span', { class: 'c' }, `· ${d.title}`))),
    h('ol', { class: 'tl', role: 'list' }, d.items.filter(visible).map(renderItem)))));
  const now = clock.now();
  selectDay(STATE.day ?? (phase(now) === 'live' ? Math.max(0, dayIndexFor(now)) : 0), { animate: false });
}
function selectDay(i, { focus = false, animate = true } = {}) {
  if (i < 0 || i >= DAYS.length || !$('#day-tabs')) return;
  STATE.day = i;
  const apply = () => {
    $$('#day-tabs .tab').forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    $$('#day-panels .day-panel').forEach((p, k) => { p.hidden = k !== i; });
  };
  if (animate && doc.startViewTransition && !reducedMotion()) doc.startViewTransition(apply); else apply();
  if (focus) $(`#tab-${i}`)?.focus();
}
function tabKeys(e) {
  const step = { ArrowRight: 1, ArrowLeft: -1, Home: 'first', End: 'last' }[e.key];
  if (step === undefined) return;
  e.preventDefault();
  const cur = STATE.day ?? 0;
  selectDay(step === 'first' ? 0 : step === 'last' ? DAYS.length - 1 : (cur + step + DAYS.length) % DAYS.length, { focus: true });
}

/* ================================================================ clima (Open-Meteo, sem chave) */

const WX = {
  0: ['sun', 'Céu limpo'], 1: ['cloud-sun', 'Poucas nuvens'], 2: ['cloud-sun', 'Parcialmente nublado'], 3: ['cloud', 'Nublado'],
  45: ['cloud-fog', 'Neblina'], 48: ['cloud-fog', 'Neblina'], 61: ['cloud-rain', 'Chuva fraca'], 63: ['cloud-rain', 'Chuva'], 65: ['cloud-rain', 'Chuva forte'],
  80: ['cloud-rain', 'Pancadas de chuva'], 81: ['cloud-rain', 'Pancadas de chuva'], 82: ['cloud-rain', 'Pancadas fortes'],
  95: ['cloud-bolt', 'Trovoadas'], 96: ['cloud-bolt', 'Trovoadas'], 99: ['cloud-bolt', 'Trovoadas'],
};
function wxInfo(code, isDay = 1) {
  const base = WX[code] ?? (code >= 51 && code <= 57 ? ['cloud-rain', 'Garoa'] : code >= 61 && code <= 67 ? ['cloud-rain', 'Chuva'] : ['cloud', 'Tempo variável']);
  return !isDay && code <= 1 ? ['moon', code === 0 ? 'Céu limpo' : 'Poucas nuvens'] : base;
}
const uvLabel = (u) => (u == null ? '—' : u < 3 ? 'baixo' : u < 6 ? 'moderado' : u < 8 ? 'alto' : u < 11 ? 'muito alto' : 'extremo');
/** "2026-11-17T05:12" → "5h12" (formato de horário do app). */
const clockText = (iso) => { const H = Number(iso.slice(11, 13)); const M = iso.slice(14, 16); return M === '00' ? `${H}h` : `${H}h${M}`; };

async function fetchForecast() {
  const cached = store.get('wx2', 'session');
  if (cached && Date.now() - cached.t < 30 * 60_000) return cached;
  const { lat, lon } = DATA.venue;
  const q = new URLSearchParams({
    latitude: lat, longitude: lon, timezone: DATA.meta.tz, forecast_days: String(DATA.climate.horizonDays),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index',
    hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { signal: AbortSignal.timeout?.(7000), credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  const payload = { t: Date.now(), current: j.current ?? null, hourly: j.hourly ?? null, daily: j.daily ?? null };
  store.set('wx2', payload, 'session');
  return payload;
}

function wxDayTiles(daily, mode) {
  const horizon = DATA.climate.horizonDays;
  const idx = new Map((daily?.time ?? []).map((t, i) => [t, i]));
  return DAYS.map((d) => {
    const head = h('span', { class: 'wx-d' }, `${d.short} ${d.dm.slice(0, 2)}`);
    if (mode !== 'ok') return h('div', { class: 'wx-day' }, head, icon('cloud'), h('span', { class: 'wx-na' }, mode === 'loading' ? '…' : '—'));
    const i = idx.get(d.date);
    if (i != null && daily.temperature_2m_max?.[i] != null) {
      const [ic, label] = wxInfo(daily.weather_code[i]);
      const pop = daily.precipitation_probability_max?.[i];
      return h('div', { class: 'wx-day' }, head, icon(ic), h('span', { class: 'sr-only' }, label),
        h('span', { class: 'wx-t' }, h('b', null, `${Math.round(daily.temperature_2m_max[i])}°`), ` ${Math.round(daily.temperature_2m_min[i])}°`),
        pop != null ? h('span', { class: 'wx-p' }, icon('droplet', 'i--sm'), h('span', { class: 'sr-only' }, 'chance de chuva '), `${pop}%`) : null);
    }
    const fromMs = at(d.date, '12:00') - (horizon - 1) * 864e5;
    return h('div', { class: 'wx-day' }, head, icon('clock'), h('span', { class: 'wx-na' }, fromMs > Date.now() ? `a partir de ${dm(fromMs)}` : '—'));
  });
}

function wxHours(hourly) {
  const times = hourly?.time ?? [];
  const nowKey = `${ymd(Date.now())}T${String(shifted(Date.now()).getUTCHours()).padStart(2, '0')}:00`;
  const start = Math.max(0, times.findIndex((t) => t >= nowKey));
  return times.slice(start, start + 24).map((t, k) => {
    const i = start + k;
    const [ic, label] = wxInfo(hourly.weather_code[i], hourly.is_day?.[i]);
    const pop = hourly.precipitation_probability?.[i];
    return h('li', { class: k === 0 ? 'wx-hour wx-hour--now' : 'wx-hour' },
      h('span', { class: 'h' }, k === 0 ? 'Agora' : `${Number(t.slice(11, 13))}h`), icon(ic), h('span', { class: 'sr-only' }, label),
      h('span', { class: 't' }, `${Math.round(hourly.temperature_2m[i])}°`),
      h('span', { class: 'p' }, pop != null && pop >= 10 ? `${pop}%` : ' '));
  });
}

function renderWeather() {
  const box = $('#weather');
  if (!box) return;
  const c = DATA.climate;
  const now = h('div', { class: 'skeleton', 'aria-hidden': 'true' });
  const hoursList = h('ol', { class: 'wx-hours', role: 'list', tabindex: '0', 'aria-label': 'Previsão hora a hora, próximas 24 horas' });
  const days = h('div', { class: 'wx', role: 'group', 'aria-label': 'Previsão para os dias do encontro' }, wxDayTiles(null, 'loading'));
  const note = h('p', { class: 'fine' }, 'Carregando a previsão…');
  const hoursBlock = h('div', { class: 'wx-block' }, h('p', { class: 'wx-label', 'aria-hidden': 'true' }, 'Próximas 24 horas'), hoursList);
  const nowCardEl = h('article', { class: 'card reveal' }, now, hoursBlock);
  box.replaceChildren(
    nowCardEl,
    h('article', { class: 'card reveal', ...factProps(c.fact) }, cardHead('calendar', 'Nos dias do encontro'), h('p', null, c.lead), days, note));
  fetchForecast().then(({ t, current: cur, hourly, daily }) => {
    if (cur) {
      const [ic, label] = wxInfo(cur.weather_code, cur.is_day);
      const ti = (daily?.time ?? []).indexOf(ymd(Date.now()));
      const sun = ti >= 0 && daily.sunrise?.[ti] && daily.sunset?.[ti] ? [daily.sunrise[ti], daily.sunset[ti]] : null;
      now.replaceWith(h('div', { class: 'wx-now' },
        h('div', { class: 'wx-big' }, icon(ic), h('span', { class: 'wx-temp' }, `${Math.round(cur.temperature_2m)}°`)),
        h('div', null, h('p', { class: 'wx-cond' }, label), h('p', { class: 'wx-sub' }, `Sensação de ${Math.round(cur.apparent_temperature)}° · Barra da Tijuca, agora`)),
        h('div', { class: 'wx-chips' },
          h('span', { class: 'wx-chip' }, icon('droplet', 'i--sm'), 'Umidade ', h('b', null, `${cur.relative_humidity_2m}%`)),
          h('span', { class: 'wx-chip' }, icon('wind', 'i--sm'), 'Vento ', h('b', null, `${Math.round(cur.wind_speed_10m)} km/h`)),
          cur.uv_index != null ? h('span', { class: 'wx-chip' }, icon('sun', 'i--sm'), 'UV ', h('b', null, `${Math.round(cur.uv_index)} · ${uvLabel(cur.uv_index)}`)) : null,
          sun ? h('span', { class: 'wx-chip' }, icon('sunrise', 'i--sm'), 'Sol ', h('b', null, `${clockText(sun[0])}–${clockText(sun[1])}`)) : null)));
    } else now.remove();
    if (hourly?.time?.length) hoursList.replaceChildren(...wxHours(hourly)); else hoursBlock.remove();
    if (!nowCardEl.childElementCount) nowCardEl.remove();
    days.replaceChildren(...wxDayTiles(daily, 'ok'));
    note.replaceChildren(`Previsão ${c.provider}, atualizada às ${hm(t)}. `,
      h('a', { href: c.providerUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Fonte dos dados'));
  }).catch(() => {
    nowCardEl.remove();
    days.replaceChildren(...wxDayTiles(null, 'error'));
    note.textContent = 'Previsão indisponível agora. Tente de novo mais tarde.';
  });
}

/* ================================================================ Informações Gerais */

function checklistCard() {
  const items = DATA.checklist;
  const done = new Set(store.get('checklist') ?? []);
  const meter = h('div', { class: 'meter', role: 'progressbar', 'aria-label': 'Itens marcados', 'aria-valuemin': 0, 'aria-valuemax': items.length }, h('span'));
  const status = h('p', { class: 'fine', 'aria-live': 'polite' });
  const sync = () => {
    const n = items.filter((i) => done.has(i.id)).length;
    meter.firstChild.style.setProperty('--p', (n / items.length).toFixed(3));
    meter.setAttribute('aria-valuenow', n);
    status.textContent = n === items.length ? 'Tudo pronto. Nos vemos no Rio!' : `${n} de ${items.length} itens marcados`;
  };
  const list = h('ul', { class: 'checklist', role: 'list' }, items.map((i) => h('li', { ...factProps(i.fact) },
    h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: done.has(i.id) || null, onchange: (e) => { if (e.target.checked) done.add(i.id); else done.delete(i.id); store.set('checklist', [...done]); sync(); } }),
      h('span', { class: 'check-box', 'aria-hidden': 'true' }, icon('check')),
      h('span', { class: 'check-text' }, i.text, i.note ? h('small', null, i.note) : null)))));
  sync();
  return h('article', { class: 'card reveal' }, cardHead('check', 'Antes de ir'), meter, status, list);
}

function renderMealsDress() {
  const box = $('#meals-dress');
  if (!box) return;
  const { dress, meals } = DATA;
  box.replaceChildren(
    h('article', { class: 'card reveal', ...factProps(meals.fact) }, cardHead('utensils', meals.title), h('p', null, meals.lead), bullets(meals.items), h('p', { class: 'fine' }, meals.foot)),
    h('article', { class: 'card reveal', ...factProps(dress.fact) }, cardHead('shirt', dress.title), h('p', { class: 'lead' }, dress.lead), bullets(dress.items), pendingSlot(dress.pendingSlot, 'Abadá')));
}

function renderPrepare() {
  const box = $('#prepare');
  if (!box) return;
  const w = DATA.wifi;
  fill(box,
    checklistCard(),
    w.network && w.password
      ? h('article', { class: 'card reveal', ...factProps(w.fact) }, cardHead('wifi', 'Wi-Fi'),
        h('div', { class: 'facts-2' }, factBox('Rede', w.network), factBox('Senha', w.password)),
        h('button', { class: 'btn', type: 'button', onclick: () => copyText(w.password, 'Senha do Wi-Fi copiada.') }, icon('copy'), 'Copiar senha'))
      : pendingSlot(w.pending, 'Wi-Fi'));
}

function renderActions() {
  const box = $('#actions');
  if (!box) return;
  const a = DATA.actions;
  const v = a.vaccine;
  const kids = [
    h('article', { class: 'card reveal', ...factProps(v.fact) }, cardHead('syringe', v.title), h('p', { class: 'lead' }, v.lead),
      h('p', { class: 'now-meta' }, h('span', null, icon('pin', 'i--sm'), v.place)),
      h('ul', null, v.slots.map((s) => h('li', null, h('b', null, `${s.day}: `), s.when))),
      h('p', { class: 'fine' }, v.foot)),
    pendingSlot(a.volunteer.pending, a.volunteer.title),
  ];
  const p = STATE.persona;
  const all = STATE.qa && STATE.qaAll;
  if (p.alm || all) {
    const l = a.lunch;
    const date = p.alm === '17' ? 'Terça, 17/11' : p.alm === '18' ? 'Quarta, 18/11' : '17 ou 18/11, conforme a inscrição';
    kids.push(h('article', { class: 'card reveal', ...factProps(l.fact) }, cardHead('star', l.title),
      p.alm ? h('span', { class: 'tag tag--you' }, 'Para você') : h('span', { class: 'tag' }, 'Segmentado · inscritos'),
      h('p', { class: 'lead' }, l.lead),
      h('p', { class: 'now-meta' }, h('span', null, icon('calendar', 'i--sm'), date), h('span', null, icon('clock', 'i--sm'), l.time), h('span', null, icon('pin', 'i--sm'), l.place)),
      h('p', { class: 'fine' }, l.foot)));
  }
  if (p.jub || all) {
    const j = a.jubilee;
    kids.push(h('article', { class: 'card reveal', ...factProps(j.fact) }, cardHead('heart', j.title),
      p.jub ? h('span', { class: 'tag tag--you' }, 'Para você') : h('span', { class: 'tag' }, 'Segmentado · Jubilandos'),
      h('p', { class: 'lead' }, j.lead),
      h('p', { class: 'now-meta' }, h('span', null, icon('calendar', 'i--sm'), j.date), h('span', null, icon('clock', 'i--sm'), j.time), h('span', null, icon('pin', 'i--sm'), j.place)),
      h('p', { class: 'fine' }, j.foot), pendingSlot(j.pendingSlot, 'Transfer')));
  }
  fill(box, kids);
}

/* ================================================================ Logística: hotel, chegada, espaços, volta */

function renderVenue() {
  const box = $('#venue');
  if (!box) return;
  const v = DATA.venue;
  const address = `${v.address} · ${v.district} · ${v.city} · CEP ${v.cep}`;
  $('#venue-lead').textContent = `Programação e hospedagem acontecem no ${v.name}, na ${v.district}.`;
  box.replaceChildren(h('article', { class: 'card reveal', ...factProps(v.fact) },
    h('div', { class: 'venue-head' }, icon('building', 'i--lg'),
      h('div', null, h('h3', { class: 'venue-name' }, v.name), h('p', null, `${v.address} · ${v.district}`), h('p', null, `${v.city} · CEP ${v.cep}`))),
    h('div', { class: 'facts-2' }, factBox('Check-in', v.checkin), factBox('Check-out', v.checkout)),
    h('p', { class: 'fine' }, v.checkNote),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn btn--primary', type: 'button', popovertarget: 'route-sheet', onclick: () => fillRouteSheet(v.name, v.mapsQuery, `${v.name}, ${address}`) }, icon('compass'), 'Como chegar'),
      h('a', { class: 'btn', href: `tel:${v.tel}` }, icon('phone'), 'Recepção'),
      h('button', { class: 'btn', type: 'button', onclick: () => copyText(`${v.name}, ${address}`, 'Endereço copiado.') }, icon('copy'), 'Copiar'))));
}

function renderArrival() {
  const box = $('#arrival');
  if (!box) return;
  const a = DATA.arrival;
  const card = (ic, block) => h('article', { class: 'card reveal', ...factProps(block.fact) }, cardHead(ic, block.title), bullets(block.items));
  box.replaceChildren(card('users', a.transfer), card('plane', a.flight), card('id', a.badge), card('building', a.hotel));
}

function renderPlaces() {
  if (!$('#places')) return;
  $('#places').replaceChildren(...DATA.places.map((pl) => {
    if (pl.pending) { const slot = pendingSlot(pl.pending, pl.name); return slot ? h('li', null, slot) : null; }
    return h('li', { class: 'place reveal', ...factProps(pl.fact) }, icon(pl.icon), h('div', null, h('b', null, pl.name), h('span', null, pl.what)));
  }).filter(Boolean));
}

/* ================================================================ Logística: planta das salas
   O desenho (SVG), os marcadores e a legenda vêm prontos do build; aqui só a troca de andar e o "ampliar". */

const ZOOMS = [1, 1.6, 2.4, 3.2];
function initPlan() {
  const tabs = $$('.plan-tabs [role="tab"]');
  if (!tabs.length) return;
  const panels = tabs.map((t) => doc.getElementById(t.getAttribute('aria-controls')));
  const select = (i, focus = false) => {
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    panels.forEach((p, k) => { p.hidden = k !== i; });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 }[e.key];
      if (!step) return;
      e.preventDefault();
      select(Math.abs(step) === 99 ? (step > 0 ? tabs.length - 1 : 0) : (i + step + tabs.length) % tabs.length, true);
    });
  });
  select(0);

  // Ampliar: o desenho do andar visível vai para um diálogo em tela cheia, com zoom por botões e rolagem livre.
  const dlg = $('#plan-dialog');
  const body = $('#plan-zoom-body');
  const level = $('#plan-zoom-level');
  let canvas = null;
  let home = null;
  let z = 0;
  const applyZoom = () => {
    body.style.setProperty('--zoom', String(ZOOMS[z]));
    level.textContent = `${Math.round(ZOOMS[z] * 100)}%`;
    $('#plan-zoom-out').disabled = z === 0;
    $('#plan-zoom-in').disabled = z === ZOOMS.length - 1;
  };
  const zoomBy = (step) => {
    const cx = (body.scrollLeft + body.clientWidth / 2) / body.scrollWidth;
    const cy = (body.scrollTop + body.clientHeight / 2) / body.scrollHeight;
    z = Math.min(ZOOMS.length - 1, Math.max(0, z + step));
    applyZoom();
    body.scrollTo({ left: cx * body.scrollWidth - body.clientWidth / 2, top: cy * body.scrollHeight - body.clientHeight / 2 });
  };
  $('#plan-zoom').addEventListener('click', () => {
    const panel = panels.find((p) => !p.hidden);
    canvas = $('.plan-canvas', panel);
    home = canvas.parentElement;
    $('#plan-dialog-title').textContent = panel.dataset.title;
    body.append(canvas);
    z = innerWidth < 600 ? 2 : 1;
    applyZoom();
    dlg.showModal();
    requestAnimationFrame(() => body.scrollTo({ left: (body.scrollWidth - body.clientWidth) / 2, top: (body.scrollHeight - body.clientHeight) / 2 }));
  });
  $('#plan-zoom-in').addEventListener('click', () => zoomBy(1));
  $('#plan-zoom-out').addEventListener('click', () => zoomBy(-1));
  $('#plan-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { if (canvas && home) home.prepend(canvas); canvas = null; $('#plan-zoom')?.focus(); });
}
function renderDeparture() {
  const box = $('#departure');
  if (!box) return;
  const d = DATA.departure;
  box.replaceChildren(h('article', { class: 'card reveal', ...factProps(d.fact) }, cardHead('calendar', d.title), bullets(d.items)));
}

/* ================================================================ Logística: trânsito ao vivo */

/** Funções ao vivo no mesmo endereço da página (api/…). Aberta como arquivo, vai direto ao plano B. */
async function getLive(path, key, ttlMs, timeout = 4000) {
  const cached = store.get(key, 'session');
  if (cached && Date.now() - cached.t < ttlMs) return cached.d;
  if (!ONLINE_HOST) throw new Error('página aberta como arquivo: sem funções');
  const res = await fetch(new URL(path, location.href), { signal: AbortSignal.timeout?.(timeout), credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('json')) throw new Error('sem função no servidor');
  const d = await res.json();
  store.set(key, { t: Date.now(), d }, 'session');
  return d;
}

// Formato do gerador oficial de embed do Waze. Com pin=1 o Waze ignora o zoom e abre no nível da rua.
function wazeSrc(view) {
  return `${DATA.traffic.embed}?${new URLSearchParams({ zoom: String(view.zoom), lat: String(view.lat), lon: String(view.lon), ct: 'livemap' })}`;
}

function renderTraffic() {
  const box = $('#traffic');
  if (!box) return;
  const t = DATA.traffic;
  const cards = DATA.airports.map((a) => {
    const eta = h('p', { class: 'route-eta', ...factProps(t.typicalFact) }, h('span', { class: 'route-eta-lbl' }, 'Até o hotel · tempo típico'), h('b', null, t.typicalShort));
    const meta = h('p', { class: 'route-meta' }, 'Varia com o trânsito no momento da viagem.');
    const card = h('article', { class: 'card reveal', 'data-iata': a.iata },
      h('h3', { class: 'route-from' }, icon('plane'), `${a.name} (${a.iata})`),
      eta, meta,
      h('div', { class: 'btn-row' },
        h('a', { class: 'btn btn--sm', href: routeLink(a.mapsQuery), target: '_blank', rel: 'noopener noreferrer' }, icon('compass'), 'Google Maps', h('span', { class: 'sr-only' }, `: rota de ${a.name} até o hotel`)),
        h('a', { class: 'btn btn--sm', href: wazeToHotel(), target: '_blank', rel: 'noopener noreferrer' }, icon('external'), 'Waze', h('span', { class: 'sr-only' }, ': navegar até o hotel'))));
    return { a, card, eta, meta };
  });
  const views = t.views;
  const frame = h('iframe', { src: wazeSrc(views[0]), title: 'Mapa do trânsito ao vivo (Waze)', loading: 'lazy', referrerpolicy: 'no-referrer' });
  const wrap = h('div', { class: 'map-frame' }, frame,
    h('button', { class: 'map-shield', type: 'button', onclick: () => wrap.classList.add('is-live') },
      h('span', null, icon('map', 'i--sm'), 'Tocar para mover o mapa')));
  // Ao sair da tela, o mapa volta a deixar a rolagem da página livre.
  new IntersectionObserver(([e]) => { if (!e.isIntersecting) wrap.classList.remove('is-live'); }).observe(wrap);
  const radios = [];
  const choose = (i, focus = false) => {
    radios.forEach((b, k) => { b.setAttribute('aria-checked', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    frame.src = wazeSrc(views[i]);
    wrap.classList.remove('is-live');
    if (focus) radios[i].focus();
  };
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Centralizar o mapa em' }, views.map((v, i) => {
    const b = h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(i === 0), tabindex: i === 0 ? '0' : '-1',
      onclick: () => choose(i),
      onkeydown: (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        choose((i + step + views.length) % views.length, true);
      },
    }, v.label);
    radios.push(b);
    return b;
  }));
  const source = h('p', { class: 'fine' }, `${t.typical} Mapa ao vivo: Waze.`);
  box.replaceChildren(
    h('div', { class: 'route-grid' }, cards.map((c) => c.card)),
    h('article', { class: 'card reveal' }, cardHead('map', 'Mapa ao vivo'), seg, wrap, source));

  const load = () => getLive(DATA.live.trafficApi, 'traffic', 3 * 60_000).then((d) => {
    if (!d.configured || !Array.isArray(d.routes)) return;
    for (const c of cards) {
      const r = d.routes.find((x) => x.iata === c.a.iata);
      if (!r?.available) continue;
      c.eta.removeAttribute('data-fact');
      c.eta.removeAttribute('data-fact-status');
      c.eta.replaceChildren(h('span', { class: 'route-eta-lbl' }, 'Até o hotel · agora'), h('b', null, `${r.minutes} min`));
      c.meta.replaceChildren(
        h('span', { class: 'lvl', 'data-level': r.level }, `Trânsito ${r.level}`),
        ` · ${r.delayMinutes > 0 ? `+${r.delayMinutes} min pelo trânsito · ` : ''}${fmtNum(r.km, 1)} km`);
    }
    source.textContent = `Tempo de rota: ${d.source}, ${relAgo(Date.now() - Date.parse(d.fetched))}. Mapa ao vivo: Waze.`;
  }).catch(() => { /* sem função ou sem chave: fica o tempo típico */ });
  load();
  liveTimers.push(setInterval(() => { if (!doc.hidden) load(); }, DATA.live.refreshMinutes * 60_000));
}

/* ================================================================ Logística: operação dos aeroportos */

const AP_STATUS = {
  VFR: ['Normal', 'Tempo bom para pousos e decolagens'],
  MVFR: ['Atenção', 'Tempo com restrições leves'],
  IFR: ['Restrição', 'Operação por instrumentos: atrasos possíveis'],
  LIFR: ['Crítico', 'Tempo muito restrito: risco de atrasos e desvios'],
};
const ktToKmh = (kt) => Math.round(kt * 1.852);
function windText(a) {
  if (a.windKt == null) return '—';
  if (Math.round(a.windKt) === 0) return 'Calmo';
  return `${ktToKmh(a.windKt)} km/h${a.gustKt ? `, rajadas de ${ktToKmh(a.gustKt)}` : ''}`;
}

/** Plano B sem função no servidor: condições do modelo meteorológico nas coordenadas de cada aeroporto. */
async function airportsFromModel() {
  const cached = store.get('ap-model', 'session');
  if (cached && Date.now() - cached.t < 10 * 60_000) return cached.d;
  const q = new URLSearchParams({
    latitude: DATA.airports.map((a) => a.lat).join(','), longitude: DATA.airports.map((a) => a.lon).join(','), timezone: DATA.meta.tz,
    current: 'visibility,weather_code,wind_speed_10m,wind_gusts_10m,temperature_2m',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { signal: AbortSignal.timeout?.(7000), credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const list = [].concat(await res.json());
  const d = {
    source: 'Estimativa por modelo · Open-Meteo', fetched: new Date().toISOString(),
    airports: DATA.airports.map((a, i) => {
      const c = list[i]?.current ?? {};
      const visKm = c.visibility != null ? c.visibility / 1000 : null;
      const sm = visKm != null ? visKm / 1.609344 : null;
      const code = c.weather_code ?? 0;
      const category = code >= 95 || code === 45 || code === 48 ? 'IFR' : sm != null && sm < 3 ? 'IFR' : sm != null && sm <= 5 ? 'MVFR' : 'VFR';
      return {
        iata: a.iata, icao: a.icao, name: a.name, available: c.temperature_2m != null, category, model: true,
        visibilityKm: visKm != null ? Math.round(visKm * 10) / 10 : null, visibility10Plus: visKm != null && visKm >= 10,
        ceilingFt: null, windKt: c.wind_speed_10m != null ? c.wind_speed_10m / 1.852 : null, gustKt: c.wind_gusts_10m >= 40 ? c.wind_gusts_10m / 1.852 : null,
        tempC: c.temperature_2m ?? null, weather: code >= 95 ? 'Trovoadas' : null, sky: wxInfo(code)[1],
        observed: c.time ? new Date(`${c.time}:00${OFFSET}`).toISOString() : null,
      };
    }),
  };
  store.set('ap-model', { t: Date.now(), d }, 'session');
  return d;
}

function airportCard(a, meta, data) {
  const [badge, text] = AP_STATUS[a.category] ?? AP_STATUS.VFR;
  const ts = /TS/.test(a.weather ?? '') || a.weather === 'Trovoadas';
  const vis = a.visibility10Plus ? '10 km ou mais' : a.visibilityKm != null ? `${fmtNum(a.visibilityKm, a.visibilityKm < 10 ? 1 : 0)} km` : '—';
  const ceil = a.ceilingFt != null ? `${fmtNum(Math.round(a.ceilingFt * 0.3048 / 10) * 10)} m` : a.model ? '—' : 'Ilimitado';
  const cat = ts && a.category === 'VFR' ? 'MVFR' : a.category;
  return h('article', { class: 'card reveal', 'data-iata': a.iata },
    apHead(meta),
    h('p', { class: 'ap-status' }, h('span', { class: 'ap-badge', 'data-cat': cat }, ts ? 'Trovoadas' : badge), h('span', null, text)),
    h('dl', { class: 'ap-facts' },
      h('div', null, h('dt', null, 'Visibilidade'), h('dd', null, vis)),
      a.model ? h('div', null, h('dt', null, 'Céu'), h('dd', null, a.sky ?? '—')) : h('div', null, h('dt', null, 'Teto de nuvens'), h('dd', null, ceil)),
      h('div', null, h('dt', null, 'Vento'), h('dd', null, windText(a))),
      h('div', null, h('dt', null, 'Temperatura'), h('dd', null, a.tempC != null ? `${Math.round(a.tempC)} °C` : '—'))),
    h('p', { class: 'fine' }, a.observed ? `${a.model ? 'Estimado' : 'Observado'} ${relAgo(Date.now() - Date.parse(a.observed))} · ${data.source}` : data.source),
    boardLinks(meta),
    a.raw ? h('details', { class: 'ap-raw' }, h('summary', null, 'Mensagem METAR', icon('chevron-down', 'i--sm')), h('code', null, a.raw)) : null);
}
const apHead = (meta) => h('h3', { class: 'ap-head' }, h('span', { class: 'ap-code' }, meta.iata), h('span', { class: 'ap-name' }, meta.full));
const boardLinks = (meta) => h('div', { class: 'btn-row' }, meta.boards.map(([label, href]) => h('a', { class: 'btn btn--sm', href, target: '_blank', rel: 'noopener noreferrer' },
  icon('plane'), label, h('span', { class: 'sr-only' }, ` · ${meta.name}`))));
function airportPlaceholder(meta, text) {
  return h('article', { class: 'card' }, apHead(meta), h('p', null, text), boardLinks(meta));
}

function renderAirports() {
  const box = $('#airports');
  if (!box) return;
  const grid = h('div', { class: 'airport-grid' }, DATA.airports.map(() => h('div', { class: 'skeleton', 'aria-hidden': 'true' })));
  const note = h('p', { class: 'fine' }, DATA.live.note);
  box.replaceChildren(grid, note);
  const paint = (data) => {
    grid.replaceChildren(...DATA.airports.map((meta) => {
      const a = data.airports.find((x) => x.iata === meta.iata);
      return a?.available ? airportCard(a, meta, data) : airportPlaceholder(meta, 'Sem observação recente. Consulte o painel de voos.');
    }));
  };
  const load = () => getLive(DATA.live.airportsApi, 'airports', 5 * 60_000)
    .then((d) => { if (d.error || !Array.isArray(d.airports)) throw new Error(d.error); paint(d); })
    .catch(() => airportsFromModel().then(paint))
    .catch(() => grid.replaceChildren(...DATA.airports.map((meta) => airportPlaceholder(meta, 'Condições indisponíveis agora. Consulte o painel de voos.'))));
  load();
  liveTimers.push(setInterval(() => { if (!doc.hidden) load(); }, DATA.live.refreshMinutes * 60_000));
}

/* ================================================================ Segurança, Avaliação, Perguntas */

function emergencyBlock() {
  const e = DATA.emergency;
  const hsp = e.hospital;
  return h('div', { class: 'stack', ...factProps(e.fact) },
    h('p', null, e.lead),
    h('div', { class: 'emg-grid' }, e.numbers.map((n) => h('a', { class: 'emg-btn', href: `tel:${n.n}` }, h('span', { class: 'sr-only' }, 'Ligar para '), h('b', null, n.n), h('span', null, n.label)))),
    h('div', { class: 'emg-hosp' },
      h('b', null, hsp.name), h('p', null, `${hsp.detail} · ${hsp.address}`),
      h('div', { class: 'btn-row' },
        h('a', { class: 'btn', href: `tel:${hsp.tel}` }, icon('phone'), hsp.phone),
        h('a', { class: 'btn', href: mapsLinks(hsp.mapsQuery)[0][1], target: '_blank', rel: 'noopener noreferrer' }, icon('compass'), 'Ver no mapa'))));
}
function receptionCard() {
  const r = DATA.help.reception;
  return h('article', { class: 'card reveal', ...factProps(r.fact) }, cardHead('phone', r.label),
    h('div', { class: 'btn-row' }, h('a', { class: 'btn btn--primary', href: `tel:${r.tel}` }, icon('phone'), r.phone)));
}
function renderSafety() {
  if ($('#emergency')) $('#emergency').replaceChildren(h('article', { class: 'card reveal' }, cardHead('siren', 'Emergência'), emergencyBlock()), receptionCard());
  if ($('#safety')) {
    fill($('#safety'),
      h('article', { class: 'card reveal' }, cardHead('shield', 'Dicas'), bullets(DATA.safety.items)),
      pendingSlot(DATA.help.helpdesk.pending, DATA.help.helpdesk.title),
      pendingSlot(DATA.help.agency.pending, DATA.help.agency.title));
  }
}

let surveyKey = null;
function renderSurveyPage(now = clock.now()) {
  const box = $('#survey');
  if (!box) return;
  const open = now >= SURVEY_OPEN;
  const key = open ? 'open' : relIn(SURVEY_OPEN - now);
  if (key === surveyKey) return;
  surveyKey = key;
  const card = surveyCard(now);
  if (!open) card.append(h('p', { class: 'tag' }, icon('clock', 'i--sm'), `Abre ${key}`));
  box.replaceChildren(card);
}

const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function renderFaq() {
  if (!$('#faq')) return;
  $('#faq').replaceChildren(...DATA.faq.map((cat) => {
    const items = cat.items.filter((q) => q.a || (STATE.qa && STATE.qaPending));
    if (!items.length) return null;
    return h('section', { class: 'faq-cat' }, h('h3', { class: 'kicker' }, cat.cat),
      items.map((q) => (q.a
        ? h('details', { class: 'acc faq-item', name: 'faq' }, h('summary', null, h('span', null, q.q), icon('chevron-down')), h('div', { class: 'acc-body' }, h('p', null, rich(q.a))))
        : pendingSlot(q.pending, q.q))));
  }).filter(Boolean));
  applyFaqFilter();
}
function applyFaqFilter() {
  const input = $('#faq-q');
  if (!input) return;
  const q = norm(input.value.trim());
  let shown = 0;
  $$('#faq .faq-cat').forEach((cat) => {
    let any = false;
    $$('.faq-item', cat).forEach((d) => { const ok = !q || norm(d.textContent).includes(q); d.hidden = !ok; if (ok) { any = true; shown += 1; } });
    cat.hidden = !any && !!q;
  });
  const total = $$('#faq .faq-item').length;
  $('#faq-count').textContent = !q ? `${total} perguntas` : shown ? `${shown} de ${total} perguntas` : 'Nada encontrado. Tente outra palavra ou pergunte ao Agente Infield, no app.';
}

/* ================================================================ emergência, tema, navegação */

function initSOS() {
  const dlg = $('#sos');
  dlg.replaceChildren(...sheetHead(dlg, 'sos-title', 'Emergência', 'Toque no número para ligar.'), emergencyBlock(),
    h('div', { class: 'btn-row' }, h('a', { class: 'btn btn--block', href: `tel:${DATA.help.reception.tel}` }, icon('phone'), `${DATA.help.reception.label} · ${DATA.help.reception.phone}`)));
  $('#sos-btn').addEventListener('click', () => dlg.showModal());
  dlg.addEventListener('click', (e) => {
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });
}

const THEME_ORDER = ['auto', 'light', 'dark'];
const THEME_META = { auto: ['contrast', 'Tema automático'], light: ['sun', 'Tema claro'], dark: ['moon', 'Tema escuro'] };
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
function syncThemeUI() {
  const t = THEME_ORDER.includes(root.dataset.theme) ? root.dataset.theme : 'auto';
  const [ic, label] = THEME_META[t];
  const btn = $('#theme-btn');
  btn.replaceChildren(icon(ic));
  btn.setAttribute('aria-label', `${label}. Tocar para trocar.`);
  btn.title = label;
  const dark = t === 'dark' || (t === 'auto' && darkQuery.matches);
  $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', t === 'auto' ? (m.media.includes('dark') ? '#17181C' : '#F5F2F0') : dark ? '#17181C' : '#F5F2F0'));
}
function initTheme() {
  $('#theme-btn').addEventListener('click', () => {
    const cur = THEME_ORDER.includes(root.dataset.theme) ? root.dataset.theme : 'auto';
    const next = THEME_ORDER[(THEME_ORDER.indexOf(cur) + 1) % THEME_ORDER.length];
    const apply = () => { root.dataset.theme = next; syncThemeUI(); };
    if (doc.startViewTransition && !reducedMotion()) doc.startViewTransition(apply); else apply();
    store.set('theme', next);
    toast(THEME_META[next][1]);
  });
  darkQuery.addEventListener('change', syncThemeUI);
  syncThemeUI();
}

function initScrollSpy() {
  const links = $$('.nav-chips a');
  if (!links.length) return;
  const strip = $('.nav-chips');
  const nav = $('.nav');
  const sections = links.map((a) => doc.getElementById(a.hash.slice(1))).filter(Boolean);
  let current = null;
  const setCurrent = (id) => {
    if (id === current) return;
    current = id;
    links.forEach((a) => { if (a.hash.slice(1) === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    const a = links.find((l) => l.hash.slice(1) === id);
    if (a) strip.scrollTo({ left: a.offsetLeft - 12, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  // Seção atual = a última cujo topo já passou sob a navegação fixa (linha logo abaixo dela).
  let raf = 0;
  const update = () => {
    raf = 0;
    const line = nav.offsetHeight + 24;
    let id = null;
    for (const s of sections) { if (s.getBoundingClientRect().top <= line) id = s.id; else break; }
    setCurrent(id);
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  update();
}

/* ================================================================ modo QA */

function saveQA() {
  store.set('qa', { on: STATE.qa, all: STATE.qaAll, pending: STATE.qaPending, facts: STATE.qaFacts }, 'session');
  store.set('persona', STATE.persona, 'session');
}
function syncQAStats() {
  const box = $('#qa-stats');
  if (!box) return;
  const ids = new Set($$('[data-fact]').flatMap((el) => el.dataset.fact.split(' ').filter(Boolean)));
  const by = { confirmado: 0, validar: 0, pendente: 0 };
  ids.forEach((id) => { by[DATA.facts[id] ?? 'confirmado'] += 1; });
  const sim = clock.offset ? `Simulando ${DAYS[dayIndexFor(clock.now())]?.weekday.toLowerCase() ?? ''} ${dm(clock.now())}, ${hm(clock.now())}. ` : 'Horário real. ';
  box.textContent = `${sim}Fatos nesta página: ${ids.size} (confirmados ${by.confirmado} · a validar ${by.validar} · pendentes ${by.pendente}). Pendências cadastradas: ${Object.keys(DATA.pending).length}, ocultas para participantes (D06).`;
}
function initQA() {
  const host = $('#qa-root');
  host.replaceChildren();
  root.classList.toggle('qa-facts', STATE.qa && STATE.qaFacts);
  if (!STATE.qa) return;
  const sheet = h('div', { class: 'sheet', id: 'qa-sheet', popover: true, 'aria-labelledby': 'qa-title' });
  host.append(h('button', { class: 'qa-fab', type: 'button', popovertarget: 'qa-sheet', onclick: () => fillQA(sheet) }, icon('sliders'), 'QA'), sheet);
}
function fillQA(sheet) {
  const p = STATE.persona;
  const setTime = (value) => {
    if (!value) return;
    clock.set(Date.parse(`${value}:00${OFFSET}`));
    store.set('qa-now', value, 'session');
    STATE.day = null;
    rerender();
  };
  const timeInput = h('input', { type: 'datetime-local', id: 'qa-time', value: inputValue(clock.now()), min: '2026-11-01T00:00', max: '2026-11-30T23:59', onchange: (e) => setTime(e.target.value) });
  const presets = [['Antes', '2026-11-10T09:00'], ['16/11 9h', '2026-11-16T09:00'], ['16/11 15h', '2026-11-16T15:00'], ['17/11 10h', '2026-11-17T10:00'],
    ['17/11 12h15', '2026-11-17T12:15'], ['18/11 19h30', '2026-11-18T19:30'], ['19/11 14h', '2026-11-19T14:00'], ['Depois', '2026-11-20T10:00']];
  const persona = (key, value) => { if (value === '' || value == null || value === false) delete STATE.persona[key]; else STATE.persona[key] = value; saveQA(); rerender(); };
  const toggle = (key, label) => h('label', null, h('input', { type: 'checkbox', checked: STATE[key] || null, onchange: (e) => { STATE[key] = e.target.checked; saveQA(); rerender(); } }), label);
  const page = DATA.pages.find((x) => x.id === PAGE);
  const base = ONLINE_HOST ? `${location.origin}${location.pathname}` : `https://SEU-DOMINIO/${page?.file ?? ''}`;
  const spotme = `${base}#${DATA.spotme.params}`;
  sheet.replaceChildren(
    ...sheetHead(sheet, 'qa-title', 'Painel de QA', 'Visível só com qa=1 no endereço. Nada aqui é salvo no servidor.'),
    h('div', { class: 'qa-panel' },
      h('fieldset', null, h('legend', null, 'Horário do evento (Rio, UTC−3)'), timeInput,
        h('div', { class: 'btn-row' }, presets.map(([l, v]) => h('button', { class: 'btn', type: 'button', onclick: () => { timeInput.value = v; setTime(v); } }, l)),
          h('button', { class: 'btn', type: 'button', onclick: () => { clock.reset(); store.set('qa-now', null, 'session'); STATE.day = null; timeInput.value = inputValue(Date.now()); rerender(); } }, 'Tempo real'))),
      h('fieldset', null, h('legend', null, 'Participante simulado (merge tags)'),
        h('label', null, 'Nome', h('input', { type: 'text', value: p.name ?? '', maxlength: 40, onchange: (e) => persona('name', e.target.value.trim()) })),
        h('label', null, 'Grupo', h('select', { onchange: (e) => persona('groups', e.target.value ? [e.target.value] : '') },
          h('option', { value: '' }, '—'), Object.entries(DATA.groups).map(([c, g]) => h('option', { value: c, selected: p.groups?.[0] === c || null }, `${c} · ${g.name}`)))),
        h('label', null, h('input', { type: 'checkbox', checked: p.lid || null, onchange: (e) => persona('lid', e.target.checked) }), 'Liderança'),
        h('label', null, h('input', { type: 'checkbox', checked: p.jub || null, onchange: (e) => persona('jub', e.target.checked) }), 'Jubilando'),
        h('label', null, 'Almoço', h('select', { onchange: (e) => persona('alm', e.target.value) },
          h('option', { value: '' }, '—'), h('option', { value: '17', selected: p.alm === '17' || null }, '17/11'), h('option', { value: '18', selected: p.alm === '18' || null }, '18/11')))),
      h('fieldset', null, h('legend', null, 'Exibir'),
        toggle('qaAll', 'Todos os públicos segmentados'), toggle('qaPending', 'Pendências (D06)'), toggle('qaFacts', 'Fatos da Base (F##)')),
      h('fieldset', null, h('legend', null, `Link no SpotMe · ${page?.menu ?? ''}`),
        h('p', { class: 'qa-code' }, spotme),
        h('button', { class: 'btn', type: 'button', onclick: () => copyText(spotme, 'Link com merge tags copiado.') }, icon('copy'), 'Copiar link'),
        h('p', { class: 'fine' }, DATA.spotme.note)),
      h('p', { class: 'qa-stats', id: 'qa-stats', 'aria-live': 'polite' }),
      h('button', { class: 'btn', type: 'button', onclick: () => { STATE.qa = false; clock.reset(); store.set('qa-now', null, 'session'); saveQA(); hideSheet(sheet); initQA(); rerender(); } }, icon('x'), 'Sair do modo QA')));
  syncQAStats();
}

/* ================================================================ Fundos de tela
   Prévias já estão no HTML; os originais (JPG) vêm de #wall-data e viram blob: só quando pedidos. */

const WALL = (() => {
  const el = doc.getElementById('wall-data');
  return el ? JSON.parse(el.textContent) : {};
})();
const wallUrls = new Map();
function wallOriginal(id) {
  if (wallUrls.has(id)) return wallUrls.get(id);
  const src = WALL[id];
  if (!src) return '';
  const raw = atob(src.slice(src.indexOf(',') + 1));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
  wallUrls.set(id, url);
  return url;
}
const wallFile = (it) => `infield-2026-${it.id}.jpg`;
const wallSpecs = (it) => `${it.width} × ${it.height} px · JPG`;

function initWallpapers() {
  const items = DATA.wallpapers?.items ?? [];
  const dlg = $('#viewer');
  if (!items.length || !dlg) return;
  const img = $('#viewer-img');
  let index = 0;
  let opener = null;
  const show = (i) => {
    index = (i + items.length) % items.length;
    const it = items[index];
    const url = wallOriginal(it.id);
    img.src = url;
    img.alt = it.alt;
    $('#viewer-title').textContent = it.title;
    $('#viewer-device').textContent = it.device === 'watch' ? 'Apple Watch' : 'Celular';
    $('#viewer-specs').textContent = wallSpecs(it);
    $('#viewer-pos').textContent = `${index + 1} de ${items.length}`;
    const dl = $('#viewer-download');
    dl.href = url;
    dl.download = wallFile(it);
    $('#viewer-open').href = url;
  };
  $$('[data-wall-view]').forEach((b) => b.addEventListener('click', () => {
    opener = b;
    show(items.findIndex((it) => it.id === b.dataset.wallView));
    dlg.showModal();
  }));
  $$('[data-wall-download]').forEach((a) => {
    const it = items.find((x) => x.id === a.dataset.wallDownload);
    a.addEventListener('click', () => {
      a.href = wallOriginal(it.id);
      a.download = wallFile(it);
      toast('Download iniciado. Confira os downloads do aparelho.');
    });
  });
  $('#viewer-prev').addEventListener('click', () => show(index - 1));
  $('#viewer-next').addEventListener('click', () => show(index + 1));
  $('#viewer-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });
  // deslizar para o lado troca de arte
  let x0 = null;
  img.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  img.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 48) show(index + (dx < 0 ? 1 : -1));
  });
  dlg.addEventListener('close', () => opener?.focus());
}

/* ================================================================ Agente Infield
   Mesmo contrato do agente atual: POST {mensagens} em DATA.agent.endpoint; resposta em texto, em streaming.
   Markdown mínimo (parágrafos, listas e **negrito**) montado como DOM, sem innerHTML. */

function mdBlocks(text) {
  const frag = doc.createDocumentFragment();
  let list = null;
  for (const line of String(text).split('\n')) {
    const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      if (!list) { list = h('ul'); frag.append(list); }
      list.append(h('li', null, rich(item[1])));
      continue;
    }
    list = null;
    const clean = line.replace(/^#+\s*/, '').trim();
    if (clean) frag.append(h('p', null, rich(clean)));
  }
  return frag;
}

function initAgent() {
  const A = DATA.agent;
  const log = $('#chat-log');
  const list = $('#chat-msgs');
  const welcome = $('#chat-welcome');
  const form = $('#chat-form');
  const input = $('#chat-input');
  const send = $('#chat-send');
  const reset = $('#chat-reset');
  let busy = false;
  const load = () => { try { return JSON.parse(sessionStorage.getItem(A.storageKey)) || []; } catch { return []; } };
  const save = () => { try { sessionStorage.setItem(A.storageKey, JSON.stringify(convo)); } catch { /* sem armazenamento */ } };
  let convo = load().filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');

  if (STATE.persona.name) $('#chat-hello').textContent = `Olá, ${STATE.persona.name}! ${A.welcomeTitle}`;
  const scrollEnd = () => { log.scrollTop = log.scrollHeight; };
  const bubble = (role, text) => {
    const el = h('div', { class: role === 'user' ? 'msg msg--user' : 'msg msg--bot' });
    if (role === 'user') el.textContent = text; else el.append(mdBlocks(text));
    list.append(el);
    return el;
  };
  const sync = () => {
    welcome.hidden = convo.length > 0;
    reset.hidden = convo.length === 0;
    send.disabled = busy || !input.value.trim();
  };
  const fit = () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 128)}px`; };
  const failure = (question) => {
    const retry = h('button', { type: 'button', class: 'msg-retry', onclick: () => { box.remove(); ask(question, true); } }, 'Tentar de novo');
    const box = h('div', { class: 'msg msg--error', role: 'alert' }, ONLINE_HOST ? A.error : `${A.error} ${A.offline}`, ' ', retry);
    list.append(box);
    scrollEnd();
  };
  const typing = () => h('span', { class: 'typing', role: 'img', 'aria-label': 'Digitando' }, h('i'), h('i'), h('i'));

  async function ask(text, retrying = false) {
    const q = String(text).trim();
    if (!q || busy) return;
    busy = true;
    if (!retrying) { convo.push({ role: 'user', content: q }); bubble('user', q); save(); }
    input.value = '';
    fit();
    sync();
    const el = h('div', { class: 'msg msg--bot', 'aria-busy': 'true' }, typing());
    list.append(el);
    scrollEnd();
    let answer = '';
    try {
      if (!ONLINE_HOST) throw new Error('arquivo local');
      const res = await fetch(A.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagens: convo }), credentials: 'same-origin' });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += dec.decode(value, { stream: true });
        el.replaceChildren(mdBlocks(answer));
        scrollEnd();
      }
      answer += dec.decode();
      if (!answer.trim()) throw new Error('resposta vazia');
      el.replaceChildren(mdBlocks(answer));
      el.setAttribute('aria-busy', 'false');
      convo.push({ role: 'assistant', content: answer });
      save();
    } catch {
      el.remove();
      failure(q);
    } finally {
      busy = false;
      sync();
    }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  input.addEventListener('input', () => { fit(); sync(); });
  input.addEventListener('keydown', (e) => {
    // Enter envia no computador; no celular o teclado usa o botão Enviar
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(hover: hover)').matches) { e.preventDefault(); ask(input.value); }
  });
  $$('.chat-chip').forEach((c) => c.addEventListener('click', () => ask(c.textContent)));
  reset.addEventListener('click', () => {
    if (busy) return;
    convo = [];
    save();
    list.replaceChildren();
    sync();
    input.focus();
    toast('Nova conversa.');
  });
  convo.forEach((m) => bubble(m.role, m.content));
  sync();
  scrollEnd();
}

/* ================================================================ páginas e relógio */

const liveTimers = [];
const PAGES = {
  'informacoes-gerais': () => { renderHero(); renderProgram(); renderWeather(); renderMealsDress(); renderPrepare(); renderActions(); renderFaq(); },
  logistica: () => { renderVenue(); renderArrival(); renderTraffic(); renderAirports(); renderPlaces(); renderDeparture(); },
  seguranca: () => renderSafety(),
  avaliacao: () => { surveyKey = null; renderSurveyPage(); },
};
// inicialização única (não refaz no rerender do modo QA)
const PAGE_ONCE = {
  logistica: () => initPlan(),
  'fundos-de-tela': () => initWallpapers(),
};
const NEEDS_CLOCK = new Set(['informacoes-gerais', 'avaliacao']);

function rerender() {
  root.classList.toggle('qa-facts', STATE.qa && STATE.qaFacts);
  liveTimers.splice(0).forEach(clearInterval);
  PAGES[PAGE]?.();
  lastMinute = -1;
  tick();
  syncQAStats();
}

let tickTimer = 0;
let lastMinute = -1;
let lastPhase = '';
let lastDay = -2;
let lastAnnounced = null;

function refreshLive(now) {
  if (PAGE === 'avaliacao') { renderSurveyPage(now); return; }
  const nxt = nextItem(now);
  for (const [id, { li, bar }] of itemEls) {
    const it = ITEM.get(id);
    const st = now >= it.e ? 'past' : it.nowable && now >= it.s ? 'now' : nxt?.id === id ? 'next' : 'future';
    if (li.dataset.state !== st) li.dataset.state = st;
    if (st === 'now' && it.exactStart && it.exactEnd) bar.style.setProperty('--p', ((now - it.s) / (it.e - it.s)).toFixed(3));
  }
  const ph = phase(now);
  const today = dayIndexFor(now);
  $$('#day-tabs .tab').forEach((t, k) => {
    const isToday = ph === 'live' && k === today;
    t.querySelector('.today-bead').hidden = !isToday;
    t.querySelector('.tab-sr').textContent = `, ${DAYS[k].weekday.toLowerCase()}, ${DAYS[k].dm}${isToday ? ', hoje' : ''}`;
  });
  if (ph === 'live') {
    renderHero();
    if (today !== lastDay && today >= 0) selectDay(today, { animate: false });
    const cur = nowItem(now);
    if ((cur?.id ?? null) !== lastAnnounced) {
      lastAnnounced = cur?.id ?? null;
      $('#live-announcer').textContent = cur ? `Agora: ${cur.title}, ${cur.place}.` : '';
    }
  }
  lastDay = today;
}

function tick() {
  if (!NEEDS_CLOCK.has(PAGE)) return;
  const now = clock.now();
  const ph = phase(now);
  if (ph !== lastPhase) { if (lastPhase && PAGE === 'informacoes-gerais') renderHero(); lastPhase = ph; }
  if (ph === 'pre' && PAGE === 'informacoes-gerais') updateCountdown(now);
  const minute = Math.floor(now / 60_000);
  if (minute !== lastMinute) { lastMinute = minute; refreshLive(now); }
  clearTimeout(tickTimer);
  tickTimer = setTimeout(tick, 1000 - (now % 1000) + 20);
}

function boot() {
  const params = readParams();
  STATE.persona = params.hasPersona ? params.persona : store.get('persona', 'session') ?? {};
  const qa = store.get('qa', 'session') ?? {};
  STATE.qa = params.qa ?? qa.on ?? false;
  STATE.qaAll = qa.all ?? false;
  STATE.qaPending = qa.pending ?? true;
  STATE.qaFacts = qa.facts ?? true;
  saveQA();
  const nowParam = params.now ?? (STATE.qa ? store.get('qa-now', 'session') : null);
  if (STATE.qa && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(nowParam ?? '')) {
    const ms = Date.parse(`${nowParam}:00${OFFSET}`);
    if (!Number.isNaN(ms)) { clock.set(ms); store.set('qa-now', nowParam, 'session'); }
  }
  cleanUrl();
  initPopoverFallback();
  initTheme();
  const meta = $('#footer-meta');
  if (meta) meta.textContent = `Conteúdo de uso interno · ${DATA.meta.sources} · páginas v${DATA.meta.version}.`;
  initSOS();
  if (PAGE === 'agente') { initAgent(); root.dataset.ready = 'true'; return; }
  if ($('#faq-q')) { let t = 0; $('#faq-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(applyFaqFilter, 120); }); }
  initQA();
  PAGES[PAGE]?.();
  PAGE_ONCE[PAGE]?.();
  initScrollSpy();
  lastPhase = phase(clock.now());
  tick();
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden) { lastMinute = -1; tick(); } });
  root.dataset.ready = 'true';
}

boot();
