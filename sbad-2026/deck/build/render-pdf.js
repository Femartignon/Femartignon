/* Renderiza index.html em PDF (1920×1080 por página) e gera PNGs por slide para QA.
   Uso: node build/render-pdf.js [--png-only] [--scale 1|2]
   Saída: out/Takeda-SBAD-2026.pdf e build/snapshots/slide-NN.png */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "out");
const SNAP = path.join(__dirname, "snapshots");
const args = process.argv.slice(2);
const pngOnly = args.includes("--png-only");
const scale = Number(args[args.indexOf("--scale") + 1]) || 1;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SNAP, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  await page.goto("file://" + path.join(ROOT, "index.html"), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const count = await page.$$eval(".slide", (s) => s.length);
  for (let i = 0; i < count; i++) {
    const el = (await page.$$(".slide"))[i];
    await el.screenshot({ path: path.join(SNAP, `slide-${String(i + 1).padStart(2, "0")}.png`) });
  }
  console.log(`${count} slides → ${SNAP}`);

  if (!pngOnly) {
    await page.emulateMedia({ media: "print" });
    const pdf = path.join(OUT, "Takeda-SBAD-2026.pdf");
    await page.pdf({ path: pdf, width: "1920px", height: "1080px", printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    console.log(`PDF → ${pdf} (${(fs.statSync(pdf).size / 1e6).toFixed(2)} MB)`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
