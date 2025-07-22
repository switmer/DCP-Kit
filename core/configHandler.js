import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { readJSON } from './utils.js';

/**
 * Resolve a path relative to the config file location
 * @param {string} basePath - Path to resolve
 * @param {string} configFilePath - Path to config file
 * @returns {string} Absolute resolved path
 */
export function resolvePath(basePath, configFilePath) {
  if (!basePath) {
    throw new Error('Path cannot be empty');
  }
  
  return path.isAbsolute(basePath)
    ? basePath
    : path.resolve(path.dirname(configFilePath), basePath);
}

/**
 * Load and validate config file
 * @param {string} configPath - Path to config file
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Object} Validated and normalized config
 */
export function loadConfig(configPath, verbose = false) {
  // Read config file
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const config = readJSON(configPath);
  if (verbose) {
    console.log('📦 Loaded config from:', configPath);
  }

  // Load schema
  const schemaPath = path.resolve(path.dirname(configPath), './schemas/config.schema.json');
  const schema = readJSON(schemaPath);

  // Validate config
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  if (!validate(config)) {
    const errors = ajv.errorsText(validate.errors);
    throw new Error(`Invalid config: ${errors}`);
  }

  // Handle legacy config keys
  if (config.components && !config.componentSource) {
    if (verbose) {
      console.warn('⚠️ Migrating legacy config: `components` → `componentSource`');
    }
    config.componentSource = config.components;
  }

  // Resolve all paths
  const resolvedConfig = {
    ...config,
    componentSource: resolvePath(config.componentSource || config.components, configPath),
    tokens: resolvePath(config.tokens, configPath),
    output: resolvePath(config.output, configPath)
  };

  if (verbose) {
    console.log('📁 Resolved paths:');
    console.log('   Components:', resolvedConfig.componentSource);
    console.log('   Tokens:', resolvedConfig.tokens);
    console.log('   Output:', resolvedConfig.output);
  }

  return resolvedConfig;
}

/**
 * Validate component patterns from config
 * @param {string[]} patterns - Glob patterns for components
 * @returns {string[]} Validated patterns
 */
export function validateComponentPatterns(patterns) {
  const defaultPatterns = ['**/*.tsx', '**/*.jsx'];
  
  if (!patterns || !Array.isArray(patterns)) {
    return defaultPatterns;
  }

  // Filter out invalid patterns
  const validPatterns = patterns.filter(p => 
    typeof p === 'string' && p.length > 0 && !p.includes('node_modules')
  );

  return validPatterns.length > 0 ? validPatterns : defaultPatterns;
} 