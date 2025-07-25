import { componentSchema, configSchema, manifestSchema, themeSchema, Ajv, addFormats } from '@dcp/spec';

/**
 * Schema Validator - Validates DCP IR against JSON Schema
 * 
 * Provides centralized schema validation for:
 * - DCP component registry
 * - Individual component schemas
 * - Token schemas
 * - Manifest schemas
 */

export class SchemaValidator {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    
    // Initialize AJV with formats support
    this.ajv = new Ajv({ 
      allErrors: true,
      verbose: this.verbose,
      strict: false // Allow additional properties by default
    });
    addFormats(this.ajv);
    
    // Cache for compiled schemas
    this.compiledSchemas = new Map();
    
    this.loadSchemas();
  }

  /**
   * Load schemas from @dcp/spec package
   */
  loadSchemas() {
    const schemas = {
      'dcp.component': componentSchema,
      'manifest': manifestSchema,
      'config': configSchema,
      'theme': themeSchema
    };

    for (const [schemaName, schemaContent] of Object.entries(schemas)) {
      try {
        // Compile and cache the schema
        const compiledSchema = this.ajv.compile(schemaContent);
        this.compiledSchemas.set(schemaName, compiledSchema);
        
        if (this.verbose) {
          console.log(`✅ Loaded schema: ${schemaName}`);
        }
      } catch (error) {
        if (this.verbose) {
          console.error(`❌ Failed to load schema ${schemaName}:`, error.message);
        }
      }
    }
  }

  /**
   * Validate data against a specific schema
   * @param {Object} data - Data to validate
   * @param {string} schemaName - Name of schema to validate against
   * @returns {Object} Validation result
   */
  validate(data, schemaName) {
    if (!this.compiledSchemas.has(schemaName)) {
      throw new Error(`Schema not found: ${schemaName}`);
    }

    const schema = this.compiledSchemas.get(schemaName);
    const isValid = schema(data);

    const result = {
      valid: isValid,
      schemaName,
      errors: isValid ? [] : this.formatErrors(schema.errors),
      data
    };

    if (this.verbose && !isValid) {
      console.error(`❌ Schema validation failed for ${schemaName}:`);
      result.errors.forEach(error => {
        console.error(`  - ${error.path}: ${error.message}`);
      });
    }

    return result;
  }

  /**
   * Validate DCP component
   * @param {Object} component - Component data to validate
   * @returns {Object} Validation result
   */
  validateComponent(component) {
    return this.validate(component, 'dcp.component');
  }

  /**
   * Validate DCP manifest/registry
   * @param {Object} manifest - Manifest data to validate
   * @returns {Object} Validation result
   */
  validateManifest(manifest) {
    return this.validate(manifest, 'manifest');
  }

  /**
   * Validate design tokens
   * @param {Object} tokens - Token data to validate
   * @returns {Object} Validation result
   */
  validateTokens(tokens) {
    return this.validate(tokens, 'theme');
  }

  /**
   * Validate configuration
   * @param {Object} config - Config data to validate
   * @returns {Object} Validation result
   */
  validateConfig(config) {
    return this.validate(config, 'config');
  }

  /**
   * Format AJV errors into readable format
   * @param {Array} errors - AJV error objects
   * @returns {Array} Formatted error objects
   */
  formatErrors(errors) {
    if (!errors) return [];

    return errors.map(error => ({
      path: error.instancePath || error.dataPath || 'root',
      message: error.message,
      value: error.data,
      schema: error.schemaPath,
      keyword: error.keyword
    }));
  }

  /**
   * Get list of available schemas
   * @returns {Array} Array of schema names
   */
  getAvailableSchemas() {
    return Array.from(this.compiledSchemas.keys());
  }

  /**
   * Validate and throw on error
   * @param {Object} data - Data to validate
   * @param {string} schemaName - Schema name
   * @throws {Error} If validation fails
   */
  validateOrThrow(data, schemaName) {
    const result = this.validate(data, schemaName);
    
    if (!result.valid) {
      const errorMessages = result.errors.map(e => `${e.path}: ${e.message}`).join(', ');
      throw new Error(`Schema validation failed for ${schemaName}: ${errorMessages}`);
    }

    return result;
  }
}

/**
 * Create a global validator instance
 */
let globalValidator = null;

/**
 * Get or create global validator instance
 * @param {Object} options - Validator options
 * @returns {SchemaValidator} Validator instance
 */
export function getValidator(options = {}) {
  if (!globalValidator) {
    globalValidator = new SchemaValidator(options);
  }
  return globalValidator;
}

/**
 * Convenience function to validate component
 * @param {Object} component - Component to validate
 * @param {Object} options - Validator options
 * @returns {Object} Validation result
 */
export function validateComponent(component, options = {}) {
  const validator = getValidator(options);
  return validator.validateComponent(component);
}

/**
 * Convenience function to validate manifest
 * @param {Object} manifest - Manifest to validate
 * @param {Object} options - Validator options
 * @returns {Object} Validation result
 */
export function validateManifest(manifest, options = {}) {
  const validator = getValidator(options);
  return validator.validateManifest(manifest);
}

/**
 * Convenience function to validate tokens
 * @param {Object} tokens - Tokens to validate
 * @param {Object} options - Validator options
 * @returns {Object} Validation result
 */
export function validateTokens(tokens, options = {}) {
  const validator = getValidator(options);
  return validator.validateTokens(tokens);
}

/**
 * Command-line interface
 */
export async function runValidatorCLI(args) {
  const filePath = args[0];
  const schemaName = args[1];

  if (!filePath) {
    console.error('❌ Usage: node schemaValidator.js <filePath> [schemaName]');
    console.error('   Available schemas: dcp.component, manifest, theme, config');
    process.exit(1);
  }

  try {
    // Load data
    const fs = await import('fs');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Create validator
    const validator = new SchemaValidator({ verbose: true });
    
    // Auto-detect schema if not provided
    let targetSchema = schemaName;
    if (!targetSchema) {
      if (data.components) {
        targetSchema = 'manifest';
      } else if (data.name && data.props) {
        targetSchema = 'dcp.component';
      } else if (data.registryName) {
        targetSchema = 'config';
      } else {
        targetSchema = 'theme';
      }
    }

    // Validate
    const result = validator.validate(data, targetSchema);
    
    if (result.valid) {
      console.log(`✅ Validation passed for ${targetSchema}`);
    } else {
      console.error(`❌ Validation failed for ${targetSchema}:`);
      result.errors.forEach(error => {
        console.error(`  - ${error.path}: ${error.message}`);
      });
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Enable direct CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidatorCLI(process.argv.slice(2));
}