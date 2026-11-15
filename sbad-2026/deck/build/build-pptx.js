/* Gera o PPTX editável a partir de data.js (mesma fonte do HTML).
   Uso: node build/build-pptx.js   →  out/Takeda-SBAD-2026.pptx
   Pré-requisito: node build/render-backgrounds.js (fundos em build/bg).
   Fontes: usa as famílias Gotham instaladas na máquina (Gotham Light/Book/Medium/Bold).
   Unidades: o layout é desenhado em px (1920×1080) e convertido para polegadas. */
const path = require("path");
const fs = require("fs");
const PptxGenJS = require("pptxgenjs");
const D = require("../data.js");

const ROOT = path.resolve(__dirname, "..");
const BG = path.join(__dirname, "bg");
const OUT = path.join(ROOT, "out");
const A = (p) => path.join(ROOT, p);

const RED = "E1242A", INK = "111111", BODY = "1A1A1A", MUTED = "6B6F76", LINE = "D9DDE2", CARD = "EEF1F4", CARD2 = "F6F7F9", WHITE = "FFFFFF", GREY = "C9CED5";
const RMUTED = "F3CFD1"; // texto secundário sobre vermelho (sem transparência: o LibreOffice trunca texto transparente)
const F = { light: "Gotham Light", book: "Gotham Book", medium: "Gotham Medium", bold: "Gotham Bold" };
const px = (v) => v / 144;            // 1920px = 13.333in
const pt = (v) => Math.round(v * 0.5 * 10) / 10; // 1px = 0.5pt
const M = 96;
const fmt = (n) => n.toLocaleString("pt-BR");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE"; // 13.333 × 7.5 in
pptx.author = "Takeda Eventos"; pptx.company = "Takeda"; pptx.title = D.meta.titulo; pptx.subject = D.meta.subtitulo;
let n = 0;

/* ---------- helpers ---------- */
function T(s, text, x, y, w, h, o = {}) {
  const base = { x: px(x), y: px(y), w: px(w), h: px(h), fontFace: F.book, fontSize: pt(18), color: BODY, margin: 0, valign: "top", align: "left", paraSpaceAfter: 0, fit: "none" };
  if (o.size) { o.fontSize = pt(o.size); delete o.size; }
  if (o.font) { o.fontFace = F[o.font] || o.font; delete o.font; }
  if (o.line) { o.lineSpacingMultiple = o.line; delete o.line; }
  s.addText(text, Object.assign(base, o));
}
function R(s, x, y, w, h, o = {}) {
  const shape = o.round ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;
  const opt = { x: px(x), y: px(y), w: px(w), h: px(h), fill: o.fill ? { color: o.fill } : { type: "none" }, line: o.lineColor ? { color: o.lineColor, width: o.lineW || 1, dashType: o.dash || "solid" } : { type: "none" } };
  if (o.round) opt.rectRadius = px(o.round);
  s.addShape(shape, opt);
}
function L(s, x1, y1, x2, y2, color = LINE, w = 1, dash = "solid") {
  s.addShape(pptx.ShapeType.line, { x: px(x1), y: px(y1), w: px(x2 - x1), h: px(y2 - y1), line: { color, width: w, dashType: dash } });
}
function IMG(s, file, x, y, w, h, o = {}) { s.addImage(Object.assign({ path: file, x: px(x), y: px(y), w: px(w), h: px(h) }, o)); }
function chip(s, status, x, y, onRed) {
  const label = status.toUpperCase(); const w = 30 + label.length * 9.2, h = 26;
  const style = { confirmado: { fill: onRed ? WHITE : RED, color: onRed ? RED : WHITE }, proposta: { line: onRed ? WHITE : RED, color: onRed ? WHITE : RED }, pendente: { line: onRed ? "FFFFFF" : "8A8F98", color: onRed ? WHITE : "5C616A", dash: "dash" } }[status];
  s.addShape(pptx.ShapeType.roundRect, { x: px(x), y: px(y), w: px(w), h: px(h), rectRadius: px(13), fill: style.fill ? { color: style.fill } : { type: "none" }, line: style.line ? { color: style.line, width: 1, dashType: style.dash || "solid" } : { type: "none" } });
  T(s, label, x, y + 1, w, h, { size: 12, font: "medium", color: style.color, align: "center", valign: "middle", charSpacing: 1.5 });
  return w;
}
function chrome(s, red, logoWhite) {
  n++;
  T(s, D.meta.rodape, M, 1036, 1200, 24, { size: 14, color: red ? RMUTED : MUTED, valign: "middle" });
  T(s, String(n).padStart(2, "0"), 1920 - M - 60, 1036, 60, 24, { size: 14, font: "medium", color: red ? "FFFFFF" : MUTED, align: "right", valign: "middle", charSpacing: 1 });
  const white = red || logoWhite;
  IMG(s, A(white ? "assets/logo-takeda-branco.png" : "assets/logo-takeda.png"), 1920 - M - 148, white ? 1080 - 64 - 93 : 1080 - 64 - 51, 148, white ? 93 : 51);
}
function head(s, kicker, title, o = {}) {
  const red = !!o.red;
  T(s, kicker.toUpperCase(), M, 84, 1400, 28, { size: 20, font: "medium", color: red ? WHITE : RED, charSpacing: 3 });
  const x = o.curve ? M + 48 : M;
  if (o.curve) IMG(s, path.join(BG, "curve.png"), M, 122, 26, 78);
  T(s, title, x, 118, o.w || 1480, 140, { size: 54, font: red ? "light" : "bold", color: red ? WHITE : INK, line: 1.0 });
}
function notes(s, txt) { s.addNotes(txt); }
function newSlide(bg) { const s = pptx.addSlide(); if (bg) s.background = { path: path.join(BG, bg) }; else s.background = { color: WHITE }; return s; }
function bullets(s, items, x, y, w, size = 18, color = BODY, gap = 10, onRed = false) {
  let yy = y;
  items.forEach((t) => {
    const lines = Math.ceil((t.length * size * 0.6) / (w - 22)); const h = lines * size * 1.45 + gap;
    R(s, x, yy + size * 0.55, 10, 3, { fill: onRed ? WHITE : RED });
    T(s, t, x + 22, yy, w - 22, h, { size, color, line: 1.0 });
    yy += h;
  });
  return yy;
}
function hbars(s, data, x, y, o) {
  o = Object.assign({ w: 760, lw: 300, rh: 38, gap: 10, max: null, light: false, size: 16 }, o || {});
  const max = o.max || Math.max(...data.map((d) => d.valor)); const bw = o.w - o.lw - 70;
  data.forEach((d, i) => {
    const yy = y + i * (o.rh + o.gap); const w = Math.max(3, Math.round((bw * d.valor) / max));
    T(s, d.rotulo, x, yy, o.lw - 16, o.rh, { size: o.size, align: "right", valign: "middle", color: INK });
    R(s, x + o.lw, yy + 6, w, o.rh - 12, { fill: o.light && i > 0 ? GREY : RED });
    T(s, fmt(d.valor), x + o.lw + w + 12, yy, 80, o.rh, { size: o.size, font: "medium", valign: "middle", color: INK });
  });
  return y + data.length * (o.rh + o.gap);
}
function table(s, cols, rows, x, y, w, widths, o = {}) {
  const size = o.size || 15; const total = widths.reduce((a, b) => a + b, 0);
  const colW = widths.map((v) => px((v / total) * w));
  // margin das células em polegadas (pptxgenjs 3.12 interpreta números como inch)
  const header = cols.map((c) => ({ text: c.toUpperCase(), options: { fontFace: F.medium, fontSize: pt(12), color: MUTED, charSpacing: 1.5, bold: false, border: [{ type: "none" }, { type: "none" }, { pt: 1.2, color: INK }, { type: "none" }], margin: [0, 0.06, 0.07, 0] } }));
  const body = rows.map((r) => r.map((c, i) => ({ text: String(c), options: { fontFace: i === 0 ? F.medium : F.book, fontSize: pt(size), color: /^(Idem|Sem serviço)$/.test(c) ? MUTED : (i === 0 ? INK : BODY), border: [{ type: "none" }, { type: "none" }, { pt: 0.75, color: LINE }, { type: "none" }], margin: [0.08, 0.1, 0.08, 0] } })));
  s.addTable([header, ...body], { x: px(x), y: px(y), w: px(w), colW, autoPage: false, valign: "top" });
}

/* ================= SLIDES ================= */
// 1 Capa
{ const s = newSlide("bg-cover.png");
  T(s, `${D.meta.subtitulo} · XXV edição`.toUpperCase(), M, 200, 1500, 30, { size: 22, font: "medium", color: WHITE, charSpacing: 3 });
  T(s, "Takeda na\nSBAD 2026", M, 250, 1500, 260, { size: 112, font: "light", color: WHITE, line: 1.0 });
  T(s, [{ text: D.meta.local, options: { fontFace: F.medium, breakLine: true } }, { text: D.meta.datas }], M, 816, 900, 80, { size: 22, color: WHITE, line: 1.3 });
  R(s, M, 906, 520, 34, { round: 17, lineColor: WHITE });
  T(s, `${D.meta.publico} · ${D.meta.dMenos}`.toUpperCase(), M, 906, 520, 34, { size: 14, font: "medium", color: WHITE, align: "center", valign: "middle", charSpacing: 1.5 });
  chrome(s, true); notes(s, "Capa. Fontes: D1 (evento, datas e local)."); }

// 2 Resumo
{ const r = D.resumo; const s = newSlide(); head(s, r.kicker, r.titulo, { curve: true });
  const cw = (1920 - 2 * M - 4 * 28) / 5;
  r.numeros.forEach((x, i) => { const xx = M + i * (cw + 28); L(s, xx, 300, xx + cw, 300, INK, 1.5); T(s, x.valor, xx, 320, cw, 120, { size: 104, font: "light", color: INK }); T(s, x.rotulo, xx, 452, cw, 28, { size: 20, font: "medium", color: INK }); T(s, x.sub, xx, 484, cw, 24, { size: 16, color: MUTED }); });
  const pw = (1920 - 2 * M - 2 * 40) / 3;
  r.pilares.forEach((p, i) => { const xx = M + i * (pw + 40); R(s, xx, 666, 3, 110, { fill: RED }); T(s, p.nome, xx + 28, 666, pw - 28, 34, { size: 26, font: "bold", color: INK }); T(s, p.texto, xx + 28, 708, pw - 28, 80, { size: 20, line: 1.2 }); });
  chrome(s); notes(s, "Resumo executivo. Fontes: " + r.numeros.map((x) => x.src).join(", ") + "."); }

// 3 Por quê
{ const p = D.porque; const s = newSlide();
  IMG(s, path.join(BG, "bg-panel.png"), 1200, 0, 720, 1080);
  head(s, p.kicker, p.titulo, { w: 1000 });
  T(s, p.numero, M, 300, 1000, 290, { size: 260, font: "light", color: INK });
  T(s, p.numeroRotulo, M, 604, 700, 40, { size: 24, color: BODY });
  bullets(s, p.pontos, M, 796, 880, 18);
  T(s, "ORGANIZADO POR", 1272, 120, 500, 30, { size: 20, font: "medium", color: WHITE, charSpacing: 3 });
  p.sociedades.forEach((so, i) => { const yy = 190 + i * 130; T(s, so.sigla, 1272, yy, 540, 50, { size: 40, font: "bold", color: WHITE }); T(s, so.nome, 1272, yy + 56, 540, 30, { size: 17, color: WHITE }); if (i < 2) L(s, 1272, yy + 110, 1824, yy + 110, "FFFFFF", 0.75); });
  T(s, "Fonte: proposta CCM Group, 17/04/2026", 1272, 600, 540, 20, { size: 13, color: RMUTED });
  chrome(s, false, true); notes(s, "Relevância do congresso. Fonte: D1."); }

// 4 Cota
{ const c = D.cota; const s = newSlide(); head(s, c.kicker, c.titulo);
  T(s, c.valor, M, 300, 460, 80, { size: 64, font: "bold", color: RED });
  T(s, c.valorRotulo, M, 380, 440, 50, { size: 16, color: MUTED, line: 1.2 });
  T(s, "Proposta de patrocínio não exclusiva. Custos de palestrante, cabine de tradução e lunch box ficam com o patrocinador.", M, 460, 440, 90, { size: 16, color: MUTED, line: 1.25 });
  T(s, "Fonte: D1", M, 570, 300, 20, { size: 13, color: MUTED });
  const cw = (1920 - 600 - M - 2 * 40) / 3;
  c.colunas.forEach((col, i) => { const xx = 600 + i * (cw + 40); T(s, col.nome, xx, 300, cw, 40, { size: 28, font: "bold", color: INK }); L(s, xx, 348, xx + cw, 348, INK, 1.5);
    let yy = 366; col.itens.forEach((it) => { const lines = Math.ceil((it.t.length * 17 * 0.6) / cw); T(s, it.t, xx, yy, cw, lines * 26, { size: 17, color: INK, line: 1.1 }); yy += lines * 26 + 6; if (it.nota) { const nl = Math.ceil((it.nota.length * 14 * 0.6) / cw); T(s, it.nota, xx, yy, cw, nl * 20, { size: 14, color: MUTED, line: 1.1 }); yy += nl * 20 + 6; } chip(s, it.s, xx, yy + 4); yy += 44; L(s, xx, yy, xx + cw, yy); yy += 18; }); });
  chrome(s); notes(s, "Contrapartidas da cota Platina. Fonte: D1."); }

// 5 Agenda
{ const a = D.agenda; const s = newSlide(); head(s, a.kicker, a.titulo);
  const cw = (1920 - 2 * M - 2 * 36) / 3;
  a.dias.forEach((d, i) => { const xx = M + i * (cw + 36);
    T(s, d.data, xx, 300, 200, 60, { size: 52, font: "light", color: INK }); T(s, d.semana, xx + 140, 328, 200, 24, { size: 16, color: MUTED }); T(s, d.frente.toUpperCase(), xx + cw - 260, 332, 260, 20, { size: 12, font: "medium", color: RED, align: "right", charSpacing: 1.5 }); L(s, xx, 372, xx + cw, 372, INK, 1.5);
    let yy = 392; d.sessoes.forEach((se) => { const simp = se.tipo.startsWith("Simp"); const lines = Math.ceil((se.tema.length * 20 * 0.6) / (cw - 48)); const h = 100 + lines * 26 + se.pessoas.length * 22;
      R(s, xx, yy, cw, h, { round: 12, fill: simp ? WHITE : CARD, lineColor: simp ? RED : undefined, lineW: 1.25 });
      T(s, se.tipo.toUpperCase(), xx + 24, yy + 20, cw - 48, 18, { size: 12, font: "medium", color: RED, charSpacing: 1.5 });
      T(s, [{ text: se.hora, options: { fontFace: F.medium, color: INK } }, { text: ` · ${se.sala}${se.capacidade ? " · " + se.capacidade : ""}` }], xx + 24, yy + 42, cw - 48, 20, { size: 15, color: MUTED });
      T(s, se.tema, xx + 24, yy + 70, cw - 48, lines * 26, { size: 20, font: "bold", color: INK, line: 1.05 });
      T(s, se.pessoas.join("\n"), xx + 24, yy + 76 + lines * 26, cw - 48, se.pessoas.length * 22, { size: 15, line: 1.2 });
      yy += h + 18; }); });
  T(s, a.nota + "\n" + a.materiais, M, 930, 1500, 44, { size: 13, color: MUTED, line: 1.15 });
  chrome(s); notes(s, "Agenda científica. Fontes: D1, I1, I3, I2, I4. Conflito C1 na capacidade de 21/11."); }

// 6 Materiais aprovados
{ const m = D.materiais; const s = newSlide(); head(s, m.kicker, m.titulo);
  const cw = (1920 - 2 * M - 3 * 28) / 4;
  m.itens.forEach((it, i) => { const xx = M + i * (cw + 28);
    IMG(s, A(it.img), xx, 280, cw, 560, { sizing: { type: "cover", w: px(cw), h: px(560) }, rounding: false });
    T(s, it.data, xx, 858, 160, 40, { size: 30, font: "light", color: INK });
    T(s, [{ text: `${it.tipo} · ${it.tema}`, options: { fontFace: F.bold, color: INK, breakLine: true } }, { text: `${it.codigo} · ${it.src}`, options: { fontSize: pt(13), color: MUTED } }], xx + (it.data.length > 5 ? 170 : 110), 860, cw - 110, 60, { size: 15, line: 1.15 }); });
  T(s, m.nota, M, 976, 1500, 20, { size: 13, color: MUTED });
  chrome(s); notes(s, "Artes oficiais. Fontes: I1, I2, I3, I4."); }

// 7 Estande
{ const e = D.estande; const s = newSlide(); head(s, e.kicker, e.titulo);
  let yy = 300; e.specs.forEach((sp) => { T(s, sp.k, M, yy, 200, 48, { size: 17, valign: "middle" }); T(s, sp.v, M + 200, yy, 220, 48, { size: 20, font: "bold", color: INK, align: "right", valign: "middle" }); L(s, M, yy + 52, M + 420, yy + 52); yy += 53; });
  T(s, "INFRAESTRUTURA EXIGIDA PELO A&B", M, yy + 28, 420, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 });
  yy = bullets(s, e.infra, M, yy + 54, 420, 15, BODY, 6);
  R(s, M, yy + 20, 300, 38, { round: 10, lineColor: "8A8F98", dash: "dash" }); T(s, "Planta, render e montadora: não recebidos", M, yy + 20, 300, 38, { size: 13, color: "5C616A", align: "center", valign: "middle" });
  const gx = 600, gw = 1920 - M - gx, dayW = 130, cellW = (gw - dayW - 5 * 6) / 5;
  e.periodos.forEach((p, i) => T(s, p.toUpperCase(), gx + dayW + i * (cellW + 6) + 14, 304, cellW, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 }));
  e.dias.forEach((d, r) => { const y0 = 332 + r * 118; T(s, d.data, gx, y0, dayW, 60, { size: 40, font: "light", color: INK });
    d.celulas.forEach((c, i) => { const aula = /^Aula/.test(c), off = /^Sem|^—/.test(c); const cx = gx + dayW + i * (cellW + 6); R(s, cx, y0, cellW, 112, { round: 10, fill: aula ? RED : off ? CARD2 : CARD }); T(s, c, cx + 14, y0 + 16, cellW - 28, 80, { size: 16, font: aula ? "medium" : "book", color: aula ? WHITE : off ? MUTED : BODY, line: 1.1 }); }); });
  T(s, e.fixo, gx, 700, gw, 44, { size: 15, line: 1.2 }); T(s, "Fontes: " + e.src, gx, 752, 400, 20, { size: 13, color: MUTED });
  chrome(s); notes(s, "Estande e programa diário. Fontes: D1, D4, I4."); }

// 8 A&B
{ const a = D.aeb; const s = newSlide(); head(s, a.kicker, a.titulo);
  const cwid = chip(s, a.status, M, 250); T(s, a.statusTexto, M + cwid + 14, 250, 1300, 26, { size: 15, color: MUTED, valign: "middle" });
  const cw = (1920 - 2 * M - 4 * 24) / 5;
  a.volumes.forEach((v, i) => { const xx = M + i * (cw + 24); L(s, xx, 320, xx + cw, 320, INK, 1.5); T(s, v.valor, xx, 334, cw, 56, { size: 48, font: "light", color: INK }); T(s, v.rotulo, xx, 394, cw, 20, { size: 14, color: MUTED }); });
  table(s, ["Serviço", "Público", "19/11 quinta", "20/11 sexta", "21/11 sábado"], a.linhas.map((l) => [l.periodo, l.publico, l.d19, l.d20, l.d21]), M, 444, 1920 - 2 * M, [280, 110, 440, 440, 440], { size: 17 });
  T(s, a.condicoes + " Fonte: D4.", M, 960, 1500, 20, { size: 13, color: MUTED });
  chrome(s); notes(s, "Hospitalidade do estande. Fonte: D4 (proposta, validade 25/09)."); }

// 9 Delegação
{ const d = D.delegacao; const s = newSlide(); head(s, d.kicker, d.titulo);
  T(s, "FUNIL DE CONFIRMAÇÃO (PESSOAS)", M, 300, 600, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 });
  let yy = hbars(s, d.funil, M, 326, { w: 760, lw: 200, rh: 52, gap: 10, light: true, size: 17 });
  T(s, "FORA DA DELEGAÇÃO", M, yy + 26, 600, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 });
  [["Recusados", d.recusas.recusados, 0], ["Declinados", d.recusas.declinados, 120], ["Aguardando aprovação", d.recusas.aguardando, 240]].forEach(([l, v, dx]) => { T(s, String(v), M + dx, yy + 50, 110, 50, { size: 44, font: "light", color: INK }); T(s, l, M + dx, yy + 104, 200, 20, { size: 15, color: MUTED }); });
  T(s, "CONFIRMADOS POR PACOTE (352)", 936, 300, 600, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 });
  hbars(s, d.pacotes, 936, 326, { w: 860, lw: 330, rh: 40, gap: 8, size: 16 });
  T(s, d.notas.join("     ") + "     Fonte: P1", M, 960, 1600, 20, { size: 14, color: MUTED });
  chrome(s); notes(s, "Delegação. Fonte: P1 (agregados)."); }

// 10 Origem
{ const o = D.origem; const s = newSlide(); head(s, o.kicker, o.titulo);
  T(s, "CONFIRMADOS POR REGIONAL", M, 300, 600, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 });
  hbars(s, o.regionais, M, 326, { w: 620, lw: 160, rh: 44, gap: 8, size: 17 });
  T(s, "CONFIRMADOS POR ESTADO (22 UFS)", 780, 300, 600, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 });
  const max = Math.max(...o.estados.map((e) => e.valor)); const tw = (680 - 5 * 10) / 6;
  o.estados.forEach((e, i) => { const t = Math.sqrt(e.valor / max); const fill = t > 0.75 ? "8B0000" : t > 0.5 ? RED : t > 0.3 ? "EC6B6F" : CARD; const col = fill === CARD ? INK : WHITE; const xx = 780 + (i % 6) * (tw + 10), yy = 326 + Math.floor(i / 6) * 94;
    R(s, xx, yy, tw, 84, { round: 10, fill }); T(s, e.uf, xx + 14, yy + 12, tw - 28, 20, { size: 16, font: "medium", color: col, charSpacing: 1 }); T(s, String(e.valor), xx + 14, yy + 42, tw - 28, 34, { size: 30, font: "light", color: col }); });
  T(s, o.estadosNota, 780, 710, 600, 20, { size: 15, color: MUTED });
  T(s, "PRINCIPAIS ORIGENS AÉREAS", 1524, 300, 300, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 });
  o.origensAereas.forEach((x, i) => { const yy = 326 + i * 54; T(s, x.cidade, 1524, yy, 220, 40, { size: 16, valign: "middle" }); T(s, String(x.valor), 1744, yy, 80, 40, { size: 16, font: "medium", color: INK, align: "right", valign: "middle" }); L(s, 1524, yy + 44, 1824, yy + 44); });
  T(s, "Fonte: P1", M, 960, 300, 20, { size: 13, color: MUTED });
  chrome(s); notes(s, "Regionais, estados e origens. Fonte: P1 (agregados)."); }

// 11 Logística
{ const l = D.logistica; const s = newSlide(); head(s, l.kicker, l.titulo);
  T(s, "EMBARQUES POR DIA (PESSOAS, 1ª PERNA)", M, 300, 800, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 });
  const groups = [{ nome: "IDA PARA FORTALEZA · 185", data: l.ida, c: RED }, { nome: "RETORNO · 182", data: l.volta, c: "9CCFE6" }];
  const maxv = Math.max(...groups.flatMap((g) => g.data.map((d) => d.valor))); const gw = 480, ih = 190, baseY = 300 + 80 + ih;
  groups.forEach((g, gi) => { const x0 = M + 20 + gi * gw; T(s, g.nome, x0, 326, gw, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 }); L(s, x0, baseY, x0 + gw - 30, baseY, INK, 1.5);
    const cw = gw / (g.data.length + 1); g.data.forEach((d, i) => { const bh = Math.max(3, Math.round((ih * d.valor) / maxv)); const bw = Math.min(70, cw * 0.6); const xx = x0 + cw * (i + 1) - bw / 2; R(s, xx, baseY - bh, bw, bh, { fill: g.c }); T(s, fmt(d.valor), xx - 20, baseY - bh - 30, bw + 40, 24, { size: 18, font: "medium", color: INK, align: "center" }); T(s, d.data, xx - 20, baseY + 8, bw + 40, 20, { size: 14, color: MUTED, align: "center" }); }); });
  L(s, M, 660, M + 1000, 660, INK, 1.5);
  [[l.aereo.total, "aéreo emitido, com fee"], [l.aereo.tarifa, "tarifas"], [l.aereo.taxas, "taxas"], [l.aereo.fee, "fee de agência"]].forEach(([v, k], i) => { const xx = M + i * 200; T(s, v, xx, 680, 190, 36, { size: 28, font: "light", color: INK }); T(s, k, xx, 718, 190, 20, { size: 13, color: MUTED }); });
  T(s, l.aereo.cias, M, 760, 600, 30, { size: 22, font: "light", color: INK }); T(s, "cias e classe", M, 792, 300, 20, { size: 13, color: MUTED });
  T(s, "HOSPEDAGEM CONFIRMADA (238 HÓSPEDES)", 1160, 300, 700, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 });
  const hw = (1920 - M - 1160 - 40) / 3;
  l.hoteis.forEach((h, i) => { const xx = 1160 + i * (hw + 20); R(s, xx, 330, hw, 232, { round: 14, fill: CARD }); T(s, h.nome, xx + 24, 350, hw - 48, 44, { size: 17, font: "bold", color: INK, line: 1.1 }); T(s, String(h.hospedes), xx + 24, 392, hw - 48, 64, { size: 60, font: "light", color: INK }); T(s, `${h.single} single${h.duplo ? " · " + h.duplo + " duplo" : ""}`, xx + 24, 458, hw - 48, 20, { size: 14, color: MUTED }); L(s, xx + 24, 488, xx + hw - 24, 488, "D4D9DF"); T(s, h.fatura, xx + 24, 498, hw - 48, 22, { size: 15, font: "medium", color: INK }); T(s, h.extra || "fatura de abril", xx + 24, 522, hw - 48, 20, { size: 13, color: MUTED }); });
  const yEnd = bullets(s, l.marcos, 1160, 596, 720, 15, BODY, 8); T(s, "Fontes: " + l.src, 1160, yEnd + 6, 400, 20, { size: 13, color: MUTED });
  chrome(s); notes(s, "Aéreo e hospedagem. Fontes: P1, D2, D3."); }

// 12 Cronologia (vermelho)
{ const c = D.cronologia; const s = newSlide("bg-crono.png"); head(s, c.kicker, c.titulo, { red: true });
  let yy = 290; const X = M + 150;
  L(s, X, yy + 10, X, yy + c.macro.length * 56 + 44, "FFFFFF", 1.5);
  c.macro.forEach((e) => { if (e.data === "18/11") { L(s, M, yy + 22, M + 1000, yy + 22, "FFFFFF", 1, "dash"); R(s, X - 6, yy + 8, 190, 28, { round: 14, fill: WHITE }); T(s, `HOJE · ${c.hoje} · ${D.meta.dMenos}`, X - 6, yy + 8, 190, 28, { size: 12, font: "medium", color: RED, align: "center", valign: "middle", charSpacing: 1.5 }); yy += 44; }
    s.addShape(pptx.ShapeType.ellipse, { x: px(X - 6), y: px(yy + 14), w: px(12), h: px(12), fill: { color: WHITE }, line: { type: "none" } });
    T(s, e.data, M, yy + 6, 130, 28, { size: 18, font: "medium", color: WHITE, align: "right" });
    T(s, [{ text: e.texto }, { text: "   " + e.src, options: { fontSize: pt(12), color: RMUTED } }], X + 22, yy + 6, 800, 28, { size: 18, font: "light", color: WHITE });
    yy += 56; });
  T(s, "DIA TÍPICO DE OPERAÇÃO", 1180, 300, 600, 18, { size: 12, font: "medium", color: RMUTED, charSpacing: 1.5 });
  c.diaTipico.forEach((r, i) => { const y0 = 334 + i * 57; T(s, r.hora, 1180, y0, 90, 40, { size: 20, font: "medium", color: WHITE, valign: "middle" }); T(s, r.texto, 1292, y0, 530, 40, { size: 17, font: "light", color: WHITE, valign: "middle" }); L(s, 1180, y0 + 50, 1824, y0 + 50, "FFFFFF", 0.75); });
  T(s, c.pendente, 1180, 690, 644, 40, { size: 13, color: RMUTED, line: 1.2 });
  chrome(s, true); notes(s, "Cronologia e dia típico. Fontes: D1–D4, P1."); }

// 13 Quem
{ const q = D.quem; const s = newSlide(); head(s, q.kicker, q.titulo);
  const cols = [[M, 520, "FRENTE"], [M + 520, 340, "RESPONSÁVEL"], [M + 860, 700, "DETALHE DOCUMENTADO"], [M + 1568, 160, "STATUS"]];
  cols.forEach(([x, w, t]) => T(s, t, x, 300, w, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 })); L(s, M, 326, 1920 - M, 326, INK, 1.5);
  q.frentes.forEach((f, i) => { const yy = 332 + i * 66; T(s, f.frente, cols[0][0], yy, 500, 60, { size: 17, font: "medium", color: INK, valign: "middle" }); T(s, f.resp, cols[1][0], yy, 330, 60, { size: 17, font: "bold", color: INK, valign: "middle" }); T(s, f.detalhe, cols[2][0], yy, 690, 60, { size: 15, color: MUTED, valign: "middle" }); chip(s, f.s, cols[3][0], yy + 17); L(s, M, yy + 64, 1920 - M, yy + 64); });
  T(s, "Fontes: " + q.src + ". Responsáveis internos além de Eventos foram inferidos dos códigos de material e da estrutura de regionais.", M, 880, 1500, 20, { size: 13, color: MUTED });
  chrome(s); notes(s, "Mapa de responsabilidades. Fontes: D1–D4, P1."); }

// 14 Investimento
{ const v = D.investimento; const s = newSlide(); head(s, v.kicker, v.titulo, { curve: true });
  const max = v.linhas[0].valor; const bx = M + 438, bw = 1180 - 438 - 248;
  const row = (yy, l, cls) => { T(s, [{ text: l.rotulo, options: { color: INK, breakLine: true } }, { text: `${l.nota} · ${l.src}`, options: { fontSize: pt(12), color: MUTED } }], M, yy + 12, 420, 56, { size: 17, line: 1.1 }); const w = Math.max(6, Math.round((bw * l.valor) / max));
    if (cls === "lunch") R(s, bx, yy + 24, w, 26, { round: 4, fill: "E6E8EC", lineColor: "8A8F98", dash: "dash" }); else if (cls === "proposta") R(s, bx, yy + 24, w, 26, { round: 4, fill: WHITE, lineColor: RED, lineW: 1.25 }); else R(s, bx, yy + 24, w, 26, { round: 4, fill: RED });
    T(s, [{ text: l.valorTexto || `R$ ${fmt(l.valor)}`, options: { breakLine: true } }, { text: l.s, options: { fontSize: pt(12), fontFace: F.book, color: MUTED } }], M + 1180 - 230, yy + 12, 230, 56, { size: 20, font: "medium", color: INK, align: "right", line: 1.1 }); L(s, M, yy + 74, M + 1180, yy + 74); };
  v.linhas.forEach((l, i) => row(300 + i * 74, l, l.s));
  row(300 + v.linhas.length * 74, { rotulo: "Lunch box dos simpósios", nota: v.lunchbox.nota, src: "D4", valor: v.lunchbox.max, s: "cotação", valorTexto: v.lunchbox.texto }, "lunch");
  const ty = 300 + (v.linhas.length + 1) * 74 + 18; T(s, "Total documentado, sem lunch box", M, ty + 14, 500, 24, { size: 14, color: MUTED }); T(s, v.totalTexto, M + 1180 - 500, ty, 500, 56, { size: 44, font: "light", color: INK, align: "right" });
  T(s, "NÃO DOCUMENTADO NOS ARQUIVOS RECEBIDOS", 1370, 300, 460, 18, { size: 12, font: "medium", color: MUTED, charSpacing: 1.5 });
  const ye = bullets(s, v.naoDocumentado, 1370, 328, 460, 16, BODY, 8);
  const c1 = chip(s, "confirmado", 1370, ye + 24); chip(s, "proposta", 1370 + c1 + 12, ye + 24);
  T(s, "Confirmado: faturado ou emitido. Proposta: valor comercial sem aprovação registrada nos documentos.", 1370, ye + 66, 460, 50, { size: 14, color: MUTED, line: 1.2 });
  chrome(s); notes(s, "Investimento documentado. Fontes: D1–D4, P1. Lunch box em cotação (D4)."); }

// 15 Decisões (vermelho)
{ const d = D.decisoes; const s = newSlide("bg-closer.png"); head(s, d.kicker, d.titulo, { red: true });
  const cw = (1920 - 2 * M - 2 * 40) / 3;
  d.itens.forEach((it, i) => { const xx = M + (i % 3) * (cw + 40), yy = 300 + Math.floor(i / 3) * 236; L(s, xx, yy, xx + cw, yy, "FFFFFF", 1); T(s, it.n, xx, yy + 18, 100, 18, { size: 14, font: "medium", color: RMUTED, charSpacing: 2 });
    T(s, it.titulo, xx, yy + 44, cw, 60, { size: 24, font: "bold", color: WHITE, line: 1.05 }); T(s, it.texto, xx, yy + 108, cw, 70, { size: 16, font: "light", color: WHITE, line: 1.2 });
    T(s, [{ text: "Dono: ", options: { fontFace: F.medium } }, { text: it.dono + "    " }, { text: "Prazo: ", options: { fontFace: F.medium } }, { text: it.prazo }], xx, yy + 184, cw, 22, { size: 14, color: WHITE }); });
  const xx = M + 2 * (cw + 40), yy = 536; T(s, "TAMBÉM NO RADAR", xx, yy + 18, cw, 18, { size: 14, font: "medium", color: RMUTED, charSpacing: 2 }); T(s, d.secundarios.join("\n"), xx, yy + 44, cw, 80, { size: 16, font: "light", color: WHITE, line: 1.3 });
  chrome(s, true); notes(s, "Decisões e riscos. Fontes: conflitos C1–C5 e lacunas do diagnóstico."); }

// Apêndice
const apx = D.apendice;
const apxHead = (s, i, t) => { head(s, "Apêndice A" + i, t.titulo.replace(/^Apêndice A\d · /, "")); };
{ const s = newSlide(); apxHead(s, 1, apx.cardapio); table(s, apx.cardapio.colunas, apx.cardapio.linhas, M, 230, 1920 - 2 * M, [230, 170, 480, 420, 420], { size: 14 }); T(s, "Fonte: D4.", M, 960, 300, 20, { size: 13, color: MUTED }); chrome(s); }
{ const s = newSlide(); apxHead(s, 2, apx.lunchbox); table(s, apx.lunchbox.colunas, apx.lunchbox.linhas, M, 230, 1920 - 2 * M, [260, 1100, 170, 170], { size: 15 }); T(s, apx.lunchbox.nota + " Fonte: D4.", M, 950, 1500, 40, { size: 13, color: MUTED, line: 1.2 }); chrome(s); }
const blocks = (s, t, cols) => { const cw = (1920 - 2 * M - (cols - 1) * 32) / cols; t.blocos.forEach((b, i) => { const xx = M + i * (cw + 32); T(s, b.t, xx, 230, cw, 24, { size: 16, font: "bold", color: INK }); L(s, xx, 260, xx + cw, 260, INK, 1.5); bullets(s, b.itens, xx, 274, cw, 15, BODY, 6); }); T(s, "Fonte: " + t.src + ".", M, 960, 300, 20, { size: 13, color: MUTED }); };
{ const s = newSlide(); apxHead(s, 3, apx.condicoes); blocks(s, apx.condicoes, 5); chrome(s); }
{ const s = newSlide(); apxHead(s, 4, apx.infra); blocks(s, apx.infra, 4); chrome(s); }
{ const s = newSlide(); apxHead(s, 5, apx.fontes); table(s, apx.fontes.colunas, apx.fontes.linhas, M, 230, 1920 - 2 * M, [110, 420, 220, 200, 500], { size: 15 });
  const cw = (1920 - 2 * M - 3 * 24) / 4; apx.fontes.criterios.forEach((c, i) => { const xx = M + i * (cw + 24); L(s, xx, 600, xx + cw, 600, INK, 1.5); T(s, c, xx, 612, cw, 60, { size: 14, line: 1.2 }); }); chrome(s); }

fs.mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, "Takeda-SBAD-2026.pptx");
pptx.writeFile({ fileName: file }).then(() => console.log(`PPTX → ${file} (${n} slides, ${(fs.statSync(file).size / 1e6).toFixed(2)} MB)`));
