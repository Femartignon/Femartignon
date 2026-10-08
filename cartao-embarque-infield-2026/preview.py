"""Simula como o app (SpotMe) renderiza um cartão gerado, para revisar antes de colar no app.

Reproduz as peculiaridades já validadas no app:
- descarta bgcolor em <table> (só <td> vale);
- força line-height ~22 px e centraliza <img> na linha;
- resolve {{#if}}…{{else}}…{{/if}} (aninhado) e {{ }} / {{{ }}} com dados de exemplo.

Uso: python3 preview.py cartao-embarque-ida.html [--conexao] [--largura 360]
     → grava preview-<arquivo>.html ao lado (ignorado pelo git) para abrir no navegador.
Screenshot opcional (Chromium do ambiente): ver CLAUDE.md desta pasta.
"""
import argparse
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
BRAND = "https://cartao-embarque-infield-2026.netlify.app/"

def sample(conexao):
    d = {"fname": "Felipe", "lname": "Martignon", "Data_ida": "16/11/2026", "Data_volta_": "19/11/2026"}
    for leg, (o, de, h, c) in {"ida": ("GRU", "SDU", "09:00", "10:05"),
                               "volta": ("SDU", "GRU", "18:30", "19:35")}.items():
        d.update({f"voo_{leg}_origem": o, f"voo_{leg}_destino": de, f"horario_{leg}": h,
                  f"horario_{leg}_chegada": c, f"voo_{leg}_partida": "LA 3122",
                  f"voo_{leg}_localizador": "ECWYJA",
                  f"voo_{leg}_conexao_aeroporto": "BSB" if conexao else "",
                  f"voo_{leg}_conexao_voo": "LA 4410" if conexao else ""})
    return d

IF = re.compile(r"\{\{#if activatedPerson\.(\w+)\}\}((?:(?!\{\{#if).)*?)"
                r"(?:\{\{else\}\}((?:(?!\{\{#if).)*?))?\{\{/if\}\}", re.S)

def render(src, data):
    src = src.split("-->", 1)[1]                                   # remove o cabeçalho de comentário
    src = re.sub(r'(<table[^>]*?) bgcolor="[^"]*"', r"\1", src)    # o app descarta bgcolor de <table>
    src = src.replace(BRAND, HERE.as_uri() + "/")                   # imagens de marca locais
    while IF.search(src):                                          # condicionais, de dentro para fora
        src = IF.sub(lambda m: m.group(2) if data.get(m.group(1)) else (m.group(3) or ""), src)
    return re.sub(r"\{\{\{?activatedPerson\.(\w+)\}?\}\}", lambda m: data.get(m.group(1), ""), src)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("arquivo")
    ap.add_argument("--conexao", action="store_true", help="preenche os campos de conexão")
    ap.add_argument("--largura", type=int, default=360, help="largura da tela simulada (px)")
    a = ap.parse_args()
    path = HERE / a.arquivo
    body = render(path.read_text(encoding="utf-8"), sample(a.conexao))
    out = HERE / f"preview-{path.stem}.html"
    out.write_text('<!doctype html><html><head><meta charset="utf-8">'
                   '<style>body{line-height:22px}img{vertical-align:middle}</style></head>'
                   f'<body style="margin:16px;width:{a.largura - 32}px;background:#fff">'
                   f"{body}</body></html>", encoding="utf-8")
    print(out)

if __name__ == "__main__":
    main()
