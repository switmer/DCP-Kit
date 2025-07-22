import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

/**
 * DCP Transpiler - Transform DCP IR into running code
 * 
 * Features:
 * - React/TypeScript component generation
 * - Prop interface generation with proper typing
 * - Variant-aware component logic
 * - Auto-generated index.ts exports
 * - Storybook stories from examples
 * - CSS-in-JS styling integration
 * - Atomic design organization
 */

export async function runTranspile(registryPath, options = {}) {
  const {
    target = 'react',
    out: outputDir = './generated',
    includeStories = false,
    includeStyles = true,
    format = 'typescript',
    atomic = false
  } = options;

  console.log(chalk.blue(`🚀 Transpiling DCP registry: ${registryPath}`));
  console.log(chalk.gray(`   Target: ${target}`));
  console.log(chalk.gray(`   Output: ${outputDir}`));
  
  // Load registry
  const registryContent = await fs.readFile(registryPath, 'utf-8');
  const registry = JSON.parse(registryContent);
  
  const transpiler = new DCPTranspiler({
    registry,
    target,
    outputDir,
    includeStories,
    includeStyles,
    format,
    atomic,
    verbose: options.verbose
  });
  
  const result = await transpiler.transpile();
  
  console.log(chalk.green(`✅ Transpilation complete!`));
  console.log(chalk.green(`📁 Components written to: ${outputDir}`));
  
  if (options.verbose) {
    console.log(chalk.gray(`   Files generated: ${result.files.length}`));
    console.log(chalk.gray(`   Components: ${result.componentsGenerated}`));
    console.log(chalk.gray(`   Stories: ${result.storiesGenerated}`));
  }
  
  return {
    result,
    outputDir,
    summary: {
      filesGenerated: result.files.length,
      componentsGenerated: result.componentsGenerated,
      storiesGenerated: result.storiesGenerated,
      target,
      format
    }
  };
}

class DCPTranspiler {
  constructor(options) {
    this.registry = options.registry;
    this.target = options.target || 'react';
    this.outputDir = options.outputDir || './generated';
    this.includeStories = options.includeStories || false;
    this.includeStyles = options.includeStyles !== false;
    this.format = options.format || 'typescript';
    this.atomic = options.atomic || false;
    this.verbose = options.verbose || false;
    
    this.files = [];
    this.componentsGenerated = 0;
    this.storiesGenerated = 0;
  }
  
  async transpile() {
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
    
    // Transpile based on target
    switch (this.target) {
      case 'react':
        await this.transpileReact();
        break;
      case 'vue':
        await this.transpileVue();
        break;
      case 'svelte':
        await this.transpileSvelte();
        break;
      default:
        throw new Error(`Unsupported transpile target: ${this.target}`);
    }
    
    // Generate index file
    await this.generateIndex();
    
    // Generate package.json if needed
    await this.generatePackageJson();
    
    return {
      files: this.files,
      componentsGenerated: this.componentsGenerated,
      storiesGenerated: this.storiesGenerated
    };
  }
  
  async transpileReact() {
    if (!this.registry.components) {
      console.warn(chalk.yellow('⚠️  No components found in registry'));
      return;
    }
    
    // Generate components
    for (const component of this.registry.components) {
      await this.generateReactComponent(component);
      this.componentsGenerated++;
      
      // Generate stories if requested
      if (this.includeStories && component.examples?.length > 0) {
        await this.generateStorybook(component);
        this.storiesGenerated++;
      }
    }
    
    // Generate types file
    await this.generateTypesFile();
    
    // Generate theme/tokens if available
    if (this.registry.tokens) {
      await this.generateTokensFile();
    }
  }
  
  async generateReactComponent(component) {
    const componentDir = this.atomic ? 
      path.join(this.outputDir, this.getAtomicCategory(component.category), component.name) :
      path.join(this.outputDir, 'components');
      
    await fs.mkdir(componentDir, { recursive: true });
    
    const componentCode = this.buildReactComponent(component);
    const fileName = `${component.name}.${this.format === 'typescript' ? 'tsx' : 'jsx'}`;
    const filePath = path.join(componentDir, fileName);
    
    await fs.writeFile(filePath, componentCode);
    this.files.push(filePath);
    
    if (this.verbose) {
      console.log(chalk.gray(`   Generated: ${fileName}`));
    }
  }
  
  buildReactComponent(component) {
    const isTypeScript = this.format === 'typescript';
    const imports = this.buildImports(component);
    const interface_ = isTypeScript ? this.buildInterface(component) : '';
    const componentFunction = this.buildComponentFunction(component);
    return `${imports}\n\n${interface_}\n\n${componentFunction}`.trim();
  }
  
  buildImports(component) {
    const imports = [`import React from 'react';`];
    
    // Add styling imports
    if (this.includeStyles) {
      imports.push(`import { styled } from '@/lib/styled';`);
      imports.push(`import { cn } from '@/lib/utils';`);
    }
    
    // Add variant imports if needed
    if (component.variants?.length > 0) {
      imports.push(`import { cva, type VariantProps } from 'class-variance-authority';`);
    }
    
    return imports.join('\\n');
  }
  
  buildInterface(component) {
    if (this.format !== 'typescript') return '';
    
    const interfaceName = `${component.name}Props`;
    const props = this.buildPropTypes(component);
    const variantProps = component.variants?.length > 0 ? 
      `\\n  & VariantProps<typeof ${component.name.toLowerCase()}Variants>` : '';
    
    return `export interface ${interfaceName} {${props}${variantProps}\\n}`;
  }
  
  buildPropTypes(component) {
    if (!component.props || component.props.length === 0) {
      return '\\n  children?: React.ReactNode;';
    }
    
    const propLines = component.props.map(prop => {
      const optional = !prop.required ? '?' : '';
      const type = this.mapPropType(prop);
      const comment = prop.description ? `\\n  /** ${prop.description} */` : '';
      
      return `${comment}\\n  ${prop.name}${optional}: ${type};`;
    });
    
    // Always include children for flexibility
    propLines.push('\\n  children?: React.ReactNode;');
    
    return propLines.join('');
  }
  
  mapPropType(prop) {
    switch (prop.type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'union':
        // Try to extract union values from description or examples
        return this.extractUnionType(prop) || 'string';
      case 'function':
        return '() => void';
      case 'object':
        return 'Record<string, any>';
      case 'array':
        return 'any[]';
      default:
        return 'any';
    }
  }
  
  extractUnionType(prop) {
    // Look for union values in description or examples
    if (prop.description) {
      const match = prop.description.match(/\\((.*?)\\)/);
      if (match) {
        const values = match[1].split('|').map(v => v.trim());
        return values.map(v => `'${v}'`).join(' | ');
      }
    }
    
    return null;
  }
  
  buildComponentFunction(component) {
    const isTypeScript = this.format === 'typescript';
    const propsType = isTypeScript ? `: ${component.name}Props` : '';
    const variants = this.buildVariants(component);
    const defaultProps = this.buildDefaultProps(component);
    const componentLogic = this.buildComponentLogic(component);
    
    return `${variants}
export const ${component.name}: React.FC${isTypeScript ? `<${component.name}Props>` : ''} = ({
  ${this.buildPropsDestructuring(component)}
}) => {
  ${componentLogic}
  
  return (
    ${this.buildJSXReturn(component)}
  );
};

${defaultProps}`;
  }
  
  buildVariants(component) {
    if (!component.variants || component.variants.length === 0) return '';
    
    const variantObject = {};
    
    // Build variant configurations
    component.variants.forEach(variant => {
      const variantName = variant.name || 'default';
      variantObject[variantName] = this.buildVariantStyles(variant);
    });
    
    return `const ${component.name.toLowerCase()}Variants = cva(
  "${this.getBaseStyles(component)}",
  {
    variants: {
      variant: {${Object.entries(variantObject).map(([name, styles]) => 
        `\\n        ${name}: "${styles}"`
      ).join(',')}
      }
    },
    defaultVariants: {
      variant: "${component.variants[0]?.name || 'default'}"
    }
  }
);\\n`;
  }
  
  buildVariantStyles(variant) {
    // Generate Tailwind classes based on variant properties
    const styles = [];
    
    if (variant.props) {
      Object.entries(variant.props).forEach(([key, value]) => {
        switch (key) {
          case 'backgroundColor':
            styles.push(this.colorToTailwind(value, 'bg'));
            break;
          case 'textColor':
            styles.push(this.colorToTailwind(value, 'text'));
            break;
          case 'borderColor':
            styles.push(this.colorToTailwind(value, 'border'));
            break;
          case 'padding':
            styles.push(this.spacingToTailwind(value, 'p'));
            break;
          case 'margin':
            styles.push(this.spacingToTailwind(value, 'm'));
            break;
        }
      });
    }
    
    return styles.join(' ') || 'bg-gray-100 text-gray-900';
  }
  
  colorToTailwind(color, prefix) {
    // Simple color mapping - in production, you'd have a more sophisticated mapping
    const colorMap = {
      '#3b82f6': 'blue-500',
      '#6b7280': 'gray-500',
      '#dc2626': 'red-600',
      '#059669': 'green-600',
      'primary': 'blue-500',
      'secondary': 'gray-500',
      'danger': 'red-600',
      'success': 'green-600'
    };
    
    const tailwindColor = colorMap[color] || 'gray-500';
    return `${prefix}-${tailwindColor}`;
  }
  
  spacingToTailwind(spacing, prefix) {
    const spacingMap = {
      '0.25rem': '1',
      '0.5rem': '2',
      '1rem': '4',
      '1.5rem': '6',
      '2rem': '8'
    };
    
    const tailwindSpacing = spacingMap[spacing] || '4';
    return `${prefix}-${tailwindSpacing}`;
  }
  
  getBaseStyles(component) {
    // Generate base styles based on component category
    const categoryStyles = {
      'actions': 'inline-flex items-center justify-center rounded-md font-medium transition-colors',
      'forms': 'flex rounded-md border border-gray-300 bg-white px-3 py-2',
      'layout': 'rounded-lg bg-white shadow',
      'typography': 'text-gray-900',
      'icons': 'h-4 w-4',
      'overlays': 'fixed inset-0 z-50'
    };
    
    return categoryStyles[component.category] || 'block';
  }
  
  buildDefaultProps(component) {
    if (!component.props) return '';
    
    const defaults = component.props
      .filter(prop => prop.default !== undefined)
      .map(prop => `  ${prop.name}: ${JSON.stringify(prop.default)}`)
      .join(',\\n');
    
    if (defaults) {
      return `${component.name}.defaultProps = {\\n${defaults}\\n};`;
    }
    
    return '';
  }
  
  buildPropsDestructuring(component) {
    if (!component.props) return 'children, ...props';
    
    const propNames = component.props.map(prop => {
      const defaultValue = prop.default !== undefined ? ` = ${JSON.stringify(prop.default)}` : '';
      return `${prop.name}${defaultValue}`;
    });
    
    propNames.push('children');
    propNames.push('className');
    propNames.push('...props');
    
    return propNames.join(',\\n  ');
  }
  
  buildComponentLogic(component) {
    const hasVariants = component.variants?.length > 0;
    
    if (hasVariants) {
      return `const variants = ${component.name.toLowerCase()}Variants({ variant, className });`;
    }
    
    return `const classes = cn(className);`;
  }
  
  buildJSXReturn(component) {
    const hasVariants = component.variants?.length > 0;
    const className = hasVariants ? '{variants}' : '{classes}';
    const tag = this.getComponentTag(component);
    
    return `<${tag}
      className=${className}
      {...props}
    >
      {children}
    </${tag}>`;
  }
  
  getComponentTag(component) {
    const tagMap = {
      'actions': 'button',
      'forms': 'input',
      'layout': 'div',
      'typography': 'p',
      'overlays': 'div'
    };
    
    return tagMap[component.category] || 'div';
  }
  
  async generateStorybook(component) {
    const storiesDir = path.join(this.outputDir, 'stories');
    await fs.mkdir(storiesDir, { recursive: true });
    
    const storyCode = this.buildStorybook(component);
    const fileName = `${component.name}.stories.${this.format === 'typescript' ? 'tsx' : 'jsx'}`;
    const filePath = path.join(storiesDir, fileName);
    
    await fs.writeFile(filePath, storyCode);
    this.files.push(filePath);
  }
  
  buildStorybook(component) {
    const isTypeScript = this.format === 'typescript';
    const importPath = this.atomic ? 
      `../atoms/${component.name}/${component.name}` : 
      `../components/${component.name}`;
    
    return `import type { Meta, StoryObj } from '@storybook/react';
import { ${component.name} } from '${importPath}';

const meta${isTypeScript ? `: Meta<typeof ${component.name}>` : ''} = {
  title: '${this.getStoryCategory(component.category)}/${component.name}',
  component: ${component.name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ${this.buildStoryArgs(component)}
  },
};

${this.buildVariantStories(component)}`;
  }
  
  getStoryCategory(category) {
    const categoryMap = {
      'actions': 'Actions',
      'forms': 'Forms',
      'layout': 'Layout',
      'typography': 'Typography',
      'icons': 'Icons',
      'overlays': 'Overlays'
    };
    
    return categoryMap[category] || 'Components';
  }
  
  buildStoryArgs(component) {
    const args = ['children: "Example"'];
    
    if (component.props) {
      component.props.forEach(prop => {
        if (prop.default !== undefined) {
          args.push(`${prop.name}: ${JSON.stringify(prop.default)}`);
        }
      });
    }
    
    return args.join(',\\n    ');
  }
  
  buildVariantStories(component) {
    if (!component.variants || component.variants.length === 0) return '';
    
    return component.variants.map(variant => `
export const ${variant.name.charAt(0).toUpperCase() + variant.name.slice(1)}: Story = {
  args: {
    variant: '${variant.name}',
    children: '${variant.name.charAt(0).toUpperCase() + variant.name.slice(1)} Example',
  },
};`).join('\\n');
  }
  
  async generateTypesFile() {
    const typesCode = this.buildTypesFile();
    const filePath = path.join(this.outputDir, 'types.ts');
    
    await fs.writeFile(filePath, typesCode);
    this.files.push(filePath);
  }
  
  buildTypesFile() {
    return `// Generated types for DCP components
export type ComponentVariant = 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
export type ComponentSize = 'sm' | 'md' | 'lg';

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Registry metadata
export interface RegistryInfo {
  name: string;
  version: string;
  components: number;
  tokens: number;
  generatedAt: string;
}

export const registryInfo: RegistryInfo = ${JSON.stringify({
      name: this.registry.name,
      version: this.registry.version,
      components: this.registry.components?.length || 0,
      tokens: Object.keys(this.registry.tokens || {}).length,
      generatedAt: new Date().toISOString()
    }, null, 2)};`;
  }
  
  async generateTokensFile() {
    const tokensCode = this.buildTokensFile();
    const filePath = path.join(this.outputDir, 'tokens.ts');
    
    await fs.writeFile(filePath, tokensCode);
    this.files.push(filePath);
  }
  
  buildTokensFile() {
    const tokens = this.registry.tokens || {};
    
    return `// Generated design tokens
${Object.entries(tokens).map(([category, categoryTokens]) => {
      const tokenObj = Object.entries(categoryTokens).reduce((acc, [name, token]) => {
        acc[name] = token.value || token;
        return acc;
      }, {});
      
      return `export const ${category} = ${JSON.stringify(tokenObj, null, 2)};`;
    }).join('\\n\\n')}

// Combined tokens export
export const tokens = {
  ${Object.keys(tokens).join(',\\n  ')}
};`;
  }
  
  async generateIndex() {
    const indexCode = this.buildIndex();
    const fileName = `index.${this.format === 'typescript' ? 'ts' : 'js'}`;
    const filePath = path.join(this.outputDir, fileName);
    
    await fs.writeFile(filePath, indexCode);
    this.files.push(filePath);
  }
  
  buildIndex() {
    if (!this.registry.components) return 'export {};';
    
    const exports = this.registry.components.map(component => 
      `export { ${component.name} } from './components/${component.name}';`
    );
    
    // Add type exports if TypeScript
    if (this.format === 'typescript') {
      exports.push(`export * from './types';`);
      
      if (this.registry.tokens) {
        exports.push(`export * from './tokens';`);
      }
    }
    
    return `// Generated exports for DCP components
${exports.join('\\n')}

// Registry info
export const registryInfo = {
  name: '${this.registry.name}',
  version: '${this.registry.version}',
  components: ${this.registry.components.length},
  generatedAt: '${new Date().toISOString()}'
};`;
  }
  
  async generatePackageJson() {
    const packageJson = {
      name: `@dcp/${this.registry.name.toLowerCase().replace(/\\s+/g, '-')}`,
      version: this.registry.version || '1.0.0',
      description: this.registry.description || 'Generated DCP component library',
      main: 'index.js',
      module: 'index.js',
      types: 'index.d.ts',
      files: ['**/*'],
      scripts: {
        build: 'tsc',
        storybook: 'storybook dev -p 6006',
        'build-storybook': 'storybook build'
      },
      peerDependencies: {
        react: '^18.0.0',
        'react-dom': '^18.0.0'
      },
      devDependencies: {
        '@types/react': '^18.0.0',
        'typescript': '^5.0.0'
      },
      dependencies: {
        'class-variance-authority': '^0.7.0',
        'clsx': '^2.0.0',
        'tailwind-merge': '^2.0.0'
      },
      metadata: {
        generatedBy: 'DCP Transformer',
        generatedAt: new Date().toISOString(),
        sourceRegistry: this.registry.name
      }
    };
    
    const filePath = path.join(this.outputDir, 'package.json');
    await fs.writeFile(filePath, JSON.stringify(packageJson, null, 2));
    this.files.push(filePath);
  }
  
  getAtomicCategory(category) {
    const atomicMap = {
      'actions': 'atoms',
      'forms': 'atoms', 
      'typography': 'atoms',
      'icons': 'atoms',
      'layout': 'molecules',
      'overlays': 'organisms'
    };
    
    return atomicMap[category] || 'atoms';
  }
  
  async transpileVue() {
    throw new Error('Vue transpilation not implemented yet');
  }
  
  async transpileSvelte() {
    throw new Error('Svelte transpilation not implemented yet');
  }
}