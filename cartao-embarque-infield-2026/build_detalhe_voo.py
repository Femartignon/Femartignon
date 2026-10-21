"""Gera detalhe-voo.html — réplica da tela "Detalhe do voo" (LATAM) para teste no app SpotMe.

Mesmas restrições do build.py: sem JS, <style>, <div>, SVG. Só table/tr/td/font/bgcolor/img.
Reaproveita as primitivas de build.py (text, band, gap, hair, corners, data_uri, TABLE).
Ícones: PNG gerados aqui (Pillow) e embutidos como data URI. Dados fixos em VOO.

Uso: python3 build_detalhe_voo.py  → grava detalhe-voo.html
"""
from pathlib import Path

from PIL import Image, ImageDraw

import build as b

# ── Tokens (amostrados da tela de referência) ─────────────────────────────
BRAND = "#1B0088"      # título
NAVY = "#10064F"       # horários e rota
INK = "#282828"        # textos
MUTED = "#525252"      # códigos IATA e rótulos
LINE = "#E2E2E2"       # filetes
BG = "#F2F2F2"         # fundo da tela
CHIP = "#ECECF2"       # círculo do avião central
ICON = "#333333"

# Só texto muda de um voo para outro.
VOO = {
    "origem": ("São Paulo", "CGH", "11:05", "Ter. 13 out. 2026"),
    "destino": ("Belo Horizonte", "CNF", "12:20", "Ter. 13 out. 2026"),
    "numero": "LA3050",
    "operadora": "LATAM Airlines Brasil",
    "duracao": "1h 15m",
}

b.PAGE = BG  # cor fora da curva dos cantos (corners() lê este global)
TABLE = b.TABLE
SS = 4       # supersampling dos ícones (anti-aliasing)

# ── Ícones ────────────────────────────────────────────────────────────────
def canvas(s):
    im = Image.new("RGBA", (s * SS, s * SS), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)

def done(im, s):
    return b.data_uri(im.resize((s, s), Image.LANCZOS))

PLANE_SHAPES = [
    [(-11, -1.6), (9, -1.6), (12.5, 0), (9, 1.6), (-11, 1.6)],   # fuselagem
    [(-1, -1.6), (-6, -10), (-3, -10), (4.5, -1.6)],             # asa sup.
    [(-1, 1.6), (-6, 10), (-3, 10), (4.5, 1.6)],                 # asa inf.
    [(-11, -1.6), (-13, -6), (-11, -6), (-7.5, -1.6)],           # cauda
    [(-11, 1.6), (-13, 6), (-11, 6), (-7.5, 1.6)],               # cauda inf.
]

def plane(s, color, angle=0, scale=0.9, dy=0, outline=False):
    """Avião apontando à direita; angle > 0 inclina a proa para cima."""
    big = s * SS
    im = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d, k, c = ImageDraw.Draw(im), big / 28 * scale, big / 2
    rgba = b.rgba(color)
    for shape in PLANE_SHAPES:
        pts = [(c + x * k, c + y * k) for x, y in shape]
        if outline:
            d.line(pts + [pts[0]], fill=rgba, width=max(2, int(big / 16)), joint="curve")
        else:
            d.polygon(pts, fill=rgba)
    im = im.rotate(angle, resample=Image.BICUBIC)
    if dy:
        im = im.transform(im.size, Image.AFFINE, (1, 0, 0, 0, 1, -dy * SS))
    return im

def icon_flight(kind, s=40):
    """Decolagem (proa p/ cima) e pouso (proa p/ baixo), com a linha de solo."""
    angle = 22 if kind == "takeoff" else -22
    im = plane(s, ICON, angle, 0.85, dy=-3 if kind == "takeoff" else -3, outline=True)
    d = ImageDraw.Draw(im)
    y = int(s * SS * 0.86)
    d.line([(int(s * SS * 0.12), y), (int(s * SS * 0.88), y)], fill=b.rgba(ICON), width=int(SS * 1.6))
    return done(im, s)

def icon_badge(s=60):
    """Círculo cinza-claro com avião ao centro (separador entre partida e chegada)."""
    im, d = canvas(s)
    d.ellipse([0, 0, s * SS - 1, s * SS - 1], fill=b.rgba(CHIP))
    glyph = plane(s, "#9A9AA8", 0, 0.62, outline=True)
    im.alpha_composite(glyph)
    return done(im, s)

def icon_close(s=44):
    im, d = canvas(s)
    m, w = int(s * SS * 0.22), int(SS * 3.4)
    for a, z in (((m, m), (s * SS - m, s * SS - m)), ((s * SS - m, m), (m, s * SS - m))):
        d.line([a, z], fill=b.rgba("#777777"), width=w)
        for x, y in (a, z):
            d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=b.rgba("#777777"))
    return done(im, s)

def icon_logo(w=28, h=36):
    """Marca LATAM aproximada: três faixas oblíquas (vermelha + duas índigo)."""
    im = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    bands = [("#E5174D", [(2, 3), (26, 3), (22, 11), (0, 11)]),
             (BRAND, [(3, 14), (25, 14), (21, 22), (1, 22)]),
             (BRAND, [(8, 25), (20, 25), (17, 33), (6, 33)])]
    for color, pts in bands:
        d.polygon([(x * SS, y * SS) for x, y in pts], fill=b.rgba(color))
    return b.data_uri(im.resize((w, h), Image.LANCZOS))

def img(src, w, h):
    return f'<img src="{src}" alt="" width="{w}" height="{h}" style="display:block;">'

# ── Blocos ────────────────────────────────────────────────────────────────
def t(txt, size, color=INK, bold=False):
    return b.text(txt, size, color, bold)

def row(h, inner, align="left", valign="middle"):
    return f'<tr><td height="{h}" align="{align}" valign="{valign}">{inner}</td></tr>'

def hair():
    return f'<table {TABLE}><tr><td height="1" bgcolor="{LINE}"></td></tr></table>'

def header():
    inner = (f'<table {TABLE}><tr>'
             f'<td height="56" valign="middle">{t("Detalhe do voo", 5, BRAND)}</td>'
             f'<td width="40" align="right" valign="middle">{img(icon_close(), 22, 22)}</td>'
             f'</tr></table>')
    return b.band(inner, b.WHITE, top=6, bottom=2)

def route_title():
    o, d = VOO["origem"][0], VOO["destino"][0]
    inner = (f'<table {TABLE}><tr><td height="30" align="center" valign="middle">'
             f'{t(o, 3, NAVY, True)}{t(" a ", 3, NAVY)}{t(d, 3, NAVY, True)}'
             f'</td></tr></table>')
    return b.band(inner, BG, top=18, bottom=14)

def leg_cell(kind, label, data):
    cidade, iata, hora, dia = data
    ico = img(icon_flight(kind), 20, 20)
    head = (f'<table {TABLE}><tr><td width="28" height="22" valign="middle">{ico}</td>'
            f'<td valign="middle">{t(label, 2, MUTED)}</td></tr></table>')
    return (f'<table {TABLE}>'
            + row(22, head)
            + row(20, t(dia, 2, MUTED))
            + row(8, "")
            + row(36, t(hora, 5, NAVY, True) + t(" " + iata, 4, MUTED))
            + row(24, t(cidade, 3, MUTED), valign="top")
            + '</table>')

def divider():
    """Filete vertical com o avião central (sem sobreposição: filete / círculo / filete)."""
    seg = lambda h: (f'<table {TABLE}><tr><td width="16" height="{h}"></td><td width="1" bgcolor="{LINE}"></td>'
                     f'<td></td></tr></table>')
    return seg(36) + img(icon_badge(), 30, 30) + seg(36)

def legs():
    left = leg_cell("takeoff", "Partida", VOO["origem"])
    right = leg_cell("landing", "Chegada", VOO["destino"])
    inner = (f'<table {TABLE}><tr>'
             f'<td valign="middle">{left}</td>'
             f'<td width="34" align="center" valign="middle">{divider()}</td>'
             f'<td valign="middle">{right}</td></tr></table>')
    return b.band(inner, b.WHITE, top=18, bottom=18)

def flight_no():
    inner = f'<table {TABLE}><tr><td height="42" valign="middle">{t(VOO["numero"], 3, INK, True)}</td></tr></table>'
    return b.band(inner, b.WHITE)

def meta():
    k = lambda txt: f'<tr><td height="22" valign="bottom">{t(txt, 2, MUTED)}</td></tr>'
    op = (f'<table {TABLE}>{k("Operado por")}<tr><td height="36" valign="middle">'
          f'<table {TABLE}><tr><td width="26" valign="middle">{img(icon_logo(), 14, 18)}</td>'
          f'<td valign="middle">{t(VOO["operadora"], 2, MUTED)}</td></tr></table></td></tr></table>')
    du = f'<table {TABLE}>{k("Duração")}<tr><td height="36" valign="middle">{t(VOO["duracao"], 2, MUTED)}</td></tr></table>'
    inner = f'<table {TABLE}><tr><td width="62%" valign="top">{op}</td><td width="12"></td><td valign="top">{du}</td></tr></table>'
    return b.band(inner, b.WHITE, top=10, bottom=14)

def build():
    card = "\n".join(f"<tr><td>{x}</td></tr>" for x in [
        b.corners(b.WHITE, "t"), flight_no(), hair(), legs(), hair(), meta(), b.corners(b.WHITE, "b"),
    ])
    card = f'<table {TABLE}>\n{card}\n</table>'
    page = "\n".join(f"<tr><td>{x}</td></tr>" for x in [
        header(), route_title(),
        f'<table {TABLE}><tr><td width="16" bgcolor="{BG}"></td><td>{card}</td><td width="16" bgcolor="{BG}"></td></tr></table>',
        f'<table {TABLE}><tr><td height="24" bgcolor="{BG}"></td></tr></table>',
    ])
    head = ("<!--\nDETALHE DO VOO — réplica LATAM para teste no app SpotMe. GERADO por build_detalhe_voo.py.\n"
            "Markup legado apenas (table/tr/td/font/bgcolor/img). bgcolor SEMPRE em <td>. Ícones embutidos (data URI).\n-->\n")
    Path(__file__).with_name("detalhe-voo.html").write_text(head + f"<table {TABLE}>\n{page}\n</table>\n", encoding="utf-8")

if __name__ == "__main__":
    build()
