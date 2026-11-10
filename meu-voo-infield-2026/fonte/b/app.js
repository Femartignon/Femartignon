/* Meu Voo · versão B (v0.6.0) · tela. Valores do link só entram escapados (esc) ou por textContent. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const HOTEL = 'Grand Hyatt Rio de Janeiro';
const K_LINK = 'meu-voo:link', K_CHECK = 'meu-voo:check';
const CHECK = [
  ['checkin', 'Check-in online feito', ''],
  ['doc', 'Documento oficial com foto à mão', 'Vale para o embarque'],
  ['bagagem', 'Franquia de bagagem', '1 mala de 23 kg e 1 de 10 kg'],
  ['aeroporto', 'Chegada no aeroporto', 'Recomendação: 2 h antes do voo'],
];

/* ---- origem dos dados: link do SpotMe (fragmento) ou o que ficou nesta aba ---- */
function loadSource() {
  const qa = /(^|&)qa=1(&|$)/.test(location.hash.slice(1));
  const link = readVooHash();
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  try {
    if (link) sessionStorage.setItem(K_LINK, JSON.stringify(link));
    else { const s = sessionStorage.getItem(K_LINK); if (s) return [JSON.parse(s), 'sessao', qa]; }
  } catch (e) { /* sem armazenamento: segue só com o link */ }
  return link ? [link, 'link', qa] : [{}, 'vazio', qa];
}
const [MAP, SOURCE, QA] = loadSource();
const TRIP = tripFromMap(MAP, SOURCE);
const LEGS = ['ida', 'volta'].map((k) => TRIP.legs[k]).filter(Boolean);
const now = () => Date.now();

function phase(l, t) {
  if (l.dep == null) return 'semHora';
  if (t < l.dep) return l.checkinOpen != null && t >= l.checkinOpen ? 'checkin' : 'antes';
  return (l.arr != null ? t < l.arr : t < l.dep + 3 * HOUR) ? 'voo' : 'fim';
}
const apName = (a) => a.name || a.city;
const dayTxt = (l) => (l.day ? vDayShort(l.day) : '');
const maps = (o, d) => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}`;
const apQuery = (a) => `Aeroporto ${apName(a)} ${a.code}`;

/* ---- bilhete ---- */
const ARC = { p0: [14, 44], p1: [155, -18], p2: [296, 44], w: 310 };
function arcPoint(t) {
  const q = (a, b, c) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
  return [q(ARC.p0[0], ARC.p1[0], ARC.p2[0]), q(ARC.p0[1], ARC.p1[1], ARC.p2[1])];
}
function ticketHTML(l, i) {
  const full = [TRIP.name, TRIP.surname].filter(Boolean).join(' ');
  const mid = [l.dur ? vDur(l.dur) : '', l.cx ? `conexão em ${l.cx.code}` : 'direto'].filter(Boolean).join('<br>');
  const cell = (label, v) => (v ? `<div><small>${label}</small><b>${esc(v)}</b></div>` : '');
  const cells = [cell('Passageiro', full), cell('Voo', l.flight)];
  if (l.cx) cells.push(cell('Conexão', `${l.cx.city} (${l.cx.code})`), cell('Voo da conexão', l.cxFlight));
  if (cells.filter(Boolean).length % 2) cells.push('<div></div>');
  return `<article class="tk${i ? ' off' : ''}" id="tk-${l.key}" aria-label="Voo de ${l.label.toLowerCase()}: ${esc(l.o.city)} para ${esc(l.d.city)}">
  <div class="tk-top"><span class="eb"><i class="bead"></i>${[l.label, dayTxt(l)].filter(Boolean).join(' · ')}</span><span class="pill" data-k="pill" hidden></span></div>
  <div class="codes"><div><strong>${l.o.code}</strong><small>${esc(l.o.city)}</small></div><div class="r"><strong>${l.d.code}</strong><small>${esc(l.d.city)}</small></div></div>
  <div class="arc" aria-hidden="true"><svg viewBox="0 0 310 54" preserveAspectRatio="none">
    <path d="M14 44 Q155 -18 296 44" fill="none" stroke="#F5F2F0" stroke-opacity=".22" stroke-width="1.5" stroke-dasharray="2 5"/>
    <path data-k="trail" d="M14 44 Q155 -18 296 44" pathLength="1" fill="none" stroke="#E1242A" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="0 1"/></svg>
    <i class="o"></i><i class="d" data-k="dest"></i><span class="pl" data-k="plane">${I.plane}</span></div>
  <div class="times"><div><strong>${l.depText ?? ''}</strong><small>${esc(apName(l.o))}</small></div><span>${mid}</span><div class="r"><strong>${l.arrText ? l.arrText + (l.overnight ? '<sup>+1</sup>' : '') : ''}</strong><small>${esc(apName(l.d))}</small></div></div>
  <div class="count" data-k="count" hidden></div>
  <div class="tear" aria-hidden="true"><i></i><i></i></div>
  <div class="stub">${cells.join('')}
    ${l.pnr ? `<div><small>Localizador</small><b class="pnr" data-k="pnr"></b></div>
    <div class="tools"><button type="button" data-act="reveal" aria-pressed="false" aria-label="Mostrar localizador">${I.eye}</button><button type="button" data-act="copy" aria-label="Copiar localizador">${I.copy}</button></div>` : ''}
  </div>
  ${l.airline?.checkinUrl ? `<a class="cta" data-k="cta" href="${esc(l.airline.checkinUrl)}" target="_blank" rel="noopener noreferrer">Fazer check-in na ${esc(l.airline.name)}</a>` : ''}
  <p class="fine" data-k="fine"></p>
</article>`;
}
const shown = new Set();
function paintPnr(l) {
  if (!l.pnr) return;
  const el = $(`#tk-${l.key} [data-k="pnr"]`), on = shown.has(l.key);
  el.innerHTML = on ? esc(l.pnr) : `<em aria-hidden="true">${'•'.repeat(Math.max(2, l.pnr.length - 2))}</em>${esc(l.pnr.slice(-2))}<span class="sr"> (oculto)</span>`;
  const b = $(`#tk-${l.key} [data-act="reveal"]`);
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', on ? 'Ocultar localizador' : 'Mostrar localizador');
}
function paintLeg(l) {
  const t = now(), ph = phase(l, t), root = $(`#tk-${l.key}`), k = (n) => $(`[data-k="${n}"]`, root);
  const pill = k('pill'), count = k('count'), cta = k('cta'), fine = k('fine');
  let prog = 0, bar = null;
  pill.hidden = count.hidden = ph === 'semHora';
  if (ph === 'antes' || ph === 'checkin') {
    const days = vCalDays(t, l.dep, l.o.tz);
    pill.textContent = ph === 'checkin' ? 'Check-in aberto' : days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `Em ${days} dias`;
    pill.className = 'pill';
    const left = Math.max(0, l.dep - t), d = Math.floor(left / DAY), hh = Math.floor((left % DAY) / HOUR), mm = Math.floor((left % HOUR) / MIN);
    count.innerHTML = `<small>Faltam para o embarque</small><div class="nums"><div><b>${pad2(d)}</b><small>${d === 1 ? 'dia' : 'dias'}</small></div><i class="bead"></i><div><b>${pad2(hh)}</b><small>${hh === 1 ? 'hora' : 'horas'}</small></div><i class="bead g"></i><div><b>${pad2(mm)}</b><small>min</small></div></div>`;
    if (cta) cta.hidden = false;
    fine.textContent = !l.airline ? '' : ph === 'checkin' ? 'Check-in aberto até o embarque.'
      : `Abre ${l.airline.checkinHours} h antes: ${vDayShort(vDayOf(l.checkinOpen, l.o.tz))}, às ${vClockTz(l.checkinOpen, l.o.tz)}`;
  } else if (ph === 'voo') {
    prog = l.arr != null ? Math.min(1, (t - l.dep) / (l.arr - l.dep)) : .5;
    pill.textContent = 'Em voo'; pill.className = 'pill';
    count.innerHTML = l.arr != null ? `<small>Pouso previsto às ${l.arrText}</small><p>Faltam ${Math.max(1, Math.round((l.arr - t) / MIN))} min</p><div class="bar"><i></i></div>` : '<small>Agora</small><p>Em voo</p>';
    bar = prog;
    if (cta) cta.hidden = true;
    fine.textContent = 'Boa viagem! Horários conforme a emissão da agência.';
  } else if (ph === 'fim') {
    prog = 1; bar = 1;
    pill.textContent = 'Concluído'; pill.className = 'pill soft';
    count.innerHTML = `<small>${dayTxt(l)}</small><p>Voo concluído</p><div class="bar"><i></i></div>`;
    if (cta) cta.hidden = true;
    fine.textContent = l.key === 'ida' ? 'Bom Encontro!' : 'Obrigado por escrever o Encontro com a gente.';
  } else {
    if (cta) cta.hidden = false;
    fine.textContent = '';
  }
  const fill = $('.bar i', count); if (fill && bar != null) fill.style.width = `${Math.round(bar * 100)}%`;
  const [x, y] = arcPoint(prog), pl = k('plane');
  pl.style.left = `${(x / ARC.w) * 100}%`; pl.style.top = `${y}px`;
  pl.style.transform = `rotate(${prog * 28 - 14}deg)`;
  k('trail').setAttribute('stroke-dasharray', `${prog} 1`);
  k('dest').classList.toggle('on', prog >= 1);
}

/* ---- carrossel ---- */
const car = $('#car');
let active = 0;
function setActive(i) {
  if (i === active) return;
  active = i;
  $$('.tk', car).forEach((el, n) => el.classList.toggle('off', n !== i));
  $$('#pager button').forEach((b, n) => b.setAttribute('aria-current', String(n === i)));
  $('#pager').classList.toggle('v', i === 1);
  paintMini(); paintLead(); paintArrival();
}
function goTo(i) {
  const el = $$('.tk', car)[i]; if (!el) return;
  car.scrollTo({ left: el.offsetLeft - 16, behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
  setActive(i);
}
function onCarScroll() {
  const mid = car.scrollLeft + car.clientWidth / 2;
  let best = 0, bd = Infinity;
  $$('.tk', car).forEach((c, n) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = n; } });
  setActive(best);
}

/* ---- cabeçalho e barra compacta ---- */
function paintLead() {
  const hi = TRIP.name ? `Olá, <b>${esc(TRIP.name)}</b>! ` : '';
  const l = LEGS[active];
  $('#lead').innerHTML = !l ? hi + (TRIP.state === 'semVoo' ? '' : esc(VOO.texts.leadNoData))
    : hi + (LEGS.length > 1 ? `Deslize para ver a ${LEGS[1 - active].label.toLowerCase()}.` : esc(VOO.texts.lead));
}
function paintMini() {
  const l = LEGS[active]; if (!l) return;
  $('#mini').innerHTML = `${l.o.code} ${I.plane} ${l.d.code}<span>${[dayTxt(l), l.depText, l.flight].filter(Boolean).map(esc).join(' · ')}</span>`;
}

/* ---- checklist ---- */
let done = new Set();
try { done = new Set(JSON.parse(localStorage.getItem(K_CHECK) || '[]')); } catch (e) { /* sem armazenamento: segue em memória */ }
let prevN = -1;
function paintCheck() {
  const n = CHECK.filter(([id]) => done.has(id)).length, all = n === CHECK.length, prog = $('#prog');
  $$('i', prog).forEach((el, i) => el.classList.toggle('on', i < n));
  $$('u', prog).forEach((el, i) => el.classList.toggle('on', i + 1 < n));
  prog.classList.toggle('done', all);
  prog.classList.toggle('celebrate', all && prevN >= 0 && prevN < CHECK.length);
  const lab = $('#progL');
  lab.textContent = all ? 'Tudo pronto para voar' : `${n} de ${CHECK.length} prontos`;
  lab.classList.toggle('ok', all);
  $$('#list .it').forEach((b) => b.setAttribute('aria-checked', String(done.has(b.dataset.id))));
  prevN = n;
}
function buildCheck() {
  const al = LEGS[0]?.airline;
  CHECK[0][2] = al ? `Abre ${al.checkinHours} h antes, no app ou no site da ${al.name}.` : 'No app ou no site da companhia aérea.';
  $('#prog').innerHTML = CHECK.map((_, i) => `${i ? '<u><s></s></u>' : ''}<i>${i === CHECK.length - 1 ? I.check : ''}</i>`).join('');
  $('#list').innerHTML = CHECK.map(([id, t, note]) => `<button type="button" class="it" role="checkbox" aria-checked="false" data-id="${id}"><span class="cb">${I.check}</span><span><b>${t}</b><small>${esc(note)}</small></span></button>`).join('');
  $('#list').addEventListener('click', (e) => {
    const b = e.target.closest('.it'); if (!b) return;
    done.has(b.dataset.id) ? done.delete(b.dataset.id) : done.add(b.dataset.id);
    try { localStorage.setItem(K_CHECK, JSON.stringify([...done])); } catch (err) { /* idem */ }
    paintCheck();
  });
}

/* ---- chegada (ida) e transfer de retorno (volta) ---- */
function paintArrival() {
  const l = LEGS[active]; if (!l) return;
  const volta = l.key === 'volta';
  const ext = 'target="_blank" rel="noopener noreferrer"';
  $('#dkArr').innerHTML = volta ? `${I.car}<b>Transfer</b>` : `${I.pin}<b>Chegada</b>`;
  if (!volta) {
    $('#arrE').textContent = 'No desembarque';
    $('#arrH').innerHTML = 'Chegada <i>ao</i> <em>Rio</em>';
    $('#arr').innerHTML = `<div class="leg"><strong>${l.d.code}</strong><u></u><span>${I.car}</span><u></u><strong>Hyatt</strong></div>
  <div class="leg-l"><small>${esc([apName(l.d), l.arrText].filter(Boolean).join(' · '))}</small><small class="r">Grand Hyatt · Barra da Tijuca</small></div>
  <p>${TRIP.transfer === false ? esc(VOO.texts.noTransfer) : 'Procure o receptivo do Encontro Infield no desembarque: o transfer leva você ao hotel.'}</p>
  <div class="btns"><a class="cta" href="${maps(apQuery(l.d), HOTEL)}" ${ext}>Rota até o hotel</a><a class="cta out" href="${esc(VOO.logisticaUrl)}" ${ext}>Trânsito ao vivo</a></div>`;
    return;
  }
  const tv = TRIP.tv, clock = tv && /^\d{1,2}\s*[:hH]\s*\d{0,2}$/.test(tv) ? vParseClock(tv) : null;
  const box = TRIP.transfer === false ? '<span>O seu pacote logístico não inclui transfer. Do hotel ao aeroporto, siga por conta própria.</span>'
    : clock ? `<strong>${vClockOf(clock)}</strong>${l.day ? `<span>${dayTxt(l)}</span>` : ''}`
      : tv ? `<strong class="txt">${esc(tv)}</strong>`
        : '<span>O horário do seu transfer aparece aqui assim que for confirmado.</span>';
  $('#arrE').textContent = 'No retorno';
  $('#arrH').innerHTML = 'Transfer <i>de</i> <em>retorno</em>';
  $('#arr').innerHTML = `<div class="leg"><strong>Hyatt</strong><u></u><span>${I.car}</span><u></u><strong>${l.o.code}</strong></div>
  <div class="leg-l"><small>Grand Hyatt · Barra da Tijuca</small><small class="r">${esc([apName(l.o), l.depText ? `voo às ${l.depText}` : ''].filter(Boolean).join(' · '))}</small></div>
  <div class="tr"><small>Saída prevista do hotel</small>${box}</div>
  <p>Horário previsto para o seu transfer de retorno, do Grand Hyatt ao aeroporto.</p>
  <div class="btns"><a class="cta" href="${maps(HOTEL, apQuery(l.o))}" ${ext}>Rota até o aeroporto</a><a class="cta out" href="${esc(VOO.logisticaUrl)}" ${ext}>Trânsito ao vivo</a></div>`;
}

/* ---- folha "Ao vivo", agenda, balcão ---- */
function openSheet() {
  const l = LEGS[active], fr = fr24(l.flight), ext = 'target="_blank" rel="noopener noreferrer"';
  $('#sheetC').innerHTML = `${fr ? `<a class="opt" href="${fr}" ${ext}><span>${I.radar}</span><span><b>Acompanhar o voo ${esc(l.flight)}</b><small>Posição e horário no Flightradar24</small></span></a>` : ''}
  <a class="opt" href="${esc(VOO.logisticaUrl)}" ${ext}><span>${I.route}</span><span><b>Trânsito ao vivo</b><small>Entre o aeroporto e o Grand Hyatt, na Logística do Evento</small></span></a>
  ${l.dep != null ? `<button type="button" class="opt" data-act="ics"><span>${I.cal}</span><span><b>Salvar o voo de ${l.label.toLowerCase()} na agenda</b><small>Com lembrete 2 horas antes</small></span></button>` : ''}
  <button type="button" class="opt" data-act="counter"><span>${I.expand}</span><span><b>Mostrar no balcão</b><small>Voo e localizador em tela cheia</small></span></button>`;
  $('#sheet').showModal();
}
const icsStamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEsc = (s) => String(s).replace(/[\;,]/g, '\\$&').replace(/\r?\n/g, '\\n');
function saveICS(l) {
  const title = `Voo ${l.flight ?? ''} · ${l.o.code} → ${l.d.code}`.replace(/\s+/g, ' ');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Encontro Infield 2026//Meu Voo//PT', 'BEGIN:VEVENT', `UID:meu-voo-${l.key}@encontro-infield-2026`,
    `DTSTAMP:${icsStamp(Date.now())}`, `DTSTART:${icsStamp(l.dep)}`, `DTEND:${icsStamp(l.arr ?? l.dep + HOUR)}`, `SUMMARY:${icsEsc(title)}`,
    `LOCATION:${icsEsc(`Aeroporto ${apName(l.o)} (${l.o.code})`)}`, `DESCRIPTION:${icsEsc(`Encontro Infield 2026 · voo de ${l.label.toLowerCase()}.`)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(title)}`, 'TRIGGER:-PT2H', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
  const url = URL.createObjectURL(new Blob([L.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `encontro-infield-2026-voo-${l.key}.ics` });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Arquivo da agenda gerado');
}
let wake = null;
async function openCounter() {
  const l = LEGS[active], full = [TRIP.name, TRIP.surname].filter(Boolean).join(' ');
  $('#counter').innerHTML = `<small>${esc([`Voo de ${l.label.toLowerCase()}`, dayTxt(l), l.depText].filter(Boolean).join(' · '))}</small><div class="rt">${l.o.code} → ${l.d.code}</div><b>${esc([l.flight, full].filter(Boolean).join(' · '))}</b>
  ${l.pnr ? `<small class="gap">Localizador</small><div class="big">${esc(l.pnr)}</div>` : ''}<button type="button" class="cta" data-close>Fechar</button>`;
  $('#sheet').close(); $('#counter').showModal();
  try { wake = await navigator.wakeLock?.request('screen'); } catch (e) { /* opcional */ }
}
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

/* ---- dock conforme a rolagem ---- */
function paintDock() {
  const y = innerHeight * .4;
  let cur = 'bilhete';
  for (const id of ['antes', 'chegada']) if ($('#' + id).getBoundingClientRect().top < y) cur = id;
  $$('.dock a').forEach((a) => a.setAttribute('aria-current', String(a.dataset.s === cur)));
  const show = car.getBoundingClientRect().bottom < 72;
  const mini = $('#mini'); mini.classList.toggle('show', show); mini.tabIndex = show ? 0 : -1;
}

/* ---- diagnóstico (&qa=1 no link) e apagar dados ---- */
function buildQA() {
  if (!QA) return;
  const ST = { ok: 'com valor', vazio: 'vazio', ausente: 'não recebido', cru: 'tag sem resolver' };
  const rows = TRIP.report.map((r) => `<li class="q-${r.st}"><b>${esc(r.label)}</b><small>${esc(r.field)} · ${ST[r.st]}</small></li>`).join('');
  const c = (st) => TRIP.report.filter((r) => r.st === st).length;
  $('#qa').innerHTML = `<details open><summary>Diagnóstico do link · ${c('ok')} com valor · ${c('vazio')} vazios · ${c('ausente')} não recebidos · ${c('cru')} sem resolver</summary><p>Origem: ${SOURCE === 'link' ? 'link do SpotMe' : SOURCE === 'sessao' ? 'link guardado nesta aba' : 'nenhum dado'} · versão ${esc(VOO.version)}</p><ul>${rows}</ul></details>`;
  $('#qa').hidden = false;
}
function wipe() {
  try { sessionStorage.removeItem(K_LINK); localStorage.removeItem(K_CHECK); } catch (e) { /* nada a apagar */ }
  location.reload();
}

/* ---- início ---- */
const paintAll = () => LEGS.forEach(paintLeg);
function init() {
  $('#wipe').addEventListener('click', wipe);
  buildQA(); paintLead();
  if (!LEGS.length) {
    document.body.classList.add('vazio');
    $('#vazio').hidden = false;
    $('#vazioT').textContent = TRIP.state === 'semVoo' ? 'Seus voos aparecem aqui quando a agência emitir a passagem.' : VOO.texts.noData;
    return;
  }
  car.innerHTML = LEGS.map(ticketHTML).join('');
  car.classList.toggle('one', LEGS.length === 1);
  $('#pager').hidden = LEGS.length < 2;
  if (LEGS.length > 1) $('#pager').innerHTML = LEGS.map((l, i) => `${i ? '<u></u>' : ''}<button type="button" data-i="${i}" aria-current="${!i}"><i class="bead"></i>${l.label}</button>`).join('');
  LEGS.forEach(paintPnr);
  const t = now();
  const start = LEGS.findIndex((l) => phase(l, t) !== 'fim');
  buildCheck(); paintCheck(); paintArrival(); paintMini(); paintAll(); paintDock();
  car.addEventListener('scroll', () => requestAnimationFrame(onCarScroll), { passive: true });
  car.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') goTo(active + 1); if (e.key === 'ArrowLeft') goTo(active - 1); });
  $('#pager').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) goTo(+b.dataset.i); });
  car.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const l = LEGS.find((x) => b.closest('.tk').id === `tk-${x.key}`);
    if (b.dataset.act === 'reveal') { shown.has(l.key) ? shown.delete(l.key) : shown.add(l.key); paintPnr(l); }
    if (b.dataset.act === 'copy') { try { await navigator.clipboard.writeText(l.pnr); toast('Localizador copiado'); } catch (err) { shown.add(l.key); paintPnr(l); toast('Copie o localizador exibido'); } }
  });
  $('#liveBtn').addEventListener('click', openSheet);
  $('#sheet').addEventListener('click', (e) => {
    if (e.target === e.currentTarget || e.target.closest('[data-close]')) return $('#sheet').close();
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'ics') { saveICS(LEGS[active]); $('#sheet').close(); }
    if (b.dataset.act === 'counter') openCounter();
  });
  $('#counter').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) $('#counter').close(); });
  $('#counter').addEventListener('close', () => { try { wake?.release(); } catch (e) { /* opcional */ } wake = null; });
  $('#mini').addEventListener('click', () => scrollTo({ top: 0 }));
  addEventListener('scroll', () => requestAnimationFrame(paintDock), { passive: true });
  addEventListener('resize', paintDock);
  setInterval(paintAll, 15000);
  if (start > 0) requestAnimationFrame(() => { car.scrollLeft = $$('.tk', car)[start].offsetLeft - 16; setActive(start); });
}
init();
