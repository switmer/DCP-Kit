#!/usr/bin/env node

/**
 * ShadCN Registry Adaptor for DCP-Transformer
 * 
 * Converts DCP registry data to ShadCN/UI compatible registry format
 * Enables any React codebase to become installable via `npx shadcn add`
 * 
 * Features:
 * - DCP Registry → ShadCN registry.json conversion
 * - Component metadata extraction
 * - Dependency graph analysis
 * - Design token → CSS variables mapping
 * - Auto-generated component documentation
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

export class ShadCNRegistryAdaptor {
  constructor(options = {}) {
    this.registryName = options.name || 'custom-registry';
    this.homepage = options.homepage || 'https://example.com';
    this.outputDir = options.outputDir || './shadcn-registry';
    this.baseUrl = options.baseUrl || 'https://example.com/registry';
    this.author = options.author || 'DCP-Transformer';
  }

  /**
   * Convert DCP registry to ShadCN format
   */
  async convertRegistry(dcpRegistryPath) {
    console.log(`🔄 Converting DCP registry to ShadCN format...`);
    
    // Load DCP registry
    const dcpRegistry = JSON.parse(await fs.readFile(dcpRegistryPath, 'utf-8'));
    
    // Store source directory for relative path resolution
    this.sourceDir = path.dirname(dcpRegistryPath);
    
    // Convert components
    const items = await Promise.all(
      dcpRegistry.components.map(component => this.convertComponent(component, dcpRegistry))
    );

    // Generate main registry.json
    const shadcnRegistry = {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: this.registryName,
      homepage: this.homepage,
      items: items.filter(Boolean) // Remove any failed conversions
    };

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    // Write main registry
    await fs.writeFile(
      path.join(this.outputDir, 'registry.json'),
      JSON.stringify(shadcnRegistry, null, 2)
    );

    console.log(`✅ Generated ShadCN registry with ${items.length} components`);
    console.log(`📁 Output: ${this.outputDir}/registry.json`);

    return shadcnRegistry;
  }

  /**
   * Convert individual DCP component to ShadCN registry item
   */
  async convertComponent(dcpComponent, dcpRegistry) {
    try {
      // Extract component information
      const componentName = this.normalizeComponentName(dcpComponent.name);
      const componentType = this.determineComponentType(dcpComponent);
      
      // Read component source file
      const componentSource = await this.readComponentSource(dcpComponent.filePath);
      
      // Extract dependencies
      const dependencies = this.extractDependencies(componentSource);
      const registryDependencies = this.extractRegistryDependencies(componentSource, dcpRegistry);

      // Generate CSS variables from tokens
      const cssVars = this.generateCSSVariables(dcpComponent.tokens, dcpRegistry.tokens);

      // Create registry item
      const registryItem = {
        $schema: "https://ui.shadcn.com/schema/registry-item.json",
        name: componentName,
        type: componentType,
        title: dcpComponent.displayName || dcpComponent.name,
        description: dcpComponent.description || `${dcpComponent.name} component`,
        author: this.author,
        dependencies,
        registryDependencies,
        files: [{
          path: `registry/components/${componentName}.tsx`,
          type: "registry:component",
          content: componentSource
        }],
        ...(Object.keys(cssVars).length > 0 && { cssVars }),
        categories: [this.inferCategory(dcpComponent)],
        meta: {
          source: dcpComponent.filePath,
          extractedAt: new Date().toISOString(),
          props: dcpComponent.props.map(prop => ({
            name: prop.name,
            type: prop.type,
            required: prop.required,
            description: prop.description
          }))
        }
      };

      // Write individual component file
      await fs.writeFile(
        path.join(this.outputDir, `${componentName}.json`),
        JSON.stringify(registryItem, null, 2)
      );

      console.log(`  ✓ Converted ${dcpComponent.name} → ${componentName}`);
      
      return {
        name: componentName,
        type: componentType,
        title: registryItem.title,
        description: registryItem.description,
        files: registryItem.files.map(f => ({ path: f.path, type: f.type }))
      };

    } catch (error) {
      console.warn(`  ⚠️  Failed to convert ${dcpComponent.name}: ${error.message}`);
      return null;
    }
  }

  /**
   * Normalize component name for ShadCN format (kebab-case)
   */
  normalizeComponentName(name) {
    return name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');
  }

  /**
   * Determine appropriate ShadCN component type
   */
  determineComponentType(component) {
    const name = component.name.toLowerCase();
    
    // Map common component patterns to ShadCN types
    if (name.includes('button') || name.includes('btn')) return 'registry:ui';
    if (name.includes('form') || name.includes('input')) return 'registry:ui';
    if (name.includes('modal') || name.includes('dialog')) return 'registry:ui';
    if (name.includes('card') || name.includes('panel')) return 'registry:ui';
    if (name.includes('hook') || name.includes('use')) return 'registry:hook';
    if (name.includes('layout') || name.includes('page')) return 'registry:block';
    
    return 'registry:component'; // Default
  }

  /**
   * Read component source file
   */
  async readComponentSource(filePath) {
    try {
      // Handle relative paths by resolving against source directory
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.resolve(this.sourceDir, filePath);
      
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Cannot read component source: ${filePath}`);
    }
  }

  /**
   * Extract npm dependencies from component source
   */
  extractDependencies(componentSource) {
    const dependencies = new Set();
    
    // Extract import statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(componentSource)) !== null) {
      const importPath = match[1];
      
      // Skip relative imports
      if (importPath.startsWith('.') || importPath.startsWith('/')) continue;
      
      // Extract package name (handle scoped packages)
      const packageName = importPath.startsWith('@') 
        ? importPath.split('/').slice(0, 2).join('/')
        : importPath.split('/')[0];
      
      // Common React ecosystem packages
      if (!['react', 'react-dom'].includes(packageName)) {
        dependencies.add(packageName);
      }
    }

    return Array.from(dependencies).sort();
  }

  /**
   * Extract registry dependencies (other components in the same registry)
   */
  extractRegistryDependencies(componentSource, dcpRegistry) {
    const registryDeps = new Set();
    
    // Look for imports that might be other components in our registry
    dcpRegistry.components.forEach(comp => {
      const componentName = comp.name;
      
      // Check if this component is imported
      const importPattern = new RegExp(`import\\s+.*?${componentName}.*?from`, 'i');
      if (importPattern.test(componentSource)) {
        registryDeps.add(this.normalizeComponentName(componentName));
      }
    });

    return Array.from(registryDeps).sort();
  }

  /**
   * Generate CSS variables from design tokens
   */
  generateCSSVariables(componentTokens = [], allTokens = {}) {
    const cssVars = { light: {}, dark: {} };
    
    // Convert component-specific tokens
    componentTokens.forEach(tokenName => {
      // Find token in registry
      for (const [category, tokens] of Object.entries(allTokens)) {
        if (tokens[tokenName]) {
          const token = tokens[tokenName];
          const cssVarName = `--${tokenName.replace(/\./g, '-')}`;
          
          if (token.type === 'color') {
            cssVars.light[cssVarName] = token.value;
            cssVars.dark[cssVarName] = token.darkValue || token.value;
          } else {
            cssVars.light[cssVarName] = token.value;
          }
        }
      }
    });

    return cssVars;
  }

  /**
   * Infer component category for organization
   */
  inferCategory(component) {
    const name = component.name.toLowerCase();
    
    if (name.includes('button') || name.includes('btn')) return 'ui';
    if (name.includes('form') || name.includes('input')) return 'forms';
    if (name.includes('nav') || name.includes('menu')) return 'navigation';
    if (name.includes('modal') || name.includes('dialog')) return 'overlay';
    if (name.includes('card') || name.includes('panel')) return 'layout';
    if (name.includes('chart') || name.includes('graph')) return 'data-display';
    
    return 'components';
  }

  /**
   * Generate installation instructions
   */
  generateInstallationDocs() {
    return `# ${this.registryName} Component Registry

Install components using the ShadCN CLI:

\`\`\`bash
# Install a specific component
npx shadcn add ${this.baseUrl}/button.json

# Or reference in components.json
{
  "registries": [
    {
      "name": "${this.registryName}",
      "url": "${this.baseUrl}"
    }
  ]
}
\`\`\`

## Available Components

Generated automatically from DCP-Transformer registry.
`;
  }
}

// CLI usage
export async function convertToShadCN(dcpRegistryPath, options = {}) {
  const adaptor = new ShadCNRegistryAdaptor(options);
  return await adaptor.convertRegistry(dcpRegistryPath);
}

// If called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dcpRegistryPath = process.argv[2];
  
  if (!dcpRegistryPath) {
    console.error('Usage: node shadcn-registry.js <dcp-registry.json>');
    process.exit(1);
  }

  try {
    await convertToShadCN(dcpRegistryPath, {
      name: 'my-component-library',
      homepage: 'https://my-components.com',
      outputDir: './shadcn-registry'
    });
    
    console.log('\n🎉 ShadCN registry generated successfully!');
    console.log('📖 Add to your components.json or install directly with:');
    console.log('   npx shadcn add ./shadcn-registry/component-name.json');
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
}