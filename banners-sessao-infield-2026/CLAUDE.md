# Banners de sessão (agenda do app SpotMe): Encontro Infield 2026

## Problema que estes banners resolvem

Na agenda, o SpotMe põe por cima do banner um véu preto de ~62% de opacidade, que começa a
~22% da altura da linha, e escreve em branco o horário e o título da sessão. Esse véu não
pode ser removido. Os banners antigos (creme, 1000×150, com título e ícone) ficavam acinzentados
embaixo do véu e repetiam o título que o app já escreve.

## Decisões

- **Fundo grafite escuro** (`#111A24` → `#243243`). Sob o véu ele quase não muda, então o
  corte da faixa some e o título branco do app ganha contraste.
- **Sem título e sem ícones.** O nome é escrito pelo app. A única variação por sessão é o
  *kicker* da faixa superior ("ENCONTRO INFIELD 2026 · <categoria>"), que fica fora do véu.
- **O app corta as laterais** (`object-fit: cover`), e a altura da linha varia com o título:
  - 1000×150: conteúdo útil entre ~200 e 800 px;
  - 1500×300: conteúdo útil entre ~200 e 1300 px.
- Dois layouts para avaliação:
  - **A · fita** (1000×150): mesmo formato dos banners atuais;
  - **B · panorama** (1500×300): proporção 5:1, mais próxima da linha do app, com a silhueta
    do Rio.

## Arquivos

| Arquivo | Papel |
|---|---|
| `build.js` | **Fonte única de verdade.** Lista de sessões, layouts, arte e prévia. Rodar: `NODE_PATH=$(npm root -g) node build.js` |
| `fonts/poppins-*.ttf` | Poppins (Google Fonts, OFL), embutida no render. |
| `out/session-banner_<slug>_<A-fita\|B-panorama>_<W>x<H>.png` | Entregáveis. |
| `out/preview.html`, `out/preview-app.png` | Simulação da linha da agenda com o véu, para validação. |

## Estado

- 16/11: gerados os 5 banners (Chegada do Grupo, Reunião de Liderança, Abertura Oficial,
  Resultados e Estratégia, Entrevista com Paciente), nos 2 layouts.
- Pendente: o usuário escolher o layout e validar no app. Depois, estender às demais sessões
  acrescentando entradas em `SESSOES`.
