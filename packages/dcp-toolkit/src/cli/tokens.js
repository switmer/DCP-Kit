#!/usr/bin/env node

/**
 * DCP Token Management Commands  
 * Consolidated commands for design token operations
 */

import { program } from 'commander';

// Create tokens command group
const tokensCommand = program
  .command('tokens')
  .description('Design token management operations')
  .addHelpText('after', `
Available Commands:
  extract-radix    Extract tokens from Radix UI themes
  export           Export DCP registry tokens to DTCG format
  import           Import DTCG tokens into DCP registry  
  build-assets     Generate CSS/native platform files from tokens

Examples:
  $ dcp tokens extract-radix ./node_modules/@radix-ui/themes
  $ dcp tokens export registry.json --out design-tokens.json
  $ dcp tokens import design-tokens.json --registry registry.json
  $ dcp tokens build-assets design-tokens.json --platform css`);

// Extract Radix tokens subcommand
tokensCommand
  .command('extract-radix [source]')
  .description('Extract Radix tokens and generate multi-framework outputs')
  .option('-o, --out <dir>', 'Output directory', './dcp-tokens')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-j, --json', 'Output JSON format')
  .addHelpText('after', `
Examples:
  $ dcp tokens extract-radix
  $ dcp tokens extract-radix ./node_modules/@radix-ui/themes --out ./tokens
  $ dcp tokens extract-radix ./custom-radix --verbose --json`)
  .action(async (source = './node_modules/@radix-ui/themes', options) => {
    try {
      // Add deprecation warning for old command
      if (!options.json) {
        console.log('⚠️  Note: This command replaces "dcp radix-tokens" (deprecated)');
      }
      
      const { runRadixTokens } = await import('../../src/commands/radix-tokens.js');
      
      if (!options.json) {
        console.log(`🎨 Extracting Radix tokens from ${source}...`);
      }
      
      const result = await runRadixTokens(source, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.success) {
          console.log(`✅ Extracted ${result.tokens} tokens`);
          console.log(`📁 Generated ${result.outputs.length} formats: ${result.outputs.join(', ')}`);
          console.log(`📂 Output: ${options.out || './dcp-tokens'}`);
        } else {
          console.error(`❌ Extraction failed: ${result.error}`);
        }
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Radix tokens failed:', error.message);
      }
      process.exit(1);
    }
  });

// Export tokens subcommand  
tokensCommand
  .command('export <registry>')
  .description('Export DCP registry tokens to DTCG format')
  .option('-o, --out <file>', 'output file path', 'design.tokens.json')
  .option('--no-validate', 'skip DTCG validation')
  .option('--no-extensions', 'exclude DCP extensions')
  .option('--group-prefix <prefix>', 'prefix for token groups')
  .option('--json', 'output JSON stats instead of logs')
  .addHelpText('after', `
Examples:
  $ dcp tokens export registry.json --out design-tokens.json
  $ dcp tokens export registry.json --no-validate --no-extensions
  $ dcp tokens export registry.json --group-prefix "company" --json`)
  .action(async (registry, options) => {
    try {
      // Add deprecation warning for old command
      if (!options.json) {
        console.log('⚠️  Note: This command replaces "dcp export-tokens" (deprecated)');
      }
      
      const { runExportTokens } = await import('../../src/commands/export-tokens.js');
      
      if (!options.json) {
        console.log(`📤 Exporting tokens from ${registry} to DTCG format...`);
      }
      
      await runExportTokens(registry, options);
      
      if (!options.json) {
        console.log(`✅ Tokens exported to ${options.out}`);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Export failed:', error.message);
      }
      process.exit(1);
    }
  });

// Import tokens subcommand
tokensCommand
  .command('import <tokens>')
  .description('Import DTCG tokens into DCP registry')
  .option('-r, --registry <file>', 'target registry file', 'registry.json')
  .option('--merge', 'merge with existing registry')
  .option('--no-validate', 'skip DTCG validation')
  .option('--json', 'output JSON stats instead of logs')
  .addHelpText('after', `
Examples:
  $ dcp tokens import design-tokens.json --registry registry.json
  $ dcp tokens import tokens.json --merge --no-validate
  $ dcp tokens import design-tokens.json --json`)
  .action(async (tokens, options) => {
    try {
      // Add deprecation warning for old command
      if (!options.json) {
        console.log('⚠️  Note: This command replaces "dcp import-tokens" (deprecated)');
      }
      
      const { runImportTokens } = await import('../../src/commands/import-tokens.js');
      
      if (!options.json) {
        console.log(`📥 Importing tokens from ${tokens} into DCP registry...`);
      }
      
      await runImportTokens(tokens, options);
      
      if (!options.json) {
        console.log(`✅ Tokens imported into ${options.registry}`);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Import failed:', error.message);
      }
      process.exit(1);
    }
  });

// Build assets subcommand
tokensCommand
  .command('build-assets [tokens]')
  .description('Generate CSS / native platform files from design tokens using Style Dictionary')
  .option('-p, --platform <name>', 'only build a specific platform (css, android, ios)')
  .option('-o, --out <dir>', 'output directory', 'build/')
  .option('-t, --theme <key>', 'build only a specific theme/group path')
  .option('--json', 'machine-readable JSON output')
  .addHelpText('after', `
Examples:
  $ dcp tokens build-assets design-tokens.json --platform css
  $ dcp tokens build-assets tokens.json --out ./dist/tokens
  $ dcp tokens build-assets design-tokens.json --theme dark --json`)
  .action(async (tokens, options) => {
    try {
      // Add deprecation warning for old command
      if (!options.json) {
        console.log('⚠️  Note: This command replaces "dcp build-assets" (deprecated)');
      }
      
      const { runBuildAssets } = await import('../../src/commands/build-assets.js');
      
      if (!options.json) {
        console.log(`🏗️  Building platform assets from ${tokens || 'design tokens'}...`);
      }
      
      await runBuildAssets(tokens, options);
      
      if (!options.json) {
        console.log(`✅ Platform assets built to ${options.out}`);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ build-assets failed:', error.message);
      }
      process.exit(1);
    }
  });

export { tokensCommand };