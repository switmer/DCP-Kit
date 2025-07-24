/**
 * Dependency Graph Analyzer
 * Builds comprehensive dependency maps and usage patterns
 * for intelligent component onboarding
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

export class DependencyGraphAnalyzer {
  constructor(sourceDir) {
    this.sourceDir = sourceDir;
    this.dependencyGraph = new Map();
    this.componentUsage = new Map();
    this.externalDependencies = new Set();
    this.internalDependencies = new Map();
    this.hookUsage = new Map();
    this.contextUsage = new Set();
  }

  /**
   * Analyze component file for all dependency patterns
   */
  async analyzeComponent(filePath, sourceCode) {
    try {
      const ast = parse(sourceCode, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy']
      });

      const componentData = {
        filePath,
        imports: [],
        exports: [],
        hooks: [],
        context: [],
        componentUsage: [],
        externalDeps: [],
        internalDeps: []
      };

      traverse.default(ast, {
        ImportDeclaration: (nodePath) => {
          this.analyzeImport(nodePath.node, componentData);
        },
        
        ExportDeclaration: (nodePath) => {
          this.analyzeExport(nodePath.node, componentData);
        },
        
        CallExpression: (nodePath) => {
          this.analyzeHookUsage(nodePath.node, componentData);
          this.analyzeContextUsage(nodePath.node, componentData);
        },
        
        JSXElement: (nodePath) => {
          this.analyzeComponentUsage(nodePath.node, componentData);
        }
      });

      this.dependencyGraph.set(filePath, componentData);
      return componentData;

    } catch (error) {
      console.warn(`Warning: Could not analyze dependencies for ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Analyze import statements
   */
  analyzeImport(node, componentData) {
    const source = node.source.value;
    const importData = {
      source,
      specifiers: [],
      type: this.categorizeImport(source)
    };

    node.specifiers.forEach(spec => {
      if (t.isImportDefaultSpecifier(spec)) {
        importData.specifiers.push({
          type: 'default',
          imported: 'default',
          local: spec.local.name
        });
      } else if (t.isImportNamespaceSpecifier(spec)) {
        importData.specifiers.push({
          type: 'namespace',
          imported: '*',
          local: spec.local.name
        });
      } else if (t.isImportSpecifier(spec)) {
        importData.specifiers.push({
          type: 'named',
          imported: spec.imported.name,
          local: spec.local.name
        });
      }
    });

    componentData.imports.push(importData);

    // Categorize dependencies
    if (importData.type === 'external') {
      componentData.externalDeps.push(source);
      this.externalDependencies.add(source);
    } else if (importData.type === 'internal') {
      componentData.internalDeps.push(source);
      if (!this.internalDependencies.has(source)) {
        this.internalDependencies.set(source, new Set());
      }
      this.internalDependencies.get(source).add(componentData.filePath);
    }
  }

  /**
   * Categorize import type
   */
  categorizeImport(source) {
    if (source.startsWith('.') || source.startsWith('/')) {
      return 'internal';
    } else if (source.startsWith('@/')) {
      return 'alias';
    } else {
      return 'external';
    }
  }

  /**
   * Analyze export statements
   */
  analyzeExport(node, componentData) {
    if (t.isExportNamedDeclaration(node)) {
      if (node.declaration) {
        if (t.isFunctionDeclaration(node.declaration) || t.isVariableDeclaration(node.declaration)) {
          const name = this.extractExportName(node.declaration);
          if (name) {
            componentData.exports.push({
              type: 'named',
              name,
              kind: node.declaration.type
            });
          }
        }
      } else if (node.specifiers) {
        node.specifiers.forEach(spec => {
          if (t.isExportSpecifier(spec)) {
            componentData.exports.push({
              type: 'named',
              name: spec.exported.name,
              local: spec.local.name
            });
          }
        });
      }
    } else if (t.isExportDefaultDeclaration(node)) {
      const name = this.extractExportName(node.declaration) || 'default';
      componentData.exports.push({
        type: 'default',
        name,
        kind: node.declaration.type
      });
    }
  }

  /**
   * Extract export name from declaration
   */
  extractExportName(declaration) {
    if (t.isFunctionDeclaration(declaration) && declaration.id) {
      return declaration.id.name;
    } else if (t.isVariableDeclaration(declaration)) {
      const declarator = declaration.declarations[0];
      if (declarator && t.isIdentifier(declarator.id)) {
        return declarator.id.name;
      }
    } else if (t.isIdentifier(declaration)) {
      return declaration.name;
    }
    return null;
  }

  /**
   * Analyze hook usage patterns
   */
  analyzeHookUsage(node, componentData) {
    if (t.isIdentifier(node.callee) && node.callee.name.startsWith('use')) {
      const hookName = node.callee.name;
      componentData.hooks.push({
        name: hookName,
        type: this.categorizeHook(hookName),
        args: node.arguments.length
      });

      if (!this.hookUsage.has(hookName)) {
        this.hookUsage.set(hookName, []);
      }
      this.hookUsage.get(hookName).push(componentData.filePath);
    }
  }

  /**
   * Categorize hook type
   */
  categorizeHook(hookName) {
    const reactHooks = ['useState', 'useEffect', 'useContext', 'useReducer', 'useMemo', 'useCallback', 'useRef', 'useLayoutEffect'];
    if (reactHooks.includes(hookName)) {
      return 'react-builtin';
    } else if (hookName.startsWith('use') && hookName[3] === hookName[3].toUpperCase()) {
      return 'custom';
    }
    return 'unknown';
  }

  /**
   * Analyze context usage
   */
  analyzeContextUsage(node, componentData) {
    if (t.isIdentifier(node.callee) && node.callee.name === 'useContext' && node.arguments.length > 0) {
      const contextArg = node.arguments[0];
      if (t.isIdentifier(contextArg)) {
        const contextName = contextArg.name;
        componentData.context.push(contextName);
        this.contextUsage.add(contextName);
      }
    }
  }

  /**
   * Analyze component usage in JSX
   */
  analyzeComponentUsage(node, componentData) {
    if (t.isJSXIdentifier(node.openingElement.name)) {
      const componentName = node.openingElement.name.name;
      
      // Skip HTML elements (lowercase)
      if (componentName[0] === componentName[0].toUpperCase()) {
        componentData.componentUsage.push({
          name: componentName,
          props: this.extractJSXProps(node.openingElement.attributes)
        });

        if (!this.componentUsage.has(componentName)) {
          this.componentUsage.set(componentName, []);
        }
        this.componentUsage.get(componentName).push(componentData.filePath);
      }
    }
  }

  /**
   * Extract JSX props for component usage analysis
   */
  extractJSXProps(attributes) {
    return attributes.map(attr => {
      if (t.isJSXAttribute(attr)) {
        return {
          name: attr.name.name,
          type: this.inferPropType(attr.value)
        };
      }
      return null;
    }).filter(Boolean);
  }

  /**
   * Infer prop type from JSX value
   */
  inferPropType(value) {
    if (!value) return 'boolean';
    if (t.isStringLiteral(value)) return 'string';
    if (t.isJSXExpressionContainer(value)) {
      const expression = value.expression;
      if (t.isNumericLiteral(expression)) return 'number';
      if (t.isBooleanLiteral(expression)) return 'boolean';
      if (t.isArrayExpression(expression)) return 'array';
      if (t.isObjectExpression(expression)) return 'object';
      if (t.isArrowFunctionExpression(expression) || t.isFunctionExpression(expression)) return 'function';
      return 'expression';
    }
    return 'unknown';
  }

  /**
   * Build comprehensive dependency graph
   */
  buildGraph() {
    const graph = {
      nodes: [],
      edges: [],
      clusters: {},
      metrics: {}
    };

    // Build nodes from analyzed components
    for (const [filePath, componentData] of this.dependencyGraph) {
      graph.nodes.push({
        id: filePath,
        type: 'component',
        name: path.basename(filePath, path.extname(filePath)),
        exports: componentData.exports.map(exp => exp.name),
        hooks: componentData.hooks.map(hook => hook.name),
        context: componentData.context
      });

      // Build edges from dependencies
      componentData.internalDeps.forEach(dep => {
        graph.edges.push({
          from: filePath,
          to: dep,
          type: 'internal-dependency'
        });
      });

      // Add external dependency nodes
      componentData.externalDeps.forEach(dep => {
        if (!graph.nodes.find(n => n.id === dep)) {
          graph.nodes.push({
            id: dep,
            type: 'external-package',
            name: dep
          });
        }
        
        graph.edges.push({
          from: filePath,
          to: dep,
          type: 'external-dependency'
        });
      });
    }

    // Calculate metrics
    graph.metrics = this.calculateGraphMetrics(graph);

    return graph;
  }

  /**
   * Calculate graph metrics
   */
  calculateGraphMetrics(graph) {
    const componentNodes = graph.nodes.filter(n => n.type === 'component');
    const externalNodes = graph.nodes.filter(n => n.type === 'external-package');
    
    return {
      totalComponents: componentNodes.length,
      totalExternalDeps: externalNodes.length,
      totalEdges: graph.edges.length,
      averageDependencies: graph.edges.length / Math.max(componentNodes.length, 1),
      mostUsedHooks: this.getMostUsed(this.hookUsage),
      mostUsedComponents: this.getMostUsed(this.componentUsage),
      contextProviders: Array.from(this.contextUsage)
    };
  }

  /**
   * Get most used items from usage map
   */
  getMostUsed(usageMap, limit = 5) {
    return Array.from(usageMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, limit)
      .map(([name, usage]) => ({ name, count: usage.length }));
  }

  /**
   * Generate dependency suggestions
   */
  generateSuggestions() {
    const suggestions = [];

    // Check for missing peer dependencies
    const commonPeerDeps = {
      'framer-motion': ['react', 'react-dom'],
      '@radix-ui/react-slot': ['react', 'react-dom'],
      'class-variance-authority': ['clsx'],
      'lucide-react': ['react']
    };

    for (const extDep of this.externalDependencies) {
      if (commonPeerDeps[extDep]) {
        for (const peerDep of commonPeerDeps[extDep]) {
          if (!this.externalDependencies.has(peerDep)) {
            suggestions.push({
              type: 'missing-peer-dependency',
              package: peerDep,
              reason: `Required peer dependency for ${extDep}`
            });
          }
        }
      }
    }

    // Check for common pattern suggestions
    if (this.hookUsage.has('useState') && !this.hookUsage.has('useCallback')) {
      suggestions.push({
        type: 'optimization',
        recommendation: 'Consider using useCallback for event handlers to prevent unnecessary re-renders'
      });
    }

    return suggestions;
  }
}