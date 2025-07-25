import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import chalk from 'chalk';
import { extractCssCustomProps } from '../core/tokenHandler.js';

/**
 * DCP Transformer V2 - AI-Native Component Extraction
 * 
 * Features:
 * - Fast TypeScript/React component parsing
 * - Automatic prop type inference
 * - Variant detection from prop unions
 * - Token extraction and normalization
 * - AI-ready metadata generation
 * - MCP-optimized output structure
 */

export async function runExtract(source, options = {}) {
  const {
    tokens: tokensPath,
    out: outputDir = './dcp-output',
    glob: globPattern = '**/*.{tsx,jsx,ts,js}',
    includeStories = false,
    llmEnrich = false,
    plan = false,
    json = false,
    flattenTokens = false
  } = options;

  // Only show console output if not in JSON mode
  if (!json) {
    console.log(chalk.blue(`🔍 Extracting components from: ${source}`));
  }
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  const extractor = new ComponentExtractor({
    sourceDir: source,
    tokensPath,
    includeStories,
    llmEnrich,
    flattenTokens,
    verbose: options.verbose && !json  // Suppress verbose output in JSON mode
  });
  
  const result = await extractor.extract(globPattern);
  
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
      outputFiles: plan ? 4 : 3
    }
  };
}

class ComponentExtractor {
  constructor(options) {
    this.sourceDir = options.sourceDir;
    this.tokensPath = options.tokensPath;
    this.includeStories = options.includeStories;
    this.llmEnrich = options.llmEnrich;
    this.flattenTokens = options.flattenTokens;
    this.verbose = options.verbose;
    
    this.components = [];
    this.tokens = {};
    this.metadata = {
      extractedAt: new Date().toISOString(),
      sourceDir: this.sourceDir,
      transformedFrom: 'typescript-react',
      version: '2.0.0'
    };
  }
  
  async extract(globPattern) {
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
    
    // Extract components
    for (const filePath of componentFiles) {
      try {
        await this.extractFromFile(filePath);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Failed to process ${filePath}: ${error.message}`));
      }
    }
    
    // Build final registry
    const registry = {
      name: path.basename(this.sourceDir),
      version: '1.0.0',
      description: `DCP registry extracted from ${this.sourceDir}`,
      components: this.components,
      tokens: this.tokens,
      metadata: this.metadata,
      lastModified: new Date().toISOString()
    };
    
    // Generate component schemas
    const schemas = this.generateSchemas();
    
    return {
      registry,
      schemas,
      metadata: this.metadata
    };
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
      console.warn(chalk.yellow(`⚠️  Failed to load tokens: ${error.message}`));
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
  
  async extractFromFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(this.sourceDir, filePath);
    
    if (this.verbose) {
      console.log(chalk.gray(`Processing: ${relativePath}`));
    }
    
    // Parse with Babel
    const ast = parse(content, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'optionalChaining',
        'nullishCoalescingOperator'
      ]
    });
    
    // Extract components from AST
    const fileComponents = [];
    
    const fileLevelVariants = this.detectCVAVariants(ast);

    traverse.default(ast, {
      // React function components
      FunctionDeclaration: (path) => {
        const component = this.extractFunctionComponent(path.node, content, relativePath);
        if (component) fileComponents.push(component);
      },
      
      // Arrow function components
      VariableDeclarator: (path) => {
        if (this.isReactComponent(path.node)) {
          const component = this.extractArrowComponent(path.node, content, relativePath);
          if (component) fileComponents.push(component);
        }
      },
      
      // Class components
      ClassDeclaration: (path) => {
        if (this.isReactClassComponent(path.node)) {
          const component = this.extractClassComponent(path.node, content, relativePath);
          if (component) fileComponents.push(component);
        }
      },

      // Default exports (export default function Component() {})
      ExportDefaultDeclaration: (path) => {
        const component = this.extractDefaultExportComponent(path.node, content, relativePath);
        if (component) fileComponents.push(component);
      }
    });
    
    // Attach file-level variants (e.g., from CVA) to each component found in this file
    if (Object.keys(fileLevelVariants).length) {
      fileComponents.forEach(c => {
        c.variants = { ...fileLevelVariants, ...c.variants };
      });
    }

    // Detect composition relationships (sub-components)
    fileComponents.forEach(parent => {
      fileComponents.forEach(candidate => {
        if (candidate === parent) return;
        if (candidate.name.startsWith(parent.name)) {
          parent.composition.subComponents.push(candidate.name);
        }
      });
    });

    // Deduplicate components by name (prefer named exports over defaults)
    const deduplicatedComponents = [];
    const nameMap = new Map();
    
    fileComponents.forEach(component => {
      const existing = nameMap.get(component.name);
      if (!existing) {
        nameMap.set(component.name, component);
        deduplicatedComponents.push(component);
      } else {
        // Prefer named exports over default exports
        if (existing.metadata.componentType.includes('default') && 
            !component.metadata.componentType.includes('default')) {
          nameMap.set(component.name, component);
          const index = deduplicatedComponents.findIndex(c => c.name === component.name);
          if (index >= 0) {
            deduplicatedComponents[index] = component;
          }
        }
      }
    });

    // Add to global components list
    this.components.push(...deduplicatedComponents);
  }
  
  extractFunctionComponent(node, source, filePath) {
    if (!this.isReactFunctionComponent(node)) return null;

    const componentName = node.id?.name;
    if (!componentName) return null;

    const component = {
      name: componentName,
      type: 'component',
      category: this.inferCategory(componentName),
      description: this.extractDescription(node, source),
      filePath: filePath,
      props: this.extractProps(node),
      variants: this.extractVariants(node),
      composition: { subComponents: [], slots: [] },
      examples: this.extractExamples(node, source),
      slots: this.extractSlots(node),
      metadata: {
        componentType: 'function',
        extractedAt: new Date().toISOString()
      }
    };

    // AI enrichment
    if (this.llmEnrich) {
      component.aiMetadata = this.generateAIMetadata(component);
    }

    return component;
  }
  
  extractArrowComponent(node, source, filePath) {
    const componentName = node.id?.name;
    if (!componentName || !this.isReactComponentName(componentName)) {
      return null;
    }

    let funcNode = null;
    let componentType = 'arrow';
    
    // Handle regular arrow/function expressions
    if (t.isArrowFunctionExpression(node.init) || t.isFunctionExpression(node.init)) {
      funcNode = node.init;
    }
    // Handle React.forwardRef patterns
    else if (t.isCallExpression(node.init)) {
      const isForwardRef = 
        (t.isMemberExpression(node.init.callee) &&
         t.isIdentifier(node.init.callee.object, { name: 'React' }) &&
         t.isIdentifier(node.init.callee.property, { name: 'forwardRef' })) ||
        t.isIdentifier(node.init.callee, { name: 'forwardRef' });
         
      if (isForwardRef && node.init.arguments[0]) {
        funcNode = node.init.arguments[0];
        componentType = 'forwardRef';
      }
    }
    
    if (!funcNode) {
      return null;
    }

    return {
      name: componentName,
      type: 'component',
      category: this.inferCategory(componentName),
      description: this.extractDescription(node, source),
      filePath: filePath,
      props: this.extractPropsFromArrow(funcNode),
      variants: this.extractVariantsFromArrow(funcNode),
      composition: { subComponents: [], slots: [] },
      examples: [],
      slots: [],
      metadata: {
        componentType,
        extractedAt: new Date().toISOString()
      }
    };
  }
  
  extractClassComponent(node, source, filePath) {
    return {
      name: node.id.name,
      type: 'component',
      category: this.inferCategory(node.id.name),
      description: this.extractDescription(node, source),
      filePath: filePath,
      props: this.extractPropsFromClass(node),
      variants: {},
      composition: { subComponents: [], slots: [] },
      examples: [],
      slots: [],
      metadata: {
        componentType: 'class',
        extractedAt: new Date().toISOString()
      }
    };
  }
  
  extractDefaultExportComponent(node, source, filePath) {
    const declaration = node.declaration;
    
    // Unwrap common HOC patterns (forwardRef, memo, etc.)
    const unwrapped = this.unwrapHOC(declaration);
    
    // Handle different types of default exports
    if (t.isFunctionDeclaration(unwrapped)) {
      // export default function Component() {}
      const name = unwrapped.id?.name || this.inferComponentName(filePath);
      if (!this.isReactComponentName(name)) return null;
      
      return {
        name,
        type: 'component',
        category: this.inferCategory(name),
        description: this.extractDescription(unwrapped, source),
        filePath: filePath,
        props: this.extractProps(unwrapped),
        variants: this.extractVariants(unwrapped),
        composition: { subComponents: [], slots: [] },
        examples: [],
        slots: [],
        metadata: {
          componentType: 'defaultFunction',
          extractedAt: new Date().toISOString()
        }
      };
    }
    
    if (t.isArrowFunctionExpression(unwrapped) || t.isFunctionExpression(unwrapped)) {
      // export default () => {} or const Component = () => {}; export default Component;
      const name = this.inferComponentName(filePath);
      if (!this.isReactComponentName(name)) return null;
      
      return {
        name,
        type: 'component',
        category: this.inferCategory(name),
        description: this.extractDescription(unwrapped, source),
        filePath: filePath,
        props: this.extractPropsFromArrow(unwrapped),
        variants: this.extractVariantsFromArrow(unwrapped),
        composition: { subComponents: [], slots: [] },
        examples: [],
        slots: [],
        metadata: {
          componentType: 'defaultArrow',
          extractedAt: new Date().toISOString()
        }
      };
    }
    
    if (t.isIdentifier(declaration)) {
      // export default Component (where Component is defined elsewhere in the file)
      const name = declaration.name;
      if (!this.isReactComponentName(name)) return null;
      
      // We need to find the actual declaration in the AST
      // For now, create a basic component structure
      return {
        name,
        type: 'component',
        category: this.inferCategory(name),
        description: '',
        filePath: filePath,
        props: [],
        variants: {},
        composition: { subComponents: [], slots: [] },
        examples: [],
        slots: [],
        metadata: {
          componentType: 'defaultIdentifier',
          extractedAt: new Date().toISOString()
        }
      };
    }
    
    return null;
  }
  
  unwrapHOC(node) {
    // Recursively unwrap Higher-Order Components like forwardRef, memo, etc.
    if (t.isCallExpression(node)) {
      const callee = node.callee;
      
      // React.forwardRef, React.memo, etc.
      if (t.isMemberExpression(callee) && 
          t.isIdentifier(callee.object, { name: 'React' }) &&
          ['forwardRef', 'memo'].includes(callee.property.name)) {
        return this.unwrapHOC(node.arguments[0]);
      }
      
      // forwardRef, memo (imported)
      if (t.isIdentifier(callee) && ['forwardRef', 'memo'].includes(callee.name)) {
        return this.unwrapHOC(node.arguments[0]);
      }
    }
    
    return node;
  }
  
  inferComponentName(filePath) {
    // Extract component name from file path
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // Convert kebab-case or snake_case to PascalCase
    const pascalCase = fileName
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    
    return pascalCase;
  }
  
  isReactFunctionComponent(node) {
    return (
      node.id?.name &&
      this.isReactComponentName(node.id.name) &&
      this.hasJSXReturn(node)
    );
  }
  
  isReactClassComponent(node) {
    return (
      node.superClass &&
      (
        (t.isIdentifier(node.superClass) && node.superClass.name === 'Component') ||
        (t.isMemberExpression(node.superClass) && 
         node.superClass.object.name === 'React' && 
         node.superClass.property.name === 'Component')
      )
    );
  }
  
  isReactComponent(node) {
    if (!t.isIdentifier(node.id) || !this.isReactComponentName(node.id.name)) {
      return false;
    }
    
    // Standard arrow/function expressions
    if (t.isArrowFunctionExpression(node.init) || t.isFunctionExpression(node.init)) {
      return true;
    }
    
    // React.forwardRef() patterns
    if (t.isCallExpression(node.init)) {
      // React.forwardRef pattern
      if (t.isMemberExpression(node.init.callee) &&
          t.isIdentifier(node.init.callee.object, { name: 'React' }) &&
          t.isIdentifier(node.init.callee.property, { name: 'forwardRef' })) {
        return true;
      }
      
      // forwardRef (imported) pattern  
      if (t.isIdentifier(node.init.callee, { name: 'forwardRef' })) {
        return true;
      }
    }
    
    return false;
  }
  
  isReactComponentName(name) {
    return /^[A-Z][A-Za-z0-9]*$/.test(name);
  }
  
  hasJSXReturn(node) {
    // Simple heuristic - look for JSX in function body
    const bodyStr = node.toString();
    return bodyStr.includes('<') && bodyStr.includes('>');
  }
  
  extractProps(node) {
    const props = [];
    
    // Look for TypeScript interface or type props
    if (node.params?.[0]?.typeAnnotation) {
      const typeAnnotation = node.params[0].typeAnnotation;
      props.push(...this.parseTypeAnnotation(typeAnnotation));
    }
    
    // Look for destructured props
    if (t.isObjectPattern(node.params?.[0])) {
      props.push(...this.parseObjectPattern(node.params[0]));
    }
    
    return props;
  }
  
  extractPropsFromArrow(node) {
    const props = [];
    
    if (node.params?.[0]?.typeAnnotation) {
      props.push(...this.parseTypeAnnotation(node.params[0].typeAnnotation));
    }
    
    if (t.isObjectPattern(node.params?.[0])) {
      props.push(...this.parseObjectPattern(node.params[0]));
    }
    
    return props;
  }
  
  extractPropsFromClass(node) {
    // For class components, look for static propTypes or TypeScript generic
    return [];
  }
  
  parseTypeAnnotation(typeAnnotation) {
    const props = [];
    
    // This is a simplified parser - in production you'd want a more robust solution
    // For now, we'll extract basic prop information
    
    return props;
  }
  
  parseObjectPattern(pattern) {
    const props = [];
    
    pattern.properties.forEach(prop => {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        props.push({
          name: prop.key.name,
          type: this.inferPropType(prop),
          required: !prop.optional,
          description: '',
          default: this.extractDefault(prop)
        });
      }
    });
    
    return props;
  }
  
  inferPropType(prop) {
    // Basic type inference
    if (prop.typeAnnotation?.typeAnnotation) {
      const type = prop.typeAnnotation.typeAnnotation;
      if (t.isStringTypeAnnotation(type)) return 'string';
      if (t.isNumberTypeAnnotation(type)) return 'number';
      if (t.isBooleanTypeAnnotation(type)) return 'boolean';
      if (t.isUnionTypeAnnotation(type)) return 'union';
    }
    
    return 'unknown';
  }
  
  extractDefault(prop) {
    if (t.isAssignmentPattern(prop.value)) {
      return this.evaluateDefault(prop.value.right);
    }
    return null;
  }
  
  evaluateDefault(node) {
    if (t.isStringLiteral(node)) return node.value;
    if (t.isNumericLiteral(node)) return node.value;
    if (t.isBooleanLiteral(node)) return node.value;
    if (t.isNullLiteral(node)) return null;
    return undefined;
  }
  
  extractVariants(node) {
    const variants = {};

    // From parameter union types
    const param = node.params?.[0];
    if (param?.typeAnnotation?.typeAnnotation) {
      this.parseVariantsFromType(param.typeAnnotation.typeAnnotation, variants);
    }

    // From destructured props with type annotations
    if (t.isObjectPattern(param)) {
      param.properties.forEach(prop => {
        if (t.isObjectProperty(prop) && prop.typeAnnotation?.typeAnnotation) {
          const propName = prop.key.name;
          this.parseVariantsFromType(prop.typeAnnotation.typeAnnotation, variants, propName);
        }
      });
    }

    return variants;
  }
  
  extractVariantsFromArrow(node) {
    return this.extractVariants({ params: node.params });
  }

  parseVariantsFromType(typeNode, variants, propName = 'variant') {
    if (!typeNode) return;

    if (t.isTSUnionType(typeNode) && typeNode.types.every(tn => t.isTSLiteralType(tn) && t.isStringLiteral(tn.literal))) {
      const values = typeNode.types.map(tn => tn.literal.value);
      if (values.length) {
        variants[propName] = values;
      }
    }
  }

  detectCVAVariants(ast) {
    const variants = {};
    traverse.default(ast, {
      CallExpression: (p) => {
        if (!t.isIdentifier(p.node.callee) || p.node.callee.name !== 'cva') return;
        const [, optionsArg] = p.node.arguments;
        if (!optionsArg || !t.isObjectExpression(optionsArg)) return;

        const variantsProp = optionsArg.properties.find(prop => t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'variants' }));
        if (!variantsProp || !t.isObjectProperty(variantsProp) || !t.isObjectExpression(variantsProp.value)) return;

        variantsProp.value.properties.forEach(groupProp => {
          if (!t.isObjectProperty(groupProp) || !t.isObjectExpression(groupProp.value)) return;
          const groupName = groupProp.key.name || (t.isStringLiteral(groupProp.key) ? groupProp.key.value : undefined);
          if (!groupName) return;
          variants[groupName] = groupProp.value.properties.map(vProp => vProp.key.name || (t.isStringLiteral(vProp.key) ? vProp.key.value : undefined)).filter(Boolean);
        });
      }
    });
    return variants;
  }
  
  // NEW: Detect component composition and relationships
  detectComposition(ast, filePath) {
    const composition = {
      subComponents: [],
      slots: [],
      exports: []
    };
    
    // Find all exports to detect component families
    traverse.default(ast, {
      ExportNamedDeclaration: (path) => {
        if (path.node.declaration) {
          // Direct export: export const CardHeader = ...
          if (t.isVariableDeclaration(path.node.declaration)) {
            path.node.declaration.declarations.forEach(decl => {
              if (t.isIdentifier(decl.id)) {
                composition.exports.push(decl.id.name);
              }
            });
          }
          // Function export: export function CardHeader() {}
          if (t.isFunctionDeclaration(path.node.declaration)) {
            composition.exports.push(path.node.declaration.id.name);
          }
        }
        
        // Named exports: export { CardHeader, CardContent }
        if (path.node.specifiers) {
          path.node.specifiers.forEach(spec => {
            if (t.isExportSpecifier(spec)) {
              composition.exports.push(spec.exported.name);
            }
          });
        }
      }
    });
    
    // Detect component families by naming patterns
    const mainComponents = composition.exports.filter(name => 
      // Main components are usually shorter and don't contain other component names
      !composition.exports.some(other => 
        other !== name && name.startsWith(other) && name.length > other.length
      )
    );
    
    mainComponents.forEach(mainComponent => {
      const subComponents = composition.exports.filter(name =>
        name !== mainComponent && 
        name.startsWith(mainComponent) &&
        name.length > mainComponent.length
      );
      
      if (subComponents.length > 0) {
        composition.subComponents = subComponents;
      }
    });
    
    return composition;
  }
  
  extractExamples(node, source) {
    // Extract JSDoc examples or look for usage patterns
    return [];
  }
  
  extractSlots(node) {
    // Extract children or slot patterns
    return [];
  }
  
  extractDescription(node, source) {
    // Extract JSDoc comments or leading comments
    if (node.leadingComments && node.leadingComments.length > 0) {
      const comment = node.leadingComments[node.leadingComments.length - 1];
      if (comment.type === 'CommentBlock') {
        return comment.value.replace(/^\*+/gm, '').trim();
      }
    }
    
    return '';
  }
  
  inferCategory(componentName) {
    // Simple category inference based on component name
    const name = componentName.toLowerCase();
    
    if (name.includes('button')) return 'actions';
    if (name.includes('input') || name.includes('form')) return 'forms';
    if (name.includes('card') || name.includes('panel')) return 'layout';
    if (name.includes('text') || name.includes('heading')) return 'typography';
    if (name.includes('icon')) return 'icons';
    if (name.includes('modal') || name.includes('dialog')) return 'overlays';
    
    return 'components';
  }
  
  generateAIMetadata(component) {
    return {
      aiDescription: `${component.name} is a React component that can be used for ${component.category}.`,
      mutationHints: [
        `Change ${component.name} variant`,
        `Update ${component.name} styling`,
        `Add props to ${component.name}`
      ],
      llmContext: {
        componentName: component.name,
        propsCount: component.props.length,
        hasVariants: component.variants.length > 0,
        category: component.category
      }
    };
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
          },
          composition: {
            type: 'object',
            properties: {
              slots: {
                type: 'array',
                items: { type: 'string' }
              },
              subComponents: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            additionalProperties: false
          },
          examples: {
            type: 'array',
            items: {
              type: 'string'
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