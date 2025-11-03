# DCP v3.0.4 Release Notes

**Release Date:** November 3, 2025  
**Status:** ✅ Production Ready

---

## 🎉 What's New

### 📚 **Comprehensive Documentation**

We've added complete user guides to make DCP easy to use for everyone:

- **[Getting Started Guide](./docs/GETTING_STARTED.md)** - Full tutorial covering all features
  - Visual Component Browser walkthrough
  - AI-Powered Chat (MCP) setup
  - Component Installation guide
  - Registry Publishing tutorial
  - Common workflows and troubleshooting

- **[Quick Reference](./docs/QUICK_REFERENCE.md)** - One-page cheat sheet
  - Essential commands
  - Keyboard shortcuts
  - Common flags
  - File structure
  - Troubleshooting table

### 🐛 **Critical Bug Fix**

Fixed build-packs crash that prevented component pack generation:
- **Issue**: `props.map is not a function` error
- **Cause**: Component props stored as objects, not arrays
- **Impact**: All 137 components failed to build
- **Fix**: Convert props object to array before processing
- **Result**: ✅ All components now build successfully

---

## 🚀 How to Use

### Quick Start

```bash
# 1. Extract your components
npx dcp extract ./src/components --out ./registry

# 2. Build component packs
npx dcp registry build-packs ./registry/registry.json --out ./packs

# 3. Start the visual browser
npx dcp registry serve ./packs --port 7401

# 4. Open http://localhost:7401 in your browser
```

### Visual Component Browser

**Features:**
- 🔍 Search components by name
- 🏷️ Filter by namespace/type
- 📋 Copy install commands (npm/pnpm/yarn/bun)
- 🎨 Beautiful dark theme
- 🔗 Shareable deep links
- ⌨️ Keyboard navigation (Cmd+K, Esc, arrows)

### AI-Powered Chat (MCP)

**Setup Claude Desktop:**

1. Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dcp-registry": {
      "command": "node",
      "args": ["/path/to/dcp-toolkit/src/mcp-server.js"]
    }
  }
}
```

2. Restart Claude Desktop

3. Ask questions:
   - "What components do I have?"
   - "Show me Button props"
   - "Which components use primary-blue token?"

### Component Installation

```bash
# Install from registry
npx dcp registry add https://demo.dcp.dev/r/ui/button

# Install locally
npx dcp registry add ./packs/r/ui/card

# With options
npx dcp registry add <url> \
  --target ./src/components \
  --pm pnpm \
  --overwrite prompt \
  --dry-run
```

---

## 🔧 What Was Fixed

### v3.0.4 (This Release)
- ✅ Fixed build-packs crash with props.map error
- ✅ Added comprehensive documentation

### v3.0.3
- ✅ Fixed duplicate baseUrl in component URLs
- ✅ Modal now opens correctly

### v3.0.2
- ✅ Fixed Browse UI crash on null dependencies

### v3.0.1
- ✅ Fixed Browse UI static assets (CSS/JS) not loading

### v3.0.0
- ✅ Multi-registry support (MCP)
- ✅ Component installer (`dcp-add` v2)
- ✅ Registry auto-detection
- ✅ Browse UI (visual component browser)

---

## 📦 Installation

### Global Install
```bash
npm install -g @dcp/toolkit@3.0.4
```

### Use with npx
```bash
npx @dcp/toolkit@3.0.4 extract ./src
```

### Update Existing
```bash
npm update -g @dcp/toolkit
```

---

## 🎯 Who Should Use This

### Designers
- Browse components visually
- Share links in Figma comments
- See what's available without asking engineers

### Product Managers
- Copy shareable links for Slack/Jira
- See when components were last updated
- Track design system adoption

### Engineers
- Install components with one command
- Copy exact install commands for your package manager
- Validate code against design system

### AI Users
- Ask questions about your design system
- Get instant answers without learning MCP
- Bridge to AI tools (Claude, ChatGPT)

---

## 📚 Learn More

- **[Getting Started Guide](./docs/GETTING_STARTED.md)** - Complete tutorial
- **[Quick Reference](./docs/QUICK_REFERENCE.md)** - Cheat sheet
- **[Browse UI Guide](./docs/BROWSE_UI_GUIDE.md)** - Visual browser features
- **[MCP Setup](./docs/CLAUDE_DESKTOP_SETUP.md)** - AI integration
- **[API Reference](./docs/api/)** - Full API docs

---

## 🆘 Troubleshooting

### "Command not found: dcp"
```bash
# Use npx
npx dcp extract ./src

# Or install globally
npm install -g @dcp/toolkit
```

### "All components failed to build"
```bash
# Update to v3.0.4
npm update -g @dcp/toolkit

# Rebuild
npx dcp registry build-packs ./registry/registry.json --out ./packs
```

### "Failed to load component details"
```bash
# Restart server
pkill -f "dcp.*serve"
npx dcp registry serve ./packs --port 7401
```

---

## 🎉 What's Next

**v3.1.0 (Coming Soon):**
- Token support in Browse UI
- Component previews (screenshots)
- Live component rendering
- Enhanced search filters

**v3.2.0:**
- Figma sync
- Storybook integration
- Visual regression testing

---

## 💬 Feedback

Found a bug? Have a feature request?

- [Open an issue](https://github.com/your-repo/issues)
- [Join discussions](https://github.com/your-repo/discussions)
- [Read the docs](./docs/GETTING_STARTED.md)

---

## 🙏 Thank You

Thank you for using DCP! We're excited to see what you build with it.

**Happy coding!** 🚀

