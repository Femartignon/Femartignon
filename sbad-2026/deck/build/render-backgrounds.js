/* Gera os fundos (gradiente + flow lines) e a Takeda Curve como PNG para o PPTX.
   Reutiliza o CSS/SVG do próprio index.html, renderizando só as camadas de fundo.
   Saída: build/bg/*.png (derivados; não versionados) */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "bg");

const flow = (op, y, h, w = 1920) => `<svg style="position:absolute;left:0;top:${y}px;width:${w}px;height:${h}px;opacity:${op}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
  <defs><pattern id="p" patternUnits="userSpaceOnUse" width="600" height="140">
    <g fill="none" stroke="#fff" stroke-width="1.4"><path d="M -50,40 C 150,0 450,80 650,30"/><path d="M -50,110 C 150,70 450,150 650,100"/></g>
    <g fill="#E1242A"><ellipse cx="120" cy="22" rx="2.2" ry="6" transform="rotate(18 120 22)"/><ellipse cx="430" cy="58" rx="2.2" ry="6" transform="rotate(18 430 58)"/><ellipse cx="260" cy="96" rx="2.2" ry="6" transform="rotate(18 260 96)"/></g></pattern>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".35" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
    <mask id="m"><rect width="${w}" height="${h}" fill="url(#f)"/></mask></defs>
  <rect width="${w}" height="${h}" fill="url(#p)" mask="url(#m)"/></svg>`;

const pages = {
  "bg-cover": { w: 1920, h: 1080, cls: "tkd-grad-7", inner: flow(0.38, 380, 700) },
  "bg-crono": { w: 1920, h: 1080, cls: "tkd-grad-3", inner: flow(0.16, 0, 1080) },
  "bg-closer": { w: 1920, h: 1080, cls: "tkd-grad-0", inner: flow(0.18, 520, 560) },
  "bg-panel": { w: 720, h: 1080, cls: "tkd-grad-3", inner: flow(0.22, 0, 1080, 720) },
  "curve": { w: 40, h: 120, cls: "", inner: `<svg viewBox="0 0 40 120" width="40" height="120"><path d="M 4,2 C 30,18 38,48 38,60 C 38,72 30,102 4,118 L 4,2 Z" fill="#E1242A"/></svg>`, transparent: true },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const css = fs.readFileSync(path.join(ROOT, "assets", "gradients.css"), "utf8");
  const browser = await chromium.launch();
  for (const [name, p] of Object.entries(pages)) {
    const page = await browser.newPage({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: name === "curve" ? 4 : 1 });
    await page.setContent(`<!doctype html><html><head><style>${css}html,body{margin:0;background:transparent}#b{position:relative;width:${p.w}px;height:${p.h}px;overflow:hidden}</style></head><body><div id="b" class="${p.cls}">${p.inner}</div></body></html>`);
    await page.screenshot({ path: path.join(OUT, name + ".png"), omitBackground: !!p.transparent });
    await page.close();
  }
  await browser.close();
  console.log("fundos →", OUT, fs.readdirSync(OUT).join(", "));
})().catch((e) => { console.error(e); process.exit(1); });
