---
file: STRUCTURE.md
role_in_pack: layout_and_composition
answers_question: "What is it made of?"
hostname: vercel.com
source_url: https://vercel.com
readiness: weak
---

# STRUCTURE.md — vercel.com

> **This is the weak document in the pack.** The pipeline cannot currently infer page structure from rendered CSS alone. What you'll find here is the *raw layout material* (spacing buckets, radii, responsive-pattern classification) and explicit statements of what is *not* recoverable. If you need actual page structure — sections in order, container patterns, hierarchy, full-bleed vs contained — **examine the live site directly**. This file is known-insufficient for reconstruction.

## Layout material (raw — classified)

**Spacing scale (≤64px, ≤4rem/em)** — component-level candidates:
`10px`, `6px`, `4px`, `12px`, `8px`, `2px`, `16px`, `3.5px`, `3px`, `48px`, `24px`, `22px`, `20px`, `2rem`, `0px`, `1rem`, `40px`, `11px`, `56px`, `5px`

**Section-level spacing:**
`140px`, `160px`, `70px`, `80px`, `72px`, `120px`, `90px`, `135px`, `768px`, `75px`, `69px`, `6rem`, `5rem`, `7rem`, `9rem`, `84px`, `8rem`, `13rem`, `16rem`, `110px`

**Layout constraints (vw/vh/%):**
`50vw`, `5.6%`, `10%`, `120vh`, `3%`, `2.5%`, `20%`, `6%`, `16%`, `15%`, `100vw`, `5%`, `50%`, `141.421%`

**Border radii (absolute):** `4px`, `9999px`, `2.5px`, `6px`, `10px`, `99px`, `8px`, `12px`, `5px`, `24px`, `14px`, `2px`
**Pill / circle radii:** `100%`, `50%`, `25%`

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