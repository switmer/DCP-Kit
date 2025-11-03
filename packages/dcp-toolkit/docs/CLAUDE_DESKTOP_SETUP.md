# Claude Desktop MCP Setup Guide

**Quick guide to connect DCP Registry to Claude Desktop**

## Prerequisites

1. **Claude Desktop** installed ([download here](https://claude.ai/download))
2. **DCP Registry** extracted (run `dcp extract ./src --out ./registry`)
3. **Node.js** installed (for running the MCP server)

## Step 1: Locate Claude Desktop Config

### macOS
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Windows
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

## Step 2: Add DCP MCP Server Configuration

Edit `claude_desktop_config.json` and add the DCP server:

```json
{
  "mcpServers": {
    "dcp-registry": {
      "command": "npx",
      "args": [
        "-y",
        "@dcp/toolkit",
        "dcp-mcp"
      ]
    }
  }
}
```

**Note:** With v3.0, the registry path is **optional** and auto-detected! The server now:
- Auto-detects registries in your current working directory
- Accepts `registryPath` parameter per tool call
- Caches multiple registries (no restart needed to switch projects)

**Example with default registry (optional):**
```json
{
  "mcpServers": {
    "dcp-registry": {
      "command": "node",
      "args": [
        "/absolute/path/to/dcp-toolkit/src/mcp-server.js",
        "/absolute/path/to/default/registry"
      ],
      "cwd": "/absolute/path/to/dcp-toolkit"
    }
  }
}
```

## Step 3: Restart Claude Desktop

1. **Quit Claude Desktop completely** (not just close the window)
2. **Reopen Claude Desktop**
3. Check for connection status in Claude's UI

## Step 4: Verify Connection

In Claude Desktop, you should see:
- ✅ MCP tools available in the sidebar
- ✅ Tools like `dcp_query_tokens`, `dcp_get_component`, etc.

If you see connection errors:
- Check that the registry path is **absolute** (not relative)
- Verify the registry exists: `ls /path/to/registry/registry.json`
- Check Claude Desktop logs for errors

## Available MCP Tools

Once connected, Claude can use these tools:

### 🎨 `dcp_query_tokens`
Query design tokens with filtering:
```
Query tokens matching "color.*" in CSS format
```

### 🧩 `dcp_get_component`
Get component details:
```
Get Button component with props, variants, and examples
```

### ✅ `dcp_validate_code`
Validate code against design system:
```
Validate this code: <Button color='#ff0000' />
```

### 💡 `dcp_suggest_alternatives`
Get valid alternatives:
```
Suggest valid color tokens instead of #ff0000
```

### 🔍 `dcp_project_scan`
Analyze project setup:
```
Scan ./src for design system usage
```

## Example Usage

**Before (v2.0 - single registry only):**
```
User: Create a Button component with primary styling
Claude: [Uses dcp_get_component from hardcoded registry]
Claude: <Button variant="primary" size="md" />
```

**After (v3.0 - multi-registry support):**
```
User: Create a Button component with primary styling
Claude: [Can query ANY registry by passing registryPath]
Claude: <Button variant="primary" size="md" />

// Or explicitly target a registry:
dcp_get_component({
  component: "Button",
  registryPath: "/Users/you/my-project/registry"
})
```

**Auto-detection:**
If you're in a project directory with a `./registry` folder, you don't need to pass `registryPath`:
```
dcp_get_component({ component: "Button" })
// Auto-finds ./registry/registry.json
```

## Troubleshooting

### "MCP connection failed"
- Verify registry path is **absolute**
- Check that `registry.json` exists at that path
- Try running manually: `npx @dcp/toolkit dcp-mcp /path/to/registry`

### "Registry not found"
- Run `dcp extract ./src --out ./registry` first
- Verify the path in config matches your registry location

### "Command not found"
- Use `npx -y @dcp/toolkit dcp-mcp` instead of direct command
- Or install globally: `npm install -g @dcp/toolkit`

### Tools not appearing
- Restart Claude Desktop completely
- Check Claude Desktop logs: `~/Library/Logs/Claude/` (macOS)
- Verify MCP server starts without errors

### "Component not found" after extraction
- The registry auto-reloads after extraction if the output path matches the MCP server's registry path
- If you extracted to a different path, ensure your Claude Desktop config points to that path
- Try querying with `dcp_get_component` - it will show available components if your search doesn't match
- Component search is case-insensitive and supports partial matches

## Hot Reload

The MCP server watches your registry and automatically reloads when:
- `registry.json` changes
- Component files are updated
- Token files are modified
- Extraction completes via `dcp_extract_components` (if output path matches registry path)

No need to restart Claude Desktop - changes propagate automatically! The registry reloads within ~100ms of file changes.

## Next Steps

- **Query your design system**: "What color tokens are available?"
- **Get component APIs**: "Show me the Button component props"
- **Validate code**: "Does this code match our design system?"
- **Suggest improvements**: "What's a better way to style this button?"

---

**Need help?** Check [MCP Integration Docs](./api/mcp-integration.md) or [open an issue](https://github.com/stevewitmer/dcp-transformer/issues)

