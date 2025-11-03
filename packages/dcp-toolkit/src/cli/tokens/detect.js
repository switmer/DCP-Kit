/**
 * Token Detect Command Implementation
 * Auto-detect available design token sources in project
 */

export default async function detect(projectPath = '.', options) {
  try {
    const { TokenDetector } = await import('../../../src/tokens/detector.js');
    const fs = await import('fs/promises');
    const chalk = await import('chalk');
    
    if (!options.json && options.verbose) {
      console.log(chalk.default.blue(`🔍 Detecting token sources in: ${projectPath}`));
      console.log(chalk.default.gray(`Confidence threshold: ${options.confidence}`));
    }
    
    const detector = new TokenDetector(projectPath, {
      verbose: options.verbose,
      confidenceThreshold: parseFloat(options.confidence)
    });
    
    // Filter sources if specified
    const targetSources = options.sources ? options.sources.split(',').map(s => s.trim()) : [];
    const detectedSources = await detector.detectAll(targetSources);
    
    const result = {
      success: true,
      path: projectPath,
      sources: detectedSources,
      count: detectedSources.length,
      confidenceThreshold: parseFloat(options.confidence)
    };
    
    // Output to file if requested
    if (options.output) {
      await fs.writeFile(options.output, JSON.stringify(result, null, 2));
      if (!options.json) {
        console.log(chalk.default.green(`✅ Detection results saved: ${options.output}`));
      }
    }
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.default.green(`✅ Found ${detectedSources.length} token sources:`));
      detectedSources.forEach(source => {
        const confidence = (source.confidence * 100).toFixed(0);
        console.log(chalk.default.gray(`  • ${source.type} (${confidence}% confidence) - ${source.description}`));
        if (options.verbose && source.files?.length > 0) {
          console.log(chalk.default.gray(`    Files: ${source.files.slice(0, 3).join(', ')}${source.files.length > 3 ? '...' : ''}`));
        }
      });
    }
    
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ 
        success: false, 
        error: error.message,
        path: projectPath 
      }, null, 2));
    } else {
      console.error('❌ Token detection failed:', error.message);
    }
    process.exit(1);
  }
}