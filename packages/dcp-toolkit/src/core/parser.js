import fs from 'fs';
import path from 'path';
import { withCustomConfig } from 'react-docgen-typescript';
import { extractCSSInJSStyles } from './cssInJs.js';
import { parseCSSFile } from './cssParser.js';
import { ThemeHandler } from './themeHandler.js';

// Cache for parser instances and logging state
const parserCache = new Map();
const seenTsConfigs = new Set();

// Initialize theme handler
const themeHandler = new ThemeHandler();

function extractCSSVariables(css) {
  const variables = {};
  const varRegex = /--([^:]+):\s*([^;]+);/g;
  let match;

  while ((match = varRegex.exec(css))) {
    const [_, name, value] = match;
    variables[name.trim()] = value.trim();
  }

  return variables;
}

function extractCSSAnimations(css) {
  const animations = {};
  
  // Extract keyframes
  const keyframesRegex = /@keyframes\s+([\w-]+)\s*{([^}]+)}/g;
  let match;
  
  while ((match = keyframesRegex.exec(css))) {
    const [_, name, content] = match;
    const steps = {};
    
    // Parse keyframe steps
    const stepRegex = /([\d%\w]+)\s*{([^}]+)}/g;
    let stepMatch;
    while ((stepMatch = stepRegex.exec(content))) {
      const [__, step, properties] = stepMatch;
      steps[step] = extractProperties(properties);
    }
    
    animations[name] = { type: 'keyframes', steps };
  }

  // Extract transitions
  const transitionRegex = /transition(?:-[\w-]+)?:\s*([^;]+);/g;
  while ((match = transitionRegex.exec(css))) {
    const [_, value] = match;
    const [property, duration, timing, delay] = value.split(/\s+/);
    animations[`transition-${property}`] = {
      type: 'transition',
      property,
      duration,
      timing,
      delay
    };
  }

  return animations;
}

function extractProperties(cssBlock) {
  const properties = {};
  const propertyRegex = /([\w-]+)\s*:\s*([^;]+);/g;
  let match;

  while ((match = propertyRegex.exec(cssBlock))) {
    const [_, prop, value] = match;
    properties[prop.trim()] = value.trim();
  }

  return properties;
}

// Add variant style mapping extraction
function extractVariantStyleMappings(src, projectRoot) {
  const variantMappings = {};
  
  // Extract object literals that define variant classes
  const variantObjectRegex = /const\s+(\w*[Cc]lasses?|\w*[Vv]ariants?)\s*=\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = variantObjectRegex.exec(src)) !== null) {
    const [, varName, content] = match;
    const variants = {};
    
    // Parse object properties (variant: "classes")
    const propRegex = /(\w+):\s*["`']([^"`']+)["`']/g;
    let propMatch;
    
    while ((propMatch = propRegex.exec(content)) !== null) {
      const [, variant, classes] = propMatch;
      variants[variant] = classes.trim();
    }
    
    if (Object.keys(variants).length > 0) {
      // Get theme context for these classes
      const allClasses = Object.values(variants).join(' ').split(' ').filter(Boolean);
      const themeContext = themeHandler.getComponentThemeContext(projectRoot, allClasses);
      
      variantMappings[varName] = {
        variants,
        themeContext: {
          utilityMappings: themeContext.utilityMappings,
          computedStyles: themeContext.computedStyles,
          themeConfig: themeContext.themeConfig
        }
      };
    }
  }
  
  return variantMappings;
}

function extractMediaQueries(css) {
  const mediaQueries = {};
  const mediaRegex = /@media\s+([^{]+)\s*{([^}]+)}/g;
  let match;

  while ((match = mediaRegex.exec(css))) {
    const [_, query, content] = match;
    const normalizedQuery = query.trim().toLowerCase();
    
    // Categorize the media query
    const category = 
      normalizedQuery.includes('max-width') ? 'maxWidth' :
      normalizedQuery.includes('min-width') ? 'minWidth' :
      normalizedQuery.includes('prefers-color-scheme') ? 'colorScheme' :
      normalizedQuery.includes('prefers-reduced-motion') ? 'reducedMotion' :
      'other';

    mediaQueries[normalizedQuery] = {
      category,
      properties: extractProperties(content)
    };
  }

  return mediaQueries;
}

function extractPseudoClasses(css) {
  const pseudoClasses = {};
  const pseudoRegex = /([^{}\s]+):([^{}\s]+)\s*{([^}]+)}/g;
  let match;

  const categorizeState = (pseudo) => {
    if (['hover', 'focus', 'active', 'visited'].includes(pseudo)) return 'interaction';
    if (['first-child', 'last-child', 'nth-child'].some(p => pseudo.includes(p))) return 'position';
    if (['disabled', 'enabled', 'checked', 'invalid', 'valid'].includes(pseudo)) return 'state';
    if (['before', 'after'].includes(pseudo)) return 'pseudo-element';
    return 'other';
  };

  while ((match = pseudoRegex.exec(css))) {
    const [_, selector, pseudo, content] = match;
    const cleanPseudo = pseudo.trim();
    const category = categorizeState(cleanPseudo);
    
    pseudoClasses[`${selector}:${cleanPseudo}`] = {
      category,
      pseudo: cleanPseudo,
      properties: extractProperties(content)
    };
  }

  return pseudoClasses;
}

async function extractCSSModules(filePath) {
  const cssPath = filePath.replace(/\.tsx?$/, '.css');
  if (!fs.existsSync(cssPath)) {
    return { 
      classes: {}, 
      variables: {}, 
      tokens: {},
      animations: {},
      mediaQueries: {},
      pseudoClasses: {},
      imports: []
    };
  }

  // Use the new PostCSS parser
  const cssInfo = await parseCSSFile(cssPath);
  
  // Map the results to our existing format
  return {
    classes: cssInfo.tokens.classes || {},
    variables: cssInfo.tokens.variables || {},
    tokens: cssInfo.tokens,
    animations: cssInfo.animations || {},
    mediaQueries: cssInfo.mediaQueries || {},
    pseudoClasses: {},  // We'll handle this separately
    imports: []  // We'll extract this from PostCSS AST
  };
}

export function extractTailwindTokens(source, cssModules = {}) {
  const tokens = {};
  const rgx = /class(Name)?=["'`](.*?)["'`]/g;
  let match;
  
  const tokenMappings = {
    'bg-': { category: 'background', prefix: 'color.surface' },
    'text-': { category: 'text', prefix: 'color.text' },
    'px-': { category: 'paddingX', prefix: 'spacing' },
    'py-': { category: 'paddingY', prefix: 'spacing' },
    'p-': { category: 'padding', prefix: 'spacing' },
    'mx-': { category: 'marginX', prefix: 'spacing' },
    'my-': { category: 'marginY', prefix: 'spacing' },
    'm-': { category: 'margin', prefix: 'spacing' },
    'rounded': { category: 'borderRadius', prefix: 'radius' },
    'border-': { category: 'border', prefix: 'border' },
    'shadow-': { category: 'shadow', prefix: 'elevation' },
    'font-': { category: 'fontWeight', prefix: 'typography.weight' },
    'text-': { category: 'fontSize', prefix: 'typography.size' }
  };

  while ((match = rgx.exec(source))) {
    const classes = match[2].split(/\s+/);
    
    for (const cls of classes) {
      // Handle CSS module classes
      if (cssModules[cls]) {
        tokens.cssModules = tokens.cssModules || {};
        tokens.cssModules[cls] = true;
        continue;
      }
      
      // Handle state variants
      const [variant, ...rest] = cls.split(':');
      const className = rest.length ? rest.join(':') : variant;
      const clean = className.replace(/^[^:]+:/, '');

      // Process each token mapping
      Object.entries(tokenMappings).forEach(([prefix, { category, prefix: tokenPrefix }]) => {
        if (clean.startsWith(prefix)) {
          const value = clean.slice(prefix.length);
          const tokenPath = value === '' ? 'default' : value.replace(/-/g, '.');
          
          // Handle variants
          if (rest.length) {
            if (!tokens[`${category}:${variant}`]) {
              tokens[`${category}:${variant}`] = {};
            }
            tokens[`${category}:${variant}`][tokenPath] = `${tokenPrefix}.${tokenPath}`;
          } else {
            if (!tokens[category]) {
              tokens[category] = {};
            }
            tokens[category][tokenPath] = `${tokenPrefix}.${tokenPath}`;
          }
        }
      });
    }
  }
  return tokens;
}

// Try to find a tsconfig.json in the component's directory or its parent directories
function findTsConfig(filePath) {
  let dir = path.dirname(filePath);
  
  while (dir !== path.dirname(dir)) {
    const tsconfigPath = path.join(dir, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      return tsconfigPath;
    }
    dir = path.dirname(dir);
  }
  
  return path.join(process.cwd(), 'tsconfig.json');
}

function findProjectRoot(filePath) {
  let dir = path.dirname(filePath);
  
  while (dir !== path.dirname(dir)) {
    // Look for package.json, components.json, or other root indicators
    const indicators = ['package.json', 'components.json', 'next.config.js', 'vite.config.js'];
    
    for (const indicator of indicators) {
      if (fs.existsSync(path.join(dir, indicator))) {
        return dir;
      }
    }
    
    dir = path.dirname(dir);
  }
  
  return process.cwd();
}

function resolveImportPath(importPath, currentDir, tsconfig) {
  // Handle node_modules imports
  if (!importPath.startsWith('.')) {
    // Handle path aliases from tsconfig
    if (tsconfig?.compilerOptions?.paths) {
      for (const [alias, [aliasPath]] of Object.entries(tsconfig.compilerOptions.paths)) {
        if (importPath.startsWith(alias)) {
          const resolvedPath = importPath.replace(alias, aliasPath);
          const baseUrl = tsconfig.compilerOptions.baseUrl || '.';
          const fullPath = path.join(path.dirname(tsconfig.configFile), baseUrl, resolvedPath);
          return fullPath;
        }
      }
    }
    return importPath;
  }
  return path.resolve(currentDir, importPath);
}

// Get or create parser instance for a given tsconfig
function getParser(tsconfigPath) {
  if (parserCache.has(tsconfigPath)) {
    return parserCache.get(tsconfigPath);
  }

  const parser = withCustomConfig(tsconfigPath, {
    savePropValueAsString: true,
    shouldExtractLiteralValuesFromEnum: true,
    propFilter: (prop) => {
      // Include props from node_modules that we want to document
      const allowedModules = ['react-aria-components'];
      if (prop.parent) {
        const fileName = prop.parent.fileName;
        return !fileName.includes('node_modules') || 
               allowedModules.some(mod => fileName.includes(mod));
      }
      return true;
    },
    componentNameResolver: (exp, source) => {
      // Try to get the component name from the export declaration
      if (exp.getName) {
        const name = exp.getName();
        if (name) return name;
      }
      // Fallback to the file name
      return path.basename(source.fileName, '.tsx');
    }
  });

  parserCache.set(tsconfigPath, parser);
  return parser;
}

// Make parseTSX async
export async function parseTSX(filePath) {
  const tsconfigPath = findTsConfig(filePath);
  const tsconfig = fs.existsSync(tsconfigPath) ? JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8')) : null;
  tsconfig.configFile = tsconfigPath;

  const parser = getParser(tsconfigPath);
  
  try {
    const components = parser.parse(filePath);
    if (!components || components.length === 0) {
      if (global.verbose) {
        console.log(`⚠️ No components found in ${filePath}`);
      }
      return null;
    }
    
    const meta = components[0];
    const src = fs.readFileSync(filePath, 'utf-8');
    const projectRoot = findProjectRoot(filePath);
    
    // Extract CSS information
    const { 
      classes: cssModules, 
      variables: cssVars, 
      tokens: cssTokens,
      animations,
      mediaQueries,
      pseudoClasses,
      imports
    } = await extractCSSModules(filePath);
    
    // Extract Tailwind tokens
    const tailwindTokens = extractTailwindTokens(src, cssModules);
    
    // Extract CSS-in-JS styles
    const cssInJs = extractCSSInJSStyles(src);
    
    // Extract variant style mappings with theme context
    const variantStyleMappings = extractVariantStyleMappings(src, projectRoot);
    
    // Merge tokens from all sources
    const tokensUsed = {
      ...tailwindTokens,
      ...cssTokens,
      cssVariables: cssVars,
      cssModules: cssModules
    };

    // Process props, including inherited ones
    const props = {};
    Object.entries(meta.props || {}).forEach(([key, p]) => {
      // Skip internal React props we don't want to document
      if (['key', 'ref'].includes(key)) return;
      
      let type = p.type.name;
      
      // Handle union types
      if (type === 'union') {
        type = p.type.raw || p.type.value.map(v => v.name).join(' | ');
      }
      
      // Handle intersection types
      if (type === 'intersection') {
        type = p.type.raw || p.type.value.map(v => v.name).join(' & ');
      }
      
      // Handle imported types
      if (p.type.raw && p.type.raw.includes('import(')) {
        const importMatch = p.type.raw.match(/import\("([^"]+)"\)/);
        if (importMatch) {
          const importPath = resolveImportPath(importMatch[1], path.dirname(filePath), tsconfig);
          type = `import("${importPath}")`;
        }
      }
      
      props[key] = {
        type,
        description: p.description || '',
        required: p.required,
        default: p.defaultValue?.value,
        source: p.parent ? path.basename(p.parent.fileName, '.tsx') : 'source'
      };
    });

    return {
      name: meta.displayName || path.basename(filePath, '.tsx'),
      description: meta.description || '',
      props,
      tokensUsed,
      variantStyleMappings,
      styles: {
        hasCSS: Object.keys(cssModules).length > 0 || Object.keys(cssVars).length > 0,
        hasTailwind: Object.keys(tailwindTokens).length > 0,
        hasCSSInJS: cssInJs.libraries.length > 0,
        cssInJs,
        animations,
        mediaQueries,
        pseudoClasses,
        imports
      }
    };
  } catch (error) {
    if (global.verbose) {
      console.log(`❌ Error parsing ${filePath}: ${error.message}`);
    }
    return null;
  }
}

// Make extractProperties available for cssInJs.js
export { extractProperties };
