# Experiment: DCP vs. bungee-pro.webflow.io

## What this is

A hand-authored DCP experiment against `https://bungee-pro.webflow.io/`, built to produce real artifacts rather than more framing. Scope locked before work started to three components (Button, ProjectCard, TestimonialCard) plus seven color role bindings. Runtime: ~90 minutes. Output: a transpiled React/TS component set, a populated registry with site-imported color bindings, and a findings note that names the load-bearing failure mode concretely.

## What it proves

- **The IR + transpile + bindings loop runs end-to-end on observations of a live site.** `registry.json` → `dcp`'s `runTranspile` → `generated/*.tsx`. `site-bindings.json` → a script reusing `handleImportSiteBindings` semantics → `registry.bindings.color` populated with `source: "site-import"` and `themeContext.cssVariables.light` populated with `--site-*` vars.
- **The canonical role contract forces legible decisions on ambiguous colors.** 4 of 7 color bindings landed with high confidence because bungee-pro ships a declared semantic CSS layer (`--colors--black`, `--colors--text`, `--colors--border`). 3 bindings carried plain-English provenance in the `reason` field recording the judgment call.
- **Variants authored explicitly do round-trip into CVA-generated React** (shape-wise — see caveats below about per-variant styling).

## What it does not prove

- **Automated extraction.** The registry is hand-authored. No DOM scraping, no style-signature clustering.
- **Automated variant detection.** The `generated/` vs. `generated-failure-case/` pair is the artifact that makes this gap concrete — two internally-coherent registries from the same site observations, differing only in the judgment the pipeline currently can't make.
- **Transpile fidelity.** The transpile output has string-escape bugs, duplicate prop destructures, and flattens per-variant styling to generic Tailwind classes. The *shape* round-trips; the *styling* doesn't. See FINDINGS.md section 3.
- **Interactions, motion, or behavior.** Static CSS extraction captures none of bungee-pro's hover states, scroll-sticky testimonials, or marquee animations.
- **Multi-page canonical-vs-incidental judgment.** Homepage observations only.
- **Product-expression fidelity.** Bungee-pro's identity (confident restraint, specific typographic weight play) is legible to a viewer and absent from the registry. Naming what this layer would need to capture is a research direction, not a claim this experiment makes.

## Where to look first

1. **`FINDINGS.md`** — the honest write-up. Five sections, read start to finish.
2. **`registry.json`** → `generated/components/Button.tsx` — clean registry and its transpiled output.
3. **`registry-failure-case.json`** → `generated-failure-case/components/` — the three-Buttons-as-three-components artifact. This is where the variant-clustering critique becomes concrete.
4. **`variant-rationale.md`** — the `## Human judgments made` section is the one that matters.
5. **`site-bindings.json`** — 7 color roles with plain-English provenance; the `bg.muted` and `text.disabled` entries are where the role contract's usefulness is most visible.
6. **`screenshots/button-comparison.md`** — real vs. clean-transpile vs. failure-case, side-by-side.

## Opening line for Monday

> "I used a live site as the source. The IR already round-trips observations into registry, transpiled React, and imported role bindings. The first place it breaks: bungee-pro's `.button-primary` and `.button-primary-v2` have **identical declared CSS** — any style-signature clustering collapses them, but the designer treats them as distinct. That judgment lives in usage patterns, not the stylesheet. That's the gap. What have you got?"

## Reproduce

From the repo root:

```bash
node experiments/bungee-pro/run-transpile.mjs        # both registries
node experiments/bungee-pro/import-bindings.mjs      # applies site bindings to registry.json
```
