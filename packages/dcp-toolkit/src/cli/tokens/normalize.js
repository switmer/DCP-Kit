/**
 * Token Normalize Command Implementation
 * Normalize tokens to standard DCP format
 */

import chalk from 'chalk';

export default async function normalize(inputFile, options) {
  try {
    const { UniversalTokenExtractor } = await import('../../../src/tokens/extractor.js');
    const fs = await import('fs/promises');
    const path = await import('path');
    
    if (!options.json && options.verbose) {
      console.log(chalk.blue(`🔄 Normalizing tokens: ${inputFile}`));
      console.log(chalk.gray(`From: ${options.from} → To: ${options.to}`));
    }
    
    // Read input file
    const inputContent = await fs.readFile(inputFile, 'utf-8');
    let inputTokens;
    
    try {
      inputTokens = JSON.parse(inputContent);
    } catch (error) {
      throw new Error(`Invalid JSON in input file: ${error.message}`);
    }
    
    const extractor = new UniversalTokenExtractor({ verbose: options.verbose });
    
    // Detect format if not specified
    let sourceFormat = options.from;
    if (sourceFormat === 'detect') {
      sourceFormat = extractor.detectFormat(inputTokens, inputFile);
      if (!options.json && options.verbose) {
        console.log(chalk.gray(`Detected format: ${sourceFormat}`));
      }
    }
    
    // Normalize tokens
    let normalizedTokens;
    if (sourceFormat === 'style-dictionary') {
      normalizedTokens = extractor.normalizeFromStyleDictionary(inputTokens);
    } else if (sourceFormat === 'tailwind') {
      normalizedTokens = extractor.normalizeFromTailwind(inputTokens);
    } else if (sourceFormat === 'css') {
      normalizedTokens = extractor.normalizeFromCSS(inputTokens);
    } else if (sourceFormat === 'dcp') {
      normalizedTokens = inputTokens; // Already in DCP format
    } else {
      throw new Error(`Unsupported source format: ${sourceFormat}`);
    }
    
    // Filter by categories if specified
    if (options.categories) {
      const targetCategories = options.categories.split(',').map(c => c.trim());
      normalizedTokens = extractor.filterByCategories(normalizedTokens, targetCategories);
    }
    
    // Convert to target format
    let outputTokens;
    if (options.to === 'dcp') {
      outputTokens = normalizedTokens;
    } else if (options.to === 'style-dictionary') {
      outputTokens = extractor.convertToStyleDictionary([{ tokens: normalizedTokens }]);
    } else if (options.to === 'css') {
      outputTokens = extractor.convertToCSS([{ tokens: normalizedTokens }]);
    } else {
      throw new Error(`Unsupported target format: ${options.to}`);
    }
    
    // Determine output file
    const outputFile = options.output || 
      path.join(path.dirname(inputFile), `normalized-${path.basename(inputFile, path.extname(inputFile))}.json`);
    
    // Write output
    if (options.to === 'css') {
      await fs.writeFile(outputFile.replace('.json', '.css'), outputTokens);
    } else {
      await fs.writeFile(outputFile, JSON.stringify(outputTokens, null, 2));
    }
    
    const tokenCount = Array.isArray(normalizedTokens) ? normalizedTokens.length : 
      Object.keys(normalizedTokens).length;
    
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        inputFile,
        outputFile,
        sourceFormat,
        targetFormat: options.to,
        tokenCount
      }, null, 2));
    } else {
      console.log(chalk.green(`✅ Normalized ${tokenCount} tokens`));
      console.log(chalk.gray(`📄 Output: ${outputFile}`));
      console.log(chalk.gray(`🔄 ${sourceFormat} → ${options.to}`));
    }
    
  } catch (error) {
    if (options.json) {
      console.error(JSON.stringify({
        success: false,
        error: error.message,
        inputFile
      }, null, 2));
    } else {
      console.error('❌ Token normalization failed:', error.message);
    }
    process.exit(1);
  }
}