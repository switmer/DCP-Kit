#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFile, writeFile } from 'fs/promises';
import { resolve, basename } from 'path';
import { DCPValidator } from './validator.js';

const validator = new DCPValidator();

program
  .name('dcp-validator')
  .description('CLI validator for Design Context Protocol registry items')
  .version('1.0.0');

program
  .command('validate <file>')
  .description('Validate a DCP registry item against the schema')
  .option('--strict', 'Enable strict validation mode')
  .option('--format <format>', 'Output format (json, text)', 'text')
  .action(async (file: string, options) => {
    const spinner = ora('Validating registry item...').start();
    
    try {
      const filePath = resolve(file);
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      const result = await validator.validate(data, { strict: options.strict });
      
      if (result.valid) {
        spinner.succeed(chalk.green(`✅ ${basename(file)} is valid`));
        
        if (result.warnings && result.warnings.length > 0) {
          console.log(chalk.yellow('\n⚠️  Warnings:'));
          result.warnings.forEach((warning, i) => {
            console.log(chalk.yellow(`  ${i + 1}. ${warning.message}`));
            if (warning.path) {
              console.log(chalk.gray(`     Path: ${warning.path}`));
            }
          });
        }

        if (result.suggestions && result.suggestions.length > 0) {
          console.log(chalk.blue('\n💡 Suggestions:'));
          result.suggestions.forEach((suggestion, i) => {
            console.log(chalk.blue(`  ${i + 1}. ${suggestion.message}`));
          });
        }
      } else {
        spinner.fail(chalk.red(`❌ ${basename(file)} is invalid`));
        
        console.log(chalk.red('\n🚨 Errors:'));
        result.errors.forEach((error, i) => {
          console.log(chalk.red(`  ${i + 1}. ${error.message}`));
          if (error.path) {
            console.log(chalk.gray(`     Path: ${error.path}`));
          }
          if (error.allowedValues) {
            console.log(chalk.gray(`     Allowed: ${error.allowedValues.join(', ')}`));
          }
        });
        
        process.exit(1);
      }
      
    } catch (error) {
      spinner.fail(chalk.red('Validation failed'));
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program
  .command('lint <file>')
  .description('Lint and suggest improvements for a DCP registry item')
  .option('--fix', 'Automatically fix common issues')
  .option('--write', 'Write fixes back to file')
  .action(async (file: string, options) => {
    const spinner = ora('Linting registry item...').start();
    
    try {
      const filePath = resolve(file);
      const content = await readFile(filePath, 'utf-8');
      let data = JSON.parse(content);
      
      const lintResult = await validator.lint(data, { autoFix: options.fix });
      
      if (options.fix && lintResult.fixed) {
        data = lintResult.data;
        
        if (options.write) {
          await writeFile(filePath, JSON.stringify(data, null, 2) + '\n');
          spinner.succeed(chalk.green(`✅ Fixed and saved ${basename(file)}`));
        } else {
          spinner.succeed(chalk.green(`✅ Fixes applied (use --write to save)`));
          console.log('\n📝 Fixed content:');
          console.log(JSON.stringify(data, null, 2));
        }
      } else {
        spinner.succeed(chalk.blue(`📋 Lint completed for ${basename(file)}`));
      }
      
      if (lintResult.suggestions.length > 0) {
        console.log(chalk.blue('\n💡 Suggestions:'));
        lintResult.suggestions.forEach((suggestion, i) => {
          console.log(chalk.blue(`  ${i + 1}. ${suggestion.message}`));
          if (suggestion.fix) {
            console.log(chalk.gray(`     Fix: ${suggestion.fix}`));
          }
        });
      }
      
      if (lintResult.issues.length > 0) {
        console.log(chalk.yellow('\n⚠️  Issues:'));
        lintResult.issues.forEach((issue, i) => {
          console.log(chalk.yellow(`  ${i + 1}. ${issue.message}`));
        });
      }
      
    } catch (error) {
      spinner.fail(chalk.red('Linting failed'));
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new DCP registry item template')
  .option('--type <type>', 'Registry item type', 'registry:ui')
  .option('--name <name>', 'Component name')
  .option('--output <file>', 'Output file path')
  .action(async (options) => {
    const spinner = ora('Creating registry item template...').start();
    
    try {
      const template = validator.createTemplate(options.type, {
        name: options.name,
        title: options.name
      });
      
      const outputFile = options.output || `${options.name || 'component'}.json`;
      await writeFile(outputFile, JSON.stringify(template, null, 2) + '\n');
      
      spinner.succeed(chalk.green(`✅ Created ${outputFile}`));
      
      console.log(chalk.blue('\n📋 Next steps:'));
      console.log(chalk.gray('  1. Edit the template with your component details'));
      console.log(chalk.gray('  2. Add files, dependencies, and CSS variables'));
      console.log(chalk.gray(`  3. Validate with: dcp-validator validate ${outputFile}`));
      
    } catch (error) {
      spinner.fail(chalk.red('Template creation failed'));
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program.parse();