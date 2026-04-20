# Model gaps surfaced by live-site experiments

Contract / binding-structure issues observed while running the experiments. These are distinct from implementation bugs (see each experiment's `INTERNAL-NOTES.md`) and distinct from research questions (see [live-site-comparison.md](./live-site-comparison.md) § "Separated: engineering vs. research").

Each entry documents: what was observed, where, what the current binding model can express, and what a richer model would need.

---

## 1. One physical token serving multiple semantic roles

**Observed on:** thefirestore.com. The site's brand color `#c12126` (fire-engine red) is simultaneously:

- The default background of `.button--primary` → a clear `accent.primary` binding
- The same visual signal a danger/error state would use → a plausible `intent.danger` binding

On a firefighter-gear e-commerce site the two semantic roles genuinely collapse onto one hex by design. This is not a mapping error; it is the site's actual token structure.

**What the registry currently records:**

```json
"bindings": {
  "color": {
    "accent.primary": {
      "token": "--site-accent-primary",
      "confidence": 0.85,
      "source": "site-import",
      "reason": "GSS: Brand fire-engine red, used on .button--primary default state..."
    },
    "intent.danger": {
      "token": "--site-intent-danger",
      "confidence": 0.4,
      "source": "site-import",
      "reason": "GSS: AMBIGUOUS: same hex as accent.primary..."
    }
  }
}
"themeContext": {
  "cssVariables": {
    "light": {
      "--site-accent-primary": { "value": "#c12126", ... },
      "--site-intent-danger":  { "value": "#c12126", ... }
    }
  }
}
```

Both bindings point to different `--site-*` CSS variable names, each of which happens to resolve to the same hex. A downstream generator rendering the registry would emit two distinct CSS variables holding identical values.

**What this does not express:**

- That the two roles intentionally share a physical token on this site. Current structure treats them as independent coincidence.
- That changing the brand color would need to update both roles in lockstep (which a reviewer editing `accent.primary` may not realize).
- That the site author *chose* this collapse — it is a design decision, not an accident of extraction.

**What a richer binding model would need:**

A way to declare that two role slots are bound to the same physical token with acknowledged semantic collapse. Candidate structures, in rough order of increasing disruption:

1. **Reference bindings.** Let one role's `token` field reference another role's binding: `"intent.danger": { "token": "ref:accent.primary", ... }`. Cheap; keeps the two slots but models the relationship.
2. **Shared-token group.** Introduce a first-class "shared physical token" concept in the registry with an explicit list of roles bound to it. More invasive; requires contract-version bump.
3. **Role-alias annotation.** Allow a binding to declare it is aliased to another role on this site. Preserves the two slots as independent but makes the relationship discoverable.

All three have tradeoffs; the point is that the current model cannot express this at all, and the "store both with low confidence and hope a reader notices" workaround is a smell.

**Related observation:** bungee-pro did not produce a token-collision example, but its `--colors--light-gray` usage (solid bg on `.testimonial-card`, semi-transparent overlay on `.template-content-item`) is a smaller version of the same problem: one token, two semantic uses. A richer binding model would help here too.

---

## 2. Interaction-state colors have no canonical slots

**Observed on:** thefirestore.com. Both extensions captured during binding import (`--site-brand-red-hover` = `#9b090d`, `--site-accent-gold` = `#d2aa21`) are values the site uses as hover-state or accent-state colors that don't fit any static role in DCP's canonical contract.

**What the registry currently records:**

Extensions land in `registry.siteImport.extensions`:

```json
"siteImport": {
  "extensions": {
    "--site-brand-red-hover": {
      "hex": "#9b090d",
      "confidence": 0.8,
      "reason": "GSS: Darker red, used as .button--primary:hover..."
    }
  }
}
```

This captures the data but leaves it outside the role contract. A consumer of the registry (transpile, generator, IDE tooling) can read `bindings.color.*` but does not know to look at `siteImport.extensions` for hover variants of the same roles.

**What a richer binding model would need:**

The role contract could introduce state modifiers on existing role slots — e.g., allow `accent.primary.hover` as a valid role ID alongside `accent.primary`. This is a contract-version change but keeps the vocabulary internally consistent. Alternatively, treat state-variant tokens as a sibling concept (`stateVariants.color.accent.primary.hover`) so they don't pollute the base role namespace.

**Related observation:** Bungee-pro did not produce this gap because its declared semantic CSS layer happened to line up with DCP's static color vocabulary. On any site that ships hover/active/focus/disabled color values distinct from the base role, this gap reappears.

---

## How this file is used

When a new experiment surfaces a contract- or binding-structure issue that the current registry model cannot express cleanly, add an entry here with the same structure (observed where / what's captured now / what's not expressed / what a richer model would need). This separates "model gaps" from "implementation bugs" (which go in per-experiment `INTERNAL-NOTES.md`) and from "research questions" (which live in [live-site-comparison.md](./live-site-comparison.md)).

Two entries is a starting taxonomy, not a finished one.
