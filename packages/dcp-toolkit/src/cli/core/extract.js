/**
 * Extract Command Implementation
 * Primary DCP command for component extraction with universal token pipeline
 */

export default async function extract(source, options) {
  try {
    // Project validation (unless skipped)
    if (!options.skipValidation) {
      const { ProjectValidator } = await import('../../../src/core/projectValidator.js');
      const validator = new ProjectValidator(source);
      const validation = await validator.validate();
      
      if (!validation.canProceed && !options.autoFix) {
        if (options.json) {
          console.log(JSON.stringify({ 
            success: false, 
            error: 'Project validation failed',
            issues: validation.issues,
            suggestion: 'Run with --auto-fix to attempt automatic fixes, or --skip-validation to proceed anyway'
          }, null, 2));
        } else {
          console.error('❌ Cannot proceed with extraction due to validation errors.');
          console.error('💡 Run with --auto-fix to attempt fixes, or --skip-validation to override.');
        }
        process.exit(1);
      }
      
      // Auto-fix if requested and there are fixable issues
      if (options.autoFix && validation.issues.some(i => i.autoFix)) {
        await validator.autoFix();
        console.log('🔧 Auto-fix completed. Re-running validation...\n');
        
        // Re-validate after fixes
        const revalidation = await validator.validate();
        if (!revalidation.canProceed) {
          if (options.json) {
            console.log(JSON.stringify({ 
              success: false, 
              error: 'Auto-fix did not resolve all critical issues',
              issues: revalidation.issues
            }, null, 2));
          } else {
            console.error('❌ Auto-fix did not resolve all critical issues.');
          }
          process.exit(1);
        }
      }
    }
    
    const { runExtract } = await import('../../../src/commands/extract-v3.js');
    
    if (!options.json) {
      console.log(`🔍 Extracting components from ${source}...`);
      if (options.autoDetectTokens) {
        console.log(`🎨 Universal Token Pipeline: Auto-detecting tokens from all sources...`);
      }
    }
    
    const result = await runExtract(source, { ...options, json: options.json });
    
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        components: result.registry.components.length,
        tokens: Object.keys(result.registry.tokens || {}).length,
        outputDir: result.outputDir,
        registryPath: `${result.outputDir}/registry.json`,
        adaptorUsage: result.summary.adaptorUsage,
        tokenSources: result.summary.tokenSources || []
      }, null, 2));
    } else {
      console.log(`✅ Extracted ${result.registry.components.length} components`);
      if (result.summary.tokenSources && result.summary.tokenSources.length > 0) {
        console.log(`🎨 Detected ${result.summary.tokenSources.length} token sources: ${result.summary.tokenSources.join(', ')}`);
      }
      console.log(`📁 Output: ${result.outputDir}/registry.json`);
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
    } else {
      console.error('❌ Extract failed:', error.message);
    }
    process.exit(1);
  }
}