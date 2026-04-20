# Measurement: hand-authored vs. GSS-measured bindings

**Run date:** 2026-04-20. **Instrument:** `Get-Site-Styles` (local, `src/semantic-bindings.ts:createBindings`) via `npm run start -- --url <URL> --semantic-analysis --format shadcn`. **Raw outputs:** committed at `experiments/bungee-pro/gss-bindings.json` and `experiments/thefirestore/gss-bindings.json`.

---

## Why this file exists

The bungee-pro and thefirestore experiments originally compared role-binding confidence using hand-entered numbers. This was explicitly flagged in every FINDINGS document as "directional, not empirical." Running DCP-aligned auto-mapping (GSS's `createBindings`, which uses the same 17-role `SemanticColorRole` vocabulary and same `CONTRACT_VERSION = '0.1.0'` as DCP) against both sites is the empirical test.

**The measurement falsifies the strong form of the Webflow-cooperative-sites hypothesis.**

---

## Summary table

| | bungee-pro (Webflow, semantic vars) | thefirestore (Stencil, no semantic vars) |
|---|---|---|
| **Hand-authored roles bound** | 7 | 7 |
| **Hand mean confidence** | 0.78 | 0.72 |
| **Hand max confidence** | 0.95 | 0.90 |
| **Hand ≥0.85** | 4 | 3 |
| **GSS roles bound** | 12 | 14 |
| **GSS mean confidence** | **0.69** | **0.76** |
| **GSS max confidence** | 0.76 | 0.84 |
| **GSS ≥0.85** | 0 | 0 |
| **GSS autoBound** | 0 | 0 |
| **GSS unmapped DCP roles** | 2 (`bg.default`, `text.primary`) | 0 |

## Headline

**GSS assigns higher measured confidence to thefirestore than to bungee-pro** — the opposite direction from the hypothesis. GSS also leaves two DCP roles **unmapped on bungee-pro** (`bg.default` and `text.primary`, despite bungee-pro's author-declared `--colors--black` and `body { background: #fff }`) and **zero unmapped on thefirestore**.

By GSS's own threshold, **neither site crosses auto-bind confidence on any role** (`autoBound: 0` on both). Everything lands in `suggested` or `uncertain`.

## What this means for the hypothesis

The Webflow-cooperative-sites hypothesis had two forms:

### Strong form (previously written in FINDINGS)
*"Sites with author-declared semantic CSS variables produce higher auto-mapper confidence than sites without them."*

**Falsified.** GSS confidence on bungee-pro (semantic vars present) is *lower* than on thefirestore (semantic vars absent), both in mean and max. The hand-entered numbers that originally suggested the hypothesis held were artifacts of the author's own scale — GSS's calibration is more conservative and inverts the ranking.

### Weak form (defensible)
*"Sites with author-declared semantic CSS variables are easier for a **human** mapper to bind because the variable names provide direct provenance."*

**Still plausible, but not tested here.** The hand-authored numbers reflect human mapping, which *did* rely on bungee-pro's semantic variable names (my 0.95 on `text.primary` came from reading `body { color: var(--colors--black) }` — a fact the algorithmic mapper doesn't use). GSS doesn't read variable names for role assignment; it uses frequency, saturation, lightness, and CSS-token naming patterns (`--primary`, `--secondary`, `--border`, `--destructive`). On frequency/HSL grounds, thefirestore's larger, more saturation-differentiated palette produces more confident assignments.

### Refinement
There are two different operations with different failure modes:

- **Human mapping** benefits from semantic author intent visible in source (variable names, selector names, comments).
- **Algorithmic mapping** as currently implemented in GSS benefits from *palette richness and saturation separation*, regardless of author naming.

The original hypothesis conflated these. Splitting them produces a cleaner claim worth re-testing: *how does a human-plus-algorithm workflow compare across the two encoding styles?*

## Per-role disagreements worth noting

### bungee-pro

| Role | Hand | GSS | Notes |
|---|---|---|---|
| `bg.default` | `#ffffff` (0.95) | *unmapped* | GSS couldn't find a confident enough `--background` or body-bg signal |
| `text.primary` | `#1e1e1e` (0.95) | *unmapped* | GSS bound `text.muted: #222` instead but left `text.primary` empty |
| `accent.primary` | *(not bound)* | `#0082f3` (0.76) | GSS found a blue I'd ignored; came from a `--primary` token in the stylesheet |
| `bg.muted` | `#eef0f6` (0.65) | `#d0d8e4` (0.65) | Same confidence, different hex — human used `--colors--light-gray` provenance, GSS used lightness split |
| `border.default` | `#d0d8e4` (0.9) | `#ddd` (0.67) | Human used `--colors--border` provenance, GSS picked a different gray |
| `intent.success` / `intent.warning` / `intent.info` | *(not bound)* | `#cfffb2` / `#fedca6` / `#3898ec` (0.69-0.72) | GSS found hue-range matches human skipped |

### thefirestore

| Role | Hand | GSS | Notes |
|---|---|---|---|
| `accent.primary` | `#c12126` (brand red, 0.85) | `#f3ca3e` (gold, 0.81) | **Direct disagreement.** Human bound to the site's most-used color. GSS bound to a `--primary` token in the stylesheet which happens to point at the gold accent (`.button--accent`). The brand red got `accent.secondary` from GSS. |
| `intent.danger` | `#c12126` (0.4, flagged as colliding with accent.primary) | `#9b090d` (0.84) | GSS bound to the *darker hover-red* (`.button--primary:hover`), avoiding the collision the human registry documented |
| `bg.default` | `#ffffff` (0.9) | `rgba(0,0,0,0)` (0.73) | GSS bound to `transparent` — likely picked up `body { background-color: transparent }` in a wrapper rule |
| `text.primary` | *(not bound)* | `#1a1919` (0.75) | GSS correctly bound; human skipped |

Several role assignments are genuinely contested — this is the "role interpretation" layer of judgment the live-site-comparison document names as Layer A judgment work. A human reading CSS provenance makes different calls than an algorithmic mapper. Neither is obviously right.

## Implications for the experiment narrative

Updates made to the committed artifacts:

1. **The thefirestore FINDINGS §3 section** (already softened in a prior sniff-test pass from "Tested. The hypothesis holds." to "Observation consistent with the hypothesis. Not empirically tested.") needs a further pass — the measurement shows the direction it *did* predict was wrong.
2. **The live-site-comparison.md thesis paragraph** should reflect the refinement: semantic CSS vars help *human* mapping, not algorithmic mapping in GSS's current form.
3. **The per-experiment verdict blocks** should include a link to this file and note "measured GSS confidence: X; see MEASUREMENT.md."

## What this experiment did not test

- Whether a mapper that *does* use semantic variable names (not just values) would recover the advantage. GSS uses the DCP contract but not author-declared var-name-to-role hints.
- Whether the human mapping or the GSS mapping is closer to "what the site designer intended." Neither the human nor GSS has access to that ground truth.
- Multi-page evidence aggregation — GSS runs on a single URL.
- Whether DCP's own `AutoMapper` class (not GSS) would produce different results. `packages/dcp-toolkit/src/tokens/autoMapper.js` uses overlapping but distinct heuristics; running it against the same token inventories is still-pending next-experiment work.

## Files

- `experiments/bungee-pro/gss-bindings.json` — raw GSS shadcn.analysis.json for bungee-pro
- `experiments/thefirestore/gss-bindings.json` — raw GSS shadcn.analysis.json for thefirestore
- `experiments/MEASUREMENT.md` — this file
