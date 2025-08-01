/**
 * Project Validator - Ensures projects are properly configured for DCP extraction
 * 
 * Validates project structure, detects missing configuration files,
 * and provides actionable setup guidance.
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export class ProjectValidator {
  constructor(projectPath, options = {}) {
    this.projectPath = path.resolve(projectPath);

    // Determine whether validator should emit console logs.
    // Priority order:
    //   1. Explicit option { silent: boolean }
    //   2. Presence of --json flag in the CLI args implies silent output
    //      (we only want pure JSON to be written to stdout)
    //   3. Default (show logs)
    this.silent = typeof options.silent === 'boolean'
      ? options.silent
      : process.argv.includes('--json');

    this.issues = [];
    this.warnings = [];
    this.suggestions = [];

    // Helper bound logger that respects silent mode
    this.log = (...args) => {
      if (!this.silent) {
        // eslint-disable-next-line no-console
        console.log(...args);
      }
    };
  }

  async validate() {
    this.log(chalk.blue(`🔍 Validating project structure: ${this.projectPath}`));
    
    await this.validateProjectRoot();
    await this.validateThemeConfiguration();
    await this.validateTailwindSetup();
    await this.validateComponentStructure();
    
    return await this.generateReport();
  }

  async validateProjectRoot() {
    const rootIndicators = [
      'package.json',
      'tsconfig.json', 
      'next.config.js',
      'next.config.ts',
      'vite.config.js',
      'vite.config.ts'
    ];

    let hasRootIndicator = false;
    
    for (const indicator of rootIndicators) {
      const indicatorPath = path.join(this.projectPath, indicator);
      try {
        await fs.access(indicatorPath);
        hasRootIndicator = true;
        break;
      } catch {}
    }

    if (!hasRootIndicator) {
      this.issues.push({
        type: 'missing-project-root',
        severity: 'error',
        message: 'No project root indicators found (package.json, tsconfig.json, etc.)',
        suggestion: 'Make sure you\'re running DCP from the project root directory, not a subdirectory like /src'
      });
    }
  }

  async validateThemeConfiguration() {
    // Check for ShadCN/UI components.json
    const componentsJsonPath = path.join(this.projectPath, 'components.json');
    let hasShadcnConfig = false;
    
    try {
      const componentsJson = await fs.readFile(componentsJsonPath, 'utf-8');
      const config = JSON.parse(componentsJson);
      
      // Validate it's actually a ShadCN config, not a DCP output file
      if (config.style || config.tailwind || config.aliases) {
        hasShadcnConfig = true;
        this.log(chalk.green('   ✅ Found ShadCN components.json configuration'));
        
        // Validate the configuration structure
        await this.validateShadcnConfig(config);
      } else if (config.success || config.components) {
        this.warnings.push({
          type: 'shadcn-config-overwritten',
          severity: 'warning',
          message: 'components.json appears to be a DCP output file, not ShadCN config',
          suggestion: 'The ShadCN components.json may have been overwritten. Consider restoring it.'
        });
      }
    } catch (error) {
      // No components.json found
    }

    // Check for CSS variables in common locations
    const cssLocations = [
      'app/globals.css',
      'src/app/globals.css',
      'styles/globals.css',
      'src/styles/globals.css',
      'src/index.css',
      'public/styles.css'
    ];

    let foundCssVariables = false;
    
    for (const cssLocation of cssLocations) {
      const cssPath = path.join(this.projectPath, cssLocation);
      try {
        const cssContent = await fs.readFile(cssPath, 'utf-8');
        if (cssContent.includes('--primary') || cssContent.includes(':root')) {
          foundCssVariables = true;
          this.log(chalk.green(`   ✅ Found CSS variables in ${cssLocation}`));
          break;
        }
      } catch {}
    }

    // 🎯 Discovery-focused approach: What can we extract?
    if (hasShadcnConfig) {
      this.log(chalk.green('   🎯 Can extract with ShadCN adaptor (optimal setup)'));
    } else if (foundCssVariables) {
      this.log(chalk.yellow('   🎯 Can extract CSS variables directly (good setup)'));
      this.suggestions.push({
        type: 'enhance-with-shadcn',
        severity: 'info',
        message: 'CSS variables detected - extraction possible',
        suggestion: 'Optional: Add components.json for enhanced ShadCN compatibility',
        autoFix: true,
        fixData: { cssLocations: cssLocations.filter(loc => this.fileExists(path.join(this.projectPath, loc))) }
      });
    } else {
      this.suggestions.push({
        type: 'setup-styling-system',
        severity: 'info',
        message: 'No theme system detected',
        suggestion: 'DCP can still extract components. For design tokens, consider adding CSS variables or ShadCN/UI'
      });
    }
  }

  async validateShadcnConfig(config) {
    const requiredFields = ['tailwind', 'aliases'];
    const tailwindFields = ['config', 'css'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        this.warnings.push({
          type: 'incomplete-shadcn-config',
          severity: 'warning',
          message: `Missing '${field}' in components.json`,
          suggestion: `Add ${field} configuration to components.json`
        });
      }
    }

    if (config.tailwind) {
      for (const field of tailwindFields) {
        if (!config.tailwind[field]) {
          this.warnings.push({
            type: 'incomplete-tailwind-config',
            severity: 'warning',
            message: `Missing 'tailwind.${field}' in components.json`,
            suggestion: `Add tailwind.${field} path to components.json`
          });
        }
      }

      // Validate that referenced files exist
      if (config.tailwind.config) {
        const tailwindConfigPath = path.join(this.projectPath, config.tailwind.config);
        try {
          await fs.access(tailwindConfigPath);
        } catch {
          this.issues.push({
            type: 'missing-tailwind-config',
            severity: 'error',
            message: `Tailwind config not found: ${config.tailwind.config}`,
            suggestion: `Create ${config.tailwind.config} or update the path in components.json`
          });
        }
      }

      if (config.tailwind.css) {
        const cssPath = path.join(this.projectPath, config.tailwind.css);
        try {
          await fs.access(cssPath);
        } catch {
          this.issues.push({
            type: 'missing-css-file',
            severity: 'error',
            message: `CSS file not found: ${config.tailwind.css}`,
            suggestion: `Create ${config.tailwind.css} or update the path in components.json`
          });
        }
      }
    }
  }

  async validateTailwindSetup() {
    const tailwindConfigs = [
      'tailwind.config.js',
      'tailwind.config.ts',
      'tailwind.config.mjs'
    ];

    let foundTailwindConfig = false;
    
    for (const configFile of tailwindConfigs) {
      const configPath = path.join(this.projectPath, configFile);
      try {
        await fs.access(configPath);
        foundTailwindConfig = true;
        this.log(chalk.green(`   ✅ Found Tailwind config: ${configFile}`));
        
        // Validate Tailwind config content
        await this.validateTailwindConfigContent(configPath);
        break;
      } catch {}
    }

    if (!foundTailwindConfig) {
      this.suggestions.push({
        type: 'optional-tailwind-config',
        severity: 'info',
        message: 'No Tailwind configuration detected',
        suggestion: 'Optional: Add Tailwind CSS for enhanced utility class detection'
      });
    } else {
      this.log(chalk.green('   🎯 Can extract Tailwind utility classes'));
    }
  }

  async validateTailwindConfigContent(configPath) {
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      
      // Check for CSS variables setup
      if (!configContent.includes('hsl(var(') && !configContent.includes('cssVariables')) {
        this.suggestions.push({
          type: 'enhance-tailwind-config',
          severity: 'info',
          message: 'Tailwind config could be enhanced for better CSS variable support',
          suggestion: 'Consider adding CSS variable mappings to Tailwind theme.extend.colors'
        });
      }

      // Check for content paths
      if (!configContent.includes('./src/') && !configContent.includes('./app/') && !configContent.includes('./components/')) {
        this.warnings.push({
          type: 'tailwind-content-paths',
          severity: 'warning',
          message: 'Tailwind content paths may not include all component directories',
          suggestion: 'Ensure content array includes paths to all your components'
        });
      }

    } catch (error) {
      this.warnings.push({
        type: 'tailwind-config-read-error',
        severity: 'warning',
        message: `Could not validate Tailwind config: ${error.message}`,
        suggestion: 'Check Tailwind config file syntax and permissions'
      });
    }
  }

  async validateComponentStructure() {
    const componentDirs = [
      'components',
      'src/components',
      'app/components',
      'lib/components'
    ];

    let foundComponents = false;
    let componentCount = 0;

    for (const dir of componentDirs) {
      const componentPath = path.join(this.projectPath, dir);
      try {
        const stats = await fs.stat(componentPath);
        if (stats.isDirectory()) {
          const files = await this.countComponentFiles(componentPath);
          if (files > 0) {
            foundComponents = true;
            componentCount += files;
            this.log(chalk.green(`   ✅ Found ${files} component files in ${dir}/`));
          }
        }
      } catch {}
    }

    if (!foundComponents) {
      this.warnings.push({
        type: 'no-components-found',
        severity: 'warning',
        message: 'No React components found in common directories',
        suggestion: 'Ensure components are in standard directories (components/, src/components/, etc.)'
      });
    } else if (componentCount < 5) {
      this.suggestions.push({
        type: 'few-components',
        severity: 'info',
        message: `Only ${componentCount} components found`,
        suggestion: 'DCP extraction works best with larger component libraries'
      });
    }
  }

  async countComponentFiles(dirPath) {
    let count = 0;
    try {
      const files = await fs.readdir(dirPath, { recursive: true });
      for (const file of files) {
        if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
          count++;
        }
      }
    } catch {}
    return count;
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async generateReport() {
    // 🎯 Discovery phase: What can we actually extract?
    const extractionCapabilities = await this.assessExtractionCapabilities();
    
    const hasErrors = this.issues.filter(i => i.severity === 'error').length > 0;
    const hasWarnings = this.warnings.length > 0;
    
    this.log('\n' + chalk.blue('📋 Project Validation Report'));
    this.log('='.repeat(50));
    
    // Show extraction capabilities first
    this.log(chalk.green('\n🎯 Extraction Capabilities:'));
    for (const capability of extractionCapabilities) {
      this.log(chalk.green(`   ✅ ${capability}`));
    }

    // Show errors
    const errors = this.issues.filter(i => i.severity === 'error');
    if (errors.length > 0) {
      this.log(chalk.red(`\n❌ Errors (${errors.length}):`));
      for (const error of errors) {
        this.log(chalk.red(`   • ${error.message}`));
        this.log(chalk.gray(`     💡 ${error.suggestion}`));
        if (error.autoFix) {
          this.log(chalk.yellow(`     🔧 Auto-fix available`));
        }
      }
    }

    // Show warnings
    if (this.warnings.length > 0) {
      this.log(chalk.yellow(`\n⚠️  Warnings (${this.warnings.length}):`));
      for (const warning of this.warnings) {
        this.log(chalk.yellow(`   • ${warning.message}`));
        this.log(chalk.gray(`     💡 ${warning.suggestion}`));
      }
    }

    // Show suggestions
    if (this.suggestions.length > 0) {
      this.log(chalk.cyan(`\n💡 Suggestions (${this.suggestions.length}):`));
      for (const suggestion of this.suggestions) {
        this.log(chalk.cyan(`   • ${suggestion.message}`));
        this.log(chalk.gray(`     💡 ${suggestion.suggestion}`));
      }
    }

    // Summary
    if (!hasErrors && !hasWarnings) {
      this.log(chalk.green('\n✅ Project validation passed! Ready for DCP extraction.'));
    } else if (!hasErrors) {
      this.log(chalk.yellow('\n⚠️  Project has warnings but can proceed with extraction.'));
    } else {
      this.log(chalk.red('\n❌ Project has errors that should be resolved for optimal extraction.'));
    }

    // 🎯 DCP should proceed if we can extract ANYTHING
    const canExtract = extractionCapabilities.length > 0;
    
    return {
      valid: !hasErrors,
      canProceed: canExtract, // ✅ Based on extraction capabilities, not configuration!
      extractionCapabilities,
      issues: this.issues,
      warnings: this.warnings,
      suggestions: this.suggestions,
      summary: {
        errors: errors.length,
        warnings: this.warnings.length,
        suggestions: this.suggestions.length,
        canExtract: extractionCapabilities.length
      }
    };
  }

  /**
   * 🎯 Discovery-focused: What can we actually extract from this project?
   */
  async assessExtractionCapabilities() {
    const capabilities = [];
    
    try {
      // Check for React/TSX components
      const reactFiles = await this.glob('**/*.{tsx,jsx}', { ignore: ['node_modules/**', '.next/**', 'dist/**'] });
      if (reactFiles.length > 0) {
        capabilities.push(`React components (${reactFiles.length} files)`);
      }
      
      // Check for Vue components  
      const vueFiles = await this.glob('**/*.vue', { ignore: ['node_modules/**', 'dist/**'] });
      if (vueFiles.length > 0) {
        capabilities.push(`Vue components (${vueFiles.length} files)`);
      }
      
      // Check for Svelte components
      const svelteFiles = await this.glob('**/*.svelte', { ignore: ['node_modules/**', 'dist/**'] });
      if (svelteFiles.length > 0) {
        capabilities.push(`Svelte components (${svelteFiles.length} files)`);
      }
      
      // Check for CSS files with potential design tokens
      const cssFiles = await this.glob('**/*.{css,scss,sass}', { ignore: ['node_modules/**', 'dist/**'] });
      if (cssFiles.length > 0) {
        capabilities.push(`Stylesheets (${cssFiles.length} files)`);
      }
      
      // Check for design tokens specifically
      const hasCustomProperties = await this.checkForCssVariables(cssFiles);
      if (hasCustomProperties) {
        capabilities.push('CSS custom properties (design tokens)');
      }
      
      // Check for Tailwind classes in components
      if (reactFiles.length > 0 || vueFiles.length > 0) {
        const hasTailwindClasses = await this.checkForTailwindClasses([...reactFiles, ...vueFiles]);
        if (hasTailwindClasses) {
          capabilities.push('Tailwind utility classes');
        }
      }
      
      // Check for Storybook stories
      const storyFiles = await this.glob('**/*.stories.{js,ts,jsx,tsx}', { ignore: ['node_modules/**'] });
      if (storyFiles.length > 0) {
        capabilities.push(`Storybook stories (${storyFiles.length} files)`);
      }
      
    } catch (error) {
      this.log(chalk.yellow(`   ⚠️  Could not assess all capabilities: ${error.message}`));
    }
    
    return capabilities;
  }

  async glob(pattern, options = {}) {
    const { glob } = await import('glob');
    return glob(pattern, { cwd: this.projectPath, ...options });
  }

  async checkForCssVariables(cssFiles) {
    for (const file of cssFiles.slice(0, 10)) { // Check first 10 files
      try {
        const content = await fs.readFile(path.join(this.projectPath, file), 'utf-8');
        if (content.includes('--') && (content.includes('var(') || content.includes('hsl('))) {
          return true;
        }
      } catch {}
    }
    return false;
  }

  async checkForTailwindClasses(componentFiles) {
    const tailwindPatterns = /class.*=.*"[^"]*(?:bg-|text-|p-|m-|flex|grid|w-|h-)/;
    for (const file of componentFiles.slice(0, 10)) { // Check first 10 files
      try {
        const content = await fs.readFile(path.join(this.projectPath, file), 'utf-8');
        if (tailwindPatterns.test(content)) {
          return true;
        }
      } catch {}
    }
    return false;
  }

  /**
   * Auto-fix common issues
   */
  async autoFix() {
    this.log(chalk.blue('\n🔧 Attempting to auto-fix issues...'));
    
    for (const issue of this.issues.filter(i => i.autoFix)) {
      if (issue.type === 'missing-shadcn-config') {
        await this.createShadcnConfig(issue.fixData);
      }
    }
  }

  async createShadcnConfig(fixData) {
    const componentsJsonPath = path.join(this.projectPath, 'components.json');
    
    // Detect best configuration based on project structure
    let tailwindConfig = 'tailwind.config.js';
    let cssPath = 'src/app/globals.css';
    
    // Try to find actual Tailwind config
    const tailwindConfigs = ['tailwind.config.ts', 'tailwind.config.js', 'tailwind.config.mjs'];
    for (const config of tailwindConfigs) {
      if (await this.fileExists(path.join(this.projectPath, config))) {
        tailwindConfig = config;
        break;
      }
    }

    // Try to find actual CSS file
    const cssLocations = [
      'src/app/globals.css',
      'app/globals.css', 
      'src/styles/globals.css',
      'styles/globals.css'
    ];
    for (const css of cssLocations) {
      if (await this.fileExists(path.join(this.projectPath, css))) {
        cssPath = css;
        break;
      }
    }

    const shadcnConfig = {
      "$schema": "https://ui.shadcn.com/schema.json",
      "style": "default",
      "rsc": true,
      "tsx": true,
      "tailwind": {
        "config": tailwindConfig,
        "css": cssPath,
        "baseColor": "neutral",
        "cssVariables": true,
        "prefix": ""
      },
      "aliases": {
        "components": "src/components",
        "utils": "src/lib/utils",
        "ui": "src/components/ui"
      }
    };

    try {
      await fs.writeFile(componentsJsonPath, JSON.stringify(shadcnConfig, null, 2));
      this.log(chalk.green(`   ✅ Created components.json configuration`));
      this.log(chalk.gray(`      Config: ${tailwindConfig}`));
      this.log(chalk.gray(`      CSS: ${cssPath}`));
      return true;
    } catch (error) {
      this.log(chalk.red(`   ❌ Failed to create components.json: ${error.message}`));
      return false;
    }
  }
}