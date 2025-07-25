import postcss from 'postcss';
import safeParser from 'postcss-safe-parser';
import valueParser from 'postcss-value-parser';
import fs from 'fs';

// Type inference for token values
function inferTypeFromValue(value) {
  const parsed = valueParser(value);
  
  // Check for colors
  if (value.startsWith('#') || 
      value.startsWith('rgb') || 
      value.startsWith('hsl') ||
      parsed.nodes.some(n => n.type === 'function' && ['rgb', 'rgba', 'hsl', 'hsla'].includes(n.value))) {
    return 'color';
  }
  
  // Check for spacing/sizing
  if (parsed.nodes.some(n => n.type === 'word' && ['px', 'rem', 'em', 'vh', 'vw', '%'].includes(n.unit))) {
    return 'spacing';
  }
  
  // Check for time
  if (parsed.nodes.some(n => n.type === 'word' && ['ms', 's'].includes(n.unit))) {
    return 'duration';
  }
  
  // Check for font weights
  if (/^[1-9]00$/.test(value) || ['normal', 'bold', 'lighter', 'bolder'].includes(value)) {
    return 'fontWeight';
  }
  
  // Check for font families
  if (value.includes(',') || value.startsWith('"') || value.startsWith("'")) {
    return 'fontFamily';
  }
  
  return 'string';
}

// Extract CSS variables and categorize them
export async function extractCssVariablesToTokens(css) {
  const root = postcss.parse(css, { parser: safeParser });
  const tokens = {};
  
  root.walkDecls(decl => {
    if (decl.prop.startsWith('--')) {
      const [_, category, ...nameParts] = decl.prop.split(/--|-/);
      const name = nameParts.join('-');
      
      if (!category || !name) return;
      
      if (!tokens[category]) tokens[category] = {};
      tokens[category][name] = {
        value: decl.value.trim(),
        type: inferTypeFromValue(decl.value.trim()),
        source: decl.source?.input?.file || 'unknown'
      };
    }
  });
  
  return tokens;
}

// Extract @media queries and their contents
export async function extractMediaQueries(css) {
  const root = postcss.parse(css, { parser: safeParser });
  const mediaQueries = {};
  
  root.walkAtRules('media', rule => {
    const query = rule.params;
    const properties = {};
    
    rule.walkDecls(decl => {
      properties[decl.prop] = {
        value: decl.value,
        type: inferTypeFromValue(decl.value)
      };
    });
    
    mediaQueries[query] = {
      properties,
      selectors: rule.nodes
        .filter(node => node.type === 'rule')
        .map(node => node.selector)
    };
  });
  
  return mediaQueries;
}

// Extract keyframe animations
export async function extractAnimations(css) {
  const root = postcss.parse(css, { parser: safeParser });
  const animations = {};
  
  root.walkAtRules('keyframes', rule => {
    const name = rule.params;
    const steps = {};
    
    rule.walkRules(keyframe => {
      const properties = {};
      keyframe.walkDecls(decl => {
        properties[decl.prop] = decl.value;
      });
      steps[keyframe.selector] = properties;
    });
    
    animations[name] = {
      type: 'keyframes',
      steps
    };
  });
  
  // Also extract transition properties
  root.walkDecls(/^transition/, decl => {
    const values = valueParser(decl.value).nodes
      .filter(node => node.type === 'word')
      .map(node => node.value);
    
    if (values.length >= 2) {
      animations[`transition-${values[0]}`] = {
        type: 'transition',
        property: values[0],
        duration: values[1],
        timing: values[2] || 'ease',
        delay: values[3] || '0s'
      };
    }
  });
  
  return animations;
}

// Convert nested token structure to flat Tokens Studio format
export function flattenTokens(tokens, prefix = '') {
  const flat = {};
  
  for (const [category, values] of Object.entries(tokens)) {
    for (const [name, details] of Object.entries(values)) {
      const key = prefix ? `${prefix}.${category}.${name}` : `${category}.${name}`;
      flat[key] = {
        value: details.value,
        type: details.type,
        ...(details.source && { source: details.source })
      };
    }
  }
  
  return flat;
}

// Main function to parse CSS file and extract all token information
export async function parseCSSFile(filePath) {
  if (!fs.existsSync(filePath)) {
    if (global.verbose) {
      console.log(`⚠️ CSS file not found: ${filePath}`);
    }
    return null;
  }

  const css = fs.readFileSync(filePath, 'utf8');
  
  const [tokens, mediaQueries, animations] = await Promise.all([
    extractCssVariablesToTokens(css),
    extractMediaQueries(css),
    extractAnimations(css)
  ]);

  return {
    tokens,
    mediaQueries,
    animations,
    tokensFlat: flattenTokens(tokens),
    source: filePath
  };
}

// CLI helper function
export async function convertCSSToTokens(inputPath, outputPath) {
  const result = await parseCSSFile(inputPath);
  if (!result) return false;
  
  const output = {
    $schema: "https://tokens.studio/schema.json",
    ...result.tokensFlat
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  return true;
} 