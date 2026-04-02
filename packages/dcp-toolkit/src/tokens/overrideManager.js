/**
 * Override Manager - Manual control over token detection and extraction
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { minimatch } from 'minimatch';

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
    const defaults = { autoDetect: true, include: [], exclude: [] };

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
            const fileUrl = `file://${path.resolve(configPath)}?t=${Date.now()}`;
            const module = await import(fileUrl);
            config = module.default || module;
          }

          // Store full config internally, return tokens sub-object
          this.config = config;
          const tokenConfig = {
            ...defaults,
            ...(config.tokens || {}),
            configPath,
            configFile
          };

          if (this.verbose) {
            console.log(`✅ Loaded DCP config from ${configFile}`);
          }

          return tokenConfig;
        } catch (error) {
          if (this.verbose) {
            console.warn(`⚠️  Failed to load ${configFile}: ${error.message}`);
          }
        }
      }
    }

    // No config found - use defaults
    this.config = {};
    return { ...defaults, configPath: null };
  }

  /**
   * Apply overrides to detected sources
   */
  async applyOverrides(detectedSources) {
    // Load config if not yet loaded
    if (!this.config) {
      await this.loadConfig();
    }

    const tokenConfig = this.config?.tokens || this.config || {};
    if (!tokenConfig.exclude && !tokenConfig.include && !tokenConfig.forceType && !tokenConfig.boostConfidence) {
      return detectedSources; // No overrides to apply
    }

    let sources = [...detectedSources];
    this.appliedRules = [];

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
    const rules = Array.isArray(excludePatterns) ? excludePatterns : [excludePatterns];

    return sources.filter(source => {
      for (const rule of rules) {
        let shouldExclude = false;
        let reason = '';

        if (typeof rule === 'object' && rule !== null) {
          // Structured exclude rule
          if (rule.type && rule.type === source.type) {
            shouldExclude = true;
            reason = `Excluded by type: ${rule.type}`;
          } else if (rule.pattern && this.matchesPattern(source.path, rule.pattern)) {
            shouldExclude = true;
            reason = `Excluded by pattern: ${rule.pattern}`;
          } else if (rule.minConfidence !== undefined && source.confidence < rule.minConfidence) {
            shouldExclude = true;
            reason = `Excluded by confidence threshold: below ${rule.minConfidence}`;
          }
          // Skip empty or invalid rules (no type, pattern, or minConfidence)
        } else if (typeof rule === 'string') {
          if (this.matchesPattern(source.path, rule)) {
            shouldExclude = true;
            reason = `Excluded by pattern: ${rule}`;
          }
        }

        if (shouldExclude) {
          this.appliedRules.push({
            action: 'exclude',
            path: source.path,
            type: source.type,
            reason
          });

          if (this.verbose) {
            console.log(`🚫 Excluded: ${source.path} (${reason})`);
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
    const rules = Array.isArray(includePatterns) ? includePatterns : [includePatterns];
    const forcedSources = [];

    for (const rule of rules) {
      let globPattern;
      let sourceConfig = {};

      if (typeof rule === 'object' && rule !== null) {
        // Structured include: { type, path, pattern, confidence, description }
        globPattern = rule.path || rule.pattern;
        sourceConfig = {
          type: rule.type,
          confidence: rule.confidence,
          description: rule.description
        };
        // Skip invalid rules (no path or pattern)
        if (!globPattern) continue;
      } else if (typeof rule === 'string') {
        globPattern = rule;
      } else {
        continue;
      }

      try {
        const matches = globSync(globPattern, {
          cwd: this.rootPath,
          absolute: true,
          nodir: true
        });

        for (const match of matches) {
          const alreadyDetected = forcedSources.some(s => s.path === match);

          if (!alreadyDetected && fs.existsSync(match)) {
            const forcedSource = {
              type: sourceConfig.type || 'custom',
              path: match,
              confidence: sourceConfig.confidence || 0.7,
              source: 'manual',
              description: sourceConfig.description || `Manually included via pattern: ${globPattern}`,
              metadata: {
                forcedInclude: true,
                includePattern: globPattern
              }
            };

            forcedSources.push(forcedSource);

            this.appliedRules.push({
              action: 'include',
              path: match,
              pattern: globPattern,
              reason: `Forced inclusion by pattern: ${globPattern}`
            });

            if (this.verbose) {
              console.log(`➕ Included: ${match} (pattern: ${globPattern})`);
            }
          }
        }
      } catch (error) {
        if (this.verbose) {
          console.warn(`⚠️  Include pattern failed: ${globPattern} - ${error.message}`);
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
    // Normalize path for matching
    const normalizedPath = filePath.startsWith('./') ? filePath.slice(2) : filePath;
    const relativePath = path.relative(this.rootPath, filePath);

    // Simple exact match
    if (pattern === filePath || pattern === relativePath || pattern === normalizedPath) {
      return true;
    }

    // Minimatch pattern matching (works with glob patterns on path strings)
    try {
      if (minimatch(normalizedPath, pattern, { matchBase: true })) return true;
      if (minimatch(relativePath, pattern, { matchBase: true })) return true;
      if (minimatch(filePath, pattern, { matchBase: true })) return true;
    } catch (error) {
      // Fallback to simple string matching
    }

    return filePath.includes(pattern) || relativePath.includes(pattern);
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