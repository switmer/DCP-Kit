/**
 * CLI Deprecation Warnings and Migration Helpers
 * Provides consistent deprecation messages and migration guidance
 */

import chalk from 'chalk';

/**
 * Standard deprecation warning message
 */
export function showDeprecationWarning(oldCommand, newCommand, additionalInfo = '') {
  console.log(chalk.yellow('⚠️  DEPRECATION WARNING'));
  console.log(chalk.gray(`   Command "${oldCommand}" is deprecated`));
  console.log(chalk.green(`   Use "${newCommand}" instead`));
  
  if (additionalInfo) {
    console.log(chalk.gray(`   ${additionalInfo}`));
  }
  
  console.log(''); // Empty line for readability
}

/**
 * Command migration mappings
 */
export const COMMAND_MIGRATIONS = {
  // Legacy extract commands
  'extract-v2': {
    newCommand: 'extract',
    reason: 'Merged into unified extract command with auto-detection'
  },
  'extract-v3': {  
    newCommand: 'extract',
    reason: 'Merged into unified extract command with auto-detection'
  },
  'extract-legacy': {
    newCommand: 'extract', 
    reason: 'Merged into unified extract command with auto-detection'
  },
  
  // Registry commands moved to subcommands
  'build-packs': {
    newCommand: 'registry build-packs',
    reason: 'Moved to registry command group for better organization'
  },
  'serve-registry': {
    newCommand: 'registry serve',
    reason: 'Moved to registry command group for better organization'
  },
  'publish-static': {
    newCommand: 'registry publish',
    reason: 'Moved to registry command group for better organization'
  },
  'add': {
    newCommand: 'registry add',
    reason: 'Moved to registry command group for better organization'
  },
  'validate-registry': {
    newCommand: 'registry validate',
    reason: 'Moved to registry command group for better organization'
  },
  
  // Token commands moved to subcommands
  'radix-tokens': {
    newCommand: 'tokens extract-radix',
    reason: 'Moved to tokens command group for better organization'
  },
  'export-tokens': {
    newCommand: 'tokens export',
    reason: 'Moved to tokens command group for better organization'
  },
  'import-tokens': {
    newCommand: 'tokens import',
    reason: 'Moved to tokens command group for better organization'
  },
  'build-assets': {
    newCommand: 'tokens build-assets',
    reason: 'Moved to tokens command group for better organization'
  },
  
  // Workflow commands moved to subcommands  
  'mutate': {
    newCommand: 'workflow mutate',
    reason: 'Moved to workflow command group for better organization'
  },
  'rollback': {
    newCommand: 'workflow rollback',
    reason: 'Moved to workflow command group for better organization'
  },
  'diff': {
    newCommand: 'workflow diff',
    reason: 'Moved to workflow command group for better organization'
  },
  'agent': {
    newCommand: 'workflow agent',
    reason: 'Moved to workflow command group for better organization'
  },
  
  // Development commands moved to subcommands
  'watch': {
    newCommand: 'dev watch',
    reason: 'Moved to dev command group for better organization'
  },
  'transpile': {
    newCommand: 'dev transpile',
    reason: 'Moved to dev command group for better organization'
  },
  'validate-ci': {
    newCommand: 'dev validate-ci',
    reason: 'Moved to dev command group for better organization'
  },
  'demo': {
    newCommand: 'dev demo',
    reason: 'Moved to dev command group for better organization'
  },
  'docs': {
    newCommand: 'dev docs',
    reason: 'Moved to dev command group for better organization'
  },
  'api': {
    newCommand: 'dev api',
    reason: 'Moved to dev command group for better organization'
  },
  'companion': {
    newCommand: 'dev companion',
    reason: 'Moved to dev command group for better organization'
  },
  
  // Export commands moved to subcommands
  'export-mcp': {
    newCommand: 'export mcp',
    reason: 'Moved to export command group for better organization'
  },
  'adaptors': {
    newCommand: 'export adaptors',
    reason: 'Moved to export command group for better organization'
  }
};

/**
 * Show deprecation warning for a specific command
 */
export function warnDeprecatedCommand(commandName) {
  const migration = COMMAND_MIGRATIONS[commandName];
  
  if (migration) {
    showDeprecationWarning(
      `dcp ${commandName}`,
      `dcp ${migration.newCommand}`,
      migration.reason
    );
  }
}

/**
 * Migration guide generator
 */
export function generateMigrationGuide() {
  console.log(chalk.blue.bold('🔄 DCP CLI Migration Guide'));
  console.log('');
  
  console.log(chalk.yellow('📋 Deprecated Commands:'));
  console.log('');
  
  Object.entries(COMMAND_MIGRATIONS).forEach(([oldCmd, migration]) => {
    console.log(chalk.red(`  dcp ${oldCmd}`));
    console.log(chalk.green(`  → dcp ${migration.newCommand}`));
    console.log(chalk.gray(`    ${migration.reason}`));
    console.log('');
  });
  
  console.log(chalk.blue('🎯 New Command Structure:'));
  console.log('');
  console.log(chalk.green('Core Commands (unchanged):'));
  console.log('  dcp extract <source>     # Extract components');
  console.log('  dcp validate [path]      # Validate project'); 
  console.log('  dcp build               # Build registry');
  console.log('  dcp query <selector>     # Query registry');
  console.log('');
  
  console.log(chalk.green('Command Groups:'));
  console.log('  dcp registry ...         # Registry management');
  console.log('  dcp tokens ...           # Token operations');
  console.log('  dcp workflow ...         # Mutation workflow');
  console.log('  dcp dev ...              # Development tools');
  console.log('  dcp export ...           # Export utilities');
  console.log('');
  
  console.log(chalk.blue('💡 Tips:'));
  console.log('  • Use "dcp --help" to see all available commands');
  console.log('  • Use "dcp <group> --help" to see group-specific commands');
  console.log('  • All old commands will continue working with deprecation warnings');
  console.log('  • Migration is planned for the next major version');
}

/**
 * Check if a command is deprecated
 */
export function isDeprecatedCommand(commandName) {
  return commandName in COMMAND_MIGRATIONS;
}

/**
 * Get migration info for a command
 */
export function getMigrationInfo(commandName) {
  return COMMAND_MIGRATIONS[commandName] || null;
}