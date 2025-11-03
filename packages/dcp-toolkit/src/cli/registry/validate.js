/**
 * Registry Validate Command Handler
 * Validate registry structure against DCP schema
 */

import chalk from 'chalk';

export default async function validate(registry, options = {}) {
  try {
    const { validateRegistry } = await import('../../commands/validate.js');
    
    if (!options.json) {
      console.log(chalk.blue(`✅ Validating ${registry}...`));
    }
    
    const result = await validateRegistry(registry, options);
    
    if (options.json) {
      console.log(JSON.stringify({
        success: result.success,
        valid: result.valid,
        componentsValidated: result.componentsValidated,
        errors: result.errors || [],
        warnings: result.warnings || [],
        registryPath: registry
      }, null, 2));
    } else {
      if (result.success) {
        console.log(chalk.green(`✅ Validation passed`));
      } else {
        console.log(chalk.red(`❌ Validation failed`));
      }
      console.log(chalk.gray(`📊 Components validated: ${result.componentsValidated || 0}`));
    }
    
    // Exit with non-zero code if validation failed
    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ 
        success: false, 
        valid: false,
        componentsValidated: 0,
        errors: [error.message],
        warnings: [],
        registryPath: registry
      }, null, 2));
    } else {
      console.error(chalk.red('❌ Validation failed:'), error.message);
    }
    process.exit(1);
  }
}

