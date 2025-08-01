# 🛠 DCP CLI

The Design Context Protocol Command Line Interface - Transform any design system into a registry automatically.

## Quick Start

```bash
# Extract components from a codebase
npx dcp extract ./src --output registry.json

# Validate a registry file
npx dcp validate registry.json

# Generate a registry from multiple sources
npx dcp build --config dcp.config.json
```

## Installation

```bash
# Global installation
npm install -g @dcp/toolkit

# Project-specific
npm install --save-dev @dcp/toolkit
```

## Core Commands

### `extract` - Component Discovery & Analysis

Extract design system components from source code into DCP format.

```bash
npx dcp extract <source-path> [options]

# Examples
npx dcp extract ./src/components
npx dcp extract ./src --adaptor react-tsx
npx dcp extract ./components --output my-registry.json
npx dcp extract ./src --include-tokens --include-stories
```

**Options:**
- `--output, -o <file>` - Output file path (default: `registry.json`)
- `--adaptor <name>` - Source adaptor: `react-tsx`, `vue`, `angular` (default: auto-detect)
- `--include-tokens` - Extract design tokens from CSS/theme files
- `--include-stories` - Include Storybook stories as examples
- `--config <file>` - Use configuration file

### `validate` - Registry Validation

Validate registry files against the DCP schema.

```bash
npx dcp validate <registry-file> [options]

# Examples
npx dcp validate registry.json
npx dcp validate registry.json --strict
npx dcp validate registry.json --fix
```

**Options:**
- `--strict` - Enable strict validation mode
- `--fix` - Auto-fix common issues
- `--schema <url>` - Custom schema URL

### `build` - Multi-Source Registry Building

Build comprehensive registries from multiple sources and configurations.

```bash
npx dcp build [options]

# Examples
npx dcp build --config dcp.config.json
npx dcp build --watch --dev
```

**Options:**
- `--config <file>` - Configuration file (default: `dcp.config.json`)
- `--watch` - Watch for changes and rebuild
- `--dev` - Development mode with verbose logging

### `transform` - Format Conversion

Convert registries between different formats.

```bash
npx dcp transform <input> <output> --format <target>

# Examples
npx dcp transform registry.json shadcn-ui.json --format shadcn
npx dcp transform tokens.json css-vars.css --format css
```

**Supported Formats:**
- `shadcn` - ShadCN UI registry format
- `storybook` - Storybook story format
- `figma` - Figma tokens format
- `css` - CSS custom properties

## Configuration

Create a `dcp.config.json` file in your project root:

```json
{
  "version": "1.0",
  "sources": [
    {
      "path": "./src/components",
      "adaptor": "react-tsx",
      "include": ["*.tsx", "*.ts"],
      "exclude": ["*.test.*", "*.stories.*"]
    }
  ],
  "output": {
    "path": "./registry",
    "format": "dcp",
    "includeTokens": true,
    "includeExamples": true
  },
  "adaptors": {
    "react-tsx": {
      "tsConfigPath": "./tsconfig.json",
      "extractProps": true,
      "extractVariants": true
    }
  }
}
```

## Integration Examples

### With ShadCN UI

```bash
# Convert DCP registry to ShadCN format
npx dcp transform registry.json ui-registry.json --format shadcn

# Add to components.json
npx shadcn-ui add ui-registry.json
```

### With Storybook

```bash
# Extract stories as examples
npx dcp extract ./src --include-stories

# Generate story files
npx dcp transform registry.json stories/ --format storybook
```

### With Figma

```bash
# Export design tokens for Figma
npx dcp transform registry.json tokens.json --format figma
```

## Advanced Usage

### Custom Adaptors

Create custom adaptors for unsupported frameworks:

```typescript
// my-adaptor.ts
import { BaseAdaptor } from '@dcp/toolkit/adaptors';

export class MyAdaptor extends BaseAdaptor {
  async extractComponent(filePath: string) {
    // Custom extraction logic
  }
}
```

### Plugin System

Extend DCP with custom plugins:

```json
{
  "plugins": [
    "@dcp/plugin-tailwind",
    "@dcp/plugin-emotion",
    "./my-custom-plugin.js"
  ]
}
```

## Troubleshooting

### Common Issues

**TypeScript parsing errors:**
```bash
npx dcp extract ./src --ts-config ./tsconfig.json
```

**Missing dependencies:**
```bash
npm install typescript @types/react
```

**Large codebases:**
```bash
npx dcp extract ./src --max-files 1000 --timeout 30000
```

### Debug Mode

```bash
npx dcp extract ./src --verbose --log-level debug
```

## API Reference

For programmatic usage, see the [API Documentation](./docs/api/).

```typescript
import { DCPExtractor } from '@dcp/toolkit';

const extractor = new DCPExtractor({
  adaptor: 'react-tsx',
  includeTokens: true
});

const registry = await extractor.extract('./src/components');
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT - see [LICENSE](../../LICENSE) for details.