"""Gera widget-voo.html (IDA + VOLTA) — visual alternativo em teste.

Referência: widget "DXB → SFO" (partida/chegada, trilha pontilhada com avião,
pílula duração | direto, linha data · horário · aeroporto · terminal).
Reaproveita as primitivas validadas no app em build.py (bgcolor só em <td>,
cantos de <td> de 1 px, alturas explícitas por causa do line-height do app).

Campos novos, todos opcionais (vazio = o elemento some):
  voo_<trecho>_origem_cidade / voo_<trecho>_destino_cidade  → nome da cidade sob o código
  voo_<trecho>_duracao                                      → ex. "1h 05" na pílula
  voo_<trecho>_terminal                                     → ex. "T2" na linha inferior

Uso: python3 build_widget.py  → sobrescreve widget-voo.html
"""
from pathlib import Path

from build import TABLE, band, corners, text, v, when

# ── Tokens ────────────────────────────────────────────────────────────────
CARD = "#2B353E"         # grafite-azulado da referência
LABEL = "#97A1AA"        # rótulos e cidades
TRACK = "#5D6873"        # trilha pontilhada e divisória
WHITE = "#FFFFFF"
PILL = "#1E7FD6"         # pílula azul
PILL_DIV = "#79AEE6"     # divisória interna da pílula
R_CARD = 20              # raio do widget
R_PILL = 9               # raio da pílula

def gap(h):
    return f'<table {TABLE}><tr><td height="{h}"></td></tr></table>'

def hline(color=TRACK):
    return f'<table {TABLE}><tr><td height="1" bgcolor="{color}"></td></tr></table>'

def track():
    """• - - - - ✈ - - - - •  (pontos e traços feitos de <td>)."""
    dashes = f'<table {TABLE}><tr>' + "".join(
        f'<td width="12.5%" height="1" bgcolor="{TRACK if i % 2 == 0 else CARD}"></td>' for i in range(8)
    ) + "</tr></table>"
    dot = f'<table border="0" cellspacing="0" cellpadding="0"><tr><td width="4" height="4" bgcolor="{LABEL}"></td></tr></table>'
    return (f'<table {TABLE}><tr>'
            f'<td width="4" valign="middle">{dot}</td><td width="8"></td>'
            f'<td valign="middle">{dashes}</td>'
            f'<td width="34" align="center" valign="middle">{text("&#9992;&#65038;", 4, LABEL)}</td>'
            f'<td valign="middle">{dashes}</td>'
            f'<td width="8"></td><td width="4" valign="middle">{dot}</td>'
            f'</tr></table>')

def pill(leg):
    """Pílula azul. Conteúdo numa única célula nowrap (espaços fixos + "|" colorido):
    células espaçadoras vazias eram comprimidas pelas linhas laterais de 50%."""
    sp = "&nbsp;&nbsp;"
    dur = when(f"voo_{leg}_duracao",
               v(f"voo_{leg}_duracao") + sp + f'<font color="{PILL_DIV}">|</font>' + sp)
    conn = ("{{#if activatedPerson.voo_" + leg + "_conexao_aeroporto}}"
            + "via " + v(f"voo_{leg}_conexao_aeroporto", triple=True)
            + "{{else}}Direto{{/if}}")
    mid = f'<td height="20" valign="middle" nowrap>{text(sp + sp + dur + conn + sp + sp, 3, WHITE)}</td>'
    return (f'<table border="0" cellspacing="0" cellpadding="0">'
            f'<tr><td>{corners(PILL, "t", R_PILL, CARD)}</td></tr>'
            f'<tr><td bgcolor="{PILL}"><table border="0" cellspacing="0" cellpadding="0"><tr>{mid}</tr></table></td></tr>'
            f'<tr><td>{corners(PILL, "b", R_PILL, CARD)}</td></tr>'
            f'</table>')

def widget(leg, direction, date_field):
    p = f"voo_{leg}"
    top = (f'<table {TABLE}><tr>'
           f'<td height="16" valign="bottom">{text("PARTIDA: " + v(f"horario_{leg}"), 1, LABEL)}</td>'
           f'<td valign="bottom" align="right">'
           + when(f"horario_{leg}_chegada", text("CHEGADA: " + v(f"horario_{leg}_chegada"), 1, LABEL))
           + '</td></tr></table>')
    codes = (f'<table {TABLE}><tr>'
             f'<td width="28%" height="40" valign="middle">{text(v(f"{p}_origem"), 6, WHITE, bold=True)}</td>'
             f'<td width="44%" valign="middle">{track()}</td>'
             f'<td width="28%" valign="middle" align="right">{text(v(f"{p}_destino"), 6, WHITE, bold=True)}</td>'
             f'</tr></table>')
    cities = (f'<table {TABLE}><tr>'
              f'<td height="16" valign="top">{when(f"{p}_origem_cidade", text(v(f"{p}_origem_cidade"), 1, LABEL))}</td>'
              f'<td valign="top" align="right">{when(f"{p}_destino_cidade", text(v(f"{p}_destino_cidade"), 1, LABEL))}</td>'
              f'</tr></table>')
    divider = (f'<table {TABLE}><tr>'
               f'<td width="50%" valign="middle">{hline()}</td>'
               f'<td valign="middle" nowrap>{pill(leg)}</td>'
               f'<td width="50%" valign="middle">{hline()}</td>'
               f'</tr></table>')
    sep = "&nbsp;&nbsp;&nbsp;"
    right = (text(v(f"horario_{leg}"), 3, WHITE) + sep + text(v(f"{p}_origem"), 3, WHITE)
             + when(f"{p}_terminal", sep + text(v(f"{p}_terminal"), 3, WHITE)))
    bottom = (f'<table {TABLE}><tr>'
              f'<td height="22" valign="middle">{when(date_field, text(v(date_field), 3, WHITE, bold=True))}</td>'
              f'<td valign="middle" align="right">{right}</td>'
              f'</tr></table>')
    inner = top + gap(6) + codes + cities + gap(18) + divider + gap(18) + bottom
    blocks = [corners(CARD, "t", R_CARD), band(inner, CARD, top=2, bottom=4), corners(CARD, "b", R_CARD)]
    body = "\n".join(f"<tr><td>{b}</td></tr>" for b in blocks)
    return (f"<!-- WIDGET DE VOO — {direction} -->\n"
            + when(f"{p}_origem", f"\n<table {TABLE}>\n{body}\n</table>\n<br>\n") + "\n")

HEAD = """<!--
WIDGET DE VOO — ENCONTRO INFIELD 2026 · TESTE (visual alternativo ao cartão de embarque)
GERADO por build_widget.py — edite o script, não este arquivo.
Markup legado (table/font/bgcolor): sem JS, <style>, <div>. bgcolor SEMPRE em <td>.
Campos novos opcionais: voo_<trecho>_origem_cidade, voo_<trecho>_destino_cidade,
voo_<trecho>_duracao, voo_<trecho>_terminal. Chegada: horario_<trecho>_chegada.
Pílula: "via <conexão>" ou "Direto" ({{#if}}…{{else}}…{{/if}}).
-->
"""

def build():
    html = HEAD + widget("ida", "IDA", "Data_ida") + widget("volta", "VOLTA", "Data_volta_")
    Path(__file__).with_name("widget-voo.html").write_text(html, encoding="utf-8")

if __name__ == "__main__":
    build()
