import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

/**
 * Detect design-token references inside CSS/JS/TSX text
 * @param {string} fileText - Raw file content to analyze
 * @returns {Promise<Object>} Extracted token usage
 */
export async function extractTokensUsed(fileText) {
  const tokens = {
    colors: new Set(),
    spacing: new Set(),
    typography: new Set(),
    other: new Set()
  };

  try {
    // Extract CSS-in-JS template literals
    const cssMatches = fileText.match(/css`([^`]*)`/g) || [];
    for (const css of cssMatches) {
      await extractFromCSS(css.slice(4, -1), tokens);
    }

    // Extract inline styles
    const styleMatches = fileText.match(/style=\{([^}]*)\}/g) || [];
    for (const style of styleMatches) {
      const obj = style.slice(7, -1);
      extractFromObject(obj, tokens);
    }

    // Extract className references
    const classMatches = fileText.match(/className="([^"]*)"/g) || [];
    for (const className of classMatches) {
      extractFromClassName(className.slice(11, -1), tokens);
    }

    // Convert Sets to Arrays for JSON
    return {
      colors: Array.from(tokens.colors),
      spacing: Array.from(tokens.spacing),
      typography: Array.from(tokens.typography),
      other: Array.from(tokens.other)
    };
  } catch (err) {
    throw new Error(`Failed to extract tokens: ${err.message}`);
  }
}

async function extractFromCSS(css, tokens) {
  const root = postcss.parse(css);
  
  root.walkDecls(decl => {
    const value = valueParser(decl.value);
    
    value.walk(node => {
      if (node.type === 'word' && node.value.includes('var(--')) {
        categorizeToken(node.value.slice(6, -1), tokens);
      }
    });
  });
}

function extractFromObject(obj, tokens) {
  const vars = obj.match(/var\(--[^)]+\)/g) || [];
  vars.forEach(v => categorizeToken(v.slice(6, -1), tokens));
}

function extractFromClassName(classes, tokens) {
  classes.split(' ').forEach(cls => {
    if (cls.startsWith('token-')) {
      categorizeToken(cls.slice(6), tokens);
    }
  });
}

function categorizeToken(token, tokens) {
  if (token.includes('color')) {
    tokens.colors.add(token);
  } else if (token.includes('space') || token.includes('size')) {
    tokens.spacing.add(token);
  } else if (token.includes('font') || token.includes('text')) {
    tokens.typography.add(token);
  } else {
    tokens.other.add(token);
  }
} 