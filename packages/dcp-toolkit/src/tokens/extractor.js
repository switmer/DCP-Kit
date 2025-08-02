/**
 * Universal Token Extractor System
 * Extracts tokens from any detected source into canonical DCP format
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { ConfigEvaluator } from './configEvaluator.js';

export class UniversalTokenExtractor {
  constructor(options = {}) {
    this.configEvaluator = new ConfigEvaluator({
      verbose: options.verbose,
      timeout: options.timeout || 5000
    });
    
    this.extractors = new Map([
      ['radix', this.extractRadixTokens.bind(this)],
      ['mui', this.extractMUITokens.bind(this)],
      ['tailwind', this.extractTailwindTokens.bind(this)],
      ['css-variables', this.extractCSSVariables.bind(this)],
      ['style-dictionary', this.extractStyleDictionary.bind(this)],
      ['custom', this.extractCustomTokens.bind(this)],
      ['figma', this.extractFigmaTokens.bind(this)]
    ]);
  }

  /**
   * Extract tokens from all detected sources
   */
  async extractAll(detectedSources) {
    const allTokens = {
      colors: {},
      spacing: {},
      typography: {},
      borders: {},
      shadows: {},
      animations: {},
      breakpoints: {},
      zIndex: {},
      meta: {
        sources: [],
        extractedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    for (const source of detectedSources) {
      try {
        console.log(`📦 Extracting tokens from ${source.type}: ${source.path}`);
        
        const extractor = this.extractors.get(source.type);
        if (!extractor) {
          console.warn(`⚠️  No extractor found for type: ${source.type}`);
          continue;
        }

        const tokens = await extractor(source);
        if (tokens) {
          this.mergeTokens(allTokens, tokens, source);
          allTokens.meta.sources.push({
            type: source.type,
            path: source.path,
            confidence: source.confidence,
            extractedTokens: Object.keys(tokens).length
          });
        }
      } catch (error) {
        console.error(`❌ Error extracting from ${source.path}:`, error.message);
      }
    }

    return allTokens;
  }

  /**
   * Extract Radix tokens
   */
  async extractRadixTokens(source) {
    if (source.path.includes('node_modules/@radix-ui')) {
      return this.extractFromRadixPackages(source.path);
    } else {
      return this.extractFromRadixConfig(source.path);
    }
  }

  async extractFromRadixPackages(nodePath) {
    const tokens = { colors: {}, spacing: {}, typography: {} };
    
    try {
      // Extract Radix colors
      const colorsPath = path.join(nodePath, '../colors');
      if (fs.existsSync(colorsPath)) {
        const colorFiles = fs.readdirSync(colorsPath).filter(f => f.endsWith('.js'));
        
        for (const colorFile of colorFiles.slice(0, 5)) { // Limit to prevent overwhelming
          const colorName = path.basename(colorFile, '.js');
          const colorPath = path.join(colorsPath, colorFile);
          
          try {
            // Read file content and try to parse basic color values
            const content = fs.readFileSync(colorPath, 'utf8');
            const colorData = this.parseRadixColorFile(content, colorName);
            if (colorData) {
              tokens.colors[colorName] = colorData;
            }
          } catch (err) {
            console.warn(`Could not load color ${colorName}:`, err.message);
          }
        }
      }

      // Extract spacing (standard Radix spacing)
      tokens.spacing = {
        '1': '4px',
        '2': '8px', 
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px'
      };
    } catch (error) {
      console.warn('Error extracting Radix tokens:', error.message);
    }

    return tokens;
  }

  parseRadixColorFile(content, colorName) {
    // Parse basic Radix color exports
    const colors = {};
    
    // Look for export patterns like: export const red1 = 'hsl(348, 100%, 99.4%)'
    const exportMatches = content.match(/export\s+const\s+\w+\d+\s*=\s*['"`][^'"`]+['"`]/g);
    if (exportMatches) {
      exportMatches.forEach(match => {
        const nameMatch = match.match(/export\s+const\s+(\w+\d+)/);
        const valueMatch = match.match(/['"`]([^'"`]+)['"`]/);
        if (nameMatch && valueMatch) {
          const step = nameMatch[1].replace(colorName, '');
          colors[step] = valueMatch[1];
        }
      });
    }
    
    return Object.keys(colors).length > 0 ? colors : null;
  }

  async extractFromRadixConfig(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      // Basic parsing of Radix config files
      return this.parseConfigFile(content);
    } catch (error) {
      console.warn('Error reading Radix config:', error.message);
      return {};
    }
  }

  /**
   * Extract MUI tokens
   */
  async extractMUITokens(source) {
    const tokens = { colors: {}, spacing: {}, typography: {} };

    try {
      if (source.path.includes('node_modules/@mui')) {
        // Extract from MUI package defaults
        tokens.colors = {
          primary: {
            50: '#e3f2fd',
            100: '#bbdefb',
            500: '#2196f3',
            900: '#0d47a1'
          },
          secondary: {
            50: '#fce4ec',
            100: '#f8bbd9', 
            500: '#e91e63',
            900: '#880e4f'
          }
        };
        
        tokens.spacing = this.generateMUISpacing(8); // Default MUI spacing
      } else {
        // Extract from custom theme file using ConfigEvaluator
        const config = await this.configEvaluator.evaluateConfig(source.path);
        
        if (config) {
          // Look for theme object or createTheme result
          let theme = config;
          if (typeof config === 'function') {
            // If it's a factory function, we already tried to call it in evaluateConfig
            console.warn('MUI theme factory functions not fully supported, using static extraction');
            theme = {};
          }
          
          // Extract palette colors
          if (theme.palette) {
            tokens.colors = this.normalizeMUIColors(theme.palette);
          }
          
          // Extract spacing
          if (theme.spacing) {
            if (typeof theme.spacing === 'number') {
              tokens.spacing = this.generateMUISpacing(theme.spacing);
            } else if (typeof theme.spacing === 'function') {
              // MUI spacing function - generate common values
              tokens.spacing = this.generateMUISpacing(8); // Default fallback
            }
          }
          
          // Extract typography
          if (theme.typography) {
            tokens.typography = this.normalizeMUITypography(theme.typography);
          }
          
          console.log(`✅ Extracted MUI theme: ${Object.keys(tokens.colors).length} colors, ${Object.keys(tokens.spacing).length} spacing values`);
        } else {
          console.warn('No MUI theme configuration found');
        }
      }
    } catch (error) {
      console.warn('Error extracting MUI tokens:', error.message);
      
      // Fallback to static parsing
      try {
        const staticTokens = await this.extractMUIStatic(source.path);
        Object.assign(tokens, staticTokens);
      } catch (fallbackError) {
        console.warn('Static MUI extraction also failed:', fallbackError.message);
      }
    }

    return tokens;
  }

  parseMUIColors(paletteString) {
    const colors = {};
    const colorMatches = paletteString.match(/(\w+)\s*:\s*['"`]([^'"`]+)['"`]/g);
    if (colorMatches) {
      colorMatches.forEach(match => {
        const [, name, value] = match.match(/(\w+)\s*:\s*['"`]([^'"`]+)['"`]/);
        colors[name] = value;
      });
    }
    return colors;
  }

  /**
   * Normalize MUI colors from palette object
   */
  normalizeMUIColors(palette) {
    const normalized = {};
    
    Object.entries(palette).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Simple color value
        normalized[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        // Color object with main, light, dark, contrastText, etc.
        if (value.main) {
          normalized[`${key}-main`] = value.main;
        }
        if (value.light) {
          normalized[`${key}-light`] = value.light;
        }
        if (value.dark) {
          normalized[`${key}-dark`] = value.dark;
        }
        if (value.contrastText) {
          normalized[`${key}-contrast`] = value.contrastText;
        }
        
        // Handle numerical scale (50, 100, 200, etc.)
        Object.entries(value).forEach(([shade, color]) => {
          if (/^\d+$/.test(shade)) {
            normalized[`${key}-${shade}`] = color;
          }
        });
      }
    });
    
    return normalized;
  }

  /**
   * Normalize MUI typography from typography object
   */
  normalizeMUITypography(typography) {
    const normalized = {};
    
    Object.entries(typography).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Typography variant object
        if (value.fontSize) normalized[`${key}-fontSize`] = value.fontSize;
        if (value.fontWeight) normalized[`${key}-fontWeight`] = value.fontWeight;
        if (value.lineHeight) normalized[`${key}-lineHeight`] = value.lineHeight;
        if (value.letterSpacing) normalized[`${key}-letterSpacing`] = value.letterSpacing;
      } else if (typeof value === 'string' || typeof value === 'number') {
        // Simple value
        normalized[key] = value;
      }
    });
    
    return normalized;
  }

  /**
   * Generate MUI spacing scale
   */
  generateMUISpacing(base = 8) {
    const spacing = {};
    for (let i = 1; i <= 10; i++) {
      spacing[i] = `${base * i}px`;
    }
    return spacing;
  }

  /**
   * Fallback static MUI extraction
   */
  async extractMUIStatic(configPath) {
    const content = fs.readFileSync(configPath, 'utf8');
    return this.configEvaluator.extractMUIStatic(content);
  }

  /**
   * Extract Tailwind tokens
   */
  async extractTailwindTokens(source) {
    const tokens = { colors: {}, spacing: {}, typography: {} };

    try {
      // Use ConfigEvaluator for proper JS/TS evaluation
      const config = await this.configEvaluator.evaluateConfig(source.path);
      
      if (config && config.theme) {
        // Extract colors from theme.colors or theme.extend.colors
        const colors = config.theme.extend?.colors || config.theme.colors || {};
        tokens.colors = this.normalizeTailwindColors(colors);
        
        // Extract spacing from theme.spacing or theme.extend.spacing
        const spacing = config.theme.extend?.spacing || config.theme.spacing || {};
        tokens.spacing = this.normalizeTailwindSpacing(spacing);
        
        // Extract typography from theme.fontSize or theme.extend.fontSize
        const fontSize = config.theme.extend?.fontSize || config.theme.fontSize || {};
        tokens.typography = this.normalizeTailwindTypography(fontSize);
        
        console.log(`✅ Extracted Tailwind config: ${Object.keys(tokens.colors).length} colors, ${Object.keys(tokens.spacing).length} spacing values`);
      } else {
        console.warn('No theme configuration found in Tailwind config');
      }
    } catch (error) {
      console.warn('Error extracting Tailwind tokens:', error.message);
      
      // Fallback to static parsing for broken configs
      try {
        const staticTokens = await this.extractTailwindStatic(source.path);
        Object.assign(tokens, staticTokens);
      } catch (fallbackError) {
        console.warn('Static extraction also failed:', fallbackError.message);
      }
    }

    return tokens;
  }

  /**
   * Normalize Tailwind colors from config object
   */
  normalizeTailwindColors(colors) {
    const normalized = {};
    
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Simple color value
        normalized[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        // Color scale (e.g., blue: { 50: '#...', 100: '#...' })
        Object.entries(value).forEach(([shade, color]) => {
          normalized[`${key}-${shade}`] = color;
        });
      }
    });
    
    return normalized;
  }

  /**
   * Normalize Tailwind spacing from config object
   */
  normalizeTailwindSpacing(spacing) {
    const normalized = {};
    
    Object.entries(spacing).forEach(([key, value]) => {
      normalized[key] = value;
    });
    
    return normalized;
  }

  /**
   * Normalize Tailwind typography from config object
   */
  normalizeTailwindTypography(fontSize) {
    const normalized = {};
    
    Object.entries(fontSize).forEach(([key, value]) => {
      if (typeof value === 'string') {
        normalized[key] = value;
      } else if (Array.isArray(value)) {
        // Tailwind fontSize can be [size, lineHeight] array
        normalized[key] = {
          fontSize: value[0],
          lineHeight: value[1]
        };
      } else if (typeof value === 'object') {
        normalized[key] = value;
      }
    });
    
    return normalized;
  }

  /**
   * Fallback static Tailwind extraction
   */
  async extractTailwindStatic(configPath) {
    const content = fs.readFileSync(configPath, 'utf8');
    return this.configEvaluator.extractTailwindStatic(content);
  }

  // Legacy methods for backwards compatibility
  parseTailwindColors(colorsString) {
    const colors = {};
    const colorMatches = colorsString.match(/['"`]?(\w+)['"`]?\s*:\s*['"`]([^'"`]+)['"`]/g);
    if (colorMatches) {
      colorMatches.forEach(match => {
        const parsed = match.match(/['"`]?(\w+)['"`]?\s*:\s*['"`]([^'"`]+)['"`]/);
        if (parsed) {
          colors[parsed[1]] = parsed[2];
        }
      });
    }
    return colors;
  }

  parseTailwindSpacing(spacingString) {
    const spacing = {};
    const spacingMatches = spacingString.match(/['"`]?(\w+)['"`]?\s*:\s*['"`]([^'"`]+)['"`]/g);
    if (spacingMatches) {
      spacingMatches.forEach(match => {
        const parsed = match.match(/['"`]?(\w+)['"`]?\s*:\s*['"`]([^'"`]+)['"`]/);
        if (parsed) {
          spacing[parsed[1]] = parsed[2];
        }
      });
    }
    return spacing;
  }

  /**
   * Extract CSS Variables
   */
  async extractCSSVariables(source) {
    const tokens = { colors: {}, spacing: {}, typography: {} };

    try {
      const content = fs.readFileSync(source.path, 'utf8');
      
      // Extract CSS custom properties
      const variableMatches = content.match(/--[\w-]+\s*:\s*[^;]+/g);
      if (variableMatches) {
        variableMatches.forEach(match => {
          const [name, value] = match.split(':').map(s => s.trim());
          const cleanName = name.replace('--', '');
          const cleanValue = value.replace(/;$/, '');
          
          // Categorize variables
          if (cleanName.includes('color') || cleanName.includes('bg') || cleanValue.includes('#') || cleanValue.includes('rgb') || cleanValue.includes('hsl')) {
            tokens.colors[cleanName] = cleanValue;
          } else if (cleanName.includes('space') || cleanName.includes('margin') || cleanName.includes('padding') || cleanValue.includes('px') || cleanValue.includes('rem')) {
            tokens.spacing[cleanName] = cleanValue;
          } else if (cleanName.includes('font') || cleanName.includes('text')) {
            tokens.typography[cleanName] = cleanValue;
          }
        });
      }
    } catch (error) {
      console.warn('Error extracting CSS variables:', error.message);
    }

    return tokens;
  }

  /**
   * Extract Style Dictionary tokens
   */
  async extractStyleDictionary(source) {
    const tokens = { colors: {}, spacing: {}, typography: {} };

    try {
      if (fs.statSync(source.path).isDirectory()) {
        // Extract from directory of token files
        const tokenFiles = globSync('**/*.json', { cwd: source.path }).slice(0, 10); // Limit files
        
        for (const file of tokenFiles) {
          const filePath = path.join(source.path, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            this.flattenTokens(data, tokens);
          } catch (err) {
            // Skip problematic files
          }
        }
      } else {
        // Single file
        const content = fs.readFileSync(source.path, 'utf8');
        const data = JSON.parse(content);
        this.flattenTokens(data, tokens);
      }
    } catch (error) {
      console.warn('Error extracting Style Dictionary tokens:', error.message);
    }

    return tokens;
  }

  flattenTokens(data, tokens, prefix = '') {
    Object.entries(data).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !value.value) {
        // Nested object
        this.flattenTokens(value, tokens, prefix ? `${prefix}-${key}` : key);
      } else if (value && value.value) {
        // Token with value
        const tokenName = prefix ? `${prefix}-${key}` : key;
        const tokenValue = value.value;
        
        // Categorize by key name or type
        if (key.includes('color') || value.type === 'color') {
          tokens.colors[tokenName] = tokenValue;
        } else if (key.includes('space') || value.type === 'dimension') {
          tokens.spacing[tokenName] = tokenValue;
        } else if (key.includes('font') || value.type === 'typography') {
          tokens.typography[tokenName] = tokenValue;
        }
      }
    });
  }

  /**
   * Extract custom tokens
   */
  async extractCustomTokens(source) {
    const tokens = { colors: {}, spacing: {}, typography: {} };

    try {
      const content = fs.readFileSync(source.path, 'utf8');
      
      // Try to extract exported objects
      const exportMatches = content.match(/export\s+(?:const|default)\s+\w+\s*=\s*\{([\s\S]*?)\}/g);
      if (exportMatches) {
        exportMatches.forEach(match => {
          const objectContent = match.match(/\{([\s\S]*?)\}/)[1];
          const propertyMatches = objectContent.match(/(\w+)\s*:\s*['"`]([^'"`]+)['"`]/g);
          
          if (propertyMatches) {
            propertyMatches.forEach(prop => {
              const [, name, value] = prop.match(/(\w+)\s*:\s*['"`]([^'"`]+)['"`]/);
              
              if (name.includes('color') || value.includes('#') || value.includes('rgb')) {
                tokens.colors[name] = value;
              } else if (name.includes('space') || value.includes('px') || value.includes('rem')) {
                tokens.spacing[name] = value;
              } else if (name.includes('font') || name.includes('text')) {
                tokens.typography[name] = value;
              }
            });
          }
        });
      }
    } catch (error) {
      console.warn('Error extracting custom tokens:', error.message);
    }

    return tokens;
  }

  /**
   * Extract Figma tokens
   */
  async extractFigmaTokens(source) {
    const tokens = { colors: {}, spacing: {}, typography: {} };

    try {
      const content = fs.readFileSync(source.path, 'utf8');
      const data = JSON.parse(content);
      
      // Handle different Figma token formats
      if (data.global) {
        this.extractFigmaGlobalTokens(data.global, tokens);
      }
      
      if (data.light) {
        this.extractFigmaThemeTokens(data.light, tokens, 'light');
      }
      
      if (data.dark) {
        this.extractFigmaThemeTokens(data.dark, tokens, 'dark');
      }
    } catch (error) {
      console.warn('Error extracting Figma tokens:', error.message);
    }

    return tokens;
  }

  extractFigmaGlobalTokens(globalTokens, tokens) {
    Object.entries(globalTokens).forEach(([category, categoryTokens]) => {
      if (category === 'color' && tokens.colors) {
        Object.entries(categoryTokens).forEach(([name, token]) => {
          if (token.value) {
            tokens.colors[name] = token.value;
          }
        });
      }
    });
  }

  extractFigmaThemeTokens(themeTokens, tokens, themeName) {
    Object.entries(themeTokens).forEach(([category, categoryTokens]) => {
      if (category === 'color' && tokens.colors) {
        Object.entries(categoryTokens).forEach(([name, token]) => {
          if (token.value) {
            tokens.colors[`${themeName}-${name}`] = token.value;
          }
        });
      }
    });
  }

  parseConfigFile(content) {
    // Basic config file parsing
    const tokens = { colors: {}, spacing: {}, typography: {} };
    
    // Look for object exports
    const objectMatches = content.match(/\{[\s\S]*?\}/g);
    if (objectMatches) {
      objectMatches.forEach(obj => {
        const props = obj.match(/(\w+)\s*:\s*['"`]([^'"`]+)['"`]/g);
        if (props) {
          props.forEach(prop => {
            const [, name, value] = prop.match(/(\w+)\s*:\s*['"`]([^'"`]+)['"`]/);
            if (name.includes('color')) {
              tokens.colors[name] = value;
            } else if (name.includes('space')) {
              tokens.spacing[name] = value;
            }
          });
        }
      });
    }
    
    return tokens;
  }

  /**
   * Merge tokens from different sources
   */
  mergeTokens(target, source, sourceInfo) {
    Object.entries(source).forEach(([category, tokens]) => {
      if (!target[category]) {
        target[category] = {};
      }
      
      Object.entries(tokens).forEach(([name, value]) => {
        // Add source prefix to avoid conflicts
        const prefixedName = `${sourceInfo.type}-${name}`;
        target[category][prefixedName] = {
          value,
          source: sourceInfo.type,
          path: sourceInfo.path
        };
      });
    });
  }
}