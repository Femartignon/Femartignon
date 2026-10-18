// Banners de sessão (agenda do app SpotMe) — Encontro Infield 2026.
// Fonte única de verdade: gera os PNG de cada sessão nos dois layouts e a prévia
// com a faixa escura do app simulada. Uso: node build.js  (Playwright + Chromium do ambiente)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, 'out');
const FONTS = path.join(__dirname, 'fonts');

// Sessões (ordem da agenda de 16/11). `kicker` é a única variação por sessão:
// o nome da sessão quem escreve é o app, por cima do banner.
const SESSOES = [
  { slug: 'chegada-do-grupo', titulo: 'Chegada do Grupo', local: 'Rio de Janeiro', hora: '8:00 AM', kicker: 'Chegada' },
  { slug: 'reuniao-de-lideranca', titulo: 'Reunião de Liderança', local: 'Rio Ballroom 1', hora: '12:00 PM', kicker: 'Liderança' },
  { slug: 'abertura-oficial', titulo: 'Abertura Oficial do Encontro Infield 2026', local: 'Grand Ballroom', hora: '2:30 PM', kicker: 'Abertura oficial' },
  { slug: 'resultados-e-estrategia', titulo: 'Resultados e Estratégia', local: 'Grand Ballroom', hora: '2:40 PM', kicker: 'Plenária' },
  { slug: 'entrevista-com-paciente', titulo: 'Entrevista com Paciente', local: 'Grand Ballroom', hora: '3:25 PM', kicker: 'Plenária' },
];

// Paleta: fundo grafite (sob o véu do app quase não muda) + vermelho da marca.
const C = {
  bg0: '#111A24', bg1: '#1A2533', bg2: '#243243',
  red: '#E1242A', redDeep: '#8E1117', redLight: '#FF5A5F',
};

// Gerador determinístico (mesma arte a cada build).
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Rede de pontos: curvas finas com nós, como na arte aprovada.
function rede(W, H, seed, linhas, x0) {
  const r = rng(seed);
  let svg = '';
  for (let i = 0; i < linhas; i++) {
    const y1 = H * (0.15 + r() * 0.8), y2 = H * (r() * 0.9);
    const xa = x0 + r() * (W - x0) * 0.3, xb = W;
    const c1 = [xa + (xb - xa) * 0.35, y1 - H * 0.35 * r()], c2 = [xa + (xb - xa) * 0.7, y2 + H * 0.35 * r()];
    const d = `M${xa},${y1} C${c1} ${c2} ${xb},${y2}`;
    svg += `<path d="${d}" fill="none" stroke="rgba(255,255,255,${0.2 + r() * 0.15})" stroke-width="${H > 200 ? 1.3 : 1}"/>`;
    // nós ao longo da curva
    const n = 3 + Math.floor(r() * 3);
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1) + (r() - 0.5) * 0.08;
      const p = bez([xa, y1], c1, c2, [xb, y2], t);
      const tipo = r();
      const rad = (H > 200 ? 1.6 : 1) * (2 + r() * 2.2);
      if (tipo < 0.4) svg += `<circle cx="${p[0]}" cy="${p[1]}" r="${rad}" fill="${C.redLight}"/>`;
      else if (tipo < 0.75) svg += `<circle cx="${p[0]}" cy="${p[1]}" r="${rad * 0.8}" fill="rgba(255,255,255,.75)"/>`;
      else svg += `<circle cx="${p[0]}" cy="${p[1]}" r="${rad * 1.5}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.2"/>`;
    }
  }
  // poeira de pontos
  for (let i = 0; i < 26; i++) {
    svg += `<circle cx="${x0 * 0.4 + r() * (W - x0 * 0.4)}" cy="${r() * H}" r="${0.8 + r() * 1.4}" fill="rgba(255,255,255,${0.15 + r() * 0.25})"/>`;
  }
  return svg;
}
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [0, 1].map(i => +(u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]).toFixed(1));
}

// Fita vermelha: faixa larga + faixa clara translúcida + filete de brilho.
function fita(W, H, a) {
  // a = pontos de controle em frações de W/H
  const P = ([x, y]) => `${(x * W).toFixed(1)},${(y * H).toFixed(1)}`;
  const top = `M${P(a.s1)} C${P(a.c1)} ${P(a.c2)} ${P(a.e1)}`;
  const back = `L${P(a.e2)} C${P(a.c4)} ${P(a.c3)} ${P(a.s2)} Z`;
  const hl = `M${P(a.h1)} C${P(a.hc1)} ${P(a.hc2)} ${P(a.h2)}`;
  return `
    <path d="${top} ${back}" fill="url(#gRed)"/>
    <path d="M${P(a.l1)} C${P(a.lc1)} ${P(a.lc2)} ${P(a.l2)} L${P(a.l3)} C${P(a.lc3)} ${P(a.lc4)} ${P(a.l4)} Z" fill="url(#gRedLight)" opacity=".55"/>
    <path d="${hl}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="${H > 200 ? 1.6 : 1.1}"/>`;
}

// Skyline do Rio em traço fino (Pão de Açúcar, Urca, Corcovado, orla) — layout B.
function skyline(W, H) {
  const base = H * 0.93;
  const X = f => (f * W).toFixed(1), Y = f => (f * H).toFixed(1);
  const morros = `M${X(0.56)},${base}
    C${X(0.6)},${base} ${X(0.615)},${Y(0.62)} ${X(0.64)},${Y(0.6)}
    C${X(0.655)},${Y(0.59)} ${X(0.665)},${Y(0.74)} ${X(0.68)},${Y(0.76)}
    C${X(0.69)},${Y(0.62)} ${X(0.7)},${Y(0.38)} ${X(0.715)},${Y(0.36)}
    C${X(0.73)},${Y(0.35)} ${X(0.74)},${Y(0.6)} ${X(0.76)},${Y(0.8)}
    C${X(0.78)},${Y(0.84)} ${X(0.8)},${Y(0.8)} ${X(0.83)},${Y(0.62)}
    C${X(0.85)},${Y(0.5)} ${X(0.865)},${Y(0.47)} ${X(0.875)},${Y(0.48)}
    C${X(0.89)},${Y(0.5)} ${X(0.91)},${Y(0.72)} ${X(0.94)},${Y(0.8)}
    L${X(0.97)},${base}`;
  // prédios da orla
  const r = rng(7);
  let predios = '';
  for (let x = 0.765; x < 0.96; x += 0.0065 + r() * 0.004) {
    const h = H * (0.05 + r() * 0.09);
    predios += `<rect x="${X(x)}" y="${(base - h).toFixed(1)}" width="${(W * (0.004 + r() * 0.003)).toFixed(1)}" height="${h.toFixed(1)}" fill="#26344A" stroke="rgba(255,255,255,.45)" stroke-width="1"/>`;
  }
  // Cristo: só um traço vertical/cruz fina no topo do Corcovado
  const cx = 0.875 * W, cy = 0.48 * H;
  const cristo = `<path d="M${cx},${cy} v-${H * 0.06} M${cx - H * 0.025},${cy - H * 0.045} h${H * 0.05}" stroke="rgba(255,255,255,.85)" stroke-width="2" fill="none"/>`;
  return `
    <path d="${morros} Z" fill="#2C3B4F" opacity=".9"/>
    <path d="${morros}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2"/>
    ${predios}
    <line x1="${X(0.54)}" y1="${base}" x2="${X(0.99)}" y2="${base}" stroke="rgba(255,255,255,.5)" stroke-width="1.2"/>
    <path d="M${X(0.64)},${Y(0.6)} L${X(0.715)},${Y(0.36)}" stroke="rgba(255,255,255,.3)" stroke-width="1" fill="none"/>
    ${cristo}`;
}

const LAYOUTS = {
  // A: formato atual do app (1000×150). Zona segura horizontal ~200–800 px (o app corta as laterais).
  A: {
    W: 1000, H: 150, nome: 'fita',
    kicker: { x: 300, y: 27, size: 11 },
    arte: (W, H) => fita(W, H, {
      s1: [0.5, 1.05], c1: [0.66, 1.0], c2: [0.7, 0.05], e1: [1.02, -0.05],
      e2: [1.02, 0.55], c4: [0.84, 0.5], c3: [0.8, 1.05], s2: [0.66, 1.05],
      l1: [0.6, 1.05], lc1: [0.72, 0.9], lc2: [0.78, 0.2], l2: [1.02, 0.2],
      l3: [1.02, 0.42], lc3: [0.86, 0.45], lc4: [0.8, 1.0], l4: [0.7, 1.05],
      h1: [0.47, 1.0], hc1: [0.64, 0.9], hc2: [0.7, -0.05], h2: [1.0, -0.02],
    }) + rede(W, H, 11, 4, 380),
  },
  // B: 1500×300 — proporção 5:1, mais próxima da faixa do app (corta menos).
  B: {
    W: 1500, H: 300, nome: 'panorama',
    kicker: { x: 300, y: 46, size: 17 },
    arte: (W, H) => skyline(W, H) + fita(W, H, {
      s1: [0.62, -0.05], c1: [0.72, 0.35], c2: [0.85, 0.05], e1: [1.02, 0.25],
      e2: [1.02, 0.55], c4: [0.88, 0.32], c3: [0.78, 0.65], s2: [0.66, -0.05],
      l1: [0.7, -0.05], lc1: [0.78, 0.3], lc2: [0.9, 0.2], l2: [1.02, 0.6],
      l3: [1.02, 0.72], lc3: [0.9, 0.35], lc4: [0.8, 0.45], l4: [0.73, -0.05],
      h1: [0.58, -0.05], hc1: [0.7, 0.42], hc2: [0.86, 0.12], h2: [1.02, 0.45],
    }) + rede(W, H, 23, 5, 520),
  },
};

function fontFace() {
  return [500, 600, 700, 800].map(w =>
    // embutida como data URI: página carregada via setContent não acessa file://
    `@font-face{font-family:Poppins;font-weight:${w};src:url(data:font/ttf;base64,${fs.readFileSync(path.join(FONTS, `poppins-${w}.ttf`)).toString('base64')})}`).join('');
}

function bannerHTML(L, s) {
  const { W, H } = L, k = L.kicker;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFace()}
  html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
  .b{position:relative;width:${W}px;height:${H}px;background:linear-gradient(100deg,${C.bg0} 0%,${C.bg1} 55%,${C.bg2} 100%)}
  svg{position:absolute;inset:0}
  .k{position:absolute;left:${k.x}px;top:${k.y - k.size}px;font:600 ${k.size}px/1 Poppins;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.72);display:flex;align-items:center;gap:${k.size * 0.8}px;white-space:nowrap}
  .k i{display:block;width:${k.size * 2}px;height:${Math.max(2, k.size / 5)}px;background:${C.red};border-radius:2px}
  .k b{color:${C.redLight};font-weight:700}
  </style></head><body><div class="b">
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="gRed" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${C.redDeep}"/><stop offset=".55" stop-color="${C.red}"/><stop offset="1" stop-color="${C.redLight}"/></linearGradient>
      <linearGradient id="gRedLight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8A8E"/><stop offset="1" stop-color="${C.red}"/></linearGradient>
      <radialGradient id="glow" cx=".82" cy=".4" r=".55"><stop offset="0" stop-color="rgba(225,36,42,.28)"/><stop offset="1" stop-color="rgba(225,36,42,0)"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    ${L.arte(W, H)}
  </svg>
  <div class="k"><i></i>Encontro Infield 2026 · <b>${s.kicker}</b></div>
  </div></body></html>`;
}

// Prévia: linha da agenda como no print do app (923 px de largura, véu ~62% preto
// a partir de 22% da altura, horário e título em branco). A imagem cobre a linha (object-fit: cover).
function previewHTML(imgs) {
  const linhas = imgs.map(({ s, L, file }) => `
    <div class="row" style="height:${s.titulo.length > 30 ? 260 : 212}px">
      <img src="${file}"><div class="veu"></div>
      <span class="h">${s.hora.replace(' ', '&nbsp;')}</span><span class="t">${s.titulo}</span>
    </div><p class="cap">${L.nome} · ${L.W}×${L.H} — ${s.titulo}</p>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#fff;font-family:Inter,-apple-system,sans-serif;width:923px}
  .row{position:relative;overflow:hidden;border-bottom:2px solid #e8e8e8}
  .row img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .veu{position:absolute;left:0;right:0;top:22%;bottom:0;background:rgba(0,0,0,.62)}
  .h,.t{position:absolute;top:61%;transform:translateY(-50%);color:#fff;font-size:27px}
  .h{left:57px}.t{left:235px;right:40px;font-weight:700;font-size:28px;line-height:1.2}
  .cap{margin:6px 16px 22px;font:13px Inter;color:#777}
  </style></head><body>${linhas}</body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const feitos = [];
  for (const [id, L] of Object.entries(LAYOUTS)) {
    await page.setViewportSize({ width: L.W, height: L.H });
    for (const s of SESSOES) {
      await page.setContent(bannerHTML(L, s), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const file = `session-banner_${s.slug}_${id}-${L.nome}_${L.W}x${L.H}.png`;
      await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: L.W, height: L.H } });
      feitos.push({ s, L, file });
    }
  }
  fs.writeFileSync(path.join(OUT, 'preview.html'), previewHTML(feitos));
  await page.setViewportSize({ width: 923, height: 800 });
  await page.goto('file://' + path.join(OUT, 'preview.html'));
  await page.screenshot({ path: path.join(OUT, 'preview-app.png'), fullPage: true });
  await browser.close();
  console.log(feitos.map(f => f.file).join('\n'));
})();
