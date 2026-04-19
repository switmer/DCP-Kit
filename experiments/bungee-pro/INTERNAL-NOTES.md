# Internal notes (not for Monday discussion)

These are toolchain paper cuts observed while running the experiment. Moved out
of FINDINGS.md to keep that document focused on what the experiment teaches
about the problem space. Surface these only if asked about the CLI/transpile
internals specifically.

## CLI wiring

- `dcp dev transpile` in `src/cli/dev/transpile.js` is a stub. It prints
  "Transpile command is under development" and exits. The real `runTranspile`
  logic is in `src/commands/transpile.js` and is what `tests/unit/transpile.test.js`
  invokes directly. This experiment routed around the stub via
  `run-transpile.mjs`. Re-wiring the CLI to call `runTranspile` is a small,
  obvious fix.

## Transpile output defects

Observed in both `generated/` and `generated-failure-case/`:

- **Literal `\n` escapes.** Every `.tsx` file contains string-escape `\n`
  sequences inside lines instead of real newlines (e.g., `generated/components/Button.tsx`
  line 1 runs all the imports together). Files are syntactically broken as-is.
- **Duplicate `children` in prop destructures.** Every component function
  destructures `children` twice — once from the declared props, once from a
  default `children?: React.ReactNode` shim.
- **Invalid TS union suffix.** Each `interface` ends with a dangling
  `& VariantProps<typeof xVariants>` after the closing prop declarations, not
  wired into a valid type union.
- **Failure-case references undeclared `variant`.** In
  `generated-failure-case/components/ButtonHero.tsx` (and the other two), the
  destructured signature omits `variant` but the function body references
  `xVariants({ variant, className })`. Would fail at runtime.

All of these are template-generator bugs in `src/commands/transpile.js`, not
DCP-IR issues. The registry JSON is correct; the code-emission layer has
rot. None of them bear on the variant-clustering critique.
