import fs from 'fs';
import path from 'path';

/**
 * Extract ShadCN/UI theme configuration and CSS variables
 */
export class ThemeHandler {
  constructor() {
    this.cssVariablePattern = /--([a-zA-Z-]+):\s*([^;]+);/g;
    this.rootBlockPattern = /:root\s*\{([^}]+)\}/s;
    this.darkBlockPattern = /\.dark\s*\{([^}]+)\}/s;
  }

  /**
   * Extract theme configuration from components.json (ShadCN style)
   */
  extractThemeConfig(projectRoot) {
    const configPaths = [
      path.join(projectRoot, 'components.json'),
      path.join(projectRoot, 'src/components.json'),
      path.join(projectRoot, 'app/components.json')
    ];

    for (const configPath of configPaths) {
      try {
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          return this.parseThemeConfig(config);
        }
      } catch (error) {
        console.warn(`Failed to parse ${configPath}:`, error.message);
      }
    }

    return this.getDefaultThemeConfig();
  }

  /**
   * Parse theme configuration from components.json
   */
  parseThemeConfig(config) {
    const tailwind = config.tailwind || {};
    
    return {
      cssVariables: tailwind.cssVariables !== false, // default to true
      baseColor: tailwind.baseColor || 'neutral',
      cssPath: tailwind.css || 'app/globals.css',
      style: config.style || 'default',
      rsc: config.rsc !== false,
      aliases: config.aliases || {},
      iconLibrary: config.iconLibrary || 'lucide'
    };
  }

  /**
   * Default theme configuration if components.json not found
   */
  getDefaultThemeConfig() {
    return {
      cssVariables: true,
      baseColor: 'neutral',
      cssPath: 'app/globals.css',
      style: 'default',
      rsc: true,
      aliases: {},
      iconLibrary: 'lucide'
    };
  }

  /**
   * Extract CSS variables from globals.css or similar files
   */
  extractCSSVariables(projectRoot, cssPath = 'app/globals.css') {
    const possiblePaths = [
      path.join(projectRoot, cssPath),
      path.join(projectRoot, 'src', cssPath),
      path.join(projectRoot, 'src/app/globals.css'),
      path.join(projectRoot, 'app/globals.css'),
      path.join(projectRoot, 'styles/globals.css'),
      path.join(projectRoot, 'src/styles/globals.css')
    ];

    for (const cssFilePath of possiblePaths) {
      try {
        if (fs.existsSync(cssFilePath)) {
          const cssContent = fs.readFileSync(cssFilePath, 'utf8');
          return this.parseCSSVariables(cssContent);
        }
      } catch (error) {
        console.warn(`Failed to read CSS file ${cssFilePath}:`, error.message);
      }
    }

    return { light: {}, dark: {} };
  }

  /**
   * Parse CSS variables from CSS content
   */
  parseCSSVariables(cssContent) {
    const themes = { light: {}, dark: {} };

    // Extract :root variables (light theme)
    const rootMatch = cssContent.match(this.rootBlockPattern);
    if (rootMatch) {
      themes.light = this.parseVariableBlock(rootMatch[1]);
    }

    // Extract .dark variables (dark theme)
    const darkMatch = cssContent.match(this.darkBlockPattern);
    if (darkMatch) {
      themes.dark = this.parseVariableBlock(darkMatch[1]);
    }

    return themes;
  }

  /**
   * Parse individual CSS variable block
   */
  parseVariableBlock(blockContent) {
    const variables = {};
    let match;

    this.cssVariablePattern.lastIndex = 0; // Reset regex
    while ((match = this.cssVariablePattern.exec(blockContent)) !== null) {
      const [, name, value] = match;
      variables[`--${name}`] = value.trim();
    }

    return variables;
  }

  /**
   * Map Tailwind classes to CSS variables
   */
  mapTailwindToCSSVars(classes, cssVariables) {
    const mappings = {};
    const classArray = Array.isArray(classes) ? classes : classes.split(' ');

    classArray.forEach(className => {
      // Map common Tailwind patterns to CSS variables
      const mapping = this.getTailwindCSSVarMapping(className);
      if (mapping && cssVariables.light[mapping]) {
        mappings[className] = {
          cssVar: mapping,
          lightValue: cssVariables.light[mapping],
          darkValue: cssVariables.dark[mapping] || cssVariables.light[mapping]
        };
      }
    });

    return mappings;
  }

  /**
   * Get CSS variable mapping for Tailwind class
   */
  getTailwindCSSVarMapping(className) {
    const mappings = {
      'bg-background': '--background',
      'text-foreground': '--foreground',
      'bg-card': '--card',
      'text-card-foreground': '--card-foreground',
      'bg-popover': '--popover',
      'text-popover-foreground': '--popover-foreground',
      'bg-primary': '--primary',
      'text-primary-foreground': '--primary-foreground',
      'bg-secondary': '--secondary',
      'text-secondary-foreground': '--secondary-foreground',
      'bg-muted': '--muted',
      'text-muted-foreground': '--muted-foreground',
      'bg-accent': '--accent',
      'text-accent-foreground': '--accent-foreground',
      'bg-destructive': '--destructive',
      'text-destructive-foreground': '--destructive-foreground',
      'border-border': '--border',
      'bg-input': '--input',
      'ring-ring': '--ring'
    };

    return mappings[className];
  }

  /**
   * Compute actual color values from CSS variables
   */
  computeStylesForThemes(classes, cssVariables) {
    const computed = { light: {}, dark: {} };
    const varMappings = this.mapTailwindToCSSVars(classes, cssVariables);

    Object.entries(varMappings).forEach(([className, mapping]) => {
      const property = this.getStyleProperty(className);
      if (property) {
        computed.light[property] = this.convertHSLToColor(mapping.lightValue);
        computed.dark[property] = this.convertHSLToColor(mapping.darkValue);
      }
    });

    return computed;
  }

  /**
   * Get CSS property from Tailwind class name
   */
  getStyleProperty(className) {
    if (className.startsWith('bg-')) return 'backgroundColor';
    if (className.startsWith('text-')) return 'color';
    if (className.startsWith('border-')) return 'borderColor';
    if (className.startsWith('ring-')) return 'outlineColor';
    return null;
  }

  /**
   * Convert HSL values to proper CSS color
   */
  convertHSLToColor(hslValue) {
    if (!hslValue) return null;
    
    // Handle both "240 9% 2%" and "oklch(...)" formats
    if (hslValue.includes('oklch')) {
      return hslValue;
    }
    
    // Convert space-separated HSL to proper hsl() format
    const values = hslValue.trim();
    if (values.match(/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/)) {
      return `hsl(${values})`;
    }
    
    return hslValue;
  }

  /**
   * Get complete theme context for a component
   */
  getComponentThemeContext(projectRoot, componentClasses = []) {
    const themeConfig = this.extractThemeConfig(projectRoot);
    const cssVariables = this.extractCSSVariables(projectRoot, themeConfig.cssPath);
    
    const varMappings = this.mapTailwindToCSSVars(componentClasses, cssVariables);
    const computedStyles = this.computeStylesForThemes(componentClasses, cssVariables);

    return {
      themeConfig,
      cssVariables,
      utilityMappings: varMappings,
      computedStyles
    };
  }
} 