/**
 * Nested Registry Generator - Creates federated registry architectures for monorepos
 * 
 * Instead of one massive registry.json, creates:
 * - Root registry (metadata + package references)
 * - Package registries (component details per package)
 * 
 * Benefits:
 * - Performance: Load only needed packages
 * - Team autonomy: Each team owns their registry  
 * - Incremental updates: Change only affected packages
 * - Scalability: Handles enterprise-scale design systems
 */

import fs from 'fs/promises';
import path from 'path';
import { runExtract } from '../commands/extract-v3.js';

export class NestedRegistryGenerator {
  constructor(options = {}) {
    this.options = {
      concurrency: 4,
      includeEmptyPackages: false,
      generateIndex: true,
      ...options
    };
  }

  /**
   * Generate nested registry structure for a monorepo
   */
  async generateNestedRegistries(monorepoAnalysis, options = {}) {
    const { 
      outputDir = path.join(monorepoAnalysis.root, 'dcp-registry'),
      packages: targetPackages = null,
      dryRun = false 
    } = options;

    const generationPlan = this.createGenerationPlan(monorepoAnalysis, outputDir);
    
    console.log(`🏗️ Generating nested registries for ${monorepoAnalysis.metadata.totalPackages} packages...`);
    console.log(`📁 Output directory: ${outputDir}`);
    
    if (dryRun) {
      console.log('🔍 Dry run - showing generation plan:');
      console.log(JSON.stringify(generationPlan, null, 2));
      return generationPlan;
    }

    // Create output directory structure
    await this.createOutputStructure(outputDir, generationPlan);

    // Generate package registries in parallel
    const packageResults = await this.generatePackageRegistries(
      generationPlan.packages, 
      targetPackages
    );

    // Generate root registry with references to packages
    const rootRegistry = await this.generateRootRegistry(
      monorepoAnalysis, 
      packageResults, 
      generationPlan
    );

    // Write root registry
    const rootRegistryPath = path.join(outputDir, 'registry.json');
    await fs.writeFile(rootRegistryPath, JSON.stringify(rootRegistry, null, 2));

    // Generate cross-package index for fast lookups
    if (this.options.generateIndex) {
      const index = this.generateComponentIndex(packageResults);
      const indexPath = path.join(outputDir, 'index.json');
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    }

    const summary = this.generateSummary(packageResults, rootRegistry);
    console.log('✅ Nested registry generation complete!');
    console.log(summary);

    return {
      rootRegistry,
      packageResults,
      outputDir,
      summary
    };
  }

  /**
   * Create generation plan based on monorepo analysis
   */
  createGenerationPlan(analysis, outputDir) {
    const packagesWithComponents = analysis.packages.filter(pkg => 
      pkg.hasComponents || !this.options.includeEmptyPackages === false
    );

    return {
      type: 'nested',
      rootPath: analysis.root,
      outputDir,
      totalPackages: analysis.packages.length,
      componentPackages: packagesWithComponents.length,
      packages: packagesWithComponents.map(pkg => ({
        name: pkg.name,
        sourcePath: pkg.path,
        outputPath: path.join(outputDir, 'packages', this.sanitizePackageName(pkg.name)),
        registryPath: path.join(outputDir, 'packages', this.sanitizePackageName(pkg.name), 'registry.json'),
        componentCount: pkg.componentEntries.length,
        components: pkg.componentEntries,
        version: pkg.version,
        relativePath: pkg.relativePath
      })),
      metadata: {
        createdAt: new Date().toISOString(),
        sourceMonorepo: analysis.root,
        workspaceType: analysis.workspaceConfig?.type,
        packageManager: analysis.packageManager
      }
    };
  }

  /**
   * Create output directory structure for nested registries
   */
  async createOutputStructure(outputDir, plan) {
    // Create root output directory
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create packages directory
    const packagesDir = path.join(outputDir, 'packages');
    await fs.mkdir(packagesDir, { recursive: true });

    // Create directory for each package
    for (const pkg of plan.packages) {
      await fs.mkdir(pkg.outputPath, { recursive: true });
    }
  }

  /**
   * Generate registry for each package in parallel
   */
  async generatePackageRegistries(packages, targetPackages = null) {
    const packagesToProcess = targetPackages 
      ? packages.filter(pkg => targetPackages.includes(pkg.name))
      : packages;

    console.log(`📦 Generating ${packagesToProcess.length} package registries...`);

    // Process packages in batches for concurrency control
    const results = [];
    const batchSize = this.options.concurrency;

    for (let i = 0; i < packagesToProcess.length; i += batchSize) {
      const batch = packagesToProcess.slice(i, i + batchSize);
      const batchPromises = batch.map(pkg => this.generateSinglePackageRegistry(pkg));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const pkg = batch[j];
        
        if (result.status === 'fulfilled') {
          results.push({
            package: pkg.name,
            success: true,
            registry: result.value,
            outputPath: pkg.registryPath
          });
          console.log(`  ✅ ${pkg.name}: ${result.value.components.length} components`);  
        } else {
          results.push({
            package: pkg.name,
            success: false,
            error: result.reason.message,
            outputPath: pkg.registryPath
          });
          console.log(`  ❌ ${pkg.name}: ${result.reason.message}`);
        }
      }
    }

    return results;
  }

  /**
   * Generate registry for a single package
   */
  async generateSinglePackageRegistry(pkg) {
    try {
      // Use existing extraction logic to build package registry
      const extractResult = await runExtract(pkg.sourcePath, {
        out: pkg.outputPath,
        json: true,
        verbose: false,
        includeStories: false
      });

      // Enhance registry with package-specific metadata
      const packageRegistry = {
        ...extractResult.registry,
        name: pkg.name,
        version: pkg.version,
        type: 'package',
        parent: '../../registry.json',
        monorepo: {
          package: pkg.name,
          relativePath: pkg.relativePath,
          sourcePath: pkg.sourcePath
        },
        metadata: {
          ...extractResult.registry.metadata,
          packageGenerated: true,
          parentMonorepo: true
        }
      };

      // Write package registry
      await fs.writeFile(pkg.registryPath, JSON.stringify(packageRegistry, null, 2));

      return packageRegistry;

    } catch (error) {
      throw new Error(`Failed to generate registry for ${pkg.name}: ${error.message}`);
    }
  }

  /**
   * Generate root registry with package references
   */
  async generateRootRegistry(analysis, packageResults, plan) {
    const successfulPackages = packageResults.filter(result => result.success);
    
    const rootRegistry = {
      name: analysis.workspaceConfig?.config?.name || 'Enterprise Design System',
      version: '1.0.0',
      description: `Nested registry for ${analysis.metadata.totalPackages} package monorepo`,
      type: 'monorepo-root',
      packages: {},
      summary: {
        totalPackages: packageResults.length,
        successfulPackages: successfulPackages.length,
        totalComponents: 0,
        packageTypes: {}
      },
      index: {},
      metadata: {
        generatedAt: new Date().toISOString(),
        sourceMonorepo: analysis.root,
        workspaceType: analysis.workspaceConfig?.type,
        packageManager: analysis.packageManager,
        generator: 'dcp-nested-registry-generator',
        version: '2.0.0'
      }
    };

    // Build package references and component index
    for (const result of successfulPackages) {
      const pkgName = result.package;
      const pkgRelativePath = `./packages/${this.sanitizePackageName(pkgName)}`;
      
      rootRegistry.packages[pkgName] = {
        name: pkgName,
        path: pkgRelativePath,
        registry: `${pkgRelativePath}/registry.json`,
        version: result.registry.version || '1.0.0',
        componentCount: result.registry.components?.length || 0,
        lastModified: result.registry.lastModified,
        components: (result.registry.components || []).map(comp => comp.name)
      };

      // Build component index for fast lookups
      for (const component of result.registry.components || []) {
        rootRegistry.index[component.name] = {
          package: pkgName,
          registry: `${pkgRelativePath}/registry.json`,
          type: component.type
        };
      }

      // Update summary
      rootRegistry.summary.totalComponents += result.registry.components?.length || 0;
      
      const pkgType = this.inferPackageType(pkgName);
      rootRegistry.summary.packageTypes[pkgType] = (rootRegistry.summary.packageTypes[pkgType] || 0) + 1;
    }

    return rootRegistry;
  }

  /**
   * Generate component index for fast cross-package lookups
   */
  generateComponentIndex(packageResults) {
    const index = {
      components: {},
      packages: {},
      metadata: {
        generatedAt: new Date().toISOString(),
        totalComponents: 0,
        totalPackages: packageResults.filter(r => r.success).length
      }
    };

    for (const result of packageResults.filter(r => r.success)) {
      const pkgName = result.package;
      index.packages[pkgName] = {
        componentCount: result.registry.components?.length || 0,
        registry: `./packages/${this.sanitizePackageName(pkgName)}/registry.json`
      };

      for (const component of result.registry.components || []) {
        index.components[component.name] = {
          package: pkgName,
          type: component.type,
          category: component.category,
          registry: `./packages/${this.sanitizePackageName(pkgName)}/registry.json`
        };
        index.metadata.totalComponents++;
      }
    }

    return index;
  }

  /**
   * Generate summary of generation results
   */
  generateSummary(packageResults, rootRegistry) {
    const successful = packageResults.filter(r => r.success);
    const failed = packageResults.filter(r => !r.success);

    return {
      packages: {
        total: packageResults.length,
        successful: successful.length,
        failed: failed.length
      },
      components: {
        total: rootRegistry.summary.totalComponents,
        averagePerPackage: Math.round(rootRegistry.summary.totalComponents / successful.length)
      },
      performance: {
        parallelGeneration: true,
        concurrency: this.options.concurrency
      },
      failedPackages: failed.map(f => ({ name: f.package, error: f.error }))
    };
  }

  /**
   * Sanitize package name for file system usage
   */
  sanitizePackageName(packageName) {
    return packageName.replace(/[@\/]/g, '-').replace(/^-+/, '');
  }

  /**
   * Infer package type from name for categorization
   */
  inferPackageType(packageName) {
    if (packageName.includes('react-')) return 'react-component';
    if (packageName.includes('vue-')) return 'vue-component';
    if (packageName.includes('tokens')) return 'design-tokens';
    if (packageName.includes('theme')) return 'theming';
    if (packageName.includes('utils')) return 'utilities';
    if (packageName.includes('icons')) return 'icons';
    return 'component';
  }
}

export default NestedRegistryGenerator;