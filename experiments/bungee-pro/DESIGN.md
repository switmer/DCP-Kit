---
source_url: https://bungee-pro.webflow.io
hostname: bungee-pro.webflow.io
extracted_at: 2026-04-20T22:59:03.942Z
extraction_mode: automatic
extractor: Get-Site-Styles (semantic-bindings v0.1.0)
synthesizer: build-design-md.mjs (DCP live-site pipeline)
confidence_summary: { high: 0, medium: 10, low: 2, unmapped_dcp_roles: 2 }
---

# DESIGN.md — bungee-pro.webflow.io

> Reconstruction-grade design spec extracted automatically from the rendered surface of **bungee-pro.webflow.io**. Each section marks what was *observed* vs *inferred* vs *unfillable from the current instrument*. Confidence numbers are from the extraction algorithm, not the author of this file. See **§8 Ambiguity & caveats** before treating any claim as canonical.

## 1. Visual theme & atmosphere

Observed palette spans from `#222` (L=13, most shadow) to `#ddd` (L=87, most light), with the most saturated tone being `#d0d8e4` (S=27, H=0). This section is *synthesized* — wording is heuristic; swap to human judgment if copying to a brand doc.

## 2. Color palette & roles

*Source: DCP canonical role contract overlaid on algorithmic bindings. Each role below was chosen by Get-Site-Styles (not hand-authored). Low-confidence entries mean the instrument itself is uncertain — review before shipping.*

- **accent.primary** — `#0082f3`  
  *Confidence:* 0.76 (medium) · *Source:* auto-mapper · *Reason:* direct: primary → accent.primary
- **accent.secondary** — `#ff0`  
  *Confidence:* 0.73 (medium) · *Source:* auto-mapper · *Reason:* direct: secondary → accent.secondary
- **bg.elevated** — `#fafafa`  
  *Confidence:* 0.56 (low) · *Source:* auto-mapper · *Reason:* near-white (L>98, S<15) → bg.elevated
- **bg.muted** — `#d0d8e4`  
  *Confidence:* 0.65 (medium) · *Source:* auto-mapper · *Reason:* muted split: lightness >= 70 → bg.muted
- **border.default** — `#ddd`  
  *Confidence:* 0.67 (medium) · *Source:* auto-mapper · *Reason:* direct: border → border.default
- **border.muted** — `#ccc`  
  *Confidence:* 0.62 (low) · *Source:* auto-mapper · *Reason:* direct: border (2nd) → border.muted
- **intent.danger** — `#ea384c`  
  *Confidence:* 0.72 (medium) · *Source:* auto-mapper · *Reason:* direct: destructive → intent.danger
- **intent.info** — `#3898ec`  
  *Confidence:* 0.72 (medium) · *Source:* auto-mapper · *Reason:* hue 208 in info range (190–250)
- **intent.success** — `#cfffb2`  
  *Confidence:* 0.69 (medium) · *Source:* auto-mapper · *Reason:* hue 97 in success range (90–160)
- **intent.warning** — `#fedca6`  
  *Confidence:* 0.69 (medium) · *Source:* auto-mapper · *Reason:* hue 37 in warning range (25–55)
- **text.muted** — `#222`  
  *Confidence:* 0.71 (medium) · *Source:* auto-mapper · *Reason:* muted split: lightness < 70 → text.muted
- **text.onAccent** — `#ffffff`  
  *Confidence:* 0.76 (medium) · *Source:* auto-mapper · *Reason:* contrast foreground for accent.primary (#0082f3, L=100)

**Unmapped DCP roles** (contract slots the auto-mapper did not fill): `bg.default`, `text.primary`. Treat these as judgment gaps, not absent-from-site.

<details><summary>shadcn-style role snapshot (same data, different vocabulary)</summary>

| var | hex | hsl |
|---|---|---|
| `--background` | `#ffffff` | `0 0% 100%` |
| `--card` | `#ffffff` | `0 0% 100%` |
| `--popover` | `#ffffff` | `0 0% 100%` |
| `--foreground` | `#232324` | `240 2% 14%` |
| `--card-foreground` | `#232324` | `240 2% 14%` |
| `--popover-foreground` | `#232324` | `240 2% 14%` |
| `--primary` | `#0083f5` | `208 100% 48%` |
| `--primary-foreground` | `#ffffff` | `0 0% 100%` |
| `--ring` | `#0083f5` | `208 100% 48%` |
| `--secondary` | `#ffff00` | `60 100% 50%` |
| `--secondary-foreground` | `#232324` | `240 2% 14%` |
| `--accent` | `#3697ec` | `208 83% 57%` |

</details>

## 3. Typography rules

Observed font-size tokens (25) in rendered CSS:

```
2em, 1em, 14px, 12px, 38px, 32px, 24px, 18px, 10px, 15px, 40px, 17px, 1rem, 4.38rem, 3.75rem, 3rem, 2rem, 1.5rem, 1.25rem, 1.1rem, .88rem, 1.13rem, .75rem, 2.5rem, 2.4rem
```

**Gap (research):** the instrument emits a flat list of sizes; it does not infer heading scale tiers (H1/H2/H3…), font-family-to-role mapping, line-height-to-role mapping, or letter-spacing system. Recovering typography hierarchy from rendered CSS is an unsolved Layer-B problem in this pipeline.

## 4. Layout & spacing

**Spacing scale (≤64px, ≤4rem/em)** — likely component-level:
`9px`, `15px`, `6px`, `10px`, `20px`, `5px`, `40px`, `8px`, `12px`, `3px`, `11px`, `2px`, `4px`, `1px`, `1em`, `18px`, `30px`, `32px`, `16px`, `23px`

**Section-level spacing** (larger px/rem values):
`96px`, `120px`, `250px`, `160px`, `128px`, `80px`, `105px`, `286px`, `72px`, `104px`, `200px`, `112px`, `224px`, `140px`, `100px`, `134px`, `168px`, `84px`

**Layout constraints** (vw/vh/%, container-shaped):
`1vh`, `2vh`

**Border radii** (absolute): `3px`, `32px`, `50px`, `40px`, `80px`, `12px`, `24px`, `20px`, `10px`, `16px`
**Pill / circle radii** (percent-based): `100%`, `50%`

**Gap (research):** the instrument does not yet infer container max-width, section spacing tiers, grid gap conventions, or route-level composition patterns. See `experiments/MODEL-GAPS.md` and `live-site-comparison.md` § template/layout inference.

## 5. Component primitives (observed)

**Button palette** (clustered from observed button elements; up to 5 distinct treatments):

| slot | hex |
|---|---|
| `--button-1` | `#3697ec` |
| `--button-2` | `#1f1f1f` |
| `--button-3` | `#fafafa` |
| `--button-4` | `#ffffff` |
| `--button-5` | `#c7c7c7` |

**Layout zones** (header / footer / etc):

| zone | hex |
|---|---|
| `--header-background` | `0 NaN% NaN%` |
| `--header-foreground` | `#232324` |
| `--footer-background` | `#fafafa` |
| `--footer-foreground` | `#232324` |

**Gap (research):** the instrument reports button *colors* but not button *geometry* (padding, border-radius, height by variant). Full component-primitive extraction requires DOM-level analysis, not CSS alone — this is the variant-axis inference problem the two baseline experiments document. See `experiments/bungee-pro/FINDINGS.md` § 2.

## 6. Responsive behavior

- `clamp()` usage: 0× in rendered CSS
- `@media` queries: 0 rules

**Pattern:** indeterminate from available evidence.

**Gap (implementation):** specific breakpoint values and fluid-scaling curves are not currently extracted into structured form. To get them, parse the `@media` rules directly from the raw CSS string attached to this output.

## 7. Do's and don'ts

*Synthesized from observed palette + token structure. Heuristic, not authoritative.*

- **Do** lean on `#0082f3` as the primary call-to-action color (auto-mapper: `accent.primary`, conf 0.76).

## 8. Ambiguity & caveats

- **12 color roles** were auto-bound. Of those, **0** crossed 0.85 confidence, **10** landed in the 0.65–0.85 band, **2** below 0.65. Every binding below 0.85 warrants human review.
- **2 DCP roles unmapped**: `bg.default`, `text.primary`. Unmapped means the mapper did not find a confident candidate, not that the role is absent from the site.
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

---

## Appendix A — shadcn/ui theme scaffold (implementation adapter)

*This is an implementation convenience, not a source of truth. Generated by GSS from the observed palette. Use as a starting point; prefer §2 for semantic reasoning.*

```css
:root {
  --background: 0 0% 100%;
  --card: 0 0% 100%;
  --popover: 0 0% 100%;
  --foreground: 240 2% 14%;
  --card-foreground: 240 2% 14%;
  --popover-foreground: 240 2% 14%;
  --primary: 208 100% 48%;
  --primary-foreground: 0 0% 100%;
  --ring: 208 100% 48%;
  --secondary: 60 100% 50%;
  --secondary-foreground: 240 2% 14%;
  --accent: 208 83% 57%;
  --accent-foreground: 240 2% 14%;
  --muted: 0 0% 13%;
  --muted-foreground: 0 0% 100%;
  --destructive: 353 81% 57%;
  --destructive-foreground: 240 2% 14%;
  --border: 0 0% 87%;
  --input: 0 0% 87%;
  --chart-1: 208 100% 48%;
  --chart-2: 60 100% 50%;
  --chart-3: 208 83% 57%;
  --chart-4: 216 27% 85%;
  --chart-5: 225 31% 95%;
  --sidebar: hsl(0 0% 98%);
  --sidebar-foreground: 240 2% 14%;
  --sidebar-primary: 208 100% 48%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: hsl(0 0% 98%);
  --sidebar-accent-foreground: 240 2% 14%;
  --sidebar-border: hsl(240 100% 0%);
  --sidebar-ring: 208 100% 48%;
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
  --background: 240 9% 2%;
  --card: 240 6% 10%;
  --popover: 240 6% 10%;
  --foreground: 0 0% 100%;
  --card-foreground: 0 0% 100%;
  --popover-foreground: 0 0% 100%;
  --primary: 208 100% 48%;
  --ring: 208 100% 48%;
  --primary-foreground: 0 0% 100%;
  --secondary: 60 100% 50%;
  --secondary-foreground: 0 0% 100%;
  --accent: 208 83% 57%;
  --accent-foreground: 0 0% 100%;
  --destructive: 353 81% 57%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 35%;
  --input: 0 0% 35%;
  --muted: 0 0% 25%;
  --muted-foreground: 0 0% 100%;
  --chart-1: 208 100% 48%;
  --chart-2: 60 100% 50%;
  --chart-3: 208 83% 57%;
  --chart-4: 214 27% 70%;
  --chart-5: 225 31% 80%;
  --sidebar: hsl(240 6% 10%);
  --sidebar-foreground: 0 0% 100%;
  --sidebar-primary: 208 100% 48%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: hsl(240 6% 15%);
  --sidebar-accent-foreground: 0 0% 100%;
  --sidebar-border: 0 0% 35%;
  --sidebar-ring: 208 100% 48%;
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

_Generated by DCP live-site pipeline · extraction via [Get-Site-Styles](https://github.com/switmer/Get-Site-Styles) · synthesizer `experiments/lib/build-design-md.mjs` · 2026-04-20T22:59:03.942Z_
