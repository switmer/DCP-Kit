# Demo Video Scripts

**Last Updated:** January 2025

Scripts and outlines for creating demo videos showcasing DCP-Transformer capabilities.

---

## Demo 1: React Component Extraction (5-7 minutes)

### Overview
Demonstrate extracting components from a React/TypeScript codebase and generating a DCP registry.

### Script Outline

**1. Introduction (30 seconds)**
- "Today I'll show you how to extract components from a React design system using DCP-Transformer"
- Show the project structure (a real React component library)

**2. Installation (30 seconds)**
```bash
npm install -g @dcp/toolkit
dcp --version
```

**3. Project Setup (30 seconds)**
- Show the React project structure
- Highlight components directory
- Show TypeScript components

**4. Extraction (2 minutes)**
```bash
# Show the extraction command
dcp extract ./src/components --auto-detect-tokens --out ./registry --verbose

# Show output:
# - Components being processed
# - Token detection
# - Progress indicators
# - Final summary
```

**5. Explore Results (2 minutes)**
- Open registry.json
- Show component structure
- Show extracted props and variants
- Show design tokens
- Show metadata

**6. Validation (1 minute)**
```bash
dcp validate-registry ./registry/registry.json
```

**7. Wrap-up (30 seconds)**
- "In under 3 minutes, we've extracted 45 components with full metadata"
- "Next, we'll show how to use this with AI agents"

### Key Points to Highlight
- Speed of extraction
- Quality of extracted metadata
- TypeScript type information
- Token extraction from multiple sources
- Zero configuration needed

---

## Demo 2: MCP Integration with Claude Desktop (6-8 minutes)

### Overview
Show how DCP integrates with AI agents via Model Context Protocol.

### Script Outline

**1. Introduction (30 seconds)**
- "DCP provides AI agents with structured design system context via MCP"
- Show Claude Desktop interface

**2. Setup MCP Server (1 minute)**
```bash
# Show MCP server configuration
cat ~/.config/claude_desktop/claude_desktop_config.json

# Start MCP server (if needed)
dcp-mcp --stdio
```

**3. Extract Registry (1 minute)**
```bash
dcp extract ./src --out ./registry
```

**4. Query in Claude (3 minutes)**
- Open Claude Desktop
- Show example queries:
  - "What components are available in my design system?"
  - "Show me the Button component props"
  - "What design tokens does the Card component use?"
  - "Generate a form using my design system components"

**5. Show MCP Tools (1 minute)**
- Demonstrate `query_registry` tool
- Demonstrate `get_component` tool
- Show live registry access

**6. Export for Remote MCP (1 minute)**
```bash
dcp export-mcp ./registry/registry.json --optimize-for claude --out mcp.json
```

**7. Wrap-up (30 seconds)**
- "AI agents now have full access to your design system"
- "They can query components, understand props, and generate code"

### Key Points to Highlight
- Real-time registry access
- AI agent understanding of components
- Code generation with design system context
- MCP protocol integration

---

## Demo 3: Component Pack Distribution (5-6 minutes)

### Overview
Show how to create distributable component packs and install them.

### Script Outline

**1. Introduction (30 seconds)**
- "Component packs enable zero-fetch installation of design system components"
- Show the goal: distribute components easily

**2. Build Component Packs (1 minute)**
```bash
dcp build-packs ./registry/registry.json --out ./dist/packs --namespace ui --version 1.0.0
```

**3. Explore Pack Structure (1 minute)**
- Show pack directory structure
- Show component files (index.tsx, demo.tsx, README.md)
- Show meta.json

**4. Serve Locally (1 minute)**
```bash
dcp serve-registry ./dist/packs --port 7401
```

**5. Install Component (1 minute)**
```bash
# In a different project
dcp add http://localhost:7401/r/ui/button --target ./components/ui
```

**6. Show Installed Component (1 minute)**
- Show installed files
- Show component works
- Show documentation

**7. Publish to S3 (1 minute)**
```bash
dcp publish-static ./dist/packs --bucket my-registry --region us-east-1
```

**8. Wrap-up (30 seconds)**
- "Component packs enable easy distribution"
- "Zero-fetch installation means single request gets everything"

### Key Points to Highlight
- Self-contained packages
- Zero-fetch installation
- Easy distribution
- Works with any hosting

---

## Demo 4: Watch Mode & Live Updates (4-5 minutes)

### Overview
Show real-time registry updates during development.

### Script Outline

**1. Introduction (30 seconds)**
- "Watch mode provides live updates as you develop"
- Show development workflow

**2. Start Watch Mode (30 seconds)**
```bash
dcp watch ./src --out ./registry --ws 7070
```

**3. Show Storybook Integration (2 minutes)**
- Open Storybook
- Show DCP Registry panel
- Make a change to a component
- Show live update in Storybook

**4. Show WebSocket Updates (1 minute)**
- Show connection status
- Show live registry stats
- Show component updates

**5. API Server Integration (1 minute)**
```bash
# In another terminal
dcp api --port 3000 --registry ./registry
```

**6. Show Live API Updates (30 seconds)**
- Query API after component change
- Show updated registry

**7. Wrap-up (30 seconds)**
- "Watch mode keeps everything in sync"
- "No manual refresh needed"

### Key Points to Highlight
- Real-time updates
- WebSocket integration
- Storybook addon
- Development workflow

---

## Demo 5: Mutation & Rollback (5-6 minutes)

### Overview
Show how to safely mutate registries with preview and rollback.

### Script Outline

**1. Introduction (30 seconds)**
- "DCP enables safe mutations with preview and rollback"
- Show mutation use case

**2. Create Mutation Patch (1 minute)**
```json
[
  {
    "op": "replace",
    "path": "/components/0/props/variant/options",
    "value": ["primary", "secondary", "ghost", "outline"]
  }
]
```

**3. Preview Mutation (1 minute)**
```bash
dcp mutate registry.json patch.json output.json --dry-run
```

**4. Apply Mutation (1 minute)**
```bash
dcp mutate registry.json patch.json output.json --undo undo.json
```

**5. Show Results (1 minute)**
- Compare before/after
- Show undo file

**6. Rollback (1 minute)**
```bash
dcp rollback output.json undo.json
```

**7. Wrap-up (30 seconds)**
- "Safe mutations with full audit trail"
- "Rollback any change instantly"

### Key Points to Highlight
- JSON Patch format
- Preview before applying
- Automatic undo generation
- Safe rollback

---

## Video Production Tips

### Recording Setup
- **Resolution:** 1920x1080 minimum
- **Frame Rate:** 30fps or 60fps
- **Audio:** Clear narration, minimize background noise
- **Code Font:** Monaco, Menlo, or Fira Code
- **Font Size:** 14-16pt for readability

### Editing Tips
- Add zoom-ins for important commands
- Highlight command output
- Add transitions between sections
- Include timestamps in description
- Add captions/subtitles

### Distribution
- Upload to YouTube (unlisted or public)
- Add to README
- Include in documentation
- Share on social media

---

## Script Templates

### Quick Command Reference

**Extraction:**
```bash
dcp extract ./src --auto-detect-tokens --out ./registry --verbose
```

**Validation:**
```bash
dcp validate-registry ./registry/registry.json
```

**MCP Export:**
```bash
dcp export-mcp ./registry/registry.json --optimize-for claude
```

**Watch Mode:**
```bash
dcp watch ./src --ws 7070
```

**API Server:**
```bash
dcp api --port 3000 --registry ./registry
```

**Component Packs:**
```bash
dcp build-packs ./registry/registry.json --out ./dist/packs
dcp serve-registry ./dist/packs --port 7401
```

---

## Questions?

For questions about creating demo videos:

- **GitHub Issues**: [Create an issue](https://github.com/stevewitmer/dcp-transformer/issues)
- **Discussions**: [Share your videos](https://github.com/stevewitmer/dcp-transformer/discussions)

**Version:** 2.0.1  
**Last Updated:** January 2025

