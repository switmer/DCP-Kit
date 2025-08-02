/**
 * Universal Token Detection System
 * Automatically detects token sources in any codebase
 */

import fs from 'fs';
import path from 'path';
import { DetectionLogger } from './detectionLogger.js';
import { OverrideManager } from './overrideManager.js';

export class TokenDetector {
  constructor(rootPath, options = {}) {
    this.rootPath = rootPath;
    this.detectedSources = [];
    this.verbose = options.verbose || false;
    this.outputDir = options.outputDir || path.join(rootPath, 'registry');
    
    // Initialize logging and override systems
    this.logger = new DetectionLogger(this.outputDir, { verbose: this.verbose });
    this.overrideManager = new OverrideManager(rootPath, { verbose: this.verbose });
  }

  /**
   * Auto-detect all token sources in the project
   */
  async detectAll() {
    const startTime = performance.now();
    this.detectedSources = [];
    
    // Load override configuration
    await this.overrideManager.loadConfig();
    
    if (this.verbose) {
      console.log('🔍 Detecting token sources...');
    }
    
    // Run all detection methods
    await Promise.all([
      this.detectRadixTokens(),
      this.detectMUITokens(),
      this.detectTailwindConfig(),
      this.detectCSSVariables(),
      this.detectStyleDictionary(),
      this.detectCustomTokens(),
      this.detectFigmaTokens()
    ]);

    // Log detection performance
    const detectionTime = performance.now() - startTime;
    this.logger.logPerformance('detection', detectionTime);

    // Apply overrides
    const originalCount = this.detectedSources.length;
    this.detectedSources = this.overrideManager.applyOverrides(this.detectedSources);
    
    // Log override results
    if (this.detectedSources.length !== originalCount) {
      const appliedRules = this.overrideManager.getAppliedRules();
      this.logger.logOverrides(this.overrideManager.config, appliedRules);
    }

    // Log final results
    if (this.verbose) {
      console.log(`✅ Detected ${this.detectedSources.length} token sources`);
    }

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
        const source = {
          type: 'radix',
          path: fullPath,
          confidence: 0.9,
          description: 'Radix UI theme tokens'
        };
        this.detectedSources.push(source);
        this.logger.logDetectedSource(source);
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
    return this.logger.generateSummary();
  }

  /**
   * Get detection logger for external access
   */
  getLogger() {
    return this.logger;
  }

  /**
   * Get override manager for external access  
   */
  getOverrideManager() {
    return this.overrideManager;
  }

  /**
   * Write detection log to file
   */
  async writeLog() {
    return await this.logger.writeLog();
  }

  /**
   * Print detection summary to console
   */
  printSummary() {
    this.logger.printSummary();
  }
}