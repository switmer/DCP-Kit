/**
 * Universal Token Detection System
 * Automatically detects token sources in any codebase
 */

import fs from 'fs';
import path from 'path';

export class TokenDetector {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.detectedSources = [];
  }

  /**
   * Auto-detect all token sources in the project
   */
  async detectAll() {
    this.detectedSources = [];
    
    await Promise.all([
      this.detectRadixTokens(),
      this.detectMUITokens(),
      this.detectTailwindConfig(),
      this.detectCSSVariables(),
      this.detectStyleDictionary(),
      this.detectCustomTokens(),
      this.detectFigmaTokens()
    ]);

    return this.detectedSources;
  }

  /**
   * Detect Radix UI tokens
   */
  async detectRadixTokens() {
    const indicators = [
      'node_modules/@radix-ui/themes',
      'node_modules/@radix-ui/colors',
      '.radixthemes.config.js',
      'radix.config.js'
    ];

    for (const indicator of indicators) {
      const fullPath = path.join(this.rootPath, indicator);
      if (fs.existsSync(fullPath)) {
        this.detectedSources.push({
          type: 'radix',
          path: fullPath,
          confidence: 0.9,
          description: 'Radix UI theme tokens'
        });
        break;
      }
    }
  }

  /**
   * Detect MUI tokens/theme
   */
  async detectMUITokens() {
    const indicators = [
      'node_modules/@mui/material',
      'src/theme.js',
      'src/theme.ts',
      'theme/index.js',
      'styles/theme.js'
    ];

    for (const indicator of indicators) {
      const fullPath = path.join(this.rootPath, indicator);
      if (fs.existsSync(fullPath)) {
        // Check if it's actually MUI theme
        if (indicator.includes('node_modules/@mui')) {
          this.detectedSources.push({
            type: 'mui',
            path: fullPath,
            confidence: 0.8,
            description: 'Material-UI theme system'
          });
        } else {
          // Check file content for MUI imports
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('@mui/material') || content.includes('createTheme')) {
              this.detectedSources.push({
                type: 'mui',
                path: fullPath,
                confidence: 0.7,
                description: 'Custom MUI theme configuration'
              });
            }
          } catch (err) {
            // Ignore read errors
          }
        }
      }
    }
  }

  /**
   * Detect Tailwind configuration
   */
  async detectTailwindConfig() {
    const configFiles = [
      'tailwind.config.js',
      'tailwind.config.ts',
      'tailwind.config.mjs',
      'tailwind.config.cjs'
    ];

    for (const configFile of configFiles) {
      const fullPath = path.join(this.rootPath, configFile);
      if (fs.existsSync(fullPath)) {
        this.detectedSources.push({
          type: 'tailwind',
          path: fullPath,
          confidence: 0.9,
          description: 'Tailwind CSS configuration'
        });
        break;
      }
    }
  }

  /**
   * Detect CSS variables/custom properties
   */
  async detectCSSVariables() {
    const cssFiles = [
      'src/globals.css',
      'src/index.css',
      'styles/globals.css',
      'public/css/variables.css',
      'src/styles/tokens.css'
    ];

    for (const cssFile of cssFiles) {
      const fullPath = path.join(this.rootPath, cssFile);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Look for CSS custom properties
          const cssVarCount = (content.match(/--[\w-]+\s*:/g) || []).length;
          if (cssVarCount > 5) {
            this.detectedSources.push({
              type: 'css-variables',
              path: fullPath,
              confidence: Math.min(0.9, cssVarCount / 20),
              description: `CSS custom properties (${cssVarCount} variables found)`,
              metadata: { variableCount: cssVarCount }
            });
          }
        } catch (err) {
          // Ignore read errors
        }
      }
    }
  }

  /**
   * Detect Style Dictionary tokens
   */
  async detectStyleDictionary() {
    const indicators = [
      'tokens',
      'design-tokens',
      'style-dictionary.config.js',
      'tokens.json',
      'design-tokens.json'
    ];

    for (const indicator of indicators) {
      const fullPath = path.join(this.rootPath, indicator);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          // Check if directory contains token files
          try {
            const files = fs.readdirSync(fullPath);
            const tokenFiles = files.filter(file => 
              file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml')
            );
            if (tokenFiles.length > 0) {
              this.detectedSources.push({
                type: 'style-dictionary',
                path: fullPath,
                confidence: 0.8,
                description: `Style Dictionary tokens (${tokenFiles.length} files)`,
                metadata: { tokenFiles }
              });
            }
          } catch (err) {
            // Ignore read errors
          }
        } else if (stats.isFile()) {
          this.detectedSources.push({
            type: 'style-dictionary',
            path: fullPath,
            confidence: 0.7,
            description: 'Style Dictionary configuration or tokens'
          });
        }
      }
    }
  }

  /**
   * Detect custom token files
   */
  async detectCustomTokens() {
    const patterns = [
      'tokens.js',
      'tokens.ts',
      'constants/colors.js',
      'constants/theme.js',
      'utils/theme.js',
      'config/design.js'
    ];

    for (const pattern of patterns) {
      const fullPath = path.join(this.rootPath, pattern);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Look for token-like patterns
          const hasColors = content.includes('color') || content.includes('Color');
          const hasSpacing = content.includes('spacing') || content.includes('margin') || content.includes('padding');
          const hasTypography = content.includes('font') || content.includes('typography');
          
          if (hasColors || hasSpacing || hasTypography) {
            this.detectedSources.push({
              type: 'custom',
              path: fullPath,
              confidence: 0.6,
              description: 'Custom token definitions',
              metadata: { hasColors, hasSpacing, hasTypography }
            });
          }
        } catch (err) {
          // Ignore read errors
        }
      }
    }
  }

  /**
   * Detect Figma token exports
   */
  async detectFigmaTokens() {
    const patterns = [
      'figma-tokens.json',
      'tokens/figma.json',
      'design/tokens.json',
      'exports/figma-tokens.json'
    ];

    for (const pattern of patterns) {
      const fullPath = path.join(this.rootPath, pattern);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const data = JSON.parse(content);
          // Check if it looks like Figma tokens
          if (data.$metadata || data.global || data.light || data.dark) {
            this.detectedSources.push({
              type: 'figma',
              path: fullPath,
              confidence: 0.8,
              description: 'Figma token export'
            });
          }
        } catch (err) {
          // Ignore parse errors
        }
      }
    }
  }

  /**
   * Get detection summary
   */
  getSummary() {
    const summary = {
      totalSources: this.detectedSources.length,
      byType: {},
      highConfidence: this.detectedSources.filter(s => s.confidence >= 0.8),
      recommendations: []
    };

    // Group by type
    this.detectedSources.forEach(source => {
      if (!summary.byType[source.type]) {
        summary.byType[source.type] = [];
      }
      summary.byType[source.type].push(source);
    });

    // Generate recommendations
    if (summary.highConfidence.length > 0) {
      summary.recommendations.push('High-confidence token sources detected - ready for extraction');
    }
    if (Object.keys(summary.byType).length > 1) {
      summary.recommendations.push('Multiple token systems detected - DCP can consolidate them');
    }
    if (summary.totalSources === 0) {
      summary.recommendations.push('No token sources detected - consider implementing a design token system');
    }

    return summary;
  }
}