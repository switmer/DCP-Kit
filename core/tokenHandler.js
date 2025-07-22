import fs from 'fs';
import path from 'path';

/**
 * Extract CSS custom properties from CSS content using regex
 * Fast, simple approach that doesn't require PostCSS dependencies
 * @param {string} css - CSS content to parse
 * @param {boolean} flattenOutput - Whether to return flat key-value pairs
 * @returns {Object} Extracted custom properties
 */
export function extractCssCustomProps(css, flattenOutput = false) {
  const tokens = {};
  
  // Match CSS custom properties: --category-name: value;
  const customPropRegex = /--([a-zA-Z0-9-]+):\s*([^;]+);/g;
  
  let match;
  while ((match = customPropRegex.exec(css)) !== null) {
    const [, propName, value] = match;
    
    if (flattenOutput) {
      // Flat output: just key-value pairs
      tokens[`--${propName}`] = value.trim();
    } else {
      // Structured output: categorize by first part of name
      const parts = propName.split('-');
      const category = parts[0] || 'misc';
      const name = parts.slice(1).join('-') || propName;
      
      // Infer type from value
      const trimmedValue = value.trim();
      let type = 'string';
      
      if (trimmedValue.includes('hsl') || trimmedValue.includes('rgb') || trimmedValue.startsWith('#')) {
        type = 'color';
      } else if (trimmedValue.match(/\d+(px|rem|em|%)/)) {
        type = 'spacing';
      } else if (trimmedValue.match(/\d+(\.\d+)?s/)) {
        type = 'duration';
      } else if (trimmedValue.match(/\d{3}/)) {
        type = 'fontWeight';
      }
      
      if (!tokens[category]) tokens[category] = {};
      tokens[category][name] = {
        value: trimmedValue,
        type,
        source: 'css-custom-props'
      };
    }
  }
  
  return tokens;
}

/**
 * Safely load or create a design token file.
 * @param {string} tokenPath - Path to the token JSON file
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Object} The loaded or generated token data
 */
export function loadOrCreateTokenFile(tokenPath, verbose = false) {
  const absolutePath = path.resolve(tokenPath);
  
  if (!fs.existsSync(absolutePath)) {
    if (verbose) {
      console.log(`⚠️ Token file not found at ${absolutePath}`);
      console.log(`📦 Creating default token file...`);
    }
    
    const defaultTokens = generateDefaultTokens();
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, JSON.stringify(defaultTokens, null, 2));
    
    if (verbose) {
      console.log(`✅ Created default token file at ${absolutePath}`);
    }
    return defaultTokens;
  }

  try {
    const tokens = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
    const validationResult = validateTokenStructure(tokens);
    
    if (verbose && validationResult.warnings.length > 0) {
      validationResult.warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
    }
    
    return tokens;
  } catch (err) {
    if (verbose) {
      console.warn(`⚠️ Could not parse token file at ${absolutePath}:`, err.message);
      console.log(`📦 Using fallback token structure...`);
    }
    return generateDefaultTokens();
  }
}

/**
 * Validate token structure and provide detailed feedback
 * @param {Object} tokens - The token object to validate
 * @returns {Object} Validation result with warnings
 */
export function validateTokenStructure(tokens) {
  const warnings = [];
  
  // Basic structure validation
  if (!tokens || typeof tokens !== 'object') {
    throw new Error('Token file must export an object');
  }

  // Check for required categories
  const requiredCategories = ['color', 'spacing', 'typography'];
  const missingCategories = requiredCategories.filter(cat => !(cat in tokens));
  
  if (missingCategories.length > 0) {
    warnings.push(`Missing recommended token categories: ${missingCategories.join(', ')}`);
  }

  // Validate value structure
  function validateValue(obj, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (value && typeof value === 'object') {
        if ('value' in value) {
          // Validate value format
          if (typeof value.value !== 'string' && typeof value.value !== 'number') {
            warnings.push(`Invalid token value type at ${currentPath}: expected string or number, got ${typeof value.value}`);
          }
        } else {
          validateValue(value, currentPath);
        }
      }
    }
  }

  validateValue(tokens);
  
  return { warnings };
}

/**
 * Generate a default token structure with essential design tokens
 * @returns {Object} Default token structure
 */
export function generateDefaultTokens() {
  return {
    color: {
      surface: {
        primary: { value: "#0066CC" },
        secondary: { value: "#4D4D4D" },
        background: { value: "#FFFFFF" }
      },
      text: {
        primary: { value: "#000000" },
        secondary: { value: "#666666" },
        inverse: { value: "#FFFFFF" }
      }
    },
    spacing: {
      xs: { value: "4px" },
      sm: { value: "8px" },
      md: { value: "16px" },
      lg: { value: "24px" },
      xl: { value: "32px" }
    },
    typography: {
      size: {
        xs: { value: "12px" },
        sm: { value: "14px" },
        md: { value: "16px" },
        lg: { value: "20px" },
        xl: { value: "24px" }
      },
      weight: {
        regular: { value: "400" },
        medium: { value: "500" },
        bold: { value: "700" }
      }
    }
  };
} 