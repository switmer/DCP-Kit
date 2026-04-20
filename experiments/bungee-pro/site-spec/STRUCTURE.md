---
file: STRUCTURE.md
role_in_pack: layout_and_composition
answers_question: "What is it made of?"
hostname: bungee-pro.webflow.io
source_url: https://bungee-pro.webflow.io
readiness: weak
---

# STRUCTURE.md — bungee-pro.webflow.io

> **This is the weak document in the pack.** The pipeline cannot currently infer page structure from rendered CSS alone. What you'll find here is the *raw layout material* (spacing buckets, radii, responsive-pattern classification) and explicit statements of what is *not* recoverable. If you need actual page structure — sections in order, container patterns, hierarchy, full-bleed vs contained — **examine the live site directly**. This file is known-insufficient for reconstruction.

## Layout material (raw — classified)

**Spacing scale (≤64px, ≤4rem/em)** — component-level candidates:
`9px`, `15px`, `6px`, `10px`, `20px`, `5px`, `40px`, `8px`, `12px`, `3px`, `11px`, `2px`, `4px`, `1px`, `1em`, `18px`, `30px`, `32px`, `16px`, `23px`

**Section-level spacing:**
`96px`, `120px`, `250px`, `160px`, `128px`, `80px`, `105px`, `286px`, `72px`, `104px`, `200px`, `112px`, `224px`, `140px`, `100px`, `134px`, `168px`, `84px`

**Layout constraints (vw/vh/%):**
`1vh`, `2vh`

**Border radii (absolute):** `3px`, `32px`, `50px`, `40px`, `80px`, `12px`, `24px`, `20px`, `10px`, `16px`
**Pill / circle radii:** `100%`, `50%`

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