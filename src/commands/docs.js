import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

/**
 * Generate README and documentation from components
 * @param {string} source - Source directory or file path
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Documentation generation results
 */
export async function runDocs(source, options = {}) {
  const startTime = Date.now();
  const results = {
    success: false,
    outputPath: '',
    componentsDocumented: 0,
    errors: [],
    warnings: []
  };

  try {
    // Determine if source is file or directory
    const stats = await fs.stat(source);
    let componentFiles = [];
    
    if (stats.isDirectory()) {
      // Find all component files in directory
      const pattern = path.join(source, '**/*.{tsx,jsx,ts,js}');
      const files = await glob(pattern);
      componentFiles = files.filter(file => 
        !file.includes('.test.') && 
        !file.includes('.spec.') &&
        !file.includes('.demo.') &&
        !file.includes('.stories.')
      );
    } else {
      componentFiles = [source];
    }
    
    if (componentFiles.length === 0) {
      throw new Error('No component files found');
    }
    
    // Determine output path
    const outputPath = options.output || 
      (stats.isDirectory() ? path.join(source, 'README.md') : 
       path.join(path.dirname(source), `${path.basename(source, path.extname(source))}.md`));
    
    // Generate documentation content
    const docContent = await generateDocumentation(componentFiles, options);
    
    // Write documentation file
    await fs.writeFile(outputPath, docContent, 'utf-8');
    
    results.success = true;
    results.outputPath = outputPath;
    results.componentsDocumented = componentFiles.length;
    results.duration = Date.now() - startTime;
    
    return results;
    
  } catch (error) {
    results.errors.push(error.message);
    results.duration = Date.now() - startTime;
    return results;
  }
}

/**
 * Generate markdown documentation content
 */
async function generateDocumentation(componentFiles, options) {
  const components = [];
  
  // Analyze each component file
  for (const filePath of componentFiles) {
    try {
      const componentInfo = await analyzeComponent(filePath);
      if (componentInfo) {
        components.push(componentInfo);
      }
    } catch (error) {
      console.warn(`Failed to analyze ${filePath}:`, error.message);
    }
  }
  
  // Generate markdown content
  let content = '';
  
  if (components.length > 1) {
    // Multi-component documentation
    content += `# Component Library Documentation\n\n`;
    content += `Generated on ${new Date().toISOString().split('T')[0]}\n\n`;
    content += `## Components\n\n`;
    
    components.forEach(component => {
      content += `- [${component.name}](#${component.name.toLowerCase()})\n`;
    });
    content += '\n---\n\n';
  }
  
  // Document each component
  components.forEach(component => {
    content += generateComponentDoc(component, options);
    content += '\n---\n\n';
  });
  
  // Remove trailing separator
  content = content.replace(/\n---\n\n$/, '');
  
  return content;
}

/**
 * Analyze a single component file
 */
async function analyzeComponent(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, path.extname(filePath));
    
    const component = {
      name: fileName,
      filePath,
      description: extractDescription(content),
      props: extractProps(content),
      examples: extractExamples(content),
      variants: extractVariants(content)
    };
    
    return component;
    
  } catch (error) {
    throw new Error(`Failed to analyze ${filePath}: ${error.message}`);
  }
}

/**
 * Extract component description from JSDoc comments
 */
function extractDescription(content) {
  try {
    // Look for JSDoc comment before export
    const jsdocRegex = /\/\*\*\s*\n([\s\S]*?)\*\/\s*export/;
    const match = content.match(jsdocRegex);
    
    if (match) {
      return match[1]
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, '').trim())
        .filter(line => line && !line.startsWith('@'))
        .join(' ')
        .trim();
    }
    
    // Fallback: look for single-line comment
    const singleLineRegex = /\/\/\s*(.+)\s*\nexport.*=.*=>/;
    const singleMatch = content.match(singleLineRegex);
    
    if (singleMatch) {
      return singleMatch[1].trim();
    }
    
    return `A ${extractComponentName(content)} component`;
    
  } catch (error) {
    return '';
  }
}

/**
 * Extract component name from export
 */
function extractComponentName(content) {
  try {
    const exportRegex = /export.*?(?:const|function)\s+(\w+)/;
    const match = content.match(exportRegex);
    return match ? match[1] : 'Component';
  } catch (error) {
    return 'Component';
  }
}

/**
 * Extract props from interface/type definitions
 */
function extractProps(content) {
  const props = {};
  
  try {
    // Extract interface definitions
    const interfaceRegex = /interface\s+(\w*Props)\s*\{([^}]+)\}/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceBody = match[2];
      const propProps = parsePropsFromInterface(interfaceBody);
      Object.assign(props, propProps);
    }
    
    // Extract type definitions
    const typeRegex = /type\s+(\w*Props)\s*=\s*\{([^}]+)\}/g;
    while ((match = typeRegex.exec(content)) !== null) {
      const typeBody = match[2];
      const typeProps = parsePropsFromInterface(typeBody);
      Object.assign(props, typeProps);
    }
    
  } catch (error) {
    console.warn('Failed to extract props:', error.message);
  }
  
  return props;
}

/**
 * Parse props from interface/type body
 */
function parsePropsFromInterface(interfaceBody) {
  const props = {};
  
  try {
    const lines = interfaceBody.split('\n').map(line => line.trim());
    
    for (const line of lines) {
      if (!line || line.startsWith('//') || line.startsWith('*')) continue;
      
      // Parse prop definition
      const propMatch = line.match(/(\w+)(\?)?:\s*(.+?)(?:;|$)/);
      if (propMatch) {
        const [, name, optional, type] = propMatch;
        
        // Extract description from JSDoc comment (look for /** comment */ above)
        const description = extractPropDescription(line, interfaceBody);
        
        props[name] = {
          type: type.trim(),
          required: !optional,
          description: description || `${name} prop`,
          default: extractDefaultValue(name, type)
        };
        
        // Extract enum values if present
        if (type.includes('|')) {
          const values = type.split('|')
            .map(v => v.trim().replace(/['"]/g, ''))
            .filter(v => v && v !== 'string' && v !== 'number' && v !== 'boolean');
          
          if (values.length > 0) {
            props[name].values = values;
          }
        }
      }
    }
    
  } catch (error) {
    console.warn('Failed to parse interface body:', error.message);
  }
  
  return props;
}

/**
 * Extract prop description from JSDoc
 */
function extractPropDescription(line, interfaceBody) {
  try {
    // Look for /** comment */ pattern above prop
    const lines = interfaceBody.split('\n');
    const lineIndex = lines.findIndex(l => l.includes(line));
    
    if (lineIndex > 0) {
      const prevLine = lines[lineIndex - 1].trim();
      const commentMatch = prevLine.match(/\/\*\*\s*(.+?)\s*\*\//);
      
      if (commentMatch) {
        return commentMatch[1].trim();
      }
    }
    
    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Extract default value based on component implementation
 */
function extractDefaultValue(propName, propType) {
  // Common defaults based on type
  if (propType.includes('boolean')) return 'false';
  if (propType.includes('number')) return '0';
  if (propType.includes("'primary'") || propType.includes('"primary"')) return 'primary';
  if (propType.includes("'md'") || propType.includes('"md"')) return 'md';
  
  return undefined;
}

/**
 * Extract examples from JSDoc @example tags
 */
function extractExamples(content) {
  const examples = [];
  
  try {
    const exampleRegex = /@example\s*\n\s*(.+?)(?=\n\s*\*(?:\s|\/)|$)/gs;
    let match;
    
    while ((match = exampleRegex.exec(content)) !== null) {
      const example = match[1]
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, '').trim())
        .filter(line => line)
        .join('\n')
        .trim();
      
      if (example) {
        examples.push(example);
      }
    }
    
  } catch (error) {
    console.warn('Failed to extract examples:', error.message);
  }
  
  return examples;
}

/**
 * Extract variants from prop types
 */
function extractVariants(content) {
  const variants = {};
  
  try {
    // Look for variant prop types
    const variantRegex = /variant[?:]?\s*['"]([^'"]+)['"](?:\s*\|\s*['"]([^'"]+)['"])*|variant[?:]?\s*:\s*([^;,}]+)/g;
    let match;
    
    while ((match = variantRegex.exec(content)) !== null) {
      if (match[0].includes('|')) {
        // Multiple variants
        const variantString = match[0];
        const values = variantString.match(/['"]([^'"]+)['"]/g);
        
        if (values) {
          variants.variant = values.map(v => v.replace(/['"]/g, ''));
        }
      }
    }
    
    // Also look for size variants
    const sizeRegex = /size[?:]?\s*['"]([^'"]+)['"](?:\s*\|\s*['"]([^'"]+)['"])*|size[?:]?\s*:\s*([^;,}]+)/g;
    while ((match = sizeRegex.exec(content)) !== null) {
      if (match[0].includes('|')) {
        const sizeString = match[0];
        const values = sizeString.match(/['"]([^'"]+)['"]/g);
        
        if (values) {
          variants.size = values.map(v => v.replace(/['"]/g, ''));
        }
      }
    }
    
  } catch (error) {
    console.warn('Failed to extract variants:', error.message);
  }
  
  return variants;
}

/**
 * Generate documentation for a single component
 */
function generateComponentDoc(component, options) {
  let doc = `# ${component.name}\n\n`;
  
  // Description
  if (component.description) {
    doc += `${component.description}\n\n`;
  }
  
  // Props table
  if (Object.keys(component.props).length > 0) {
    doc += `## Props\n\n`;
    doc += `| Prop | Type | Required | Default | Description |\n`;
    doc += `|------|------|----------|---------|-------------|\n`;
    
    Object.entries(component.props).forEach(([name, prop]) => {
      const type = prop.values ? prop.values.join(' \\| ') : prop.type;
      const required = prop.required ? '✅' : '❌';
      const defaultValue = prop.default || '-';
      const description = prop.description || '-';
      
      doc += `| \`${name}\` | \`${type}\` | ${required} | \`${defaultValue}\` | ${description} |\n`;
    });
    
    doc += '\n';
  }
  
  // Variants
  if (Object.keys(component.variants).length > 0) {
    doc += `## Variants\n\n`;
    
    Object.entries(component.variants).forEach(([variantType, values]) => {
      doc += `### ${variantType}\n\n`;
      values.forEach(value => {
        doc += `- \`${value}\`\n`;
      });
      doc += '\n';
    });
  }
  
  // Examples
  if (component.examples && component.examples.length > 0) {
    doc += `## Examples\n\n`;
    
    component.examples.forEach((example, index) => {
      doc += `### Example ${index + 1}\n\n`;
      doc += '```tsx\n';
      doc += example;
      doc += '\n```\n\n';
    });
  }
  
  // Generate examples for variants if requested
  if (options.includeExamples && Object.keys(component.variants).length > 0) {
    doc += `## Generated Examples\n\n`;
    
    Object.entries(component.variants).forEach(([variantType, values]) => {
      doc += `### ${variantType} Variants\n\n`;
      
      values.forEach(value => {
        doc += '```tsx\n';
        doc += `<${component.name} ${variantType}="${value}">\n`;
        doc += '  Content\n';
        doc += `</${component.name}>\n`;
        doc += '```\n\n';
      });
    });
  }
  
  // File path
  doc += `## Source\n\n`;
  doc += `\`${component.filePath}\`\n\n`;
  
  return doc;
}