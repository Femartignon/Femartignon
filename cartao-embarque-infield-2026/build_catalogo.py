"""Gera widgets-catalogo.html — os 10 modelos da referência de widgets de voo,
recriados com merge tags (somente IDA), numerados T1…T10 para escolha.

Depois da escolha, o modelo vencedor ganha IDA + VOLTA (como widget-voo.html).
Mesmas regras validadas no app: bgcolor só em <td>, cantos com <td> de 1 px,
alturas explícitas (o app impõe line-height fixo), sem imagem de fundo.

Uso: python3 build_catalogo.py  → sobrescreve widgets-catalogo.html
"""
from pathlib import Path

from build import ASSETS, TABLE, band, corners, text, v, when
import build_widget

# ── Tokens ────────────────────────────────────────────────────────────────
DARK = "#1E2124"         # widgets pretos da referência
SLATE = "#2B353E"        # T1
WEATHER = "#6C8597"      # T2 (azul-acinzentado)
NIGHT = "#27445C"        # T6 (azul da foto)
PANEL = "#2C3136"        # painéis internos
LABEL = "#8E959C"
SOFT = "#C9D1D8"
WHITE = "#FFFFFF"
LINE = "#4A5058"
BLUE = "#1E7FD6"
GREEN = "#34C759"
SEAT = "#3A4047"
TEAL_BG = "#2E5E55"
TEAL = "#8FE3CB"
RED = "#E1242A"
R = 20
L = "ida"                # catálogo mostra só a ida

PLANE = "&#9992;&#65038;"

# ── Primitivas ────────────────────────────────────────────────────────────
def gap(h):
    return f'<table {TABLE}><tr><td height="{h}"></td></tr></table>'

def row(*cells):
    """Linha de tabela: cada célula = (html, attrs)."""
    return f'<table {TABLE}><tr>' + "".join(f'<td {a}>{h}</td>' for h, a in cells) + "</tr></table>"

def shell(inner, bg, top=4, bottom=6):
    blocks = [corners(bg, "t", R), band(inner, bg, top=top, bottom=bottom), corners(bg, "b", R)]
    return f'<table {TABLE}>' + "".join(f"<tr><td>{b}</td></tr>" for b in blocks) + "</table>"

def dashes(bg, color=LINE, n=8):
    return row(*[("", f'width="{100 / n:.1f}%" height="1" bgcolor="{color if i % 2 == 0 else bg}"') for i in range(n)])

def logo(h=20):
    return (f'<img src="{ASSETS}logos/{v(f"voo_{L}_cia")}.png" alt="{v(f"voo_{L}_cia")}" '
            f'height="{h}" style="display:block;">')

def chip(t, bg, color):
    return (f'<table border="0" cellspacing="0" cellpadding="0"><tr>'
            f'<td bgcolor="{bg}" nowrap>{text("&nbsp;" + t + "&nbsp;", 2, color, bold=True)}</td></tr></table>')

def lbl(t, color=LABEL):
    return text(t, 1, color)

def pair(a, b):
    return (f'<table {TABLE}><tr><td width="49%" valign="top">{a}</td><td width="2%"></td>'
            f'<td width="49%" valign="top">{b}</td></tr></table>')

# ── Modelos ───────────────────────────────────────────────────────────────
def t1():
    """Rota: partida → chegada, pílula duração | direto."""
    return build_widget.widget(L, "IDA", "Data_ida")

def t2():
    """Destino (no lugar do clima): código, cidade e chegada."""
    p = f"voo_{L}"
    inner = (row((text(PLANE, 4, WHITE), 'height="28" valign="middle"'),
                 (text(v(f"{p}_destino"), 5, WHITE, bold=True), 'align="right" valign="middle"'))
             + gap(62)
             + row((when(f"{p}_destino_cidade", text(v(f"{p}_destino_cidade"), 4, WHITE)), 'height="26" valign="bottom"'))
             + row((when(f"horario_{L}_chegada", text("Chegada " + v(f"horario_{L}_chegada"), 2, SOFT)), 'height="20" valign="top"')))
    return shell(inner, WEATHER)

def t3():
    """Chegada com barra de progresso."""
    p = f"voo_{L}"
    dot = f'<table border="0" cellspacing="0" cellpadding="0"><tr><td width="10" height="10" bgcolor="{BLUE}"></td></tr></table>'
    progress = row((f'<table {TABLE}><tr><td height="1" bgcolor="{WHITE}"></td></tr></table>', 'width="30%" valign="middle"'),
                   (dot, 'width="10" valign="middle"'),
                   (dashes(DARK), 'valign="middle"'))
    inner = (row((text(PLANE, 4, WHITE), 'height="28" valign="middle"'),
                 (text(v(f"{p}_destino"), 5, WHITE, bold=True), 'align="right" valign="middle"'))
             + gap(26) + progress + gap(26)
             + row((lbl("CHEGADA"), 'height="14" valign="bottom"'))
             + row((text(v(f"horario_{L}_chegada"), 5, WHITE), 'height="30" valign="top"')))
    return shell(inner, DARK)

def t4():
    """Embarque: cia + voo, orientação e partida."""
    inner = (row((text("Embarque", 3, WHITE), 'height="24" valign="middle"'))
             + gap(8)
             + row((logo(16), 'height="20" valign="middle"'))
             + row((text(v(f"voo_{L}_partida", triple=True), 4, WHITE, bold=True), 'height="28" valign="middle"'))
             + gap(6)
             + row((text("Chegue 2h antes do voo.", 2, LABEL), 'height="22" valign="top"'))
             + gap(10)
             + row((text(PLANE, 3, WHITE), 'height="24" valign="middle"'),
                   (text(v(f"horario_{L}"), 3, WHITE) + "&nbsp;&nbsp;" + text(v(f"voo_{L}_origem"), 3, WHITE),
                    'align="right" valign="middle" nowrap')))
    return shell(inner, DARK)

def t5():
    """Evento (no lugar da promoção 'Fly Business')."""
    panel = (f'<table {TABLE}>'
             f'<tr><td>{corners(PANEL, "t", 10, DARK)}</td></tr>'
             f'<tr><td bgcolor="{PANEL}" align="center" height="58" valign="middle">'
             f'{text("16–19 nov", 4, WHITE, bold=True)}<br>{text("Grand Hyatt Rio", 2, SOFT)}</td></tr>'
             f'<tr><td>{corners(PANEL, "b", 10, DARK)}</td></tr></table>')
    inner = (row((text("Encontro Infield", 3, WHITE), 'height="24" valign="middle"'),
                 (text(PLANE, 3, RED), 'align="right" valign="middle"'))
             + gap(10) + panel + gap(10)
             + row((text("Barra da Tijuca, RJ", 2, LABEL), 'height="22" valign="top"')))
    return shell(inner, DARK)

def t6():
    """Data + rota + partida (no lugar da foto da ponte, fundo azul)."""
    p = f"voo_{L}"
    inner = (row((when(f"Data_{L}", text(v(f"Data_{L}"), 3, WHITE)), 'height="24" valign="middle"'))
             + gap(22)
             + row((text(v(f"{p}_origem"), 5, WHITE, bold=True), 'valign="middle" height="30"'),
                   (text(PLANE, 4, WHITE), 'align="center" valign="middle"'),
                   (text(v(f"{p}_destino"), 5, WHITE, bold=True), 'align="right" valign="middle"'))
             + gap(22)
             + row((lbl("PARTIDA", SOFT), 'height="14" valign="bottom"'))
             + row((text(v(f"horario_{L}"), 3, WHITE), 'height="24" valign="top"'),
                   (text(v(f"{p}_origem"), 3, WHITE) + when(f"{p}_terminal", "&nbsp;&nbsp;" + text(v(f"{p}_terminal"), 3, WHITE)),
                    'align="right" valign="top" nowrap')))
    return shell(inner, NIGHT)

def t7():
    """Seu voo: cia + chegada (avião desenhado em glifo)."""
    p = f"voo_{L}"
    inner = (row((text("Seu voo", 3, WHITE), 'height="24" valign="middle"'),
                 (logo(16), 'align="right" valign="middle"'))
             + row((text(PLANE, 7, "#DDE6EE"), 'align="center" height="76" valign="middle"'))
             + row((lbl("CHEGADA"), 'height="14" valign="bottom"'))
             + row((text(v(f"horario_{L}_chegada"), 3, WHITE), 'height="24" valign="top"'),
                   (text(v(f"{p}_destino"), 3, WHITE), 'align="right" valign="top"')))
    return shell(inner, DARK)

def t8():
    """Seu assento: mapa decorativo + número do assento (campo novo)."""
    s, g, aisle = 9, 3, 9
    def seats(n, hi=-1):
        cells = []
        for i in range(n):
            if i:
                cells.append(f'<td width="{g}"></td>')
            cells.append(f'<td width="{s}" height="{s}" bgcolor="{GREEN if i == hi else SEAT}"></td>')
        return "".join(cells)
    def seat_row(hi=-1):
        return (f'<table border="0" cellspacing="0" cellpadding="0" align="center"><tr>'
                f'{seats(2)}<td width="{aisle}"></td>{seats(4, hi)}<td width="{aisle}"></td>{seats(2)}'
                f'</tr></table>')
    grid = "".join(seat_row(1 if r == 1 else -1) + gap(g) for r in range(4))
    seat = ("{{#if activatedPerson.voo_" + L + "_assento}}" + v(f"voo_{L}_assento")
            + "{{else}}A definir{{/if}}")
    inner = (row((text("Seu assento", 3, WHITE), 'height="24" valign="middle"'),
                 (text(PLANE, 3, WHITE), 'align="right" valign="middle"'))
             + gap(12) + grid + gap(10)
             + row((text(seat, 5, WHITE, bold=True), 'height="30" valign="middle"')))
    return shell(inner, DARK)

def t9():
    """Cartão largo: cia, voo, terminal, rota, data/hora, assento, conexão, localizador."""
    p = f"voo_{L}"
    head = row((logo(20), 'valign="middle"'),
               (text(v(f"{p}_partida", triple=True), 3, WHITE, bold=True), 'valign="middle" nowrap'),
               (when(f"{p}_terminal", text(PLANE + "&nbsp;" + v(f"{p}_terminal"), 3, WHITE)), 'align="center" valign="middle" nowrap'),
               (text(v(f"{p}_origem"), 3, WHITE) + "&nbsp;" + text(PLANE, 2, LABEL) + "&nbsp;" + text(v(f"{p}_destino"), 3, LABEL),
                'align="right" valign="middle" nowrap'))
    when_row = (f'<table border="0" cellspacing="0" cellpadding="0"><tr>'
                f'<td>{when(f"Data_{L}", chip(v(f"Data_{L}"), TEAL_BG, TEAL))}</td><td width="10"></td>'
                f'<td nowrap>{text(v(f"horario_{L}"), 4, WHITE)}</td></tr></table>')
    conn = ("{{#if activatedPerson." + p + "_conexao_aeroporto}}via " + v(f"{p}_conexao_aeroporto", triple=True)
            + "{{else}}Direto{{/if}}")
    seat = ("{{#if activatedPerson." + p + "_assento}}" + v(f"{p}_assento") + "{{else}}—{{/if}}")
    left = (lbl("PARTIDA") + gap(4) + when_row + gap(14)
            + row((lbl("ASSENTO") + "<br>" + text(seat, 3, WHITE), 'width="50%" valign="top"'),
                  (lbl("CONEXÃO") + "<br>" + text(conn, 3, WHITE), 'valign="top"')))
    pnr = (f'<table {TABLE}>'
           f'<tr><td>{corners(PANEL, "t", 10, DARK)}</td></tr>'
           f'<tr><td bgcolor="{PANEL}" align="center" height="76" valign="middle">'
           f'{lbl("LOCALIZADOR")}<br>{text(v(f"{p}_localizador"), 4, WHITE, bold=True)}</td></tr>'
           f'<tr><td>{corners(PANEL, "b", 10, DARK)}</td></tr></table>')
    inner = head + gap(16) + row((left, 'valign="top"'), ("", 'width="12"'), (pnr, 'width="38%" valign="middle"'))
    return shell(inner, DARK, top=8, bottom=10)

def t10():
    """Conexão (no lugar do alerta de preço)."""
    p = f"voo_{L}"
    con = (row((text("Conexão", 3, WHITE), 'height="24" valign="middle"'))
           + gap(18)
           + row((text(v(f"{p}_origem"), 5, WHITE, bold=True), 'height="30" valign="middle"'),
                 (text(PLANE, 4, LABEL), 'align="center" valign="middle"'),
                 (text(v(f"{p}_conexao_aeroporto", triple=True), 5, WHITE, bold=True), 'align="right" valign="middle"'))
           + gap(14)
           + row((text("&#9660;", 1, RED) + "&nbsp;" + lbl("VOO DE CONEXÃO"), 'height="14" valign="bottom"'))
           + row((text(v(f"{p}_conexao_voo", triple=True), 3, WHITE), 'height="24" valign="top"')))
    direct = (row((text("Voo direto", 3, WHITE), 'height="24" valign="middle"'))
              + gap(18)
              + row((text(v(f"{p}_origem"), 5, WHITE, bold=True), 'height="30" valign="middle"'),
                    (text(PLANE, 4, LABEL), 'align="center" valign="middle"'),
                    (text(v(f"{p}_destino"), 5, WHITE, bold=True), 'align="right" valign="middle"'))
              + gap(14)
              + row((lbl("SEM CONEXÃO"), 'height="14" valign="bottom"'))
              + row((text(v(f"voo_{L}_partida", triple=True), 3, WHITE), 'height="24" valign="top"')))
    inner = "{{#if activatedPerson." + p + "_conexao_aeroporto}}" + con + "{{else}}" + direct + "{{/if}}"
    return shell(inner, DARK)

# ── Catálogo ──────────────────────────────────────────────────────────────
def tag(n, name):
    return row((text(f"<b>T{n}</b> · {name}", 2, "#5B636B"), 'height="26" valign="bottom"')) + gap(6)

def catalog():
    blocks = [
        tag(1, "Rota (largo)") + t1(),
        pair(tag(2, "Destino") + t2(), tag(3, "Chegada") + t3()),
        pair(tag(4, "Embarque") + t4(), tag(5, "Evento") + t5()),
        pair(tag(6, "Data e rota") + t6(), tag(7, "Seu voo") + t7()),
        pair(tag(8, "Assento") + t8(), tag(10, "Conexão") + t10()),
        tag(9, "Cartão (largo)") + t9(),
    ]
    return "\n<br>\n".join(blocks)

HEAD = """<!--
CATÁLOGO DE WIDGETS DE VOO — ENCONTRO INFIELD 2026 · T1…T10 (somente IDA, para escolha)
GERADO por build_catalogo.py — edite o script, não este arquivo.
Campos novos opcionais: voo_ida_origem_cidade, voo_ida_destino_cidade, voo_ida_duracao,
voo_ida_terminal, voo_ida_assento. Usa {{#if}}…{{else}}…{{/if}} (T1, T8, T9, T10).
-->
"""

def build():
    Path(__file__).with_name("widgets-catalogo.html").write_text(HEAD + catalog() + "\n", encoding="utf-8")

if __name__ == "__main__":
    build()
