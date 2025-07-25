import { ThemeHandler } from './themeHandler.js';
import { extractThemeContext } from './themeExtractor.js';
import path from 'path';
import fs from 'fs';

/**
 * Shared theme analysis service for adaptors
 * Provides theme-aware component enhancement
 */
export class ThemeAnalyzer {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.themeHandler = new ThemeHandler();
    this.projectThemeCache = new Map();
  }

  /**
   * Enhance a component with theme-aware variant analysis
   * @param {Object} component - Component object from adaptor
   * @param {string} source - Component source code
   * @param {string} filePath - Component file path
   * @returns {Object} Enhanced component with theme context
   */
  async enhanceComponentWithTheme(component, source, filePath) {
    try {
      const projectRoot = this.findProjectRoot(filePath);
      
      // Get or cache project theme context
      let projectTheme = this.projectThemeCache.get(projectRoot);
      if (!projectTheme) {
        projectTheme = await extractThemeContext(projectRoot, { verbose: this.verbose });
        this.projectThemeCache.set(projectRoot, projectTheme);
        
        if (this.verbose) {
          console.log(`🎨 [ThemeAnalyzer] Loaded theme context for ${projectRoot}`);
        }
      }

      // If no real theme config exists, don't fake it
      if (!projectTheme || !projectTheme.config) {
        if (this.verbose) {
          console.log(`   ⚪ No theme config found for ${component.name} - skipping theme enhancement`);
        }
        return component; // Return component unchanged
      }

      // Extract variant style mappings from component source
      const variantMappings = this.extractVariantStyleMappings(source, projectTheme);
      
      // Only enhance if we have real theme data
      const enhancedComponent = {
        ...component,
        themeContext: {
          config: projectTheme.config,
          variantMappings,
          utilityMappings: this.getRelevantUtilityMappings(source, projectTheme),
          projectTheme: projectTheme.metadata
        }
      };

      if (this.verbose && Object.keys(variantMappings).length > 0) {
        console.log(`   🎨 Enhanced ${component.name} with ${Object.keys(variantMappings).length} variant mappings`);
      }

      return enhancedComponent;

    } catch (error) {
      if (this.verbose) {
        console.warn(`[ThemeAnalyzer] Failed to enhance ${component.name}: ${error.message}`);
      }
      return component; // Return original component if enhancement fails
    }
  }

  /**
   * Extract variant style mappings from component source
   */
  extractVariantStyleMappings(source, projectTheme) {
    const variantMappings = {};
    
    // Extract object literals that define variant classes
    const variantObjectRegex = /const\s+(\w*[Cc]lasses?|\w*[Vv]ariants?)\s*=\s*\{([^}]+)\}/g;
    let match;
    
    while ((match = variantObjectRegex.exec(source)) !== null) {
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
        const utilityMappings = this.getUtilityMappingsForClasses(allClasses, projectTheme);
        
        variantMappings[varName] = {
          variants,
          classes: allClasses,
          utilityMappings,
          computedStyles: this.computeStylesForClasses(allClasses, projectTheme)
        };
      }
    }
    
    return variantMappings;
  }

  /**
   * Get utility mappings for specific classes
   */
  getUtilityMappingsForClasses(classes, projectTheme) {
    const mappings = {};
    
    if (!projectTheme.utilityMappings) return mappings;
    
    classes.forEach(className => {
      if (projectTheme.utilityMappings[className]) {
        mappings[className] = projectTheme.utilityMappings[className];
      }
    });
    
    return mappings;
  }

  /**
   * Get relevant utility mappings from component source
   */
  getRelevantUtilityMappings(source, projectTheme) {
    const mappings = {};
    
    if (!projectTheme.utilityMappings) return mappings;
    
    // Find utility classes used in the component
    const classRegex = /className\s*=\s*["`']([^"`']*)["`']/g;
    let match;
    
    while ((match = classRegex.exec(source)) !== null) {
      const classes = match[1].split(' ').filter(Boolean);
      classes.forEach(className => {
        if (projectTheme.utilityMappings[className]) {
          mappings[className] = projectTheme.utilityMappings[className];
        }
      });
    }
    
    return mappings;
  }

  /**
   * Compute styles for classes using project theme
   */
  computeStylesForClasses(classes, projectTheme) {
    const styles = { light: {}, dark: {} };
    
    if (!projectTheme.cssVariables) return styles;
    
    classes.forEach(className => {
      const mapping = projectTheme.utilityMappings?.[className];
      if (mapping && mapping.computed) {
        const property = this.getStyleProperty(className);
        if (property) {
          styles.light[property] = mapping.computed.light;
          styles.dark[property] = mapping.computed.dark;
        }
      }
    });
    
    return styles;
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
   * Find project root directory
   */
  findProjectRoot(filePath) {
    let dir = path.dirname(filePath);
    
    while (dir !== path.dirname(dir)) {
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

  /**
   * Clear project theme cache (useful for testing)
   */
  clearCache() {
    this.projectThemeCache.clear();
  }
} 