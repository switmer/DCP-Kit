/**
 * Serve Command Handler
 * Serve component packs via HTTP for development
 */

import chalk from 'chalk';

export default async function serve(packsDir = './dist/packs', options = {}) {
  try {
    const { runServeRegistry } = await import('../../commands/serve-registry.js');
    
    if (!options.json) {
      console.log(chalk.blue(`🚀 Starting registry server for ${packsDir}...`));
    }
    
    const result = await runServeRegistry(packsDir, options);
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green(`✅ Registry server running at ${result.url}`));
      console.log(chalk.gray(`📁 Serving: ${result.packsDir}`));
      console.log(chalk.gray(`\nPress Ctrl+C to stop`));
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
    } else {
      console.error(chalk.red('❌ Server failed:'), error.message);
    }
    process.exit(1);
  }
}

