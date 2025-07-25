# 🧬 DCP Transformer V2: AI-Native Component Extraction

## **Zero to Genome in Seconds**

Transform any React/TypeScript codebase into a mutation-ready DCP IR and AI-optimized MCP export.

---

## 🚀 **Quick Start**

```bash
# Install dependencies
npm install

# Extract your components
npx dcp-transform extract ./example-components --tokens ./example-tokens.json --out ./dcp-output

# Export for AI/LLM consumption  
npx dcp-transform export ./dcp-output/registry.json --out ./dcp-output/mcp_export.json

# Or do both at once
npx dcp-transform quick ./example-components --tokens ./example-tokens.json --out ./dcp-output
```

**Result:** Complete DCP registry + AI-ready MCP export in < 10 seconds.

---

## 🧰 **CLI Commands**

### **Extract** - Component → DCP IR
```bash
dcp-transform extract <source> [options]

Options:
  -t, --tokens <path>     Path to design tokens file
  -o, --out <path>        Output directory (default: ./dcp-output)
  -g, --glob <pattern>    File glob pattern (default: **/*.{tsx,jsx})
  --include-stories       Include Storybook stories
  --llm-enrich           Add AI-friendly descriptions
  --plan                 Generate starter mutation plan
```

### **Export** - DCP IR → AI MCP
```bash
dcp-transform export <registry> [options]

Options:
  -o, --out <path>           Output path (default: ./mcp_export.json)
  -c, --chunk-size <size>    Max tokens per chunk (default: 4000)
  --include-examples         Include code examples
  --optimize-for <model>     Optimize for LLM (claude|gpt)
```

### **Validate** - Schema Check
```bash
dcp-transform validate <registry> [options]

Options:
  --fix      Auto-fix validation errors
  --strict   Use strict validation mode
```

### **Quick** - Extract + Export
```bash
dcp-transform quick <source> [options]

# All extract + export options supported
```

### **Info** - Registry Info
```bash
dcp-transform info <registry>
```

---

## 📁 **Output Structure**

```
dcp-output/
├── registry.json       # DCP IR - mutation-ready structure
├── schemas.json        # AJV validation schemas
├── metadata.json       # Extraction metadata
├── mcp_export.json     # AI/LLM optimized export
└── mutation-plan.json  # Starter mutation plan (if --plan)
```

---

## 🤖 **AI/LLM Integration**

The MCP export is optimized for AI consumption:

### **Claude Integration**
```javascript
// The MCP export includes Claude-specific prompts and context
const mcp = JSON.parse(fs.readFileSync('mcp_export.json'));
const systemPrompt = mcp.claudeContext.systemPrompt;
const examples = mcp.claudeContext.exampleQueries;
```

### **Agent Planning**
```javascript
// Components include mutation hints for agents
mcp.chunks[0].data.components.forEach(component => {
  console.log(`${component.name}: ${component.aiContext.commonMutations}`);
});
```

### **Token Limits**
- Auto-chunked for 4K token limits (configurable)
- Each chunk is self-contained
- Includes cross-references between chunks

---

## 🧬 **Mutation-Ready Output**

Every component and token includes mutation paths:

```json
{
  "name": "Button",
  "props": [{
    "name": "variant",
    "type": "union",
    "mutationPath": "/components/Button/props/variant"
  }],
  "aiContext": {
    "canMutate": true,
    "commonMutations": [
      "Change variant value",
      "Switch to different variant",
      "Update Button styling"
    ],
    "mutationPath": "/components/Button"
  }
}
```

---

## 📊 **Example: Button Component**

**Input** (`Button.tsx`):
```tsx
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ ... }) => { ... }
```

**Output** (DCP IR):
```json
{
  "name": "Button",
  "type": "component",
  "category": "actions",
  "description": "Primary button component for user interactions",
  "props": [
    {
      "name": "variant",
      "type": "union",
      "required": false,
      "default": "primary",
      "mutationPath": "/components/Button/props/variant"
    }
  ],
  "aiContext": {
    "canMutate": true,
    "commonMutations": ["Change variant value", "Switch to different variant"],
    "mutationPath": "/components/Button"
  }
}
```

---

## 🔗 **Integration with Mutation Pipeline**

The output is designed to work seamlessly with the existing mutation system:

```bash
# 1. Extract your codebase
dcp-transform quick ./src/components --out ./dcp

# 2. Use with AI mutation pipeline  
dcp agent "Change all buttons to ghost variant" --registry-path ./dcp/registry.json

# 3. The agent uses the MCP export for context
# 4. Mutations use the mutationPath fields for precision
# 5. Rollback system works with the backup system
```

---

## 🧪 **Advanced Features**

### **Token Integration**
- Automatically extracts and normalizes design tokens
- Links tokens to component usage
- Detects unused tokens
- Validates token types and values

### **Component Relationships** 
- Finds components with shared props
- Groups by category
- Suggests related mutations
- Optimizes for batch operations

### **Validation & Auto-Fix**
- Schema validation against DCP IR spec
- Auto-fix common validation errors
- Performance and best practice warnings
- Naming convention enforcement

### **AI Enrichment**
- Generates AI-friendly descriptions
- Suggests common mutations
- Adds context for better agent planning
- Optimizes for specific LLM models

---

## 🎯 **Why This Matters**

**Before:** Manual component documentation, brittle refactoring, no AI context

**After:** 
- ⚡ **Instant transformation** - seconds not hours
- 🤖 **AI-ready** - agents can immediately understand your system  
- 🧬 **Mutation-native** - every element has precise mutation paths
- 🔒 **Schema-safe** - validated against DCP IR specification
- 🔄 **Rollback-ready** - integrates with existing mutation safety system

---

## 🔥 **This Is Your "CRISPR for AI DCP" Foundation**

**You now have:**
1. **Instant genome sequencing** (extract any codebase)
2. **AI-readable context** (MCP export optimized for LLMs)  
3. **Mutation-ready structure** (precise paths for every change)
4. **Safety integration** (works with rollback and approval systems)
5. **Production tooling** (CLI, validation, auto-fix)

**Next up:** Connect this to your mutation pipeline for full "prompt → running code" workflows.

---

## 📝 **Try It Now**

```bash
# Test with the example components
npx dcp-transform quick ./example-components --tokens ./example-tokens.json --llm-enrich --plan

# Check the results
ls -la dcp-output/
cat dcp-output/mcp_export.json | jq '.summary'
```

**You'll get a complete DCP registry + AI context in seconds.**