# Experiment: DCP vs. thefirestore.com (contrast to bungee-pro)

## What this is

A second hand-authored DCP experiment, built to test whether the Webflow-cooperative-sites hypothesis from the bungee-pro experiment generalizes. Same pipeline (IR + transpile + bindings). Different site (BigCommerce Stencil e-commerce theme, not Webflow). Different semantic layer (none declared; raw hex values only). Different variant-clustering failure mode.

Runtime: ~60 min. Pairs with `../bungee-pro/` to form a two-data-point comparison, not a single case study.

## What it proves

- The pipeline is not Webflow-specific. Same scripts, same role contract, worked on a structurally different site without code changes.
- The role contract produces legible decisions even when the source site has no semantic scaffolding — at lower confidence, with more extensions, but still reviewable.
- Variant-clustering is a *family* of judgment problems, not a single one. Thefirestore's failure mode (nine `.button--*` modifiers that need axis-disaggregation) is different from bungee-pro's failure mode (two `.button-primary*` selectors with identical declared styles that need merge/split disambiguation). Both need semantic judgment; they need different kinds of semantic judgment.

## What it proves together with bungee-pro

- The Webflow-cooperative-sites hypothesis holds: bungee-pro's author-declared semantic CSS variables did real work that thefirestore's absent semantic layer cannot provide. High-confidence role bindings: 4/7 on bungee-pro, 3/7 here.
- The wedge shape is now observed twice: sites that encode semantic authorship in their own stylesheet are easier targets for a DCP-style live-site adaptor than sites that don't. Worth testing on a compiled-Tailwind target as the third point.

## What it does not prove

- Automated extraction. Still hand-authored.
- That the AutoMapper class actually achieves the confidence levels I hand-entered — the auto-mapper was not run in either experiment.
- That three components + 7 color roles represent the full design system of either site.
- Interactions, motion, stencil-template responsive behavior.

## Where to look first

1. **`FINDINGS.md`** — especially Section 2 (the two failure modes table) and Section 3 (the Webflow-cooperative-sites hypothesis, tested and bounded).
2. **`../bungee-pro/FINDINGS.md`** for the original data point.
3. **`registry-failure-case.json`** → `generated-failure-case/components/` — nine separate Button components as the artifact for this site's specific clustering gap.
4. **`variant-rationale.md`** — specifically the "absence of bungee-pro's ambiguity is itself a finding" section.
5. **`site-bindings.json`** — look at `intent.danger` (confidence 0.4) and its collision with `accent.primary` (confidence 0.85) on the same hex.

## Reproduce

```bash
node experiments/thefirestore/run-transpile.mjs
node experiments/thefirestore/import-bindings.mjs
```
