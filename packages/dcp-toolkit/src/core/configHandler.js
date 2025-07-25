import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { readJSON } from './utils.js';

/**
 * Extract theming configuration from ShadCN/UI components.json
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Theme configuration
 */
export function extractThemeConfig(projectRoot) {
  const componentsJsonPath = path.join(projectRoot, 'components.json');
  
  if (!fs.existsSync(componentsJsonPath)) {
    return null; // No fake defaults - return null when no real config exists
  }

  try {
    const componentsJson = JSON.parse(fs.readFileSync(componentsJsonPath, 'utf-8'));
    
    // Only return actual config data, no fake defaults
    const tailwind = componentsJson.tailwind;
    if (!tailwind) {
      return null; // No tailwind config = no theme config
    }
    
    return {
      cssVariables: tailwind.cssVariables === true, // Explicit true, not false default
      baseColor: tailwind.baseColor, // Actual value or undefined
      css: tailwind.css, // Actual value or undefined
      prefix: tailwind.prefix || '', // Empty string is reasonable default
      themingMode: tailwind.cssVariables ? 'css-variables' : 'utility',
      rsc: componentsJson.rsc,
      tsx: componentsJson.tsx,
      aliases: componentsJson.aliases
    };
  } catch (error) {
    console.warn('Failed to parse components.json:', error.message);
    return null; // Parse error = no config, don't fake it
  }
}

/**
 * Parse CSS variables from stylesheet content
 * @param {string} cssContent - CSS file content
 * @returns {Object} Parsed CSS variables by theme
 */
export function extractCSSVariableThemes(cssContent) {
  const themes = { 
    light: {}, 
    dark: {},
    custom: {} 
  };
  
  // Parse :root block (light theme)
  const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/s);
  if (rootMatch) {
    themes.light = parseCSSVariables(rootMatch[1]);
  }
  
  // Parse .dark block
  const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/s);
  if (darkMatch) {
    themes.dark = parseCSSVariables(darkMatch[1]);
  }
  
  // Parse custom theme blocks (e.g., .theme-brand, [data-theme="custom"])
  const customThemeMatches = cssContent.matchAll(/\.(theme-[\w-]+|\[data-theme="([^"]+)"\])\s*\{([^}]+)\}/gs);
  for (const match of customThemeMatches) {
    const themeName = match[2] || match[1];
    themes.custom[themeName] = parseCSSVariables(match[3]);
  }
  
  return themes;
}

/**
 * Parse CSS variables from a CSS block
 * @param {string} cssBlock - CSS block content
 * @returns {Object} Parsed variables
 */
function parseCSSVariables(cssBlock) {
  const variables = {};
  
  // Match CSS custom properties: --variable-name: value;
  const variableMatches = cssBlock.matchAll(/--([a-zA-Z-]+):\s*([^;]+);/g);
  
  for (const match of variableMatches) {
    const name = match[1];
    const value = match[2].trim();
    
    variables[`--${name}`] = {
      value,
      // Parse color space and values for oklch/hsl/rgb
      colorSpace: detectColorSpace(value),
      computed: value
    };
  }
  
  return variables;
}

/**
 * Detect color space from CSS value
 * @param {string} value - CSS color value
 * @returns {string} Color space identifier
 */
function detectColorSpace(value) {
  if (value.includes('oklch(')) return 'oklch';
  if (value.includes('hsl(')) return 'hsl';
  if (value.includes('rgb(')) return 'rgb';
  if (value.includes('hwb(')) return 'hwb';
  if (value.startsWith('#')) return 'hex';
  if (value.includes('deg') || value.includes('%')) return 'hsl-like';
  return 'unknown';
}

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