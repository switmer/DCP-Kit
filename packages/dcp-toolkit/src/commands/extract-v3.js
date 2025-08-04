import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { extractCssCustomProps } from '../tokens/legacyCssVarExtractor.js';
import { adaptorRegistry, createAdaptor, autoDetectAdaptor } from '../adaptors/registry.js';
import { extractThemeContext, enhanceComponentWithThemeContext, generateThemeContextSummary } from '../core/themeExtractor.js';
import { ProjectIntelligenceScanner } from '../core/projectIntelligence.js';
import { TokenDetector } from '../tokens/detector.js';
import { UniversalTokenExtractor } from '../tokens/extractor.js';

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

/**
 * Get optimized glob pattern based on project structure
 * Supports monorepos, custom layouts, and legacy codebases
 */
async function getOptimizedGlob(sourceDir, userGlob) {
  // If user provided a specific glob, use it
  if (userGlob && userGlob !== '**/*.{tsx,jsx,ts,js}') {
    return userGlob;
  }
  
  // Common source directory candidates (order matters - most specific first)
  const candidates = [
    'src',           // Most React/Vue/Angular projects
    'app',           // Next.js 13+ app directory, some Rails apps
    'components',    // Component libraries, Storybook projects
    'packages',      // Monorepos (will scan all packages)
    'lib',           // Library code, some Node.js projects
    'ui',            // UI component libraries
    'frontend',      // Full-stack projects
    'client',        // Client-server architectures
    'web',           // Some monorepos
    'apps',          // Some monorepos (plural)
  ];
  
  // Look for the first existing candidate directory
  for (const candidate of candidates) {
    try {
      const candidatePath = path.join(sourceDir, candidate);
      if (fsSync.existsSync(candidatePath)) {
        // Check if it contains actual component files (not just config)
        const testGlob = `${candidate}/**/*.{tsx,jsx,ts,js}`;
        const sampleFiles = await glob(testGlob, { 
          cwd: sourceDir, 
          ignore: ['**/node_modules/**', '**/*.d.ts', '**/*.config.*'],
          nodir: true 
        });
        const limitedSample = sampleFiles.slice(0, 5); // Just check first 5 files
        
        if (sampleFiles.length > 0) {
          console.log(`🎯 Using directory: ${candidate}/ (found ${sampleFiles.length}+ component files)`);
          return testGlob;
        }
      }
    } catch (e) {
      // Continue to next candidate
    }
  }
  
  // No specific directory found - scan root but with aggressive filtering
  console.log('⚠️  No standard source directory found, scanning project root with aggressive filtering');
  return '**/*.{tsx,jsx,ts,js}';
}

export async function runExtract(source, options = {}) {
  const {
    tokens: tokensPath,
    out: outputDir = path.join(source, 'registry'),
    glob: userGlob = '**/*.{tsx,jsx,ts,js}',
    adaptor: adaptorName,
    includeStories = false,
    llmEnrich = false,
    plan = false,
    json = false,
    flattenTokens = false,
    verbose = false,
    autoDetectTokens = false // NEW: Auto-detect tokens option
  } = options;
  
  // Get optimized glob pattern based on project structure
  const globPattern = await getOptimizedGlob(source, userGlob);

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
    traceBarrels: options.traceBarrels,
    autoDetectTokens
  });
  
  const result = await extractor.extract(globPattern);
  
  // Run project intelligence scan for enhanced onboarding
  const projectScanner = new ProjectIntelligenceScanner(source);
  const intelligence = await projectScanner.scan();
  
  // Enhance registry with intelligence data
  result.registry.intelligence = intelligence;
  
  // Create subdirectories for individual components and tokens
  const componentsDir = path.join(outputDir, 'components');
  const tokensDir = path.join(outputDir, 'tokens');
  
  await fs.mkdir(componentsDir, { recursive: true });
  await fs.mkdir(tokensDir, { recursive: true });
  
  // Write individual component files
  if (result.registry.components && result.registry.components.length > 0) {
    for (const component of result.registry.components) {
      const componentPath = path.join(componentsDir, `${component.name}.dcp.json`);
      await fs.writeFile(componentPath, JSON.stringify(component, null, 2));
    }
  }
  
  // Write individual token category files
  if (result.registry.tokens && Object.keys(result.registry.tokens).length > 0) {
    for (const [category, tokens] of Object.entries(result.registry.tokens)) {
      const tokenPath = path.join(tokensDir, `${category}.json`);
      await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));
    }
  }
  
  // Write main registry files
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
    
    // Show subdirectory creation
    const componentCount = result.registry.components?.length || 0;
    const tokenCategories = Object.keys(result.registry.tokens || {}).length;
    
    if (componentCount > 0) {
      console.log(chalk.green(`📦 ${componentCount} component files written to: ${componentsDir}`));
    }
    if (tokenCategories > 0) {
      console.log(chalk.green(`🎨 ${tokenCategories} token category files written to: ${tokensDir}`));
    }
    
    // Show performance metrics
    const extractionTime = result.stats.extractionTime / 1000; // Convert to seconds
    const componentsWithProps = result.registry.components.filter(c => c.props?.length > 0).length;
    const successRate = componentCount > 0 ? (componentsWithProps / componentCount * 100).toFixed(1) : 0;
    
    console.log(chalk.blue('⚡ Performance Metrics:'));
    console.log(chalk.gray(`   Files processed: ${result.stats.filesProcessed}`));
    console.log(chalk.gray(`   Components found: ${componentCount}`));
    console.log(chalk.gray(`   Components with props: ${componentsWithProps} (${successRate}%)`));
    console.log(chalk.gray(`   Total time: ${extractionTime.toFixed(1)}s`));
    if (componentCount > 0) {
      console.log(chalk.gray(`   Average: ${(extractionTime / componentCount * 1000).toFixed(0)}ms per component`));
    }
    
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
    this.autoDetectTokens = options.autoDetectTokens; // NEW: Auto-detect tokens
    
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
    const startTime = performance.now();
    
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
      ignore: [
        // Always ignore these directories
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
        '**/.nyc_output/**',
        '**/tmp/**',
        '**/temp/**',
        
        // Ignore specific file types that aren't components
        '**/*.d.ts',        // TypeScript definitions
        '**/*.test.*',      // Test files
        '**/*.spec.*',      // Spec files
        '**/*.config.*',    // Config files
        '**/.*',            // Hidden files
        
        // Conditionally ignore stories and tests
        ...(this.includeStories ? [] : ['**/*.stories.*', '**/*.story.*', '**/__tests__/**'])
      ]
    });
    
    if (this.verbose) {
      console.log(chalk.gray(`Found ${componentFiles.length} files to process`));
    }
    
    // Load design tokens if provided or auto-detection is enabled
    if (this.tokensPath || this.autoDetectTokens) {
      await this.loadTokens();
    }
    
    // Extract components using appropriate adaptors (with parallel processing)
    const batchSize = 10; // Process 10 files at a time to avoid overwhelming the system
    const fileBatches = [];
    
    for (let i = 0; i < componentFiles.length; i += batchSize) {
      fileBatches.push(componentFiles.slice(i, i + batchSize));
    }
    
    if (this.verbose) {
      console.log(chalk.gray(`Processing ${componentFiles.length} files in ${fileBatches.length} batches of ${batchSize}`));
    }
    
    for (const batch of fileBatches) {
      await Promise.all(batch.map(async (filePath) => {
        try {
          await this.extractFromFile(filePath);
          this.stats.filesProcessed++;
        } catch (error) {
          this.stats.filesSkipped++;
          if (this.verbose) {
            console.warn(chalk.yellow(`⚠️  Failed to process ${filePath}: ${error.message}`));
          }
        }
      }));
      
      // Show progress for large extractions
      if (!this.json && fileBatches.length > 10) {
        const processed = Math.min(this.stats.filesProcessed + this.stats.filesSkipped, componentFiles.length);
        const progress = ((processed / componentFiles.length) * 100).toFixed(1);
        process.stdout.write(`\r🔄 Progress: ${progress}% (${processed}/${componentFiles.length})`);
      }
    }
    
    if (!this.json && fileBatches.length > 10) {
      process.stdout.write('\n'); // New line after progress indicator
    }
    
    this.stats.totalComponents = this.components.length;
    
    // Performance timing
    const extractionTime = performance.now() - startTime;
    this.stats.extractionTime = extractionTime;
    this.stats.avgTimePerFile = componentFiles.length > 0 ? extractionTime / componentFiles.length : 0;
    
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
        console.log(chalk.gray(`      - ${comp.name} (${comp.extensions?.componentType || 'unknown'})`));
      });
    }
    
    // Add to global components list
    this.components.push(...fileComponents);
  }
  
  async loadTokens() {
    try {
      // Check if we should auto-detect tokens
      if (this.autoDetectTokens) {
        await this.loadTokensWithAutoDetection();
        return;
      }

      // Original manual token loading logic
      if (this.tokensPath) {
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
      }
    } catch (error) {
      if (this.verbose) {
        console.warn(chalk.yellow(`⚠️  Failed to load tokens: ${error.message}`));
      }
    }
  }

  async loadTokensWithAutoDetection() {
    try {
      // Initialize token detector with proper output directory
      const outputDir = path.dirname(this.sourceDir) !== this.sourceDir ? 
        path.join(this.sourceDir, 'registry') : 
        './registry';
        
      const detector = new TokenDetector(this.sourceDir, { 
        verbose: this.verbose,
        outputDir: outputDir
      });
      
      // Detect all token sources
      const detectedSources = await detector.detectAll();
      
      if (detectedSources.length === 0) {
        if (this.verbose) {
          console.log(chalk.yellow('⚠️  No token sources detected'));
        }
        return;
      }

      // Initialize universal token extractor with logger
      const extractor = new UniversalTokenExtractor({ 
        verbose: this.verbose,
        logger: detector.getLogger()
      });
      
      // Extract tokens from all detected sources
      const extractedTokens = await extractor.extractAll(detectedSources);
      
      // Convert to DCP format
      this.tokens = this.normalizeExtractedTokens(extractedTokens);
      
      // Write detection log
      try {
        await detector.writeLog();
        if (this.verbose) {
          detector.printSummary();
        }
      } catch (error) {
        if (this.verbose) {
          console.warn(chalk.yellow(`⚠️  Failed to write detection log: ${error.message}`));
        }
      }
      
      if (this.verbose) {
        const summary = detector.getSummary();
        console.log(chalk.green(`🎨 Auto-detected token sources:`));
        Object.entries(summary.byType).forEach(([type, count]) => {
          console.log(chalk.gray(`  ${type}: ${count} source(s)`));
        });
        console.log(chalk.green(`✅ Total tokens extracted: ${summary.totalTokens}`));
      }
    } catch (error) {
      if (this.verbose) {
        console.warn(chalk.yellow(`⚠️  Auto-detection failed: ${error.message}`));
      }
    }
  }

  normalizeExtractedTokens(extractedTokens) {
    const normalized = {};
    
    // Group tokens by category
    for (const [name, token] of Object.entries(extractedTokens)) {
      const category = token.category || 'custom';
      if (!normalized[category]) {
        normalized[category] = {};
      }
      normalized[category][name] = {
        value: token.value,
        type: token.type,
        description: token.description,
        source: token.source
      };
    }
    
    return normalized;
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