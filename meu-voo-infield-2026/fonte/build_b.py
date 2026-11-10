#!/usr/bin/env python3
"""Encontro Infield 2026 · Meu Voo · versão B · gera publicar/index.html (a página que o Vercel publica).

Layout: bilhete como capa, ida e volta em carrossel, barra fixa de atalhos, checklist no fio e
transfer de retorno (campo transfer_volta). Dados e regras continuam em src/voo.json; a leitura do
link é a mesma da v0.5.0 (b/dados.js). O botão e o link do SpotMe seguem saindo de build.py (dist/).
Sem dependências. Uso: python3 fonte/build_b.py
"""
import base64, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
B, BASE = ROOT / "b", ROOT / "base"
OUT = ROOT.parent / "publicar" / "index.html"
VERSION = "0.6.1"

def uri(name): return "data:image/webp;base64," + base64.b64encode((BASE / "assets" / name).read_bytes()).decode()
def sha(txt): return "'sha256-" + base64.b64encode(hashlib.sha256(txt.encode()).digest()).decode() + "'"

def build():
    voo = json.loads((ROOT / "src" / "voo.json").read_text(encoding="utf-8"))
    icons = json.loads((B / "icones.json").read_text(encoding="utf-8"))
    keep = ("version", "logisticaUrl", "fields", "legs", "arriveEarlyMin", "airlines", "airlineNames", "airports")
    data = {k: voo[k] for k in keep}
    data["version"] = VERSION
    data["texts"] = {k: voo["texts"][k] for k in ("lead", "leadNoData", "noData", "noTransfer")}
    js = "\n'use strict';\nconst VOO = %s;\nconst VOO_KEYS = new Set(VOO.fields.map(([k]) => k));\nconst I = %s;\n%s\n%s" % (
        json.dumps(data, ensure_ascii=False, separators=(",", ":")), json.dumps(icons, ensure_ascii=False, separators=(",", ":")),
        (B / "dados.js").read_text(encoding="utf-8"), (B / "app.js").read_text(encoding="utf-8"))
    assert "</script" not in js.lower()
    css = "\n" + (B / "fontes.css").read_text(encoding="utf-8") + (B / "pagina.css").read_text(encoding="utf-8")
    csp = ("<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src %s; style-src %s; "
           "img-src data:; font-src data:; base-uri 'none'; form-action 'none'; manifest-src 'none'\">") % (sha(js), sha(css))
    page = (B / "pagina.html").read_text(encoding="utf-8")
    rep = {"__CSP__": csp, "__FAVICON__": (BASE / "favicon.txt").read_text(encoding="utf-8").strip(), "__CSS__": css,
           "__CORNER__": uri("hero-corner.webp"), "__LOGO__": uri("hero-logo.webp"), "__LOCKUP__": uri("footer-lockup.webp"),
           "__BAND__": uri("footer-band.webp"), "__VERSION__": VERSION, "__I_TICKET__": icons["ticket"],
           "__I_CHECK__": icons["check"], "__I_RADAR__": icons["radar"], "__JS__": js}
    for k, v in rep.items():
        assert page.count(k) == 1, k
        page = page.replace(k, v)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(page, encoding="utf-8", newline="\n")
    print(f"publicar/index.html  v{VERSION}  {OUT.stat().st_size / 1024:.1f} kB")

if __name__ == "__main__":
    build()
