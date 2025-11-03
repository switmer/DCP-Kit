#!/usr/bin/env node

/**
 * DCP CLI - Next Generation (Rationalized Command Structure)
 * This is the new organized CLI that will replace bin/dcp.js
 */

import { program } from 'commander';
import { fileURLToPath } from 'url';
import path from 'path';
import { warnDeprecatedCommand, generateMigrationGuide } from '../src/cli/deprecation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

program
  .name('dcp')
  .description('Design Component Protocol Transformer - Rationalized CLI')
  .version('2.0.0')
  .addHelpText('after', `
🎯 Core Workflow:
  1. Validate:  dcp validate --auto-fix             # Ensure project is ready
  2. Extract:   dcp extract ./src --json > registry.json
  3. Build:     dcp build --config dcp.config.json
  4. Query:     dcp query "components where name = 'Button'"

🏗️ Command Groups:
  registry     Registry management operations
  tokens       Design token operations  
  workflow     Mutation and transformation workflow
  dev          Development tools and utilities
  export       Export and integration utilities

📚 Examples:
  dcp registry generate ./src/components/ui
  dcp tokens extract-radix ./node_modules/@radix-ui/themes
  dcp workflow agent "Make all buttons accessible"
  dcp dev watch ./src --out ./registry

Learn more: https://github.com/stevewitmer/dcp-transformer`);

// ===== CORE COMMANDS (Tier 1) =====

program
  .command('extract <source>')
  .description('Extract components from source directory (Universal v3 with token auto-detection)')
  .option('-o, --out <dir>', 'output directory', './registry')
  .option('-t, --tokens <file>', 'design tokens file (JSON)')
  .option('--auto-detect-tokens', 'automatically detect and extract tokens from all sources')
  .option('-g, --glob <pattern>', 'glob pattern for files (e.g., "**/*.{tsx,jsx}")')
  .option('-a, --adaptor <name>', 'force specific adaptor (react-tsx, vue-sfc, svelte)', 'react-tsx')
  .option('--flatten-tokens', 'extract CSS custom props as flat key-value pairs, skip Tailwind mapping')
  .option('--max-depth <number>', 'maximum barrel recursion depth', '10')
  .option('--trace-barrels', 'trace barrel file resolution for debugging')
  .option('--no-barrels', 'disable barrel file following')
  .option('--security-scan', 'scan for security issues and malicious patterns')
  .option('--validate-file-types', 'validate only expected file types are included')
  .option('--detect-obfuscation', 'detect obfuscated or minified code')
  .option('--agent-ready', 'optimize output for AI/agent consumption')
  .option('--skip-validation', 'skip project validation before extraction')
  .option('--auto-fix', 'automatically fix common configuration issues')
  .option('--verbose', 'enable verbose logging')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp extract ./src --json > registry.json
  $ dcp extract ./components --auto-detect-tokens --verbose  # Auto-detect all token sources
  $ dcp extract ./src --glob "**/*.tsx" --adaptor react-tsx --verbose
  $ dcp extract ./vue-components --adaptor vue-sfc --json
  $ dcp extract ./src --trace-barrels --max-depth 5  # Debug barrel resolution`)
  .action(async (source, options) => {
    try {
      // Project validation (unless skipped)
      if (!options.skipValidation) {
        const { ProjectValidator } = await import('../src/core/projectValidator.js');
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
      
      const { runExtract } = await import('../src/commands/extract-v3.js');
      
      if (!options.json) {
        console.log(`🔍 Extracting components from ${source}...`);
      }
      
      const result = await runExtract(source, { ...options, json: options.json });
      
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          components: result.registry.components.length,
          tokens: Object.keys(result.registry.tokens || {}).length,
          outputDir: result.outputDir,
          registryPath: `${result.outputDir}/registry.json`,
          adaptorUsage: result.summary.adaptorUsage
        }, null, 2));
      } else {
        console.log(`✅ Extracted ${result.registry.components.length} components`);
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
  });

program
  .command('validate [path]')
  .description('Validate project configuration for DCP extraction')
  .option('--auto-fix', 'automatically fix common configuration issues')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp validate                     # Validate current directory
  $ dcp validate ./src              # Validate specific path
  $ dcp validate --auto-fix         # Validate and fix issues`)
  .action(async (projectPath = '.', options) => {
    try {
      const { ProjectValidator } = await import('../src/core/projectValidator.js');
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
  });

program
  .command('build')
  .description('Build DCP registry from configuration')
  .option('-c, --config <path>', 'config file path', './dcp.config.json')
  .option('--verbose', 'verbose logging')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp build
  $ dcp build --config ./custom.config.json`)
  .action(async (options) => {
    try {
      const { runBuild } = await import('../src/commands/build.js');
      const result = await runBuild({
        configPath: options.config,
        verbose: options.verbose || !options.json
      });
      
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          components: result.components?.length || 0,
          configPath: options.config
        }, null, 2));
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Build failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('query <selector>')
  .description('Query design system registry with CSS-like selectors')
  .option('-r, --registry <path>', 'registry directory path', './registry')
  .option('-f, --format <format>', 'output format (json, table, list, count, default)', 'default')
  .option('-o, --output <file>', 'write results to file')
  .option('--pretty', 'pretty-print JSON output')
  .option('--verbose', 'verbose logging')
  .option('--json', 'machine-readable JSON output')
  .addHelpText('after', `
Examples:
  $ dcp query "tokens.color.*"                    # All color tokens
  $ dcp query "tokens where tokenSet != 'system'" # Non-system tokens
  $ dcp query "components where name = 'Button'"  # Button component
  $ dcp query "tokens.spacing.*" --format table   # Spacing tokens as table`)
  .action(async (selector, options) => {
    try {
      const { runQuery } = await import('../src/commands/query.js');
      await runQuery(selector, options);
    } catch (error) {
      if (options.json) {
        console.error(JSON.stringify({ error: error.message }));
      } else {
        console.error('❌ Query failed:', error.message);
      }
      process.exit(1);
    }
  });

// ===== COMMAND GROUPS (Tier 2) =====

// Import and add command groups
const { registryCommand } = await import('../src/cli/registry.js');
const { tokensCommand } = await import('../src/cli/tokens.js');

program.addCommand(registryCommand);
program.addCommand(tokensCommand);

// TODO: Add remaining command groups:
// - workflow (mutate, rollback, diff, agent)
// - dev (watch, transpile, validate-ci, demo, docs, api, companion)  
// - export (mcp, adaptors)

// ===== DEPRECATED COMMANDS (Tier 3) =====

// Add deprecated commands with warnings
program
  .command('radix-tokens [source]')
  .description('⚠️  DEPRECATED: Use "dcp tokens extract-radix" instead')
  .action(async (source, options) => {
    warnDeprecatedCommand('radix-tokens');
    
    // Delegate to new command
    const { tokensCommand } = await import('../src/cli/tokens.js');
    const extractRadixCmd = tokensCommand.commands.find(cmd => cmd.name() === 'extract-radix');
    if (extractRadixCmd) {
      await extractRadixCmd._actionHandler(source, options);
    }
  });

program
  .command('export-tokens <registry>')
  .description('⚠️  DEPRECATED: Use "dcp tokens export" instead')
  .action(async (registry, options) => {
    warnDeprecatedCommand('export-tokens');
    
    // Delegate to new command
    const { tokensCommand } = await import('../src/cli/tokens.js');
    const exportCmd = tokensCommand.commands.find(cmd => cmd.name() === 'export');
    if (exportCmd) {
      await exportCmd._actionHandler(registry, options);
    }
  });

program
  .command('build-packs <registry>')
  .description('⚠️  DEPRECATED: Use "dcp registry build-packs" instead')
  .action(async (registry, options) => {
    warnDeprecatedCommand('build-packs');
    
    // Delegate to new command  
    const { registryCommand } = await import('../src/cli/registry.js');
    const buildPacksCmd = registryCommand.commands.find(cmd => cmd.name() === 'build-packs');
    if (buildPacksCmd) {
      await buildPacksCmd._actionHandler(registry, options);
    }
  });

// ===== UTILITY COMMANDS =====

program
  .command('migration-guide')
  .description('Show CLI migration guide for deprecated commands')
  .action(() => {
    generateMigrationGuide();
  });

program
  .command('help-groups')
  .description('Show available command groups and their purposes')
  .action(() => {
    console.log(`
🎯 DCP Command Groups:

📋 registry    Registry management operations
   • generate    Generate ShadCN-compatible registry
   • build-packs Build component packages  
   • serve       Serve registry via HTTP
   • publish     Publish to static hosting
   • add         Install components
   • validate    Validate registry structure

🎨 tokens      Design token operations
   • extract-radix   Extract Radix UI tokens
   • export          Export to DTCG format
   • import          Import DTCG tokens
   • build-assets    Generate CSS/platform files

🔄 workflow    Mutation and transformation workflow (TODO)
   • mutate     Apply JSON patch mutations
   • rollback   Rollback mutations
   • diff       Compare registries
   • agent      AI-powered mutations

🛠️  dev        Development tools and utilities (TODO)
   • watch      Watch for changes
   • transpile  Transpile to frameworks
   • validate-ci CI validation
   • demo       Demo processing
   • docs       Generate documentation
   • api        Start API server
   • companion  Companion process

📤 export      Export and integration utilities (TODO)
   • mcp        Export to MCP format
   • adaptors   List available adaptors

Use "dcp <group> --help" for group-specific commands.
    `);
  });

program.parse();