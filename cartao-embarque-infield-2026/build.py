"""Gera cartao-embarque.html (IDA + VOLTA) a partir de um único template.

Restrição da plataforma: sem JS, sem <style>, sem <div>/flexbox. Só markup
legado (table/font/bgcolor/img) + Handlebars. Por isso os dois cartões são
emitidos como HTML duplicado — mas a fonte única de verdade é este script.

Uso: python3 build.py  → sobrescreve cartao-embarque.html
"""
from pathlib import Path

# ── Tokens ────────────────────────────────────────────────────────────────
FONT = "Arial, Helvetica, sans-serif"
RED = "#E1242A"          # único acento vermelho da peça (faixa superior) — C&E v2.0
INK = "#20252B"          # texto principal
GRAY = "#677078"         # rótulos
BORDER = "#D9DCDF"       # contorno do cartão
HAIR = "#CED2D5"         # divisórias / picote
CREAM = "#F7F4EF"        # canhoto (localizador + código de barras) — fundo do DS
WHITE = "#FFFFFF"
GRAPHITE = "#1E2A38"       # faixa de rota — grafite do DS do evento
GRAPHITE_SOFT = "#A9B4C2"  # rótulos sobre grafite (contraste AA)
GRAPHITE_LINE = "#4A5A6E"  # trilha do avião
G = 20                   # gutter lateral (px)

LOGO = "https://upload.wikimedia.org/wikipedia/commons/f/fe/Latam-logo_-v_%28Indigo%29.svg"

# Padrão de barras original (preto, branco, preto, ...) — decorativo.
BARS = [3,2,4,3,2,2,5,2,3,3,2,3,3,2,2,3,4,2,3,2,5,3,2,3,2,2,5,2,5,3,4,2,3,2,5,2,
        3,3,3,3,2,3,3,3,3,2,5,3,3,3,2,3,2,3,2,3,3,3,5,3,3,3,5,3,3,3,3,2,3,2,5,3,
        5,3,3,3,4,3,5,2,2,3,4,2,3,2,4,3,2,3,2,3,5,3]

TABLE = 'role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"'

# ── Primitivas ────────────────────────────────────────────────────────────
def label(text, color=GRAY):
    return f'<font face="{FONT}" size="1" color="{color}">{text}</font>'

def value(text, size, color=INK):
    return f'<font face="{FONT}" size="{size}" color="{color}"><b>{text}</b></font>'

def spacer(h, bg=None):
    bg = f' bgcolor="{bg}"' if bg else ""
    return f'<table {TABLE}{bg}><tr><td height="{h}"></td></tr></table>'

def band(inner, bg=WHITE, top=0, bottom=0):
    """Faixa de largura total com gutter lateral G e respiro vertical."""
    rows = []
    if top:
        rows.append(f'<tr><td colspan="3" height="{top}"></td></tr>')
    rows.append(f'<tr><td width="{G}"></td><td>{inner}</td><td width="{G}"></td></tr>')
    if bottom:
        rows.append(f'<tr><td colspan="3" height="{bottom}"></td></tr>')
    return f'<table {TABLE} bgcolor="{bg}">' + "".join(rows) + "</table>"

def hairline(color=HAIR):
    return f'<table {TABLE}><tr><td height="1" bgcolor="{color}"></td></tr></table>'

def field(lbl, val, size=4, align="left"):
    return f'<td valign="top" align="{align}">{label(lbl)}<br>{value(val, size)}</td>'

# ── Blocos ────────────────────────────────────────────────────────────────
def header():
    inner = (
        f'<table {TABLE}><tr>'
        f'<td width="34" valign="middle"><img src="{LOGO}" alt="LATAM" height="20" style="display:block;"></td>'
        f'<td width="12"></td>'
        f'<td valign="middle">{value("ENCONTRO INFIELD 2026", 2)}<br>{label("CARTÃO DE EMBARQUE")}</td>'
        f'</tr></table>'
    )
    return band(inner, top=16, bottom=16)

def chip(text):
    return (f'<table role="presentation" border="0" cellspacing="0" cellpadding="5" bgcolor="{WHITE}">'
            f'<tr><td>{value("&nbsp;" + text + "&nbsp;", 1, GRAPHITE)}</td></tr></table>')

def plane_track():
    line = f'<table {TABLE}><tr><td height="1" bgcolor="{GRAPHITE_LINE}"></td></tr></table>'
    return (f'<table {TABLE}><tr>'
            f'<td width="40%" valign="middle">{line}</td>'
            f'<td width="20%" valign="middle" align="center">{value("&#9992;&#65038;", 4, WHITE)}</td>'
            f'<td width="40%" valign="middle">{line}</td>'
            f'</tr></table>')

def route(leg, direction):
    p = f"activatedPerson.voo_{leg}"
    inner = (
        f'{chip(direction)}'
        f'{spacer(14)}'
        f'<table {TABLE}><tr>'
        f'<td width="40%" valign="bottom">{label("ORIGEM", GRAPHITE_SOFT)}<br>{value("{{" + p + "_origem}}", 6, WHITE)}</td>'
        f'<td width="20%" valign="middle">{plane_track()}</td>'
        f'<td width="40%" valign="bottom" align="right">{label("DESTINO", GRAPHITE_SOFT)}<br>{value("{{" + p + "_destino}}", 6, WHITE)}</td>'
        f'</tr></table>'
    )
    return band(inner, bg=GRAPHITE, top=18, bottom=22)

def details(leg, date_field):
    p = "activatedPerson"
    passenger = f'{label("PASSAGEIRO")}<br>{value("{{" + p + ".fname}} {{" + p + ".lname}}", 4)}'
    grid = (
        f'<table {TABLE}>'
        f'<tr>{field("DATA", "{{" + p + "." + date_field + "}}")}'
        f'<td width="16"></td>'
        f'{field("HORÁRIO", "{{" + p + ".horario_" + leg + "}}", align="right")}</tr>'
        f'</table>'
    )
    flight = f'{label("VOO · CIA E Nº")}<br>{value("{{{" + p + ".voo_" + leg + "_partida}}}", 4)}'
    return (
        band(passenger, top=20, bottom=16)
        + band(hairline())
        + band(grid, top=16, bottom=16)
        + band(hairline())
        + band(flight, top=16, bottom=18)
    )

def connection(leg, key, lbl):
    var = f"activatedPerson.voo_{leg}_{key}"
    inner = (f'<table {TABLE} bgcolor="#F1F3F4"><tr><td width="3" bgcolor="{GRAPHITE}"></td><td>'
             f'<table {TABLE}><tr><td width="12"></td><td>'
             f'{spacer(10)}{label(lbl)}<br>{value("{{{" + var + "}}}", 3)}{spacer(10)}'
             f'</td></tr></table></td></tr></table>')
    return f"{{{{#if {var}}}}}\n{band(inner, bottom=10)}\n{{{{/if}}}}"

def perforation():
    n = 50
    cells = "".join(
        f'<td width="2%" height="1" bgcolor="{HAIR if i % 2 == 0 else WHITE}"></td>' for i in range(n)
    )
    return spacer(8) + f'<table {TABLE}><tr>{cells}</tr></table>'

def barcode():
    total = sum(BARS)
    cells = "".join(
        f'<td width="{w / total * 100:.2f}%" bgcolor="{INK if i % 2 == 0 else CREAM}"></td>'
        for i, w in enumerate(BARS)
    )
    return f'<table {TABLE} height="44"><tr>{cells}</tr></table>'

def stub(leg):
    loc = "{{activatedPerson.voo_" + leg + "_localizador}}"
    pnr = (
        f'<table {TABLE}><tr>'
        f'<td valign="middle">{label("LOCALIZADOR")}<br>{label("Sua reserva")}</td>'
        f'<td valign="middle" align="right">{value(loc, 6)}</td>'
        f'</tr></table>'
    )
    note = (f'<font face="{FONT}" size="1" color="{GRAY}">'
            f'Documento de apoio do evento. No embarque, apresente o cartão emitido pela companhia aérea.</font>')
    return band(pnr + spacer(16) + barcode() + spacer(14) + note, bg=CREAM, top=20, bottom=18)

def card(leg, direction, date_field):
    blocks = [
        f'<tr><td bgcolor="{RED}" height="4"></td></tr>',
        f"<tr><td>{header()}</td></tr>",
        f"<tr><td>{route(leg, direction)}</td></tr>",
        f"<tr><td>{details(leg, date_field)}</td></tr>",
        f"<tr><td>{connection(leg, 'conexao_aeroporto', 'CONEXÃO · AEROPORTO')}</td></tr>",
        f"<tr><td>{connection(leg, 'conexao_voo', 'VOO DE CONEXÃO')}</td></tr>",
        f"<tr><td>{perforation()}</td></tr>",
        f"<tr><td>{stub(leg)}</td></tr>",
    ]
    frame = TABLE.replace('cellpadding="0"', 'cellpadding="1"')  # 1px = contorno
    body = "\n".join(blocks)
    return (
        f"<!-- CARTAO DE EMBARQUE — {direction} -->\n"
        f'<table {frame} bgcolor="{BORDER}"><tr><td>\n'
        f'<table {TABLE} bgcolor="{WHITE}">\n{body}\n</table>\n'
        "</td></tr></table>\n"
    )

HEAD = """<!--
CARTÃO DE EMBARQUE — ENCONTRO INFIELD 2026 · V3
GERADO por build.py — edite o script, não este arquivo.
Cole todo este fragmento no editor HTML da plataforma.
Markup legado apenas (table/font/bgcolor/img): sem JS, <style>, <div> ou flexbox.
Conexões ficam ocultas (inclusive rótulos) quando seus próprios campos estão vazios.
Data_volta_ conserva o sublinhado final. Não substituir três chaves por duas.
Campos entre {{{ }}} (Cia+Nº, conexões) aceitam HTML/entidades sem escapar; os demais usam {{ }}.
-->
"""

def build():
    html = HEAD + card("ida", "IDA", "Data_ida") + "<br>\n<br>\n" + card("volta", "VOLTA", "Data_volta_")
    Path(__file__).with_name("cartao-embarque.html").write_text(html, encoding="utf-8")

if __name__ == "__main__":
    build()
