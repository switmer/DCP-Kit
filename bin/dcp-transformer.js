#!/usr/bin/env node
import { Command } from 'commander';
import { runExtract } from '../commands/extract-v2.js';
import { runExportMCP } from '../commands/export-mcp.js';
import { runValidateTransform } from '../commands/validate-transform.js';
import { runTranspile } from '../commands/transpile.js';
import chalk from 'chalk';
import ora from 'ora';

// Global error handler
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

const program = new Command();

program
  .name('dcp-transformer')
  .description('🧬 Transform any design system into mutation-ready DCP IR in seconds')
  .version('2.0.0')
  .option('--verbose', 'Enable verbose logging');

// Wrap command actions with error handling and timing
const wrapAction = (action, commandName) => async (...args) => {
  const spinner = ora(`Running ${commandName}...`).start();
  const startTime = Date.now();
  
  try {
    const result = await action(...args);
    const duration = Date.now() - startTime;
    
    spinner.succeed(`${commandName} completed in ${duration}ms`);
    
    if (result?.summary) {
      console.log(chalk.cyan('\n📊 Summary:'));
      Object.entries(result.summary).forEach(([key, value]) => {
        console.log(chalk.gray(`   ${key}: ${value}`));
      });
    }
    
    return result;
  } catch (error) {
    spinner.fail(`${commandName} failed: ${error.message}`);
    
    if (program.opts().verbose) {
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
};

// Extract command - parse React/TS components into DCP IR
program
  .command('extract')
  .description('🔍 Extract components into DCP IR')
  .argument('<source>', 'Source directory containing React/TS components')
  .option('-t, --tokens <path>', 'Path to design tokens file')
  .option('-o, --out <path>', 'Output directory', './dcp-output')
  .option('-g, --glob <pattern>', 'Component file glob pattern', '**/*.{tsx,jsx}')
  .option('--include-stories', 'Include Storybook stories in extraction')
  .option('--llm-enrich', 'Add AI-friendly descriptions and examples')
  .option('--plan', 'Generate starter mutation plan')
  .action(wrapAction(runExtract, 'Extract'));

// Export MCP command - create AI-ready export
program
  .command('export')
  .description('📤 Export DCP IR as MCP for AI/LLM consumption')
  .argument('<registry>', 'Path to DCP registry.json')
  .option('-o, --out <path>', 'Output path for MCP export', './mcp_export.json')
  .option('-c, --chunk-size <size>', 'Max tokens per chunk for LLMs', '4000')
  .option('--include-examples', 'Include code examples in export')
  .option('--optimize-for <model>', 'Optimize for specific LLM', 'claude')
  .action(wrapAction(runExportMCP, 'Export MCP'));

// Validate command - check DCP IR against schema
program
  .command('validate')
  .description('✅ Validate DCP IR against schema')
  .argument('<registry>', 'Path to DCP registry.json')
  .option('--fix', 'Attempt to auto-fix validation errors')
  .option('--strict', 'Use strict validation mode')
  .action(wrapAction(runValidateTransform, 'Validate'));

// Transpile command - generate running code from DCP IR
program
  .command('transpile')
  .description('🚀 Generate running code from DCP IR')
  .argument('<registry>', 'Path to DCP registry.json')
  .option('-t, --target <target>', 'Target framework', 'react')
  .option('-o, --out <path>', 'Output directory', './generated')
  .option('-f, --format <format>', 'Output format', 'typescript')
  .option('--include-stories', 'Generate Storybook stories')
  .option('--include-styles', 'Include styling integration')
  .option('--atomic', 'Use atomic design organization')
  .action(wrapAction(runTranspile, 'Transpile'));

// Quick command - extract + export in one go
program
  .command('quick')
  .description('⚡ Extract and export in one command')
  .argument('<source>', 'Source directory containing React/TS components')
  .option('-t, --tokens <path>', 'Path to design tokens file')
  .option('-o, --out <path>', 'Output directory', './dcp-output')
  .option('--llm-enrich', 'Add AI-friendly descriptions')
  .option('--plan', 'Generate starter mutation plan')
  .option('--transpile', 'Also generate React components')
  .option('--include-stories', 'Generate Storybook stories')
  .action(wrapAction(async (source, options) => {
    console.log(chalk.blue('🚀 Running quick extraction + export...'));
    
    // Run extract
    const extractResult = await runExtract(source, {
      ...options,
      out: options.out,
      plan: options.plan
    });
    
    // Run export
    const registryPath = `${options.out}/registry.json`;
    const exportResult = await runExportMCP(registryPath, {
      out: `${options.out}/mcp_export.json`,
      includeExamples: true
    });
    
    let transpileResult = null;
    
    // Run transpile if requested
    if (options.transpile) {
      console.log(chalk.blue('🚀 Transpiling to React components...'));
      transpileResult = await runTranspile(registryPath, {
        target: 'react',
        out: `${options.out}/components`,
        format: 'typescript',
        includeStories: options.includeStories,
        includeStyles: true
      });
    }
    
    return {
      summary: {
        'Components Extracted': extractResult.summary?.componentsFound || 0,
        'Tokens Processed': extractResult.summary?.tokensFound || 0,
        'MCP Chunks': exportResult.summary?.chunksGenerated || 0,
        'React Components': transpileResult?.summary?.componentsGenerated || 0,
        'Stories Generated': transpileResult?.summary?.storiesGenerated || 0,
        'Output Directory': options.out
      }
    };
  }, 'Quick Transform'));

// Info command - show transformation info
program
  .command('info')
  .description('📋 Show info about a DCP registry')
  .argument('<registry>', 'Path to DCP registry.json')
  .action(wrapAction(async (registryPath) => {
    const fs = await import('fs');
    
    if (!fs.existsSync(registryPath)) {
      throw new Error(`Registry not found: ${registryPath}`);
    }
    
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    
    console.log(chalk.green('\n🧬 DCP Registry Info:'));
    console.log(chalk.gray(`   Name: ${registry.name || 'Unknown'}`));
    console.log(chalk.gray(`   Version: ${registry.version || 'Unknown'}`));
    console.log(chalk.gray(`   Components: ${registry.components?.length || 0}`));
    console.log(chalk.gray(`   Tokens: ${Object.keys(registry.tokens || {}).length}`));
    console.log(chalk.gray(`   Last Modified: ${new Date(registry.lastModified || Date.now()).toLocaleString()}`));
    
    if (registry.metadata?.transformedFrom) {
      console.log(chalk.gray(`   Transformed From: ${registry.metadata.transformedFrom}`));
    }
    
    return {
      summary: {
        'Components': registry.components?.length || 0,
        'Tokens': Object.keys(registry.tokens || {}).length,
        'Valid': true
      }
    };
  }, 'Info'));

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}