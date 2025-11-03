# 🎯 Design Context Protocol (DCP)

> **Transform React design systems into AI-ready registries** - Extract, validate, and distribute components with full AI compatibility.

[![npm version](https://badge.fury.io/js/%40dcp%2Ftoolkit.svg)](https://www.npmjs.com/package/@dcp/toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Protocol Version](https://img.shields.io/badge/DCP-v2.0.1-blue.svg)](https://dcp.dev/spec)

DCP is the **universal protocol for design system interoperability**. Currently production-ready for **React/TypeScript** codebases, with support for other frameworks coming soon.

**🎯 [What's Ready →](./docs/WHATS_READY.md)** | **🚧 [What's Coming →](./docs/WHATS_COMING.md)**

## ✨ Production-Ready Features

- **✅ React/TypeScript Extraction**: Enterprise-grade component extraction with hybrid Babel + TypeScript analysis
- **✅ Multi-Source Token Extraction**: CSS variables, Tailwind, Radix UI, CSS Modules
- **✅ Registry Generation**: DCP schema-compliant registries with ShadCN compatibility
- **✅ MCP Integration**: Full Model Context Protocol server for AI agent integration (Claude Desktop, ChatGPT)
- **✅ Component Packs**: Self-contained, distributable packages with zero-fetch installation
- **✅ CLI Toolkit**: 30+ commands for extraction, validation, mutation, and distribution
- **✅ REST API**: Express-based API server with OpenAPI specification
- **✅ Watch Mode**: Hot reload with WebSocket support for live updates

## 🚀 Quick Start (React/TypeScript)

```bash
# Install DCP Toolkit
npm install -g @dcp/toolkit

# Extract components from React codebase
dcp extract ./src/components --out ./registry

# Validate the registry
dcp validate-registry ./registry/registry.json

# Start API server
dcp api --port 3000 --registry ./registry

# Export for AI agents (MCP format)
dcp export-mcp ./registry/registry.json --optimize-for claude
```

### Real-World Example

```bash
# Extract from a React/TypeScript codebase
dcp extract ./src/components --auto-detect-tokens --out ./registry

# This generates:
# ├── registry/
# │   ├── components/
# │   │   ├── Button.dcp.json          # Button component
# │   │   ├── Card.dcp.json            # Card component
# │   │   └── ...
# │   ├── tokens/
# │   │   ├── colors.json              # Color tokens
# │   │   ├── spacing.json             # Spacing tokens
# │   │   └── ...
# │   └── registry.json                 # Main registry file
```

**📖 Documentation:**
- **[Getting Started Guide](./docs/GETTING_STARTED.md)** - Complete tutorial with workflows
- **[Quick Reference](./docs/QUICK_REFERENCE.md)** - One-page cheat sheet
- **[What's Ready](./docs/WHATS_READY.md)** - Production features
- **[What's Coming](./docs/WHATS_COMING.md)** - Roadmap

## 🎨 Browse UI - Visual Component Discovery

**NEW in v3.1.0**: Production-ready component browser with search, filters, and AI integration.

```bash
# Build packs with Browse UI
dcp registry build-packs ./registry/registry.json --out ./dist/packs

# Serve with visual browser
dcp registry serve ./dist/packs --port 7401

# Open http://localhost:7401 in your browser
```

### Features

- **Visual Component Grid** - Browse all components with descriptions and metadata
- **Smart Search** - Find components by name, description, or props
- **Facet Filters** - Filter by namespace, type, or category
- **Copy Install Commands** - One-click copy for npm, pnpm, yarn, or bun
- **Shareable Links** - Deep link to specific components (`#ui/button`)
- **AI Prompts** - Copy-ready prompts for AI tools (Claude, ChatGPT)
- **Staleness Indicator** - See when registry was last updated
- **Dark Theme** - Beautiful, accessible UI with keyboard navigation
- **Mobile Responsive** - Works on all devices

### For Different Personas

**Designers**: Find components in seconds, share links in Figma comments  
**PMs**: Copy shareable links for Slack/Jira, see freshness indicators  
**Engineers**: Copy exact install commands for your package manager  
**AI Users**: Bridge to AI tools without learning MCP

## 📦 Component Installation (Like ShadCN, But Better)

DCP evolves ShadCN's pioneering "copy, don't install" pattern with enterprise features:

```bash
# Install from any registry (zero-fetch, single HTTP request)
dcp registry add "https://demo.dcp.dev/r/ui/button"

# Install specific version
dcp registry add "http://localhost:7401/r/ui/card@2.1.0"

# Install from local packs (no network needed)
dcp registry add "./dist/packs/r/ui/avatar"

# Install from private registry with auth
dcp registry add "https://internal.company.com/r/ui/button" --token secret
```

### Full Workflow: Extract → Build → Browse → Install

```bash
# 1. Extract your design system
dcp extract ./src/components --out ./registry

# 2. Build distributable packs (includes Browse UI)
dcp registry build-packs ./registry/registry.json --out ./dist/packs

# 3. Serve with visual browser
dcp registry serve ./dist/packs --port 7401

# 4. Browse at http://localhost:7401 or install directly
dcp registry add "http://localhost:7401/r/ui/button" --verbose
```

**🆚 [ShadCN vs DCP Comparison →](./docs/SHADCN_VS_DCP.md)** - See how DCP builds on ShadCN's foundation

**📦 [Component Packs Guide →](./docs/COMPONENT_PACKS.md)** - Full distribution & installation docs

## 📋 What DCP Extracts (Production Ready)

### 🧩 **React Components** ✅
- Props with full TypeScript type information
- Variants (CVA support, object literals)
- Composition patterns (slots, subcomponents)
- JSDoc comments and descriptions
- Component families (Dialog → DialogHeader, etc.)
- Barrel file recursion (follows re-exports)

### 🎨 **Design Tokens** ✅
- CSS custom properties (`--variable-name`)
- Tailwind CSS classes → tokens (JSON configs)
- CSS Modules (co-located `.css` files)
- Radix UI tokens (JSON format)
- Multi-source token merging and normalization

### 🏗️ **Registry Metadata** ✅
- Component confidence scores
- Source tracking (AST analysis, TypeScript)
- Token usage mapping
- Theme context awareness
- Extraction timestamps

## 🔧 Core Commands (Production Ready)

| Command | Description | Status | Example |
|---------|-------------|--------|---------|
| `extract` | Extract components from source | ✅ Ready | `dcp extract ./src --out ./registry` |
| `validate` | Validate registry/project | ✅ Ready | `dcp validate-registry registry.json` |
| `build` | Build registry from config | ✅ Ready | `dcp build --config dcp.config.json` |
| `query` | Query registry with selectors | ✅ Ready | `dcp query "components where name = 'Button'"` |
| `mutate` | Apply JSON Patch mutations | ✅ Ready | `dcp mutate registry.json patch.json output.json` |
| `watch` | Watch mode with hot reload | ✅ Ready | `dcp watch ./src --ws 7070` |
| `api` | Start REST API server | ✅ Ready | `dcp api --port 3000` |
| `export-mcp` | Export for AI agents | ✅ Ready | `dcp export-mcp registry.json --optimize-for claude` |

## 🔌 Integrations (Production Ready)

### AI Agents (MCP Protocol) ✅
```bash
# Start MCP server for Claude Desktop
dcp-mcp --stdio

# Or HTTP mode for remote clients
dcp-mcp-http --port 3000

# Export registry for AI consumption
dcp export-mcp registry.json --optimize-for claude
```

### ShadCN UI ✅
```bash
# Generate ShadCN-compatible registry
dcp registry generate ./src/components --format shadcn --out ./shadcn-registry
```

### Storybook ✅
```bash
# Install Storybook addon
npm install --save-dev @dcp/storybook-addon-registry

# Start watch mode with WebSocket
dcp watch ./src --ws 7070

# Add to Storybook config - see docs for details
```

### REST API ✅
```bash
# Start API server
dcp api --port 3000 --registry ./registry

# Access endpoints
curl http://localhost:3000/api/v1/registry
curl http://localhost:3000/docs  # Swagger UI
```

## 🏗️ Repository Structure

```
DCP-Transformer/
├── packages/
│   ├── dcp-toolkit/           # Main CLI and extraction engine
│   ├── dcp-validator/         # Registry validation tools
│   └── storybook-addon-registry/ # Storybook integration
├── registry/                  # Canonical DCP registry
│   ├── components/ui/         # Individual UI components
│   ├── components/blocks/     # Compound components
│   ├── themes/               # Design token definitions
│   └── manifest.json         # Registry manifest
├── tests/
│   ├── fixtures/             # Test design systems
│   │   ├── baseweb/         # Uber's Base Web
│   │   ├── fluentui/        # Microsoft Fluent UI
│   │   └── shadcn/          # ShadCN UI examples
│   └── snapshots/           # Test output snapshots
└── docs/                    # Protocol documentation
```

## 🎯 Production Tested

DCP has been tested with real production design systems:

- **🚗 Uber Base Web** - Complex React components with theming ✅
- **🏢 Microsoft Fluent UI** - Large-scale enterprise components ✅
- **⚡ ShadCN UI** - Modern utility-first components ✅
- **🎨 Custom Systems** - React/TypeScript component libraries ✅

**Performance:** Successfully extracted 121+ components, handles 1000+ line components, processes deep barrel files (10+ levels)

## 📊 Protocol Specifications

### Registry Schema
```json
{
  "$schema": "https://dcp.dev/schemas/registry.schema.json",
  "name": "my-component",
  "type": "registry:ui",
  "title": "My Component",
  "description": "A reusable UI component",
  "files": [
    {
      "path": "components/ui/my-component.tsx",
      "type": "registry:component",
      "content": "/* inline content for zero-fetch installs */"
    }
  ],
  "cssVars": {
    "light": { "background": "hsl(0 0% 100%)" },
    "dark": { "background": "hsl(222.2 84% 4.9%)" }
  },
  "meta": {
    "confidence": 0.95,
    "source": "ast-analysis"
  }
}
```

### Supported Types
- `registry:ui` - Individual UI components
- `registry:block` - Compound components and layouts
- `registry:theme` - Design token collections
- `registry:hook` - React hooks and utilities
- `registry:style` - CSS and styling files

## 🧠 AI & LLM Integration (Production Ready)

DCP provides full **Model Context Protocol (MCP)** integration for AI agents:

**Available Now:**
- ✅ MCP Server (stdio + HTTP modes)
- ✅ Component/token query tools
- ✅ Registry resource access
- ✅ Hot reload support
- ✅ Claude Desktop integration
- ✅ ChatGPT/remote MCP support

**MCP Tools Available:**
- `query_registry` - Query components and tokens
- `get_component` - Get component details
- `get_token` - Get token details
- `validate_registry` - Validate registry structure
- `extract_components` - Extract from source

**See:** [MCP Integration Guide](./docs/api/mcp-integration.md)

## 📚 Documentation

- **[What's Ready](./docs/WHATS_READY.md)** - Production-ready features with examples
- **[What's Coming](./docs/WHATS_COMING.md)** - Roadmap and incomplete features
- **[ShadCN vs DCP](./docs/SHADCN_VS_DCP.md)** - How DCP evolves ShadCN's patterns
- **[Component Packs](./docs/COMPONENT_PACKS.md)** - Distribution & installation guide
- **[API Quickstart](./docs/API_QUICKSTART.md)** - API usage guide
- **[Extraction Capabilities](./docs/EXTRACTION_CAPABILITIES.md)** - Detailed extraction guide
- **[MCP Integration](./docs/api/mcp-integration.md)** - AI agent integration
- **[Claude Desktop Setup](./packages/dcp-toolkit/docs/CLAUDE_DESKTOP_SETUP.md)** - MCP server configuration

## 🚧 Development

```bash
# Clone repository
git clone https://github.com/stevewitmer/dcp-transformer
cd dcp-transformer

# Install dependencies
npm install

# Run tests
npm test

# Build packages
npm run build
```

## 🎯 Positioning

**Primary Position:** "The OpenAPI for Design Systems"
- Protocol-first approach with standardized schemas
- Ecosystem compatibility (ShadCN, Storybook, AI agents)
- Enterprise-ready validation and safety features

**Key Differentiators:**
- ✅ **Extracts ANY React library** (not just a component library)
- ✅ **AI-ready metadata** via MCP protocol
- ✅ **Zero-fetch installation** for component distribution
- ✅ **Production-tested** with real design systems

**Perfect For:**
- Design system maintainers (React/TypeScript)
- AI/LLM integration teams
- Component library authors
- Design tooling companies

## 🤝 Community

- **GitHub**: [stevewitmer/dcp-transformer](https://github.com/stevewitmer/dcp-transformer)
- **Issues**: [Report bugs or request features](https://github.com/stevewitmer/dcp-transformer/issues)
- **Discussions**: [Join the conversation](https://github.com/stevewitmer/dcp-transformer/discussions)

## 🚧 Coming Soon

**Currently in development or planned:**

- ⚠️ **Vue.js Adaptor** - Vue SFC template parsing (Q3 2025)
- ⚠️ **Svelte Adaptor** - Svelte component extraction (Q3 2025)
- ⚠️ **CSS-in-JS Full Extraction** - styled-components, emotion (Q2 2025)
- ⚠️ **Agent Mode LLM Integration** - OpenAI/Claude API (Q2 2025)
- ⚠️ **Visual Diff/Preview** - Screenshot comparison (Q3 2025)
- ⚠️ **Registry Federation** - Multi-registry composition (Q4 2025)

**See:** [What's Coming →](./docs/WHATS_COMING.md) for detailed roadmap and timelines

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

<div align="center">

**[Protocol Spec](https://dcp.dev/spec)** • **[Documentation](https://dcp.dev/docs)** • **[Examples](./docs/examples/)** • **[Contributing](./CONTRIBUTING.md)**

Made with ❤️ for the design systems community

</div>