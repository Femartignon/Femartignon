"""Gera cartao-embarque.html (IDA + VOLTA) a partir de um único template.

Restrição da plataforma: sem JS, sem <style>, sem <div>/flexbox. Só markup
legado (table/font/bgcolor/img) + Handlebars. Por isso os dois cartões são
emitidos como HTML duplicado — mas a fonte única de verdade é este script.

Layout de cartão de wallet (referência: LATAM no Apple Wallet).
- Logo da cia: campo voo_<trecho>_cia (código IATA) → logos/<IATA>.png.
- Cor da cia: campo voo_<trecho>_cor (hex, ex. #1B0088) → bgcolor das <td>.
  Campo vazio = bgcolor="" (transparente) → aparece a <td> externa em FALLBACK.
- Cantos arredondados: linhas de <td> de 1 px (recuo na cor da página) — sem imagem.
- Chegada: horario_<trecho>_chegada sob o destino (vazio = nada aparece).

Uso: python3 build.py [ref]  → sobrescreve cartao-embarque.html
     ref = branch/commit dos assets no GitHub (padrão: main)
"""
import math
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
R = 12                   # raio dos cantos (px), desenhado com <td> de 1 px
PAGE = "#FFFFFF"         # fundo da página do app (cor fora da curva)
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
def corners(bg, pos, r=R, page=PAGE):
    """Cantos arredondados desenhados só com <td> de 1 px (sem imagem).
    Imagens de canto deixavam uma faixa reta no app (o app interfere no layout de <img>);
    células com bgcolor e altura explícita são o que já provamos que ele respeita.
    Cada linha é uma tabela própria: recuo lateral na cor da página + miolo na cor do card."""
    rows = []
    for y in range(r):
        dy = r - y - 0.5                                   # distância ao centro do arco
        inset = round(r - math.sqrt(max(r * r - dy * dy, 0)))
        side = f'<td width="{inset}" height="1" bgcolor="{page}"></td>' if inset else ""
        rows.append(f'<table {TABLE}><tr>{side}<td height="1" bgcolor="{bg}"></td>{side}</tr></table>')
    return "".join(rows if pos == "t" else rows[::-1])

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
        + row(24, text(v(f"horario_{leg}"), 3), via, text(v(f"horario_{leg}_chegada"), 3), "top")
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
    # Sem voo cadastrado (ex.: participante local) → o cartão inteiro some.
    return (f"<!-- CARTAO DE EMBARQUE — {direction} -->\n"
            + when(f"voo_{leg}_origem",
                   f'\n<table {TABLE}><tr><td bgcolor="{FALLBACK}">\n'
                   f"<table {TABLE}>\n{body}\n</table>\n"
                   "</td></tr></table>\n<br>\n")
            + "\n")

GUIDE_BG = "#F2F3F5"     # bloco de orientações: neutro, abaixo dos cartões
INK = "#20252B"
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
                      f'<td>{text(t, 2, INK)}</td></tr></table>')
    gap = lambda h: f'<table {TABLE}><tr><td height="{h}"></td></tr></table>'
    items = "".join(item(t) + gap(8) for t in GUIDE)
    inner = text("ANTES DE EMBARCAR", 2, GRAY, bold=True) + gap(12) + items
    blocks = [corners(GUIDE_BG, "t"), band(inner, GUIDE_BG, top=8, bottom=6), corners(GUIDE_BG, "b")]
    body = "\n".join(f"<tr><td>{b}</td></tr>" for b in blocks)
    return f"<!-- ORIENTAÇÕES -->\n<table {TABLE}>\n{body}\n</table>\n"

HEAD = """<!--
CARTÃO DE EMBARQUE — ENCONTRO INFIELD 2026 · V6
GERADO por build.py — edite o script, não este arquivo.
Cole todo este fragmento no editor HTML da plataforma.
Markup legado apenas (table/font/bgcolor/img): sem JS, <style>, <div> ou flexbox.
bgcolor SEMPRE em <td>: o app descarta bgcolor em <table>.
Logo: voo_ida_cia / voo_volta_cia = código IATA (LA, G3, AD) → logos/<IATA>.png.
Cor:  voo_ida_cor / voo_volta_cor = hex da cia (LA #1B0088 · AD #002D72 · G3 #D95300); vazio = carmim Takeda.
Conexões ficam ocultas quando seus próprios campos estão vazios; cartão inteiro oculto sem voo_<trecho>_origem.
Chegada: horario_ida_chegada / horario_volta_chegada. Bloco "Antes de embarcar" ao final.
Data_volta_ conserva o sublinhado final. Não substituir três chaves por duas.
Campos entre {{{ }}} (Cia+Nº, conexões) aceitam HTML/entidades sem escapar; os demais usam {{ }}.
-->
"""

def build():
    html = HEAD + card("ida", "IDA", "Data_ida") + card("volta", "VOLTA", "Data_volta_") + guide()
    Path(__file__).with_name("cartao-embarque.html").write_text(html, encoding="utf-8")

if __name__ == "__main__":
    build()
