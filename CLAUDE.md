# CLAUDE.md

## Design Context

This project uses **impeccable** for design work. Two root files are the source
of truth — read them before building or changing any UI:

- **`PRODUCT.md`** — strategy. Register: **product** (internal intelligence
  tool). Users: Takeda **event-ops / finance operators**. Personality:
  **mission-control intelligence** (NASA SVS / Cesium / SpaceX / Palantir
  caliber). Hard anti-reference: **the Three.js demo / toy look**.
- **`DESIGN.md`** — the visual system. North Star: **"The Glass Cockpit."**
  Deep-space ground (`#03060d`), Telemetry Cyan (`#39d6ff`) for ambient
  reporting, Takeda Red (`#E1251B`) reserved for identity + alerts, Inter +
  JetBrains Mono, glass panels, **glow not drop-shadow** for elevation. Token
  primitives live in its YAML frontmatter; `.impeccable/design.json` carries the
  extended tokens and live component snippets.

Load-bearing rules (full versions in `DESIGN.md`): **Two-Voice** (cyan reports,
red alerts — never blur them), **Telemetry** (labels/readouts are mono +
uppercase; prose is Inter), **Glow-Not-Shadow**, **Status-Never-Hue-Alone**.

To work on the UI, invoke `/impeccable <command>` (e.g. `audit`, `critique`,
`polish`, `live`). Each command reads `PRODUCT.md` and `DESIGN.md` first.
