---
source_url: http://thefirestore.com
hostname: thefirestore.com
extracted_at: 2026-04-20T23:20:51.238Z
extraction_mode: automatic
extractor: Get-Site-Styles (semantic-bindings v0.1.0)
synthesizer: build-design-md.mjs (DCP live-site pipeline)
substrate_quality_score: 0.90
refusal_threshold: 0.55
confidence_summary: { high: 0, medium: 13, low: 1, unmapped_dcp_roles: 0 }
---

# DESIGN.md — thefirestore.com

> Reconstruction-grade design spec extracted automatically from the rendered surface of **thefirestore.com**. Each section marks what was *observed* vs *inferred* vs *unfillable from the current instrument*. Confidence numbers are from the extraction algorithm, not the author of this file. See **§8 Ambiguity & caveats** before treating any claim as canonical.

## 1. Visual theme & atmosphere

Observed palette spans from `#1a1919` (L=10, most shadow) to `#e5e5e5` (L=90, most light), with the most saturated tone being `#c12126` (S=71, H=0). This section is *synthesized* — wording is heuristic; swap to human judgment if copying to a brand doc.

## 2. Color palette & roles

*Source: DCP canonical role contract overlaid on algorithmic bindings. Each role below was chosen by Get-Site-Styles (not hand-authored). Low-confidence entries mean the instrument itself is uncertain — review before shipping.*

- **accent.primary** — `#f3ca3e`  
  *Saliency:* 0.81 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: primary → accent.primary
- **accent.secondary** — `#c12126`  
  *Saliency:* 0.84 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: secondary → accent.secondary
- **bg.default** — `rgba(0,0,0,0)`  
  *Saliency:* 0.73 (medium) · *Validity:* 0.25 (surface-role-needs-opaque) · *Source:* auto-mapper · *Reason:* direct: background → bg.default
- **bg.elevated** — `rgba(255, 255, 255,1)`  
  *Saliency:* 0.65 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* near-white (L>100, S<15) → bg.elevated
- **bg.muted** — `#f5f5f5`  
  *Saliency:* 0.62 (low) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* muted split: lightness >= 70 → bg.muted
- **border.default** — `#e5e5e5`  
  *Saliency:* 0.71 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: border → border.default
- **border.muted** — `#dedede`  
  *Saliency:* 0.69 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: border (2nd) → border.muted
- **intent.danger** — `#9b090d`  
  *Saliency:* 0.84 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: destructive → intent.danger
- **intent.info** — `#194070`  
  *Saliency:* 0.81 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* hue 213 in info range (190–250)
- **intent.success** — `#2a7e56`  
  *Saliency:* 0.77 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* hue 151 in success range (90–160)
- **intent.warning** — `#f29508`  
  *Saliency:* 0.81 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* hue 36 in warning range (25–55)
- **text.muted** — `#333333`  
  *Saliency:* 0.74 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* muted split: lightness < 70 → text.muted
- **text.onAccent** — `#141414`  
  *Saliency:* 0.81 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* contrast foreground for accent.primary (#f3ca3e, L=8)
- **text.primary** — `#1a1919`  
  *Saliency:* 0.75 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: foreground → text.primary

<details><summary>shadcn-style role snapshot (same data, different vocabulary)</summary>

| var | hex | hsl |
|---|---|---|
| `--background` | `#000000` | `0 0% 0%` |
| `--card` | `#000000` | `0 0% 0%` |
| `--popover` | `#000000` | `0 0% 0%` |
| `--foreground` | `#1a1919` | `0 2% 10%` |
| `--card-foreground` | `#1a1919` | `0 2% 10%` |
| `--popover-foreground` | `#1a1919` | `0 2% 10%` |
| `--primary` | `#f3c93f` | `46 88% 60%` |
| `--primary-foreground` | `#232324` | `240 2% 14%` |
| `--ring` | `#f3c93f` | `46 88% 60%` |
| `--secondary` | `#c02126` | `358 71% 44%` |
| `--secondary-foreground` | `#ffffff` | `0 0% 100%` |
| `--accent` | `#f29407` | `36 94% 49%` |

</details>

## 3. Typography rules

Observed font-size tokens (43) in rendered CSS:

```
1px, 1em, .8em, .95em, .7em, .92em, .85em, 1.1em, 2em, 16px, 60px, 42px, 32px, 22px, 18px, 14px, 1rem, .625rem, .875rem, 0px, 20px, 26px, 3.75em, 1.125rem, .9375rem, 1.5625rem, 12px, 50px, 1.2rem, 1.25rem
… + 13 more
```

**Gap (research):** the instrument emits a flat list of sizes; it does not infer heading scale tiers (H1/H2/H3…), font-family-to-role mapping, line-height-to-role mapping, or letter-spacing system. Recovering typography hierarchy from rendered CSS is an unsolved Layer-B problem in this pipeline.

## 4. Layout & spacing

**Spacing scale (≤64px, ≤4rem/em)** — likely component-level:
`1em`, `40px`, `12px`, `1px`, `15px`, `8px`, `20px`, `2px`, `44px`, `1.5rem`, `2rem`, `1.9375rem`, `1.2rem`, `1.15rem`, `1.0625rem`, `1.375rem`, `1rem`, `2.25rem`, `5px`, `1.875rem`

**Section-level spacing** (larger px/rem values):
`10000px`, `4.5rem`, `13.4375rem`, `6rem`, `5.15625rem`, `264px`, `528px`, `139px`, `250px`, `100px`, `120px`, `80px`, `4.125rem`, `4.75rem`, `5.1875rem`, `7.5rem`

**Layout constraints** (vw/vh/%, container-shaped):
`50%`, `131.8%`, `25%`, `33.33333%`, `2%`, `100%`, `75%`, `3%`, `67.5%`, `56.34%`, `6%`, `10%`, `131.57895%`, `5%`

**Border radii** (absolute): `3px`, `1px`, `9999px`, `5px`, `6px`, `4px`, `.875rem`, `1.75rem`, `1.25003rem`, `2.5rem`, `.5rem`, `.125em`
**Pill / circle radii** (percent-based): `50%`, `100%`

**Gap (research):** the instrument does not yet infer container max-width, section spacing tiers, grid gap conventions, or route-level composition patterns. See `experiments/MODEL-GAPS.md` and `live-site-comparison.md` § template/layout inference.

## 5. Component primitives (observed)

**Button palette** (clustered from observed button elements; up to 5 distinct treatments):

| slot | hex |
|---|---|
| `--button-1` | `#333333` |
| `--button-2` | `#c02126` |
| `--button-3` | `#ffffff` |
| `--button-4` | `#9a090e` |
| `--button-5` | `#f3c93f` |

**Layout zones** (header / footer / etc):

| zone | hex |
|---|---|
| `--header-background` | `#333333` |
| `--header-foreground` | `#ffffff` |
| `--hero-background` | `#c02126` |
| `--hero-foreground` | `#ffffff` |
| `--footer-background` | `#9a090e` |
| `--footer-foreground` | `#ffffff` |

**Gap (research):** the instrument reports button *colors* but not button *geometry* (padding, border-radius, height by variant). Full component-primitive extraction requires DOM-level analysis, not CSS alone — this is the variant-axis inference problem the two baseline experiments document. See `experiments/bungee-pro/FINDINGS.md` § 2.

## 6. Responsive behavior

- `clamp()` usage: 0× in rendered CSS
- `@media` queries: 0 rules

**Pattern:** indeterminate from available evidence.

**Gap (implementation):** specific breakpoint values and fluid-scaling curves are not currently extracted into structured form. To get them, parse the `@media` rules directly from the raw CSS string attached to this output.

## 7. Do's and don'ts

*Synthesized from observed palette + token structure. Heuristic, not authoritative.*

- **Do** lean on `#f3ca3e` as the primary call-to-action color (auto-mapper: `accent.primary`, conf 0.81).
- **Do** keep body text `#1a1919` on `rgba(0,0,0,0)` surfaces — this is the declared body/background pairing.

## 8. Ambiguity & caveats

- **14 color roles** were auto-bound. Of those, **0** crossed 0.85 saliency, **13** landed in the 0.65–0.85 band, **1** below 0.65. Every binding below 0.85 warrants human review.
- **⚠ 1 binding(s) with validity < 0.5** — the extractor found these, but rule-based validity checks flag them as likely-wrong for the role regardless of how confident the extractor was:
  - `bg.default` = `rgba(0,0,0,0)` — validity 0.25. Failed rules: *surface-role-needs-opaque* (role bg.*/border.* expects opaque fill; observed alpha 0.00)
  These are the bindings where saliency (measured) and validity (rule-based plausibility) disagree. Treat them as extraction noise to review, not as canonical design decisions.
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
- Suggested one-liner for the agent: *"Build components using `#f3ca3e` as the primary CTA, `rgba(0,0,0,0)` as the canvas, and the role bindings in §2. For any role marked confidence < 0.65, prefer default shadcn/Tailwind equivalents and flag for review."*

---

## Appendix A — shadcn/ui theme scaffold (implementation adapter)

*This is an implementation convenience, not a source of truth. Generated by GSS from the observed palette. Use as a starting point; prefer §2 for semantic reasoning.*

```css
:root {
  --background: 0 0% 0%;
  --card: 0 0% 0%;
  --popover: 0 0% 0%;
  --foreground: 0 2% 10%;
  --card-foreground: 0 2% 10%;
  --popover-foreground: 0 2% 10%;
  --primary: 46 88% 60%;
  --primary-foreground: 240 2% 14%;
  --ring: 46 88% 60%;
  --secondary: 358 71% 44%;
  --secondary-foreground: 0 0% 100%;
  --accent: 36 94% 49%;
  --accent-foreground: 0 0% 100%;
  --muted: 0 0% 20%;
  --muted-foreground: 0 0% 100%;
  --destructive: 358 89% 32%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 90%;
  --input: 0 0% 90%;
  --chart-1: 46 88% 60%;
  --chart-2: 358 71% 44%;
  --chart-3: 36 94% 49%;
  --chart-4: 358 89% 32%;
  --chart-5: 213 64% 27%;
  --sidebar: hsl(0 0% 2%);
  --sidebar-foreground: 0 2% 10%;
  --sidebar-primary: 46 88% 60%;
  --sidebar-primary-foreground: 240 2% 14%;
  --sidebar-accent: hsl(0 0% 0%);
  --sidebar-accent-foreground: 0 2% 10%;
  --sidebar-border: hsl(240 100% 0%);
  --sidebar-ring: 46 88% 60%;
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
  --foreground: 0 3% 85%;
  --card-foreground: 0 3% 85%;
  --popover-foreground: 0 3% 85%;
  --primary: 46 88% 60%;
  --ring: 46 88% 60%;
  --primary-foreground: 240 2% 14%;
  --secondary: 358 71% 44%;
  --secondary-foreground: 0 0% 100%;
  --accent: 36 94% 49%;
  --accent-foreground: 0 0% 100%;
  --destructive: 358 89% 32%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 35%;
  --input: 0 0% 35%;
  --muted: 0 0% 25%;
  --muted-foreground: 0 0% 100%;
  --chart-1: 46 88% 60%;
  --chart-2: 358 71% 44%;
  --chart-3: 36 94% 49%;
  --chart-4: 358 89% 32%;
  --chart-5: 213 64% 47%;
  --sidebar: hsl(240 6% 10%);
  --sidebar-foreground: 0 3% 85%;
  --sidebar-primary: 46 88% 60%;
  --sidebar-primary-foreground: 240 2% 14%;
  --sidebar-accent: hsl(240 6% 15%);
  --sidebar-accent-foreground: 0 3% 85%;
  --sidebar-border: 0 0% 35%;
  --sidebar-ring: 46 88% 60%;
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

_Generated by DCP live-site pipeline · extraction via [Get-Site-Styles](https://github.com/switmer/Get-Site-Styles) · synthesizer `experiments/lib/build-design-md.mjs` · 2026-04-20T23:20:51.238Z_
