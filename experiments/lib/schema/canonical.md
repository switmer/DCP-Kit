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
  "schemaVersion": "0.1.0",
  "contractVersion": "0.1.0",          // DCP role contract the tokens will bind to
  "source": {
    "url": "https://bungee-pro.webflow.io/",
    "hostname": "bungee-pro.webflow.io",
    "extractedAt": "2026-04-20T22:33:40Z",
    "extractor": "Get-Site-Styles@v0.x.y",
    "substrateProfile": "webflow-semantic-vars",   // see §5
    "substrateConfidence": 0.85                    // how sure we are about the profile
  },
  "tokens": {
    "discrete":  [ ... ],   // §3.1
    "scale":     [ ... ],   // §3.2
    "fluid":     [ ... ],   // §3.3
    "component": [ ... ],   // §3.4
    "layout":    [ ... ]    // §3.5
  },
  "composition": {          // §4 — templates/slots/nesting. May be empty for V1.
    "templates": [ ],
    "slots":     [ ],
    "nesting":   [ ]
  },
  "graph": {                // §6 — alias graph over tokens
    "aliases": [ { "from": "--button-bg", "to": "--colors--primary-accent" } ]
  }
}
```

No narrative. No prose. No role assignments. Those are downstream layers.

---

## 2. Every token carries the same envelope

Every entry in any `tokens.*` array conforms to:

```jsonc
{
  "id": "token-0042",                    // stable within this canonical.json
  "class": "discrete",                   // one of: discrete | scale | fluid | component | layout
  "name": "--colors--primary-accent",    // the variable name if named-var; null if literal
  "value": "#146ef5",                    // the resolved value (hex, px, clamp(...), etc.)

  "provenance": {
    "source": "named-var",               // §5.1 — named-var | literal | alias-resolved | utility-class | inferred
    "selectors": [":root", ".button-primary"],
    "contexts": ["color", "border-color"],
    "refCount": 117,                     // how often the value or name appears in rendered CSS
    "aliasDepth": 0                      // 0 = direct; 1+ = resolved through var() chain
  },

  "confidence": 0.92,                    // §5.2 — how strongly the extractor supports this being a real token
  "validity": 1.0                        // §5.3 — how canonical it is as a design-system member (separate from confidence)
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

## 4. Composition (parallel to tokens)

V1 may emit empty arrays. Named here so the schema doesn't require a breaking change when inference is added.

```jsonc
"composition": {
  "templates": [
    { "id": "tpl-hero-split", "signature": "...", "instances": 3, "confidence": 0.6 }
  ],
  "slots": [
    { "id": "slot-hero-left", "templateId": "tpl-hero-split", "accepts": ["heading", "cta"] }
  ],
  "nesting": [
    { "parent": "ProductCard", "child": "Button", "variant": "primary", "contexts": ["product-grid"] }
  ]
}
```

Composition is where component-family inference, variant-axis inference, and template/layout inference will live. It is deliberately under-specified here — the schema reserves the namespace without committing to semantics.

---

## 5. Structural fields worth emphasizing

### 5.1 `provenance.source`

One of:

| Source | Meaning | Typical surface |
|---|---|---|
| `named-var` | Declared CSS custom property with a semantic-looking name | Webflow, Framer, hand-authored SCSS with naming discipline |
| `alias-resolved` | Value reached through one or more `var()` chains; preserve the chain in `graph.aliases` | Anywhere using `--foo: var(--bar)` |
| `literal` | Raw value, not tied to a declared variable | Tailwind-JIT, compiled CSS Modules, minified output |
| `utility-class` | Value emitted by a utility class (`.bg-gray-500`) | Tailwind-JIT |
| `inferred` | Extractor synthesized this from structural cues (e.g. "top color of buttons by vote") | GSS's `semanticAnalysis.buttonColors`, clustering output |

Downstream weighting can key off this. The "named-var bias" critique dissolves when every consumer knows the profile of every token.

### 5.2 `confidence`

Scalar [0, 1]. How strongly the **extractor** supports this token being a real, load-bearing token on this site. Independent of whether the token belongs in the canonical design system.

### 5.3 `validity`

Scalar [0, 1]. How canonical this token is as a design-system member. **Independent of confidence.**

Examples:

| Case | confidence | validity |
|---|---|---|
| `--colors--primary-accent: #146ef5`, 117 refs | 0.95 | 0.95 |
| `rgba(0,0,0,.5)` appearing on body overlay | 0.85 | 0.15 |
| `#ff0000` used once in an error-state screenshot URL | 0.40 | 0.85 |
| `100vw` appearing as a section width | 0.90 | 0.60 |

Low-validity tokens are still emitted. Downstream filters decide whether to promote them.

### 5.4 Confidence propagation (out of scope of this schema, noted here)

Consumers that derive claims from canonical tokens should propagate confidence multiplicatively (or min-join; implementation choice):

- A `semantic.json` role binding derived from a canonical token carries ≤ the token's confidence × validity.
- A `DESIGN.md` "do/don't" synthesized from a role binding carries ≤ the role binding's confidence.

The schema doesn't enforce this; it names the contract.

---

## 6. Graph section

`graph.aliases` is a flat edge list. Each edge records one `var()` reference:

```jsonc
{ "from": "--button-bg", "to": "--colors--primary-accent", "hops": 1 }
```

Multi-hop chains are flattened into direct edges. The extractor decides whether to retain intermediate nodes.

This is where the "token graph plus relationships" intuition from the other AI's notes lives. Consumers that need semantic reasoning (e.g., "which token *means* primary accent") traverse this graph from role-anchor tokens.

---

## 7. What this schema deliberately excludes

- **Role bindings.** Those live in `semantic.json`. Canonical is source-faithful; role assignment is interpretation.
- **Narrative prose.** Every claim consumers write about this data belongs in DCP's synthesizers.
- **Implementation adapter output.** `adapter.css` (shadcn theme) is a projection, not a source.
- **Confidence calibration.** The extractor sets confidence; consumers may recalibrate against known-good corpora, but the calibration algorithm is not part of the schema.

---

## 8. The two-producer story (Webflow-style vs. Tailwind-style)

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

## 9. Minimum viable implementation

For the current DCP pipeline, a first-cut emitter needs only:

- `tokens.discrete` (colors) — already derivable from GSS's `colorAnalysis`
- `tokens.scale` (font sizes, spacing, radii) — already in GSS's `tokens.*` after fix #1
- `provenance.source` tagging — requires parsing the raw CSS for `var()` references (modest work)
- `confidence` — reuse GSS's existing confidence
- `validity` — new; simple rule-based first pass (reject `rgba(*,0)`, `transparent`, `NaN`, degenerate lengths)
- `graph.aliases` — requires alias-chain resolution; can be empty at V1 for non-named-var sites

`tokens.fluid`, `tokens.component`, `tokens.layout`, and all of `composition` can be empty arrays at V1. The schema accommodates their eventual arrival without a breaking change.

---

## 10. One-line summary

**`canonical.json` is the smallest typed, provenanced, validity-tagged token graph that any downstream DCP consumer needs, and nothing else.**

Every complaint in the thread about "which output is truth" dissolves once consumers read from this one layer and treat everything else as either measurement (upstream) or projection (downstream).
