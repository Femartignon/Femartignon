"""Gera cartao-embarque-ida.html e cartao-embarque-volta.html a partir de um único template.

Restrição da plataforma: sem JS, sem <style>, sem <div>/flexbox. Só markup
legado (table/tr/td/font/bgcolor/img) + Handlebars. Um arquivo por trecho (cada um
vai numa aba do app), com o bloco "Antes de embarcar" ao final de ambos —
mas a fonte única de verdade é este script.

Layout "Meu Voo — versão A": bilhete creme 390 px com cabeçalho de marca
(fita + logos Infield/Takeda), passageiro, rota com picote vermelho e avião,
grade 2×2 (Data, Horário, Voo, Localizador), conexão condicional e
código de barras ilustrativo no rodapé.
- Imagens de marca: hospedadas em BRAND (header-fita, logo-infield, logo-takeda-pilula).
- Avião e código de barras: PNG gerados aqui e embutidos como data URI (sem hospedagem).
- Cantos arredondados: linhas de <td> de 1 px (recuo na cor da página) — sem imagem.
- Chegada: horario_<trecho>_chegada sob o destino (vazio = nada aparece).

Uso: python3 build.py  → sobrescreve cartao-embarque-ida.html e cartao-embarque-volta.html  (requer Pillow)
"""
import base64
import io
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

# ── Tokens ────────────────────────────────────────────────────────────────
FONT = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
CREAM = "#F7F4EF"        # fundo do bilhete
INK = "#1E2A38"          # texto
ACCENT = "#E1242A"       # vermelho Takeda: picote, avião, localizador, rótulo do trecho
MUTED = "#7A8591"        # rótulos (INK suavizado sobre o creme)
HAIR = "#E4DDD2"         # filetes divisórios
WHITE = "#FFFFFF"
W = 390                  # largura do bilhete (px)
G = 20                   # gutter lateral (px)
CODE_H = 56              # altura da linha dos códigos IATA (fonte 48 px)
R = 12                   # raio dos cantos (px), desenhado com <td> de 1 px
PAGE = "#FFFFFF"         # fundo da página do app (cor fora da curva)
LOGO_H = 28              # altura dos logos de marca no cabeçalho

# Imagens de marca: base pública onde ficam os três arquivos (trocar aqui se mudar).
BRAND = "https://cartao-embarque-infield-2026.netlify.app/"

TABLE = 'role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"'

# ── Primitivas ────────────────────────────────────────────────────────────
def text(t, size, color=WHITE, bold=False):
    t = f"<b>{t}</b>" if bold else t
    return f'<font face="{FONT}" size="{size}" color="{color}">{t}</font>'

def v(field, triple=False):
    """Merge tag de activatedPerson; triple = HTML sem escapar."""
    return ("{{{" if triple else "{{") + "activatedPerson." + field + ("}}}" if triple else "}}")

def when(field, html):
    return "{{#if activatedPerson." + field + "}}" + html + "{{/if}}"

def band(inner, bg, top=0, bottom=0):
    """Faixa de largura total com gutter lateral G e respiro vertical."""
    b = f'bgcolor="{bg}"'  # cor sempre no <td>: o app descarta bgcolor de <table>
    rows = []
    if top:
        rows.append(f'<tr><td colspan="3" height="{top}" {b}></td></tr>')
    rows.append(f'<tr><td width="{G}" {b}></td><td {b}>{inner}</td><td width="{G}" {b}></td></tr>')
    if bottom:
        rows.append(f'<tr><td colspan="3" height="{bottom}" {b}></td></tr>')
    return f'<table {TABLE}>' + "".join(rows) + "</table>"

def gap(h):
    return f'<table {TABLE}><tr><td height="{h}"></td></tr></table>'

def hair():
    return f'<table {TABLE}><tr><td height="1" bgcolor="{HAIR}"></td></tr></table>'

def label(t, color=MUTED):
    return text(t, 1, color, bold=True)

# ── Ícones (PNG embutidos como data URI) ──────────────────────────────────
def data_uri(im):
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

def rgba(hex_color):
    return tuple(int(hex_color[i:i + 2], 16) for i in (1, 3, 5)) + (255,)

def plane_png(s=48):
    """Silhueta de avião apontando para a direita (2× para tela retina)."""
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d, k, c, fill = ImageDraw.Draw(im), s / 28, s / 2, rgba(ACCENT)
    p = lambda pts: [(c + a * k, c + b * k) for a, b in pts]
    for shape in ([(-11, -1.6), (9, -1.6), (12.5, 0), (9, 1.6), (-11, 1.6)],     # fuselagem
                  [(-1, -1.6), (-6, -10), (-3, -10), (4.5, -1.6)],               # asa sup.
                  [(-1, 1.6), (-6, 10), (-3, 10), (4.5, 1.6)],                   # asa inf.
                  [(-11, -1.6), (-13, -6), (-11, -6), (-7.5, -1.6)],             # cauda
                  [(-11, 1.6), (-13, 6), (-11, 6), (-7.5, 1.6)]):
        d.polygon(p(shape), fill=fill)
    return data_uri(im)

def barcode_png(w=600, h=80):
    """Código de barras ilustrativo (semente fixa: mesmo desenho a cada build)."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d, rnd, x = ImageDraw.Draw(im), random.Random(2026), 0
    while True:
        bw, sp = rnd.choice([2, 2, 4, 6]), rnd.choice([2, 4, 4, 6])
        if x + bw > w:
            break
        d.rectangle([x, 0, x + bw - 1, h - 1], fill=rgba(INK))
        x += bw + sp
    return data_uri(im)

PLANE = plane_png()
BARCODE = barcode_png()

# ── Blocos ────────────────────────────────────────────────────────────────
def corners(bg, pos):
    """Cantos arredondados desenhados só com <td> de 1 px (sem imagem).
    Imagens de canto deixavam uma faixa reta no app (o app interfere no layout de <img>);
    células com bgcolor e altura explícita são o que já provamos que ele respeita.
    Cada linha é uma tabela própria: recuo lateral na cor da página + miolo na cor do card."""
    rows = []
    for y in range(R):
        dy = R - y - 0.5                                   # distância ao centro do arco
        inset = round(R - math.sqrt(max(R * R - dy * dy, 0)))
        side = f'<td width="{inset}" height="1" bgcolor="{PAGE}"></td>' if inset else ""
        rows.append(f'<table {TABLE}><tr>{side}<td height="1" bgcolor="{bg}"></td>{side}</tr></table>')
    return "".join(rows if pos == "t" else rows[::-1])

def header():
    """Fita de marca (780×192 → 350×86) e, logo abaixo, Infield à esquerda / Takeda à direita.
    Sem CSS não há sobreposição de imagens: os logos ficam numa linha própria."""
    fita = (f'<img src="{BRAND}header-fita-780x192.png" alt="Encontro Infield 2026" '
            f'width="{W - 2 * G}" style="display:block;">')
    logos = (f'<table {TABLE}><tr>'
             f'<td valign="middle"><img src="{BRAND}logo-infield.png" alt="Infield" height="{LOGO_H}" style="display:block;"></td>'
             f'<td valign="middle" align="right"><img src="{BRAND}logo-takeda-pilula.png" alt="Takeda" height="{LOGO_H}" style="display:block;"></td>'
             f'</tr></table>')
    return band(fita + gap(12) + logos, CREAM, top=4, bottom=18)

def passenger(direction):
    inner = (f'<table {TABLE}><tr>'
             f'<td height="16" valign="bottom">{label("PASSAGEIRO")}</td>'
             f'<td valign="bottom" align="right">{label("VOO DE " + direction, ACCENT)}</td>'
             f'</tr></table>'
             + f'<table {TABLE}><tr><td height="30" valign="middle">'
             f'{text(v("fname") + " " + v("lname"), 4, INK, bold=True)}</td></tr></table>')
    return band(inner + gap(14) + hair(), CREAM, bottom=18)

def dots(n=7):
    """Picote vermelho: segmentos de 1 célula alternando vermelho/creme."""
    cells = "".join(f'<td height="2" bgcolor="{ACCENT if i % 2 == 0 else CREAM}"></td>' for i in range(n))
    return f'<table {TABLE}><tr>{cells}</tr></table>'

def route(leg):
    """Rótulos / códigos / chegada: cada texto na própria linha com altura explícita —
    o app impõe line-height fixo e, com <br>, o código de 48 px invade o rótulo."""
    p = f"voo_{leg}"
    sep = (f'<table {TABLE}><tr>'
           f'<td width="8"></td><td valign="middle">{dots()}</td>'
           f'<td width="36" align="center" valign="middle"><img src="{PLANE}" alt="" width="24" height="24" style="display:block;"></td>'
           f'<td valign="middle">{dots()}</td><td width="8"></td>'
           f'</tr></table>')
    row = lambda h, l, c, r, va="middle": (
        f'<tr><td width="30%" height="{h}" valign="{va}">{l}</td>'
        f'<td width="40%" valign="{va}" align="center">{c}</td>'
        f'<td width="30%" valign="{va}" align="right">{r}</td></tr>')
    arrival = when(f"horario_{leg}_chegada", text("Chegada " + v(f"horario_{leg}_chegada"), 2, MUTED))
    return band(
        f'<table {TABLE}>'
        + row(16, label("ORIGEM"), "", label("DESTINO"), "bottom")
        + row(CODE_H, text(v(f"{p}_origem"), 7, INK, bold=True), sep, text(v(f"{p}_destino"), 7, INK, bold=True))
        + row(20, "", "", arrival, "top")
        + "</table>", CREAM, bottom=16)

def cell(name, value, color=INK, size=3):
    return (f'<table {TABLE}><tr><td height="16" valign="bottom">{label(name)}</td></tr>'
            f'<tr><td height="28" valign="middle">{text(value, size, color, bold=True)}</td></tr></table>')

def grid(leg, date_field):
    """Grade 2×2: Data | Horário / Voo | Localizador (vermelho)."""
    pair = lambda a, b: (f'<table {TABLE}><tr><td width="50%" valign="top">{a}</td>'
                         f'<td width="50%" valign="top">{b}</td></tr></table>')
    inner = (hair() + gap(14)
             + pair(cell("DATA", v(date_field)), cell("HORÁRIO", v(f"horario_{leg}")))
             + gap(10)
             + pair(cell("VOO", v(f"voo_{leg}_partida", triple=True)),
                    cell("LOCALIZADOR", v(f"voo_{leg}_localizador"), ACCENT, 4)))
    return band(inner, CREAM, bottom=16)

def connection(leg):
    """Linha 'Conexão' só com voo_<trecho>_conexao_aeroporto preenchido; voo opcional."""
    p = f"voo_{leg}"
    value = ("via " + v(f"{p}_conexao_aeroporto", triple=True)
             + when(f"{p}_conexao_voo", " · Voo " + v(f"{p}_conexao_voo", triple=True)))
    inner = (hair() + gap(12)
             + f'<table {TABLE}><tr>'
             f'<td width="30%" height="24" valign="middle">{label("CONEXÃO")}</td>'
             f'<td valign="middle" align="right">{text(value, 3, INK, bold=True)}</td>'
             f'</tr></table>')
    return when(f"{p}_conexao_aeroporto", band(inner, CREAM, bottom=16))

def footer():
    """Picote cinza + código de barras ilustrativo + nota de apoio."""
    perf = "".join(f'<td height="1" bgcolor="{MUTED if i % 2 == 0 else CREAM}"></td>' for i in range(40))
    bars = f'<img src="{BARCODE}" alt="" width="{W - 2 * G}" height="40" style="display:block;">'
    note = text("Documento de apoio · no embarque, use o cartão da cia aérea.", 1, MUTED)
    return band(f'<table {TABLE}><tr>{perf}</tr></table>' + gap(18) + bars + gap(10)
                + f'<table {TABLE}><tr><td align="center">{note}</td></tr></table>', CREAM, bottom=10)

def card(leg, direction, date_field):
    blocks = [
        corners(CREAM, "t"),
        header(),
        passenger(direction),
        route(leg),
        grid(leg, date_field),
        connection(leg),
        footer(),
        corners(CREAM, "b"),
    ]
    body = "\n".join(f"<tr><td>{b}</td></tr>" for b in blocks)
    # Sem voo cadastrado (ex.: participante local) → o cartão inteiro some.
    return (f"<!-- CARTAO DE EMBARQUE — {direction} -->\n"
            + when(f"voo_{leg}_origem",
                   f'\n<table role="presentation" width="{W}" align="center" border="0" cellspacing="0" cellpadding="0">\n'
                   f"{body}\n</table>\n<br>\n")
            + "\n")

GUIDE_BG = "#F2F3F5"     # bloco de orientações: neutro, abaixo dos cartões
GRAY = "#677078"
BULLET = "#E1242A"       # único acento vermelho do bloco
GUIDE = [
    "Chegue ao aeroporto com <b>2 horas</b> de antecedência.",
    "Tenha em mãos um <b>documento oficial com foto</b>.",
    "Faça o <b>check-in</b> pelo app ou site da companhia aérea.",
    "Transfer e hotel: <b>Mais › Logística do Evento</b>.",
    "Dúvidas ou alteração de voo: <b>Mais › Suporte da Agência</b>.",
]

def guide():
    """Bloco 'Antes de embarcar' — mesmo sistema do cartão (cantos, gutter), fundo neutro."""
    item = lambda t: (f'<table {TABLE}><tr>'
                      f'<td width="16" valign="top">{text("&#9679;", 1, BULLET)}</td>'
                      f'<td>{text(t, 2, "#20252B")}</td></tr></table>')
    items = "".join(item(t) + gap(8) for t in GUIDE)
    inner = text("ANTES DE EMBARCAR", 2, GRAY, bold=True) + gap(12) + items
    blocks = [corners(GUIDE_BG, "t"), band(inner, GUIDE_BG, top=8, bottom=6), corners(GUIDE_BG, "b")]
    body = "\n".join(f"<tr><td>{b}</td></tr>" for b in blocks)
    return f"<!-- ORIENTAÇÕES -->\n<table {TABLE}>\n{body}\n</table>\n"

HEAD = """<!--
CARTÃO DE EMBARQUE — {direction} — ENCONTRO INFIELD 2026 · MEU VOO — VERSÃO A
GERADO por build.py — edite o script, não este arquivo.
Cole todo este fragmento no editor HTML da plataforma.
Markup legado apenas (table/tr/td/font/bgcolor/img): sem JS, <style>, <div> ou flexbox.
bgcolor SEMPRE em <td>: o app descarta bgcolor em <table>.
Imagens de marca em https://cartao-embarque-infield-2026.netlify.app/ (header-fita-780x192.png,
logo-infield.png, logo-takeda-pilula.png). Avião e código de barras embutidos (data URI).
Conexão oculta quando voo_{leg}_conexao_aeroporto está vazio; cartão inteiro oculto sem voo_{leg}_origem.
Chegada: horario_{leg}_chegada. Bloco "Antes de embarcar" ao final.
Data_volta_ conserva o sublinhado final. Não substituir três chaves por duas.
Campos entre três chaves (Cia+Nº, conexões) aceitam HTML/entidades sem escapar; os demais usam duas.
-->
"""

LEGS = [("ida", "IDA", "Data_ida"), ("volta", "VOLTA", "Data_volta_")]

def build():
    for leg, direction, date_field in LEGS:
        html = HEAD.format(direction=direction, leg=leg) + card(leg, direction, date_field) + guide()
        Path(__file__).with_name(f"cartao-embarque-{leg}.html").write_text(html, encoding="utf-8")

if __name__ == "__main__":
    build()
