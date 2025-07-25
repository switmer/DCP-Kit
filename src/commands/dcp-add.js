#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * DCP Add - Consumer CLI for Installing Components
 * 
 * Installs components from DCP registries with one command.
 * Downloads component source, demos, and docs into your project.
 * 
 * Features:
 * - Fetch component metadata from any registry URL
 * - Download and install component files
 * - Update package.json with peer dependencies
 * - Support for private registries with auth tokens
 * - Dry-run mode for preview before install
 * - TypeScript and JavaScript project support
 */

export async function runDcpAdd(componentUrl, options = {}) {
  const {
    target = './components/ui',
    packageJson = './package.json',
    install = true,
    dryRun = false,
    force = false,
    verbose = false,
    token = null
  } = options;

  if (verbose) {
    console.log(chalk.blue(`📦 Installing component from ${componentUrl}`));
  }

  const installer = new ComponentInstaller({
    target,
    packageJson,
    install,
    dryRun,
    force,
    verbose,
    token
  });

  const result = await installer.install(componentUrl);
  
  if (!dryRun && verbose) {
    console.log(`\n✅ Component installed successfully:`);
    console.log(`   Name: ${chalk.green(result.component.name)}`);
    console.log(`   Files: ${result.files.length}`);
    console.log(`   Location: ${chalk.gray(result.targetDir)}`);
    if (result.peerDepsInstalled) {
      console.log(`   Dependencies: ${chalk.blue('Updated')}`);
    }
  }

  return result;
}

class ComponentInstaller {
  constructor(options) {
    this.target = path.resolve(options.target);
    this.packageJsonPath = path.resolve(options.packageJson);
    this.install = options.install;
    this.dryRun = options.dryRun;
    this.force = options.force;
    this.verbose = options.verbose;
    this.token = options.token;
    
    this.installedFiles = [];
    this.errors = [];
  }

  async install(componentUrl) {
    // Parse component URL
    const urlInfo = this.parseComponentUrl(componentUrl);
    
    if (this.verbose) {
      console.log(`   Registry: ${urlInfo.registry}`);
      console.log(`   Component: ${urlInfo.component}`);
      if (urlInfo.version) {
        console.log(`   Version: ${urlInfo.version}`);
      }
    }

    // Fetch component metadata
    const component = await this.fetchComponent(componentUrl);
    
    // Determine target directory
    const targetDir = path.join(this.target, component.name);
    
    // Check if component already exists
    if (!this.force) {
      await this.checkExistingComponent(targetDir, component.name);
    }

    if (this.dryRun) {
      return this.previewInstall(component, targetDir);
    }

    // Create target directory
    await fs.mkdir(targetDir, { recursive: true });

    // Download and install component files
    const files = await this.downloadComponentFiles(component, targetDir);

    // Update package.json with peer dependencies
    let peerDepsInstalled = false;
    if (this.install && component.peerDependencies) {
      peerDepsInstalled = await this.updatePackageJson(component.peerDependencies);
    }

    return {
      success: true,
      component: {
        name: component.name,
        version: component.version,
        title: component.title
      },
      targetDir,
      files: files.length,
      peerDepsInstalled,
      installedFiles: files
    };
  }

  parseComponentUrl(url) {
    // Handle different URL formats:
    // https://registry.com/r/ui/button
    // https://registry.com/r/ui/button@1.0.0
    // /r/ui/button (relative to current registry)
    
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts[0] === 'r' && pathParts.length >= 3) {
        const namespace = pathParts[1];
        const componentWithVersion = pathParts[2];
        const [component, version] = componentWithVersion.split('@');
        
        return {
          registry: `${urlObj.protocol}//${urlObj.host}`,
          namespace,
          component,
          version,
          fullUrl: url
        };
      }
    } catch {
      // Try relative URL format
      if (url.startsWith('/r/')) {
        const pathParts = url.split('/').filter(Boolean);
        if (pathParts.length >= 3) {
          const namespace = pathParts[1];
          const componentWithVersion = pathParts[2];
          const [component, version] = componentWithVersion.split('@');
          
          return {
            registry: null, // Will need to be provided by context
            namespace,
            component,
            version,
            fullUrl: url
          };
        }
      }
    }

    throw new Error(`Invalid component URL format: ${url}`);
  }

  async fetchComponent(url) {
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'dcp-add/1.0.0'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Use --token option for private registries.');
        }
        if (response.status === 404) {
          throw new Error(`Component not found: ${url}`);
        }
        throw new Error(`Failed to fetch component: ${response.status} ${response.statusText}`);
      }

      const component = await response.json();
      
      // Validate component metadata
      if (!component.name || !component.files) {
        throw new Error('Invalid component metadata: missing name or files');
      }

      return component;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`Network error: Cannot connect to ${url}`);
      }
      throw error;
    }
  }

  async checkExistingComponent(targetDir, componentName) {
    try {
      await fs.access(targetDir);
      
      // Directory exists - check if it contains component files
      const entries = await fs.readdir(targetDir);
      if (entries.length > 0) {
        throw new Error(
          `Component '${componentName}' already exists at ${targetDir}. Use --force to overwrite.`
        );
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist, which is fine
    }
  }

  async downloadComponentFiles(component, targetDir) {
    const files = [];

    for (const [fileName, fileUrl] of Object.entries(component.files)) {
      try {
        if (this.verbose) {
          console.log(`   Downloading ${fileName}...`);
        }

        const content = await this.downloadFile(fileUrl);
        const filePath = path.join(targetDir, fileName);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Write file
        await fs.writeFile(filePath, content);
        
        files.push({
          name: fileName,
          path: filePath,
          size: content.length
        });

        if (this.verbose) {
          console.log(`     ✓ ${fileName} (${this.formatBytes(content.length)})`);
        }
      } catch (error) {
        this.errors.push({
          file: fileName,
          error: error.message
        });
        
        if (this.verbose) {
          console.log(`     ✗ ${fileName}: ${error.message}`);
        }
      }
    }

    return files;
  }

  async downloadFile(url) {
    const headers = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  async updatePackageJson(peerDependencies) {
    try {
      // Read current package.json
      const packageJsonContent = await fs.readFile(this.packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      // Check which dependencies are missing
      const currentDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };

      const missingDeps = [];
      for (const [dep, version] of Object.entries(peerDependencies)) {
        if (!currentDeps[dep]) {
          missingDeps.push(`${dep}@${version}`);
        }
      }

      if (missingDeps.length === 0) {
        if (this.verbose) {
          console.log(`   All peer dependencies already satisfied`);
        }
        return false;
      }

      if (this.dryRun) {
        console.log(`   Would install: ${missingDeps.join(', ')}`);
        return true;
      }

      // Detect package manager
      const packageManager = await this.detectPackageManager();
      
      if (this.verbose) {
        console.log(`   Installing dependencies with ${packageManager}...`);
      }

      // Install missing dependencies
      const installCmd = this.getInstallCommand(packageManager, missingDeps);
      
      try {
        execSync(installCmd, { 
          stdio: this.verbose ? 'inherit' : 'pipe',
          cwd: path.dirname(this.packageJsonPath)
        });
        
        if (this.verbose) {
          console.log(`     ✓ Installed ${missingDeps.length} dependencies`);
        }
        
        return true;
      } catch (error) {
        console.warn(`   ⚠️  Failed to install dependencies automatically`);
        console.log(`   Run manually: ${installCmd}`);
        return false;
      }
    } catch (error) {
      if (this.verbose) {
        console.warn(`   ⚠️  Could not update package.json: ${error.message}`);
      }
      return false;
    }
  }

  async detectPackageManager() {
    const cwd = path.dirname(this.packageJsonPath);
    
    // Check for lock files
    try {
      await fs.access(path.join(cwd, 'pnpm-lock.yaml'));
      return 'pnpm';
    } catch {}

    try {
      await fs.access(path.join(cwd, 'yarn.lock'));
      return 'yarn';
    } catch {}

    try {
      await fs.access(path.join(cwd, 'package-lock.json'));
      return 'npm';
    } catch {}

    // Default to npm
    return 'npm';
  }

  getInstallCommand(packageManager, dependencies) {
    const deps = dependencies.join(' ');
    
    switch (packageManager) {
      case 'pnpm':
        return `pnpm add ${deps}`;
      case 'yarn':
        return `yarn add ${deps}`;
      case 'npm':
      default:
        return `npm install ${deps}`;
    }
  }

  async previewInstall(component, targetDir) {
    console.log(chalk.yellow('\n🔍 Dry run - preview installation:'));
    console.log(`   Component: ${component.title || component.name}`);
    console.log(`   Target: ${targetDir}`);
    console.log(`   Files to download:`);
    
    for (const [fileName, fileUrl] of Object.entries(component.files)) {
      console.log(`     - ${fileName} (${fileUrl})`);
    }

    if (component.peerDependencies && Object.keys(component.peerDependencies).length > 0) {
      console.log(`   Peer dependencies:`);
      for (const [dep, version] of Object.entries(component.peerDependencies)) {
        console.log(`     - ${dep}@${version}`);
      }
    }

    return {
      success: true,
      dryRun: true,
      component: {
        name: component.name,
        version: component.version,
        title: component.title
      },
      targetDir,
      files: Object.keys(component.files).length,
      peerDepsInstalled: false
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const componentUrl = process.argv[2];
  
  if (!componentUrl) {
    console.error('Usage: dcp-add <component-url>');
    console.error('');
    console.error('Examples:');
    console.error('  dcp-add https://registry.example.com/r/ui/button');
    console.error('  dcp-add https://registry.example.com/r/ui/button@1.0.0');
    console.error('  dcp-add /r/ui/button --token abc123');
    process.exit(1);
  }

  try {
    const result = await runDcpAdd(componentUrl, {
      verbose: process.argv.includes('--verbose'),
      dryRun: process.argv.includes('--dry-run'),
      force: process.argv.includes('--force'),
      token: process.argv.includes('--token') ? 
        process.argv[process.argv.indexOf('--token') + 1] : null
    });
    
    if (result.success) {
      if (!result.dryRun) {
        console.log(`\n✅ Successfully installed ${result.component.name}`);
        console.log(`📁 Location: ${result.targetDir}`);
        
        if (result.peerDepsInstalled) {
          console.log(`📦 Dependencies updated`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Installation failed: ${error.message}`);
    process.exit(1);
  }
}