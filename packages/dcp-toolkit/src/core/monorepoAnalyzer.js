/**
 * Monorepo Structure Analyzer - Detects and maps monorepo architectures
 * 
 * Handles multiple monorepo patterns:
 * - npm/yarn workspaces  
 * - Lerna
 * - Rush
 * - Nx
 * - Custom workspace configurations
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

export class MonorepoAnalyzer {
  constructor(options = {}) {
    this.options = {
      maxDepth: 3,
      packageNamePatterns: ['package.json'],
      ...options
    };
  }

  /**
   * Analyze project structure and determine if it's a monorepo
   */
  async analyzeProject(rootPath) {
    const absoluteRoot = path.resolve(rootPath);
    
    const analysis = {
      type: 'single',
      root: absoluteRoot,
      packages: [],
      workspaceConfig: null,
      packageManager: await this.detectPackageManager(absoluteRoot),
      metadata: {
        analyzedAt: new Date().toISOString(),
        totalPackages: 0,
        structure: 'unknown'
      }
    };

    // Check for workspace configuration
    const workspaceConfig = await this.detectWorkspaceConfig(absoluteRoot);
    if (workspaceConfig) {
      analysis.type = 'monorepo';
      analysis.workspaceConfig = workspaceConfig;
      analysis.packages = await this.findPackages(absoluteRoot, workspaceConfig);
      analysis.metadata.totalPackages = analysis.packages.length;
      analysis.metadata.structure = workspaceConfig.type;
    }

    return analysis;
  }

  /**
   * Detect workspace configuration type and settings
   */
  async detectWorkspaceConfig(rootPath) {
    const configChecks = [
      { file: 'package.json', type: 'npm-workspaces', parser: this.parseNpmWorkspaces },
      { file: 'lerna.json', type: 'lerna', parser: this.parseLernaConfig },
      { file: 'rush.json', type: 'rush', parser: this.parseRushConfig },
      { file: 'nx.json', type: 'nx', parser: this.parseNxConfig },
      { file: 'pnpm-workspace.yaml', type: 'pnpm', parser: this.parsePnpmWorkspace }
    ];

    for (const check of configChecks) {
      const configPath = path.join(rootPath, check.file);
      try {
        const content = await fs.readFile(configPath, 'utf8');
        const config = await check.parser.call(this, content, rootPath);
        if (config) {
          return { type: check.type, ...config };
        }
      } catch (error) {
        // File doesn't exist or can't be parsed, continue
      }
    }

    return null;
  }

  /**
   * Find all packages in the monorepo based on workspace config
   */
  async findPackages(rootPath, workspaceConfig) {
    const packages = [];
    const patterns = workspaceConfig.patterns || ['packages/*'];

    for (const pattern of patterns) {
      const fullPattern = path.join(rootPath, pattern, 'package.json');
      const packageJsonFiles = await glob(fullPattern);

      for (const packageJsonPath of packageJsonFiles) {
        const packageDir = path.dirname(packageJsonPath);
        const packageInfo = await this.analyzePackage(packageDir, rootPath);
        if (packageInfo) {
          packages.push(packageInfo);
        }
      }
    }

    return packages.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Analyze individual package structure
   */
  async analyzePackage(packagePath, rootPath) {
    try {
      const packageJsonPath = path.join(packagePath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      const relativePath = path.relative(rootPath, packagePath);
      const componentEntries = await this.findComponentEntries(packagePath);

      return {
        name: packageJson.name,
        version: packageJson.version,
        path: packagePath,
        relativePath,
        packageJson: packageJsonPath,
        componentEntries,
        hasComponents: componentEntries.length > 0,
        metadata: {
          dependencies: Object.keys(packageJson.dependencies || {}),
          scripts: Object.keys(packageJson.scripts || {}),
          main: packageJson.main,
          types: packageJson.types
        }
      };
    } catch (error) {
      console.warn(`Failed to analyze package at ${packagePath}:`, error.message);
      return null;
    }
  }

  /**
   * Find component entry points within a package
   */
  async findComponentEntries(packagePath) {
    const entries = [];
    
    // Common patterns for component entry points
    const entryPatterns = [
      'src/components/**/index.{ts,tsx,js,jsx}',
      'library/src/components/**/index.{ts,tsx}',  // FluentUI pattern
      'src/**/index.{ts,tsx,js,jsx}',
      'lib/components/**/index.{ts,tsx,js,jsx}'
    ];

    for (const pattern of entryPatterns) {
      const fullPattern = path.join(packagePath, pattern);
      const files = await glob(fullPattern);
      
      for (const file of files) {
        const componentName = await this.inferComponentName(file);  
        if (componentName) {
          entries.push({
            componentName,
            entryFile: file,
            relativePath: path.relative(packagePath, file)
          });
        }
      }
    }

    return entries;
  }

  /**
   * Infer component name from file path
   */
  async inferComponentName(filePath) {
    const dir = path.dirname(filePath);
    const componentName = path.basename(dir);
    
    // Check if this looks like a component (PascalCase)
    if (/^[A-Z][a-zA-Z0-9]*$/.test(componentName)) {
      return componentName;
    }
    
    // Try to extract from file content if needed
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const exportMatch = content.match(/export\s+(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/);
      if (exportMatch) {
        return exportMatch[1];
      }
    } catch (error) {
      // Ignore file read errors
    }

    return null;
  }

  /**
   * Detect package manager being used
   */
  async detectPackageManager(rootPath) {
    const lockFiles = [
      { file: 'package-lock.json', manager: 'npm' },
      { file: 'yarn.lock', manager: 'yarn' },
      { file: 'pnpm-lock.yaml', manager: 'pnpm' }
    ];

    for (const lock of lockFiles) {
      try {
        await fs.access(path.join(rootPath, lock.file));
        return lock.manager;
      } catch {
        // File doesn't exist
      }
    }

    return 'npm'; // default
  }

  // Configuration parsers for different monorepo tools

  async parseNpmWorkspaces(content, rootPath) {
    try {
      const packageJson = JSON.parse(content);
      if (packageJson.workspaces) {
        const patterns = Array.isArray(packageJson.workspaces) 
          ? packageJson.workspaces 
          : packageJson.workspaces.packages || [];
        
        return {
          patterns,
          tool: 'npm',
          config: packageJson.workspaces
        };
      }
    } catch (error) {
      // Invalid JSON
    }
    return null;
  }

  async parseLernaConfig(content, rootPath) {
    try {
      const lernaJson = JSON.parse(content);
      return {
        patterns: lernaJson.packages || ['packages/*'],
        tool: 'lerna',
        config: lernaJson
      };
    } catch (error) {
      // Invalid JSON
    }
    return null;
  }

  async parseRushConfig(content, rootPath) {
    try {
      const rushJson = JSON.parse(content);
      const patterns = rushJson.projects?.map(p => p.projectFolder) || [];
      return {
        patterns,
        tool: 'rush',
        config: rushJson
      };
    } catch (error) {
      // Invalid JSON
    }
    return null;
  }

  async parseNxConfig(content, rootPath) {
    try {
      const nxJson = JSON.parse(content);
      // Nx typically uses project.json files, need to glob for those
      return {
        patterns: ['apps/*', 'libs/*', 'packages/*'], // Common Nx patterns
        tool: 'nx',
        config: nxJson
      };
    } catch (error) {
      // Invalid JSON
    }
    return null;
  }

  async parsePnpmWorkspace(content, rootPath) {
    try {
      // PNPM workspace uses YAML
      const lines = content.split('\n');
      const packagesLine = lines.find(line => line.trim().startsWith('packages:'));
      if (packagesLine) {
        // Simple YAML parsing for packages array
        const patterns = lines
          .slice(lines.indexOf(packagesLine) + 1)
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().substring(1).trim().replace(/['"]/g, ''));
        
        return {
          patterns,
          tool: 'pnpm',
          config: { packages: patterns }
        };
      }
    } catch (error) {
      // Invalid YAML
    }
    return null;
  }

  /**
   * Generate registry plan based on monorepo structure
   */
  generateRegistryPlan(analysis) {
    if (analysis.type === 'single') {
      return {
        type: 'single',
        registryPath: path.join(analysis.root, 'registry.json'),
        extractionPlan: {
          source: analysis.root,
          output: path.join(analysis.root, 'registry.json')
        }
      };
    }

    // Nested registry plan for monorepo
    const plan = {
      type: 'nested',
      rootRegistry: path.join(analysis.root, 'registry.json'),
      packageRegistries: [],
      extractionPlan: {
        parallel: true,
        packages: []
      }
    };

    for (const pkg of analysis.packages) {
      if (pkg.hasComponents) {
        const registryPath = path.join(pkg.path, 'registry.json');
        plan.packageRegistries.push({
          package: pkg.name,
          path: registryPath,
          componentCount: pkg.componentEntries.length
        });
        
        plan.extractionPlan.packages.push({
          name: pkg.name,
          source: pkg.path,
          output: registryPath,
          components: pkg.componentEntries
        });
      }
    }

    return plan;
  }
}

export default MonorepoAnalyzer;