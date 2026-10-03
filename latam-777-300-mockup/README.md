# LATAM 777-300ER — mockup 3D

Viewer 3D standalone (three.js, sem build) do Boeing 777-300ER (PT-MUG) da
frota LATAM, em página única com carregamento do modelo via `GLTFLoader`.

## Rodar localmente

```bash
cd latam-777-300-mockup
python3 -m http.server 8000
open http://localhost:8000/
```

Precisa ser servido por HTTP — `file://` é bloqueado pelo navegador para o
fetch do `.glb`.

## Origem do modelo

Geometria original modelada a partir de documentos dimensionais do fabricante
e livery aferida por fotos, extraída de
[`kimlage/latam-model-planes`](https://github.com/kimlage/latam-model-planes)
(`export/web/B77W_web.glb`, 47.805 triângulos, comprimido com Draco).

- **Licença do modelo/geometria:** CC BY 4.0 — *LATAM fleet 3D replicas — Kim Lage*
- **Licença do código do viewer:** MIT (repositório de origem), adaptado aqui
  para exibir apenas o 777-300ER
- LATAM e Boeing são marcas de seus respectivos titulares; projeto
  independente, sem afiliação.

## Estrutura

```
latam-777-300-mockup/
  index.html         viewer three.js (import map via CDN, sem dependências locais)
  web/B77W_web.glb    modelo 777-300ER, tier "web" (leve, Draco-compresso)
```
