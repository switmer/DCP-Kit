---
file: DESIGN.md
role_in_pack: style_and_system
answers_question: "What does it feel like?"
hostname: thefirestore.com
source_url: http://thefirestore.com
substrate_score: 0.90
section_confidence: { visual_theme: low, color_roles: medium, typography: low, dos_donts: low-medium }
siblings: STRUCTURE.md, IMPLEMENTATION.md, CAVEATS.md
---

# DESIGN.md — thefirestore.com

> **Provisional style and system spec, synthesized from rendered-surface evidence.** Covers color roles, typography tokens, and visual tone. **Does not cover** page structure (see STRUCTURE.md), component geometry (not yet extractable), or implementation defaults (see IMPLEMENTATION.md). **Read CAVEATS.md before treating any claim here as canonical.**

## 1. Visual theme & atmosphere *(confidence: low — synthesized from palette extremes)*

Observed palette spans `#1a1919` (L=10) → `#e5e5e5` (L=90); most saturated tone is `#c12126` (S=71). Wording is heuristic — use as vibe only.

## 2. Color palette & roles *(confidence: medium)*

Each role was chosen by Get-Site-Styles. Saliency is measured (evidence-weighted). Validity is rule-based (canonical-membership under named rules; see CAVEATS.md for rule set). Low-validity bindings are called out explicitly.

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

## 3. Typography tokens *(confidence: low — tokens only, no hierarchy inferred)*

Observed font-size tokens (raw, un-ranked):

```
1px, 1em, .8em, .95em, .7em, .92em, .85em, 1.1em, 2em, 16px, 60px, 42px, 32px, 22px, 18px, 14px, 1rem, .625rem, .875rem, 0px, 20px, 26px, 3.75em, 1.125rem, .9375rem, 1.5625rem, 12px, 50px, 1.2rem, 1.25rem
… + 13 more
```

**Gap:** H1/H2/H3 hierarchy is not inferred from rendered CSS. Font-family-to-role, line-height-to-role, and letter-spacing systems are not recovered. These sizes are raw material, not a typed scale.

## 7. Do's and don'ts *(confidence: low-medium — heuristic, not authoritative)*

- **Observed likely primary CTA color:** `#f3ca3e` (saliency 0.81, validity 1.00). **Recommended:** use as primary CTA default; confirm against live site before shipping.
- **Observed body/canvas pairing:** text `#1a1919` on `rgba(0,0,0,0)`. **⚠ Canvas validity is low** — background candidate may be a transparent overlay, not the real page background. Verify before using.

---

**Where to look next:**
- Need layout/composition? → `STRUCTURE.md` (weak doc — honest about limits)
- Need implementation defaults? → `IMPLEMENTATION.md` (shadcn/Tailwind scaffold)
- Need to calibrate trust? → `CAVEATS.md` (substrate score, validity flags, unmapped roles)