import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import path from 'path';
import fs from 'fs';
import { resolveExport } from './moduleResolver.js';
import { symbolTable, getCachedAst, setCachedAst } from '../../core/graphCache.js';
import { ThemeAnalyzer } from '../../core/themeAnalyzer.js';
import { parseTSX } from '../../core/parser.js';
import { createTSMorphExtractor } from '../../extractors/tsMorphExtractor.js';

/**
 * React TSX Adaptor for DCP Transformer
 * 
 * Supports:
 * - Named exports (export function Component, export const Component)
 * - Default exports (export default function Component)
 * - forwardRef/memo unwrapping
 * - Arrow functions and function declarations
 * - TypeScript interfaces and prop extraction
 * 
 * Now supports:
 * - Barrel file recursion via dedicated moduleResolver
 * - Cycle detection and caching for performance
 * 
 * Does NOT support:
 * - Class components (legacy)
 * - Non-standard React patterns
 */

export class ReactTSXAdaptor {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.includeDefaultExports = options.includeDefaultExports !== false;
    this.unwrapHOCs = options.unwrapHOCs !== false;
    this.followBarrels = options.followBarrels !== false;
    this.maxDepth = options.maxDepth || 10;
    this.traceBarrels = options.traceBarrels || false;
    
    // Initialize theme analyzer
    this.themeAnalyzer = new ThemeAnalyzer({ verbose: this.verbose });
    
    // Initialize ts-morph extractor (lazy)
    this.tsMorphExtractor = null;
    this.tsMorphInitialized = false;
    
    // Barrel resolution context
    this.resolverContext = {
      visitedFiles: new Set(),
      symbolTable: symbolTable,
      maxDepth: this.maxDepth,
      currentDepth: 0,
      traceBarrels: this.traceBarrels,
      verbose: this.verbose
    };
  }

  /**
   * Initialize ts-morph extractor lazily - ONCE per project
   */
  async initializeTSMorph(projectPath) {
    if (this.tsMorphInitialized) {
      return this.tsMorphExtractor !== null;
    }

    try {
      this.tsMorphExtractor = createTSMorphExtractor({
        fallbackToUnknown: true,
        includeInheritedProps: true,
        maxDepth: 10
      });

      // Find project root (not per-file path)
      const projectRoot = this.findProjectRoot(projectPath);
      const success = await this.tsMorphExtractor.initialize(projectRoot);
      this.tsMorphInitialized = true;

      if (this.verbose && success) {
        console.log(`   🔧 ts-morph extractor initialized successfully (once per project)`);
      } else if (this.verbose) {
        console.log(`   ⚠️ ts-morph extractor initialized with fallback config`);
      }

      return success;
    } catch (error) {
      if (this.verbose) {
        console.log(`   ❌ ts-morph extractor initialization failed: ${error.message}`);
      }
      this.tsMorphExtractor = null;
      this.tsMorphInitialized = true;
      return false;
    }
  }

  /**
   * Find project root (where package.json or tsconfig.json lives)
   */
  findProjectRoot(startPath) {
    let currentPath = startPath;
    while (currentPath && currentPath !== '/') {
      const packageJsonPath = path.join(currentPath, 'package.json');
      const tsconfigPath = path.join(currentPath, 'tsconfig.json');
      
      try {
        if (require('fs').existsSync(packageJsonPath) || require('fs').existsSync(tsconfigPath)) {
          return currentPath;
        }
      } catch (error) {
        // Continue searching up the tree
      }
      
      currentPath = path.dirname(currentPath);
    }
    
    // Fallback to startPath if no project root found
    return startPath;
  }

  canProcess(filePath, source) {
    // File extension check
    const ext = path.extname(filePath);
    if (!['.tsx', '.jsx', '.ts', '.js'].includes(ext)) {
      return false;
    }
    
    // Quick heuristic - look for JSX, React imports, or export statements (for barrels)
    return source.includes('React') || 
           source.includes('<') || 
           source.includes('jsx') ||
           source.includes('function') ||
           source.includes('=>') ||
           source.includes('export');
  }

  async extractComponents(filePath, source, options = {}) {
    try {
      // TEMPORARY: Skip react-docgen-typescript entirely - it fails on BaseWeb's malformed tsconfig
      // Go straight to ts-morph for TypeScript files (much faster)
      const isTypeScript = filePath.endsWith('.tsx') || filePath.endsWith('.ts');
      let tsxResult = null;
      
      if (isTypeScript) {
        if (this.verbose) {
          console.log(`   🚀 Using ts-morph directly (skipping react-docgen-typescript)`);
        }
        
        if (!this.tsMorphInitialized) {
          try {
            await this.initializeTSMorph(path.dirname(filePath));
            // We'll use ts-morph during component processing
          } catch (tsMorphError) {
            if (this.verbose) {
              console.log(`   ⚠️ ts-morph initialization failed: ${tsMorphError.message}`);
            }
          }
        }
      }

      const ast = this.parseSource(source);
      const components = [];
      
      // Extract file-level variants (CVA, etc.)
      const fileLevelVariants = this.detectCVAVariants(ast);
      
      traverse.default(ast, {
        // Named function exports
        FunctionDeclaration: (path) => {
          if (this.isExportedFunction(path)) {
            const component = this.extractFunctionComponent(path.node, source, filePath);
            if (component) components.push(component);
          }
        },
        
        // Arrow/const exports
        VariableDeclarator: (path) => {
          if (this.isReactComponent(path.node)) {
            const component = this.extractArrowComponent(path.node, source, filePath);
            if (component) components.push(component);
          }
        },
        
        // Default exports
        ExportDefaultDeclaration: (path) => {
          if (this.includeDefaultExports) {
            const component = this.extractDefaultExportComponent(path.node, source, filePath);
            if (component) components.push(component);
          }
        },
        
        // Barrel exports (export { Button } from './button')
        ExportNamedDeclaration: (path) => {
          if (this.followBarrels && path.node.source) {
            const resolved = resolveExport(path.node, filePath, this.resolverContext);
            resolved.forEach(desc => {
              const component = this.createComponentFromDescriptor(desc, source);
              if (component) components.push(component);
            });
          }
        },
        
        // Re-exports (export * from './components')
        ExportAllDeclaration: (path) => {
          if (this.followBarrels && path.node.source) {
            const resolved = resolveExport(path.node, filePath, this.resolverContext);
            resolved.forEach(desc => {
              const component = this.createComponentFromDescriptor(desc, source);
              if (component) components.push(component);
            });
          }
        }
      });
      
      // Apply file-level variants to all components
      if (Object.keys(fileLevelVariants).length > 0) {
        components.forEach(comp => {
          comp.variants = { ...fileLevelVariants, ...comp.variants };
        });
      }
      
      // Deduplicate by name (prefer named exports over defaults)
      const deduplicated = this.deduplicateComponents(components);
      
      // Enhance with TypeScript analysis if available
      let enhanced = deduplicated;
      
      // Primary: react-docgen-typescript enhancement  
      if (tsxResult && enhanced.length > 0) {
        enhanced = enhanced.map(component => {
          // Match TypeScript data to Babel component by name
          if (component.name === tsxResult.name || 
              (enhanced.length === 1 && tsxResult.name)) {
            
            if (this.verbose) {
              console.log(`   🔗 Merging TypeScript analysis for: ${component.name}`);
            }
            
            return {
              ...component,
              // Enhance props with TypeScript analysis
              props: this.mergeProps(component.props, tsxResult.props),
              // Add TypeScript-extracted tokens
              tokensUsed: {
                ...component.tokensUsed,
                ...tsxResult.tokensUsed
              },
              // Add variant style mappings
              variantStyleMappings: tsxResult.variantStyleMappings,
              // Enhanced styles information
              styles: {
                ...component.styles,
                ...tsxResult.styles
              },
              // Mark as enhanced with TypeScript
              metadata: {
                ...component.metadata,
                typescriptAnalysis: true,
                enhancedAt: new Date().toISOString()
              }
            };
          }
          return component;
        });
      }
      
      // Secondary: ts-morph enhancement for components without TypeScript props
      if (this.tsMorphExtractor && enhanced.length > 0) {
        enhanced = await Promise.all(enhanced.map(async (component) => {
          // Skip if component already has rich TypeScript props (not just Babel unknowns)
          if (component.props && component.props.length > 0 && 
              component.props.some(p => p.source !== 'babel' && p.type !== 'unknown')) {
            return component;
          }
          
          try {
            if (this.verbose) {
              console.log(`   🔍 Attempting ts-morph enhancement for: ${component.name}`);
            }
            
            const tsMorphResult = await this.tsMorphExtractor.extractComponentProps(
              filePath, 
              component.name
            );
            
            if (this.verbose) {
              console.log(`   📊 ts-morph result: success=${tsMorphResult.success}, props=${tsMorphResult.props?.length || 0}, error=${tsMorphResult.error || 'none'}`);
            }
            
            if (tsMorphResult.success && tsMorphResult.props.length > 0) {
              if (this.verbose) {
                console.log(`   🔧 ts-morph enhanced: ${component.name} (${tsMorphResult.props.length} props)`);
              }
              
              // Transform ts-morph props to DCP format
              const dcpProps = {};
              tsMorphResult.props.forEach(prop => {
                dcpProps[prop.name] = {
                  type: this.mapTypeToDCPEnum(prop.type),
                  description: prop.description || '',
                  required: prop.required !== false,
                  source: this.mapSourceToDCPEnum(prop.source)
                };
              });

              return {
                ...component,
                props: dcpProps,
                extensions: {
                  ...component.extensions,
                  tsMorphAnalysis: true,
                  typescriptAnalysis: true
                }
              };
            }
          } catch (error) {
            if (this.verbose) {
              console.log(`   ⚠️ ts-morph failed for ${component.name}: ${error.message}`);
            }
          }
          
          return component;
        }));
      }

      // Enhance components with theme-aware context
      const themeEnhanced = await Promise.all(
        enhanced.map(component => 
          this.themeAnalyzer.enhanceComponentWithTheme(component, source, filePath)
        )
      );
      
      if (this.verbose) {
        const tsEnhanced = themeEnhanced.filter(c => c.metadata?.typescriptAnalysis).length;
        console.log(`[ReactTSX] ${filePath}: Found ${themeEnhanced.length} components (${tsEnhanced} TypeScript-enhanced)`);
        
        // Show ts-morph performance metrics if available
        if (this.tsMorphExtractor && this.tsMorphExtractor.cacheStats.totalQueries > 0) {
          const stats = this.tsMorphExtractor.cacheStats;
          const hitRate = ((stats.typeCacheHits + stats.symbolCacheHits + stats.intersectionCacheHits) / stats.totalQueries * 100).toFixed(1);
          console.log(`   📊 ts-morph: ${stats.totalQueries} queries, ${hitRate}% cache hit rate, ${stats.reactDomSkips} DOM skips`);
        }
      }
      
      return themeEnhanced;
      
    } catch (error) {
      if (this.verbose) {
        console.warn(`[ReactTSX] Failed to parse ${filePath}: ${error.message}`);
      }
      return [];
    }
  }

  parseSource(source) {
    return parse(source, {
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
  }

  isExportedFunction(path) {
    // Check if function is directly exported or part of export declaration
    return path.isExportDeclaration() || 
           (path.node.id?.name && this.isReactComponentName(path.node.id.name));
  }

  isReactComponent(node) {
    if (!t.isIdentifier(node.id) || !this.isReactComponentName(node.id.name)) {
      return false;
    }
    
    // Unwrap TypeScript type casting first (e.g., React.forwardRef(...) as ForwardRefComponent)
    let init = node.init;
    if (t.isTSAsExpression(init)) {
      init = init.expression;
    }
    
    // Standard arrow/function expressions
    if (t.isArrowFunctionExpression(init) || t.isFunctionExpression(init)) {
      return true;
    }
    
    // HOC patterns (forwardRef, memo, etc.)
    if (this.unwrapHOCs && t.isCallExpression(init)) {
      const unwrapped = this.unwrapHOC(init);
      return t.isArrowFunctionExpression(unwrapped) || t.isFunctionExpression(unwrapped);
    }
    
    return false;
  }

  isReactComponentName(name) {
    return /^[A-Z][A-Za-z0-9]*$/.test(name);
  }

  unwrapHOC(node) {
    if (!t.isCallExpression(node)) return node;
    
    const callee = node.callee;
    const hocNames = ['forwardRef', 'memo', 'observer'];
    
    // React.forwardRef, React.memo, etc.
    if (t.isMemberExpression(callee) && 
        t.isIdentifier(callee.object, { name: 'React' }) &&
        hocNames.includes(callee.property.name)) {
      return this.unwrapHOC(node.arguments[0]);
    }
    
    // forwardRef, memo (imported)
    if (t.isIdentifier(callee) && hocNames.includes(callee.name)) {
      return this.unwrapHOC(node.arguments[0]);
    }
    
    return node;
  }

  extractFunctionComponent(node, source, filePath) {
    if (!this.isReactComponentName(node.id?.name)) return null;

    return this.createComponentDescriptor({
      name: node.id.name,
      filePath,
      source,
      node,
      componentType: 'function',
      props: this.extractPropsFromFunction(node),
      variants: this.extractVariantsFromFunction(node)
    });
  }

  extractArrowComponent(node, source, filePath) {
    const name = node.id?.name;
    if (!name || !this.isReactComponentName(name)) return null;

    // Unwrap TypeScript type casting first
    let init = node.init;
    if (t.isTSAsExpression(init)) {
      init = init.expression;
    }

    const funcNode = this.unwrapHOCs ? this.unwrapHOC(init) : init;
    const componentType = init !== funcNode ? 'forwardRef' : (t.isCallExpression(init) ? 'forwardRef' : 'arrow');

    return this.createComponentDescriptor({
      name,
      filePath,
      source,
      node: funcNode,
      componentType,
      props: this.extractPropsFromFunction(funcNode),
      variants: this.extractVariantsFromFunction(funcNode)
    });
  }

  extractDefaultExportComponent(node, source, filePath) {
    const declaration = node.declaration;
    const unwrapped = this.unwrapHOCs ? this.unwrapHOC(declaration) : declaration;
    
    // Function declarations
    if (t.isFunctionDeclaration(unwrapped)) {
      const name = unwrapped.id?.name || this.inferComponentName(filePath);
      if (!this.isReactComponentName(name)) return null;
      
      return this.createComponentDescriptor({
        name,
        filePath,
        source,
        node: unwrapped,
        componentType: 'defaultFunction',
        props: this.extractPropsFromFunction(unwrapped),
        variants: this.extractVariantsFromFunction(unwrapped)
      });
    }
    
    // Arrow/function expressions
    if (t.isArrowFunctionExpression(unwrapped) || t.isFunctionExpression(unwrapped)) {
      const name = this.inferComponentName(filePath);
      if (!this.isReactComponentName(name)) return null;
      
      return this.createComponentDescriptor({
        name,
        filePath,
        source,
        node: unwrapped,
        componentType: 'defaultArrow',
        props: this.extractPropsFromFunction(unwrapped),
        variants: this.extractVariantsFromFunction(unwrapped)
      });
    }
    
    // Identifiers (const Component = ...; export default Component)
    if (t.isIdentifier(declaration)) {
      const name = declaration.name;
      if (!this.isReactComponentName(name)) return null;
      
      return this.createComponentDescriptor({
        name,
        filePath,
        source,
        node: declaration,
        componentType: 'defaultIdentifier',
        props: [], // Would need AST traversal to find original declaration
        variants: {}
      });
    }
    
    return null;
  }

  createComponentDescriptor({ name, filePath, source, node, componentType, props, variants }) {
    // Transform props from array to object format for DCP compliance
    const propsObject = {};
    if (props && Array.isArray(props)) {
      props.forEach(prop => {
        propsObject[prop.name] = {
          type: this.mapTypeToDCPEnum(prop.type),
          description: prop.description || '',
          required: prop.required !== false,
          source: this.mapSourceToDCPEnum(prop.source)
        };
        
        // Add options array if we can infer enum values
        if (prop.options && Array.isArray(prop.options)) {
          propsObject[prop.name].options = prop.options;
        }
      });
    }

    // DCP-compliant component format
    return {
      name,
      description: this.extractDescription(node, source) || `${name} component`,
      category: this.inferCategory(name),
      props: propsObject,
      variants: variants || {},
      composition: {
        slots: [],
        subComponents: []
      },
      examples: [],
      // Optional extensions for metadata we want to preserve
      extensions: {
        filePath: path.relative(process.cwd(), filePath),
        componentType,
        adaptor: 'react-tsx',
        extractedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Map TypeScript types to DCP schema enum values
   */
  mapTypeToDCPEnum(tsType) {
    if (!tsType || tsType === 'unknown') return 'object';
    
    const typeStr = tsType.toString().toLowerCase();
    
    if (typeStr.includes('string') || typeStr.includes('String')) return 'string';
    if (typeStr.includes('number') || typeStr.includes('Number')) return 'number';
    if (typeStr.includes('boolean') || typeStr.includes('Boolean')) return 'boolean';
    if (typeStr.includes('[]') || typeStr.includes('Array')) return 'array';
    if (typeStr.includes('|') && !typeStr.includes('undefined')) return 'enum';
    
    // Default to object for complex types (React.ReactNode, custom interfaces, etc.)
    return 'object';
  }

  /**
   * Map source attribution to DCP schema enum values
   */
  mapSourceToDCPEnum(source) {
    if (!source) return 'auto';
    
    // Map our internal sources to DCP enum values
    switch (source) {
      case 'ts-morph':
      case 'react-tsx':
      case 'typescript':
      case 'babel':
        return 'auto';
      case 'llm':
      case 'ai':
        return 'llm';
      case 'manual':
      case 'user':
        return 'manual';
      default:
        return 'auto';
    }
  }

  inferComponentName(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  inferCategory(componentName) {
    const name = componentName.toLowerCase();
    
    if (name.includes('button')) return 'actions';
    if (name.includes('input') || name.includes('form')) return 'forms';
    if (name.includes('card') || name.includes('panel')) return 'layout';
    if (name.includes('text') || name.includes('heading')) return 'typography';
    if (name.includes('icon')) return 'icons';
    if (name.includes('modal') || name.includes('dialog')) return 'overlays';
    
    return 'components';
  }

  extractDescription(node, source) {
    if (node?.leadingComments?.length > 0) {
      const comment = node.leadingComments[node.leadingComments.length - 1];
      if (comment.type === 'CommentBlock') {
        return comment.value.replace(/^\*+/gm, '').trim();
      }
    }
    return '';
  }

  extractPropsFromFunction(node) {
    // Simplified prop extraction - extend as needed
    const props = [];
    const param = node.params?.[0];
    
    if (t.isObjectPattern(param)) {
      param.properties.forEach(prop => {
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
    }
    
    return props;
  }

  extractVariantsFromFunction(node) {
    // Simplified variant extraction - extend for full TypeScript union support
    return {};
  }

  inferPropType(prop) {
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
      const right = prop.value.right;
      if (t.isStringLiteral(right)) return right.value;
      if (t.isNumericLiteral(right)) return right.value;
      if (t.isBooleanLiteral(right)) return right.value;
      if (t.isNullLiteral(right)) return null;
    }
    return null;
  }

  detectCVAVariants(ast) {
    const variants = {};
    traverse.default(ast, {
      CallExpression: (path) => {
        if (!t.isIdentifier(path.node.callee, { name: 'cva' })) return;
        
        const [, optionsArg] = path.node.arguments;
        if (!optionsArg || !t.isObjectExpression(optionsArg)) return;

        const variantsProp = optionsArg.properties.find(prop => 
          t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'variants' })
        );
        
        if (variantsProp && t.isObjectExpression(variantsProp.value)) {
          variantsProp.value.properties.forEach(groupProp => {
            if (t.isObjectProperty(groupProp) && t.isObjectExpression(groupProp.value)) {
              const groupName = groupProp.key.name || 
                (t.isStringLiteral(groupProp.key) ? groupProp.key.value : undefined);
              
              if (groupName) {
                variants[groupName] = groupProp.value.properties
                  .map(vProp => vProp.key.name || 
                    (t.isStringLiteral(vProp.key) ? vProp.key.value : undefined))
                  .filter(Boolean);
              }
            }
          });
        }
      }
    });
    return variants;
  }

  /**
   * Convert resolved ComponentDescriptor to DCP component format
   */
  createComponentFromDescriptor(descriptor, source) {
    if (!descriptor.node) return null;
    
    const component = this.createComponentDescriptor({
      name: descriptor.name,
      filePath: descriptor.filePath,
      source,
      node: descriptor.node,
      componentType: descriptor.canonical ? 'canonical' : 'barrel',
      props: this.extractPropsFromFunction(descriptor.node),
      variants: this.extractVariantsFromFunction(descriptor.node)
    });
    
    // Mark as barrel re-export for deduplication logic
    if (!descriptor.canonical) {
      component.extensions.source = 'barrel';
      if (descriptor.alias) {
        component.extensions.alias = descriptor.alias;
      }
    }
    
    return component;
  }

  deduplicateComponents(components) {
    const deduped = [];
    const nameMap = new Map();
    
    components.forEach(component => {
      const existing = nameMap.get(component.name);
      if (!existing) {
        nameMap.set(component.name, component);
        deduped.push(component);
      } else {
        // Prefer direct components over barrel re-exports
        const isExistingBarrel = existing.extensions?.source === 'barrel';
        const isCurrentBarrel = component.extensions?.source === 'barrel';
        
        if (isExistingBarrel && !isCurrentBarrel) {
          const index = deduped.findIndex(c => c.name === component.name);
          if (index >= 0) {
            deduped[index] = component;
            nameMap.set(component.name, component);
          }
        }
        // Also prefer named exports over default exports
        else if (existing.extensions?.componentType?.includes('default') && 
            !component.extensions?.componentType?.includes('default')) {
          const index = deduped.findIndex(c => c.name === component.name);
          if (index >= 0) {
            deduped[index] = component;
            nameMap.set(component.name, component);
          }
        }
      }
    });
    
    return deduped;
  }

  /**
   * Merge props from Babel parsing with TypeScript analysis
   * TypeScript provides better type info, Babel provides structural info
   */
  mergeProps(babelProps = [], tsProps = {}) {
    const merged = [];
    const tsPropsMap = new Map(Object.entries(tsProps));
    
    // Start with Babel props (structural analysis)
    babelProps.forEach(babelProp => {
      const tsProp = tsPropsMap.get(babelProp.name);
      
      if (tsProp) {
        // Merge Babel structure with TypeScript types
        merged.push({
          ...babelProp,
          type: tsProp.type || babelProp.type, // Prefer TS type
          description: tsProp.description || babelProp.description,
          required: tsProp.required !== undefined ? tsProp.required : babelProp.required,
          default: tsProp.default || babelProp.default,
          source: tsProp.source || babelProp.source
        });
        tsPropsMap.delete(babelProp.name);
      } else {
        merged.push(babelProp);
      }
    });
    
    // Add remaining TypeScript-only props (from imports/interfaces)
    tsPropsMap.forEach((tsProp, name) => {
      merged.push({
        name,
        ...tsProp,
        source: tsProp.source || 'typescript'
      });
    });
    
    return merged;
  }
}

// Default export for easy importing
export default ReactTSXAdaptor;