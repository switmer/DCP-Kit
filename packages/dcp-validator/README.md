# @dcp/validator

**Official validator for Design Context Protocol (DCP) registry items.**

Validates, lints, and auto-fixes DCP registry JSON files to ensure compatibility with the DCP standard.

[![npm version](https://badge.fury.io/js/@dcp/validator.svg)](https://badge.fury.io/js/@dcp/validator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 **Quick Start**

```bash
# Install globally
npm install -g @dcp/validator

# Validate a registry item
dcp-validator validate ./my-component.json

# Lint and auto-fix issues
dcp-validator lint ./my-component.json --fix --write

# Create a new template
dcp-validator init --type registry:ui --name button --output button.json
```

## 📋 **Commands**

### **validate**
Validate a DCP registry item against the official schema:

```bash
dcp-validator validate <file> [options]

Options:
  --strict          Enable strict validation mode
  --format <type>   Output format (json, text) [default: text]
```

**Example:**
```bash
dcp-validator validate ./components/button.json --strict
✅ button.json is valid

⚠️  Warnings:
  1. Consider adding semantic intent for better AI understanding

💡 Suggestions:
  1. Add "utils" to registryDependencies for className merging
```

### **lint**
Lint and suggest improvements for registry items:

```bash
dcp-validator lint <file> [options]

Options:
  --fix     Automatically fix common issues
  --write   Write fixes back to file
```

**Example:**
```bash
dcp-validator lint ./components/button.json --fix --write
✅ Fixed and saved button.json

💡 Suggestions:
  1. Add layoutHints to meta for better block understanding
  2. Consider semantic intent classification
```

### **init**
Create a new DCP registry item template:

```bash
dcp-validator init [options]

Options:
  --type <type>     Registry item type [default: registry:ui]
  --name <name>     Component name
  --output <file>   Output file path
```

**Example:**
```bash
dcp-validator init --type registry:block --name dashboard --output dashboard.json
✅ Created dashboard.json

📋 Next steps:
  1. Edit the template with your component details
  2. Add files, dependencies, and CSS variables
  3. Validate with: dcp-validator validate dashboard.json
```

## 🎯 **Validation Features**

### **Schema Compliance**
- Validates against official DCP Registry Schema v1.0
- Checks required fields, types, and formats
- Validates enum values and patterns

### **Smart Auto-Fixes**
- Converts names to kebab-case format
- Adds missing `$schema` references
- Infers file types from extensions
- Normalizes dependency arrays

### **AI-Ready Suggestions**
- Recommends semantic `intent` fields
- Suggests `layoutHints` for blocks
- Checks for missing `registryDependencies`
- Validates CSS variable formats

### **Extensibility Checks**
- Warns about missing descriptions
- Suggests metadata enhancements
- Checks file structure consistency
- Validates dependency completeness

## 📊 **Example Validation Output**

```bash
$ dcp-validator validate ./dashboard-block.json

✅ dashboard-block.json is valid

💡 Suggestions:
  1. Add semantic intent for better AI understanding
     Fix: Add meta.intent field (e.g., "data-visualization:dashboard")
  
  2. Consider adding confidence scoring
     Fix: Add meta.confidence field with extraction accuracy
  
  3. Enhance layoutHints metadata
     Fix: Add columns, responsive, hasSidebar properties
```

## 🧪 **Registry Item Types**

The validator supports all DCP registry types:

| Type | Description | Template Available |
|------|-------------|-------------------|
| `registry:ui` | Basic UI components | ✅ |
| `registry:component` | Complex components | ✅ |
| `registry:block` | Compound component blocks | ✅ |
| `registry:style` | Style definitions | ✅ |
| `registry:theme` | Theme configurations | ✅ |
| `registry:hook` | React hooks | ✅ |
| `registry:lib` | Utility libraries | ✅ |
| `registry:page` | Page templates | ✅ |

## 🔗 **Integration**

### **CI/CD Validation**
```yaml
# .github/workflows/validate-registry.yml
name: Validate DCP Registry
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install -g @dcp/validator
      - run: dcp-validator validate ./registry/**/*.json --strict
```

### **Package.json Scripts**
```json
{
  "scripts": {
    "validate-registry": "dcp-validator validate ./registry/**/*.json",
    "lint-registry": "dcp-validator lint ./registry/**/*.json --fix --write",
    "create-component": "dcp-validator init --type registry:ui"
  }
}
```

### **Pre-commit Hook**
```bash
#!/bin/sh
# .git/hooks/pre-commit
dcp-validator validate ./registry/**/*.json --strict
```

## 🏛️ **Protocol Compliance**

This validator ensures compliance with:
- **DCP Registry Schema v1.0** - Official JSON Schema definition
- **Semantic Standards** - AI-readable metadata formats  
- **ShadCN Compatibility** - Works with existing registry systems
- **Extensibility Rules** - Forward-compatible validation

## 🤝 **Contributing**

We welcome contributions! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### **Development Setup**
```bash
git clone https://github.com/design-context-protocol/dcp-toolkit
cd dcp-toolkit/packages/dcp-validator
npm install
npm run build
npm test
```

## 📄 **License**

MIT © [Design Context Protocol](https://dcp.dev)

---

**Part of the [Design Context Protocol](https://dcp.dev) ecosystem.**