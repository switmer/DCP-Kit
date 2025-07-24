import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import path from 'path';
import fs from 'fs';
import { resolveExport } from './moduleResolver.js';
import { symbolTable, getCachedAst, setCachedAst } from '../../core/graphCache.js';
import { ThemeAnalyzer } from '../../core/themeAnalyzer.js';

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
      
      // Enhance components with theme-aware context
      const themeEnhanced = await Promise.all(
        deduplicated.map(component => 
          this.themeAnalyzer.enhanceComponentWithTheme(component, source, filePath)
        )
      );
      
      if (this.verbose) {
        console.log(`[ReactTSX] ${filePath}: Found ${themeEnhanced.length} components`);
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
    
    // Standard arrow/function expressions
    if (t.isArrowFunctionExpression(node.init) || t.isFunctionExpression(node.init)) {
      return true;
    }
    
    // HOC patterns (forwardRef, memo, etc.)
    if (this.unwrapHOCs && t.isCallExpression(node.init)) {
      const unwrapped = this.unwrapHOC(node.init);
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

    const funcNode = this.unwrapHOCs ? this.unwrapHOC(node.init) : node.init;
    const componentType = node.init !== funcNode ? 'forwardRef' : 'arrow';

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
    return {
      name,
      type: 'component',
      category: this.inferCategory(name),
      description: this.extractDescription(node, source),
      filePath: path.relative(process.cwd(), filePath),
      props: props || [],
      variants: variants || {},
      composition: { subComponents: [], slots: [] },
      examples: [],
      slots: [],
      metadata: {
        componentType,
        adaptor: 'react-tsx',
        extractedAt: new Date().toISOString()
      }
    };
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
      component.metadata.source = 'barrel';
      if (descriptor.alias) {
        component.metadata.alias = descriptor.alias;
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
        const isExistingBarrel = existing.metadata?.source === 'barrel';
        const isCurrentBarrel = component.metadata?.source === 'barrel';
        
        if (isExistingBarrel && !isCurrentBarrel) {
          const index = deduped.findIndex(c => c.name === component.name);
          if (index >= 0) {
            deduped[index] = component;
            nameMap.set(component.name, component);
          }
        }
        // Also prefer named exports over default exports
        else if (existing.metadata.componentType.includes('default') && 
            !component.metadata.componentType.includes('default')) {
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
}

// Default export for easy importing
export default ReactTSXAdaptor;