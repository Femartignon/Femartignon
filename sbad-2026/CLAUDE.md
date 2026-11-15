# Takeda | SBAD 2026 — Apresentação executiva interna

Contexto permanente do projeto. Leia antes de qualquer alteração nesta pasta.

## Objetivo

Deck executivo (16:9) para o time interno da Takeda sobre a participação na XXV SBAD
(Fortaleza, 19 a 21/11/2026): por quê, o quê, como, quando, quem e o que exige atenção.
Público interno; valores de fornecedores e nomes de palestrantes aparecem por decisão do usuário.

## Estado atual (15/11/2026)

- Diagnóstico documental e storyboard aprovados pelo usuário ("aprovado").
- Deck v1.0 produzido: 15 slides + 5 de apêndice (20 páginas), PDF e PPTX gerados.
- Conflitos e lacunas estão registrados em `01-diagnostico-storyboard.md` (seção 3) e no slide 15.
- Pendente: materiais que não constam nos documentos (planta/render do estande, montadora,
  orçamento consolidado, equipe interna). Quando chegarem, atualizar `deck/data.js` e regerar.

## Arquitetura

```
sbad-2026/
  01-diagnostico-storyboard.md   diagnóstico, confirmados/conflitos/lacunas, narrativa, storyboard
  CLAUDE.md                      este arquivo
  deck/
    data.js                      FONTE ÚNICA de conteúdo (textos, números, status, fontes). UMD: browser + node
    index.html                   renderizador 1920×1080 (HTML/CSS/JS). Um <section class="slide"> por slide
    assets/                      Gotham .otf (4 pesos), gradients.css, patterns.svg, takeda-curve.svg,
                                 logos, convites/ (4 artes oficiais em JPG)
    build/
      render-pdf.js              Playwright → out/Takeda-SBAD-2026.pdf + snapshots PNG por slide (QA)
      render-backgrounds.js      gera build/bg/*.png (gradiente + flow lines + Curve) para o PPTX
      build-pptx.js              PptxGenJS → out/Takeda-SBAD-2026.pptx, lendo o mesmo data.js
      package.json               dependência: pptxgenjs 3.12 (node_modules ignorado pelo git)
    out/                         entregáveis: PDF (apresentar) e PPTX (editar)
```

Fluxo de alteração: editar `data.js` (conteúdo) ou `index.html` (layout) → `node build/render-pdf.js`
→ conferir `build/snapshots/` → `node build/render-backgrounds.js` (só se mudar fundo) →
`node build/build-pptx.js` → QA do PPTX com `soffice --headless --convert-to pdf` + `pdftoppm`.
Nunca editar o PDF ou o PPTX à mão: são saídas geradas.

## Decisões de design (sistema Takeda 2026)

- Conceito "Sinal": Pattern 4 (flow lines com tick lenticular) como fio condutor; cheio na capa,
  no slide de cronologia e no fechamento; slides analíticos limpos.
- Red `#E1242A` como único acento; neutros `#111111`, `#1A1A1A`, `#EEF1F4`; canto frio `#9CCFE6`
  só nos gradientes de fundo. Gradientes oficiais em `assets/gradients.css` (grad-7 capa, grad-3
  cronologia e painel do slide 3, grad-0 fechamento).
- Gotham: Light para headlines sobre vermelho e números grandes, Bold para títulos pretos,
  Book no corpo, Medium em kickers e chips. Máximo dois pesos por slide.
- Takeda Curve apenas nos slides 2 e 14 (mensagens-chave). Logo no canto inferior direito.
- Chips de status com vocabulário único: confirmado (vermelho sólido), proposta (contorno),
  pendente (cinza tracejado). Mesmo critério no deck e no apêndice A5.
- Títulos são conclusões, não assuntos. Cada slide cita as fontes (D1–D5, I1–I4, P1).
- Margens 96 px, títulos 54 px, corpo 15–20 px, rodapé 14 px.

## Fontes e integridade

- Fontes documentais: proposta CCM (D1), faturas Opus (D2, D3), proposta Boutique Gourmet (D4),
  convite AF 2400 (D5), artes I1–I4, base de convidados P1 (398 registros).
- P1 contém dados pessoais: usar só agregados. Nenhum nome de convidado entra no deck ou no repositório.
  A planilha original não está no repositório.
- Hoje = 15/11/2026 (D-4) está fixado em `data.js` (`meta.dMenos`, `cronologia.hoje`); atualizar se o deck for reapresentado.

## Armadilhas conhecidas

- **Fontes da skill `takeda-brand-2026` estão com nomes trocados** (o arquivo "Light" contém a Bold,
  a Light real está em "BookItalic"). `deck/assets/fonts/` já tem os quatro arquivos corretos,
  identificados pelo nome interno. Não copiar de novo da skill sem conferir com `fc-query`.
- `.slide` tem `background:#fff` só quando não há classe `tkd-grad-*` (seletor `:not`); não reintroduzir
  `background` genérico em `.slide`.
- PptxGenJS 3.12: `margin` de célula de tabela é em polegadas (8 = 8 in, colapsa a tabela).
  Texto com `transparency` é truncado pelo LibreOffice; usar cor clara (`RMUTED`) em vez disso.
- PPTX usa as famílias "Gotham Light/Book/Medium/Bold" instaladas na máquina de quem abre. Sem Gotham,
  o PowerPoint substitui por Calibri; o PDF tem as fontes embutidas e é a versão de apresentação.

## Preferências do usuário

- Responder em português, direto e didático. Não enviar, publicar ou compartilhar arquivos sem autorização.
- Não agendar check-ins automáticos em PRs.
- Alterar só o necessário; preservar arquitetura, nomes e decisões aprovadas.
