#!/usr/bin/env node

/**
 * DCP CLI Entry Point
 * 
 * This file now delegates to the new modular CLI structure in src/cli/index.js
 * The old command definitions below are kept for backward compatibility during migration
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to use the new CLI structure first
try {
  const { program } = await import('../src/cli/index.js');
  // The new CLI program is already configured and ready to parse
  program.parse();
} catch (error) {
  // Fallback to old CLI if new one fails
  console.error('Failed to load new CLI structure, falling back to legacy CLI');
  console.error(error.message);
  
  // Import old CLI implementation
  const { program } = await import('commander');
  
  program
    .name('dcp')
    .description('Design Component Protocol Transformer - CRISPR for Code')
    .version('2.0.0')
  .addHelpText('after', `
Complete Workflow:
  0. Validate:  dcp validate --auto-fix             # Ensure project is ready
  1. Extract:   dcp extract ./src --json > registry.json
  2. Mutate:    dcp mutate registry.json patch.json output.json --undo undo.json
  3. Rollback:  dcp rollback output.json undo.json (if needed)
  4. Transpile: dcp transpile output.json --target react --out ./components

Agent Mode:
  dcp agent "Make all buttons accessible" --json

Project Setup:
  dcp validate                                     # Check project configuration
  dcp validate --auto-fix                         # Fix common issues automatically
  dcp extract ./src --auto-fix                    # Extract with auto-fix

Learn more: https://github.com/stevewitmer/dcp-transformer`);

program
  .command('extract <source>')
  .description('Extract components from source directory')
  .option('-o, --out <dir>', 'output directory', './registry')
  .option('-t, --tokens <file>', 'design tokens file (JSON)')
  .option('--auto-detect-tokens', 'automatically detect and extract tokens from all sources')
  .option('-g, --glob <pattern>', 'glob pattern for files (e.g., "**/*.{tsx,jsx}")')
  .option('-a, --adaptor <name>', 'force specific adaptor (react-tsx, vue-sfc, svelte)', 'react-tsx')
  .option('--flatten-tokens', 'extract CSS custom props as flat key-value pairs, skip Tailwind mapping')
  .option('--max-depth <number>', 'maximum barrel recursion depth', '10')
  .option('--trace-barrels', 'trace barrel file resolution for debugging')
  .option('--no-barrels', 'disable barrel file following')
  .option('--security-scan', 'scan for security issues and malicious patterns')
  .option('--validate-file-types', 'validate only expected file types are included')
  .option('--detect-obfuscation', 'detect obfuscated or minified code')
  .option('--agent-ready', 'optimize output for AI/agent consumption')
  .option('--skip-validation', 'skip project validation before extraction')
  .option('--auto-fix', 'automatically fix common configuration issues')
  .option('--verbose', 'enable verbose logging')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp extract ./src --json > registry.json
  $ dcp extract ./components --tokens design-tokens.json --out ./registry
  $ dcp extract ./src --auto-detect-tokens --verbose  # Auto-detect all token sources
  $ dcp extract ./src --glob "**/*.tsx" --adaptor react-tsx --verbose
  $ dcp extract ./vue-components --adaptor vue-sfc --json
  $ dcp extract ./src --trace-barrels --max-depth 5  # Debug barrel resolution
  $ dcp extract ./src --no-barrels                   # Skip barrel files`)
  .action(async (source, options) => {
    try {
      // Project validation (unless skipped)
      if (!options.skipValidation) {
        const { ProjectValidator } = await import('../src/core/projectValidator.js');
        const validator = new ProjectValidator(source);
        const validation = await validator.validate();
        
        if (!validation.canProceed && !options.autoFix) {
          if (options.json) {
            console.log(JSON.stringify({ 
              success: false, 
              error: 'Project validation failed',
              issues: validation.issues,
              suggestion: 'Run with --auto-fix to attempt automatic fixes, or --skip-validation to proceed anyway'
            }, null, 2));
          } else {
            console.error('❌ Cannot proceed with extraction due to validation errors.');
            console.error('💡 Run with --auto-fix to attempt fixes, or --skip-validation to override.');
          }
          process.exit(1);
        }
        
        // Auto-fix if requested and there are fixable issues
        if (options.autoFix && validation.issues.some(i => i.autoFix)) {
          await validator.autoFix();
          console.log('🔧 Auto-fix completed. Re-running validation...\n');
          
          // Re-validate after fixes
          const revalidation = await validator.validate();
          if (!revalidation.canProceed) {
            if (options.json) {
              console.log(JSON.stringify({ 
                success: false, 
                error: 'Auto-fix did not resolve all critical issues',
                issues: revalidation.issues
              }, null, 2));
            } else {
              console.error('❌ Auto-fix did not resolve all critical issues.');
            }
            process.exit(1);
          }
        }
      }
      
      const { runExtract } = await import('../src/commands/extract-v3.js');
      
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
          registryPath: `${result.outputDir}/registry.json`,
          adaptorUsage: result.summary.adaptorUsage
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
  .command('validate [path]')
  .description('Validate project configuration for DCP extraction')
  .option('--auto-fix', 'automatically fix common configuration issues')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp validate                     # Validate current directory
  $ dcp validate ./src              # Validate specific path
  $ dcp validate --auto-fix         # Validate and fix issues
  $ dcp validate --json             # Machine-readable output`)
  .action(async (projectPath = '.', options) => {
    try {
      const { ProjectValidator } = await import('../src/core/projectValidator.js');
      const validator = new ProjectValidator(projectPath);
      const validation = await validator.validate();
      
      // Auto-fix if requested
      if (options.autoFix && validation.issues.some(i => i.autoFix)) {
        await validator.autoFix();
        console.log('🔧 Auto-fix completed. Re-running validation...\n');
        
        // Re-validate after fixes
        const revalidation = await validator.validate();
        
        if (options.json) {
          console.log(JSON.stringify({
            success: revalidation.valid,
            canProceed: revalidation.canProceed,
            autoFixApplied: true,
            ...revalidation.summary
          }, null, 2));
        }
        process.exit(revalidation.canProceed ? 0 : 1);
      }
      
      if (options.json) {
        console.log(JSON.stringify({
          success: validation.valid,
          canProceed: validation.canProceed,
          issues: validation.issues,
          warnings: validation.warnings,
          suggestions: validation.suggestions,
          ...validation.summary
        }, null, 2));
      }
      
      process.exit(validation.canProceed ? 0 : 1);
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
  .command('registry')
  .description('Generate ShadCN-compatible registry from design system')
  .addCommand(
    program.createCommand('generate')
      .description('Generate full registry from component directory')
      .argument('<source>', 'source directory containing components')
      .option('--format <format>', 'output format (shadcn, dcp)', 'shadcn')
      .option('--name <name>', 'registry name', 'custom-ui')
      .option('--homepage <url>', 'registry homepage URL')
      .option('-o, --output <dir>', 'output directory', './registry')
      .option('--verbose', 'verbose logging')
      .addHelpText('after', `
Examples:
  $ dcp registry generate ./src/components/ui
  $ dcp registry generate ./components --name "my-design-system" --output ./my-registry`)
      .action(async (source, options, command) => {
        try {
          const { RegistryItemGenerator } = await import('../src/core/registryItemGenerator.js');
          const { parseTSX } = await import('../src/core/parser.js');
          const { glob } = await import('glob');
          const fs = await import('fs/promises');
          const path = await import('path');
          const chalk = await import('chalk');
          
          console.log(chalk.default.blue(`🏗️  Generating ${options.format} registry from: ${source}`));
          
          const generator = new RegistryItemGenerator();
          const registry = {
            "$schema": "https://ui.shadcn.com/schema/registry.json",
            "name": options.name,
            "homepage": options.homepage || "",
            "items": []
          };

          // Find all component files
          const componentFiles = await glob.glob('**/*.{tsx,jsx}', { 
            cwd: source, 
            absolute: true 
          });

          if (options.verbose) {
            console.log(chalk.default.gray(`Found ${componentFiles.length} component files`));
          }

          // Process each component file
          let processedCount = 0;
          for (const filePath of componentFiles) {
            try {
              // Skip test files, stories, etc.
              const fileName = path.basename(filePath).toLowerCase();
              if (fileName.includes('.test.') || fileName.includes('.spec.') || 
                  fileName.includes('.stories.') || fileName === 'index.tsx' || fileName === 'index.jsx') {
                if (options.verbose) {
                  console.log(chalk.default.gray(`Skipping: ${fileName}`));
                }
                continue;
              }

              // Read source code
              const sourceCode = await fs.readFile(filePath, 'utf-8');
              
              // Parse component with DCP parser
              const dcpResult = await parseTSX(filePath, { verbose: options.verbose });
              
              if (!dcpResult) {
                if (options.verbose) {
                  console.log(chalk.default.gray(`No components found in: ${fileName}`));
                }
                continue;
              }

              // parseTSX returns a single component object, not an array
              const dcpComponent = dcpResult;
              
              // Transform to ShadCN format
              const registryItem = await generator.transformDCPToShadCN(dcpComponent, sourceCode, filePath);
              
              if (registryItem) {
                registry.items.push(registryItem);
                processedCount++;
                
                if (options.verbose) {
                  console.log(chalk.default.green(`✓ Processed: ${registryItem.name}`));
                }
              }
              
            } catch (error) {
              console.warn(chalk.default.yellow(`⚠️  Failed to process ${path.basename(filePath)}: ${error.message}`));
              
              if (options.verbose) {
                console.error(error.stack);
              }
            }
          }
          
          // Ensure output directory exists
          await fs.mkdir(options.output, { recursive: true });
          
          // Write registry.json
          const registryPath = path.join(options.output, 'registry.json');
          await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
          
          console.log(chalk.default.green(`✅ Registry generated: ${registryPath}`));
          console.log(chalk.default.gray(`   Components: ${registry.items.length}`));
          console.log(chalk.default.gray(`   Processed: ${processedCount}/${componentFiles.length} files`));
          
        } catch (error) {
          console.error(chalk.default.red('❌ Registry generation failed:'), error.message);
          if (options.verbose) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      })
  )
  .addCommand(
    program.createCommand('item')
      .description('Generate single registry item from component file or DCP JSON')
      .argument('<component>', 'component file path or DCP JSON file')
      .option('--format <format>', 'output format (shadcn, dcp)', 'shadcn')
      .option('-o, --output <file>', 'output file path')
      .option('--verbose', 'verbose logging')
      .addHelpText('after', `
Examples:
  $ dcp registry item ./src/components/Button.tsx
  $ dcp registry item ./registry/Button.dcp.json --output button-registry.json`)
      .action(async (component, options) => {
        try {
          const { RegistryItemGenerator } = await import('../src/core/registryItemGenerator.js');
          const { parseTSX } = await import('../src/core/parser.js');
          const fs = await import('fs/promises');
          const chalk = await import('chalk');
          
          console.log(chalk.default.blue(`🔧 Generating registry item for: ${component}`));
          
          const generator = new RegistryItemGenerator();
          let registryItem;
          
          // Check if input is a DCP JSON file
          if (component.endsWith('.dcp.json')) {
            // Load DCP JSON and transform
            const dcpData = JSON.parse(await fs.readFile(component, 'utf-8'));
            registryItem = await generator.transformDCPToShadCN(dcpData);
          } else {
            // Process component file
            const sourceCode = await fs.readFile(component, 'utf-8');
            const dcpResult = await parseTSX(component, { verbose: options.verbose });
            
            if (!dcpResult) {
              throw new Error(`No components found in: ${component}`);
            }

            // parseTSX returns a single component object, not an array
            const dcpComponent = dcpResult;
            registryItem = await generator.transformDCPToShadCN(dcpComponent, sourceCode, component);
          }
          
          if (options.output) {
            await fs.writeFile(options.output, JSON.stringify(registryItem, null, 2));
            console.log(chalk.default.green(`✅ Registry item written: ${options.output}`));
          } else {
            console.log(JSON.stringify(registryItem, null, 2));
          }
          
        } catch (error) {
          const chalk = await import('chalk');
          console.error(chalk.default.red('❌ Registry item generation failed:'), error.message);
          if (options.verbose) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      })
  );

program
  .command('build')
  .description('Build DCP registry from configuration')
  .option('-c, --config <path>', 'config file path', './dcp.config.json')
  .option('--verbose', 'verbose logging')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp build
  $ dcp build --config ./custom.config.json
  $ dcp build --verbose --json`)
  .action(async (options) => {
    try {
      const { runBuild } = await import('../src/commands/build.js');
      const result = await runBuild({
        configPath: options.config,
        verbose: options.verbose || !options.json
      });
      
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          components: result.components?.length || 0,
          configPath: options.config
        }, null, 2));
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Build failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('build-packs <registry>')
  .description('Build static component packages for distribution')
  .option('-o, --out <dir>', 'output directory for component packs', './dist/packs')
  .option('--base-url <url>', 'base URL for hosted blobs', '')
  .option('--namespace <name>', 'component namespace/scope', 'ui')
  .option('--version <version>', 'package version', '1.0.0')
  .option('--verbose', 'verbose logging')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp build-packs registry/registry.json --out dist/packs
  $ dcp build-packs registry.json --base-url https://cdn.example.com
  $ dcp build-packs registry.json --namespace acme-ui --version 2.1.0
  $ dcp build-packs registry.json --json`)
  .action(async (registry, options) => {
    try {
      const { runBuildPacks } = await import('../src/commands/build-packs.js');
      
      if (!options.json) {
        console.log(`📦 Building component packs from ${registry}...`);
      }
      
      const result = await runBuildPacks(registry, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`✅ Built ${result.packs} component packs`);
        if (result.errors > 0) {
          console.log(`⚠️  ${result.errors} components failed to build`);
        }
        console.log(`📁 Output: ${result.outputDir}`);
        console.log(`📋 Index: ${result.indexUrl}`);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Build failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('radix-tokens [source]')
  .description('Extract Radix tokens and generate multi-framework outputs')
  .option('-o, --out <dir>', 'Output directory', './dcp-tokens')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-j, --json', 'Output JSON format')
  .addHelpText('after', `
Examples:
  $ dcp radix-tokens
  $ dcp radix-tokens ./node_modules/@radix-ui/themes --out ./tokens
  $ dcp radix-tokens ./custom-radix --verbose --json`)
  .action(async (source = './node_modules/@radix-ui/themes', options) => {
    try {
      const { runRadixTokens } = await import('../src/commands/radix-tokens.js');
      
      if (!options.json) {
        console.log(`🎨 Extracting Radix tokens from ${source}...`);
      }
      
      const result = await runRadixTokens(source, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.success) {
          console.log(`✅ Extracted ${result.tokens} tokens`);
          console.log(`📁 Generated ${result.outputs.length} formats: ${result.outputs.join(', ')}`);
          console.log(`📂 Output: ${options.out || './dcp-tokens'}`);
        } else {
          console.error(`❌ Extraction failed: ${result.error}`);
        }
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Radix tokens failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('serve-registry [packs-dir]')
  .description('Serve component packs via HTTP for development')
  .option('-p, --port <number>', 'server port', '7401')
  .option('-h, --host <host>', 'server host', 'localhost')
  .option('--no-cors', 'disable CORS')
  .option('--secret <secret>', 'JWT secret for private registries')
  .option('--base-url <url>', 'base URL for hosted files')
  .option('--verbose', 'verbose logging')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp serve-registry dist/packs
  $ dcp serve-registry dist/packs --port 8080 --verbose
  $ dcp serve-registry dist/packs --secret mytoken --base-url https://cdn.example.com
  $ dcp serve-registry dist/packs --json`)
  .action(async (packsDir = './dist/packs', options) => {
    try {
      const { runServeRegistry } = await import('../src/commands/serve-registry.js');
      
      if (!options.json) {
        console.log(`🚀 Starting registry server for ${packsDir}...`);
      }
      
      const result = await runServeRegistry(packsDir, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`✅ Registry server running at ${result.url}`);
        console.log(`📁 Serving: ${result.packsDir}`);
        console.log(`\nPress Ctrl+C to stop`);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Server failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('publish-static <packs-dir>')
  .description('Publish component packs to static hosting')
  .option('--provider <provider>', 'hosting provider (s3, github-pages, generic)', 'detect')
  .option('--bucket <bucket>', 'S3 bucket name')
  .option('--region <region>', 'AWS region', 'us-east-1')
  .option('--base-url <url>', 'base URL for hosted files')
  .option('--namespace <name>', 'component namespace', 'ui')
  .option('--dry-run', 'preview without uploading')
  .option('--verbose', 'verbose logging')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp publish-static dist/packs --bucket my-components --region us-west-2
  $ dcp publish-static dist/packs --provider github-pages
  $ dcp publish-static dist/packs --provider generic --base-url https://cdn.example.com
  $ dcp publish-static dist/packs --dry-run --verbose`)
  .action(async (packsDir, options) => {
    try {
      const { runPublishStatic } = await import('../src/commands/publish-static.js');
      
      if (!options.json) {
        console.log(`📤 Publishing packs from ${packsDir}...`);
      }
      
      const result = await runPublishStatic(packsDir, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.dryRun) {
          console.log(`🔍 Dry run completed - ${result.files} files ready to upload`);
        } else {
          console.log(`✅ Published ${result.files} files successfully`);
          if (result.errors > 0) {
            console.log(`⚠️  ${result.errors} files failed to upload`);
          }
          console.log(`🌍 Registry URL: ${result.registryUrl}`);
        }
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Publish failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('add <component-url>')
  .description('Install a component from a registry')
  .option('-t, --target <dir>', 'target directory for components', './components/ui')
  .option('--package-json <file>', 'path to package.json', './package.json')
  .option('--no-install', 'skip peer dependency installation')
  .option('--dry-run', 'preview installation without making changes')
  .option('--force', 'overwrite existing components')
  .option('--token <token>', 'authentication token for private registries')
  .option('--verbose', 'verbose logging')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp add https://registry.example.com/r/ui/button
  $ dcp add https://registry.example.com/r/ui/button@1.0.0
  $ dcp add /r/ui/button --token abc123
  $ dcp add https://registry.example.com/r/ui/card --target ./src/components --dry-run`)
  .action(async (componentUrl, options) => {
    try {
      const { runDcpAdd } = await import('../src/commands/dcp-add.js');
      
      if (!options.json) {
        console.log(`📦 Installing component from ${componentUrl}...`);
      }
      
      const result = await runDcpAdd(componentUrl, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.dryRun) {
          console.log(`🔍 Dry run completed - component ready to install`);
        } else {
          console.log(`✅ Successfully installed ${result.component.name}`);
          console.log(`📁 Location: ${result.targetDir}`);
          console.log(`📄 Files: ${result.files}`);
          if (result.peerDepsInstalled) {
            console.log(`📦 Dependencies: Updated`);
          }
        }
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Installation failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('adaptors')
  .description('List available component extraction adaptors')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp adaptors
  $ dcp adaptors --json`)
  .action(async (options) => {
    try {
      const { listAdaptors } = await import('../adaptors/registry.js');
      const adaptors = listAdaptors();
      
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          adaptors
        }, null, 2));
      } else {
        console.log('🔧 Available Component Adaptors:');
        console.log('');
        adaptors.forEach(adaptor => {
          console.log(`📦 ${adaptor.name}`);
          console.log(`   ${adaptor.description}`);
          console.log(`   Extensions: ${adaptor.extensions.join(', ')}`);
          if (adaptor.experimental) {
            console.log(`   ⚠️  Experimental`);
          }
          console.log('');
        });
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Failed to list adaptors:', error.message);
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
  .option('-a, --adaptor <name>', 'force specific adaptor (react-tsx, vue-sfc, svelte)', 'react-tsx')
  .option('--flatten-tokens', 'extract CSS custom props as flat key-value pairs, skip Tailwind mapping')
  .option('--debounce <ms>', 'debounce delay in milliseconds', '300')
  .option('--ws <port>', 'enable WebSocket server on port for live updates')
  .option('--verbose', 'enable verbose logging')
  .option('--quiet', 'suppress console output')
  .addHelpText('after', `
Examples:
  $ dcp watch ./src --out ./registry
  $ dcp watch ./components --tokens globals.css --ws 7070 --adaptor react-tsx
  $ dcp watch ./src --debounce 500 --quiet --verbose`)
  .action(async (source, options) => {
    try {
      const { runWatch } = await import('../src/commands/watch.js');
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
      const { runTranspile } = await import('../src/commands/transpile.js');
      
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
      const { runExportMCP } = await import('../src/commands/export-mcp.js');
      
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
  .command('validate-registry <registry>')
  .description('Validate registry structure against DCP schema')
  .option('--json', 'output machine-readable JSON')
  .option('--strict', 'enable strict validation mode')
  .option('--agent-schema', 'validate agent/LLM compatibility')
  .option('--comprehensive', 'run comprehensive validation checks')
  .option('--check-examples', 'validate component examples')
  .option('--check-tokens', 'validate design token usage')
  .option('--strict-tokens', 'strict token value format validation')
  .option('--check-source <dir>', 'validate against source code')
  .option('--check-naming', 'validate naming conventions')
  .option('--check-combinations', 'validate prop combinations')
  .option('--check-jsx', 'validate JSX syntax in examples')
  .option('--check-typescript', 'validate TypeScript compatibility')
  .option('--security-audit', 'run security audit on dependencies')
  .option('--check-vulnerabilities', 'check for known vulnerabilities')
  .option('--check-licenses', 'validate license compatibility')
  .option('--verify-integrity', 'verify registry checksums and signatures')
  .addHelpText('after', `
Examples:
  $ dcp validate-registry registry.json --json
  $ dcp validate-registry registry.json --strict
  $ dcp validate-registry registry.json`)
  .action(async (registry, options) => {
    try {
      const { validateRegistry } = await import('../src/commands/validate.js');
      
      if (!options.json) {
        console.log(`✅ Validating ${registry}...`);
      }
      
      const result = await validateRegistry(registry, options);
      
      if (options.json) {
        console.log(JSON.stringify({
          success: result.success,
          valid: result.valid,
          componentsValidated: result.componentsValidated,
          errors: result.errors || [],
          warnings: result.warnings || [],
          registryPath: registry
        }, null, 2));
      } else {
        console.log(`📊 Validation complete`);
      }
      
      // Exit with non-zero code if validation failed
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ 
          success: false, 
          valid: false,
          componentsValidated: 0,
          errors: [error.message],
          warnings: [],
          registryPath: registry
        }, null, 2));
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
  .option('--agent-mode', 'enable agent-friendly mutation processing')
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
      const { runBatchMutate } = await import('../src/commands/batchMutate.js');
      
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
      const { runRollback } = await import('../src/commands/rollback.js');
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
  .command('diff <from> <to>')
  .description('Compare two DCP registries and show differences')
  .option('--json', 'output machine-readable JSON')
  .option('--detailed', 'show detailed prop-level changes')
  .addHelpText('after', `
Examples:
  $ dcp diff old-registry.json new-registry.json
  $ dcp diff v1.json v2.json --json
  $ dcp diff before.json after.json --detailed`)
  .action(async (from, to, options) => {
    try {
      const { runDiff } = await import('../src/commands/diff.js');
      const result = await runDiff(from, to, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      }
      // Console output handled by runDiff function
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Diff failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('agent <prompt>')
  .description('Natural language mutations using AI planning')
  .option('-r, --registry <path>', 'registry file path', './registry.json')
  .option('--plan-only', 'generate mutation plan without applying')
  .option('--dry-run', 'preview changes without applying')
  .option('--analyze-relationships', 'analyze component relationships for context')
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
      const { runAgent } = await import('../src/commands/agent.js');
      
      if (!options.json) {
        console.log(`🤖 AI Agent Planning: "${prompt}"`);
      }
      
      const result = await runAgent(prompt, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.success) {
          console.log(`✅ Agent analysis complete`);
          console.log(`📋 Intent: ${result.intent}`);
          if (result.affectedComponents) {
            console.log(`📦 Affected components: ${result.affectedComponents.join(', ')}`);
          }
          if (result.mutationPlan) {
            console.log(`📄 Mutation plan saved: ${options.out}`);
          }
          if (result.nextSteps) {
            console.log(`\n🎯 Next Steps:`);
            console.log(`   Preview: ${result.nextSteps.preview}`);
            console.log(`   Apply: ${result.nextSteps.apply}`);
            console.log(`   Rollback: ${result.nextSteps.rollback}`);
          }
        } else {
          console.log(`❌ Agent planning failed`);
          result.errors?.forEach(error => console.log(`   Error: ${error}`));
        }
        
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach(warning => console.log(`   Warning: ${warning}`));
        }
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

// Add token commands
program
  .command('export-tokens <registry>')
  .description('Export DCP registry tokens to DTCG format')
  .option('-o, --out <file>', 'output file path', 'design.tokens.json')
  .option('--no-validate', 'skip DTCG validation')
  .option('--no-extensions', 'exclude DCP extensions')
  .option('--group-prefix <prefix>', 'prefix for token groups')
  .option('--json', 'output JSON stats instead of logs')
  .action(async (registry, options) => {
    try {
      const { runExportTokens } = await import('../src/commands/export-tokens.js');
      await runExportTokens(registry, options);
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('import-tokens <tokens>')
  .description('Import DTCG tokens into DCP registry')
  .option('-r, --registry <file>', 'target registry file', 'registry.json')
  .option('--merge', 'merge with existing registry')
  .option('--no-validate', 'skip DTCG validation')
  .option('--json', 'output JSON stats instead of logs')
  .action(async (tokens, options) => {
    try {
      const { runImportTokens } = await import('../src/commands/import-tokens.js');
      await runImportTokens(tokens, options);
    } catch (error) {
      console.error('❌ Import failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('build-assets [tokens]')
  .description('Generate CSS / native platform files from design tokens using Style Dictionary')
  .option('-p, --platform <name>', 'only build a specific platform (css, android, ios)')
  .option('-o, --out <dir>', 'output directory', 'build/')
  .option('-t, --theme <key>', 'build only a specific theme/group path')
  .option('--json', 'machine-readable JSON output')
  .action(async (tokens, options) => {
    try {
      const { runBuildAssets } = await import('../src/commands/build-assets.js');
      await runBuildAssets(tokens, options);
    } catch (error) {
      console.error('❌ build-assets failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('query <selector>')
  .description('Query design system registry with CSS-like selectors')
  .option('-r, --registry <path>', 'registry directory path', './registry')
  .option('-f, --format <format>', 'output format (json, table, list, count, default)', 'default')
  .option('-o, --output <file>', 'write results to file')
  .option('--pretty', 'pretty-print JSON output')
  .option('--verbose', 'verbose logging')
  .option('--json', 'machine-readable JSON output')
  .addHelpText('after', `
Examples:
  $ dcp query "tokens.color.*"                    # All color tokens
  $ dcp query "tokens where tokenSet != 'system'" # Non-system tokens
  $ dcp query "components where name = 'Button'"  # Button component
  $ dcp query "tokens.spacing.*" --format table   # Spacing tokens as table
  $ dcp query "components" --format list          # List all components
  $ dcp query "tokens.color.*" --output colors.json --pretty`)
  .action(async (selector, options) => {
    try {
      const { runQuery } = await import('../src/commands/query.js');
      await runQuery(selector, options);
    } catch (error) {
      if (options.json) {
        console.error(JSON.stringify({ error: error.message }));
      } else {
        console.error('❌ Query failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('validate-ci <source>')
  .description('Validate code against design system contract (CI-ready)')
  .option('-r, --registry <path>', 'registry directory path', './registry')
  .option('-f, --format <format>', 'output format (default, json, github, junit)', 'default')
  .option('-o, --output <file>', 'write report to file')
  .option('--no-fail-on-violations', 'do not exit with error code on violations')
  .option('--no-check-tokens', 'skip token validation')
  .option('--no-check-props', 'skip prop validation')
  .option('--no-check-variants', 'skip variant validation')
  .option('--allowed-hardcoded <values...>', 'allowed hardcoded values (comma-separated)')
  .option('--ignore <patterns...>', 'ignore patterns (e.g., "test/**,*.stories.*")')
  .option('-g, --glob <pattern>', 'file glob pattern', '**/*.{tsx,jsx,ts,js}')
  .option('--verbose', 'verbose logging')
  .option('--json', 'machine-readable JSON output')
  .addHelpText('after', `
Examples:
  $ dcp validate-ci ./src                       # Validate entire src directory
  $ dcp validate-ci ./src --format github       # GitHub Actions format
  $ dcp validate-ci ./src --format junit -o report.xml  # JUnit report
  $ dcp validate-ci ./src --no-check-tokens     # Skip token validation
  $ dcp validate-ci ./src --allowed-hardcoded transparent,inherit  # Allow specific values
  $ dcp validate-ci ./src --ignore "**/*.stories.*,**/*.test.*"    # Ignore test files
  
CI Integration:
  # GitHub Actions
  - run: npx dcp validate-ci ./src --format github
  
  # Exit codes:
  # 0 = validation passed
  # 1 = violations found (if --fail-on-violations enabled)`)
  .action(async (source, options) => {
    try {
      const { runValidateCI } = await import('../src/commands/validate-ci.js');
      await runValidateCI(source, options);
    } catch (error) {
      if (options.json) {
        console.error(JSON.stringify({ error: error.message }));
      } else {
        console.error('❌ Validation failed:', error.message);
      }
      process.exit(1);
    }
  });

program
  .command('diff <file1> <file2>')
  .description('Show differences between two registry files')
  .option('--json', 'output machine-readable JSON')
  .option('--format <format>', 'output format (unified, context, json)', 'unified')
  .option('--security-check', 'flag security-relevant changes')
  .addHelpText('after', `
Examples:
  $ dcp diff original.json modified.json
  $ dcp diff original.json modified.json --json
  $ dcp diff original.json modified.json --format context
  $ dcp diff original.json modified.json --security-check`)
  .action(async (file1, file2, options) => {
    try {
      const { runDiff } = await import('../src/commands/diff.js');
      
      if (!options.json) {
        console.log(`📊 Comparing ${file1} and ${file2}...`);
      }
      
      const result = await runDiff(file1, file2, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.changes && result.changes.length > 0) {
          console.log(`📋 Found ${result.changes.length} differences:`);
          result.changes.forEach((change, index) => {
            console.log(`  ${index + 1}. ${change.op} at ${change.path}: ${JSON.stringify(change.value)}`);
          });
          
          if (result.securityChanges && result.securityChanges.length > 0) {
            console.log(`\n🔒 Security-relevant changes:`);
            result.securityChanges.forEach(change => {
              console.log(`   ⚠️  ${change}`);
            });
          }
        } else {
          console.log('✅ No differences found');
        }
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Diff failed:', error.message);
      }
      process.exit(1);
    }
  });

// Demo command
program
  .command('demo <demo-file>')
  .description('Compile and validate component demo files')
  .option('--render', 'compile and analyze demo for prop usage')
  .option('--validate-api', 'validate demo examples against component API')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp demo Button.demo.tsx --render --json
  $ dcp demo Card.demo.tsx --validate-api
  $ dcp demo Alert.demo.tsx --render --validate-api`)
  .action(async (demoFile, options) => {
    try {
      const { runDemo } = await import('../src/commands/demo.js');
      
      if (!options.json) {
        console.log(`🔍 Processing demo: ${demoFile}...`);
      }
      
      const result = await runDemo(demoFile, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.success) {
          console.log(`✅ Demo validation passed`);
          if (result.compiled) {
            console.log(`✅ TypeScript compilation successful`);
          }
          if (result.detectedProps && Object.keys(result.detectedProps).length > 0) {
            console.log(`📊 Detected props:`, result.detectedProps);
          }
        } else {
          console.log(`❌ Demo validation failed`);
          result.errors.forEach(error => console.log(`   Error: ${error}`));
        }
        
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach(warning => console.log(`   Warning: ${warning}`));
        }
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Demo processing failed:', error.message);
      }
      process.exit(1);
    }
  });

// Docs command
program
  .command('docs <source>')
  .description('Generate README and documentation from components')
  .option('--format <format>', 'output format (markdown, html)', 'markdown')
  .option('--include-examples', 'generate examples for each variant')
  .option('--output <file>', 'output file path (default: README.md in source dir)')
  .option('--json', 'output machine-readable JSON')
  .addHelpText('after', `
Examples:
  $ dcp docs ./components --format markdown --include-examples
  $ dcp docs ./src/Button.tsx --output ./docs/Button.md
  $ dcp docs ./components --json`)
  .action(async (source, options) => {
    try {
      const { runDocs } = await import('../src/commands/docs.js');
      
      if (!options.json) {
        console.log(`📝 Generating documentation for ${source}...`);
      }
      
      const result = await runDocs(source, options);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`✅ Documentation generated successfully`);
        console.log(`📁 Output: ${result.outputPath}`);
        if (result.componentsDocumented) {
          console.log(`📊 Components documented: ${result.componentsDocumented}`);
        }
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
      } else {
        console.error('❌ Documentation generation failed:', error.message);
      }
      process.exit(1);
    }
  });

// API Server command
program
  .command('api')
  .description('Start DCP REST API server')
  .option('-p, --port <number>', 'server port', '7401')
  .option('-h, --host <string>', 'server host', 'localhost')
  .option('-r, --registry <path>', 'registry directory path', './registry')
  .option('--jwt-secret <secret>', 'JWT secret for authentication (use DCP_JWT_SECRET env var in production)')
  .option('--rate-limit <number>', 'rate limit per 15 minutes', '1000')
  .option('--env <environment>', 'environment (development, production)', 'development')
  .option('--verbose', 'enable verbose logging')
  .addHelpText('after', `
Examples:
  $ dcp api                                    # Start on localhost:7401
  $ dcp api --port 8080 --registry ./dist     # Custom port and registry
  $ dcp api --env production --jwt-secret xyz # Production mode with auth
  
API Endpoints:
  GET  /health                                 # Health check
  GET  /docs                                   # API documentation  
  GET  /api/v1/registry                        # Full registry
  GET  /api/v1/registry/components             # Component list
  POST /api/v1/validate                        # Code validation
  POST /api/v1/query                           # Advanced queries
  POST /api/v1/mutate                          # Apply mutations (auth required)
  
Authentication:
  - Use Bearer token in Authorization header
  - Or provide X-API-Key header
  - Generate tokens with JWT secret`)
  .action(async (options) => {
    try {
      const { runApiServer } = await import('../src/api-server.js');
      
      console.log(`🚀 Starting DCP API Server v2.0...`);
      console.log(`📁 Registry: ${options.registry}`);
      console.log(`🌐 Server: http://${options.host}:${options.port}`);
      console.log(`📖 Docs: http://${options.host}:${options.port}/docs`);
      
      const server = await runApiServer({
        port: parseInt(options.port),
        host: options.host,
        registryPath: options.registry,
        jwtSecret: options.jwtSecret,
        rateLimitMax: parseInt(options.rateLimit),
        environment: options.env,
        verbose: options.verbose
      });
      
      console.log(`\n✅ DCP API Server running!`);
      console.log(`🎯 API: ${server.apiUrl}`);
      console.log(`📚 Docs: ${server.docsUrl}`);
      console.log(`\n💡 Try: curl ${server.endpoints.health}`);
      
    } catch (error) {
      console.error('❌ Failed to start API server:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Companion process for local registry management
program
  .command('companion')
  .description('Start DCP companion process for Figma plugin and VS Code integration')
  .option('-p, --port <number>', 'companion port', '7415')
  .addHelpText('after', `
Examples:
  $ dcp companion                                  # Start on localhost:7415
  $ dcp companion --port 7420                     # Custom port

What it does:
  • Enables folder-picker for Figma plugin (no more manual URLs)
  • Auto-discovery for VS Code extension
  • Manages multiple registry APIs automatically
  • Zero-config design system workflow

Endpoints:
  GET  /health                                     # Health check
  GET  /registries                                 # List active registries
  POST /discover  {"folder": "/path"}              # Analyze folder capabilities
  POST /start     {"folder": "/path", "port": N}  # Start registry API
  POST /stop      {"folder": "/path"}              # Stop registry API

Usage with Figma:
  1. Run: dcp companion
  2. Open DCP Figma plugin
  3. Click "Add Local Registry" → pick folder → done!

Usage with VS Code:
  1. Run: dcp companion  
  2. Open VS Code in any project
  3. Extension auto-discovers available registries`)
  .action((options) => {
    import('../src/commands/companion.js')
      .then(({ default: CompanionServer }) => {
        const server = new CompanionServer(parseInt(options.port));
        return server.start();
      })
      .catch(error => {
        console.error('❌ Failed to start companion server:', error.message);
        process.exit(1);
      });
  });

program
  .command('bridge')
  .description('Start DCP-Figma MCP bridge server (enriches Figma MCP with DCP data)')
  .option('-p, --port <number>', 'bridge server port', '3846')
  .option('--figma-port <number>', 'Figma MCP server port', '3845')
  .option('-r, --registry <path>', 'DCP registry directory path', './registry')
  .option('--verbose', 'verbose logging')
  .addHelpText('after', `
Examples:
  $ dcp bridge                                     # Start on localhost:3846
  $ dcp bridge --port 8080 --registry ./my-registry  # Custom configuration
  $ dcp bridge --figma-port 3850 --verbose        # Different Figma port

What it does:
  • Proxies Figma Dev Mode MCP requests
  • Enriches responses with DCP component metadata  
  • Adds design token synchronization
  • Provides unified design-code context for AI agents

Setup:
  1. Enable Figma Dev Mode MCP Server (Preferences → Enable Dev Mode MCP Server)
  2. Run: dcp bridge --registry ./registry
  3. Update your MCP client to use: http://localhost:3846/mcp
  
MCP Client Configuration (VS Code):
  "mcp": {
    "servers": {
      "DCP-Figma Bridge": {
        "type": "sse", 
        "url": "http://localhost:3846/mcp"
      }
    }
  }`)
  .action(async (options) => {
    try {
      const { runMCPBridge } = await import('../src/mcp-bridge.js');
      await runMCPBridge({
        bridgePort: parseInt(options.port),
        figmaPort: parseInt(options.figmaPort),
        registryPath: options.registry,
        verbose: options.verbose
      });
    } catch (error) {
      console.error('❌ Failed to start MCP bridge:', error.message);
      process.exit(1);
    }
  });

  program.parse();
}