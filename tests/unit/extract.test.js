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
    // Clean up any existing output
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's fine
    }
  });
  
  afterEach(async () => {
    // Clean up test output
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's fine
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
      expect(component.category).toBe('actions');
      expect(component.props).toHaveLength(3);
    });
    
    it('should extract complex components with multiple props', async () => {
      const result = await runExtract(fixturesDir, {
        out: outputDir,
        glob: 'complex-card.tsx'
      });
      
      expect(result.registry.components).toHaveLength(1);
      
      const component = result.registry.components[0];
      expect(component.name).toBe('ComplexCard');
      expect(component.category).toBe('layout');
      expect(component.props.length).toBeGreaterThan(5);
      
      // Check for specific props
      const variantProp = component.props.find(p => p.name === 'variant');
      expect(variantProp).toBeDefined();
      expect(variantProp.default).toBe('default');
    });
    
    it('should handle problematic components gracefully', async () => {
      const result = await runExtract(fixturesDir, {
        out: outputDir,
        glob: 'problematic-component.tsx'
      });
      
      expect(result.registry.components.length).toBeGreaterThanOrEqual(1);
      
      // Should find at least the main component
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
      expect(result.registry.tokens.colors).toBeDefined();
      expect(result.registry.tokens.spacing).toBeDefined();
      expect(result.registry.tokens.typography).toBeDefined();
      
      // Check specific token
      expect(result.registry.tokens.colors.primary.value).toBe('#007bff');
    });
    
    it('should handle missing token files gracefully', async () => {
      const result = await runExtract(fixturesDir, {
        out: outputDir,
        tokens: 'nonexistent-tokens.json',
        glob: 'simple-button.tsx'
      });
      
      // Should still extract components even if tokens fail
      expect(result.registry.components).toHaveLength(1);
      expect(result.registry.tokens).toEqual({});
    });
  });
  
  describe('Output Generation', () => {
    it('should create all required output files', async () => {
      await runExtract(fixturesDir, {
        out: outputDir,
        glob: 'simple-button.tsx'
      });
      
      // Check that files were created
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
      
      // Check that registry is valid JSON
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
      
      // Should succeed but return empty registry
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
      // Create a file with syntax errors
      const invalidFile = path.join(outputDir, 'invalid.tsx');
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(invalidFile, 'invalid typescript syntax {{{');
      
      const result = await runExtract(outputDir, {
        out: path.join(outputDir, 'output')
      });
      
      // Should not crash, but may have no components
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
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});