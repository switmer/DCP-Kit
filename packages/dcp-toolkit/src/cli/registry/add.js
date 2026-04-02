/**
 * Add Command Handler
 * Install a component from a registry (Zero-Fetch v2)
 */

import chalk from 'chalk';
import { jsonError } from '../output.js';

export default async function add(componentUrl, options = {}) {
  try {
    // Use v2 installer with full spec support
    const { runDcpAdd } = await import('../../commands/dcp-add-v2.js');
    
    if (!options.json && options.verbose) {
      console.log(chalk.blue(`📦 Installing component from ${componentUrl}...`));
    }
    
    // Map CLI options to v2 installer options
    const installerOptions = {
      target: options.target,
      pm: options.pm,
      token: options.token || process.env.DCP_REGISTRY_TOKEN,
      dryRun: options.dryRun,
      yes: options.yes,
      overwrite: options.overwrite || (options.force ? 'force' : 'prompt'),
      registryFormat: options.registryFormat || 'shadcn',
      verbose: options.verbose,
    };
    
    const result = await runDcpAdd(componentUrl, installerOptions);
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.dryRun) {
        console.log(chalk.yellow(`🔍 Dry run completed - component ready to install`));
      } else {
        console.log(chalk.green(`✅ Successfully installed ${result.component.name}`));
        console.log(chalk.gray(`📁 Location: ${result.targetDir}`));
        console.log(chalk.gray(`📄 Files: ${result.files.length}`));
        if (result.depsInstalled) {
          console.log(chalk.gray(`📦 Dependencies: Updated`));
        }
      }
    }
  } catch (error) {
    if (options.json) {
      jsonError(error);
    } else {
      console.error(chalk.red('❌ Installation failed:'), error.message);
    }
    process.exit(1);
  }
}
