---
file: STRUCTURE.md
role_in_pack: layout_and_composition
answers_question: "What is it made of?"
hostname: thefirestore.com
source_url: http://thefirestore.com
readiness: weak
---

# STRUCTURE.md — thefirestore.com

> **This is the weak document in the pack.** The pipeline cannot currently infer page structure from rendered CSS alone. What you'll find here is the *raw layout material* (spacing buckets, radii, responsive-pattern classification) and explicit statements of what is *not* recoverable. If you need actual page structure — sections in order, container patterns, hierarchy, full-bleed vs contained — **examine the live site directly**. This file is known-insufficient for reconstruction.

## Layout material (raw — classified)

**Spacing scale (≤64px, ≤4rem/em)** — component-level candidates:
`1em`, `40px`, `12px`, `1px`, `15px`, `8px`, `20px`, `2px`, `44px`, `1.5rem`, `2rem`, `1.9375rem`, `1.2rem`, `1.15rem`, `1.0625rem`, `1.375rem`, `1rem`, `2.25rem`, `5px`, `1.875rem`

**Section-level spacing:**
`10000px`, `4.5rem`, `13.4375rem`, `6rem`, `5.15625rem`, `264px`, `528px`, `139px`, `250px`, `100px`, `120px`, `80px`, `4.125rem`, `4.75rem`, `5.1875rem`, `7.5rem`

**Layout constraints (vw/vh/%):**
`50%`, `131.8%`, `25%`, `33.33333%`, `2%`, `100%`, `75%`, `3%`, `67.5%`, `56.34%`, `6%`, `10%`, `131.57895%`, `5%`

**Border radii (absolute):** `3px`, `1px`, `9999px`, `5px`, `6px`, `4px`, `.875rem`, `1.75rem`, `1.25003rem`, `2.5rem`, `.5rem`, `.125em`
**Pill / circle radii:** `50%`, `100%`

## Responsive pattern (classified, not enumerated)

- `clamp()` usage: 0×
- `@media` queries: 0 rules

**Pattern:** indeterminate from available evidence.

## What this file does NOT contain

- **Section ordering.** Which sections appear, in what order, hero-vs-content-vs-footer relationships — not inferred.
- **Container/grid patterns.** Full-bleed vs contained, grid gutter conventions, column counts — not recovered.
- **Component hierarchy.** Which components nest inside which — not extractable from CSS alone.
- **Component geometry.** Button padding, card radius-per-variant, input heights — not recoverable without DOM-level analysis.
- **Route-level composition.** How layout changes across routes — homepage-only sampling (see CAVEATS.md § coverage).

These gaps are the Layer-B / Layer-C research problems documented in `experiments/live-site-comparison.md`. They are not "not yet implemented" — they are open problems for which the rendered-surface evidence is structurally insufficient.

**If you are an agent reconstructing this site, use this file for raw spacing/radii/responsive-pattern hints, and use the live site or a screenshot for structural decisions. Do not trust this file to tell you the shape of a page.**