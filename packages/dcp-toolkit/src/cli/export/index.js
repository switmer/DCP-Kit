/**
 * Export Commands Registration
 * Export utilities and integrations
 */

import mcp from './mcp.js';
import adaptors from './adaptors.js';
import codeConnect from './code-connect.js';
import chalk from 'chalk';
import path from 'path';

export function registerExportCommands(exportGroup) {
  // Export MCP server configuration
  exportGroup
    .command('mcp [registry]')
    .description('Export registry as MCP (Model Context Protocol) format for AI agents')
    .option('-o, --output <file>', 'MCP export output file', './mcp_export.json')
    .option('--optimize-for <model>', 'optimize for AI model (claude, gpt, gemini)', 'claude')
    .option('--chunk-size <size>', 'chunk size in tokens (1000-16000)', '4000')
    .option('--include-examples', 'include component examples in export')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp export mcp registry.json
  $ dcp export mcp registry.json --optimize-for claude --chunk-size 4000
  $ dcp export mcp registry.json --optimize-for gpt --include-examples
  $ dcp export mcp registry.json --output ./llm-context.json --verbose`)
    .action(mcp);

  // Generate framework adaptors
  exportGroup
    .command('adaptors [registry]')
    .description('Generate framework-specific adaptors and integrations')
    .option('-f, --frameworks <list>', 'comma-separated frameworks (react,vue,svelte,angular)', 'react')
    .option('-o, --output <dir>', 'adaptors output directory', './adaptors')
    .option('--template <template>', 'adaptor template (standard, minimal, full)', 'standard')
    .option('--typescript', 'generate TypeScript adaptors')
    .option('--package-json', 'generate package.json for each adaptor')
    .option('--examples', 'include usage examples')
    .option('--tests', 'generate test files')
    .option('--storybook', 'generate Storybook integration')
    .option('--css-modules', 'support CSS modules')
    .option('--styled-components', 'support styled-components')
    .option('--tailwind', 'support Tailwind CSS')
    .option('--theme-provider', 'include theme provider components')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp export adaptors registry.json
  $ dcp export adaptors --frameworks react,vue --typescript
  $ dcp export adaptors --template full --examples --tests
  $ dcp export adaptors --styled-components --theme-provider`)
    .action(adaptors);

  // Transform DCP registry to Figma Code Connect files
  exportGroup
    .command('code-connect <registry>')
    .description('Transform DCP registry to Figma Code Connect files')
    .option('-o, --output <dir>', 'output directory for Code Connect files', './src/figma')
    .option('-m, --figma-map <file>', 'JSON file mapping component names to Figma URLs')
    .option('-f, --framework <framework>', 'target framework (react, html)', 'react')
    .option('--skip-unmapped', 'skip components without Figma URL mapping')
    .option('--no-validate', 'skip validation of Figma URLs')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp export code-connect registry.json
  $ dcp export code-connect registry.json --figma-map mapping.json
  $ dcp export code-connect registry.json --output ./figma --framework react
  $ dcp export code-connect registry.json --skip-unmapped --verbose

Figma Mapping File (figma-mapping.json):
  {
    "Button": "https://figma.com/design/xyz?node-id=123:456",
    "Card": "https://figma.com/design/xyz?node-id=234:567"
  }

Next Steps:
  1. Review generated .figma.tsx files
  2. Customize prop mappings as needed
  3. Run: npx figma connect publish`)
    .action(codeConnect);

  // Synchronize Figma variables with DCP design tokens
  exportGroup
    .command('figma-tokens <registry>')
    .description('Synchronize Figma design variables with DCP tokens')
    .option('-f, --figma-variables <file>', 'JSON file containing Figma variables export')
    .option('-o, --output <dir>', 'output directory for sync results', './tokens')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp export figma-tokens registry.json --figma-variables variables.json
  $ dcp export figma-tokens registry.json -f figma-vars.json --output ./sync
  $ dcp export figma-tokens registry.json --verbose --json

Figma Variables Export:
  1. Open Figma → Dev Mode → Variables panel
  2. Export variables to JSON file
  3. Use that file with --figma-variables flag

Output Files:
  • figma-dcp-mapping.json  # Bidirectional token mapping
  • sync-report.json        # Detailed synchronization report  
  • sync-report.md          # Human-readable report`)
    .action(async (registry, options) => {
      try {
        const { runFigmaTokenSync } = await import('../../tokens/figma-sync.js');
        
        if (!options.json) {
          console.log(chalk.blue(`🔗 Synchronizing Figma variables with DCP tokens...`));
        }

        const result = await runFigmaTokenSync({
          registryPath: path.dirname(registry),
          figmaVariablesFile: options.figmaVariables,
          outputPath: options.output,
          verbose: options.verbose
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(chalk.green(`\n✅ Token synchronization completed!`));
          console.log(chalk.gray(`   Mapped: ${result.report.summary.mappedPairs}/${result.report.summary.figmaTokens} tokens (${result.report.summary.mappingRate})`));
          console.log(chalk.gray(`   Files: ${result.outputFiles.readableReport}`));
        }

      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
        } else {
          console.error(chalk.red('❌ Figma token synchronization failed:'), error.message);
          if (options.verbose) {
            console.error(error.stack);
          }
        }
        process.exit(1);
      }
    });
}