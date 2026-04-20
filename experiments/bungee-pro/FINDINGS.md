# FINDINGS — DCP against bungee-pro.webflow.io

## Verdict

- **Target type:** Webflow (modern template) with author-declared semantic CSS variables
- **What worked:** role binding, transpile loop, registry generation, end-to-end pipeline
- **What needed judgment:** component family inference (low), variant grouping (high — merge/split call on identical-styled siblings), role interpretation (low — author names partially aligned with DCP vocabulary)
- **Primary failure family:** merge/split ambiguity
- **Important model gap:** none surfaced by this experiment (see `../MODEL-GAPS.md` for gaps surfaced across all experiments)
- **Confidence in takeaway:** directional, not empirical. Confidence numbers in `site-bindings.json` were hand-entered; `AutoMapper` did not run. See `../live-site-comparison.md` for scope.

**Date:** 2026-04-17. **Duration:** ~90 min (hand-authored, not scraped). **Scope:** Button, ProjectCard, TestimonialCard, plus 7 color roles.

## 1. What worked

- **IR → transpile → React loop ran end-to-end.** Both `registry.json` and `registry-failure-case.json` produced three `.tsx` files each plus `index.ts`, `types.ts`, `package.json`. Zero transpile errors. (See `generated/components/` and `generated-failure-case/components/`.)
- **`dcp_import_site_bindings` worked without the MCP handshake.** Path B (one-off script reusing the handler's semantics) wrote 7 color roles to `registry.bindings.color` with `source: "site-import"`, injected `--site-*` CSS variables into `themeContext.cssVariables.light`, and correctly identified 10 roles from DCP's contract that bungee-pro does not cover (`intent.warning`, `border.focus`, `accent.primary`, etc.). Run `node experiments/bungee-pro/import-bindings.mjs` to reproduce.
- **The role contract forced legible decisions.** Seven color bindings were authored by a human reading bungee-pro's compiled CSS. Four landed with high confidence (≥0.85) because bungee-pro ships a declared semantic CSS variable layer (`--colors--black`, `--colors--text`, `--colors--border`, `--colors--light-gray`) whose author-given names mapped cleanly onto DCP's canonical roles. Three carried lower confidence (0.55–0.65) with plain-English provenance in the `reason` field. The role contract produced decisions that could be reviewed rather than values that could only be inspected.
- **Scope caveat on the binding work.** The experiment hand-mapped these bindings, informed by CSS provenance. **DCP's `AutoMapper` (`src/tokens/autoMapper.js`) did not run in this experiment.** The import handler (`handleImportSiteBindings`) round-tripped the authored bindings into the registry; it does not itself infer. What the CSS-variable layer gives us is reason to expect the auto-mapper would do well on this class of site — its layer-1 name-pattern matching would fire on `--colors--*`, its layer-4 convention lookup would likely catch the ShadCN-adjacent vocabulary bungee-pro uses — but that's an inference from source structure, not a measurement. Running the auto-mapper against bungee-pro and comparing its output to the human mapping is the next experiment.
- **Webflow-specific signal-quality observation.** Modern Webflow templates ship semantic CSS variables by default. This is probably an artifact of Webflow's CSS-variable feature and **may not generalize** to arbitrary live sites — compiled Tailwind builds and older Webflow templates flatten semantic naming out. Worth testing against non-Webflow targets before making claims about live-site role extraction in general.
- **The variant-rationale sidecar separated human judgments from automated output.** `variant-rationale.md` opens with a `## Human judgments made` section naming the specific semantic compressions a person performed — collapsing `.button-primary` + `.button-primary-v2` + `.button-secondary` into one Button, assigning Webflow's "primary" label to the ghost (quieter) variant despite the name inversion, and treating content variation as not-a-variant-axis.

## 2. Where variant clustering would fail — the load-bearing observation

**The site handed us the failure case.** Bungee-pro's compiled stylesheet declares `.button-primary` (line 2455) and `.button-primary-v2` (line 2642) with **identical declared CSS**. Every property matches: same color, same font-size, same letter-spacing, same justification, same padding, same display. No declared difference exists.

Any style-signature clustering algorithm looking at these two selectors would correctly merge them into a single component. And any thoughtful reviewer looking at the site itself would correctly say they are distinct — one is the `-v2`, after all; the author named them apart on purpose. That distinction lives in DOM usage patterns and context, not in the stylesheet. Style-signature equivalence has no access to it.

**This is the variant-clustering critique observed in the wild on the first site we tested, not a contrived failure case.** The compiler literally cannot know whether these are one variant or two without reading past the CSS into how they are used. That is the load-bearing gap.

The two registries in this experiment make the consequence concrete. `generated/components/Button.tsx` is one Button with a `variant` axis (`ghost`, `solid`) — the output when a human performed the compression. `generated-failure-case/components/` contains `ButtonHero.tsx`, `ButtonInline.tsx`, `ButtonNav.tsx` as three unrelated components — the shape of output when clustering either can't perform the compression or performs it the other way. Each registry is internally coherent. Each came from the same site observations. The difference between them is the thing the pipeline cannot currently decide.

**This experiment demonstrates that the same observed button family can be serialized either as one component with variants or as three separate components, and a style-signature clusterer has no principled way to decide between those encodings without additional semantic judgment.**

## 3. Gaps exposed

### Current implementation gaps (concrete, shippable)

- **Variant props aren't wired to generated Tailwind.** The authored Button variants had distinct hex values (`ghost`: `backgroundColor: "transparent"`; `solid`: `backgroundColor: "#1e1e1e"`), but the generated CVA block flattens both to `"bg-gray-500 text-gray-500 p-4"`. Transpile has no principled path from per-variant style props to Tailwind class strings — another instance of measurement where judgment is required. *(This is the only implementation gap that connects directly to the load-bearing critique; other transpile paper cuts — escape-char handling, prop destructure duplication, invalid TS union suffixes — are tracked in an internal note, not here.)*

### Research / system gaps (architectural, not-yet-solved)

- **Product-expression layer.** DCP emits tokens and components. Bungee-pro's identity — its confident restraint, its two-weight typography contrast, its structural use of whitespace — is legible to a viewer and absent from the registry. The vocabulary for this layer (restraint, density, warmth, decorative intensity) is a proposed direction, not a measurable ontology; naming it is a research agenda, not an architectural gap DCP is failing to plug.
- **Multi-page evidence aggregation.** This experiment operated on observations of the homepage. The `/projects`, `/blog`, `/contact` pages would contribute additional evidence about which components are canonical (appear everywhere), which are incidental (one-off layouts), and which are semantic variants (same component, different treatment by page-type). The registry IR can carry this via a `sources` array per component, but the extraction pipeline to produce it doesn't exist.
- **Canonical-vs-incidental judgment.** Even with multi-page evidence, deciding which observed treatment is the "real" component versus a marketing flourish is a judgment the system doesn't encode. Frequency alone isn't enough (a well-designed one-off can still be canonical; a widespread treatment can still be incidental).

### Product capability gaps (distinct primitives that don't exist)

- **Temporal diff / visual change detection.** Re-extracting bungee-pro next month should produce a diff: "color `bg.muted` shifted from `#eef0f6` to `#e8ecf2`; TestimonialCard gained a new `compact` variant." DCP's JSON-Patch mutation discipline is close — it already tracks change as first-class — but there's no "re-extract and diff" workflow. This is a legitimate missing product primitive and cheap to build.
- **Exemplar preservation.** A coding agent regenerating in bungee-pro's style benefits from actual screenshots of the canonical components stored alongside their IR. The transpiled React is a re-generated exemplar, not a preserved one. Different consumer, different artifact.
- **Judgment ledger (scoped).** The confidence scores and `reason` fields on the imported bindings are halfway to a ledger. The version that would matter is scoped: log the decisions most likely to be wrong — single-instance selections, near-equal candidate ties, low-confidence role assignments. Full ledgers are noise; scoped ledgers are reviewable.

## 4. Honest scope statement

**This is hand-authored → transpiled, not scraped → transpiled.** The point of the demo is to show that DCP's IR + transpile + bindings loop operates end-to-end on observations of a live site, and that the role contract produces legible decisions when observation-to-role mapping is ambiguous. The point is *not* that DCP automatically extracted bungee-pro.

The `registry-failure-case.json` + `variant-rationale.md` pair is how this experiment preserves intellectual honesty: the failure-case registry exists to show the shape of the output when variant-clustering judgment goes the other way, and the rationale sidecar names the specific compressions a human performed that an automated pipeline currently cannot.

The bindings side of the demo (`site-bindings.json` + `import-bindings.mjs`) is the most "automated" part of the experiment. The hex values came directly from bungee-pro's compiled stylesheet (not eyeballed); the provenance reasons are written in plain English; the role-contract validation is the same code path the MCP handler uses. This is the part of DCP that is already close to "point at URL, get tokens."

## 5. Next experiments

Two, in order:

1. **Run `AutoMapper` against bungee-pro** with the site's extracted token inventory as input. Compare its layer-1 through layer-5 bindings to the hand-authored `site-bindings.json` from this experiment. That's the empirical test of the "the auto-mapper would do well on this class of site" inference — which today is informed speculation, not a measurement.

2. **Run the Chrome extension** (`packages/dcp-toolkit/integrations/chrome-extension/`) against bungee-pro for the same components and compare its DOM-capture output shape to this hand-authored registry. Specifically: whether the extension's style-signature clustering would produce `registry.json` (correctly merged Button with variants), `registry-failure-case.json` (three separate components), or something else. That's the empirical test of the variant-clustering critique.

## Appendix: file index

- `registry.json` — clean hand-authored registry with Button/ProjectCard/TestimonialCard + tokens + imported bindings
- `registry-failure-case.json` — three-Buttons-as-three-components artifact
- `variant-rationale.md` — human-judgments sidecar
- `site-bindings.json` — 7 color roles with hex + confidence + reason
- `import-bindings.mjs` — Path-B applier script (reuses handleImportSiteBindings semantics)
- `run-transpile.mjs` — direct runTranspile invocation (routes around the CLI stub)
- `generated/components/` — Button, ProjectCard, TestimonialCard `.tsx`
- `generated-failure-case/components/` — ButtonHero, ButtonInline, ButtonNav `.tsx`
