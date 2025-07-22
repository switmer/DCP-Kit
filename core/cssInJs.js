import { extractProperties } from './parser.js';

// Detect CSS-in-JS library usage
export function detectCSSInJSLibrary(source) {
  const patterns = {
    'styled-components': /styled\.[a-zA-Z]+`|styled\([^)]+\)`/,
    'emotion': /css`|css\({|styled\([^)]+\)`/,
    'stitches': /styled\({|createStitches|css\({/,
    'vanilla-extract': /style\({|createTheme|createVar/,
    'linaria': /styled\.[a-zA-Z]+`|css`/
  };

  const detected = [];
  for (const [library, pattern] of Object.entries(patterns)) {
    if (pattern.test(source)) {
      detected.push(library);
    }
  }

  return detected;
}

// Extract styled-components styles
export function extractStyledComponents(source) {
  const styles = {};
  const componentRegex = /const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*styled(?:\.[a-z]+|\([^)]+\))`([^`]+)`/g;
  let match;

  while ((match = componentRegex.exec(source))) {
    const [_, componentName, css] = match;
    styles[componentName] = {
      type: 'styled-component',
      properties: extractProperties(css)
    };
  }

  return styles;
}

// Extract Emotion styles
export function extractEmotion(source) {
  const styles = {};
  
  // Extract css prop usage
  const cssPropRegex = /css={([^}]+)}/g;
  let match;
  
  while ((match = cssPropRegex.exec(source))) {
    const [_, cssObject] = match;
    try {
      // Basic evaluation of the CSS object
      const evaluated = eval(`(${cssObject})`);
      styles[`inline-${Object.keys(styles).length}`] = {
        type: 'emotion-css-prop',
        properties: evaluated
      };
    } catch (e) {
      // Skip if we can't evaluate the object
      continue;
    }
  }

  // Extract css template literal usage
  const cssTemplateRegex = /css`([^`]+)`/g;
  while ((match = cssTemplateRegex.exec(source))) {
    const [_, css] = match;
    styles[`template-${Object.keys(styles).length}`] = {
      type: 'emotion-css-template',
      properties: extractProperties(css)
    };
  }

  return styles;
}

// Extract Stitches styles
export function extractStitches(source) {
  const styles = {};
  
  // Extract styled components
  const styledRegex = /const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*styled\([^)]+\)\({([^}]+)}\)/g;
  let match;

  while ((match = styledRegex.exec(source))) {
    const [_, componentName, cssObject] = match;
    try {
      const evaluated = eval(`(${cssObject})`);
      styles[componentName] = {
        type: 'stitches-component',
        properties: evaluated
      };
    } catch (e) {
      continue;
    }
  }

  // Extract variants
  const variantsRegex = /variants:\s*{([^}]+)}/g;
  while ((match = variantsRegex.exec(source))) {
    const [_, variants] = match;
    try {
      const evaluated = eval(`({${variants}})`);
      styles[`variants-${Object.keys(styles).length}`] = {
        type: 'stitches-variants',
        variants: evaluated
      };
    } catch (e) {
      continue;
    }
  }

  return styles;
}

// Extract vanilla-extract styles
export function extractVanillaExtract(source) {
  const styles = {};
  
  // Extract style definitions
  const styleRegex = /export\s+const\s+([a-zA-Z0-9]+)\s*=\s*style\({([^}]+)}\)/g;
  let match;

  while ((match = styleRegex.exec(source))) {
    const [_, name, cssObject] = match;
    try {
      const evaluated = eval(`(${cssObject})`);
      styles[name] = {
        type: 'vanilla-extract-style',
        properties: evaluated
      };
    } catch (e) {
      continue;
    }
  }

  // Extract theme contracts
  const themeRegex = /createTheme\({([^}]+)}\)/g;
  while ((match = themeRegex.exec(source))) {
    const [_, themeObject] = match;
    try {
      const evaluated = eval(`({${themeObject}})`);
      styles[`theme-${Object.keys(styles).length}`] = {
        type: 'vanilla-extract-theme',
        theme: evaluated
      };
    } catch (e) {
      continue;
    }
  }

  return styles;
}

// Extract Linaria styles
export function extractLinaria(source) {
  const styles = {};
  
  // Extract styled components
  const styledRegex = /const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*styled(?:\.[a-z]+|\([^)]+\))`([^`]+)`/g;
  let match;

  while ((match = styledRegex.exec(source))) {
    const [_, componentName, css] = match;
    styles[componentName] = {
      type: 'linaria-styled',
      properties: extractProperties(css)
    };
  }

  // Extract css tag usage
  const cssRegex = /css`([^`]+)`/g;
  while ((match = cssRegex.exec(source))) {
    const [_, css] = match;
    styles[`css-${Object.keys(styles).length}`] = {
      type: 'linaria-css',
      properties: extractProperties(css)
    };
  }

  return styles;
}

// Main function to extract all CSS-in-JS styles
export function extractCSSInJSStyles(source) {
  const libraries = detectCSSInJSLibrary(source);
  const styles = {};

  if (libraries.includes('styled-components')) {
    styles['styled-components'] = extractStyledComponents(source);
  }

  if (libraries.includes('emotion')) {
    styles['emotion'] = extractEmotion(source);
  }

  if (libraries.includes('stitches')) {
    styles['stitches'] = extractStitches(source);
  }

  if (libraries.includes('vanilla-extract')) {
    styles['vanilla-extract'] = extractVanillaExtract(source);
  }

  if (libraries.includes('linaria')) {
    styles['linaria'] = extractLinaria(source);
  }

  return {
    libraries,
    styles
  };
} 