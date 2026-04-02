/**
 * Validate Command Implementation
 * Project validation for DCP extraction readiness
 */

import chalk from 'chalk';
import { jsonError } from '../output.js';

export default async function validate(projectPath = '.', options) {
  try {
    const { ProjectValidator } = await import('../../../src/core/projectValidator.js');
    const validator = new ProjectValidator(projectPath);
    const validation = await validator.validate();
    
    // Auto-fix if requested
    if (options.autoFix && validation.issues.some(i => i.autoFix)) {
      await validator.autoFix();
      console.log('🔧 Auto-fix completed. Re-running validation...\n');
      
      const revalidation = await validator.validate();
      
      if (options.json) {
        console.log(JSON.stringify({
          success: revalidation.valid,
          canProceed: revalidation.canProceed,
          autoFixApplied: true,
          ...revalidation.summary
        }, null, 2));
      }
      process.exit(revalidation.canProceed ? 0 : 1);
    }
    
    if (options.json) {
      console.log(JSON.stringify({
        success: validation.valid,
        canProceed: validation.canProceed,
        issues: validation.issues,
        warnings: validation.warnings,
        suggestions: validation.suggestions,
        ...validation.summary
      }, null, 2));
    } else {
      const issueCount = validation.issues?.length || 0;
      const warningCount = validation.warnings?.length || 0;

      if (issueCount > 0) {
        console.log(chalk.red(`❌ ${issueCount} issue(s) found:`));
        validation.issues.forEach(i => console.log(chalk.red(`  - ${i.message || i}`)));
      }
      if (warningCount > 0) {
        console.log(chalk.yellow(`⚠️  ${warningCount} warning(s):`));
        validation.warnings.forEach(w => console.log(chalk.yellow(`  - ${w.message || w}`)));
      }
      if (validation.suggestions?.length > 0) {
        console.log(chalk.gray(`💡 ${validation.suggestions.length} suggestion(s)`));
      }

      if (validation.canProceed) {
        console.log(chalk.green('✅ Validation passed'));
      } else {
        console.log(chalk.red('❌ Validation failed'));
      }
    }

    process.exit(validation.canProceed ? 0 : 1);
  } catch (error) {
    if (options.json) {
      jsonError(error);
    } else {
      console.error('❌ Validation failed:', error.message);
    }
    process.exit(1);
  }
}