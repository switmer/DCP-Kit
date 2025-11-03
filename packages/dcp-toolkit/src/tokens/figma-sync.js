/**
 * Figma Token Synchronization Utility
 * Synchronizes Figma design variables with DCP-extracted design tokens
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export class FigmaTokenSync {
  constructor(options = {}) {
    this.registryPath = options.registryPath || './registry';
    this.figmaVariablesFile = options.figmaVariablesFile;
    this.outputPath = options.outputPath || './tokens';
    this.verbose = options.verbose || false;
    
    this.dcpTokens = null;
    this.figmaVariables = null;
  }

  /**
   * Load DCP registry tokens
   */
  async loadDCPTokens() {
    try {
      const registryFile = path.join(this.registryPath, 'registry.json');
      const registryContent = await fs.readFile(registryFile, 'utf-8');
      const registry = JSON.parse(registryContent);
      
      this.dcpTokens = registry.tokens || {};
      
      if (this.verbose) {
        console.log(chalk.green(`✓ Loaded ${Object.keys(this.dcpTokens).length} DCP tokens`));
      }
      
      return this.dcpTokens;
    } catch (error) {
      throw new Error(`Failed to load DCP registry: ${error.message}`);
    }
  }

  /**
   * Load Figma variables from file or API
   */
  async loadFigmaVariables() {
    if (this.figmaVariablesFile) {
      try {
        const variablesContent = await fs.readFile(this.figmaVariablesFile, 'utf-8');
        this.figmaVariables = JSON.parse(variablesContent);
        
        if (this.verbose) {
          console.log(chalk.green(`✓ Loaded ${Object.keys(this.figmaVariables).length} Figma variables`));
        }
      } catch (error) {
        throw new Error(`Failed to load Figma variables: ${error.message}`);
      }
    } else {
      // In a real implementation, this would use Figma API
      throw new Error('Figma variables file not provided. API integration not yet implemented.');
    }
    
    return this.figmaVariables;
  }

  /**
   * Create bidirectional mapping between Figma variables and DCP tokens
   */
  createTokenMapping() {
    if (!this.dcpTokens || !this.figmaVariables) {
      throw new Error('Both DCP tokens and Figma variables must be loaded first');
    }

    const mapping = {
      figmaToDcp: {},
      dcpToFigma: {},
      conflicts: [],
      unmapped: {
        figma: [],
        dcp: []
      },
      categories: {}
    };

    // Track processed tokens
    const processedDcp = new Set();
    const processedFigma = new Set();

    // First pass: exact name matches
    for (const [figmaKey, figmaVar] of Object.entries(this.figmaVariables)) {
      for (const [dcpKey, dcpToken] of Object.entries(this.dcpTokens)) {
        if (this.isExactMatch(figmaKey, dcpKey, figmaVar, dcpToken)) {
          mapping.figmaToDcp[figmaKey] = dcpKey;
          mapping.dcpToFigma[dcpKey] = figmaKey;
          processedFigma.add(figmaKey);
          processedDcp.add(dcpKey);
          
          this.categorizeMapping(mapping, figmaKey, dcpKey, figmaVar, dcpToken);
          break;
        }
      }
    }

    // Second pass: semantic matches
    for (const [figmaKey, figmaVar] of Object.entries(this.figmaVariables)) {
      if (processedFigma.has(figmaKey)) continue;

      for (const [dcpKey, dcpToken] of Object.entries(this.dcpTokens)) {
        if (processedDcp.has(dcpKey)) continue;

        if (this.isSemanticMatch(figmaKey, dcpKey, figmaVar, dcpToken)) {
          // Check for conflicts
          if (mapping.figmaToDcp[figmaKey] || mapping.dcpToFigma[dcpKey]) {
            mapping.conflicts.push({
              figma: figmaKey,
              dcp: dcpKey,
              reason: 'Multiple potential matches found'
            });
            continue;
          }

          mapping.figmaToDcp[figmaKey] = dcpKey;
          mapping.dcpToFigma[dcpKey] = figmaKey;
          processedFigma.add(figmaKey);
          processedDcp.add(dcpKey);
          
          this.categorizeMapping(mapping, figmaKey, dcpKey, figmaVar, dcpToken);
          break;
        }
      }
    }

    // Third pass: value-based matches for similar types
    for (const [figmaKey, figmaVar] of Object.entries(this.figmaVariables)) {
      if (processedFigma.has(figmaKey)) continue;

      for (const [dcpKey, dcpToken] of Object.entries(this.dcpTokens)) {
        if (processedDcp.has(dcpKey)) continue;

        if (this.isValueMatch(figmaKey, dcpKey, figmaVar, dcpToken)) {
          mapping.figmaToDcp[figmaKey] = dcpKey;
          mapping.dcpToFigma[dcpKey] = figmaKey;
          processedFigma.add(figmaKey);
          processedDcp.add(dcpKey);
          
          this.categorizeMapping(mapping, figmaKey, dcpKey, figmaVar, dcpToken);
          break;
        }
      }
    }

    // Collect unmapped tokens
    mapping.unmapped.figma = Object.keys(this.figmaVariables).filter(k => !processedFigma.has(k));
    mapping.unmapped.dcp = Object.keys(this.dcpTokens).filter(k => !processedDcp.has(k));

    return mapping;
  }

  /**
   * Check for exact name matches
   */
  isExactMatch(figmaKey, dcpKey, figmaVar, dcpToken) {
    const normalizedFigma = this.normalizeTokenName(figmaKey);
    const normalizedDcp = this.normalizeTokenName(dcpKey);
    
    return normalizedFigma === normalizedDcp;
  }

  /**
   * Check for semantic matches (similar meaning)
   */
  isSemanticMatch(figmaKey, dcpKey, figmaVar, dcpToken) {
    const figmaTokens = this.tokenizeTokenName(figmaKey);
    const dcpTokens = this.tokenizeTokenName(dcpKey);
    
    // Check if they share significant semantic tokens
    const commonTokens = figmaTokens.filter(token => dcpTokens.includes(token));
    const significantTokens = commonTokens.filter(token => this.isSignificantToken(token));
    
    // Must share at least one significant semantic token
    if (significantTokens.length === 0) return false;
    
    // Must be the same type
    if (!this.isSameTokenType(figmaVar, dcpToken)) return false;
    
    // Calculate similarity score
    const similarity = significantTokens.length / Math.max(figmaTokens.length, dcpTokens.length);
    return similarity >= 0.6; // 60% similarity threshold
  }

  /**
   * Check for value-based matches
   */
  isValueMatch(figmaKey, dcpKey, figmaVar, dcpToken) {
    // Only match if types are compatible
    if (!this.isSameTokenType(figmaVar, dcpToken)) return false;
    
    // Normalize values for comparison
    const figmaValue = this.normalizeTokenValue(figmaVar.value, figmaVar.type);
    const dcpValue = this.normalizeTokenValue(dcpToken.value, dcpToken.type);
    
    return figmaValue === dcpValue;
  }

  /**
   * Categorize mapping by token type
   */
  categorizeMapping(mapping, figmaKey, dcpKey, figmaVar, dcpToken) {
    const category = this.getTokenCategory(figmaVar, dcpToken);
    
    if (!mapping.categories[category]) {
      mapping.categories[category] = [];
    }
    
    mapping.categories[category].push({
      figma: figmaKey,
      dcp: dcpKey,
      figmaValue: figmaVar.value,
      dcpValue: dcpToken.value,
      confidence: this.calculateMappingConfidence(figmaKey, dcpKey, figmaVar, dcpToken)
    });
  }

  /**
   * Normalize token names for comparison
   */
  normalizeTokenName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/^(color|size|spacing|font|shadow|border)/, '');
  }

  /**
   * Tokenize token name into semantic components
   */
  tokenizeTokenName(name) {
    return name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(token => token.length > 1)
      .filter(token => !['color', 'size', 'px', 'rem', 'var'].includes(token));
  }

  /**
   * Check if a token is semantically significant
   */
  isSignificantToken(token) {
    const significantTokens = [
      'primary', 'secondary', 'accent', 'neutral', 'background', 'foreground',
      'success', 'warning', 'error', 'info', 'destructive',
      'small', 'medium', 'large', 'xlarge', 'xxlarge',
      'light', 'normal', 'bold', 'semibold',
      'spacing', 'padding', 'margin', 'gap',
      'radius', 'rounded', 'border',
      'shadow', 'elevation'
    ];
    
    return significantTokens.includes(token);
  }

  /**
   * Check if tokens are the same type
   */
  isSameTokenType(figmaVar, dcpToken) {
    const figmaType = this.getFigmaTokenType(figmaVar);
    const dcpType = this.getDCPTokenType(dcpToken);
    
    const typeMap = {
      color: ['color'],
      dimension: ['spacing', 'fontSize', 'borderRadius', 'size'],
      string: ['fontFamily', 'fontWeight'],
      number: ['fontWeight', 'opacity'],
      effect: ['shadow', 'boxShadow']
    };
    
    for (const [baseType, variants] of Object.entries(typeMap)) {
      if (variants.includes(figmaType) && variants.includes(dcpType)) {
        return true;
      }
    }
    
    return figmaType === dcpType;
  }

  /**
   * Get Figma token type
   */
  getFigmaTokenType(figmaVar) {
    return figmaVar.type || 'string';
  }

  /**
   * Get DCP token type
   */
  getDCPTokenType(dcpToken) {
    return dcpToken.type || 'string';
  }

  /**
   * Get token category for organization
   */
  getTokenCategory(figmaVar, dcpToken) {
    const figmaType = this.getFigmaTokenType(figmaVar);
    const dcpType = this.getDCPTokenType(dcpToken);
    
    if (['color'].includes(figmaType) || ['color'].includes(dcpType)) return 'colors';
    if (['dimension', 'spacing'].includes(figmaType) || ['spacing', 'fontSize'].includes(dcpType)) return 'spacing';
    if (['string', 'fontFamily'].includes(figmaType) || ['fontFamily'].includes(dcpType)) return 'typography';
    if (['effect', 'shadow'].includes(figmaType) || ['shadow', 'boxShadow'].includes(dcpType)) return 'effects';
    
    return 'other';
  }

  /**
   * Normalize token values for comparison
   */
  normalizeTokenValue(value, type) {
    if (type === 'color') {
      // Normalize colors to hex format
      return this.normalizeColorValue(value);
    }
    
    if (type === 'dimension' || type === 'spacing') {
      // Normalize dimensions to px
      return this.normalizeDimensionValue(value);
    }
    
    return String(value).toLowerCase().trim();
  }

  /**
   * Normalize color values
   */
  normalizeColorValue(color) {
    // This would use a color library like colord for proper normalization
    return String(color).toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Normalize dimension values
   */
  normalizeDimensionValue(dimension) {
    const value = String(dimension);
    
    // Convert rem to px (assuming 16px base)
    if (value.includes('rem')) {
      const num = parseFloat(value);
      return `${num * 16}px`;
    }
    
    return value;
  }

  /**
   * Calculate mapping confidence score
   */
  calculateMappingConfidence(figmaKey, dcpKey, figmaVar, dcpToken) {
    let score = 0;
    
    // Exact name match gets highest score
    if (this.isExactMatch(figmaKey, dcpKey, figmaVar, dcpToken)) {
      score += 0.5;
    }
    
    // Type compatibility
    if (this.isSameTokenType(figmaVar, dcpToken)) {
      score += 0.3;
    }
    
    // Value similarity
    if (this.isValueMatch(figmaKey, dcpKey, figmaVar, dcpToken)) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Generate synchronization report
   */
  generateSyncReport(mapping) {
    const totalFigma = Object.keys(this.figmaVariables).length;
    const totalDcp = Object.keys(this.dcpTokens).length;
    const mapped = Object.keys(mapping.figmaToDcp).length;
    
    return {
      summary: {
        figmaTokens: totalFigma,
        dcpTokens: totalDcp,
        mappedPairs: mapped,
        mappingRate: `${Math.round((mapped / totalFigma) * 100)}%`,
        conflicts: mapping.conflicts.length,
        unmappedFigma: mapping.unmapped.figma.length,
        unmappedDcp: mapping.unmapped.dcp.length
      },
      categories: Object.entries(mapping.categories).map(([category, items]) => ({
        category,
        count: items.length,
        averageConfidence: items.reduce((sum, item) => sum + item.confidence, 0) / items.length,
        items: items.sort((a, b) => b.confidence - a.confidence)
      })),
      issues: {
        conflicts: mapping.conflicts,
        unmappedFigma: mapping.unmapped.figma.map(key => ({
          name: key,
          value: this.figmaVariables[key].value,
          type: this.figmaVariables[key].type,
          suggestions: this.suggestDCPMatches(key, this.figmaVariables[key])
        })),
        unmappedDcp: mapping.unmapped.dcp.map(key => ({
          name: key,
          value: this.dcpTokens[key].value,
          type: this.dcpTokens[key].type,
          suggestions: this.suggestFigmaMatches(key, this.dcpTokens[key])
        }))
      }
    };
  }

  /**
   * Suggest potential DCP matches for unmapped Figma variables
   */
  suggestDCPMatches(figmaKey, figmaVar) {
    const suggestions = [];
    
    for (const [dcpKey, dcpToken] of Object.entries(this.dcpTokens)) {
      const similarity = this.calculateSimilarity(figmaKey, dcpKey, figmaVar, dcpToken);
      if (similarity > 0.3) {
        suggestions.push({
          name: dcpKey,
          similarity,
          reason: this.getSimilarityReason(figmaKey, dcpKey, figmaVar, dcpToken)
        });
      }
    }
    
    return suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }

  /**
   * Suggest potential Figma matches for unmapped DCP tokens
   */
  suggestFigmaMatches(dcpKey, dcpToken) {
    const suggestions = [];
    
    for (const [figmaKey, figmaVar] of Object.entries(this.figmaVariables)) {
      const similarity = this.calculateSimilarity(figmaKey, dcpKey, figmaVar, dcpToken);
      if (similarity > 0.3) {
        suggestions.push({
          name: figmaKey,
          similarity,
          reason: this.getSimilarityReason(figmaKey, dcpKey, figmaVar, dcpToken)
        });
      }
    }
    
    return suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }

  /**
   * Calculate similarity score between two tokens
   */
  calculateSimilarity(key1, key2, var1, var2) {
    let score = 0;
    
    // Name similarity
    const normalizedKey1 = this.normalizeTokenName(key1);
    const normalizedKey2 = this.normalizeTokenName(key2);
    if (normalizedKey1 === normalizedKey2) score += 0.4;
    else if (normalizedKey1.includes(normalizedKey2) || normalizedKey2.includes(normalizedKey1)) score += 0.2;
    
    // Semantic similarity
    const tokens1 = this.tokenizeTokenName(key1);
    const tokens2 = this.tokenizeTokenName(key2);
    const commonTokens = tokens1.filter(token => tokens2.includes(token));
    if (commonTokens.length > 0) score += 0.3 * (commonTokens.length / Math.max(tokens1.length, tokens2.length));
    
    // Type similarity
    if (this.isSameTokenType(var1, var2)) score += 0.3;
    
    // Value similarity
    if (this.isValueMatch(key1, key2, var1, var2)) score += 0.3;
    
    return Math.min(score, 1.0);
  }

  /**
   * Get reason for similarity
   */
  getSimilarityReason(key1, key2, var1, var2) {
    const reasons = [];
    
    if (this.normalizeTokenName(key1) === this.normalizeTokenName(key2)) {
      reasons.push('identical normalized names');
    }
    
    if (this.isSameTokenType(var1, var2)) {
      reasons.push('same token type');
    }
    
    if (this.isValueMatch(key1, key2, var1, var2)) {
      reasons.push('identical values');
    }
    
    const tokens1 = this.tokenizeTokenName(key1);
    const tokens2 = this.tokenizeTokenName(key2);
    const commonTokens = tokens1.filter(token => tokens2.includes(token));
    if (commonTokens.length > 0) {
      reasons.push(`shared semantic tokens: ${commonTokens.join(', ')}`);
    }
    
    return reasons.join('; ') || 'unknown similarity';
  }

  /**
   * Export mapping and report to files
   */
  async exportResults(mapping, report) {
    await fs.mkdir(this.outputPath, { recursive: true });
    
    // Export mapping
    const mappingFile = path.join(this.outputPath, 'figma-dcp-mapping.json');
    await fs.writeFile(mappingFile, JSON.stringify(mapping, null, 2));
    
    // Export report
    const reportFile = path.join(this.outputPath, 'sync-report.json');
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    // Export human-readable report
    const readableReportFile = path.join(this.outputPath, 'sync-report.md');
    await fs.writeFile(readableReportFile, this.generateMarkdownReport(report));
    
    return {
      mapping: mappingFile,
      report: reportFile,
      readableReport: readableReportFile
    };
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    const { summary, categories, issues } = report;
    
    return `# Figma-DCP Token Synchronization Report

## Summary

- **Figma Variables**: ${summary.figmaTokens}
- **DCP Tokens**: ${summary.dcpTokens}
- **Mapped Pairs**: ${summary.mappedPairs} (${summary.mappingRate})
- **Conflicts**: ${summary.conflicts}
- **Unmapped Figma**: ${summary.unmappedFigma}
- **Unmapped DCP**: ${summary.unmappedDcp}

## Mappings by Category

${categories.map(cat => `### ${cat.category} (${cat.count} pairs)
- Average Confidence: ${Math.round(cat.averageConfidence * 100)}%

${cat.items.map(item => `- **${item.figma}** ↔ **${item.dcp}** (${Math.round(item.confidence * 100)}%)`).join('\n')}
`).join('\n')}

## Issues

### Conflicts (${issues.conflicts.length})

${issues.conflicts.map(conflict => `- **${conflict.figma}** ↔ **${conflict.dcp}**: ${conflict.reason}`).join('\n')}

### Unmapped Figma Variables (${issues.unmappedFigma.length})

${issues.unmappedFigma.map(item => `- **${item.name}** (\`${item.value}\`)
${item.suggestions.length > 0 ? `  - Suggestions: ${item.suggestions.map(s => `${s.name} (${Math.round(s.similarity * 100)}%)`).join(', ')}` : '  - No suggestions'}
`).join('\n')}

### Unmapped DCP Tokens (${issues.unmappedDcp.length})

${issues.unmappedDcp.map(item => `- **${item.name}** (\`${item.value}\`)
${item.suggestions.length > 0 ? `  - Suggestions: ${item.suggestions.map(s => `${s.name} (${Math.round(s.similarity * 100)}%)`).join(', ')}` : '  - No suggestions'}
`).join('\n')}
`;
  }

  /**
   * Main synchronization method
   */
  async sync() {
    if (this.verbose) {
      console.log(chalk.blue('🔗 Starting Figma-DCP token synchronization...'));
    }

    // Load tokens
    await this.loadDCPTokens();
    await this.loadFigmaVariables();

    // Create mapping
    if (this.verbose) {
      console.log(chalk.gray('Creating token mapping...'));
    }
    const mapping = this.createTokenMapping();

    // Generate report
    if (this.verbose) {
      console.log(chalk.gray('Generating synchronization report...'));
    }
    const report = this.generateSyncReport(mapping);

    // Export results
    const outputFiles = await this.exportResults(mapping, report);

    if (this.verbose) {
      console.log(chalk.green('\n✅ Token synchronization completed!'));
      console.log(chalk.gray(`   Mapped: ${report.summary.mappedPairs}/${report.summary.figmaTokens} tokens (${report.summary.mappingRate})`));
      console.log(chalk.gray(`   Files: ${outputFiles.mapping}, ${outputFiles.report}, ${outputFiles.readableReport}`));
    }

    return {
      mapping,
      report,
      outputFiles,
      success: true
    };
  }
}

/**
 * CLI function to run token synchronization
 */
export async function runFigmaTokenSync(options) {
  const sync = new FigmaTokenSync(options);
  return await sync.sync();
}