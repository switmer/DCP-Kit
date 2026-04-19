# Variant Rationale

**Scope locked before DevTools:** Button, ProjectCard, TestimonialCard.

This file records the semantic compressions a human made while authoring `registry.json`. An automated extraction pipeline running style-signature clustering against the same DOM nodes would have to perform these judgments — and the current heuristics cannot reliably make them.

## Human judgments made

- **`.button-primary` + `.button-primary-v2` + `.button-secondary` collapsed into one Button component with two variants.** The CSS declares three button selectors; the first two have identical declared styles (see `registry-failure-case.json` for what happens if you don't make this call). I judged them as name duplication, not distinct components. An automated pipeline would have to decide too.
- **`.button-primary` treated as the *ghost* variant, `.button-secondary` as the *solid* variant.** Webflow's naming is inverted from typical design-system conventions (`primary` here is the *quieter* treatment). Matching observed visual weight against canonical role vocabulary required overriding the declared names — a semantic decision, not a lookup.
- **ProjectCard variations (different image, title, date per instance) treated as content variation, not a variant axis.** Five projects render with the same shell; clustering on style-signature would correctly merge them, but if any project had a custom hover treatment, the clustering would have to judge whether it's a new variant or an exception.
- **TestimonialCard variations (different reviewer images/quotes) treated the same way.** Content variation, not structural variation.
- **`#eef0f6` bound to `bg.muted` rather than `border.muted`.** The hex appears both as solid bg on testimonial cards and as semi-transparent overlay (`#eef0f64d`) on template-content-items. A human has to choose which role name to bind it to; the taxonomy forces legibility.

## Per-component rationale

### Button
- **ghost** (from `.button-primary`) — inline CTA with `+` icon, no background, used in body flow and navigation. Primary-CTA-by-placement, not by weight.
- **solid** (from `.button-secondary`) — filled dark pill, `border-radius: 12px`, `height: 56px`, white text on `#1e1e1e`. The loud CTA.
- Both are semantically distinct treatments. The name-flip in Webflow (`primary` = quieter) is intentional here because the solid variant is rarer than the ghost variant on the site.

### ProjectCard
- Single variant. All observed instances render with `border-radius: 32px`, `height: 750px` image block, with a `.pagination` modifier for smaller cards (`height: 550px`, `border-radius: 12px`) on the projects index page. I authored the default only; the pagination variant is bonus work if time allows.

### TestimonialCard
- Single variant. `background: var(--colors--light-gray)` (#eef0f6), `border-radius: 32px`, 2-column grid. No observable variant axis on bungee-pro.

## What this does not capture

- Interactions: project-card-logo-block hover (opacity 0 → 1), testimonial scroll behavior (`position: sticky; top: 80px`).
- Motion: partners-marquee-block and hero-marquee-wrapper animations.
- Pagination modifier on ProjectCard (smaller radius/height variant visible on /projects).
- Responsive breakpoints — all declared values are desktop-state only.

These are knowable gaps, not hidden failures. A pipeline that produces components from static CSS cannot recover behavior that lives in JavaScript or in the distinction between "pose A" and "pose B" of an animation.
