# DCP Toolkit - Quick Start Guide

**Complete workflow from extraction → Browse UI → MCP integration**

---

## 🎯 What We've Built

### ✅ **Browse UI** (v3.0+)
- **Fully functional component browser** at `http://localhost:7401`
- **Search, filter, and browse** components and tokens
- **Component modals** with props, source code, install commands
- **Token visual previews** (colors, spacing, typography)
- **Dark mode** with professional styling

### ✅ **MCP Server** (v3.0+)
- **AI-powered design system assistant**
- **11+ tools** for querying components, tokens, validation
- **Auto-detects registries** (no path needed)
- **Hot reload** when registry changes

### ✅ **CLI Commands**
- Extract components → `dcp extract`
- Build packs → `dcp registry build-packs`
- Serve Browse UI → `dcp registry serve`
- Query tokens → `dcp query-tokens`

---

## 🚀 Quick Start (5 Minutes)

### 1. Extract Your Design System

```bash
# From your project root
cd /path/to/your/project

# Extract components and tokens
dcp extract ./src/components --out ./registry

# Verify it worked
ls ./registry/registry.json  # Should exist
```

### 2. Build Component Packs (for Browse UI)

```bash
# Build packs with Browse UI
dcp registry build-packs ./registry/registry.json \
  --out ./packs \
  --base-url http://localhost:7401 \
  --namespace ui \
  --version 1.0.0

# Verify
ls ./packs/index.json  # Should exist
ls ./packs/browse.html  # Browse UI HTML
```

### 3. Serve the Browse UI

```bash
# Start the development server
dcp registry serve ./packs --port 7401

# Open in browser
open http://localhost:7401
```

**You should see:**
- ✅ Component cards with props count
- ✅ Token cards with visual previews
- ✅ Search and filter functionality
- ✅ Click components to see modal with props, source code, install commands

---

## 🤖 MCP Integration (Claude Desktop)

### Option 1: Quick Test (npx)

```bash
# Test MCP server directly
npx -y @dcp/toolkit dcp-mcp ./registry

# In another terminal, test it:
curl http://localhost:7400/health
```

### Option 2: Claude Desktop Integration

**1. Edit Claude Desktop Config:**

**macOS:**
```bash
code ~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

**2. Add this configuration:**

```json
{
  "mcpServers": {
    "dcp-registry": {
      "command": "node",
      "args": [
        "/absolute/path/to/DCP-Transformer/packages/dcp-toolkit/src/mcp-server.js",
        "/absolute/path/to/your/registry"
      ],
      "cwd": "/absolute/path/to/DCP-Transformer/packages/dcp-toolkit"
    }
  }
}
```

**3. Restart Claude Desktop**

**4. Test in Claude:**

```
What components are available in my design system?
```

Claude will use `dcp_list_components` to show you all components!

---

## 📚 Available MCP Tools

### 🔍 **dcp_list_components**
Browse all components with filtering:
- `search` - Search by name/description
- `namespace` - Filter by namespace
- `type` - Filter by component type
- `category` - Filter by category
- `detailed` - Include key props, variants, dependencies
- `limit` / `offset` - Pagination

**Example:**
```json
{
  "search": "button",
  "namespace": "ui",
  "detailed": true,
  "limit": 10
}
```

### 🧩 **dcp_get_component**
Get full component details:
- Props (required/optional)
- Variants
- Examples
- Dependencies

### 🎨 **dcp_query_tokens**
Query design tokens:
- `filter` - Pattern matching (e.g., "color.*")
- `category` - Filter by category
- `format` - Output format (css, js, tailwind)

### ✅ **dcp_validate_code**
Validate code against design system:
- Check token usage
- Validate component props
- Suggest alternatives

### 💡 **dcp_suggest_alternatives**
Get valid alternatives for:
- Invalid tokens
- Invalid props
- Invalid variants

---

## 🔧 CLI Commands Reference

### Core Commands

```bash
# Extract components
dcp extract <source> --out <output>

# Options:
--glob "**/*.{tsx,jsx}"     # File pattern
--adaptor react-tsx         # Extractor adaptor
--auto-detect-tokens        # Auto-extract tokens
--verbose                   # Detailed output
--json                      # JSON output
```

### Registry Commands

```bash
# Build component packs (with Browse UI)
dcp registry build-packs <registry.json> \
  --out <packs-dir> \
  --base-url <url> \
  --namespace <name> \
  --version <version>

# Serve Browse UI
dcp registry serve <packs-dir> \
  --port 7401 \
  --host localhost \
  --base-url <url>

# Validate registry
dcp registry validate <registry.json>

# Install component
dcp registry add <component-url>
```

### Token Commands

```bash
# Query tokens
dcp tokens query "color.*" --format css

# Extract tokens
dcp tokens extract <source> --out <output>
```

---

## 🎨 Browse UI Features

### **Search & Filter**
- **Real-time search** (300ms debounce)
- **Namespace filters** (e.g., "ui (56)")
- **Type filters** (e.g., "component (56)")
- **Category filters** (if categories exist)

### **Component Cards**
- Namespace badge
- Component name & description
- Props count
- Type badge
- Hover effects

### **Component Modal**
- **Install commands** (npm/yarn/pnpm switcher)
- **Props table** (required/optional, types, descriptions)
- **Source code** (with copy button)
- **Metadata** (dependencies, tags, version)
- **Share URL**

### **Token Cards**
- **Visual previews**:
  - Colors → Color swatch
  - Spacing → Size visualization
  - Typography → Font preview
  - Generic → Value display
- **Token detail modal** with copy button

---

## 🔄 Complete Workflow Example

### Step 1: Extract
```bash
cd ~/my-project
dcp extract ./src/components --out ./registry --verbose
```

### Step 2: Build Packs
```bash
dcp registry build-packs ./registry/registry.json \
  --out ./packs \
  --base-url http://localhost:7401
```

### Step 3: Serve
```bash
# Terminal 1: Start server
dcp registry serve ./packs --port 7401

# Terminal 2: Open browser
open http://localhost:7401
```

### Step 4: Use with AI
```
# In Claude Desktop (with MCP configured)
"What components do I have that accept onClick handlers?"
```

Claude will:
1. Use `dcp_list_components` to browse all components
2. Use `dcp_get_component` to check props for each
3. Filter by components with `onClick` prop
4. Return the list

---

## 🐛 Troubleshooting

### **CLI: "unknown command 'registry'"**

The new CLI structure might not be loading. Try:

```bash
# Direct command (bypasses CLI router)
node packages/dcp-toolkit/src/commands/build-packs.js ./registry/registry.json --out ./packs

# Or use npx
npx -y @dcp/toolkit registry build-packs ./registry/registry.json --out ./packs
```

### **Browse UI: Components not showing**

1. **Check `index.json` exists:**
   ```bash
   cat ./packs/index.json | jq '.components | length'
   ```

2. **Rebuild packs:**
   ```bash
   dcp registry build-packs ./registry/registry.json --out ./packs
   ```

3. **Hard refresh browser:** `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### **MCP: "Registry not found"**

1. **Use absolute paths** in Claude Desktop config
2. **Verify registry exists:**
   ```bash
   ls /path/to/registry/registry.json
   ```

3. **Test MCP server manually:**
   ```bash
   node packages/dcp-toolkit/src/mcp-server.js /path/to/registry
   ```

### **MCP: Tools not appearing**

1. **Restart Claude Desktop completely** (not just close window)
2. **Check Claude Desktop logs:**
   ```bash
   # macOS
   tail -f ~/Library/Logs/Claude/*.log
   ```

3. **Verify MCP server starts:**
   ```bash
   node packages/dcp-toolkit/src/mcp-server.js /path/to/registry
   # Should print "MCP Server started..."
   ```

---

## 🎯 What's Left? Nothing Critical!

### ✅ **Fully Working:**
- Browse UI (components + tokens)
- MCP Server (all 11+ tools)
- Component extraction
- Pack building
- Registry serving
- Token support

### 🔧 **Nice-to-Haves (Future):**
- Live component previews (v3.2+)
- Screenshot generation (v3.2+)
- Interactive playground (v3.4+)
- Component thumbnails (v3.2+)

### 📝 **Documentation:**
- ✅ Quick Start Guide (this file)
- ✅ Claude Desktop Setup (`docs/CLAUDE_DESKTOP_SETUP.md`)
- ✅ API Documentation (`docs/api/`)
- ✅ CLI Documentation (`docs/CLI.md`)

---

## 🎉 What We've Unlocked

### **For Developers:**
- **Browse your design system** visually in a browser
- **Copy install commands** with one click
- **View component source code** without leaving the UI
- **Search/filter components** by name, type, category

### **For AI/Agents:**
- **Query components** (`dcp_list_components`)
- **Get component details** (`dcp_get_component`)
- **Query tokens** (`dcp_query_tokens`)
- **Validate code** against design system (`dcp_validate_code`)
- **Suggest alternatives** (`dcp_suggest_alternatives`)

### **For Designers/PMs:**
- **Visual component browser** (like Storybook, but for metadata)
- **Token previews** (see colors, spacing visually)
- **Component documentation** (props, variants, examples)

---

## 📖 Next Steps

1. **Extract your components:** `dcp extract ./src --out ./registry`
2. **Build packs:** `dcp registry build-packs ./registry/registry.json --out ./packs`
3. **Serve Browse UI:** `dcp registry serve ./packs`
4. **Configure MCP:** Add to Claude Desktop config (see above)
5. **Ask AI:** "What components do I have?"

**You're ready to go!** 🚀

