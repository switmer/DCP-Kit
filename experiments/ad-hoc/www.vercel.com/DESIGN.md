---
source_url: https://www.vercel.com
hostname: www.vercel.com
extracted_at: 2026-04-20T23:22:53.565Z
extraction_mode: automatic
extractor: Get-Site-Styles (semantic-bindings v0.1.0)
synthesizer: build-design-md.mjs (DCP live-site pipeline)
substrate_quality_score: 0.87
refusal_threshold: 0.55
confidence_summary: { high: 0, medium: 9, low: 4, unmapped_dcp_roles: 1 }
---

# DESIGN.md — www.vercel.com

> Reconstruction-grade design spec extracted automatically from the rendered surface of **www.vercel.com**. Each section marks what was *observed* vs *inferred* vs *unfillable from the current instrument*. Confidence numbers are from the extraction algorithm, not the author of this file. See **§8 Ambiguity & caveats** before treating any claim as canonical.

## 1. Visual theme & atmosphere

Observed palette spans from `#111827` (L=11, most shadow) to `#fafafa` (L=98, most light), with the most saturated tone being `#111827` (S=39, H=0). This section is *synthesized* — wording is heuristic; swap to human judgment if copying to a brand doc.

## 2. Color palette & roles

*Source: DCP canonical role contract overlaid on algorithmic bindings. Each role below was chosen by Get-Site-Styles (not hand-authored). Low-confidence entries mean the instrument itself is uncertain — review before shipping.*

- **accent.primary** — `#2a8af6`  
  *Saliency:* 0.80 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: primary → accent.primary
- **accent.secondary** — `#ef44444d`  
  *Saliency:* 0.74 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: secondary → accent.secondary
- **bg.default** — `#0000000a`  
  *Saliency:* 0.72 (medium) · *Validity:* 0.25 (surface-role-needs-opaque) · *Source:* auto-mapper · *Reason:* direct: background → bg.default
- **bg.elevated** — `#ffffff1a`  
  *Saliency:* 0.64 (low) · *Validity:* 0.25 (surface-role-needs-opaque) · *Source:* auto-mapper · *Reason:* near-white (L>100, S<15) → bg.elevated
- **bg.muted** — `#f5f5f5`  
  *Saliency:* 0.53 (low) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* muted split: lightness >= 70 → bg.muted
- **border.default** — `#eaeaea`  
  *Saliency:* 0.61 (low) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: border → border.default
- **border.muted** — `#ccc`  
  *Saliency:* 0.60 (low) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: border (2nd) → border.muted
- **intent.danger** — `#e92a67`  
  *Saliency:* 0.79 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: destructive → intent.danger
- **intent.info** — `#0070f3`  
  *Saliency:* 0.76 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* hue 212 in info range (190–250)
- **intent.success** — `#14532d`  
  *Saliency:* 0.66 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* hue 144 in success range (90–160)
- **intent.warning** — `#bd5200`  
  *Saliency:* 0.75 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* hue 26 in warning range (25–55)
- **text.muted** — `#1f2937`  
  *Saliency:* 0.72 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* muted split: lightness < 70 → text.muted
- **text.onAccent** — `#141414`  
  *Saliency:* 0.80 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* contrast foreground for accent.primary (#2a8af6, L=8)

**Unmapped DCP roles** (contract slots the auto-mapper did not fill): `text.primary`. Treat these as judgment gaps, not absent-from-site.

<details><summary>shadcn-style role snapshot (same data, different vocabulary)</summary>

| var | hex | hsl |
|---|---|---|
| `--background` | `#000000` | `0 0% 0%` |
| `--card` | `#000000` | `0 0% 0%` |
| `--popover` | `#000000` | `0 0% 0%` |
| `--foreground` | `#232324` | `240 2% 14%` |
| `--card-foreground` | `#232324` | `240 2% 14%` |
| `--popover-foreground` | `#232324` | `240 2% 14%` |
| `--primary` | `#2888f6` | `212 92% 56%` |
| `--primary-foreground` | `#232324` | `240 2% 14%` |
| `--ring` | `#2888f6` | `212 92% 56%` |
| `--secondary` | `#ef4343` | `0 84% 60%` |
| `--secondary-foreground` | `#232324` | `240 2% 14%` |
| `--accent` | `#0072f5` | `212 100% 48%` |

</details>

## 3. Typography rules

Observed font-size tokens (162) in rendered CSS:

```
12px, 11px, 14px, 1rem, 16px, 13px, 24px, 72px, 64px, 48px, 32px, .875rem, .75rem, 17px, 20px, 18px, 10px, 1.25rem, 28px, 3rem, 2.25rem, 1.5rem, 42px, 26px, 22px, 15px, 1em, 56px, 40px, 1.875rem
… + 132 more
```

**Gap (research):** the instrument emits a flat list of sizes; it does not infer heading scale tiers (H1/H2/H3…), font-family-to-role mapping, line-height-to-role mapping, or letter-spacing system. Recovering typography hierarchy from rendered CSS is an unsolved Layer-B problem in this pipeline.

## 4. Layout & spacing

**Spacing scale (≤64px, ≤4rem/em)** — likely component-level:
`10px`, `6px`, `4px`, `12px`, `8px`, `2px`, `16px`, `3.5px`, `3px`, `48px`, `24px`, `22px`, `20px`, `2rem`, `0px`, `1rem`, `40px`, `11px`, `56px`, `5px`

**Section-level spacing** (larger px/rem values):
`140px`, `160px`, `70px`, `80px`, `72px`, `120px`, `90px`, `135px`, `768px`, `75px`, `69px`, `6rem`, `5rem`, `7rem`, `9rem`, `84px`, `8rem`, `13rem`, `16rem`, `110px`

**Layout constraints** (vw/vh/%, container-shaped):
`50vw`, `5.6%`, `10%`, `120vh`, `3%`, `2.5%`, `20%`, `6%`, `16%`, `15%`, `100vw`, `5%`, `50%`, `141.421%`

**Border radii** (absolute): `4px`, `9999px`, `2.5px`, `6px`, `10px`, `99px`, `8px`, `12px`, `5px`, `24px`, `14px`, `2px`
**Pill / circle radii** (percent-based): `100%`, `50%`, `25%`

**Gap (research):** the instrument does not yet infer container max-width, section spacing tiers, grid gap conventions, or route-level composition patterns. See `experiments/MODEL-GAPS.md` and `live-site-comparison.md` § template/layout inference.

## 5. Component primitives (observed)

**Button palette** (clustered from observed button elements; up to 5 distinct treatments):

| slot | hex |
|---|---|
| `--button-1` | `#cccccc` |
| `--button-2` | `#383838` |
| `--button-3` | `#404040` |
| `--button-4` | `#cccccc` |

**Layout zones** (header / footer / etc):

| zone | hex |
|---|---|
| `--header-background` | `#fafafa` |
| `--header-foreground` | `#232324` |
| `--section-background` | `#111827` |
| `--section-foreground` | `#ffffff` |

**Gap (research):** the instrument reports button *colors* but not button *geometry* (padding, border-radius, height by variant). Full component-primitive extraction requires DOM-level analysis, not CSS alone — this is the variant-axis inference problem the two baseline experiments document. See `experiments/bungee-pro/FINDINGS.md` § 2.

## 6. Responsive behavior

- `clamp()` usage: 0× in rendered CSS
- `@media` queries: 0 rules

**Pattern:** indeterminate from available evidence.

**Gap (implementation):** specific breakpoint values and fluid-scaling curves are not currently extracted into structured form. To get them, parse the `@media` rules directly from the raw CSS string attached to this output.

## 7. Do's and don'ts

*Synthesized from observed palette + token structure. Heuristic, not authoritative.*

- **Do** lean on `#2a8af6` as the primary call-to-action color (auto-mapper: `accent.primary`, conf 0.80).
- **Do** keep body text `#1f2937` on `#0000000a` surfaces — this is the declared body/background pairing.

## 8. Ambiguity & caveats

- **13 color roles** were auto-bound. Of those, **0** crossed 0.85 saliency, **9** landed in the 0.65–0.85 band, **4** below 0.65. Every binding below 0.85 warrants human review.
- **⚠ 2 binding(s) with validity < 0.5** — the extractor found these, but rule-based validity checks flag them as likely-wrong for the role regardless of how confident the extractor was:
  - `bg.default` = `#0000000a` — validity 0.25. Failed rules: *surface-role-needs-opaque* (role bg.*/border.* expects opaque fill; observed alpha 0.04)
  - `bg.elevated` = `#ffffff1a` — validity 0.25. Failed rules: *surface-role-needs-opaque* (role bg.*/border.* expects opaque fill; observed alpha 0.10)
  These are the bindings where saliency (measured) and validity (rule-based plausibility) disagree. Treat them as extraction noise to review, not as canonical design decisions.
- **1 DCP roles unmapped**: `text.primary`. Unmapped means the mapper did not find a confident candidate, not that the role is absent from the site.
- **Typography hierarchy not inferred.** Raw font-size tokens are listed in §3, but H1/H2/H3 semantic assignment is not recovered. A DCP pipeline extension for typography roles is open work.
- **Component geometry not inferred.** Button/card/input padding, radius, and height are not extracted from CSS alone. The two baseline experiments hand-authored these; automation is a Layer-B research problem.
- **Layout composition not inferred.** Section rhythm, container widths, slot structures, and route-level composition are not captured. This is the template/layout inference gap.
- **Interaction / motion not captured.** Hover states, transitions, and animations are not reconstructed.
- **Confidence calibration is heuristic.** Get-Site-Styles assigns confidence via frequency, saturation, and lightness heuristics. Its scale is conservative — by its own rubric, ≥0.85 is "auto-bind"; most real-site runs produce 0 auto-bindings. Treat the numbers as *relative*, not *absolute*.

## 9. Agent prompt guide

When handing this file to a coding agent for implementation:

- Instruct the agent to **prefer the role bindings in §2** over the raw color observations; the roles already carry semantic intent.
- Instruct the agent to **treat §3/§4 as raw materials, not a finished type/spacing system**. They need human grouping into a tiered scale.
- Instruct the agent to **read §8 before resolving ambiguity**. Low-confidence role assignments should default to conservative interpretation.
- Suggested one-liner for the agent: *"Build components using `#2a8af6` as the primary CTA, `#0000000a` as the canvas, and the role bindings in §2. For any role marked confidence < 0.65, prefer default shadcn/Tailwind equivalents and flag for review."*

---

## Appendix A — shadcn/ui theme scaffold (implementation adapter)

*This is an implementation convenience, not a source of truth. Generated by GSS from the observed palette. Use as a starting point; prefer §2 for semantic reasoning.*

```css
:root {
  --background: 0 0% 0%;
  --card: 0 0% 0%;
  --popover: 0 0% 0%;
  --foreground: 240 2% 14%;
  --card-foreground: 240 2% 14%;
  --popover-foreground: 240 2% 14%;
  --primary: 212 92% 56%;
  --primary-foreground: 240 2% 14%;
  --ring: 212 92% 56%;
  --secondary: 0 84% 60%;
  --secondary-foreground: 240 2% 14%;
  --accent: 212 100% 48%;
  --accent-foreground: 0 0% 100%;
  --muted: 215 28% 17%;
  --muted-foreground: 0 0% 100%;
  --destructive: 341 81% 54%;
  --destructive-foreground: 240 2% 14%;
  --border: 0 0% 92%;
  --input: 0 0% 92%;
  --chart-1: 212 92% 56%;
  --chart-2: 0 84% 60%;
  --chart-3: 212 100% 48%;
  --chart-4: 221 39% 11%;
  --chart-5: 215 28% 17%;
  --sidebar: hsl(0 0% 2%);
  --sidebar-foreground: 240 2% 14%;
  --sidebar-primary: 212 92% 56%;
  --sidebar-primary-foreground: 240 2% 14%;
  --sidebar-accent: hsl(0 0% 0%);
  --sidebar-accent-foreground: 240 2% 14%;
  --sidebar-border: hsl(240 100% 0%);
  --sidebar-ring: 212 92% 56%;
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --radius: 0.5rem;
  --shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
}

.dark {
  --background: 0 0% 0%;
  --card: 0 0% 0%;
  --popover: 0 0% 0%;
  --foreground: 0 0% 100%;
  --card-foreground: 0 0% 100%;
  --popover-foreground: 0 0% 100%;
  --primary: 212 92% 56%;
  --ring: 212 92% 56%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 84% 60%;
  --secondary-foreground: 240 2% 14%;
  --accent: 212 100% 48%;
  --accent-foreground: 0 0% 100%;
  --destructive: 341 81% 54%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 35%;
  --input: 0 0% 35%;
  --muted: 215 28% 25%;
  --muted-foreground: 0 0% 100%;
  --chart-1: 212 92% 56%;
  --chart-2: 0 84% 60%;
  --chart-3: 212 100% 48%;
  --chart-4: 221 39% 31%;
  --chart-5: 215 28% 37%;
  --sidebar: hsl(240 6% 10%);
  --sidebar-foreground: 0 0% 100%;
  --sidebar-primary: 212 92% 56%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: hsl(240 6% 15%);
  --sidebar-accent-foreground: 0 0% 100%;
  --sidebar-border: 0 0% 35%;
  --sidebar-ring: 212 92% 56%;
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --radius: 0.5rem;
  --shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
}
```

---

_Generated by DCP live-site pipeline · extraction via [Get-Site-Styles](https://github.com/switmer/Get-Site-Styles) · synthesizer `experiments/lib/build-design-md.mjs` · 2026-04-20T23:22:53.565Z_
