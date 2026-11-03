#!/usr/bin/env python3
"""QA do widget Fio da História (encontro-infield/public/index.html).

Confere, no Chromium:
  - todos os estados em 7 larguras (320 a 430 px) e 3 alturas (200, 214 e 220 px): sem estouro, texto dentro do cartão,
    datas do fio sem encostar; fio de borda a borda passando pelo centro de cada conta, vermelho até a conta de hoje;
  - as fronteiras de horário (1 min antes e no minuto), com e sem os espaços opcionais preenchidos;
  - o relógio real em 3 fusos (o fuso do aparelho não muda o estado) e a troca sozinha na virada;
  - 0 erro de console e 0 violação de CSP; movimento terminando antes de 5 s (WCAG 2.2.2);
  - contraste medido por pixel contra o fundo real (inclui o canto do KV);
  - axe-core (WCAG 2.2 AA), versão sem JavaScript (texto de reserva) e tema escuro do sistema (placa em papel).
Gera a prancha de prévia (PNG) e o relatório (JSON) na pasta de saída.

Uso:
    python3 encontro-infield/widget/qa/validar.py --axe caminho/axe.min.js --saida pasta
Requer: pip install playwright pillow && playwright install chromium
"""
import argparse
import asyncio
import json
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright

AQUI = Path(__file__).resolve().parent
WIDGET = AQUI.parent
PUBLICO = WIDGET.parent / "public" / "index.html"
DADOS = WIDGET / "src" / "fio-da-historia.json"
BRT = timezone(timedelta(hours=-3))
LARGURAS = [320, 360, 375, 390, 403, 414, 430]
ALTURAS = [200, 214, 220]
CONTRASTE_LARGURAS = [320, 390, 430]
EXEMPLOS = {
    "sintese-plenaria": ("Resultado _é_ ponto _de_ *partida*",
                         "Exemplo de frase-síntese da plenária. Só entra no app com aprovação da CI."),
    "jubilandos": ("30 colegas, N anos _de_ *Takeda*",
                   "Exemplo do espaço dos Jubilandos: número agregado, sem nomes."),
}

sys.path.insert(0, str(WIDGET))
import build as B  # noqa: E402  (mesma regra de datas do app)


def esperado(dados, t):
    """Réplica da escolha do app.js: espaço preenchido vence; depois o estado da janela."""
    def dentro(s):
        de, ate = B.instante(s.get("de"), "-"), B.instante(s.get("ate"), "-")
        return (de is None or t >= de) and (ate is None or t < ate)
    for s in dados["espacos"]:
        if str(s.get("titulo", "")).strip() and str(s.get("texto", "")).strip() and dentro(s):
            return s["id"]
    for e in dados["estados"]:
        if dentro(e):
            return e["id"]
    return None


def fronteiras(dados):
    vistos = set()
    for s in dados["estados"] + dados["espacos"]:
        for k in ("de", "ate"):
            if s.get(k):
                vistos.add(B.instante(s[k], "-"))
    return sorted(vistos)


def qa_url(arquivo, **params):
    return arquivo.as_uri() + "#qa=1&" + "&".join(f"{k}={v}" for k, v in params.items())


def hora_brt(dt):
    return dt.astimezone(BRT).strftime("%Y-%m-%dT%H:%M")


def lum(rgb):
    def f(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb[:3]
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contraste(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


MEDIR = """() => {
  const c = document.getElementById('card'), r = c.getBoundingClientRect();
  const out = { estado: c.dataset.estado, ajuste: c.dataset.ajuste, sw: document.documentElement.scrollWidth,
                iw: innerWidth, sh: c.scrollHeight, ch: c.clientHeight, fora: [], encostam: [] };
  for (const sel of ['#kicker', '#titulo', '#texto', '#fio', '#rotulos']) {
    const e = document.querySelector(sel);
    if (getComputedStyle(e).display === 'none') continue;
    const b = e.getBoundingClientRect();
    if (b.left < r.left - .5 || b.right > r.right + .5 || b.top < r.top - .5 || b.bottom > r.bottom + .5) out.fora.push(sel);
  }
  const caixas = [...document.querySelectorAll('#rotulos > li')].map((li) => {
    const rg = document.createRange(); rg.selectNodeContents(li); return rg.getBoundingClientRect();
  });
  for (let i = 1; i < caixas.length; i++) {
    if (caixas[i].width && caixas[i - 1].width && caixas[i].left - caixas[i - 1].right < 4) out.encostam.push(i);
  }
  return out;
}"""

TRECHOS = """() => {
  const runs = [];
  for (const sel of ['#kicker', '#titulo', '#texto', '#rotulos > li']) {
    for (const el of document.querySelectorAll(sel)) {
      if (getComputedStyle(el).display === 'none') continue;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        const cs = getComputedStyle(n.parentElement);
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const q of rg.getClientRects()) runs.push({ sel, txt: n.textContent.trim().slice(0, 24), cor: cs.color,
          tam: parseFloat(cs.fontSize), peso: parseInt(cs.fontWeight, 10), x: q.left, y: q.top, w: q.width, h: q.height });
      }
    }
  }
  return runs;
}"""

OCULTAR_TEXTO = "#kicker, #titulo, #titulo span, #texto, #rotulos li { color: transparent !important; }"

# fio do KV: entra e sai pelas bordas do cartão, passa pelo centro de cada conta e o vermelho para na conta de hoje
FIO = """() => {
  const card = document.getElementById('card').getBoundingClientRect();
  const svg = document.getElementById('linha').getBoundingClientRect();
  const base = document.getElementById('linha-base'), feita = document.getElementById('linha-feita');
  if (!base.getAttribute('d') || !feita.getAttribute('d')) return { erro: 'fio sem traço' };
  const L = base.getTotalLength(), ini = base.getPointAtLength(0), fim = base.getPointAtLength(L);
  const fimF = feita.getPointAtLength(feita.getTotalLength());
  const contas = [...document.querySelectorAll('#fio > li')].map((c) => {
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2 - svg.left, y: r.top + r.height / 2 - svg.top, s: c.dataset.s, top: r.top, bottom: r.bottom };
  });
  let longe = 0;
  for (const c of contas) {
    let m = Infinity;
    for (let t = 0; t <= L; t += 0.5) { const q = base.getPointAtLength(t); m = Math.min(m, Math.hypot(q.x - c.x, q.y - c.y)); }
    longe = Math.max(longe, m);
  }
  const i = contas.findIndex((c) => c.s === 'agora'), ultimo = contas.length - 1;
  const alvo = i === ultimo ? { x: svg.width, y: fim.y } : contas[i];
  return { bordaEsq: Math.abs(svg.left + ini.x - card.left), bordaDir: Math.abs(card.right - (svg.left + fim.x)),
           contaLonge: longe, vermelhoErro: Math.hypot(fimF.x - alvo.x, fimF.y - alvo.y),
           contasDentro: contas.every((c) => c.top >= card.top - .5 && c.bottom <= card.bottom + .5) };
}"""


def fio_ok(f):
    return ("erro" not in f and f["bordaEsq"] < 1 and f["bordaDir"] < 1 and f["contaLonge"] < 1
            and f["vermelhoErro"] < 1 and f["contasDentro"])


async def carregar(pg, url):
    await pg.goto(url)
    await pg.wait_for_function("document.body.dataset.pronto === '1'")


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--axe", type=Path, help="caminho do axe.min.js (npm i axe-core); sem ele, o axe fica de fora")
    ap.add_argument("--saida", type=Path, default=Path(tempfile.mkdtemp(prefix="fio-qa-")))
    args = ap.parse_args()
    args.saida.mkdir(parents=True, exist_ok=True)
    falhas, rel = [], {"arquivo": str(PUBLICO), "kB": round(PUBLICO.stat().st_size / 1024)}

    dados = json.loads(DADOS.read_text(encoding="utf-8"))
    # variante com os espaços opcionais preenchidos (só para o QA; não vai para o app)
    tmp = Path(tempfile.mkdtemp(prefix="fio-variante-"))
    var_dados = json.loads(json.dumps(dados))
    for s in var_dados["espacos"]:
        s["titulo"], s["texto"] = EXEMPLOS[s["id"]]
    (tmp / "dados.json").write_text(json.dumps(var_dados, ensure_ascii=False), encoding="utf-8")
    variante = tmp / "variante.html"
    subprocess.run([sys.executable, str(WIDGET / "build.py"), "--dados", str(tmp / "dados.json"), "--saida", str(variante)],
                   check=True, capture_output=True)

    async with async_playwright() as p:
        nav = await p.chromium.launch()

        # ---- estados × telas, console e CSP ----
        ctx = await nav.new_context(reduced_motion="reduce", device_scale_factor=2)
        await ctx.add_init_script("window.__csp = []; document.addEventListener('securitypolicyviolation', "
                                  "(e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));")
        pg = await ctx.new_page()
        console = []
        pg.on("console", lambda m: console.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: console.append(f"pageerror: {e}"))
        telas, ajustes, csp = [], {}, []
        for w in LARGURAS:
            for h in ALTURAS:
                await pg.set_viewport_size({"width": w, "height": h})
                for e in dados["estados"]:
                    await carregar(pg, qa_url(PUBLICO, estado=e["id"]))
                    m = await pg.evaluate(MEDIR)
                    m["fio"] = await pg.evaluate(FIO)
                    csp += await pg.evaluate("window.__csp")
                    ok = (m["estado"] == e["id"] and m["ajuste"] != "estouro" and m["sh"] <= m["ch"] + 1
                          and m["sw"] <= m["iw"] and not m["fora"] and not m["encostam"] and fio_ok(m["fio"]))
                    ajustes.setdefault(f"{w}x{h}", {})[e["id"]] = m["ajuste"]
                    if not ok:
                        falhas.append(f"tela {w}x{h} {e['id']}: {m}")
                    telas.append(ok)
        rel["telas"] = {"combinacoes": len(telas), "ok": sum(telas), "ajustes": ajustes}

        # ---- fronteiras de horário (produção e variante) ----
        trocas = 0
        for arquivo, d in ((PUBLICO, dados), (variante, var_dados)):
            await pg.set_viewport_size({"width": 390, "height": 214})
            for f in fronteiras(d):
                for t in (f - timedelta(minutes=1), f):
                    await carregar(pg, qa_url(arquivo, now=hora_brt(t)))
                    got = await pg.evaluate("card.dataset.estado")
                    exp = esperado(d, t)
                    trocas += 1
                    if got != exp:
                        falhas.append(f"horário {hora_brt(t)} ({arquivo.name}): mostrou {got}, esperado {exp}")
        rel["fronteiras_conferidas"] = trocas
        csp += await pg.evaluate("window.__csp")
        await ctx.close()

        # ---- relógio real: 3 fusos dão o mesmo estado ----
        amostras = []
        for e in dados["estados"]:
            de, ate = B.instante(e.get("de"), "-"), B.instante(e.get("ate"), "-")
            if de is None:
                de = ate - timedelta(days=2)
            if ate is None:
                ate = de + timedelta(days=2)
            amostras.append((de + (ate - de) / 2, e["id"]))
        relogio_ok = 0
        for fuso in ("America/Sao_Paulo", "Asia/Tokyo", "Pacific/Honolulu"):
            c2 = await nav.new_context(timezone_id=fuso, reduced_motion="reduce")
            p2 = await c2.new_page()
            for t, exp in amostras:
                await p2.clock.set_fixed_time(t)
                await carregar(p2, PUBLICO.as_uri())
                got = await p2.evaluate("card.dataset.estado")
                relogio_ok += got == exp
                if got != exp:
                    falhas.append(f"relógio real {fuso} {t.isoformat()}: mostrou {got}, esperado {exp}")
            await c2.close()
        rel["relogio_real"] = f"{relogio_ok}/{len(amostras) * 3} (3 fusos)"

        # ---- troca sozinha na virada (sem recarregar) ----
        c3 = await nav.new_context(reduced_motion="reduce")
        p3 = await c3.new_page()
        virada = B.instante("2026-11-17T00:00-03:00", "-")
        await p3.clock.install(time=virada - timedelta(seconds=3))
        await carregar(p3, PUBLICO.as_uri())
        antes = await p3.evaluate("card.dataset.estado")
        await p3.clock.run_for(5000)
        depois = await p3.evaluate("card.dataset.estado")
        rel["virada_sem_recarregar"] = f"{antes} → {depois}"
        if (antes, depois) != ("enxergar", "conversar"):
            falhas.append(f"virada 17/11 00:00: {antes} → {depois}")
        await c3.close()

        # ---- movimento: tudo termina antes de 5 s ----
        c4 = await nav.new_context(reduced_motion="no-preference")
        p4 = await c4.new_page()
        await carregar(p4, qa_url(PUBLICO, estado="conversar"))
        fim = await p4.evaluate("Math.max(0, ...document.getAnimations().map((a) => a.effect.getComputedTiming().endTime))")
        rel["movimento_termina_ms"] = fim
        if not fim <= 5000:
            falhas.append(f"movimento termina em {fim} ms (limite 5000)")
        await p4.screenshot(path=str(args.saida / "_movimento.png"))
        await c4.close()

        # ---- contraste por pixel e axe (contexto que aceita injetar estilo/script de teste) ----
        c5 = await nav.new_context(reduced_motion="reduce", device_scale_factor=2, bypass_csp=True)
        p5 = await c5.new_page()
        piores = {}
        for w in CONTRASTE_LARGURAS:
            await p5.set_viewport_size({"width": w, "height": 214})
            for arquivo, lista in ((PUBLICO, dados["estados"]), (variante, var_dados["espacos"])):
                for e in lista:
                    await carregar(p5, qa_url(arquivo, estado=e["id"]))
                    runs = await p5.evaluate(TRECHOS)
                    await p5.add_style_tag(content=OCULTAR_TEXTO)
                    caminho = args.saida / "_fundo.png"
                    await p5.screenshot(path=str(caminho))
                    fundo = Image.open(caminho).convert("RGB")
                    for r in runs:
                        caixa = (int(r["x"] * 2), int(r["y"] * 2), int((r["x"] + r["w"]) * 2), int((r["y"] + r["h"]) * 2))
                        recorte = fundo.crop(caixa)
                        px = sorted(getattr(recorte, "get_flattened_data", recorte.getdata)(), key=lum)
                        if not px:
                            continue
                        cor = tuple(int(v) for v in r["cor"][r["cor"].index("(") + 1:-1].split(",")[:3])
                        escuro, claro = px[int(len(px) * .02)], px[int(len(px) * .98) - 1]
                        cr = min(contraste(cor, escuro), contraste(cor, claro))
                        grande = (r["peso"] >= 700 and r["tam"] >= 18.66) or r["tam"] >= 24
                        minimo = 3.0 if grande else 4.5
                        chave = f"{r['sel']} {'grande' if grande else 'normal'}"
                        if chave not in piores or cr < piores[chave][0]:
                            piores[chave] = (round(cr, 2), minimo, f"{w}px {e['id']} '{r['txt']}'")
                        if cr < minimo:
                            falhas.append(f"contraste {cr:.2f} < {minimo} em {w}px {e['id']} {r['sel']} '{r['txt']}'")
        rel["contraste_pior_caso"] = piores

        if args.axe and args.axe.exists():
            violacoes, incompletos = [], set()
            await p5.set_viewport_size({"width": 390, "height": 214})
            for e in dados["estados"]:
                await carregar(p5, qa_url(PUBLICO, estado=e["id"]))
                await p5.add_script_tag(path=str(args.axe))
                res = await p5.evaluate("axe.run(document, { runOnly: { type: 'tag', values: "
                                        "['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })")
                violacoes += [f"{e['id']}: {v['id']}" for v in res["violations"]]
                incompletos |= {v["id"] for v in res["incomplete"]}
            rel["axe"] = {"violacoes": violacoes, "a_revisar": sorted(incompletos)}
            falhas += [f"axe {v}" for v in violacoes]
        else:
            rel["axe"] = "não executado (passe --axe)"
        await c5.close()

        # ---- sem JavaScript e tema escuro ----
        c6 = await nav.new_context(java_script_enabled=False, viewport={"width": 390, "height": 214}, device_scale_factor=2)
        p6 = await c6.new_page()
        await p6.goto(PUBLICO.as_uri())
        sem_js = [await p6.text_content(sel) for sel in ("#kicker", "#titulo", "#texto")]
        reserva = [dados["reserva"]["kicker"], B.texto_puro(dados["reserva"]["titulo"]), dados["reserva"]["texto"]]
        rel["sem_javascript"] = sem_js
        if [s.strip() for s in sem_js] != reserva:
            falhas.append(f"sem JavaScript: {sem_js} ≠ reserva {reserva}")
        await p6.screenshot(path=str(args.saida / "_sem-js.png"))
        await c6.close()

        c7 = await nav.new_context(color_scheme="dark", reduced_motion="reduce", viewport={"width": 390, "height": 214},
                                   device_scale_factor=2)
        p7 = await c7.new_page()
        await carregar(p7, qa_url(PUBLICO, estado="conversar"))
        fundo_escuro = await p7.evaluate("getComputedStyle(document.body).backgroundColor")
        rel["tema_escuro_fundo"] = fundo_escuro
        if fundo_escuro != "rgb(245, 242, 240)":
            falhas.append(f"tema escuro mudou o fundo para {fundo_escuro}")
        await p7.screenshot(path=str(args.saida / "_escuro.png"))
        await c7.close()

        # ---- prancha de prévia (para aprovação): estados na ordem e os 2 espaços com texto de exemplo ----
        # (sem JS e tema escuro ficam como arquivos à parte na pasta de saída)
        c8 = await nav.new_context(reduced_motion="reduce", viewport={"width": 390, "height": 214}, device_scale_factor=2)
        p8 = await c8.new_page()
        quadros = []
        def quando(iso):
            return B.instante(iso, "-").astimezone(BRT).strftime("%d/%m %Hh%M").replace("h00", "h")

        for e in dados["estados"]:
            await carregar(p8, qa_url(PUBLICO, estado=e["id"]))
            if not e["de"]:
                rotulo = f"{e['kicker']} · até {quando(e['ate'])}"
            elif not e["ate"]:
                rotulo = f"{e['kicker']} · a partir de {quando(e['de'])}"
            else:
                rotulo = f"{e['kicker']} · {quando(e['de'])} → {quando(e['ate'])}"
            caminho = args.saida / f"estado_{e['id']}.png"
            await p8.screenshot(path=str(caminho))
            quadros.append((rotulo, caminho))
        for s in var_dados["espacos"]:
            await carregar(p8, qa_url(variante, estado=s["id"]))
            caminho = args.saida / f"espaco_{s['id']}.png"
            await p8.screenshot(path=str(caminho))
            quadros.append((f"Opcional · {quando(s['de'])} → {quando(s['ate'])} · EXEMPLO, vazio no app", caminho))
        await c8.close()
        await nav.close()

    rel["console"] = console
    rel["csp_violacoes"] = csp
    falhas += [f"console {c}" for c in console] + [f"CSP {c}" for c in csp]

    try:
        fonte = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
    except OSError:
        fonte = ImageFont.load_default()
    ims = [(r, Image.open(c).convert("RGB")) for r, c in quadros]
    tw, th = ims[0][1].size
    cols, gap, cab = 2, 24, 44
    linhas = (len(ims) + cols - 1) // cols
    prancha = Image.new("RGB", (cols * tw + (cols + 1) * gap, linhas * (th + cab + gap) + gap), "#D9DCDF")
    d = ImageDraw.Draw(prancha)
    for i, (r, im) in enumerate(ims):
        x = gap + (i % cols) * (tw + gap)
        y = gap + (i // cols) * (th + cab + gap)
        d.text((x, y + 8), r, fill="#35373E", font=fonte)
        prancha.paste(im, (x, y + cab))
    prancha.save(args.saida / "previa-fio-da-historia.png", optimize=True)

    rel["falhas"] = falhas
    (args.saida / "relatorio.json").write_text(json.dumps(rel, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in rel.items() if k not in ("telas",)}, ensure_ascii=False, indent=2))
    print(f"telas: {rel['telas']['ok']}/{rel['telas']['combinacoes']} ok")
    print(f"saída: {args.saida}")
    print("RESULTADO:", "OK" if not falhas else f"{len(falhas)} FALHA(S)")
    return 0 if not falhas else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
