# Live-site DCP experiments — comparative verdict

**Scope:** Two hand-authored experiments running DCP's IR + transpile + bindings pipeline against structurally different live sites. This document is the verdict surface — the per-experiment folders are the evidence.

---

## Thesis (scoped, refined after measurement)

**DCP can produce reviewable live-site registries across materially different site encodings. Output quality depends on the *operation* and on what semantic signal the operation can read — not on any single site property.**

**Human mapping** benefits from author-declared semantic signal (CSS custom property names, selector names, comments). **Algorithmic mapping** (as implemented in Get-Site-Styles, measured 2026-04-20) benefits from *palette richness and saturation separation* — regardless of author naming.

The earlier framing ("sites with semantic CSS vars produce higher auto-mapper confidence") was tested against GSS and did not hold — GSS scored thefirestore's stencil-with-no-semantic-vars target *higher* than bungee-pro's semantic-var-rich target. See [MEASUREMENT.md](./MEASUREMENT.md).

**The main failure mode remains canonicalization** — specifically family inference, variant grouping, and role interpretation. **These failures are not uniform across site encodings, and they are not uniform across mapping operations either.**

---

## Comparison table

| Dimension | bungee-pro.webflow.io | thefirestore.com |
|---|---|---|
| **Stack** | Webflow (modern template) | BigCommerce Stencil |
| **Semantic token signal at surface** | Yes — author-declared CSS variables (`--colors--black`, `--colors--text`, `--colors--border`) | No — raw hex values throughout; zero CSS custom property definitions |
| **High-confidence role bindings** (hand-entered, ≥0.85) | 4 of 7 | 3 of 7 |
| **GSS measured bindings** (see [MEASUREMENT.md](./MEASUREMENT.md)) | 12 bound, mean conf 0.69, max 0.76 | 14 bound, mean conf **0.76**, max 0.84 |
| **GSS `autoBound` / unmapped DCP roles** | 0 auto / 2 unmapped (`bg.default`, `text.primary`) | 0 auto / 0 unmapped |
| **Extensions captured (hand)** | 0 | 2 (`--site-brand-red-hover`, `--site-accent-gold`) |
| **Component-family inference difficulty** | Moderate — a name-plus-style clusterer would mostly succeed | Moderate-to-hard — modifier-class proliferation needs axis partitioning |
| **Variant failure family** | Merge/split ambiguity | Axis-disaggregation |
| **Observed model gap** | None | One physical hex serving two canonical roles (`#c12126` → `accent.primary` + `intent.danger`). See [MODEL-GAPS.md](./MODEL-GAPS.md). |

---

## Three-layer framework

A live-site adaptor has three distinct jobs. The experiments are readable through where each site lands on each layer.

**Layer A — token/role extraction.** Can the system recover semantic roles from rendered evidence?
**Layer B — component canonicalization.** Can the system infer stable component families from DOM/CSS residue?
**Layer C — variant-axis interpretation.** Can it infer whether observed differences are color, size, layout, state, or separate components?

| | Layer A (roles) | Layer B (families) | Layer C (axes) |
|---|---|---|---|
| **bungee-pro** | Easier — semantic vars align to contract vocabulary | Moderate — distinct selectors per component | Hard — identical declared styles force a merge-vs-split call |
| **thefirestore** | Harder — provenance-reading required for every mapping | Moderate-to-hard — `.card` base shared across surfaces | Very hard — nine `.button--*` sibling modifiers mix color, size, layout, and specialized-component axes |

A single blended "success/failure" read would lose this structure. The two sites struggle on different layers.

---

## Failure-family taxonomy

Two distinct families observed to date. This is the most reusable output of the experiments — more reusable than any single registry, because the taxonomy grows as more sites are run.

### 1. Merge/split ambiguity
Multiple encoded variants are visually or declaratively indistinguishable, so the system cannot know whether to merge or preserve them.

- **Observed on:** bungee-pro (`.button-primary` and `.button-primary-v2` have identical declared CSS)
- **Style-signature clustering outcome:** correct merge, but author intent suggests two distinct slots
- **Required judgment:** read past the CSS into usage patterns or class-name provenance

### 2. Axis-disaggregation
Sibling modifiers mix multiple orthogonal concerns (color, size, layout, specialized component) under one naming family, so the system cannot recover clean variant axes from observed structure.

- **Observed on:** thefirestore (nine `.button--*` sibling modifiers: `--primary`, `--secondary`, `--tertiary`, `--accent`, `--large`, `--small`, `--slab`, `--icon`, `--inputAction`)
- **Style-signature clustering outcome:** correctly splits on declared-style differences, but produces N independent components when the true shape is a small number of axes plus one specialized sibling
- **Required judgment:** partition the modifier set into orthogonal axes and identify outliers

If a third site is run, this list should grow.

---

## What this proves

- The live-site pipeline can run end-to-end on multiple site types using the same scripts.
- The registry and role contract are usable as a review surface for live sites — the role contract forces decisions to be legible even when they're low-confidence.
- Site encoding style materially affects output quality (directionally; not yet independently measured).
- Failure modes differ by encoding pattern.

## What this does not prove

- General reliability across the web. Two sites is not a corpus.
- Objective confidence calibration. All confidence numbers in both experiments were hand-entered during registry authoring.
- Automatic canonicalization quality. DCP's `AutoMapper` did not run in either experiment — the role bindings were authored by a human reading each site's CSS provenance.
- That Webflow is categorically easier than other stacks beyond these two observed cases.

## Confidence in takeaway

**Measured.** The hypothesis (in its strong form) has been tested by running Get-Site-Styles, which uses DCP's exact role vocabulary, against both sites on 2026-04-20. See [MEASUREMENT.md](./MEASUREMENT.md). **GSS scored thefirestore higher than bungee-pro** — the opposite of what the hand-authored confidence numbers suggested. The strong hypothesis ("semantic CSS vars produce higher algorithmic confidence") is falsified. The refined hypothesis ("semantic CSS vars help a *human* mapper") is still plausible but not directly tested here.

The remaining open empirical question is whether DCP's *own* `AutoMapper` (`packages/dcp-toolkit/src/tokens/autoMapper.js`) — which uses overlapping but distinct heuristics from GSS — produces a different ranking. That's still pending.

---

## Next experiments, in priority order

1. **Run DCP's `AutoMapper` against both sites' extracted token inventories.** GSS already ran and inverted the hypothesis; the separate question is whether DCP's native mapper produces a third ranking. Compare all three: hand / GSS / DCP-AutoMapper.
2. **Investigate why GSS left `bg.default` and `text.primary` unmapped on bungee-pro despite the site declaring both in its `--colors--*` layer.** This is a GSS-specific gap but may indicate where auto-mapping can be improved.
3. **Test a third site** — compiled-Tailwind marketing page. Three-site comparison is the right point to commit to or retire the refined ("semantic vars help humans") hypothesis.
4. **Add an axis-identification layer to AutoMapper.** Layer 3 currently targets palette-scale inference; an equivalent for BEM-modifier-class hierarchies would address the thefirestore Layer-C failure mode.

---

## Separated: what's engineering vs. research

Not all gaps surfaced by these experiments are the same kind of gap.

### Engineering (implementation work; bounded scope)
- Live-site adaptor that produces the registry shape automatically (today both registries are hand-authored)
- `AutoMapper` integration into the experiment pipeline
- Transpile output hygiene (escape-char bugs, duplicate prop destructures — see `bungee-pro/INTERNAL-NOTES.md`)
- CLI wiring for `dcp transpile` (currently a stub; real logic in `src/commands/transpile.js`)

### Research (open questions; no known solution)
- Component-boundary inference from DOM alone (why click-to-pick exists in the Chrome extension)
- Canonical-vs-incidental family judgment across multi-page evidence
- Variant-axis recovery from modifier-class hierarchies
- Product-expression vocabulary (restraint, density, warmth) — genuinely a research direction, not a missing slot

### Model (contract / binding-structure gaps)
- One physical token serving multiple semantic roles. See [MODEL-GAPS.md](./MODEL-GAPS.md).
- Interaction-state colors (hover/active/focus) have no canonical slots; today they go in `registry.siteImport.extensions` as side-data.

Keeping these three buckets separate matters because they have different kinds of resolution. Engineering is "do the work." Research is "figure out if it's possible." Model gaps are "decide what the contract should express."

---

## Index

- [bungee-pro/](./bungee-pro/) — Webflow target, merge/split failure-family example
- [thefirestore/](./thefirestore/) — Stencil target, axis-disaggregation failure-family example
- [MODEL-GAPS.md](./MODEL-GAPS.md) — contract-level gaps surfaced by these experiments
- [lib/import-bindings.mjs](./lib/import-bindings.mjs) — shared applier used by both experiments
