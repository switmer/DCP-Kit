# Getting Started with DCP

**Design Component Protocol (DCP)** - Extract, browse, install, and query your design system components with AI assistance.

---

## 🚀 Quick Start (5 minutes)

### 1. Extract Your Components

```bash
# Navigate to your project
cd ~/my-design-system

# Extract components from source
npx dcp extract ./src/components --out ./registry

# ✅ Creates registry.json with all your components
```

### 2. Build Component Packs

```bash
# Build distributable component packages
npx dcp registry build-packs ./registry/registry.json \
  --out ./packs \
  --base-url http://localhost:7401 \
  --namespace ui

# ✅ Creates static packs ready to serve or publish
```

### 3. Browse Your Components

```bash
# Start the local registry server
npx dcp registry serve ./packs --port 7401

# ✅ Open http://localhost:7401 in your browser
```

**You now have a visual component browser!** 🎨

---

## 📖 Core Features

### 1️⃣ **Visual Component Browser**

**What it does:** Beautiful web UI to explore your design system

**How to use:**
```bash
# Start server
npx dcp registry serve ./packs --port 7401

# Open browser
open http://localhost:7401
```

**Features:**
- 🔍 **Search** - Find components by name
- 🏷️ **Filters** - Filter by namespace, type, category
- 📋 **Copy Install Commands** - One-click copy for npm/pnpm/yarn/bun
- 🎨 **Dark Theme** - Easy on the eyes
- 🔗 **Deep Links** - Share direct links to components

**Pro Tips:**
- Use `Cmd+K` to focus search
- Click any component card to see full details
- Switch package managers with the tabs (npm/pnpm/yarn/bun)

---

### 2️⃣ **AI-Powered Component Chat (MCP)**

**What it does:** Ask AI questions about your components, get instant answers

**Setup (One-Time):**

1. **For Claude Desktop:**

Create/edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dcp-registry": {
      "command": "node",
      "args": [
        "/absolute/path/to/DCP-Transformer/packages/dcp-toolkit/src/mcp-server.js"
      ]
    }
  }
}
```

2. **Restart Claude Desktop**

**How to use:**

Open Claude Desktop and ask:

```
"What components do I have in my design system?"

"Show me the Button component props"

"Which components use the primary-blue token?"

"Find all components with a 'variant' prop"

"Extract components from my new project at ~/my-app/src"
```

**Available Commands:**
- `dcp_query_tokens` - Search design tokens
- `dcp_get_component` - Get component details
- `dcp_validate_code` - Check if code follows design system
- `dcp_suggest_alternatives` - Get recommendations
- `dcp_extract_components` - Extract from source code
- `dcp_add_component` - Install components

**Pro Tips:**
- MCP auto-detects your registry (looks in `./registry`, `../registry`)
- You can work with multiple projects - just specify the path
- Ask for "variants" to see all available component styles

---

### 3️⃣ **Component Installation (Zero-Fetch)**

**What it does:** Install components from any DCP registry in one command

**How to use:**

```bash
# Install from HTTP registry
npx dcp registry add https://demo.dcp.dev/r/ui/button

# Install from local packs
npx dcp registry add ./packs/r/ui/card

# Install with options
npx dcp registry add https://registry.example.com/r/ui/input \
  --target ./src/components \
  --pm pnpm \
  --overwrite prompt
```

**Options:**
- `--target <dir>` - Where to install (auto-detects from `components.json`)
- `--pm <manager>` - Package manager (npm/pnpm/yarn/bun, auto-detects)
- `--overwrite <policy>` - How to handle conflicts (skip/prompt/force)
- `--dry-run` - Preview without installing
- `--token <token>` - For private registries

**Pro Tips:**
- Copy install commands from the Browse UI
- Use `--dry-run` to preview changes first
- Create `components.json` for auto-detection (ShadCN convention)

---

### 4️⃣ **Registry Publishing**

**What it does:** Publish your component packs to CDN/hosting

**How to use:**

```bash
# Publish to S3
npx dcp registry publish ./packs \
  --provider s3 \
  --bucket my-components \
  --region us-west-2

# Publish to GitHub Pages
npx dcp registry publish ./packs \
  --provider github-pages

# Publish to generic CDN
npx dcp registry publish ./packs \
  --provider generic \
  --base-url https://cdn.example.com/components
```

**Providers:**
- `s3` - Amazon S3
- `github-pages` - GitHub Pages
- `generic` - Any static hosting

**Pro Tips:**
- Use `--dry-run` to preview upload
- Set `--base-url` to your CDN URL
- Components are content-addressed (SHA1) for reliable caching

---

## 🎯 Common Workflows

### Workflow 1: "I want to browse my components visually"

```bash
# 1. Extract (if not done)
npx dcp extract ./src/components --out ./registry

# 2. Build packs
npx dcp registry build-packs ./registry/registry.json --out ./packs

# 3. Serve & browse
npx dcp registry serve ./packs --port 7401
open http://localhost:7401
```

---

### Workflow 2: "I want AI to help me find components"

```bash
# 1. Setup MCP (one-time, see above)

# 2. Open Claude Desktop and ask:
"What Button variants do I have?"
"Show me all components that use spacing tokens"
"Which components have a 'disabled' prop?"
```

---

### Workflow 3: "I want to install a component from a registry"

```bash
# From Browse UI: Click component → Copy install command

# Or manually:
npx dcp registry add https://registry.example.com/r/ui/button

# Check what would be installed:
npx dcp registry add https://registry.example.com/r/ui/button --dry-run
```

---

### Workflow 4: "I want to publish my design system"

```bash
# 1. Extract & build
npx dcp extract ./src/components --out ./registry
npx dcp registry build-packs ./registry/registry.json --out ./packs

# 2. Publish
npx dcp registry publish ./packs \
  --provider s3 \
  --bucket my-design-system \
  --base-url https://cdn.example.com

# 3. Share the URL
# Users can now install: npx dcp registry add https://cdn.example.com/r/ui/button
```

---

## 🔧 Advanced Features

### Custom Extraction

```bash
# Extract with custom adaptor
npx dcp extract ./src --adaptor vue-sfc

# Extract specific patterns
npx dcp extract ./src --include "**/*.component.tsx"

# Verbose output
npx dcp extract ./src --verbose
```

### Validation

```bash
# Validate registry structure
npx dcp registry validate ./registry/registry.json

# Strict validation
npx dcp registry validate ./registry/registry.json --strict

# Check token usage
npx dcp registry validate ./registry/registry.json --check-tokens
```

### Private Registries

```bash
# Serve with authentication
npx dcp registry serve ./packs --secret mytoken123

# Install with token
npx dcp registry add https://private.example.com/r/ui/button \
  --token mytoken123

# Or use environment variable
export DCP_REGISTRY_TOKEN=mytoken123
npx dcp registry add https://private.example.com/r/ui/button
```

---

## 📚 Learn More

- **[Browse UI Guide](./BROWSE_UI_GUIDE.md)** - Visual browser features
- **[MCP Setup Guide](./CLAUDE_DESKTOP_SETUP.md)** - AI integration
- **[Component Installation](./COMPONENT_INSTALLATION.md)** - Zero-fetch install
- **[Publishing Guide](./PUBLISHING_GUIDE.md)** - CDN deployment
- **[API Reference](./api/)** - Full API docs

---

## 🆘 Troubleshooting

### "Command not found: dcp"

```bash
# Use npx to run without installing
npx dcp extract ./src

# Or install globally
npm install -g @dcp/toolkit
```

### "Registry not found"

```bash
# MCP auto-detects in: ./registry, ../registry
# Explicitly specify path:
"Extract components from ~/my-project/registry"
```

### "Port 7401 already in use"

```bash
# Use a different port
npx dcp registry serve ./packs --port 8080
```

### "Failed to load component details"

```bash
# Rebuild packs to fix URLs
npx dcp registry build-packs ./registry/registry.json --out ./packs

# Restart server
pkill -f "dcp.*serve"
npx dcp registry serve ./packs --port 7401
```

---

## 💡 Tips & Best Practices

1. **Version your registry** - Commit `registry.json` to git
2. **Use semantic versioning** - `--version 2.1.0` when building packs
3. **Test locally first** - Use `serve` before `publish`
4. **Document your tokens** - Add descriptions to design tokens
5. **Use namespaces** - Organize components by namespace (ui, marketing, etc.)
6. **Enable verbose mode** - Use `--verbose` to debug issues
7. **Dry-run everything** - Use `--dry-run` to preview changes

---

## 🎉 Next Steps

1. ✅ Extract your components
2. ✅ Browse them visually
3. ✅ Set up AI chat (MCP)
4. ✅ Install components
5. ✅ Publish to CDN

**Welcome to the DCP ecosystem!** 🚀

Need help? [Open an issue](https://github.com/your-repo/issues) or ask in [Discussions](https://github.com/your-repo/discussions).

