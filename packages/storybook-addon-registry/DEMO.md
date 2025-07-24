# 🚀 DCP Storybook Addon Demo

This demo showcases the DCP Registry Explorer addon in action with a live Storybook setup.

## Quick Demo

1. **Start DCP Watch with WebSocket**
   ```bash
   # From the main DCP-Transformer directory
   npm run dcp -- watch ./packages/storybook-addon-registry/demo/src --ws 8080
   ```

2. **Start the Demo Storybook**
   ```bash
   # In a new terminal
   cd packages/storybook-addon-registry/demo
   npm install
   npm run storybook
   ```

3. **See Live Updates**
   - Open Storybook at http://localhost:6006
   - Check the "DCP Registry" panel on the right
   - Edit `demo/src/Button.tsx` or `demo/src/Button.css` and watch live updates

## What You'll See

### 🟢 Live Connection
The addon automatically connects to `ws://localhost:8080` and shows:
- Connection status (🟢 Live / 🟡 Connecting / 🔴 Error)
- Registry statistics (component count, token count)
- Real-time update timestamps

### 🎨 Token Visualization
Browse extracted design tokens from `Button.css`:
- **Colors**: `--color-primary`, `--color-danger`, etc.
- **Spacing**: `--spacing-xs`, `--spacing-md`, etc. 
- **Typography**: `--font-size-sm`, `--font-size-lg`, etc.
- **Other**: `--radius-sm` and more

### 🧱 Component Explorer
See the Button component analysis:
- **Props**: variant, size, label, disabled, onClick
- **Types**: TypeScript interfaces with required indicators
- **File Path**: Quick reference to source location
- **Token Usage**: Which tokens the component consumes

### ⚡ Live Updates
Try editing the demo components:
- Add a new CSS custom property → See it appear in tokens
- Change a prop interface → Watch the component explorer update
- Add a new component → See the component count increase

## Demo Components

- **Button**: Primary demo component with variants, sizes, and CSS tokens
- **Button.stories.tsx**: Comprehensive Storybook stories
- **Button.css**: CSS custom properties for design tokens

## Troubleshooting

### WebSocket Connection Issues
- Ensure `dcp watch --ws 8080` is running first
- Check the console for connection errors
- Try a different port if 8080 is in use

### No Token/Component Updates
- Verify the watch command is pointing to `demo/src` directory
- Check that file changes are being detected by DCP watch
- Look for extraction errors in the terminal running `dcp watch`

## Next Steps

After running the demo:
1. Try integrating the addon with your existing Storybook
2. Point `dcp watch` at your actual component library
3. Customize the addon for your design token naming conventions

## Architecture

The demo shows the complete pipeline:
```
Component Files → DCP Watch → WebSocket → Storybook Addon → Live UI
     ↓              ↓          ↓            ↓
   Button.tsx → extract-v2 → ws://8080 → Registry Panel
   Button.css → tokenize → live updates → Token Tree
```