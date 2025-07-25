import fs from 'fs/promises';
import chalk from 'chalk';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * DCP Registry Validator
 * 
 * Features:
 * - Schema validation against DCP IR spec
 * - Auto-fix common validation errors
 * - Detailed error reporting with suggestions
 * - Component-level validation
 * - Token validation
 * - Relationship validation
 */

export async function runValidateTransform(registryPath, options = {}) {
  const {
    fix = false,
    strict = false
  } = options;

  console.log(chalk.blue(`✅ Validating DCP registry: ${registryPath}`));
  
  // Load registry
  const registryContent = await fs.readFile(registryPath, 'utf-8');
  const registry = JSON.parse(registryContent);
  
  const validator = new DCPValidator({
    strict,
    verbose: options.verbose
  });
  
  const result = await validator.validate(registry);
  
  if (result.valid) {
    console.log(chalk.green('✅ Registry is valid!'));
    
    if (result.warnings.length > 0) {
      console.log(chalk.yellow(`⚠️  ${result.warnings.length} warnings:`));
      result.warnings.forEach(warning => {
        console.log(chalk.yellow(`   - ${warning.message}`));
      });
    }
  } else {
    console.log(chalk.red(`❌ Registry is invalid (${result.errors.length} errors)`));
    
    result.errors.forEach(error => {
      console.log(chalk.red(`   Error: ${error.message}`));
      if (error.path) {
        console.log(chalk.gray(`   Path: ${error.path}`));
      }
      if (error.suggestion) {
        console.log(chalk.cyan(`   Suggestion: ${error.suggestion}`));
      }
    });
    
    if (fix && result.fixableErrors.length > 0) {
      console.log(chalk.blue(`🔧 Auto-fixing ${result.fixableErrors.length} errors...`));
      
      const fixed = validator.autoFix(registry, result.fixableErrors);
      
      // Write fixed registry back
      await fs.writeFile(registryPath, JSON.stringify(fixed, null, 2));
      
      console.log(chalk.green('✅ Auto-fix completed'));
      
      // Re-validate
      const revalidated = await validator.validate(fixed);
      if (revalidated.valid) {
        console.log(chalk.green('✅ Registry is now valid after auto-fix'));
      } else {
        console.log(chalk.yellow(`⚠️  ${revalidated.errors.length} errors remain after auto-fix`));
      }
    }
  }
  
  return {
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
    summary: {
      isValid: result.valid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      componentsChecked: result.componentsChecked,
      tokensChecked: result.tokensChecked
    }
  };
}

class DCPValidator {
  constructor(options = {}) {
    this.strict = options.strict || false;
    this.verbose = options.verbose || false;
    
    this.ajv = new Ajv({
      allErrors: true,
      verbose: this.verbose,
      strict: this.strict
    });
    
    addFormats(this.ajv);
    
    this.schema = this.buildDCPSchema();
    this.validateRegistry = this.ajv.compile(this.schema);
  }
  
  async validate(registry) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      fixableErrors: [],
      componentsChecked: 0,
      tokensChecked: 0
    };
    
    try {
      // 1. Schema validation
      const schemaValid = this.validateRegistry(registry);
      
      if (!schemaValid) {
        result.valid = false;
        
        this.validateRegistry.errors?.forEach(error => {
          const validationError = {
            type: 'schema',
            message: `${error.instancePath} ${error.message}`,
            path: error.instancePath,
            value: error.data,
            suggestion: this.getSuggestionForSchemaError(error)
          };
          
          result.errors.push(validationError);
          
          if (this.isFixableSchemaError(error)) {
            result.fixableErrors.push(validationError);
          }
        });
      }
      
      // 2. Component-level validation
      if (registry.components) {
        result.componentsChecked = registry.components.length;
        
        registry.components.forEach((component, index) => {
          const componentErrors = this.validateComponent(component, index);
          result.errors.push(...componentErrors.errors);
          result.warnings.push(...componentErrors.warnings);
          result.fixableErrors.push(...componentErrors.fixableErrors);
        });
      }
      
      // 3. Token validation
      if (registry.tokens) {
        const tokenResults = this.validateTokens(registry.tokens);
        result.tokensChecked = tokenResults.tokensChecked;
        result.errors.push(...tokenResults.errors);
        result.warnings.push(...tokenResults.warnings);
        result.fixableErrors.push(...tokenResults.fixableErrors);
      }
      
      // 4. Cross-reference validation
      const crossRefResults = this.validateCrossReferences(registry);
      result.warnings.push(...crossRefResults.warnings);
      
      // 5. Performance and best practices
      const performanceResults = this.validatePerformance(registry);
      result.warnings.push(...performanceResults.warnings);
      
      if (result.errors.length > 0) {
        result.valid = false;
      }
      
    } catch (error) {
      result.valid = false;
      result.errors.push({
        type: 'validation_error',
        message: `Validation failed: ${error.message}`,
        suggestion: 'Check that the registry is valid JSON and follows DCP structure'
      });
    }
    
    return result;
  }
  
  validateComponent(component, index) {
    const errors = [];
    const warnings = [];
    const fixableErrors = [];
    
    const path = `/components/${index}`;
    
    // Required fields
    if (!component.name) {
      const error = {
        type: 'missing_field',
        message: 'Component missing required field: name',
        path: `${path}/name`,
        suggestion: 'Add a name field with a PascalCase component name'
      };
      errors.push(error);
      fixableErrors.push(error);
    }
    
    // Name validation
    if (component.name && !this.isValidComponentName(component.name)) {
      warnings.push({
        type: 'naming_convention',
        message: `Component name "${component.name}" should use PascalCase`,
        path: `${path}/name`,
        suggestion: `Use "${this.toPascalCase(component.name)}" instead`
      });
    }
    
    // Props validation
    if (component.props) {
      component.props.forEach((prop, propIndex) => {
        const propPath = `${path}/props/${propIndex}`;
        
        if (!prop.name) {
          const error = {
            type: 'missing_field',
            message: 'Prop missing required field: name',
            path: `${propPath}/name`,
            suggestion: 'Add a name field for the prop'
          };
          errors.push(error);
          fixableErrors.push(error);
        }
        
        if (!prop.type) {
          const error = {
            type: 'missing_field',
            message: 'Prop missing required field: type',
            path: `${propPath}/type`,
            suggestion: 'Add a type field (string, number, boolean, etc.)'
          };
          errors.push(error);
          fixableErrors.push(error);
        }
        
        // Prop naming convention
        if (prop.name && !this.isValidPropName(prop.name)) {
          warnings.push({
            type: 'naming_convention',
            message: `Prop name "${prop.name}" should use camelCase`,
            path: `${propPath}/name`,
            suggestion: `Use "${this.toCamelCase(prop.name)}" instead`
          });
        }
      });
    }
    
    // Variants validation
    if (component.variants) {
      component.variants.forEach((variant, variantIndex) => {
        const variantPath = `${path}/variants/${variantIndex}`;
        
        if (!variant.name) {
          const error = {
            type: 'missing_field',
            message: 'Variant missing required field: name',
            path: `${variantPath}/name`,
            suggestion: 'Add a name field for the variant'
          };
          errors.push(error);
          fixableErrors.push(error);
        }
      });
    }
    
    // Description best practice
    if (!component.description || component.description.trim().length === 0) {
      warnings.push({
        type: 'best_practice',
        message: 'Component missing description',
        path: `${path}/description`,
        suggestion: 'Add a helpful description for documentation and AI understanding'
      });
    }
    
    return { errors, warnings, fixableErrors };
  }
  
  validateTokens(tokens) {
    const errors = [];
    const warnings = [];
    const fixableErrors = [];
    let tokensChecked = 0;
    
    Object.entries(tokens).forEach(([category, categoryTokens]) => {
      Object.entries(categoryTokens).forEach(([tokenName, token]) => {
        tokensChecked++;
        
        const path = `/tokens/${category}/${tokenName}`;
        
        // Token value validation
        if (!token.value && token.value !== 0) {
          const error = {
            type: 'missing_value',
            message: 'Token missing value',
            path: `${path}/value`,
            suggestion: 'Add a value field for the token'
          };
          errors.push(error);
          fixableErrors.push(error);
        }
        
        // Token type validation
        if (token.type) {
          const validationError = this.validateTokenType(token.type, token.value, path);
          if (validationError) {
            errors.push(validationError);
          }
        } else {
          warnings.push({
            type: 'missing_type',
            message: 'Token missing type information',
            path: `${path}/type`,
            suggestion: 'Add a type field (color, dimension, font, etc.)'
          });
        }
        
        // Token naming convention
        if (!this.isValidTokenName(tokenName)) {
          warnings.push({
            type: 'naming_convention',
            message: `Token name "${tokenName}" should use kebab-case`,
            path,
            suggestion: `Use "${this.toKebabCase(tokenName)}" instead`
          });
        }
      });
    });
    
    return { errors, warnings, fixableErrors, tokensChecked };
  }
  
  validateTokenType(type, value, path) {
    switch (type) {
      case 'color':
        if (!this.isValidColor(value)) {
          return {
            type: 'invalid_value',
            message: `Invalid color value: ${value}`,
            path: `${path}/value`,
            suggestion: 'Use hex, rgb, rgba, hsl, or named color values'
          };
        }
        break;
        
      case 'dimension':
        if (!this.isValidDimension(value)) {
          return {
            type: 'invalid_value',
            message: `Invalid dimension value: ${value}`,
            path: `${path}/value`,
            suggestion: 'Use valid CSS dimension values (px, rem, em, %, etc.)'
          };
        }
        break;
        
      case 'fontFamily':
        if (typeof value !== 'string') {
          return {
            type: 'invalid_value',
            message: 'Font family must be a string',
            path: `${path}/value`,
            suggestion: 'Use a string value for font family'
          };
        }
        break;
    }
    
    return null;
  }
  
  validateCrossReferences(registry) {
    const warnings = [];
    
    // Check for unused tokens
    if (registry.tokens && registry.components) {
      const usedTokens = new Set();
      
      registry.components.forEach(component => {
        // Simple heuristic - look for token references in examples/descriptions
        const componentStr = JSON.stringify(component);
        Object.keys(registry.tokens).forEach(category => {
          Object.keys(registry.tokens[category]).forEach(tokenName => {
            if (componentStr.includes(tokenName)) {
              usedTokens.add(`${category}.${tokenName}`);
            }
          });
        });
      });
      
      // Report unused tokens
      Object.entries(registry.tokens).forEach(([category, tokens]) => {
        Object.keys(tokens).forEach(tokenName => {
          const tokenKey = `${category}.${tokenName}`;
          if (!usedTokens.has(tokenKey)) {
            warnings.push({
              type: 'unused_token',
              message: `Token "${tokenKey}" appears unused`,
              path: `/tokens/${category}/${tokenName}`,
              suggestion: 'Consider removing unused tokens or add references in components'
            });
          }
        });
      });
    }
    
    return { warnings };
  }
  
  validatePerformance(registry) {
    const warnings = [];
    
    // Check registry size
    const registrySize = JSON.stringify(registry).length;
    if (registrySize > 1024 * 1024) { // 1MB
      warnings.push({
        type: 'performance',
        message: 'Registry size is large (> 1MB)',
        suggestion: 'Consider splitting into multiple registries or removing unused data'
      });
    }
    
    // Check component count
    if (registry.components && registry.components.length > 100) {
      warnings.push({
        type: 'performance',
        message: `Large number of components (${registry.components.length})`,
        suggestion: 'Consider organizing components into categories or sub-registries'
      });
    }
    
    return { warnings };
  }
  
  autoFix(registry, fixableErrors) {
    const fixed = JSON.parse(JSON.stringify(registry)); // Deep clone
    
    fixableErrors.forEach(error => {
      try {
        switch (error.type) {
          case 'missing_field':
            this.fixMissingField(fixed, error);
            break;
          case 'naming_convention':
            this.fixNamingConvention(fixed, error);
            break;
          case 'missing_value':
            this.fixMissingValue(fixed, error);
            break;
        }
      } catch (fixError) {
        if (this.verbose) {
          console.warn(`Failed to auto-fix error at ${error.path}: ${fixError.message}`);
        }
      }
    });
    
    return fixed;
  }
  
  fixMissingField(registry, error) {
    const pathParts = error.path.split('/').filter(Boolean);
    
    if (pathParts.includes('name') && pathParts.includes('components')) {
      // Generate component name from file path or index
      const componentIndex = parseInt(pathParts[1]);
      const component = registry.components[componentIndex];
      if (!component.name) {
        component.name = `Component${componentIndex}`;
      }
    }
    
    if (pathParts.includes('type') && pathParts.includes('props')) {
      // Set default prop type
      const componentIndex = parseInt(pathParts[1]);
      const propIndex = parseInt(pathParts[3]);
      const prop = registry.components[componentIndex].props[propIndex];
      if (!prop.type) {
        prop.type = 'string'; // Default type
      }
    }
  }
  
  fixNamingConvention(registry, error) {
    // This would require more complex path parsing and value setting
    // For now, just log that it's fixable but not auto-implemented
    if (this.verbose) {
      console.log(`Naming convention fix for ${error.path} would be manual`);
    }
  }
  
  fixMissingValue(registry, error) {
    const pathParts = error.path.split('/').filter(Boolean);
    
    if (pathParts.includes('tokens') && pathParts.includes('value')) {
      const category = pathParts[1];
      const tokenName = pathParts[2];
      const token = registry.tokens[category][tokenName];
      
      if (!token.value) {
        // Set a placeholder value based on category
        switch (category) {
          case 'colors':
            token.value = '#000000';
            break;
          case 'spacing':
            token.value = '0px';
            break;
          case 'typography':
            token.value = '16px';
            break;
          default:
            token.value = '';
        }
      }
    }
  }
  
  // Utility methods
  isValidComponentName(name) {
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }
  
  isValidPropName(name) {
    return /^[a-z][a-zA-Z0-9]*$/.test(name);
  }
  
  isValidTokenName(name) {
    return /^[a-z0-9-]+$/.test(name);
  }
  
  isValidColor(value) {
    return /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-z]+)/.test(value);
  }
  
  isValidDimension(value) {
    return /^-?\d*\.?\d+(px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch|vmin|vmax)$/.test(value);
  }
  
  toPascalCase(str) {
    return str.replace(/(?:^|[-_\s])(\w)/g, (_, char) => char.toUpperCase());
  }
  
  toCamelCase(str) {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
  
  toKebabCase(str) {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }
  
  getSuggestionForSchemaError(error) {
    switch (error.keyword) {
      case 'required':
        return `Add the required field: ${error.params.missingProperty}`;
      case 'type':
        return `Expected ${error.params.type}, got ${typeof error.data}`;
      case 'additionalProperties':
        return `Remove unexpected property: ${error.params.additionalProperty}`;
      default:
        return 'Check the DCP schema documentation';
    }
  }
  
  isFixableSchemaError(error) {
    const fixableKeywords = ['required', 'type'];
    return fixableKeywords.includes(error.keyword);
  }
  
  buildDCPSchema() {
    return {
      type: 'object',
      properties: {
        name: { type: 'string' },
        version: { type: 'string' },
        description: { type: 'string' },
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', pattern: '^[A-Z][a-zA-Z0-9]*$' },
              type: { type: 'string', default: 'component' },
              category: { type: 'string' },
              description: { type: 'string' },
              props: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    required: { type: 'boolean' },
                    default: {},
                    description: { type: 'string' }
                  },
                  required: ['name', 'type'],
                  additionalProperties: false
                }
              },
              variants: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    props: { type: 'object' }
                  },
                  required: ['name']
                }
              },
              examples: { type: 'array' },
              slots: { type: 'array' }
            },
            required: ['name', 'type'],
            additionalProperties: false
          }
        },
        tokens: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z][a-zA-Z0-9]*$': {
              type: 'object',
              patternProperties: {
                '^[a-zA-Z0-9-]+$': {
                  type: 'object',
                  properties: {
                    value: {},
                    type: { type: 'string' },
                    description: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        metadata: { type: 'object' },
        lastModified: { type: 'string', format: 'date-time' }
      },
      required: ['name', 'components'],
      additionalProperties: false
    };
  }
}