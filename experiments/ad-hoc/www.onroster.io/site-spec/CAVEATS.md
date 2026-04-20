---
file: CAVEATS.md
role_in_pack: truth_boundaries
answers_question: "What don't we know?"
hostname: www.onroster.io
substrate_score: 0.41
refusal_threshold: 0.55
---

# CAVEATS.md — www.onroster.io

> The truth-boundaries doc. Read this before treating anything in the rest of the pack as canonical. Prose is sticky — if a claim sounds confident elsewhere in the pack but contradicts something here, this file wins.

## Substrate

- **Score:** 0.41 / 1.0 (above-refusal-threshold: false)

| Dimension | Value | Weight | Detail |
|---|---|---|---|
| `roleCoverage` | 0.29 | 0.45 | 4 / 14 DCP roles bound — BELOW HARD FLOOR (0.5) |
| `colorCandidateDepth` | 0.70 | 0.20 | 7 usable color candidates |
| `fontSizeCoverage` | 0.25 | 0.15 | 2 font-size tokens |
| `spacingCoverage` | 1.00 | 0.10 | 47 spacing tokens (scale+section) |
| `responsiveSignal` | 0.00 | 0.10 | no clamp() or @media rules observed |

## Binding confidence distribution

- **4** roles bound. High-saliency (≥0.85): **0**. Medium (0.65–0.85): **4**. Low (<0.65): **0**.
- **10** DCP roles unmapped: `bg.default`, `bg.muted`, `bg.elevated`, `text.primary`, `border.default`, `border.muted`, `intent.danger`, `intent.warning`, `intent.success`, `intent.info`

## ⚠ Low-validity bindings (saliency and validity disagree)

The extractor found these, but rule-based validity checks flag them as likely-wrong for the role regardless of how often they were observed. Treat as extraction noise, not as canonical design decisions.

- `text.muted` = `rgba(171, 171, 171, 0.03)` — validity **0.30**. Failed rules:
  - *text-role-needs-substantial-opacity*: text role expects readable opacity; observed alpha 0.03

## Named gaps

What this pipeline does **not** produce, and won't until research problems are addressed:

- **Typography hierarchy.** Raw font-size tokens appear in DESIGN.md §3, but H1/H2/H3 assignment is not recovered.
- **Component geometry.** Button padding, card radius-per-variant, input height-per-state — not extractable from CSS alone.
- **Layout composition.** Section ordering, container patterns, page shells, route-level composition — see STRUCTURE.md for the gap list.
- **Interaction & motion.** Hover, transitions, animations — not captured.
- **Multi-page coverage.** Homepage-only sampling. A site's dashboard, checkout, and marketing surfaces may use materially different token subsets.

## Calibration note

Get-Site-Styles assigns saliency via frequency, saturation, and lightness heuristics. Validity is applied on top as a rule-based prior (see `experiments/lib/build-design-md.mjs:COLOR_VALIDITY_RULES`). Neither score is calibrated against a ground-truth corpus. Treat numbers as *relative within a run*, not *absolute across the web*.