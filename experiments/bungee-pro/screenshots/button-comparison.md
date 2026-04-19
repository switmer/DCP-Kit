# Button comparison: real vs. clean transpile vs. failure-case transpile

This is the visual anchor the plan calls for. One image's worth of evidence,
rendered as a three-pane markdown comparison because the transpile output has
string-escaping bugs that prevent straightforward Vite rendering.

---

## Pane 1 — Real Button (bungee-pro.webflow.io)

`.button-primary` (ghost — used for "Let's Talk", "Get in touch"):

```css
.button-primary {
  grid-column-gap: 16px;
  color: var(--colors--black);                /* #1e1e1e */
  font-size: var(--...button-font-size);       /* 1.1rem */
  font-weight: 500;
  letter-spacing: -.02em;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 4px;
  display: flex;
}
```

`.button-secondary` (solid — used for filled CTA blocks):

```css
.button-secondary {
  grid-column-gap: 16px;
  background-color: var(--colors--black);     /* #1e1e1e */
  color: var(--colors--white);                /* #ffffff */
  font-size: 1.1rem;
  font-weight: 500;
  border-radius: 12px;
  height: 56px;
  padding: 16px;
  display: flex;
}
```

**Observation:** Webflow's naming is inverted from typical design-system convention. `.button-primary` is the *quieter* (ghost) treatment; `.button-secondary` is the *louder* (solid) treatment. A human authoring a registry has to notice this inversion and choose whether to preserve Webflow's names or flip to conventional ones. This experiment flipped to conventional (`ghost` / `solid`) — recorded in `variant-rationale.md`.

---

## Pane 2 — Clean transpile output (`generated/components/Button.tsx`)

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        ghost: "bg-gray-500 text-gray-500 p-4",
        solid: "bg-gray-500 text-gray-500 p-4"
      }
    },
    defaultVariants: { variant: "ghost" }
  }
);

export const Button: React.FC<ButtonProps> = ({ variant = "ghost", children, onClick, ...props }) => {
  const variants = buttonVariants({ variant, className });
  return <button className={variants} {...props}>{children}</button>;
};
```

**What it got right:**
- Variant axis round-tripped into CVA with both named variants.
- Default variant matches the authored default.
- `<button>` tag selected correctly from `category: "actions"`.

**What it got wrong:**
- Both variant class strings are identical (`"bg-gray-500 text-gray-500 p-4"`) — transpile did not wire the per-variant `backgroundColor` / `textColor` / `borderRadius` props to distinct Tailwind classes.
- File has literal `\n` escape sequences in the actual output (elided above for readability; see the raw file).
- `children` destructured twice.

---

## Pane 3 — Failure-case transpile output (`generated-failure-case/components/`)

Three separate components, each with its own CVA block:

```tsx
// ButtonHero.tsx
const buttonheroVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  { variants: { variant: { default: "bg-gray-500 text-gray-500" } }, defaultVariants: { variant: "default" } }
);

// ButtonInline.tsx — identical shape, different component name

// ButtonNav.tsx — identical shape, different component name
```

**The three pieces of output have no shared variant axis and no shared component.** They are three entirely independent React components. If a consumer wanted to change "all Buttons to use `rounded-lg`," they would have to edit three files. If a new Button context appeared (say, footer CTA), they would have to author a fourth component from scratch.

---

## The comparison

| | Pane 1 (site) | Pane 2 (clean) | Pane 3 (failure-case) |
|---|---|---|---|
| Component count | 1 (two selectors: `button-primary`, `button-secondary`) | 1 Button | 3 Buttons |
| Variant axis | Yes (by selector) | Yes (ghost/solid) | No |
| Maintainability | — | One file; change once | Three files; change thrice |
| Fidelity to authored styles | — | **Flattened** (both variants → `bg-gray-500`) | Same flattening |
| Represents what clustering would produce | — | If style-signatures differ | If style-signatures match |

The hand-authored registry in Pane 2 is what a thoughtful human produces. The failure-case in Pane 3 is what a style-signature clustering pipeline produces when it can't tell whether two near-identical DOM nodes are "variants of one thing" or "two separate things." **The gap between Panes 2 and 3 is the judgment layer.** It is not missing data — both registries saw the same site. It is a decision the automated pipeline currently cannot make.
