# 🤖 **Agent Integration Guide: CRISPR for Code**

DCP-Transformer is designed from the ground up to be **LLM-controllable** and **agent-ready**. This guide shows how to integrate AI agents with the mutation platform.

## 🎯 **Agent-Ready Design Principles**

- ✅ **Structured I/O**: All inputs/outputs are JSON with well-defined schemas
- ✅ **Deterministic CLI**: Same input always produces same output
- ✅ **Machine-Readable**: `--json` flag for all commands
- ✅ **Preview-Apply Pattern**: Dry-run before mutations
- ✅ **Full Rollback**: One-command undo with audit trails
- ✅ **Atomic Operations**: JSON Patch-based mutations

## 🔄 **Complete Agent Workflow**

### **1. Prompt → Plan → Preview → Apply → Rollback**

```bash
# 1. Extract component registry
dcp extract ./src/components --out registry --json

# 2. Generate mutation plan from natural language
dcp agent "Change all Button variants to ghost" --json --out mutation-plan.json

# 3. Preview changes without applying
dcp mutate registry.json mutation-plan.json output.json --dry-run --json

# 4. Apply mutations with undo safety
dcp mutate registry.json mutation-plan.json output.json --undo undo.json --json

# 5. Rollback if needed
dcp rollback output.json undo.json --backup --json
```

## 📋 **JSON Schemas for Agents**

### **Extract Output Schema**
```json
{
  "success": true,
  "components": 12,
  "tokens": 45,
  "outputDir": "./registry",
  "registryPath": "./registry/registry.json"
}
```

### **Mutation Plan Schema**
```json
[
  {
    "op": "replace",
    "path": "/components/0/variants/0/name",
    "value": "ghost"
  },
  {
    "op": "add",
    "path": "/metadata/mutatedBy",
    "value": "AI Agent"
  }
]
```

### **Agent Response Schema**
```json
{
  "success": true,
  "intent": "Change all Button variants to ghost",
  "registryPath": "./registry.json",
  "mutationPlanPath": "./mutation-plan.json",
  "nextSteps": {
    "preview": "dcp mutate registry.json mutation-plan.json output.json --dry-run",
    "apply": "dcp mutate registry.json mutation-plan.json output.json --undo undo.json",
    "rollback": "dcp rollback output.json undo.json"
  }
}
```

## 🤖 **Agent API Integration**

### **Option 1: CLI Wrapper**
```javascript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class DCPAgent {
  async extract(sourcePath, options = {}) {
    const cmd = `dcp extract ${sourcePath} --json ${options.out ? `--out ${options.out}` : ''}`;
    const { stdout } = await execAsync(cmd);
    return JSON.parse(stdout);
  }

  async mutate(registry, patch, output, options = {}) {
    const flags = [
      options.undo ? `--undo ${options.undo}` : '',
      options.dryRun ? '--dry-run' : '',
      '--json'
    ].filter(Boolean).join(' ');
    
    const cmd = `dcp mutate ${registry} ${patch} ${output} ${flags}`;
    const { stdout } = await execAsync(cmd);
    return JSON.parse(stdout);
  }

  async rollback(registry, undo, options = {}) {
    const cmd = `dcp rollback ${registry} ${undo} --json ${options.backup ? '--backup' : ''}`;
    const { stdout } = await execAsync(cmd);
    return JSON.parse(stdout);
  }
}
```

### **Option 2: Direct API** (Coming Soon)
```javascript
import { extract, mutate, rollback, agent } from 'dcp-transformer';

const result = await extract('./src/components');
const plan = await agent.plan('Change all buttons to ghost variant');
const mutations = await mutate(result.registryPath, plan, { dryRun: true });
```

## 🔍 **Real-World Agent Examples**

### **Example 1: Component Variant Update**
```bash
# Agent receives: "Make all buttons use the ghost variant"
dcp agent "Make all buttons use ghost variant" --json --registry ./components.json
```

**Agent Output:**
```json
{
  "success": true,
  "intent": "Make all buttons use ghost variant",
  "mutations": [
    {
      "op": "replace", 
      "path": "/components/0/defaultProps/variant",
      "value": "ghost"
    }
  ],
  "preview": "dcp mutate ./components.json ./mutation-plan.json ./output.json --dry-run",
  "apply": "dcp mutate ./components.json ./mutation-plan.json ./output.json --undo undo.json"
}
```

### **Example 2: Design Token Migration**
```bash
# Agent receives: "Update primary color from blue to green"
dcp agent "Update primary color from blue to green" --json
```

**Agent Output:**
```json
{
  "success": true,
  "intent": "Update primary color from blue to green",
  "mutations": [
    {
      "op": "replace",
      "path": "/tokens/colors/primary/value", 
      "value": "#22c55e"
    }
  ]
}
```

## 🔗 **Integration Patterns**

### **Pattern 1: Chat Interface**
```javascript
// User: "Change all my buttons to ghost style"
const extractResult = await dcp.extract('./src/components');
const agentPlan = await dcp.agent('Change all buttons to ghost style');
const preview = await dcp.mutate(extractResult.registry, agentPlan.mutations, { dryRun: true });

// Show preview to user, then apply if approved
if (userApproves) {
  await dcp.mutate(extractResult.registry, agentPlan.mutations, { undo: true });
}
```

### **Pattern 2: Autonomous Agent**
```javascript
const agent = new DCPAgent();

// Agent analyzes codebase
const analysis = await agent.extract('./src');

// Agent identifies improvements
const improvements = await agent.plan('Standardize all button variants');

// Agent applies with safety checks
const result = await agent.mutate(analysis.registry, improvements.mutations, {
  dryRun: true,
  validate: true
});

if (result.safe) {
  await agent.mutate(analysis.registry, improvements.mutations, { undo: true });
}
```

### **Pattern 3: CI/CD Integration**
```bash
#!/bin/bash
# Automated design system maintenance

# Extract current state
dcp extract ./src/components --json > current-state.json

# Generate maintenance mutations
dcp agent "Fix inconsistent spacing tokens" --json > maintenance-plan.json

# Preview changes
dcp mutate registry.json maintenance-plan.json updated.json --dry-run --json > preview.json

# Apply if safe
if [ "$(cat preview.json | jq '.safe')" = "true" ]; then
  dcp mutate registry.json maintenance-plan.json updated.json --undo undo.json
  git commit -m "Automated design system maintenance"
fi
```

## 🛡️ **Safety & Reliability**

### **Built-in Safety Features**
- ✅ **Dry-run by default**: Always preview before applying
- ✅ **Automatic undo generation**: Every mutation creates rollback patch
- ✅ **Schema validation**: Ensures mutations don't break registry structure
- ✅ **Audit logging**: Full history of all mutations in JSONL format
- ✅ **Atomic operations**: Either all mutations succeed or none apply

### **Best Practices for Agents**
1. **Always dry-run first**: Use `--dry-run` to preview changes
2. **Generate undo patches**: Always use `--undo` flag for rollback safety
3. **Validate results**: Check mutation success in JSON output
4. **Log everything**: Agent actions should be auditable
5. **Test rollbacks**: Verify undo patches work correctly

## 🚀 **Getting Started**

1. **Install the CLI**:
   ```bash
   npm install -g dcp-transformer
   ```

2. **Extract your components**:
   ```bash
   dcp extract ./src/components --json
   ```

3. **Create your first agent workflow**:
   ```javascript
   const { exec } = require('child_process');
   
   async function agentMutation() {
     // Agent generates mutation plan
     const plan = await generateMutationPlan('Make buttons more accessible');
     
     // Preview changes
     const preview = await exec('dcp mutate registry.json plan.json output.json --dry-run --json');
     
     // Apply if safe
     if (JSON.parse(preview).safe) {
       await exec('dcp mutate registry.json plan.json output.json --undo undo.json');
     }
   }
   ```

## 📚 **Additional Resources**

- **[CLI Reference](./CLI_REFERENCE.md)**: Complete command documentation
- **[JSON Patch Guide](./JSON_PATCH.md)**: Mutation format specification  
- **[Schema Documentation](./schemas/)**: Input/output JSON schemas
- **[Examples Repository](./examples/)**: Real-world agent integrations

---

**Ready to build agents that can safely mutate code? The platform is designed for it! 🧬🤖**