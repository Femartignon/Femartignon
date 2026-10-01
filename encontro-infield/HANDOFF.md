# Project Handoff — Widget Encontro Infield 2026 (clima · dias · trânsito)

Atualizado: 01/10/2026

## 1. Objetivo
Widget HTML embutido no app do Encontro Infield 2026 (Takeda): clima ao vivo do hotel, contagem de dias para o evento e trânsito aeroporto → hotel.

## 2. Estado atual
| Item | Estado |
|---|---|
| Projeto Netlify | **`infield2026-widgets`** → https://infield2026-widgets.netlify.app (antigo `infield2026-voo-transito`, renomeado) |
| Código | Esta pasta (`encontro-infield/`) no repo `Femartignon/Femartignon` |
| Chave TomTom | Env var `TOMTOM_API_KEY` no projeto `infield2026-widgets` (cadastrada; **marcar como secret pela interface**) |
| Deploy | **Pendente:** ligar o projeto ao GitHub (base directory `encontro-infield`) |
| App | **Pendente:** trocar o endereço do widget para https://infield2026-widgets.netlify.app |
| Projeto antigo `polite-stroopwafel-cfdd45` | Versão anterior (clima + relógio D/H/M). Desativar depois que o novo estiver no app |

## 3. Estrutura
```
encontro-infield/
├─ netlify.toml                    publish=public · functions=netlify/functions
├─ public/index.html               widget (arquivo único, fontes embutidas)
├─ public/img/*.webp               6 fotos de clima
└─ netlify/functions/transito.mjs  GET /api/transito (TomTom, cache CDN 10 min)
```

## 4. Widget (public/index.html)
- Card ~403×214 px CSS; duas colunas independentes (flex), faixa vermelha no topo.
- **Esquerda — clima:** Open-Meteo, refresh 15 min, cache `localStorage`, retry 3 s; foto de fundo por condição (`photoFor`), tom claro/escuro em `#wxPane` + `#veil`. Params de URL `lat`, `lon`, `label`.
- **Direita — dias:** placa split-flap (Bebas Neue) com **dias de calendário** (fuso Brasília) até `EVENT_START = 2026-11-16T07:59-03:00`; véspera "01 dia"; dia 16 "É hoje!"; depois "Evento realizado".
- **Direita — trânsito:** `fetch('/api/transito')` a cada 5 min; GIG e SDU com barra por trechos (verde/âmbar/vermelho), minutos, nível e "+X min"; falha → "Trânsito indisponível no momento".

## 5. Função (netlify/functions/transito.mjs)
- TomTom Routing `calculateRoute` com `traffic=true`, `computeTravelTimeFor=all`, `sectionType=traffic`.
- Nível do trajeto: tempo/tempo-sem-trânsito < 1,15 livre · < 1,4 moderado · ≥ 1,4 intenso.
- Trechos da barra: seções TRAFFIC (`magnitudeOfDelay` ≥3 intenso; ≥1 ou JAM moderado), proporcionais à distância.
- Cache: `Netlify-CDN-Cache-Control: durable, s-maxage=600` → ~290 chamadas/dia, independente do nº de participantes.
- Coordenadas: hotel −23.0045, −43.3187 (mesmas do widget original) · GIG −22.8099, −43.2506 · SDU −22.9105, −43.1631. **Conferir a coordenada do Grand Hyatt.**

## 6. Decisões tomadas
- Sem conteúdo de lazer/praia (evento corporativo). Relógio split-flap só com dias. Foto de clima só à esquerda.
- Plataforma do app posiciona widgets **lado a lado** (não empilha) → tudo no mesmo card.
- Voo do participante: **em espera**. Merge tags com 3 colchetes: `[[[activatedPerson.voo_ida_partida]]]`, `[[[activatedPerson.horario_ida]]]` (formato dos valores ainda não verificado).

## 7. Pendências
1. Ligar `infield2026-widgets` ao GitHub (Base directory `encontro-infield`, branch `main`).
2. Marcar `TOMTOM_API_KEY` como secret (Netlify UI → Environment variables → editar).
3. Validar trânsito real após o deploy (este ambiente não alcança a TomTom).
4. Trocar o endereço do widget no app.
5. Data de encerramento do evento ("Evento realizado" aparece a partir de 17/11).
6. Confirmar coordenada do Grand Hyatt.

## 8. Alterações rápidas no evento
- Data alvo → `EVENT_START` em `public/index.html`.
- Trajetos/coordenadas → `ROUTES` e `HOTEL` em `netlify/functions/transito.mjs`.
- Local do clima → params de URL `lat`, `lon`, `label` (sem editar código).
- Com o GitHub ligado, cada commit no `main` publica automaticamente.

## 9. Instruções críticas
- Perguntar antes de agir quando faltar informação; mostrar prévia e aguardar ok.
- Marca Takeda 2026 (`#E1242A`, Gotham). Logo não pode ser recolorido/distorcido.
- Este ambiente bloqueia `*.netlify.app`, Open-Meteo e TomTom: testar com dados simulados.
