import fs from 'fs';
import path from 'path';
import { extractThemeConfig, extractCSSVariableThemes } from './configHandler.js';
import { mapTailwindClassesToCSSVariables } from '../tokens/legacyCssVarExtractor.js';

/**
 * Comprehensive theme extraction for design systems
 * Integrates ShadCN/UI, Tailwind, and custom theming approaches
 */

/**
 * Extract complete theming context from a project
 * @param {string} sourceDir - Source directory (components folder)
 * @param {Object} options - Extraction options
 * @returns {Object} Complete theme context
 */
export async function extractThemeContext(sourceDir, options = {}) {
  const { verbose = false } = options;
  
  if (verbose) {
    console.log('🎨 Extracting theme context...');
  }
  
  // Look for project root by traversing up from source directory
  const projectRoot = findProjectRoot(sourceDir);
  
  // 1. Extract theme configuration (components.json, etc.)
  const themeConfig = extractThemeConfig(projectRoot);
  
  // 2. Extract CSS variables from stylesheets (even without config)
  const cssVariables = await extractCSSVariables(projectRoot, themeConfig);
  
  // Check if we found any CSS variables
  const foundVariables = Object.keys(cssVariables.light || {}).length > 0 || 
                        Object.keys(cssVariables.dark || {}).length > 0;
  
  // If no config AND no CSS variables, return minimal context
  if (!themeConfig && !foundVariables) {
    if (verbose) {
      console.log('   No theme configuration or CSS variables found - skipping theme extraction');
    }
    return {
      config: null,
      cssVariables: { light: {}, dark: {}, custom: {} },
      utilityMappings: {},
      metadata: {
        extractedAt: new Date().toISOString(),
        themingMode: null,
        hasMultipleThemes: false
      }
    };
  }
  
  // 3. Build utility class mappings (use detected config or defaults)
  const effectiveConfig = themeConfig || {
    cssVariables: true,
    baseColor: 'gray',
    themingMode: foundVariables ? 'css-variables' : null
  };
  
  const utilityMappings = buildUtilityMappings(cssVariables, effectiveConfig);
  
  if (verbose) {
    console.log(`   Found ${Object.keys(cssVariables.light || {}).length} light theme variables`);
    console.log(`   Found ${Object.keys(cssVariables.dark || {}).length} dark theme variables`);
    console.log(`   Built ${Object.keys(utilityMappings).length} utility mappings`);
  }
  
  return {
    config: effectiveConfig,
    cssVariables,
    utilityMappings,
    metadata: {
      extractedAt: new Date().toISOString(),
      themingMode: effectiveConfig?.themingMode || null,
      hasMultipleThemes: Object.keys(cssVariables.dark || {}).length > 0
    }
  };
}

/**
 * Extract CSS variables from project stylesheets
 * @param {string} projectRoot - Project root directory
 * @param {Object} themeConfig - Theme configuration
 * @returns {Object} CSS variables by theme
 */
async function extractCSSVariables(projectRoot, themeConfig) {
  const cssVariables = { light: {}, dark: {}, custom: {} };
  
  // Look for common CSS file locations
  const cssFilePaths = [
    themeConfig?.css, // From components.json
    'app/globals.css',
    'src/app/globals.css', 
    'styles/globals.css',
    'src/index.css',
    'src/styles/globals.css'
  ].filter(Boolean);
  
  for (const cssPath of cssFilePaths) {
    const fullPath = path.resolve(projectRoot, cssPath);
    
    try {
      if (fs.existsSync(fullPath)) {
        const cssContent = await fs.promises.readFile(fullPath, 'utf-8');
        const extracted = extractCSSVariableThemes(cssContent);
        
        // Merge extracted variables
        Object.assign(cssVariables.light, extracted.light);
        Object.assign(cssVariables.dark, extracted.dark);
        Object.assign(cssVariables.custom, extracted.custom);
        
        break; // Use first found CSS file
      }
    } catch (error) {
      console.warn(`Failed to read CSS file ${fullPath}:`, error.message);
    }
  }
  
  return cssVariables;
}

/**
 * Build Tailwind utility class to CSS variable mappings
 * @param {Object} cssVariables - CSS variables by theme
 * @param {Object} themeConfig - Theme configuration
 * @returns {Object} Utility class mappings
 */
function buildUtilityMappings(cssVariables, themeConfig) {
  // If no theme config, return empty mappings
  if (!themeConfig) {
    return {};
  }
  
  // Get all available CSS variable names
  const allVariables = new Set([
    ...Object.keys(cssVariables.light || {}),
    ...Object.keys(cssVariables.dark || {}),
    // Include custom theme variables
    ...Object.values(cssVariables.custom || {}).flatMap(theme => Object.keys(theme))
  ]);
  
  // Build common utility classes that would use these variables
  const commonClasses = [];
  
  for (const variable of allVariables) {
    const varName = variable.replace('--', '');
    
    // Generate common class patterns
    commonClasses.push(
      `bg-${varName}`,
      `text-${varName}`,
      `border-${varName}`,
      `ring-${varName}`
    );
  }
  
  // Map classes to variables
  return mapTailwindClassesToCSSVariables(commonClasses, cssVariables, themeConfig);
}

/**
 * Enhance component with theme-aware style mappings
 * @param {Object} component - Component metadata
 * @param {Object} themeContext - Complete theme context
 * @returns {Object} Enhanced component with theme data
 */
export function enhanceComponentWithThemeContext(component, themeContext) {
  if (!component.props || !Array.isArray(component.props)) {
    return component;
  }
  
  // Only add theme context if real config exists
  const enhancedComponent = { ...component };
  
  if (themeContext.config) {
    enhancedComponent.themeContext = {
      themingMode: themeContext.config.themingMode,
      cssVariables: themeContext.config.cssVariables,
      baseColor: themeContext.config.baseColor
    };
  } else {
    // No real theme config - don't add fake theme context
    enhancedComponent.themeContext = null;
  }
  
  // Enhance each prop with potential style mappings
  enhancedComponent.props = component.props.map(prop => {
    // Look for variant-style props that might have CSS class mappings
    if (prop.name === 'variant' || prop.name === 'size' || prop.name === 'color') {
      return {
        ...prop,
        styleMapping: extractPropStyleMappings(prop, themeContext)
      };
    }
    return prop;
  });
  
  return enhancedComponent;
}

/**
 * Extract style mappings for a component prop
 * @param {Object} prop - Component prop metadata
 * @param {Object} themeContext - Theme context
 * @returns {Object} Style mappings for the prop
 */
function extractPropStyleMappings(prop, themeContext) {
  const mappings = {};
  
  // This is where we would integrate with your Chrome extension logic
  // For now, return structure that can be enhanced with runtime data
  
  return {
    type: 'variant-styles',
    values: prop.values || [],
    // Placeholder for actual style mappings
    // This would be populated by Chrome extension data or static analysis
    mappings: {},
    themeAware: themeContext.config?.cssVariables || false
  };
}

/**
 * Generate AI-ready theme context summary
 * @param {Object} themeContext - Complete theme context
 * @returns {string} Human-readable theme summary
 */
export function generateThemeContextSummary(themeContext) {
  const { config, cssVariables, utilityMappings } = themeContext;
  
  // If no config, be honest about it
  if (!config) {
    return `Theme Configuration: None detected\n- No theme configuration file found\n- No CSS variables extracted\n`;
  }
  
  let summary = `Theme Configuration:\n`;
  summary += `- Mode: ${config.themingMode}\n`;
  summary += `- Base Color: ${config.baseColor}\n`;
  summary += `- CSS Variables: ${config.cssVariables ? 'Yes' : 'No'}\n`;
  
  if (Object.keys(cssVariables.light || {}).length > 0) {
    summary += `\nAvailable CSS Variables:\n`;
    Object.keys(cssVariables.light).forEach(variable => {
      const lightValue = cssVariables.light[variable]?.computed;
      const darkValue = cssVariables.dark[variable]?.computed;
      
      summary += `- ${variable}: ${lightValue}`;
      if (darkValue && darkValue !== lightValue) {
        summary += ` (dark: ${darkValue})`;
      }
      summary += `\n`;
    });
  }
  
  if (Object.keys(utilityMappings).length > 0) {
    summary += `\nUtility Class Mappings:\n`;
    Object.entries(utilityMappings).slice(0, 10).forEach(([className, mapping]) => {
      summary += `- ${className} → ${mapping.cssVariable}\n`;
    });
    
    if (Object.keys(utilityMappings).length > 10) {
      summary += `... and ${Object.keys(utilityMappings).length - 10} more\n`;
    }
  }
  
  return summary;
}

/**
 * Find project root by looking for common project files
 * @param {string} startDir - Directory to start searching from
 * @returns {string} Project root directory
 */
function findProjectRoot(startDir) {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;
  
  while (currentDir !== root) {
    // Look for common project root indicators
    const indicators = [
      'components.json',
      'package.json',
      'tailwind.config.js',
      'tailwind.config.ts',
      'next.config.js',
      'app/globals.css',
      'src/app/globals.css'
    ];
    
    for (const indicator of indicators) {
      if (fs.existsSync(path.join(currentDir, indicator))) {
        return currentDir;
      }
    }
    
    // Move up one directory
    currentDir = path.dirname(currentDir);
  }
  
  // Fallback to original directory if no indicators found
  return startDir;
}