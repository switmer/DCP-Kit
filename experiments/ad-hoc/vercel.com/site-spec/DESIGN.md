---
file: DESIGN.md
role_in_pack: style_and_system
answers_question: "What does it feel like?"
hostname: vercel.com
source_url: https://vercel.com
substrate_score: 0.87
section_confidence: { visual_theme: low, color_roles: medium, typography: low, dos_donts: low-medium }
siblings: STRUCTURE.md, IMPLEMENTATION.md, CAVEATS.md
---

# DESIGN.md — vercel.com

> **Provisional style and system spec, synthesized from rendered-surface evidence.** Covers color roles, typography tokens, and visual tone. **Does not cover** page structure (see STRUCTURE.md), component geometry (not yet extractable), or implementation defaults (see IMPLEMENTATION.md). **Read CAVEATS.md before treating any claim here as canonical.**

## 1. Visual theme & atmosphere *(confidence: low — synthesized from palette extremes)*

Observed palette spans `#111827` (L=11) → `#fafafa` (L=98); most saturated tone is `#111827` (S=39). Wording is heuristic — use as vibe only.

## 2. Color palette & roles *(confidence: medium)*

Each role was chosen by Get-Site-Styles. Saliency is measured (evidence-weighted). Validity is rule-based (canonical-membership under named rules; see CAVEATS.md for rule set). Low-validity bindings are called out explicitly.

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

## 3. Typography tokens *(confidence: low — tokens only, no hierarchy inferred)*

Observed font-size tokens (raw, un-ranked):

```
12px, 11px, 14px, 1rem, 16px, 13px, 24px, 72px, 64px, 48px, 32px, .875rem, .75rem, 17px, 20px, 18px, 10px, 1.25rem, 28px, 3rem, 2.25rem, 1.5rem, 42px, 26px, 22px, 15px, 1em, 56px, 40px, 1.875rem
… + 132 more
```

**Gap:** H1/H2/H3 hierarchy is not inferred from rendered CSS. Font-family-to-role, line-height-to-role, and letter-spacing systems are not recovered. These sizes are raw material, not a typed scale.

## 7. Do's and don'ts *(confidence: low-medium — heuristic, not authoritative)*

- **Observed likely primary CTA color:** `#2a8af6` (saliency 0.80, validity 1.00). **Recommended:** use as primary CTA default; confirm against live site before shipping.
- **Observed body/canvas pairing:** text `#1f2937` on `#0000000a`. **⚠ Canvas validity is low** — background candidate may be a transparent overlay, not the real page background. Verify before using.

---

**Where to look next:**
- Need layout/composition? → `STRUCTURE.md` (weak doc — honest about limits)
- Need implementation defaults? → `IMPLEMENTATION.md` (shadcn/Tailwind scaffold)
- Need to calibrate trust? → `CAVEATS.md` (substrate score, validity flags, unmapped roles)