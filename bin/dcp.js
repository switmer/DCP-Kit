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
  .option('--json', 'output machine-readable JSON')
  .action(async (source, options) => {
    try {
      const { runExtract } = await import('../commands/extract-v2.js');
      
      if (!options.json) {
        console.log(`🔍 Extracting components from ${source}...`);
      }
      
      const result = await runExtract(source, options);
      
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          components: result.registry.components.length,
          tokens: Object.keys(result.registry.tokens || {}).length,
          outputDir: result.outputDir,
          registryPath: `${result.outputDir}/registry.json`
        }, null, 2));
      } else {
        console.log(`✅ Extracted ${result.registry.components.length} components`);
        console.log(`📁 Output: ${result.outputDir}/registry.json`);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Extract failed:', error.message);
      }
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
  .option('--dry-run', 'Preview changes without applying')
  .option('--json', 'output machine-readable JSON')
  .action(async (registry, patch, output, options) => {
    try {
      const { runBatchMutate } = await import('../commands/batchMutate.js');
      
      if (options.dryRun) {
        // For dry run, just validate and show what would happen
        const fs = await import('fs');
        const registryData = JSON.parse(fs.readFileSync(registry, 'utf-8'));
        const patchData = JSON.parse(fs.readFileSync(patch, 'utf-8'));
        
        if (options.json) {
          console.log(JSON.stringify({
            success: true,
            dryRun: true,
            mutations: patchData.length,
            preview: "Mutations would be applied to registry",
            command: `dcp mutate ${registry} ${patch} ${output}${options.undo ? ` --undo ${options.undo}` : ''}`
          }, null, 2));
        } else {
          console.log(`🔍 DRY RUN: Would apply ${patchData.length} mutations`);
          console.log(`   Registry: ${registry}`);
          console.log(`   Patch: ${patch}`);
          console.log(`   Output: ${output}`);
          if (options.undo) console.log(`   Undo: ${options.undo}`);
          console.log(`✨ Run without --dry-run to apply changes`);
        }
        return;
      }
      
      const result = await runBatchMutate(registry, patch, output, {
        undo: options.undo,
        schema: options.schema,
        verbose: !options.json
      });
      
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          mutations: result.mutations,
          output: result.output,
          undo: result.undo,
          log: result.log
        }, null, 2));
      } else {
        console.log(`✅ Applied ${result.mutations} mutations`);
        if (result.undo) {
          console.log(`↩️  Undo patch available: ${result.undo}`);
        }
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Mutation failed:', error.message);
      }
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

program
  .command('agent <prompt>')
  .description('Natural language mutations using AI planning')
  .option('-r, --registry <path>', 'Registry file path', './registry.json')
  .option('--plan-only', 'Generate mutation plan without applying')
  .option('--dry-run', 'Preview changes without applying')
  .option('--json', 'output machine-readable JSON')
  .option('-o, --out <file>', 'Output mutation plan file', './mutation-plan.json')
  .action(async (prompt, options) => {
    try {
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          intent: prompt,
          registryPath: options.registry,
          planOnly: options.planOnly || options.dryRun,
          mutationPlanPath: options.out,
          nextSteps: {
            preview: `dcp diffPreview ${options.out}`,
            apply: `dcp mutate ${options.registry} ${options.out} ${options.registry.replace('.json', '-mutated.json')} --undo undo.json`,
            rollback: `dcp rollback ${options.registry.replace('.json', '-mutated.json')} undo.json`
          }
        }, null, 2));
      } else {
        console.log(`🤖 AI Agent Planning: "${prompt}"`);
        console.log(`   Registry: ${options.registry}`);
        console.log(`   Plan Output: ${options.out}`);
        console.log(`⚠️  AI planning requires OpenAI API key (coming soon)`);
        console.log(`📋 For now, create mutation plans manually using JSON Patch format`);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Agent planning failed:', error.message);
      }
      process.exit(1);
    }
  });

program.parse();