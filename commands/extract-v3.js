import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { extractCssCustomProps } from '../core/tokenHandler.js';
import { adaptorRegistry, createAdaptor, autoDetectAdaptor } from '../adaptors/registry.js';
import { extractThemeContext, enhanceComponentWithThemeContext, generateThemeContextSummary } from '../core/themeExtractor.js';
import { ProjectIntelligenceScanner } from '../core/projectIntelligence.js';

/**
 * DCP Transformer V3 - Multi-Framework Component Extraction
 * 
 * Features:
 * - Pluggable adaptor system for different frameworks
 * - Auto-detection of component types
 * - React TSX/JSX, Vue SFC, Svelte support (via adaptors)
 * - Token extraction and normalization
 * - AI-ready metadata generation
 */

export async function runExtract(source, options = {}) {
  const {
    tokens: tokensPath,
    out: outputDir = './dcp-output',
    glob: globPattern = '**/*.{tsx,jsx,ts,js}',
    adaptor: adaptorName,
    includeStories = false,
    llmEnrich = false,
    plan = false,
    json = false,
    flattenTokens = false,
    verbose = false
  } = options;

  // Only show console output if not in JSON mode
  if (!json) {
    console.log(chalk.blue(`🔍 Extracting components from: ${source}`));
    if (adaptorName) {
      console.log(chalk.gray(`🔌 Using adaptor: ${adaptorName}`));
    } else {
      console.log(chalk.gray(`🔌 Auto-detecting adaptors`));
    }
  }
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  const extractor = new MultiFrameworkExtractor({
    sourceDir: source,
    tokensPath,
    adaptorName,
    includeStories,
    llmEnrich,
    flattenTokens,
    verbose: verbose && !json,
    barrels: options.barrels,
    maxDepth: options.maxDepth,
    traceBarrels: options.traceBarrels
  });
  
  const result = await extractor.extract(globPattern);
  
  // Run project intelligence scan for enhanced onboarding
  const projectScanner = new ProjectIntelligenceScanner(source);
  const intelligence = await projectScanner.scan();
  
  // Enhance registry with intelligence data
  result.registry.intelligence = intelligence;
  
  // Write outputs
  const registryPath = path.join(outputDir, 'registry.json');
  const schemaPath = path.join(outputDir, 'schemas.json');
  const metadataPath = path.join(outputDir, 'metadata.json');
  
  await fs.writeFile(registryPath, JSON.stringify(result.registry, null, 2));
  await fs.writeFile(schemaPath, JSON.stringify(result.schemas, null, 2));
  await fs.writeFile(metadataPath, JSON.stringify(result.metadata, null, 2));
  
  // Only show console output if not in JSON mode
  if (!json) {
    console.log(chalk.green(`📁 Registry written to: ${registryPath}`));
    console.log(chalk.green(`📋 Schemas written to: ${schemaPath}`));
    console.log(chalk.green(`📊 Metadata written to: ${metadataPath}`));
    
    // Show adaptor usage stats
    if (result.stats.adaptorUsage) {
      console.log(chalk.gray('🔧 Adaptor Usage:'));
      Object.entries(result.stats.adaptorUsage).forEach(([name, count]) => {
        console.log(chalk.gray(`   ${name}: ${count} files`));
      });
    }
    
    // Show intelligence findings
    if (intelligence) {
      console.log(chalk.blue('🧠 Project Intelligence:'));
      console.log(chalk.gray(`   Framework: ${intelligence.environment.framework || 'unknown'}`));
      console.log(chalk.gray(`   Confidence: ${intelligence.intelligence.confidence}%`));
      console.log(chalk.gray(`   Readiness: ${intelligence.intelligence.readiness}`));
      
      if (intelligence.setupInstructions.length > 0) {
        console.log(chalk.yellow('⚙️  Setup Required:'));
        intelligence.setupInstructions.forEach(instruction => {
          console.log(chalk.yellow(`   • ${instruction}`));
        });
      } else {
        console.log(chalk.green('✅ Project is ready for component integration'));
      }
    }
  }
  
  // Generate mutation plan if requested
  if (plan) {
    const planPath = path.join(outputDir, 'mutation-plan.json');
    const mutationPlan = generateStarterMutationPlan(result.registry);
    await fs.writeFile(planPath, JSON.stringify(mutationPlan, null, 2));
    if (!json) {
      console.log(chalk.green(`🧠 Mutation plan written to: ${planPath}`));
    }
  }
  
  return {
    registry: result.registry,
    outputDir,
    summary: {
      componentsFound: result.registry.components.length,
      tokensFound: Object.keys(result.registry.tokens || {}).length,
      outputFiles: plan ? 4 : 3,
      adaptorUsage: result.stats.adaptorUsage
    }
  };
}

class MultiFrameworkExtractor {
  constructor(options) {
    this.sourceDir = options.sourceDir;
    this.tokensPath = options.tokensPath;
    this.adaptorName = options.adaptorName; // Force specific adaptor
    this.includeStories = options.includeStories;
    this.llmEnrich = options.llmEnrich;
    this.flattenTokens = options.flattenTokens;
    this.verbose = options.verbose;
    this.barrels = options.barrels;
    this.maxDepth = options.maxDepth;
    this.traceBarrels = options.traceBarrels;
    
    this.components = [];
    this.tokens = {};
    this.stats = {
      adaptorUsage: {},
      filesProcessed: 0,
      filesSkipped: 0,
      totalComponents: 0
    };
    
    this.metadata = {
      extractedAt: new Date().toISOString(),
      sourceDir: this.sourceDir,
      transformedFrom: 'multi-framework',
      version: '3.0.0',
      adaptorRegistry: adaptorRegistry.getAvailableNames()
    };
  }
  
  async extract(globPattern) {
    // Extract theme context first
    const themeContext = await extractThemeContext(this.sourceDir, { verbose: this.verbose });
    
    if (this.verbose && themeContext.config?.cssVariables) {
      console.log(chalk.blue('🎨 Theme-aware extraction enabled'));
      console.log(chalk.gray(`   Mode: ${themeContext.config?.themingMode}`));
      console.log(chalk.gray(`   Base: ${themeContext.config?.baseColor}`));
    }
    
    // Find all component files
    const componentFiles = await glob(globPattern, {
      cwd: this.sourceDir,
      absolute: true,
      ignore: this.includeStories ? [] : ['**/*.stories.*', '**/*.story.*', '**/__tests__/**']
    });
    
    if (this.verbose) {
      console.log(chalk.gray(`Found ${componentFiles.length} files to process`));
    }
    
    // Load design tokens if provided
    if (this.tokensPath) {
      await this.loadTokens();
    }
    
    // Extract components using appropriate adaptors
    for (const filePath of componentFiles) {
      try {
        await this.extractFromFile(filePath);
        this.stats.filesProcessed++;
      } catch (error) {
        this.stats.filesSkipped++;
        if (this.verbose) {
          console.warn(chalk.yellow(`⚠️  Failed to process ${filePath}: ${error.message}`));
        }
      }
    }
    
    this.stats.totalComponents = this.components.length;
    
    // Enhance components with theme context
    const enhancedComponents = this.components.map(component => {
      return enhanceComponentWithThemeContext(component, themeContext);
    });
    
    // Build final registry with theme context
    const registry = {
      name: path.basename(this.sourceDir),
      version: '1.0.0',
      description: `DCP registry extracted from ${this.sourceDir}`,
      components: enhancedComponents,
      tokens: this.tokens,
      themeContext: {
        config: themeContext.config,
        cssVariables: themeContext.cssVariables,
        utilityMappings: Object.keys(themeContext.utilityMappings).length > 0 ? themeContext.utilityMappings : undefined,
        summary: generateThemeContextSummary(themeContext)
      },
      metadata: this.metadata,
      lastModified: new Date().toISOString()
    };
    
    // Generate component schemas
    const schemas = this.generateSchemas();
    
    return {
      registry,
      schemas,
      metadata: this.metadata,
      stats: this.stats
    };
  }
  
  async extractFromFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(this.sourceDir, filePath);
    
    if (this.verbose) {
      console.log(chalk.gray(`Processing: ${relativePath}`));
    }
    
    let adaptor;
    let adaptorName;
    
    // Use specified adaptor or auto-detect
    if (this.adaptorName) {
      adaptor = createAdaptor(this.adaptorName, {
        verbose: this.verbose,
        includeDefaultExports: true,
        unwrapHOCs: true,
        followBarrels: this.barrels !== false,
        maxDepth: parseInt(this.maxDepth) || 10,
        traceBarrels: this.traceBarrels || false
      });
      adaptorName = this.adaptorName;
    } else {
      const detection = autoDetectAdaptor(filePath, content, {
        verbose: this.verbose,
        includeDefaultExports: true,
        unwrapHOCs: true,
        followBarrels: this.barrels !== false,
        maxDepth: parseInt(this.maxDepth) || 10,
        traceBarrels: this.traceBarrels || false
      });
      
      if (!detection) {
        if (this.verbose) {
          console.log(chalk.yellow(`⚠️  No adaptor found for ${relativePath}`));
        }
        return;
      }
      
      adaptor = detection.adaptor;
      adaptorName = detection.name;
      
      if (this.verbose) {
        console.log(chalk.gray(`   Using ${adaptorName} adaptor (${detection.confidence}% confidence)`));
      }
    }
    
    // Track adaptor usage
    this.stats.adaptorUsage[adaptorName] = (this.stats.adaptorUsage[adaptorName] || 0) + 1;
    
    // Extract components using the selected adaptor
    const fileComponents = await adaptor.extractComponents(filePath, content, {
      verbose: this.verbose,
      llmEnrich: this.llmEnrich
    });
    
    if (this.verbose && fileComponents.length > 0) {
      console.log(chalk.green(`   ✅ Found ${fileComponents.length} components`));
      fileComponents.forEach(comp => {
        console.log(chalk.gray(`      - ${comp.name} (${comp.metadata.componentType})`));
      });
    }
    
    // Add to global components list
    this.components.push(...fileComponents);
  }
  
  async loadTokens() {
    try {
      const tokensContent = await fs.readFile(this.tokensPath, 'utf-8');
      
      // Check if this looks like a CSS file and we're in flatten mode
      if (this.flattenTokens || this.tokensPath.endsWith('.css')) {
        // Extract CSS custom properties
        this.tokens = extractCssCustomProps(tokensContent, this.flattenTokens);
        
        if (this.verbose) {
          const tokenCount = this.flattenTokens ? 
            Object.keys(this.tokens).length : 
            Object.values(this.tokens).reduce((sum, cat) => sum + Object.keys(cat).length, 0);
          console.log(chalk.gray(`Extracted ${tokenCount} CSS custom properties`));
        }
      } else {
        // Parse as JSON
        const rawTokens = JSON.parse(tokensContent);
        
        // Normalize tokens into DCP format
        this.tokens = this.normalizeTokens(rawTokens);
        
        if (this.verbose) {
          console.log(chalk.gray(`Loaded ${Object.keys(this.tokens).length} design tokens`));
        }
      }
    } catch (error) {
      if (this.verbose) {
        console.warn(chalk.yellow(`⚠️  Failed to load tokens: ${error.message}`));
      }
    }
  }
  
  normalizeTokens(rawTokens) {
    const normalized = {};
    
    // Handle different token file formats
    if (rawTokens.global) {
      // Design Tokens format
      Object.entries(rawTokens.global).forEach(([category, tokens]) => {
        normalized[category] = this.flattenTokenCategory(tokens);
      });
    } else if (rawTokens.colors || rawTokens.spacing || rawTokens.typography) {
      // Flat token format
      Object.entries(rawTokens).forEach(([category, tokens]) => {
        normalized[category] = tokens;
      });
    } else {
      // Assume it's already normalized
      return rawTokens;
    }
    
    return normalized;
  }
  
  flattenTokenCategory(tokens, prefix = '') {
    const flattened = {};
    
    Object.entries(tokens).forEach(([key, value]) => {
      const tokenKey = prefix ? `${prefix}-${key}` : key;
      
      if (value && typeof value === 'object' && value.value !== undefined) {
        // Design token format with {value, type, description}
        flattened[tokenKey] = value;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Nested tokens
        Object.assign(flattened, this.flattenTokenCategory(value, tokenKey));
      } else {
        // Simple value
        flattened[tokenKey] = { value };
      }
    });
    
    return flattened;
  }
  
  generateSchemas() {
    const schemas = {};
    
    this.components.forEach(component => {
      schemas[component.name] = {
        type: 'object',
        properties: {
          name: { type: 'string', const: component.name },
          props: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                required: { type: 'boolean' },
                default: {}
              },
              required: ['name', 'type', 'required']
            }
          },
          variants: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        required: ['name', 'props']
      };
    });
    
    return schemas;
  }
}

function generateStarterMutationPlan(registry) {
  return {
    planId: `starter-${Date.now()}`,
    description: 'AI-generated starter mutation plan',
    mutations: [
      {
        type: 'example',
        description: 'Change all Button components to use ghost variant',
        patches: [
          {
            op: 'replace',
            path: '/components/0/variants/0/props/variant/default',
            value: 'ghost'
          }
        ]
      }
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      componentsCount: registry.components.length,
      suggestedMutations: registry.components.length * 2
    }
  };
}