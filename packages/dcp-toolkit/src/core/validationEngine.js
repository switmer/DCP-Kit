/**
 * Validation Engine - Code validation against design system contracts
 * 
 * Provides comprehensive validation of code against DCP registries:
 * - Token usage validation
 * - Component API compliance  
 * - Design pattern enforcement
 * - Accessibility checks
 * - Performance best practices
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

export class ValidationEngine {
  constructor(registry, options = {}) {
    this.registry = registry;
    this.rules = options.rules || this.getDefaultRules();
    this.strict = options.strict || false;
    this.context = {
      components: new Map(),
      tokens: new Map(),
      hooks: new Set(),
      imports: new Map()
    };
  }

  /**
   * Validate code against registry contracts
   */
  async validate(code, filePath = 'unknown') {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      metadata: {
        filePath,
        linesChecked: code.split('\n').length,
        rulesApplied: this.rules.length
      }
    };

    try {
      // Parse code into AST
      const ast = this.parseCode(code, filePath);
      
      // Build context from imports and usage
      this.analyzeCodeContext(ast);
      
      // Apply validation rules
      for (const rule of this.rules) {
        const ruleResults = await this.applyRule(rule, ast, code, filePath);
        
        results.errors.push(...(ruleResults.errors || []));
        results.warnings.push(...(ruleResults.warnings || []));
        results.suggestions.push(...(ruleResults.suggestions || []));
      }

      results.valid = results.errors.length === 0;
      
    } catch (error) {
      results.valid = false;
      results.errors.push({
        line: 1,
        column: 1,
        message: `Parse error: ${error.message}`,
        rule: 'syntax',
        severity: 'error'
      });
    }

    return results;
  }

  /**
   * Parse code into AST with appropriate plugins
   */
  parseCode(code, filePath) {
    const plugins = ['jsx'];
    
    // Determine if TypeScript based on file extension or content
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || code.includes('interface ') || code.includes(': React.')) {
      plugins.push('typescript');
    }
    
    return parse(code, {
      sourceType: 'module',
      plugins,
      ranges: true,
      locations: true
    });
  }

  /**
   * Analyze code to build validation context
   */
  analyzeCodeContext(ast) {
    traverse.default(ast, {
      ImportDeclaration: (path) => {
        const source = path.node.source.value;
        const specifiers = path.node.specifiers.map(spec => {
          if (t.isImportDefaultSpecifier(spec)) {
            return { type: 'default', local: spec.local.name };
          } else if (t.isImportSpecifier(spec)) {
            return { 
              type: 'named', 
              imported: spec.imported.name, 
              local: spec.local.name 
            };
          }
          return null;
        }).filter(Boolean);
        
        this.context.imports.set(source, specifiers);
      },
      
      JSXElement: (path) => {
        const elementName = path.node.openingElement.name.name;
        if (elementName && elementName[0] === elementName[0].toUpperCase()) {
          const props = this.extractJSXProps(path.node.openingElement.attributes);
          this.context.components.set(elementName, props);
        }
      },
      
      CallExpression: (path) => {
        if (t.isIdentifier(path.node.callee) && path.node.callee.name.startsWith('use')) {
          this.context.hooks.add(path.node.callee.name);
        }
      }
    });
  }

  /**
   * Extract props from JSX attributes
   */
  extractJSXProps(attributes) {
    return attributes.map(attr => {
      if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
        return {
          name: attr.name.name,
          value: this.getAttributeValue(attr.value)
        };
      }
      return null;
    }).filter(Boolean);
  }

  /**
   * Get value from JSX attribute
   */
  getAttributeValue(value) {
    if (!value) return true; // Boolean attribute
    if (t.isStringLiteral(value)) return value.value;
    if (t.isJSXExpressionContainer(value)) {
      const expr = value.expression;
      if (t.isStringLiteral(expr)) return expr.value;
      if (t.isNumericLiteral(expr)) return expr.value;
      if (t.isBooleanLiteral(expr)) return expr.value;
      return `{${expr.type}}`;
    }
    return 'unknown';
  }

  /**
   * Apply a specific validation rule
   */
  async applyRule(rule, ast, code, filePath) {
    switch (rule) {
      case 'validate-tokens':
        return this.validateTokenUsage(ast, code);
      case 'validate-components':
        return this.validateComponentUsage(ast, code);
      case 'validate-props':
        return this.validatePropUsage(ast, code);
      case 'validate-accessibility':
        return this.validateAccessibility(ast, code);
      case 'validate-performance':
        return this.validatePerformance(ast, code);
      case 'validate-patterns':
        return this.validateDesignPatterns(ast, code);
      default:
        return { errors: [], warnings: [], suggestions: [] };
    }
  }

  /**
   * Validate design token usage
   */
  validateTokenUsage(ast, code) {
    const results = { errors: [], warnings: [], suggestions: [] };
    const validTokens = this.getValidTokens();
    const lines = code.split('\n');

    // Check for hard-coded values that should use tokens
    const hardCodedPatterns = [
      /#[0-9a-fA-F]{3,8}/g, // Hex colors
      /\d+px/g, // Pixel values
      /rgba?\([^)]+\)/g, // RGB/RGBA colors
      /\d+rem/g, // Rem values
    ];

    lines.forEach((line, index) => {
      hardCodedPatterns.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const suggestion = this.suggestTokenForValue(match, validTokens);
            if (suggestion) {
              results.warnings.push({
                line: index + 1,
                column: line.indexOf(match) + 1,
                message: `Hard-coded value '${match}' should use token '${suggestion}'`,
                rule: 'validate-tokens',
                severity: 'warning'
              });
            }
          });
        }
      });
    });

    // Check for invalid token references
    const tokenPattern = /(?:var\(--([^)]+)\)|token\(['"]([^'"]+)['"]\))/g;
    lines.forEach((line, index) => {
      let match;
      while ((match = tokenPattern.exec(line)) !== null) {
        const tokenName = match[1] || match[2];
        if (!validTokens.has(tokenName) && !validTokens.has(tokenName.replace(/-/g, '.'))) {
          results.errors.push({
            line: index + 1,
            column: match.index + 1,
            message: `Token '${tokenName}' not found in registry`,
            rule: 'validate-tokens',
            severity: 'error'
          });
        }
      }
    });

    return results;
  }

  /**
   * Validate component usage against registry
   */
  validateComponentUsage(ast, code) {
    const results = { errors: [], warnings: [], suggestions: [] };
    const registryComponents = new Map();
    
    // Build registry component map
    (this.registry.components || []).forEach(comp => {
      registryComponents.set(comp.name, comp);
    });

    // Check each component usage
    for (const [componentName, props] of this.context.components) {
      const registryComponent = registryComponents.get(componentName);
      
      if (!registryComponent) {
        // Check if it's a known external component
        if (!this.isExternalComponent(componentName)) {
          results.warnings.push({
            line: 1, // Would need to track actual line numbers
            column: 1,
            message: `Component '${componentName}' not found in registry`,
            rule: 'validate-components',
            severity: 'warning'
          });
        }
        continue;
      }

      // Validate required props
      const requiredProps = (registryComponent.props || [])
        .filter(prop => prop.required)
        .map(prop => prop.name);
      
      const providedProps = props.map(prop => prop.name);
      
      requiredProps.forEach(reqProp => {
        if (!providedProps.includes(reqProp)) {
          results.errors.push({
            line: 1,
            column: 1,
            message: `Required prop '${reqProp}' missing for component '${componentName}'`,
            rule: 'validate-components',
            severity: 'error'
          });
        }
      });

      // Validate prop values
      props.forEach(prop => {
        const propDef = (registryComponent.props || []).find(p => p.name === prop.name);
        if (propDef && propDef.values && !propDef.values.includes(prop.value)) {
          results.errors.push({
            line: 1,
            column: 1,
            message: `Invalid value '${prop.value}' for prop '${prop.name}' on '${componentName}'. Expected one of: ${propDef.values.join(', ')}`,
            rule: 'validate-components',
            severity: 'error'
          });
        }
      });
    }

    return results;
  }

  /**
   * Validate prop usage patterns
   */
  validatePropUsage(ast, code) {
    const results = { errors: [], warnings: [], suggestions: [] };
    
    // Check for common anti-patterns
    traverse.default(ast, {
      JSXElement: (path) => {
        const attrs = path.node.openingElement.attributes;
        
        // Check for style prop usage (should use design tokens)
        const styleAttr = attrs.find(attr => 
          t.isJSXAttribute(attr) && attr.name.name === 'style'
        );
        
        if (styleAttr) {
          results.warnings.push({
            line: path.node.loc?.start.line || 1,
            column: path.node.loc?.start.column || 1,
            message: 'Avoid inline styles. Use design tokens or className instead.',
            rule: 'validate-props',
            severity: 'warning'
          });
        }

        // Check for className with hard-coded values
        const classAttr = attrs.find(attr => 
          t.isJSXAttribute(attr) && attr.name.name === 'className'
        );
        
        if (classAttr && t.isStringLiteral(classAttr.value)) {
          const classList = classAttr.value.value.split(' ');
          classList.forEach(cls => {
            if (this.isHardCodedClass(cls)) {
              results.suggestions.push({
                line: path.node.loc?.start.line || 1,
                column: path.node.loc?.start.column || 1,
                message: `Consider using a design token instead of hard-coded class '${cls}'`,
                rule: 'validate-props',
                severity: 'info'
              });
            }
          });
        }
      }
    });

    return results;
  }

  /**
   * Validate accessibility requirements
   */
  validateAccessibility(ast, code) {
    const results = { errors: [], warnings: [], suggestions: [] };
    
    traverse.default(ast, {
      JSXElement: (path) => {
        const elementName = path.node.openingElement.name.name;
        const attrs = path.node.openingElement.attributes;
        
        // Check for missing alt text on images
        if (elementName === 'img') {
          const hasAlt = attrs.some(attr => 
            t.isJSXAttribute(attr) && attr.name.name === 'alt'
          );
          
          if (!hasAlt) {
            results.errors.push({
              line: path.node.loc?.start.line || 1,
              column: path.node.loc?.start.column || 1,
              message: 'img elements must have an alt attribute',
              rule: 'validate-accessibility',
              severity: 'error'
            });
          }
        }

        // Check for clickable elements without proper roles
        const clickableElements = ['div', 'span'];
        if (clickableElements.includes(elementName)) {
          const hasOnClick = attrs.some(attr => 
            t.isJSXAttribute(attr) && attr.name.name === 'onClick'
          );
          
          if (hasOnClick) {
            const hasRole = attrs.some(attr => 
              t.isJSXAttribute(attr) && attr.name.name === 'role'
            );
            
            const hasTabIndex = attrs.some(attr => 
              t.isJSXAttribute(attr) && attr.name.name === 'tabIndex'
            );
            
            if (!hasRole) {
              results.warnings.push({
                line: path.node.loc?.start.line || 1,
                column: path.node.loc?.start.column || 1,
                message: `Clickable ${elementName} should have a role attribute`,
                rule: 'validate-accessibility',
                severity: 'warning'
              });
            }
            
            if (!hasTabIndex) {
              results.warnings.push({
                line: path.node.loc?.start.line || 1,
                column: path.node.loc?.start.column || 1,
                message: `Clickable ${elementName} should be keyboard accessible (tabIndex)`,
                rule: 'validate-accessibility',
                severity: 'warning'
              });
            }
          }
        }
      }
    });

    return results;
  }

  /**
   * Validate performance best practices
   */
  validatePerformance(ast, code) {
    const results = { errors: [], warnings: [], suggestions: [] };
    
    traverse.default(ast, {
      JSXElement: (path) => {
        // Check for missing key props in lists
        if (this.isInMapFunction(path)) {
          const attrs = path.node.openingElement.attributes;
          const hasKey = attrs.some(attr => 
            t.isJSXAttribute(attr) && attr.name.name === 'key'
          );
          
          if (!hasKey) {
            results.warnings.push({
              line: path.node.loc?.start.line || 1,
              column: path.node.loc?.start.column || 1,
              message: 'Missing key prop in list element',
              rule: 'validate-performance',
              severity: 'warning'
            });
          }
        }
      },
      
      CallExpression: (path) => {
        // Check for expensive operations in render
        if (this.isInRenderFunction(path)) {
          const callee = path.node.callee;
          if (t.isIdentifier(callee) && ['sort', 'filter', 'map'].includes(callee.name)) {
            results.suggestions.push({
              line: path.node.loc?.start.line || 1,
              column: path.node.loc?.start.column || 1,
              message: `Consider memoizing ${callee.name} operation with useMemo`,
              rule: 'validate-performance',
              severity: 'info'
            });
          }
        }
      }
    });

    return results;
  }

  /**
   * Validate design patterns
   */
  validateDesignPatterns(ast, code) {
    const results = { errors: [], warnings: [], suggestions: [] };
    
    // Check for consistent spacing patterns
    const spacingPattern = /(?:padding|margin|gap):\s*(\d+)px/g;
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      let match;
      while ((match = spacingPattern.exec(line)) !== null) {
        const value = parseInt(match[1]);
        if (value % 4 !== 0) {
          results.suggestions.push({
            line: index + 1,
            column: match.index + 1,
            message: `Spacing value ${value}px is not aligned to 4px grid. Consider using a spacing token.`,
            rule: 'validate-patterns',
            severity: 'info'
          });
        }
      }
    });

    return results;
  }

  // Helper methods
  getDefaultRules() {
    return [
      'validate-tokens',
      'validate-components', 
      'validate-props',
      'validate-accessibility',
      'validate-performance',
      'validate-patterns'
    ];
  }

  getValidTokens() {
    const tokens = new Set();
    
    const addTokens = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if ('value' in value) {
            tokens.add(path);
            tokens.add(path.replace(/\./g, '-')); // CSS variable format
          } else {
            addTokens(value, path);
          }
        }
      }
    };
    
    addTokens(this.registry.tokens || {});
    return tokens;
  }

  suggestTokenForValue(value, validTokens) {
    // Simple heuristic to suggest tokens for common values
    const suggestions = {
      '#ffffff': 'color.white',
      '#000000': 'color.black',
      '16px': 'spacing.md',
      '8px': 'spacing.sm',
      '24px': 'spacing.lg',
      '1rem': 'spacing.md'
    };
    
    return suggestions[value] || null;
  }

  isExternalComponent(name) {
    // Check if component is from known external libraries
    const externalPatterns = [
      /^[A-Z][a-z]+$/, // Material-UI pattern
      /^Ui[A-Z]/, // UI library pattern
      /^React\./, // React built-ins
    ];
    
    return externalPatterns.some(pattern => pattern.test(name));
  }

  isHardCodedClass(className) {
    // Check if class appears to be hard-coded rather than from design system
    const hardCodedPatterns = [
      /^color-/, // color-red-500
      /^bg-/, // bg-blue-100  
      /^text-/, // text-lg
      /^p-\d/, // p-4
      /^m-\d/, // m-2
    ];
    
    return hardCodedPatterns.some(pattern => pattern.test(className));
  }

  isInMapFunction(path) {
    // Check if JSX element is inside a map function
    let parent = path.parent;
    while (parent) {
      if (t.isCallExpression(parent) && 
          t.isMemberExpression(parent.callee) &&
          t.isIdentifier(parent.callee.property) &&
          parent.callee.property.name === 'map') {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  isInRenderFunction(path) {
    // Check if call is inside a render function or component
    let parent = path.parent;
    while (parent) {
      if (t.isFunctionDeclaration(parent) || t.isArrowFunctionExpression(parent)) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }
}