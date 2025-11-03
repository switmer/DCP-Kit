/**
 * Token Merge Command Implementation
 * Merge multiple token files into unified collection
 */

export default async function merge(sourceFiles, options) {
  try {
    const { UniversalTokenExtractor } = await import('../../../src/tokens/extractor.js');
    const fs = await import('fs/promises');
    const path = await import('path');
    const chalk = await import('chalk');
    
    if (!options.json && options.verbose) {
      console.log(chalk.default.blue(`🔀 Merging ${sourceFiles.length} token files`));
      console.log(chalk.default.gray(`Strategy: ${options.strategy}`));
      console.log(chalk.default.gray(`Output: ${options.output}`));
    }
    
    if (sourceFiles.length < 2) {
      throw new Error('At least 2 source files are required for merging');
    }
    
    const extractor = new UniversalTokenExtractor({ verbose: options.verbose });
    
    // Load all source files
    const loadedSources = [];
    for (const sourceFile of sourceFiles) {
      try {
        const content = await fs.readFile(sourceFile, 'utf-8');
        const tokens = JSON.parse(content);
        const format = extractor.detectFormat(tokens, sourceFile);
        
        loadedSources.push({
          file: sourceFile,
          format,
          tokens: format === 'dcp' ? tokens : extractor.normalizeFromFormat(tokens, format),
          basename: path.basename(sourceFile, path.extname(sourceFile))
        });
        
        if (!options.json && options.verbose) {
          console.log(chalk.default.gray(`✓ Loaded ${sourceFile} (${format})`));
        }
      } catch (error) {
        throw new Error(`Failed to load ${sourceFile}: ${error.message}`);
      }
    }
    
    // Apply priority order if specified
    if (options.priority) {
      const priorityOrder = options.priority.split(',').map(p => p.trim());
      loadedSources.sort((a, b) => {
        const aIndex = priorityOrder.findIndex(p => a.basename.includes(p) || a.file.includes(p));
        const bIndex = priorityOrder.findIndex(p => b.basename.includes(p) || b.file.includes(p));
        
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }
    
    // Merge tokens based on strategy
    let mergedTokens = {};
    const conflicts = [];
    let totalTokens = 0;
    
    for (const source of loadedSources) {
      const sourceTokens = Array.isArray(source.tokens) ? 
        source.tokens.reduce((acc, token) => ({ ...acc, [token.name]: token }), {}) :
        source.tokens;
      
      for (const [tokenName, tokenValue] of Object.entries(sourceTokens)) {
        if (mergedTokens[tokenName]) {
          // Conflict detected
          const conflict = {
            token: tokenName,
            existing: mergedTokens[tokenName],
            new: tokenValue,
            source: source.file
          };
          
          if (options.strategy === 'error') {
            throw new Error(`Token conflict: "${tokenName}" exists in multiple sources`);
          } else if (options.strategy === 'override') {
            mergedTokens[tokenName] = tokenValue;
            conflicts.push({ ...conflict, resolution: 'overridden' });
          } else { // merge strategy
            mergedTokens[tokenName] = extractor.mergeTokenValues(mergedTokens[tokenName], tokenValue);
            conflicts.push({ ...conflict, resolution: 'merged' });
          }
        } else {
          mergedTokens[tokenName] = tokenValue;
        }
        totalTokens++;
      }
    }
    
    // Interactive conflict resolution if requested
    if (options.resolveConflicts && conflicts.length > 0) {
      console.log(chalk.default.yellow(`⚠️  Found ${conflicts.length} conflicts. Resolve interactively? (y/N)`));
      // Implementation would require readline for interactive prompts
      // For now, just log conflicts
      conflicts.forEach(conflict => {
        console.log(chalk.default.yellow(`Conflict: ${conflict.token} (resolved: ${conflict.resolution})`));
      });
    }
    
    // Create merged result
    const result = {
      mergedAt: new Date().toISOString(),
      sources: loadedSources.map(s => ({ file: s.file, format: s.format })),
      strategy: options.strategy,
      totalTokens,
      conflicts: conflicts.length,
      tokens: mergedTokens
    };
    
    // Write output
    await fs.writeFile(options.output, JSON.stringify(result, null, 2));
    
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        outputFile: options.output,
        totalTokens,
        conflicts: conflicts.length,
        sources: sourceFiles
      }, null, 2));
    } else {
      console.log(chalk.default.green(`✅ Merged ${totalTokens} tokens from ${sourceFiles.length} sources`));
      console.log(chalk.default.gray(`📄 Output: ${options.output}`));
      
      if (conflicts.length > 0) {
        console.log(chalk.default.yellow(`⚠️  Resolved ${conflicts.length} conflicts using "${options.strategy}" strategy`));
      }
      
      if (options.verbose) {
        loadedSources.forEach(source => {
          const count = Array.isArray(source.tokens) ? source.tokens.length : Object.keys(source.tokens).length;
          console.log(chalk.default.gray(`  • ${source.file}: ${count} tokens (${source.format})`));
        });
      }
    }
    
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ 
        success: false, 
        error: error.message,
        sources: sourceFiles 
      }, null, 2));
    } else {
      console.error('❌ Token merge failed:', error.message);
    }
    process.exit(1);
  }
}