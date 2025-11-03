/**
 * Validate CI Command Handler
 * Comprehensive validation for CI/CD pipelines
 */

import chalk from 'chalk';

export default async function validateCi(validatePath = '.', options = {}) {
  try {
    // Import and use the existing validate command logic
    const { ProjectValidator } = await import('../../core/projectValidator.js');
    const validator = new ProjectValidator(validatePath);
    const validation = await validator.validate();
    
    if (options.json) {
      console.log(JSON.stringify({
        success: validation.valid,
        canProceed: validation.canProceed,
        issues: validation.issues,
        warnings: validation.warnings,
        suggestions: validation.suggestions,
        ...validation.summary
      }, null, 2));
      process.exit(validation.canProceed ? 0 : 1);
      return;
    }
    
    if (validation.valid) {
      console.log(chalk.green('✅ Validation passed'));
    } else {
      console.log(chalk.red('❌ Validation failed'));
    }
    
    if (validation.issues.length > 0) {
      console.log(chalk.yellow(`\nIssues found: ${validation.issues.length}`));
      validation.issues.forEach(issue => {
        console.log(chalk.red(`  • ${issue.message}`));
      });
    }
    
    if (validation.warnings.length > 0) {
      console.log(chalk.yellow(`\nWarnings: ${validation.warnings.length}`));
      validation.warnings.forEach(warning => {
        console.log(chalk.yellow(`  • ${warning.message}`));
      });
    }
    
    if (options.strict && (validation.issues.length > 0 || validation.warnings.length > 0)) {
      console.log(chalk.red('\nStrict mode: Failing due to issues/warnings'));
      process.exit(1);
      return;
    }
    
    process.exit(validation.canProceed ? 0 : 1);
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
    } else {
      console.error(chalk.red('❌ Validation failed:'), error.message);
    }
    process.exit(1);
  }
}

