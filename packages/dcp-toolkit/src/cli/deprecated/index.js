/**
 * Deprecated Commands Registration
 * Handles deprecated commands with migration warnings
 */

import { warnDeprecatedCommand, COMMAND_MIGRATIONS } from '../deprecation.js';
import chalk from 'chalk';

export function registerDeprecatedCommands(program) {
  // Register all deprecated commands with warnings and delegation
  Object.entries(COMMAND_MIGRATIONS).forEach(([oldCmd, migration]) => {
    program
      .command(oldCmd)
      .description(`⚠️  DEPRECATED: Use "${migration.newCommand}" instead`)
      .helpOption(false) // Hide default help to show custom message
      .action(async (...args) => {
        // Show deprecation warning
        warnDeprecatedCommand(oldCmd);
        
        // Parse args to extract command and options
        const [commandArgs, options] = args;
        
        // Try to delegate to new command
        try {
          // Find the new command in the program
          const newCommandParts = migration.newCommand.split(' ');
          let targetCommand = program;
          
          for (const part of newCommandParts) {
            const found = targetCommand.commands.find(cmd => cmd.name() === part);
            if (found) {
              targetCommand = found;
            } else {
              console.error(chalk.red(`❌ Could not find command: ${migration.newCommand}`));
              console.log(chalk.yellow(`💡 Please use the new command structure: dcp ${migration.newCommand}`));
              process.exit(1);
            }
          }
          
          // Execute the new command with the same arguments
          if (targetCommand._actionHandler) {
            await targetCommand._actionHandler(commandArgs, options, targetCommand);
          } else {
            console.error(chalk.red(`❌ Command "${migration.newCommand}" is not yet implemented`));
            console.log(chalk.yellow(`💡 This command is still being migrated to the new CLI structure`));
            process.exit(1);
          }
        } catch (error) {
          console.error(chalk.red(`❌ Error delegating to new command: ${error.message}`));
          if (options?.verbose) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      });
  });
}

