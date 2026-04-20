# canonical.json — the interface between extraction and interpretation

**Status:** draft, 2026-04-20. **Owner of producing it:** GSS (or a DCP-side adapter on top of it). **Owner of consuming it:** DCP's synthesis pipeline (e.g., `build-design-md.mjs`, registry generators, validators).

This schema formalizes the center-of-gravity layer in the live-site DCP pipeline:

```
source → observed → CANONICAL → semantic → adapter → narrative
```

Everything to the left is a lossless measurement artifact. Everything to the right is a projection or synthesis. Canonical is the point where measurement becomes reviewable structure — typed, filtered, provenanced, and ready for role assignment (semantic.json) or rendering (adapter.css, DESIGN.md).

The schema is deliberately small. Anything it doesn't specify is out of scope for this layer on purpose.

---

## 1. Top-level shape

```jsonc
{
  "schemaVersion": "0.2.0",
  "contractVersion": "0.1.0",          // DCP role contract the tokens will bind to
  "source": {
    "url": "https://bungee-pro.webflow.io/",
    "hostname": "bungee-pro.webflow.io",
    "extractedAt": "2026-04-20T22:33:40Z",
    "extractor": "Get-Site-Styles@v0.x.y",
    "substrateProfile": "webflow-semantic-vars",   // see §5
    "substrateConfidence": 0.85                    // how sure we are about the profile
  },
  "coverage": {                                    // §7 — what we actually sampled
    "contextsSampled": ["https://bungee-pro.webflow.io/"],
    "contextsNotSampled": "all non-homepage routes",
    "sampleBias": "marketing-homepage-only"
  },
  "tokens": {
    "discrete":  [ ... ],   // §3.1
    "scale":     [ ... ],   // §3.2
    "fluid":     [ ... ],   // §3.3
    "component": [ ... ],   // §3.4
    "layout":    [ ... ]    // §3.5
  },
  "graph": {                // §6 — alias graph over tokens
    "aliases": [ { "from": "--button-bg", "to": "--colors--primary-accent" } ]
  },
  "dictionaryFit": {        // §8 — how well DCP's 14-role contract fits this site
    "unmappedSiteRoles": [   // things the site clearly role-binds, contract doesn't cover
      { "siteRoleName": "hover-overlay", "value": "rgba(0,0,0,.5)", "evidence": [...] }
    ]
  }
}
```

No narrative. No prose. No DCP role assignments. Those are downstream layers (semantic.json / DESIGN.md).

---

## 2. Every token carries the same envelope

Every entry in any `tokens.*` array conforms to:

```jsonc
{
  "id": "token-0042",                    // stable within this canonical.json
  "class": "discrete",                   // one of: discrete | scale | fluid | component | layout
  "name": "--colors--primary-accent",    // the variable name if named-var; null if literal
  "value": "#146ef5",                    // the resolved value (hex, px, clamp(...), etc.)

  // Provenance is a DAG, not a flat field. A single token can have
  // simultaneous, independent bases: named-var declaration PLUS
  // literal-in-computed-styles PLUS alias-resolved PLUS convention-matched.
  // Flattening to one source loses information for conflict resolution and
  // confidence combination. Each basis carries its own evidence + weight.
  "provenance": [
    {
      "basis": "named-var",              // §5.1 taxonomy
      "weight": 1.0,
      "evidence": { "selectors": [":root"], "declarations": 1 }
    },
    {
      "basis": "alias-resolved",
      "weight": 0.8,
      "evidence": { "chain": ["--button-bg", "--colors--primary-accent"], "hops": 1 }
    },
    {
      "basis": "convention-matched",
      "weight": 0.6,
      "evidence": { "pattern": "shadcn --primary", "matchConfidence": 0.9 }
    }
  ],

  "contexts": ["color", "border-color", "box-shadow"],
  "refCount": 117,                       // how often the value or name appears
  "aliasDepth": 0,                       // 0 = direct; 1+ = resolved through var() chain

  // Two independent axes. See §5.2.
  "saliency": 0.95,                      // measured: freq × alias-depth × context-diversity
  "validity": 0.90                       // rule-based: canonical-membership (anti-noise filter)
}
```

Every field is required. Missing data is represented explicitly (null, empty array, or 0).

---

## 3. Token classes

Five, no more. If a value doesn't fit, the extractor either classifies it best-effort and flags low validity, or drops it.

### 3.1 Discrete
Enumerable set with no ordering. Typical members: colors, font-families.

Extra fields per entry:
```jsonc
{
  "class": "discrete",
  "domain": "color",                     // color | font-family | ...
  "hex": "#146ef5",                      // convenience for colors; null otherwise
  "hsl": { "h": 215, "s": 92, "l": 52 }  // color domain only
}
```

### 3.2 Scale
Ordered, related tokens forming a ratio or progression. Typical members: font-sizes, spacing scale, radii, font-weights.

Extra fields:
```jsonc
{
  "class": "scale",
  "domain": "font-size",                 // font-size | spacing | radius | font-weight | ...
  "numeric": 16,
  "unit": "px",
  "rank": 3                              // position in the scale if derivable; null if not
}
```

### 3.3 Fluid
Viewport-dependent values. `clamp()`, `vw`/`vh` where intentional, breakpoint-gated.

Extra fields:
```jsonc
{
  "class": "fluid",
  "domain": "font-size",                 // what the clamp is fluid-ing
  "min":  { "numeric": 14, "unit": "px" },
  "max":  { "numeric": 24, "unit": "px" },
  "basis": "viewport-width"
}
```

### 3.4 Component
Values that belong to a specific component primitive. Not members of a generic scale.

Extra fields:
```jsonc
{
  "class": "component",
  "component": "button",                 // button | card | input | nav | ...
  "property": "padding",                 // property on that component
  "variant": "primary"                   // null if the token applies across variants
}
```

### 3.5 Layout
Architectural. Container widths, nav heights, section rhythm.

Extra fields:
```jsonc
{
  "class": "layout",
  "role": "container-max-width",         // canonical layout-role name
  "scope": "page"                        // page | section | component
}
```

---

## 4. Composition is NOT in canonical — it lives in `structure.json` (sibling)

The earlier V0.1 draft of this schema reserved a `composition` namespace inside canonical for templates, slots, and nesting. **Removed in V0.2.**

Reason: composition recovery is expensive, lossy, and substrate-dependent. Webflow and Framer ship enough information to make template inference plausible. Compiled CSS Modules, hashed React class names, and Tailwind-JIT outputs do not. Putting `composition` inside canonical forces one of two dishonest shapes:

1. The fields are mostly-null on most sites → canonical.json lies about parity across sites. Every consumer has to know "composition is only populated when the substrate is cooperative."
2. The fields are present or absent based on substrate → canonical.json violates schema uniformity. Some sites have the key, some don't; downstream code becomes a maze of conditionals.

Both outcomes make canonical a "second design tool" instead of a typed token graph, which is the exact anti-pattern §14 warns against.

**Composition gets its own sibling schema:** `structure.json`. It has its own refusal semantics (below a substrate-quality floor distinct from canonical's, emit a refusal with raw evidence and no inferred composition). It is produced and consumed independently of canonical. Consumers that need both read both; consumers that only care about tokens + roles ignore structure.json entirely.

A separate `experiments/lib/schema/structure.md` will formalize the composition schema when that sibling ships. For now, canonical is typed tokens + graph + coverage + dictionary-fit. Nothing else.

---

## 5. Structural fields worth emphasizing

### 5.1 `provenance[].basis`

One of:

| Basis | Meaning | Typical surface |
|---|---|---|
| `named-var` | Declared CSS custom property with a semantic-looking name | Webflow, Framer, hand-authored SCSS with naming discipline |
| `alias-resolved` | Value reached through one or more `var()` chains; preserve the chain in `graph.aliases` | Anywhere using `--foo: var(--bar)` |
| `literal` | Raw value, not tied to a declared variable | Tailwind-JIT, compiled CSS Modules, minified output |
| `utility-class` | Value emitted by a utility class (`.bg-gray-500`) | Tailwind-JIT |
| `convention-matched` | Matches a known naming convention (shadcn `--primary`, Tailwind brand scale) | Cross-site heuristic |
| `inferred` | Extractor synthesized this from structural cues (e.g. "top color of buttons by vote") | GSS's `semanticAnalysis.buttonColors`, clustering output |

A token can have multiple bases simultaneously, each with its own weight and evidence. Consumers combine weights (product, min, or domain-specific rule) into a final score; the canonical layer does not prescribe the combiner.

### 5.2 Two axes, not one — saliency vs. validity

The single-scalar `confidence` field in the V0.1 schema conflated two distinct properties. Splitting them in V0.2:

**`saliency` ∈ [0, 1]** — **measurable**. How load-bearing this token is on the observed surface. Computed from:
- reference count (citation frequency)
- alias depth (reached through how many `var()` hops)
- context diversity (how many different CSS properties it appears on)

Saliency is a property of the artifact, not of any designer's intention. A hex cited across 400 rules through an alias chain of depth 3 is load-bearing regardless of whether someone intentionally picked it. This is what "intention" collapses to once you accept that intention is not recoverable from compiled output.

**`validity` ∈ [0, 1]** — **rule-based prior**. How canonical this token is as a member of a design-system vocabulary, computed from an explicit named prior. Validity is not a vibe; it's a documented rule set. Leaving it undefined means every adapter re-opens "what does validity mean" and the field becomes prose, not contract.

The minimum V0.2 rule set — what's currently implemented in `build-design-md.mjs:computeColorValidity`:

| Rule ID | Applies to | Penalty | Evidence |
|---|---|---|---|
| `surface-role-needs-opaque` | `bg.*`, `border.default`, `border.muted` | 0.75 | alpha < 0.95 |
| `text-role-needs-substantial-opacity` | `text.*` | 0.70 | alpha < 0.5 |
| `collision-shared-hex-across-semantic-roles` | set-level, any role | 0.45 cross-category, 0.20 intra-category | same hex bound to two roles |
| `degenerate-value` | any role | 1.0 | non-string, empty, or contains `NaN` |

Rules compose multiplicatively on `(1 - penalty)`. Each rule is named, testable, and replaceable — adapters that disagree override a specific rule, not the whole concept. Additional rule IDs belong in a dedicated section of this schema (future sections for typography, spacing, layout validity) rather than inline in implementations.

**Contract obligation**: any field in canonical.json that a consumer would read for validity must be supported by a named rule in this schema. No rules, no field. This is the discipline that keeps `validity` from drifting back into prose.

Validity is what filters `rgba(0,0,0,.5)` out of `bg.default` candidacy even if it's highly salient. The rule that does it is `surface-role-needs-opaque` — named, documented, not vibes.

Examples:

| Case | saliency | validity |
|---|---|---|
| `--colors--primary-accent: #146ef5`, 117 refs through alias depth 2 | 0.95 | 0.95 |
| `rgba(0,0,0,.5)` appearing on 80% of body-background overlays | 0.85 | 0.15 |
| `#ff0000` used once in an error-state screenshot URL | 0.25 | 0.80 |
| `100vw` appearing as a section width in 50 places | 0.90 | 0.55 |

Low-validity tokens are still emitted. Downstream filters decide whether to promote them. This is what makes `webflow.com`'s `bg.default = rgba(0,0,0,.5)` misbinding diagnosable rather than invisible: the binding was high-saliency and low-validity, and the schema carries both.

### 5.3 What happened to `confidence`?

**Removed from the schema.** It was conflating saliency (measured) and validity (rule-based) and sometimes a third thing (consumer policy — "should I treat this as fixed?") that belongs downstream, not in canonical.

Consumer-side tooling that wants a single scalar can compute one from `saliency × validity` or any combiner that fits the use case. The canonical layer does not prescribe.

### 5.4 Saliency propagation

Downstream consumers should propagate saliency multiplicatively (or min-join; implementation choice) when deriving claims:

- A `semantic.json` role binding derived from a canonical token carries ≤ the token's `saliency × validity`.
- A `DESIGN.md` "do/don't" synthesized from a role binding carries ≤ the role binding's propagated score.
- A refusal (see §9) is itself a propagation signal: substrate-quality-below-threshold halts synthesis.

The schema doesn't enforce propagation; it names the contract.

---

## 6. Graph section

`graph.aliases` is a flat edge list. Each edge records one `var()` reference:

```jsonc
{ "from": "--button-bg", "to": "--colors--primary-accent", "hops": 1 }
```

Multi-hop chains are flattened into direct edges. The extractor decides whether to retain intermediate nodes.

This is where the "token graph plus relationships" intuition from the other AI's notes lives. Consumers that need semantic reasoning (e.g., "which token *means* primary accent") traverse this graph from role-anchor tokens.

---

## 7. Coverage — the missing primitive

A compiler sees all the source over a fixed grammar. This pipeline does not. We crawl a sampled surface, biased toward homepages. A site's checkout form, signed-in dashboard, and marketing page often use materially different token subsets — marketing surfaces over-sample bright accents, product surfaces over-sample neutrals.

Without a coverage field, the canonical layer claims system-wide authority from a biased sample. This is the axis where the tool will most quietly mislead users who don't realize it only crawled one URL.

```jsonc
"coverage": {
  "contextsSampled": [                    // required, non-empty
    "https://bungee-pro.webflow.io/",
    "https://bungee-pro.webflow.io/projects"
  ],
  "contextsNotSampled": "signed-in areas, checkout flows, non-public routes",
  "sampleBias": "marketing-homepage-only",  // free-text honest description
  "coverageConfidence": 0.40                // how system-wide the conclusions are
}
```

Consumers reading this field adjust downstream claims. A `DESIGN.md` synthesizer should decline to make universal claims ("this site uses X") when `coverageConfidence` is low; it can still report what was *observed* ("on the homepage, X is dominant").

## 8. Dictionary fit — what the DCP contract doesn't cover

The DCP role contract has 14 color slots. Sites often semantically role-bind things the contract doesn't model. Without a place to put these, they vanish silently — "extraction succeeded, dictionary's too small for this site" becomes invisible instead of visible.

```jsonc
"dictionaryFit": {
  "unmappedSiteRoles": [
    {
      "siteRoleName": "hover-overlay",      // what the site authors this as
      "value": "rgba(0,0,0,.5)",
      "evidence": {
        "selectors": [".modal-overlay", ".backdrop"],
        "occurrences": 12
      },
      "candidateDcpRoles": ["bg.overlay"]   // if any exist; empty array if none
    },
    {
      "siteRoleName": "accent-tint",
      "value": "#e6ff032b",                 // 17% alpha of brand color
      "evidence": { "selectors": [".badge-soft"], "occurrences": 4 },
      "candidateDcpRoles": []                // no contract slot fits
    }
  ],
  "contractCoverage": 0.71                  // fraction of site roles the contract modeled
}
```

This is the complement of `report.unmappedRoles` (contract slots the site didn't fill). `unmappedSiteRoles` is site roles the contract doesn't model. Both are legitimate and distinct.

## 9. Refusal — graceful degradation needs a floor

Every stage in this pipeline is lossy. The narrative stage (`DESIGN.md`) is uniquely risky because prose is sticky — readers don't reliably downweight on "medium confidence" labels, especially when the template fills the same sections whether the substrate was Webflow or a hashed-CSS-module React build.

Consumers of canonical.json that synthesize prose (like `build-design-md.mjs`) **must** implement a substrate floor. Below the threshold, refuse to synthesize narrative; emit a structured refusal that explains *why* synthesis was refused and what the raw extraction contains.

This is already implemented in `build-design-md.mjs` with:
- Weighted substrate score (role coverage 0.45, color depth 0.20, type 0.15, spacing 0.10, responsive 0.10)
- Refusal threshold 0.55
- Hard floor on role coverage (< 0.50 → refuse regardless of other signals)

The schema doesn't prescribe the threshold. It names the contract: **downstream synthesizers must carry a refusal option, and canonical.json must carry the coverage and dictionary-fit signals that make refusal computable.**

## 10. What this schema deliberately excludes

- **Role bindings.** Those live in `semantic.json`. Canonical is source-faithful; role assignment is interpretation.
- **Narrative prose.** Every claim consumers write about this data belongs in DCP's synthesizers.
- **Implementation adapter output.** `adapter.css` (shadcn theme) is a projection, not a source.
- **Consumer policy.** "Should I treat this token as fixed?" is a consumer decision, not a producer fact. The canonical layer reports saliency and validity; policy emerges at synthesis.
- **Intention.** "What did the designer mean?" is unknowable from compiled artifacts. Saliency (§5.2) is the measurable proxy, and the one the schema commits to.

## 11. Shim-vs-contract separation — the `_provisional` flag

Aspirational prose ("the contract should survive replacement of the shim") drifts in practice. A schema-level rule keeps the seam visible:

**Rule:** Any field present in canonical.json only because the current GSS blob happens to emit it — with no independent justification from the contract itself — carries `_provisional: true`.

Fields without `_provisional` are first-class: part of the durable canonical contract. When the shim is replaced by native canonical-layer output from the extractor, provisionals must either earn promotion (explicit justification added to this schema document) or be dropped. The drift becomes visible in the schema file itself, not hidden in PR descriptions.

```jsonc
{
  "id": "token-0042",
  "class": "discrete",
  "name": "--colors--primary-accent",
  "value": "#146ef5",
  "saliency": 0.95,
  "validity": 0.95,
  "provenance": [...],

  "_gssRawHsl": "216 92% 52%",       // _provisional
  "_provisional": ["_gssRawHsl"]      // fields on THIS token that are shim-only
}
```

At the top level:

```jsonc
{
  "schemaVersion": "0.2.0",
  "_provisionalFields": [
    "tokens.discrete[].gssRawHsl",    // carried for debug parity with current GSS blob; not contract
    "source.extractorBlob"             // adapter-side only
  ],
  ...
}
```

Contract obligation: a release checklist item is "`_provisionalFields` is empty or each entry has a justification line in this schema." If the list grows without documentation, the shim is defining the ontology — the exact anti-pattern this rule prevents.

Concrete guidelines for the V1 adapter:

- **First-class in canonical regardless of GSS:** `saliency`, `validity`, `provenance[]`, `coverage`, `dictionaryFit.unmappedSiteRoles`. If the V1 adapter can't populate these cleanly, emit empty arrays / null / zero — not degenerate stand-ins, and not `_provisional` placeholders.
- **Fields that belong in an `adapter/` sibling, not canonical:** GSS's `theme.light` / `theme.dark` (shadcn-formatted). These are projections, not source.
- **Fields on the border:** anything GSS emits that canonical consumers currently read but wasn't independently contract-justified goes into `_provisional` until reviewed.

When GSS grows native canonical-layer output, the V1 shim gets deleted and every `_provisional` entry must have been either promoted (with justification) or dropped. The schema is the audit trail.

## 12. Contract derivation — from consumer need, not extractor convenience

The test for whether a field belongs in canonical.json is not "the extractor emits it" or "it would be nice to have." The test is:

> Does a downstream consumer — specifically, a hand-authored DESIGN.md for this site — reference it?

**Concrete method, borrowed from compiler design:**

1. Pick three substrate-different sites (a cooperative Webflow, a Tailwind-JIT app, a hashed-CSS-module React SPA).
2. Hand-author a DESIGN.md for each, without consulting the extractor.
3. Enumerate every field the prose references: "the primary accent is X," "the card radius is Y," "the button padding uses tokens Z1 and Z2."
4. That enumerated list is the minimum viable canonical contract.
5. Anything outside the list is bloat. Prune.
6. Anything inside the list the extractor can't supply is the **substrate floor**, exposed cleanly — it's what goes into the refusal report when evidence is too thin.

This is the same discipline compilers use: IR shape is dictated by codegen need, not parser convenience. Building canonical from the extractor side first (and trying to match consumers later) is how schemas end up with 40 fields and inconsistent downstream usage.

**V0.2 audit status:** the fields currently in this schema were not derived from this method. They were backfilled from the `build-design-md.mjs` synthesis output + the concept-model discussion. That's acceptable for a V0.2 draft; it is not acceptable for a V1.0 freeze. A V0.3 pass must perform the consumer-prose audit and prune any field it does not find cited.

---

## 13. The two-producer story (Webflow-style vs. Tailwind-style)

A `canonical.json` from a Webflow site will be:
- high in `provenance.source === "named-var"`
- high in `graph.aliases.length`
- high `validity` on most tokens

A `canonical.json` from a Tailwind-JIT site will be:
- high in `provenance.source === "utility-class"`
- low in `graph.aliases.length`
- similar `confidence`, often lower `validity` on individual entries (more noise per match)

Both are valid `canonical.json`. Downstream tools must not assume one profile. The `source.substrateProfile` field at the top is a hint for consumers to pick weighting strategies, not a gatekeeper.

---

## 14. Minimum viable implementation

For the current DCP pipeline, a first-cut emitter needs only:

- `tokens.discrete` (colors) — already derivable from GSS's `colorAnalysis`
- `tokens.scale` (font sizes, spacing, radii) — already in GSS's `tokens.*` after fix #1
- `provenance[]` with at least one basis per token. V1 can tag everything `literal` with weight 1.0 if alias resolution isn't wired yet. Richer bases land incrementally.
- `saliency` — compute from `refCount × aliasDepth × contextDiversity`. V1 can use freq + context count as a stand-in.
- `validity` — rule-based; simple first pass rejects `rgba(*,0)`, `transparent`, `NaN`, degenerate lengths. Returns 1.0 for anything that survives.
- `coverage` — even if only one URL was crawled, populate `contextsSampled: [url]` and `coverageConfidence: 0.3` to make the sampling bias explicit.
- `dictionaryFit.unmappedSiteRoles` — can be empty at V1. GSS doesn't produce these directly yet.
- `graph.aliases` — requires alias-chain resolution; can be empty at V1 for non-named-var sites.

`tokens.fluid`, `tokens.component`, `tokens.layout`, and all of `composition` can be empty arrays at V1. The schema accommodates their eventual arrival without a breaking change.

Consumers (like `build-design-md.mjs`) must implement the §9 refusal floor. That's not optional — it's what keeps the narrative stage honest on low-substrate sites.

---

## 15. One-line summary

**`canonical.json` is the smallest typed, provenanced, validity-tagged token graph that any downstream DCP consumer needs, and nothing else.**

Every complaint in the thread about "which output is truth" dissolves once consumers read from this one layer and treat everything else as either measurement (upstream) or projection (downstream).
