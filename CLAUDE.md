# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

A mixed collection of deliverables for Takeda pharma events operations — there is
no single application or framework tying everything together:

- **Standalone HTML visualizations** at the repo root (no build step, open directly
  in a browser): `index.html` (redirects to the WorldWind globe), `takeda-worldwind.html`
  (NASA WorldWind build), `takeda-globe-3d.html` (Three.js/WebGL fallback globe),
  `flight_tracker.html`, `executive_brief.html`.
- **`webgpu-earth/`** — a real TypeScript + Vite + raw WebGPU/WGSL sub-project (the
  "cinematic Earth" globe). This is the only part of the repo with an actual build
  pipeline. See `webgpu-earth/README.md` for the full rendering architecture.
- **Excel workbooks** (`*.xlsx`) — event operations / financial control workbooks
  (`Central_de_Controle_Eventos_Takeda.xlsx`, `Pharma_Events_Operations_Enterprise.xlsx`,
  `Takeda_Events_2026_Enterprise.xlsx`). Treat these as data deliverables, not code —
  use the `xlsx` skill when editing them.
- **`Takeda_PO_Email_Flow.zip`** — a Power Automate flow export (billing email → PO
  automation).
- **`RENDERING_UPGRADE.md`** — dossier documenting the Three.js globe's rendering
  overhaul (Phases 1–11); read this before touching `takeda-globe-3d.html`.

## Build / dev / test commands

Only `webgpu-earth/` has a build step. Run these from inside `webgpu-earth/`:

```bash
npm install
npm run dev      # Vite dev server at http://localhost:5173 (Chrome/Edge 113+, Safari 18+)
npm run build    # tsc --noEmit type-check + vite build -> dist/
npm run preview  # preview the production build
```

There is **no automated test suite** anywhere in this repo. "Verification" for
visual work means:
- `npm run build` passes (`tsc --noEmit` clean + Vite bundle succeeds) for `webgpu-earth`.
- Root-level `.html` files have no build/lint step — open them directly in a browser
  to check they render (they need WebGL/WebGPU; some effects are unverifiable headless).
- This environment has **no GPU**, so WebGPU/WebGL output cannot be visually confirmed
  here — code is syntax/type-checked only. Say so explicitly rather than claiming a
  visual result works.

## Deployment

GitHub Pages, via `.github/workflows/pages.yml`, triggered on push to `main`:
1. Builds `webgpu-earth` (`npm ci && npm run build`).
2. Copies `webgpu-earth/dist/` into `./webgpu/` at the site root.
3. Publishes the whole repo root (including the standalone `.html` files) as the
   Pages artifact.

So both the root HTML files and the `webgpu-earth` build ship to the same live site.

## Conventions

- **No textures/external assets in `webgpu-earth`** — everything (terrain, clouds,
  atmosphere) is generated procedurally on the GPU via WGSL compute/fragment shaders.
  Keep new rendering work consistent with this (no new binary texture dependencies).
- **One responsibility per file** in `webgpu-earth/src/` — passes
  (`src/passes/*.ts`), geometry, data layers, and pipeline orchestration
  (`src/pipeline/RenderGraph.ts`) are kept separate; follow this layout for new passes.
- TypeScript is `strict`, with `noUnusedLocals`/`noUnusedParameters`/`noImplicitOverride`
  enabled (`webgpu-earth/tsconfig.json`) — new code must satisfy these.
- The Three.js globe (`takeda-globe-3d.html`) is the **WebGL fallback** for browsers
  without WebGPU; keep it functioning independently of `webgpu-earth`.
- Root `.html` files are self-contained single files (no bundler) — keep any edits
  to them inline rather than introducing a build step.
- When editing the `.xlsx` workbooks, use the `xlsx` skill rather than treating them
  as plain binary files.

## Branching

Development happens on feature branches (e.g. `claude/insight-pfvvaz`) merged into
`main` via PR; pushing to `main` triggers the Pages deploy above, so avoid pushing
directly to `main` unless that's the intent.
