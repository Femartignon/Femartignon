# Vídeo de abertura — Encontro Infield 2026 · "Futuro Infield em Foco" (Takeda)

Tradução em vídeo do **Roteiro V2** (xlsx do usuário), 2:25, 1920×1080, HyperFrames.

## Arquitetura
- `index.html` — composição única (GSAP, timeline pausada). Tempos do roteiro em `CUTS`, `CAPS`, `BLOCKS` e na timeline. `REVIEW = false` remove legendas da locução, chips de bloco e tags de footage.
- `tools/audio.py` — sintetiza `assets/trilha.wav` (bateria, surdo, cavaquinho, apito, silêncios e convenções nos tempos do roteiro). `npm run audio`. O wav é gerado (no .gitignore).
- `assets/` — GSAP, fontes (Gotham Bold, Montserrat, Caveat p/ manuscrito), logos Infield/Takeda.

## Limites conhecidos (não resolvidos)
- **Footage:** os links Envato/Magnific são pagos/inacessíveis aqui. As "placas" são ilustrações-substitutas rotuladas ("Footage · …"). Trocar cada `<div class="plate">` por `<video>` licenciado.
- **Locução:** não há voz do locutor. Legendas mostram o texto; para incluir a voz, gravar `assets/locucao.wav` e adicionar `<audio>` (track-index 1).
- **KV:** não havia arquivo do KV; serpentina, pontos, Pão de Açúcar e pessoas line-art são aproximações em SVG. Substituir pelo KV oficial.
- Tempos das falas são estimados (sem áudio do locutor): reajustar `CAPS` e cues após gravar.

## Render
`npm run check` → `npm run render` (mp4 em `renders/`).
