/**
 * DCP CI Validation Hook - Design System Contract Enforcement
 * Enables: npx dcp validate-ci ./src --fail-on-violations
 * Returns exit code 1 if off-spec code found
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

/**
 * Design System Contract Validator
 */
class DesignSystemValidator {
  constructor(registryPath) {
    this.registryPath = registryPath;
    this.registry = null;
    this.violations = [];
    this.stats = {
      filesScanned: 0,
      componentsChecked: 0,
      tokensValidated: 0,
      violations: 0
    };
  }

  async loadRegistry() {
    if (!this.registry) {
      try {
        const registryFile = path.join(this.registryPath, 'registry.json');
        const data = await fs.readFile(registryFile, 'utf8');
        this.registry = JSON.parse(data);
      } catch (error) {
        throw new Error(`Failed to load registry: ${error.message}`);
      }
    }
    return this.registry;
  }

  async validateDirectory(sourcePath, options = {}) {
    const {
      globPattern = '**/*.{tsx,jsx,ts,js}',
      ignorePatterns = ['node_modules/**', 'dist/**', 'build/**', '.next/**'],
      checkTokens = true,
      checkProps = true,
      checkVariants = true,
      allowedHardcodedValues = [],
      verbose = false
    } = options;

    if (verbose) {
      console.log(chalk.gray(`Scanning ${sourcePath} with pattern: ${globPattern}`));
    }

    // Find all files to validate
    const files = await glob(globPattern, {
      cwd: sourcePath,
      ignore: ignorePatterns,
      absolute: true
    });

    if (verbose) {
      console.log(chalk.gray(`Found ${files.length} files to validate`));
    }

    // Validate each file
    for (const filePath of files) {
      await this.validateFile(filePath, {
        checkTokens,
        checkProps,
        checkVariants,
        allowedHardcodedValues,
        verbose
      });
    }

    return {
      violations: this.violations,
      stats: this.stats,
      isValid: this.violations.length === 0
    };
  }

  async validateFile(filePath, options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      this.stats.filesScanned++;

      // Skip non-React files
      if (!this.isReactFile(content)) {
        return;
      }

      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy']
      });

      const fileContext = {
        filePath,
        content,
        lines: content.split('\n')
      };

      traverse.default(ast, {
        JSXElement: (nodePath) => {
          this.validateJSXElement(nodePath, fileContext, options);
        },
        StringLiteral: (nodePath) => {
          if (options.checkTokens) {
            this.validateStringLiteral(nodePath, fileContext, options);
          }
        },
        TemplateLiteral: (nodePath) => {
          if (options.checkTokens) {
            this.validateTemplateLiteral(nodePath, fileContext, options);
          }
        }
      });

    } catch (error) {
      if (options.verbose) {
        console.warn(chalk.yellow(`Warning: Could not parse ${filePath}: ${error.message}`));
      }
    }
  }

  isReactFile(content) {
    return (
      content.includes('import React') ||
      content.includes('from \'react\'') ||
      content.includes('from "react"') ||
      content.includes('<') && content.includes('>')
    );
  }

  validateJSXElement(nodePath, fileContext, options) {
    const node = nodePath.node;
    
    if (t.isJSXIdentifier(node.openingElement.name)) {
      const componentName = node.openingElement.name.name;
      
      // Skip HTML elements
      if (componentName[0] === componentName[0].toLowerCase()) {
        return;
      }

      this.stats.componentsChecked++;

      // Validate component props
      if (options.checkProps) {
        this.validateComponentProps(node, componentName, fileContext);
      }

      // Validate component variants
      if (options.checkVariants) {
        this.validateComponentVariants(node, componentName, fileContext);
      }

      // Validate tokens in props
      if (options.checkTokens) {
        this.validateTokensInProps(node, componentName, fileContext, options);
      }
    }
  }

  validateComponentProps(jsxNode, componentName, fileContext) {
    const registry = this.registry;
    const component = registry.components?.find(c => 
      c.name === componentName || 
      c.displayName === componentName ||
      c.exportName === componentName
    );

    if (!component) {
      // Component not in registry - could be external or new
      return;
    }

    const validProps = (component.props || []).map(p => p.name);
    const requiredProps = (component.props || []).filter(p => p.required).map(p => p.name);

    // Check for invalid props
    const usedProps = [];
    for (const attr of jsxNode.openingElement.attributes) {
      if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
        const propName = attr.name.name;
        usedProps.push(propName);

        if (!validProps.includes(propName)) {
          this.addViolation({
            type: 'invalid-prop',
            severity: 'error',
            message: `Invalid prop "${propName}" for component "${componentName}"`,
            file: fileContext.filePath,
            line: this.getLineNumber(jsxNode, fileContext),
            column: this.getColumnNumber(jsxNode, fileContext),
            suggestion: this.suggestValidProp(propName, validProps),
            component: componentName,
            prop: propName
          });
        }
      }
    }

    // Check for missing required props
    for (const requiredProp of requiredProps) {
      if (!usedProps.includes(requiredProp)) {
        this.addViolation({
          type: 'missing-required-prop',
          severity: 'error',
          message: `Missing required prop "${requiredProp}" for component "${componentName}"`,
          file: fileContext.filePath,
          line: this.getLineNumber(jsxNode, fileContext),
          column: this.getColumnNumber(jsxNode, fileContext),
          component: componentName,
          prop: requiredProp
        });
      }
    }
  }

  validateComponentVariants(jsxNode, componentName, fileContext) {
    const registry = this.registry;
    const component = registry.components?.find(c => 
      c.name === componentName || 
      c.displayName === componentName
    );

    if (!component || !component.variants) {
      return;
    }

    // Check variant props
    for (const attr of jsxNode.openingElement.attributes) {
      if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
        const propName = attr.name.name;
        
        if (component.variants[propName]) {
          const validVariants = component.variants[propName];
          const usedVariant = this.extractPropValue(attr.value);
          
          if (usedVariant && !validVariants.includes(usedVariant)) {
            this.addViolation({
              type: 'invalid-variant',
              severity: 'error',
              message: `Invalid variant "${usedVariant}" for prop "${propName}" on component "${componentName}"`,
              file: fileContext.filePath,
              line: this.getLineNumber(jsxNode, fileContext),
              column: this.getColumnNumber(jsxNode, fileContext),
              suggestion: `Valid variants: ${validVariants.join(', ')}`,
              component: componentName,
              prop: propName,
              variant: usedVariant
            });
          }
        }
      }
    }
  }

  validateTokensInProps(jsxNode, componentName, fileContext, options) {
    const registry = this.registry;
    const flatTokens = this.flattenTokens(registry.tokens || {});
    const tokenNames = Object.keys(flatTokens);

    for (const attr of jsxNode.openingElement.attributes) {
      if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
        const propName = attr.name.name;
        const propValue = this.extractPropValue(attr.value);

        // Check for hardcoded values that should use tokens
        if (this.isTokenizableProp(propName)) {
          if (this.isHardcodedValue(propValue) && !options.allowedHardcodedValues.includes(propValue)) {
            // Check if there's a matching token
            const suggestedToken = this.findMatchingToken(propValue, flatTokens, propName);
            
            this.addViolation({
              type: 'hardcoded-value',
              severity: 'warning',
              message: `Hardcoded value "${propValue}" in prop "${propName}" should use design token`,
              file: fileContext.filePath,
              line: this.getLineNumber(jsxNode, fileContext),
              column: this.getColumnNumber(jsxNode, fileContext),
              suggestion: suggestedToken ? `Consider using token: ${suggestedToken}` : 'Use a design token instead',
              component: componentName,
              prop: propName,
              value: propValue
            });
          }

          // Validate token references
          if (this.looksLikeTokenReference(propValue) && !this.isValidTokenReference(propValue, tokenNames)) {
            this.addViolation({
              type: 'invalid-token',
              severity: 'error',
              message: `Invalid token reference "${propValue}" in prop "${propName}"`,
              file: fileContext.filePath,
              line: this.getLineNumber(jsxNode, fileContext),
              column: this.getColumnNumber(jsxNode, fileContext),
              suggestion: this.suggestValidToken(propValue, tokenNames),
              component: componentName,
              prop: propName,
              value: propValue
            });
          }
        }

        this.stats.tokensValidated++;
      }
    }
  }

  validateStringLiteral(nodePath, fileContext, options) {
    const value = nodePath.node.value;
    
    // Check for hardcoded colors, spacing, etc.
    if (this.isHardcodedColor(value) || this.isHardcodedSpacing(value)) {
      if (!options.allowedHardcodedValues.includes(value)) {
        this.addViolation({
          type: 'hardcoded-value',
          severity: 'warning',
          message: `Hardcoded value "${value}" should use design token`,
          file: fileContext.filePath,
          line: this.getLineNumber(nodePath.node, fileContext),
          column: this.getColumnNumber(nodePath.node, fileContext),
          suggestion: 'Replace with design token',
          value: value
        });
      }
    }
  }

  validateTemplateLiteral(nodePath, fileContext, options) {
    // Check template literals for hardcoded values
    const quasi = nodePath.node.quasis[0];
    if (quasi && quasi.value.raw) {
      const value = quasi.value.raw;
      if (this.isHardcodedColor(value) && !options.allowedHardcodedValues.includes(value)) {
        this.addViolation({
          type: 'hardcoded-value',
          severity: 'warning',
          message: `Hardcoded value "${value}" in template literal should use design token`,
          file: fileContext.filePath,
          line: this.getLineNumber(nodePath.node, fileContext),
          column: this.getColumnNumber(nodePath.node, fileContext),
          suggestion: 'Replace with design token',
          value: value
        });
      }
    }
  }

  // Helper methods
  extractPropValue(valueNode) {
    if (t.isStringLiteral(valueNode)) {
      return valueNode.value;
    }
    if (t.isJSXExpressionContainer(valueNode) && t.isStringLiteral(valueNode.expression)) {
      return valueNode.expression.value;
    }
    return null;
  }

  isTokenizableProp(propName) {
    const tokenizableProps = [
      'color', 'backgroundColor', 'borderColor', 'textColor',
      'spacing', 'margin', 'padding', 'gap',
      'fontSize', 'fontWeight', 'lineHeight',
      'borderRadius', 'boxShadow', 'opacity'
    ];
    
    return tokenizableProps.some(prop => 
      propName.toLowerCase().includes(prop.toLowerCase())
    );
  }

  isHardcodedValue(value) {
    if (!value || typeof value !== 'string') return false;
    
    return (
      this.isHardcodedColor(value) ||
      this.isHardcodedSpacing(value) ||
      this.isHardcodedFont(value)
    );
  }

  isHardcodedColor(value) {
    const colorPatterns = [
      /^#[0-9a-fA-F]{3,8}$/,           // #fff, #ffffff, #ffffff00
      /^rgb\(/,                        // rgb(255, 255, 255)
      /^rgba\(/,                       // rgba(255, 255, 255, 0.5)
      /^hsl\(/,                        // hsl(0, 100%, 50%)
      /^hsla\(/                        // hsla(0, 100%, 50%, 0.5)
    ];
    
    return colorPatterns.some(pattern => pattern.test(value));
  }

  isHardcodedSpacing(value) {
    const spacingPatterns = [
      /^\d+px$/,                       // 16px, 24px
      /^\d+rem$/,                      // 1rem, 1.5rem
      /^\d+em$/                        // 1em, 2em
    ];
    
    return spacingPatterns.some(pattern => pattern.test(value));
  }

  isHardcodedFont(value) {
    const fontPatterns = [
      /^\d+px$/,                       // Font sizes: 16px
      /^(bold|normal|\d+)$/           // Font weights: bold, 400
    ];
    
    return fontPatterns.some(pattern => pattern.test(value));
  }

  looksLikeTokenReference(value) {
    if (!value || typeof value !== 'string') return false;
    
    // Common token reference patterns
    return (
      value.includes('.') ||           // primary.500, spacing.md
      value.includes('-') ||           // primary-500, text-lg
      value.match(/^[a-zA-Z]+\w*$/)   // primary, secondary
    );
  }

  isValidTokenReference(value, tokenNames) {
    return tokenNames.some(tokenName => 
      tokenName === value ||
      tokenName.endsWith(`.${value}`) ||
      tokenName.includes(value)
    );
  }

  findMatchingToken(value, flatTokens, propName) {
    // Simple matching logic - could be enhanced
    for (const [tokenName, tokenValue] of Object.entries(flatTokens)) {
      if (tokenValue.value === value || tokenValue === value) {
        return tokenName;
      }
    }
    return null;
  }

  suggestValidToken(value, tokenNames) {
    // Simple fuzzy matching
    const suggestions = tokenNames
      .filter(name => this.similarity(value, name) > 0.3)
      .sort((a, b) => this.similarity(value, b) - this.similarity(value, a))
      .slice(0, 3);
    
    return suggestions.length > 0 ? 
      `Did you mean: ${suggestions.join(', ')}?` : 
      'Check available tokens in your design system';
  }

  suggestValidProp(propName, validProps) {
    const suggestions = validProps
      .filter(name => this.similarity(propName, name) > 0.3)
      .sort((a, b) => this.similarity(propName, b) - this.similarity(propName, a))
      .slice(0, 3);
    
    return suggestions.length > 0 ? 
      `Did you mean: ${suggestions.join(', ')}?` : 
      `Valid props: ${validProps.join(', ')}`;
  }

  similarity(a, b) {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    const editDistance = this.levenshtein(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  flattenTokens(tokens, prefix = '') {
    const flattened = {};
    
    for (const [key, value] of Object.entries(tokens)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if ('value' in value) {
          flattened[currentPath] = value;
        } else {
          Object.assign(flattened, this.flattenTokens(value, currentPath));
        }
      } else {
        flattened[currentPath] = { value };
      }
    }
    
    return flattened;
  }

  getLineNumber(node, fileContext) {
    return node.loc ? node.loc.start.line : 1;
  }

  getColumnNumber(node, fileContext) {
    return node.loc ? node.loc.start.column + 1 : 1;
  }

  addViolation(violation) {
    this.violations.push(violation);
    this.stats.violations++;
  }

  generateReport(options = {}) {
    const { format = 'default', groupBy = 'type' } = options;
    
    switch (format) {
      case 'json':
        return JSON.stringify({
          violations: this.violations,
          stats: this.stats,
          isValid: this.violations.length === 0
        }, null, 2);
      
      case 'github':
        return this.generateGitHubReport();
      
      case 'junit':
        return this.generateJUnitReport();
      
      default:
        return this.generateDefaultReport(groupBy);
    }
  }

  generateDefaultReport(groupBy) {
    let report = '';
    
    // Header
    if (this.violations.length === 0) {
      report += chalk.green('✅ Design system validation passed\n');
      report += chalk.gray(`Scanned ${this.stats.filesScanned} files, checked ${this.stats.componentsChecked} components\n`);
      return report;
    }
    
    report += chalk.red(`❌ Found ${this.violations.length} design system violations\n\n`);
    
    // Group violations
    const grouped = this.groupViolations(this.violations, groupBy);
    
    for (const [group, violations] of Object.entries(grouped)) {
      report += chalk.yellow(`${group.toUpperCase()} (${violations.length})\n`);
      
      for (const violation of violations) {
        const severity = violation.severity === 'error' ? '❌' : '⚠️';
        report += `  ${severity} ${violation.message}\n`;
        report += chalk.gray(`     ${violation.file}:${violation.line}:${violation.column}\n`);
        
        if (violation.suggestion) {
          report += chalk.cyan(`     💡 ${violation.suggestion}\n`);
        }
        report += '\n';
      }
    }
    
    // Summary
    report += chalk.gray(`\nSummary:\n`);
    report += chalk.gray(`  Files scanned: ${this.stats.filesScanned}\n`);
    report += chalk.gray(`  Components checked: ${this.stats.componentsChecked}\n`);
    report += chalk.gray(`  Violations found: ${this.stats.violations}\n`);
    
    return report;
  }

  generateGitHubReport() {
    // GitHub Actions format
    let output = '';
    
    for (const violation of this.violations) {
      const level = violation.severity === 'error' ? 'error' : 'warning';
      output += `::${level} file=${violation.file},line=${violation.line},col=${violation.column}::${violation.message}\n`;
    }
    
    return output;
  }

  generateJUnitReport() {
    // JUnit XML format for CI systems
    const errors = this.violations.filter(v => v.severity === 'error').length;
    const warnings = this.violations.filter(v => v.severity === 'warning').length;
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuite name="Design System Validation" tests="${this.stats.filesScanned}" failures="${errors}" errors="${warnings}">\n`;
    
    for (const violation of this.violations) {
      xml += `  <testcase name="${violation.file}" classname="DesignSystemValidation">\n`;
      if (violation.severity === 'error') {
        xml += `    <failure message="${violation.message}">`;
        xml += `Location: ${violation.file}:${violation.line}:${violation.column}\n`;
        xml += `Suggestion: ${violation.suggestion || 'None'}`;
        xml += `</failure>\n`;
      }
      xml += `  </testcase>\n`;
    }
    
    xml += '</testsuite>\n';
    return xml;
  }

  groupViolations(violations, groupBy) {
    const grouped = {};
    
    for (const violation of violations) {
      const key = violation[groupBy] || 'other';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(violation);
    }
    
    return grouped;
  }
}

/**
 * Main CI validation command
 */
export async function runValidateCI(sourcePath, options = {}) {
  const {
    registry: registryPath = './registry',
    format = 'default',
    output: outputFile,
    failOnViolations = true,
    checkTokens = true,
    checkProps = true,
    checkVariants = true,
    allowedHardcodedValues = [],
    ignorePatterns = ['node_modules/**', 'dist/**', 'build/**'],
    globPattern = '**/*.{tsx,jsx,ts,js}',
    verbose = false,
    json = false
  } = options;

  try {
    if (verbose && !json) {
      console.log(chalk.blue('🔍 Starting design system validation...'));
      console.log(chalk.gray(`Registry: ${registryPath}`));
      console.log(chalk.gray(`Source: ${sourcePath}`));
    }

    const validator = new DesignSystemValidator(registryPath);
    await validator.loadRegistry();

    const result = await validator.validateDirectory(sourcePath, {
      globPattern,
      ignorePatterns,
      checkTokens,
      checkProps,
      checkVariants,
      allowedHardcodedValues,
      verbose
    });

    // Generate report
    const report = validator.generateReport({ format });

    // Output results
    if (outputFile) {
      await fs.writeFile(outputFile, report);
      if (!json) {
        console.log(chalk.green(`Validation report written to: ${outputFile}`));
      }
    } else if (!json) {
      console.log(report);
    }

    // JSON output for machine consumption
    if (json) {
      console.log(JSON.stringify({
        isValid: result.isValid,
        violations: result.violations,
        stats: result.stats
      }, null, 2));
    }

    // Exit with appropriate code
    if (failOnViolations && !result.isValid) {
      process.exit(1);
    }

    return result;

  } catch (error) {
    if (json) {
      console.error(JSON.stringify({ error: error.message }));
    } else {
      console.error(chalk.red(`Validation failed: ${error.message}`));
    }
    process.exit(1);
  }
}

export { DesignSystemValidator };