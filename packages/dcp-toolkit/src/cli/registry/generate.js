/**
 * Registry Generate Command Implementation
 * Generate ShadCN-compatible registry from component directory
 */

export default async function generate(source, options) {
  try {
    const { RegistryItemGenerator } = await import('../../../src/core/registryItemGenerator.js');
    const { parseTSX } = await import('../../../src/core/parser.js');
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
    const chalk = await import('chalk');
    console.error(chalk.default.red('❌ Registry generation failed:'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}