# 🎯 Design Context Protocol (DCP)

> **Transform any design system into a registry automatically** - Extract, validate, and distribute components with full AI compatibility.

[![npm version](https://badge.fury.io/js/%40dcp%2Ftoolkit.svg)](https://www.npmjs.com/package/@dcp/toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Protocol Version](https://img.shields.io/badge/DCP-v1.0.0-blue.svg)](https://dcp.dev/spec)

DCP is the **universal protocol for design system interoperability**. It enables automatic extraction of components, blocks, and themes from any codebase into a standardized registry format compatible with ShadCN, Storybook, Figma, and AI agents.

## ✨ What Makes DCP Different

- **🔍 Universal Extraction**: Works with React, Vue, Angular, and any component-based framework
- **🧠 AI-Ready**: Structured metadata enables intelligent component understanding and generation
- **🔄 Multi-Format Output**: Generate ShadCN registries, Storybook stories, Figma tokens, and more
- **⚡ Zero Configuration**: Intelligent detection with sensible defaults, extensible configuration
- **🎨 Token-Aware**: Extract and transform design tokens alongside components
- **📦 Registry-First**: Protocol-grade specifications for ecosystem adoption

## 🚀 Quick Start

```bash
# Extract components from any codebase
npx @dcp/toolkit extract ./src --output registry.json

# Validate registry files
npx @dcp/toolkit validate registry.json

# Transform to ShadCN format
npx @dcp/toolkit transform registry.json shadcn.json --format shadcn
```

### Real-World Example

```bash
# Extract from a React codebase
npx @dcp/toolkit extract ./src/components

# This generates:
# ├── registry/
# │   ├── components/ui/button.json     # Button component
# │   ├── components/blocks/form.json   # Form compound component  
# │   ├── themes/brand.json             # Design tokens
# │   └── metadata.json                 # Registry metadata
```

## 📋 What DCP Extracts

### 🧩 **Components**
- Props, variants, and composition patterns
- TypeScript interfaces and JSDoc comments
- CSS classes and styling patterns
- Accessibility attributes and patterns

### 🎨 **Design Tokens**
- CSS custom properties and variables
- Tailwind utility classes and config
- Theme definitions and color schemes
- Typography, spacing, and sizing scales

### 🏗️ **Compound Blocks**
- Multi-component patterns (forms, cards, layouts)
- Layout hints and responsive behavior
- Interaction patterns and state management
- Usage examples and documentation

## 🔧 Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `extract` | Extract components from source code | `npx @dcp/toolkit extract ./src` |
| `validate` | Validate registry against DCP schema | `npx @dcp/toolkit validate registry.json` |
| `transform` | Convert between registry formats | `npx @dcp/toolkit transform registry.json --format shadcn` |
| `build` | Build registries from config files | `npx @dcp/toolkit build --config dcp.config.json` |

## 🔌 Integrations

### ShadCN UI
```bash
# Convert DCP registry to ShadCN format
npx @dcp/toolkit transform registry.json ui.json --format shadcn

# Install components
npx shadcn-ui add ui.json
```

### Storybook
```bash
# Generate stories from registry
npx @dcp/toolkit transform registry.json stories/ --format storybook
```

### Figma
```bash
# Export design tokens for Figma
npx @dcp/toolkit transform registry.json tokens.json --format figma
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

## 🎯 Real Design Systems Tested

DCP works with production design systems:

- **🚗 Uber Base Web** - Complex React components with theming
- **🏢 Microsoft Fluent UI** - Large-scale enterprise components
- **⚡ ShadCN UI** - Modern utility-first components
- **🎨 Custom Systems** - Any component-based architecture

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

## 🧠 AI & LLM Integration

DCP registries include AI-optimized metadata:

```json
{
  "meta": {
    "intent": "form-input:email",
    "useCases": ["user registration", "contact forms"],
    "layoutHints": {
      "responsive": true,
      "hasValidation": true
    },
    "confidence": 0.92
  }
}
```

This enables AI agents to:
- Understand component purpose and context
- Generate appropriate usage examples
- Suggest relevant components for specific use cases
- Maintain design system consistency

## 🔬 Advanced Features

### Configuration File
```json
{
  "version": "1.0",
  "sources": [
    {
      "path": "./src/components", 
      "adaptor": "react-tsx",
      "includeTokens": true
    }
  ],
  "output": {
    "format": "dcp",
    "inlineContent": true,
    "targetPaths": {
      "*.stories.tsx": "stories/"
    }
  }
}
```

### Plugin System
```typescript
import { DCPExtractor } from '@dcp/toolkit';

const extractor = new DCPExtractor({
  plugins: [
    '@dcp/plugin-tailwind',
    '@dcp/plugin-emotion'
  ]
});
```

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

## 🤝 Ecosystem

### Protocol Adopters
- **Moio** - AI-powered component generation
- **V0** - Vercel's AI interface builder  
- **Storybook** - Component documentation
- **ShadCN** - Component registry standard

### Community
- [Protocol Specification](https://dcp.dev/spec)
- [API Documentation](https://dcp.dev/docs)
- [Contributing Guide](./CONTRIBUTING.md)
- [Discord Community](https://discord.gg/dcp)

## 📈 Roadmap

- [ ] **Vue.js Adaptor** - Vue component extraction
- [ ] **Angular Adaptor** - Angular component support
- [ ] **Design Token Studio** - Enhanced token management
- [ ] **Component Playground** - Interactive component testing
- [ ] **Registry Federation** - Multi-registry composition

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

<div align="center">

**[Protocol Spec](https://dcp.dev/spec)** • **[Documentation](https://dcp.dev/docs)** • **[Examples](./docs/examples/)** • **[Contributing](./CONTRIBUTING.md)**

Made with ❤️ for the design systems community

</div>