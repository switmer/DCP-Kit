/**
 * Serve Command Handler
 * Serve component packs via HTTP for development
 */

import chalk from 'chalk';
import { jsonError } from '../output.js';
import { missingDepMessage } from '../../utils/optionalImport.js';

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
    const installHint = missingDepMessage(error, 'dcp registry serve', ['express', 'cors']);
    if (options.json) {
      jsonError(installHint ? new Error(installHint) : error);
    } else if (installHint) {
      console.error(chalk.red(`❌ ${installHint}`));
    } else {
      console.error(chalk.red('❌ Server failed:'), error.message);
    }
    process.exit(1);
  }
}

