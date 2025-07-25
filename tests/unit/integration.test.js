import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { runExtract } from '../../src/commands/extract-v2.js';
import { runExportMCP } from '../../src/commands/export-mcp.js';
import { runTranspile } from '../../src/commands/transpile.js';
import { runValidateTransform } from '../../src/commands/validate-transform.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Integration Tests', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const outputDir = path.join(__dirname, 'temp-integration');
  
  beforeEach(async () => {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
    await fs.mkdir(outputDir, { recursive: true });
  });
  
  afterEach(async () => {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });
  
  describe('Full Pipeline', () => {
    it('should complete extract → export → transpile pipeline', async () => {
      const tokensPath = path.join(fixturesDir, 'test-tokens.json');
      
      // Step 1: Extract
      const extractResult = await runExtract(fixturesDir, {
        out: outputDir,
        tokens: tokensPath,
        glob: 'simple-button.tsx'
      });
      
      expect(extractResult.registry.components).toHaveLength(1);
      expect(extractResult.registry.tokens).toBeDefined();
      
      // Step 2: Export MCP
      const registryPath = path.join(outputDir, 'registry.json');
      const mcpPath = path.join(outputDir, 'mcp_export.json');
      
      const exportResult = await runExportMCP(registryPath, {
        out: mcpPath
      });
      
      expect(exportResult.mcpExport).toBeDefined();
      expect(exportResult.mcpExport.chunks).toHaveLength(1);
      
      // Step 3: Transpile
      const transpileResult = await runTranspile(registryPath, {
        target: 'react',
        out: path.join(outputDir, 'components'),
        format: 'typescript'
      });
      
      expect(transpileResult.summary.componentsGenerated).toBe(1);
      
      // Verify all files exist
      const files = await fs.readdir(outputDir);
      expect(files).toContain('registry.json');
      expect(files).toContain('mcp_export.json');
      expect(files).toContain('components');
      
      const componentFiles = await fs.readdir(path.join(outputDir, 'components', 'components'));
      expect(componentFiles).toContain('SimpleButton.tsx');
    });
    
    it('should handle multiple components in pipeline', async () => {
      const tokensPath = path.join(fixturesDir, 'test-tokens.json');
      
      // Extract multiple components
      const extractResult = await runExtract(fixturesDir, {
        out: outputDir,
        tokens: tokensPath,
        glob: '{simple-button,complex-card}.tsx'
      });
      
      expect(extractResult.registry.components).toHaveLength(2);
      
      // Export and verify MCP structure
      const registryPath = path.join(outputDir, 'registry.json');
      const exportResult = await runExportMCP(registryPath, {
        out: path.join(outputDir, 'mcp_export.json')
      });
      
      const mcpData = exportResult.mcpExport;
      expect(mcpData.summary.componentsCount).toBe(2);
      expect(mcpData.chunks[0].data.components).toHaveLength(2);
      
      // Transpile and verify output
      const transpileResult = await runTranspile(registryPath, {
        target: 'react',
        out: path.join(outputDir, 'components')
      });
      
      expect(transpileResult.summary.componentsGenerated).toBe(2);
      
      const componentFiles = await fs.readdir(path.join(outputDir, 'components', 'components'));
      expect(componentFiles).toContain('SimpleButton.tsx');
      expect(componentFiles).toContain('ComplexCard.tsx');
    });
    
    it('should validate registry at each step', async () => {
      // Extract components
      await runExtract(fixturesDir, {
        out: outputDir,
        glob: 'simple-button.tsx'
      });
      
      const registryPath = path.join(outputDir, 'registry.json');
      
      // Validate extracted registry
      const validationResult = await runValidateTransform(registryPath);
      
      // Should have some warnings but be structurally valid
      expect(validationResult.errors).toBeDefined();
      expect(validationResult.warnings).toBeDefined();
      
      // Even with validation issues, pipeline should continue
      const exportResult = await runExportMCP(registryPath, {
        out: path.join(outputDir, 'mcp_export.json')
      });
      
      expect(exportResult.mcpExport).toBeDefined();
    });
  });
  
  describe('Error Recovery', () => {
    it('should handle partial failures gracefully', async () => {
      // Create a mix of valid and invalid components
      const mixedDir = path.join(outputDir, 'mixed-components');
      await fs.mkdir(mixedDir, { recursive: true });
      
      // Copy valid component
      const validComponent = await fs.readFile(path.join(fixturesDir, 'simple-button.tsx'));
      await fs.writeFile(path.join(mixedDir, 'valid.tsx'), validComponent);
      
      // Create invalid component
      await fs.writeFile(path.join(mixedDir, 'invalid.tsx'), 'invalid typescript {{{');
      
      // Extract should succeed for valid components
      const result = await runExtract(mixedDir, {
        out: outputDir
      });
      
      // Should have extracted at least the valid component
      expect(result.registry.components.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should continue pipeline even with validation warnings', async () => {
      // Extract with components that have validation issues
      const result = await runExtract(fixturesDir, {
        out: outputDir,
        glob: 'problematic-component.tsx'
      });
      
      const registryPath = path.join(outputDir, 'registry.json');
      
      // Validation will have warnings/errors
      const validation = await runValidateTransform(registryPath);
      expect(validation.warnings.length).toBeGreaterThan(0);
      
      // But transpilation should still work
      const transpileResult = await runTranspile(registryPath, {
        target: 'react',
        out: path.join(outputDir, 'components')
      });
      
      expect(transpileResult.summary.componentsGenerated).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('Performance', () => {
    it('should complete full pipeline within reasonable time', async () => {
      const startTime = Date.now();
      
      // Full pipeline with multiple components
      await runExtract(fixturesDir, {
        out: outputDir,
        tokens: path.join(fixturesDir, 'test-tokens.json'),
        glob: '*.tsx'
      });
      
      const registryPath = path.join(outputDir, 'registry.json');
      
      await runExportMCP(registryPath, {
        out: path.join(outputDir, 'mcp_export.json')
      });
      
      await runTranspile(registryPath, {
        target: 'react',
        out: path.join(outputDir, 'components')
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
    });
  });
  
  describe('Output Consistency', () => {
    it('should maintain component relationships across pipeline steps', async () => {
      // Extract components with relationships
      const extractResult = await runExtract(fixturesDir, {
        out: outputDir,
        glob: '{simple-button,complex-card}.tsx'
      });
      
      const registryPath = path.join(outputDir, 'registry.json');
      
      // Export MCP and check relationships
      const exportResult = await runExportMCP(registryPath, {
        out: path.join(outputDir, 'mcp_export.json')
      });
      
      const mcpData = exportResult.mcpExport;
      // Relationships might not be defined for all exports
      expect(mcpData).toBeDefined();
      
      // Transpile and verify component structure
      await runTranspile(registryPath, {
        target: 'react',
        out: path.join(outputDir, 'components')
      });
      
      // Check that index.ts exports all components
      const indexContent = await fs.readFile(
        path.join(outputDir, 'components', 'index.ts'),
        'utf-8'
      );
      
      const originalComponents = extractResult.registry.components;
      originalComponents.forEach(component => {
        expect(indexContent).toContain(`export { ${component.name} }`);
      });
    });
    
    it('should preserve token references across pipeline', async () => {
      const tokensPath = path.join(fixturesDir, 'test-tokens.json');
      
      // Extract with tokens
      const extractResult = await runExtract(fixturesDir, {
        out: outputDir,
        tokens: tokensPath,
        glob: 'simple-button.tsx'
      });
      
      const originalTokens = extractResult.registry.tokens;
      
      // Transpile and check token preservation
      const registryPath = path.join(outputDir, 'registry.json');
      await runTranspile(registryPath, {
        target: 'react',
        out: path.join(outputDir, 'components')
      });
      
      const tokensContent = await fs.readFile(
        path.join(outputDir, 'components', 'tokens.ts'),
        'utf-8'
      );
      
      // Verify key tokens are preserved
      expect(tokensContent).toContain(originalTokens.colors.primary.value);
      expect(tokensContent).toContain(originalTokens.spacing.md.value);
    });
  });
});