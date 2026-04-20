# Failure-case transpile output — known-imperfect, committed as evidence

Nine `.tsx` files produced from `../registry-failure-case.json` — the artifact for this site's axis-disaggregation failure mode. Nine sibling `.button--*` modifiers modeled as nine unrelated components instead of partitioned into axes.

Same transpile defects as `../../bungee-pro/generated/`. See that directory's README for the full list.

Paired with `../generated/Button.tsx`, the diff between 1 Button-with-variants and 9 ButtonX-separate-components is the concrete artifact for the axis-disaggregation critique. See `../FINDINGS.md` section 2.
