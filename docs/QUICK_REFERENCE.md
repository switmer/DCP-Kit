# DCP Quick Reference

**One-page cheat sheet for Design Component Protocol**

---

## 🚀 Essential Commands

### Extract Components
```bash
npx dcp extract <source> --out <output>
npx dcp extract ./src/components --out ./registry
```

### Build Packs
```bash
npx dcp registry build-packs <registry> --out <output> --base-url <url>
npx dcp registry build-packs ./registry/registry.json --out ./packs --base-url http://localhost:7401
```

### Serve Registry
```bash
npx dcp registry serve <packs-dir> --port <port>
npx dcp registry serve ./packs --port 7401
```

### Install Component
```bash
npx dcp registry add <url>
npx dcp registry add https://demo.dcp.dev/r/ui/button
npx dcp registry add ./packs/r/ui/card --target ./src/components
```

### Publish Registry
```bash
npx dcp registry publish <packs-dir> --provider <provider>
npx dcp registry publish ./packs --provider s3 --bucket my-components
```

---

## 🎨 Browse UI

**Start:** `npx dcp registry serve ./packs --port 7401`  
**Open:** `http://localhost:7401`

**Keyboard Shortcuts:**
- `Cmd+K` or `/` - Focus search
- `Esc` - Close modal
- `Arrow keys` - Navigate cards

**Features:**
- Search components by name
- Filter by namespace/type
- Click card → View details
- Copy install commands
- Switch package managers

---

## 🤖 AI Chat (MCP)

**Setup (Claude Desktop):**
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

**Ask Claude:**
- "What components do I have?"
- "Show me Button props"
- "Which components use primary-blue token?"
- "Extract components from ~/my-app/src"

---

## 📦 Installation Options

```bash
# Basic
npx dcp registry add <url>

# With options
npx dcp registry add <url> \
  --target ./src/components \
  --pm pnpm \
  --overwrite prompt \
  --dry-run \
  --token <token>
```

**Flags:**
- `--target` - Install directory (auto-detects from components.json)
- `--pm` - Package manager (npm/pnpm/yarn/bun, auto-detects)
- `--overwrite` - Conflict policy (skip/prompt/force)
- `--dry-run` - Preview without installing
- `--token` - Auth token for private registries

---

## 🔧 Common Flags

**All Commands:**
- `--verbose` - Detailed output
- `--json` - Machine-readable output
- `--help` - Show help

**Extract:**
- `--adaptor` - Framework (react-tsx, vue-sfc, svelte)
- `--include` - File pattern
- `--exclude` - Exclude pattern

**Build Packs:**
- `--namespace` - Component namespace (default: ui)
- `--version` - Package version (default: 1.0.0)
- `--base-url` - Base URL for hosted files

**Serve:**
- `--port` - Server port (default: 7401)
- `--host` - Server host (default: localhost)
- `--secret` - JWT secret for auth
- `--no-cors` - Disable CORS

**Publish:**
- `--provider` - Hosting (s3/github-pages/generic)
- `--bucket` - S3 bucket name
- `--region` - AWS region
- `--dry-run` - Preview upload

---

## 📂 File Structure

```
my-design-system/
├── src/
│   └── components/          # Source components
├── registry/
│   ├── registry.json        # Extracted metadata
│   ├── components/          # Component schemas
│   └── tokens/              # Design tokens
└── packs/                   # Built packages
    ├── index.json           # Registry index
    ├── browse.html          # Browse UI
    ├── browse.js
    ├── browse.css
    ├── blobs/               # Content-addressed files
    └── <component>/         # Component packs
        ├── meta.json
        ├── index.tsx
        ├── demo.tsx
        └── README.md
```

---

## 🌐 URLs & Endpoints

**Browse UI:**
- `/` - Component browser
- `/index.json` - Registry index

**Component API:**
- `/r/<namespace>/<component>` - Component metadata
- `/r/<namespace>/<component>@<version>` - Versioned component
- `/blobs/<sha1>` - Content-addressed files

**Static Assets:**
- `/browse.css` - Browse UI styles
- `/browse.js` - Browse UI JavaScript

---

## 🔐 Authentication

**Server:**
```bash
npx dcp registry serve ./packs --secret mytoken123
```

**Client:**
```bash
# Via flag
npx dcp registry add <url> --token mytoken123

# Via env
export DCP_REGISTRY_TOKEN=mytoken123
npx dcp registry add <url>
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Command not found | Use `npx dcp` instead of `dcp` |
| Port in use | Use `--port 8080` |
| Registry not found | Specify path or check `./registry` |
| Failed to load component | Rebuild packs and restart server |
| Props not showing | Run `npx dcp extract` again |
| Duplicate baseUrl | Update to v3.0.3+ |

---

## 📚 Documentation

- [Getting Started](./GETTING_STARTED.md) - Full tutorial
- [Browse UI Guide](./BROWSE_UI_GUIDE.md) - Visual browser
- [MCP Setup](./CLAUDE_DESKTOP_SETUP.md) - AI integration
- [API Reference](./api/) - Full API docs

---

## 💡 Quick Tips

1. **Always use `--verbose`** when debugging
2. **Use `--dry-run`** before making changes
3. **Commit `registry.json`** to version control
4. **Test locally** before publishing
5. **Use semantic versioning** for releases
6. **Document your tokens** with descriptions
7. **Enable CORS** for cross-origin browsing

---

## 🎯 Workflows

**Local Development:**
```bash
npx dcp extract ./src --out ./registry
npx dcp registry build-packs ./registry/registry.json --out ./packs
npx dcp registry serve ./packs --port 7401
```

**Production Deployment:**
```bash
npx dcp extract ./src --out ./registry --verbose
npx dcp registry build-packs ./registry/registry.json --out ./packs --version 2.1.0
npx dcp registry publish ./packs --provider s3 --bucket my-ds
```

**Component Installation:**
```bash
npx dcp registry add https://cdn.example.com/r/ui/button --dry-run
npx dcp registry add https://cdn.example.com/r/ui/button --pm pnpm
```

---

**Need more help?** See [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed guides.

