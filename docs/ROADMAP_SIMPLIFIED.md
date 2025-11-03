# DCP Roadmap: From Plumbing to Porcelain

**Goal:** Make DCP accessible to non-technical users while maintaining power-user features.

---

## The Persona-Driven Roadmap

### ✅ **v3.0.0 - "The Foundation"** (Current)

**Status:** In final testing (3 bugs fixed, awaiting validation)

**What shipped:**
- Multi-registry MCP server
- Zero-fetch component installer (`dcp-add` v2)
- Content-addressed blob storage
- Pack builder + HTTP registry server

**Who it serves:** Power users (engineers comfortable with CLI + config files)

**Accessibility score:** 2/10 (requires technical knowledge)

---

### 🎯 **v3.1.0 - "The Demo"** (2-3 weeks)

**Goal:** Non-technical people can SEE the value

**Must-have features:**

#### 1. HTTP Registry Browse UI
- **Visual component gallery** with thumbnails
- Click component → see props, variants, examples
- **Copy-paste code snippets**
- Search by name/tag/category
- **Zero install** - just a URL

**Accessibility unlock:** Designers/PMs can browse without engineering help

**Estimated effort:** 3-5 days
- Single HTML file (`browse.html`) served by `serve-registry`
- Reads `index.json` + component `meta.json`
- Inline CSS for styling (Tailwind CDN or similar)
- No build step required

#### 2. Improved Error Messages
- Convert schema errors to plain English
- Add "did you mean?" suggestions
- Show fix commands (not just error descriptions)

**Example:**
```bash
# Before
Error: Schema validation failed at /components/0/props

# After
❌ Button component is missing a required field

Expected: "props" should be an object with at least one property
Found: "props" is an empty object

Suggestion: Add props to your component or remove the empty props field

Learn more: https://dcp.dev/docs/component-props
```

**Estimated effort:** 2-3 days

**Who it serves:** Design system maintainers (medium-technical)

**Accessibility score:** 5/10

---

### 🚀 **v3.2.0 - "Zero Friction"** (4-6 weeks)

**Goal:** Anyone can set up a design system in < 5 minutes

**Must-have features:**

#### 1. `npx dcp init` - Interactive Setup Wizard

```bash
$ npx dcp init

┌────────────────────────────────────────────┐
│  Welcome to DCP - Design Component Protocol │
└────────────────────────────────────────────┘

Let's set up your design system in 3 steps:

Step 1/3: About your design system
? What's your design system called? acme-ui
? Where are your components? ./src/components
? Component file pattern? **/*.tsx

Step 2/3: Choose deployment
? Where should we publish your registry?
  ❯ GitHub Pages (free, public)
    Vercel (free, public)
    S3 (requires AWS credentials)
    Skip (I'll deploy manually)

Step 3/3: Optional features
? Set up AI integration? (Claude, Cursor) [Y/n] y
? Create GitHub Action for auto-updates? [Y/n] y
? Generate Storybook replacement? [Y/n] n

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Extracted 24 components
✓ Built 24 component packs
✓ Created GitHub Action (.github/workflows/dcp-update.yml)
✓ Connected Claude Desktop (restart Claude to see changes)
✓ Pushed to GitHub Pages

🎉 Your design system is live!

Browse:  https://acme.github.io/acme-ui/browse
Install: dcp add https://acme.github.io/acme-ui/r/ui/button
API:     https://acme.github.io/acme-ui/index.json

Share this URL with your team ⬆️
```

**Technical implementation:**
- Interactive prompts using `inquirer` or similar
- Detect framework (React, Vue, Svelte) automatically
- Generate config file (`dcp.config.json`)
- Run extraction → build → deploy pipeline
- Commit and push to gh-pages branch (if GitHub Pages selected)

**Estimated effort:** 4-5 days

#### 2. `npx dcp connect` - Auto-Configure AI Tools

```bash
$ npx dcp connect claude

✓ Found registry at ./registry
✓ Detected Claude Desktop installation
✓ Updated config: ~/.config/claude/claude_desktop_config.json
✓ Registered 24 components

🤖 Restart Claude Desktop to see your design system

Now Claude can:
• Browse your components
• Install components for you
• Validate code against your design system
• Suggest better alternatives

Try asking: "What components do we have?"
```

**Technical implementation:**
- Detect AI tool installations (Claude Desktop, Cursor, Copilot)
- Auto-update their config files
- Validate connections
- Cross-platform support (Mac, Windows, Linux)

**Estimated effort:** 2-3 days

**Who it serves:** Design system maintainers + developers

**Accessibility score:** 7/10

---

### 🎨 **v3.3.0 - "The Gallery"** (6-8 weeks)

**Goal:** Designers can preview and test components visually

**Must-have features:**

#### 1. Live Component Previews

**Enhancement to Browse UI:**
- Render actual components in sandboxed iframe
- Interactive prop editor (dropdowns for variants, toggles for booleans)
- Live updates as props change
- Copy generated code

**Example:**
```
Click "Button" → See live preview:

┌──────────────────────────────────────────┐
│ Button Component                          │
├──────────────────────────────────────────┤
│                                          │
│ Props:                                   │
│ variant: [primary ▼]  size: [md ▼]      │
│ disabled: [○] No  (●) Yes               │
│                                          │
│ Preview:                                 │
│ ┌─────────────┐                          │
│ │  Click Me   │  ← Actual rendered       │
│ └─────────────┘     component           │
│                                          │
│ Code:                                    │
│ <Button variant="primary" size="md"      │
│         disabled={true}>                 │
│   Click Me                               │
│ </Button>                                │
│                                          │
│ [Copy Code]  [Open in CodeSandbox]      │
└──────────────────────────────────────────┘
```

**Technical implementation:**
- Bundle component source into executable module
- Render in iframe with React runtime
- Use postMessage for prop updates
- Generate code from current prop state

**Estimated effort:** 5-7 days

#### 2. Component Screenshots

Auto-generate thumbnails for gallery view:
- Render each component variant
- Take screenshots using Playwright
- Store in `/screenshots/:component-:variant.png`
- Display in gallery grid

**Estimated effort:** 2-3 days

**Who it serves:** Designers, PMs, non-technical stakeholders

**Accessibility score:** 9/10 (visual, no-code)

---

### 🏢 **v3.4.0 - "Enterprise"** (8-12 weeks)

**Goal:** Companies can use DCP for private design systems at scale

**Must-have features:**

#### 1. Private Registry Support

- Authentication middleware for `serve-registry`
- Bearer token validation
- Team/organization permissions
- Usage analytics (who's installing what)

#### 2. Multi-Version Support

- Host multiple versions of same component
- Semantic versioning
- Upgrade paths + changelogs
- Deprecation warnings

#### 3. Admin Dashboard

- Web UI for managing registry
- View usage stats
- Approve/reject component submissions
- Moderate component library

**Who it serves:** Enterprise teams, design system platforms

**Accessibility score:** Varies by role (8/10 for admins, 9/10 for consumers)

---

## **The "Mom Test" Metrics**

Track these to measure simplification progress:

| Metric | v3.0 (Now) | v3.1 Target | v3.3 Target |
|--------|-----------|-------------|-------------|
| Time to first value (maintainer) | 30 min | 5 min | 2 min |
| Time to first value (designer) | N/A (can't use) | 0 min (URL only) | 0 min |
| Commands to setup | 5+ | 1 | 1 |
| Technical knowledge required | High | Medium | Low |
| Can designer use it? | No | Yes (browse) | Yes (interactive) |
| Can AI use it? | Yes (complex) | Yes (simple) | Yes (simple) |

---

## **Prioritization Framework**

When deciding what to build next, ask:

1. **Does it reduce time-to-first-value?**
   - If yes, prioritize high
   - If no, deprioritize

2. **Does it enable a new persona?**
   - Designers/PMs = high priority (opens market)
   - Developers = medium (already served)
   - AI tools = medium (nice-to-have)

3. **Is it a "wow" moment?**
   - Visual gallery = yes (people share screenshots)
   - Better error messages = no (invisible improvement)

4. **Can it be done in < 1 week?**
   - If yes, build it now
   - If no, break it down or defer

---

## **The North Star**

**Vision:** Anyone on a product team - designer, PM, engineer, or AI - can understand, browse, and use the design system without reading documentation.

**Measure of success:**
> "I sent my PM the registry URL. She found the component she needed, copied the props, and pasted them into a Jira ticket for the engineer. No Slack, no meetings, no friction."

That's the goal. Everything else is just plumbing to get there.

---

## **Immediate Next Steps (Post-v3.0.0)**

1. **Week 1-2:** Build Browse UI (basic gallery)
2. **Week 3:** Add `dcp init` wizard
3. **Week 4:** Polish error messages
4. **Week 5:** Ship v3.1.0
5. **Week 6:** Gather feedback, plan v3.2

Focus on **speed to value** - ship small, iterate fast, listen to users.

The technical foundation is solid (that's v3.0). Now build the interface.

