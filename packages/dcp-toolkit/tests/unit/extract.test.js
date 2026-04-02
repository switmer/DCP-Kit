import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { runExtract } from '../../src/commands/extract-v2.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Extract Module', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const outputDir = path.join(__dirname, 'temp-output');

  beforeEach(async () => {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('Basic Extraction', () => {
    it('should extract simple components successfully', async () => {
      const result = await runExtract(fixturesDir, {
        out: outputDir,
        glob: 'simple-button.tsx'
      });

      expect(result).toBeDefined();
      expect(result.registry).toBeDefined();
      expect(result.registry.components).toHaveLength(1);

      const component = result.registry.components[0];
      expect(component.name).toBe('SimpleButton');
      // Props is an object map, not array
      expect(Object.keys(component.props).length).toBeGreaterThanOrEqual(1);
    });

    it('should extract complex components with multiple props', async () => {
      const result = await runExtract(fixturesDir, {
        out: outputDir,
        glob: 'complex-card.tsx'
      });

      expect(result.registry.components).toHaveLength(1);

      const component = result.registry.components[0];
      expect(component.name).toBe('ComplexCard');
      // Props is an object map
      expect(Object.keys(component.props).length).toBeGreaterThan(1);

      // Check for specific props via object key
      expect(component.props.variant).toBeDefined();
    });

    it('should handle problematic components gracefully', async () => {
      const result = await runExtract(fixturesDir, {
        out: outputDir,
        glob: 'problematic-component.tsx'
      });

      expect(result.registry.components.length).toBeGreaterThanOrEqual(1);

      const mainComponent = result.registry.components.find(c => c.name === 'ProblematicComponent');
      expect(mainComponent).toBeDefined();
    });
  });

  describe('Token Integration', () => {
    it('should load and process design tokens', async () => {
      const tokensPath = path.join(fixturesDir, 'test-tokens.json');

      const result = await runExtract(fixturesDir, {
        out: outputDir,
        tokens: tokensPath,
        glob: 'simple-button.tsx'
      });

      expect(result.registry.tokens).toBeDefined();
      expect(typeof result.registry.tokens).toBe('object');
      expect(Object.keys(result.registry.tokens).length).toBeGreaterThan(0);
    });

    it('should handle missing token files gracefully', async () => {
      const result = await runExtract(fixturesDir, {
        out: outputDir,
        tokens: 'nonexistent-tokens.json',
        glob: 'simple-button.tsx'
      });

      // Should still extract components even if tokens fail
      expect(result.registry.components).toHaveLength(1);
      // Tokens may include auto-detected values
      expect(result.registry.tokens).toBeDefined();
    });
  });

  describe('Output Generation', () => {
    it('should create all required output files', async () => {
      await runExtract(fixturesDir, {
        out: outputDir,
        glob: 'simple-button.tsx'
      });

      const files = await fs.readdir(outputDir);
      expect(files).toContain('registry.json');
      expect(files).toContain('schemas.json');
      expect(files).toContain('metadata.json');
    });

    it('should generate valid JSON output', async () => {
      await runExtract(fixturesDir, {
        out: outputDir,
        glob: 'simple-button.tsx'
      });

      const registryContent = await fs.readFile(path.join(outputDir, 'registry.json'), 'utf-8');
      const registry = JSON.parse(registryContent);

      expect(registry.name).toBeDefined();
      expect(registry.components).toBeInstanceOf(Array);
      expect(registry.metadata).toBeDefined();
    });

    it('should generate mutation plan when requested', async () => {
      await runExtract(fixturesDir, {
        out: outputDir,
        glob: 'simple-button.tsx',
        plan: true
      });

      const files = await fs.readdir(outputDir);
      expect(files).toContain('mutation-plan.json');

      const planContent = await fs.readFile(path.join(outputDir, 'mutation-plan.json'), 'utf-8');
      const plan = JSON.parse(planContent);

      expect(plan.planId).toBeDefined();
      expect(plan.mutations).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent source directory', async () => {
      const result = await runExtract('nonexistent-directory', {
        out: outputDir
      });

      expect(result.registry.components).toHaveLength(0);
      expect(result.summary.componentsFound).toBe(0);
    });

    it('should handle empty source directory', async () => {
      const emptyDir = path.join(outputDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });

      const result = await runExtract(emptyDir, {
        out: outputDir
      });

      expect(result.registry.components).toHaveLength(0);
    });

    it('should handle files with syntax errors gracefully', async () => {
      const invalidFile = path.join(outputDir, 'invalid.tsx');
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(invalidFile, 'invalid typescript syntax {{{');

      const result = await runExtract(outputDir, {
        out: path.join(outputDir, 'output')
      });

      expect(result.registry).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete extraction within reasonable time', async () => {
      const startTime = Date.now();

      await runExtract(fixturesDir, {
        out: outputDir,
        glob: '*.tsx'
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });
});
