"""Gera cartao-embarque.html (IDA + VOLTA) a partir de um único template.

Restrição da plataforma: sem JS, sem <style>, sem <div>/flexbox. Só markup
legado (table/font/bgcolor/img) + Handlebars. Por isso os dois cartões são
emitidos como HTML duplicado — mas a fonte única de verdade é este script.

Layout de cartão de wallet (referência: LATAM no Apple Wallet).
- Logo da cia: campo voo_<trecho>_cia (código IATA) → logos/<IATA>.png.
- Cor da cia: campo voo_<trecho>_cor (hex, ex. #1B0088) → bgcolor das <td>.
  Campo vazio = bgcolor="" (transparente) → aparece a <td> externa em FALLBACK.
- Cantos arredondados: PNG de canto (branco da página fora do arco,
  transparente dentro) sobre a <td> colorida → funciona para qualquer cor.

Uso: python3 build.py [ref]  → sobrescreve cartao-embarque.html
     ref = branch/commit dos assets no GitHub (padrão: main)
"""
import sys
from pathlib import Path

# ── Tokens ────────────────────────────────────────────────────────────────
FONT = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
FALLBACK = "#B3141C"     # carmim Takeda — usado quando voo_<trecho>_cor está vazio
WHITE = "#FFFFFF"        # texto principal
SOFT = "#F2F2F2"         # rótulos (neutro: funciona sobre qualquer cor de cia)
DASH = "#FFFFFF"         # picote
G = 20                   # gutter lateral (px)
CODE_H = 56              # altura da linha dos códigos IATA (fonte 48 px)
ROUTE_GAP = 6            # respiro entre rótulo e código
R = 16                   # raio dos cantos (pt); PNG em 3x = 48 px
LOGO_H = 34

REF = sys.argv[1] if len(sys.argv) > 1 else "main"
ASSETS = f"https://raw.githubusercontent.com/Femartignon/Femartignon/{REF}/cartao-embarque-infield-2026/"

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

# ── Blocos ────────────────────────────────────────────────────────────────
def corners(bg, pos):
    """Linha dos cantos. O app impõe line-height (~22 px) > R, então a célula cresce:
    a imagem é presa na borda externa (valign top/bottom) para não sobrar faixa reta."""
    va = "top" if pos == "t" else "bottom"
    img = lambda c: f'<img src="{ASSETS}cantos/{c}.png" width="{R}" height="{R}" alt="" style="display:block;">'
    return (f'<table {TABLE}><tr>'
            f'<td width="{R}" height="{R}" valign="{va}" bgcolor="{bg}">{img(pos + "l")}</td>'
            f'<td bgcolor="{bg}"></td>'
            f'<td width="{R}" valign="{va}" bgcolor="{bg}">{img(pos + "r")}</td>'
            f'</tr></table>')

def header(leg, direction, date_field, bg):
    logo = (f'<img src="{ASSETS}logos/{v(f"voo_{leg}_cia")}.png" alt="{v(f"voo_{leg}_cia")}" '
            f'height="{LOGO_H}" style="display:block;">')
    right = (f'{text(v(f"voo_{leg}_partida", triple=True), 4, bold=True)}<br>'
             f'{text(direction + when(date_field, " · " + v(date_field)), 2, SOFT)}')
    return band(f'<table {TABLE}><tr>'
                f'<td valign="middle">{logo}</td>'
                f'<td valign="top" align="right">{right}</td>'
                f'</tr></table>', bg, top=6, bottom=22)

def route(leg, bg):
    """Grade 3×3 (rótulo / código / horário): cada texto na própria linha com altura
    explícita — o app impõe line-height fixo e, com <br>, o código de 48 px invade o rótulo."""
    via = when(f"voo_{leg}_conexao_aeroporto",
               text("via " + v(f"voo_{leg}_conexao_aeroporto", triple=True), 2, SOFT, bold=True))
    row = lambda h, l, c, r, va="middle": (
        f'<tr><td width="40%" height="{h}" valign="{va}">{l}</td>'
        f'<td width="20%" valign="{va}" align="center">{c}</td>'
        f'<td width="40%" valign="{va}" align="right">{r}</td></tr>')
    return band(
        f'<table {TABLE}>'
        + row(18, text("ORIGEM", 2, SOFT), "", text("DESTINO", 2, SOFT), "bottom")
        + f'<tr><td colspan="3" height="{ROUTE_GAP}"></td></tr>'
        + row(CODE_H, text(v(f"voo_{leg}_origem"), 7, bold=True), text("&#9992;&#65038;", 6),
              text(v(f"voo_{leg}_destino"), 7, bold=True))
        + row(24, text(v(f"horario_{leg}"), 3), via, "", "top")
        + '</table>', bg, bottom=22)

def perforation(bg):
    """Picote tracejado dentro do gutter (sem entalhes laterais)."""
    n = 40
    dashes = "".join(f'<td width="2.5%" height="1" bgcolor="{DASH if i % 2 == 0 else bg}"></td>'
                     for i in range(n))
    return band(f'<table {TABLE}><tr>{dashes}</tr></table>', bg)

def passenger(bg):
    return band(text(v("fname") + " " + v("lname"), 4, bold=True), bg, top=24, bottom=20)

def info(leg, bg):
    loc = f'{text("LOCALIZADOR", 2, SOFT)}<br>{text(v(f"voo_{leg}_localizador"), 5, bold=True)}'
    conn = when(f"voo_{leg}_conexao_voo",
                f'{text("VOO DE CONEXÃO", 2, SOFT)}<br>{text(v(f"voo_{leg}_conexao_voo", triple=True), 5, bold=True)}')
    return band(f'<table {TABLE}><tr>'
                f'<td width="50%" valign="top">{loc}</td>'
                f'<td width="50%" valign="top" align="right">{conn}</td>'
                f'</tr></table>', bg, bottom=26)

def footer(bg):
    note = text("Documento de apoio · no embarque, use o cartão da cia aérea.", 1, SOFT)
    return band(note, bg, bottom=6)

def card(leg, direction, date_field):
    bg = v(f"voo_{leg}_cor")
    blocks = [
        corners(bg, "t"),
        header(leg, direction, date_field, bg),
        route(leg, bg),
        perforation(bg),
        passenger(bg),
        info(leg, bg),
        footer(bg),
        corners(bg, "b"),
    ]
    body = "\n".join(f"<tr><td>{b}</td></tr>" for b in blocks)
    return (f"<!-- CARTAO DE EMBARQUE — {direction} -->\n"
            f'<table {TABLE}><tr><td bgcolor="{FALLBACK}">\n'
            f"<table {TABLE}>\n{body}\n</table>\n"
            "</td></tr></table>\n")

HEAD = """<!--
CARTÃO DE EMBARQUE — ENCONTRO INFIELD 2026 · V6
GERADO por build.py — edite o script, não este arquivo.
Cole todo este fragmento no editor HTML da plataforma.
Markup legado apenas (table/font/bgcolor/img): sem JS, <style>, <div> ou flexbox.
bgcolor SEMPRE em <td>: o app descarta bgcolor em <table>.
Logo: voo_ida_cia / voo_volta_cia = código IATA (LA, G3, AD) → logos/<IATA>.png.
Cor:  voo_ida_cor / voo_volta_cor = hex da cia (LA #1B0088 · AD #002D72 · G3 #D95300); vazio = carmim Takeda.
Conexões ficam ocultas quando seus próprios campos estão vazios.
Data_volta_ conserva o sublinhado final. Não substituir três chaves por duas.
Campos entre {{{ }}} (Cia+Nº, conexões) aceitam HTML/entidades sem escapar; os demais usam {{ }}.
-->
"""

def build():
    html = HEAD + card("ida", "IDA", "Data_ida") + "<br>\n<br>\n" + card("volta", "VOLTA", "Data_volta_")
    Path(__file__).with_name("cartao-embarque.html").write_text(html, encoding="utf-8")

if __name__ == "__main__":
    build()
