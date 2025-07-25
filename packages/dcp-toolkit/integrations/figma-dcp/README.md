# DCP Figma Plugin - Design System Bridge

Sync design tokens between Figma and code, validate designs against your component library.

## 🎯 Features

- 🔗 **Connect to DCP** - Sync with local or cloud DCP registry
- 🎨 **Token Sync** - Import design tokens as Figma Variables  
- ✅ **Design Validation** - Check layers against design system rules
- 🔄 **Two-way Sync** - Keep Figma Variables in sync with code tokens
- 📊 **Usage Reports** - See which components are used where

## 🚀 Quick Start

### 1. Install in Figma

**Development Mode:**
```bash
# Clone and build
git clone https://github.com/stevewitmer/dcp-transformer.git
cd dcp-transformer/integrations/figma-dcp
npm install
npm run build

# Import in Figma
# 1. Open Figma Desktop
# 2. Menu → Plugins → Development → Import plugin from manifest
# 3. Select manifest.json from this directory
```

**Production Mode:** 
- Install from Figma Community (coming soon)

### 2. Connect to DCP Registry

1. **Start DCP API Server:**
   ```bash
   # In your project directory
   dcp extract ./src --out ./registry
   dcp api --registry ./registry --port 7401
   ```

2. **Open Plugin in Figma:**
   - Menu → Plugins → DCP Design System
   - Enter API URL: `http://localhost:7401/api/v1`
   - Click "Connect to DCP"

### 3. Sync Tokens

1. Click **"Sync Design Tokens"**
2. Tokens are imported as Figma Variables
3. Use Variables panel to apply tokens to your designs

### 4. Validate Designs

1. Select layers in your design
2. Click **"Validate Selection"**
3. See validation results in plugin panel

## 📋 Workflow Examples

### Designer Workflow

```
1. 🎨 Design in Figma using DCP Variables
2. ✅ Validate layers against component API
3. 🔄 Sync new tokens back to code registry
4. 🚀 Handoff validated designs to developers
```

### Developer Workflow  

```
1. 💻 Update design tokens in code
2. 🔄 Re-extract registry: dcp extract ./src
3. 📡 Figma plugin auto-syncs new tokens
4. ✅ Designer validates designs still work
```

### CI/CD Integration

```yaml
# .github/workflows/design-tokens.yml
- name: Validate Figma designs
  run: |
    # Export Figma file via API
    curl "https://api.figma.com/v1/files/$FIGMA_FILE_ID" \
      -H "X-FIGMA-TOKEN: $FIGMA_TOKEN" > figma-export.json
    
    # Validate against DCP registry
    npx dcp validate-figma figma-export.json --registry ./registry
```

## 🎨 Token Mapping

The plugin automatically maps DCP tokens to Figma Variables:

| DCP Token Type | Figma Variable Type | Example |
|----------------|---------------------|---------|
| `color` | `COLOR` | `#3b82f6` → Figma color variable |
| `spacing` | `FLOAT` | `1rem` → `16` (pixels) |
| `typography` | `STRING` | `Inter Bold 16px` → Text string |
| `border` | `FLOAT` | `2px` → `2` (pixels) |

### Token Categories Supported

- ✅ **Colors** - Backgrounds, text, borders
- ✅ **Spacing** - Padding, margins, gaps  
- ✅ **Typography** - Font sizes, line heights
- ✅ **Borders** - Border widths, radius
- 🔮 **Shadows** - Box shadows *(coming soon)*
- 🔮 **Animations** - Transitions *(coming soon)*

## ✅ Validation Rules

### Color Validation
```
❌ Layer uses #ff0000 but no matching color token found
✅ Layer uses primary-500 (#3b82f6) - token exists
💡 Did you mean primary-600 (#2563eb)?
```

### Typography Validation  
```
❌ Text uses 18px but no matching typography token
✅ Text uses text-lg (18px) - token exists
💡 Suggested sizes: text-base (16px), text-xl (20px)
```

### Spacing Validation
```
❌ Frame has 12px padding but no matching spacing token  
✅ Frame uses spacing-3 (12px) - token exists
💡 Available: spacing-2 (8px), spacing-4 (16px)
```

## 🔧 Configuration

### API Connection

**Local Development:**
```
URL: http://localhost:7401/api/v1
```

**Cloud DCP Instance:**
```  
URL: https://your-dcp-instance.com/api/v1
```

### Token Collection Settings

The plugin creates a "DCP Design Tokens" collection in Figma Variables. You can:
- Rename the collection
- Organize tokens into groups
- Set up modes for light/dark themes

### Validation Sensitivity

```typescript
// Customize validation rules
const validationConfig = {
  colorTolerance: 5,      // Allow 5% color difference
  spacingTolerance: 2,    // Allow 2px spacing difference
  typographyStrict: true  // Exact typography matches only
};
```

## 🛠️ Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# Start development
npm run watch

# Build for production  
npm run build
```

### File Structure

```
figma-dcp/
├── manifest.json       # Figma plugin manifest
├── ui.html            # Plugin UI (iframe)
├── src/
│   └── code.ts        # Main plugin logic
├── code.js            # Compiled output
└── README.md          # This file
```

### Debugging

**Plugin Console:**
1. Figma → Menu → Plugins → Development → Open Console
2. View console.log() output from code.ts

**UI Console:**  
1. Right-click plugin UI → Inspect
2. View browser console for UI errors

### Testing

```bash
# Test with real DCP registry
dcp extract ./test-components --out ./test-registry
dcp api --registry ./test-registry --port 7401

# Import plugin and test features
# 1. Connect to http://localhost:7401/api/v1
# 2. Sync tokens
# 3. Create test layers
# 4. Validate selection
```

## 🐛 Troubleshooting

### Connection Issues

**"Network error - is the DCP API server running?"**
```bash
# Check if DCP API is running
curl http://localhost:7401/api/v1/health

# If not, start it:
dcp api --registry ./registry --port 7401
```

**"HTTP 404: Not Found"**
- Ensure registry exists: `ls -la ./registry/`
- Re-extract if needed: `dcp extract ./src --out ./registry`

### Token Sync Issues

**"No tokens available"**
- Check registry has tokens: `cat ./registry/registry.json | jq '.tokens'`
- Extract with tokens: `dcp extract ./src --tokens ./design-tokens.json`

**"Variables not appearing in Figma"**
- Check Variables panel: Design → Variables  
- Look for "DCP Design Tokens" collection
- Refresh Figma if needed

### Validation Issues

**"No issues found" but colors look wrong**
- Colors must match exactly (case-sensitive hex values)
- Check token format: `#ff0000` vs `#FF0000`
- Use DCP API to validate: `curl http://localhost:7401/api/v1/registry/tokens/color`

**Performance slow with large files**
- Page validation is limited to 100 layers
- Use "Validate Selection" for specific areas
- Consider breaking large designs into multiple pages

## 🔗 Integration Examples

### Figma API Integration

```typescript
// Export Figma file and validate
const figmaExport = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
  headers: { 'X-FIGMA-TOKEN': figmaToken }
});

const dcpValidation = await fetch('http://localhost:7401/api/v1/validate-figma', {
  method: 'POST',
  body: JSON.stringify(figmaExport)
});
```

### Design System Documentation

```markdown
## Using DCP Tokens in Figma

1. Install DCP Figma Plugin
2. Connect to your project's DCP registry  
3. Sync tokens to Figma Variables
4. Apply variables to layers:
   - Colors: Fill → Variable → primary-500
   - Spacing: Padding → Variable → spacing-4
   - Typography: Text → Variable → text-lg
```

### Storybook Integration

```typescript
// Generate Figma links in Storybook stories
export default {
  component: Button,
  parameters: {
    design: {
      type: 'figma',
      url: 'https://figma.com/file/abc123?node-id=1%3A2',
      dcpValidated: true // Indicates DCP validation passed
    }
  }
};
```

## 📈 Analytics & Insights

### Token Usage Reports

The plugin tracks which tokens are used where:
```typescript
const usage = await fetch('http://localhost:7401/api/v1/analytics/figma-usage');
// Returns: { tokenName: 'primary-500', usageCount: 23, layers: [...] }
```

### Design System Compliance

```typescript
const compliance = await fetch('http://localhost:7401/api/v1/analytics/compliance');
// Returns: { compliantLayers: 87, totalLayers: 100, score: 87% }
```

## 🎯 Roadmap

- 🔮 **Batch validation** - Validate entire Figma team libraries
- 🔮 **Auto-fix suggestions** - "Apply suggested token" buttons
- 🔮 **Theme switching** - Light/dark mode variable sets
- 🔮 **Component validation** - Validate Figma components against React props
- 🔮 **Design QA reports** - Automated design system compliance reports

## 📄 License

MIT © [Steve Witmer](https://github.com/stevewitmer)

---

**Need help?** [Open an issue](https://github.com/stevewitmer/dcp-transformer/issues) or check the [main documentation](https://github.com/stevewitmer/dcp-transformer#readme).