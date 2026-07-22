# CLAUDE.md

Orientações para o Claude Code ao trabalhar neste repositório.

## O que é este repositório

Uma coleção mista de entregáveis para as operações de eventos farmacêuticos da
Takeda — não há uma aplicação ou framework único amarrando tudo:

- **Visualizações HTML independentes** na raiz do repositório (sem etapa de build,
  basta abrir direto no navegador): `index.html` (redireciona para o globo WorldWind),
  `takeda-worldwind.html` (build NASA WorldWind), `takeda-globe-3d.html` (globo
  Three.js/WebGL como fallback), `flight_tracker.html`, `executive_brief.html`.
- **`webgpu-earth/`** — um sub-projeto real em TypeScript + Vite + WebGPU/WGSL puro
  (o globo "cinematic Earth"). É a única parte do repositório com um pipeline de
  build de verdade. Veja `webgpu-earth/README.md` para a arquitetura completa de
  renderização.
- **Planilhas Excel** (`*.xlsx`) — planilhas de operações de eventos / controle
  financeiro (`Central_de_Controle_Eventos_Takeda.xlsx`,
  `Pharma_Events_Operations_Enterprise.xlsx`, `Takeda_Events_2026_Enterprise.xlsx`).
  Trate-as como entregáveis de dados, não como código — use a skill `xlsx` ao
  editá-las.
- **`Takeda_PO_Email_Flow.zip`** — exportação de um flow do Power Automate
  (automação de e-mail de faturamento → PO).
- **`RENDERING_UPGRADE.md`** — dossiê documentando a reformulação de renderização
  do globo Three.js (Fases 1–11); leia antes de mexer em `takeda-globe-3d.html`.

## Comandos de build / dev / test

Somente `webgpu-earth/` tem uma etapa de build. Execute a partir de dentro de
`webgpu-earth/`:

```bash
npm install
npm run dev      # servidor de dev do Vite em http://localhost:5173 (Chrome/Edge 113+, Safari 18+)
npm run build    # checagem de tipos com tsc --noEmit + build do vite -> dist/
npm run preview  # pré-visualiza o build de produção
```

Não há **suite de testes automatizada** em nenhum lugar deste repositório.
"Verificação" para trabalho visual significa:
- `npm run build` passa (`tsc --noEmit` limpo + bundle do Vite com sucesso) para
  `webgpu-earth`.
- Os arquivos `.html` na raiz não têm etapa de build/lint — abra-os direto no
  navegador para conferir a renderização (precisam de WebGL/WebGPU; alguns efeitos
  não são verificáveis sem interface gráfica).
- Este ambiente **não tem GPU**, então a saída WebGPU/WebGL não pode ser confirmada
  visualmente aqui — o código é apenas checado de sintaxe/tipos. Diga isso
  explicitamente em vez de afirmar que um resultado visual funciona.

## Deploy

GitHub Pages, via `.github/workflows/pages.yml`, disparado a cada push para `main`:
1. Builda `webgpu-earth` (`npm ci && npm run build`).
2. Copia `webgpu-earth/dist/` para `./webgpu/` na raiz do site.
3. Publica toda a raiz do repositório (incluindo os arquivos `.html` independentes)
   como artefato do Pages.

Ou seja, tanto os arquivos HTML da raiz quanto o build do `webgpu-earth` vão para
o mesmo site em produção.

## Convenções

- **Nada de texturas/assets externos em `webgpu-earth`** — tudo (terreno, nuvens,
  atmosfera) é gerado proceduralmente na GPU via shaders WGSL de compute/fragment.
  Mantenha esse padrão em qualquer trabalho novo de renderização (sem novas
  dependências de textura binária).
- **Uma responsabilidade por arquivo** em `webgpu-earth/src/` — passes
  (`src/passes/*.ts`), geometria, camadas de dados e orquestração do pipeline
  (`src/pipeline/RenderGraph.ts`) ficam separados; siga esse layout para novos passes.
- TypeScript em modo `strict`, com `noUnusedLocals`/`noUnusedParameters`/
  `noImplicitOverride` habilitados (`webgpu-earth/tsconfig.json`) — código novo
  precisa satisfazer essas regras.
- O globo em Three.js (`takeda-globe-3d.html`) é o **fallback WebGL** para
  navegadores sem WebGPU; mantenha-o funcionando de forma independente do
  `webgpu-earth`.
- Os arquivos `.html` da raiz são arquivos únicos e autocontidos (sem bundler) —
  mantenha edições inline em vez de introduzir uma etapa de build.
- Ao editar as planilhas `.xlsx`, use a skill `xlsx` em vez de tratá-las como
  arquivos binários simples.

## Branches

O desenvolvimento acontece em branches de feature (ex.: `claude/insight-pfvvaz`)
mescladas na `main` via PR; um push direto na `main` dispara o deploy do Pages
acima, então evite fazer push direto nela a menos que essa seja a intenção.
