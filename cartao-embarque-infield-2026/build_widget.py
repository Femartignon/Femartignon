"""Gera widget-voo.html (IDA + VOLTA) — visual alternativo ao cartão de embarque.

Modelos escolhidos no catálogo de referência (T1…T10): T7 + T9, empilhados por trecho.
  T7 "Seu voo"  → cia, avião em glifo, chegada (horário + destino)
  T9 "Cartão"   → cia, voo, terminal, rota, data/hora, assento, conexão, localizador
Reaproveita as primitivas validadas no app em build.py (bgcolor só em <td>,
cantos de <td> de 1 px, alturas explícitas por causa do line-height do app).

Campos novos, todos opcionais:
  voo_<trecho>_terminal  → "✈ T2" no topo do T9 (vazio = some)
  voo_<trecho>_assento   → ASSENTO no T9 (vazio = "—")
Usa {{#if}}…{{else}}…{{/if}} (conexão "via X" / "Direto"; assento "—").

Uso: python3 build_widget.py  → sobrescreve widget-voo.html
"""
from pathlib import Path

from build import ASSETS, TABLE, band, corners, text, v, when

# ── Tokens ────────────────────────────────────────────────────────────────
DARK = "#1E2124"         # fundo dos widgets
PANEL = "#2C3136"        # painel interno (localizador)
LABEL = "#8E959C"        # rótulos
WHITE = "#FFFFFF"
GLYPH = "#DDE6EE"        # avião grande do T7
TEAL_BG = "#2E5E55"      # chip da data
TEAL = "#8FE3CB"
R = 20                   # raio dos widgets
R_PANEL = 10             # raio do painel interno
PLANE = "&#9992;&#65038;"

# ── Primitivas ────────────────────────────────────────────────────────────
def gap(h):
    return f'<table {TABLE}><tr><td height="{h}"></td></tr></table>'

def row(*cells):
    """Linha de tabela: cada célula = (html, attrs)."""
    return f'<table {TABLE}><tr>' + "".join(f'<td {a}>{h}</td>' for h, a in cells) + "</tr></table>"

def shell(inner, top=4, bottom=6):
    blocks = [corners(DARK, "t", R), band(inner, DARK, top=top, bottom=bottom), corners(DARK, "b", R)]
    return f'<table {TABLE}>' + "".join(f"<tr><td>{b}</td></tr>" for b in blocks) + "</table>"

def logo(leg, h):
    return (f'<img src="{ASSETS}logos/{v(f"voo_{leg}_cia")}.png" alt="{v(f"voo_{leg}_cia")}" '
            f'height="{h}" style="display:block;">')

def chip(t):
    return (f'<table border="0" cellspacing="0" cellpadding="0"><tr>'
            f'<td bgcolor="{TEAL_BG}" nowrap>{text("&nbsp;" + t + "&nbsp;", 2, TEAL, bold=True)}</td></tr></table>')

def lbl(t):
    return text(t, 1, LABEL)

def either(field, yes, no):
    return "{{#if activatedPerson." + field + "}}" + yes + "{{else}}" + no + "{{/if}}"

# ── Modelos ───────────────────────────────────────────────────────────────
def t7(leg):
    """Seu voo: cia + chegada (avião desenhado em glifo)."""
    p = f"voo_{leg}"
    inner = (row((text("Seu voo", 3, WHITE), 'height="24" valign="middle"'),
                 (logo(leg, 16), 'align="right" valign="middle"'))
             + row((text(PLANE, 7, GLYPH), 'align="center" height="76" valign="middle"'))
             + row((lbl("CHEGADA"), 'height="14" valign="bottom"'))
             + row((when(f"horario_{leg}_chegada", text(v(f"horario_{leg}_chegada"), 3, WHITE)), 'height="24" valign="top"'),
                   (text(v(f"{p}_destino"), 3, WHITE), 'align="right" valign="top"')))
    return shell(inner)

def t9(leg, date_field):
    """Cartão: cia, voo, terminal, rota, data/hora, assento, conexão, localizador."""
    p = f"voo_{leg}"
    head = row((logo(leg, 20), 'valign="middle"'),
               (text(v(f"{p}_partida", triple=True), 3, WHITE, bold=True), 'valign="middle" nowrap'),
               (when(f"{p}_terminal", text(PLANE + "&nbsp;" + v(f"{p}_terminal"), 3, WHITE)), 'align="center" valign="middle" nowrap'),
               (text(v(f"{p}_origem"), 3, WHITE) + "&nbsp;" + text(PLANE, 2, LABEL) + "&nbsp;" + text(v(f"{p}_destino"), 3, LABEL),
                'align="right" valign="middle" nowrap'))
    when_row = (f'<table border="0" cellspacing="0" cellpadding="0"><tr>'
                f'<td>{when(date_field, chip(v(date_field)))}</td><td width="10"></td>'
                f'<td nowrap>{text(v(f"horario_{leg}"), 4, WHITE)}</td></tr></table>')
    conn = either(f"{p}_conexao_aeroporto", "via " + v(f"{p}_conexao_aeroporto", triple=True), "Direto")
    seat = either(f"{p}_assento", v(f"{p}_assento"), "—")
    left = (lbl("PARTIDA") + gap(4) + when_row + gap(14)
            + row((lbl("ASSENTO") + "<br>" + text(seat, 3, WHITE), 'width="50%" valign="top"'),
                  (lbl("CONEXÃO") + "<br>" + text(conn, 3, WHITE), 'valign="top"')))
    pnr = (f'<table {TABLE}>'
           f'<tr><td>{corners(PANEL, "t", R_PANEL, DARK)}</td></tr>'
           f'<tr><td bgcolor="{PANEL}" align="center" height="76" valign="middle">'
           f'{lbl("LOCALIZADOR")}<br>{text(v(f"{p}_localizador"), 4, WHITE, bold=True)}</td></tr>'
           f'<tr><td>{corners(PANEL, "b", R_PANEL, DARK)}</td></tr></table>')
    inner = head + gap(16) + row((left, 'valign="top"'), ("", 'width="12"'), (pnr, 'width="38%" valign="middle"'))
    return shell(inner, top=8, bottom=10)

def widget(leg, direction, date_field):
    # Sem voo cadastrado (ex.: participante local) → os dois widgets do trecho somem.
    return (f"<!-- WIDGETS DE VOO — {direction} (T7 + T9) -->\n"
            + when(f"voo_{leg}_origem", f"\n{t7(leg)}\n<br>\n{t9(leg, date_field)}\n<br>\n") + "\n")

HEAD = """<!--
WIDGETS DE VOO — ENCONTRO INFIELD 2026 · T7 "Seu voo" + T9 "Cartão" (IDA + VOLTA)
GERADO por build_widget.py — edite o script, não este arquivo.
Markup legado (table/font/bgcolor/img): sem JS, <style>, <div>. bgcolor SEMPRE em <td>.
Campos novos opcionais: voo_<trecho>_terminal, voo_<trecho>_assento (vazio = "—").
Chegada: horario_<trecho>_chegada. Logo: voo_<trecho>_cia → logos/<IATA>.png.
Conexão: "via <aeroporto>" ou "Direto" ({{#if}}…{{else}}…{{/if}}).
Data_volta_ conserva o sublinhado final. Não substituir três chaves por duas.
-->
"""

def build():
    html = HEAD + widget("ida", "IDA", "Data_ida") + widget("volta", "VOLTA", "Data_volta_")
    Path(__file__).with_name("widget-voo.html").write_text(html, encoding="utf-8")

if __name__ == "__main__":
    build()
