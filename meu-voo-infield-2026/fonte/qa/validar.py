#!/usr/bin/env python3
"""QA do Meu Voo (Chromium, 390 px): estados da viagem pelo relógio simulado, personas, console, CSP,
estouro horizontal, axe-core (se instalado) e fluxo completo botão nativo → página.

Uso: python3 fonte/qa/validar.py <pasta-de-saída> [caminho/axe.min.js]
Gera capturas por cenário e relatorio.json na pasta de saída.
"""
import html
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PAGE = ROOT / "dist" / "meu-voo.html"
SNIPPET = ROOT / "dist" / "meu-voo-spotme-botao.html"
VOO = json.loads((ROOT / "fonte" / "src" / "voo.json").read_text(encoding="utf-8"))
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "qa-saida"
AXE = Path(sys.argv[2]) if len(sys.argv) > 2 else None
OUT.mkdir(parents=True, exist_ok=True)
PERSONAS = {p["id"]: p["values"] for p in VOO["qa"]["personas"]}
FIELD = {k: f for k, f, _ in VOO["fields"]}
MOBILE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
INIT = ("window.__csp=[];document.addEventListener('securitypolicyviolation',"
        "e=>window.__csp.push(e.violatedDirective+' '+(e.blockedURI||'')));")


def frag(values, encode=False):
    """Fragmento como o SpotMe entrega: todos os campos, vazios inclusive."""
    if values == "raw":
        return "#" + "&".join(f"{k}={{{{activatedPerson.{f}}}}}" for k, f in FIELD.items())
    return "#" + "&".join(f"{k}={quote(values.get(k, '')) if encode else values.get(k, '')}" for k in FIELD)


def iso(s):
    return s  # "2026-11-16T05:40:00-03:00"


SCENARIOS = [
    # nome, persona, horário (Rio), tema, seções para capturar
    ("01-antes", "direto", "2026-11-06T10:00:00-03:00", "light", ["top", "ida", "volta", "antes", "chegada"]),
    ("02-checkin", "direto", "2026-11-14T09:00:00-03:00", "light", ["top"]),
    ("03-embarque", "direto", "2026-11-16T05:40:00-03:00", "dark", ["top", "ida"]),
    ("04-em-voo", "direto", "2026-11-16T07:10:00-03:00", "light", ["top", "ida"]),
    ("05-chegou", "direto", "2026-11-16T08:05:00-03:00", "light", ["top", "chegada"]),
    ("06-evento", "direto", "2026-11-17T10:00:00-03:00", "dark", ["top", "volta"]),
    ("07-dia-volta", "direto", "2026-11-19T09:00:00-03:00", "light", ["top", "voos"]),
    ("08-casa", "direto", "2026-11-19T19:00:00-03:00", "light", ["top"]),
    ("09-conexao-antes", "conexao", "2026-11-12T10:00:00-03:00", "light", ["top", "ida", "volta"]),
    ("10-conexao-voando", "conexao", "2026-11-16T05:00:00-03:00", "dark", ["top", "ida"]),
    ("11-sem-chegada", "sem-chegada", "2026-11-16T07:40:00-03:00", "light", ["top", "ida"]),
    ("12-sem-voo", "sem-voo", "2026-11-10T10:00:00-03:00", "light", ["top", "ida", "volta"]),
    ("13-cru", "cru", "2026-11-10T10:00:00-03:00", "light", ["top", "ida"]),
    ("14-vazio", "vazio", "2026-11-10T10:00:00-03:00", "light", ["top", "ida"]),
]


def shot(page, name, sid):
    if sid == "top":
        page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
    elif sid in ("ida", "volta"):  # um cartão por vez: escolhe a aba e captura a seção
        page.click(f"#tab-{sid}")
        page.evaluate("document.getElementById('voos').scrollIntoView({block: 'start', behavior: 'instant'})")
    else:
        page.evaluate(f"document.getElementById('{sid}').scrollIntoView({{block: 'start', behavior: 'instant'}})")
    page.wait_for_timeout(1700)
    f = OUT / f"{name}-{sid}.png"
    page.screenshot(path=str(f))
    return f.name


def abas(page):
    """Abas Ida/Volta: um cartão visível por vez, clique e teclado (setas) trocam o trecho, ARIA coerente."""
    st = lambda: page.evaluate("""() => ({ sel: [...document.querySelectorAll('#voo-tabs [role=tab]')].filter(t => t.getAttribute('aria-selected') === 'true').map(t => t.dataset.leg),
      vis: [...document.querySelectorAll('#voos [role=tabpanel]')].filter(p => !p.hidden && p.offsetHeight > 0).map(p => p.id),
      cards: [...document.querySelectorAll('#voos .bp')].filter(c => c.offsetHeight > 0).map(c => c.dataset.leg),
      thread: (() => { const c = [...document.querySelectorAll('#voos .bp')].find(c => c.offsetHeight > 0); return c ? c.querySelector('.t-base').getAttribute('d')?.length > 0 : null; })(),
      focus: document.activeElement?.id })""")
    out = {"inicio": st()}
    page.click("#tab-volta"); page.wait_for_timeout(300); out["clique_volta"] = st()
    page.keyboard.press("ArrowLeft"); page.wait_for_timeout(300); out["seta_esquerda"] = st()
    page.keyboard.press("ArrowRight"); page.wait_for_timeout(300); out["seta_direita"] = st()
    page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
    out["ok"] = (out["clique_volta"]["sel"] == ["volta"] and out["clique_volta"]["vis"] == ["leg-volta"] and out["clique_volta"]["cards"] == ["volta"]
                 and out["seta_esquerda"]["sel"] == ["ida"] and out["seta_esquerda"]["focus"] == "tab-ida" and out["seta_direita"]["vis"] == ["leg-volta"]
                 and out["clique_volta"]["thread"] is True)
    return out


def check_page(page):
    return page.evaluate("""() => {
      const se = document.scrollingElement;
      const wide = [...document.querySelectorAll('body *')].filter(el => {
        const r = el.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed'
          && !el.closest('.nav-chips, .sr-only, .sheet, dialog, .hero-corner, .footer-band');
      }).slice(0, 5).map(el => el.className || el.tagName);
      return { overflowX: se.scrollWidth - innerWidth, wide, ready: document.documentElement.dataset.ready === 'true',
               hash: location.hash, status: document.querySelector('#voo-status')?.innerText.replace(/\\s+/g, ' ').trim().slice(0, 160),
               lead: document.querySelector('#voo-lead')?.innerText, csp: window.__csp };
    }""")


def run_axe(page):
    if not AXE or not AXE.exists():
        return None
    page.add_script_tag(content=AXE.read_text(encoding="utf-8"))
    res = page.evaluate("""async () => { const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] });
      return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })); }""")
    return res


def main():
    report = {"scenarios": {}, "errors": []}
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for name, persona, when, scheme, sections in SCENARIOS:
            ctx = b.new_context(**MOBILE, color_scheme=scheme, bypass_csp=False)
            ctx.add_init_script(INIT)
            ctx.clock.install(time=when)
            page = ctx.new_page()
            errs = []
            page.on("console", lambda m, errs=errs: errs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
            page.on("pageerror", lambda e, errs=errs: errs.append(f"pageerror: {e}"))
            page.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
            page.goto(PAGE.as_uri() + frag(PERSONAS[persona]))
            page.wait_for_timeout(600)
            info = check_page(page)
            info["shots"] = [shot(page, name, s) for s in sections]
            info["errors"] = errs
            report["scenarios"][name] = info
            ctx.close()
            if name in ("01-antes", "03-embarque", "04-em-voo", "13-cru") and AXE and AXE.exists():
                # axe precisa injetar script: contexto próprio sem CSP (a checagem de CSP fica nos cenários acima)
                actx = b.new_context(**MOBILE, color_scheme=scheme, bypass_csp=True, reduced_motion="reduce")
                actx.clock.install(time=when)
                ap = actx.new_page()
                ap.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
                ap.goto(PAGE.as_uri() + frag(PERSONAS[persona]))
                ap.wait_for_timeout(600)
                info["axe"] = run_axe(ap)
                actx.close()

        # contador (modo balcão) e QA
        ctx = b.new_context(**MOBILE, color_scheme="light")
        ctx.add_init_script(INIT)
        ctx.clock.install(time="2026-11-16T05:40:00-03:00")
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
        page.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        page.goto(PAGE.as_uri() + frag(PERSONAS["direto"]) + "&qa=1")
        page.wait_for_timeout(500)
        page.click("#leg-ida .qbtn:has-text('Mostrar no balcão')")
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT / "15-balcao.png"))
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        page.click(".qa-fab")
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT / "16-qa.png"))
        report["qa"] = {"errors": errs, "csp": page.evaluate("window.__csp"),
                        "diag": page.locator("#qa-sheet .qa-stats").first.inner_text()}
        # agenda e localizador
        page.keyboard.press("Escape")
        page.evaluate("document.getElementById('voos').scrollIntoView({block:'start'})")
        page.click("#tab-ida")
        page.click("#leg-ida button[aria-label='Mostrar localizador']")
        report["qa"]["pnr_revelado"] = page.locator("#leg-ida .pnr-code").inner_text()
        report["qa"]["abas"] = abas(page)
        ctx.close()

        # fluxo completo: botão da página nativa (render simulado do SpotMe) → página personalizada
        report["fluxo"] = fluxo_botao(b)

        # largura de computador e prévia de demonstração
        ctx = b.new_context(viewport={"width": 1280, "height": 900}, device_scale_factor=1, color_scheme="light")
        ctx.clock.install(time="2026-11-16T07:10:00-03:00")
        page = ctx.new_page()
        page.goto(PAGE.as_uri() + frag(PERSONAS["direto"]))
        page.wait_for_timeout(600)
        page.evaluate("document.getElementById('voos').scrollIntoView({block: 'start', behavior: 'instant'})")
        page.wait_for_timeout(1600)
        page.screenshot(path=str(OUT / "19-desktop.png"))
        report["desktop"] = check_page(page)
        ctx.close()
        prev = PAGE.parent / "previa" / "meu-voo-previa.html"
        if prev.exists():
            ctx = b.new_context(**MOBILE, color_scheme="light")
            ctx.add_init_script(INIT)
            page = ctx.new_page()
            errs = []
            page.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
            page.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
            page.goto(prev.as_uri())
            page.wait_for_timeout(700)
            report["previa"] = {**check_page(page), "errors": errs, "fab": page.locator(".qa-fab").count()}
            page.screenshot(path=str(OUT / "20-previa.png"))
            ctx.close()
        b.close()
    (OUT / "relatorio.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    bad = {k: v for k, v in report["scenarios"].items() if v["errors"] or v["csp"] or v["overflowX"] > 0 or v["wide"] or not v["ready"]}
    print(json.dumps({"falhas": bad, "qa": report["qa"], "fluxo": report["fluxo"], "desktop": {k: report["desktop"][k] for k in ("overflowX", "wide", "csp")},
                      "previa": {k: report.get("previa", {}).get(k) for k in ("lead", "errors", "fab", "overflowX")},
                      "axe": {k: v.get("axe") for k, v in report["scenarios"].items() if v.get("axe") is not None}}, ensure_ascii=False, indent=2))


def render_spotme(src, values):
    """Simula o editor HTML do SpotMe: descarta bgcolor de <table>, resolve if/else de dentro para fora e
    troca {{activatedPerson.x}} pelo valor com o escape do Handlebars (& < > " ' ` =)."""
    src = src.split("-->", 1)[1]
    src = re.sub(r'(<table[^>]*?) bgcolor="[^"]*"', r"\1", src)
    data = {FIELD[k]: v for k, v in values.items()}
    rx = re.compile(r"\{\{#if activatedPerson\.(\w+)\}\}((?:(?!\{\{#if).)*?)(?:\{\{else\}\}((?:(?!\{\{#if).)*?))?\{\{/if\}\}", re.S)
    while rx.search(src):
        src = rx.sub(lambda m: m.group(2) if data.get(m.group(1)) else (m.group(3) or ""), src)
    esc = lambda s: (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
                     .replace("'", "&#x27;").replace("`", "&#x60;").replace("=", "&#x3D;"))
    src = re.sub(r"\{\{\{activatedPerson\.(\w+)\}\}\}", lambda m: data.get(m.group(1), ""), src)  # três chaves: sem escape
    out = re.sub(r"\{\{activatedPerson\.(\w+)\}\}", lambda m: esc(data.get(m.group(1), "")), src)
    assert "{{" not in out, "sobrou template sem resolver"
    return out


def fluxo_botao(b):
    vals = dict(PERSONAS["direto"])
    vals["ida.v"] = "LA&nbsp;3910"   # valor com entidade, como os campos de três chaves do cartão nativo
    body = render_spotme(SNIPPET.read_text(encoding="utf-8"), vals)
    body = body.replace(VOO["baseUrl"], PAGE.as_uri())
    host = PAGE.parent / "_spotme_sim.html"
    host.write_text(f'<!doctype html><meta charset="utf-8"><body style="margin:16px;line-height:22px;background:#fff">{body}</body>', encoding="utf-8")
    ctx = b.new_context(viewport={"width": 390, "height": 700}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.clock.install(time="2026-11-06T10:00:00-03:00")
    page = ctx.new_page()
    page.goto(host.as_uri())
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / "17-spotme-botao.png"))
    href = page.locator("a").first.get_attribute("href")
    card_text = page.locator("body").inner_text().replace("\u00a0", " ")
    page.locator("a").first.click()
    page.wait_for_load_state()
    page.wait_for_timeout(800)
    res = page.evaluate("""() => ({ hash: location.hash, lead: document.querySelector('#voo-lead').innerText,
      voo: document.querySelector('#leg-ida .bp-meta').innerText.replace(/\\s+/g, ' '), status: document.querySelector('#voo-status').innerText.replace(/\\s+/g, ' ').slice(0, 120) })""")
    page.screenshot(path=str(OUT / "18-spotme-destino.png"))
    ctx.close()
    host.unlink()
    return {"href_chars": len(href or ""), "texto_cartao_nativo": " | ".join(card_text.split("\n")[:4]), **res}


if __name__ == "__main__":
    main()
