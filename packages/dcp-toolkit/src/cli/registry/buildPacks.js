/**
 * Build Packs Command Handler
 * Build static component packages for distribution
 */

import chalk from 'chalk';

export default async function buildPacks(registry, options = {}) {
  try {
    const { runBuildPacks } = await import('../../commands/build-packs.js');
    
    if (!options.json) {
      console.log(chalk.blue(`📦 Building component packs from ${registry}...`));
    }
    
    const result = await runBuildPacks(registry, options);
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green(`✅ Built ${result.packs} component packs`));
      if (result.errors > 0) {
        console.log(chalk.yellow(`⚠️  ${result.errors} components failed to build`));
      }
      console.log(chalk.gray(`📁 Output: ${result.outputDir}`));
      console.log(chalk.gray(`📋 Index: ${result.indexUrl}`));
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
    } else {
      console.error(chalk.red('❌ Build failed:'), error.message);
    }
    process.exit(1);
  }
}

