# Widget do feed da Home · Fio da História

Embed widget do Home feed do SpotMe (Backstage › Design › Home › Home feed), servido na raiz de
`https://myencontroinfield.vercel.app` (`public/index.html`). Cerca de 220 px de altura, só no celular,
sem rolagem nem interação.

## O que mostra

Em que capítulo do Encontro estamos e o que ele pede de quem está lá. Muda sozinho pelo relógio.

| Estado | Janela (Brasília) | Título |
|---|---|---|
| `prologo` | até 16/11 00h | 247 autores, uma história |
| `enxergar` | 16/11 00h → 17/11 00h | Hoje o futuro entra em foco |
| `conversar` | 17/11 00h → 18/11 00h | Hoje a liderança vem até você |
| `praticar` | 18/11 00h → 18h | Treino é onde a história ganha forma |
| `celebrar` | 18/11 18h → 19/11 03h | Hoje à noite, a história ganha trilha sonora |
| `levar` | 19/11 03h → 20/11 00h | O último capítulo se escreve no campo |
| `epilogo` | a partir de 20/11 00h | A história continua no seu território |

Espaços opcionais, que só publicam com título e texto preenchidos (D06):
`sintese-plenaria` (16/11, a partir das 18h) e `jubilandos` (17/11, a partir das 12h).

O fio embaixo tem 6 contas (prólogo, 4 capítulos, epílogo): fio vermelho até hoje, conta vermelha no dia,
contas grafite no que passou, anéis no que ainda vem.

## Estrutura

```
widget/
├─ src/fio-da-historia.json   textos, janelas e datas do fio (fonte única do conteúdo)
├─ src/index.html             modelo da página
├─ src/styles.css             estilo (tokens das páginas v0.3.1, identidade v3.0 "Fio Condutor")
├─ src/app.js                 escolha do estado, ajuste do texto à altura, modo QA
├─ assets/                    Montserrat latin (woff2) e canto do KV (webp), os mesmos das páginas
├─ build.py                   valida os dados e gera ../public/index.html com a CSP por hash
└─ qa/validar.py              QA no Chromium e prancha de prévia
```

## Mudar um texto

1. Editar `src/fio-da-historia.json`. No título, `*palavra*` sai em vermelho Bold e `_palavra_` em peso
   regular (conectivo); o resto sai em Bold grafite. Título até 45 caracteres, texto até 90.
2. Rodar `python3 encontro-infield/widget/build.py`. Ele recusa janelas com buraco ou sobreposição,
   marcação sem par e espaço que invade outro capítulo, e avisa quando um texto passa do limite.
3. Recomendado: `python3 encontro-infield/widget/qa/validar.py --axe <caminho do axe.min.js>`
   (`npm i axe-core`; requer `pip install playwright pillow` e `playwright install chromium`).
4. Fazer commit de `src/` e `public/index.html` juntos e abrir PR. O merge na `main` publica na Vercel.

Não editar `public/index.html` à mão: qualquer mudança no estilo ou no código fora do build invalida
o hash da CSP e o navegador bloqueia a página.

## Conferir um estado

`https://myencontroinfield.vercel.app/#qa=1&estado=conversar` ou
`#qa=1&now=2026-11-17T10:30` (horário de Brasília). Sem `qa=1`, vale o relógio do aparelho.

## Decisões

- **Universal.** Sem merge tag (não funciona em URL de widget) e sem segmentação.
- **Sem rede.** Nenhuma API externa. O estado vem do relógio do aparelho comparado com instantes
  absolutos, então o fuso do aparelho não muda o resultado. A troca acontece sozinha na virada.
- **Placa sempre em papel.** O tema do app é fixo e o iframe segue o tema do sistema; seguir o sistema
  poderia pôr um cartão escuro num app claro.
- **Texto ajustado à altura.** O título vai de 24 a 19 px; 19 px mantém o vermelho como texto grande
  (4,2:1 no papel). Se nem assim couber, as datas do fio saem.
- **Movimento curto.** Tudo termina em 4,3 s (WCAG 2.2.2, porque o widget não tem pausa); com
  "reduzir movimento" ligado, não há animação.
- **Sem JavaScript.** Mostra a reserva "Futuro Infield em Foco".

## Pendências

- Aprovação dos textos pela CI até 11/11 (prazo de materiais do app).
- "247" vem do mailing de 28/10: atualizar com a lista final da Incentivare.
- Capítulo 2: confirmar com o Treinamento que o World Café abre espaço para perguntas.
- Espaços opcionais: frase-síntese da plenária (CI) e número agregado dos Jubilandos (RH e CI).
- Limpeza futura: `public/img/*.webp` (fotos de clima) só eram usadas pelo widget anterior.

## Voltar ao widget anterior

"Instant Rollback" no painel da Vercel para o deploy de produção anterior, ou `git revert` do commit do widget.
