import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

/**
 * MCP Export - AI/LLM Ready Export
 * 
 * Features:
 * - Flattened, prompt-optimized component data
 * - Chunked output for token limits
 * - Model-specific optimizations (Claude, GPT, etc.)
 * - Context-aware component grouping
 * - Mutation-friendly structure
 */

export async function runExportMCP(registryPath, options = {}) {
  const {
    out: outputPath = './mcp_export.json',
    chunkSize = 4000,
    includeExamples = false,
    optimizeFor = 'claude'
  } = options;

  console.log(chalk.blue(`📤 Exporting MCP from: ${registryPath}`));
  
  // Load registry
  const registryContent = await fs.readFile(registryPath, 'utf-8');
  const registry = JSON.parse(registryContent);
  
  const exporter = new MCPExporter({
    registry,
    chunkSize: parseInt(chunkSize),
    includeExamples,
    optimizeFor,
    verbose: options.verbose
  });
  
  const mcpExport = exporter.export();
  
  // Write MCP export
  await fs.writeFile(outputPath, JSON.stringify(mcpExport, null, 2));
  
  console.log(chalk.green(`🤖 MCP export written to: ${outputPath}`));
  
  if (options.verbose) {
    console.log(chalk.gray(`   Chunks generated: ${mcpExport.chunks.length}`));
    console.log(chalk.gray(`   Total tokens (estimated): ${mcpExport.metadata.estimatedTokens}`));
  }
  
  return {
    mcpExport,
    outputPath,
    summary: {
      chunksGenerated: mcpExport.chunks.length,
      componentsExported: mcpExport.summary.componentsCount,
      tokensExported: mcpExport.summary.tokensCount,
      estimatedTokens: mcpExport.metadata.estimatedTokens
    }
  };
}

class MCPExporter {
  constructor(options) {
    this.registry = options.registry;
    this.chunkSize = options.chunkSize || 4000;
    this.includeExamples = options.includeExamples;
    this.optimizeFor = options.optimizeFor || 'claude';
    this.verbose = options.verbose;
  }
  
  export() {
    const flattened = this.flattenRegistry();
    const optimized = this.optimizeForModel(flattened);
    const chunked = this.chunkForTokenLimits(optimized);
    
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      optimizedFor: this.optimizeFor,
      
      // Summary for quick reference
      summary: {
        registryName: this.registry.name || 'Unknown',
        registryVersion: this.registry.version || '1.0.0',
        componentsCount: this.registry.components?.length || 0,
        tokensCount: Object.keys(this.registry.tokens || {}).length,
        chunksCount: chunked.length
      },
      
      // Quick component reference
      componentIndex: this.generateComponentIndex(),
      
      // Token reference
      tokenIndex: this.generateTokenIndex(),
      
      // Mutation context
      mutationContext: this.generateMutationContext(),
      
      // Chunked data for LLM consumption
      chunks: chunked,
      
      // Metadata
      metadata: {
        chunkSize: this.chunkSize,
        includeExamples: this.includeExamples,
        estimatedTokens: this.estimateTokens(chunked),
        generatedBy: 'DCP Transformer v2.0.0'
      }
    };
  }
  
  flattenRegistry() {
    const flattened = {
      system: {
        name: this.registry.name,
        version: this.registry.version,
        description: this.registry.description,
        componentCount: this.registry.components?.length || 0,
        tokenCount: Object.keys(this.registry.tokens || {}).length
      },
      
      components: this.flattenComponents(),
      tokens: this.flattenTokens(),
      relationships: this.extractRelationships()
    };
    
    return flattened;
  }
  
  flattenComponents() {
    if (!this.registry.components) return [];
    
    return this.registry.components.map(component => ({
      name: component.name,
      type: component.type || 'component',
      category: component.category || 'components',
      description: component.description || '',
      
      // Props flattened for AI understanding
      props: component.props?.map(prop => ({
        name: prop.name,
        type: prop.type,
        required: prop.required || false,
        default: prop.default,
        description: prop.description || '',
        // Add mutation hints
        mutationPath: `/components/${component.name}/props/${prop.name}`
      })) || [],
      
      // Variants for AI to understand options
      variants: component.variants && typeof component.variants === 'object' 
        ? Object.entries(component.variants).map(([name, variant]) => ({
            name,
            description: variant.description || '',
            props: variant.props || {},
            mutationPath: `/components/${component.name}/variants/${name}`
          }))
        : [],
      
      // Examples if requested
      examples: this.includeExamples ? (component.examples || []) : [],
      
      // AI-friendly metadata
      aiContext: {
        canMutate: true,
        commonMutations: this.generateCommonMutations(component),
        relatedComponents: this.findRelatedComponents(component),
        mutationPath: `/components/${component.name}`
      }
    }));
  }
  
  flattenTokens() {
    if (!this.registry.tokens) return {};
    
    const flattened = {};
    
    Object.entries(this.registry.tokens).forEach(([category, tokens]) => {
      flattened[category] = Object.entries(tokens).map(([name, token]) => ({
        name,
        value: token.value || token,
        type: token.type || 'unknown',
        description: token.description || '',
        category,
        mutationPath: `/tokens/${category}/${name}`
      }));
    });
    
    return flattened;
  }
  
  extractRelationships() {
    // Extract component relationships for AI understanding
    const relationships = [];
    
    if (this.registry.components) {
      this.registry.components.forEach(component => {
        // Find components that share props
        const relatedByProps = this.registry.components.filter(other => 
          other.name !== component.name && 
          this.shareProps(component, other)
        );
        
        if (relatedByProps.length > 0) {
          relationships.push({
            type: 'shared_props',
            source: component.name,
            targets: relatedByProps.map(c => c.name),
            strength: 'medium'
          });
        }
        
        // Find components in same category
        const sameCategory = this.registry.components.filter(other =>
          other.name !== component.name &&
          other.category === component.category
        );
        
        if (sameCategory.length > 0) {
          relationships.push({
            type: 'same_category',
            source: component.name,
            targets: sameCategory.map(c => c.name),
            strength: 'low'
          });
        }
      });
    }
    
    return relationships;
  }
  
  shareProps(comp1, comp2) {
    if (!comp1.props || !comp2.props) return false;
    
    const props1 = new Set(comp1.props.map(p => p.name));
    const props2 = new Set(comp2.props.map(p => p.name));
    
    const intersection = new Set([...props1].filter(p => props2.has(p)));
    return intersection.size >= 2; // Threshold for "shared props"
  }
  
  generateCommonMutations(component) {
    const mutations = [];
    
    // Prop-based mutations
    if (component.props) {
      component.props.forEach(prop => {
        if (prop.type === 'union' || prop.type === 'string') {
          mutations.push(`Change ${prop.name} value`);
        }
        
        if (prop.name.includes('variant')) {
          mutations.push(`Switch to different ${prop.name}`);
        }
        
        if (prop.name.includes('size')) {
          mutations.push(`Resize ${component.name}`);
        }
      });
    }
    
    // Category-based mutations
    if (component.category) {
      mutations.push(`Update ${component.category} styling`);
    }
    
    return mutations.slice(0, 5); // Limit to top 5 suggestions
  }
  
  findRelatedComponents(component) {
    if (!this.registry.components) return [];
    
    return this.registry.components
      .filter(other => 
        other.name !== component.name && 
        (
          other.category === component.category ||
          this.shareProps(component, other)
        )
      )
      .map(c => c.name)
      .slice(0, 3); // Limit to top 3 related
  }
  
  optimizeForModel(flattened) {
    switch (this.optimizeFor) {
      case 'claude':
      case 'claude-3':
      case 'claude-3-opus':
      case 'claude-3-sonnet':
        return this.optimizeForClaude(flattened);
      case 'gpt':
      case 'gpt-4':
      case 'gpt-4-turbo':
        return this.optimizeForGPT(flattened);
      case 'gemini':
      case 'gemini-pro':
        return this.optimizeForGemini(flattened);
      case 'generic':
      default:
        return flattened;
    }
  }
  
  optimizeForClaude(flattened) {
    // Claude-specific optimizations
    // Claude prefers structured, hierarchical data with clear relationships
    const optimized = {
      ...flattened,
      
      // Optimize token structure for Claude
      tokens: this.optimizeTokensForClaude(flattened.tokens),
      
      // Optimize components for Claude's understanding
      components: this.optimizeComponentsForClaude(flattened.components),
      
      // Add Claude-friendly structure
      claudeContext: {
        systemPrompt: this.generateClaudeSystemPrompt(),
        mutationInstructions: this.generateClaudeMutationInstructions(),
        exampleQueries: this.generateClaudeExampleQueries(),
        // Claude-specific optimizations
        formatting: {
          preferStructured: true,
          includeTypeHints: true,
          emphasizeRelationships: true
        }
      }
    };
    
    // Deduplicate and compress for Claude
    return this.deduplicateAndCompress(optimized, 'claude');
  }
  
  optimizeForGPT(flattened) {
    // GPT-4 specific optimizations
    // GPT-4 prefers concise, example-rich data
    const optimized = {
      ...flattened,
      
      // Optimize for GPT-4's token efficiency
      tokens: this.optimizeTokensForGPT(flattened.tokens),
      
      // Optimize components with examples
      components: this.optimizeComponentsForGPT(flattened.components),
      
      // Add GPT-friendly structure
      gptContext: {
        functions: this.generateGPTFunctions(),
        examples: this.generateGPTExamples(),
        // GPT-4 specific optimizations
        formatting: {
          preferConcise: true,
          includeExamples: true,
          emphasizePatterns: true
        }
      }
    };
    
    // Deduplicate and compress for GPT
    return this.deduplicateAndCompress(optimized, 'gpt');
  }
  
  optimizeForGemini(flattened) {
    // Gemini-specific optimizations
    // Gemini works well with hierarchical, descriptive data
    return {
      ...flattened,
      geminiContext: {
        systemInstructions: this.generateGeminiSystemInstructions(),
        preferredFormat: 'hierarchical'
      }
    };
  }
  
  optimizeTokensForClaude(tokens) {
    // Claude-specific token optimization
    // Group related tokens, remove redundancy, add type hints
    const optimized = {};
    
    for (const [category, tokenList] of Object.entries(tokens)) {
      // Deduplicate tokens
      const seen = new Set();
      const deduplicated = tokenList.filter(token => {
        const key = `${token.name}:${JSON.stringify(token.value)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      // Add type inference for Claude
      optimized[category] = deduplicated.map(token => ({
        ...token,
        inferredType: this.inferTokenType(token.value),
        semanticGroup: this.getSemanticGroup(category, token.name)
      }));
    }
    
    return optimized;
  }
  
  optimizeTokensForGPT(tokens) {
    // GPT-4 specific token optimization
    // More compact, example-based representation
    const optimized = {};
    
    for (const [category, tokenList] of Object.entries(tokens)) {
      // Compress token representation
      optimized[category] = tokenList.map(token => ({
        n: token.name, // Shortened keys
        v: token.value,
        t: token.type || this.inferTokenType(token.value),
        d: token.description || ''
      }));
    }
    
    return optimized;
  }
  
  optimizeComponentsForClaude(components) {
    // Claude-specific component optimization
    // Emphasize relationships and mutation paths
    return components.map(component => ({
      ...component,
      // Add relationship context
      relationships: {
        parent: this.findParentComponent(component),
        children: this.findChildComponents(component),
        siblings: this.findSiblingComponents(component)
      },
      // Enhanced mutation paths
      mutationPaths: this.generateMutationPaths(component),
      // Type hints for Claude
      typeHints: this.generateTypeHints(component)
    }));
  }
  
  optimizeComponentsForGPT(components) {
    // GPT-4 specific component optimization
    // More compact, example-focused
    return components.map(component => ({
      n: component.name, // Shortened keys
      d: component.description,
      p: component.props?.map(p => ({
        n: p.name,
        t: p.type,
        r: p.required,
        d: p.description
      })),
      v: component.variants,
      e: component.examples?.slice(0, 2) // Limit examples for GPT
    }));
  }
  
  deduplicateAndCompress(data, model) {
    // Remove duplicate information across components
    const deduplicated = JSON.parse(JSON.stringify(data)); // Deep clone
    
    // Find common prop patterns
    const commonProps = this.findCommonProps(deduplicated.components);
    
    // Reference common props instead of duplicating
    if (commonProps.length > 0 && model === 'claude') {
      deduplicated.commonProps = commonProps;
      deduplicated.components = deduplicated.components.map(comp => {
        const optimizedProps = comp.props?.map(prop => {
          const commonMatch = commonProps.find(cp => 
            cp.name === prop.name && cp.type === prop.type
          );
          if (commonMatch) {
            return { ...prop, reference: `commonProps.${commonMatch.name}` };
          }
          return prop;
        });
        return { ...comp, props: optimizedProps };
      });
    }
    
    return deduplicated;
  }
  
  inferTokenType(value) {
    // Infer token type from value
    if (typeof value === 'string') {
      if (value.startsWith('#')) return 'color';
      if (value.match(/^\d+px$|^\d+rem$|^\d+em$/)) return 'spacing';
      if (value.match(/^\d+$/)) return 'number';
      if (value.includes('font')) return 'typography';
    }
    if (typeof value === 'number') return 'number';
    return 'unknown';
  }
  
  getSemanticGroup(category, name) {
    // Group tokens semantically for better understanding
    if (category === 'colors') {
      if (name.includes('primary')) return 'brand-primary';
      if (name.includes('secondary')) return 'brand-secondary';
      if (name.includes('background')) return 'surfaces';
      if (name.includes('text')) return 'text';
    }
    if (category === 'spacing') {
      if (name.match(/xs|sm/)) return 'small';
      if (name.match(/md|base/)) return 'medium';
      if (name.match(/lg|xl|2xl/)) return 'large';
    }
    return category;
  }
  
  findParentComponent(component) {
    // Find parent component (if this is a subcomponent)
    if (!this.registry.components) return null;
    
    const nameParts = component.name.split(/(?=[A-Z])/);
    if (nameParts.length > 1) {
      const parentName = nameParts.slice(0, -1).join('');
      return this.registry.components.find(c => c.name === parentName)?.name || null;
    }
    return null;
  }
  
  findChildComponents(component) {
    // Find child components
    if (!this.registry.components) return [];
    
    return this.registry.components
      .filter(c => c.name.startsWith(component.name) && c.name !== component.name)
      .map(c => c.name);
  }
  
  findSiblingComponents(component) {
    // Find sibling components (same category, similar props)
    if (!this.registry.components) return [];
    
    return this.registry.components
      .filter(c => 
        c.name !== component.name &&
        c.category === component.category
      )
      .map(c => c.name)
      .slice(0, 5);
  }
  
  generateMutationPaths(component) {
    // Generate all possible mutation paths for a component
    const paths = {
      component: `/components/${component.name}`,
      props: {},
      variants: {}
    };
    
    if (component.props) {
      component.props.forEach(prop => {
        paths.props[prop.name] = `/components/${component.name}/props/${prop.name}`;
      });
    }
    
    if (component.variants) {
      Object.keys(component.variants).forEach(variant => {
        paths.variants[variant] = `/components/${component.name}/variants/${variant}`;
      });
    }
    
    return paths;
  }
  
  generateTypeHints(component) {
    // Generate type hints for Claude's understanding
    return {
      componentType: component.type || 'ui',
      hasVariants: !!(component.variants && Object.keys(component.variants).length > 0),
      hasComposition: !!(component.composition && (
        component.composition.slots?.length > 0 ||
        component.composition.subComponents?.length > 0
      )),
      propCount: component.props?.length || 0,
      complexity: component.props?.length > 10 ? 'high' : component.props?.length > 5 ? 'medium' : 'low'
    };
  }
  
  findCommonProps(components) {
    // Find props that appear in multiple components
    const propCounts = {};
    
    components.forEach(component => {
      component.props?.forEach(prop => {
        const key = `${prop.name}:${prop.type}`;
        if (!propCounts[key]) {
          propCounts[key] = {
            name: prop.name,
            type: prop.type,
            count: 0,
            components: []
          };
        }
        propCounts[key].count++;
        propCounts[key].components.push(component.name);
      });
    });
    
    // Return props that appear in 3+ components
    return Object.values(propCounts)
      .filter(p => p.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 common props
  }
  
  generateGeminiSystemInstructions() {
    return `You are analyzing a design system registry. Focus on understanding component relationships and providing clear, actionable mutation suggestions.`;
  }
  
  generateClaudeSystemPrompt() {
    return `You are a design system mutation assistant. You have access to a DCP (Design Component Protocol) registry containing ${this.registry.components?.length || 0} components and ${Object.keys(this.registry.tokens || {}).length} design tokens.

Your role is to:
1. Understand natural language requests about design system changes
2. Generate precise JSON Patch operations to mutate the DCP registry
3. Ensure all mutations are schema-safe and reversible
4. Provide clear explanations of proposed changes

Available components: ${this.registry.components?.map(c => c.name).join(', ') || 'none'}

Use the mutation paths provided in the component data to create accurate patches.`;
  }
  
  generateClaudeMutationInstructions() {
    return [
      'Always use JSON Patch format for mutations',
      'Include undo patches for rollback safety',
      'Validate mutations against component schemas',
      'Provide human-readable summaries of changes',
      'Consider component relationships when making changes'
    ];
  }
  
  generateClaudeExampleQueries() {
    const examples = [];
    
    if (this.registry.components?.length > 0) {
      const firstComponent = this.registry.components[0];
      examples.push(`Change all ${firstComponent.name} components to use a different variant`);
      
      if (firstComponent.props?.length > 0) {
        const firstProp = firstComponent.props[0];
        examples.push(`Update the default ${firstProp.name} for ${firstComponent.name}`);
      }
    }
    
    if (Object.keys(this.registry.tokens || {}).length > 0) {
      examples.push('Update the primary color token');
      examples.push('Change spacing tokens across the system');
    }
    
    return examples;
  }
  
  generateGPTFunctions() {
    return [
      {
        name: 'planMutation',
        description: 'Generate a mutation plan for the design system',
        parameters: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Natural language description of desired changes'
            },
            components: {
              type: 'array',
              description: 'List of component names to affect'
            }
          },
          required: ['prompt']
        }
      }
    ];
  }
  
  generateGPTExamples() {
    return [
      {
        prompt: 'Change button variant to ghost',
        response: 'I can help you change button variants. Here\'s the mutation plan...'
      }
    ];
  }
  
  chunkForTokenLimits(optimized) {
    const chunks = [];
    let currentChunk = {
      chunkId: 0,
      data: {
        system: optimized.system,
        components: [],
        tokens: {},
        relationships: optimized.relationships || []
      },
      estimatedTokens: this.estimateTokens(optimized.system) + this.estimateTokens(optimized.relationships)
    };
    
    // Add Claude/GPT context to first chunk
    if (optimized.claudeContext) {
      currentChunk.data.claudeContext = optimized.claudeContext;
      currentChunk.estimatedTokens += this.estimateTokens(optimized.claudeContext);
    }
    
    if (optimized.gptContext) {
      currentChunk.data.gptContext = optimized.gptContext;
      currentChunk.estimatedTokens += this.estimateTokens(optimized.gptContext);
    }
    
    // Chunk components
    optimized.components.forEach(component => {
      const componentTokens = this.estimateTokens(component);
      
      if (currentChunk.estimatedTokens + componentTokens > this.chunkSize) {
        // Start new chunk
        chunks.push(currentChunk);
        currentChunk = {
          chunkId: chunks.length,
          data: {
            components: [component],
            tokens: {},
            relationships: []
          },
          estimatedTokens: componentTokens
        };
      } else {
        // Add to current chunk
        currentChunk.data.components.push(component);
        currentChunk.estimatedTokens += componentTokens;
      }
    });
    
    // Add tokens to chunks
    Object.entries(optimized.tokens).forEach(([category, tokens]) => {
      const tokensData = { [category]: tokens };
      const tokenTokens = this.estimateTokens(tokensData);
      
      if (currentChunk.estimatedTokens + tokenTokens > this.chunkSize) {
        chunks.push(currentChunk);
        currentChunk = {
          chunkId: chunks.length,
          data: {
            components: [],
            tokens: tokensData,
            relationships: []
          },
          estimatedTokens: tokenTokens
        };
      } else {
        currentChunk.data.tokens = { ...currentChunk.data.tokens, ...tokensData };
        currentChunk.estimatedTokens += tokenTokens;
      }
    });
    
    // Add final chunk if it has content
    if (currentChunk.data.components.length > 0 || Object.keys(currentChunk.data.tokens).length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
  
  generateComponentIndex() {
    if (!this.registry.components) return {};
    
    const index = {};
    
    this.registry.components.forEach((component, idx) => {
      index[component.name] = {
        name: component.name,
        category: component.category,
        propsCount: component.props?.length || 0,
        variantsCount: component.variants && typeof component.variants === 'object' 
          ? Object.keys(component.variants).length 
          : 0,
        chunkId: Math.floor(idx / 10), // Rough estimate
        mutationPath: `/components/${component.name}`
      };
    });
    
    return index;
  }
  
  generateTokenIndex() {
    if (!this.registry.tokens) return {};
    
    const index = {};
    
    Object.entries(this.registry.tokens).forEach(([category, tokens]) => {
      index[category] = Object.keys(tokens).map(name => ({
        name,
        category,
        mutationPath: `/tokens/${category}/${name}`
      }));
    });
    
    return index;
  }
  
  generateMutationContext() {
    return {
      safeOperations: ['replace', 'add', 'remove'],
      dangerousOperations: ['move', 'copy'],
      
      mutationPatterns: [
        {
          pattern: 'Component variant change',
          example: { op: 'replace', path: '/components/Button/variants/0/name', value: 'ghost' }
        },
        {
          pattern: 'Token value update',
          example: { op: 'replace', path: '/tokens/colors/primary/value', value: '#007bff' }
        },
        {
          pattern: 'Add new component prop',
          example: { op: 'add', path: '/components/Button/props/-', value: { name: 'loading', type: 'boolean' } }
        }
      ],
      
      validationRules: [
        'All mutations must follow JSON Patch RFC 6902',
        'Component names must start with uppercase letter',
        'Token values must match their type constraints',
        'Required props cannot be removed without migration'
      ]
    };
  }
  
  estimateTokens(data) {
    // Rough token estimation (4 characters = 1 token)
    const jsonString = JSON.stringify(data);
    return Math.ceil(jsonString.length / 4);
  }
}