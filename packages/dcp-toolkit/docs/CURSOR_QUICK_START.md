# Cursor MCP Quick Start

## 1. Verify MCP Server

The MCP server is at: `packages/dcp-toolkit/src/mcp-server.js`

**Note:** No build needed - it runs directly with Node.js (ES modules).

## 2. Configure Cursor

Create/edit: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`

```json
{
  "mcpServers": {
    "dcp-registry": {
      "command": "node",
      "args": [
        "/Users/stevewitmer/local_AI_Projects/DCP-Transformer/packages/dcp-toolkit/src/mcp-server.js"
      ],
      "cwd": "/Users/stevewitmer/local_AI_Projects/DCP-Transformer/packages/dcp-toolkit"
    }
  }
}
```

**With explicit registry path (if not auto-detected):**

```json
{
  "mcpServers": {
    "dcp-registry": {
      "command": "node",
      "args": [
        "/Users/stevewitmer/local_AI_Projects/DCP-Transformer/packages/dcp-toolkit/src/mcp-server.js",
        "/absolute/path/to/your/project/registry"
      ],
      "cwd": "/Users/stevewitmer/local_AI_Projects/DCP-Transformer/packages/dcp-toolkit"
    }
  }
}
```

## 3. Restart Cursor

1. **Quit Cursor completely** (Cmd+Q)
2. **Reopen Cursor**
3. Open Command Palette (`Cmd+Shift+P`)
4. Type: `MCP` - you should see MCP-related commands

## 4. Verify Connection

In Cursor's MCP panel (or Command Palette), you should see:

**MCP Prompts:**
- `dcp-registry/audit-component-usages` ⭐ NEW!
- `dcp-registry/suggest-component-variants` ⭐ NEW!
- `dcp-registry/validate-component-usage`
- `dcp-registry/suggest-component-alternatives`
- `dcp-registry/generate-component-example`

**MCP Tools:**
- `dcp_audit_usages` ⭐ NEW!
- `dcp_query_tokens`
- `dcp_list_components`
- `dcp_get_component`
- And 15+ more...

## 5. Test It

### Via Prompt (Command Palette):
1. `Cmd+Shift+P` → `dcp-registry/audit-component-usages`
2. Enter: `DialogContent`
3. See formatted audit results

### Via Chat:
```
"Audit Badge component usages in this codebase"
```

Claude will call `dcp_audit_usages` and show you:
- All usages grouped by signature
- Tailwind patterns (width, height, utilities)
- Drift indicators
- Variant suggestions

## Troubleshooting

**Prompts not showing?**
- Restart Cursor completely (not just reload)
- Check MCP panel shows `dcp-registry` as connected
- Verify `src/mcp-server.js` exists

**"Registry not found"?**
- Server auto-detects `./registry` in `cwd`
- Or pass explicit path in `args[1]`
- Verify `registry.json` exists

**Server not starting?**
- Check Cursor logs: Help → Toggle Developer Tools
- Try running manually: `node src/mcp-server.js ./registry`
- Verify Node.js 18+ is installed

---

**That's it!** You now have component auditing via MCP prompts in Cursor. 🎉

