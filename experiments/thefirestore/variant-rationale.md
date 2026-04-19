# Variant Rationale — thefirestore.com

**Scope locked before DevTools:** Button, ProductCard, CategoryTile.
**Contrast target vs bungee-pro:** no CSS custom property layer, raw-hex-only styling.

## Human judgments made

- **Button's four color variants (`primary`, `secondary`, `tertiary`, `accent`) collapsed onto one Button component.** The stencil CSS declares these as sibling modifier classes (`.button--primary`, `.button--secondary`, `.button--tertiary`, `.button--accent`), each with declaratively distinct colors. A style-signature clustering algorithm would *correctly* split them (no identical-styles ambiguity like bungee-pro had). But there's a different judgment call here: **sizing variants** (`.button--large`, `--small`, `--slab`, `--icon`) exist as a **separate axis** — a human has to decide whether to model Button as `{variant, size}` with two independent axes or as a flat union `{type}` with eight values. I chose two axes, matching how the CSS is organized.
- **`.button--inputAction` treated as a non-variant.** It's clearly a specialized internal component (attached to input fields, with `float: left` and negative margins) rather than a user-facing Button variant. A style-signature clusterer would merge it with Button based on the `.button--` prefix; a human reads the context and splits it off. This is a different variant-clustering failure mode from bungee-pro's: **not identical-styles-different-names, but similar-names-different-purposes.**
- **ProductCard's two modifiers (`card`, `card--alternate`) collapsed into one component with a variant axis.** Same call as bungee-pro's Button — the `--alternate` modifier changes hover behavior (red border, red body bg on hover), which reads as a visual-weight variant rather than a distinct component.
- **CategoryTile authored as a distinct component despite sharing `.card` base styles.** Category grid tiles and ProductCards share the same `.card` skeleton in the stencil theme but serve different product-surfaces (category navigation vs. product display). A naive clustering approach would merge them; a human reads the site context and splits them.
- **Hover colors modeled as secondary props on each variant, not as a separate state axis.** CVA typically handles variants as orthogonal axes; hover is a pseudo-class, not a prop. Choosing to capture `hoverBackgroundColor` in the variant prop block is a pragmatic compression — it preserves the information without requiring the generator to understand `:hover` semantics.

## The absence of bungee-pro's ambiguity is itself a finding

Bungee-pro's `.button-primary` and `.button-primary-v2` had **identical declared CSS**, forcing a judgment call between "name duplication" and "distinct semantic slots." Thefirestore's button variants do not have this problem — they are declaratively distinct. **This means automated style-signature clustering would do better here than on bungee-pro, not worse.**

What it does have instead: modifier-class proliferation. `.button--primary` vs. `.button--inputAction` looks similar by name pattern but is semantically different. A clustering algorithm keyed on class naming patterns would over-merge; one keyed on declared styles would correctly split.

This is the point worth naming: **the failure mode is site-dependent.** Variant clustering on Webflow-ish sites with duplicated selectors faces the merge-vs-split ambiguity. Variant clustering on stencil-template sites with rich modifier-class hierarchies faces the name-pattern-vs-purpose ambiguity. Both require judgment; they don't require the *same* judgment.

## Per-component rationale

### Button
- **primary** — brand red (`#c12126`), used as the default "SHOP" / primary CTA. Darkens to `#9b090d` on hover.
- **secondary** — black (`#1a1919`), used for second-priority CTAs. Reverts to brand red on hover.
- **tertiary** — white, used for ghost CTAs on dark backgrounds. Flips to brand red on hover.
- **accent** — gold (`#d2aa21`), reserved for premium/accent context. Uncommon on the homepage.
- Sizing axis (`large`, `small`, `slab`, `icon`) is orthogonal to color and declared separately in CSS. Modeled as a second prop; not enumerated in this registry to keep scope tight.

### ProductCard
- **default** — transparent card, white figure bg, gray border, muted caption. Quiet, lets product imagery dominate.
- **alternate** — red hover state, used for featured / promotional products. Louder visual weight.

### CategoryTile
- Single variant. Homepage grid uses identical treatment across all 16 category tiles.

## What this does not capture

- Dropdown / cart-preview behavior on `.navUser-action--cart`.
- The Algolia instantsearch integration (separate CSS, separate component surface).
- Four sizing modifiers on Button (`large`, `small`, `slab`, `icon`) — scoped to color variants only to keep the experiment tight.
- Stencil-template responsive grid behavior.

As with bungee-pro, these are knowable gaps, not hidden failures.
