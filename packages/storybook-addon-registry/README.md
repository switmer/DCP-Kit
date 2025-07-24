# DCP Registry Explorer for Storybook

**Live design system introspection directly in Storybook.**

This addon connects to your DCP-Transformer registry and provides real-time visualization of components, tokens, and design system health.

## ✨ Features

- **Live Registry Updates** - See changes instantly as you modify components
- **Token Visualization** - Browse design tokens with live previews
- **Component Explorer** - View component props, token usage, and metadata
- **WebSocket Connection** - Real-time updates with connection status
- **Zero Configuration** - Works out of the box with `dcp watch --ws`

## 🚀 Quick Start

### 1. Install the Addon

```bash
npm install --save-dev @dcp/storybook-addon-registry
```

### 2. Add to Storybook

**.storybook/main.js**
```javascript
module.exports = {
  addons: [
    '@dcp/storybook-addon-registry'
  ]
};
```

### 3. Start DCP Watch with WebSocket

```bash
# In your project directory
dcp watch ./src --ws

# Or with custom port
dcp watch ./src --ws 8080
```

### 4. Open Storybook

The "DCP Registry" panel will appear in your Storybook sidebar, showing live updates from your registry.

## 📖 Usage

### Live Token Updates

1. Start `dcp watch --ws` in your project
2. Open Storybook and navigate to the "DCP Registry" panel
3. Modify component files or design tokens
4. Watch the registry update in real-time

### Token Visualization

- **Colors**: Live color swatches next to hex/rgb values
- **Dimensions**: Clear display of spacing, sizing tokens
- **Typography**: Font family and size token browsing
- **Categories**: Organized by token groups (colors, spacing, etc.)

### Component Explorer

- **Props**: View all component props with types and required indicators
- **Token Usage**: See which tokens each component uses
- **File Paths**: Quick reference to component source files
- **Categories**: Browse by component type (buttons, forms, etc.)

## ⚙️ Configuration

### Custom WebSocket Port

If you're running DCP watch on a custom port:

```bash
dcp watch ./src --ws 9000
```

The addon will automatically attempt to connect to `ws://localhost:9000`.

### Connection Status

The addon displays connection status in the panel header:
- 🟢 **Live** - Connected and receiving updates
- 🟡 **Connecting...** - Attempting to connect
- 🔴 **Error** - Connection failed or lost

## 🎯 Demo & Screenshots

![DCP Registry Panel](./screenshots/panel-overview.png)

*Live registry updates with token visualization and component explorer*

## 📋 Requirements

- Storybook 7.0+ or 8.0+
- DCP-Transformer with `watch` command
- React components (Vue/Svelte support coming soon)

## 🤝 Contributing

This addon is part of the [DCP-Transformer](https://github.com/stevewitmer/dcp-transformer) ecosystem.

## 📜 License

MIT - see [LICENSE](../../LICENSE)