---
file: DESIGN.md
role_in_pack: style_and_system
answers_question: "What does it feel like?"
hostname: bungee-pro.webflow.io
source_url: https://bungee-pro.webflow.io
substrate_score: 0.84
section_confidence: { visual_theme: low, color_roles: medium, typography: low, dos_donts: low-medium }
siblings: STRUCTURE.md, IMPLEMENTATION.md, CAVEATS.md
---

# DESIGN.md — bungee-pro.webflow.io

> **Provisional style and system spec, synthesized from rendered-surface evidence.** Covers color roles, typography tokens, and visual tone. **Does not cover** page structure (see STRUCTURE.md), component geometry (not yet extractable), or implementation defaults (see IMPLEMENTATION.md). **Read CAVEATS.md before treating any claim here as canonical.**

## 1. Visual theme & atmosphere *(confidence: low — synthesized from palette extremes)*

Observed palette spans `#222` (L=13) → `#ddd` (L=87); most saturated tone is `#d0d8e4` (S=27). Wording is heuristic — use as vibe only.

## 2. Color palette & roles *(confidence: medium)*

Each role was chosen by Get-Site-Styles. Saliency is measured (evidence-weighted). Validity is rule-based (canonical-membership under named rules; see CAVEATS.md for rule set). Low-validity bindings are called out explicitly.

- **accent.primary** — `#0082f3`  
  *Saliency:* 0.76 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: primary → accent.primary
- **accent.secondary** — `#ff0`  
  *Saliency:* 0.73 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: secondary → accent.secondary
- **bg.elevated** — `#fafafa`  
  *Saliency:* 0.56 (low) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* near-white (L>98, S<15) → bg.elevated
- **bg.muted** — `#d0d8e4`  
  *Saliency:* 0.65 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* muted split: lightness >= 70 → bg.muted
- **border.default** — `#ddd`  
  *Saliency:* 0.67 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: border → border.default
- **border.muted** — `#ccc`  
  *Saliency:* 0.62 (low) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: border (2nd) → border.muted
- **intent.danger** — `#ea384c`  
  *Saliency:* 0.72 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: destructive → intent.danger
- **intent.info** — `#3898ec`  
  *Saliency:* 0.72 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* hue 208 in info range (190–250)
- **intent.success** — `#cfffb2`  
  *Saliency:* 0.69 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* hue 97 in success range (90–160)
- **intent.warning** — `#fedca6`  
  *Saliency:* 0.69 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* hue 37 in warning range (25–55)
- **text.muted** — `#222`  
  *Saliency:* 0.71 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* muted split: lightness < 70 → text.muted
- **text.onAccent** — `#ffffff`  
  *Saliency:* 0.76 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* contrast foreground for accent.primary (#0082f3, L=100)

## 3. Typography tokens *(confidence: low — tokens only, no hierarchy inferred)*

Observed font-size tokens (raw, un-ranked):

```
2em, 1em, 14px, 12px, 38px, 32px, 24px, 18px, 10px, 15px, 40px, 17px, 1rem, 4.38rem, 3.75rem, 3rem, 2rem, 1.5rem, 1.25rem, 1.1rem, .88rem, 1.13rem, .75rem, 2.5rem, 2.4rem
```

**Gap:** H1/H2/H3 hierarchy is not inferred from rendered CSS. Font-family-to-role, line-height-to-role, and letter-spacing systems are not recovered. These sizes are raw material, not a typed scale.

## 7. Do's and don'ts *(confidence: low-medium — heuristic, not authoritative)*

- **Observed likely primary CTA color:** `#0082f3` (saliency 0.76, validity 1.00). **Recommended:** use as primary CTA default; confirm against live site before shipping.

---

**Where to look next:**
- Need layout/composition? → `STRUCTURE.md` (weak doc — honest about limits)
- Need implementation defaults? → `IMPLEMENTATION.md` (shadcn/Tailwind scaffold)
- Need to calibrate trust? → `CAVEATS.md` (substrate score, validity flags, unmapped roles)