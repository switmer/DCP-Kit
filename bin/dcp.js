#!/usr/bin/env node

import { program } from 'commander';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

program
  .name('dcp')
  .description('Design Component Protocol Transformer')
  .version('1.2.0');

program
  .command('extract <source>')
  .description('Extract components from source directory')
  .option('-o, --out <dir>', 'output directory', './registry')
  .option('-t, --tokens <file>', 'design tokens file')
  .option('-g, --glob <pattern>', 'glob pattern for files')
  .action(async (source, options) => {
    try {
      const { runExtract } = await import('../commands/extract-v2.js');
      console.log(`🔍 Extracting components from ${source}...`);
      const result = await runExtract(source, options);
      console.log(`✅ Extracted ${result.registry.components.length} components`);
      console.log(`📁 Output: ${result.outputDir}/registry.json`);
    } catch (error) {
      console.error('❌ Extract failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('transpile <registry>')
  .description('Transpile registry to target framework')
  .option('-t, --target <framework>', 'target framework', 'react')
  .option('-f, --format <format>', 'output format', 'typescript')
  .option('-o, --out <dir>', 'output directory', './components')
  .option('--include-stories', 'include Storybook stories')
  .action(async (registry, options) => {
    try {
      const { runTranspile } = await import('../commands/transpile.js');
      console.log(`🔄 Transpiling ${registry} to ${options.target}...`);
      const result = await runTranspile(registry, options);
      console.log(`✅ Generated ${result.summary.componentsGenerated} components`);
      console.log(`📁 Output: ${options.out}`);
    } catch (error) {
      console.error('❌ Transpile failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('export-mcp <registry>')
  .description('Export registry to Model Context Protocol format')
  .option('-o, --out <file>', 'output file', './mcp_export.json')
  .option('--optimize-for <model>', 'optimize for AI model', 'claude')
  .option('--chunk-size <size>', 'chunk size in tokens', '8000')
  .action(async (registry, options) => {
    try {
      const { runExportMCP } = await import('../commands/export-mcp.js');
      console.log(`📤 Exporting ${registry} to MCP format...`);
      const result = await runExportMCP(registry, options);
      console.log(`✅ Created ${result.mcpExport.chunks.length} chunks`);
      console.log(`📁 Output: ${options.out}`);
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('validate <registry>')
  .description('Validate registry structure')
  .action(async (registry, options) => {
    try {
      const { validateRegistry } = await import('../commands/validate.js');
      console.log(`✅ Validating ${registry}...`);
      const result = await validateRegistry(registry);
      console.log(`📊 Validation complete`);
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('mutate <registry> <patch> <output>')
  .description('Apply JSON Patch mutations to registry')
  .option('--undo <file>', 'Generate undo patch file')
  .option('--schema <path>', 'Schema for validation', 'schemas/manifest.schema.json')
  .action(async (registry, patch, output, options) => {
    try {
      const { runBatchMutate } = await import('../commands/batchMutate.js');
      const result = await runBatchMutate(registry, patch, output, {
        undo: options.undo,
        schema: options.schema
      });
      
      console.log(`✅ Applied ${result.mutations} mutations`);
      if (result.undo) {
        console.log(`↩️  Undo patch available: ${result.undo}`);
      }
    } catch (error) {
      console.error('❌ Mutation failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('rollback <registry> <undo>')
  .description('Rollback using undo patch')
  .option('--backup', 'Create backup before rollback')
  .action(async (registry, undo, options) => {
    try {
      const { runRollback } = await import('../commands/rollback.js');
      const result = await runRollback(registry, undo, {
        backup: options.backup
      });
      
      console.log(`✅ Rollback complete: ${result.rollback}`);
      console.log(`↩️  Applied ${result.patchCount} undo patches`);
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      process.exit(1);
    }
  });

program.parse();