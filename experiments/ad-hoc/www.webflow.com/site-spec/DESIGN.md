---
file: DESIGN.md
role_in_pack: style_and_system
answers_question: "What does it feel like?"
hostname: www.webflow.com
source_url: http://www.webflow.com
substrate_score: 0.87
section_confidence: { visual_theme: low, color_roles: medium, typography: low, dos_donts: low-medium }
siblings: STRUCTURE.md, IMPLEMENTATION.md, CAVEATS.md
---

# DESIGN.md — www.webflow.com

> **Provisional style and system spec, synthesized from rendered-surface evidence.** Covers color roles, typography tokens, and visual tone. **Does not cover** page structure (see STRUCTURE.md), component geometry (not yet extractable), or implementation defaults (see IMPLEMENTATION.md). **Read CAVEATS.md before treating any claim here as canonical.**

## 1. Visual theme & atmosphere *(confidence: low — synthesized from palette extremes)*

Observed palette spans `rgba(0,0,0,.5)` (L=0) → `rgba(255, 255, 255, 0.12)` (L=100); most saturated tone is `#146ef5` (S=92). Wording is heuristic — use as vibe only.

## 2. Color palette & roles *(confidence: medium)*

Each role was chosen by Get-Site-Styles. Saliency is measured (evidence-weighted). Validity is rule-based (canonical-membership under named rules; see CAVEATS.md for rule set). Low-validity bindings are called out explicitly.

- **accent.primary** — `#146ef5`  
  *Saliency:* 0.83 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: primary → accent.primary
- **accent.secondary** — `#0055d4`  
  *Saliency:* 0.76 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: secondary → accent.secondary
- **bg.default** — `rgba(0,0,0,.5)`  
  *Saliency:* 0.73 (medium) · *Validity:* 0.25 (surface-role-needs-opaque) · *Source:* auto-mapper · *Reason:* direct: background → bg.default
- **bg.elevated** — `rgba(255, 255, 255, 0.12)`  
  *Saliency:* 0.65 (medium) · *Validity:* 0.25 (surface-role-needs-opaque) · *Source:* auto-mapper · *Reason:* near-white (L>100, S<15) → bg.elevated
- **bg.muted** — `#fafafa`  
  *Saliency:* 0.55 (low) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* muted split: lightness >= 70 → bg.muted
- **border.default** — `#d8d8d8`  
  *Saliency:* 0.68 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: border → border.default
- **border.muted** — `#ddd`  
  *Saliency:* 0.66 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: border (2nd) → border.muted
- **intent.danger** — `#ea384c`  
  *Saliency:* 0.71 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* direct: destructive → intent.danger
- **intent.info** — `#0082f3`  
  *Saliency:* 0.75 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* hue 208 in info range (190–250)
- **intent.success** — `#00d722`  
  *Saliency:* 0.73 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* hue 129 in success range (90–160)
- **intent.warning** — `#ff6b00`  
  *Saliency:* 0.73 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* hue 25 in warning range (25–55)
- **text.muted** — `#222`  
  *Saliency:* 0.71 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* muted split: lightness < 70 → text.muted
- **text.onAccent** — `#141414`  
  *Saliency:* 0.83 (medium) · *Validity:* 1.00 · *Source:* auto-mapper · *Reason:* contrast foreground for accent.primary (#146ef5, L=8)

## 3. Typography tokens *(confidence: low — tokens only, no hierarchy inferred)*

Observed font-size tokens (raw, un-ranked):

```
2em, 1em, 14px, 12px, 38px, 32px, 24px, 18px, 10px, 15px, 40px, 17px, 1rem, .9rem, .875rem, 1.25rem, 1.1rem, .8rem, .75rem, 1.3em, .8em, .9em, .3598rem, .625rem, .9375rem, 12rem, 1.6rem, 1.8rem, 8.4rem, .88rem
… + 9 more
```

**Gap:** H1/H2/H3 hierarchy is not inferred from rendered CSS. Font-family-to-role, line-height-to-role, and letter-spacing systems are not recovered. These sizes are raw material, not a typed scale.

## 7. Do's and don'ts *(confidence: low-medium — heuristic, not authoritative)*

- **Observed likely primary CTA color:** `#146ef5` (saliency 0.83, validity 1.00). **Recommended:** use as primary CTA default; confirm against live site before shipping.
- **Observed body/canvas pairing:** text `#222` on `rgba(0,0,0,.5)`. **⚠ Canvas validity is low** — background candidate may be a transparent overlay, not the real page background. Verify before using.

---

**Where to look next:**
- Need layout/composition? → `STRUCTURE.md` (weak doc — honest about limits)
- Need implementation defaults? → `IMPLEMENTATION.md` (shadcn/Tailwind scaffold)
- Need to calibrate trust? → `CAVEATS.md` (substrate score, validity flags, unmapped roles)