/**
 * Override Manager - Manual control over token detection and extraction
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

export class OverrideManager {
  constructor(rootPath, options = {}) {
    this.rootPath = rootPath;
    this.verbose = options.verbose || false;
    this.configPaths = [
      'dcp.config.json',
      'dcp.config.js', 
      '.dcprc.json',
      '.dcprc'
    ];
    
    this.config = null;
    this.appliedRules = [];
  }

  /**
   * Load override configuration
   */
  async loadConfig() {
    for (const configFile of this.configPaths) {
      const configPath = path.join(this.rootPath, configFile);
      
      if (fs.existsSync(configPath)) {
        try {
          if (this.verbose) {
            console.log(`📄 Loading DCP config: ${configFile}`);
          }

          let config;
          if (configFile.endsWith('.json')) {
            const content = fs.readFileSync(configPath, 'utf8');
            config = JSON.parse(content);
          } else if (configFile.endsWith('.js')) {
            // Dynamic import for JS configs
            const fileUrl = `file://${path.resolve(configPath)}?t=${Date.now()}`;
            const module = await import(fileUrl);
            config = module.default || module;
          }

          this.config = {
            ...config,
            configPath,
            configFile
          };

          if (this.verbose) {
            console.log(`✅ Loaded DCP config from ${configFile}`);
          }

          return this.config;
        } catch (error) {
          if (this.verbose) {
            console.warn(`⚠️  Failed to load ${configFile}: ${error.message}`);
          }
        }
      }
    }

    // No config found - use defaults
    this.config = { configPath: null };
    return this.config;
  }

  /**
   * Apply overrides to detected sources
   */
  applyOverrides(detectedSources) {
    if (!this.config || !this.config.tokens) {
      return detectedSources; // No overrides to apply
    }

    let sources = [...detectedSources];
    this.appliedRules = [];

    const tokenConfig = this.config.tokens;

    // Apply exclude rules
    if (tokenConfig.exclude) {
      sources = this.applyExcludeRules(sources, tokenConfig.exclude);
    }

    // Apply include rules (force detection)
    if (tokenConfig.include) {
      const forcedSources = this.applyIncludeRules(tokenConfig.include);
      sources = sources.concat(forcedSources);
    }

    // Apply type overrides
    if (tokenConfig.forceType) {
      sources = this.applyTypeOverrides(sources, tokenConfig.forceType);
    }

    // Apply confidence boosts
    if (tokenConfig.boostConfidence) {
      sources = this.applyConfidenceBoosts(sources, tokenConfig.boostConfidence);
    }

    if (this.verbose && this.appliedRules.length > 0) {
      console.log(`🔧 Applied ${this.appliedRules.length} override rule(s)`);
    }

    return sources;
  }

  /**
   * Apply exclude rules
   */
  applyExcludeRules(sources, excludePatterns) {
    const patterns = Array.isArray(excludePatterns) ? excludePatterns : [excludePatterns];
    
    return sources.filter(source => {
      for (const pattern of patterns) {
        if (this.matchesPattern(source.path, pattern)) {
          this.appliedRules.push({
            action: 'exclude',
            path: source.path,
            pattern,
            reason: `Excluded by pattern: ${pattern}`
          });
          
          if (this.verbose) {
            console.log(`🚫 Excluded: ${source.path} (pattern: ${pattern})`);
          }
          
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Apply include rules (force detection)
   */
  applyIncludeRules(includePatterns) {
    const patterns = Array.isArray(includePatterns) ? includePatterns : [includePatterns];
    const forcedSources = [];

    for (const pattern of patterns) {
      try {
        // Use glob to find matching files
        const matches = globSync(pattern, {
          cwd: this.rootPath,
          absolute: true,
          nodir: true
        });

        for (const match of matches) {
          // Check if not already detected
          const alreadyDetected = forcedSources.some(s => s.path === match);
          
          if (!alreadyDetected && fs.existsSync(match)) {
            const forcedSource = {
              type: 'custom', // Default type, can be overridden by forceType
              path: match,
              confidence: 0.7, // Medium confidence for forced inclusion
              description: `Manually included via pattern: ${pattern}`,
              metadata: { 
                forcedInclude: true,
                includePattern: pattern 
              }
            };

            forcedSources.push(forcedSource);
            
            this.appliedRules.push({
              action: 'include',
              path: match,
              pattern,
              reason: `Forced inclusion by pattern: ${pattern}`
            });

            if (this.verbose) {
              console.log(`➕ Included: ${match} (pattern: ${pattern})`);
            }
          }
        }
      } catch (error) {
        if (this.verbose) {
          console.warn(`⚠️  Include pattern failed: ${pattern} - ${error.message}`);
        }
      }
    }

    return forcedSources;
  }

  /**
   * Apply type overrides
   */
  applyTypeOverrides(sources, typeOverrides) {
    return sources.map(source => {
      for (const [pattern, newType] of Object.entries(typeOverrides)) {
        if (this.matchesPattern(source.path, pattern)) {
          const oldType = source.type;
          source.type = newType;
          source.metadata = {
            ...source.metadata,
            originalType: oldType,
            typeOverridden: true
          };

          this.appliedRules.push({
            action: 'forceType',
            path: source.path,
            pattern,
            type: newType,
            reason: `Type overridden from ${oldType} to ${newType}`
          });

          if (this.verbose) {
            console.log(`🔄 Type override: ${source.path} (${oldType} → ${newType})`);
          }
          
          break; // Apply first matching override
        }
      }
      return source;
    });
  }

  /**
   * Apply confidence boosts
   */
  applyConfidenceBoosts(sources, confidenceBoosts) {
    return sources.map(source => {
      for (const [pattern, boost] of Object.entries(confidenceBoosts)) {
        if (this.matchesPattern(source.path, pattern)) {
          const oldConfidence = source.confidence;
          source.confidence = Math.min(1.0, source.confidence + boost);
          
          this.appliedRules.push({
            action: 'boostConfidence',
            path: source.path,
            pattern,
            boost,
            reason: `Confidence boosted from ${oldConfidence.toFixed(2)} to ${source.confidence.toFixed(2)}`
          });

          if (this.verbose) {
            console.log(`📈 Confidence boost: ${source.path} (+${boost})`);
          }
          
          break; // Apply first matching boost
        }
      }
      return source;
    });
  }

  /**
   * Check if path matches pattern (supports globs)
   */
  matchesPattern(filePath, pattern) {
    // Convert to relative path for pattern matching
    const relativePath = path.relative(this.rootPath, filePath);
    
    // Simple cases
    if (pattern === filePath || pattern === relativePath) {
      return true;
    }

    // Glob pattern matching
    try {
      const matches = globSync(pattern, {
        cwd: this.rootPath,
        absolute: false,
        nodir: true
      });
      
      return matches.some(match => {
        const matchAbsolute = path.resolve(this.rootPath, match);
        return matchAbsolute === filePath;
      });
    } catch (error) {
      // Fallback to simple string matching
      return filePath.includes(pattern) || relativePath.includes(pattern);
    }
  }

  /**
   * Get applied rules for logging
   */
  getAppliedRules() {
    return this.appliedRules;
  }

  /**
   * Generate sample configuration
   */
  static generateSampleConfig() {
    return {
      tokens: {
        // Exclude specific files or patterns
        exclude: [
          "**/node_modules/**",
          "**/legacy-tokens.json",
          "**/*.backup.*"
        ],
        
        // Force include specific files or patterns
        include: [
          "./custom-tokens/**/*.json",
          "./brand-configs/*.js"
        ],
        
        // Override detection type for specific files
        forceType: {
          "./weird-config.js": "tailwind",
          "./custom-theme.json": "style-dictionary"
        },
        
        // Boost confidence for known good files
        boostConfidence: {
          "./tokens.json": 0.2,
          "**/design-tokens/**": 0.3
        }
      },
      
      // Other DCP configuration options
      extraction: {
        conflictStrategy: "semantic", // "prefix" | "first-wins" | "error"
        maxFileSize: "5MB",
        timeout: 10000
      }
    };
  }

  /**
   * Create sample config file
   */
  static async createSampleConfig(outputPath) {
    const config = OverrideManager.generateSampleConfig();
    const configPath = path.join(outputPath, 'dcp.config.json');
    
    await fs.promises.writeFile(
      configPath,
      JSON.stringify(config, null, 2),
      'utf8'
    );
    
    return configPath;
  }
}