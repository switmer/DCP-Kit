# Failure-case transpile output — known-imperfect, committed as evidence

`.tsx` files produced from `../registry-failure-case.json` — the artifact that shows what the output looks like when variant-clustering judgment goes the other way (three Buttons as three separate components rather than one with variants).

## Same transpile defects as `../generated/`

All inherited from `src/commands/transpile.js`. See `../INTERNAL-NOTES.md` for the full list. Additionally, this directory's files reference an undeclared `variant` variable (`xVariants({ variant, className })` without `variant` in the destructured signature) — would fail at runtime.

## Why this is committed anyway

Paired with `../generated/`, the side-by-side diff between these two directories is the concrete artifact for the variant-clustering critique. See `../FINDINGS.md` section 2.
