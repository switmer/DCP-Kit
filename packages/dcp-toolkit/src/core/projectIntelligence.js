/**
 * Project Intelligence Scanner
 * Analyzes project structure, environment, and setup requirements
 * for intelligent component onboarding
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

export class ProjectIntelligenceScanner {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.projectStructure = {};
    this.environment = {};
    this.dependencies = {};
    this.assets = {};
    this.setupInstructions = [];
    this.integrationChecklist = [];
  }

  /**
   * Main scan method - analyzes entire project context
   */
  async scan() {
    await Promise.all([
      this.scanProjectStructure(),
      this.scanEnvironment(),
      this.scanDependencies(),
      this.scanAssetUsage()
    ]);

    this.generateSetupInstructions();
    this.generateIntegrationChecklist();

    return {
      projectStructure: this.projectStructure,
      environment: this.environment,
      dependencies: this.dependencies,
      assets: this.assets,
      setupInstructions: this.setupInstructions,
      integrationChecklist: this.integrationChecklist,
      intelligence: this.generateIntelligenceSummary()
    };
  }

  /**
   * Scan project structure and conventions
   */
  async scanProjectStructure() {
    const structure = {
      detectedPaths: {},
      aliases: [],
      conventions: {},
      recommendations: []
    };

    // Detect common directories
    const commonPaths = [
      { key: 'components', patterns: ['components/**', 'src/components/**', 'app/components/**'] },
      { key: 'ui', patterns: ['components/ui/**', 'src/components/ui/**', 'app/ui/**'] },
      { key: 'lib', patterns: ['lib/**', 'src/lib/**', 'app/lib/**'] },
      { key: 'utils', patterns: ['utils/**', 'src/utils/**', 'app/utils/**'] },
      { key: 'styles', patterns: ['styles/**', 'src/styles/**', 'app/styles/**'] },
      { key: 'hooks', patterns: ['hooks/**', 'src/hooks/**', 'app/hooks/**'] },
      { key: 'types', patterns: ['types/**', 'src/types/**', 'app/types/**', '@types/**'] }
    ];

    for (const pathConfig of commonPaths) {
      for (const pattern of pathConfig.patterns) {
        try {
          const matches = await glob(pattern, { cwd: this.rootPath });
          if (matches.length > 0) {
            structure.detectedPaths[pathConfig.key] = {
              path: pattern.replace('/**', ''),
              count: matches.length,
              structure: matches.slice(0, 10) // Sample files
            };
            break;
          }
        } catch (error) {
          // Continue searching other patterns
        }
      }
    }

    // Detect TypeScript path aliases
    try {
      const tsconfigPath = path.join(this.rootPath, 'tsconfig.json');
      const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf8'));
      
      if (tsconfig.compilerOptions?.paths) {
        structure.aliases = Object.keys(tsconfig.compilerOptions.paths).map(alias => ({
          alias,
          resolves: tsconfig.compilerOptions.paths[alias]
        }));
      }
    } catch (error) {
      structure.recommendations.push('Consider adding tsconfig.json with path aliases for cleaner imports');
    }

    // Detect framework conventions
    structure.conventions = await this.detectFrameworkConventions();

    this.projectStructure = structure;
  }

  /**
   * Detect framework and tooling conventions
   */
  async detectFrameworkConventions() {
    const conventions = {
      framework: 'unknown',
      styling: [],
      testing: 'unknown',
      bundler: 'unknown',
      features: []
    };

    try {
      const packagePath = path.join(this.rootPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Detect framework
      if (allDeps.next) conventions.framework = 'Next.js';
      else if (allDeps.react) conventions.framework = 'React';
      else if (allDeps.vue) conventions.framework = 'Vue';
      else if (allDeps.svelte) conventions.framework = 'Svelte';

      // Detect styling approaches
      if (allDeps.tailwindcss) conventions.styling.push('Tailwind CSS');
      if (allDeps['styled-components']) conventions.styling.push('Styled Components');
      if (allDeps.emotion) conventions.styling.push('Emotion');
      if (allDeps.sass || allDeps.scss) conventions.styling.push('Sass/SCSS');

      // Detect testing
      if (allDeps.jest) conventions.testing = 'Jest';
      else if (allDeps.vitest) conventions.testing = 'Vitest';

      // Detect bundler
      if (allDeps.webpack) conventions.bundler = 'Webpack';
      else if (allDeps.vite) conventions.bundler = 'Vite';
      else if (allDeps.parcel) conventions.bundler = 'Parcel';

      // Detect special features
      if (allDeps.typescript) conventions.features.push('TypeScript');
      if (allDeps.storybook) conventions.features.push('Storybook');
      if (allDeps['framer-motion']) conventions.features.push('Framer Motion');
      if (allDeps['react-hook-form']) conventions.features.push('React Hook Form');

    } catch (error) {
      // Package.json not found or invalid
    }

    return conventions;
  }

  /**
   * Scan environment and setup requirements
   */
  async scanEnvironment() {
    const environment = {
      configFiles: {},
      missingFiles: [],
      nodeVersion: null,
      packageManager: 'npm'
    };

    // Check for essential config files
    const configFiles = [
      'package.json',
      'tsconfig.json',
      'tailwind.config.js',
      'tailwind.config.ts',
      'components.json',
      'next.config.js',
      'vite.config.js',
      '.eslintrc.json',
      'prettier.config.js'
    ];

    for (const configFile of configFiles) {
      try {
        const filePath = path.join(this.rootPath, configFile);
        await fs.access(filePath);
        environment.configFiles[configFile] = {
          exists: true,
          path: filePath
        };
      } catch (error) {
        environment.missingFiles.push(configFile);
      }
    }

    // Detect package manager
    try {
      await fs.access(path.join(this.rootPath, 'yarn.lock'));
      environment.packageManager = 'yarn';
    } catch (error) {
      try {
        await fs.access(path.join(this.rootPath, 'pnpm-lock.yaml'));
        environment.packageManager = 'pnpm';
      } catch (error) {
        environment.packageManager = 'npm';
      }
    }

    this.environment = environment;
  }

  /**
   * Scan dependencies and build dependency graph
   */
  async scanDependencies() {
    const dependencies = {
      required: [],
      missing: [],
      versions: {},
      graph: {},
      suggestions: []
    };

    try {
      const packagePath = path.join(this.rootPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Common component library dependencies
      const commonDeps = [
        { name: 'react', required: true },
        { name: 'typescript', required: false, suggestion: 'For better type safety' },
        { name: 'tailwindcss', required: false, suggestion: 'For utility-first styling' },
        { name: '@radix-ui/react-slot', required: false, suggestion: 'For flexible component composition' },
        { name: 'class-variance-authority', required: false, suggestion: 'For variant-driven components' },
        { name: 'clsx', required: false, suggestion: 'For conditional className composition' },
        { name: 'lucide-react', required: false, suggestion: 'For consistent iconography' },
        { name: 'framer-motion', required: false, suggestion: 'For smooth animations' }
      ];

      for (const dep of commonDeps) {
        if (allDeps[dep.name]) {
          dependencies.required.push(dep.name);
          dependencies.versions[dep.name] = allDeps[dep.name];
        } else if (dep.required) {
          dependencies.missing.push(dep.name);
        } else if (dep.suggestion) {
          dependencies.suggestions.push({
            package: dep.name,
            reason: dep.suggestion
          });
        }
      }

    } catch (error) {
      dependencies.missing.push('package.json');
    }

    this.dependencies = dependencies;
  }

  /**
   * Scan for asset usage patterns and requirements
   */
  async scanAssetUsage() {
    const assets = {
      imageProps: [],
      iconUsage: [],
      missingAssets: [],
      recommendations: []
    };

    // This would typically scan component files for asset patterns
    // For now, we'll provide intelligent defaults based on common patterns
    
    assets.recommendations = [
      'Use consistent image sizing (32x32, 64x64, etc.)',
      'Provide fallback images for missing avatars',
      'Consider using next/image for optimized loading',
      'Use SVG icons for better scalability'
    ];

    this.assets = assets;
  }

  /**
   * Generate setup instructions based on findings
   */
  generateSetupInstructions() {
    const instructions = [];

    // Package installation
    if (this.dependencies.missing.length > 0) {
      const packageManager = this.environment.packageManager;
      const installCmd = packageManager === 'yarn' ? 'yarn add' : 
                        packageManager === 'pnpm' ? 'pnpm add' : 'npm install';
      
      instructions.push(`Install missing dependencies: ${installCmd} ${this.dependencies.missing.join(' ')}`);
    }

    // Config file setup
    if (this.environment.missingFiles.includes('tailwind.config.js') && 
        this.projectStructure.conventions.styling.includes('Tailwind CSS')) {
      instructions.push('Initialize Tailwind: npx tailwindcss init -p');
    }

    if (this.environment.missingFiles.includes('tsconfig.json') && 
        this.projectStructure.conventions.features.includes('TypeScript')) {
      instructions.push('Initialize TypeScript: npx tsc --init');
    }

    // ShadCN setup
    if (this.environment.missingFiles.includes('components.json')) {
      instructions.push('Initialize ShadCN: npx shadcn-ui@latest init');
    }

    this.setupInstructions = instructions;
  }

  /**
   * Generate integration checklist
   */
  generateIntegrationChecklist() {
    const checklist = [];

    // Structure checks
    if (this.projectStructure.detectedPaths.components) {
      checklist.push('✅ Components directory structure detected');
    } else {
      checklist.push('❌ Create components directory structure');
    }

    // Dependency checks
    if (this.dependencies.required.includes('react')) {
      checklist.push('✅ React is installed');
    } else {
      checklist.push('❌ Install React');
    }

    // Config checks
    if (this.environment.configFiles['package.json']) {
      checklist.push('✅ Package.json is present');
    } else {
      checklist.push('❌ Initialize package.json');
    }

    // Asset checks
    checklist.push('⚠️ Verify all image assets are provided');
    checklist.push('⚠️ Test responsive behavior across breakpoints');
    checklist.push('⚠️ Validate accessibility requirements');

    this.integrationChecklist = checklist;
  }

  /**
   * Generate intelligence summary
   */
  generateIntelligenceSummary() {
    return {
      confidence: this.calculateConfidence(),
      readiness: this.assessReadiness(),
      complexity: this.assessComplexity(),
      recommendations: this.generateRecommendations()
    };
  }

  calculateConfidence() {
    let score = 0;
    let total = 0;

    // Structure confidence
    if (Object.keys(this.projectStructure.detectedPaths).length > 3) score += 30;
    total += 30;

    // Environment confidence
    if (this.environment.configFiles['package.json']) score += 20;
    if (this.environment.configFiles['tsconfig.json']) score += 10;
    total += 30;

    // Dependencies confidence
    if (this.dependencies.missing.length === 0) score += 25;
    total += 25;

    // Convention confidence
    if (this.projectStructure.conventions.framework !== 'unknown') score += 15;
    total += 15;

    return Math.round((score / total) * 100);
  }

  assessReadiness() {
    if (this.dependencies.missing.length === 0 && 
        this.environment.missingFiles.length < 2) {
      return 'ready';
    } else if (this.setupInstructions.length < 3) {
      return 'needs-setup';
    } else {
      return 'requires-configuration';
    }
  }

  assessComplexity() {
    let complexity = 0;
    
    complexity += this.dependencies.missing.length * 2;
    complexity += this.environment.missingFiles.length;
    complexity += this.setupInstructions.length;

    if (complexity < 3) return 'low';
    if (complexity < 7) return 'medium';
    return 'high';
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.projectStructure.aliases.length === 0) {
      recommendations.push('Add path aliases to tsconfig.json for cleaner imports');
    }

    if (!this.projectStructure.conventions.styling.includes('Tailwind CSS')) {
      recommendations.push('Consider Tailwind CSS for utility-first styling');
    }

    if (this.projectStructure.conventions.testing === 'unknown') {
      recommendations.push('Add testing framework (Jest or Vitest)');
    }

    return recommendations;
  }
}