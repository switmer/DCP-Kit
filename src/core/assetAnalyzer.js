/**
 * Asset & Icon Awareness Detector
 * Identifies asset requirements, missing resources, and provides
 * intelligent suggestions for component integration
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

export class AssetAnalyzer {
  constructor(sourceDir) {
    this.sourceDir = sourceDir;
    this.imageProps = new Map();
    this.iconUsage = new Map();
    this.assetPaths = new Set();
    this.missingAssets = [];
    this.staticAssets = new Set();
  }

  /**
   * Analyze component for asset usage
   */
  async analyzeComponent(filePath, sourceCode, componentProps = []) {
    try {
      const ast = parse(sourceCode, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy']
      });

      const assetData = {
        filePath,
        imageProps: [],
        iconComponents: [],
        staticAssets: [],
        assetRequirements: []
      };

      // Analyze props for image/asset patterns
      this.analyzePropsForAssets(componentProps, assetData);

      traverse.default(ast, {
        ImportDeclaration: (nodePath) => {
          this.analyzeAssetImports(nodePath.node, assetData);
        },
        
        JSXElement: (nodePath) => {
          this.analyzeJSXForAssets(nodePath.node, assetData);
        },

        JSXAttribute: (nodePath) => {
          this.analyzeJSXAttributes(nodePath.node, assetData);
        },

        StringLiteral: (nodePath) => {
          this.analyzeStringLiteralsForAssets(nodePath.node, assetData);
        }
      });

      await this.validateAssetPaths(assetData);
      this.generateAssetSuggestions(assetData);

      return assetData;

    } catch (error) {
      console.warn(`Warning: Could not analyze assets for ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Analyze component props for asset patterns
   */
  analyzePropsForAssets(props, assetData) {
    const assetPropPatterns = [
      /^(image|img|icon|avatar|logo|thumbnail|photo|picture)$/i,
      /^.*[Ii]mage.*$/,
      /^.*[Ii]con.*$/,
      /^.*[Aa]vatar.*$/,
      /^.*[Ll]ogo.*$/,
      /^.*[Uu]rl$/,
      /^.*[Ss]rc$/
    ];

    props.forEach(prop => {
      const isAssetProp = assetPropPatterns.some(pattern => pattern.test(prop.name));
      
      if (isAssetProp) {
        assetData.imageProps.push({
          name: prop.name,
          type: prop.type || 'string',
          required: prop.required || false,
          category: this.categorizeAssetProp(prop.name)
        });

        assetData.assetRequirements.push({
          prop: prop.name,
          category: this.categorizeAssetProp(prop.name),
          suggestion: this.generateAssetSuggestion(prop.name, prop.type)
        });
      }
    });
  }

  /**
   * Categorize asset prop type
   */
  categorizeAssetProp(propName) {
    const lower = propName.toLowerCase();
    
    if (lower.includes('avatar') || lower.includes('profile')) return 'avatar';
    if (lower.includes('icon')) return 'icon';
    if (lower.includes('logo')) return 'logo';
    if (lower.includes('thumb')) return 'thumbnail';
    if (lower.includes('background') || lower.includes('bg')) return 'background';
    
    return 'image';
  }

  /**
   * Generate asset suggestion based on prop
   */
  generateAssetSuggestion(propName, propType) {
    const category = this.categorizeAssetProp(propName);
    
    const suggestions = {
      avatar: 'Use generated avatars from UI Avatar or similar service for missing user images',
      icon: 'Use Lucide React or Heroicons for consistent iconography',
      logo: 'Provide company/brand logo in SVG format for scalability',
      thumbnail: 'Generate placeholder thumbnails with consistent aspect ratios',
      background: 'Use CSS gradients or pattern generators for missing backgrounds',
      image: 'Provide sample images or use placeholder services like Unsplash'
    };

    return suggestions[category] || 'Provide appropriate asset or fallback placeholder';
  }

  /**
   * Analyze imports for asset dependencies
   */
  analyzeAssetImports(node, assetData) {
    const source = node.source.value;
    
    // Detect icon library imports
    const iconLibraries = {
      'lucide-react': 'Lucide',
      'react-icons': 'React Icons',
      'heroicons': 'Heroicons',
      '@heroicons/react': 'Heroicons',
      'feather-icons': 'Feather',
      'react-feather': 'React Feather'
    };

    if (iconLibraries[source]) {
      node.specifiers.forEach(spec => {
        if (t.isImportSpecifier(spec)) {
          assetData.iconComponents.push({
            name: spec.imported.name,
            library: iconLibraries[source],
            source: source
          });
        }
      });
    }

    // Detect static asset imports
    const assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
    if (assetExtensions.some(ext => source.endsWith(ext))) {
      assetData.staticAssets.push({
        path: source,
        type: path.extname(source).slice(1),
        isLocal: source.startsWith('.') || source.startsWith('/')
      });
    }
  }

  /**
   * Analyze JSX elements for asset usage
   */
  analyzeJSXForAssets(node, assetData) {
    if (t.isJSXIdentifier(node.openingElement.name)) {
      const elementName = node.openingElement.name.name;
      
      // Detect icon component usage
      if (this.isIconComponent(elementName)) {
        assetData.iconComponents.push({
          name: elementName,
          usage: 'jsx-element',
          props: this.extractJSXProps(node.openingElement.attributes)
        });
      }

      // Detect image elements
      if (elementName === 'img' || elementName === 'Image') {
        const srcProp = node.openingElement.attributes.find(attr => 
          t.isJSXAttribute(attr) && attr.name.name === 'src'
        );
        
        if (srcProp) {
          assetData.staticAssets.push({
            element: elementName,
            src: this.extractJSXPropValue(srcProp.value),
            type: 'jsx-image'
          });
        }
      }
    }
  }

  /**
   * Check if component name indicates an icon
   */
  isIconComponent(name) {
    // Common icon component patterns
    const iconPatterns = [
      /Icon$/,
      /^[A-Z][a-z]*Icon/,
      // Lucide icon names (PascalCase)
      /^[A-Z][a-z]+[A-Z]/,
      // Common icon names
      /^(Check|Close|Menu|Search|Arrow|Plus|Minus|Edit|Delete|Save|Cancel|Info|Warning|Error|Success|Home|User|Settings|Help|Star|Heart|Eye|Lock|Key)$/
    ];

    return iconPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Analyze JSX attributes for asset references
   */
  analyzeJSXAttributes(node, assetData) {
    if (t.isJSXAttribute(node) && node.value) {
      const attrName = node.name.name;
      const assetAttributes = ['src', 'href', 'data-src', 'backgroundImage', 'iconSrc'];
      
      if (assetAttributes.includes(attrName)) {
        const value = this.extractJSXPropValue(node.value);
        if (typeof value === 'string' && this.looksLikeAssetPath(value)) {
          assetData.staticAssets.push({
            attribute: attrName,
            value: value,
            type: 'jsx-attribute'
          });
        }
      }
    }
  }

  /**
   * Extract JSX prop value
   */
  extractJSXPropValue(value) {
    if (t.isStringLiteral(value)) {
      return value.value;
    } else if (t.isJSXExpressionContainer(value) && t.isStringLiteral(value.expression)) {
      return value.expression.value;
    }
    return null;
  }

  /**
   * Extract JSX props for analysis
   */
  extractJSXProps(attributes) {
    return attributes.map(attr => {
      if (t.isJSXAttribute(attr)) {
        return {
          name: attr.name.name,
          value: this.extractJSXPropValue(attr.value)
        };
      }
      return null;
    }).filter(Boolean);
  }

  /**
   * Analyze string literals for asset paths
   */
  analyzeStringLiteralsForAssets(node, assetData) {
    const value = node.value;
    
    if (this.looksLikeAssetPath(value)) {
      assetData.staticAssets.push({
        path: value,
        type: 'string-literal',
        extension: path.extname(value).slice(1)
      });
    }
  }

  /**
   * Check if string looks like an asset path
   */
  looksLikeAssetPath(str) {
    if (typeof str !== 'string') return false;
    
    const assetPatterns = [
      /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i,
      /^\/images?\//,
      /^\/assets?\//,
      /^\/static\//,
      /^\/public\//,
      /placeholder\.svg/,
      /unsplash\.com/,
      /picsum\.photos/
    ];

    return assetPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Validate asset paths exist
   */
  async validateAssetPaths(assetData) {
    for (const asset of assetData.staticAssets) {
      if (asset.path && (asset.path.startsWith('./') || asset.path.startsWith('/'))) {
        const assetPath = path.resolve(this.sourceDir, asset.path);
        
        try {
          await fs.access(assetPath);
          asset.exists = true;
        } catch (error) {
          asset.exists = false;
          this.missingAssets.push({
            path: asset.path,
            component: assetData.filePath,
            type: asset.type || 'unknown'
          });
        }
      }
    }
  }

  /**
   * Generate asset suggestions and recommendations
   */
  generateAssetSuggestions(assetData) {
    const suggestions = [];

    // Missing static assets
    assetData.staticAssets.forEach(asset => {
      if (asset.exists === false) {
        suggestions.push({
          type: 'missing-asset',
          path: asset.path,
          suggestion: `Create or provide asset at ${asset.path}`,
          alternatives: this.suggestAssetAlternatives(asset.path)
        });
      }
    });

    // Icon usage recommendations
    const iconLibraries = new Set(assetData.iconComponents.map(icon => icon.library).filter(Boolean));
    if (iconLibraries.size > 1) {
      suggestions.push({
        type: 'consistency',
        issue: 'Multiple icon libraries detected',
        suggestion: 'Consider standardizing on a single icon library for consistency',
        libraries: Array.from(iconLibraries)
      });
    }

    // Asset optimization suggestions
    if (assetData.staticAssets.some(asset => asset.path && asset.path.includes('.jpg'))) {
      suggestions.push({
        type: 'optimization',
        suggestion: 'Consider using WebP format for better compression and performance'
      });
    }

    assetData.suggestions = suggestions;
  }

  /**
   * Suggest asset alternatives
   */
  suggestAssetAlternatives(assetPath) {
    const ext = path.extname(assetPath).slice(1);
    const basename = path.basename(assetPath, path.extname(assetPath));
    
    const alternatives = [];

    if (['jpg', 'jpeg', 'png'].includes(ext)) {
      alternatives.push(`Use Unsplash placeholder: https://source.unsplash.com/400x300/?${basename}`);
      alternatives.push(`Use Picsum placeholder: https://picsum.photos/400/300`);
    }

    if (basename.toLowerCase().includes('avatar') || basename.toLowerCase().includes('profile')) {
      alternatives.push(`Use UI Avatar generator: https://ui-avatars.com/api/?name=${basename}&size=128`);
    }

    if (ext === 'svg' && basename.toLowerCase().includes('icon')) {
      alternatives.push('Use Heroicons or Lucide React for consistent SVG icons');
    }

    return alternatives;
  }

  /**
   * Generate comprehensive asset report
   */
  generateReport() {
    return {
      summary: {
        imagePropsFound: this.imageProps.size,
        iconComponentsFound: this.iconUsage.size,
        staticAssetsFound: this.staticAssets.size,
        missingAssets: this.missingAssets.length
      },
      imageProps: Array.from(this.imageProps.entries()),
      iconUsage: Array.from(this.iconUsage.entries()),
      staticAssets: Array.from(this.staticAssets),
      missingAssets: this.missingAssets,
      recommendations: this.generateGlobalRecommendations()
    };
  }

  /**
   * Generate global asset recommendations
   */
  generateGlobalRecommendations() {
    const recommendations = [];

    if (this.missingAssets.length > 0) {
      recommendations.push({
        priority: 'high',
        type: 'missing-assets',
        message: `${this.missingAssets.length} missing assets detected`,
        action: 'Provide assets or implement fallback mechanisms'
      });
    }

    recommendations.push({
      priority: 'medium',
      type: 'asset-organization',
      message: 'Organize assets in consistent directory structure',
      action: 'Use /public/images or /assets directories'
    });

    recommendations.push({
      priority: 'low',
      type: 'optimization',
      message: 'Consider asset optimization',
      action: 'Use next/image, lazy loading, and modern formats (WebP, AVIF)'
    });

    return recommendations;
  }
}