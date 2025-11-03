/**
 * Token Extract Command Implementation
 * Extract design tokens from all detected sources
 */

export default async function extract(projectPath = '.', options) {
  try {
    const { UniversalTokenExtractor } = await import('../../../src/tokens/extractor.js');
    const { TokenDetector } = await import('../../../src/tokens/detector.js');
    const fs = await import('fs/promises');
    const path = await import('path');
    const chalk = await import('chalk');
    
    if (!options.json && options.verbose) {
      console.log(chalk.default.blue(`🎨 Extracting tokens from: ${projectPath}`));
      console.log(chalk.default.gray(`Output: ${options.output}`));
      console.log(chalk.default.gray(`Format: ${options.format}`));
    }
    
    // Detect token sources first
    const detector = new TokenDetector(projectPath, { verbose: options.verbose });
    const targetSources = options.sources ? options.sources.split(',').map(s => s.trim()) : [];
    const detectedSources = await detector.detectAll(targetSources);
    
    if (detectedSources.length === 0) {
      throw new Error('No token sources detected. Run `dcp tokens detect` first.');
    }
    
    // Initialize extractor
    const extractor = new UniversalTokenExtractor({
      verbose: options.verbose,
      includeMetadata: options.includeMetadata,
      overridesFile: options.overrides
    });
    
    // Extract tokens from all sources
    const extractedTokens = [];
    let totalTokens = 0;
    
    for (const source of detectedSources) {
      if (!options.json && options.verbose) {
        console.log(chalk.default.gray(`Extracting from ${source.type}...`));
      }
      
      const tokens = await extractor.extractFromSource(source, projectPath);
      if (tokens && tokens.length > 0) {
        extractedTokens.push({
          source: source.type,
          confidence: source.confidence,
          tokens: tokens,
          count: tokens.length
        });
        totalTokens += tokens.length;
      }
    }
    
    // Ensure output directory exists
    await fs.mkdir(options.output, { recursive: true });
    
    // Write extracted tokens
    const outputFile = path.join(options.output, `tokens.${options.format === 'json' ? 'json' : options.format}`);
    
    const result = {
      format: options.format,
      extractedAt: new Date().toISOString(),
      sources: extractedTokens,
      totalTokens,
      metadata: {
        projectPath,
        detectedSources: detectedSources.length,
        extractorVersion: '3.0.0'
      }
    };
    
    if (options.format === 'dcp') {
      await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
    } else if (options.format === 'style-dictionary') {
      // Convert to Style Dictionary format
      const sdTokens = extractor.convertToStyleDictionary(extractedTokens);
      await fs.writeFile(outputFile, JSON.stringify(sdTokens, null, 2));
    } else if (options.format === 'css') {
      // Convert to CSS custom properties
      const cssContent = extractor.convertToCSS(extractedTokens);
      await fs.writeFile(outputFile.replace('.css', '.css'), cssContent);
    }
    
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        outputFile,
        totalTokens,
        sources: extractedTokens.map(s => ({ type: s.source, count: s.count }))
      }, null, 2));
    } else {
      console.log(chalk.default.green(`✅ Extracted ${totalTokens} tokens from ${extractedTokens.length} sources`));
      console.log(chalk.default.gray(`📄 Output: ${outputFile}`));
      
      if (options.verbose) {
        extractedTokens.forEach(source => {
          console.log(chalk.default.gray(`  • ${source.source}: ${source.count} tokens`));
        });
      }
    }
    
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ 
        success: false, 
        error: error.message,
        path: projectPath 
      }, null, 2));
    } else {
      console.error('❌ Token extraction failed:', error.message);
    }
    process.exit(1);
  }
}