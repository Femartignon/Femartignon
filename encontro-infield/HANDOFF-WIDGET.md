# Project Handoff — Widget do app (clima · dias · faixa de voos) — `polite-stroopwafel-cfdd45`

Atualizado: 13/10/2026 · Evento: 16/11/2026 07:59 (Brasília) · Grand Hyatt, Barra da Tijuca, RJ

> Este é o widget **que está no app hoje**. O `HANDOFF.md` desta pasta cobre outros projetos (`infield2026-widgets` com trânsito e o Assistente Infield no Vercel).

## 1. Objetivo
Widget HTML (iframe no app do Encontro Infield 2026, Takeda), card ~403×214 px CSS:
- **Esquerda:** clima ao vivo do hotel (Open-Meteo).
- **Direita:** contagem de dias (placas split-flap) + "Detalhes do seu voo em Meu voo".
- **Rodapé:** faixa rolante estilo telejornal com status de voos (AviationStack) e avisos.
- **16/11, 00:00–12:00:** vídeo de boas-vindas em loop ocupando o card inteiro.

## 2. Estado atual
| Item | Estado |
|---|---|
| Projeto Netlify | `polite-stroopwafel-cfdd45` · siteId `aa84a985-6067-495c-b6b4-548c74383864` · time `fsmartignon` (plano **Free**) |
| Publicação | **Arrastar a pasta** no painel de deploys (não há Git ligado). Arrastar **substitui o site inteiro** e **publica funções** (confirmado) |
| No ar agora | **v6** (publicada 02/10, 18:08 Brasília): visual novo **com logo Takeda** + faixa em modo TESTE |
| Pronto, não publicado | **v7b** = pasta `site/` deste repositório (sem logo, faixa ao vivo, terminal e portão) |
| Bloqueio | **Créditos da Netlify esgotados** (plano Free; cada deploy de produção consome créditos). Sem crédito: deploy bloqueado e risco de site pausado |
| Chave AviationStack | Env var `AVIATIONSTACK_API_KEY` no projeto (Production, secret) — cadastrada e validada |
| Teste da API | `/api/voos` respondeu `ok:true` em produção (modo teste, 02/10) |

## 3. Estrutura (o que arrastar = `site/`)
```
encontro-infield/
├─ HANDOFF-WIDGET.md                este arquivo
├─ site/                            ← PASTA PUBLICÁVEL (arrastar inteira)
│  ├─ index.html                    widget, arquivo único (fontes, fundo e ícones embutidos em base64)
│  ├─ netlify.toml                  publish="." · functions="netlify/functions"
│  ├─ netlify/functions/voos.mjs    GET /api/voos e /api/voos?chegadas=1 (AviationStack)
│  ├─ data/voos.json                lista de voos do grupo (gerada da planilha) — hoje com 2 voos fictícios
│  ├─ data/faixa.json               avisos da faixa — hoje com mensagens "TESTE ·"
│  └─ video/boas-vindas.mp4 (+poster.webp)  720p, mudo, loop
└─ build/                           apoio (não publicar)
   ├─ apply.py                      script que gerou o index.html a partir da v5 (caminhos da sessão antiga; só referência)
   ├─ grade.py                      tratamento de foto (descartado)
   ├─ img/fundo-rio.webp            fundo atual (cenário extraído da imagem de referência do usuário, sem textos)
   ├─ img/takeda-branco.png         logo branco (removido do widget a pedido; guardado)
   └─ modelo-planilha-infield.xlsx  modelo da planilha final (abas `voos` e `faixa`)
```
**Regra de edição:** editar `site/index.html` direto, com alterações pontuais (str_replace). Não regenerar pelo `apply.py`.

## 4. Widget (`site/index.html`)
- **Visual (aprovado):** fundo azul-marinho + cenário do Rio ao entardecer (Pão de Açúcar, orla iluminada) embutido em `.sky .photo` (`background: right -12px top / cover`). Rota curva fina com avião vermelho animado (`offset-path`, 9 s) e ponto vermelho (`#routeDot`, posicionado por `getPointAtLength`). **Tudo em Gotham** (só existe o peso Bold embutido). Sem borda vermelha no topo. **Sem logo.**
- **Clima:** Open-Meteo `current=temperature_2m,weather_code,wind_speed_10m,is_day` + `daily=temperature_2m_max`. Refresh 15 min, cache `localStorage` (`infield2026_weather_cache_v3`), 1 retry em 3 s. Ícone em quadrado de vidro; pílulas **Máxima** e **Vento** com mesma largura (`.chips` grid 1fr 1fr). Params de URL: `lat`, `lon`, `label`.
- **Contagem:** dias de calendário (fuso Brasília) até `EVENT_START = 2026-11-16T07:59-03:00`. Placas escuras de vidro, número branco; `setCard()` faz a virada. Dia 16: "É hoje!"; depois: "Obrigado!" (texto pós-evento **a confirmar**).
- **Boas-vindas:** `WELCOME_START/END` = 16/11 00:00–12:00. Teste: `?preview=boasvindas`. Reprodução real no app **não verificada** (se o autoplay falhar, fica o pôster; alternativa: WebP animado).
- **Faixa:** `loadTicker()` a cada 15 min. Velocidade `TK_SPEED = 55` px/s, loop contínuo (2 cópias). Voo: avião vermelho · código · `ORIGEM → DESTINO` · status (verde/âmbar/vermelho) · `Terminal X · Portão Y` (só se a API informar; SDU não tem terminal). Aviso: ponto vermelho + texto. Sem itens → a faixa some. Some no modo boas-vindas.
- **Troca programada:** `LIVE_START = 2026-10-04T11:05-03:00` (já passou). Depois dela a faixa **não lê `faixa.json`** e chama `/api/voos?chegadas=1` (chegadas reais). Antes, modo teste (`/api/voos` + avisos).

## 5. Função (`site/netlify/functions/voos.mjs`)
- **`/api/voos`:** lê `/data/voos.json`; 1 chamada AviationStack por destino (`arr_iata`, `limit=100`); casa por `flight.iata`; `modo_teste:true` adiciona `amostra` (3 chegadas reais).
- **`/api/voos?chegadas=1`:** voos **em voo agora** para GIG e SDU (`flight_status=active`), sem codeshare, ordenados pela previsão, máx. 10.
- **Status:** landed → "pousou HH:MM" · active → "em voo · previsão HH:MM" · scheduled → "no horário · HH:MM" ou "atrasado X min" · cancelled/diverted. Horário da API vem local marcado como UTC → usa HH:MM literal.
- **Cache CDN:** `Netlify-CDN-Cache-Control: public, durable, s-maxage=1800`. Erro: 502 `no-store`; sem chave: 500.
- **Plano gratuito AviationStack:** ~100 consultas/mês, só HTTP. Cada atualização = 2 consultas (GIG + SDU). Ao vivo com alguém abrindo o app: até ~96/dia → **a cota acaba em ~1 dia**.

## 6. Decisões tomadas
- Visual igual à referência enviada pelo usuário (card azul-marinho + Pão de Açúcar ao entardecer); fundo extraído da própria referência. Foto da Barra e desenho em traço do vídeo foram **rejeitados**.
- Fonte única: Gotham (Montserrat descartada). Logo Takeda **removido**.
- Faixa: rolando, largura total, sem selo "Infield 2026". Ao vivo: **só voos** (sem avisos).
- Planilha final em **Excel**, estrutura fixa (abas `voos`: voo, cia, origem, destino, data, horario_chegada, passageiros · `faixa`: ativa, mensagem). **Sem nomes de participantes (LGPD).** O widget não lê Excel: converter para `data/voos.json` e `data/faixa.json`.
- Merge tags do app **não** funcionam em URL de widget (voo individual no widget foi abortado).

## 7. Pendências (em ordem)
1. **Créditos Netlify:** ver saldo/renovação em Netlify → Team `fsmartignon` → Billing/Usage. Recomendado: plano pago (Personal) out–nov. Sem isso não há como publicar.
2. **Cota AviationStack — decidir:** (A) consultar só nos dias/horários de chegada (ex.: 15–16/11, 05h–23h, cache 45 min) ou (B) plano pago por 1 mês. Implementar a janela no `voos.mjs`/`index.html` conforme a decisão.
3. **Publicar v7b** (arrastar `site/`) e validar `https://polite-stroopwafel-cfdd45.netlify.app/api/voos?chegadas=1` (JSON com voos reais = ok).
4. **Planilha final:** converter para `data/voos.json` (`modo_teste:false`) e `data/faixa.json`; decidir se a faixa final mostra voos do grupo + avisos (e remover/ajustar `LIVE_START` e o modo `chegadas`).
5. Confirmar texto pós-evento ("Obrigado!" a partir de 17/11).
6. Testar o vídeo de boas-vindas no app com `?preview=boasvindas`.
7. Widget de vacinação Qdenga (17/11, Sala Lagoa 5, o dia todo, documento com foto): prévia feita, faltam logo oficial (™ vs ®), aprovação e projeto Netlify de destino.

## 8. Alterações rápidas
- Data do evento → `EVENT_START` · janela do vídeo → `WELCOME_START/END` · troca ao vivo → `LIVE_START` (todos em `site/index.html`).
- Velocidade da faixa → `TK_SPEED` · intervalo → `setInterval(loadTicker, 15*60*1000)`.
- Aeroportos ao vivo → `CHEGADAS_DESTINOS` · máximo de voos → `CHEGADAS_MAX` · cache → `CACHE_SECONDS` (em `voos.mjs`).
- Avisos → `data/faixa.json` (`{"mensagens":[...]}`) · voos do grupo → `data/voos.json`.

## 9. Instruções críticas para continuidade
- **Perguntar antes de agir quando faltar informação; sempre mostrar prévia e aguardar ok antes do entregável final.**
- Alterações pontuais; preservar arquitetura, nomes e visual aprovados.
- **Juntar mudanças numa única publicação** (créditos Netlify). Testar antes com Playwright (Chromium em `/opt/pw-browsers/chromium`), mockando Open-Meteo e `/api/voos`, e `page.clock` para datas.
- O ambiente de nuvem bloqueia `*.netlify.app`, `api.netlify.com`, Open-Meteo e AviationStack: não dá para publicar nem chamar as APIs daqui (liberar em Network access do ambiente, se necessário). O conector Netlify só lê dados do projeto.
- Marca: vermelho `#E1242A`, Gotham.
