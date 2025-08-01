import { Project, SyntaxKind } from 'ts-morph';
import { colord } from 'colord';

/**
 * CSS Variables Extractor - Robust AST-based extraction of design tokens
 * 
 * Features:
 * - AST-based CVA parsing (no brittle regex)
 * - Proper color conversion using colord
 * - Confidence scoring for extracted tokens
 * - Modular, testable architecture
 */
export class CSSVarsExtractor {
  constructor(options = {}) {
    this.options = {
      includeFallbacks: false,
      confidenceThreshold: 0.5,
      shadcnMode: true,
      ...options
    };
    
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        allowJs: true,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    });
  }

  /**
   * Main extraction method - combines all sources
   */
  async extractCSSVars(dcpComponent, sourceCode = '', filePath = '') {
    const cssVars = {
      light: {},
      dark: {},
      theme: {}
    };

    const extractedTokens = [];

    // 1. Extract from structured DCP tokens (highest confidence)
    if (dcpComponent.tokens) {
      const tokenVars = this.extractFromTokens(dcpComponent.tokens);
      this.mergeCSSVars(cssVars, tokenVars);
      extractedTokens.push(...this.tokensToMetadata(tokenVars, 'dcp-tokens', 1.0));
    }

    // 2. Extract from theme context (high confidence)
    if (dcpComponent.themeContext) {
      const themeVars = this.extractFromThemeContext(dcpComponent.themeContext);
      this.mergeCSSVars(cssVars, themeVars);
      extractedTokens.push(...this.tokensToMetadata(themeVars, 'theme-context', 0.9));
    }

    // 3. Extract from source code via AST (medium confidence)
    if (sourceCode) {
      const sourceVars = await this.extractFromSourceCode(sourceCode, filePath);
      this.mergeCSSVars(cssVars, sourceVars);
      extractedTokens.push(...this.tokensToMetadata(sourceVars, 'ast-analysis', 0.7));
    }

    return {
      cssVars: this.cleanupCSSVars(cssVars),
      metadata: {
        totalTokens: extractedTokens.length,
        sources: this.groupBy(extractedTokens, 'source'),
        averageConfidence: this.calculateAverageConfidence(extractedTokens)
      }
    };
  }

  /**
   * Extract CSS variables from structured DCP tokens
   */
  extractFromTokens(tokens) {
    const cssVars = { light: {}, dark: {}, theme: {} };

    // Colors
    if (tokens.colors) {
      this.mapColorTokens(tokens.colors, cssVars);
    }

    // Typography
    if (tokens.typography) {
      this.mapTypographyTokens(tokens.typography, cssVars);
    }

    // Spacing
    if (tokens.spacing) {
      this.mapSpacingTokens(tokens.spacing, cssVars);
    }

    // Border radius
    if (tokens.borderRadius) {
      this.mapBorderRadiusTokens(tokens.borderRadius, cssVars);
    }

    return cssVars;
  }

  /**
   * Extract CSS variables from theme context
   */
  extractFromThemeContext(themeContext) {
    const cssVars = { light: {}, dark: {}, theme: {} };

    if (themeContext.lightVariables) {
      Object.assign(cssVars.light, themeContext.lightVariables);
    }

    if (themeContext.darkVariables) {
      Object.assign(cssVars.dark, themeContext.darkVariables);
    }

    if (themeContext.config) {
      const config = themeContext.config;
      if (config.fontFamily) cssVars.theme['font-sans'] = config.fontFamily;
      if (config.borderRadius) cssVars.theme.radius = config.borderRadius;
    }

    return cssVars;
  }

  /**
   * Extract CSS variables from source code using AST
   */
  async extractFromSourceCode(sourceCode, filePath = 'component.tsx') {
    const cssVars = { light: {}, dark: {}, theme: {} };

    try {
      // Create in-memory source file
      const sourceFile = this.project.createSourceFile(filePath, sourceCode, { overwrite: true });

      // Extract from CVA calls
      const cvaVars = this.extractFromCVACalls(sourceFile);
      this.mergeCSSVars(cssVars, cvaVars);

      // Extract from CSS custom properties
      const customPropVars = this.extractFromCSSCustomProperties(sourceCode);
      this.mergeCSSVars(cssVars, customPropVars);

      // Extract from theme function calls
      const themeFuncVars = this.extractFromThemeFunctions(sourceFile);
      this.mergeCSSVars(cssVars, themeFuncVars);

    } catch (error) {
      console.warn(`[CSSVarsExtractor] AST parsing failed: ${error.message}`);
      // Fallback to regex-based extraction
      const fallbackVars = this.extractFromSourceCodeFallback(sourceCode);
      this.mergeCSSVars(cssVars, fallbackVars);
    }

    return cssVars;
  }

  /**
   * Extract variants from CVA calls using AST
   */
  extractFromCVACalls(sourceFile) {
    const cssVars = { light: {}, dark: {}, theme: {} };

    // Find all CVA function calls
    const cvaCallExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(call => {
        const expression = call.getExpression();
        return expression.getKind() === SyntaxKind.Identifier && 
               expression.getText() === 'cva';
      });

    for (const cvaCall of cvaCallExpressions) {
      const args = cvaCall.getArguments();
      if (args.length < 2) continue;

      // First argument: base classes
      const baseClasses = this.extractStringLiteral(args[0]);
      if (baseClasses) {
        this.extractColorsFromClasses(baseClasses, cssVars, 'base');
      }

      // Second argument: options object
      const optionsArg = args[1];
      if (optionsArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
        const variantsProperty = optionsArg.getProperty('variants');
        if (variantsProperty?.getKind() === SyntaxKind.PropertyAssignment) {
          const variantsObject = variantsProperty.getInitializer();
          if (variantsObject?.getKind() === SyntaxKind.ObjectLiteralExpression) {
            this.extractVariantsFromAST(variantsObject, cssVars);
          }
        }
      }
    }

    return cssVars;
  }

  /**
   * Extract variants from AST object literal
   */
  extractVariantsFromAST(variantsObject, cssVars) {
    const variantProperties = variantsObject.getProperties();

    for (const variantProperty of variantProperties) {
      if (variantProperty.getKind() !== SyntaxKind.PropertyAssignment) continue;

      const variantName = variantProperty.getName();
      const variantOptions = variantProperty.getInitializer();

      if (variantOptions?.getKind() === SyntaxKind.ObjectLiteralExpression) {
        const optionProperties = variantOptions.getProperties();

        for (const optionProperty of optionProperties) {
          if (optionProperty.getKind() !== SyntaxKind.PropertyAssignment) continue;

          const optionName = optionProperty.getName();
          const optionValue = optionProperty.getInitializer();
          const classes = this.extractStringLiteral(optionValue);

          if (classes) {
            this.extractColorsFromClasses(classes, cssVars, `${variantName}-${optionName}`);
          }
        }
      }
    }
  }

  /**
   * Extract string literal value from AST node
   */
  extractStringLiteral(node) {
    if (!node) return null;

    if (node.getKind() === SyntaxKind.StringLiteral ||
        node.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
      return node.getLiteralValue();
    }

    return null;
  }

  /**
   * Extract colors from Tailwind class strings with proper mapping
   */
  extractColorsFromClasses(classString, cssVars, prefix = '') {
    if (!classString) return;

    const shadcnVarMap = this.getShadCNVariableMap();

    // Extract ShadCN variable references
    Object.entries(shadcnVarMap).forEach(([className, varInfo]) => {
      if (classString.includes(className)) {
        const { varName, colorSpace } = varInfo;
        
        // Only add if we don't already have it or if we allow fallbacks
        if (!cssVars.light[varName] || this.options.includeFallbacks) {
          const defaultColors = this.getDefaultShadCNColors();
          
          if (defaultColors.light[varName]) {
            cssVars.light[varName] = defaultColors.light[varName];
          }
          if (defaultColors.dark[varName]) {
            cssVars.dark[varName] = defaultColors.dark[varName];
          }
        }
      }
    });
  }

  /**
   * Get enhanced ShadCN variable mapping with metadata
   */
  getShadCNVariableMap() {
    return {
      'bg-primary': { varName: 'primary', colorSpace: 'hsl' },
      'text-primary': { varName: 'primary', colorSpace: 'hsl' },
      'border-primary': { varName: 'primary', colorSpace: 'hsl' },
      'ring-primary': { varName: 'primary', colorSpace: 'hsl' },
      'bg-primary-foreground': { varName: 'primary-foreground', colorSpace: 'hsl' },
      'text-primary-foreground': { varName: 'primary-foreground', colorSpace: 'hsl' },
      'bg-secondary': { varName: 'secondary', colorSpace: 'hsl' },
      'text-secondary': { varName: 'secondary', colorSpace: 'hsl' },
      'bg-secondary-foreground': { varName: 'secondary-foreground', colorSpace: 'hsl' },
      'text-secondary-foreground': { varName: 'secondary-foreground', colorSpace: 'hsl' },
      'bg-destructive': { varName: 'destructive', colorSpace: 'hsl' },
      'text-destructive': { varName: 'destructive', colorSpace: 'hsl' },
      'bg-destructive-foreground': { varName: 'destructive-foreground', colorSpace: 'hsl' },
      'text-destructive-foreground': { varName: 'destructive-foreground', colorSpace: 'hsl' },
      'bg-muted': { varName: 'muted', colorSpace: 'hsl' },
      'text-muted': { varName: 'muted', colorSpace: 'hsl' },
      'bg-muted-foreground': { varName: 'muted-foreground', colorSpace: 'hsl' },
      'text-muted-foreground': { varName: 'muted-foreground', colorSpace: 'hsl' },
      'bg-accent': { varName: 'accent', colorSpace: 'hsl' },
      'text-accent': { varName: 'accent', colorSpace: 'hsl' },
      'bg-accent-foreground': { varName: 'accent-foreground', colorSpace: 'hsl' },
      'text-accent-foreground': { varName: 'accent-foreground', colorSpace: 'hsl' },
      'bg-popover': { varName: 'popover', colorSpace: 'hsl' },
      'text-popover': { varName: 'popover', colorSpace: 'hsl' },
      'bg-popover-foreground': { varName: 'popover-foreground', colorSpace: 'hsl' },
      'text-popover-foreground': { varName: 'popover-foreground', colorSpace: 'hsl' },
      'bg-card': { varName: 'card', colorSpace: 'hsl' },
      'text-card': { varName: 'card', colorSpace: 'hsl' },
      'bg-card-foreground': { varName: 'card-foreground', colorSpace: 'hsl' },
      'text-card-foreground': { varName: 'card-foreground', colorSpace: 'hsl' },
      'border': { varName: 'border', colorSpace: 'hsl' },
      'border-input': { varName: 'input', colorSpace: 'hsl' },
      'ring-ring': { varName: 'ring', colorSpace: 'hsl' },
      'ring-offset-background': { varName: 'background', colorSpace: 'hsl' }
    };
  }

  /**
   * Convert color to proper CSS format using colord
   */
  convertColorToCSS(color, targetFormat = 'hsl') {
    if (!color) return '';

    try {
      const colorObj = colord(color);
      
      if (targetFormat === 'hsl') {
        const hsl = colorObj.toHsl();
        return `${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%`;
      } else if (targetFormat === 'rgb') {
        const rgb = colorObj.toRgb();
        return `${rgb.r} ${rgb.g} ${rgb.b}`;
      }
      
      return colorObj.toHex();
    } catch (error) {
      console.warn(`[CSSVarsExtractor] Color conversion failed for "${color}": ${error.message}`);
      return color.toString();
    }
  }

  /**
   * Map color tokens to CSS variables
   */
  mapColorTokens(colorTokens, cssVars) {
    const colorMap = {
      'primary': 'primary',
      'secondary': 'secondary',
      'accent': 'accent',
      'destructive': 'destructive',
      'muted': 'muted',
      'popover': 'popover',
      'card': 'card',
      'border': 'border',
      'input': 'input',
      'ring': 'ring',
      'background': 'background',
      'foreground': 'foreground',
      // Common aliases
      'bg': 'background',
      'text': 'foreground',
      'surface': 'card',
      'outline': 'border'
    };

    Object.entries(colorTokens).forEach(([tokenName, tokenValue]) => {
      const shadcnName = colorMap[tokenName.toLowerCase()] || tokenName;
      
      if (typeof tokenValue === 'object') {
        // Handle nested color objects (light/dark variants)
        if (tokenValue.light) {
          cssVars.light[shadcnName] = this.convertColorToCSS(tokenValue.light);
        }
        if (tokenValue.dark) {
          cssVars.dark[shadcnName] = this.convertColorToCSS(tokenValue.dark);
        }
        // Default color
        if (tokenValue.default || tokenValue.value) {
          const color = tokenValue.default || tokenValue.value;
          cssVars.light[shadcnName] = this.convertColorToCSS(color);
        }
      } else {
        // Simple color value
        cssVars.light[shadcnName] = this.convertColorToCSS(tokenValue);
      }
    });
  }

  /**
   * Map typography tokens
   */
  mapTypographyTokens(typographyTokens, cssVars) {
    if (typographyTokens.fontFamily) {
      const families = typographyTokens.fontFamily;
      if (families.sans) cssVars.theme['font-sans'] = families.sans;
      if (families.serif) cssVars.theme['font-serif'] = families.serif;
      if (families.mono) cssVars.theme['font-mono'] = families.mono;
    }

    if (typographyTokens.fontSize) {
      Object.entries(typographyTokens.fontSize).forEach(([size, value]) => {
        cssVars.theme[`text-${size}`] = value;
      });
    }
  }

  /**
   * Map spacing tokens
   */
  mapSpacingTokens(spacingTokens, cssVars) {
    Object.entries(spacingTokens).forEach(([key, value]) => {
      cssVars.theme[`spacing-${key}`] = value;
    });
  }

  /**
   * Map border radius tokens
   */
  mapBorderRadiusTokens(borderRadiusTokens, cssVars) {
    if (typeof borderRadiusTokens === 'string') {
      cssVars.theme.radius = borderRadiusTokens;
    } else {
      Object.entries(borderRadiusTokens).forEach(([key, value]) => {
        if (key === 'default' || key === 'md') {
          cssVars.theme.radius = value;
        } else {
          cssVars.theme[`radius-${key}`] = value;
        }
      });
    }
  }

  /**
   * Extract CSS custom properties from source
   */
  extractFromCSSCustomProperties(sourceCode) {
    const cssVars = { light: {}, dark: {}, theme: {} };
    const customPropRegex = /--([a-zA-Z0-9-]+):\s*([^;]+);/g;
    let match;

    while ((match = customPropRegex.exec(sourceCode)) !== null) {
      const propName = match[1];
      const propValue = match[2].trim();
      cssVars.theme[propName] = propValue;
    }

    return cssVars;
  }

  /**
   * Extract theme function calls from AST
   */
  extractFromThemeFunctions(sourceFile) {
    const cssVars = { light: {}, dark: {}, theme: {} };

    // Find theme() function calls
    const themeCallExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(call => {
        const expression = call.getExpression();
        return expression.getKind() === SyntaxKind.Identifier && 
               expression.getText() === 'theme';
      });

    for (const themeCall of themeCallExpressions) {
      const args = themeCall.getArguments();
      if (args.length > 0) {
        const themePath = this.extractStringLiteral(args[0]);
        if (themePath?.startsWith('colors.')) {
          const colorName = themePath.replace('colors.', '').replace('.', '-');
          if (!cssVars.light[colorName]) {
            cssVars.light[colorName] = '0 0% 50%'; // Placeholder
          }
        }
      }
    }

    return cssVars;
  }

  /**
   * Fallback regex-based extraction (when AST fails)
   */
  extractFromSourceCodeFallback(sourceCode) {
    const cssVars = { light: {}, dark: {}, theme: {} };
    
    // Simple CVA pattern matching
    const cvaRegex = /cva\s*\(\s*["'`]([^"'`]+)["'`]/;
    const match = cvaRegex.exec(sourceCode);
    
    if (match) {
      this.extractColorsFromClasses(match[1], cssVars, 'fallback');
    }

    return cssVars;
  }

  /**
   * Get default ShadCN colors
   */
  getDefaultShadCNColors() {
    return {
      light: {
        'primary': '222.2 84% 4.9%',
        'primary-foreground': '210 40% 98%',
        'secondary': '210 40% 96%',
        'secondary-foreground': '222.2 84% 4.9%',
        'destructive': '0 84.2% 60.2%',
        'destructive-foreground': '210 40% 98%',
        'muted': '210 40% 96%',
        'muted-foreground': '215.4 16.3% 46.9%',
        'accent': '210 40% 96%',
        'accent-foreground': '222.2 84% 4.9%',
        'popover': '0 0% 100%',
        'popover-foreground': '222.2 84% 4.9%',
        'card': '0 0% 100%',
        'card-foreground': '222.2 84% 4.9%',
        'border': '214.3 31.8% 91.4%',
        'input': '214.3 31.8% 91.4%',
        'ring': '222.2 84% 4.9%',
        'background': '0 0% 100%',
        'foreground': '222.2 84% 4.9%'
      },
      dark: {
        'primary': '210 40% 98%',
        'primary-foreground': '222.2 84% 4.9%',
        'secondary': '217.2 32.6% 17.5%',
        'secondary-foreground': '210 40% 98%',
        'destructive': '0 62.8% 30.6%',
        'destructive-foreground': '210 40% 98%',
        'muted': '217.2 32.6% 17.5%',
        'muted-foreground': '215 20.2% 65.1%',
        'accent': '217.2 32.6% 17.5%',
        'accent-foreground': '210 40% 98%',
        'popover': '222.2 84% 4.9%',
        'popover-foreground': '210 40% 98%',
        'card': '222.2 84% 4.9%',
        'card-foreground': '210 40% 98%',
        'border': '217.2 32.6% 17.5%',
        'input': '217.2 32.6% 17.5%',
        'ring': '212.7 26.8% 83.9%',
        'background': '222.2 84% 4.9%',
        'foreground': '210 40% 98%'
      }
    };
  }

  /**
   * Utility methods
   */
  mergeCSSVars(target, source) {
    ['light', 'dark', 'theme'].forEach(mode => {
      if (source[mode]) {
        Object.assign(target[mode], source[mode]);
      }
    });
  }

  cleanupCSSVars(cssVars) {
    const cleaned = {};
    ['light', 'dark', 'theme'].forEach(mode => {
      if (cssVars[mode] && Object.keys(cssVars[mode]).length > 0) {
        cleaned[mode] = cssVars[mode];
      }
    });
    return cleaned;
  }

  tokensToMetadata(cssVars, source, confidence) {
    const tokens = [];
    ['light', 'dark', 'theme'].forEach(mode => {
      if (cssVars[mode]) {
        Object.keys(cssVars[mode]).forEach(varName => {
          tokens.push({ varName, mode, source, confidence });
        });
      }
    });
    return tokens;
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  calculateAverageConfidence(tokens) {
    if (tokens.length === 0) return 0;
    return tokens.reduce((sum, token) => sum + token.confidence, 0) / tokens.length;
  }
}