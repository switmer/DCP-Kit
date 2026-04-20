# Generated transpile output — known-imperfect, committed as evidence

This directory contains the `.tsx` files produced by running `node experiments/bungee-pro/run-transpile.mjs` against `../registry.json`. The files are **intentionally committed despite known defects** — the output's current state is part of what the experiment documents.

## Known defects in this output

All inherited from `src/commands/transpile.js`, not introduced by the experiment:

- Literal `\n` escape sequences inside lines instead of real newlines (every `.tsx` file)
- Duplicate `children` destructures in function signatures
- Dangling `& VariantProps<typeof xVariants>` after interface bodies — not a valid TS union
- Per-variant hex values flattened to generic Tailwind classes (`bg-gray-500 text-gray-500 p-4` regardless of authored background)

Full list: see `../INTERNAL-NOTES.md`.

## Why this is committed anyway

The transpile output's defects are themselves part of the FINDINGS. A reader inspecting the registry + transpile loop should see what it actually produces today — both the shape that round-trips correctly (variant axis carried through into CVA) and the styling layer that does not (hex values flattened to generic classes). Fixing the bugs and re-committing polished output would hide the evidence.

See `../FINDINGS.md` section "Current implementation gaps" for the strategic framing.
