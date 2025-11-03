#!/usr/bin/env node

/**
 * DCP CLI - Modern, Scalable Command Registration System
 * Following patterns from GitHub CLI, Vercel CLI, and other professional tools
 */

import { program } from 'commander';
import chalk from 'chalk';

// Core command registrars
import { registerCoreCommands } from './core/index.js';
import { registerRegistryCommands } from './registry/index.js';
import { registerTokenCommands } from './tokens/index.js';
import { registerWorkflowCommands } from './workflow/index.js';
import { registerDevCommands } from './dev/index.js';
import { registerExportCommands } from './export/index.js';
import { registerDeprecatedCommands } from './deprecated/index.js';

// Configure main program
program
  .name('dcp')
  .version('2.0.0')
  .description('Design Component Protocol - The Universal Design System Toolkit')
  .addHelpText('before', chalk.blue.bold('🎯 DCP: Design Component Protocol CLI'))
  .addHelpText('after', `
${chalk.green('🚀 Core Workflow:')}
  1. ${chalk.cyan('dcp validate --auto-fix')}             # Ensure project is ready
  2. ${chalk.cyan('dcp extract ./src --auto-detect-tokens')}  # Extract with universal token pipeline
  3. ${chalk.cyan('dcp build --config dcp.config.json')}      # Build registry
  4. ${chalk.cyan('dcp query "components where name = \'Button\'"')}  # Query system

${chalk.green('🏗️ Command Groups:')}
  ${chalk.yellow('registry')}     Registry management operations
  ${chalk.yellow('tokens')}       Design token operations (Universal Token Pipeline)
  ${chalk.yellow('workflow')}     Mutation and transformation workflow
  ${chalk.yellow('dev')}          Development tools and utilities
  ${chalk.yellow('export')}       Export and integration utilities

${chalk.green('📚 Examples:')}
  ${chalk.gray('$')} dcp registry generate ./src/components/ui
  ${chalk.gray('$')} dcp tokens extract-radix ./node_modules/@radix-ui/themes
  ${chalk.gray('$')} dcp workflow agent "Make all buttons accessible"
  ${chalk.gray('$')} dcp dev watch ./src --out ./registry

${chalk.blue('Learn more:')} https://github.com/stevewitmer/dcp-transformer
${chalk.green('Universal Token Pipeline:')} Auto-detects Radix, Tailwind, MUI, CSS Variables, Style Dictionary, Figma tokens
`);

// ===== CORE COMMANDS (Top Level) =====
registerCoreCommands(program);

// ===== COMMAND GROUPS =====

// Registry Management
const registryGroup = program
  .command('registry')
  .description('Registry management operations')
  .addHelpText('after', `
${chalk.green('Available Commands:')}
  generate     Generate ShadCN-compatible registry from components
  item         Generate single registry item from component
  build-packs  Build static component packages for distribution
  serve        Serve component packs via HTTP for development
  publish      Publish component packs to static hosting
  add          Install component from registry
  validate     Validate registry structure against DCP schema

${chalk.green('Examples:')}
  ${chalk.gray('$')} dcp registry generate ./src/components/ui
  ${chalk.gray('$')} dcp registry serve dist/packs --port 8080
  ${chalk.gray('$')} dcp registry add https://registry.example.com/r/ui/button`);

registerRegistryCommands(registryGroup);

// Token Management  
const tokensGroup = program
  .command('tokens')
  .description('Design token operations (Universal Token Pipeline)')
  .addHelpText('after', `
${chalk.green('Available Commands:')}
  detect       Auto-detect available design token sources in project
  extract      Extract design tokens from all detected sources
  normalize    Normalize tokens to standard DCP format
  merge        Merge multiple token files into unified collection

${chalk.yellow('🎯 Universal Token Pipeline:')}
Auto-detects and extracts from: Radix, Tailwind, MUI, CSS Variables, Style Dictionary, Figma

${chalk.green('Examples:')}
  ${chalk.gray('$')} dcp tokens detect --verbose
  ${chalk.gray('$')} dcp tokens extract ./src --format style-dictionary
  ${chalk.gray('$')} dcp tokens normalize ./tokens.json --from tailwind --to dcp
  ${chalk.gray('$')} dcp tokens merge ./tokens/*.json --strategy override`);

registerTokenCommands(tokensGroup);

// Workflow & Mutations
const workflowGroup = program
  .command('workflow')
  .description('Mutation and transformation workflow')
  .addHelpText('after', `
${chalk.green('Available Commands:')}
  mutate       Apply refactor proposals and mutations to components
  rollback     Rollback component mutations to previous state
  diff         Show differences between original and mutated components
  agent        Interactive agent for component analysis and mutations

${chalk.green('Examples:')}
  ${chalk.gray('$')} dcp workflow mutate Button Card --interactive
  ${chalk.gray('$')} dcp workflow agent --auto-apply --confidence 0.95
  ${chalk.gray('$')} dcp workflow diff Button --format side-by-side`);

registerWorkflowCommands(workflowGroup);

// Development Tools
const devGroup = program
  .command('dev')
  .description('Development tools and utilities')
  .addHelpText('after', `
${chalk.green('Available Commands:')}
  watch        Watch for file changes and auto-rebuild registry
  transpile    Transpile components for different runtime targets
  validate-ci  Comprehensive validation for CI/CD pipelines
  demo         Generate interactive component demos and playground
  docs         Generate comprehensive component documentation
  api          Start development API server for registry access
  companion    AI-powered development companion and assistant

${chalk.green('Examples:')}
  ${chalk.gray('$')} dcp dev watch ./src/components --debounce 500
  ${chalk.gray('$')} dcp dev api --port 8080 --cors --hot-reload
  ${chalk.gray('$')} dcp dev validate-ci --strict --exit-code`);

registerDevCommands(devGroup);

// Export & Integration
const exportGroup = program
  .command('export')
  .description('Export and integration utilities')
  .addHelpText('after', `
${chalk.green('Available Commands:')}
  mcp          Export registry as MCP (Model Context Protocol) server
  adaptors     Generate framework-specific adaptors and integrations

${chalk.green('Examples:')}
  ${chalk.gray('$')} dcp export mcp registry.json --name my-design-system
  ${chalk.gray('$')} dcp export adaptors --frameworks react,vue --typescript`);

registerExportCommands(exportGroup);

// ===== DEPRECATED COMMANDS =====
registerDeprecatedCommands(program);

// ===== UTILITY COMMANDS =====

program
  .command('migration-guide')
  .description('Show CLI migration guide for deprecated commands')
  .action(async () => {
    const { generateMigrationGuide } = await import('./deprecated/migrationGuide.js');
    generateMigrationGuide();
  });

program
  .command('help-groups')
  .description('Show available command groups and their purposes')
  .action(() => {
    console.log(`
${chalk.blue.bold('🎯 DCP Command Groups:')}

${chalk.yellow('📋 registry')}    Registry management operations
   ${chalk.gray('•')} generate    Generate ShadCN-compatible registry
   ${chalk.gray('•')} build-packs Build component packages
   ${chalk.gray('•')} serve       Serve registry via HTTP
   ${chalk.gray('•')} publish     Publish to static hosting
   ${chalk.gray('•')} add         Install components
   ${chalk.gray('•')} validate    Validate registry structure

${chalk.yellow('🎨 tokens')}      Design token operations (Universal Token Pipeline)
   ${chalk.gray('•')} detect      Auto-detect available token sources
   ${chalk.gray('•')} extract     Extract tokens from detected sources
   ${chalk.gray('•')} normalize   Normalize tokens to standard format
   ${chalk.gray('•')} merge       Merge multiple token files

${chalk.yellow('🔄 workflow')}    Mutation and transformation workflow
   ${chalk.gray('•')} mutate      Apply refactor proposals to components
   ${chalk.gray('•')} rollback    Rollback component mutations
   ${chalk.gray('•')} diff        Show component differences
   ${chalk.gray('•')} agent       Interactive AI component assistant

${chalk.yellow('🛠️  dev')}        Development tools and utilities  
   ${chalk.gray('•')} watch       Watch for changes and auto-rebuild
   ${chalk.gray('•')} transpile   Transpile for different targets
   ${chalk.gray('•')} validate-ci CI/CD validation
   ${chalk.gray('•')} demo        Interactive component demos
   ${chalk.gray('•')} docs        Generate documentation
   ${chalk.gray('•')} api         Development API server
   ${chalk.gray('•')} companion   AI development assistant

${chalk.yellow('📤 export')}      Export and integration utilities
   ${chalk.gray('•')} mcp         Export as MCP server
   ${chalk.gray('•')} adaptors    Generate framework adaptors

${chalk.green('Use "dcp <group> --help" for group-specific commands.')}
    `);
  });

// Global error handling
program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str))
});

export { program };

// Auto-run if called directly
// Check if this file is being executed directly (not imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                      import.meta.url.endsWith(process.argv[1]);
if (isMainModule) {
  program.parse();
}