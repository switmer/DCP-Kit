/**
 * Publish Command Handler
 * Publish component packs to static hosting
 */

import chalk from 'chalk';

export default async function publish(packsDir, options = {}) {
  try {
    const { runPublishStatic } = await import('../../commands/publish-static.js');
    
    if (!options.json) {
      console.log(chalk.blue(`📤 Publishing packs from ${packsDir}...`));
    }
    
    const result = await runPublishStatic(packsDir, options);
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.dryRun) {
        console.log(chalk.yellow(`🔍 Dry run completed - ${result.files} files ready to upload`));
      } else {
        console.log(chalk.green(`✅ Published ${result.files} files successfully`));
        if (result.errors > 0) {
          console.log(chalk.yellow(`⚠️  ${result.errors} files failed to upload`));
        }
        console.log(chalk.gray(`🌍 Registry URL: ${result.registryUrl}`));
      }
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
    } else {
      console.error(chalk.red('❌ Publish failed:'), error.message);
    }
    process.exit(1);
  }
}

