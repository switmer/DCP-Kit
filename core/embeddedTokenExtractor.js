/**
 * Embedded Token Extractor - Extract design tokens directly from component source code
 * 
 * Handles projects that don't use ShadCN/UI style configuration but have
 * tokens embedded directly in components as:
 * - Tailwind arbitrary values: bg-[#23281a], text-[12px], p-[24px]
 * - CSS hex colors: #86897D, #CECFD2
 * - Style objects: {color: '#fff', fontSize: '14px'}
 * - CSS classes: text-white, rounded-xl, grid-cols-4
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * Extract embedded design tokens from component source code
 * @param {string} sourceCode - Component source code
 * @param {string} filePath - File path for context
 * @returns {Object} Extracted tokens by category
 */
export function extractEmbeddedTokens(sourceCode, filePath = '') {
  const tokens = {
    colors: {},
    spacing: {},
    typography: {},
    layout: {},
    misc: {}
  };

  try {
    // Parse the source code
    const ast = parse(sourceCode, {
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

    // Extract tokens from AST
    traverse.default(ast, {
      StringLiteral(path) {
        const value = path.node.value;
        
        // Extract from className strings
        if (isClassNameContext(path)) {
          extractFromClassName(value, tokens);
        }
        
        // Extract direct hex colors
        if (isHexColor(value)) {
          tokens.colors[value] = {
            value: value,
            type: 'color',
            source: 'hex-literal',
            filePath
          };
        }
      },
      
      TemplateLiteral(path) {
        // Handle template literals with embedded values
        const templateValue = reconstructTemplateLiteral(path.node);
        if (templateValue) {
          extractFromClassName(templateValue, tokens);
        }
      },
      
      ObjectExpression(path) {
        // Extract from style objects: {color: '#fff', fontSize: '14px'}
        if (isStyleObject(path)) {
          extractFromStyleObject(path.node, tokens, filePath);
        }
      }
    });

  } catch (error) {
    console.warn(`Failed to parse ${filePath} for token extraction:`, error.message);
  }

  return tokens;
}

/**
 * Check if string literal is in a className context
 */
function isClassNameContext(path) {
  const parent = path.parent;
  
  // JSX attribute: className="..."
  if (parent.type === 'JSXAttribute' && parent.name?.name === 'className') {
    return true;
  }
  
  // Object property: {className: "..."}
  if (parent.type === 'ObjectProperty' && 
      (parent.key?.name === 'className' || parent.key?.value === 'className')) {
    return true;
  }
  
  // Function call: cn("...", ...) or clsx("...")
  if (parent.type === 'CallExpression') {
    const callee = parent.callee;
    if (callee.name === 'cn' || callee.name === 'clsx' || callee.name === 'classNames') {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract tokens from className string
 */
function extractFromClassName(className, tokens) {
  const classes = className.split(/\\s+/).filter(Boolean);
  
  for (const cls of classes) {
    // Tailwind arbitrary values: bg-[#23281a], text-[12px], p-[24px]
    const arbitraryMatch = cls.match(/^([a-z-]+)\\[([^\\]]+)\\]$/);
    if (arbitraryMatch) {
      const [, prefix, value] = arbitraryMatch;
      categorizeArbitraryValue(prefix, value, tokens, cls);
      continue;
    }
    
    // Standard Tailwind classes
    categorizeStandardClass(cls, tokens);
  }
}

/**
 * Categorize Tailwind arbitrary values
 */
function categorizeArbitraryValue(prefix, value, tokens, fullClass) {
  // Color prefixes
  if (['bg', 'text', 'border', 'fill', 'stroke', 'ring', 'shadow'].includes(prefix)) {
    if (isHexColor(value) || isCssColor(value)) {
      tokens.colors[fullClass] = {
        value: value,
        type: 'color',
        source: 'tailwind-arbitrary',
        category: prefix
      };
    }
  }
  
  // Spacing prefixes
  else if (['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 
            'w', 'h', 'gap', 'space', 'top', 'right', 'bottom', 'left'].includes(prefix)) {
    if (isSpacingValue(value)) {
      tokens.spacing[fullClass] = {
        value: value,
        type: 'spacing',
        source: 'tailwind-arbitrary',
        category: prefix
      };
    }
  }
  
  // Typography prefixes
  else if (['text', 'font', 'leading', 'tracking', 'indent'].includes(prefix)) {
    if (isTypographyValue(value)) {
      tokens.typography[fullClass] = {
        value: value,
        type: 'typography',
        source: 'tailwind-arbitrary',
        category: prefix
      };
    }
  }
  
  // Layout/misc
  else {
    tokens.misc[fullClass] = {
      value: value,
      type: 'misc',
      source: 'tailwind-arbitrary',
      category: prefix
    };
  }
}

/**
 * Categorize standard Tailwind classes
 */
function categorizeStandardClass(cls, tokens) {
  // Common semantic color classes
  if (['text-white', 'text-black', 'bg-white', 'bg-black', 'border-white', 'border-black'].includes(cls)) {
    tokens.colors[cls] = {
      value: cls.includes('white') ? '#ffffff' : '#000000',
      type: 'color',
      source: 'tailwind-semantic',
      category: cls.split('-')[0]
    };
  }
  
  // Common layout classes
  else if (cls.match(/^(grid|flex|block|inline|hidden|rounded|shadow)/)) {
    tokens.layout[cls] = {
      value: cls,
      type: 'layout',
      source: 'tailwind-utility',
      category: 'layout'
    };
  }
}

/**
 * Extract tokens from style objects
 */
function extractFromStyleObject(node, tokens, filePath) {
  for (const prop of node.properties) {
    if (prop.type === 'ObjectProperty' && prop.key && prop.value) {
      const key = prop.key.name || prop.key.value;
      let value = prop.value.value;
      
      if (typeof value === 'string') {
        // Color properties
        if (['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'].includes(key)) {
          if (isHexColor(value) || isCssColor(value)) {
            tokens.colors[`${key}:${value}`] = {
              value: value,
              type: 'color',
              source: 'style-object',
              property: key,
              filePath
            };
          }
        }
        
        // Typography properties
        else if (['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'fontFamily'].includes(key)) {
          tokens.typography[`${key}:${value}`] = {
            value: value,
            type: 'typography',
            source: 'style-object',
            property: key,
            filePath
          };
        }
        
        // Spacing properties
        else if (['padding', 'margin', 'width', 'height', 'gap', 'top', 'right', 'bottom', 'left'].includes(key)) {
          if (isSpacingValue(value)) {
            tokens.spacing[`${key}:${value}`] = {
              value: value,
              type: 'spacing',
              source: 'style-object',
              property: key,
              filePath
            };
          }
        }
      }
    }
  }
}

/**
 * Check if path is a style object context
 */
function isStyleObject(path) {
  const parent = path.parent;
  
  // JSX style attribute: style={{...}}
  if (parent.type === 'JSXAttribute' && parent.name?.name === 'style') {
    return true;
  }
  
  // Object property named 'style'
  if (parent.type === 'ObjectProperty' && 
      (parent.key?.name === 'style' || parent.key?.value === 'style')) {
    return true;
  }
  
  return false;
}

/**
 * Helper functions for value validation
 */
function isHexColor(value) {
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(value);
}

function isCssColor(value) {
  const cssColors = ['red', 'blue', 'green', 'white', 'black', 'transparent', 'currentColor'];
  return cssColors.includes(value.toLowerCase()) || 
         value.startsWith('rgb') || 
         value.startsWith('hsl') || 
         value.startsWith('var(');
}

function isSpacingValue(value) {
  return /^\\d+(\\.\\d+)?(px|rem|em|%|vh|vw|ch|ex)$/.test(value) || /^\\d+$/.test(value);
}

function isTypographyValue(value) {
  return /^\\d+(\\.\\d+)?(px|rem|em|pt)$/.test(value) || 
         /^\\d+$/.test(value) ||
         ['normal', 'bold', 'bolder', 'lighter'].includes(value);
}

/**
 * Reconstruct template literal for analysis
 */
function reconstructTemplateLiteral(node) {
  try {
    let result = '';
    
    for (let i = 0; i < node.quasis.length; i++) {
      result += node.quasis[i].value.raw;
      
      if (i < node.expressions.length) {
        // For now, just add a placeholder for expressions
        result += '${...}';
      }
    }
    
    return result;
  } catch {
    return null;
  }
}

/**
 * Convert extracted tokens to DCP format
 */
export function formatTokensForDCP(extractedTokens, componentName, filePath) {
  const dcpTokens = {};
  
  for (const [category, tokens] of Object.entries(extractedTokens)) {
    if (Object.keys(tokens).length === 0) continue;
    
    dcpTokens[category] = {};
    
    for (const [tokenKey, tokenData] of Object.entries(tokens)) {
      // Create semantic token name
      const semanticName = createSemanticTokenName(tokenKey, tokenData, componentName);
      
      dcpTokens[category][semanticName] = {
        value: tokenData.value,
        type: tokenData.type,
        description: `Extracted from ${componentName} (${tokenData.source})`,
        source: {
          file: filePath,
          component: componentName,
          extractor: tokenData.source,
          original: tokenKey
        }
      };
    }
  }
  
  return dcpTokens;
}

/**
 * Create semantic token names from extracted values
 */
function createSemanticTokenName(tokenKey, tokenData, componentName) {
  const prefix = componentName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // For hex colors, create semantic names
  if (tokenData.type === 'color' && isHexColor(tokenData.value)) {
    const category = tokenData.category || 'color';
    return `${prefix}-${category}-${tokenData.value.replace('#', '')}`;
  }
  
  // For arbitrary values, use the class name
  if (tokenData.source === 'tailwind-arbitrary') {
    return `${prefix}-${tokenKey.replace(/[^a-z0-9]/g, '-')}`;
  }
  
  // For style objects, use property:value format
  if (tokenData.source === 'style-object') {
    return `${prefix}-${tokenKey.replace(/[^a-z0-9]/g, '-')}`;
  }
  
  // Default to original key
  return `${prefix}-${tokenKey.replace(/[^a-z0-9]/g, '-')}`;
}