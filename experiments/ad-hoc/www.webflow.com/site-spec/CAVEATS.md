---
file: CAVEATS.md
role_in_pack: truth_boundaries
answers_question: "What don't we know?"
hostname: www.webflow.com
substrate_score: 0.87
refusal_threshold: 0.55
---

# CAVEATS.md — www.webflow.com

> The truth-boundaries doc. Read this before treating anything in the rest of the pack as canonical. Prose is sticky — if a claim sounds confident elsewhere in the pack but contradicts something here, this file wins.

## Substrate

- **Score:** 0.87 / 1.0 (above-refusal-threshold: true)

| Dimension | Value | Weight | Detail |
|---|---|---|---|
| `roleCoverage` | 0.93 | 0.45 | 13 / 14 DCP roles bound |
| `colorCandidateDepth` | 1.00 | 0.20 | 50 usable color candidates |
| `fontSizeCoverage` | 1.00 | 0.15 | 39 font-size tokens |
| `spacingCoverage` | 1.00 | 0.10 | 59 spacing tokens (scale+section) |
| `responsiveSignal` | 0.00 | 0.10 | no clamp() or @media rules observed |

## Binding confidence distribution

- **13** roles bound. High-saliency (≥0.85): **0**. Medium (0.65–0.85): **12**. Low (<0.65): **1**.
- **1** DCP roles unmapped: `text.primary`

## ⚠ Low-validity bindings (saliency and validity disagree)

The extractor found these, but rule-based validity checks flag them as likely-wrong for the role regardless of how often they were observed. Treat as extraction noise, not as canonical design decisions.

- `bg.default` = `rgba(0,0,0,.5)` — validity **0.25**. Failed rules:
  - *surface-role-needs-opaque*: role bg.*/border.* expects opaque fill; observed alpha 0.50
- `bg.elevated` = `rgba(255, 255, 255, 0.12)` — validity **0.25**. Failed rules:
  - *surface-role-needs-opaque*: role bg.*/border.* expects opaque fill; observed alpha 0.12

## Named gaps

What this pipeline does **not** produce, and won't until research problems are addressed:

- **Typography hierarchy.** Raw font-size tokens appear in DESIGN.md §3, but H1/H2/H3 assignment is not recovered.
- **Component geometry.** Button padding, card radius-per-variant, input height-per-state — not extractable from CSS alone.
- **Layout composition.** Section ordering, container patterns, page shells, route-level composition — see STRUCTURE.md for the gap list.
- **Interaction & motion.** Hover, transitions, animations — not captured.
- **Multi-page coverage.** Homepage-only sampling. A site's dashboard, checkout, and marketing surfaces may use materially different token subsets.

## Calibration note

Get-Site-Styles assigns saliency via frequency, saturation, and lightness heuristics. Validity is applied on top as a rule-based prior (see `experiments/lib/build-design-md.mjs:COLOR_VALIDITY_RULES`). Neither score is calibrated against a ground-truth corpus. Treat numbers as *relative within a run*, not *absolute across the web*.