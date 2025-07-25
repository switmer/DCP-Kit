import { ReactTSXAdaptor } from '../react-tsx/index.js';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import path from 'path';

/**
 * ShadCN React TSX Adaptor for DCP Transformer
 * 
 * Extends ReactTSXAdaptor with ShadCN-specific features:
 * - Enhanced CVA variant detection and parsing
 * - Tailwind class extraction and token mapping  
 * - Radix primitive composition analysis
 * - ShadCN component pattern recognition
 * 
 * Supports:
 * - All React TSX adaptor features
 * - CVA variants with defaultVariants
 * - Tailwind token extraction (colors, spacing, radius)
 * - Radix component composition tracking
 * - asChild pattern detection
 */

export class ShadCNReactTSXAdaptor extends ReactTSXAdaptor {
  constructor(options = {}) {
    super(options);
    this.extractTailwindTokens = options.extractTailwindTokens !== false;
    this.mapRadixComposition = options.mapRadixComposition !== false;
    this.detectAsChildPattern = options.detectAsChildPattern !== false;
  }

  canProcess(filePath, source) {
    // Use parent's canProcess, but add ShadCN-specific heuristics
    if (!super.canProcess(filePath, source)) {
      return false;
    }

    // ShadCN-specific patterns
    const hasCVA = source.includes('cva(') || source.includes('import { cva }');
    const hasRadix = source.includes('@radix-ui/') || source.includes('Radix.');
    const hasTailwind = /\b(bg-|text-|border-|p-|m-|w-|h-|rounded-)/.test(source);
    const hasAsChild = source.includes('asChild');
    
    return hasCVA || hasRadix || hasTailwind || hasAsChild;
  }

  async extractComponents(filePath, source, options = {}) {
    const components = await super.extractComponents(filePath, source, options);
    
    // Enhance each component with ShadCN-specific analysis
    const enhancedComponents = components.map(component => {
      return this.enhanceComponentWithShadCN(component, source, filePath);
    });

    if (this.verbose) {
      console.log(`[ShadCN] ${filePath}: Enhanced ${enhancedComponents.length} components`);
    }

    return enhancedComponents;
  }

  enhanceComponentWithShadCN(component, source, filePath) {
    const ast = this.parseSource(source);
    
    // Enhanced CVA variant extraction
    const cvaData = this.extractEnhancedCVAData(ast, component.name);
    if (cvaData.variants) {
      component.variants = { ...component.variants, ...cvaData.variants };
    }
    if (cvaData.defaultVariants) {
      component.defaultVariants = cvaData.defaultVariants;
    }

    // Extract Tailwind tokens
    if (this.extractTailwindTokens) {
      component.tokensUsed = this.extractTailwindTokensFromSource(source);
    }

    // Map Radix composition
    if (this.mapRadixComposition) {
      component.composition = {
        ...component.composition,
        ...this.extractRadixComposition(ast, source)
      };
    }

    // Detect asChild pattern
    if (this.detectAsChildPattern) {
      const asChildInfo = this.detectAsChildUsage(ast);
      if (asChildInfo.hasAsChild) {
        component.metadata.asChildSupport = true;
        component.metadata.asChildImplementation = asChildInfo.implementation;
      }
    }

    // Update metadata
    component.metadata.adaptor = 'shadcn-react-tsx';
    component.metadata.shadcnVersion = this.detectShadCNVersion(source);
    
    return component;
  }

  /**
   * Enhanced CVA parsing that captures defaultVariants and complex patterns
   */
  extractEnhancedCVAData(ast, componentName) {
    let variants = {};
    let defaultVariants = {};
    let cvaConfig = null;

    traverse.default(ast, {
      // Look for cva() calls
      CallExpression: (path) => {
        if (!t.isIdentifier(path.node.callee, { name: 'cva' })) return;
        
        const [baseClasses, optionsArg] = path.node.arguments;
        if (!optionsArg || !t.isObjectExpression(optionsArg)) return;

        // Parse variants
        const variantsProp = optionsArg.properties.find(prop => 
          t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'variants' })
        );
        
        if (variantsProp && t.isObjectExpression(variantsProp.value)) {
          variants = this.parseVariantsObject(variantsProp.value);
        }

        // Parse defaultVariants
        const defaultVariantsProp = optionsArg.properties.find(prop => 
          t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'defaultVariants' })
        );
        
        if (defaultVariantsProp && t.isObjectExpression(defaultVariantsProp.value)) {
          defaultVariants = this.parseDefaultVariantsObject(defaultVariantsProp.value);
        }

        // Store full config for complex analysis
        cvaConfig = {
          baseClasses: this.extractStringValue(baseClasses),
          variants,
          defaultVariants
        };
      }
    });

    return { variants, defaultVariants, cvaConfig };
  }

  parseVariantsObject(variantsObj) {
    const variants = {};
    
    variantsObj.properties.forEach(groupProp => {
      if (t.isObjectProperty(groupProp) && t.isObjectExpression(groupProp.value)) {
        const groupName = this.extractPropertyKey(groupProp.key);
        
        if (groupName) {
          variants[groupName] = groupProp.value.properties
            .map(vProp => this.extractPropertyKey(vProp.key))
            .filter(Boolean);
        }
      }
    });

    return variants;
  }

  parseDefaultVariantsObject(defaultVariantsObj) {
    const defaultVariants = {};
    
    defaultVariantsObj.properties.forEach(prop => {
      if (t.isObjectProperty(prop)) {
        const key = this.extractPropertyKey(prop.key);
        const value = this.extractStringValue(prop.value);
        
        if (key && value) {
          defaultVariants[key] = value;
        }
      }
    });

    return defaultVariants;
  }

  extractPropertyKey(key) {
    if (t.isIdentifier(key)) return key.name;
    if (t.isStringLiteral(key)) return key.value;
    return null;
  }

  extractStringValue(node) {
    if (t.isStringLiteral(node)) return node.value;
    if (t.isTemplateLiteral(node)) {
      // Simple template literal handling
      return node.quasis.map(quasi => quasi.value.raw).join('${...}');
    }
    return null;
  }

  /**
   * Extract Tailwind classes and map to design tokens
   */
  extractTailwindTokensFromSource(source) {
    const tokens = new Set();
    
    // Tailwind class patterns
    const tailwindPatterns = [
      // Colors
      /\b(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d+|50)\b/g,
      // Spacing
      /\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr)-(\d+|px|0\.5|1\.5|2\.5|3\.5)\b/g,
      // Sizing
      /\b(w|h)-(full|screen|fit|auto|\d+|1\/2|1\/3|2\/3|1\/4|3\/4)\b/g,
      // Border radius
      /\brounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?\b/g,
      // Typography
      /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/g,
      // Font weight
      /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g
    ];

    tailwindPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(source)) !== null) {
        const fullClass = match[0];
        const tokenName = this.mapTailwindToToken(fullClass);
        if (tokenName) {
          tokens.add(tokenName);
        }
      }
    });

    return Array.from(tokens).sort();
  }

  mapTailwindToToken(tailwindClass) {
    // Map Tailwind classes to semantic token names
    const classToToken = {
      // Colors
      'bg-primary': 'color.background.primary',
      'text-primary': 'color.text.primary',
      'border-primary': 'color.border.primary',
      'bg-secondary': 'color.background.secondary',
      'text-secondary': 'color.text.secondary',
      'text-muted-foreground': 'color.text.muted',
      'bg-muted': 'color.background.muted',
      'border-input': 'color.border.input',
      'bg-accent': 'color.background.accent',
      'text-accent-foreground': 'color.text.accent',
      
      // Spacing
      'p-2': 'spacing.2',
      'p-4': 'spacing.4',
      'p-6': 'spacing.6',
      'm-2': 'spacing.2',
      'm-4': 'spacing.4',
      'px-4': 'spacing.4',
      'py-2': 'spacing.2',
      
      // Border radius
      'rounded-md': 'radius.md',
      'rounded-lg': 'radius.lg',
      'rounded-sm': 'radius.sm',
      'rounded': 'radius.default',
      
      // Typography
      'text-sm': 'typography.size.sm',
      'text-base': 'typography.size.base',
      'text-lg': 'typography.size.lg',
      'font-medium': 'typography.weight.medium',
      'font-semibold': 'typography.weight.semibold'
    };

    return classToToken[tailwindClass] || this.inferTokenFromClass(tailwindClass);
  }

  inferTokenFromClass(tailwindClass) {
    // Fallback inference for unmapped classes
    if (tailwindClass.startsWith('bg-')) return `color.background.${tailwindClass.slice(3)}`;
    if (tailwindClass.startsWith('text-')) return `color.text.${tailwindClass.slice(5)}`;
    if (tailwindClass.startsWith('border-')) return `color.border.${tailwindClass.slice(7)}`;
    if (tailwindClass.startsWith('p-') || tailwindClass.startsWith('m-')) return `spacing.${tailwindClass.slice(2)}`;
    if (tailwindClass.startsWith('rounded')) return `radius.${tailwindClass.slice(8) || 'default'}`;
    
    return null;
  }

  /**
   * Extract Radix primitive composition
   */
  extractRadixComposition(ast, source) {
    const radixImports = [];
    const radixUsage = [];

    traverse.default(ast, {
      // Track Radix imports
      ImportDeclaration: (path) => {
        if (path.node.source.value.includes('@radix-ui/')) {
          const packageName = path.node.source.value;
          path.node.specifiers.forEach(spec => {
            if (t.isImportSpecifier(spec)) {
              radixImports.push({
                name: spec.imported.name,
                alias: spec.local.name,
                package: packageName
              });
            }
          });
        }
      },

      // Track Radix component usage
      JSXElement: (path) => {
        const elementName = path.node.openingElement.name;
        if (t.isJSXMemberExpression(elementName)) {
          const objectName = elementName.object.name;
          const propertyName = elementName.property.name;
          
          const radixImport = radixImports.find(imp => imp.alias === objectName);
          if (radixImport) {
            radixUsage.push({
              component: `${objectName}.${propertyName}`,
              package: radixImport.package,
              primitive: radixImport.name
            });
          }
        }
      }
    });

    return {
      radixPrimitives: radixImports,
      radixUsage,
      hasRadixComposition: radixImports.length > 0
    };
  }

  /**
   * Detect asChild pattern usage
   */
  detectAsChildUsage(ast) {
    let hasAsChild = false;
    let implementation = 'unknown';

    traverse.default(ast, {
      // Look for asChild prop usage
      JSXAttribute: (path) => {
        if (t.isJSXIdentifier(path.node.name, { name: 'asChild' })) {
          hasAsChild = true;
          implementation = 'prop';
        }
      },

      // Look for asChild in prop types
      TSPropertySignature: (path) => {
        if (t.isIdentifier(path.node.key, { name: 'asChild' })) {
          hasAsChild = true;
          implementation = 'typescript';
        }
      },

      // Look for Slot usage (common asChild implementation)
      JSXElement: (path) => {
        const elementName = path.node.openingElement.name;
        if (t.isJSXIdentifier(elementName, { name: 'Slot' })) {
          hasAsChild = true;
          implementation = 'slot';
        }
      }
    });

    return { hasAsChild, implementation };
  }

  /**
   * Detect ShadCN version from package.json or comments
   */
  detectShadCNVersion(source) {
    // Look for version comments or imports
    const versionMatch = source.match(/@shadcn\/ui@([\d.]+)/);
    if (versionMatch) {
      return versionMatch[1];
    }
    
    return 'unknown';
  }

  /**
   * Override category inference for ShadCN components
   */
  inferCategory(componentName) {
    const name = componentName.toLowerCase();
    
    // ShadCN-specific categories
    if (name.includes('alert')) return 'feedback';
    if (name.includes('badge')) return 'display';
    if (name.includes('command')) return 'navigation';
    if (name.includes('popover') || name.includes('tooltip')) return 'overlay';
    if (name.includes('sheet') || name.includes('drawer')) return 'overlay';
    if (name.includes('calendar') || name.includes('date')) return 'forms';
    if (name.includes('avatar')) return 'display';
    if (name.includes('separator')) return 'layout';
    if (name.includes('progress')) return 'feedback';
    if (name.includes('skeleton')) return 'feedback';
    if (name.includes('switch') || name.includes('checkbox')) return 'forms';
    if (name.includes('select') || name.includes('combobox')) return 'forms';
    if (name.includes('table')) return 'data-display';
    if (name.includes('tabs')) return 'navigation';
    
    // Fall back to parent logic
    return super.inferCategory(componentName);
  }
}

// Default export for easy importing
export default ShadCNReactTSXAdaptor;