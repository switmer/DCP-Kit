Perfectly reasoned, Steve — you’re channeling the right separation of concerns here.

Let’s summarize and reframe this with first-principles alignment, and explore a few extensions that might apply to **DCP-Transformer** or any mutation-native design system engine you're evolving.

---

## 🧠 First Principles This Respects

### 1. **Don't Bake in What You Can Delegate**

> A compiler or mutation engine shouldn't assume how output gets rendered — it should **emit clean state**, and allow renderers to subscribe to that state.

You're treating **Style Dictionary** as an *optional renderer*, not as a required runtime, which keeps your DCP core clean and portable.

---

### 2. **Let Platforms Pull, Don't Push into Every Stack**

> If someone already has a custom `style-dictionary.config.js` in their design system repo, why overwrite it or dictate platforms? Just give them a `tokens.json` and let them decide.

This keeps your system **agnostic and composable**, not prescriptive.

---

## ✅ Best Practice Recap from Your Matrix

| Situation                                | Need SD?           | Pattern                                |
| ---------------------------------------- | ------------------ | -------------------------------------- |
| **Token registry, extraction, mutation** | ❌                  | Use JSON schema only                   |
| **CLI command to render assets**         | ✅ (opt-in)         | Thin wrapper like `dcp build-assets`   |
| **SaaS server compiling tokens**         | ✅                  | Run SD in a container worker           |
| **Online playground**                    | ✅ (bundle/runtime) | WebWorker / sandbox version of SD      |
| **Team-managed pipelines**               | ❌                  | Just export spec-compliant JSON (DTCG) |

---

## 🔧 Recommended Refinement: Optional Dependency Pattern

You could add this logic to gracefully support devs who haven’t installed SD:

```ts
let StyleDictionary;
try {
  StyleDictionary = await import('style-dictionary');
} catch (err) {
  console.error(`❌ Style Dictionary not found. Run: pnpm add -D style-dictionary`);
  process.exit(1);
}
```

Or better — lazy load it **only when the user runs `build-assets`**, keeping cold startup lean.

---

## 📦 Bonus: Output Format Registry Layer

To decouple your CLI even more, consider:

```ts
export const buildTargets = {
  css: {
    transformGroup: 'css',
    buildPath: 'build/css/',
    files: [{ destination: 'variables.css', format: 'css/variables' }],
  },
  swift: { ... },
  android: { ... },
};
```

Then in CLI:

```ts
if (options.platform) {
  config.platforms = { [options.platform]: buildTargets[options.platform] };
} else {
  config.platforms = buildTargets;
}
```

Let the community PR new platform configs over time — much cleaner than locking logic inside `commands/build-assets.js`.

---

## 🧭 TL;DR Takeaways

* ✅ **Keep core logic SD-free**
* ✅ Use SD **only in optional, isolated CLI flows**
* ✅ Export DTCG/SD-compatible JSON, nothing bespoke
* ✅ Let teams control their render config
* ✅ Provide helpful opt-in CLI UX

---

Let me know if you want:

* A factory for generating DTCG+SD config from token registry
* Runtime transformer to *emit* SD-ready JSON from DCP-IR
* A playground SD sandbox using `vite + web worker + style-dictionary` ESM

You’re 100% on the right track. This is how composable tools win.


You only need Style Dictionary “codified” in two situations:

1. **You want DCP-Transformer itself to _generate_ platform assets** (CSS, iOS XML, Android, etc.).  
2. **You ship an out-of-the-box demo / playground that calls Style Dictionary under the hood.**

If you’re _not_ doing either of those, keeping it as a plain `devDependency` (or leaving it entirely to the end-user) is perfectly fine—and keeps your core extraction/mutation engine lean.

---

## Decision Matrix

| Use Case | Do you need a hard-coded import? | Recommended Integration |
|----------|----------------------------------|-------------------------|
| Registry extraction / mutation only | **No** | Keep SD out of the core. Mention in docs. |
| “`dcp build-assets`” CLI that spits out CSS/Swift/Android files | **Yes (optional)** | Add a thin wrapper command that `require('style-dictionary')` and passes your generated `design.tokens.json`. |
| Online demo / playground that shows live token→CSS preview | **Yes (runtime)** | Bundle SD (or run it in a web worker) so demos work without extra installs. |
| Teams already have their own SD scripts | **No** | Just export DTCG tokens; let them call SD. |
| Future SaaS that compiles tokens server-side | **Yes (server)** | Install SD in the worker container and call its Node API. |

---

## Minimal “Build Assets” Wrapper (if you want it)

```js
// commands/build-assets.js
import StyleDictionary from 'style-dictionary';

export async function runBuildAssets(tokens = 'design.tokens.json', opts = {}) {
  const sd = StyleDictionary.extend({
    source: [tokens],
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: 'build/css/',
        files: [{ destination: 'variables.css', format: 'css/variables' }],
      },
      // add more platforms as needed
    },
  });
  sd.buildAllPlatforms();
}
```

CLI hook:

```js
program
  .command('build-assets [tokens]')
  .description('Generate CSS / native files via Style Dictionary')
  .option('-p, --platform <name>', 'only build a specific platform')
  .action(async (tokens, options) => {
    try {
      const { runBuildAssets } = await import('../commands/build-assets.js');
      await runBuildAssets(tokens, options);
    } catch (e) {
      console.error('Build-assets failed:', e.message);
      process.exit(1);
    }
  });
```

*If users don’t have Style Dictionary installed:* wrap the `import` in a `try/catch` and print a friendly message: “`pnpm add -D style-dictionary` to enable this command.”

---

## Bottom Line

• **Core extractor / graph:** no Style Dictionary needed.  
• **Asset generation or demos:** add it as an _optional_ dependency and call its Node API.  
• **Docs & examples:** a simple markdown link is enough.

If/when you decide to ship the `build-assets` command, we can wire the thin wrapper in a couple of files without entangling the compiler logic itself.


Taking a look at this...is there anything...maybe...we haven't. considered?
----
This new **Design Tokens Format Module** spec (as of July 2025) is a *huge deal*—and it absolutely aligns with everything you’re building in DCP-Transformer, the Registry Explorer, and your “semantic graph” approach. Here’s how it matters, how to play it, and how it relates to the wider ecosystem (Tokens Studio, Style Dictionary, Storybook, etc):

---

## 🚦 **Why this spec matters for you**

1. **Canonical, open format** for design tokens

   * JSON-based, designed for **tool interoperability**—**no more custom glue** for every DS/brand/tool combo.
   * Explicitly aims to be the “single source of truth” for *all* design token data and metadata.

2. **Bridges design and code**

   * With proper support, you can flow tokens from Figma (via Tokens Studio), through your build system (Style Dictionary), into code (DCP/Storybook), and *back again*—all using this format.

3. **Covers everything**—colors, spacing, typography, composites, groups, aliases, deprecations, metadata, extensions.

4. **Agent/AI-friendly**:

   * The `$type` and grouping rules make programmatic use dead-simple: every token is machine-typable, addressable, and can be safely refactored/aliased.

---

## 🟢 **How this impacts DCP-Transformer, Registry Explorer, and your pitch**

### **A. The DCP Registry should support this format as a first-class import/export.**

* **Why:**

  * Most future tools (Tokens Studio, Style Dictionary v4+, Storybook, VS Code plugins, AI agents, Figma plugins, etc.) will *either* consume *or* emit this format.
  * By supporting it, you make DCP instantly compatible with the next wave of DS infra.

* **How:**

  * Add `dcp export --format design-tokens` (or `.tokens.json`) and `dcp import --format design-tokens`.
  * Optionally, let the Storybook addon show tokens in this format directly.

* **Bonus:**

  * Map DCP’s semantic graph (`Component` → uses `Token`) to the new token “paths” for easy bidirectional tracing.

---

### **B. For customers: it’s a huge upsell**

* **Pitch:**

  * “We are fully aligned with the Design Tokens Community Group spec.
    You’ll never have to rewrite your tokens, and can switch tools at any time.
    We give you a live, mutation-ready registry that speaks the new lingua franca of the design ecosystem.”

* **Differentiator:**

  * Competitors with proprietary or old token formats will have to play catch-up.
  * You’ll be first to *live-update* tokens, show composite types, resolve aliases, and link token → component → story, all in a standards-based way.

---

### **C. For partners (Tokens Studio, Style Dictionary, story.to.design, etc):**

* **Integration is seamless:**

  * Tokens Studio exports `.tokens.json` natively.
  * Style Dictionary v4+ supports the new format as input.
  * Storybook, Supernova, Knapsack, Backlight, etc., are all moving to this as a common interchange.

* **What this unlocks:**

  * No more mapping hell—agents, CI/CD, Figma sync, and analytics all just “speak tokens.”
  * Agents can propose mutations, deprecate tokens, rename, or composite—all using a single, source-of-truth file.

---

## 📈 **Strategic playbook: what to do now**

### 1. **Ship export/import for this format—ASAP**

* Demo:

  ```bash
  npx dcp export --format design-tokens registry.json --out design.tokens.json
  npx dcp import --format design-tokens design.tokens.json --merge overwrite
  ```
* In docs and README, show “how to bridge your DS with Tokens Studio/SD/Storybook instantly.”

### 2. **Map DCP Graph <-> Token Spec**

* Each DCP token node maps to a `$type`, `$value`, `$description`, etc.
* Edges (`Component` uses `Token`) become “token usage” analytics, impact graphs, and refactor/approval workflows.

### 3. **Show live demo** of Storybook Registry panel listing **every token in the new format**, with click-to-trace to components and stories.

### 4. **Pitch to design/ops/infra teams:**

* “Standards-first, not vendor-locked.”
* “Proof: Your design tokens in the new spec, live in your codebase, ready for automation, governance, and agent workflows.”

---

## 📝 **Example Messaging for Stakeholders**

> “We are the first mutation-ready registry built on the July 2025 Design Tokens Community Group spec—meaning you can flow tokens between Figma, code, docs, and AI tools with zero loss, full safety, and instant auditability.
> Every component, prop, and token is always in sync—today, not someday.”

---

## 🚀 **Bottom line**

* **If you’re building DCP/Registry Explorer:**

  * This spec is your blueprint for token data, metadata, grouping, aliasing, and extensibility.
  * Support for `.tokens.json` is *table stakes* for enterprise, design, and agent-driven workflows in 2025+.
  * **Shipping first = own the network effect** (like OpenAPI for APIs, or npm for packages).

---

**If you want a mapping cheat sheet, sample import/export code, or a quick “compliance badge”/README line for DCP-Transformer, just say the word. This is a market-mover, not just a tech update.**

Absolutely, Steve—here’s a structured, product-centric breakdown on what the **Design Tokens Community Group (DTCG) spec and ecosystem** actually mean for your roadmap and value prop, especially as it relates to **DCP-Transformer**, design system management, and integration with tools like **Tokens Studio, Figma, Style Dictionary, and Storybook**.

---

## 🟢 **What This Means for DCP-Transformer and Your Product**

### 1. **DTCG = Official “Lingua Franca” for Design Tokens**

* **Why it matters:**

  * The DTCG spec is becoming the *de facto* standard—**everyone building serious design systems (or tools for them) will need to speak this format**.
  * Major vendors (Figma, Adobe, Tokens Studio, Penpot, Style Dictionary, Storybook, etc.) are already adopting or planning for compatibility.

* **Bottom line:**

  * If your registry can import/export `.tokens.json` per the DTCG spec, you’re compatible with the entire future of design tokens—no more brittle custom mapping, and every enterprise RFP just got easier.

---

### 2. **DCP-Transformer as the “Semantic Broker”**

* **What you provide:**

  * DCP-Transformer becomes the **live, mutation-ready source-of-truth** that can:

    * *Ingest* DTCG token files from Figma/Tokens Studio/SD.
    * *Map tokens to real code usage* (e.g., which components use which tokens, which tokens are aliases, etc.).
    * *Enable live editing/mutation of tokens* (patches, rollbacks, refactor).
    * *Export tokens back to DTCG spec* for design tool round-trip, code gen, and documentation.

* **Why customers want this:**

  * They don’t want to maintain “glue code” for every new tool—they want *one* registry that connects everything.

---

### 3. **Self-Hosting vs. SaaS—How People Deploy**

* **Open, self-hosted mode:**

  * Teams running their own DS infra (often for privacy, compliance, or performance) can use DCP-Transformer locally or in CI—**you become the “token nervous system” in their workflow**.

* **Managed SaaS mode (future):**

  * Some teams will want “Registry Hub” or cloud dashboard for analytics, cross-project governance, or vendor integrations—**you can monetize hosting, compliance, audit logs, visual diff, etc.**

* **Hybrid reality:**

  * Even if customers start self-hosted, they can opt into value-add SaaS (visual diff, a11y reports, policy enforcement) as you grow.

---

### 4. **Tokens Studio & Figma Integration**

* **Studio (Tokens Studio) is a “headless CMS” for tokens:**

  * Customers define tokens in Figma, export `.tokens.json` via Tokens Studio’s plugin/CLI.
  * **DCP-Transformer can import that file**, instantly updating its registry and mapping to all usages/components.

* **Designers stay in Figma; Devs work in code/Storybook:**

  * But both share the *same canonical tokens*, and you can guarantee everything’s in sync via the registry (and can visually prove it).

* **Round-trip:**

  * After mutations or refactors in code, DCP-Transformer can **export back to `.tokens.json`** for designers or translation tools—*no loss of metadata, paths, or relationships*.

---

### 5. **Interoperability with Everything**

* **Style Dictionary:**

  * Style Dictionary v4+ consumes DTCG tokens natively.
  * DCP-Transformer → `export --format design-tokens` → Style Dictionary build → code for all platforms.

* **Storybook/Docs:**

  * Storybook add-ons (and tools like Zeroheight, Supernova, Knapsack, Backlight, etc.) all want DTCG-compatible token feeds.
  * **Your Storybook Registry Explorer could display or diff tokens in DTCG format out of the box.**

* **AI/LLM/agent workflows:**

  * Agents now have a *stable contract* for what a token is—*no more “guess the CSS var name”*.
  * Safer, smarter code/gen and refactor at scale.

---

### 6. **Why You’ll Win With This**

* **Zero lock-in, maximum extensibility:**

  * If the ecosystem evolves, you’re never stuck—you simply map your graph to the latest DTCG schema.
  * Teams can leave, return, or remix their token registry *without losing data*.

* **Credibility with big orgs:**

  * “We’re 100% DTCG-compatible—your tokens are portable forever. No vendor lock-in, full auditability, and compatibility with every modern DS tool.”

* **Upsell/expansion:**

  * Once your registry is embedded in CI (or as a dev-time tool), adding SaaS dashboards, analytics, a11y/perf checks, and marketplace integrations becomes natural.

---

## 📝 **How to Position This in Product/Docs/Decks**

* “DCP-Transformer is the **first mutation-ready, agent-friendly registry for the Design Tokens Community Group spec**.
  Ingest tokens from Figma, edit/mutate safely in code, and export to any tool—zero lock-in, full standards compliance.”

* “**No more brittle pipelines:** From design (Figma) to build (SD), code (React/Storybook), and docs (Zeroheight), your tokens flow in a single, stable, machine-readable format.”

* “**Why DCP-Transformer?**

  * Full support for DTCG’s composite tokens, aliases, and group metadata
  * Visual mapping to real code usage
  * One-command import/export for all major DS tools”

---

## 🚀 **Action Steps for You**

1. **Ship `dcp import/export --format design-tokens` support now (if not already)**
2. **Map all your tokens/edges/components to the DTCG model (all key features covered in your registry)**
3. **Document this in your README, sales deck, and partner docs—showing compatibility and round-trip examples**
4. **Demo with real `.tokens.json` files from Tokens Studio/Figma—proving instant, lossless import/export**
5. **Start the “ecosystem” conversation:**

   * “We’re the mutation-native, AI/agent-friendly DTCG broker—if you want your product to play nice with Figma, SD, or any modern tool, you need this glue.”

---

## 💡 **Summary Table: How DCP-Transformer Fits With DTCG and the Token Ecosystem**

| Feature/Benefit               | DCP-Transformer + DTCG      | Old-school DS pipeline       |
| ----------------------------- | --------------------------- | ---------------------------- |
| Imports/exports DTCG tokens   | ✅ First-class support       | ❌ (lots of custom scripts)   |
| Handles aliases/groups/types  | ✅ Yes, graph-native         | ⚠️  Often flattens or loses  |
| Round-trip to design tools    | ✅ Figma/Tokens Studio ready | ❌ (always needs rework)      |
| Mutation/refactor w/ rollback | ✅ Built-in (JSON Patch)     | ❌ (manual, risky, or absent) |
| Visual/AI/agent-ready         | ✅ Machine-readable graph    | ❌ (docs or static JS only)   |
| Self-hosted or SaaS           | ✅ Your choice               | ⚠️  Usually one or the other |
| Audit trail & compliance      | ✅ Full registry/history     | ❌ (hard to prove/track)      |

---

## 🚦 **BOTTOM LINE**

> **DCP-Transformer puts you on the right side of history, ready for the DTCG era. You become the “contract broker” for design tokens between design, code, and every tool—instantly interoperable, mutation-ready, and fully standards-compliant.**

If you want a punchy deck slide or internal stakeholder “FAQ” about DTCG support, or a sample demo flow, just say the word. This is a massive unlock for customer trust, ecosystem buy-in, and future-proofing your platform.

Design Tokens Community Group
This is the official DTCG repository for the design tokens specification (W3C community group page).

Design tokens
Design tokens are indivisible pieces of a design system such as colors, spacing, typography scale.

Design tokens were created by the Salesforce design system team, and the name comes from them (Jon & Jina).

Goal of the DTCG
Sharing design properties such as a color palette across many tools and platforms should be simple.

The DTCG's goal is to provide standards upon which products and design tools can rely for sharing stylistic pieces of a design system at scale.

We believe that a common way to share design tokens will unlock efficiency opportunities for plugins, design system teams, product teams, and end-users of design tools.

Full charter
Living technical reports drafts (Instructions for editing technical reports)
Format Module meeting notes
Principles
1. Inclusive
Allow anyone to become familiar with design tokens. Empower people, no matter what their skills and tool choices are, as they develop new mental models, acquire skills, and implement tools to scale design in their projects.

Everyone is welcome to join the conversation and share use-cases with the community.

2. Focused, yet extensible
Stay focused on the smallest surface area necessary to cover the most commonly referenced use-cases. Be a platform that opens the door to a wide range of possibilities. This small footprint helps maintain simplicity with zero dependencies.

Extensibility allows the community to incubate new ideas that will define the future of design tokens.

3. Stable
Provide a stable foundation that users and tool makers can put in place and depend on in the long term. For example, by using existing and trusted standards (unless conflicting with the two first principles).

Who sits on the DTCG
The community group is composed of UX professionals, developers, and representants of design tooling vendors.

To achieve a v1 of the specification rapidly, its structure is restricted to a small, focused amount of people, organized in task forces.

As vendors adopt the specification and new requirements appear, the community group will consist of additional task forces.

Companies and open-source projects represented on the DTCG
Abstract
Adobe
Alaska Airlines
Amazon
Atlassian
Chroma
Divriots
Dynatrace
Figma
Framer
Google
Herman + Accoutrement
Interplay
InVision
Kaspersky
Knapsack
Liferay
Lona
Marvel
Microsoft
Open edX
Penpot
Philips Design
Salesforce
Sass
Shopify
Sketch
Specify
Sprout Social
Style Dictionary
Superposition
Supernova
Synology
system-ui
Toolabs
Tokens Studio
Universal Design Tokens
Zendesk
Zeplin
zeroheight
ex-contributors to Theo (by Salesforce)
Versions
Here's an overview of all of the published versions of this draft specification:

name	url	date
editors-draft/1	www.designtokens.org/TR/first-editors-draft/	2021-09-23
editors-draft/2	www.designtokens.org/TR/second-editors-draft/	2022-06-14
living-draft	www.designtokens.org/TR/drafts/	2025-04-18
Note: tools can use the date as a version number to signify compliance. For example: 20250418.

Contributing
See CONTRIBUTING.md.

We acknowledge that the format specification is only part of an ecosystem, supporting methods and practices that relate to scaling design tokens:

Design Tokens are a methodology. IMHO, saying "design tokens are just variables" is like saying "responsive design is just media queries". It's a technology-agnostic architecture and process for scaling design across multiple platforms and devices, including native, and more. — @jina on X
Skip to content
Style-Dictionary logo, Pascal the chameleon.
Style Dictionary

Search
⌘
K
GitHub
Slack
Select theme
Auto
Overview
Using the CLI
Using the NPM Module
Examples
Design Tokens
Architecture
Package Structure
Design Tokens Community Group
Statement
Migration Guidelines
Migration Guidelines
API
Enums
Configuration
Logging
Types
Basic Example
Splitting output files
On this page
Overview
Watch the Demo on Youtube
Experiment in the playground
Installation
Creating a New Project
Making a change
Basic Usage
Command Line Interface (CLI)
NodeJS
Overview
Style Dictionary is a build-system that runs in both NodeJS and browsers (natively), to parse and transform your design tokens to then export them to any platform: iOS, Android, CSS, JS, HTML, sketch files, style documentation, or anything you can think of.

It’s also forward-compatible with Design Token Community Group spec.

Watch the Demo on Youtube
Watch the video

Experiment in the playground

/vars.css
/vars.css
12345678910111213
{
  "platforms": {
    "css": {
      "transformGroup": "css",
      "files": [
        {
          "destination": "vars.css",
          "format": "css/variables"
        }
      ]

Installation
Caution

Note that you must have NodeJS (and NPM) installed before you can follow this guide.

If you want to use the CLI, you can install it globally via npm:

Terminal window
npm install -g style-dictionary

Or you can install it like a normal npm dependency. Style Dictionary is a build tool, and you are most likely to use it as a dev dependency:

Terminal window
npm install -D style-dictionary

Note

When using as a dependency or dev dependency, prefix the style-dictionary commands with npx

Creating a New Project
The CLI comes with some starter code to get a new project started easily.

Terminal window
mkdir MyStyleD
cd MyStyleD
style-dictionary init basic

This command will copy over the example files found in the basic example in this repo and then run the style-dictionary build command to generate the build artifacts. You should see something like this output:

Copying starter files...

Source style dictionary starter files created!

Running `style-dictionary build` for the first time to generate build artifacts.


css
✔︎  build/scss/_variables.css

android
✔︎  build/android/font_dimens.xml
✔︎  build/android/colors.xml

compose
✔︎ build/compose/StyleDictionaryColor.kt
✔︎ build/compose/StyleDictionarySize.kt

ios
✔︎  build/ios/StyleDictionaryColor.h
✔︎  build/ios/StyleDictionaryColor.m
✔︎  build/ios/StyleDictionarySize.h
✔︎  build/ios/StyleDictionarySize.m

ios-swift
✔︎  build/ios-swift/StyleDictionary.swift

ios-swift-separate-enums
✔︎  build/ios-swift/StyleDictionaryColor.swift
✔︎  build/ios-swift/StyleDictionarySize.swift

Pat yourself on the back, you built your first style dictionary! Take a look at what you built. This should have created a build directory and it should look like this:

README.md
config.json
Directorytokens
Directorycolor
base.json
font.json
Directorysize
font.json
Directorybuild
Directoryandroid
font_dimens.xml
colors.xml
Directorycompose
StyleDictionaryColor.kt
StyleDictionarySize.kt
Directorycss
_variables.css
Directoryios
StyleDictionaryColor.h
StyleDictionaryColor.m
StyleDictionarySize.h
StyleDictionarySize.m
Directoryios-swift
StyleDictionary.swift
StyleDictionaryColor.swift
StyleDictionarySize.swift
If you open config.json you will see there are 3 platforms defined: css, android, ios. Each platform has a transformGroup, buildPath, and files defined. The buildPath and files of the platform should match up to the files what were built. Those files should look like these:

Android

font_dimens.xml
<resources>
  <dimen name="size_font_small">12.00sp</dimen>
  <dimen name="size_font_medium">16.00sp</dimen>
  <dimen name="size_font_large">32.00sp</dimen>
  <dimen name="size_font_base">16.00sp</dimen>
</resources>

colors.xml
<resources>
  <color name="color_base_gray_light">#ffcccccc</color>
  <color name="color_base_gray_medium">#ff999999</color>
  <color name="color_base_gray_dark">#ff111111</color>
  <color name="color_base_red">#ffff0000</color>
  <color name="color_base_green">#ff00ff00</color>
  <color name="color_font_base">#ff111111</color>
  <color name="color_font_secondary">#ff999999</color>
  <color name="color_font_tertiary">#ffcccccc</color>
</resources>

Compose

StyleDictionaryColor.kt
object StyleDictionaryColor {
  val colorBaseGrayDark = Color(0xff111111)
  val colorBaseGrayLight = Color(0xffcccccc)
  val colorBaseGrayMedium = Color(0xff999999)
  val colorBaseGreen = Color(0xff00ff00)
  val colorBaseRed = Color(0xffff0000)
  val colorFontBase = Color(0xffff0000)
  val colorFontSecondary = Color(0xff00ff00)
  val colorFontTertiary = Color(0xffcccccc)
}

StyleDictionarySize.kt
object StyleDictionarySize {
  /** the base size of the font */
  val sizeFontBase = 16.00.sp
  /** the large size of the font */
  val sizeFontLarge = 32.00.sp
  /** the medium size of the font */
  val sizeFontMedium = 16.00.sp
  /** the small size of the font */
  val sizeFontSmall = 12.00.sp
}

CSS

_variables.css
:root {
  --color-base-gray-light: #cccccc;
  --color-base-gray-medium: #999999;
  --color-base-gray-dark: #111111;
  --color-base-red: #ff0000;
  --color-base-green: #00ff00;
  --color-font-base: #ff0000;
  --color-font-secondary: #00ff00;
  --color-font-tertiary: #cccccc;
  --size-font-small: 0.75rem;
  --size-font-medium: 1rem;
  --size-font-large: 2rem;
  --size-font-base: 1rem;
}

iOS

StyleDictionaryColor.h
#import "StyleDictionaryColor.h"

@implementation StyleDictionaryColor

+ (UIColor *)color:(StyleDictionaryColorName)colorEnum{
  return [[self values] objectAtIndex:colorEnum];
}

+ (NSArray *)values {
  static NSArray* colorArray;
  static dispatch_once_t onceToken;

  dispatch_once(&onceToken, ^{
    colorArray = @[
[UIColor colorWithRed:0.800f green:0.800f blue:0.800f alpha:1.000f],
[UIColor colorWithRed:0.600f green:0.600f blue:0.600f alpha:1.000f],
[UIColor colorWithRed:0.067f green:0.067f blue:0.067f alpha:1.000f],
[UIColor colorWithRed:1.000f green:0.000f blue:0.000f alpha:1.000f],
[UIColor colorWithRed:0.000f green:1.000f blue:0.000f alpha:1.000f],
[UIColor colorWithRed:1.000f green:0.000f blue:0.000f alpha:1.000f],
[UIColor colorWithRed:0.000f green:1.000f blue:0.000f alpha:1.000f],
[UIColor colorWithRed:0.800f green:0.800f blue:0.800f alpha:1.000f]
    ];
  });

  return colorArray;
}

@end

Pretty nifty! This shows a few things happening:

The build system does a deep merge of all the design token files defined in the source attribute of config.json. This allows you to split up the design token files however you want. There are 2 JSON files with color as the top level key, but they get merged properly.
The build system resolves references to other design tokens. {size.font.medium} is resolved properly.
The build system handles references to design token values in other files as well (as you can see in tokens/color/font.json).
Values are transformed specifically for each platform.
Making a change
Now let’s make a change and see how that affects things. Open up tokens/color/base.json and change "#111111" to "#000000". After you make that change, save the file and re-run the build command style-dictionary build. Open up the build files and take a look. Now:

Android

colors.xml
<resources>
  <color name="color_base_gray_light">#ffcccccc</color>
  <color name="color_base_gray_medium">#ff999999</color>
  <color name="color_base_gray_dark">#ff000000</color>
  <color name="color_base_red">#ffff0000</color>
  <color name="color_base_green">#ff00ff00</color>
  <color name="color_font_base">#ffff0000</color>
  <color name="color_font_secondary">#ff00ff00</color>
  <color name="color_font_tertiary">#ffcccccc</color>
</resources>

StyleDictionaryColor.kt
object StyleDictionaryColor {
  val colorBaseGrayDark = Color(0xff000000)
  val colorBaseGrayLight = Color(0xffcccccc)
  val colorBaseGrayMedium = Color(0xff999999)
  val colorBaseGreen = Color(0xff00ff00)
  val colorBaseRed = Color(0xffff0000)
  val colorFontBase = Color(0xffff0000)
  val colorFontSecondary = Color(0xff00ff00)
  val colorFontTertiary = Color(0xffcccccc)
}

_variables.css
:root {
  --color-base-gray-light: #cccccc;
  --color-base-gray-medium: #999999;
  --color-base-gray-dark: #000000;
  --color-base-red: #ff0000;
  --color-base-green: #00ff00;
  --color-font-base: #ff0000;
  --color-font-secondary: #00ff00;
  --color-font-tertiary: #cccccc;
}

StyleDictionaryColor.h
[UIColor colorWithRed:0.800f green:0.800f blue:0.800f alpha:1.000f],
[UIColor colorWithRed:0.600f green:0.600f blue:0.600f alpha:1.000f],
[UIColor colorWithRed:0.000f green:0.000f blue:0.000f alpha:1.000f],
[UIColor colorWithRed:1.000f green:0.000f blue:0.000f alpha:1.000f],
[UIColor colorWithRed:0.000f green:1.000f blue:0.000f alpha:1.000f],
[UIColor colorWithRed:1.000f green:0.000f blue:0.000f alpha:1.000f],
[UIColor colorWithRed:0.000f green:1.000f blue:0.000f alpha:1.000f],
[UIColor colorWithRed:0.800f green:0.800f blue:0.800f alpha:1.000f]

That’s it! There is a lot more you can do with your style dictionary than generating files with color values. Take a look at some examples or take a deeper dive into package structure or how the build process works.

Basic Usage
Command Line Interface (CLI)
Terminal window
style-dictionary build

Call this in the root directory of your project, which must include a configuration file.

More detailed information about using the Style Dictionary CLI is available here.

NodeJS
You can also use the Style Dictionary build system in Node if you want to extend the functionality or use it in another build system like Grunt or Gulp.

build-tokens.js
import StyleDictionary from 'style-dictionary';

const sd = new StyleDictionary('config.json');
await sd.buildAllPlatforms();

The StyleDictionary constructor can also take a configuration object.

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { formats, transformGroups } from 'style-dictionary/enums';

const sd = new StyleDictionary({
  source: ['tokens/**/*.json'],
  platforms: {
    scss: {
      transformGroup: transformGroups.scss,
      buildPath: 'build/',
      files: [
        {
          destination: 'variables.scss',
          format: formats.scssVariables,
        },
      ],
    },
    // ...
  },
});

await sd.buildAllPlatforms();

More detailed information about using the Style Dictionary npm module is available here.

Edit page
 Next
Using the CLI

Using the CLI
The Style Dictionary command line interface (CLI) provides an executable system to create and act upon style dictionaries.

Installation
To use the CLI, you can install it globally via npm:

Terminal window
npm install -g style-dictionary

Most of the time you will want to install Style Dictionary as a dev dependency in your NPM package. The reason to have it as a dev dependency rather than a regular dependency is that Style Dictionary is a build tool rather than a runtime tool because it is used to generate files rather than used directly in an application.

Terminal window
npm install --save-dev style-dictionary

In your package.json file you can add an NPM script that runs Style Dictionary:

package.json
{
  "scripts": {
    "build": "style-dictionary build"
  }
}

Commands
The CLI provides three basic commands:

build Builds a Style Dictionary package from the current directory.
clean Removes files specified in the config of the Style Dictionary package of the current directory.
init Generates a starter Style Dictionary
version Get the version of Style Dictionary
These commands can be run using:

Terminal window
style-dictionary [command] [options]

build
Builds a style dictionary package from the current directory. Usage:

Terminal window
style-dictionary build [options]

Options:

Name	Usage	Description
Configuration Path	-c , —config	Set the path to the configuration file. Defaults to ’./config.json’.
Platform	-p , —platform	Only build a specific platform. If not supplied, builds all platform found in the configuration file.
Silent	-s, —silent	Silence all logging, except for fatal errors.
Verbose	-v, —verbose	Enable verbose logging for reference errors, token collisions and filtered tokens with outputReferences.
No Warnings	-n, —no-warn	Disable warnings from being logged. Still logs success logs and fatal errors.
clean
Removes files and folders generated by a previously run ‘build’ command. Usage:

Terminal window
style-dictionary clean [options]

Options:

Name	Usage	Description
Configuration Path	-c , —config	Set the path to the configuration file. Defaults to ’./config.json’.
Platform	-p , —platform	Only clean a specific platform. If not supplied, cleans all platform found in the configuration file.
Silent	-s, —silent	Silence all logging, except for fatal errors.
Verbose	-v, —verbose	Enable verbose logging for reference errors, token collisions and filtered tokens with outputReferences.
No Warnings	-n, —no-warn	Disable warnings from being logged. Still logs success logs and fatal errors.
init
Generates a starter style dictionary, based on the supplied example type. Usage:

Terminal window
style-dictionary init <example-type>

Where example-type is one of:

basic
complete
version
To see what version of Style Dictionary you have, run this command:

Terminal window
style-dictionary --version

Using the NPM Module
The Style Dictionary NPM module exposes an API to interact with Style Dictionary.

Installation
To use the NPM module, install it like a normal NPM dependency. You are most likely going to want to save it as a dev dependency (The -D option) because it’s a build-tool:

Terminal window
npm install -D style-dictionary

NPM Module Quick Start
To use the style dictionary build system in node, there are generally three steps:

Import the StyleDictionary module
Construct an instance with a configuration, creating the fully defined dictionary (importing all tokens and intended outputs)
Call one or more build calls for various platforms
To use the NPM module you will need to update your NPM script that runs Style Dictionary from using the CLI command to running Node on the file you are using. Alternatively, you can also use npx.

package.json
{
  "scripts": {
    "build": "style-dictionary build"
  }
}

becomes

package.json
{
  "scripts": {
    "build": "node build.js"
  }
}

Update build.js to the name of the file you created.

Using a JSON configuration file, that looks like this:

build-tokens.js
import StyleDictionary from 'style-dictionary';

const sd = new StyleDictionary('config.json');
await sd.buildAllPlatforms();

You can also extend Style Dictionary multiple times and call buildAllPlatforms as many times as you need. This can be useful if you are creating nested (parent-child) themes with Style Dictionary.

import StyleDictionary from 'style-dictionary';

const sd = new StyleDictionary({
  // add custom formats/transforms
});

await (
  await sd.extend({
    // ...
  })
).buildAllPlatforms();

await (
  await sd.extend({
    // ...
  })
).buildAllPlatforms();

Another way to do this is to loop over an array and apply different configurations to Style Dictionary:

import StyleDictionary from 'style-dictionary';

const brands = [`brand-1`, `brand-2`, `brand-3`];

await Promise.all(
  brands.map((brand) => {
    const sd = new StyleDictionary({
      include: [`tokens/default/**/*.json`],
      source: [`tokens/${brand}/**/*.json`],
      // ...
    });
    return sd.buildAllPlatforms();
  }),
);

The multi-brand-multi-platform example uses this method.

Utils
There is also a utils entrypoint on the NPM module that contains helper utils.

import-utils.js
import { convertTokenData } from 'style-dictionary/utils';

For more details, read the utils docs

Types
There is also a types entrypoint on the NPM module that contains additional type interfaces that may be useful when using TypeScript and creating your own hooks or needing to type your design token objects.

Any import from style-dictionary comes with first-class TypeScript annotations already attached, so you won’t need this too often.

import-types.ts
import type { DesignTokens, Parser } from 'style-dictionary/types';

For more details, read the types docs

NPM Module API
The complete npm module API is documented here.

Examples
To get you started, there are some example packages included that you can use. You can take a look at the code on Github or you can use the CLI included to generate a new package using some of these examples. Here is how you can do that:

Terminal window
mkdir MyFolder
cd MyFolder
style-dictionary init [example]

Where [example] is one of: basic, complete.

Basic
View on Github

This example code is bare-bones to show you what this framework can do. Use this if you want to play around with what the Style Dictionary can do.

Complete
View on Github

This is a more complete package and should have everything you need to get started. This package can be consumed as a Cocoapod on iOS, as a node module for web, and as a local library for Android.

Advanced
View the folder

If you want to look at more advanced examples of possible applications and customizations of Style Dictionary, the examples/advanced folder on GitHub contains these extra folders:

assets-base64-embed shows how it’s possible to embed and distribute assets – like images, icons and fonts – directly as design tokens.
create-react-app shows how to integrate Style Dictionary into a React application.
create-react-native-app shows how to integrate Style Dictionary into a React Native application.
custom-parser shows how to use custom parsers for token files.
custom-transforms shows how to use custom transforms (and transformGroups) to apply custom “transformations” to the design tokens.
flutter shows how to integrate with Flutter applications.
matching-build-files shows how to output files 1-to-1 with source files.
multi-brand-multi-platform shows how to set up Style Dictionary to support a multi-brand (for brand theming) and multi-platform (web, iOS, Android) solution, with token values depending on brand and platforms.
node-modules-as-config-and-properties shows how to use Javascript rather than JSON for configuration and token files.
npm-module shows how to set up a style dictionary as an npm module, either to publish to a local npm service or to publish externally.
referencing_aliasing shows how to use referencing (or “aliasing”) to reference a value -or an attribute– of a token and assign it to the value –or attribute– of another token.
s3 shows how to set up a style dictionary to build files for different platforms (web, iOS, Android) and upload those build artifacts, together with a group of assets, to an S3 bucket.
tailwind-preset shows how to build a tailwind preset with Style Dictionary.
tokens-deprecation shows one way to deprecate tokens by adding metadata to tokens and using custom formats to output comments in the generated files.
transitive-transforms shows how to use transitive transforms to transform references
variables-in-outputs shows you how to use the outputReferences option to generate files variable references in them.
yaml-tokens shows how to use a custom parser to define your source files in YAML rather than JSON.
Do you think an example is missing?
Do you want to see another example added to the project?
Do you have a working example that we can add to the list?

Fantastic! Let us know by filing an issue.

Design Tokens
Synonyms: style properties, design variables, design constants, atoms

Design tokens are the platform-agnostic way to define design decisions, and are the main input for Style Dictionary.

Note

Currently, Style Dictionary is forward-compatible with the Design Token Community Group spec Our docs still display the original Style Dictionary way of defining design tokens. The biggest difference is that the DTCG uses $value, $type and $description whereas the original format uses value, type and comment. In version 4 you can use either format, pick one though as they cannot be combined inside a single Style Dictionary instance.

A design token is transformed for use in different platforms, languages, and contexts. A simple example is color. A color can be represented in many ways, all of these are the same color: #ffffff, rgb(255,255,255), hsl(0,0,1).

A collection of design tokens which are organized in a nested object make the Style Dictionary. Here is an example of design tokens written for Style Dictionary:

tokens.json
{
  "colors": {
    "font": {
      "base": { "value": "#111111", "type": "color" },
      "secondary": { "value": "#333333", "type": "color" },
      "tertiary": { "value": "#666666", "type": "color" },
      "inverse": {
        "base": { "value": "#ffffff", "type": "color" }
      }
    }
  }
}

Any node in the object that has a value attribute on it is a design token. In this example there are 4 style design tokens: color.font.base, color.font.secondary, color.font.tertiary, and color.font.inverse.base.

Using DTCG format that would look like:

dtcg-tokens.json
{
  "colors": {
    "$type": "color",
    "font": {
      "base": { "$value": "#111111" },
      "secondary": { "$value": "#333333" },
      "tertiary": { "$value": "#666666" },
      "inverse": {
        "base": { "$value": "#ffffff" }
      }
    }
  }
}

From this point on, we are assuming the old Style Dictionary format, this is a disclaimer that some of this will be in slight contradiction with the DTCG spec, e.g. how metadata is handled.

Design token attributes
For any design tokens you wish to output, the “value” attribute is required. This provides the data that will be used throughout the build process (and ultimately used for styling in your deliverables). You can optionally include any custom attributes you would like (e.g. “comment” with a string or “metadata” as an object with its own attributes).

Property	Type	Description
value	Any	The value of the design token. This can be any type of data, a hex string, an integer, a file path to a file, even an object or array.
comment	String (optional)	The comment attribute will show up in a code comment in output files if the format supports it.
themeable	Boolean (optional)	This is used in formats that support override-able or themable values like the !default flag in Sass.
name	String (optional)	Usually the name for a design token is generated with a name transform, but you can write your own if you choose. By default Style Dictionary will add a default name which is the key of the design token object.
attributes	Object (optional)	Extra information about the design token you want to include. Attribute transforms will modify this object so be careful
You can add any attributes or data you want in a design token and Style Dictionary will pass it along to transforms and formats. For example, you could add a deprecated flag like in this example. Other things you can do is add documentation information about each design token or information about color contrast.

Default design token metadata
Style Dictionary adds some default metadata on each design token that helps with transforms and formats. Here is what Style Dictionary adds onto each design token:

Property	Type	Description
name	String	A default name of the design token that is set to the key of the design token. This is only added if you do not provide one.
path	Array[String]	The object path of the design token. color: { background: { primary: { value: "#fff" } } } will have a path of ['color','background', 'primary'].
original	Object	A pristine copy of the original design token object. This is to make sure transforms and formats always have the unmodified version of the original design token.
filePath	String	The file path of the file the token is defined in. This file path is derived from the source or include file path arrays defined in the configuration.
isSource	Boolean	If the token is from a file defined in the source array as opposed to include in the configuration.
Given this configuration:

config.json
{
  source: ['tokens/**/*.json'],
  //...
}

This design token:

tokens/color/background.json
{
  color: {
    background: {
      primary: { value: '#fff' },
    },
  },
}

becomes:

{
  color: {
    background: {
      primary: {
        name: 'primary',
        value: '#fff',
        path: ['color', 'background', 'primary'],
        original: {
          value: '#fff',
        },
        filePath: 'tokens/color/background.json',
        isSource: true,
      },
    },
  },
}

Referencing / Aliasing
You can reference (alias) existing values by using the dot-notation object path (the fully articulated design token name) in curly brackets. Note that this only applies to values; referencing a non-value design token will cause unexpected results in your output.

{
  "size": {
    "font": {
      "small": { "value": "10" },
      "medium": { "value": "16" },
      "large": { "value": "24" },
      "base": { "value": "{size.font.medium}" }
    }
  }
}

See more in the advanced referencing-aliasing example.

Defining design tokens
Design token files can included inline in the configuration, or be written in separate files. Style Dictionary supports these languages for design token files:

JSON
JSONC
JSON5
ES Modules
Potentially any language with custom parsers
Tokens can be defined inline in the Style Dictionary configuration, or in files. You can add a tokens object to your Style Dictionary configuration like this:

config.js
export default {
  tokens: {
    color: {
      background: {
        primary: { value: '#fff' },
      },
    },
  },
  platforms: {
    //...
  },
};

Generally you will have too many design tokens to include them all inline, so you can separate them out into their own files. You can tell Style Dictionary where to find your design token files with the source and include attributes in the configuration like this:

config.js
export default {
  include: [
    // you can list singular files:
    `node_modules/my-other-style-dictionary/tokens.json`,
  ],
  source: [
    // or use file path [globs](https://www.npmjs.com/package/glob)
    // this says grab all files in the tokens directory with a .json extension
    `tokens/**/*.json`,
  ],
  // ...
};

You can organize your design token files in any way as long as you can tell Style Dictionary where to find them. The directory and file structure of design token files does not have any effect on the object structure of the tokens because Style Dictionary does a deep merge on all design token files. Separating tokens into files and folders is to make the authoring experience cleaner and more flexible.

Collision warnings
Style Dictionary takes all the files it finds in the include and source arrays and performs a deep merge on them. It will first add files in the include array, in order, and then the source array in order. Later files will take precedence. For example if you defined 2 source files like this:

config.js
export default {
  source: [`tokens.json`, `tokens2.json`],
};

tokens.json
{
  color: {
    background: {
      primary: { value: '#fff' },
      secondary: { value: '#ccc' },
    },
  },
}

tokens2.json
{
  color: {
    background: {
      primary: { value: '#eee' },
      tertiary: { value: '#999' },
    },
  },
}

The resulting merged dictionary would be:

{
  color: {
    background: {
      primary: { value: '#eee' },
      secondary: { value: '#ccc' },
      tertiary: { value: '#999' },
    },
  },
}

This example would show a warning in the console that you have a collision at color.background.primary because 2 source files defined the same design token. A file in source overriding a file in include will not show a warning because the intent is that you include files you want to potentially override. For example, if you had multiple brands and you wanted to share a default theme, you could include the default theme and then override certain parts.

ES Modules
One way to write your design token files is to write them in Javascript rather than JSON. The only requirement for writing your source files in Javascript is to use an ES Module containing a default export of a plain object. For example:

color.js
export default {
  color: {
    base: {
      red: { value: '#ff0000' },
    },
  },
};

is equivalent to this JSON file:

color.json
{
  "color": {
    "base": {
      "red": { "value": "#ff0000" }
    }
  }
}

You might prefer authoring your design token files in Javascript because it can be a bit more friendly to read and write (don’t have to quote keys, can leave dangling commas, etc.). Writing your design token files as Javascript gives you more freedom to do complex things like generating many tokens based on code:

colors.js
import Color from 'tinycolor2';

const baseColors = {
  red: { h: 4, s: 62, v: 90 },
  purple: { h: 262, s: 47, v: 65 },
  blue: { h: 206, s: 70, v: 85 },
  teal: { h: 178, s: 75, v: 80 },
  green: { h: 119, s: 47, v: 73 },
  yellow: { h: 45, s: 70, v: 95 },
  orange: { h: 28, s: 76, v: 98 },
  grey: { h: 240, s: 14, v: 35 },
};

// Use a reduce function to take the array of keys in baseColor
// and map them to an object with the same keys.
export default Object.keys(baseColors).reduce((ret, color) => {
  return Object.assign({}, ret, {
    [color]: {
      // generate the shades/tints for each color
      20: { value: Color(baseColors[color]).lighten(30).toString() },
      40: { value: Color(baseColors[color]).lighten(25).toString() },
      60: { value: Color(baseColors[color]).lighten(20).toString() },
      80: { value: Color(baseColors[color]).lighten(10).toString() },
      100: { value: baseColors[color] },
      120: { value: Color(baseColors[color]).darken(10).toString() },
      140: { value: Color(baseColors[color]).darken(20).toString() },
    },
  });
}, {});

Take a look at the this example if you want to see a more in-depth example of using JavaScript files as input.

Custom file parsers
You can define custom parsers to parse your source files. This allows you to author your design token files in other languages like YAML. Custom parsers run on certain input files based on a file path pattern regular expression (similar to how Webpack loaders work). The parser function gets the contents of the file and is expected to return an object of the data of that file for Style Dictionary to merge with the other input file data.

build-tokens.json
import StyleDictionary from 'style-dictionary';

StyleDictionary.registerParser({
  pattern: /.json$/,
  parse: ({ contents, filePath }) => {
    return JSON.parse(contents);
  },
});

For more information, read the parsers docs.

Here is a complete custom file parser example

yaml-tokens example

Category / Type / Item
This structure is not required. This is just one example of how to structure your design tokens.

Design tokens are organized into a hierarchical tree structure with ‘category’ defining the primitive nature of the design token. For example, we have the color category and every design token underneath is always a color. As you proceed down the tree, you get more specific about what that color is. Is it a background color, a text color, or a border color? What kind of text color is it? You get the point. It’s like the animal kingdom classification:



Now you can structure your tokens in a nested object like this:

{
  "size": {
    "font": {
      "base": { "value": "16" },
      "large": { "value": "20" }
    }
  }
}

The CTI is implicit in the structure, the category is ‘size’ and the type is ‘font’, and there are 2 tokens ‘base’ and ‘large’.

Structuring design tokens in this manner gives us consistent naming and accessing of these tokens. You don’t need to remember if it is button_color_error or error_button_color, it is color_background_button_error!

You can organize and name your design tokens however you want, there are no restrictions. But there are a good amount of helpers if you do use this structure, like the 'attribute/cti' transform which adds attributes to the design token of its CTI based on the path in the object. These attributes can then be used in other transforms to get some info about the token, or to filter tokens using filters.

Architecture
This is how Style Dictionary works under the hood:

files

Filters

Formats

File headers

Actions

Resolved Dictionary

Filtered Dictionary

Platform output (8)

Actions output (9)

platform

Preprocessors

Transforms

Resolve references

Transitive transforms

Dictionary (5)

Transformed Dictionary (6)

Resolved Dictionary (7)

global

Parse config

Run

Parsers

Combine

Preprocessors

Config

Parsed Config (1)

Token Files (2)

JavaScript Objects (3)

Dictionary (4)


Let’s take a closer look into each of these steps.

1. Parse the config
Style Dictionary is a configuration based framework, you tell it what to do in a configuration file. Style Dictionary first parses this configuration to know what to do.

2. Find all token files
In your config file can define include and source, which are arrays of file path globs. These tell Style Dictionary where to find your token files. You can have them anywhere and in any folder structure as long as you tell Style Dictionary where to find them.

3. Parse token files
If there are custom parsers defined and applied in the config, Style Dictionary will run those on files the applied parsers match. For JSON or JavaScript token files, those are parsed automatically through built-in parsers.

4. Deep merge token files
Style Dictionary takes all the files it found and performs a deep merge. This allows you to split your token files in any way you like, without worrying about accidentally overriding groups of tokens. This gives Style Dictionary a single, complete token object to work from.

5. Run preprocessors over the dictionary
Allows users to configure custom preprocessors, to process the merged dictionary as a whole, rather than per token file individually. These preprocessors have to be applied in the config, either on a global or platform level. Platform level preprocessors run once you get/export/format/build a platform, at the very start. Note that tokens expansion runs after the user-configured preprocessors (for both global vs platform configured, respectively).

6. Transform the tokens
Style Dictionary now traverses over the whole token object and looks for design tokens. It does this by looking for anything with a value key. When it comes across a design token, it then performs all the transforms defined in your config in order.

Value transforms, transforms that modify a token’s value, are skipped if the token references another token. Starting in 3.0, you can define a transitive transform that will transform a value that references another token after that reference has been resolved.

7. Resolve aliases / references to other values
After all the tokens have been transformed, it then does another pass over the token object looking for aliases, which look like "{size.font.base}". When it finds these, it then replaces the reference with the transformed value. Because Style Dictionary merges all token files into a single object, aliases can be in any token file and still work.

8. Format the tokens into files
Now all the design tokens are ready to be written to a file. Style Dictionary takes the whole transformed and resolved token object and for each file defined in the platform it formats the token object and write the output to a file. Internally, Style Dictionary creates a flat array of all the design tokens it finds in addition to the token object. This is how you can output a flat SCSS variables file.

9. Run actions
Actions are custom code that run in a platform after the files are generated. They are useful for things like copying assets to specific build directories or generating images.

After Style Dictionary does steps 4a-4d for each platform, you will have all your output files that are ready to consume in each platform and codebase.

Package Structure
Style Dictionary is configuration driven. A Style Dictionary package must contain a configuration and reference a path to design token files. You can optionally include assets in your package.

Here is a basic example of what a Style Dictionary package looks like.

config.json
Directorytokens
Directorysize
font.json
Directorycolor
font.json
Directoryassets
fonts
images
Name	Description
config.json	This is where the configuration for the style dictionary lives, where you define what happens when Style Dictionary runs
design token files	Design tokens are saved as a collection of JSON or JS module files. You can put them wherever you like - the path to them should be in the source attribute on your config.json file.
assets (optional)	Assets can be included in your style dictionary package, allowing you to keep them in your style dictionary as a single source of truth.
Assets
Assets are not required, but can be useful to include in your style dictionary. If you don’t want to manage having assets like images, vectors, font files, etc. in multiple locations, you can keep them in your style dictionary as a single source of truth.

Coming soon: how to generate image assets based on your style dictionary

API
new StyleDictionary()
Create a new StyleDictionary instance.

Param	Type	Description
config	Config	Configuration options to build your style dictionary. If you pass a string, it will be used as a path to a JSON or JavaScript ESM (default export) config file. TypeScript file is natively supported as well with Bun, Deno or NodeJS >= 22.6.0 + --experimental-strip-types flag. Alternatively, you can also pass an object with the configuration.
options	Object	Options object when creating a new StyleDictionary instance.
options.init	boolean	true by default but can be disabled to delay initializing the dictionary. You can then call sdInstance.init() yourself, e.g. for testing or error handling purposes.
options.verbosity	'silent'|'default'|'verbose'	Verbosity of logs, overrides log.verbosity set in SD config or platform config. There is an enum-like JS object logVerbosityLevels available, that you can import.
options.warnings	'error'|'warn'|'disabled'	Whether to throw warnings as errors, warn or disable warnings, overrides log.verbosity set in SD config or platform config. There is an enum-like JS object logWarningLevels available, that you can import.
options.volume	import('memfs').IFs | typeof import('node:fs')	FileSystem Volume to use as an alternative to the default FileSystem, handy if you need to isolate or “containerise” StyleDictionary files
Example:

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { formats, transformGroups } from 'style-dictionary/enums';

const sd = new StyleDictionary('config.json');
const sdTwo = new StyleDictionary({
  source: ['tokens/*.json'],
  platforms: {
    scss: {
      transformGroup: transformGroups.scss,
      buildPath: 'build/',
      files: [
        {
          destination: 'variables.scss',
          format: formats.scssVariables,
        },
      ],
    },
    // ...
  },
});

Using volume option:

build-tokens.js
import { Volume } from 'memfs';
// You will need a bundler like webpack/rollup for memfs in browser...
// Or use as a prebundled fork:
import memfs from '@bundled-es-modules/memfs';
import { formats, transformGroups } from 'style-dictionary/enums';

const { Volume } = memfs;
const vol = new Volume();
const sd = new StyleDictionary(
  {
    tokens: {
      colors: {
        red: {
          value: '#FF0000',
          type: 'color',
        },
      },
    },
    platforms: {
      css: {
        transformGroup: transformGroups.css,
        files: [
          {
            destination: 'variables.css',
            format: formats.cssVariables,
          },
        ],
      },
    },
  },
  { volume: vol },
);

await sd.buildAllPlatforms();
vol.readFileSync('/variables.css');
/**
 * :root {
 *   --colors-red: #FF0000;
 * }
 */

Instance methods
init
type init = (config: Config) ⇒ Promise<SDInstance>

Called automatically when doing new StyleDictionary(config) unless passing a second argument with init property set to false. In this scenario, you can call .init() manually, e.g. for testing or error handling purposes.

Param	Type	Description
initConfig	Object	Init configuration options.
initConfig.verbosity	'silent'|'default'|'verbose'	Verbosity of logs, overrides log.verbosity set in SD config or platform config. There is an enum-like JS object logVerbosityLevels available, that you can import.
initConfig.warnings	'error'|'warn'|'disabled'	Whether to throw warnings as errors, warn or disable warnings, overrides log.verbosity set in SD config or platform config.There is an enum-like JS object logWarningLevels available, that you can import.
extend
type extend = (config: Config | string, options: Options) ⇒ Promise<SDInstance>

Extend a Style Dictionary instance with a config object, to create an extension instance.

Param	Type	Description
config	Config	Configuration options to build your style dictionary. If you pass a string, it will be used as a path to a JSON or JavaScript ESM (default export) config file. TypeScript file is natively supported as well with Bun, Deno or NodeJS >= 22.6.0 + --experimental-strip-types flag. Alternatively, can also pass an object with the configuration.
options	Object	
options.verbosity	'silent'|'default'|'verbose'	Verbosity of logs, overrides log.verbosity set in SD config or platform config. There is an enum-like JS object logVerbosityLevels available, that you can import.
options.warnings	'error'|'warn'|'disabled'	Whether to throw warnings as errors, warn or disable warnings, overrides log.verbosity set in SD config or platform config. There is an enum-like JS object logWarningLevels available, that you can import.
options.volume	import('memfs').IFs | typeof import('node:fs')	Pass a custom Volume to use instead of filesystem shim itself. Only possible in browser or in Node if you’re explicitly using memfs as filesystem shim (by calling setFs() function and setting it to the memfs module)
options.mutateOriginal	boolean	Private option, do not use
Example:

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { formats, transformGroups } from 'style-dictionary/enums';

const sd = new StyleDictionary('config.json');

const sdExtended = await sd.extend({
  source: ['tokens/*.json'],
  platforms: {
    scss: {
      transformGroup: transformGroups.scss,
      buildPath: 'build/',
      files: [
        {
          destination: 'variables.scss',
          format: formats.scssVariables,
        },
      ],
    },
    // ...
  },
});

Volume option also works when using extend:

const extendedSd = await sd.extend(cfg, { volume: vol });

getPlatformTokens
Replaces the deprecated exportPlatform method, with a slightly different (expanded) return value

type getPlatformTokens = (platform: string, opts: { cache?: boolean }) => Promise<Dictionary>;

Exports a dictionary object containing the tokens as object or flat array, after platform specific transformations and reference resolutions.

Param	Type	Description
platform	string	The platform to be exported. Must be defined on the style dictionary.
opts	{ cache?: boolean }	cache prop determines whether or not it should return the cached tokens if they’ve already been transformed/resolved earlier for this platform. false by default
getPlatformConfig
Replaces the deprecated getPlatform method, returns just the PlatformConfig, use getPlatformTokens if you need the Dictionary

type getPlatformConfig = (platform: string, opts: { cache?: boolean }) => Promise<PlatformConfig>;

Returns a processed version of the user config for the platform.

Param	Type	Description
platform	string	The platform to be exported. Must be defined on the style dictionary.
opts	{ cache?: boolean }	cache prop determines whether or not it should return the cached tokens if they’ve already been transformed/resolved earlier for this platform. false by default
formatPlatform
type formatPlatform = (
  platform: string,
  opts: { cache?: boolean },
) => Promise<Array<{ output: unknown; destination?: string }>>;

Param	Type	Description
platform	string	Name of the platform you want to build.
opts	{ cache?: boolean }	cache prop determines whether or not it should reuse the cached tokens/config if they’ve already been processed earlier for this platform. false by default
Runs getPlatformTokens under the hood, and then loops over the files, and formats the dictionary for each file, returning an array of file objects:

output property, which is usually a string but depending on the format, it could also be any other data type. This is useful if you don’t intend to write to a file, but want to do something else with the formatted tokens.
destination property, this one is optional, if you don’t intend on writing to a file you don’t need this, but it can still be useful to name your outputs if you’ve got multiple files.
formatAllPlatforms
type formatAllPlatforms = (opts: {
  cache?: boolean;
}) => Promise<Record<string, Array<{ output: unknown; destination?: string }>>>;

Param	Type	Description
opts	{ cache?: boolean }	cache prop determines whether or not it should reuse the cached tokens/config if they’ve already been processed earlier for this platform. false by default
Runs formatPlatform under the hood but for each platform.

The resulting object is similar, but an Object with key-value pairs where they key is the platform key, and the value is the same data from the formatPlatform method.

This is useful if you don’t want to write to the filesystem but want to do something custom with the data instead.

buildPlatform
type buildPlatform = (platform: string, opts: { cache?: boolean }) => Promise<SDInstance>;

Takes a platform and performs all transforms to the tokens object (non-mutative) then builds all the files and performs any actions. This is useful if you only want to build the artifacts of one platform to speed up the build process.

This method is also used internally in buildAllPlatforms to build each platform defined in the config.

Param	Type	Description
platform	string	Name of the platform you want to build.
opts	{ cache?: boolean }	cache prop determines whether or not it should reuse the cached tokens/config if they’ve already been processed earlier for this platform. false by default
Example:

build-web.js
// Async, so you can do `await` or .then() if you
// want to execute code after buildAllPlatforms has completed
await sd.buildPlatform('web');

Terminal window
style-dictionary build --platform web

buildAllPlatforms
type buildAllPlatforms = (opts: { cache?: boolean }) => Promise<SDInstance>;

Uses buildPlatform under the hood for each platform.

Param	Type	Description
opts	{ cache?: boolean }	cache prop determines whether or not it should reuse the cached tokens/config if they’ve already been processed earlier for this platform. false by default
Tip

In the majority of cases, this is the method you’ll use.

Example:

import StyleDictionary from 'style-dictionary';
const sd = new StyleDictionary('config.json');

// Async, so you can do `await` or .then() if you
// want to execute code after buildAllPlatforms has completed
await sd.buildAllPlatforms();

Terminal window
style-dictionary build

cleanPlatform
type cleanPlatform = (platform: string, opts: { cache?: boolean }) => Promise<SDInstance>;

Takes a platform and performs all transforms to the tokens object (non-mutative) then cleans all the files and performs the undo method of any actions.

Param	Type	Description
platform	string	Name of the platform you want to clean.
opts	{ cache?: boolean }	cache prop determines whether or not it should reuse the cached tokens/config if they’ve already been processed earlier for this platform. false by default
cleanAllPlatforms
type cleanAllPlatforms = (opts: { cache?: boolean }) => Promise<SDInstance>;

Uses cleanPlatform under the hood for each platform.

Does the reverse of buildAllPlatforms by performing a clean on each platform. This removes all the files defined in the platform and calls the undo method on any actions.

Param	Type	Description
opts	{ cache?: boolean }	cache prop determines whether or not it should reuse the cached tokens/config if they’ve already been processed earlier for this platform. false by default
Deprecated instance methods
For exportPlatform, use getPlatformTokens instead, turning off the cache option if needed.
For getPlatform, use getPlatformConfig insetad, turning off the cache option if needed.
exportPlatform Deprecated
Deprecated in favor of getPlatformTokens.

type exportPlatform = (platform: string, opts: { cache?: boolean }) => Promise<DesignTokens>;

Exports a tokens object with applied platform transforms.

This is useful if you want to use a Style Dictionary in JS build tools like Webpack.

Param	Type	Description
platform	string	Name of the platform you want to build.
opts	{ cache?: boolean }	cache prop determines whether or not it should reuse the cached tokens/config if they’ve already been processed earlier for this platform. false by default
getPlatform Deprecated
Deprecated in favor of getPlatformConfig.

type getPlatform = (
  platform: string,
  opts: { cache?: boolean },
) => Promise<{
  platformConfig: PlatformConfig;
  dictionary: {
    tokens: DesignTokens;
    allTokens: DesignToken[];
    tokenMap: Map<string, DesignToken>;
  };
}>;

SDInstance.getPlatform(platform) ⇒ Promise<Object>

Wrapper around exportPlatform, returns a bit more data.

Returns an object with platformConfig and dictionary properties:

platformConfig a processed version of the user config for the platform
dictionary an object with tokens after transformations and reference resolutions, and an allTokens property which is a flattened (Array) version of that. There’s also a tokenMap property which combines best of both worlds, it is a JavaScript Map that’s keyed, making it easy to access a single token as well as iterate through them.
This is useful if you want to use a Style Dictionary in JS build tools like Webpack.

Param	Type	Description
platform	string	Name of the platform you want to build.
opts	{ cache?: boolean }	cache prop determines whether or not it should reuse the cached tokens/config if they’ve already been processed earlier for this platform. false by default
Class methods
Tip

Can also be used on the instance if you want to register something only on that particular StyleDictionary instance, as opposed to registering it globally for all instances. Registering on the class means all future created instances will be affected. Priorly created instances will not be affected.

registerAction
StyleDictionary.registerAction(action) ⇒ StyleDictionary

Adds a custom action to Style Dictionary. Custom actions can do whatever you need, such as: copying files, base64’ing files, running other build scripts, etc. After you register a custom action, you then use that action in a platform your config.json

You can perform operations on files generated by the style dictionary as actions run after these files are generated. Actions are run sequentially, if you write synchronous code then it will block other actions, or if you use asynchronous code like Promises it will not block.

Param	Type	Description
action	Object	
action.name	string	The name of the action
action.do	function	The action in the form of a function. Can be async
action.undo	function	A function that undoes the action. Can be async
Example:

StyleDictionary.registerAction({
  name: actions.copyAssets,
  do: async function (dictionary, config) {
    console.log('Copying assets directory');
    await fs.promises.copy('assets', config.buildPath + 'assets');
  },
  undo: async function (dictionary, config) {
    console.log('Cleaning assets directory');
    await fs.promises.remove(config.buildPath + 'assets');
  },
});

registerFileHeader
StyleDictionary.registerFileHeader(fileHeader) ⇒ StyleDictionary

Add a custom fileHeader to the Style Dictionary. File headers are used in formats to display some information about how the file was built in a comment.

Param	Type	Description
options	Object	
options.name	string	Name of the format to be referenced in your config.json
options.fileHeader	function	Function that returns an array of strings, which will be mapped to comment lines. It takes a single argument which is the default message array. See file headers for more information. Can be async.
Example:

StyleDictionary.registerFileHeader({
  name: 'myCustomHeader',
  fileHeader: function (defaultMessage) {
    return [...defaultMessage, `hello, world!`];
  },
});

registerFilter
StyleDictionary.registerFilter(filter) ⇒ StyleDictionary

Add a custom filter to the Style Dictionary.

Param	Type	Description
Filter	Object	
Filter.name	string	Name of the filter to be referenced in your config.json
Filter.filter	function	Filter function, return boolean if the token should be included. Can be async
Example:

StyleDictionary.registerFilter({
  name: 'isColor',
  filter: function (token) {
    return token.type === 'color';
  },
});

registerFormat
StyleDictionary.registerFormat(format) ⇒ StyleDictionary

Add a custom format to the Style Dictionary.

Param	Type	Description
format	Object	
format.name	string	Name of the format to be referenced in your config.json
format.format	function	Function to perform the format. Takes a single argument. See custom formats. Must return a string, which is then written to a file. Can be async
Example:

import { formats } from 'style-dictionary/enums';

StyleDictionary.registerFormat({
  name: formats.json,
  format: function ({ dictionary, platform, options, file }) {
    return JSON.stringify(dictionary.tokens, null, 2);
  },
});

registerParser
StyleDictionary.registerParser(parser) ⇒ StyleDictionary

Adds a custom parser to parse style dictionary files.

Param	Type	Description
Parser.name	string	Name of the parser to be referenced in your config.json
Parser.pattern	Regex	A file path regular expression to match which files this parser should be be used on. This is similar to how webpack loaders work. /\.json$/ will match any file ending in ‘.json’, for example.
Parser.parser	function	Function to parse the file contents. Takes 1 argument, which is an object with 2 properties: contents wich is the string of the file contents and filePath. The function should return a plain JavaScript object. Can be async.
Example:

StyleDictionary.registerParser({
  name: 'json-parser',
  pattern: /\.json$/,
  parser: ({ contents, filePath }) => {
    return JSON.parse(contents);
  },
});

registerPreprocessor
StyleDictionary.registerPreprocessor({ name, preprocessor }) => StyleDictionary

Adds a custom preprocessor to preprocess already parsed Style Dictionary objects.

Param	Type	Description
Preprocessor	Object	
Preprocessor.name	string	Name of the format to be referenced in your config.json
Preprocessor.preprocessor	function	Function to preprocess the dictionary. The function should return a plain Javascript object. Can be async
Example:

StyleDictionary.registerPreprocessor({
  name: 'strip-third-party-meta',
  preprocessor: (dictionary) => {
    delete dictionary.thirdPartyMetadata;
    return dictionary;
  },
});

registerTransform
StyleDictionary.registerTransform(transform) ⇒ StyleDictionary

Add a custom transform to the Style Dictionary. Transforms can manipulate a token’s name, value, or attributes.

Param	Type	Description
transform	Object	Transform object
transform.type	string	Type of transform, can be: name, attribute, or value
transform.name	string	Name of the transform (used by transformGroup to call a list of transforms).
transform.transitive	boolean	If the value transform should be applied transitively, i.e. should be applied to referenced values as well as absolute values.
transform.filter	function	Filter function, return boolean if transform should be applied. If you omit the filter function, it will match all tokens.
transform.transform	function	Modifies a design token object. The transform function will receive the token and the platform configuration as its arguments. The transform function should return a string for name transforms, an object for attribute transforms, and same type of value for a value transform. Can be async.
Example:

import { transforms, transformTypes } from 'style-dictionary/enums';

StyleDictionary.registerTransform({
  name: transforms.timeSeconds,
  type: transformTypes.value,
  filter: function (token) {
    return token.type === 'time';
  },
  transform: function (token) {
    // Note the use of prop.original.value,
    // before any transforms are performed, the build system
    // clones the original token to the 'original' attribute.
    return (parseInt(token.original.value) / 1000).tostring() + 's';
  },
});

registerTransformGroup
StyleDictionary.registerTransformGroup(transformGroup) ⇒ StyleDictionary

Add a custom transformGroup to the Style Dictionary, which is a group of transforms.

Param	Type	Description
transformGroup	Object	
transformGroup.name	string	Name of the transform group that will be referenced in config.json
transformGroup.transforms	string[]	Array of strings that reference the name of transforms to be applied in order. Transforms must be defined and match the name or there will be an error at build time.
Example:

import { transforms } from 'style-dictionary/enums';

StyleDictionary.registerTransformGroup({
  name: 'Swift',
  transforms: [transforms.attributeCti, 'size/pt', 'name'],
});

Enums
This page documents the enums introduced in Style-Dictionary. Enums provide a set of named constants that enhance code maintainability, readability, and type safety.

Although Style-Dictionary offers TypeScript type definition files, it cannot provide actual TypeScript enums because its code base is written in JavaScript using JSDocs type annotations, and real enums are a TypeScript-only feature. To still leverage the benefits of enums and reduce the use of hardcoded strings throughout the JavaScript codebase of Style-Dictionary itself, we have introduced enum-like JavaScript objects, which provide the same kind of type safety, but can also be used in JavaScript projects.

These enum-like objects are used internally within Style-Dictionary, and you can also use them in your own configurations, whether you are working with TypeScript or JavaScript.

Enums Usage Example
The following shows how to use some of the provided enum-like objects in an exmaple Style-Dictionary configuration.

import StyleDictionary from 'style-dictionary';
import {
  formats,
  logBrokenReferenceLevels,
  logWarningLevels,
  logVerbosityLevels,
  transformGroups,
  transforms,
} from 'style-dictionary/enums';

const sd = new StyleDictionary({
  source: ['tokens/*.json'],
  platforms: {
    scss: {
      transformGroup: transformGroups.scss,
      transforms: [transforms.nameKebab],
      buildPath: 'build/',
      files: [
        {
          destination: 'variables.scss',
          format: formats.scssVariables,
        },
      ],
    },
  },
  log: {
    warnings: logWarningLevels.warn,
    verbosity: logVerbosityLevels.verbose,
    errors: {
      brokenReferences: logBrokenReferenceLevels.throw,
    },
  },
});

Read-Only Enums in Typescript
Optionally, if you want to ensure that the enums are completely read-only, you can use as const, like it is described in the Typescript docs. This means a type error will also be shown if the enum itself is being assigned to or if something attempts to introduce or delete a member.

import { formats, transforms } from 'style-dictionary/enums';

const formatsReadOnly = formats as const;

List of Enums
Actions
enums/actions.js
export const actions = {
  androidCopyImages: 'android/copyImages',
  copyAssets: 'copy_assets',
};

Comment Positions
enums/commentPositions.js
export const commentPositions = {
  above: 'above',
  inline: 'inline',
};

Comment Styles
enums/commentStyles.js
export const commentStyles = {
  short: 'short',
  long: 'long',
  none: 'none',
};

File Header Comment Styles
enums/fileHeaderCommentStyles.js
export const fileHeaderCommentStyles = {
  short: 'short',
  long: 'long',
  xml: 'xml',
};

Formats
enums/formats.js
export const formats = {
  androidColors: 'android/colors',
  androidDimens: 'android/dimens',
  androidFontDimens: 'android/fontDimens',
  androidIntegers: 'android/integers',
  androidResources: 'android/resources',
  androidStrings: 'android/strings',
  composeObject: 'compose/object',
  cssVariables: 'css/variables',
  flutterClassDart: 'flutter/class.dart',
  iosColorsH: 'ios/colors.h',
  iosColorsM: 'ios/colors.m',
  iosMacros: 'ios/macros',
  iosPlist: 'ios/plist',
  iosSingletonH: 'ios/singleton.h',
  iosSingletonM: 'ios/singleton.m',
  iosStaticH: 'ios/static.h',
  iosStaticM: 'ios/static.m',
  iosStringsH: 'ios/strings.h',
  iosStringsM: 'ios/strings.m',
  iosSwiftAnySwift: 'ios-swift/any.swift',
  iosSwiftClassSwift: 'ios-swift/class.swift',
  iosSwiftEnumSwift: 'ios-swift/enum.swift',
  javascriptEs6: 'javascript/es6',
  javascriptModule: 'javascript/module',
  javascriptModuleFlat: 'javascript/module-flat',
  javascriptObject: 'javascript/object',
  javascriptUmd: 'javascript/umd',
  json: 'json',
  jsonNested: 'json/nested',
  jsonFlat: 'json/flat',
  sketchPalette: 'sketchPalette',
  sketchPaletteV2: 'sketch/palette/v2',
  lessIcons: 'less/icons',
  lessVariables: 'less/variables',
  scssIcons: 'scss/icons',
  scssMapDeep: 'scss/map-deep',
  scssMapFlat: 'scss/map-flat',
  scssVariables: 'scss/variables',
  stylusVariables: 'stylus/variables',
  typescriptEs6Declarations: 'typescript/es6-declarations',
  typescriptModuleDeclarations: 'typescript/module-declarations',
};

Log Broken Reference Levels
enums/logBrokenReferenceLevels.js
export const logBrokenReferenceLevels = {
  throw: 'throw',
  console: 'console',
};

Log Verbosity Levels
enums/logVerbosityLevels.js
export const logVerbosityLevels = {
  default: 'default',
  silent: 'silent',
  verbose: 'verbose',
};

Log Warning Levels
enums/logWarningLevels.js
export const logWarningLevels = {
  warn: 'warn',
  error: 'error',
  disabled: 'disabled',
};

Property Format Names
enums/propertyFormatNames.js
export const propertyFormatNames = {
  css: 'css',
  sass: 'sass',
  less: 'less',
  stylus: 'stylus',
};

Transform Groups
enums/transformGroups.js
export const transformGroups = {
  web: 'web',
  js: 'js',
  scss: 'scss',
  css: 'css',
  less: 'less',
  html: 'html',
  android: 'android',
  compose: 'compose',
  ios: 'ios',
  iosSwift: 'ios-swift',
  iosSwiftSeparate: 'ios-swift-separate',
  assets: 'assets',
  flutter: 'flutter',
  flutterSeparate: 'flutter-separate',
  reactNative: 'react-native',
};

Transforms
enums/transforms.js
export const transforms = {
  attributeCti: 'attribute/cti',
  attributeColor: 'attribute/color',
  nameHuman: 'name/human',
  nameCamel: 'name/camel',
  nameKebab: 'name/kebab',
  nameSnake: 'name/snake',
  nameConstant: 'name/constant',
  namePascal: 'name/pascal',
  colorRgb: 'color/rgb',
  colorHsl: 'color/hsl',
  colorHsl4: 'color/hsl-4',
  colorHex: 'color/hex',
  colorHex8android: 'color/hex8android',
  colorComposeColor: 'color/composeColor',
  colorUIColor: 'color/UIColor',
  colorUIColorSwift: 'color/UIColorSwift',
  colorColorSwiftUI: 'color/ColorSwiftUI',
  colorCss: 'color/css',
  colorSketch: 'color/sketch',
  sizeSp: 'size/sp',
  sizeDp: 'size/dp',
  sizeObject: 'size/object',
  sizeRemToSp: 'size/remToSp',
  sizeRemToDp: 'size/remToDp',
  sizePx: 'size/px',
  sizeRem: 'size/rem',
  sizeRemToPt: 'size/remToPt',
  sizeComposeRemToSp: 'size/compose/remToSp',
  sizeComposeRemToDp: 'size/compose/remToDp',
  sizeComposeEm: 'size/compose/em',
  sizeSwiftRemToCGFloat: 'size/swift/remToCGFloat',
  sizeRemToPx: 'size/remToPx',
  sizePxToRem: 'size/pxToRem',
  htmlIcon: 'html/icon',
  contentQuote: 'content/quote',
  contentObjCLiteral: 'content/objC/literal',
  contentSwiftLiteral: 'content/swift/literal',
  timeSeconds: 'time/seconds',
  fontFamilyCss: 'fontFamily/css',
  cubicBezierCss: 'cubicBezier/css',
  strokeStyleCssShorthand: 'strokeStyle/css/shorthand',
  borderCssShorthand: 'border/css/shorthand',
  typographyCssShorthand: 'typography/css/shorthand',
  transitionCssShorthand: 'transition/css/shorthand',
  shadowCssShorthand: 'shadow/css/shorthand',
  assetUrl: 'asset/url',
  assetBase64: 'asset/base64',
  assetPath: 'asset/path',
  assetObjCLiteral: 'asset/objC/literal',
  assetSwiftLiteral: 'asset/swift/literal',
  colorHex8flutter: 'color/hex8flutter',
  contentFlutterLiteral: 'content/flutter/literal',
  assetFlutterLiteral: 'asset/flutter/literal',
  sizeFlutterRemToDouble: 'size/flutter/remToDouble',
  /**
   * @deprecated use 'color/hex instead
   */
  colorHex8: 'color/hex8',
};

Transform Types
enums/transformTypes.js
export const transformTypes = {
  attribute: 'attribute',
  name: 'name',
  value: 'value',
};

Benefits of Using Enums
Enums, or enumerations, offer a robust way to define a set of named constants in your code. Unlike hardcoded string values, enums provide several key benefits:

Consistency: Enums centralize the definition of constants, making it easier to manage and update them across your codebase. This reduces the risk of typos and inconsistencies that can occur with hardcoded strings. This improves maintainability.
Readability: By using descriptive names for constants, enums make your code more readable and self-documenting. This helps other developers understand the purpose and usage of the constants without needing to refer to external documentation.
Type Safety: Enums can provide better type checking during development, catching errors at compile time rather than runtime. This ensures that only valid values are used, reducing the likelihood of bugs.
Future-proofing: Enums offer greater flexibility for future changes. When you need to add or modify values, you can do so in a single location without having to search and replace hardcoded strings throughout your code. This also means that on the consumer side, such a change is not a breaking change.
Configuration
Style dictionaries are configuration driven. Your configuration lets Style Dictionary know:

Where to find your design tokens
How to transform and format them to generate output files
Here is an example configuration:

config.json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "scss": {
      "transformGroup": "scss",
      "prefix": "sd",
      "buildPath": "build/scss/",
      "files": [
        {
          "destination": "_variables.scss",
          "format": "scss/variables"
        }
      ],
      "actions": ["copy_assets"]
    },
    "android": {
      "transforms": ["attribute/cti", "name/snake", "color/hex", "size/remToSp", "size/remToDp"],
      "buildPath": "build/android/src/main/res/values/",
      "files": [
        {
          "destination": "style_dictionary_colors.xml",
          "format": "android/colors"
        }
      ]
    }
  }
}

Configuration file formats
Style Dictionary supports configuration files in these file formats:

JSON
JSONC
JSON5
Javascript (ES Modules, default export)
Here is an example using an ES module for configuration:

config.js
export default {
  source: [`tokens/**/*.json`],
  // If you don't want to call the registerTransform method a bunch of times
  // you can override the whole transform object directly. This works because
  // the .extend method copies everything in the config
  // to itself, allowing you to override things. It's also doing a deep merge
  // to protect from accidentally overriding nested attributes.
  transform: {
    // Now we can use the transform 'myTransform' below
    myTransform: {
      type: transformTypes.name,
      transform: (token) => token.path.join('_').toUpperCase(),
    },
  },
  // Same with formats, you can now write them directly to this config
  // object. The name of the format is the key.
  format: {
    myFormat: ({ dictionary, platform }) => {
      return dictionary.allTokens.map((token) => `${token.name}: ${token.value};`).join('\n');
    },
  },
  platforms: {
    // ...
  },
};

Some interesting things you can do in a JS file that you cannot do in a JSON file:

Add custom transforms, formats, filters, actions, preprocessors and parsers
Programmatically generate your configuration
Using configuration files
By default, the Style Dictionary CLI looks for a config.json or config.js file in the root of your package.

package.json
"scripts": {
  "build": "style-dictionary build"
}

You can also specify a custom location when you use the CLI with the --config parameter.

package.json
"scripts": {
  "build": "style-dictionary build --config ./sd.config.js"
}

Using in Node
You can also use Style Dictionary as an npm module and further customize how Style Dictionary is run, for example running Style Dictionary multiple times with different configurations. To do this you would create a Javascript file that imports the Style Dictionary npm module and calls the .extend and .buildAllPlatforms functions.

build-tokens.js
import StyleDictionary from 'style-dictionary';

const myStyleDictionary = new StyleDictionary({
  // configuration
});

await myStyleDictionary.buildAllPlatforms();

// You can also extend Style Dictionary multiple times:
const myOtherStyleDictionary = await myStyleDictionary.extend({
  // new configuration
});

await myOtherStyleDictionary.buildAllPlatforms();

You would then change your npm script or CLI command to run that file with Node:

package.json
"scripts": {
  "build": "node build-tokens.js"
}

Properties
Property	Type	Description
log	Log	Configure logging behavior to either reduce/silence logs or to make them more verbose for debugging purposes.
source	string[]	An array of file path globs to design token files. Style Dictionary will do a deep merge of all of the token files, allowing you to organize your files however you want. Supports JSON, JSON5, JavaScript ESM (default export object) token files. TypeScript file is natively supported as well with Bun, Deno or NodeJS >= 22.6.0 + --experimental-strip-types flag
include	string[]	An array of file path globs to design token files that contain default styles. Style Dictionary uses this as a base collection of design tokens. The tokens found using the “source” attribute will overwrite tokens found using include.
tokens	Object	The tokens object is a way to include inline design tokens as opposed to using the source and include arrays.
expand	ExpandConfig	Configures whether and how composite (object-value) tokens will be expanded into separate tokens. false by default. Supports either boolean, ExpandFilter function or an Object containing a typesMap property and optionally an include OR exclude property.
platforms	Record<string, Platform>	An object containing platform config objects that describe how the Style Dictionary should build for that platform. You can add any arbitrary attributes on this object that will get passed to formats and actions (more on these in a bit). This is useful for things like build paths, name prefixes, variable names, etc.
hooks	Hooks object	Object that contains all configured custom hooks: preprocessors. Note: parsers, transforms, transformGroups, formats, fileHeaders, filters, actions will be moved under property this later. Can be used to define hooks inline as an alternative to using register<Hook> methods.
parsers	string[]	Names of custom file parsers to run on input files
preprocessors	string[]	Which preprocessors (by name) to run on the full token dictionary, before any transforms run, can be registered using .registerPreprocessor. You can also configure this on the platform config level if you need to run it on the dictionary only for specific platforms.
transform	Record<string, Transform>	Custom transforms you can include inline rather than using .registerTransform. The keys in this object will be the transform’s name, the value should be an object with type
format	Record<string, Format>	Custom formats you can include inline in the configuration rather than using .registerFormat. The keys in this object will be for format’s name and value should be the format function.
usesDtcg	boolean	Whether the tokens are using DTCG Format or not. Usually you won’t need to configure this, as style-dictionary will auto-detect this format.
Log
Log configuration object to configure the logging behavior of Style Dictionary.

Platform
A platform is a build target that tells Style Dictionary how to properly transform and format your design tokens for output to a specific platform. You can have as many platforms as you need and you can name them anything, there are no restrictions.

Property	Type	Description
transforms	string[]	An array of transform keys to be performed on the design tokens. These will transform the tokens in a non-destructive way, allowing each platform to transform the tokens. Transforms to apply sequentially to all tokens. Can be a built-in one or you can create your own.
transformGroup	string	A string that maps to an array of transforms. This makes it easier to reference transforms by grouping them together. Can be combined with transforms.
buildPath	string	Base path to build the files, must end with a trailing slash.
expand	ExpandConfig	Configures whether and how composite (object-value) tokens will be expanded into separate tokens. false by default. Supports either boolean, ExpandFilter function or an Object containing a typesMap property and optionally an include OR exclude property.
preprocessors	string[]	Which preprocessors (by name) to run on the full token dictionary when building for this particular platform, before any transforms run, can be registered using .registerPreprocessor. You can also configure this on the global config.
options	Object	Options that apply to all files in the platform, for example outputReferences and showFileHeader
prefix	string	A string that prefix the name of the design tokens.
files	File[]	Files to be generated for this platform.
actions	string[]	Actions to be performed after the files are built for that platform. Actions can be any arbitrary code you want to run like copying files, generating assets, etc. You can use pre-defined actions or create custom actions.
File
A File configuration object represents a single output file. The options object on the file configuration will take precedence over the options object defined at the platform level. Apart from the options listed below, any other options can be added, which can then be used inside custom formats.

Property	Type	Description
destination	string	Location to build the file, will be appended to the buildPath.
format	string	Format used to generate the file. Can be a built-in one or you can create your own via registerFormat.
filter	string | function | Object	A function, string or object used to filter the tokens that will be included in the file. If a function is provided, each design token will be passed to the function and the result (true or false) will determine whether the design token is included. If an object is provided, each design token will be matched against the object using a partial deep comparison. If a match is found, the design token is included. If a string is passed, is considered a custom filter registered via registerFilter
options	Object	A set of extra options associated with the file. Includes showFileHeader and outputReferences.
options.showFileHeader	boolean	If the generated file should have a comment at the top about being generated. The default fileHeader comment has “Do not edit + Timestamp”. By default is “true”.
options.fileHeader	string |function	A custom fileHeader that can be either a name of a registered file header (string) or an inline fileHeader function.
options.outputReferences	boolean | OutputReferencesFunction	If the file should keep token references. By default this is “false”. Also allows passing a function to conditionally output references on a per token basis.
Expand
You can configure whether and how composite (object-value) tokens will be expanded into separate tokens. By default, this functionality is disabled and for formats such as CSS where object values are not supported, you’d be relying on either a custom value transform to turn such token values into strings, or writing a custom format to format object values into CSS compatible values.

Expand usage
Below are examples of how the expand property can be used.

{
  expand: true, // expand all object-value (composite) type tokens

  expand: {}, // equivalent to true

  // conditionally expand, executes this callback for each individual token
  expand: (token, config, platformConfig) => true,

  // equivalent to true, but additionally passing a typesMap
  expand: {
    typesMap: {
      width: 'dimension',
    },
  },

  // only expands typography and border tokens, also passes a typesMap
  expand: {
    include: ['typography', 'border'],
    // more info about typesMap later...
    typesMap: {
      // all width props are mapped to 'dimension' type
      width: 'dimension',
      typography: {
        // fontSize prop is mapped to 'dimension' type if inside a typography composite type token
        fontSize: 'dimension',
      },
    },
  },

  //  expands everything except for typography and border tokens
  expand: {
    exclude: ['typography', 'border'],
  },

  // only expands tokens for which this function returns true
  expand: {
    include: (token, config, platformConfig) => true,
  },

  // expands everything except for tokens for which this function returns true
  expand: {
    exclude: (token, config, platformConfig) => true,
  },
}

The value of expand can be multiple things:

boolean, false by default, when set to true, any object-value (composite) design token will be expanded into multiple tokens, one for each property.
a function of type ExpandFilter, e.g. (token, options, platform) => true, must return a boolean, when true will expand that individual token, arguments:
token: the design token of which the value is an object (composite)
options: the StyleDictionary config options
platform: this is only passed when expand is used on the platform level, contains the platform specific config options
An object:
Empty, which is equivalent of passing true
Containing just a typesMap, which is also equivalent of passing true, except you’re also passing the typesMap
Also containing an include or exclude property which can be either an array of composite types or an ExpandFilter function, to conditionally expand or negate expand of individual tokens
Global vs Platform
You can enable the expanding of tokens both on a global level and on a platform level.

Whether configured on platform or global level, the token expansion will happen immediately after user-configured preprocessors and before transform hooks.
That said, platform expand happens only when calling (get/export/format/build)Platform methods for the specific platform, whereas global expand happens on StyleDictionary instantiation already.

Refer to the lifecycle hooks diagram for a better overview.

When expanding globally, token metadata properties that are added by Style Dictionary such as name, filePath, path, attributes etc. are not present yet.
The advantage of global expand however, is having the expanded tokens (sd.tokens prop) available before doing any exporting to platforms.

If you configure it on the platform level, the metadata mentioned earlier is available and can be used to conditionally expand tokens. It also allows you to expand tokens for some platforms but not for others.
The downside there is needing to configure it for every platform separately.

Caution

It’s also important to note that if you configure expansion on the global level, you cannot undo those token expansions by negating it in the platform-specific expand configs.

Type Mapping
While our expand utility comes with a typesMap out of the box that aligns with the Design Token Community Group spec to convert composite subtype properties to defined DTCG types, you can also pass a custom typesMap that will allow you to extend or override it. A typesMap allows you to configure how object-value (composite) properties in the original token value should be mapped to the newly expanded individual tokens.

For example:

tokens-input.json
{
  "value": {
    "width": "2px",
    "style": "solid",
    "color": "#000"
  },
  "type": "border"
}

Here, according to the DTCG spec, you would probably want to map the "width" property to type "dimension" and "style" property to type "strokeStyle". "width" is more of a general property where we always want to map it to "dimension" but border "style" is more specific to the border composite type, therefore this typesMap makes sense:

config.json
{
  "expand": {
    "typesMap": {
      "width": "dimension",
      "border": {
        "style": "strokeStyle"
      }
    }
  }
}

Resulting in the following expanded output:

tokens-output.json
{
  "width": {
    "value": "2px",
    "type": "dimension"
  },
  "style": {
    "value": "solid",
    "type": "strokeStyle"
  },
  "color": {
    "value": "#000",
    "type": "color"
  }
}

Example

/tokens.js
/tokens.js
1234567891011121314151617181920212223
{
  "expand": {
    "include": ["border"],
    "typesMap": {
      "border": {
        "style": "borderStyle"
      }
    }
  },
  "platforms": {

DTCG Type Map
Below is the standard DTCG type map that the expand utility comes out of the box with:

const DTCGTypesMap = {
  // https://design-tokens.github.io/community-group/format/#stroke-style
  strokeStyle: {
    // does not yet have its own type defined, but is an enum of: "round" | "butt" | "square"
    lineCap: 'other',
    // note that this is spec'd to be a dimension array, which is unspecified in the spec for dimension
    // generally speaking, transforms that match dimension type tokens do not account for this potentially being an array
    // therefore we map it to "other" for now...
    dashArray: 'other',
  },
  // https://design-tokens.github.io/community-group/format/#border
  border: {
    style: 'strokeStyle',
    width: 'dimension',
  },
  // https://design-tokens.github.io/community-group/format/#transition
  transition: {
    delay: 'duration',
    // needs more discussion https://github.com/design-tokens/community-group/issues/103
    timingFunction: 'cubicBezier',
  },
  // https://design-tokens.github.io/community-group/format/#shadow
  shadow: {
    offsetX: 'dimension',
    offsetY: 'dimension',
    blur: 'dimension',
    spread: 'dimension',
  },
  // https://design-tokens.github.io/community-group/format/#gradient
  gradient: {
    position: 'number',
  },
  // https://design-tokens.github.io/community-group/format/#typography
  typography: {
    fontSize: 'dimension',
    letterSpacing: 'dimension',
    lineHeight: 'number',
  },
};

Logging
You can customize the logging behavior of Style Dictionary.

import {
  logBrokenReferenceLevels,
  logVerbosityLevels,
  logWarningLevels,
} from 'style-dictionary/enums';

const sd = new StyleDictionary({
  // these are the defaults
  log: {
    warnings: logWarningLevels.warn, // 'warn' | 'error' | 'disabled'
    verbosity: logVerbosityLevels.default, // 'default' | 'silent' | 'verbose'
    errors: {
      brokenReferences: logBrokenReferenceLevels.throw, // 'throw' | 'console'
    },
  },
});

log can also be set on platform specific configuration

Param	Type	Description
log	Object	
log.warnings	'warn' | 'error' | 'disabled'	Whether warnings should be logged as warnings, thrown as errors or disabled entirely. Defaults to ‘warn’. There is an enum-like JS object logWarningLevels available, that you can import.
log.verbosity	'default' |'silent' | 'verbose'	How verbose logs should be, default value is ‘default’. ‘silent’ means no logs at all apart from fatal errors. ‘verbose’ means detailed error messages for debugging. There is an enum-like JS object logVerbosityLevels available, that you can import.
log.errors	Object	How verbose logs should be, default value is ‘default’. ‘silent’ means no logs at all apart from fatal errors. ‘verbose’ means detailed error messages for debugging
log.errors.brokenReferences	'throw' | 'console'	Whether broken references in tokens should throw a fatal error or only a console.error without exiting the process. There is an enum-like JS object logBrokenReferenceLevels available, that you can import.
There are five types of warnings that will be thrown as errors instead of being logged as warnings when log.warnings is set to error:

Token value collisions (in the source)
Token name collisions (when exporting)
Missing “undo” function for Actions
File not created because no tokens found, or all of them filtered out
Broken references in file when using outputReferences, but referring to a token that’s been filtered out
Verbosity configures whether the following warnings/errors should display in a verbose manner:

Token collisions of both types (value & name)
Broken references due to outputReferences & filters
Token reference errors
And through 'silent' it also configures whether success/neutral logs should be logged at all.

By default the verbosity (‘default’) will keep logs relatively brief to prevent noise.

CLI
Log verbosity can be passed as an option in the CLI by passing either -v or --verbose to get verbose logging, and -s or --silent to get silent logging. Warnings can be disabled by using the -n or --no-warn flag.

Parsers
You can define custom parsers to parse design token files. This allows you to define your design token files in any language you like as long as you can write a parser for it.

A custom parser matches design token files based on a file path regular expression. It will get the contents of a file as a string and should return an object of the data.

Custom parsers can be used to keep design token files in other languages like YAML, but they can also be used to add extra metadata or modify the design tokens themselves before they get to Style Dictionary. For example, you could modify the token object based on its file path or programmatically generate tokens based on the data in certain files.

Note

parser function can be async as well.

Parser structure
A parser has 2 parts: a pattern which is a regular expression to match against a file path, and a parse function which takes the file path and contents of the file and is expected to return a function.

my-parser.js
const myParser = {
  name: 'json-parser',
  pattern: /\.json$/,
  parser: ({ filePath, contents }) => {
    return JSON.parse(contents);
  },
};

Using parsers
First you will need to tell Style Dictionary about your parser. You can do this in two ways:

Using the .registerParser method
Inline in the configuration
You will then have to apply the parser by name in the config:

{
  "source": ["tokens/*.json"],
  "parsers": ["json-parser"],
  "platforms": {}
}

.registerParser
build-tokens.js
import StyleDictionary from 'style-dictionary';

StyleDictionary.registerParser({
  name: 'json-parser',
  pattern: /\.json$/,
  parser: ({ filePath, contents }) => {
    return JSON.parse(contents);
  },
});

Inline
config.js
export default {
  hooks: {
    parsers: {
      'json-parser': {
        pattern: /\.json$/,
        parser: ({ filePath, contents }) => {
          return JSON.parse(contents);
        },
      },
    },
  },
  // ... the rest of the configuration
};

Parser examples
More in-depth custom parser example
Using custom parsers to support YAML design token files

Preprocessors
Starting in version 4.0, you can define custom preprocessors to process the dictionary object as a whole, after all token files have been parsed and combined into one. This is useful if you want to do more complex transformations on the dictionary as a whole, when all other ways are not powerful enough.

Preprocessors can be applied globally or per platform. Applying them per platform means the tokens already have some more metadata on them such as “filePath” and “path”, and the options object resembles the PlatformConfig rather than the SD global config options. It also allows you to preprocess on a per platform basis, while global means you won’t have to repeat the same preprocessing because it will happen once on a global level, so essentially applies to all platforms. See lifecycle diagram for a visual diagram of the order of the lifecycle hooks.

Caution

It should be clear that using this feature should be a last resort. Using custom parsers to parse per file or using transforms to do transformations on a per token basis, gives more granular control and reduces the risks of making mistakes.

That said, preprocessing the full dictionary gives ultimate flexibility when needed.

Preprocessor structure
A preprocessor is an object with two props:

name: the name of the preprocessor
preprocessor a callback function that receives the dictionary and SD options or platform config as parameters, and returns the processed dictionary
my-preprocessor.js
const myPreprocessor = {
  name: 'strip-third-party-meta',
  preprocessor: (dictionary, options) => {
    delete dictionary.thirdPartyMetadata;
    return dictionary;
  },
};

Asynchronous callback functions are also supported, giving even more flexibility.

my-preprocessor-async.js
const myPreprocessor = {
  name: 'strip-props',
  preprocessor: async (dictionary, options) => {
    const propsToDelete = await someAPICall();

    propsToDelete.forEach((propName) => {
      delete dictionary[propName];
    });

    return dictionary;
  },
};

Using preprocessors
First you will need to tell Style Dictionary about your parser. You can do this in two ways:

Using the .registerPreprocessor method
Inline in the configuration
.registerPreprocessor
import StyleDictionary from 'style-dictionary';

StyleDictionary.registerPreprocessor(myPreprocessor);

Inline
export default {
  hooks: {
    preprocessors: {
      'strip-props': myPreprocessor,
    },
  },
  // ... the rest of the configuration
};

Applying it in config
{
  "source": ["**/*.tokens.json"],
  "preprocessors": ["strip-props"]
}

or platform-specific:

{
  "source": ["**/*.tokens.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "preprocessors": ["strip-props"]
    }
  }
}

Preprocessor examples
Stripping description property recursively in the entire dictionary object:

StyleDictionary.registerPreprocessor({
  name: 'strip-descriptions',
  preprocessor: (dict, options) => {
    // recursively traverse token objects and delete description props
    function removeDescription(slice) {
      delete slice.description;
      Object.values(slice).forEach((value) => {
        if (typeof value === 'object') {
          removeDescription(value);
        }
      });
      return slice;
    }
    return removeDescription(dict);
  },
});

Default preprocessors
There are two default preprocessors that are always applied and run after other custom preprocessors do:

typeDtcgDelegate, for DTCG tokens, make sure the $type is either already present or gets inherited from the closest ancestor that has it defined, so that the $type is always available on the token level, for ease of use
expandObjectTokens, a private preprocessor that will expand object-value (composite) tokens when user config has this enabled.

Transforms
Transforms are functions that modify a token so that it can be understood by a specific platform. It can modify the name, value, or attributes of a token - enabling each platform to use the design token in different ways. A simple example is changing pixel values to point values for iOS and dp or sp for Android.

Transforms are isolated per platform; each platform begins with the same design token and makes the modifications it needs without affecting other platforms. The order you use transforms matters because transforms are performed sequentially. Transforms are used in your configuration, and can be either pre-defined transforms supplied by Style Dictionary or custom transforms.

Some platform configuration attributes apply a broader effect over the transforms applied. For example, the size/remToDp transform will scale a number by 16, or by the value of options.basePxFontSize if it is present. Check individual transform documentation to see where this is applicable.

Using Transforms
You use transforms in your config file under platforms > [platform] > transforms.

config.json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "android": {
      "transforms": ["attribute/cti", "name/kebab", "color/hex", "size/rem"]
    }
  }
}

A transform consists of 4 parts: type, name, filter, and transform. Transforms are run on all design tokens where the filter returns true.

Tip

If you don’t provide a filter function, it will match all tokens.

Note

transform functions can be async as well.

Transform Types
There are 3 types of transforms: attribute, name, and value.

Attribute: An attribute transform adds to the attributes object on a design token. This is for including any meta-data about a design token such as it’s CTI attributes or other information.

Name: A name transform transforms the name of a design token. You should really only be applying one name transform because they will override each other if you use more than one.

Value: The value transform is the most important as this is the one that modifies the value or changes the representation of the value. Colors can be turned into hex values, rgb, hsl, hsv, etc. Value transforms have a filter function that filter which tokens that transform runs on. This allows us to only run a color transform on only the colors and not every design token.

Defining Custom Transforms
You can define custom transforms with the registerTransform. Style Dictionary adds some default metadata to each design token to provide context that may be useful for some transforms.

Transitive Transforms
You can define transitive transforms which allow you to transform a referenced value. Normally, value transforms only transform non-referenced values and because transforms happen before references are resolved, the transformed value is then used to resolve references.

build-tokens.js
import StyleDictionary from 'style-dictionary';

StyleDictionary.registerTransform({
  type: `value`,
  transitive: true,
  name: `myTransitiveTransform`,
  filter: (token, options) => {},
  transform: (token) => {
    // token.value will be resolved and transformed at this point
  },
});

There is one thing to be mindful of with transitive transforms. The token’s value will be resolved and transformed already at the time the transitive transform. What happens is Style Dictionary will transform and resolve values iteratively. First it will transform any non-referenced values, then it will resolve any references to non-referenced values, then it will try to transform any non-referenced values, and so on. Let’s take a look at an example:

tokens.json
{
  "color": {
    "red": { "value": "#f00" },
    "danger": { "value": "{color.red}" },
    "error": { "value": "{color.danger}" }
  }
}

Style dictionary will first transform the value of color.red, then resolve color.danger to the transformed color.red value. Then it will transform color.danger and resolve color.error to the transformed color.danger. Finally, it will transform color.error and see that there is nothing left to transform or resolve.

This allows you to modify a reference that modifies another reference. For example:

tokens.json
{
  "color": {
    "red": { "value": "#f00" },
    "danger": { "value": "{color.red}", "darken": 0.75 },
    "error": { "value": "{color.danger}", "darken": 0.5 }
  }
}

Using a custom transitive transform you could have color.danger darken color.red and color.error darken color.danger. The pre-defined transforms are not transitive to be backwards compatible with Style Dictionary v2 - an upgrade should not cause breaking changes.

Defer transitive transformation manually
It’s also possible to control, inside a transitive transform’s transform function, whether the transformation should be deferred until a later cycle of references resolution. This is done by returning undefined, which basically means “I cannot currently do the transform due to a reference not yet being resolved”.

Imagine the following transform:

build-tokens.js
import { StyleDictionary } from 'style-dictionary';
import { usesReferences } from 'style-dictionary/utils';

StyleDictionary.registerTransform({
  name: '',
  type: transformTypes.value,
  transitive: true,
  transform: (token) => {
    const darkenModifier = token.darken;
    if (usesReferences(darkenModifier)) {
      // defer this transform, because our darken value is a reference
      return undefined;
    }
    return darken(token.value, darkenModifier);
  },
});

Combined with the following tokens:

tokens.json
{
  "color": {
    "darken": { "value": 0.5 },
    "red": { "value": "#f00" },
    "danger": { "value": "{color.red}", "darken": "{darken}" }
  }
}

Due to token.darken being a property that uses a reference, we need the ability to defer its transformation from within the transform, since the transform is the only place where we know which token properties the transformation is reliant upon.

If you want to learn more about transitive transforms, take a look at the transitive transforms example.


Skip to content
Style-Dictionary logo, Pascal the chameleon.
Style Dictionary

Search
⌘
K
GitHub
Slack
Select theme
Auto
Overview
Using the CLI
Using the NPM Module
Examples
Design Tokens
Architecture
Package Structure
Design Tokens Community Group
Statement
Migration Guidelines
Migration Guidelines
API
Enums
Configuration
Logging
Parsers
Preprocessors
Overview
Built-in Transforms
Filters
File Headers
Actions
Types
Basic Example
Splitting output files
On this page
Overview
attribute/cti
attribute/color
name/human
name/camel
name/kebab
name/snake
name/constant
name/pascal
color/rgb
color/hsl
color/hsl-4
color/hex
color/hex8
color/hex8android
color/composeColor
color/UIColor
color/UIColorSwift
color/ColorSwiftUI
color/css
color/sketch
size/sp
size/dp
size/object
size/remToSp
size/remToDp
size/px
size/rem
size/remToPt
size/compose/remToSp
size/compose/remToDp
size/compose/em
size/swift/remToCGFloat
size/remToPx
size/pxToRem
html/icon
content/quote
content/objC/literal
content/swift/literal
time/seconds
fontFamily/css
cubicBezier/css
strokeStyle/css/shorthand
border/css/shorthand
typography/css/shorthand
transition/css/shorthand
shadow/css/shorthand
asset/url
asset/base64
asset/path
asset/objC/literal
asset/swift/literal
color/hex8flutter
content/flutter/literal
asset/flutter/literal
size/flutter/remToDouble
Built-in transforms
Tip

You can find the source code of the built-in transforms here: lib/common/transforms.js

Note

All the pre-defined transforms included in Style Dictionary up until version 3 were using the CTI structure for matching tokens. If you structure your design tokens differently you will need to write custom transforms or make sure the proper CTIs are on the attributes of your design tokens.

From version 4 onwards, instead of using the CTI structure of a token object, we’re determining the token’s type by the token.type property. Or, the $type property if you’re using the DTCG spec format.

So instead of using token.attributes.category (v3), you will now use token.type (v4).

attribute/cti
Adds: category, type, item, subitem, and state on the attributes object based on the location in the style dictionary.

// Matches: all
// Returns:
{
  "category": "color",
  "type": "background",
  "item": "button",
  "subitem": "primary",
  "state": "active"
}

attribute/color
Adds: hex, hsl, hsv, rgb, red, blue, green.

// Matches: token.type === 'color'
// Returns
{
  "hex": "009688",
  "rgb": {"r": 0, "g": 150, "b": 136, "a": 1},
  "hsl": {"h": 174.4, "s": 1, "l": 0.294, "a": 1},
  "hsv": {"h": 174.4, "s": 1, "l": 0.588, "a": 1},
}

name/human
Creates a human-friendly name

// Matches: All
// Returns:
'button primary';

name/camel
Creates a camel case name. If you define a prefix on the platform in your config, it will prepend with your prefix

// Matches: all
// Returns:
'colorBackgroundButtonPrimaryActive';
'prefixColorBackgroundButtonPrimaryActive';

name/kebab
Creates a kebab case name. If you define a prefix on the platform in your config, it will prepend with your prefix

// Matches: all
// Returns:
'color-background-button-primary-active';
'prefix-color-background-button-primary-active';

name/snake
Creates a snake case name. If you define a prefix on the platform in your config, it will prepend with your prefix

// Matches: all
// Returns:
'color_background_button_primary_active';
'prefix_color_background_button_primary_active';

name/constant
Creates a constant-style name based on the full CTI of the token. If you define a prefix on the platform in your config, it will prepend with your prefix

// Matches: all
// Returns:
'COLOR_BACKGROUND_BUTTON_PRIMARY_ACTIVE';
'PREFIX_COLOR_BACKGROUND_BUTTON_PRIMARY_ACTIVE';

name/pascal
Creates a Pascal case name. If you define a prefix on the platform in your config, it will prepend with your prefix

// Matches: all
// Returns:
'ColorBackgroundButtonPrimaryActive';
'PrefixColorBackgroundButtonPrimaryActive';

color/rgb
Transforms the value into an RGB string

// Matches: token.type === 'color'
// Returns:
'rgb(0, 150, 136)';

color/hsl
Transforms the value into an HSL string or HSLA if alpha is present. Better browser support than color/hsl-4

// Matches: token.type === 'color'
// Returns:
'hsl(174, 100%, 29%)';
'hsl(174, 100%, 29%, .5)';

color/hsl-4
Transforms the value into an HSL string, using fourth argument if alpha is present.

// Matches: token.type === 'color'
// Returns:
'hsl(174 100% 29%)';
'hsl(174 100% 29% / .5)';

color/hex
Transforms the value into an 6-digit hex string

// Matches: token.type === 'color'
// Returns:
'#009688';

color/hex8 Deprecated
Use color/hex instead, which also supports hex8.

Transforms the value into an 8-digit hex string

// Matches: token.type === 'color'
// Returns:
'#009688ff';

color/hex8android
Transforms the value into an 8-digit hex string for Android because they put the alpha channel first

// Matches: token.type === 'color'
// Returns:
'#ff009688';

color/composeColor
Transforms the value into a Color class for Compose

// Matches: token.type === 'color'
// Returns:
Color(0xFF009688)

color/UIColor
Transforms the value into an UIColor class for iOS

// Matches: token.type === 'color'
// Returns:
[UIColor colorWithRed:0.114f green:0.114f blue:0.114f alpha:1.000f]

color/UIColorSwift
Transforms the value into an UIColor swift class for iOS

// Matches: token.type === 'color'
// Returns:
UIColor(red: 0.667, green: 0.667, blue: 0.667, alpha: 0.6)

color/ColorSwiftUI
Transforms the value into an UIColor swift class for iOS

// Matches: token.type === 'color'
// Returns:
Color(red: 0.667, green: 0.667, blue: 0.667, opacity: 0.6)

color/css
Transforms the value into a hex or rgb string depending on if it has transparency

// Matches: token.type === 'color'
// Returns:
#000000
rgba(0,0,0,0.5)

color/sketch
Transforms a color into an object with red, green, blue, and alpha attributes that are floats from 0 - 1. This object is how Sketch stores colors.

// Matches: token.type === 'color'
// Returns:
{
  red: 0.5,
  green: 0.5,
  blue: 0.5,
  alpha: 1
}

size/sp
Transforms the value into a scale-independent pixel (sp) value for font sizes on Android. It will not scale the number.

// Matches: token.type === 'fontSize'
// Returns:
'10.0sp';

size/dp
Transforms the value into a density-independent pixel (dp) value for non-font sizes on Android. It will not scale the number.

// Matches: token.type === 'fontSize'
// Returns:
'10.0dp';

size/object
Transforms the value into a useful object ( for React Native support )

// Matches: token.type === 'dimension'
// Returns:
{
 original: "10px",
 number: 10,
 decimal: 0.1, // 10 divided by 100
 scale: 160, // 10 times 16
}

size/remToSp
Transforms the value from a REM size on web into a scale-independent pixel (sp) value for font sizes on Android. It WILL scale the number by a factor of 16 (or the value of basePxFontSize on the platform in your config).

// Matches: token.type === 'fontSize'
// Returns:
'16.0sp';

size/remToDp
Transforms the value from a REM size on web into a density-independent pixel (dp) value for font sizes on Android. It WILL scale the number by a factor of 16 (or the value of basePxFontSize on the platform in your config).

// Matches: token.type === 'fontSize'
// Returns:
'16.0dp';

size/px
Adds ‘px’ to the end of the number. Does not scale the number

// Matches: token.type === 'dimension'
// Returns:
'10px';

size/rem
Adds ‘rem’ to the end of the number. Does not scale the number.

// Matches: token.type === 'dimension'
// Returns:
'10rem';

size/remToPt
Scales the number and adds ‘pt’ to the end. The default basePxFontSize scale is 16, which can be configured on the platform in your config.

// Matches: token.type === 'dimension'
// Returns:
'16pt';

Configuring the basePxFontSize:

config.json
{
  "platforms": {
    "css": {
      "transforms": ["size/rem"],
      "basePxFontSize": 14
    }
  }
}

size/compose/remToSp
Transforms the value from a REM size on web into a scale-independent pixel (sp) value for font sizes in Compose. It WILL scale the number by a factor of 16 (or the value of basePxFontSize on the platform in your config).

// Matches: token.type === 'fontSize'
// Returns:
"16.0.sp"

size/compose/remToDp
Transforms the value from a REM size on web into a density-independent pixel (dp) value for font sizes in Compose. It WILL scale the number by a factor of 16 (or the value of basePxFontSize on the platform in your config).

// Matches: token.type === 'dimension'
// Returns:
"16.0.dp"

size/compose/em
Adds the .em Compose extension to the end of a number. Does not scale the value

// Matches: token.type === 'fontSize'
// Returns:
"16.0em"

size/swift/remToCGFloat
Scales the number by 16 (or the value of basePxFontSize on the platform in your config) to get to points for Swift and initializes a CGFloat

// Matches: token.type === 'dimension'
// Returns: "CGFloat(16.00)""

size/remToPx
Scales the number by 16 (or the value of basePxFontSize on the platform in your config) and adds ‘px’ to the end.

// Matches: token.type === 'dimension'
// Returns:
'16px';

size/pxToRem
Scales non-zero numbers to rem, and adds ‘rem’ to the end. If you define a “basePxFontSize” on the platform in your config, it will be used to scale the value, otherwise 16 (default web font size) will be used.

// Matches: token.type === 'dimension'
// Returns:
'0';
'1rem';

html/icon
Takes an HTML entity and transforms it into a form CSS can use.

// Matches: token.type === 'html'
// Returns:
"'\\E001'";

content/quote
Wraps the value in a single quoted string

// Matches: token.type === 'content'
// Returns:
"'string'";

content/objC/literal
Wraps the value in a double-quoted string and prepends an ’@’ to make a string literal.

// Matches: token.type === 'content'
// Returns:
**&quot;string&quot;**:

content/swift/literal
Wraps the value in a double-quoted string to make a string literal.

// Matches: token.type === 'content'
// Returns:
"string"

time/seconds
Assumes a time in miliseconds and transforms it into a decimal

// Matches: token.type === 'time'
// Returns:
'0.5s';

fontFamily/css
Transforms fontFamily type token (which can be an array) into a CSS string, putting single quotes around font names that contain spaces where necessary. Also handles the fontFamily property inside typography type object-values.

DTCG definition

/**
 * Matches: token.type === 'fontFamily' || token.type === 'typography'
 * Returns:
 */
:root {
  --var: 'Arial Black', Helvetica, sans-serif;
}

cubicBezier/css
Transforms cubicBezier type token into a CSS string, using the CSS cubic-bezier function. Also handles the timingFunction property inside transition type object-values.

DTCG definition

/**
 * Matches: token.type === 'cubicBezier' || token.type === 'transition'
 * Returns:
 */
:root {
  --var: cubic-bezier(0, 0, 0.5, 1);
}

strokeStyle/css/shorthand
Transforms strokeStyle type object-value token into a CSS string, using the CSS dashed fallback.

DTCG definition

/**
 * Matches: token.type === 'strokeStyle'
 * Returns:
 */
:root {
  --var: dashed;
}

border/css/shorthand
Transforms border type object-value token into a CSS string, using the CSS border shorthand notation.

DTCG definition

/**
 * Matches: token.type === 'border'
 * Returns:
 */
:root {
  --var: 2px solid #000000;
}

typography/css/shorthand
Transforms typography type object-value token into a CSS string, using the CSS font shorthand notation.

DTCG definition

/**
 * Matches: token.type === 'typography'
 * Returns:
 */
:root {
  --var: italic 400 1.2rem/1.5 'Fira Sans', sans-serif;
}

transition/css/shorthand
Transforms transition type object-value token into a CSS string, using the CSS transition shorthand notation.

DTCG definition

/**
 * Matches: token.type === 'transition'
 * Returns:
 */
:root {
  --var: 200ms ease-in-out 50ms;
}

shadow/css/shorthand
Transforms shadow type object-value token (which can also be an array) into a CSS string, using the CSS shadow shorthand notation.

DTCG definition

/**
 * Matches: token.type === 'shadow'
 * Returns:
 */
:root {
  --var: 2px 4px 8px 10px #000000, 1px 1px 4px #cccccc;
}

asset/url
Wraps the value in a CSS url() function

// Matches: token.type === 'asset'
// Returns:
url('https://www.example.com/style.css');

asset/base64
Wraps the value in a double-quoted string and prepends an ’@’ to make a string literal.

// Matches: token.type === 'asset'
// Returns:
'IyBlZGl0b3Jjb25maWcub3JnCnJvb3QgPSB0cnVlCgpbKl0KaW5kZW50X3N0eWxlID0gc3BhY2UKaW5kZW50X3NpemUgPSAyCmVuZF9vZl9saW5lID0gbGYKY2hhcnNldCA9IHV0Zi04CnRyaW1fdHJhaWxpbmdfd2hpdGVzcGFjZSA9IHRydWUKaW5zZXJ0X2ZpbmFsX25ld2xpbmUgPSB0cnVlCgpbKi5tZF0KdHJpbV90cmFpbGluZ193aGl0ZXNwYWNlID0gZmFsc2U=';

asset/path
Prepends the local file path

// Matches: token.type === 'asset'
// Returns:
'path/to/file/asset.png';

asset/objC/literal
Wraps the value in a double-quoted string and prepends an ’@’ to make a string literal.

// Matches: token.type === 'asset'
// Returns: @"string"

asset/swift/literal
Wraps the value in a double-quoted string to make a string literal.

// Matches: token.type === 'asset'
// Returns: "string"

color/hex8flutter
Transforms the value into a Flutter Color object using 8-digit hex with the alpha chanel on start

// Matches: token.type === 'color'
// Returns:
Color(0xff00ff5f);

content/flutter/literal
Wraps the value in a double-quoted string to make a string literal.

// Matches: token.type === 'content'
// Returns: "string"

asset/flutter/literal
Wraps the value in a double-quoted string to make a string literal.

// Matches: token.type === 'asset'
// Returns: "string"

size/flutter/remToDouble
Scales the number by 16 (or the value of basePxFontSize on the platform in your config) to get to points for Flutter

16.00
// Matches: token.type === 'dimension'

Edit page
 Previous
Overview
 Next
Overview


Transform Groups
Transform Groups are a way to easily use multiple transforms at once as a collection or group. They are an array of transforms. You can define a custom transform group with the registerTransformGroup.

You use transformGroups in your config file under platforms > [platform] > transformGroup

config.json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "android": {
      "transformGroup": "android"
    }
  }
}

Combining with transforms
You can also combine transforms with transformGroup:

config.json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "android": {
      "transformGroup": "android",
      "transforms": ["name/snake"]
    }
  }
}

The transforms that are standalone will be added after the ones inside the transformGroup. If it’s important to determine the order of these yourself, you can always register a custom transformGroup to have more granular control.


Skip to content
Style-Dictionary logo, Pascal the chameleon.
Style Dictionary

Search
⌘
K
GitHub
Slack
Select theme
Auto
Overview
Using the CLI
Using the NPM Module
Examples
Design Tokens
Architecture
Package Structure
Design Tokens Community Group
Statement
Migration Guidelines
Migration Guidelines
API
Enums
Configuration
Logging
Parsers
Preprocessors
Overview
Built-in Transforms
Overview
Built-in Transform Groups
Filters
File Headers
Actions
Types
Basic Example
Splitting output files
On this page
Overview
web
js
scss
css
less
html
android
compose
ios
ios-swift
ios-swift-separate
assets
flutter
flutter-separate
react-native
Built-in Transform Groups
Tip

You can find the source code of the built-in transforms here: lib/common/transformGroups.js

web
Transforms:

attribute/cti name/kebab size/px color/css

js
Transforms:

attribute/cti name/pascal size/rem color/hex

scss
Transforms:

attribute/cti name/kebab time/seconds html/icon size/rem color/css asset/url fontFamily/css cubicBezier/css strokeStyle/css/shorthand border/css/shorthand typography/css/shorthand transition/css/shorthand shadow/css/shorthand

css
Transforms:

attribute/cti name/kebab time/seconds html/icon size/rem color/css asset/url fontFamily/css cubicBezier/css strokeStyle/css/shorthand border/css/shorthand typography/css/shorthand transition/css/shorthand shadow/css/shorthand

less
Transforms:

attribute/cti name/kebab time/seconds html/icon size/rem color/hex asset/url fontFamily/css cubicBezier/css strokeStyle/css/shorthand border/css/shorthand typography/css/shorthand transition/css/shorthand shadow/css/shorthand

html
Transforms:

attribute/cti attribute/color name/human

android
Transforms:

attribute/cti name/snake color/hex8android size/remToSp size/remToDp

compose
Transforms:

attribute/cti name/camel color/composeColor size/compose/em size/compose/remToSp size/compose/remToDp

ios
Transforms:

attribute/cti name/pascal color/UIColor content/objC/literal asset/objC/literal size/remToPt

ios-swift
Transforms:

attribute/cti name/camel color/UIColorSwift content/swift/literal asset/swift/literal size/swift/remToCGFloat

ios-swift-separate
Transforms:

attribute/cti name/camel color/UIColorSwift content/swift/literal asset/swift/literal size/swift/remToCGFloat

This is to be used if you want to have separate files per category and you don’t want the category (e.g., color) as the lead value in the name of the token (e.g., StyleDictionaryColor.baseText instead of StyleDictionary.colorBaseText).

assets
Transforms:

attribute/cti

flutter
Transforms:

attribute/cti name/camel color/hex8flutter size/flutter/remToDouble content/flutter/literal asset/flutter/literal

flutter-separate
Transforms:

attribute/cti name/camel color/hex8flutter size/flutter/remToDouble content/flutter/literal asset/flutter/literal

This is to be used if you want to have separate files per category and you don’t want the category (e.g., color) as the lead value in the name of the token (e.g., StyleDictionaryColor.baseText instead of StyleDictionary.colorBaseText).

react-native
Transforms:

name/camel size/object color/css

Edit page
 Previous
Overview
 Next
Overview

Skip to content
Style-Dictionary logo, Pascal the chameleon.
Style Dictionary

Search
⌘
K
GitHub
Slack
Select theme
Auto
Overview
Using the CLI
Using the NPM Module
Examples
Design Tokens
Architecture
Package Structure
Design Tokens Community Group
Statement
Migration Guidelines
Migration Guidelines
API
Enums
Configuration
Logging
Parsers
Preprocessors
Overview
Built-in Transforms
Overview
Built-in Transform Groups
Overview
Format Helpers
Built-in Formats
Filters
File Headers
Actions
Types
Basic Example
Splitting output files
On this page
Overview
Using formats
Format configuration
Filtering tokens
References in output files
Filtering out references
outputReferences with transitive transforms
File headers
Custom formats
format
Custom return types
Custom format with output references
Using a template / templating engine to create a format
Formats
Formats define the output of your created files. For example, to use your styles in CSS you use the css/variables format. This will create a CSS file containing the variables from your style dictionary.

Using formats
You use formats in your config file under platforms > [Platform] > files > [File] > format.

{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "files": [
        {
          "format": "css/variables",
          "destination": "variables.css"
        }
      ]
    }
  }
}

There is an extensive (but not exhaustive) list of built-in formats available in Style Dictionary.

Format configuration
Formats can take configuration to make them more flexible. This allows you to re-use the same format multiple times with different configurations or to allow the format to use data not defined in the tokens themselves. To configure a format, add extra attributes on the file options in your configuration like the following:

{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "scss": {
      "transformGroup": "scss",
      "files": [
        {
          "destination": "map.scss",
          "format": "scss/map-deep",
          "options": {
            "mapName": "my-tokens"
          }
        }
      ]
    }
  }
}

In this example we are adding the mapName configuration to the scss/map-deep format. This will change the name of the SCSS map in the output. Not all formats have the configuration options; format configuration is defined by the format itself. To see the configuration options of a format, take a look at the documentation of the specific format.

Filtering tokens
A special file configuration is filter, which will filter the tokens before they get to the format. This allows you to re-use the same format to generate multiple files with different sets of tokens. Filtering tokens works by adding a filter attribute on the file object, where filter is:

An object which gets passed to Lodash’s filter method.
A string that references the name of a registered filter, using the registerFilter method
A function that takes a token and returns a boolean if the token should be included (true) or excluded (false). This is only available if you are defining your configuration in Javascript.
{
  "destination": "destination",
  "format": "myCustomFormat",
  "filter": "myCustomFilter", // a named filter defined with .registerFilter
  "filter": function(token) {}, // an inline function
  "filter": {} // an object pass to lodash's filter method
}

The design token that is passed to the filter function has already been transformed and has default metadata added by Style Dictionary.

References in output files
Some formats can keep the references in the output. This is a bit hard to explain, so let’s look at an example. Say you have this very basic set of design tokens:

tokens.json
{
  "color": {
    "red": { "value": "#ff0000" },
    "danger": { "value": "{color.red}" },
    "error": { "value": "{color.danger}" }
  }
}

With this configuration:

config.json
{
  "source": ["tokens.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "files": [
        {
          "destination": "variables.css",
          "format": "css/variables",
          "options": {
            // Look here 👇
            "outputReferences": true
          }
        }
      ]
    }
  }
}

This would be the output:

variables.css
:root {
  --color-red: #ff0000;
  --color-danger: var(--color-red);
  --color-error: var(--color-danger);
}

The css variables file now keeps the references you have in your Style Dictionary! This is useful for outputting themeable and dynamic code.

Without outputReferences: true Style Dictionary would resolve all references and the output would be:

variables.css
:root {
  --color-red: #ff0000;
  --color-danger: #ff0000;
  --color-error: #ff0000;
}

It is also possible to provide a function instead of true or false to outputReferences, if you need to conditionally output references on a per token basis.

config.js
import { formats, transformGroups } from 'style-dictionary/enums';

export default {
  source: ['tokens.json'],
  platforms: {
    css: {
      transformGroup: transformGroups.css,
      files: [
        {
          destination: 'variables.css',
          format: formats.cssVariables,
          options: {
            // Look here 👇
            outputReferences: (token, { dictionary, usesDtcg }) => {
              // `dictionary` contains `allTokens`, `tokens`, `tokenMap`, `unfilteredTokens`, `unfilteredAllTokens` and `unfilteredTokenMap` props
              // `usesDtcg` tells you whether the Design Token Community Group spec is used with $ prefixes ($value, $type etc.)
              // return true or false
            },
          },
        },
      ],
    },
  },
};

Not all formats use the outputReferences option because that file format might not support it (like JSON for example). The current list of formats that handle outputReferences:

css/variables
scss/variables
less/variables
android/resources
compose/object
ios-swift/class.swift
flutter/class.dart
You can create custom formats that output references as well. See the Custom format with output references section.

Filtering out references
When combining filters with outputReferences, it could happen that a token is referencing another token that is getting filtered out. When that happens, Style Dictionary will throw a warning. However, it is possible to configure outputReferences to use our outputReferencesFilter utility function, which will prevent tokens that reference other tokens that are filtered out from outputting references, they will output the resolved values instead.

outputReferences with transitive transforms
When combining transitive value transforms with outputReferences, it could happen that a token that contains references has also been transitively transformed. What this means is that putting back the references in the output would mean we are undoing that work. In this scenario, it’s often preferable not to output a reference.

There is an outputReferencesTransformed utility function that takes care of checking if this happened and not outputting refs for tokens in this scenario.

File headers
By default Style Dictionary adds a file header comment in the top of files built using built-in formats like this:

variables.js
// Do not edit directly
// Generated on Sat, 01 Jan 2000 00:00:00 GMT

You can remove these comments with the option: showFileHeader: false if you do not want them in your generated files. You can also create your own file header or extend the default one. This could be useful if you want to put a version number or hash of the source files rather than a timestamp.

Custom file headers can be added the same way you would add a custom format, either by using the registerFileHeader function or adding the fileHeader object directly in the Style Dictionary configuration. Your custom file header can be used in built-in formats as well as custom formats. To use a custom file header in a custom format see the fileHeader format helper method.

build-tokens.js
import StyleDictionary from 'style-dictionary';

StyleDictionary.registerFileHeader({
  name: 'myCustomHeader',
  // This can be an async function as well
  fileHeader: (defaultMessage) => {
    // defaultMessage are the 2 lines above that appear in the default file header
    // you can use this to add a message before or after the default message 👇

    // the fileHeader function should return an array of strings
    // which will be formatted in the proper comment style for a given format
    return [...defaultMessage, `hello?`, `is it me you're looking for?`];
  },
});

Then you can use your custom file header in a file similar to a custom format:

config.json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "files": [
        {
          "destination": "variables.css",
          "format": "css/variables",
          "options": {
            "fileHeader": "myCustomHeader"
          }
        }
      ]
    }
  }
}

Which should output a file that will start like this:

variables.css
/**
 * Do not edit directly
 * Generated on Thu, 18 Mar 2021 21:30:47 GMT
 * hello?
 * is it me you're looking for?
 */

Custom formats
You can create custom formats using the registerFormat function or by directly including them in your configuration. A format has a name and a format function, which takes an object as the argument and should return a string which is then written to a file.

format
format.format(args) ⇒ unknown

The format function that is called when Style Dictionary builds files.

Tip

You might be wondering why the return type of a format function is unknown. More information about this here

Param	Type	Description
args	Object	A single argument to support named parameters and destructuring.
args.dictionary	Dictionary	Transformed Dictionary object containing allTokens, tokens and unfilteredTokens.
args.dictionary.allTokens	TransformedToken[]	Flattened array of all tokens, easiest to loop over and export to a flat format.
args.dictionary.tokens	TransformedTokens	All tokens, still in unflattened object format.
args.dictionary.tokenMap	Record<string, TransformedToken>	All tokens as a JavaScript Map that’s keyed, making it easy to access a single token as well as iterate through them.
args.dictionary.unfilteredAllTokens	TransformedToken[]	Flattened array of all tokens, including tokens that were filtered out by filters.
args.dictionary.unfilteredTokens	TransformedTokens	All tokens, still in unflattened object format, including tokens that were filtered out by filters.
args.dictionary.unfilteredTokenMap	TransformedTokens	All tokens as a JavaScript Map, including tokens that were filtered out by filters.
args.platform	Platform	Platform config
args.file	File	File config
args.options	Object	Merged object with SD Config & FormatOptions
Example:

StyleDictionary.registerFormat({
  name: 'myCustomFormat',
  format: function ({ dictionary, platform, options, file }) {
    return JSON.stringify(dictionary.tokens, null, 2);
  },
});

To use your custom format, you call it by name in the file configuration object:

{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": {
      "options": {
        "showFileHeader": true
      },
      "transformGroup": "css",
      "files": [
        {
          "destination": "destination",
          "format": "myCustomFormat",
          "options": {
            "showFileHeader": false
          }
        }
      ]
    }
  }
}

It is recommended for any configuration needed for your custom format to use the options object. Style Dictionary will merge platform and file options so that in your Style Dictionary configuration you can specify options at a platform or file level. In the configuration above, the options object passed to the format would have showFileHeader: false.

Custom return types
When writing outputs to the filesystem, the return type of the format function is always string. However, since v4 you can return any data format and use SD.formatAllPlatforms or SD.formatPlatform methods when you do not intend to write the output to the filesystem, but want to do something custom with the output instead.

Note that when you have a format that returns something that isn’t a string, you won’t be able to use it with buildPlatform or buildAllPlatforms methods, because they are writing to the filesystem and you can’t really write data to the filesystem that isn’t a string/buffer/stream.

This also means that the destination property is therefore optional for formats that aren’t ran by the build methods:

config.json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": {
      "options": {
        "showFileHeader": true
      },
      "transformGroup": "css",
      "files": [
        {
          "format": "format-that-returns-array"
        }
      ]
    }
  }
}

grabTokens.js
const sd = new StyleDictionary('config.json');

const cssTokens = (await sd.formatPlatform('css')).output;
/**
 * Example:
 * [
 *   ["--colors-red-500", "#ff0000"],
 *   ["--colors-blue-500", "#0000ff"]
 * ]
 */

Custom format with output references
To take advantage of outputting references in your custom formats there are 2 helper methods in the dictionary argument passed to your format function: usesReference(value) and getReferences(value). Here is an example using those:

build-tokens.js
StyleDictionary.registerFormat({
  name: `es6WithReferences`,
  format: function ({ dictionary, options }) {
    const { usesDtcg, outputReferences } = options;
    return dictionary.allTokens
      .map((token) => {
        let value = JSON.stringify(token.value);
        const originalValue = token.original.value;
        // the `dictionary` object now has `usesReferences()` and
        // `getReferences()` methods. `usesReferences()` will return true if
        // the value has a reference in it. `getReferences()` will return
        // an array of references to the whole tokens so that you can access their
        // names or any other attributes.
        const shouldOutputRef =
          usesReferences(originalValue) &&
          (typeof outputReferences === 'function'
            ? outputReferences(token, { dictionary, usesDtcg })
            : outputReferences);

        if (shouldOutputRef) {
          // Note: make sure to use `originalValue` because
          // `token.value` is already resolved at this point.
          const refs = dictionary.getReferences(originalValue);
          let isEntirelyRef = refs.length === 1 && refs[0].value === value;
          refs.forEach((ref) => {
            // wrap in template literal ${} braces if the value is more than just entirely a reference
            value = value.replace(ref.value, isEntirelyRef ? ref.name : `\${${ref.name}}`);
          });
        }
        // if the value is not entirely a reference, we have to wrap in template literals
        return `export const ${token.name} = ${
          shouldOutputRef && !isEntirelyRef ? `\`${value}\`` : value
        };`;
      })
      .join(`\n`);
  },
});

Using a template / templating engine to create a format
Formats are functions and created easily with most templating engines. Formats can be built using templates if there is a lot of boilerplate code to insert (e.g. ObjectiveC files). If the output consists of only the values (e.g. a flat SCSS variables file), writing a format function directly may be easier.

Any templating language can work as long as there is a node module for it. All you need to do is register a format that calls your template and returns a string.

Our recommendation is to use Template Literals for this as the easiest way to accomplish this:

build-tokens.js
import StyleDictionary from 'style-dictionary';

// Very simplistic/naive custom CSS format, just as an example, for CSS you should prefer using our predefined formats
const template = ({ dictionary, file, options, platform }) => `:root {
${dictionary.allTokens.map(token => `  ${token.name}`: `"${token.value}"`).join('\n')}
}
`;

StyleDictionary.registerFormat({
  name: 'my/format',
  format: template,
});

// format: 'my/format' is now available for use...

Here is a quick example for Lodash templates.

build-tokens.js
import StyleDictionary from 'style-dictionary';
import _ from 'lodash-es';
import fs from 'node:fs';

const template = _.template(fs.readFileSync('templates/myFormat.template'));

StyleDictionary.registerFormat({
  name: 'my/format',
  format: template,
});

// format: 'my/format' is now available for use...

And another example for Handlebars.

build-tokens.js
import StyleDictionary from 'style-dictionary';
import Handlebars from 'handlebars';

const template = Handlebars.compile(fs.readFileSync('templates/MyTemplate.hbs').toString());

StyleDictionary.registerFormat({
  name: 'my/format',
  format: function ({ dictionary, platform }) {
    return template({
      tokens: dictionary.tokens,
      options: platform,
    });
  },
});

// format: 'my/format' is now available for use...

Edit page
 Previous
Built-in Transform Groups
 Next
Format Helpers

Custom format helpers
We provide some helper methods we use internally in some of the built-in formats to make building custom formats a bit easier.

They are accessible at style-dictionary/utils entrypoint, you can read more about them in the Utils -> Format Helpers docs.

import StyleDictionary from 'style-dictionary';
import { fileHeader, formattedVariables } from 'style-dictionary/utils';
import { propertyFormatNames } from 'style-dictionary/enums';

StyleDictionary.registerFormat({
  name: 'myCustomFormat',
  format: async ({ dictionary, file, options }) => {
    const { outputReferences } = options;
    const header = await fileHeader({ file });
    return (
      header +
      ':root {\n' +
      formattedVariables({
        format: propertyFormatNames.css,
        dictionary,
        outputReferences,
      }) +
      '\n}\n'
    );
  },
});


Skip to content
Style-Dictionary logo, Pascal the chameleon.
Style Dictionary

Search
⌘
K
GitHub
Slack
Select theme
Auto
Overview
Using the CLI
Using the NPM Module
Examples
Design Tokens
Architecture
Package Structure
Design Tokens Community Group
Statement
Migration Guidelines
Migration Guidelines
API
Enums
Configuration
Logging
Parsers
Preprocessors
Overview
Built-in Transforms
Overview
Built-in Transform Groups
Overview
Format Helpers
Built-in Formats
Filters
File Headers
Actions
Types
Basic Example
Splitting output files
On this page
Overview
css/variables
scss/map-flat
scss/map-deep
scss/variables
scss/icons
less/variables
less/icons
stylus/variables
javascript/module
javascript/module-flat
javascript/object
javascript/umd
javascript/es6
javascript/esm
typescript/es6-declarations
typescript/module-declarations
android/resources
android/colors
android/dimens
android/fontDimens
android/integers
android/strings
compose/object
ios/macros
ios/plist
ios/singleton.m
ios/singleton.h
ios/static.h
ios/static.m
ios/colors.h
ios/colors.m
ios/strings.h
ios/strings.m
ios-swift/class.swift
ios-swift/enum.swift
ios-swift/any.swift
css/fonts.css
json
json/asset
json/nested
json/flat
sketch/palette
sketch/palette/v2
flutter/class.dart
Built-in formats
These are the formats included in Style Dictionary by default, pulled from lib/common/formats.js

Want a format? You can request it here.

You created a format and think it should be included? Send us a PR.

css/variables
Creates a CSS file with variable definitions based on the style dictionary

Param	Type	Description
options	Object	
options.showFileHeader	boolean	Whether or not to include a comment that has the build date. Defaults to true
options.outputReferences	boolean | OutputReferencesFunction	Whether or not to keep references (a -> b -> c) in the output. Defaults to false. Also allows passing a function to conditionally output references on a per token basis.
options.outputReferenceFallbacks	boolean	Whether or not to output css variable fallback values when using output references. You will want to pass this from the options object sent to the format function.
options.selector	string | string[]	Override the root CSS selector. When a string array is provided, the styles will be nested within the specified selectors in order - the first selector in the array acts as the outermost layer.
options.formatting	FormattingOverrides	Custom formatting properties that define parts of a declaration line in code. The configurable strings are: indentation, commentStyle and commentPosition. The fileHeaderTimestamp, header, and footer formatting options are used for the fileHeader helper.
Example:

variables.css
:root {
  --color-background-base: #f0f0f0;
  --color-background-alt: #eeeeee;
}

scss/map-flat
Creates a SCSS file with a flat map based on the style dictionary

Name the map by adding a mapName property on the options object property on the file object property in your config.

Example:

vars.scss
$tokens: (
  'color-background-base': #f0f0f0; 'color-background-alt': #eeeeee;,
);

scss/map-deep
Creates a SCSS file with a deep map based on the style dictionary.

Name the map by adding a mapName property on the options object property on the file object property in your config.

Param	Type	Description
options	Object	
options.outputReferences	boolean | OutputReferencesFunction	Whether or not to keep references (a -> b -> c) in the output. Defaults to false. Also allows passing a function to conditionally output references on a per token basis.
options.outputReferenceFallbacks	boolean	Whether or not to output css variable fallback values when using output references. You will want to pass this from the options object sent to the format function.
options.themeable	boolean	Whether or not tokens should default to being themeable, if not otherwise specified per token. Defaults to false.
options.mapName	string	Name of your SCSS map.
options.formatting	FormattingOverrides	Custom formatting properties that define parts of a declaration line in code. The configurable strings are: indentation, commentStyle and commentPosition. The fileHeaderTimestamp, header, and footer formatting options are used for the fileHeader helper.
Example:

vars.scss
$color-background-base: #f0f0f0 !default;
$color-background-alt: #eeeeee !default;

$tokens: (
  'color': (
    'background': (
      'base': $color-background-base,
      'alt': $color-background-alt,
    ),
  ),
);

scss/variables
Creates a SCSS file with variable definitions based on the style dictionary.

Add !default to any variable by setting a themeable: true attribute in the token’s definition.

Param	Type	Description
options	Object	
options.showFileHeader	boolean	Whether or not to include a comment that has the build date. Defaults to true
options.outputReferences	boolean | OutputReferencesFunction	Whether or not to keep references (a -> b -> c) in the output. Defaults to false. Also allows passing a function to conditionally output references on a per token basis.
options.outputReferenceFallbacks	boolean	Whether or not to output css variable fallback values when using output references. You will want to pass this from the options object sent to the format function.
options.themeable	boolean	Whether or not tokens should default to being themeable, if not otherwise specified per token. Defaults to false.
options.formatting	FormattingOverrides	Custom formatting properties that define parts of a declaration line in code. The configurable strings are: indentation, commentStyle and commentPosition. The fileHeaderTimestamp, header, and footer formatting options are used for the fileHeader helper.
Example:

vars.scss
$color-background-base: #f0f0f0;
$color-background-alt: #eeeeee !default;

scss/icons
Creates a SCSS file with variable definitions and helper classes for icons

Example:

vars.scss
$content-icon-email: '\E001';
.icon.email:before {
  content: $content-icon-email;
}

less/variables
Creates a LESS file with variable definitions based on the style dictionary

Param	Type	Description
options	Object	
options.showFileHeader	boolean	Whether or not to include a comment that has the build date. Defaults to true
options.outputReferences	boolean | OutputReferencesFunction	Whether or not to keep references (a -> b -> c) in the output. Defaults to false. Also allows passing a function to conditionally output references on a per token basis.
options.outputReferenceFallbacks	boolean	Whether or not to output css variable fallback values when using output references. You will want to pass this from the options object sent to the format function.
options.formatting	FormattingOverrides	Custom formatting properties that define parts of a declaration line in code. The configurable strings are: indentation, commentStyle and commentPosition. The fileHeaderTimestamp, header, and footer formatting options are used for the fileHeader helper.
Example:

vars.less
@color-background-base: #f0f0f0;
@color-background-alt: #eeeeee;

less/icons
Creates a LESS file with variable definitions and helper classes for icons

Example:

vars.less
@content-icon-email: '\E001';
.icon.email:before {
  content: @content-icon-email;
}

stylus/variables
Creates a Stylus file with variable definitions based on the style dictionary

Example:

vars.stylus
$color-background-base= #f0f0f0;
$color-background-alt= #eeeeee;

javascript/module
Creates a CommonJS module with the whole style dictionary

Example:

vars.cjs
module.exports = {
  color: {
    base: {
      red: {
        value: '#ff0000',
      },
    },
  },
};

javascript/module-flat
Creates a CommonJS module with the whole style dictionary flattened to a single level.

Example:

vars.cjs
module.exports = {
  ColorBaseRed: '#ff0000',
};

javascript/object
Creates a JS file a global var that is a plain javascript object of the style dictionary. Name the variable by adding a name property on the options object property of the file object property in your config.

Example:

vars.js
var StyleDictionary = {
  color: {
    base: {
      red: {
        value: '#ff0000',
      },
    },
  },
};

javascript/umd
Creates a UMD module of the style dictionary. Name the module by adding a name property on the options object property of the file object property in your config.

Example

vars.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof exports === 'object') {
    exports['_styleDictionary'] = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root['_styleDictionary'] = factory();
  }
})(this, function () {
  return {
    color: {
      red: {
        value: '#FF0000',
      },
    },
  };
});

javascript/es6
Creates a ES6 module of the style dictionary.

config.json
{
  "platforms": {
    "js": {
      "transformGroup": "js",
      "files": [
        {
          "format": "javascript/es6",
          "destination": "colors.js",
          "filter": {
            "type": "color"
          }
        }
      ]
    }
  }
}

Example:

vars.js
export const ColorBackgroundBase = '#ffffff';
export const ColorBackgroundAlt = '#fcfcfcfc';

javascript/esm
Creates an ES6 module object of the style dictionary.

config.json
{
  "platforms": {
    "js": {
      "transformGroup": "js",
      "files": [
        {
          "format": "javascript/esm",
          "destination": "colors.js",
          "options": {
            "minify": true
          }
        }
      ]
    }
  }
}

Param	Type	Description
options	Object	
options.minify	boolean	Whether or not to minify the output. Defaults to false. Has no effect when options.flat is true.
options.flat	boolean	Whether or not to flatten the output. Defaults to false. If true, renders only the token value, which means it is minified.
options.stripMeta	Object | boolean	Control whether meta data is stripped from the output tokens. false by default. If set to true, will strip known Style Dictionary meta props: ['attributes', 'filePath', 'name', 'path', 'comment']. Note that using minify means that meta is stripped as a side effect of this already, so using both is unnecessary.
options.stripMeta.keep	string[]	Array of property keys to keep in the output.
options.stripMeta.strip	string[]	Array of property keys to strip from the output.
Example:

vars.js
export default {
  colors: {
    black: {
      $value: '#000000',
      filePath: 'src/tokens/color.json',
      isSource: true,
      $type: 'color',
      original: {
        $value: '#000000',
        $type: 'color',
      },
      name: 'ColorsBlack',
      attributes: {
        category: 'colors',
        type: 'black',
      },
      path: ['colors', 'black'],
    },
  },
};

Example with minify flag:

vars.js
export default {
  colors: {
    black: '#000000',
  },
};

Example with stripMeta flag:

vars.js
export default {
  colors: {
    black: {
      $value: '#000000',
      $type: 'color',
    },
  },
};

typescript/es6-declarations
Creates TypeScript declarations for ES6 modules

config.json
{
  "platforms": {
    "ts": {
      "transformGroup": "js",
      "files": [
        {
          "format": "javascript/es6",
          "destination": "colors.js"
        },
        {
          "format": "typescript/es6-declarations",
          "destination": "colors.d.ts"
        }
      ]
    }
  }
}

Param	Type	Description
options	Object	
options.outputStringLiterals	boolean	Whether or not to output literal types for string values. Defaults to false.
Example:

vars.ts
export const ColorBackgroundBase: string;
export const ColorBackgroundAlt: string;

typescript/module-declarations
Creates TypeScript declarations for module

config.json
{
  "platforms": {
    "ts": {
      "transformGroup": "js",
      "files": [
        {
          "format": "javascript/module",
          "destination": "colors.js"
        },
        {
          "format": "typescript/module-declarations",
          "destination": "colors.d.ts"
        }
      ]
    }
  }
}

Example:

vars.ts
export default tokens;
declare interface DesignToken {
  value?: any;
  type?: string;
  name?: string;
  comment?: string;
  themeable?: boolean;
  attributes?: Record<string, unknown>;
  [key: string]: any;
}
declare const tokens: {
  color: {
    red: DesignToken;
  };
};

As you can see above example output this does not generate 100% accurate d.ts. This is a compromise between of what style-dictionary can do to help and not bloating the library with rarely used dependencies.

Thankfully you can extend style-dictionary very easily:

build-tokens.js
import JsonToTS from 'json-to-ts';

StyleDictionaryPackage.registerFormat({
  name: 'typescript/accurate-module-declarations',
  format: function ({ dictionary }) {
    return (
      'declare const root: RootObject\n' +
      'export default root\n' +
      JsonToTS(dictionary.tokens).join('\n')
    );
  },
});

android/resources
Creates a resource xml file. It is recommended to use a filter with this format as it is generally best practice in Android development to have resource files organized by type (color, dimension, string, etc.). However, a resource file with mixed resources will still work.

This format will try to use the proper resource type for each token based on the category (color => color, size => dimen, etc.). However if you want to force a particular resource type you can provide a resourceType property on the options object property on the file object property configuration. You can also provide a resourceMap if you don’t use Style Dictionary’s built-in CTI structure.

Param	Type	Description
options	Object	
options.showFileHeader	boolean	Whether or not to include a comment that has the build date. Defaults to true
options.outputReferences	boolean | OutputReferencesFunction	Whether or not to keep references (a -> b -> c) in the output. Defaults to false. Also allows passing a function to conditionally output references on a per token basis.
Example:

resources.xml
<?xml version="1.0" encoding="UTF-8"?>
<resources>
 <color name="color_base_red_5">#fffaf3f2</color>
 <color name="color_base_red_30">#fff0cccc</color>
 <dimen name="size_font_base">14sp</color>

android/colors
Creates a color resource xml file with all the colors in your style dictionary.

It is recommended to use the ‘android/resources’ format with a custom filter instead of this format:

config.js
format: formats.androidResources, // formats enum for string 'android/resources'
filter: {
  type: "color"
}

Example:

resources.xml
<?xml version="1.0" encoding="UTF-8"?>
<resources>
 <color name="color_base_red_5">#fffaf3f2</color>
 <color name="color_base_red_30">#fff0cccc</color>
 <color name="color_base_red_60">#ffe19d9c</color>

android/dimens
Creates a dimen resource xml file with all the sizes in your style dictionary.

It is recommended to use the ‘android/resources’ format with a custom filter instead of this format:

config.js
format: formats.androidResources, // formats enum for string 'android/resources'
filter: {
  type: "dimension"
}

Example:

dimens.xml
<?xml version="1.0" encoding="UTF-8"?>
<resources>
 <dimen name="size_padding_tiny">5.00dp</dimen>
 <dimen name="size_padding_small">10.00dp</dimen>
 <dimen name="size_padding_medium">15.00dp</dimen>

android/fontDimens
Creates a dimen resource xml file with all the font sizes in your style dictionary.

It is recommended to use the ‘android/resources’ format with a custom filter instead of this format:

config.js
format: formats.androidResources, // formats enum for string 'android/resources'
filter: {
  type: "dimension"
}

Example:

font-dimens.xml
<?xml version="1.0" encoding="UTF-8"?>
<resources>
 <dimen name="size_font_tiny">10.00sp</dimen>
 <dimen name="size_font_small">13.00sp</dimen>
 <dimen name="size_font_medium">15.00sp</dimen>

android/integers
Creates a resource xml file with all the integers in your style dictionary. It filters your design tokens by token.type === 'time'

It is recommended to use the ‘android/resources’ format with a custom filter instead of this format:

config.js
format: formats.androidResources, // formats enum for string 'android/resources'
filter: {
  type: 'time'
}

Example:

integers.xml
<?xml version="1.0" encoding="UTF-8"?>
<resources>
  <integer name="time_duration_short">1000</integer>
  <integer name="time_duration_medium">2000</integer>
  <integer name="time_duration_long">4000</integer>

android/strings
Creates a resource xml file with all the strings in your style dictionary. Filters your design tokens by token.type === 'content'

It is recommended to use the ‘android/resources’ format with a custom filter instead of this format:

config.js
format: formats.androidResources, // formats enum for string 'android/resources'
filter: {
  type: 'content'
}

Example:

icons.xml
<?xml version="1.0" encoding="UTF-8"?>
<resources>
  <string name="content_icon_email">&#xE001;</string>
  <string name="content_icon_chevron_down">&#xE002;</string>
  <string name="content_icon_chevron_up">&#xE003;</string>

compose/object
Creates a Kotlin file for Compose containing an object with a val for each property.

Param	Type	Description
options	Object	
options.import	string[] | string	Modules to import. Can be a string or array of strings. Defaults to ['androidx.compose.ui.graphics.Color', 'androidx.compose.ui.unit.*'].
options.showFileHeader	boolean	Whether or not to include a comment that has the build date. Defaults to true
options.outputReferences	boolean | OutputReferencesFunction	Whether or not to keep references (a -> b -> c) in the output. Defaults to false. Also allows passing a function to conditionally output references on a per token basis.
options.className	string	The name of the generated Kotlin object
options.packageName	string	The package for the generated Kotlin object
options.accessControl	string	Level of access of the generated compose properties and object. Defaults to ''.
options.objectType	string	Type of Kotlin object. Defaults to '' (regular object).
Example:

vars.kt
package com.example.tokens;

import androidx.compose.ui.graphics.Color

object StyleDictionary {
 val colorBaseRed5 = Color(0xFFFAF3F2)
}

ios/macros
Creates an Objective-C header file with macros for design tokens

Example:

macros.swift
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

#define ColorFontLink [UIColor colorWithRed:0.00f green:0.47f blue:0.80f alpha:1.00f]
#define SizeFontTiny 176.00f

ios/plist
Creates an Objective-C plist file

Todo

Fix this template and add example and usage
ios/singleton.m
Creates an Objective-C implementation file of a style dictionary singleton class

Todo

Add example and usage
ios/singleton.h
Creates an Objective-C header file of a style dictionary singleton class

Todo

Add example and usage
ios/static.h
Creates an Objective-C header file of a static style dictionary class

Todo

Add example and usage
ios/static.m
Creates an Objective-C implementation file of a static style dictionary class

Todo

Add example and usage
ios/colors.h
Creates an Objective-C header file of a color class

Todo

Add example and usage
ios/colors.m
Creates an Objective-C implementation file of a color class

Todo

Add example and usage
ios/strings.h
Creates an Objective-C header file of strings

Todo

Add example and usage
ios/strings.m
Creates an Objective-C implementation file of strings

Todo

Add example and usage
ios-swift/class.swift
Creates a Swift implementation file of a class with values. It adds default class object type, public access control and UIKit import.

Param	Type	Description
options	Object	
options.accessControl	string	Level of access of the generated swift object. Defaults to public.
options.import	string[] | string	Modules to import. Can be a string or array of strings. Defaults to 'UIKit'.
options.className	string	The name of the generated Swift object
options.showFileHeader	boolean	Whether or not to include a comment that has the build date. Defaults to true
options.outputReferences	boolean | OutputReferencesFunction	Whether or not to keep references (a -> b -> c) in the output. Defaults to false. Also allows passing a function to conditionally output references on a per token basis.
Example:

colors.swift
public class StyleDictionary {
  public static let colorBackgroundDanger = UIColor(red: 1.000, green: 0.918, blue: 0.914, alpha: 1)
}

ios-swift/enum.swift
Creates a Swift implementation file of an enum with values. It adds default enum object type, public access control and UIKit import.

Param	Type	Description
options	Object	
options.accessControl	string	Level of access of the generated swift object. Defaults to public.
options.import	string[] | string	Modules to import. Can be a string or array of strings. Defaults to 'UIKit'.
options.className	string	The name of the generated Swift object
options.showFileHeader	boolean	Whether or not to include a comment that has the build date. Defaults to true
options.outputReferences	boolean | OutputReferencesFunction	Whether or not to keep references (a -> b -> c) in the output. Defaults to false. Also allows passing a function to conditionally output references on a per token basis.
Example:

colors.swift
public enum StyleDictionary {
  public static let colorBackgroundDanger = UIColor(red: 1.000, green: 0.918, blue: 0.914, alpha: 1)
}

ios-swift/any.swift
Creates a Swift implementation file of any given type with values. It has by default class object type, public access control and UIKit import.

config.js
format: 'ios-swift/any.swift',
import: ['UIKit', 'AnotherModule'],
objectType: 'struct',
accessControl: 'internal',

Param	Type	Description
options	Object	
options.accessControl	string	Level of access of the generated swift object. Defaults to public.
options.import	string[] | string	Modules to import. Can be a string or array of strings. Defaults to 'UIKit'.
options.className	string	The name of the generated Swift object
options.objectType	string	The type of the generated Swift object. Defaults to 'class'.
options.showFileHeader	boolean	Whether or not to include a comment that has the build date. Defaults to true
options.outputReferences	boolean | OutputReferencesFunction	Whether or not to keep references (a -> b -> c) in the output. Defaults to false. Also allows passing a function to conditionally output references on a per token basis.
Example:

colors.swift
import UIKit
import AnotherModule

internal struct StyleDictionary {
  internal static let colorBackgroundDanger = UIColor(red: 1.000, green: 0.918, blue: 0.914, alpha: 1)
}

css/fonts.css
Creates CSS file with @font-face declarations

Todo

Add example and usage
json
Creates a JSON file of the style dictionary.

Param	Type	Description
options	Object	
options.stripMeta	Object | boolean	Control whether meta data is stripped from the output tokens. false by default. If set to true, will strip known Style Dictionary meta props: ['attributes', 'filePath', 'name', 'path', 'comment']
options.stripMeta.keep	string[]	Array of property keys to keep in the output.
options.stripMeta.strip	string[]	Array of property keys to strip from the output.
Live Demo:


/output.json
/output.json
1234567891011121314151617
export default {
  platforms: {
    json: {
      files: [
        {
          destination: 'output.json',
          format: 'json',
          options: {
            stripMeta: {
              keep: ['value'],

json/asset
Creates a JSON file of the assets defined in the style dictionary.

Example:

assets.json
{
  "asset": {
    "image": {
      "logo": {
        "value": "assets/logo.png"
      }
    }
  }
}

json/nested
Creates a JSON nested file of the style dictionary.

Example:

vars.json
{
  "color": {
    "base": {
      "red": "#ff0000"
    }
  }
}

json/flat
Creates a JSON flat file of the style dictionary.

Example:

vars.json
{
  "color-base-red": "#ff0000"
}

sketch/palette
Creates a sketchpalette file of all the base colors

Example:

palette.json
{
  "compatibleVersion": "1.0",
  "pluginVersion": "1.1",
  "colors": ["#ffffff", "#ff0000", "#fcfcfc"]
}

sketch/palette/v2
Creates a sketchpalette file compatible with version 2 of the sketchpalette plugin. To use this you should use the ‘color/sketch’ transform to get the correct value for the colors.

Example:

palette-2.json
{
  "compatibleVersion": "2.0",
  "pluginVersion": "2.2",
  "colors": [
    { "name": "red", "r": 1.0, "g": 0.0, "b": 0.0, "a": 1.0 },
    { "name": "green", "r": 0.0, "g": 1.0, "b": 0.0, "a": 1.0 },
    { "name": "blue", "r": 0.0, "g": 0.0, "b": 1.0, "a": 1.0 }
  ]
}

flutter/class.dart
Creates a Dart implementation file of a class with values

Param	Type	Description
options.showFileHeader	boolean	Whether or not to include a comment that has the build date. Defaults to true
options.outputReferences	boolean | OutputReferencesFunction	Whether or not to keep references (a -> b -> c) in the output. Defaults to false. Also allows passing a function to conditionally output references on a per token basis.
options.className	string	The name of the generated Dart Class
Example:

tokens.dart
import 'package:flutter/material.dart';

class StyleDictionary {
  StyleDictionary._();

    static const colorBrandPrimary = Color(0x00ff5fff);
    static const sizeFontSizeMedium = 16.00;
    static const contentFontFamily1 = "NewJune";

Edit page
 Previous
Format Helpers
 Next
Filters

Skip to content
Style-Dictionary logo, Pascal the chameleon.
Style Dictionary

Search
⌘
K
GitHub
Slack
Select theme
Auto
Overview
Using the CLI
Using the NPM Module
Examples
Design Tokens
Architecture
Package Structure
Design Tokens Community Group
Statement
Migration Guidelines
Migration Guidelines
API
Enums
Configuration
Logging
Parsers
Preprocessors
Overview
Built-in Transforms
Overview
Built-in Transform Groups
Overview
Format Helpers
Built-in Formats
Filters
File Headers
Actions
Types
Basic Example
Splitting output files
On this page
Overview
Filter structure
Using filters
.registerFilter
Inline
Applying it in config
Example
Filters
Filters is a hook that provides a way to filter your tokens prior to formatting them to the final output.

Common use cases for filtering are:

Not outputting your primitive/option tokens such as a color palette
Splitting component tokens into separate files for each component
Filter structure
A filter is an object with two props:

name: the name of the filter
filter: a callback function that receives the token as argument and returns a boolean, true to include the token, false to exclude/filter it out. Can also be an async function. Also has a second argument with the Style Dictionary options, which also contains the tokens object, usesDTCG option, etc.
my-filter.js
const myFilter = {
  name: 'my-filter',
  // async is optional
  filter: async (token, options) => {
    return !token.filePath.endsWith('core.json');
  },
};

Using filters
First you will need to tell Style Dictionary about your filter. You can do this in two ways:

Using the .registerFilter method
Inline in the configuration hooks.filters property
.registerFilter
import StyleDictionary from 'style-dictionary';

StyleDictionary.registerFilter(myFilter);

Inline
export default {
  hooks: {
    filters: {
      'my-filter': myFilter.filter,
    },
  },
  // ... the rest of the configuration
};

Applying it in config
{
  "source": ["**/*.tokens.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "files": [
        {
          "format": "css/variables",
          "destination": "_variables.css",
          "filter": "my-filter"
        }
      ]
    }
  }
}

Example

/_variables.css
/_variables.css
1234567891011121314151617181920212223
import { formats, transformGroups } from 'style-dictionary/enums';

export default {
  hooks: {
    filters: {
      'no-colors': (token, options) => {
        return token.type !== 'color';
      },
    },
  },

Edit page
 Previous
Built-in Formats
 Next
File Headers

Skip to content
Style-Dictionary logo, Pascal the chameleon.
Style Dictionary

Search
⌘
K
GitHub
Slack
Select theme
Auto
Overview
Using the CLI
Using the NPM Module
Examples
Design Tokens
Architecture
Package Structure
Design Tokens Community Group
Statement
Migration Guidelines
Migration Guidelines
API
Enums
Configuration
Logging
Parsers
Preprocessors
Overview
Built-in Transforms
Overview
Built-in Transform Groups
Overview
Format Helpers
Built-in Formats
Filters
File Headers
Actions
Types
Basic Example
Splitting output files
On this page
Overview
File header structure
Using file headers
.registerFileHeader
Inline
Applying it in config
Example
File Headers
File headers is a hook that provides a way to configure the header of output files.

_variables.css
/**
 * This is a file header!
 */
:root {
  --foo-bar: 4px;
}

File header structure
A file header is an object with two props:

name: the name of the file header
fileHeader: a callback function that receives the default message array of strings, usually set by the format, and returns an array of strings (message lines) or a Promise with an array of strings.
The array of strings will be concatenated using newline separator.

my-fileheader.js
const myFileHeader = {
  name: 'my-file-header',
  // async is optional
  fileHeader: async (defaultMessages = []) => {
    return [...defaultMessages, 'Do not edit please', 'Auto-generated on...'];
  },
};

Using file headers
First you will need to tell Style Dictionary about your file header. You can do this in two ways:

Using the .registerFileHeader method
Inline in the configuration hooks.fileHeaders property
.registerFileHeader
import StyleDictionary from 'style-dictionary';

StyleDictionary.registerFileHeader(myFileHeader);

Inline
export default {
  hooks: {
    fileHeaders: {
      'my-file-header': myFileHeader,
    },
  },
  // ... the rest of the configuration
};

Applying it in config
File-specific:

{
  "source": ["**/*.tokens.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "files": [
        {
          "format": "css/variables",
          "destination": "_variables.css",
          "options": {
            "fileHeader": "my-file-header"
          }
        }
      ]
    }
  }
}

or platform-specific:

{
  "source": ["**/*.tokens.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "options": {
        "fileHeader": "my-file-header"
      },
      "files": [
        {
          "format": "css/variables",
          "destination": "_variables.css"
        }
      ]
    }
  }
}

Example

1
Edit page
 Previous
Filters
 Next
Actions

Skip to content
Style-Dictionary logo, Pascal the chameleon.
Style Dictionary

Search
⌘
K
GitHub
Slack
Select theme
Auto
Overview
Using the CLI
Using the NPM Module
Examples
Design Tokens
Architecture
Package Structure
Design Tokens Community Group
Statement
Migration Guidelines
Migration Guidelines
API
Enums
Configuration
Logging
Parsers
Preprocessors
Overview
Built-in Transforms
Overview
Built-in Transform Groups
Overview
Format Helpers
Built-in Formats
Filters
File Headers
Actions
Types
Basic Example
Splitting output files
On this page
Overview
Pre-defined Actions
android/copyImages
copy_assets
Actions
Actions provide a way to run custom build code such as generating binary assets like images.

Here are all the actions that come with the Style Dictionary build system. We try to include what most people might need. If you think we are missing some things, take a look at our contributing docs and send us a pull request! If you have a specific need for your project, you can always create your own custom action with registerAction.

You use actions in your config file under platforms > [platform] > actions

{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "android": {
      "transformGroup": "android",
      "files": [],
      "actions": ["copy_assets"]
    }
  }
}

Pre-defined Actions
lib/common/actions.js

android/copyImages
Action to copy images into appropriate android directories.

copy_assets
Action that copies everything in the assets directory to a new assets directory in the build path of the platform.

Edit page
 Previous
File Headers
 Next
Overview

Skip to content
Style-Dictionary logo, Pascal the chameleon.
Style Dictionary

Search
⌘
K
GitHub
Slack
Select theme
Auto
Overview
Using the CLI
Using the NPM Module
Examples
Design Tokens
Architecture
Package Structure
Design Tokens Community Group
Statement
Migration Guidelines
Migration Guidelines
API
Enums
Configuration
Logging
Parsers
Preprocessors
Overview
Built-in Transforms
Overview
Built-in Transform Groups
Overview
Format Helpers
Built-in Formats
Filters
File Headers
Actions
Overview
References
Tokens
Format Helpers
Design Token Community Group
Types
Basic Example
Splitting output files
On this page
Overview
Installation
Usage
Utilities
The Style Dictionary npm module exposes a utils entrypoint that contains some helpful utility functions.

Installation
Terminal window
npm install -D style-dictionary

Usage
script.js
import { convertTokenData, resolveReferences, typeDtcgDelegate } from 'style-dictionary/utils';

Check out the next pages for more details about the specific categories of utility functions.

Edit page
 Previous
Actions
 Next
References


References
These utilities have to do with token references/aliases.

usesReferences
Whether or not a token value contains references

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { usesReferences } from 'style-dictionary/utils';

usesReferences('{foo.bar}'); // true
usesReferences('solid {border.width} {border.color}'); // true
usesReferences('5px'); // false

resolveReferences
Takes a token value string value and resolves any reference inside it

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { resolveReferences } from 'style-dictionary/utils';

const sd = new StyleDictionary({
  tokens: {
    colors: {
      black: {
        value: '#000',
        type: 'color',
      },
    },
    spacing: {
      2: {
        value: '2px',
        type: 'dimension',
      },
    },
    border: {
      value: 'solid {spacing.2} {colors.black}',
    },
  },
});
resolveReferences(sd.tokens.border.value, sd.tokens); // "solid 2px #000"
resolveReferences('solid {spacing.2} {colors.black}', sd.tokens); // alternative way, yet identical to line above -> "solid 2px #000"
resolveReferences('solid {spacing.2} {colors.black}', sd.tokens, { usesDtcg: true }); // Assumes DTCG spec format, with $ prefix ($value, $type)

You can pass a third options argument where you can pass some configuration options for how references are resolved:

usesDtcg boolean, if set to true, the resolveReferences utility will assume DTCG syntax ($value props)
warnImmediately boolean, true by default. You should only set this to false if you know that this utility is used used inside of the Transform lifecycle hook of Style Dictionary, allowing the errors to be grouped and only thrown at the end of the transform step (end of exportPlatform method).
Also supports passing a Token Map() data structure. This is more performant, and will become the standard in the next major version.

getReferences
Whether or not a token value contains references

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { getReferences } from 'style-dictionary/utils';

const sd = new StyleDictionary({
  tokens: {
    colors: {
      black: {
        value: '#000',
        type: 'color',
      },
    },
    spacing: {
      2: {
        value: '2px',
        type: 'dimension',
      },
    },
    border: {
      value: 'solid {spacing.2} {colors.black}',
    },
  },
});

getReferences(sd.tokens.border.value, sd.tokens);
getReferences('solid {spacing.2} {colors.black}', sd.tokens); // alternative way, yet identical to line above
getReferences('solid {spacing.2} {colors.black}', sd.tokens, { usesDtcg: true }); // Assumes DTCG spec format, with $ prefix ($value, $type)
/**
 * [
 *   { value: '2px', type: 'dimension', ref: ['spacing', '2'] },
 *   { value: '#000', type: 'color', ref: ['colors', 'black'] }
 * ]
 */

You can pass a third options argument where you can pass some configuration options for how references are resolved:

usesDtcg boolean, if set to true, the resolveReferences utility will assume DTCG syntax ($value props)
unfilteredTokens, assuming the second tokens argument is your filtered tokens object where filters have already done its work, you’ll likely want to pass the unfiltered set in case the reference you’re trying to find no longer exist in the filtered set, but you still want to get the reference values. This is useful when you’re writing your own custom format with an outputReferences feature and you want to prevent outputting refs that no longer exist in the filtered set.
warnImmediately boolean, true by default. You should only set this to false if you know that this utility is used inside of the Format lifecycle hook of Style Dictionary, allowing the errors to be grouped and only thrown at the end of the format step.
Also supports passing a Token Map() data structure. This is more performant, and will become the standard in the next major version.

Complicated example
You can use the getReferences utility to create your own custom formats that have outputReferences capability.

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { usesReferences, getReferences, fileHeader } from 'style-dictionary/utils';
import { transformGroups } from 'style-dictionary/enums';

const sd = new StyleDictionary({
  tokens: {
    colors: {
      black: {
        value: '#000',
        type: 'color',
      },
    },
    spacing: {
      2: {
        value: '2px',
        type: 'dimension',
      },
    },
    zIndex: {
      // number example.. which should stay a number in the output
      aboveFold: {
        value: 1,
        type: 'other',
      },
    },
    semantic: {
      bg: {
        primary: {
          value: '{colors.black}',
          type: 'color',
        },
      },
    },
    border: {
      value: 'solid {spacing.2} {semantic.bg.primary}',
    },
  },
  platforms: {
    es6: {
      transformGroup: transformGroups.js,
      files: [
        {
          format: 'es6',
          destination: 'output.js',
          options: {
            outputReferences: true,
          },
        },
      ],
    },
  },
});

// More complex case
// Note that this example format does not account for token values that are arrays or objects
StyleDictionary.registerFormat({
  name: 'es6',
  format: async (dictionary) => {
    const { allTokens, options, file } = dictionary;
    const isNumeric = (str) => {
      if (typeof str !== 'string') return false;
      return (
        !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
      );
    };

    const compileTokenValue = (token) => {
      let value = `${token.value}`;
      const original = `${token.original.value}`;
      const originalIsReferenceExclusively = original.match(/^\{.+\}$/g);

      const shouldOutputRef =
        usesReferencess(original) &&
        (typeof options.outputReferences === 'function'
          ? outputReferences(token, { dictionary })
          : options.outputReferences);

      if (shouldOutputRef) {
        value = original;
        if (!originalIsReferenceExclusively) {
          // since we're putting references back and value is not exclusively a reference, use template literals
          value = `\`${value}\``;
        }
        const refs = getReferences(dictionary, original);
        refs.forEach((ref) => {
          // check if the ref has a value, path and name property, meaning that a name transform
          // that creates the token name is mandatory for this format to function properly
          if (['value', 'name', 'path'].every((prop) => Object.hasOwn(ref, prop))) {
            value = value.replace(
              // e.g. `{foo.bar.qux}` or `{foo.bar.qux}`
              // replaced by `${fooBarQux}`
              new RegExp(`{${ref.path.join('.')}(.value)?}`, 'g'),
              originalIsReferenceExclusively ? ref.name : `\${${ref.name}}`,
            );
          }
        });
        return value;
      }
      return isNumeric(value) ? value : JSON.stringify(value);
    };

    const header = await fileHeader({ file });

    return `${header}${allTokens.reduce((acc, token) => {
      return (
        acc +
        `export const ${token.name} = ${compileTokenValue(token)}; ${
          token.comment ? `// ${token.comment}` : ''
        }\n`
      );
    }, '')}`;
  },
});

await sd.buildAllPlatforms();

// output below

/**
 * Do not edit directly
 * Generated on Thu, 07 Dec 2023 14:44:53 GMT
 */

export const ColorsBlack = '#000';
export const Spacing2 = '2px';
export const ZIndexAboveFold = 1;
export const SemanticBgPrimary = ColorsBlack;
export const Border = `solid ${Spacing2} ${SemanticBgPrimary}`;

Note

The above example does not support DTCG syntax, but this could be quite easily added, since you can query sd.usesDtcg or inside a format functions dictionary.options.usesDtcg.

outputReferencesFilter
An OutputReferences function that filters for tokens containing references to other tokens that are filtered out in the output. Usually Style Dictionary will throw a warning when you’re using outputReferences: true and are about to have a broken reference in your output because the token you’re referencing is filtered out. What that means is that you usually have to either adjust your filter or disable outputReferences altogether, but supplying a function instead allows you to conditionally output references on a per token basis.

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { outputReferencesFilter } from 'style-dictionary/utils';
import { formats, transformGroups } from 'style-dictionary/enums';

const sd = new StyleDictionary({
  tokens: {
    colors: {
      black: {
        value: '#000',
        type: 'color',
      },
      grey: {
        // filtering this one out
        value: '#ccc',
        type: 'color',
      },
    },
    spacing: {
      2: {
        value: '2px',
        type: 'dimension',
      },
    },
    border: {
      value: 'solid {spacing.2} {colors.black}',
    },
    shadow: {
      // danger: references a filtered out token!
      value: '0 4px 2px {colors.grey}',
    },
  },
  platforms: {
    css: {
      transformGroup: transformGroups.css,
      files: [
        {
          destination: 'vars.css',
          format: formats.cssVariables,
          filter: (token) => token.name !== 'colors-grey',
          options: {
            // returns false for the shadow token because it refs color-grey which is filtered out
            outputReferences: outputReferencesFilter,
          },
        },
      ],
    },
  },
});

Output:

vars.css
:root {
  --spacing-2: 2rem;
  --colors-black: #000000;
  --shadow: 0 4px 2px #cccccc;
  --border: solid var(--spacing-2) var(--colors-black);
}

Note that --colors-grey was filtered out and therefore the shadow does not contain a CSS custom property (reference) but rather the resolved value.

Live Demo:


/vars.css
/vars.css
123456789101112131415161718192021
import { outputReferencesFilter } from 'style-dictionary/utils';
import { formats, transformGroups } from 'style-dictionary/enums';

export default {
  platforms: {
    css: {
      transformGroup: transformGroups.css,
      files: [
        {
          destination: 'vars.css',

outputReferencesTransformed
An outputReferences function that checks for each token whether the value has changed through a transitive transform compared to the original value where references are resolved.

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { outputReferencesTransformed } from 'style-dictionary/utils';
import { formats, transformGroups } from 'style-dictionary/enums';

const sd = new StyleDictionary({
  tokens: {
    base: {
      value: '#000',
      type: 'color',
    },
    referred: {
      value: 'rgba({base}, 12%)',
      type: 'color',
    },
  },
  platforms: {
    css: {
      transformGroup: transformGroups.css,
      // see https://github.com/tokens-studio/sd-transforms
      // this transform handles rgba(#000, 0.12) -> rgba(0, 0, 0, 0.12)
      // as a transitive transform
      transforms: ['ts/color/css/hexrgba'],
      files: [
        {
          destination: 'vars.css',
          format: formats.cssVariables,
          options: {
            outputReferences: outputReferencesTransformed,
          },
        },
      ],
    },
  },
});

Output:

vars.css
:root {
  --base: #000;
  --referred: rgba(0, 0, 0, 12%);
}

Note that --referred is using the resolved value that is a transformed version of --base instead of rgba(var(--base), 12%) which would be invalid CSS. This can be verified by setting outputReferences to true in the demo below.

Live Demo:


/vars.css
/vars.css
1234567891011121314151617181920
import { outputReferencesTransformed } from 'style-dictionary/utils';
import { formats, transformGroups } from 'style-dictionary/enums';

export default {
  platforms: {
    css: {
      transformGroup: transformGroups.css,
      transforms: ['ts/color/css/hexrgba'],
      files: [
        {

Combining multiple outputReference utility functions
These utility functions can be quite easily combined together:

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { outputReferencesFilter, outputReferencesTransformed } from 'style-dictionary/utils';
import { formats, transformGroups } from 'style-dictionary/enums';

const sd = new StyleDictionary({
  platforms: {
    css: {
      transformGroup: transformGroups.css,
      files: [
        {
          destination: 'vars.css',
          format: formats.cssVariables,
          options: {
            outputReferences: (token, options) =>
              outputReferencesFilter(token, options) && outputReferencesTransformed(token, options),
          },
        },
      ],
    },
  },
});

Edit page


Tokens
These utilities have to do with processing/formatting tokens.

flattenTokens Deprecated
Deprecated in favor of convertTokenData, see below.

Flatten dictionary tokens object to an array of flattened tokens.

Note

Only the “value” / “$value” property is required for this utility to consider a leaf node a “token” to be added to the flattened array output.

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { flattenTokens } from 'style-dictionary/utils';

const sd = new StyleDictionary({
  tokens: {
    colors: {
      black: {
        value: '#000',
        type: 'color',
        name: 'colors-black',
      },
    },
    spacing: {
      2: {
        value: '2px',
        type: 'dimension',
        name: 'spacing-2',
      },
    },
    border: {
      value: 'solid {spacing.2} {colors.black}',
      name: 'border',
    },
  },
});
await sd.hasInitialized;

const flat = flattenTokens(sd.tokens);
/**
 * [
 *   { key: '{colors.black}', value: '#000', type: 'color', name: 'colors-black' },
 *   { key: '{spacing.2}', value: '2px', type: 'dimension', name: 'spacing-2' },
 *   { key: '{border}', value: 'solid {spacing.2} {colors.black}', name: 'border' }
 * ]
 */

Note

You can pass a second argument usesDtcg, if set to true, the flattenTokens utility will assume DTCG syntax ($value props).

The key is added so that it is easy to transform the flattened array back to a nested object if needed later, by using the convertTokenData utility.

convertTokenData
Convert tokens from one data structure to another.

Available data structures:

Array (available as allTokens on dictionary) -> easy to iterate e.g. for outputting flat formats
Object (available as tokens on dictionary) -> similar to JSON input format e.g. DTCG format, useful for outputting nested / deep formats such as JSON
Map (available as tokenMap on dictionary) -> easy to iterate & access, optimal for token processing and will be used internally in Style Dictionary in the future
All 3 structures can be converted to one another

Param	Type	Description
tokens	Tokens | Token[] | TokenMap	The input tokens data as either Object, Array or Map.
options	Object	Options object, with multiple properties.
options.usesDtcg	boolean	Whether the input data uses DTCG syntax, false by default.
options.output	'object' | 'array' | 'map'	Output data format
We are currently considering making the Map structure the de-facto standard in a future v6, making the Object/Array versions available only through this utility. This is to optimize the library’s base functionality.

This utility auto-detects the input data type and allows you to specify the desired output data type. You can optionally pass usesDtcg flag as well if you use DTCG format, this is necessary for converting from Object to Map/Array, since we need to know whether to use the $value or value to identify tokens in the Object.

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { convertTokenData } from 'style-dictionary/utils';

const sd = new StyleDictionary({
  tokens: {
    colors: {
      black: {
        value: '#000',
        type: 'color',
        name: 'colors-black',
      },
    },
    spacing: {
      2: {
        value: '2px',
        type: 'dimension',
        name: 'spacing-2',
      },
    },
    border: {
      value: 'solid {spacing.2} {colors.black}',
      name: 'border',
    },
  },
});
await sd.hasInitialized;

const flatArray = convertTokenData(sd.tokens, { output: 'array' });
/**
 * [
 *   { key: '{colors.black}', value: '#000', type: 'color', name: 'colors-black' },
 *   { key: '{spacing.2}', value: '2px', type: 'dimension', name: 'spacing-2' },
 *   { key: '{border}', value: 'solid {spacing.2} {colors.black}', name: 'border' }
 * ]
 */

/**
 * Using the flatArray as input here is cheaper than using sd.tokens, since in order for
 * it to convert a tokens Object to a Map, it would first flatten it to an Array.
 *
 * However, you definitely CAN use the sd.tokens as input as well
 */
const map = convertTokenData(flatArray, { output: 'map' });
/**
 * Map(3): {
 *   '{colors.black}' => { value: '#000', type: 'color', name: 'colors-black' },
 *   '{spacing.2}' => { value: '2px', type: 'dimension', name: 'spacing-2' },
 *   '{border}' => { value: 'solid {spacing.2} {colors.black}', name: 'border' }
 * }
 */
const borderToken = map.get('{border}'); // easy to access a token since it's keyed

/**
 * Same as above, you could use `sd.tokens` or `map` as inputs as well
 * `sd.tokens` is cheapest since it's already an object and just returns it, no conversion happens
 * `array` is just slightly cheaper than map since map needs to call .values() Iterator to iterate
 */
const object = convertTokenData(flatArray, { output: 'object' });
/**
 * Same as original tokens input, we basically went full circle
 */

stripMeta
Allows you to strip meta data from design tokens, useful if you want to output clean nested formats.

You can define which meta properties to strip or which properties to keep (allowlist / blocklist), in the second options parameter.

This utility is also used in the 'json' format.

build-tokens.js
import StyleDictionary from 'style-dictionary';
import { stripMeta } from 'style-dictionary/utils';

const sd = new StyleDictionary({
  tokens: {
    colors: {
      black: {
        value: '#000',
        type: 'color',
        name: 'colors-black',
        attributes: { foo: 'bar' },
        path: ['colors', 'black'],
      },
    },
    spacing: {
      2: {
        value: '2px',
        type: 'dimension',
        name: 'spacing-2',
        attributes: { foo: 'bar' },
        path: ['spacing', '2'],
      },
    },
    border: {
      value: 'solid {spacing.2} {colors.black}',
      name: 'border',
      attributes: { foo: 'bar' },
      path: ['border'],
    },
  },
});

const stripped = stripMeta(sd, { keep: ['value'] });
/**
 * {
 *   colors: {
 *     black: {
 *       value: '#000',
 *     },
 *   },
 *   spacing: {
 *     2: {
 *       value: '2px',
 *     },
 *   },
 *   border: {
 *     value: 'solid {spacing.2} {colors.black}',
 *   },
 * }
 */

Note

You can pass usesDtcg property in the options object parameter, if set to true, the stripMeta utility will assume DTCG syntax ($value props).

Format Helpers
We provide some helper methods we use internally in some of the built-in formats to make building custom formats a bit easier.

They are accessible at style-dictionary/utils entrypoint.

import StyleDictionary from 'style-dictionary';
import { fileHeader, formattedVariables } from 'style-dictionary/utils';
import { propertyFormatNames } from 'style-dictionary/enums';

StyleDictionary.registerFormat({
  name: 'myCustomFormat',
  format: async ({ dictionary, file, options }) => {
    const { outputReferences } = options;
    const header = await fileHeader({ file });
    return (
      header +
      ':root {\n' +
      formattedVariables({
        format: propertyFormatNames.css,
        dictionary,
        outputReferences,
      }) +
      '\n}\n'
    );
  },
});

Here are the available format helper methods:

createPropertyFormatter
Creates a function that can be used to format a property. This can be useful to use as the function on dictionary.allTokens.map. The formatting is configurable either by supplying a format option or a formatting object which uses: prefix, indentation, separator, suffix, and commentStyle.

Param	Type	Description
options	Object	A single argument to support named parameters and destructuring.
options.outputReferences	boolean | OutputReferencesFunction	Whether or not to output references. You will want to pass this from the options object sent to the format function. Also allows passing a function to conditionally output references on a per token basis.
options.outputReferenceFallbacks	boolean	Whether or not to output css variable fallback values when using output references. You will want to pass this from the options object sent to the format function.
options.dictionary	Dictionary	Transformed Dictionary object containing allTokens, tokens and unfilteredTokens.
options.dictionary.tokens	TransformedTokens	All tokens, still in unflattened object format.
options.dictionary.allTokens	TransformedToken[]	Flattened array of all tokens, easiest to loop over and export to a flat format.
options.dictionary.tokenMap	Record<string, TransformedToken>	All tokens as JavaScript. Map
options.dictionary.unfilteredTokens	TransformedTokens	All tokens, still in unflattened object format, including tokens that were filtered out by filters.
options.dictionary.unfilteredAllTokens	TransformedToken[]	Flattened array of all tokens, easiest to loop over and export to a flat, including tokens that were filtered out by filters.
options.dictionary.unfilteredTokenMap	Record<string, TransformedToken>	All tokens as JavaScript Map, still in unflattened object format, including tokens that were filtered out by filters.
options.format	string	Available formats are: ‘css’, ‘sass’, ‘less’, and ‘stylus’. If you want to customize the format and can’t use one of those predefined formats, use the formatting option
options.formatting	FormattingOptions	Custom formatting properties that define parts of a declaration line in code. The configurable strings are: prefix, indentation, separator, suffix, lineSeparator, fileHeaderTimestamp, header, footer, commentStyle and commentPosition. Those are used to generate a line like this: ${indentation}${prefix}${token.name}${separator} ${prop.value}${suffix}. The remaining formatting options are used for the fileHeader helper.
options.themeable	boolean	Whether tokens should default to being themeable. Defaults to false.
options.usesDtcg	boolean	Whether tokens use the DTCG standard. Defaults to false
Example:

build-tokens.js
import { propertyFormatNames } from 'style-dictionary/enums';

StyleDictionary.registerFormat({
  name: 'myCustomFormat',
  format: function ({ dictionary, options }) {
    const { outputReferences } = options;
    const formatProperty = createPropertyFormatter({
      outputReferences,
      dictionary,
      format: propertyFormatNames.css,
    });
    return dictionary.allTokens.map(formatProperty).join('\n');
  },
});

fileHeader
This is for creating the comment at the top of generated files with the generated at date. It will use the custom file header if defined on the configuration, or use the default file header.

Param	Type	Description
options	Object	
options.file	File	The file object that is passed to the format.
options.commentStyle	string	The only options are 'short', 'xml' and 'long', which will use the //, <!-- --> or /* style comments respectively. Defaults to 'long'. There is an enum-like JS object commentStyles available for import.
options.commentPosition	string	'above' or 'inline', so either above the token or inline with the token. There is an enum-like JS object commentPositions available for import.
options.formatting	Object	Custom formatting properties that define parts of a comment in code. The configurable strings are: prefix, lineSeparator, header, footer and fileHeaderTimestamp.
Example:

build-tokens.js
import { commentStyles } from 'style-dictionary/enums';

StyleDictionary.registerFormat({
  name: 'myCustomFormat',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file, commentStyle: commentStyles.short });
    return (
      header + dictionary.allTokens.map((token) => `${token.name} = ${token.value};`).join('\n')
    );
  },
});

Use options.formatting.fileHeaderTimestamp set to true to create a fileHeader that contains a timestamp for when the file was created. This used to be default behavior but was made opt-in to accompany the common use case of Style Dictionary running in Continuous Integration (CI) pipelines, and not wanting to create redundant git diffs just because of the timestamp changing between versions.

formattedVariables
This is used to create lists of variables like Sass variables or CSS custom properties

Param	Type	Description
options	Object	
options.format	string	What type of variables to output. Options are: 'css', 'sass', 'less', and 'stylus'.
options.dictionary	Dictionary	Transformed Dictionary object containing allTokens, tokens and unfilteredTokens.
options.dictionary.allTokens	TransformedToken[]	Flattened array of all tokens, easiest to loop over and export to a flat format.
options.dictionary.tokens	TransformedTokens	All tokens, still in unflattened object format.
options.dictionary.unfilteredTokens	TransformedTokens	All tokens, still in unflattened object format, including tokens that were filtered out by filters.
options.outputReferences	boolean | OutputReferencesFunction	Whether or not to output references. You will want to pass this from the options object sent to the format function. Also allows passing a function to conditionally output references on a per token basis.
options.formatting	Object	Custom formatting properties that define parts of a comment in code. The configurable strings are: prefix, lineSeparator, header, and footer.
options.themeable	boolean	Whether tokens should default to being themeable. Defaults to false.
options.usesDtcg	boolean	Whether tokens use the DTCG standard. Defaults to false
Example:

build-tokens.js
import { propertyFormatNames } from 'style-dictionary/enums';

StyleDictionary.registerFormat({
  name: 'myCustomFormat',
  format: function ({ dictionary, options }) {
    return formattedVariables({
      format: propertyFormatNames.less,
      dictionary,
      outputReferences: options.outputReferences,
    });
  },
});

getTypeScriptType
Given some value, returns a basic valid TypeScript type for that value. Supports numbers, strings, booleans, arrays and objects of any of those types.

Returns: string - A valid name for a TypeScript type.

Param	Type	Description
value	any	A value to check the type of.
options	Object	
options.outputStringLiterals	boolean	Whether or not to output literal types for string values
Example:

build-tokens.js
StyleDictionary.registerFormat({
  name: 'myCustomFormat',
  format: function ({ dictionary, options }) {
    return dictionary.allTokens
      .map(function (prop) {
        var to_ret_prop = 'export const ' + prop.name + ' : ' + getTypeScriptType(prop.value) + ';';
        if (prop.comment) to_ret_prop = to_ret_prop.concat(' // ' + prop.comment);
        return to_ret_prop;
      })
      .join('\n');
  },
});

iconsWithPrefix
This is used to create CSS (and CSS pre-processor) lists of icons. It assumes you are using an icon font and creates helper classes with the :before pseudo-selector to add a unicode character. You probably don’t need this.

Param	Type	Description
prefix	string	Character to prefix variable names, like $ for Sass
allTokens	TransformedToken[]	Flattened array of all tokens, easiest to loop over and export to a flat format.
options	Object	options object passed to the format function.
Example:

build-tokens.js
StyleDictionary.registerFormat({
  name: 'myCustomFormat',
  format: function ({ dictionary, options }) {
    return iconsWithPrefix('$', dictionary.allTokens, options);
  },
});

minifyDictionary
Outputs an object stripping out everything except values

Param	Type	Description
obj	TransformedTokens	The object to minify. You will most likely pass dictionary.tokens to it.
Example:

build-tokens.js
StyleDictionary.registerFormat({
  name: 'myCustomFormat',
  format: function ({ dictionary }) {
    return JSON.stringify(minifyDictionary(dictionary.tokens));
  },
});

setComposeObjectProperties
Outputs an object for compose format configurations. Sets import.

Param	Type	Description
options	Object	The options object declared at configuration
setSwiftFileProperties
Outputs an object with swift format configurations. Sets import, object type and access control.

Param	Type	Description
options	Object	The options object declared at configuration
objectType	string	The type of the object in the final file. Could be a class, enum, struct, etc.
options	string	The transformGroup of the file, so it can be applied proper import
sortByName
A sorting function to be used when iterating over dictionary.allTokens in a format.

Returns: Integer - -1 or 1 depending on which element should come first based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort

Param	Type	Description
a	any	first element for comparison
b	any	second element for comparison
Example:

build-tokens.js
StyleDictionary.registerFormat({
  name: 'myCustomFormat',
  format: function ({ dictionary, options }) {
    return dictionary.allTokens
      .sort(sortByName)
      .map((token) => `${token.name} = ${token.value}`)
      .join('\n');
  },
});

sortByReference
A function that returns a sorting function to be used with Array.sort that will sort the allTokens array based on references. This is to make sure if you use output references that you never use a reference before it is defined.

Param	Type	Description
dictionary	Dictionary	Transformed Dictionary object containing allTokens, tokens and unfilteredTokens.
dictionary.allTokens	TransformedToken[]	Flattened array of all tokens, easiest to loop over and export to a flat format.
dictionary.tokens	TransformedTokens	All tokens, still in unflattened object format.
dictionary.unfilteredTokens	TransformedTokens	All tokens, still in unflattened object format, including tokens that were filtered out by filters.
Example:

build-tokens.js
dictionary.allTokens.sort(sortByReference(dictionary));

Design Tokens Community Group
These utilities have to do with the Design Tokens W3C Community Group specification.

For converting a ZIP or JSON tokens file to the DTCG format, use the button below:


This button is a tiny Web Component using file input as a wrapper around the convert DTCG utils listed below.

convertToDTCG
This function converts your dictionary object to DTCG formatted dictionary, meaning that your value, type and description properties are converted to be prefixed with $, and the $type property is moved from the token level to the topmost common ancestor token group.

import { convertToDTCG } from 'style-dictionary/utils';

const outputDictionary = convertToDTCG(dictionary, { applyTypesToGroup: false });

applyTypesToGroup is true by default, but can be turned off by setting to false.

dictionary is the result of doing for example JSON.parse() on your tokens JSON string so it becomes a JavaScript object type.

Danger

Do not use this hook with applyTypesToGroup set to true (default) inside of a Preprocessor hook!
Style Dictionary relies on typeDtcgDelegate utility being ran right before user-defined preprocessors delegating all of the token group types to the token level, because this makes it easier and more performant to grab the token type from the token itself, without needing to know about and traverse its ancestor tree to find it.
typeDtcgDelegate is doing the opposite action of convertToDTCG, delegating the $type down rather than moving and condensing the $type up.

convertJSONToDTCG
This function converts your JSON (either a JSON Blob or string that is an absolute filepath to your JSON file) to a JSON Blob which has been converted to DTCG format, see convertToDTCG function above.

import { convertToDTCG } from 'style-dictionary/utils';

const outputBlob = convertJSONToDTCG(JSONBlobOrFilepath, { applyTypesToGroup: false });

applyTypesToGroup option can be passed, same as for convertToDTCG function.

Note that if you use a filepath instead of Blob as input, this filepath should preferably be an absolute path. You can use a utility like node:path or a browser-compatible copy like path-unified to resolve path segments or relative paths to absolute ones.

convertZIPToDTCG
This function converts your ZIP (either a ZIP Blob or string that is an absolute filepath to your ZIP file) to a ZIP Blob which has been converted to DTCG format, see convertToDTCG function above.

Basically the same as convertJSONToDTCG but for a ZIP file of JSON tokens.

import { convertZIPToDTCG } from 'style-dictionary/utils';

const outputBlob = convertZIPToDTCG(ZIPBlobOrFilepath, { applyTypesToGroup: false });

typeDtcgDelegate
This function processes your “Design Tokens Community Group Draft spec”-compliant dictionary of tokens, and ensures that $type inheritance is applied.

We built this utility because it’s cheaper to apply the inheritance once, rather than on every access of a token’s “$type” property, checking the ancestor tree to find it.

This utility runs by default in Style-Dictionary after the parser hook and before the preprocessor hook.

Caution

Important to note is that the $type prop on the group level will be removed during this step, and will only exist on the token level. If you want the $type to go back to the group level (highest possible common ancestor), then please use convertToDTCG for this.

import { typeDtcgDelegate } from 'style-dictionary/utils';

const output = typeDtcgDelegate(input);

Input:

{
  dimensions: {
    $type: 'dimension',
    sm: {
      $value: '5',
    },
    md: {
      $value: '10',
    },
    nested: {
      deep: {
        lg: {
          $value: '15',
        },
      },
    },
    nope: {
      $value: '20',
      $type: 'spacing',
    },
  },
}

Output:

{
  dimensions: {
    sm: {
      $value: '5',
      $type: 'dimension',
    },
    md: {
      $value: '10',
      $type: 'dimension',
    },
    nested: {
      deep: {
        lg: {
          $value: '15',
          $type: 'dimension',
        },
      },
    },
    nope: {
      $value: '20',
      $type: 'spacing',
    },
  },
}


Basic Example
This example code is bare-bones to show you what this framework can do. Under the hood of this interactive demo, we run Style Dictionary through the Node API in a way that is equivalent to running the CLI command:

Terminal window
npx style-dictionary build


/build/android/colors.xml
/build/android/colors.xml
1234567891011121314151617181920212223
{
  "source": ["tokens.json"],
  "platforms": {
    "scss": {
      "transformGroup": "scss",
      "buildPath": "build/scss/",
      "files": [
        {
          "destination": "_variables.scss",
          "format": "scss/variables"

Note

You can click the download button to the top right of the interactive demo to download a ZIP file for this particular example. This contains a README.md telling you which commands to run to get this example running locally. You will need NodeJS and NPM installed, Node v18 minimum being required.

You should see something like this output in the console:

scss
✔︎  build/scss/_variables.scss

android
✔︎  build/android/font_dimens.xml
✔︎  build/android/colors.xml

compose
✔︎ build/compose/StyleDictionaryColor.kt
✔︎ build/compose/StyleDictionarySize.kt

ios
✔︎  build/ios/StyleDictionaryColor.h
✔︎  build/ios/StyleDictionaryColor.m
✔︎  build/ios/StyleDictionarySize.h
✔︎  build/ios/StyleDictionarySize.m

ios-swift
✔︎  build/ios-swift/StyleDictionary.swift

ios-swift-separate-enums
✔︎  build/ios-swift/StyleDictionaryColor.swift
✔︎  build/ios-swift/StyleDictionarySize.swift

Good for you! You have now built your first Style Dictionary! Moving on, take a look at what we have built. This should have created a build directory and it should look like this:

config.json
tokens.json
script.js
(empty)
Directorybuild/
Directoryandroid/
font_dimens.xml
colors.xml
Directorycompose/
StyleDictionaryColor.kt
StyleDictionarySize.kt
Directoryscss/
_variables.scss
Directoryios/
StyleDictionaryColor.h
StyleDictionaryColor.m
StyleDictionarySize.h
StyleDictionarySize.m
Directoryios-swift/
StyleDictionary.swift
StyleDictionaryColor.swift
StyleDictionarySize.swift
If you open config.json you will see there are 5 platforms defined:

scss
android
compose
ios
ios-swift
Each platform has a transformGroup, buildPath, and files. The buildPath and files of the platform should match up to the files what were built. These files can be viewed in the live demo above by clicking the output dropdown button.

Pretty nifty! This shows a few things happening:

The build system does a deep merge of all the token JSON files defined in the source attribute of config.json. This allows you to split up the token JSON files however you want. There are 2 JSON files with color as the top level key, but they get merged properly.
The build system resolves references to other design tokens. {size.font.medium} gets resolved properly.
The build system handles references to token values in other files as well as you can see in tokens/color/font.json.
Now let’s make a change and see how that affects things. Open up tokens/color/base.json and change "#111111" to "#000000". After you make that change, save the file and re-run the build command style-dictionary build. Open up the build files and take a look.

Huzzah!

Now go forth and create! Take a look at all the built-in transforms and formats.

Tip

If you want to re-run Style Dictionary every time your tokens are changed, e.g. during local development, you can use a file-watcher like Chokidar to watch file changes and re-run Style Dictionary when needed. In our playground this is done automatically but in order to replicate that behavior locally, implement the filewatcher in your NPM build script:

Terminal window
chokidar \"tokens.json\" -c \"node build-tokens.mjs\"

Or if you don’t really need a wrapper build-tokens script and can use the Style Dictionary CLI directly:

Terminal window
chokidar \"tokens.json\" -c \"style-dictionary build\"


Splitting output files
Common questions are:

How do I prevent my global/primitive tokens from getting to the output?
How do I split and output my component tokens in their respective component folders?
This example will show how you can dynamically generate file outputs for each component, and filter out global/primitive tokens. The trick is to dynamically generate the files array, generate one for each output file you want, and use filters to ensure those outputs only contain the tokens that are relevant.


/components/button/button-vars.css
/components/button/button-vars.css
1234567891011121314151617181920212223
import { formats, transformGroups } from 'style-dictionary/enums';

const { cssVariables } = formats;

function generateComponentFiles(components) {
  return components.map((comp) => ({
    // output the component tokens in the right folder and file e.g. components/button/button-vars.css
    destination: `components/${comp}/${comp}-vars.css`,
    format: cssVariables,
    // only include the tokens that are inside this component token group

Note

You can click the download button to the top right of the interactive demo to download a ZIP file for this particular example. This contains a README.md telling you which commands to run to get this example running locally. You will need NodeJS and NPM installed, Node v18 minimum being required.

More information can be found on the filters documentation and files config.
