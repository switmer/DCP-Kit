/**
 * Registry Item Command Handler
 * Generate single registry item from component file or DCP JSON
 */

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

export default async function item(component, options = {}) {
  try {
    // Delegate to the existing registry item logic from registry.js
    const { RegistryItemGenerator } = await import('../../core/registryItemGenerator.js');
    const { parseTSX } = await import('../../core/parser.js');
    
    console.log(chalk.blue(`🔧 Generating registry item for: ${component}`));
    
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

      registryItem = await generator.transformDCPToShadCN(dcpResult, sourceCode, component);
    }
    
    if (options.output) {
      await fs.writeFile(options.output, JSON.stringify(registryItem, null, 2));
      console.log(chalk.green(`✅ Registry item written: ${options.output}`));
    } else {
      console.log(JSON.stringify(registryItem, null, 2));
    }
    
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
    } else {
      console.error(chalk.red('❌ Registry item generation failed:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

