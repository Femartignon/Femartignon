---
name: TAKEDA Global Intelligence Grid
description: Mission-control intelligence for Takeda global event operations — a glass-cockpit HUD over a photoreal Earth.
colors:
  bg: "#03060d"
  panel: "rgba(8,14,26,0.62)"
  panel-solid: "#070c16"
  border: "rgba(120,170,255,0.16)"
  border-bright: "rgba(140,190,255,0.42)"
  text: "#e8f0ff"
  text-dim: "#8aa0c6"
  text-faint: "#516787"
  accent: "#E1251B"
  accent-2: "#ff5a4d"
  accent-deep: "#a30f08"
  cyan: "#39d6ff"
  cyan-soft: "#7fe9ff"
  cyan-deep: "#2aa6cc"
  amber: "#ffb547"
  green: "#3ee08a"
  violet: "#9d7bff"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-1px"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "3px"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "1.5px"
  readout:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "2.2px"
rounded:
  xs: "2px"
  sm: "8px"
  md: "9px"
  lg: "14px"
  pill: "20px"
  full: "50%"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "15px"
components:
  button-instrument:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text-dim}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    typography: "{typography.label}"
  button-instrument-hover:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  button-instrument-active:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.panel-solid}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  status-pill:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text-dim}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    typography: "{typography.label}"
  hud-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "13px 15px"
---

# Design System: TAKEDA Global Intelligence Grid

## 1. Overview

**Creative North Star: "The Glass Cockpit"**

This is avionics for event operations. The interface behaves like the glass
cockpit of a modern aircraft: a near-black cabin so the outside view (a
photoreal Earth) reads first, with precise, glowing glass instruments arranged
at the edges. Every panel is a readout, every label is monospaced telemetry,
and nothing decorates — if an element isn't reporting a fact, it isn't on
screen. The operator scans instruments, not graphics.

Authority comes from fidelity. The Earth is real Blue Marble albedo with real
relief; the numbers are real money (≈R$ 31.5M across ~488 payments); the status
lights mean exactly what they say. Cyan is the telemetry voice — calm, ambient,
everywhere the system is just *reporting*. Takeda red is the identity-and-alert
voice — rare, reserved for the brand mark and for things that demand attention.
The two never blur together.

This system explicitly rejects **the Three.js demo / toy**: no neon palettes,
no heavy scanlines, no gimmick glow, no "look what the GPU can do." Spectacle is
permitted only when it sharpens comprehension of geography, scale, or
concentration. It also rejects cookie-cutter SaaS card grids and gradient
hero-metrics. The bar is NASA SVS, Cesium, SpaceX Mission Control, Palantir
Gotham — enterprise intelligence software, not a tech demo.

**Key Characteristics:**
- Deep-space ground (`#03060d`) so the map and instruments carry all the light.
- Translucent glass panels (`backdrop-filter: blur(14px)`) floating over the view.
- Monospaced, uppercase, letter-spaced labels — telemetry, not prose.
- Cyan = ambient report; Takeda red = identity + alert. Strict separation.
- Glow as the only "elevation": light, never drop-shadow boxes.

## 2. Colors

A near-black cabin lit by two voices: ambient cyan telemetry and rare Takeda-red
signal, over a deep-space ground.

### Primary
- **Takeda Red** (#E1251B): The identity-and-alert voice. Carries the brand mark
  (gradient to **Oxblood Deep** #a30f08) and is reserved for alerts, critical
  status, and the logo. Its rarity is what makes it read as "attention."
- **Telemetry Cyan** (#39d6ff): The system's ambient working color. Active
  instrument states, focused readouts, selection. Pairs with **Cyan Soft**
  (#7fe9ff) for links/hover and **Cyan Deep** (#2aa6cc) as the active-gradient
  terminus.

### Secondary
- **Signal Amber** (#ffb547): Caution / pending / "watch this" status.
- **Signal Green** (#3ee08a): Nominal / healthy / on-track status.
- **Signal Violet** (#9d7bff): Secondary categorical accent for data layers.

### Neutral
- **Deep Space** (#03060d): The body ground. Everything sits on this.
- **Panel Glass** (rgba(8,14,26,0.62)) / **Panel Solid** (#070c16): Instrument
  surfaces, translucent over the map or opaque where legibility demands.
- **Instrument Ink** (#e8f0ff): Primary readout text.
- **Dim Ink** (#8aa0c6) / **Faint Ink** (#516787): Labels, secondary data, and
  the quietest metadata respectively.
- **Hairline** (rgba(120,170,255,0.16)) / **Hairline Bright**
  (rgba(140,190,255,0.42)): Panel borders at rest and on hover/focus.

### Named Rules
**The Two-Voice Rule.** Cyan reports; red alerts. Cyan is ambient and may appear
across many instruments at once; Takeda red is rare and reserved for identity
and genuine attention. Never use red for ambient chrome, and never use cyan to
signal an alert. If both are fighting for the same element, the design is wrong.

**The Status-Never-Hue-Alone Rule.** Amber, green, and red status must always
pair with a label, icon, or shape — never color alone. The faróis must survive a
color-blind operator and a grayscale print.

## 3. Typography

**Display / UI Font:** Inter (with system-ui, sans-serif)
**Label / Readout Font:** JetBrains Mono (with ui-monospace, monospace)

**Character:** A disciplined two-family system on a contrast axis: humanist sans
for anything a human reads as language, monospaced for anything the machine
reports. The mono carries the cockpit voice — wide letter-spacing, uppercase,
small — so data reads as instrumentation, not copy.

### Hierarchy
- **Display** (Inter 800, 19px, -1px tracking): The brand mark glyph and the
  largest HUD identifiers. Tight, confident, rare.
- **Title** (Inter 700, 14px, 3px tracking): Brand name and primary panel
  identity. Wide tracking gives it presence without size.
- **Body** (Inter 500, 14px/1.6): The little running prose that exists (status
  descriptions, tooltips). Cap at 65–75ch on the rare long-form surface.
- **Readout** (JetBrains Mono 700, 11px, 2.2px tracking, uppercase): Card
  headers and primary telemetry values, in Cyan Soft.
- **Label** (JetBrains Mono 600, 10px, 1.5px tracking, uppercase): Buttons,
  pills, tags, axis ticks — the pervasive instrument labeling.

### Named Rules
**The Telemetry Rule.** If it's a label, status, coordinate, count, or control,
it's monospaced, uppercase, and letter-spaced. If it's something a person reads
as a sentence, it's Inter. Never set running prose in the mono; never set a
readout in the sans.

## 4. Elevation

Flat by physics, lit by glow. There are no drop-shadow "cards" stacked on a
page. Depth comes from two things: translucency (`backdrop-filter: blur(14px)`
lets the Earth show through panels, placing them in space above the view) and
**glow** as the response to state. A resting instrument is a hairline-bordered
glass rectangle; an active or hovered one gains a cyan glow. The only literal
box-shadow in the system is the deep ambient lift under the brand mark and the
modal-scale panels (`0 20px 60px rgba(0,0,0,.5)` with an inset top highlight),
which reads as "lifted off the cabin floor," not as a Material card.

### Shadow Vocabulary
- **Telemetry Glow** (`box-shadow: 0 0 24px rgba(57,214,255,0.35)`): The default
  hover/active lift. Light, not shadow.
- **Active Glow** (`box-shadow: 0 0 18px rgba(57,214,255,0.5)`): A pressed/active
  control, paired with the cyan-fill.
- **Mark Glow** (`box-shadow: 0 0 20px rgba(225,37,27,0.55), inset 0 0 12px rgba(255,255,255,0.15)`):
  The Takeda-red brand mark only.
- **Cabin Lift** (`box-shadow: 0 20px 60px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05)`):
  Modal / primary floating panels.

### Named Rules
**The Glow-Not-Shadow Rule.** Elevation is expressed as emitted light (glow),
never as a dark drop shadow on a light card. If you reach for a soft gray
`box-shadow` to lift an element, you're designing a SaaS card, not a cockpit
instrument. Use a cyan glow or raise the border to Hairline Bright instead.

## 5. Components

### Buttons
- **Shape:** Rounded instrument key (9px, `{rounded.md}`).
- **Instrument (default):** Mono label 600/10.5px, 1.5px tracking, uppercase,
  Dim Ink on Panel Glass with a `blur(14px)` backdrop and a hairline border;
  `10px 14px` padding; inline 13px SVG icon, 8px gap.
- **Hover:** Text brightens to Instrument Ink, border goes Hairline Bright, and
  the control gains Telemetry Glow.
- **Active:** Fills with a left-to-right cyan gradient (`var(--cyan)` →
  `#2aa6cc`), text flips to near-black (#02121a), border goes transparent,
  Active Glow on. This is the one place cyan becomes a surface.

### Pills / Status
- **Style:** Mono 600/10px, 1.5px tracking, Dim Ink on Panel Glass, hairline
  border, `blur(14px)` backdrop, `8px 12px` padding, 8px radius, 7px gap with a
  leading status dot.
- **State:** The dot carries the signal color (green/amber/red/cyan); the label
  carries the meaning. Collapses to a dot-only chip at narrow widths.

### Cards / HUD Panels
- **Corner Style:** 14px (`{rounded.lg}`).
- **Background:** Panel Glass with `backdrop-filter: blur(18px) saturate(1.2)`.
- **Border:** Hairline at rest.
- **Header:** A flex row — Readout title in Cyan Soft (mono 700/11px, 2.2px
  tracking, uppercase) on the left, a Dim Ink mono tag on the right.
- **Body padding:** `13px 15px`. The panel floats over the map; it does not sit
  on a page.

### Navigation / Brand
- **Brand mark:** A 34px rounded-square (9px) with a Takeda-red gradient
  (`135deg, #E1251B → #a30f08`), Mark Glow, white 800-weight glyph, plus a faint
  red ring inset. The brand name sits beside it: Inter 700, 3px tracking, with
  the trailing word in Accent-2 (#ff5a4d). A mono sub-label (2.5px tracking)
  rides underneath on wide layouts and hides on narrow ones.

### Signature: The HUD Layer
The interface is a fixed `pointer-events: none` HUD whose children re-enable
pointer events — instruments float at the viewport edges over a full-bleed
WebGL/WebGPU Earth. New surfaces should join this layer, not replace the map
with a page. The map is the product; the instruments report on it.

## 6. Do's and Don'ts

### Do:
- **Do** keep Deep Space (#03060d) as the ground and let the Earth and cyan
  telemetry carry the light.
- **Do** set every label, status, control, and coordinate in JetBrains Mono —
  uppercase, letter-spaced (≥1.5px), small.
- **Do** express elevation as glow (Telemetry Glow `0 0 24px rgba(57,214,255,.35)`),
  not as gray drop shadows.
- **Do** reserve Takeda Red (#E1251B) for the brand mark and genuine alerts; let
  cyan do the ambient reporting.
- **Do** pair every status color with a label, icon, or shape so faróis survive
  color-blindness and grayscale.
- **Do** float new instruments on the fixed HUD layer over the map.

### Don't:
- **Don't** ship the **Three.js demo / toy** look: no neon palettes, heavy
  scanlines, gimmick glow, or "look what the GPU can do." Spectacle must serve
  comprehension or it's cut.
- **Don't** use Takeda red as ambient chrome, or cyan to signal an alert — that
  breaks the Two-Voice Rule.
- **Don't** lift elements with soft gray `box-shadow` cards; that's a SaaS
  dashboard, not a cockpit. Use glow or a brighter hairline.
- **Don't** build cookie-cutter card grids or gradient hero-metrics.
- **Don't** set running prose in the mono font, or telemetry/readouts in Inter.
- **Don't** signal status with color alone.
