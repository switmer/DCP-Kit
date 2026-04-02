# Component Source Code Accuracy

## Current Status: **Template-Based (Not Accurate)**

### What Gets Extracted

The extractor captures:
- ✅ **Props** (types, descriptions, required flags)
- ✅ **Variants** (from CVA definitions)
- ✅ **Dependencies** (npm packages, peer dependencies)
- ✅ **File path** (`component.filePath`)
- ❌ **NOT the actual source code/JSX structure**

### What Gets Displayed in Browse UI

The Browse UI shows source code fetched from **blobs**, but that source code is **generated from a template**, not the actual component implementation.

**Current Flow:**
1. Extraction → Component schema (props, variants) + file path
2. Build-packs → Checks if `component.source` exists
3. **Since `component.source` is never set** → Falls back to template generation
4. Template → Generic `<div>` wrapper with props spread

### Template Generation (What You See)

```typescript
// Generated template (NOT actual component)
const Button = React.forwardRef<HTMLDivElement, ButtonProps>(
  ({ variant, size, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
```

**What's Missing:**
- ❌ Actual JSX structure/HTML shape
- ❌ Internal component composition (e.g., `<CardHeader>`, `<CardContent>`)
- ❌ Conditional rendering logic
- ❌ Event handlers implementation
- ❌ Hooks usage (useState, useEffect, etc.)
- ❌ Any actual business logic
- ❌ Style definitions
- ❌ Component internals

### Accuracy Level: **~20%**

**What's Accurate:**
- Props interface (✅ accurate)
- Variant definitions (✅ accurate if CVA-based)
- Basic structure (✅ accurate if component is simple `<div>` wrapper)

**What's NOT Accurate:**
- Component structure/HTML shape (❌ generic `<div>`)
- Internal composition (❌ missing)
- Logic/behavior (❌ missing)
- Styling approach (❌ inferred from variants only)

---

## How to Make It Accurate

### Option 1: Store Source Code During Extraction (Recommended)

Modify `extract-v3.js` or the adaptor to read and store the actual source:

```javascript
// In extract-v3.js or react-tsx adaptor
async extractComponent(filePath) {
  const sourceCode = await fs.readFile(filePath, 'utf-8');
  
  return {
    name: componentName,
    props: extractedProps,
    variants: extractedVariants,
    source: sourceCode,  // ← Store actual source
    filePath: filePath
  };
}
```

**Then in `build-packs.js`:**
```javascript
async generateComponentSource(component) {
  // Now this will be the actual source code!
  if (component.source) {
    return component.source;
  }
  // Fallback to template only if source missing
  return this.generateTemplate(...);
}
```

### Option 2: Fetch Source from File Path at Build Time

Modify `build-packs.js` to read the source file:

```javascript
async generateComponentSource(component) {
  // Try to read actual source file
  if (component.filePath) {
    try {
      const sourceCode = await fs.readFile(component.filePath, 'utf-8');
      return sourceCode;
    } catch (error) {
      // Fallback to template
    }
  }
  
  // Fallback to template generation
  return this.generateTemplate(...);
}
```

**Pros:**
- ✅ No extraction changes needed
- ✅ Always fetches latest source
- ✅ Works with any extraction method

**Cons:**
- ❌ Requires file system access at build time
- ❌ Path resolution might fail
- ❌ Source might have moved/deleted

### Option 3: AST-Based Structure Extraction

Extract the component structure (not just props) from AST:

```javascript
// In tsMorphExtractor or adaptor
extractComponentStructure(componentNode) {
  const jsxStructure = this.extractJSXTree(componentNode);
  const hooks = this.extractHooks(componentNode);
  const logic = this.extractLogicFlow(componentNode);
  
  return {
    props: extractedProps,
    structure: {
      rootElement: jsxStructure.root,
      children: jsxStructure.children,
      conditionals: jsxStructure.conditionals,
      hooks: hooks,
      eventHandlers: jsxStructure.eventHandlers
    }
  };
}
```

**Pros:**
- ✅ Captures structure semantically
- ✅ Can be used for validation
- ✅ Can generate accurate templates

**Cons:**
- ❌ Complex to implement
- ❌ Still not the actual source code
- ❌ Might miss edge cases

---

## Recommendations

### **Immediate Fix (Quick Win):**

**Add source code storage in extraction:**

1. **Modify `extract-v3.js`** to read source files and include them:
```javascript
// Around line 250 in extract-v3.js
for (const component of extractedComponents) {
  // Read actual source code
  const sourceCode = await fs.readFile(component.filePath, 'utf-8');
  component.source = sourceCode;  // ← Add this
}
```

2. **Build-packs will automatically use it** (line 298-299 already checks `component.source`)

**Result:** Browse UI will show actual component source code! 🎉

### **Long-term Enhancement:**

1. **Store source code** during extraction
2. **Add structure analysis** (extract JSX tree, hooks, logic)
3. **Generate structure metadata** for AI consumption
4. **Validate structure** matches props (e.g., if props include `onClick`, verify handler exists)

---

## Current Behavior Summary

| Aspect | Accuracy | Notes |
|--------|----------|-------|
| Props interface | ✅ 100% | Extracted from TypeScript types |
| Variants (CVA) | ✅ 95% | Extracted from CVA definitions |
| Component structure | ❌ 20% | Generic `<div>` template |
| Internal composition | ❌ 0% | Not captured |
| Logic/behavior | ❌ 0% | Not captured |
| Styling | ❌ 30% | Inferred from variants only |
| **Overall** | **~40%** | Props accurate, structure not |

---

## Impact on Users

### **For Developers:**
- ✅ Can see props API
- ✅ Can see variants
- ❌ Cannot see actual component structure
- ❌ Cannot copy-paste real implementation

### **For AI:**
- ✅ Can query props
- ✅ Can validate prop usage
- ❌ Cannot understand component structure
- ❌ Cannot analyze component behavior
- ❌ Cannot generate accurate implementations

### **For Designers:**
- ✅ Can see what props exist
- ❌ Cannot see actual component shape
- ❌ Cannot preview real structure

---

## Next Steps

**Priority 1 (Quick Fix):**
- [ ] Store `component.source` during extraction
- [ ] Verify build-packs uses it
- [ ] Test Browse UI shows actual source

**Priority 2 (Enhancement):**
- [ ] Extract component structure (JSX tree)
- [ ] Store hooks usage
- [ ] Extract event handlers
- [ ] Generate structure metadata

**Priority 3 (Advanced):**
- [ ] AST-based structure validation
- [ ] Structure diffing
- [ ] Behavior inference from structure

---

**Bottom Line:** Currently, the code shown is a **template**, not the actual component. To fix this, we need to store the actual source code during extraction. This is a simple one-line addition that would dramatically improve accuracy!

