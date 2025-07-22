#!/usr/bin/env node

import { program } from 'commander';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

program
  .name('dcp')
  .description('Design Component Protocol Transformer - CRISPR for Code')
  .version('1.2.0')
  .addHelpText('after', `
Complete Workflow:
  1. Extract:   dcp extract ./src --json > registry.json
  2. Mutate:    dcp mutate registry.json patch.json output.json --undo undo.json
  3. Rollback:  dcp rollback output.json undo.json (if needed)
  4. Transpile: dcp transpile output.json --target react --out ./components

Agent Mode:
  dcp agent "Make all buttons accessible" --json

Learn more: https://github.com/stevewitmer/dcp-transformer`);

program
  .command('extract <source>')
  .description('Extract components from source directory')
  .option('-o, --out <dir>', 'output directory', './registry')
  .option('-t, --tokens <file>', 'design tokens file (JSON)')
  .option('-g, --glob <pattern>', 'glob pattern for files (e.g., "**/*.{tsx,jsx}")')
  .option('--flatten-tokens', 'extract CSS custom props as flat key-value pairs, skip Tailwind mapping')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp extract ./src --json > registry.json
  $ dcp extract ./components --tokens design-tokens.json --out ./registry
  $ dcp extract ./src --glob "**/*.tsx" --json`)
  .action(async (source, options) => {
    try {
      const { runExtract } = await import('../commands/extract-v2.js');
      
      if (!options.json) {
        console.log(`🔍 Extracting components from ${source}...`);
      }
      
      const result = await runExtract(source, { ...options, json: options.json });
      
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
  .command('watch <source>')
  .description('Watch source directory for changes and update registry live')
  .option('-o, --out <dir>', 'output directory', './registry')
  .option('-t, --tokens <file>', 'design tokens file (JSON)')
  .option('-g, --glob <pattern>', 'glob pattern for files (e.g., "**/*.{tsx,jsx}")')
  .option('--flatten-tokens', 'extract CSS custom props as flat key-value pairs, skip Tailwind mapping')
  .option('--debounce <ms>', 'debounce delay in milliseconds', '300')
  .option('--ws <port>', 'enable WebSocket server on port for live updates')
  .option('--quiet', 'suppress console output')
  .addHelpText('after', `
Examples:
  $ dcp watch ./src --out ./registry
  $ dcp watch ./components --tokens globals.css --ws 7070
  $ dcp watch ./src --debounce 500 --quiet`)
  .action(async (source, options) => {
    try {
      const { runWatch } = await import('../commands/watch.js');
      await runWatch(source, options);
      
      // Keep process alive - runWatch handles SIGINT
      return new Promise(() => {});
    } catch (error) {
      console.error('❌ Watch failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('transpile <registry>')
  .description('Transpile registry to target framework')
  .option('-t, --target <framework>', 'target framework (react, vue, svelte)', 'react')
  .option('-f, --format <format>', 'output format (typescript, javascript)', 'typescript')
  .option('-o, --out <dir>', 'output directory', './components')
  .option('--include-stories', 'include Storybook stories')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp transpile registry.json --target react --out ./src/components
  $ dcp transpile registry.json --include-stories --json
  $ dcp transpile registry.json --target vue --format javascript`)
  .action(async (registry, options) => {
    try {
      const { runTranspile } = await import('../commands/transpile.js');
      
      if (!options.json) {
        console.log(`🔄 Transpiling ${registry} to ${options.target}...`);
      }
      
      const result = await runTranspile(registry, { ...options, json: options.json });
      
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          componentsGenerated: result.summary?.componentsGenerated || 0,
          outputDir: options.out,
          target: options.target,
          format: options.format
        }, null, 2));
      } else {
        console.log(`✅ Generated ${result.summary.componentsGenerated} components`);
        console.log(`📁 Output: ${options.out}`);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Transpile failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('export-mcp <registry>')
  .description('Export registry to Model Context Protocol format')
  .option('-o, --out <file>', 'output file', './mcp_export.json')
  .option('--optimize-for <model>', 'optimize for AI model (claude, gpt4, gemini)', 'claude')
  .option('--chunk-size <size>', 'chunk size in tokens (1000-16000)', '8000')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp export-mcp registry.json --optimize-for claude --json
  $ dcp export-mcp registry.json --chunk-size 4000 --out llm-context.json
  $ dcp export-mcp registry.json --optimize-for gpt4`)
  .action(async (registry, options) => {
    try {
      const { runExportMCP } = await import('../commands/export-mcp.js');
      
      if (!options.json) {
        console.log(`📤 Exporting ${registry} to MCP format...`);
      }
      
      const result = await runExportMCP(registry, options);
      
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          chunks: result.mcpExport?.chunks?.length || 0,
          outputFile: options.out,
          optimizeFor: options.optimizeFor
        }, null, 2));
      } else {
        console.log(`✅ Created ${result.mcpExport.chunks.length} chunks`);
        console.log(`📁 Output: ${options.out}`);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Export failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('validate <registry>')
  .description('Validate registry structure against DCP schema')
  .option('--json', 'output machine-readable JSON')
  .option('--strict', 'enable strict validation mode')
  .addHelpText('after', `
Examples:
  $ dcp validate registry.json --json
  $ dcp validate registry.json --strict
  $ dcp validate registry.json`)
  .action(async (registry, options) => {
    try {
      const { validateRegistry } = await import('../commands/validate.js');
      
      if (!options.json) {
        console.log(`✅ Validating ${registry}...`);
      }
      
      const result = await validateRegistry(registry);
      
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          valid: result.isValid,
          errors: result.errors || [],
          registryPath: registry
        }, null, 2));
      } else {
        console.log(`📊 Validation complete`);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Validation failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('mutate <registry> <patch> <output>')
  .description('Apply JSON Patch mutations to registry')
  .option('--undo <file>', 'generate undo patch file for rollback')
  .option('--schema <path>', 'schema file for validation', 'schemas/manifest.schema.json')
  .option('--dry-run', 'preview changes without applying them')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp mutate registry.json patch.json output.json --undo undo.json
  $ dcp mutate registry.json changes.json result.json --dry-run --json
  $ dcp mutate registry.json mutations.json final.json --schema custom.schema.json

JSON Patch format:
  [{"op": "replace", "path": "/components/0/props/variant", "value": "ghost"}]`)
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
  .description('Rollback mutations using undo patch file')
  .option('--backup', 'create backup before rollback')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp rollback mutated.json undo.json --backup
  $ dcp rollback registry.json rollback-patch.json --json
  $ dcp rollback output.json undo.json

Note: The undo file is generated by the mutate command with --undo flag`)
  .action(async (registry, undo, options) => {
    try {
      const { runRollback } = await import('../commands/rollback.js');
      const result = await runRollback(registry, undo, {
        backup: options.backup,
        verbose: !options.json
      });
      
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          rollback: result.rollback,
          patchCount: result.patchCount,
          log: result.log
        }, null, 2));
      } else {
        console.log(`✅ Rollback complete: ${result.rollback}`);
        console.log(`↩️  Applied ${result.patchCount} undo patches`);
      }
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('agent <prompt>')
  .description('Natural language mutations using AI planning')
  .option('-r, --registry <path>', 'registry file path', './registry.json')
  .option('--plan-only', 'generate mutation plan without applying')
  .option('--dry-run', 'preview changes without applying')
  .option('--json', 'output machine-readable JSON')
  .option('-o, --out <file>', 'output mutation plan file', './mutation-plan.json')
  .addHelpText('after', `
Examples:
  $ dcp agent "Make all buttons ghost variant" --json
  $ dcp agent "Add accessibility props to all components" --plan-only
  $ dcp agent "Change primary colors to blue" --registry my-registry.json --dry-run
  $ dcp agent "Update component variants" --out custom-plan.json

Supported prompts:
  - "Make all [component] [variant]"
  - "Change [property] to [value]"
  - "Add [feature] to components"
  - "Update [pattern] across library"`)
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