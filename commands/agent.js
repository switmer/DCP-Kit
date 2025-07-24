import fs from 'fs/promises';
import path from 'path';

/**
 * Process natural language prompts and generate mutation plans
 * @param {string} prompt - Natural language instruction
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Agent processing results
 */
export async function runAgent(prompt, options = {}) {
  const startTime = Date.now();
  const results = {
    success: false,
    intent: prompt,
    affectedComponents: [],
    mutationPlan: null,
    clarificationNeeded: false,
    ambiguousComponents: [],
    suggestions: [],
    nextSteps: {},
    errors: [],
    warnings: []
  };

  try {
    // Load registry
    const registryPath = options.registry || './registry.json';
    const registryContent = await fs.readFile(registryPath, 'utf-8');
    const registry = JSON.parse(registryContent);
    
    if (!registry.components || !Array.isArray(registry.components)) {
      throw new Error('Invalid registry format: missing components array');
    }
    
    // Analyze the prompt
    const promptAnalysis = analyzePrompt(prompt, registry);
    
    // Handle ambiguous prompts
    if (promptAnalysis.ambiguous) {
      results.clarificationNeeded = true;
      results.ambiguousComponents = promptAnalysis.candidates;
      results.suggestions = generateSuggestions(promptAnalysis.candidates, prompt);
      results.success = true;
      return results;
    }
    
    // Generate mutation plan
    const mutationPlan = generateMutationPlan(promptAnalysis, registry, options);
    
    if (mutationPlan.mutations && mutationPlan.mutations.length > 0) {
      // Save mutation plan to file
      await fs.writeFile(options.out || './mutation-plan.json', 
        JSON.stringify(mutationPlan.mutations, null, 2), 'utf-8');
      
      results.mutationPlan = mutationPlan.mutations;
      results.affectedComponents = mutationPlan.affectedComponents;
      
      // Generate next steps
      results.nextSteps = {
        preview: `dcp diff "${registryPath}" <(dcp mutate "${registryPath}" "${options.out || './mutation-plan.json'}" /dev/stdout --dry-run)`,
        apply: `dcp mutate "${registryPath}" "${options.out || './mutation-plan.json'}" "${registryPath.replace('.json', '-mutated.json')}" --undo undo.json`,
        rollback: `dcp rollback "${registryPath.replace('.json', '-mutated.json')}" undo.json`
      };
    }
    
    if (mutationPlan.warnings) {
      results.warnings = mutationPlan.warnings;
    }
    
    results.success = true;
    results.duration = Date.now() - startTime;
    
    return results;
    
  } catch (error) {
    results.errors.push(error.message);
    results.duration = Date.now() - startTime;
    return results;
  }
}

/**
 * Analyze natural language prompt to understand intent
 */
function analyzePrompt(prompt, registry) {
  const analysis = {
    action: null,
    target: null,
    value: null,
    components: [],
    ambiguous: false,
    candidates: []
  };
  
  const promptLower = prompt.toLowerCase();
  
  // Detect action types
  if (promptLower.includes('add') && promptLower.includes('variant')) {
    analysis.action = 'add-variant';
    
    // Extract variant name
    const variantMatch = prompt.match(/add.*?variant.*?["'](\w+)["']|add.*?["'](\w+)["'].*?variant/i);
    if (variantMatch) {
      analysis.value = variantMatch[1] || variantMatch[2];
    }
    
  } else if (promptLower.includes('make') && promptLower.includes('variant')) {
    analysis.action = 'change-default-variant';
    
    // Extract variant name
    const variantMatch = prompt.match(/variant.*?["'](\w+)["']|["'](\w+)["'].*?variant/i);
    if (variantMatch) {
      analysis.value = variantMatch[1] || variantMatch[2];
    }
    
  } else if (promptLower.includes('change') || promptLower.includes('update')) {
    analysis.action = 'change-property';
    
    // Extract property and value
    const changeMatch = prompt.match(/change\s+(\w+)\s+to\s+(\w+)|update\s+(\w+)\s+to\s+(\w+)/i);
    if (changeMatch) {
      analysis.target = changeMatch[1] || changeMatch[3];
      analysis.value = changeMatch[2] || changeMatch[4];
    }
    
  } else if (promptLower.includes('add') && (promptLower.includes('prop') || promptLower.includes('property'))) {
    analysis.action = 'add-property';
    
    // Extract property name and type
    const propMatch = prompt.match(/add\s+(?:prop|property)\s+(\w+)|add\s+(\w+)\s+(?:prop|property)/i);
    if (propMatch) {
      analysis.target = propMatch[1] || propMatch[2];
    }
  }
  
  // Detect target components
  const componentNames = registry.components.map(c => c.name.toLowerCase());
  const candidates = [];
  
  // Look for component names in prompt
  componentNames.forEach(name => {
    const component = registry.components.find(c => c.name.toLowerCase() === name);
    if (promptLower.includes(name) || promptLower.includes(name + 's')) {
      candidates.push(component.name);
    }
  });
  
  // Handle "all" keyword
  if (promptLower.includes('all ')) {
    // Extract component type after "all"
    const allMatch = prompt.match(/all\s+(\w+)s?/i);
    if (allMatch) {
      const targetType = allMatch[1].toLowerCase();
      
      // Find matching components
      const matches = registry.components.filter(c => 
        c.name.toLowerCase().includes(targetType) ||
        (c.tags && c.tags.some(tag => tag.toLowerCase().includes(targetType)))
      );
      
      if (matches.length > 1) {
        // Multiple matches - potentially ambiguous
        candidates.push(...matches.map(c => c.name));
      } else if (matches.length === 1) {
        candidates.push(matches[0].name);
      } else {
        // No direct matches, try fuzzy matching
        const fuzzyMatches = registry.components.filter(c => 
          c.name.toLowerCase().includes(targetType.substring(0, 3))
        );
        candidates.push(...fuzzyMatches.map(c => c.name));
      }
    }
  }
  
  // Check for ambiguity
  if (candidates.length > 1 && !promptLower.includes('all')) {
    analysis.ambiguous = true;
    analysis.candidates = candidates;
  } else {
    analysis.components = candidates;
  }
  
  return analysis;
}

/**
 * Generate mutation plan based on prompt analysis
 */
function generateMutationPlan(analysis, registry, options) {
  const mutations = [];
  const affectedComponents = [];
  const warnings = [];
  
  try {
    switch (analysis.action) {
      case 'add-variant':
        analysis.components.forEach(componentName => {
          const componentIndex = registry.components.findIndex(c => c.name === componentName);
          if (componentIndex !== -1) {
            const component = registry.components[componentIndex];
            
            // Find variant prop
            const variantProp = component.props?.variant;
            if (variantProp && variantProp.values) {
              // Add to existing values
              mutations.push({
                op: 'add',
                path: `/components/${componentIndex}/props/variant/values/-`,
                value: analysis.value
              });
              
              // Update examples if they exist
              if (component.examples) {
                mutations.push({
                  op: 'add',
                  path: `/components/${componentIndex}/examples/-`,
                  value: `<${componentName} variant="${analysis.value}">Example</${componentName}>`
                });
              }
              
              affectedComponents.push(componentName);
            } else {
              warnings.push(`Component ${componentName} does not have a variant prop`);
            }
          }
        });
        break;
        
      case 'change-default-variant':
        analysis.components.forEach(componentName => {
          const componentIndex = registry.components.findIndex(c => c.name === componentName);
          if (componentIndex !== -1) {
            const component = registry.components[componentIndex];
            
            if (component.props?.variant) {
              mutations.push({
                op: 'replace',
                path: `/components/${componentIndex}/props/variant/default`,
                value: analysis.value
              });
              
              affectedComponents.push(componentName);
            }
          }
        });
        break;
        
      case 'add-property':
        analysis.components.forEach(componentName => {
          const componentIndex = registry.components.findIndex(c => c.name === componentName);
          if (componentIndex !== -1) {
            // Determine property type based on name
            let propType = 'string';
            if (analysis.target.includes('disabled') || analysis.target.includes('loading')) {
              propType = 'boolean';
            } else if (analysis.target.includes('count') || analysis.target.includes('size')) {
              propType = 'number';
            }
            
            mutations.push({
              op: 'add',
              path: `/components/${componentIndex}/props/${analysis.target}`,
              value: {
                type: propType,
                optional: true,
                description: `${analysis.target} prop for ${componentName}`
              }
            });
            
            affectedComponents.push(componentName);
          }
        });
        break;
        
      case 'change-property':
        registry.components.forEach((component, componentIndex) => {
          if (component.props?.[analysis.target]) {
            mutations.push({
              op: 'replace',
              path: `/components/${componentIndex}/props/${analysis.target}/default`,
              value: analysis.value
            });
            
            affectedComponents.push(component.name);
          }
        });
        break;
        
      default:
        warnings.push(`Action "${analysis.action}" not yet supported. Supported actions: add-variant, change-default-variant, add-property, change-property`);
    }
    
  } catch (error) {
    warnings.push(`Failed to generate mutations: ${error.message}`);
  }
  
  return {
    mutations,
    affectedComponents: [...new Set(affectedComponents)], // Remove duplicates
    warnings
  };
}

/**
 * Generate suggestions for ambiguous prompts
 */
function generateSuggestions(candidates, prompt) {
  const suggestions = [];
  
  candidates.forEach(component => {
    suggestions.push(`"${prompt}" for ${component} component specifically`);
  });
  
  // Add option to apply to all
  if (candidates.length > 1) {
    suggestions.push(`"${prompt}" for all ${candidates.length} matching components`);
  }
  
  return suggestions;
}