"""Gera cartao-embarque-ida.html e cartao-embarque-volta.html a partir de um único template.

Restrição da plataforma: sem JS, sem <style>, sem <div>/flexbox. Só markup
legado (table/tr/td/font/bgcolor/img) + Handlebars. Um arquivo por trecho (cada um
vai numa aba do app), com o bloco "Antes de embarcar" ao final de ambos —
mas a fonte única de verdade é este script.

Layout "Meu Voo — versão A.2 (detalhe do voo)": bilhete creme de largura fluida (100%, como a
V6) com cabeçalho de marca (fita + logos Infield/Takeda), passageiro e o bloco "Detalhe do voo",
replicado pixel a pixel de um print de app de companhia aérea: zona cinza com o título "<cidade
origem> a <cidade destino>" e, dentro dela, um cartão branco com o número do voo, as colunas
Partida/Chegada (ícone, data, horário + código, cidade) com uma linha vertical e um avião num
círculo cinza ao centro, e Operado por/Duração. Localizador (vermelho), conexão condicional e
código de barras continuam como nas versões anteriores — só a parte de rota/voo foi refeita.
- Fonte: só <font>/<b> — sem peso "thin" de verdade (precisaria de fonte customizada, que o app
  não carrega). "Thin" no print = aqui, texto sem <b> numa cor mais clara (MUTED2); "bold" = <b>.
- Imagens de marca: hospedadas em BRAND (header-fita, logo-infield, logo-takeda-pilula).
- Ícones de decolagem/pouso/avião-conector e código de barras: PNG gerados aqui e embutidos como
  data URI (sem hospedagem).
- Cantos arredondados: linhas de <td> de 1 px (recuo na cor da página) — agora aninhados em dois
  níveis (zona cinza dentro do creme, cartão branco dentro da zona cinza); `corners()` ganhou o
  parâmetro `page` para isso.
- Cidade/operadora/duração são campos opcionais: sem cadastro, caem no código IATA ou somem.
- Chegada: horario_<trecho>_chegada sob o destino (vazio = mostra só o código, sem horário).

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
CREAM = "#F7F4EF"        # fundo do bilhete (fita, passageiro, localizador, conexão, rodapé)
INK = "#1E2A38"          # texto sobre o creme
ACCENT = "#E1242A"       # vermelho Takeda: picote, localizador, rótulo do trecho
MUTED = "#7A8591"        # rótulos sobre o creme
HAIR = "#E4DDD2"         # filete divisório sobre o creme
WHITE = "#FFFFFF"
G = 20                   # gutter lateral (px)
R = 12                   # raio dos cantos (px), desenhado com <td> de 1 px
PAGE = "#FFFFFF"         # fundo da página do app (cor fora da curva do cartão)
LOGO_H = 28              # altura dos logos de marca no cabeçalho

# Bloco "Detalhe do voo": paleta própria, calcada em amostras de cor do print de referência
# (zona cinza, cartão branco, título e horários em navy, o resto em cinza-grafite).
ZONE_BG = "#F2F2F2"      # zona cinza em torno do título e do cartão branco
CARD_BG = "#FFFFFF"      # cartão branco com o selo do voo, partida/chegada e operado por
LINE2 = "#E7E7EA"        # filetes divisórios dentro do cartão branco
NAVY = "#191048"         # título (cidades) e horários — únicos elementos em navy no print
INK2 = "#2B2B2B"         # texto cinza-grafite: selo do voo, cidade, operado por/duração
MUTED2 = "#6E6E6E"       # texto mais claro: código do aeroporto, data, "a", rótulos

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

def hair(color=HAIR):
    return f'<table {TABLE}><tr><td height="1" bgcolor="{color}"></td></tr></table>'

def label(t, color=MUTED):
    return text(t, 1, color, bold=True)

# ── Ícones (PNG embutidos como data URI) ──────────────────────────────────
def data_uri(im):
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

def rgba(hex_color):
    return tuple(int(hex_color[i:i + 2], 16) for i in (1, 3, 5)) + (255,)

def takeoff_png(s=96):
    """Seta fina de decolagem (↗) com o traço do solo — ícone do rótulo PARTIDA."""
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d, w, fill = ImageDraw.Draw(im), max(2, round(s / 16)), rgba(MUTED2)
    x0, y0, x1, y1 = s * .22, s * .72, s * .82, s * .22
    d.line([(x0, y0), (x1, y1)], fill=fill, width=w)
    ang, ah = math.atan2(y1 - y0, x1 - x0), s * .16
    for da in (150, -150):
        a = ang + math.radians(da)
        d.line([(x1 + ah * math.cos(a), y1 + ah * math.sin(a)), (x1, y1)], fill=fill, width=w)
    d.line([(s * .16, s * .86), (s * .5, s * .86)], fill=fill, width=w)   # traço do solo
    return data_uri(im)

def landing_png(s=96):
    """Seta fina de pouso (↘) com o traço do solo — ícone do rótulo CHEGADA."""
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d, w, fill = ImageDraw.Draw(im), max(2, round(s / 16)), rgba(MUTED2)
    x0, y0, x1, y1 = s * .18, s * .28, s * .78, s * .78
    d.line([(x0, y0), (x1, y1)], fill=fill, width=w)
    ang, ah = math.atan2(y1 - y0, x1 - x0), s * .16
    for da in (150, -150):
        a = ang + math.radians(da)
        d.line([(x1 + ah * math.cos(a), y1 + ah * math.sin(a)), (x1, y1)], fill=fill, width=w)
    d.line([(s * .5, s * .86), (s * .84, s * .86)], fill=fill, width=w)   # traço do solo
    return data_uri(im)

def connector_png(s=72):
    """Selo cinza com avião ao centro — divisor entre as colunas Partida e Chegada."""
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([0, 0, s - 1, s - 1], fill=(237, 237, 239, 255))
    k, c, fill = s / 28, s / 2, (140, 140, 146, 255)
    p = lambda pts: [(c + a * k, c + b * k) for a, b in pts]
    for shape in ([(-9, -1.2), (7, -1.2), (10, 0), (7, 1.2), (-9, 1.2)],       # fuselagem
                  [(-.5, -1.2), (-4.5, -7.5), (-2.5, -7.5), (3, -1.2)],        # asa sup.
                  [(-.5, 1.2), (-4.5, 7.5), (-2.5, 7.5), (3, 1.2)],            # asa inf.
                  [(-9, -1.2), (-10.5, -4.5), (-9, -4.5), (-6, -1.2)],         # cauda sup.
                  [(-9, 1.2), (-10.5, 4.5), (-9, 4.5), (-6, 1.2)]):            # cauda inf.
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

TAKEOFF = takeoff_png()
LANDING = landing_png()
CONNECTOR = connector_png()
BARCODE = barcode_png()

# ── Blocos ────────────────────────────────────────────────────────────────
def corners(bg, pos, r=R, page=PAGE):
    """Cantos arredondados desenhados só com <td> de 1 px (sem imagem).
    Imagens de canto deixavam uma faixa reta no app (o app interfere no layout de <img>);
    células com bgcolor e altura explícita são o que já provamos que ele respeita.
    Cada linha é uma tabela própria: recuo lateral na cor da página + miolo na cor do card.
    `page` é a cor por trás do canto — o creme do cartão, mas também a zona cinza do bloco
    'Detalhe do voo' ao aninhar o cartão branco dentro dela."""
    rows = []
    for y in range(r):
        dy = r - y - 0.5                                   # distância ao centro do arco
        inset = round(r - math.sqrt(max(r * r - dy * dy, 0)))
        side = f'<td width="{inset}" height="1" bgcolor="{page}"></td>' if inset else ""
        rows.append(f'<table {TABLE}><tr>{side}<td height="1" bgcolor="{bg}"></td>{side}</tr></table>')
    return "".join(rows if pos == "t" else rows[::-1])

def header():
    """Fita de marca (780×192, largura 100% da coluna) e, logo abaixo, Infield à esquerda / Takeda à direita.
    Sem CSS não há sobreposição de imagens: os logos ficam numa linha própria."""
    fita = (f'<img src="{BRAND}header-fita-780x192.png" alt="Encontro Infield 2026" '
            f'width="100%" style="display:block;">')
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

def either(field, yes_html, no_html):
    return "{{#if activatedPerson." + field + "}}" + yes_html + "{{else}}" + no_html + "{{/if}}"

def cell(name, value, color=INK, size=3, label_color=MUTED):
    return (f'<table {TABLE}><tr><td height="16" valign="bottom">{label(name, label_color)}</td></tr>'
            f'<tr><td height="28" valign="middle">{text(value, size, color, bold=True)}</td></tr></table>')

def vline(h):
    """Segmento de linha vertical de 1 px, centrado na coluna — divisória entre Partida e Chegada."""
    return f'<table {TABLE}><tr><td></td><td width="1" height="{h}" bgcolor="{LINE2}"></td><td></td></tr></table>'

def icon_label(icon, t):
    return (f'<table border="0" cellspacing="0" cellpadding="0"><tr>'
            f'<td valign="middle"><img src="{icon}" alt="" width="14" height="14" style="display:block;"></td>'
            f'<td width="4"></td><td valign="middle">{label(t, MUTED2)}</td>'
            f'</tr></table>')

def flight_detail(leg, date_field):
    """Bloco 'Detalhe do voo': zona cinza com o título (cidades) e, dentro dela, o cartão branco
    com o selo do voo, as colunas Partida/Chegada — linha vertical + avião ao centro, igual ao
    print de referência — e Operado por/Duração. Só INK2 (cinza-grafite) e NAVY (título e
    horários) aparecem aqui; nunca o vermelho do resto do cartão, para seguir o print à risca."""
    p = f"voo_{leg}"

    # Título — cai no código IATA sem a cidade cadastrada (campo opcional).
    origem = either(f"{p}_origem_cidade", v(f"{p}_origem_cidade"), v(f"{p}_origem"))
    destino = either(f"{p}_destino_cidade", v(f"{p}_destino_cidade"), v(f"{p}_destino"))
    titulo = text(origem, 5, NAVY, bold=True) + text(" a ", 5, MUTED2) + text(destino, 5, NAVY, bold=True)
    titulo_row = band(f'<table {TABLE}><tr><td height="34" valign="middle">{titulo}</td></tr></table>',
                       ZONE_BG, top=18, bottom=16)

    # Selo do voo — número puro, sem fundo, como no print (o antigo selo com bgcolor saiu daqui).
    flight_no = band(text(v(f"{p}_partida", triple=True), 3, INK2, bold=True), CARD_BG, top=20, bottom=16)

    # Colunas Partida/Chegada, linha a linha: rótulo+ícone, data, horário+código, cidade —
    # com a linha vertical (e o avião ao centro, na linha do horário) entre as duas.
    chegada_hora = either(f"horario_{leg}_chegada",
                          text(v(f"horario_{leg}_chegada"), 5, NAVY, bold=True) + "&nbsp;&nbsp;" + text(v(f"{p}_destino"), 4, MUTED2),
                          text(v(f"{p}_destino"), 5, NAVY, bold=True))
    rows = (
        f'<tr><td width="40%" height="20" valign="bottom">{icon_label(TAKEOFF, "Partida")}</td>'
        f'<td width="20%" valign="bottom">{vline(20)}</td>'
        f'<td width="40%" height="20" valign="bottom" align="right">{icon_label(LANDING, "Chegada")}</td></tr>'
        f'<tr><td height="18" valign="top">{text(v(date_field), 1, MUTED2)}</td>'
        f'<td>{vline(18)}</td>'
        f'<td height="18" valign="top" align="right">{text(v(date_field), 1, MUTED2)}</td></tr>'
        f'<tr><td height="6"></td><td>{vline(6)}</td><td></td></tr>'
        f'<tr><td height="34" valign="middle">{text(v(f"horario_{leg}"), 5, NAVY, bold=True)}&nbsp;&nbsp;{text(v(f"{p}_origem"), 4, MUTED2)}</td>'
        f'<td align="center" valign="middle"><img src="{CONNECTOR}" alt="" width="40" height="40" style="display:block;"></td>'
        f'<td height="34" valign="middle" align="right">{chegada_hora}</td></tr>'
        f'<tr><td height="20" valign="top">{when(f"{p}_origem_cidade", text(v(f"{p}_origem_cidade"), 2, INK2))}</td>'
        f'<td>{vline(20)}</td>'
        f'<td height="20" valign="top" align="right">{when(f"{p}_destino_cidade", text(v(f"{p}_destino_cidade"), 2, INK2))}</td></tr>'
    )
    detail_band = band(f'<table {TABLE}>{rows}</table>', CARD_BG)

    # Operado por/Duração (opcionais) — sem operadora, fecha com o mesmo respiro, sem a linha.
    pair = (f'<table {TABLE}><tr>'
           f'<td width="60%" valign="top">{cell("OPERADO POR", v(f"{p}_operadora", triple=True), INK2, label_color=MUTED2)}</td>'
           f'<td width="40%" valign="top">{cell("DURAÇÃO", v(f"{p}_duracao"), INK2, label_color=MUTED2)}</td>'
           f'</tr></table>')
    # band() aqui repõe o gutter G que pair() não tem sozinho — sem ele "Operado por" ficava
    # colado na borda do cartão branco, 20 px mais à esquerda que "LA 3050"/"Partida" acima.
    # O respiro final precisa de bgcolor explícito: sem ele, herdava o cinza da zona por trás
    # (gap() não pinta nada) e os cantos arredondados do cartão pareciam flutuar, separados.
    card_gap = lambda h: f'<table {TABLE}><tr><td height="{h}" bgcolor="{CARD_BG}"></td></tr></table>'
    trailing = either(f"{p}_operadora", hair(LINE2) + band(gap(14) + pair, CARD_BG, bottom=18), card_gap(18))

    white_card = "".join(f"<tr><td>{b}</td></tr>" for b in [
        corners(CARD_BG, "t", page=ZONE_BG), flight_no, hair(LINE2), detail_band, trailing,
        corners(CARD_BG, "b", page=ZONE_BG),
    ])
    zone = "".join(f"<tr><td>{b}</td></tr>" for b in [
        corners(ZONE_BG, "t", page=CREAM), titulo_row,
        band(f'<table {TABLE}>{white_card}</table>', ZONE_BG, bottom=18),
        corners(ZONE_BG, "b", page=CREAM),
        f'<table {TABLE}><tr><td height="16" bgcolor="{CREAM}"></td></tr></table>',
    ])
    return f'<table {TABLE}>{zone}</table>'

def locator(leg):
    inner = hair() + gap(14) + cell("LOCALIZADOR", v(f"voo_{leg}_localizador"), ACCENT, 4)
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
    bars = f'<img src="{BARCODE}" alt="" width="100%" height="40" style="display:block;">'
    note = text("Documento de apoio · no embarque, use o cartão da cia aérea.", 1, MUTED)
    return band(f'<table {TABLE}><tr>{perf}</tr></table>' + gap(18) + bars + gap(10)
                + f'<table {TABLE}><tr><td align="center">{note}</td></tr></table>', CREAM, bottom=10)

def card(leg, direction, date_field):
    blocks = [
        corners(CREAM, "t"),
        header(),
        passenger(direction),
        flight_detail(leg, date_field),
        locator(leg),
        connection(leg),
        footer(),
        corners(CREAM, "b"),
    ]
    body = "\n".join(f"<tr><td>{b}</td></tr>" for b in blocks)
    # Sem voo cadastrado (ex.: participante local) → o cartão inteiro some.
    return (f"<!-- CARTAO DE EMBARQUE — {direction} -->\n"
            + when(f"voo_{leg}_origem",
                   f'\n<table {TABLE}>\n'
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
CARTÃO DE EMBARQUE — {direction} — ENCONTRO INFIELD 2026 · MEU VOO — VERSÃO A.2 (DETALHE DO VOO)
GERADO por build.py — edite o script, não este arquivo.
Cole todo este fragmento no editor HTML da plataforma.
Markup legado apenas (table/tr/td/font/bgcolor/img): sem JS, <style>, <div> ou flexbox.
bgcolor SEMPRE em <td>: o app descarta bgcolor em <table>.
Imagens de marca em https://cartao-embarque-infield-2026.netlify.app/ (header-fita-780x192.png,
logo-infield.png, logo-takeda-pilula.png). Avião e código de barras embutidos (data URI).
Campos novos e opcionais: voo_{leg}_origem_cidade, voo_{leg}_destino_cidade (sem eles, usa o
código IATA), voo_{leg}_operadora (sem ela, a linha Operado por/Duração some) e voo_{leg}_duracao.
Conexão oculta quando voo_{leg}_conexao_aeroporto está vazio; cartão inteiro oculto sem voo_{leg}_origem.
Chegada: horario_{leg}_chegada (vazio = mostra só o código do destino, sem horário).
Bloco "Antes de embarcar" ao final. Data_volta_ conserva o sublinhado final.
Não substituir três chaves por duas. Campos entre três chaves (Cia+Nº, operadora, conexões)
aceitam HTML/entidades sem escapar; os demais usam duas.
-->
"""

LEGS = [("ida", "IDA", "Data_ida"), ("volta", "VOLTA", "Data_volta_")]

def build():
    for leg, direction, date_field in LEGS:
        html = HEAD.format(direction=direction, leg=leg) + card(leg, direction, date_field) + guide()
        Path(__file__).with_name(f"cartao-embarque-{leg}.html").write_text(html, encoding="utf-8")

if __name__ == "__main__":
    build()
