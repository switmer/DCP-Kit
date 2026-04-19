# FINDINGS — DCP against thefirestore.com (contrast to bungee-pro)

**Date:** 2026-04-19. **Scope:** Button (4 color variants), ProductCard (2 variants), CategoryTile (1 variant), plus 7 color-role bindings + 2 extensions. **Platform:** BigCommerce Stencil e-commerce theme.

## Why this experiment

The bungee-pro experiment turned up an unexpectedly rich result: bungee-pro declares semantic CSS variables (`--colors--black`, `--colors--text`, `--colors--border`), and four of seven color roles mapped at high confidence largely *because* those author-given names aligned with DCP's canonical role vocabulary. That observation raised a question the experiment couldn't answer on its own: **does the live-site pipeline work because DCP's role contract is well-designed, or because bungee-pro is a Webflow template and modern Webflow happens to ship semantic CSS vars?**

Thefirestore.com is the contrast case. It is a BigCommerce Stencil theme for firefighter gear. It ships zero CSS custom property definitions. Every hex is hardcoded in component rule declarations. The semantic layer, such as it exists, is encoded in BEM modifier class names (`.button--primary`, `.card--alternate`) — which are siblings of the DCP vocabulary in spirit but not aligned with it by name.

## 1. What worked

- **The same pipeline ran end-to-end on a structurally different site.** `run-transpile.mjs` and `import-bindings.mjs` worked unchanged. Transpile produced 3 components from the clean registry and 9 from the failure-case registry. Bindings applied cleanly.
- **The role contract produced defensible decisions under harder conditions.** 7 color roles mapped, 2 extensions captured. Where bungee-pro's bindings could lean on author-given semantic variable names, thefirestore's bindings had to justify themselves entirely from provenance and value inference. The bindings are weaker on average (only 3 high-confidence vs bungee-pro's 4), but every lower-confidence binding carries plain-English provenance in its `reason` field.
- **The failure-case registry demonstrated a *different* variant-clustering failure mode.** See Section 2.

## 2. Where variant clustering would fail — a different failure mode from bungee-pro

Bungee-pro's failure mode was **merge-vs-split on identical declared styles**: `.button-primary` and `.button-primary-v2` had identical CSS, and clustering based on style-signatures would correctly merge them, but the author-given `-v2` suffix suggested a semantic distinction the CSS didn't encode.

Thefirestore's failure mode is **axis identification on modifier-class proliferation**. The stencil theme declares nine `.button--*` sibling modifiers:

```
.button--primary   → color variant (brand red)
.button--secondary → color variant (black)
.button--tertiary  → color variant (white/ghost)
.button--accent    → color variant (gold)
.button--large     → size variant (18px font)
.button--small     → size variant (14px font, tighter padding)
.button--slab      → layout variant (full-width block)
.button--icon      → layout variant (square icon button)
.button--inputAction → specialized component (input-attached, transparent, negative margin)
```

A human reads these and partitions them into axes: `{color: primary | secondary | tertiary | accent}`, `{size: default | large | small}`, `{layout: inline | slab | icon}`, and recognizes `.button--inputAction` as a distinct component despite the shared prefix. A style-signature clusterer has no principled way to perform this partitioning — every declared style is different, so everything looks like a distinct component. See `generated-failure-case/components/` for what the output looks like when the axes aren't recognized: nine separate React components, each with its own CVA block, no shared variant axis.

**This is the same kind of gap as bungee-pro's, in the sense that both require semantic judgment the pipeline doesn't encode.** But the specific judgment required is different:

| Aspect | bungee-pro failure mode | thefirestore failure mode |
|---|---|---|
| What the CSS provides | Identical styles, different selector names | Distinct styles, shared class prefix |
| Clustering result | Correct merge; name disagreement | Correct split; axis disaggregation |
| Required judgment | "Is the `-v2` a real distinction?" | "Which of these are axes vs. components?" |
| Side of the merge/split spectrum | Likely over-merge | Likely over-split |

**The broader finding:** variant-clustering failure is not a single problem with a single solution. It's a family of judgment problems whose shape depends on how the source site encodes its design system. A pipeline that only addresses the merge-ambiguity case leaves the axis-identification case unsolved, and vice versa.

## 3. The Webflow-cooperative-sites hypothesis — tested and bounded

From the bungee-pro FINDINGS: *"Modern Webflow templates ship semantic CSS variables by default. This is probably an artifact of Webflow's CSS-variable feature and may not generalize to arbitrary live sites — compiled Tailwind builds and older Webflow templates flatten semantic naming out. Worth testing against non-Webflow targets before making claims about live-site role extraction in general."*

**Tested. The hypothesis holds.** Thefirestore has no semantic CSS variable layer. Not reduced, not thinner — absent. Role mapping confidence dropped from 4/7 high-confidence on bungee-pro to 3/7 high-confidence here, and the high-confidence cases are the easiest ones (`bg.default` = `#ffffff`, `accent.on` = `#ffffff`). Every non-trivial mapping on thefirestore required a human reading class-name provenance and deciding which of several similar hex values to bind to which role.

**Bounded.** This does not mean DCP's role contract is broken on non-Webflow sites. It means:

- On Webflow (modern template) targets, the role contract's layer-1 name-pattern matching can do significant real work because the author-given variable names partially align with DCP's vocabulary.
- On compiled / stencil / utility-CSS targets, layer-1 has much less to grip on; the contract still forces legible decisions (the taxonomy forces a choice and the `reason` field records the decision), but the decisions are harder and more often low-confidence.
- A wedge shape emerges: **sites that encode semantic authorship in their own stylesheet are easier targets for a DCP-style live-site adaptor.** That's a narrower claim than "live-site extraction works" and a stronger claim than "live-site extraction is hopeless."

This is the strategically interesting finding and it now has two data points, not one.

## 4. Gaps exposed

### Current implementation gaps (concrete, shippable)

- Same transpile paper cuts observed on bungee-pro (literal `\n` escapes, duplicate `children` destructures, variant hex values flattened to generic Tailwind). Captured in bungee-pro's `INTERNAL-NOTES.md`; this experiment reproduces them on a different registry, confirming they are universal transpile bugs rather than registry-specific.
- **The role contract has no vocabulary for hover/active/focus state colors.** Thefirestore encodes interaction state in the palette (`#9b090d` is only used as `.button--primary:hover`). Both extensions captured (`--site-brand-red-hover`, `--site-accent-gold`) are cases where the contract's static color vocabulary is narrower than the site's palette expression. Bungee-pro did not produce any extensions because its semantic variable layer was aligned to the static contract. This is a small but real vocabulary gap.

### Research / system gaps

- **Role-contract width vs. palette-richness tension.** Thefirestore's palette has 76 unique hex values and at least 8 distinct grays. DCP's color role contract has 17 slots. On sites where the palette is richer than the contract, hand-authored mappings are lossy — an automated mapper would have to decide *which* gray is canonically `text.muted` and collapse the rest. There's a product question hidden here: should the contract grow, should extensions become first-class, or should the contract stay small and accept loss as the tradeoff for legibility?
- **Axis-identification heuristics for modifier-class hierarchies.** BEM-style modifier classes (`component--variant`) are common on stencil/handwritten CSS, and they carry structured information a pattern-matching clusterer could use. Layer 3 (structural inference) of the auto-mapper currently targets palette scales; an equivalent for modifier-class hierarchies would recover some of what the experiment did by hand.

### Product capability gaps

- **Brand-hex collisions with intent roles.** Thefirestore's brand color is fire-engine red (`#c12126`), which visually *is* a danger-signaling color. The registry now has the same hex bound to `accent.primary` (confidence 0.85) and `intent.danger` (confidence 0.4) with the collision documented in the reason fields. A richer binding model would express that these are the same physical hex serving two semantic roles on this site — currently the registry just records two bindings and leaves the implication to the reader.

## 5. Honest scope statement

Same as bungee-pro: **hand-authored → transpiled, not scraped → transpiled.** The point is to demonstrate that the IR + transpile + bindings loop operates on a structurally different live site, and that the role contract produces different (but still legible) decisions when the source site encodes its design system differently.

The two experiments together form the interesting result. Neither by itself makes the Webflow-cooperative-sites claim. The pair does.

## 6. Next experiments

1. **Run `AutoMapper` against thefirestore's extracted token inventory.** Now that we have two live-site contrasts (one with semantic vars, one without), running the actual AutoMapper against each and comparing its bindings to the hand-authored `site-bindings.json` in each experiment is the empirical test of "does DCP's existing mapper work better on Webflow targets than stencil targets?" — which is the real measurement of the Webflow-cooperative-sites hypothesis.
2. **Test a third site: a modern Tailwind-compiled marketing page** (something on the Vercel / Linear / Notion spectrum). Tailwind-compiled CSS flattens almost all semantic naming out, even more aggressively than stencil themes. If confidence drops further, the wedge becomes very specific: semantic-CSS-author-layer presence correlates with role-mapping success.
3. **Add axis-identification layer to AutoMapper.** Layer 3 currently targets palette-scale inference. A parallel layer for BEM-modifier-class hierarchies would handle the thefirestore failure mode without requiring hand authorship. This is a concrete implementation direction the experiment surfaces.

## Appendix: file index

- `registry.json` — clean registry with 3 components + tokens + imported bindings
- `registry-failure-case.json` — nine-Button-modifiers-as-nine-components artifact
- `variant-rationale.md` — human-judgments sidecar, with a section contrasting this site's failure mode vs. bungee-pro's
- `site-bindings.json` — 7 color roles + 2 extensions, with ambiguity documented in `reason` fields
- `import-bindings.mjs` + `run-transpile.mjs` — reuse of the bungee-pro script pattern
- `generated/` + `generated-failure-case/` — transpile output from both registries
