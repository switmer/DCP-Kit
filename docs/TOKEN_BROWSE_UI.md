# Token Support in Browse UI

## Status: IN PROGRESS

### ✅ Completed (v3.0.4-alpha)
- **build-packs.js**: Extracts tokens from registry and adds to `index.json`
  - Flattens token hierarchy (category → tokens)
  - Each token: `{ name, category, type, value, description, url }`
  - Components now have explicit `type: 'component'` field

### 🚧 In Progress
- **browse.js**: Update to load and render tokens
  - Load `indexData.tokens` alongside components
  - Combine into `allItems` array with `itemType` field
  - Update filters to support "Components" vs "Tokens"
  - Render token cards with visual previews

### 📋 TODO
1. **Token Card Rendering**
   - Color tokens: Show color swatch
   - Spacing tokens: Show size visualization
   - Typography tokens: Show font preview
   - Generic tokens: Show value as text

2. **Token Modal**
   - Display token value prominently
   - Show CSS variable name (`--token-name`)
   - Show usage examples
   - Copy button for CSS var

3. **Filters**
   - "All", "Components", "Tokens" type filter
   - Token sub-filters: "Colors", "Spacing", "Typography"
   - Update facet counts

4. **CSS Styling**
   - `.token-card` styles
   - Color swatch (`.token-swatch`)
   - Spacing visualization (`.token-spacing`)
   - Token modal styles

## Token Data Structure

### Input (registry.json)
```json
{
  "tokens": {
    "primary": {
      "primary-1": { "value": "#eff6ff", "type": "color", "description": "..." },
      "primary-2": { "value": "#dbeafe", "type": "color", "description": "..." }
    },
    "spacing": {
      "spacing-1": { "value": "4px", "type": "spacing", "description": "..." }
    }
  }
}
```

### Output (index.json)
```json
{
  "tokens": [
    {
      "name": "primary-1",
      "category": "primary",
      "type": "color",
      "value": "#eff6ff",
      "description": "MUI primary color - 1",
      "url": "/tokens/primary/primary-1"
    }
  ]
}
```

### Rendered (browse.js)
```javascript
{
  name: "primary-1",
  category: "primary",
  type: "color",
  value: "#eff6ff",
  description: "MUI primary color - 1",
  url: "/tokens/primary/primary-1",
  itemType: "token" // Added by browse.js
}
```

## Implementation Plan

### Phase 1: Basic Token Display (30 min)
- Update `renderGrid()` to handle tokens
- Create `renderTokenCard()` function
- Show token name, type, value (text only)
- No visual previews yet

### Phase 2: Visual Previews (1 hour)
- Color swatches for `type: 'color'`
- Spacing bars for `type: 'spacing'`
- Font previews for `type: 'typography'`

### Phase 3: Filters (30 min)
- Add "Components" / "Tokens" toggle
- Update facet counts
- Filter by token type (color, spacing, etc.)

### Phase 4: Token Modal (30 min)
- Show token details
- CSS variable format
- Copy button
- Usage examples

**Total Estimate: 2.5-3 hours**

## Next Steps

1. **Test current state**: Rebuild packs and verify `index.json` has tokens
2. **Implement Phase 1**: Basic token cards (text only)
3. **Test**: Verify tokens appear in grid
4. **Implement Phase 2-4**: Visual previews, filters, modal

## User Request Context

User said: "Yes. Need token support - think we already parse it?"

**Answer**: YES! We extract tokens during `dcp extract`, store them in `registry.json`, and now `build-packs` includes them in `index.json`. The Browse UI just needs to render them.

