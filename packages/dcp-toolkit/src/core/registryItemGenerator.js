import path from 'path';
import fs from 'fs/promises'; 
import { kebabCase, camelCase } from './utils.js';
import { CSSVarsExtractor } from '../extractors/cssVarsExtractor.js';
import { BlockPatternDetector } from '../extractors/blockPatternDetector.js';

/**
 * RegistryItemGenerator - Transforms DCP component output to ShadCN-compatible registry items
 * 
 * Features:
 * - Converts DCP schema to ShadCN registry-item format
 * - Smart dependency detection (npm + registry)
 * - Multi-file component handling
 * - Target path generation for installation
 * - Inline content support for zero-fetch installs
 * - Custom target path overrides via config
 */
export class RegistryItemGenerator {
  constructor(projectConfig = {}) {
    this.projectConfig = projectConfig;
    this.knownRegistryComponents = new Set([
      'button', 'input', 'label', 'card', 'dialog', 'drawer', 'popover',
      'tooltip', 'select', 'switch', 'checkbox', 'radio-group', 'tabs',
      'accordion', 'alert', 'avatar', 'badge', 'breadcrumb', 'calendar',
      'command', 'dropdown-menu', 'form', 'hover-card', 'menubar',
      'navigation-menu', 'pagination', 'progress', 'scroll-area',
      'separator', 'sheet', 'skeleton', 'slider', 'table', 'textarea',
      'toggle', 'toggle-group', 'utils'
    ]);
    
    // Initialize extractors
    this.cssVarsExtractor = new CSSVarsExtractor({
      includeFallbacks: projectConfig.includeFallbacks || false,
      confidenceThreshold: projectConfig.confidenceThreshold || 0.5,
      shadcnMode: projectConfig.shadcnMode !== false
    });
    
    this.blockPatternDetector = new BlockPatternDetector({
      minComponentsForBlock: projectConfig.minComponentsForBlock || 3,
      layoutPatterns: projectConfig.layoutPatterns,
      complexPatterns: projectConfig.complexPatterns
    });
  }

  /**
   * Transform a DCP component to ShadCN registry item format
   */
  async transformDCPToShadCN(dcpComponent, sourceCode = '', filePath = '') {
    // Validate input component
    if (!dcpComponent || typeof dcpComponent !== 'object') {
      throw new Error('Invalid DCP component: component is null or not an object');
    }
    
    if (!dcpComponent.name) {
      throw new Error(`Invalid DCP component: missing name property. Component: ${JSON.stringify(dcpComponent, null, 2)}`);
    }
    
    const registryName = this.generateRegistryName(dcpComponent.name);
    const dependencies = await this.extractNpmDependencies(sourceCode);
    const registryDeps = await this.extractRegistryDependencies(sourceCode, dcpComponent);
    const files = await this.generateFiles(dcpComponent, filePath, sourceCode);
    const registryType = await this.inferRegistryType(dcpComponent, filePath, sourceCode);
    
    const registryItem = {
      "$schema": "https://ui.shadcn.com/schema/registry-item.json",
      "name": registryName,
      "type": registryType,
      "title": dcpComponent.name,
      "description": dcpComponent.description || `${dcpComponent.name} component`,
      "files": files
    };

    // Add dependencies if found
    if (dependencies.length > 0) {
      registryItem.dependencies = dependencies;
    }

    // Add registry dependencies if found
    if (registryDeps.length > 0) {
      registryItem.registryDependencies = registryDeps;
    }

    // Add CSS variables using modular extractor
    const cssVarsResult = await this.cssVarsExtractor.extractCSSVars(dcpComponent, sourceCode, filePath);
    if (Object.keys(cssVarsResult.cssVars).length > 0) {
      registryItem.cssVars = cssVarsResult.cssVars;
      
      // Add metadata for debugging/confidence tracking
      if (cssVarsResult.metadata && this.projectConfig.includeCSSMetadata) {
        registryItem.meta = registryItem.meta || {};
        registryItem.meta.cssVarsMetadata = cssVarsResult.metadata;
      }
    }

    // Add block pattern metadata for registry:block items
    if (registryType === 'registry:block' && sourceCode) {
      const blockAnalysis = await this.blockPatternDetector.analyzeForBlockPatterns(
        dcpComponent, sourceCode, filePath
      );
      
      if (blockAnalysis.isBlock) {
        registryItem.meta = registryItem.meta || {};
        registryItem.meta.blockPatterns = {
          confidence: blockAnalysis.confidence,
          patterns: blockAnalysis.patterns,
          suggestedType: blockAnalysis.suggestedBlockType
        };

        // Enhance description with block pattern information
        const primaryPattern = blockAnalysis.patterns.find(p => p.confidence > 0.7);
        if (primaryPattern && primaryPattern.description) {
          registryItem.description = primaryPattern.description;
        }
      }
    }

    // DCP Enhancement: Add production context if available
    if (dcpComponent.productionContext) {
      registryItem.meta = {
        dcpContext: dcpComponent.productionContext
      };
    }

    // Add interaction metadata from DCP analysis
    if (dcpComponent.interactions || dcpComponent.accessibility) {
      registryItem.meta = registryItem.meta || {};
      if (dcpComponent.interactions) {
        registryItem.meta.interactions = dcpComponent.interactions;
      }
      if (dcpComponent.accessibility) {
        registryItem.meta.accessibility = dcpComponent.accessibility;
      }
    }

    return registryItem;
  }

  /**
   * Generate kebab-case registry name from component name
   */
  generateRegistryName(componentName) {
    return kebabCase(componentName);
  }

  /**
   * Infer ShadCN registry type based on component characteristics
   */
  async inferRegistryType(component, filePath = '', sourceCode = '') {
    // Style detection - design system themes and global styles
    if (this.isStyleComponent(component, filePath)) {
      return "registry:style";
    }

    // Theme detection - pure CSS variable definitions
    if (this.isThemeComponent(component, filePath)) {
      return "registry:theme";
    }

    // Block pattern detection (enhanced)
    if (sourceCode) {
      const blockAnalysis = await this.blockPatternDetector.analyzeForBlockPatterns(
        component, sourceCode, filePath
      );
      
      if (blockAnalysis.isBlock && blockAnalysis.confidence > 0.6) {
        return blockAnalysis.suggestedBlockType;
      }
    }

    // Legacy block detection fallback
    if (component.composition?.subComponents?.length > 3) {
      return "registry:block";
    }

    // File path based detection
    if (filePath.includes('/hooks/') || filePath.includes('use') || component.name.startsWith('use')) {
      return "registry:hook";
    }
    
    if (filePath.includes('/lib/') || filePath.includes('/utils/')) {
      return "registry:lib";
    }

    if (filePath.includes('/pages/') || filePath.includes('page.')) {
      return "registry:page";
    }

    // Components with many variants or complex props = component
    const variantCount = Object.keys(component.variants || {}).length;
    const propCount = Object.keys(component.props || {}).length;
    
    if (variantCount > 2 || propCount > 8) {
      return "registry:component";
    }

    // Default to UI component
    return "registry:ui";
  }

  /**
   * Check if component represents a style (theme + components)
   */
  isStyleComponent(component, filePath) {
    // File path indicators
    const styleFiles = [
      'theme.', 'globals.css', 'style.css', 'styles.css',
      'tailwind.config', 'index.css', 'main.css', 'app.css'
    ];
    
    if (styleFiles.some(file => filePath.includes(file))) {
      return true;
    }

    // Component with rich token context
    if (component.tokens && (
      component.tokens.colors || 
      component.tokens.typography || 
      component.tokens.spacing
    )) {
      return true;
    }

    // Theme context with multiple components
    if (component.themeContext?.projectTheme && component.composition?.subComponents?.length > 0) {
      return true;
    }

    // Named as theme/style component
    const name = component.name?.toLowerCase() || '';
    if (name.includes('theme') || name.includes('style') || name.includes('design')) {
      return true;
    }

    return false;
  }

  /**
   * Check if component represents a pure theme (CSS vars only)
   */
  isThemeComponent(component, filePath) {
    // File path indicators for theme-only files
    if (filePath.includes('theme.json') || filePath.includes('tokens.json')) {
      return true;
    }

    // Pure CSS variables with no component code
    if (component.themeContext && !component.props && !component.composition) {
      return true;
    }

    // Only CSS vars and no functional component
    if (component.tokens && !component.props && !component.name?.endsWith('Component')) {
      return true;
    }

    return false;
  }

  /**
   * Extract npm dependencies from source code
   */
  async extractNpmDependencies(sourceCode) {
    if (!sourceCode) return [];

    const dependencies = new Set();
    
    // Match import statements
    const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"@]([^'"/][^'"]*)['"]/g;
    let match;
    
    while ((match = importRegex.exec(sourceCode)) !== null) {
      const importPath = match[1];
      
      // Skip relative imports
      if (importPath.startsWith('.')) continue;
      
      // Extract package name (handle scoped packages)
      const packageName = importPath.startsWith('@') 
        ? importPath.split('/').slice(0, 2).join('/')
        : importPath.split('/')[0];
      
      // Common ShadCN dependencies
      if (this.isKnownNpmDependency(packageName)) {
        dependencies.add(packageName);
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Check if a package is a known npm dependency
   */
  isKnownNpmDependency(packageName) {
    const knownDeps = [
      '@radix-ui/react-slot',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'lucide-react',
      'react-hook-form',
      'zod',
      '@hookform/resolvers',
      'date-fns',
      'react-day-picker',
      'sonner',
      'vaul'
    ];
    
    return knownDeps.includes(packageName);
  }

  /**
   * Extract registry dependencies (other ShadCN components used)
   */
  async extractRegistryDependencies(sourceCode, component) {
    if (!sourceCode) return [];

    const registryDeps = new Set();
    
    // Look for component usage in JSX
    const jsxComponentRegex = /<([A-Z][A-Za-z0-9]*)/g;
    let match;
    
    while ((match = jsxComponentRegex.exec(sourceCode)) !== null) {
      const componentName = match[1];
      const registryName = kebabCase(componentName);
      
      if (this.knownRegistryComponents.has(registryName)) {
        registryDeps.add(registryName);
      }
    }

    // Look for utility function usage
    if (sourceCode.includes('cn(')) {
      registryDeps.add('utils');
    }

    // Remove self-reference
    const selfName = kebabCase(component.name);
    registryDeps.delete(selfName);

    return Array.from(registryDeps);
  }

  /**
   * Generate file entries for the registry item
   */
  async generateFiles(component, filePath, sourceCode = '') {
    const files = [];
    
    if (!filePath) return files;

    // Main component file
    const mainFile = {
      path: this.normalizeRegistryPath(filePath),
      type: this.inferFileType(filePath)
    };

    // Add target for certain file types or when specified in config
    const target = this.generateTarget(mainFile.type, component.name, filePath);
    if (target) {
      mainFile.target = target;
    }

    // Add inline content if available and config enables zero-fetch
    if (sourceCode && this.projectConfig.inlineContent) {
      mainFile.content = sourceCode;
    }

    files.push(mainFile);

    // Look for associated files in the same directory
    try {
      const componentDir = path.dirname(filePath);
      const componentName = component.name;
      
      const associatedFiles = await this.findAssociatedFiles(componentDir, componentName);
      
      for (const file of associatedFiles) {
        const fileEntry = {
          path: this.normalizeRegistryPath(file.path),
          type: this.inferFileType(file.path)
        };

        // Add inline content for associated files if enabled
        if (this.projectConfig.inlineContent && file.content) {
          fileEntry.content = file.content;
        }

        // Add target for associated files if needed
        const associatedTarget = this.generateTarget(fileEntry.type, component.name, file.path);
        if (associatedTarget) {
          fileEntry.target = associatedTarget;
        }

        files.push(fileEntry);
      }
    } catch (error) {
      // Silently continue if we can't read the directory
    }

    return files;
  }

  /**
   * Find associated files (styles, hooks, tests, stories)
   */
  async findAssociatedFiles(componentDir, componentName) {
    const files = [];
    const baseName = componentName.toLowerCase();
    
    const patterns = [
      `${baseName}.css`,
      `${baseName}.module.css`,
      `${componentName}.css`,
      `${componentName}.module.css`,
      `use${componentName}.ts`,
      `use${componentName}.tsx`,
      `use-${kebabCase(componentName)}.ts`,
      `use-${kebabCase(componentName)}.tsx`,
      `${componentName}.test.tsx`,
      `${componentName}.test.ts`,
      `${componentName}.stories.tsx`,
      `${componentName}.stories.ts`,
      `index.css`,
      `styles.css`
    ];

    for (const pattern of patterns) {
      const filePath = path.join(componentDir, pattern);
      
      try {
        await fs.access(filePath);
        
        const fileEntry = { path: filePath };
        
        // Read file content if inline content is enabled
        if (this.projectConfig.inlineContent) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            fileEntry.content = content;
          } catch (readError) {
            // Skip files we can't read
            continue;
          }
        }
        
        files.push(fileEntry);
      } catch (error) {
        // File doesn't exist, continue
      }
    }

    return files;
  }

  /**
   * Infer file type from path
   */
  inferFileType(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.includes('.css') || fileName.includes('.scss')) {
      return 'registry:style';
    }
    
    if (fileName.includes('use') && (fileName.includes('.ts') || fileName.includes('.tsx'))) {
      return 'registry:hook';
    }
    
    if (fileName.includes('.test.') || fileName.includes('.spec.')) {
      return 'registry:test';
    }
    
    if (fileName.includes('.stories.')) {
      return 'registry:story';
    }
    
    if (filePath.includes('/lib/') || filePath.includes('/utils/')) {
      return 'registry:lib';
    }
    
    if (filePath.includes('/pages/') || fileName.includes('page.')) {
      return 'registry:page';
    }
    
    return 'registry:component';
  }

  /**
   * Normalize file path for registry
   */
  normalizeRegistryPath(filePath) {
    // Convert absolute paths to relative from project root
    // This is a simplified version - should be enhanced based on project structure
    return filePath.replace(/^.*\/src\//, 'src/');
  }

  /**
   * Generate installation target path based on file type and config
   */
  generateTarget(fileType, componentName, filePath = '') {
    // Check for custom target mappings in config
    const customTargets = this.projectConfig.targetPaths || {};
    const fileName = path.basename(filePath);
    
    // Custom override from config
    if (customTargets[fileName]) {
      return customTargets[fileName];
    }
    
    // File type specific targets
    switch (fileType) {
      case 'registry:page':
        const pageName = kebabCase(componentName);
        return `app/${pageName}/page.tsx`;
        
      case 'registry:hook':
        return `lib/hooks/${fileName}`;
        
      case 'registry:lib':
        return `lib/${fileName}`;
        
      case 'registry:style':
        if (fileName.includes('globals') || fileName.includes('index')) {
          return `app/globals.css`;
        }
        return `lib/styles/${fileName}`;
        
      case 'registry:theme':
        return `lib/theme/${fileName}`;
        
      case 'registry:test':
        return `__tests__/${fileName}`;
        
      case 'registry:story':
        return `stories/${fileName}`;
        
      default:
        // Return null for components that should use default paths
        return null;
    }
  }

}