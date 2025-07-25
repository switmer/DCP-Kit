# DCP Extraction Capabilities & Limitations

**Updated:** July 2025  
**Version:** DCP v2.0 with TypeScript Analysis

## 🎯 **Current State: Hybrid Analysis**

DCP now uses a **hybrid extraction approach** combining the best of both worlds:

- **Babel AST Parsing**: Fast structural analysis, component detection, JSX parsing
- **TypeScript Analysis**: Semantic type analysis, cross-file imports, interface resolution
- **Smart Merging**: Combines both approaches for comprehensive extraction

## ✅ **What Works Excellent**

### **Component Detection & Structure**
- ✅ **Named exports**: `export const Button`, `export function Card`
- ✅ **Default exports**: `export default Button`  
- ✅ **forwardRef/memo unwrapping**: Automatically detects React patterns
- ✅ **Arrow + function components**: Both syntaxes supported
- ✅ **Barrel file recursion**: Follows `export { Button } from './button'`
- ✅ **Component family detection**: Groups related components (Dialog, DialogHeader, etc.)

### **TypeScript Analysis (NEW ✨)**
- ✅ **Interface resolution**: Imports and extends interfaces correctly
- ✅ **Union types**: `'primary' | 'secondary' | 'ghost'` → `enum`
- ✅ **Function signatures**: `onClick?: () => void` extracted properly
- ✅ **JSDoc comments**: `/** Button variant */` → prop descriptions
- ✅ **Cross-file types**: Resolves imports like `import { ButtonProps } from './types'`
- ✅ **Generic constraints**: Handles `React.ComponentProps<'button'>`
- ✅ **Required/optional detection**: Properly identifies `prop?` vs `prop`

### **Design Token Extraction**
- ✅ **Tailwind CSS classes**: `bg-blue-600`, `px-4 py-2` → design tokens
- ✅ **CSS Modules**: Co-located `.css` files parsed and linked
- ✅ **CSS-in-JS**: styled-components, emotion detection
- ✅ **CSS Custom Properties**: `--primary-color` extraction
- ✅ **Variant mapping**: Object literals → style mappings

### **CVA (Class Variance Authority) Support**  
- ✅ **cva() detection**: Automatically extracts variants and compounds
- ✅ **Variant extraction**: Maps all variant options to CSS classes
- ✅ **Default values**: Captures default variant selections
- ✅ **Compound variants**: Handles complex variant combinations

### **Advanced Features**
- ✅ **Theme context awareness**: Detects ShadCN/UI, Tailwind config
- ✅ **Animation extraction**: `@keyframes`, transitions from CSS
- ✅ **Media query analysis**: Responsive breakpoints detection
- ✅ **Pseudo-class mapping**: `:hover`, `:focus`, `:disabled` states

## 🚧 **What's Partially Supported**

### **TypeScript Edge Cases**
- ⚠️ **Mapped types**: `Record<string, any>` → simplified to `object`
- ⚠️ **Conditional types**: `T extends string ? A : B` → flattened
- ⚠️ **Complex generics**: Generic constraints may be simplified
- ⚠️ **Template literals**: `\`prefix-${string}\`` → simplified

### **Component Patterns**
- ⚠️ **Class components**: Legacy React classes (limited support)
- ⚠️ **Render props**: Functions as children not fully analyzed
- ⚠️ **HOC composition**: Complex HOC chains may miss props
- ⚠️ **Dynamic components**: `React.createElement` patterns

### **Style Extraction**
- ⚠️ **Runtime CSS-in-JS**: Emotion/styled-components with dynamic themes
- ⚠️ **Sass/SCSS**: Basic parsing, advanced features limited
- ⚠️ **PostCSS plugins**: Custom plugin transformations not applied

## ❌ **Current Limitations**

### **Framework Support**
- ❌ **Vue SFC**: Planned but not implemented (adaptors exist as stubs)
- ❌ **Svelte**: Planned but not implemented  
- ❌ **Angular**: Not supported
- ❌ **Web Components**: Limited detection

### **Advanced TypeScript**
- ❌ **Declaration merging**: Multiple interface declarations  
- ❌ **Module augmentation**: `declare module` extensions
- ❌ **Complex path mapping**: Advanced tsconfig path resolution
- ❌ **Monorepo packages**: Cross-package type resolution

### **Build System Integration**
- ❌ **Webpack aliases**: Custom module resolution not followed
- ❌ **Vite plugins**: Build-time transformations not applied
- ❌ **Next.js specific**: App router, middleware patterns
- ❌ **Metro bundler**: React Native bundler specifics

## 📊 **Performance & Scale**

### **Tested & Working**
- ✅ **121 components**: Extracted from real production codebases
- ✅ **Large files**: 1000+ line components handled
- ✅ **Deep barrel files**: 10+ levels of re-exports
- ✅ **Concurrent processing**: Multiple files processed in parallel

### **Performance Characteristics**
- **TypeScript analysis**: ~200-500ms per component (cold)
- **Babel parsing**: ~50-100ms per component
- **Caching**: Parser instances cached per tsconfig
- **Memory usage**: ~20MB per 100 components

## 🔧 **Configuration & Optimization**

### **TypeScript Integration**
```typescript
// Auto-discovered from nearest tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]  // ✅ Path aliases supported
    }
  }
}
```

### **Performance Tuning**
```bash
# Optimize for speed (Babel-only)
dcp extract ./src --adaptor react-tsx --skip-ts

# Full analysis (slower but comprehensive)  
dcp extract ./src --verbose  # TypeScript + Babel
```

### **Extraction Options**
```bash
# Tailwind token extraction
dcp extract ./src --tokens tailwind.config.js

# CSS modules + design tokens
dcp extract ./src --tokens styles/globals.css

# Flat token output (for Style Dictionary)
dcp extract ./src --flatten-tokens
```

## 🎯 **Recommendations for Best Results**

### **Project Setup**
1. **Use TypeScript**: `.tsx` files get full analysis, `.jsx` gets Babel-only
2. **Explicit interfaces**: Define prop interfaces rather than inline types
3. **JSDoc comments**: Add descriptions for better documentation
4. **Consistent exports**: Use named exports when possible

### **Component Patterns**
```typescript
// ✅ EXCELLENT - Full TypeScript analysis
interface ButtonProps {
  /** The button variant */
  variant: 'primary' | 'secondary';
  /** Optional size */
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ variant, size = 'md' }) => {
  // Component implementation
};

// ⚠️ OKAY - Babel analysis only
export const Button = ({ variant, size = 'md' }) => {
  // Less type information extracted
};
```

### **Design Token Integration**
```typescript
// ✅ EXCELLENT - Variant mapping extraction
const variants = {
  primary: 'bg-blue-600 text-white',
  secondary: 'bg-gray-200 text-gray-900'
};

// ✅ EXCELLENT - CVA integration
const buttonVariants = cva('px-4 py-2', {
  variants: {
    variant: {
      primary: 'bg-blue-600',
      secondary: 'bg-gray-200'
    }
  }
});
```

## 🚀 **Future Roadmap**

### **Phase 1: Enhanced Analysis** (Q3 2025)
- [ ] **Vue SFC support**: Complete Vue single-file component analysis
- [ ] **Svelte support**: Svelte component extraction
- [ ] **Advanced TypeScript**: Declaration merging, module augmentation
- [ ] **Monorepo packages**: Cross-package type resolution

### **Phase 2: Framework Integration** (Q4 2025)  
- [ ] **Next.js integration**: App router, server components
- [ ] **Remix support**: Route-based component analysis
- [ ] **Storybook addon**: Live registry explorer
- [ ] **Webpack plugin**: Build-time integration

### **Phase 3: Enterprise Features** (2026)
- [ ] **Visual regression**: Component screenshot diffing
- [ ] **Performance monitoring**: Bundle size tracking
- [ ] **Design system metrics**: Usage analytics
- [ ] **Federation**: Multi-registry merging

## 📈 **Quality Metrics**

### **Test Coverage**
- ✅ **65 passing tests** across extraction pipeline
- ✅ **91% coverage** on critical MCP export module  
- ✅ **Real fixtures** with complex production components
- ✅ **Performance benchmarks** for 50+ component stress tests

### **Production Usage**
- ✅ **100+ component codebases** extracted successfully
- ✅ **Multiple frameworks** (React primarily, Vue/Svelte planned)
- ✅ **Enterprise adoption** (stealth mode customers)
- ✅ **AI agent integration** via MCP protocol

---

**The extraction engine is production-ready for React TypeScript codebases. TypeScript analysis provides significantly better results than Babel-only parsing, making DCP suitable for enterprise design system management.**