// QA da versão B: node fonte/qa/validar_b.js <pasta de saída>  (Playwright). Personas de src/voo.json.
const { chromium } = require('playwright');
const path = require('path');
const VOO = require('../src/voo.json');
const PAGE = 'file://' + path.resolve(__dirname, '../../publicar/index.html');
const OUT = process.argv[2];
const hashOf = (p) => (p.values === 'raw' ? VOO.fields.map(([k, f]) => `${k}={{activatedPerson.${f}}}`).join('&')
  : Object.entries(p.values).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'));
(async () => {
  const b = await chromium.launch(); const errs = []; const res = {};
  const open = async (ctx, hash, at) => {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push('js: ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    p.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) errs.push('rede: ' + r.url()); });
    if (at) await p.clock.setFixedTime(new Date(at));
    await p.goto(PAGE + (hash ? '#' + hash : '')); await p.waitForTimeout(350);
    return p;
  };
  const snap = (p) => p.evaluate(() => ({
    url: location.hash, lead: document.querySelector('#lead').innerText,
    tks: [...document.querySelectorAll('.tk')].map((t) => t.innerText.replace(/\s+/g, ' ').slice(0, 260)),
    vazio: document.querySelector('#vazio').hidden ? null : document.querySelector('#vazioT').textContent,
    arr: document.querySelector('#arr').innerText.replace(/\s+/g, ' ').slice(0, 200),
    overflow: document.documentElement.scrollWidth - innerWidth,
    clip: [...document.querySelectorAll('.tk')].flatMap((t) => { const q = t.getBoundingClientRect(); return [...t.querySelectorAll('strong,b,.pill,.cta,small')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > q.right - 4 || r.left < q.left + 4); }).map((e) => e.textContent); }),
  }));
  for (const w of [360, 390, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: w === 390 ? 2 : 1 });
    for (const per of VOO.qa.personas) {
      const p = await open(ctx, hashOf(per) + '&qa=1', '2026-11-10T18:00:00-03:00');
      const s = await snap(p); s.qa = await p.evaluate(() => document.querySelector('#qa summary')?.textContent);
      if (w === 390) { res[per.id] = s; await p.screenshot({ path: `${OUT}/b-${per.id}.png` }); }
      if (s.overflow || s.clip.length || s.url) errs.push(`${w}/${per.id}: overflow ${s.overflow} clip ${JSON.stringify(s.clip)} hash "${s.url}"`);
      if (s.tks.length > 1) { await p.click('#pager button[data-i="1"]'); await p.waitForTimeout(600); const v = await snap(p); if (w === 390) { res[per.id + ':volta'] = v.arr; } if (v.overflow) errs.push(`${w}/${per.id} volta overflow`); }
      await p.close();
    }
    await ctx.close();
  }
  // estados no tempo (persona direto) e fluxos
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const d = VOO.qa.personas.find((x) => x.id === 'direto');
  res.tempo = {};
  for (const at of ['2026-11-14T12:00:00-03:00', '2026-11-16T07:00:00-03:00', '2026-11-17T10:00:00-03:00', '2026-11-21T10:00:00-03:00']) {
    const p = await open(ctx, hashOf(d), at);
    res.tempo[at] = await p.evaluate(() => [...document.querySelectorAll('.tk')].map((t) => t.querySelector('[data-k=pill]').textContent + ' | ' + t.querySelector('[data-k=count]').innerText.replace(/\s+/g, ' ') + ' | cta ' + !(t.querySelector('[data-k=cta]')?.hidden ?? true) + (t.classList.contains('off') ? '' : ' | ATIVO')));
    await p.close();
  }
  const p = await open(ctx, hashOf(d), '2026-11-10T18:00:00-03:00');
  await p.reload(); await p.waitForTimeout(300); res.recarga = (await snap(p)).tks.length;
  await p.click('.tk [data-act=reveal]'); await p.click('.tk [data-act=copy]'); res.copia = await p.evaluate(() => navigator.clipboard.readText());
  for (const id of ['checkin', 'doc', 'bagagem', 'aeroporto']) await p.click(`.it[data-id=${id}]`);
  await p.waitForTimeout(2200); res.check = await p.evaluate(() => [document.querySelector('#progL').textContent, document.querySelector('#prog').className]);
  await p.click('#liveBtn'); res.folha = await p.evaluate(() => document.querySelectorAll('#sheet .opt').length);
  const dl = p.waitForEvent('download'); await p.click('#sheet [data-act=ics]'); res.ics = (await dl).suggestedFilename();
  await p.click('#liveBtn'); await p.click('#sheet [data-act=counter]'); res.balcao = (await p.innerText('#counter')).replace(/\s+/g, ' '); await p.click('#counter [data-close]');
  await p.click('#wipe'); await p.waitForTimeout(400); res.apagar = (await snap(p)).vazio;
  if (process.argv[3] === '-v') console.log(JSON.stringify(res, null, 1));
  else console.log(JSON.stringify({ tempo: res.tempo, recarga: res.recarga, copia: res.copia, check: res.check, folha: res.folha, ics: res.ics, apagar: !!res.apagar }));
  console.log('ERROS', [...new Set(errs)].slice(0, 8).map((e) => e.slice(0, 300)), errs.length);
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
