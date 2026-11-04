#!/usr/bin/env python3
"""Encontro Infield 2026 · Meu Voo · v0.4.1 · gera a página e o botão do SpotMe.

Saídas: publicar/index.html (cópia de dist/meu-voo.html, o que o Vercel publica) e a pasta dist/, ao lado de fonte/:
  meu-voo.html               página autocontida (estilo, código, dados, ícones, fonte e imagens embutidos)
  meu-voo-spotme-botao.html  HTML para colar no editor da página nativa Meu Voo (abre a página personalizada)
  link-spotme.txt            link com as merge tags, para um item de menu do SpotMe

Base visual e de código: fonte/base/ = folha de estilo, script de tema, sprite, dados e módulo das páginas
v0.3.1 em produção, extraídos sem alteração (os hashes conferem com a CSP publicada). O Meu Voo entra como
acréscimo (fonte/src/) e o módulo compartilhado recebe a seção nova e ajustes pontuais com assert: se a base
mudar, o build para em vez de gerar algo quebrado. Sem dependências.

Uso: python3 fonte/build.py
"""
import base64
import hashlib
import html
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = ROOT / "base"
SRC = ROOT / "src"
DIST = ROOT.parent / "dist"
PUBLICAR = ROOT.parent / "publicar"  # Output Directory do projeto Vercel: só a página vai para a hospedagem
VERSION = "0.4.1"


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def sha(s: str) -> str:
    return "sha256-" + base64.b64encode(hashlib.sha256(s.encode("utf-8")).digest()).decode()


def patch(s: str, old: str, new: str) -> str:
    n = s.count(old)
    if n != 1:
        sys.exit(f"build: ajuste não aplicado (âncora encontrada {n}x): {old[:80]!r}")
    return s.replace(old, new)


def data_uri(p: Path) -> str:
    mime = {"webp": "image/webp", "png": "image/png", "jpg": "image/jpeg"}[p.suffix[1:]]
    return f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()


def spotme_params(fields) -> str:
    return "&".join(f"{k}={{{{activatedPerson.{f}}}}}" for k, f, _ in fields)


# ---------------------------------------------------------------- botão para a página nativa do SpotMe
# Só o markup validado no app (cartao-embarque-infield-2026/CLAUDE.md): table/td/font/b/a, bgcolor sempre
# no <td> (no <table> o app descarta), border-radius em <td>, merge tag no href, {{#if}}/{{else}} aninhados.
# Nada de {{#unless}}, <div>, <style>, JS ou SVG: derrubam ou somem no app.

PAPER = "#F5F2F0"      # papel do KV (Fio Condutor)
INK = "#35373E"        # grafite
RED = "#E1242A"        # vermelho Takeda
MUTED = "#55575F"      # rótulos (contraste AA sobre o papel)
PAGE_BG = "#FFFFFF"    # fundo da página do app, fora da curva do cartão
FONT = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
TABLE = 'role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"'
G = 20                 # respiro lateral
R = 16                 # raio dos cantos, desenhado com <td> de 1 px


def text(t, size, color, bold=False):
    return f'<font face="{FONT}" size="{size}" color="{color}">' + (f"<b>{t}</b>" if bold else t) + "</font>"


def mt(field, triple=False):
    """Merge tag; triple = sem escapar (como no cartão nativo, para campos que podem trazer entidades, ex. LA&nbsp;3910)."""
    return ("{{{" if triple else "{{") + "activatedPerson." + field + ("}}}" if triple else "}}")


def when(field, inner):
    return "{{#if activatedPerson." + field + "}}" + inner + "{{/if}}"


def either(field, yes, no):
    return "{{#if activatedPerson." + field + "}}" + yes + "{{else}}" + no + "{{/if}}"


def gap(hgt):
    return f'<table {TABLE}><tr><td height="{hgt}" bgcolor="{PAPER}"></td></tr></table>'


def band(inner, top=0, bottom=0):
    b = f'bgcolor="{PAPER}"'
    rows = [f'<tr><td colspan="3" height="{top}" {b}></td></tr>'] if top else []
    rows.append(f'<tr><td width="{G}" {b}></td><td {b}>{inner}</td><td width="{G}" {b}></td></tr>')
    if bottom:
        rows.append(f'<tr><td colspan="3" height="{bottom}" {b}></td></tr>')
    return f'<table {TABLE}>' + "".join(rows) + "</table>"


def corners(pos):
    rows = []
    for y in range(R):
        dy = R - y - 0.5
        inset = round(R - math.sqrt(max(R * R - dy * dy, 0)))
        side = f'<td width="{inset}" height="1" bgcolor="{PAGE_BG}"></td>' if inset else ""
        rows.append(f'<table {TABLE}><tr>{side}<td height="1" bgcolor="{PAPER}"></td>{side}</tr></table>')
    return "".join(rows if pos == "t" else rows[::-1])


def snippet(link: str) -> str:
    leg = lambda k, date_field: (
        text(f"{'Ida' if k == 'ida' else 'Volta'} · {mt(date_field)} · {mt(f'horario_{k}')}"
             + when(f"voo_{k}_partida", f" · {mt(f'voo_{k}_partida', triple=True)}"), 2, MUTED))
    route = text(f"{mt('voo_ida_origem')} &#8594; {mt('voo_ida_destino')}", 6, INK, bold=True)
    flights = either("voo_ida_origem",
                     route + gap(6) + leg("ida", "Data_ida") + when("voo_volta_origem", gap(2) + leg("volta", "Data_volta_")),
                     either("voo_volta_origem",
                            text(f"{mt('voo_volta_origem')} &#8594; {mt('voo_volta_destino')}", 6, INK, bold=True) + gap(6) + leg("volta", "Data_volta_"),
                            text("Seus voos aparecem aqui quando a agência emitir a passagem.", 3, INK)))
    button = (f'<table {TABLE}><tr><td height="52" align="center" valign="middle" bgcolor="{RED}" style="border-radius:26px">'
              f'<a href="{html.escape(link, quote=True)}" style="color:#FFFFFF;text-decoration:none">{text("Abrir meu voo completo &#8594;", 3, "#FFFFFF", bold=True)}</a>'
              f"</td></tr></table>")
    inner = (text("MEU VOO · ENCONTRO INFIELD 2026", 1, RED, bold=True) + gap(10) + flights + gap(18) + button + gap(10)
             + f'<table {TABLE}><tr><td align="center" bgcolor="{PAPER}">'
             + text("Cartão do trecho, check-in, jornada e chegada ao Rio.", 1, MUTED) + "</td></tr></table>")
    body = "\n".join(f"<tr><td>{b}</td></tr>" for b in (corners("t"), band(inner, top=8, bottom=8), corners("b")))
    head = f"""<!--
MEU VOO · BOTÃO PARA A PÁGINA COMPLETA · ENCONTRO INFIELD 2026 · v{VERSION}
Gerado por fonte/build.py: edite o script, não este arquivo.
Cole este fragmento no editor HTML da página nativa Meu Voo (ou ao fim dos cartões de embarque Ida/Volta).
O SpotMe troca as merge tags do link pelos dados de quem toca; a página lê o fragmento (#) no aparelho.
Markup validado no app: table/td/font/b/a, bgcolor só em <td>, condicionais if/else. Sem unless.
Não escreva chaves duplas neste comentário: o app interpreta o template inteiro, comentários inclusive.
Data_volta_ conserva o sublinhado final, como no Backstage.
-->
"""
    return head + f"<table {TABLE}>\n{body}\n</table>\n"


# ---------------------------------------------------------------- página

def build(previa: bool = False) -> None:
    DIST.mkdir(exist_ok=True)
    voo = json.loads(read(SRC / "voo.json"))
    if previa:
        voo["preview"] = {"persona": "direto"}
    params = spotme_params(voo["fields"])
    link = f"{voo['baseUrl']}#{params}"
    snip = snippet(link)

    # dados: base v0.3.1 + Meu Voo
    data = json.loads(read(BASE / "data.json"))
    data["meta"]["version"] = VERSION
    data["meta"]["label"] = "Meu Voo · página autocontida"
    data["meta"]["built"] = "2026-11-04"
    for fid, f in voo["facts"].items():
        data["facts"][fid] = f["status"]
    data["pending"].update(voo["pending"])
    data["pages"] = [p for p in data["pages"] if p["id"] != "meu-voo"] + [{
        "id": "meu-voo", "file": "meu-voo.html", "menu": "Meu Voo", "title": [["Meu", "k"], ["Voo", "r"]],
        "lead": voo["texts"]["lead"],
        "description": "Seus voos do Encontro Infield 2026: cartão de cada trecho, check-in, jornada e chegada ao Rio.",
        "sections": [["ida", "Ida"], ["volta", "Volta"], ["jornada", "Jornada"], ["chegada", "Chegada"], ["antes", "Antes de voar"], ["ajuda", "Ajuda"]],
    }]
    data["voo"] = {**voo, "params": params, "snippet": snip}
    data_json = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    # módulo compartilhado + seção do Meu Voo
    app = read(BASE / "app.js")
    app = patch(app, "/* Encontro Infield 2026 · páginas autocontidas · v0.3.1\n   ES module sem dependências, o mesmo nas 6 páginas (body[data-page] escolhe o que montar).",
                f"/* Encontro Infield 2026 · páginas autocontidas · v{VERSION} (v0.3.1 + Meu Voo)\n   ES module sem dependências, o mesmo em todas as páginas (body[data-page] escolhe o que montar).")
    marker = "/* ================================================================ páginas e relógio */"
    app = patch(app, marker, read(SRC / "meu-voo.js") + marker)
    app = patch(app, "const PAGES = {\n", "const PAGES = {\n  'meu-voo': () => renderVoo(),\n")
    app = patch(app, "const PAGE_ONCE = {\n", "const PAGE_ONCE = {\n  'meu-voo': () => initVoo(),\n")
    app = patch(app, "const NEEDS_CLOCK = new Set(['informacoes-gerais', 'avaliacao']);", "const NEEDS_CLOCK = new Set(['informacoes-gerais', 'avaliacao', 'meu-voo']);")
    app = patch(app, "function refreshLive(now) {\n", "function refreshLive(now) {\n  if (PAGE === 'meu-voo') { refreshVoo(now); return; }\n")
    app = patch(app, "  if (!NEEDS_CLOCK.has(PAGE)) return;\n  const now = clock.now();\n",
                "  if (!NEEDS_CLOCK.has(PAGE)) return;\n  const now = clock.now();\n  if (PAGE === 'meu-voo') vooSecond(now);\n")
    app = patch(app, "function fillQA(sheet) {\n", "function fillQA(sheet) {\n  if (PAGE === 'meu-voo') { fillQAVoo(sheet); return; }\n")
    app = patch(app, "'TRIGGER:-PT30M'", "`TRIGGER:${t.alarm ?? '-PT30M'}`")
    app = patch(app, "'Inclui lembrete 30 minutos antes.'", "(t.alarmText ?? 'Inclui lembrete 30 minutos antes.')")
    if previa:  # prévia: painel de QA ligado por padrão para trocar participante e horário
        app = patch(app, "STATE.qa = params.qa ?? qa.on ?? false;", "STATE.qa = params.qa ?? qa.on ?? Boolean(DATA.voo?.preview);")
    if "</script" in app:
        sys.exit("build: '</script' dentro do módulo")

    css = read(BASE / "base.css") + read(SRC / "meu-voo.css")
    boot = read(BASE / "boot.js")
    sprite = read(BASE / "sprite.svg")
    sprite = patch(sprite, "</svg>", read(SRC / "sprite-extra.svg") + "</svg>")
    icons_used = set(re.findall(r"icon\('([\w-]+)'", app)) | set(re.findall(r'href="#i-([\w-]+)"', read(SRC / "meu-voo.body.html")))
    icons_have = set(re.findall(r'<symbol id="i-([\w-]+)"', sprite))
    missing = sorted(i for i in icons_used if i not in icons_have and not i.startswith("$"))
    if missing:
        sys.exit(f"build: ícones sem símbolo no sprite: {missing}")

    body = read(SRC / "meu-voo.body.html")
    body = body.replace("{{SPRITE}}", sprite)
    body = re.sub(r"\{\{ASSET:([\w-]+)\}\}", lambda m: data_uri(next((BASE / "assets").glob(m.group(1) + ".*"))), body)
    body = body.replace("{{DATA}}", data_json).replace("{{APP_JS}}", app)
    left = re.findall(r"\{\{(?:SPRITE|ASSET:[^}]*|DATA|APP_JS)\}\}", body)
    if left:
        sys.exit(f"build: marcadores sem valor {left}")

    csp = (f"default-src 'none'; script-src '{sha(boot)}' '{sha(app)}'; style-src '{sha(css)}'; img-src data: blob:; "
           "font-src data:; base-uri 'none'; form-action 'none'; manifest-src 'none'")
    head = f"""<!doctype html>
<!--
  Encontro Infield 2026 · Futuro Infield em Foco · Meu Voo · v{VERSION}
  Página autocontida: estilo, código, dados e imagens embutidos. Funciona sozinha em qualquer hospedagem.
  Personalização: o SpotMe troca as merge tags do link pelos campos de voo de quem toca (os mesmos do cartão
  de embarque nativo); a página lê o fragmento (#) no aparelho, limpa o endereço e não envia nada a servidor
  (a CSP não permite conexões). Link e botão: dist/link-spotme.txt e dist/meu-voo-spotme-botao.html.
  Fonte: fonte/base (v0.3.1) + fonte/src (Meu Voo) · gerar com python3 fonte/build.py.
  Modo QA: #qa=1 · simular horário: #qa=1&now=2026-11-16T05:30
-->
<html lang="pt-BR" data-theme="auto">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{csp}">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="format-detection" content="telephone=no">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#F5F2F0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#17181C" media="(prefers-color-scheme: dark)">
<title>Meu Voo · Encontro Infield 2026</title>
<meta name="description" content="Seus voos do Encontro Infield 2026: cartão de cada trecho, check-in, jornada e chegada ao Rio.">
<link rel="icon" type="image/svg+xml" href="{read(BASE / 'favicon.txt').strip()}">
<script>{boot}</script>
<style>{css}</style>
</head>
"""
    page = head + body
    if previa:
        page = page.replace("<title>Meu Voo · Encontro Infield 2026</title>", "<title>Prévia Meu Voo</title>")
        out = DIST / "previa" / "meu-voo-previa.html"
        out.parent.mkdir(exist_ok=True)
        out.write_text(page, encoding="utf-8", newline="\n")
        print(f"previa/meu-voo-previa.html {out.stat().st_size / 1024:8.1f} kB")
        return
    out = DIST / "meu-voo.html"
    out.write_text(page, encoding="utf-8", newline="\n")
    pub = PUBLICAR / "index.html"
    pub.parent.mkdir(exist_ok=True)
    pub.write_text(page, encoding="utf-8", newline="\n")
    (DIST / "meu-voo-spotme-botao.html").write_text(snip, encoding="utf-8", newline="\n")
    (DIST / "link-spotme.txt").write_text(link + "\n", encoding="utf-8", newline="\n")
    print(f"meu-voo.html               {out.stat().st_size / 1024:8.1f} kB")
    print(f"meu-voo-spotme-botao.html  {len(snip.encode()) / 1024:8.1f} kB")
    print(f"link-spotme.txt            {len(link)} caracteres · {len(voo['fields'])} campos")


if __name__ == "__main__":
    build()
    build(previa=True)
