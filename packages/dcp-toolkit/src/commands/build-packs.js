import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';

/**
 * DCP Component Pack Builder
 * 
 * Generates static component packages from DCP registry for distribution.
 * Each component gets its own folder with source, demo, docs, and metadata.
 * 
 * Features:
 * - Auto-generated demo components from prop schemas
 * - README with props/variants tables
 * - Content-addressed blob storage (sha1 hashes)
 * - ShadCN-compatible meta.json format
 * - Peer dependency inference
 */

export async function runBuildPacks(registryPath, options = {}) {
  const {
    out: outputDir = './dist/packs',
    baseUrl = '',
    namespace = 'ui',
    version = '1.0.0',
    verbose = false
  } = options;

  if (verbose) {
    console.log(chalk.blue(`📦 Building component packs from ${registryPath}`));
  }

  // Load registry
  const registry = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
  
  // Ensure output directories exist
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'blobs'), { recursive: true });

  const packBuilder = new ComponentPackBuilder({
    outputDir,
    baseUrl,
    namespace,
    version,
    verbose
  });

  const results = {
    packs: [],
    blobs: [],
    errors: []
  };

  // Build pack for each component
  for (const component of registry.components) {
    try {
      const pack = await packBuilder.buildComponentPack(component, registry);
      results.packs.push(pack);
      
      if (verbose) {
        console.log(`  ✅ ${component.name} → ${pack.outputPath}`);
      }
    } catch (error) {
      results.errors.push({
        component: component.name,
        error: error.message
      });
      
      if (verbose) {
        console.warn(`  ⚠️  Failed to build ${component.name}: ${error.message}`);
      }
    }
  }

  // Generate index manifest
  const indexManifest = {
    namespace,
    version,
    generatedAt: new Date().toISOString(),
    components: results.packs.map(pack => ({
      name: pack.name,
      version: pack.version,
      title: pack.title,
      description: pack.description,
      url: `${baseUrl}/r/${namespace}/${pack.name}`,
      tags: pack.tags || []
    }))
  };

  await fs.writeFile(
    path.join(outputDir, 'index.json'),
    JSON.stringify(indexManifest, null, 2)
  );

  // Copy Browse UI static files
  try {
    // Use __dirname equivalent for ESM
    const currentFileUrl = new URL(import.meta.url);
    const currentDir = path.dirname(currentFileUrl.pathname);
    const staticSrcDir = path.resolve(currentDir, '../../static');
    const staticDestDir = outputDir;
    
    if (verbose) {
      console.log(`  📁 Static source: ${staticSrcDir}`);
    }
    
    const staticFiles = ['browse.html', 'browse.js', 'browse.css'];
    let copiedCount = 0;
    
    for (const file of staticFiles) {
      const srcPath = path.join(staticSrcDir, file);
      const destPath = path.join(staticDestDir, file);
      
      try {
        await fs.copyFile(srcPath, destPath);
        copiedCount++;
        if (verbose) {
          console.log(`  📄 Copied ${file}`);
        }
      } catch (error) {
        if (verbose) {
          console.warn(`  ⚠️  Could not copy ${file}: ${error.message}`);
        }
      }
    }
    
    if (verbose && copiedCount > 0) {
      console.log(`  ✅ Copied ${copiedCount}/${staticFiles.length} Browse UI files`);
    }
  } catch (error) {
    if (verbose) {
      console.warn(`  ⚠️  Could not copy static files: ${error.message}`);
    }
  }

  if (verbose) {
    console.log(`\n📊 Build Summary:`);
    console.log(`   Components: ${results.packs.length}`);
    console.log(`   Errors: ${results.errors.length}`);
    console.log(`   Output: ${outputDir}`);
  }

  return {
    success: true,
    outputDir,
    packs: results.packs.length,
    errors: results.errors.length,
    indexUrl: `${outputDir}/index.json`
  };
}

class ComponentPackBuilder {
  constructor(options) {
    this.outputDir = options.outputDir;
    this.baseUrl = options.baseUrl;
    this.namespace = options.namespace;
    this.version = options.version;
    this.verbose = options.verbose;
    this.blobCache = new Map(); // sha1 -> path mapping
  }

  async buildComponentPack(component, registry) {
    const componentDir = path.join(this.outputDir, component.name);
    await fs.mkdir(componentDir, { recursive: true });

    // Generate component files
    const sourceCode = await this.generateComponentSource(component);
    const demoCode = await this.generateDemoComponent(component);
    const readme = await this.generateReadme(component);
    const styles = await this.generateStyles(component, registry);

    // Store blobs and get URLs (as array for DCP spec compliance)
    const files = [];
    
    const indexBlob = await this.storeBlob(sourceCode, 'tsx');
    files.push({
      path: `registry/${component.name.toLowerCase()}/index.tsx`,
      type: 'registry:component',
      sha1: indexBlob.sha1,
      size: indexBlob.size,
    });
    
    const demoBlob = await this.storeBlob(demoCode, 'tsx');
    files.push({
      path: `registry/${component.name.toLowerCase()}/demo.tsx`,
      type: 'registry:example',
      sha1: demoBlob.sha1,
      size: demoBlob.size,
    });
    
    const readmeBlob = await this.storeBlob(readme, 'md');
    files.push({
      path: `registry/${component.name.toLowerCase()}/README.md`,
      type: 'registry:doc',
      sha1: readmeBlob.sha1,
      size: readmeBlob.size,
    });
    
    if (styles) {
      const stylesBlob = await this.storeBlob(styles, 'css');
      files.push({
        path: `registry/${component.name.toLowerCase()}/styles.css`,
        type: 'registry:style',
        sha1: stylesBlob.sha1,
        size: stylesBlob.size,
      });
    }

    // Generate metadata
    const meta = {
      name: component.name.toLowerCase(),
      version: this.version,
      title: component.displayName || component.name,
      description: component.description || `${component.name} component`,
      category: component.category || 'components',
      type: 'registry:component',
      namespace: this.namespace,
      
      // File references (array format per DCP spec)
      files,
      
      // Component schema
      props: component.props || [],
      variants: component.variants || {},
      defaultVariants: component.defaultVariants || {},
      
      // Dependencies
      peerDependencies: this.inferPeerDependencies(component, registry),
      dependencies: this.inferDependencies(component),
      
      // Metadata
      composition: component.composition || {},
      tokensUsed: component.tokensUsed || [],
      
      // Install metadata
      installCommand: this.generateInstallCommand(component),
      registryUrl: `${this.baseUrl}/r/${this.namespace}/${component.name.toLowerCase()}`,
      
      // Generation info
      generatedAt: new Date().toISOString(),
      sourceFile: component.filePath
    };

    // Write component files to directory
    await fs.writeFile(path.join(componentDir, 'index.tsx'), sourceCode);
    await fs.writeFile(path.join(componentDir, 'demo.tsx'), demoCode);
    await fs.writeFile(path.join(componentDir, 'README.md'), readme);
    await fs.writeFile(path.join(componentDir, 'meta.json'), JSON.stringify(meta, null, 2));
    
    if (styles) {
      await fs.writeFile(path.join(componentDir, 'styles.css'), styles);
    }

    return {
      name: component.name.toLowerCase(),
      version: this.version,
      title: meta.title,
      description: meta.description,
      outputPath: componentDir,
      files: files.length,
      meta
    };
  }

  async generateComponentSource(component) {
    // If we have actual source, use it; otherwise generate from schema
    if (component.source) {
      return component.source;
    }

    // Generate basic component template from props/variants
    const props = component.props || [];
    const variants = component.variants || {};
    const hasVariants = Object.keys(variants).length > 0;

    let imports = ['import * as React from "react"'];
    
    if (hasVariants) {
      imports.push('import { cva, type VariantProps } from "class-variance-authority"');
      imports.push('import { cn } from "@/lib/utils"');
    }

    // Add Radix imports if component uses them
    const radixImports = this.extractRadixImports(component);
    imports.push(...radixImports);

    let source = imports.join('\n') + '\n\n';

    // Generate CVA variants if present
    if (hasVariants) {
      source += this.generateCVAVariants(component, variants);
      source += '\n\n';
    }

    // Generate props interface
    source += this.generatePropsInterface(component, props, hasVariants);
    source += '\n\n';

    // Generate component implementation
    source += this.generateComponentImplementation(component, props, hasVariants);

    // Generate exports
    source += `\n\nexport { ${component.name}${hasVariants ? `, ${component.name.toLowerCase()}Variants` : ''} }`;

    return source;
  }

  generateCVAVariants(component, variants) {
    const variantName = `${component.name.toLowerCase()}Variants`;
    
    // Base classes - infer from tokensUsed or use defaults
    const baseClasses = this.inferBaseClasses(component);
    
    // Build variants object
    const variantsObj = Object.entries(variants).map(([key, values]) => {
      const valueMap = values.map(value => {
        const classes = this.inferVariantClasses(component, key, value);
        return `        ${value}: "${classes}"`;
      }).join(',\n');
      
      return `      ${key}: {\n${valueMap}\n      }`;
    }).join(',\n');

    // Default variants
    const defaultVariants = component.defaultVariants || {};
    const defaultsStr = Object.entries(defaultVariants).map(([key, value]) => 
      `      ${key}: "${value}"`
    ).join(',\n');

    return `const ${variantName} = cva(
  "${baseClasses}",
  {
    variants: {
${variantsObj}
    },${defaultsStr ? `\n    defaultVariants: {\n${defaultsStr}\n    },` : ''}
  }
)`;
  }

  generatePropsInterface(component, props, hasVariants) {
    const propsLines = props.map(prop => {
      const optional = !prop.required ? '?' : '';
      const type = this.mapPropType(prop.type);
      const comment = prop.description ? ` // ${prop.description}` : '';
      return `  ${prop.name}${optional}: ${type}${comment}`;
    });

    // Add standard props
    const baseInterface = `React.HTMLAttributes<HTMLDivElement>`;
    let extendsClause = `extends ${baseInterface}`;
    
    if (hasVariants) {
      const variantName = `${component.name.toLowerCase()}Variants`;
      extendsClause += `,\n    VariantProps<typeof ${variantName}>`;
    }

    return `export interface ${component.name}Props
  ${extendsClause} {
${propsLines.join('\n')}
}`;
  }

  generateComponentImplementation(component, props, hasVariants) {
    const componentName = component.name;
    const propsInterface = `${componentName}Props`;
    
    // Determine if component should be forwardRef
    const useForwardRef = component.metadata?.componentType === 'forwardRef' || 
                         component.metadata?.asChildSupport;

    let implementation;
    
    if (useForwardRef) {
      const variantProps = hasVariants ? 
        Object.keys(component.variants || {}).join(', ') : '';
      
      const className = hasVariants ? 
        `cn(${component.name.toLowerCase()}Variants({ ${variantProps} }), className)` :
        'className';

      implementation = `const ${componentName} = React.forwardRef<HTMLDivElement, ${propsInterface}>(
  ({ ${hasVariants ? `${variantProps}, ` : ''}className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={${className}}
        {...props}
      >
        {children}
      </div>
    )
  }
)
${componentName}.displayName = "${componentName}"`;
    } else {
      implementation = `const ${componentName}: React.FC<${propsInterface}> = ({
  ${hasVariants ? Object.keys(component.variants || {}).join(', ') + ', ' : ''}className,
  children,
  ...props
}) => {
  return (
    <div
      className={${hasVariants ? `cn(${component.name.toLowerCase()}Variants({ ${Object.keys(component.variants || {}).join(', ')} }), className)` : 'className'}}
      {...props}
    >
      {children}
    </div>
  )
}`;
    }

    return implementation;
  }

  async generateDemoComponent(component) {
    const componentName = component.name;
    const props = component.props || [];
    const variants = component.variants || {};

    // Generate demo props based on component schema
    const demoProps = this.generateDemoProps(component);
    const variantExamples = this.generateVariantExamples(component, variants);

    return `import { ${componentName} } from "./index"

export default function ${componentName}Demo() {
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">${componentName} Demo</h2>
      
      {/* Default */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Default</h3>
        <${componentName}${demoProps}>
          Example content
        </${componentName}>
      </div>
      
      ${variantExamples}
    </div>
  )
}`;
  }

  generateDemoProps(component) {
    const props = component.props || [];
    const demoValues = [];

    props.forEach(prop => {
      if (prop.name === 'children' || prop.name === 'className') return;
      
      let value = prop.default;
      if (value === null || value === undefined) {
        value = this.generateDefaultValue(prop.type);
      }

      if (value !== null && value !== undefined) {
        if (typeof value === 'string') {
          demoValues.push(`${prop.name}="${value}"`);
        } else {
          demoValues.push(`${prop.name}={${JSON.stringify(value)}}`);
        }
      }
    });

    return demoValues.length > 0 ? ` ${demoValues.join(' ')}` : '';
  }

  generateVariantExamples(component, variants) {
    if (Object.keys(variants).length === 0) return '';

    return Object.entries(variants).map(([variantKey, values]) => {
      const examples = values.map(value => 
        `        <${component.name} ${variantKey}="${value}">
          ${variantKey}: ${value}
        </${component.name}>`
      ).join('\n');

      return `      {/* ${variantKey} variants */}
      <div>
        <h3 className="text-lg font-semibold mb-2">${variantKey} variants</h3>
        <div className="space-y-2">
${examples}
        </div>
      </div>`;
    }).join('\n      \n');
  }

  async generateReadme(component) {
    const componentName = component.name;
    const description = component.description || `${componentName} component`;
    const props = component.props || [];
    const variants = component.variants || {};
    const tokensUsed = component.tokensUsed || [];

    let readme = `# ${componentName}

${description}

## Installation

\`\`\`bash
${this.generateInstallCommand(component)}
\`\`\`

## Usage

\`\`\`tsx
import { ${componentName} } from "@/components/ui/${componentName.toLowerCase()}"

<${componentName}>
  Content goes here
</${componentName}>
\`\`\`

`;

    // Props table
    if (props.length > 0) {
      readme += `## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
`;
      props.forEach(prop => {
        const required = prop.required ? '**required**' : 'optional';
        const defaultVal = prop.default !== null ? `\`${prop.default}\`` : '-';
        readme += `| \`${prop.name}\` | \`${prop.type}\` (${required}) | ${defaultVal} | ${prop.description || '-'} |\n`;
      });
      readme += '\n';
    }

    // Variants table
    if (Object.keys(variants).length > 0) {
      readme += `## Variants

| Variant | Values |
|---------|--------|
`;
      Object.entries(variants).forEach(([key, values]) => {
        readme += `| \`${key}\` | ${values.map(v => `\`${v}\``).join(', ')} |\n`;
      });
      readme += '\n';
    }

    // Design tokens
    if (tokensUsed.length > 0) {
      readme += `## Design Tokens

This component uses the following design tokens:

${tokensUsed.map(token => `- \`${token}\``).join('\n')}

`;
    }

    // Examples
    readme += `## Examples

### Basic Usage

\`\`\`tsx
<${componentName}>
  Hello, world!
</${componentName}>
\`\`\`

`;

    // Variant examples
    if (Object.keys(variants).length > 0) {
      Object.entries(variants).forEach(([variantKey, values]) => {
        readme += `### ${variantKey} Variants

${values.map(value => 
          `\`\`\`tsx
<${componentName} ${variantKey}="${value}">
  ${variantKey}: ${value}
</${componentName}>
\`\`\``
        ).join('\n\n')}

`;
      });
    }

    return readme;
  }

  async generateStyles(component, registry) {
    // Only generate styles if component uses CSS-specific tokens
    const tokensUsed = component.tokensUsed || [];
    const cssTokens = tokensUsed.filter(token => 
      !token.startsWith('color.') && 
      !token.startsWith('spacing.') && 
      !token.startsWith('typography.')
    );

    if (cssTokens.length === 0) return null;

    // Generate CSS custom properties
    let css = `/* ${component.name} component styles */\n\n`;
    css += `.${component.name.toLowerCase()} {\n`;
    
    cssTokens.forEach(token => {
      const cssVar = `--${token.replace(/\./g, '-')}`;
      css += `  ${cssVar}: var(${cssVar});\n`;
    });
    
    css += `}\n`;
    
    return css;
  }

  async storeBlob(content, extension) {
    const hash = crypto.createHash('sha1').update(content).digest('hex');
    const fileName = `${hash}.${extension}`;
    const blobPath = path.join(this.outputDir, 'blobs', fileName);
    
    if (!this.blobCache.has(hash)) {
      await fs.writeFile(blobPath, content);
      this.blobCache.set(hash, fileName);
    }
    
    // Return both URL and metadata for DCP spec compliance
    return {
      url: this.baseUrl ? `${this.baseUrl}/blobs/${fileName}` : `./blobs/${fileName}`,
      sha1: hash,
      size: Buffer.byteLength(content, 'utf8'),
      fileName,
    };
  }

  // Helper methods
  extractRadixImports(component) {
    const radixPrimitives = component.composition?.radixPrimitives || [];
    return radixPrimitives.map(primitive => 
      `import { ${primitive.name} } from "${primitive.package}"`
    );
  }

  inferBaseClasses(component) {
    const tokensUsed = component.tokensUsed || [];
    
    // Map common tokens to Tailwind classes
    const classes = [];
    
    if (tokensUsed.includes('radius.md')) classes.push('rounded-md');
    if (tokensUsed.includes('spacing.2')) classes.push('p-2');
    if (tokensUsed.includes('spacing.4')) classes.push('px-4');
    if (tokensUsed.includes('typography.size.sm')) classes.push('text-sm');
    if (tokensUsed.includes('typography.weight.medium')) classes.push('font-medium');
    
    // Default classes if none inferred
    if (classes.length === 0) {
      classes.push('inline-flex', 'items-center', 'justify-center');
    }
    
    return classes.join(' ');
  }

  inferVariantClasses(component, variantKey, variantValue) {
    // Map common variant patterns to Tailwind classes
    if (variantKey === 'variant') {
      const variantClasses = {
        'default': 'bg-primary text-primary-foreground hover:bg-primary/90',
        'destructive': 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        'outline': 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        'secondary': 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        'ghost': 'hover:bg-accent hover:text-accent-foreground',
        'link': 'text-primary underline-offset-4 hover:underline'
      };
      return variantClasses[variantValue] || '';
    }
    
    if (variantKey === 'size') {
      const sizeClasses = {
        'default': 'h-10 px-4 py-2',
        'sm': 'h-9 rounded-md px-3',
        'lg': 'h-11 rounded-md px-8',
        'icon': 'h-10 w-10'
      };
      return sizeClasses[variantValue] || '';
    }
    
    return '';
  }

  mapPropType(type) {
    const typeMap = {
      'string': 'string',
      'number': 'number', 
      'boolean': 'boolean',
      'union': 'string',
      'unknown': 'any'
    };
    return typeMap[type] || 'any';
  }

  generateDefaultValue(type) {
    const defaults = {
      'string': 'Hello, world!',
      'number': 0,
      'boolean': false
    };
    return defaults[type] || null;
  }

  inferPeerDependencies(component, registry) {
    const deps = {
      'react': '^18.0.0'
    };

    // Check for common dependencies
    const source = component.source || '';
    const radixPrimitives = component.composition?.radixPrimitives || [];
    
    if (source.includes('tailwind') || component.tokensUsed?.length > 0) {
      deps['tailwindcss'] = '^3.0.0';
    }
    
    if (source.includes('cva') || Object.keys(component.variants || {}).length > 0) {
      deps['class-variance-authority'] = '^0.7.0';
    }
    
    if (radixPrimitives.length > 0) {
      radixPrimitives.forEach(primitive => {
        const packageName = primitive.package;
        deps[packageName] = 'latest';
      });
    }

    return deps;
  }

  inferDependencies(component) {
    // Usually components don't have runtime dependencies beyond peers
    return {};
  }

  generateInstallCommand(component) {
    return `npx dcp-add "${this.baseUrl}/r/${this.namespace}/${component.name.toLowerCase()}"`;
  }
}