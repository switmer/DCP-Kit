/**
 * Validate Command Implementation
 * Project validation for DCP extraction readiness
 */

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
    }
    
    process.exit(validation.canProceed ? 0 : 1);
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
    } else {
      console.error('❌ Validation failed:', error.message);
    }
    process.exit(1);
  }
}