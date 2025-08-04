# Component Packs & Zero-Fetch Installation

> **Self-contained, distributable component packages with zero network dependencies**

Component Packs transform your DCP registry into installable, shareable units that can be distributed and installed anywhere without additional network requests.

## 🎯 Overview

Component Packs combine **standardized packaging** with **zero-fetch installation** to create a complete component distribution ecosystem:

- **📦 Component Packs**: Standardized format for packaging components
- **⚡ Zero-Fetch Install**: Installation without additional network requests
- **🌐 Multiple Distribution Options**: S3, GitHub Pages, self-hosted
- **🤖 AI/LLM Ready**: MCP-compatible for AI agent consumption

## 🚀 Quick Start

### 1. Extract Your Design System

```bash
# Extract components from your codebase
npx dcp extract ./src --out ./registry
```

### 2. Build Component Packs

```bash
# Create distributable component packs
npx dcp build-packs ./registry/registry.json --out ./dist/packs
```

### 3. Distribute Your Packs

```bash
# Option A: Serve locally for testing
npx dcp serve-registry ./dist/packs --port 7401

# Option B: Publish to S3
npx dcp publish-static ./dist/packs --bucket my-registry --public

# Option C: Deploy to GitHub Pages
npx dcp publish-static ./dist/packs --provider github-pages
```

### 4. Install Components

```bash
# Install with zero-fetch (single request gets everything)
npx dcp-add "http://localhost:7401/r/ui/button"
npx dcp-add "https://my-registry.s3.amazonaws.com/r/ui/avatar"
npx dcp-add "https://username.github.io/repo/r/ui/badge"
```

## 📦 What Are Component Packs?

Component Packs are self-contained directories that include everything needed to use a component:

```
dist/packs/
├── button/
│   ├── index.tsx          # Component source code
│   ├── demo.tsx           # Auto-generated demo
│   ├── README.md          # Documentation with props table
│   ├── styles.css         # Component styles (if any)
│   └── meta.json          # Metadata & installation info
├── avatar/
│   ├── index.tsx
│   ├── demo.tsx
│   ├── README.md
│   ├── styles.css
│   └── meta.json
└── index.json             # Registry manifest
```

### Key Features

- **🔧 Auto-generated demos** from component schemas
- **📚 Documentation** with props/variants tables
- **🎨 Style integration** with design tokens
- **📋 ShadCN-compatible metadata**
- **🔗 Content-addressed storage** (SHA1 hashes)

## ⚡ Zero-Fetch Installation

### Traditional vs Zero-Fetch

**Traditional Installation (Multiple Requests):**
```bash
# 1. Fetch component metadata
curl https://registry.com/components/button

# 2. Fetch component source
curl https://registry.com/components/button/source.tsx

# 3. Fetch component demo
curl https://registry.com/components/button/demo.tsx

# 4. Fetch component docs
curl https://registry.com/components/button/README.md
```

**Zero-Fetch Installation (Single Request):**
```bash
# 1. Single request - everything embedded
curl https://registry.com/r/ui/button
# Returns JSON with ALL content embedded:
{
  "name": "button",
  "source": "export function Button() { ... }",
  "demo": "export function ButtonDemo() { ... }",
  "readme": "# Button Component\n\n...",
  "styles": ".button { ... }"
}
```

### Benefits

- **🚀 Faster installation** (single network request)
- **📱 Works offline** (after initial registry fetch)
- **🔄 Reliable caching** (content-addressed)
- **🔒 No network failures** (everything in one response)

## 🛠️ How It Works

### 1. Component Pack Builder

The `build-packs` command transforms your DCP registry into distributable packages:

```javascript
// Generates component source from schema
const sourceCode = await this.generateComponentSource(component);

// Creates demo component with prop examples
const demoCode = await this.generateDemoComponent(component);

// Builds documentation with props/variants tables
const readme = await this.generateReadme(component);

// Stores content-addressed blobs
const files = {
  'index.tsx': await this.storeBlob(sourceCode, 'tsx'),
  'demo.tsx': await this.storeBlob(demoCode, 'tsx'),
  'README.md': await this.storeBlob(readme, 'md')
};
```

### 2. Registry Server

The `serve-registry` command provides a REST API for component discovery and installation:

```javascript
// Serves component with embedded content
app.get('/r/:namespace/:component', (req, res) => {
  res.json({
    name: component.name,
    source: component.source,        // Embedded
    demo: component.demo,           // Embedded  
    readme: component.readme,       // Embedded
    styles: component.styles        // Embedded
  });
});
```

### 3. Component Installer

The `dcp-add` command installs components using zero-fetch:

```javascript
// Fetches component with embedded content
const response = await fetch(url);
const component = await response.json();

// No additional fetches needed!
await this.writeFile('index.tsx', component.source);
await this.writeFile('demo.tsx', component.demo);
await this.writeFile('README.md', component.readme);
```

## 🌐 Distribution Options

### 1. Self-Hosted Registry

```bash
# Serve your own registry
npx dcp serve-registry ./dist/packs --port 7401

# Install from your server
npx dcp-add "http://localhost:7401/r/ui/button"
```

### 2. S3/CDN Hosting

```bash
# Publish to S3
npx dcp publish-static ./dist/packs --bucket my-registry --public

# Install from S3
npx dcp-add "https://my-registry.s3.amazonaws.com/r/ui/button"
```

### 3. GitHub Pages

```bash
# Deploy to GitHub Pages
npx dcp publish-static ./dist/packs --provider github-pages

# Install from GitHub Pages
npx dcp-add "https://username.github.io/repo/r/ui/button"
```

### 4. Private Registries

```bash
# Serve with authentication
npx dcp serve-registry ./dist/packs --secret your-jwt-secret

# Install with auth token
npx dcp-add "http://localhost:7401/r/ui/button" --token your-token
```

## 📋 Component Pack Structure

### Meta.json Format

```json
{
  "name": "button",
  "version": "1.0.0",
  "title": "Button",
  "description": "Button component with variants",
  "category": "components",
  
  "files": {
    "index.tsx": "blobs/a1b2c3d4...",
    "demo.tsx": "blobs/e5f6g7h8...",
    "README.md": "blobs/i9j0k1l2..."
  },
  
  "props": [
    {
      "name": "variant",
      "type": "string",
      "description": "Button variant",
      "required": false,
      "default": "default"
    }
  ],
  
  "variants": {
    "variant": {
      "default": "bg-primary text-primary-foreground",
      "destructive": "bg-destructive text-destructive-foreground",
      "outline": "border border-input bg-background"
    }
  },
  
  "peerDependencies": {
    "react": "^18.0.0",
    "class-variance-authority": "^0.7.0"
  },
  
  "installCommand": "npx dcp-add \"https://api.dcp.dev/r/ui/button\"",
  "registryUrl": "https://api.dcp.dev/r/ui/button"
}
```

### Auto-Generated Demo

```tsx
import { Button } from "./index"

export default function ButtonDemo() {
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">Button Demo</h2>
      
      {/* Default */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Default</h3>
        <Button variant="default" size="default">
          Example content
        </Button>
      </div>
      
      {/* Variants */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Variants</h3>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
      </div>
    </div>
  )
}
```

## 🔧 CLI Commands

### Build Component Packs

```bash
# Basic build
npx dcp build-packs ./registry/registry.json --out ./dist/packs

# With custom namespace and version
npx dcp build-packs ./registry/registry.json \
  --out ./dist/packs \
  --namespace acme-ui \
  --version 2.1.0 \
  --base-url https://cdn.acme.com

# Verbose output
npx dcp build-packs ./registry/registry.json --verbose
```

### Serve Registry

```bash
# Basic serve
npx dcp serve-registry ./dist/packs --port 7401

# With authentication
npx dcp serve-registry ./dist/packs \
  --port 7401 \
  --secret your-jwt-secret

# Custom host
npx dcp serve-registry ./dist/packs \
  --port 7401 \
  --host 0.0.0.0
```

### Install Components

```bash
# Basic install
npx dcp-add "http://localhost:7401/r/ui/button"

# With custom target directory
npx dcp-add "http://localhost:7401/r/ui/button" \
  --target ./components/ui

# With authentication
npx dcp-add "http://localhost:7401/r/ui/button" \
  --token your-auth-token

# Dry run (preview without installing)
npx dcp-add "http://localhost:7401/r/ui/button" --dry-run
```

### Publish to Static Hosting

```bash
# Publish to S3
npx dcp publish-static ./dist/packs \
  --bucket my-registry \
  --region us-east-1 \
  --public

# Deploy to GitHub Pages
npx dcp publish-static ./dist/packs \
  --provider github-pages

# Generic static hosting
npx dcp publish-static ./dist/packs \
  --provider generic \
  --base-url https://cdn.example.com
```

## 🤖 AI/LLM Integration

Component Packs are designed for AI/LLM consumption:

### MCP (Model Context Protocol) Ready

```javascript
// MCP server provides AI-friendly endpoints
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: "get_component",
        description: "Get component with embedded content",
        inputSchema: {
          type: "object",
          properties: {
            component: { type: "string" }
          }
        }
      }
    ]
  });
});
```

### Structured for AI Reasoning

- **Embedded content** for zero-fetch AI consumption
- **Structured metadata** for component understanding
- **Content-addressed** for reliable caching
- **Standardized format** for consistent AI interaction

## 🏢 Business Use Cases

### Design System Teams

- **Distribute components** without npm publishing
- **Version control** with semantic versioning
- **Private registries** for internal components
- **Zero-fetch installs** work offline

### Development Teams

- **One-line installation** of components
- **No build tool configuration** needed
- **Automatic dependency management**
- **Live demos and documentation**

### AI/LLM Applications

- **MCP-ready format** for AI consumption
- **Structured metadata** for reasoning
- **Content-addressed** for reliable caching
- **Zero network dependencies**

## 🔮 Future Enhancements

### Planned Features

- **Component marketplace** with discovery and ratings
- **Advanced analytics** for component usage
- **Automated testing** and validation
- **Multi-framework support** (Vue, Svelte, Angular)
- **Design tool integration** (Figma, Sketch)

### Enterprise Features

- **SSO integration** for private registries
- **Audit logs** for compliance
- **Custom branding** for white-label solutions
- **On-premise deployment** options

## 📚 Related Documentation

- [DCP Protocol Specification](../dcp-spec/README.md)
- [CLI Reference](./CLI_REFERENCE.md)
- [API Documentation](./API_REFERENCE.md)
- [MCP Integration](./mcp-integration.md)
- [GitHub Action](./github-action.md)

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](../CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.

---

**Component Packs** transform your design system into a distributable, installable ecosystem with zero network dependencies. 🚀 