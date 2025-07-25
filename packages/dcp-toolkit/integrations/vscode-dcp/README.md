# DCP Design System Extension for VS Code

> **⚠️ Status: Experimental MVP (July 2025)**  
> • This extension currently provides **status-bar registry detection, live diagnostics on save, and basic token/variant completions** for `.tsx`/`.jsx` files.  
> • Hover previews, quick-fixes, Vue/Svelte support, and WebSocket hot-reload are **on the roadmap** but **not implemented yet**.  
> • The goal is *developer enablement*; for designer-first flows we are focusing next on the Figma plugin and web playground demos.  
> Contributions / bug reports welcome—see the **Roadmap** section at the end of this file.

Real-time design system validation and autocomplete for React, Vue, and Svelte components.

## 🚀 Features

- ✅ **Live Validation** - Red squiggles for design system violations
- 💡 **Smart Autocomplete** - Component props, variants, and design tokens
- 🎨 **Token Previews** - Hover to see color swatches and token values  
- 📚 **Component Docs** - Inline documentation and usage examples
- 🔄 **Hot Reload** - Auto-refresh when registry changes
- 🛠️ **Quick Fixes** - "Did you mean..." suggestions

## 📦 Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "DCP Design System"
4. Click Install

### From VSIX Package
```bash
# Build the extension
cd integrations/vscode-dcp
npm install
npm run compile
npm run package

# Install the .vsix file
code --install-extension vscode-dcp-0.1.0.vsix
```

## ⚙️ Setup

### 1. Create DCP Registry

If you don't have a DCP registry yet:

```bash
# Install DCP globally
npm install -g dcp-transformer

# Extract your design system
dcp extract ./src --out ./registry
```

### 2. Configure Extension

The extension automatically discovers your registry. You can customize settings in VS Code:

**File → Preferences → Settings → Search "DCP"**

```json
{
  "dcp.registryPath": "./registry",
  "dcp.apiUrl": "http://localhost:7401/api/v1",
  "dcp.enableValidation": true,
  "dcp.validationTrigger": "onSave",
  "dcp.enableAutoComplete": true,
  "dcp.validationLevel": "error"
}
```

### 3. Start DCP API (Optional)

For enhanced features, run the DCP API server:

```bash
dcp api --registry ./registry --port 7401
```

## 🎯 Usage

### Component Autocomplete
```tsx
// Type component name and get autocomplete
<But|  // Shows: Button, ButtonGroup, etc.

// Type prop name and get valid options  
<Button variant="|  // Shows: primary, secondary, ghost, outline
```

### Token Validation
```tsx
// Invalid tokens get red squiggles
<div className="bg-purple-850">  // ❌ Token not found
<div className="bg-purple-800">  // ✅ Valid token
```

### Hover Previews
```tsx
// Hover over tokens to see values
<div className="bg-primary-500">
//                ^^^^^^^^^^^^ 
// 💡 Shows: [Blue swatch] "hsl(222, 47%, 11%)"
```

### Command Palette

- **DCP: Validate Current File** - Manual validation
- **DCP: Refresh Registry** - Reload design system
- **DCP: Open Registry** - View registry file
- **DCP: Extract Registry** - Run extraction wizard

## 🔧 Configuration

### Registry Sources

**Local Registry (Default)**
```json
{
  "dcp.registryPath": "./registry"
}
```

**Remote DCP API**
```json
{
  "dcp.apiUrl": "http://localhost:7401/api/v1"
}
```

**Cloud DCP Registry**
```json
{
  "dcp.apiUrl": "https://your-dcp-instance.com/api/v1"
}
```

### Validation Settings

**Trigger Options:**
- `onSave` - Validate when file is saved (default)
- `onType` - Validate as you type (may impact performance)
- `manual` - Only validate via command palette

**Severity Levels:**
- `error` - Show only errors (default)
- `warning` - Show errors and warnings
- `info` - Show errors, warnings, and suggestions

### Performance Settings

```json
{
  "dcp.autoRefresh": true,           // Auto-reload registry on changes
  "dcp.enableHoverPreviews": true,   // Show token previews on hover
  "dcp.enableAutoComplete": true     // Enable smart autocomplete
}
```

## 📋 Supported File Types

- **TypeScript React** (`.tsx`)
- **JavaScript React** (`.jsx`) 
- **TypeScript** (`.ts`)
- **JavaScript** (`.js`)
- **Vue** (`.vue`) *Coming Soon*
- **Svelte** (`.svelte`) *Coming Soon*

## 🛠️ Development

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/stevewitmer/dcp-transformer.git
cd dcp-transformer/integrations/vscode-dcp

# Install dependencies
npm install

# Start development
npm run watch
```

### Testing the Extension

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. Open a React project with DCP registry
4. Test features in the new VS Code window

### Building

```bash
# Compile TypeScript
npm run compile

# Package extension
npm run package

# Publish to marketplace
npm run publish
```

## 🐛 Troubleshooting

### Extension Not Loading

**Check Output Panel:**
1. View → Output
2. Select "DCP Design System" from dropdown
3. Look for error messages

**Common Issues:**
- No workspace folder found
- Registry path doesn't exist
- DCP API server not running

### Validation Not Working

**Verify Registry:**
```bash
# Check registry exists
ls -la ./registry/

# Should see: registry.json, components/, tokens/
```

**Test API Connection:**
```bash
curl http://localhost:7401/api/v1/health
```

### Autocomplete Not Showing

**Check Language Mode:**
- File should be recognized as TypeScript React (`.tsx`)
- Look at bottom-right corner of VS Code for language mode

**Reset Extension:**
1. Command Palette → "Developer: Reload Window"
2. Or restart VS Code entirely

### Performance Issues

**Reduce Validation Frequency:**
```json
{
  "dcp.validationTrigger": "onSave",  // Instead of "onType"
  "dcp.enableHoverPreviews": false    // Disable if slow
}
```

## 📚 Examples

### React Component with Full DCP Support

```tsx
import React from 'react';

// Component autocomplete works here
export const UserCard = () => {
  return (
    <Card 
      variant="outlined"        // ✅ Autocompleted variant
      className="p-4"          // ✅ Valid spacing token
      background="surface"     // ✅ Valid color token
    >
      <Button 
        size="lg"              // ✅ Valid size
        variant="primary"      // ✅ Valid variant
        onClick={() => {}}
      >
        Save Changes
      </Button>
    </Card>
  );
};
```

### CSS with Token Validation

```css
.custom-component {
  background: var(--color-primary-500);  /* ✅ Valid token */
  padding: var(--spacing-4);             /* ✅ Valid token */
  color: var(--color-invalid-token);     /* ❌ Invalid token */
}
```

## 🔗 Related

- [DCP Transformer](https://github.com/stevewitmer/dcp-transformer) - Main CLI tool
- [DCP GitHub Action](../github-action/) - CI validation
- [DCP Figma Plugin](../figma-plugin/) - Design-code sync
- [API Documentation](../../docs/API_QUICKSTART.md) - REST API reference

## 📄 License

MIT © [Steve Witmer](https://github.com/stevewitmer)

---

**Need help?** [Open an issue](https://github.com/stevewitmer/dcp-transformer/issues) or check the [documentation](https://github.com/stevewitmer/dcp-transformer#readme).