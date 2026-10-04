"""Gera as páginas de teste de recursos do app (SpotMe) e seus assets.

  teste-A-html.html        → só HTML (estilo inline, div/span, links, details, QR, GIF, SVG)
  teste-B-dados.html       → sintaxe de template já padrão do Handlebars ({{#unless}}, {{#with}}, outros objetos)
  teste-C-comparacao.html  → helper de comparação (eq) — isolado: helper inexistente pode derrubar a página inteira
  aviao.gif / aviao.svg    → assets dos testes 8 e 9 (servidos pelo GitHub raw)

Leitura: verde = funcionou · vermelho = não funcionou · 👆 = tocar para testar.
Uso: python3 testes/build_testes.py [ref]  (ref = branch/commit dos assets; padrão: branch atual dos testes)
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from build import v  # noqa: E402

# Página de teste: markup enxuto (é colado à mão no app) — tabela e fonte curtas.
TABLE = 'width="100%" border="0" cellspacing="0" cellpadding="0"'

def text(t, size, color=None, bold=False):
    t = f"<b>{t}</b>" if bold else t
    return f'<font face="Arial" size="{size}"' + (f' color="{color}"' if color else "") + f'>{t}</font>'

HERE = Path(__file__).resolve().parent
REF = sys.argv[1] if len(sys.argv) > 1 else "claude/kind-babbage-gpnjey"
ASSETS = f"https://raw.githubusercontent.com/Femartignon/Femartignon/{REF}/cartao-embarque-infield-2026/testes/"

OK = "#34C759"
FAIL = "#E1242A"
INK = "#20252B"
GRAY = "#677078"
CARD = "#F2F3F5"
DARK = "#1E2124"
BLUE = "#1E7FD6"

# ── Primitivas ────────────────────────────────────────────────────────────
def gap(h):
    return f'<table {TABLE}><tr><td height="{h}"></td></tr></table>'

def item(num, title, how, result):
    """Bloco de teste: número + título, como ler, área de resultado.
    Chaves do título viram entidades: senão o app as interpretaria como template."""
    title = title.replace("{", "&#123;").replace("}", "&#125;")
    return (f'<table width="100%" border="0" cellspacing="0" cellpadding="12"><tr><td bgcolor="{CARD}">'
            f'{text(f"<b>{num}</b> · {title}", 2, INK)}<br>{text(how, 1, GRAY)}{gap(8)}{result}'
            f'</td></tr></table>' + gap(10))

def swatch(attrs, label, color="#FFFFFF", h=40):
    return (f'<table {TABLE}><tr><td height="{h}" align="center" valign="middle" {attrs}>'
            f'{text(label, 2, color, bold=True)}</td></tr></table>')

def section(t):
    return gap(14) + f'<table {TABLE}><tr><td height="26" valign="bottom">{text(t, 3, INK, bold=True)}</td></tr></table>' + gap(6)

def header(name, extra):
    return (f'<table width="100%" border="0" cellspacing="0" cellpadding="12"><tr><td bgcolor="{DARK}">'
            f'{text(name, 3, "#FFFFFF", bold=True)}<br>{text(extra, 1, "#C9D1D8")}'
            f'</td></tr></table>' + gap(6))

def button(href, label):
    return (f'<table {TABLE}><tr><td bgcolor="{BLUE}" height="38" align="center" valign="middle">'
            f'<a href="{href}">{text(label, 2, "#FFFFFF", bold=True)}</a></td></tr></table>' + gap(6))

# ── Teste A · HTML ────────────────────────────────────────────────────────
def page_a():
    lh = "linha<br>linha<br>linha"
    lines = (f'<table {TABLE}><tr>'
             f'<td width="48%" bgcolor="#D5DADF" valign="top">{text("A " + lh, 1, INK)}</td><td width="4%"></td>'
             f'<td width="48%" bgcolor="#D5DADF" valign="top" style="line-height:12px">'
             f'<font face="Arial" size="1" color="{INK}" style="line-height:12px">B {lh}</font></td>'
             f'</tr></table>')
    div = (f'<table {TABLE}><tr><td bgcolor="{FAIL}">'
           f'<div style="background:{OK};border-radius:12px;padding:12px;text-align:center">'
           f'{text("1f · div com estilo", 2, "#FFFFFF", bold=True)}</div></td></tr></table>')
    span = f'<span style="color:{OK};font-size:22px;font-weight:700;font-family:Arial,sans-serif">1g · texto verde e grande</span>'
    blocks = [
        header("TESTE A · HTML", "Verde = funcionou · Vermelho = não funcionou · 👆 = tocar. Mande um print de tudo."),
        section("1 · Estilo direto na tag"),
        item("1a", "Cor de fundo via style", "verde = OK · vermelho = falhou",
             swatch(f'bgcolor="{FAIL}" style="background:{OK}"', "1a")),
        item("1b", "Cantos redondos via style", "cantos redondos = OK · quadrado = falhou",
             swatch(f'bgcolor="{OK}" style="border-radius:18px"', "1b", h=48)),
        item("1c", "Sombra via style", "sombra escura sob o bloco = OK",
             swatch('bgcolor="#FFFFFF" style="box-shadow:0 6px 16px rgba(0,0,0,.45)"', "1c", INK)),
        item("1d", "Degradê via style", "degradê verde → azul = OK · vermelho = falhou",
             swatch(f'bgcolor="{FAIL}" style="background:linear-gradient(90deg,{OK},{BLUE})"', "1d")),
        item("1e", "Altura de linha via style", "B mais baixo que A = OK · iguais = falhou", lines),
        item("1f", "&lt;div&gt; com estilo", "verde arredondado (vermelho só nas pontas) = OK · todo vermelho = falhou", div),
        item("1g", "&lt;span&gt; com estilo", "texto verde e grande = OK", span),
        section("5 · Links 👆"),
        item("5", "Toque em cada botão", "anote quais abrem (site, mapa, WhatsApp, discador, e-mail, busca)",
             button("https://www.latamairlines.com/br/pt", "5a · Site (LATAM)")
             + button("https://maps.google.com/?q=Grand+Hyatt+Rio+de+Janeiro", "5b · Mapa (Grand Hyatt Rio)")
             + button("https://wa.me/?text=Teste%20Infield%202026", "5c · WhatsApp")
             + button("tel:+5511000000000", "5d · Discador (não ligue)")
             + button("mailto:?subject=Teste%20Infield%202026", "5e · E-mail")
             + button("https://www.google.com/search?q=" + v("voo_ida_partida"), "5f · Busca com merge tag no link")),
        section("6 · Bloco que abre e fecha 👆"),
        item("6", "&lt;details&gt; / &lt;summary&gt;",
             "toque na linha; o ✅ deve aparecer só depois · se já aparece ou nada acontece = falhou",
             f'<details><summary>{text("👆 Toque aqui para abrir", 2, BLUE, bold=True)}</summary>'
             f'{text("✅ 6 OK — este texto só aparece depois do toque", 2, OK, bold=True)}</details>'),
        section("7 · QR code gerado por serviço externo"),
        item("7", "Imagem de QR (dados fixos, nada pessoal)", "QR visível = OK · texto ❌ = bloqueado",
             f'<img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&amp;data=INFIELD2026-TESTE" '
             f'width="140" height="140" alt="❌ 7 — QR não carregou" style="display:block;">'),
        section("8 · GIF animado"),
        item("8", "Avião se movendo na rota", "avião andando = OK · parado = sem animação · ❌ = não carregou",
             f'<img src="{ASSETS}aviao.gif" width="300" height="40" alt="❌ 8 — GIF não carregou" style="display:block;">'),
        section("9 · SVG"),
        item("9a", "SVG como imagem (arquivo)", "avião azul nítido = OK",
             f'<img src="{ASSETS}aviao.svg" width="48" height="48" alt="❌ 9a — SVG não carregou" style="display:block;">'),
        item("9b", "SVG dentro do HTML", "círculo verde com ✓ = OK · vazio = falhou",
             f'<svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="{OK}"/>'
             f'<path d="M14 25 l7 7 l13 -15" stroke="#fff" stroke-width="5" fill="none"/></svg>'),
        item("9c", "SVG embutido como dado (data URI)", "quadrado verde = OK · ❌ = falhou",
             '<img src="data:image/svg+xml;utf8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2748%27 height=%2748%27%3E'
             '%3Crect width=%2748%27 height=%2748%27 rx=%2710%27 fill=%27%2334C759%27/%3E%3C/svg%3E" '
             'width="48" height="48" alt="❌ 9c — data URI bloqueado" style="display:block;">'),
    ]
    return "\n".join(blocks)

# ── Teste B · dados ───────────────────────────────────────────────────────
OBJECTS = ["activatedPerson.fname", "activatedPerson.email", "activatedPerson.company",
           "activatedPerson.title", "event.name", "event.title", "event.start_date",
           "currentUser.fname", "user.fname", "session.title"]

def page_b():
    rows = "".join(f'<tr><td height="22" valign="middle">{text(o, 1, GRAY)}</td>'
                   f'<td align="right" valign="middle">{text("[" + "{{" + o + "}}" + "]", 2, INK, bold=True)}</td></tr>'
                   for o in OBJECTS)
    blocks = [
        header("TESTE B · DADOS", "Se a página ficar em branco ou com erro, me avise: separo cada item."),
        item("4", "{{#unless}} (mostra quando o campo está vazio)", "✅ verde = OK · nada = falhou",
             "{{#unless activatedPerson.campo_teste_inexistente}}"
             + text("✅ 4 unless OK", 2, OK, bold=True) + "{{/unless}}"),
        item("4b", "{{#with}} (encurta as merge tags)", "seu primeiro nome após o ✅ = OK",
             "{{#with activatedPerson}}" + text("✅ 4b with OK — {{fname}}", 2, OK, bold=True) + "{{/with}}"),
        item("10", "Outros objetos de dados", "[ ] vazio = não existe · com valor = existe",
             f'<table {TABLE}>{rows}</table>'),
    ]
    return "\n".join(blocks)

# ── Teste C · comparação ──────────────────────────────────────────────────
def page_c():
    cia = "activatedPerson.voo_ida_cia"
    body = ('{{#if (eq ' + cia + ' "LA")}}'
            + text("✅ 3 eq OK — cia da ida é LA", 2, OK, bold=True)
            + "{{else}}"
            + text("✅ 3 eq OK — cia da ida não é LA ({{" + cia + "}})", 2, OK, bold=True)
            + "{{/if}}")
    return "\n".join([
        header("TESTE C · COMPARAÇÃO", "Qualquer ✅ = funciona. Página em branco ou erro = o app não tem o helper eq."),
        item("3", "{{#if (eq cia \"LA\")}}", "✅ verde = OK", body),
    ])

# ── Assets ────────────────────────────────────────────────────────────────
def plane(draw, x, y, s, fill):
    """Silhueta de avião apontando para a direita, centro (x, y), escala s."""
    p = lambda pts: [(x + a * s, y + b * s) for a, b in pts]
    draw.polygon(p([(-10, -1.4), (9, -1.4), (12, 0), (9, 1.4), (-10, 1.4)]), fill=fill)       # fuselagem
    draw.polygon(p([(-1, -1.4), (-6, -9), (-3, -9), (4, -1.4)]), fill=fill)                    # asa sup.
    draw.polygon(p([(-1, 1.4), (-6, 9), (-3, 9), (4, 1.4)]), fill=fill)                        # asa inf.
    draw.polygon(p([(-10, -1.4), (-12, -5), (-10.5, -5), (-7, -1.4)]), fill=fill)              # cauda
    draw.polygon(p([(-10, 1.4), (-12, 5), (-10.5, 5), (-7, 1.4)]), fill=fill)

def make_gif():
    W, H, n, k = 600, 80, 36, 2          # 2× para nitidez (exibido em 300×40)
    frames = []
    for i in range(n):
        im = Image.new("RGB", (W, H), DARK)
        d = ImageDraw.Draw(im)
        for x in range(30, W - 30, 24):
            d.line([(x, H // 2), (x + 12, H // 2)], fill="#5D6873", width=2)
        d.ellipse([18, H // 2 - 6, 30, H // 2 + 6], fill="#8E959C")
        d.ellipse([W - 30, H // 2 - 6, W - 18, H // 2 + 6], fill="#8E959C")
        plane(d, 50 + (W - 100) * i / (n - 1), H // 2, 1.6 * k, "#FFFFFF")
        frames.append(im)
    frames[0].save(HERE / "aviao.gif", save_all=True, append_images=frames[1:], duration=70, loop=0)

SVG = (f'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="-14 -12 28 24">'
       f'<path fill="{BLUE}" d="M-10 -1.4H9L12 0 9 1.4H-10Z M-1 -1.4L-6 -9H-3L4 -1.4Z M-1 1.4L-6 9H-3L4 1.4Z '
       f'M-10 -1.4L-12 -5H-10.5L-7 -1.4Z M-10 1.4L-12 5H-10.5L-7 1.4Z"/></svg>\n')

HEAD = """<!--
{name} — ENCONTRO INFIELD 2026 · teste de recursos do app
GERADO por testes/build_testes.py — edite o script, não este arquivo.
-->
"""

def build():
    make_gif()
    (HERE / "aviao.svg").write_text(SVG, encoding="utf-8")
    for fname, title, fn in [("teste-A-html.html", "TESTE A · HTML", page_a),
                             ("teste-B-dados.html", "TESTE B · DADOS", page_b),
                             ("teste-C-comparacao.html", "TESTE C · COMPARAÇÃO", page_c)]:
        (HERE / fname).write_text(HEAD.format(name=title) + fn() + "\n", encoding="utf-8")

if __name__ == "__main__":
    build()
