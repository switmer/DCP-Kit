#!/usr/bin/env node
import { Command } from 'commander';
import { runBuild } from '../commands/build.js';
import { analyzeRepo } from '../commands/analyze.js';
import { startServer } from '../commands/serve.js';
import { validateRegistry } from '../commands/validate.js';
import { generateTokenReport } from '../commands/report.js';
import { diffRegistries } from '../commands/diff.js';
import { publishRegistry } from '../commands/publish.js';
import { generateCoverageReport } from '../commands/coverage.js';
import { runScaffold } from '../commands/scaffold.js';
import { runAgentCLI } from '../core/dcpAgent.js';
import { runRollbackCLI } from '../core/dcpRollback.js';
import path from 'path';

// Global error handler
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

const program = new Command();
program
  .name('dcp-transformer')
  .description('Transform your design system into a DCP registry')
  .version('1.2.0')
  .option('--verbose', 'Enable verbose logging')
  .hook('preAction', (thisCommand) => {
    global.verbose = thisCommand.opts().verbose;
    if (global.verbose) {
      console.log('🔍 Verbose mode enabled');
    }
  });

// Wrap command actions with error handling
const wrapAction = (action) => async (...args) => {
  try {
    await action(...args);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (global.verbose) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
};

program.command('analyze')
  .argument('<source>')
  .option('--llm', 'Enable LLM enrichment')
  .action(wrapAction(analyzeRepo));

program
  .command('build')
  .description('Build a DCP registry from your design system')
  .option('-c, --config <path>', 'Path to config file', './dcp.config.json')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('-g, --glob <pattern>', 'Custom glob pattern for finding components (e.g. "**/*.tsx")')
  .option('-o, --output <path>', 'Output path for the registry')
  .action(wrapAction(async (options) => {
    try {
      const configPath = path.resolve(options.config);
      const config = {
        configPath,
        verbose: options.verbose,
        glob: options.glob,
        outputPath: options.output
      };

      await runBuild(config);
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      if (options.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  }));

program.command('serve')
  .option('--mcp', 'Enable MCP endpoints')
  .option('--preview', 'Serve browse UI')
  .option('--auth <token>', 'API token')
  .action(wrapAction(startServer));

program.command('validate')
  .description('Validate the DCP registry')
  .action(wrapAction(validateRegistry));

program.command('report')
  .description('Generate a token usage report')
  .action(wrapAction(generateTokenReport));

program.command('report:coverage')
  .description('Generate diagnostics coverage report')
  .action(wrapAction(generateCoverageReport));

program.command('diff')
  .description('Diff two DCP registries')
  .action(wrapAction(diffRegistries));

program.command('publish')
  .description('Upload the registry to S3')
  .action(wrapAction(publishRegistry));

program
  .command('scaffold')
  .description('Create a new DCP-Transformer project')
  .option('-n, --name <name>', 'Project name', 'my-design-system')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .action(wrapAction(async (options) => {
    try {
      await runScaffold(options);
    } catch (error) {
      console.error('❌ Scaffold failed:', error.message);
      if (options.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  }));

program
  .command('agent')
  .description('Run AI-driven mutation pipeline')
  .argument('<prompt>', 'Natural language description of desired changes')
  .option('--auto-approve', 'Auto-approve low risk changes')
  .option('--no-transpile', 'Skip transpilation step')
  .option('--no-deploy', 'Skip deployment step')
  .option('--transpile-targets <targets>', 'Comma-separated transpile targets', 'react')
  .option('--registry-path <path>', 'Path to DCP registry', './dist/registry.json')
  .option('--dry-run', 'Preview changes without applying them')
  .option('--non-interactive', 'Run without interactive prompts')\n  .option('--enable-git', 'Enable git integration (auto-commit changes)')\n  .option('--no-git', 'Disable git integration')
  .action(wrapAction(async (prompt, options) => {
    try {
      // Convert transpile targets string to array
      if (options.transpileTargets) {
        options.transpileTargets = options.transpileTargets.split(',').map(t => t.trim());
      }
      
      // Set up options for dcpAgent
      const agentOptions = {
        autoApprove: options.autoApprove,
        transpile: !options.noTranspile,
        deploy: !options.noDeploy,
        transpileTargets: options.transpileTargets,
        registryPath: options.registryPath,
        dryRun: options.dryRun,
        interactive: !options.nonInteractive,\n        enableGit: options.enableGit || !options.noGit,
        verbose: global.verbose
      };

      await runAgentCLI([prompt, ...Object.entries(agentOptions)
        .filter(([key, value]) => value === true)
        .map(([key]) => `--${key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}`)]);
        
    } catch (error) {
      console.error('❌ Agent failed:', error.message);
      if (global.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  }));

program
  .command('rollback')
  .description('Rollback mutations using undo patches or backups')
  .argument('[registryPath]', 'Path to DCP registry', './dist/registry.json')
  .argument('[rollbackSource]', 'Rollback source: "last", backup file, or undo patch', 'last')
  .argument('[outputPath]', 'Output path for rolled back registry')
  .option('--no-backup', 'Skip creating backup before rollback')
  .option('--no-validate', 'Skip schema validation')
  .option('--list', 'List available rollback points')
  .option('--cleanup', 'Clean up old backup files')
  .option('--keep <count>', 'Keep N most recent backups during cleanup', '10')
  .action(wrapAction(async (registryPath, rollbackSource, outputPath, options) => {
    try {
      // Convert options for CLI
      const cliArgs = [registryPath, rollbackSource, outputPath].filter(Boolean);
      
      if (options.noBackup) cliArgs.push('--no-backup');
      if (options.noValidate) cliArgs.push('--no-validate');
      if (options.list) cliArgs.push('--list');
      if (options.cleanup) cliArgs.push('--cleanup');
      if (options.keep) cliArgs.push(`--keep=${options.keep}`);
      if (global.verbose) cliArgs.push('--verbose');

      await runRollbackCLI(cliArgs);
        
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      if (global.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  }));

program.parse(process.argv);
