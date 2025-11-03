/**
 * Code Connect Transform Command Implementation
 * Transform DCP registry to Figma Code Connect files
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export default async function codeConnect(registryPath, options) {
  try {
    if (!options.json) {
      console.log(chalk.blue(`🔗 Transforming DCP registry to Code Connect format...`));
      console.log(chalk.gray(`   Registry: ${registryPath}`));
      console.log(chalk.gray(`   Output: ${options.output}`));
    }

    // Load DCP registry
    const registryData = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
    
    // Load Figma mapping configuration
    let figmaMapping = {};
    if (options.figmaMap) {
      try {
        figmaMapping = JSON.parse(await fs.readFile(options.figmaMap, 'utf-8'));
        
        // Validate Figma URLs
        if (options.validate !== false) {
          validateFigmaMapping(figmaMapping);
        }
      } catch (error) {
        if (options.verbose) {
          console.warn(chalk.yellow(`⚠️  Could not load Figma mapping: ${error.message}`));
          console.log(chalk.gray(`   Continuing without mapping file...`));
        }
      }
    }

    // Ensure output directory exists
    await fs.mkdir(options.output, { recursive: true });

    const results = {
      processed: 0,
      generated: 0,
      skipped: 0,
      errors: []
    };

    // Process each component in the registry
    const components = registryData.components || [];
    
    for (const component of components) {
      try {
        results.processed++;

        // Check if component has Figma mapping
        const figmaUrl = figmaMapping[component.name];
        if (!figmaUrl && !options.skipUnmapped) {
          if (options.verbose) {
            console.log(chalk.yellow(`⏭️  Skipping ${component.name}: No Figma URL mapping`));
          }
          results.skipped++;
          continue;
        }

        // Generate Code Connect content
        const codeConnectContent = generateCodeConnectFile(component, figmaUrl, options);
        
        // Write to output file
        const outputFileName = `${component.name}.figma.${options.framework === 'react' ? 'tsx' : 'js'}`;
        const outputPath = path.join(options.output, outputFileName);
        
        await fs.writeFile(outputPath, codeConnectContent);
        results.generated++;

        if (options.verbose) {
          console.log(chalk.green(`✓ Generated: ${outputFileName}`));
        }

      } catch (error) {
        results.errors.push({
          component: component.name,
          error: error.message
        });
        
        if (options.verbose) {
          console.error(chalk.red(`❌ Failed to process ${component.name}: ${error.message}`));
        }
      }
    }

    // Output results
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        registry: registryPath,
        outputDir: options.output,
        figmaMapping: options.figmaMap,
        results
      }, null, 2));
    } else {
      console.log(chalk.green(`\n✅ Code Connect transformation completed!`));
      console.log(chalk.gray(`   Processed: ${results.processed} components`));
      console.log(chalk.gray(`   Generated: ${results.generated} files`));
      console.log(chalk.gray(`   Skipped: ${results.skipped} components`));
      
      if (results.errors.length > 0) {
        console.log(chalk.red(`   Errors: ${results.errors.length}`));
        if (options.verbose) {
          results.errors.forEach(error => {
            console.log(chalk.red(`     • ${error.component}: ${error.error}`));
          });
        }
      }

      console.log(`\n📁 Code Connect files: ${options.output}`);
      
      if (results.generated > 0) {
        console.log(`\n${chalk.cyan('Next steps:')}`);
        console.log(`   1. Review generated .figma.${options.framework === 'react' ? 'tsx' : 'js'} files`);
        console.log(`   2. Update Figma URLs in mapping file if needed`);
        console.log(`   3. Run: ${chalk.cyan('npx figma connect publish')}`);
      }
      
      if (results.skipped > 0 && !options.skipUnmapped) {
        console.log(`\n${chalk.yellow('💡 Tip:')} Create a figma-mapping.json file to map components to Figma URLs:`);
        console.log(`   ${chalk.gray(JSON.stringify({ "Button": "https://figma.com/design/xyz?node-id=123:456" }, null, 2))}`);
      }
    }

  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
    } else {
      console.error(chalk.red('❌ Code Connect transformation failed:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

/**
 * Generate Code Connect file content for a DCP component
 */
function generateCodeConnectFile(component, figmaUrl, options) {
  const { framework = 'react' } = options;
  
  const imports = framework === 'react' 
    ? `import figma from '@figma/code-connect/react';\nimport { ${component.name} } from '${getComponentImportPath(component, options)}';\n`
    : `import figma, { html } from '@figma/code-connect/html';\n`;

  const propsMapping = generatePropsMapping(component.props || {});
  const exampleCode = generateExampleCode(component, framework, options);

  const figmaUrlParam = figmaUrl ? `'${figmaUrl}'` : '\'FIGMA_URL_PLACEHOLDER\'';
  const connectCall = framework === 'react' 
    ? `figma.connect(${component.name}, ${figmaUrlParam}, {`
    : `figma.connect(${figmaUrlParam}, {`;

  return `${imports}
${connectCall}${propsMapping ? `
  props: {${propsMapping}
  },` : ''}
  example: ${exampleCode}
});
`;
}

/**
 * Generate props mapping object for Code Connect
 */
function generatePropsMapping(props) {
  const mappings = [];
  
  for (const [propName, propDef] of Object.entries(props)) {
    const mapping = generatePropMapping(propName, propDef);
    if (mapping) {
      mappings.push(`    ${propName}: ${mapping}`);
    }
  }
  
  return mappings.length > 0 ? `\n${mappings.join(',\n')}\n  ` : '';
}

/**
 * Generate individual prop mapping based on DCP prop definition
 */
function generatePropMapping(propName, propDef) {
  const { type, required, description } = propDef;
  
  // Map DCP types to Code Connect helpers
  switch (type) {
    case 'string':
      return `figma.string('${propName}')`;
      
    case 'boolean':
      return `figma.boolean('${propName}')`;
      
    case 'number':
      return `figma.string('${propName}')`; // Figma treats numbers as strings
      
    case 'enum':
    case 'union':
      // For enum types, we'd need more info about possible values
      // For now, treat as string and let user customize
      return `figma.string('${propName}') // TODO: Convert to figma.enum with variant mapping`;
      
    default:
      // For complex types, default to string
      return `figma.string('${propName}') // TODO: Review prop type mapping`;
  }
}

/**
 * Generate example code for the component
 */
function generateExampleCode(component, framework, options) {
  const propNames = Object.keys(component.props || {});
  
  if (framework === 'react') {
    const propsUsage = propNames.length > 0 
      ? `{ ${propNames.join(', ')} }` 
      : '';
    
    const hasChildren = propNames.includes('children') || component.composition?.slots?.length > 0;
    
    if (hasChildren) {
      return `(${propsUsage}) => (
    <${component.name}${propsUsage ? ` ${propNames.filter(p => p !== 'children').map(p => `${p}={${p}}`).join(' ')}` : ''}>
      {children || '${component.name}'}
    </${component.name}>
  )`;
    } else {
      return `(${propsUsage}) => <${component.name}${propsUsage ? ` ${propNames.map(p => `${p}={${p}}`).join(' ')}` : ''} />`;
    }
  } else {
    // HTML/Web Components format
    const propsUsage = propNames.length > 0 
      ? `{ ${propNames.join(', ')} }` 
      : '';
    
    return `(${propsUsage}) => html\`<${component.name.toLowerCase()}${propNames.map(p => ` ${p}="\${${p}}"`).join('')}></${component.name.toLowerCase()}>\``;
  }
}

/**
 * Generate component import path from DCP component metadata
 */
function getComponentImportPath(component, options) {
  // Try to derive import path from component extensions
  if (component.extensions?.filePath) {
    const filePath = component.extensions.filePath;
    const relativePath = filePath.replace(/\.(tsx|jsx|js|ts)$/, '');
    return `./${path.basename(relativePath)}`;
  }
  
  // Fallback to component name
  return `./${component.name}`;
}

/**
 * Validate Figma mapping URLs
 */
function validateFigmaMapping(mapping) {
  const figmaUrlPattern = /^https:\/\/(?:www\.)?figma\.com\/design\/[a-zA-Z0-9]+.*(?:node-id=[0-9]+:[0-9]+|node-id=[0-9]+%3A[0-9]+).*$/;
  
  for (const [componentName, url] of Object.entries(mapping)) {
    if (typeof url !== 'string') {
      throw new Error(`Invalid Figma URL for component "${componentName}": must be a string`);
    }
    
    if (!figmaUrlPattern.test(url)) {
      throw new Error(`Invalid Figma URL for component "${componentName}": ${url}\nExpected format: https://figma.com/design/PROJECT_ID?node-id=NODE_ID`);
    }
    
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(componentName)) {
      console.warn(chalk.yellow(`⚠️  Component name "${componentName}" should follow PascalCase convention`));
    }
  }
}