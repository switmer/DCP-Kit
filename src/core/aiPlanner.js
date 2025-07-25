import fs from 'fs';
import path from 'path';

/**
 * AI Planner - Converts natural language prompts into structured mutation plans
 * 
 * This module interfaces with AI models to:
 * 1. Read DCP IR context
 * 2. Parse human intent from prompts
 * 3. Generate JSON Patch operations for mutations
 * 4. Validate mutation plans against schema
 */

export class AIPlanner {
  constructor(options = {}) {
    this.mcpEndpoint = options.mcpEndpoint || 'http://localhost:7400';
    this.model = options.model || 'claude-3-sonnet';
    this.verbose = options.verbose || false;
  }

  /**
   * Main planning method - converts prompt to mutation plan
   * @param {string} prompt - Natural language description of desired changes
   * @param {string} contextPath - Path to DCP IR or MCP export
   * @returns {Object} Mutation plan with patches and metadata
   */
  async planMutation(prompt, contextPath) {
    if (this.verbose) {
      console.log('🧠 AI Planner: Processing prompt:', prompt);
    }

    // Load DCP context
    const context = await this.loadContext(contextPath);
    
    // Generate mutation plan using AI
    const plan = await this.generatePlan(prompt, context);
    
    // Validate and structure the plan
    const validatedPlan = await this.validatePlan(plan, context);
    
    if (this.verbose) {
      console.log('✅ Generated mutation plan with', validatedPlan.patches.length, 'operations');
    }
    
    return validatedPlan;
  }

  /**
   * Load DCP context from file or MCP endpoint
   */
  async loadContext(contextPath) {
    if (contextPath.startsWith('http')) {
      // Fetch from MCP server
      const response = await fetch(`${contextPath}/context/registry`);
      return await response.json();
    } else {
      // Load from file
      if (!fs.existsSync(contextPath)) {
        throw new Error(`Context file not found: ${contextPath}`);
      }
      return JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    }
  }

  /**
   * Generate mutation plan using AI model
   */
  async generatePlan(prompt, context) {
    // This is where we'd integrate with Claude API, OpenAI, etc.
    // For now, we'll use rule-based planning with extensible AI hooks
    
    const plan = {
      intent: prompt,
      timestamp: new Date().toISOString(),
      patches: [],
      metadata: {
        componentsAffected: [],
        tokensAffected: [],
        riskLevel: 'low'
      }
    };

    // Parse common mutation patterns
    if (this.isVariantMutation(prompt)) {
      plan.patches = await this.generateVariantMutations(prompt, context);
      plan.metadata.riskLevel = 'low';
    } else if (this.isTokenMutation(prompt)) {
      plan.patches = await this.generateTokenMutations(prompt, context);
      plan.metadata.riskLevel = 'medium';
    } else if (this.isStructuralMutation(prompt)) {
      plan.patches = await this.generateStructuralMutations(prompt, context);
      plan.metadata.riskLevel = 'high';
    } else {
      // Fallback to AI-generated plan
      plan.patches = await this.generateAIPlan(prompt, context);
    }

    return plan;
  }

  /**
   * Check if prompt describes a variant change
   */
  isVariantMutation(prompt) {
    const variantKeywords = ['variant', 'style', 'primary', 'secondary', 'ghost', 'danger'];
    return variantKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if prompt describes a token change
   */
  isTokenMutation(prompt) {
    const tokenKeywords = ['color', 'spacing', 'font', 'token', 'theme'];
    return tokenKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if prompt describes structural changes
   */
  isStructuralMutation(prompt) {
    const structuralKeywords = ['add prop', 'remove prop', 'add component', 'delete component'];
    return structuralKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Generate patches for variant mutations
   */
  async generateVariantMutations(prompt, context) {
    const patches = [];
    
    // Extract source and target variants from prompt
    const variantChange = this.parseVariantChange(prompt);
    if (!variantChange) return patches;

    const { from, to, component } = variantChange;

    // Find matching components
    const components = context.components || [];
    const targetComponents = component 
      ? components.filter(c => c.name.toLowerCase() === component.toLowerCase())
      : components.filter(c => c.name.toLowerCase() === 'button'); // Default to Button for variant changes

    for (const comp of targetComponents) {
      const compIndex = components.indexOf(comp);
      
      // Update default variant in props array
      if (Array.isArray(comp.props)) {
        const variantProp = comp.props.find(p => p.name === 'variant');
        if (variantProp && variantProp.default === from) {
          const propIndex = comp.props.indexOf(variantProp);
          patches.push({
            op: 'replace',
            path: `/components/${compIndex}/props/${propIndex}/default`,
            value: to
          });
        }
      }

      // Update examples
      comp.examples?.forEach((example, idx) => {
        if (example.props?.variant === from) {
          patches.push({
            op: 'replace',
            path: `/components/${compIndex}/examples/${idx}/props/variant`,
            value: to
          });
        }
      });

      // Update variants array
      const variantIdx = comp.variants?.indexOf(from);
      if (variantIdx >= 0) {
        patches.push({
          op: 'replace',
          path: `/components/${compIndex}/variants/${variantIdx}`,
          value: to
        });
      }
    }

    return patches;
  }

  /**
   * Parse variant changes from natural language
   */
  parseVariantChange(prompt) {
    // Simple regex patterns - could be enhanced with NLP
    const patterns = [
      /change\s+all\s+(\w+)\s+(\w+)\s+to\s+(\w+)/i, // "change all primary buttons to ghost"
      /convert\s+all\s+(\w+)\s+(\w+)\s+to\s+(\w+)/i, // "convert all primary buttons to ghost"
      /change\s+(\w+)\s+(\w+)\s+to\s+(\w+)/i, // "change primary buttons to ghost"
      /replace\s+(\w+)\s+with\s+(\w+)/i // "replace primary with ghost"
    ];

    if (this.verbose) {
      console.log('🔍 Parsing prompt:', prompt);
    }

    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match) {
        if (this.verbose) {
          console.log('✅ Pattern matched:', match);
        }
        if (match.length === 4) {
          return { component: null, from: match[1], to: match[3] }; // "change all primary buttons to ghost"
        } else if (match.length === 3) {
          return { component: null, from: match[1], to: match[2] }; // "replace primary with ghost"
        }
      }
    }

    if (this.verbose) {
      console.log('❌ No pattern matched for prompt:', prompt);
    }
    return null;
  }

  /**
   * Generate patches for token mutations
   */
  async generateTokenMutations(prompt, context) {
    const patches = [];
    // Implement token mutation logic
    return patches;
  }

  /**
   * Generate patches for structural mutations
   */
  async generateStructuralMutations(prompt, context) {
    const patches = [];
    // Implement structural mutation logic
    return patches;
  }

  /**
   * Fallback AI-generated plan (future: integrate with Claude/GPT API)
   */
  async generateAIPlan(prompt, context) {
    if (this.verbose) {
      console.log('🤖 Falling back to AI-generated plan for:', prompt);
    }

    // Placeholder for full AI integration
    return [{
      op: 'replace',
      path: '/metadata/lastModified',
      value: new Date().toISOString()
    }];
  }

  /**
   * Validate mutation plan against DCP schema
   */
  async validatePlan(plan, context) {
    // Add validation logic here
    // For now, return the plan as-is
    return plan;
  }

  /**
   * Export plan to file
   */
  async exportPlan(plan, outputPath) {
    const planData = {
      ...plan,
      exported: new Date().toISOString()
    };

    fs.writeFileSync(outputPath, JSON.stringify(planData, null, 2));
    
    if (this.verbose) {
      console.log('📁 Mutation plan exported to:', outputPath);
    }
  }
}

/**
 * CLI-friendly planning function
 */
export async function planMutation(prompt, contextPath, options = {}) {
  const planner = new AIPlanner(options);
  const plan = await planner.planMutation(prompt, contextPath);
  return plan;
}

/**
 * Command-line interface
 */
export async function runPlannerCLI(args) {
  const prompt = args[0];
  const contextPath = args[1] || './dist/registry.json';
  const outputPath = args[2] || './mutation-plan.json';

  if (!prompt) {
    console.error('❌ Usage: node aiPlanner.js "prompt" [contextPath] [outputPath]');
    process.exit(1);
  }

  try {
    const planner = new AIPlanner({ verbose: true });
    const plan = await planner.planMutation(prompt, contextPath);
    
    await planner.exportPlan(plan, outputPath);
    
    console.log('🎉 Mutation plan generated successfully!');
    console.log('📊 Summary:');
    console.log(`   - Patches: ${plan.patches.length}`);
    console.log(`   - Risk Level: ${plan.metadata.riskLevel}`);
    console.log(`   - Output: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Planning failed:', error.message);
    process.exit(1);
  }
}

// Enable direct CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  runPlannerCLI(process.argv.slice(2));
}