# DCP - Design Component Protocol

> Keep your design system docs, code, and AI tools in sync — automatically.

---

## What do you want to do?

### 🎨 I want to browse our design system

**You are:** A designer, PM, or anyone who wants to see what components exist

**Time needed:** 0 minutes (no setup)

**Just visit your team's registry URL:**
```
https://your-company.github.io/design-system/browse
```

See all components, props, and variants in a visual gallery. No installation required.

[View Example Gallery →](https://demo.dcp.dev/browse)

---

### 🤖 I want AI to understand our design system

**You are:** A developer using Claude, Cursor, or ChatGPT

**Time needed:** 30 seconds

**Run one command from your project:**
```bash
npx dcp connect claude
```

Now Claude knows your components, props, and patterns. Try asking:
- "Add our button component"
- "What variants does our Card support?"
- "Show me an example of our error toast"

[MCP Setup Guide →](./guides/mcp-setup.md)

---

### 📦 I want to add components to my app

**You are:** A developer building a product

**Time needed:** 1 minute per component

**Install components like npm packages:**
```bash
# Add a single component
dcp add https://your-ds.com/r/ui/button

# Or install from your team's registry
dcp add button --registry https://your-ds.com
```

Files are added to your project. Modify them freely - you own the code.

[Installation Guide →](./guides/installation.md)

---

### 🏗️ I maintain our design system

**You are:** A design system engineer

**Time needed:** 5 minutes (one-time setup)

**Initialize DCP in your design system repo:**
```bash
npx dcp init
```

Answer a few questions, and DCP will:
- ✅ Extract your components into a registry
- ✅ Generate a visual gallery
- ✅ Set up automatic updates (via GitHub Action)
- ✅ Give you a URL to share with your team

[Maintainer Guide →](./guides/maintainer-setup.md)

---

## Why teams use DCP

### "Our docs were always out of sync"
> "With DCP, our component gallery updates automatically when we merge code. Designers finally trust the docs."
>
> **— Sarah, Design System Lead at Acme Corp**

### "AI kept hallucinating our API"
> "Claude used to make up prop names. Now it has direct access to our registry via MCP - no more guessing."
>
> **— Marcus, Engineering Manager at Beta Inc**

### "We stopped reinventing components"
> "Before DCP, devs didn't know what components existed. Now they can search, preview, and install in seconds."
>
> **— Lisa, Frontend Architect at Gamma Labs**

---

## How it works (the simple version)

```
┌─────────────────────────────────────────────┐
│ Your Design System Repo                      │
│                                              │
│ src/components/                              │
│ ├── Button.tsx                               │
│ ├── Card.tsx                                 │
│ └── Avatar.tsx                               │
└───────────────┬─────────────────────────────┘
                │
                │ npx dcp init
                ▼
┌─────────────────────────────────────────────┐
│ Component Registry                           │
│ (auto-generated, auto-updated)              │
│                                              │
│ - All your components                        │
│ - Props and types                            │
│ - Usage examples                             │
│ - Design tokens                              │
└───────────────┬─────────────────────────────┘
                │
                │ Published to URL
                ▼
┌─────────────────────────────────────────────┐
│ Everyone can access:                         │
│                                              │
│ 🎨 Designers → Visual gallery                │
│ 🤖 AI Tools → MCP server                     │
│ 👩‍💻 Developers → Install components           │
└─────────────────────────────────────────────┘
```

**The magic:** One command (`dcp init`) turns your codebase into a living, accessible design system.

---

## Frequently asked questions

### Do I need to publish to npm?

**Nope.** DCP components can be installed directly from a URL (like GitHub Pages or S3). No npm publishing required.

If you want to publish to npm, DCP can help with that too - but it's optional.

### Will this work with my existing design system?

**Yes.** DCP works with:
- React (TypeScript or JavaScript)
- Styled Components, Emotion, Tailwind, CSS Modules
- Storybook (optional - DCP replaces this)
- Any npm-based project

We're adding Vue, Svelte, and Angular support soon.

### What if I want to modify a component after installing?

**You own the code.** When you install a component, the source files are copied to your project. Modify them however you want - no lock-in.

### Can I use this for a private/internal design system?

**Absolutely.** Host your registry privately:
- GitHub Pages (private repo)
- S3 with auth
- Your own server
- Localhost (for development)

DCP supports authentication tokens for private registries.

### How much does it cost?

**DCP is free and open source.** MIT license.

We may offer paid hosting/analytics in the future, but the core toolkit will always be free.

---

## Get started in 5 minutes

**If you maintain a design system:**
```bash
npx dcp init
```

**If you want to use a design system:**
```bash
dcp add https://registry-url.com/r/ui/button
```

**If you want to connect AI:**
```bash
npx dcp connect claude
```

That's it. No complex config, no theory, just working software.

---

## Learn more

- [Full Documentation](./docs)
- [API Reference](./api)
- [GitHub Repository](https://github.com/your-org/dcp)
- [Example Registries](./examples)

**Questions?** [Join our Discord](https://discord.gg/dcp) or [open an issue](https://github.com/your-org/dcp/issues).

---

## The technical details (for the curious)

DCP is a **protocol** for design system intelligence. It defines:
- How components are extracted (via static analysis)
- How they're packaged (content-addressed blobs)
- How they're distributed (HTTP, MCP, npm)

Think of it like RSS for design systems - a standard format that tools can build on.

[Read the Technical Overview →](./docs/technical-overview.md)

