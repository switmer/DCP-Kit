/**
 * Workflow Commands Registration
 * Component mutation and lifecycle management
 */

import mutate from './mutate.js';
import rollback from './rollback.js';
import diff from './diff.js';
import agent from './agent.js';

export function registerWorkflowCommands(workflowGroup) {
  // Mutate components based on proposals
  workflowGroup
    .command('mutate [components...]')
    .description('Apply refactor proposals and mutations to components')
    .option('-p, --proposals <dir>', 'directory containing refactor proposals', './proposals')
    .option('-t, --target <dir>', 'target directory for mutated components', './src/components')
    .option('--batch', 'process all proposals in batch mode')
    .option('--interactive', 'interactive proposal selection')
    .option('--dry-run', 'preview mutations without applying changes')
    .option('--backup', 'create backup of original components')
    .option('--strategy <strategy>', 'mutation strategy (merge, replace, patch)', 'merge')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp workflow mutate Button Card
  $ dcp workflow mutate --batch --dry-run
  $ dcp workflow mutate --proposals ./custom-proposals --interactive`)
    .action(mutate);

  // Rollback mutations
  workflowGroup
    .command('rollback [mutation-id]')
    .description('Rollback component mutations to previous state')
    .option('--list', 'list available rollback points')
    .option('--to <timestamp>', 'rollback to specific timestamp')
    .option('--component <name>', 'rollback specific component only')
    .option('--all', 'rollback all mutations since last clean state')
    .option('--dry-run', 'preview rollback without applying changes')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp workflow rollback --list
  $ dcp workflow rollback mut_20240101_1234
  $ dcp workflow rollback --component Button --to 2024-01-01T12:00:00Z`)
    .action(rollback);

  // Show mutation diffs
  workflowGroup
    .command('preview <source>')
    .description('Preview extraction diff without writing to registry')
    .option('-r, --registry <dir>', 'existing registry directory', './registry')
    .option('-o, --out <dir>', 'temporary output directory', './.dcp-preview')
    .option('--auto-detect-tokens', 'auto detect tokens from source')
    .option('--adaptor <name>', 'force adaptor', 'react-tsx')
    .option('--format <format>', 'diff format (unified, side-by-side)', 'unified')
    .option('--context <lines>', 'number of context lines', '3')
    .option('--no-color', 'disable colored output')
    .option('--json', 'machine-readable JSON output')
    .addHelpText('after', `\nExamples:\n  $ dcp workflow preview ./src\n  $ dcp workflow preview ./components --format side-by-side`) 
    .action(async (source, options) => {
      const { default: preview } = await import('./preview.js');
      return preview(source, options);
    });

  // Show mutation diffs
  workflowGroup
    .command('diff [component]')
    .description('Show differences between original and mutated components')
    .option('--proposals <dir>', 'directory containing proposals', './proposals')
    .option('--format <format>', 'diff format (unified, side-by-side, json)', 'unified')
    .option('--context <lines>', 'number of context lines', '3')
    .option('--no-color', 'disable colored output')
    .option('--summary', 'show summary only')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp workflow diff Button
  $ dcp workflow diff --format side-by-side
  $ dcp workflow diff --summary --json`)
    .action(diff);

  // Agent-assisted mutations
  workflowGroup
    .command('agent')
    .description('Interactive agent for component analysis and mutations')
    .option('--model <model>', 'AI model to use for analysis', 'claude-3-sonnet')
    .option('--temperature <temp>', 'model temperature (0.0-1.0)', '0.1')
    .option('--context <dir>', 'context directory for analysis', '.')
    .option('--proposals <dir>', 'proposals directory', './proposals')
    .option('--auto-apply', 'automatically apply high-confidence mutations')
    .option('--confidence <threshold>', 'minimum confidence for auto-apply (0.0-1.0)', '0.9')
    .option('--batch-size <size>', 'number of components to process per batch', '5')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp workflow agent
  $ dcp workflow agent --auto-apply --confidence 0.95
  $ dcp workflow agent --model claude-3-opus --context ./src`)
    .action(agent);
}