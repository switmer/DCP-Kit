#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runRadixTokens(source = './node_modules/@radix-ui/themes', options = {}) {
  const {
    out = './dcp-tokens',
    verbose = false,
    json = false
  } = options;

  const log = verbose ? console.error : () => {};
  
  try {
    log(chalk.blue('🎨 DCP Radix Token Pipeline'));
    log(chalk.gray(`Source: ${source}`));
    log(chalk.gray(`Output: ${out}`));

    // Parse Radix token files
    const tokens = await parseRadixTokens(source);
    
    // Generate multi-framework outputs
    const outputs = await generateOutputs(tokens, out);
    
    const result = {
      success: true,
      tokens: Object.keys(tokens).length,
      outputs: Object.keys(outputs),
      files: []
    };

    // Write outputs
    for (const [format, content] of Object.entries(outputs)) {
      const filePath = path.join(out, `${format}.json`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(content, null, 2));
      result.files.push(filePath);
      log(chalk.green(`✓ Generated ${format}: ${filePath}`));
    }

    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green('\n🎉 Radix Token Pipeline Complete!'));
      console.log(chalk.gray(`Generated ${result.tokens} tokens across ${result.outputs.length} formats`));
      console.log(chalk.gray(`Files: ${result.files.join(', ')}`));
    }

    return result;

  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message
    };

    if (json) {
      console.log(JSON.stringify(errorResult, null, 2));
    } else {
      console.error(chalk.red(`❌ Error: ${error.message}`));
    }

    return errorResult;
  }
}

async function parseRadixTokens(sourcePath) {
  const tokens = {
    colors: {},
    spacing: {},
    radius: {},
    typography: {},
    shadows: {},
    breakpoints: {}
  };

  try {
    // Parse Radix color tokens
    const colorsPath = path.join(sourcePath, 'tokens', 'colors.json');
    const colorsData = JSON.parse(await fs.readFile(colorsPath, 'utf8'));
    
    // Extract semantic color tokens
    for (const [scale, colors] of Object.entries(colorsData)) {
      for (const [name, value] of Object.entries(colors)) {
        tokens.colors[`${scale}-${name}`] = {
          value,
          type: 'color',
          category: scale,
          description: `${scale} color scale - ${name}`
        };
      }
    }

    // Parse spacing tokens
    const spacingPath = path.join(sourcePath, 'tokens', 'space.json');
    const spacingData = JSON.parse(await fs.readFile(spacingPath, 'utf8'));
    
    for (const [name, value] of Object.entries(spacingData)) {
      tokens.spacing[name] = {
        value: `${value}px`,
        type: 'spacing',
        category: 'space',
        description: `Spacing token - ${name}`
      };
    }

    // Parse radius tokens
    const radiusPath = path.join(sourcePath, 'tokens', 'radius.json');
    const radiusData = JSON.parse(await fs.readFile(radiusPath, 'utf8'));
    
    for (const [name, value] of Object.entries(radiusData)) {
      tokens.radius[name] = {
        value: `${value}px`,
        type: 'radius',
        category: 'radius',
        description: `Border radius - ${name}`
      };
    }

    // Parse typography tokens
    const typographyPath = path.join(sourcePath, 'tokens', 'typography.json');
    const typographyData = JSON.parse(await fs.readFile(typographyPath, 'utf8'));
    
    for (const [name, styles] of Object.entries(typographyData)) {
      tokens.typography[name] = {
        value: styles,
        type: 'typography',
        category: 'typography',
        description: `Typography style - ${name}`
      };
    }

  } catch (error) {
    throw new Error(`Failed to parse Radix tokens: ${error.message}`);
  }

  return tokens;
}

async function generateOutputs(tokens, outDir) {
  const outputs = {};

  // 1. DCP Token Registry (canonical format)
  outputs['dcp-registry'] = {
    version: '1.0.0',
    name: 'radix-tokens',
    description: 'Radix design tokens extracted via DCP',
    tokens: tokens,
    metadata: {
      source: 'radix-ui/themes',
      extracted: new Date().toISOString(),
      formats: ['tailwind', 'mui', 'css-variables', 'design-tokens']
    }
  };

  // 2. Tailwind Preset
  outputs['tailwind-preset'] = {
    theme: {
      extend: {
        colors: generateTailwindColors(tokens.colors),
        spacing: generateTailwindSpacing(tokens.spacing),
        borderRadius: generateTailwindRadius(tokens.radius),
        fontFamily: generateTailwindTypography(tokens.typography)
      }
    }
  };

  // 3. MUI Theme Adapter
  outputs['mui-theme'] = {
    palette: generateMuiPalette(tokens.colors),
    spacing: generateMuiSpacing(tokens.spacing),
    shape: generateMuiShape(tokens.radius),
    typography: generateMuiTypography(tokens.typography)
  };

  // 4. CSS Variables
  outputs['css-variables'] = generateCssVariables(tokens);

  // 5. Design Tokens (W3C format)
  outputs['design-tokens'] = generateDesignTokens(tokens);

  return outputs;
}

function generateTailwindColors(colors) {
  const tailwindColors = {};
  
  for (const [name, token] of Object.entries(colors)) {
    tailwindColors[name] = token.value;
  }
  
  return tailwindColors;
}

function generateTailwindSpacing(spacing) {
  const tailwindSpacing = {};
  
  for (const [name, token] of Object.entries(spacing)) {
    tailwindSpacing[name] = token.value;
  }
  
  return tailwindSpacing;
}

function generateTailwindRadius(radius) {
  const tailwindRadius = {};
  
  for (const [name, token] of Object.entries(radius)) {
    tailwindRadius[name] = token.value;
  }
  
  return tailwindRadius;
}

function generateTailwindTypography(typography) {
  const tailwindTypography = {};
  
  for (const [name, token] of Object.entries(typography)) {
    if (token.value.fontFamily) {
      tailwindTypography[name] = token.value.fontFamily;
    }
  }
  
  return tailwindTypography;
}

function generateMuiPalette(colors) {
  const palette = {
    primary: {},
    secondary: {},
    grey: {},
    error: {},
    warning: {},
    info: {},
    success: {}
  };

  // Map Radix colors to MUI palette structure
  for (const [name, token] of Object.entries(colors)) {
    if (name.startsWith('slate-')) {
      palette.grey[name.replace('slate-', '')] = token.value;
    } else if (name.startsWith('blue-')) {
      palette.primary[name.replace('blue-', '')] = token.value;
    } else if (name.startsWith('green-')) {
      palette.success[name.replace('green-', '')] = token.value;
    } else if (name.startsWith('red-')) {
      palette.error[name.replace('red-', '')] = token.value;
    }
  }

  return palette;
}

function generateMuiSpacing(spacing) {
  const muiSpacing = {};
  
  for (const [name, token] of Object.entries(spacing)) {
    const value = parseInt(token.value);
    muiSpacing[name] = value;
  }
  
  return muiSpacing;
}

function generateMuiShape(radius) {
  const shape = {};
  
  for (const [name, token] of Object.entries(radius)) {
    const value = parseInt(token.value);
    shape[name] = value;
  }
  
  return shape;
}

function generateMuiTypography(typography) {
  const muiTypography = {};
  
  for (const [name, token] of Object.entries(typography)) {
    muiTypography[name] = {
      fontFamily: token.value.fontFamily,
      fontSize: token.value.fontSize,
      fontWeight: token.value.fontWeight,
      lineHeight: token.value.lineHeight
    };
  }
  
  return muiTypography;
}

function generateCssVariables(tokens) {
  const cssVars = {};
  
  for (const [category, categoryTokens] of Object.entries(tokens)) {
    for (const [name, token] of Object.entries(categoryTokens)) {
      const varName = `--${category}-${name}`;
      cssVars[varName] = token.value;
    }
  }
  
  return cssVars;
}

function generateDesignTokens(tokens) {
  const designTokens = {
    $metadata: {
      tokenSetOrder: ['radix']
    },
    radix: {}
  };
  
  for (const [category, categoryTokens] of Object.entries(tokens)) {
    for (const [name, token] of Object.entries(categoryTokens)) {
      designTokens.radix[`${category}.${name}`] = {
        value: token.value,
        type: token.type,
        description: token.description
      };
    }
  }
  
  return designTokens;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const source = process.argv[2] || './node_modules/@radix-ui/themes';
  const out = process.argv[3] || './dcp-tokens';
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const json = process.argv.includes('--json') || process.argv.includes('-j');
  
  runRadixTokens(source, { out, verbose, json }).catch((error) => {
    console.error('Failed to run Radix token pipeline:', error);
    process.exit(1);
  });
} 