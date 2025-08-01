# 🚀 NPM Publishing Checklist for DCP

## ✅ **Pre-Publishing Verification**

### 1. **Package Structure Check**
- [x] Proper `bin` field with shebang in CLI files
- [x] Scoped package names (`@dcp/spec`, `@dcp/toolkit`)
- [x] Homepage, repository, and bugs URLs
- [x] Comprehensive keywords for discoverability
- [x] Files field includes all necessary assets

### 2. **Dependency Resolution**
- [x] `@dcp/spec` dependency uses semantic version `^1.0.0` (not local file reference)
- [x] All dependencies have proper version ranges
- [x] No dev dependencies in production bundle

### 3. **CLI Functionality**
- [x] All CLI commands have proper shebangs (`#!/usr/bin/env node`)
- [x] ESM imports work correctly with `.js` extensions
- [x] Commands provide helpful error messages and `--help` text

## 📦 **Publishing Steps**

### Step 1: Publish the Spec Package First
```bash
cd packages/dcp-spec
npm run test                    # Validate schemas
npm publish --access public    # Publish to npm
```

### Step 2: Publish the Toolkit Package
```bash
cd packages/dcp-toolkit
npm run test                    # Run test suite
npm run build                   # Build if needed
npm publish --access public    # Publish to npm
```

### Step 3: Test Published Packages
```bash
# Test the published CLI
npx @dcp/toolkit --help
npx @dcp/toolkit extract --help
npx @dcp/toolkit validate --help

# Test in a clean directory
mkdir test-dcp-install
cd test-dcp-install
npx @dcp/toolkit extract ./src --json > registry.json
npx @dcp/toolkit validate registry.json
```

## 🧪 **Post-Publishing Verification**

### 1. **Basic CLI Commands**
```bash
npx @dcp/toolkit --help                          # Show main help
npx @dcp/toolkit extract ./src --json            # Extract components
npx @dcp/toolkit validate registry.json          # Validate registry
npx @dcp/toolkit transform registry.json --format shadcn  # Transform format
```

### 2. **Advanced Features**
```bash
npx @dcp/toolkit registry generate ./components  # Generate ShadCN registry
npx @dcp/toolkit build --config dcp.config.json # Build from config
npx @dcp/toolkit export-mcp registry.json        # Export for AI
npx @dcp/toolkit api                             # Start API server
```

### 3. **Integration Examples**
```bash
# ShadCN compatibility
npx @dcp/toolkit transform registry.json ui.json --format shadcn
npx shadcn-ui add ui.json

# Storybook integration
npx @dcp/toolkit transform registry.json stories/ --format storybook

# Figma tokens
npx @dcp/toolkit transform registry.json tokens.json --format figma
```

## 🎯 **Expected Usage Patterns**

### **One-Time Extraction**
```bash
# Quick component extraction
npx @dcp/toolkit extract ./src/components --output my-registry.json
```

### **Project Setup**
```bash
# Install locally for ongoing development
npm install --save-dev @dcp/toolkit

# Use in scripts
{
  "scripts": {
    "extract": "dcp extract ./src --output ./dist/registry.json",
    "validate": "dcp validate ./dist/registry.json"
  }
}
```

### **CI/CD Integration**
```bash
# GitHub Actions
- name: Extract and validate design system
  run: |
    npx @dcp/toolkit extract ./src --output registry.json
    npx @dcp/toolkit validate registry.json --strict
```

## 🔍 **Common Issues & Solutions**

### **Issue: Command not found**
```bash
# Solution: Check global PATH or use full npx
npx @dcp/toolkit extract ./src
```

### **Issue: Module resolution errors**
```bash
# Solution: Ensure Node.js >= 16 and clean npm cache
node --version  # Should be >= 16
npm cache clean --force
```

### **Issue: Permission errors**
```bash
# Solution: Use --access public for scoped packages
npm publish --access public
```

## 📈 **Success Metrics**

After publishing, monitor:
- [ ] npm download statistics
- [ ] GitHub repository stars/forks
- [ ] Issue reports for CLI functionality
- [ ] Community adoption (registry examples)

## 🚀 **Ready for Launch!**

✅ **DCP is now `npx`-ready with:**
- Multiple CLI commands available instantly
- Protocol-grade documentation and examples
- Real-world design system compatibility
- AI/LLM integration support
- Comprehensive validation and transformation tools

**Launch command:**
```bash
npx @dcp/toolkit extract ./src --json
```

**🎯 The rocket is polished and ready for ecosystem adoption!**