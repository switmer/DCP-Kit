#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { glob } from 'glob';
import { RegistryItemGenerator } from '../core/registryItemGenerator.js';
import { parseTSX } from '../core/parser.js';

/**
 * Registry command - Generate ShadCN-compatible registry items from DCP components
 */

program
  .name('dcp-registry')
  .description('Generate ShadCN-compatible registry from design system components')
  .version('1.0.0');

program
  .command('generate <source>')
  .description('Generate full registry from component directory')
  .option('--format <format>', 'output format (shadcn, dcp)', 'shadcn')
  .option('--name <name>', 'registry name', 'custom-ui')
  .option('--homepage <url>', 'registry homepage URL')
  .option('--output <dir>', 'output directory', './registry')
  .option('--verbose', 'verbose logging')
  .action(async (source, options) => {
    try {
      console.log(chalk.blue(`🏗️  Generating ${options.format} registry from: ${source}`));
      
      const generator = new RegistryItemGenerator();
      const registry = await generateFullRegistry(source, options, generator);
      
      // Ensure output directory exists
      await fs.mkdir(options.output, { recursive: true });
      
      // Write registry.json
      const registryPath = path.join(options.output, 'registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      console.log(chalk.green(`✅ Registry generated: ${registryPath}`));
      console.log(chalk.gray(`   Components: ${registry.items?.length || 0}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Registry generation failed:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('item <component>')
  .description('Generate single registry item from component file or DCP JSON')
  .option('--format <format>', 'output format (shadcn, dcp)', 'shadcn')
  .option('--output <file>', 'output file path')
  .option('--verbose', 'verbose logging')
  .action(async (component, options) => {
    try {
      console.log(chalk.blue(`🔧 Generating registry item for: ${component}`));
      
      const generator = new RegistryItemGenerator();
      const registryItem = await generateSingleItem(component, options, generator);
      
      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(registryItem, null, 2));
        console.log(chalk.green(`✅ Registry item written: ${options.output}`));
      } else {
        console.log(JSON.stringify(registryItem, null, 2));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Registry item generation failed:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('validate <registry>')
  .description('Validate registry against ShadCN schema')
  .option('--schema <url>', 'schema URL to validate against', 'https://ui.shadcn.com/schema/registry-item.json')
  .action(async (registry, options) => {
    try {
      console.log(chalk.blue(`🔍 Validating registry: ${registry}`));
      
      // TODO: Implement schema validation
      console.log(chalk.yellow('⚠️  Schema validation not yet implemented'));
      
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Generate full registry from component directory
 */
async function generateFullRegistry(source, options, generator) {
  const registry = {
    "$schema": "https://ui.shadcn.com/schema/registry.json",
    "name": options.name,
    "homepage": options.homepage || "",
    "items": []
  };

  // Find all component files
  const componentFiles = await glob('**/*.{tsx,jsx}', { 
    cwd: source, 
    absolute: true 
  });

  if (options.verbose) {
    console.log(chalk.gray(`Found ${componentFiles.length} component files`));
  }

  // Process each component file
  for (const filePath of componentFiles) {
    try {
      // Skip test files, stories, etc.
      if (shouldSkipFile(filePath)) {
        if (options.verbose) {
          console.log(chalk.gray(`Skipping: ${path.basename(filePath)}`));
        }
        continue;
      }

      const registryItem = await processComponentFile(filePath, options, generator);
      
      if (registryItem) {
        registry.items.push(registryItem);
        
        if (options.verbose) {
          console.log(chalk.green(`✓ Processed: ${registryItem.name}`));
        }
      }
      
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to process ${path.basename(filePath)}: ${error.message}`));
      
      if (options.verbose) {
        console.error(error.stack);
      }
    }
  }

  return registry;
}

/**
 * Generate single registry item
 */
async function generateSingleItem(component, options, generator) {
  // Check if input is a file path or DCP JSON
  if (component.endsWith('.json')) {
    // Load DCP JSON and transform
    const dcpData = JSON.parse(await fs.readFile(component, 'utf-8'));
    return await generator.transformDCPToShadCN(dcpData);
  } else {
    // Process component file
    return await processComponentFile(component, options, generator);
  }
}

/**
 * Process a single component file
 */
async function processComponentFile(filePath, options, generator) {
  // Read source code
  const sourceCode = await fs.readFile(filePath, 'utf-8');
  
  // Parse component with DCP parser
  const dcpComponents = await parseTSX(filePath, { verbose: options.verbose });
  
  if (!dcpComponents || dcpComponents.length === 0) {
    if (options.verbose) {
      console.log(chalk.gray(`No components found in: ${path.basename(filePath)}`));
    }
    return null;
  }

  // Use the first/main component
  const dcpComponent = dcpComponents[0];
  
  // Transform to ShadCN format
  return await generator.transformDCPToShadCN(dcpComponent, sourceCode, filePath);
}

/**
 * Check if file should be skipped
 */
function shouldSkipFile(filePath) {
  const fileName = path.basename(filePath).toLowerCase();
  
  // Skip test files
  if (fileName.includes('.test.') || fileName.includes('.spec.')) {
    return true;
  }
  
  // Skip story files
  if (fileName.includes('.stories.')) {
    return true;
  }
  
  // Skip index files (usually re-exports)
  if (fileName === 'index.tsx' || fileName === 'index.jsx') {
    return true;
  }
  
  // Skip files in test directories
  if (filePath.includes('/__tests__/') || filePath.includes('/test/')) {
    return true;
  }
  
  return false;
}

program.parse();