#!/usr/bin/env python3
"""Gera encontro-infield/public/index.html (widget Fio da História) a partir de widget/src.

Uso:
    python3 encontro-infield/widget/build.py                  # valida os dados e gera public/index.html
    python3 encontro-infield/widget/build.py --dados X.json --saida Y.html   # variante (usada pelo QA)

O arquivo gerado é autocontido (estilo, código, dados, fonte e imagem embutidos) e leva uma CSP com o
hash do <style> e do <script>. O bloco de dados (application/json) não executa e não entra na CSP.
"""
import argparse
import base64
import hashlib
import html
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SRC = AQUI / "src"
ASSETS = AQUI / "assets"
SAIDA_PADRAO = AQUI.parent / "public" / "index.html"

LIMITE_TITULO = 45
LIMITE_TEXTO = 90
BRASILIA = timezone(timedelta(hours=-3))
ISO = re.compile(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|([+-])(\d{2}):?(\d{2}))?$")
MARCA = re.compile(r"(\*[^*]+\*|_[^_]+_)")


class ErroDados(Exception):
    pass


def instante(valor, onde):
    """Mesma regra do app.js: com fuso explícito ou, sem fuso, horário de Brasília."""
    if valor is None:
        return None
    m = ISO.match(str(valor).strip())
    if not m:
        raise ErroDados(f"{onde}: data inválida {valor!r} (use AAAA-MM-DDTHH:MM-03:00)")
    if m.group(7) == "Z":
        tz = timezone.utc
    elif m.group(7):
        sinal = -1 if m.group(8) == "-" else 1
        tz = timezone(sinal * timedelta(hours=int(m.group(9)), minutes=int(m.group(10))))
    else:
        tz = BRASILIA
    y, mo, d, h, mi = (int(m.group(i)) for i in range(1, 6))
    return datetime(y, mo, d, h, mi, int(m.group(6) or 0), tzinfo=tz)


def texto_puro(marcacao):
    return MARCA.sub(lambda m: m.group(0)[1:-1], marcacao)


def checar_marcacao(marcacao, onde):
    resto = MARCA.sub("", marcacao)
    if "*" in resto or "_" in resto:
        raise ErroDados(f"{onde}: marcação do título sem par ({marcacao!r}); use *vermelho* e _conectivo_")


def titulo_html(marcacao):
    partes = []
    for parte in MARCA.split(marcacao):
        if not parte:
            continue
        if MARCA.fullmatch(parte):
            cls = "r" if parte[0] == "*" else "c"
            partes.append(f'<span class="{cls}">{html.escape(parte[1:-1])}</span>')
        else:
            partes.append(html.escape(parte))
    return "".join(partes)


def validar(dados):
    avisos = []
    for chave in ("versao", "passos", "rotulos", "reserva", "estados", "espacos"):
        if chave not in dados:
            raise ErroDados(f"falta a chave {chave!r}")
    passos = dados["passos"]
    if len(passos) != 6:
        raise ErroDados(f"'passos' precisa ter 6 itens (prólogo, 4 capítulos, epílogo); tem {len(passos)}")
    if len(dados["rotulos"]) != len(passos) or not all(str(r).strip() for r in dados["rotulos"]):
        raise ErroDados("'rotulos' precisa ter um texto para cada passo")
    longos = [r for r in dados["rotulos"] if len(r) > 8]
    if longos:
        avisos.append(f"rótulos do fio com mais de 8 caracteres podem encostar no vizinho em 320 px: {longos}")

    for campo in ("kicker", "titulo", "texto"):
        if not str(dados["reserva"].get(campo, "")).strip():
            raise ErroDados(f"reserva.{campo} vazio")
    checar_marcacao(dados["reserva"]["titulo"], "reserva.titulo")

    estados = dados["estados"]
    ids = set()
    anterior = None
    for i, e in enumerate(estados):
        onde = f"estados[{i}] ({e.get('id', '?')})"
        for campo in ("id", "kicker", "titulo", "texto"):
            if not str(e.get(campo, "")).strip():
                raise ErroDados(f"{onde}: '{campo}' vazio")
        if e["id"] in ids:
            raise ErroDados(f"{onde}: id repetido")
        ids.add(e["id"])
        if not isinstance(e.get("passo"), int) or not 0 <= e["passo"] < len(passos):
            raise ErroDados(f"{onde}: 'passo' precisa ser inteiro de 0 a {len(passos) - 1}")
        checar_marcacao(e["titulo"], onde)
        de, ate = instante(e.get("de"), onde), instante(e.get("ate"), onde)
        if i == 0 and de is not None:
            raise ErroDados(f"{onde}: o primeiro estado começa em 'de': null")
        if i == len(estados) - 1 and ate is not None:
            raise ErroDados(f"{onde}: o último estado termina em 'ate': null")
        if i > 0:
            if de is None or anterior["ate"] is None or de != anterior["ate"]:
                raise ErroDados(f"{onde}: 'de' precisa ser igual ao 'ate' do estado anterior (sem buraco nem sobreposição)")
            if e["passo"] < anterior["passo"]:
                raise ErroDados(f"{onde}: 'passo' não pode voltar")
        if de is not None and ate is not None and not de < ate:
            raise ErroDados(f"{onde}: 'de' precisa vir antes de 'ate'")
        anterior = {"ate": ate, "passo": e["passo"]}
        avisos += limites(e, onde)

    janelas = [(instante(e.get("de"), "-"), instante(e.get("ate"), "-"), e["passo"]) for e in estados]
    for i, s in enumerate(dados["espacos"]):
        onde = f"espacos[{i}] ({s.get('id', '?')})"
        if not str(s.get("id", "")).strip() or s["id"] in ids:
            raise ErroDados(f"{onde}: id vazio ou repetido")
        ids.add(s["id"])
        de, ate = instante(s.get("de"), onde), instante(s.get("ate"), onde)
        if de is None or ate is None or not de < ate:
            raise ErroDados(f"{onde}: precisa de 'de' e 'ate', com 'de' antes de 'ate'")
        # o espaço só pode ocupar horário de estados do mesmo passo (o fio não pode pular)
        for jde, jate, jpasso in janelas:
            sobrepoe = (jate is None or de < jate) and (jde is None or ate > jde)
            if sobrepoe and jpasso != s.get("passo"):
                raise ErroDados(f"{onde}: a janela invade um estado de outro passo")
        preenchido = bool(str(s.get("titulo", "")).strip()) and bool(str(s.get("texto", "")).strip())
        meio = bool(str(s.get("titulo", "")).strip()) != bool(str(s.get("texto", "")).strip())
        if meio:
            avisos.append(f"{onde}: só um de título/texto preenchido; o espaço segue sem publicar (D06)")
        if preenchido:
            if not str(s.get("kicker", "")).strip():
                raise ErroDados(f"{onde}: 'kicker' vazio")
            checar_marcacao(s["titulo"], onde)
            avisos += limites(s, onde)
    return avisos


def limites(item, onde):
    avisos = []
    t, x = len(texto_puro(item["titulo"])), len(item["texto"])
    if t > LIMITE_TITULO:
        avisos.append(f"{onde}: título com {t} caracteres (limite {LIMITE_TITULO})")
    if x > LIMITE_TEXTO:
        avisos.append(f"{onde}: texto com {x} caracteres (limite {LIMITE_TEXTO})")
    return avisos


def b64(caminho):
    return base64.b64encode(caminho.read_bytes()).decode("ascii")


def sha256(texto):
    return "sha256-" + base64.b64encode(hashlib.sha256(texto.encode("utf-8")).digest()).decode("ascii")


def gerar(dados_path, saida):
    dados = json.loads(dados_path.read_text(encoding="utf-8"))
    avisos = validar(dados)

    estilo = (SRC / "styles.css").read_text(encoding="utf-8").replace("{{FONTE}}", b64(ASSETS / "montserrat-latin.woff2"))
    codigo = (SRC / "app.js").read_text(encoding="utf-8")
    for nome, bloco in (("styles.css", estilo), ("app.js", codigo)):
        if "</" + ("style" if nome.endswith("css") else "script") in bloco.lower():
            raise ErroDados(f"{nome} não pode conter a tag de fechamento do próprio bloco")

    dados_json = json.dumps(dados, ensure_ascii=False, separators=(",", ":"))
    dados_json = dados_json.replace("</", "<\\/").replace("<!--", "<\\!--")
    csp = "; ".join([
        "default-src 'none'",
        f"script-src '{sha256(codigo)}'",
        f"style-src '{sha256(estilo)}'",
        "img-src data:",
        "font-src data:",
        "base-uri 'none'",
        "form-action 'none'",
    ])
    reserva = dados["reserva"]
    pagina = (SRC / "index.html").read_text(encoding="utf-8")
    trocas = {
        "{{VERSAO}}": html.escape(str(dados["versao"])),
        "{{CSP}}": csp,
        "{{ESTILO}}": estilo,
        "{{CANTO}}": b64(ASSETS / "kv-canto.webp"),
        "{{KICKER}}": html.escape(reserva["kicker"]),
        "{{TITULO}}": titulo_html(reserva["titulo"]),
        "{{TEXTO}}": html.escape(reserva["texto"]),
        "{{CONTAS}}": "".join('<li class="conta"></li>' for _ in dados["passos"]),
        "{{ROTULOS}}": "".join(f"<li>{html.escape(r)}</li>" for r in dados["rotulos"]),
        "{{DADOS}}": dados_json,
        "{{CODIGO}}": codigo,
    }
    # substitui em ordem única, sem reprocessar o que já foi inserido
    padrao = re.compile("|".join(re.escape(k) for k in trocas))
    pagina = padrao.sub(lambda m: trocas[m.group(0)], pagina)
    sobras = re.findall(r"\{\{[A-Z]+\}\}", pagina)
    if sobras:
        raise ErroDados(f"marcadores sem valor no modelo: {sorted(set(sobras))}")

    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(pagina, encoding="utf-8")
    return pagina, avisos, dados


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dados", type=Path, default=SRC / "fio-da-historia.json")
    ap.add_argument("--saida", type=Path, default=SAIDA_PADRAO)
    args = ap.parse_args()
    try:
        pagina, avisos, dados = gerar(args.dados, args.saida)
    except ErroDados as erro:
        print(f"ERRO: {erro}", file=sys.stderr)
        return 1
    publicados = [s["id"] for s in dados["espacos"] if str(s.get("titulo", "")).strip() and str(s.get("texto", "")).strip()]
    print(f"OK  {args.saida}  {len(pagina.encode('utf-8')) / 1024:.0f} kB  v{dados['versao']}")
    print(f"    estados: {', '.join(e['id'] for e in dados['estados'])}")
    print(f"    espaços publicados: {', '.join(publicados) or 'nenhum (vazios não publicam)'}")
    for aviso in avisos:
        print(f"AVISO: {aviso}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
