#!/usr/bin/env node

/**
 * DCP Registry Management Commands
 * Consolidated commands for registry operations
 */

import { program } from 'commander';

// Create registry command group
const registryCommand = program
  .command('registry')  
  .description('Registry management operations')
  .addHelpText('after', `
Available Commands:
  generate     Generate ShadCN-compatible registry from components
  item         Generate single registry item from component
  build-packs  Build static component packages for distribution  
  serve        Serve component packs via HTTP for development
  publish      Publish component packs to static hosting
  add          Install component from registry
  validate     Validate registry structure against DCP schema

Examples:
  $ dcp registry generate ./src/components/ui
  $ dcp registry serve dist/packs --port 8080
  $ dcp registry add https://registry.example.com/r/ui/button`);

// Generate subcommand
registryCommand
  .command('generate <source>')
  .description('Generate ShadCN-compatible registry from component directory')  
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
      // Import and delegate to existing registry generate logic
      const { program: mainProgram } = await import('../../bin/dcp.js');
      const generateCommand = mainProgram.commands.find(cmd => 
        cmd.name() === 'registry' && cmd.commands.find(subcmd => subcmd.name() === 'generate')
      );
      
      if (generateCommand) {
        const generateSubcommand = generateCommand.commands.find(subcmd => subcmd.name() === 'generate');
        await generateSubcommand._actionHandler(source, options, command);
      } else {
        // Fallback: direct import and execution
        const { RegistryItemGenerator } = await import('../../src/core/registryItemGenerator.js');
        const { parseTSX } = await import('../../src/core/parser.js');
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
      }
    } catch (error) {
      const chalk = await import('chalk');
      console.error(chalk.default.red('❌ Registry generation failed:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Item subcommand
registryCommand
  .command('item <component>')
  .description('Generate single registry item from component file or DCP JSON')
  .option('--format <format>', 'output format (shadcn, dcp)', 'shadcn')
  .option('-o, --output <file>', 'output file path')
  .option('--verbose', 'verbose logging')
  .addHelpText('after', `
Examples:
  $ dcp registry item ./src/components/Button.tsx
  $ dcp registry item ./registry/Button.dcp.json --output button-registry.json`)
  .action(async (component, options) => {
    try {
      const { RegistryItemGenerator } = await import('../../src/core/registryItemGenerator.js');
      const { parseTSX } = await import('../../src/core/parser.js');
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
  });

// Build-packs subcommand
registryCommand
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
  $ dcp registry build-packs registry.json --out dist/packs
  $ dcp registry build-packs registry.json --base-url https://cdn.example.com
  $ dcp registry build-packs registry.json --namespace acme-ui --version 2.1.0`)
  .action(async (registry, options) => {
    try {
      const { runBuildPacks } = await import('../../src/commands/build-packs.js');
      
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

// Serve subcommand  
registryCommand
  .command('serve [packs-dir]')
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
  $ dcp registry serve dist/packs
  $ dcp registry serve dist/packs --port 8080 --verbose
  $ dcp registry serve dist/packs --secret mytoken --base-url https://cdn.example.com`)
  .action(async (packsDir = './dist/packs', options) => {
    try {
      const { runServeRegistry } = await import('../../src/commands/serve-registry.js');
      
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

// Publish subcommand
registryCommand
  .command('publish <packs-dir>')
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
  $ dcp registry publish dist/packs --bucket my-components --region us-west-2
  $ dcp registry publish dist/packs --provider github-pages
  $ dcp registry publish dist/packs --provider generic --base-url https://cdn.example.com`)
  .action(async (packsDir, options) => {
    try {
      const { runPublishStatic } = await import('../../src/commands/publish-static.js');
      
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

// Add subcommand
registryCommand
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
  $ dcp registry add https://registry.example.com/r/ui/button
  $ dcp registry add https://registry.example.com/r/ui/button@1.0.0
  $ dcp registry add /r/ui/button --token abc123`)
  .action(async (componentUrl, options) => {
    try {
      const { runDcpAdd } = await import('../../src/commands/dcp-add.js');
      
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

// Validate subcommand
registryCommand
  .command('validate <registry>')
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
  $ dcp registry validate registry.json --json
  $ dcp registry validate registry.json --strict
  $ dcp registry validate registry.json --comprehensive`)
  .action(async (registry, options) => {
    try {
      const { validateRegistry } = await import('../../src/commands/validate.js');
      
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

export { registryCommand };