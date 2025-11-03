/**
 * Core Commands Registration
 * Top-level commands that are essential to DCP workflow
 */

import extract from './extract.js';
import validate from './validate.js';
import build from './build.js';
import query from './query.js';

export function registerCoreCommands(program) {
  // Extract - Primary command with universal token pipeline
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
    .action(extract);

  // Validate - Project validation
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
    .action(validate);

  // Build - Registry building
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
    .action(build);

  // Query - Registry querying
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
    .action(query);
}