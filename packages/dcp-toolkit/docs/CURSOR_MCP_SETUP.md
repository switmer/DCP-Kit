# Cursor IDE MCP Setup Guide

**Quick guide to connect DCP Registry to Cursor IDE via MCP**

## Prerequisites

1. **Cursor IDE** installed ([download here](https://cursor.sh))
2. **DCP Registry** extracted (run `dcp extract ./src --out ./registry`)
3. **Node.js** installed (for running the MCP server)

## Step 1: Locate Cursor MCP Config

Cursor stores MCP configuration in:

### macOS
```bash
~/Library/Application Support/Cursor/User/globalStorage/mcp.json
```

### Windows
```bash
%APPDATA%\Cursor\User\globalStorage\mcp.json
```

### Linux
```bash
~/.config/Cursor/User/globalStorage/mcp.json
```

**Note:** If the file doesn't exist, create it.

## Step 2: Add DCP MCP Server Configuration

Edit `mcp.json` and add the DCP server:

```json
{
  "mcpServers": {
    "dcp-registry": {
      "command": "node",
      "args": [
        "/absolute/path/to/DCP-Transformer/packages/dcp-toolkit/dist/mcp-server.js"
      ],
      "cwd": "/absolute/path/to/DCP-Transformer/packages/dcp-toolkit"
    }
  }
}
```

**Alternative: Using npm/npx (recommended for development):**

```json
{
  "mcpServers": {
    "dcp-registry": {
      "command": "npx",
      "args": [
        "-y",
        "@dcp/toolkit",
        "dcp-mcp"
      ],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

**With explicit registry path (optional):**

```json
{
  "mcpServers": {
    "dcp-registry": {
      "command": "node",
      "args": [
        "/absolute/path/to/DCP-Transformer/packages/dcp-toolkit/dist/mcp-server.js",
        "/absolute/path/to/your/project/registry"
      ],
      "cwd": "/absolute/path/to/DCP-Transformer/packages/dcp-toolkit"
    }
  }
}
```

## Step 3: Build the MCP Server

If using the local development version, build it first:

```bash
cd /Users/stevewitmer/local_AI_Projects/DCP-Transformer
npm run build
```

This compiles TypeScript to `packages/dcp-toolkit/dist/mcp-server.js`.

## Step 4: Restart Cursor

1. **Quit Cursor completely** (Cmd+Q on macOS, Alt+F4 on Windows)
2. **Reopen Cursor**
3. Open the MCP panel (usually in the sidebar or via Command Palette: `Cmd+Shift+P` → "MCP")

## Step 5: Verify Connection

In Cursor, you should see:
- ✅ MCP server status: `dcp-registry` connected
- ✅ MCP prompts available in Command Palette:
  - `dcp-registry/validate-component-usage`
  - `dcp-registry/suggest-component-alternatives`
  - `dcp-registry/generate-component-example`
  - `dcp-registry/audit-component-usages` (NEW!)
  - `dcp-registry/suggest-component-variants` (NEW!)
- ✅ MCP tools available (visible in MCP panel)

## Available MCP Prompts

### 🔍 `audit-component-usages`
**Audit component usages across the codebase**

**Usage:**
1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type: `dcp-registry/audit-component-usages`
3. Enter component name (e.g., "Button", "DialogContent")
4. Optionally specify source directory

**What it does:**
- Finds all usages of the component
- Extracts props from JSX
- Parses Tailwind classes into semantic patterns
- Groups by signature (auto-inferred from usage)
- Detects drift (missing props, excessive className overrides)
- Suggests variants based on repeated patterns

**Example:**
```
Component: DialogContent
Result: Shows width patterns (small/medium/large), flags "gap-0" appearing in 80% of usages, suggests size variants
```

### 💡 `suggest-component-variants`
**Analyze usage and suggest missing variants**

**Usage:**
1. Command Palette → `dcp-registry/suggest-component-variants`
2. Enter component name

**What it does:**
- Analyzes className patterns
- Identifies repeated utility combinations
- Suggests new variants to add to component
- Provides migration guidance

### ✅ `validate-component-usage`
**Validate code against design system**

**Usage:**
1. Select code in editor
2. Command Palette → `dcp-registry/validate-component-usage`
3. Enter component name (optional)

### 🔄 `suggest-component-alternatives`
**Get valid alternatives for violations**

**Usage:**
1. Command Palette → `dcp-registry/suggest-component-alternatives`
2. Enter current value and type (token/prop/variant)

### 📝 `generate-component-example`
**Generate usage examples**

**Usage:**
1. Command Palette → `dcp-registry/generate-component-example`
2. Enter component name
3. Optionally specify variant

## Available MCP Tools

All tools are accessible via the MCP panel or by asking Claude in chat:

- `dcp_query_tokens` - Query design tokens
- `dcp_list_components` - Browse/search components
- `dcp_get_component` - Get component details
- `dcp_audit_usages` - **NEW!** Audit component usages (same as prompt, but callable as tool)
- `dcp_validate_code` - Validate code
- `dcp_suggest_alternatives` - Get alternatives
- `dcp_project_scan` - Scan project setup
- `dcp_extract_components` - Extract components
- And more...

## Example Workflow

### 1. Audit a Component
```
You: "Audit DialogContent component usages in this codebase"
Claude: [Calls dcp_audit_usages]
Claude: "Found 47 usages. 38 have 'gap-0' - consider making it default. 
         Width patterns suggest adding size prop with sm/md/lg/xl variants."
```

### 2. Suggest Variants
```
You: "What variants should DialogContent have?"
Claude: [Calls dcp_audit_usages, analyzes results]
Claude: "Based on usage patterns, add: size='sm' (420px), size='md' (520px), 
         size='lg' (800px), size='xl' (960px), size='full' (100vw)"
```

### 3. Validate Code
```
You: [Selects code] "Validate this Button usage"
Claude: [Calls dcp_validate_code]
Claude: "Missing 'size' prop. Consider using size='md' variant."
```

## Troubleshooting

### "MCP server not connecting"
- Verify the path in `mcp.json` is **absolute** (not relative)
- Check that `dist/mcp-server.js` exists after building
- Try running manually: `node dist/mcp-server.js ./registry`
- Check Cursor logs: Help → Toggle Developer Tools → Console

### "Prompts not appearing"
- Restart Cursor completely (not just reload window)
- Verify MCP server shows as "connected" in MCP panel
- Check that prompts are listed in MCP panel
- Try using tools directly: "Audit Button usages" in chat

### "Registry not found"
- The server auto-detects registries in CWD
- Or pass explicit path: `args: ["...", "/path/to/registry"]`
- Verify `registry.json` exists at that path

### "Tools not working"
- Check MCP server logs in Cursor's developer console
- Verify Node.js version (requires Node 18+)
- Try running server manually to see errors

## Auto-Detection

The MCP server automatically detects registries:
1. Checks `./registry/registry.json` in `cwd`
2. Checks `../registry/registry.json` (parent directory)
3. Falls back to default if provided in constructor

**No need to specify registry path** if you're working in a project with `./registry` folder!

## Hot Reload

The MCP server watches your registry and automatically reloads when:
- `registry.json` changes
- Component files are updated
- Extraction completes

**No need to restart Cursor** - changes propagate automatically!

## Next Steps

- **Audit components**: "Audit Badge usages"
- **Find drift**: "Show me components with missing props"
- **Suggest variants**: "What variants should Card have?"
- **Validate code**: Select code and validate
- **Generate examples**: "Generate examples for Button component"

---

**Need help?** Check [MCP Integration Docs](./api/mcp-integration.md) or [open an issue](https://github.com/stevewitmer/dcp-transformer/issues)

