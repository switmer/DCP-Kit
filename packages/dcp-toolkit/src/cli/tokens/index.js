/**
 * Token Commands Registration
 * Token detection and extraction operations
 */

import detect from './detect.js';
import extract from './extract.js';
import normalize from './normalize.js';
import merge from './merge.js';

export function registerTokenCommands(tokensGroup) {
  // Detect available token sources
  tokensGroup
    .command('detect [path]')
    .description('Auto-detect available design token sources in project')
    .option('-o, --output <file>', 'output detection results to file')
    .option('--confidence <threshold>', 'minimum confidence threshold (0.0-1.0)', '0.5')
    .option('--sources <types>', 'comma-separated list of sources to detect (radix,mui,tailwind,css-vars)', '')
    .option('--verbose', 'verbose logging with detection details')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp tokens detect
  $ dcp tokens detect ./src --confidence 0.8
  $ dcp tokens detect --sources radix,tailwind --json`)
    .action(detect);

  // Extract tokens from detected sources
  tokensGroup
    .command('extract [path]')
    .description('Extract design tokens from all detected sources')
    .option('-o, --output <dir>', 'output directory for extracted tokens', './tokens')
    .option('--sources <types>', 'comma-separated list of sources to extract from', '')
    .option('--format <format>', 'output format (dcp, style-dictionary, css)', 'dcp')
    .option('--include-metadata', 'include source metadata in output')
    .option('--overrides <file>', 'token override configuration file')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp tokens extract
  $ dcp tokens extract ./src --format style-dictionary
  $ dcp tokens extract --sources radix,mui --overrides ./token-overrides.json`)
    .action(extract);

  // Normalize token formats
  tokensGroup
    .command('normalize <input>')
    .description('Normalize tokens to standard DCP format')
    .option('-o, --output <file>', 'output file path')
    .option('--from <format>', 'source format (style-dictionary, tailwind, css)', 'detect')
    .option('--to <format>', 'target format (dcp, style-dictionary, css)', 'dcp')
    .option('--categories <list>', 'comma-separated token categories to include', '')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp tokens normalize ./tokens.json
  $ dcp tokens normalize ./tailwind.config.js --from tailwind --to dcp
  $ dcp tokens normalize ./theme.js --categories color,spacing,typography`)
    .action(normalize);

  // Merge multiple token sources
  tokensGroup
    .command('merge <sources...>')
    .description('Merge multiple token files into unified collection')
    .option('-o, --output <file>', 'output file path', './merged-tokens.json')
    .option('--strategy <strategy>', 'merge strategy (override, merge, error)', 'merge')
    .option('--priority <order>', 'comma-separated source priority order', '')
    .option('--resolve-conflicts', 'interactive conflict resolution')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp tokens merge ./tokens/radix.json ./tokens/custom.json
  $ dcp tokens merge ./tokens/*.json --strategy override
  $ dcp tokens merge file1.json file2.json --priority file2,file1`)
    .action(merge);
}