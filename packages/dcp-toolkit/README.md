# 🎯 Design Context Protocol (DCP)

**The first generative UI infrastructure for design systems.**

DCP automatically transforms any design system codebase into ShadCN-compatible registries with full theming intelligence, component composition analysis, and AI-ready metadata.

## Overview

This package provides a complete **implementation** of the Design Component Protocol:

- 🛠️ **CLI Tools** - Extract, mutate, validate, and serve DCP registries
- 🌐 **API Server** - HTTP API for DCP operations  
- 🔌 **MCP Server** - Model Context Protocol integration
- 📦 **Integrations** - VS Code extension, Figma plugin, Chrome extension

## Installation

```bash
npm install -g @dcp/toolkit
```

## Quick Start

### Extract Components

```bash
dcp extract ./src/components --out ./registry
```

### Start API Server

```bash
dcp-api --port 3000
```

### MCP Integration

```bash
dcp-mcp --stdio
```

## CLI Commands

- `dcp extract <path>` - Extract components from source code
- `dcp mutate <registry> <patch>` - Apply JSON Patch mutations  
- `dcp validate <registry>` - Validate registry against DCP schema
- `dcp serve <registry>` - Start development server
- `dcp query <registry>` - Search and filter components

## API Usage

Start the HTTP API server:

```bash
dcp-api --port 3000 --cors
```

The server exposes endpoints defined in the DCP OpenAPI specification:

- `POST /extract` - Extract components from uploaded source
- `POST /mutate` - Apply mutations to registry
- `POST /validate` - Validate registry data  
- `GET /query` - Query registry contents

## Programmatic Usage

```javascript
import { extractComponents, mutateRegistry } from '@dcp/toolkit';

// Extract components
const result = await extractComponents('./src/components');

// Apply mutations
const patched = await mutateRegistry(registry, patches);
```

## Configuration

Create a `dcp.config.json` file:

```json
{
  "include": ["src/**/*.{tsx,jsx}"],
  "exclude": ["**/*.test.*", "**/*.stories.*"],
  "adaptors": ["react-tsx"],
  "tokens": {
    "extractCssVariables": true,
    "extractTailwindClasses": true
  }
}
```

## Integrations

### VS Code Extension

Install the DCP VS Code extension for:
- Component IntelliSense
- Schema validation
- Live registry updates

### Figma Plugin

Connect Figma designs to your component registry:
- Token synchronization
- Component validation
- Design-to-code workflows

### Chrome Extension

Browser extension for:
- Component extraction from live sites  
- Design system analysis
- Token detection

## Dependencies

This toolkit depends on `@dcp/spec` for schema definitions and API contracts.

## Contributing

For specification changes, see the `@dcp/spec` package.

For implementation improvements:

1. Fork this repository
2. Create a feature branch
3. Submit a pull request

## Versioning

- **Major** - Breaking CLI changes, API changes
- **Minor** - New features, commands, integrations
- **Patch** - Bug fixes, performance improvements

Current version: **2.0.0**