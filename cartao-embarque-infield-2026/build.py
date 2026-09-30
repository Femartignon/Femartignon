"""Gera cartao-embarque.html (IDA + VOLTA) a partir de um único template.

Restrição da plataforma: sem JS, sem <style>, sem <div>/flexbox. Só markup
legado (table/font/bgcolor/img) + Handlebars. Por isso os dois cartões são
emitidos como HTML duplicado — mas a fonte única de verdade é este script.

V5: layout de cartão de wallet (referência: LATAM no Apple Wallet) em vermelho
Takeda. Logo da cia dirigido por dado: campo voo_<trecho>_cia (código IATA)
monta a URL de logos/<IATA>.png (PNG branco, fundo transparente).

Uso: python3 build.py  → sobrescreve cartao-embarque.html
"""
from pathlib import Path

# ── Tokens ────────────────────────────────────────────────────────────────
FONT = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
RED = "#E1242A"          # fundo do cartão — vermelho Takeda C&E v2.0
RED_DASH = "#F07A7E"     # picote sobre o vermelho
WHITE = "#FFFFFF"        # texto principal
SOFT = "#FFE3E4"         # rótulos e texto secundário sobre o vermelho
PAGE = "#FFFFFF"         # fundo da página do app (cor dos entalhes laterais)
G = 20                   # gutter lateral (px)

# PNG branco transparente por código IATA (LA, G3, AD…), versionado neste repo.
LOGO_BASE = "https://raw.githubusercontent.com/Femartignon/Femartignon/main/cartao-embarque-infield-2026/logos/"
LOGO_H = 34

TABLE = 'role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"'

# ── Primitivas ────────────────────────────────────────────────────────────
def text(t, size, color=WHITE, bold=False):
    t = f"<b>{t}</b>" if bold else t
    return f'<font face="{FONT}" size="{size}" color="{color}">{t}</font>'

def spacer(h, bg=RED):
    return f'<table {TABLE}><tr><td height="{h}" bgcolor="{bg}"></td></tr></table>'

def band(inner, top=0, bottom=0, bg=RED):
    """Faixa de largura total com gutter lateral G e respiro vertical."""
    b = f'bgcolor="{bg}"'  # cor sempre no <td>: o app descarta bgcolor de <table>
    rows = []
    if top:
        rows.append(f'<tr><td colspan="3" height="{top}" {b}></td></tr>')
    rows.append(f'<tr><td width="{G}" {b}></td><td {b}>{inner}</td><td width="{G}" {b}></td></tr>')
    if bottom:
        rows.append(f'<tr><td colspan="3" height="{bottom}" {b}></td></tr>')
    return f'<table {TABLE}>' + "".join(rows) + "</table>"

def v(field, triple=False):
    """Merge tag de activatedPerson; triple = HTML sem escapar."""
    return ("{{{" if triple else "{{") + "activatedPerson." + field + ("}}}" if triple else "}}")

def when(field, html):
    return "{{#if activatedPerson." + field + "}}" + html + "{{/if}}"

# ── Blocos ────────────────────────────────────────────────────────────────
def header(leg, direction, date_field):
    logo = (f'<img src="{LOGO_BASE}{v(f"voo_{leg}_cia")}.png" alt="{v(f"voo_{leg}_cia")}" '
            f'height="{LOGO_H}" style="display:block;">')
    right = (f'{text(v(f"voo_{leg}_partida", triple=True), 4, bold=True)}<br>'
             f'{text(direction + " · " + v(date_field), 2, SOFT)}')
    return band(f'<table {TABLE}><tr>'
                f'<td valign="middle">{logo}</td>'
                f'<td valign="top" align="right">{right}</td>'
                f'</tr></table>', top=20, bottom=22)

def route(leg):
    via = when(f"voo_{leg}_conexao_aeroporto",
               "<br>" + text("via " + v(f"voo_{leg}_conexao_aeroporto", triple=True), 1, SOFT, bold=True))
    return band(
        f'<table {TABLE}><tr>'
        f'<td width="40%" valign="top">{text("ORIGEM", 2, SOFT)}<br>'
        f'{text(v(f"voo_{leg}_origem"), 7, bold=True)}<br>{text(v(f"horario_{leg}"), 3)}</td>'
        f'<td width="20%" valign="middle" align="center">{text("&#9992;&#65038;", 6)}{via}</td>'
        f'<td width="40%" valign="top" align="right">{text("DESTINO", 2, SOFT)}<br>'
        f'{text(v(f"voo_{leg}_destino"), 7, bold=True)}<br>{text("&nbsp;", 3)}</td>'
        f'</tr></table>', bottom=24)

def perforation():
    """Entalhes laterais (cor da página) + picote tracejado."""
    n = 40
    dashes = "".join(f'<td width="2.5%" height="1" bgcolor="{RED_DASH if i % 2 == 0 else RED}"></td>'
                     for i in range(n))
    line = f'<table {TABLE}><tr>{dashes}</tr></table>'
    return (f'<table {TABLE}><tr>'
            f'<td width="10" height="20" bgcolor="{PAGE}"></td>'
            f'<td width="12" bgcolor="{RED}"></td>'
            f'<td valign="middle" bgcolor="{RED}">{line}</td>'
            f'<td width="12" bgcolor="{RED}"></td>'
            f'<td width="10" bgcolor="{PAGE}"></td>'
            f'</tr></table>')

def passenger():
    return band(text(v("fname") + " " + v("lname"), 4, bold=True), top=24, bottom=20)

def info(leg):
    loc = f'{text("LOCALIZADOR", 2, SOFT)}<br>{text(v(f"voo_{leg}_localizador"), 5, bold=True)}'
    conn = when(f"voo_{leg}_conexao_voo",
                f'{text("VOO DE CONEXÃO", 2, SOFT)}<br>{text(v(f"voo_{leg}_conexao_voo", triple=True), 5, bold=True)}')
    return band(f'<table {TABLE}><tr>'
                f'<td width="50%" valign="top">{loc}</td>'
                f'<td width="50%" valign="top" align="right">{conn}</td>'
                f'</tr></table>', bottom=26)

def footer():
    note = text("Documento de apoio do evento. No embarque, apresente o cartão emitido pela companhia aérea.", 1, SOFT)
    return band(note, bottom=18)

def card(leg, direction, date_field):
    blocks = [
        header(leg, direction, date_field),
        route(leg),
        perforation(),
        passenger(),
        info(leg),
        footer(),
    ]
    body = "\n".join(f"<tr><td>{b}</td></tr>" for b in blocks)
    return f"<!-- CARTAO DE EMBARQUE — {direction} -->\n<table {TABLE}>\n{body}\n</table>\n"

HEAD = """<!--
CARTÃO DE EMBARQUE — ENCONTRO INFIELD 2026 · V5
GERADO por build.py — edite o script, não este arquivo.
Cole todo este fragmento no editor HTML da plataforma.
Markup legado apenas (table/font/bgcolor/img): sem JS, <style>, <div> ou flexbox.
bgcolor SEMPRE em <td>: o app descarta bgcolor em <table>.
Logo: campos voo_ida_cia / voo_volta_cia = código IATA (LA, G3, AD) → logos/<IATA>.png.
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
