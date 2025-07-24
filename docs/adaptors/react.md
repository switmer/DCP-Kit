# React TSX Adaptor

The React TSX adaptor handles TypeScript React components with JSX, supporting modern React patterns and comprehensive barrel file resolution.

## Features

- **Component Detection**: Function declarations, arrow functions, default exports
- **TypeScript Support**: Full prop interface extraction with type information
- **HOC Unwrapping**: Handles `forwardRef`, `memo`, and other higher-order components
- **Barrel Resolution**: Recursive barrel file following with cycle detection
- **CVA Integration**: Class Variance Authority variant detection
- **Design Token Extraction**: CSS modules, CSS-in-JS, and CSS variables

## Supported Patterns

### Function Components

```tsx
// Named export function
export function Button({ children }: ButtonProps) {
  return <button>{children}</button>;
}

// Arrow function const
export const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div className="card">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
};

// Default export
export default function Modal({ isOpen, children }: ModalProps) {
  return isOpen ? <div className="modal">{children}</div> : null;
}
```

### Higher-Order Components

```tsx
// forwardRef pattern
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ type = 'text', ...props }, ref) => {
    return <input ref={ref} type={type} {...props} />;
  }
);

// memo wrapper
export const ExpensiveComponent = memo(({ data }: Props) => {
  return <div>{data.map(item => <Item key={item.id} {...item} />)}</div>;
});
```

## Barrel File Resolution

The adaptor automatically follows barrel files (re-export patterns) to discover all components in a codebase.

### Supported Export Patterns

```typescript
// Named exports
export { Button } from './Button';
export { Card } from './Card';

// Aliased exports
export { Button as PrimaryButton } from './Button';
export { Card as ContentCard } from './Card';

// Wildcard re-exports
export * from './components';
export * from './forms';

// Mixed patterns
export { default as DefaultButton } from './Button';
export * from './Card';
```

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--barrels` | Enable/disable barrel resolution | `true` |
| `--no-barrels` | Disable barrel following | - |
| `--max-depth <n>` | Maximum recursion depth | `10` |
| `--trace-barrels` | Enable verbose barrel tracing | `false` |

### Examples

```bash
# Extract with barrel resolution (default)
dcp extract ./src --adaptor react-tsx --json

# Disable barrel following
dcp extract ./src --no-barrels --json

# Debug barrel resolution
dcp extract ./src --trace-barrels --max-depth 5

# Custom depth limit for very deep hierarchies
dcp extract ./src --max-depth 15
```

### Trace Output Example

With `--trace-barrels` enabled:

```
[dcp:barrel] index.ts → components/index.ts
[dcp:barrel]   Resolving ./Button → /path/to/Button.tsx
[dcp:barrel]   Found Button → Button
[dcp:barrel]   Found Button → PrimaryButton
[dcp:barrel]   Re-exported 2 components via wildcard
[dcp:barrel] Using cached AST for Card.tsx
```

## Performance & Caching

### AST Caching

The adaptor uses a shared AST cache (`core/graphCache.js`) to prevent reparsing files during barrel resolution:

- **Cache Hit**: ~1ms per component
- **Cache Miss**: ~10-50ms per file (varies by size)
- **Memory Usage**: ~2-5MB per 100 cached files

### Deduplication Strategy

When the same component is found via multiple paths:

1. **Direct components** preferred over barrel re-exports
2. **Named exports** preferred over default exports
3. **Canonical sources** preferred over aliases

## Configuration

The adaptor accepts these options:

```javascript
const adaptor = new ReactTSXAdaptor({
  followBarrels: true,        // Enable barrel resolution
  maxDepth: 10,              // Maximum recursion depth
  traceBarrels: false,       // Debug tracing
  verbose: false,            // General verbose output
  includeDefaultExports: true, // Include default exports
  unwrapHOCs: true           // Unwrap forwardRef/memo
});
```

## Troubleshooting

### No Components Found

- **Check file extensions**: Ensure files are `.tsx`, `.jsx`, `.ts`, or `.js`
- **Verify React imports**: Components should import React or use JSX
- **Component naming**: Components must start with uppercase letter

### Barrel Resolution Issues

- **Increase max depth**: Large codebases may need `--max-depth 20`
- **Check circular imports**: Use `--trace-barrels` to debug cycles
- **Missing files**: Ensure all barrel targets exist and are accessible

### Performance Issues

- **Reduce max depth**: Lower `--max-depth` if extraction is slow
- **Disable barrels**: Use `--no-barrels` for fastest extraction
- **File size**: Very large components (>1MB) may be slow to parse

### Common Patterns

```bash
# Fast extraction (no barrels)
dcp extract ./src --no-barrels --json

# Deep monorepo extraction
dcp extract ./packages --max-depth 20 --trace-barrels

# Debug missing components
dcp extract ./src --trace-barrels --verbose
```

## Integration Notes

### With Storybook

When used with Storybook integration:

- Barrel resolution shows **canonical file paths** in the component tree
- Aliases are displayed as tooltips: `PrimaryButton (alias of Button)`
- Stories are automatically linked to canonical components

### With Watch Mode

Barrel resolution integrates with `dcp watch`:

- **File changes** invalidate AST cache automatically
- **Barrel structure changes** trigger full re-extraction
- **Performance** remains fast due to incremental updates

### With Other Adaptors

The barrel resolution system is:

- **Framework agnostic**: Vue and Svelte adaptors can reuse the same resolver
- **Cache shared**: AST cache works across all adaptors
- **Configurable**: Each adaptor can have different barrel settings

## Technical Details

### AST Parsing

Uses Babel with these plugins:
- `typescript` - TypeScript syntax support
- `jsx` - JSX transformation
- `decorators-legacy` - Decorator support
- `classProperties` - Class property syntax
- `objectRestSpread` - Object spread operator
- `optionalChaining` - Optional chaining operator
- `nullishCoalescingOperator` - Nullish coalescing

### File Resolution

Module resolution follows Node.js conventions:

1. **Exact match**: `./Button.tsx`
2. **With extensions**: `./Button` → `./Button.tsx`, `./Button.ts`
3. **Index files**: `./components` → `./components/index.tsx`
4. **Directory index**: `./Button` → `./Button/index.tsx`

### Cycle Detection

Prevents infinite recursion via:

- **Visited file set**: Tracks files in current resolution chain
- **Depth limiting**: Maximum recursion depth (default 10)
- **Cache invalidation**: Clears visited set after each top-level extraction

This design ensures safe, performant barrel resolution for codebases of any size.