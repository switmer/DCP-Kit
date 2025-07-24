// core/tokenDTCG.js
/**
 * Design Tokens Community Group (DTCG) Format Support
 * 
 * Enables DCP-Transformer to import/export tokens using the W3C standard
 * DTCG JSON format, making DCP interoperable with:
 * - Tokens Studio
 * - Style Dictionary v4+
 * - Figma Variables API
 * - StyleX, Tailwind, and other token consumers
 * - AI agents and design system automation tools
 * 
 * DTCG Spec: https://design-tokens.github.io/community-group/format/
 */

/**
 * Convert DCP tokens to DTCG format
 * 
 * @param {Object} dcpTokens - DCP token structure
 * @param {Object} options - Export options
 * @returns {Object} DTCG-compliant token JSON
 */
export function exportToDTCG(dcpTokens, options = {}) {
  const {
    includeExtensions = true,
    groupPrefix = '',
    includeMetadata = true
  } = options;

  const dtcgTokens = {};

  // Add DTCG metadata if requested
  if (includeMetadata) {
    dtcgTokens.$description = 'Design tokens exported from DCP-Transformer';
    dtcgTokens.$extensions = {
      'com.dcp.transformer': {
        version: '1.0.0',
        extractedAt: new Date().toISOString(),
        source: 'dcp-registry'
      }
    };
  }

  // Process each token category
  for (const [category, tokens] of Object.entries(dcpTokens)) {
    if (category.startsWith('$')) continue; // Skip DTCG metadata

    const categoryName = groupPrefix ? `${groupPrefix}.${category}` : category;
    dtcgTokens[categoryName] = processDCPTokenGroup(tokens, includeExtensions);
  }

  return dtcgTokens;
}

/**
 * Convert DTCG tokens to DCP format
 * 
 * @param {Object} dtcgTokens - DTCG token structure
 * @param {Object} options - Import options
 * @returns {Object} DCP-compatible token structure
 */
export function importFromDTCG(dtcgTokens, options = {}) {
  const {
    preserveGroups = true,
    extractExtensions = true,
    categoryMapping = {}
  } = options;

  const dcpTokens = {};
  const metadata = {
    importedAt: new Date().toISOString(),
    source: 'dtcg-import'
  };

  // Extract DTCG extensions if present
  if (extractExtensions && dtcgTokens.$extensions) {
    metadata.extensions = dtcgTokens.$extensions;
  }

  // Process each top-level group
  if (dtcgTokens && typeof dtcgTokens === 'object') {
    for (const [groupName, group] of Object.entries(dtcgTokens)) {
      if (groupName.startsWith('$')) continue; // Skip DTCG metadata

      const categoryName = categoryMapping[groupName] || groupName;
      if (group && typeof group === 'object') {
        dcpTokens[categoryName] = processDTCGTokenGroup(group, preserveGroups);
      }
    }
  }

  // Add metadata
  dcpTokens.$metadata = metadata;

  return dcpTokens;
}

/**
 * Process a DCP token group for DTCG export
 */
function processDCPTokenGroup(tokens, includeExtensions) {
  const processed = {};

  for (const [name, token] of Object.entries(tokens)) {
    if (typeof token === 'object' && token.value !== undefined) {
      // This is a token with DCP structure
      processed[name] = {
        $value: token.value,
        $type: mapDCPTypeToDTCG(token.type || inferTokenType(token.value)),
        ...(token.description && { $description: token.description })
      };

      // Add extensions for DCP-specific metadata
      if (includeExtensions) {
        processed[name].$extensions = {
          'com.dcp.transformer': {
            ...(token.category && { category: token.category }),
            ...(token.usage && { usage: token.usage }),
            ...(token.variants && { variants: token.variants }),
            ...(token.filePath && { filePath: token.filePath })
          }
        };
      }
    } else if (typeof token === 'object') {
      // This is a nested group
      processed[name] = processDCPTokenGroup(token, includeExtensions);
    } else {
      // Simple value - create basic DTCG token
      processed[name] = {
        $value: token,
        $type: inferTokenType(token)
      };
    }
  }

  return processed;
}

/**
 * Process a DTCG token group for DCP import
 */
function processDTCGTokenGroup(group, preserveGroups) {
  const processed = {};

  for (const [name, item] of Object.entries(group)) {
    if (name.startsWith('$')) continue; // Skip DTCG metadata

    if (item.$value !== undefined) {
      // This is a DTCG token
      processed[name] = {
        value: item.$value,
        type: mapDTCGTypeToDCP(item.$type),
        ...(item.$description && { description: item.$description })
      };

      // Extract DCP extensions if present
      if (item.$extensions?.['com.dcp.transformer']) {
        const ext = item.$extensions['com.dcp.transformer'];
        Object.assign(processed[name], ext);
      }
    } else if (typeof item === 'object') {
      // This is a nested group
      if (preserveGroups) {
        processed[name] = processDTCGTokenGroup(item, preserveGroups);
      } else {
        // Flatten nested groups with dot notation
        const flattened = processDTCGTokenGroup(item, preserveGroups);
        for (const [subName, subToken] of Object.entries(flattened)) {
          processed[`${name}.${subName}`] = subToken;
        }
      }
    }
  }

  return processed;
}

/**
 * Map DCP token types to DTCG types
 */
function mapDCPTypeToDTCG(dcpType) {
  const typeMapping = {
    // Colors
    'color': 'color',
    'background': 'color',
    'text': 'color',
    'border': 'color',

    // Typography
    'font-size': 'dimension',
    'font-family': 'fontFamily',
    'fontFamily': 'fontFamily',
    'font-weight': 'fontWeight',
    'line-height': 'number',
    'letter-spacing': 'dimension',

    // Spacing & Layout
    'dimension': 'dimension',
    'spacing': 'dimension',
    'size': 'dimension',
    'width': 'dimension',
    'height': 'dimension',
    'padding': 'dimension',
    'margin': 'dimension',
    'gap': 'dimension',

    // Effects
    'shadow': 'shadow',
    'blur': 'dimension',
    'opacity': 'number',

    // Animation
    'duration': 'duration',
    'timing': 'cubicBezier',

    // Other
    'border-radius': 'dimension',
    'z-index': 'number',
    'number': 'number'
  };

  return typeMapping[dcpType] || 'string';
}

/**
 * Map DTCG token types to DCP types
 */
function mapDTCGTypeToDCP(dtcgType) {
  const typeMapping = {
    // DTCG -> DCP
    'color': 'color',
    'dimension': 'spacing',
    'fontFamily': 'font-family',
    'fontWeight': 'font-weight',
    'duration': 'duration',
    'cubicBezier': 'timing',
    'shadow': 'shadow',
    'number': 'number',
    'string': 'string'
  };

  return typeMapping[dtcgType] || dtcgType;
}

/**
 * Infer token type from value
 */
function inferTokenType(value) {
  if (typeof value === 'string') {
    // Color patterns
    if (value.match(/^#[0-9a-fA-F]{3,8}$/)) return 'color';
    if (value.match(/^rgb\(|^hsl\(|^rgba\(|^hsla\(/)) return 'color';
    
    // Dimension patterns
    if (value.match(/^\d+(\.\d+)?(px|rem|em|%|vh|vw|pt)$/)) return 'dimension';
    
    // Duration patterns
    if (value.match(/^\d+(\.\d+)?(s|ms)$/)) return 'duration';
    
    // Font family (only if it looks like a font family)
    if (value.includes(',') && value.match(/^[a-zA-Z][a-zA-Z\s,'-]+$/)) return 'fontFamily';
  }
  
  if (typeof value === 'number') return 'number';
  
  return 'string';
}

/**
 * Validate DTCG token structure
 * 
 * @param {Object} tokens - Token structure to validate
 * @returns {Array} Array of validation errors (empty if valid)
 */
export function validateDTCG(tokens) {
  const errors = [];
  
  function validateToken(token, path) {
    if (token.$value === undefined) {
      errors.push(`Missing $value at ${path}`);
    }
    
    if (token.$type && !isValidDTCGType(token.$type)) {
      errors.push(`Invalid $type "${token.$type}" at ${path}`);
    }
  }
  
  function traverse(obj, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('$')) continue; // Skip metadata
      
      const currentPath = path ? `${path}.${key}` : key;
      
      if (value.$value !== undefined) {
        validateToken(value, currentPath);
      } else if (typeof value === 'object' && value !== null) {
        // Check if this might be a token without $value
        if (value.$type !== undefined) {
          validateToken(value, currentPath);
        } else {
          traverse(value, currentPath);
        }
      }
    }
  }
  
  traverse(tokens);
  return errors;
}

/**
 * Check if a type is valid according to DTCG spec
 */
function isValidDTCGType(type) {
  const validTypes = [
    'color', 'dimension', 'fontFamily', 'fontWeight', 'duration',
    'cubicBezier', 'number', 'string', 'boolean', 'shadow',
    'strokeStyle', 'border', 'transition', 'gradient', 'typography'
  ];
  
  return validTypes.includes(type);
}

/**
 * Round-trip test utility
 */
export function testRoundTrip(dcpTokens) {
  console.log('🔄 Testing DTCG round-trip conversion...');
  
  // DCP -> DTCG -> DCP
  const dtcg = exportToDTCG(dcpTokens);
  const backToDcp = importFromDTCG(dtcg);
  
  console.log('Original DCP tokens:', Object.keys(dcpTokens).length);
  console.log('DTCG tokens:', Object.keys(dtcg).length);
  console.log('Round-trip DCP tokens:', Object.keys(backToDcp).length - 1); // -1 for metadata
  
  // Validate DTCG structure
  const errors = validateDTCG(dtcg);
  if (errors.length > 0) {
    console.error('❌ DTCG validation errors:', errors);
    return false;
  }
  
  console.log('✅ Round-trip conversion successful');
  return true;
}

/**
 * Generate DTCG token examples for documentation
 */
export function generateDTCGExamples() {
  return {
    'color.primary': {
      $value: '#0066cc',
      $type: 'color',
      $description: 'Primary brand color'
    },
    'spacing.small': {
      $value: '8px',
      $type: 'dimension',
      $description: 'Small spacing value'
    },
    'font.body': {
      $value: 'Inter, sans-serif',
      $type: 'fontFamily',
      $description: 'Body text font family'
    },
    'animation.fast': {
      $value: '200ms',
      $type: 'duration',
      $description: 'Fast animation duration'
    }
  };
}

// Export default with all utilities
export default {
  exportToDTCG,
  importFromDTCG,
  validateDTCG,
  testRoundTrip,
  generateDTCGExamples
};