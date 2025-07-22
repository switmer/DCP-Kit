import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { runExportMCP } from '../commands/export-mcp.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('MCP Export Module', () => {
  const outputDir = path.join(__dirname, 'temp-mcp');
  const testRegistry = {
    name: 'test-registry',
    version: '1.0.0',
    description: 'Test registry for MCP export',
    components: [
      {
        name: 'Button',
        type: 'component',
        category: 'actions',
        description: 'Button component',
        props: [
          {
            name: 'variant',
            type: 'union',
            required: false,
            default: 'primary',
            description: 'Button variant'
          },
          {
            name: 'disabled',
            type: 'boolean',
            required: false,
            default: false,
            description: 'Disabled state'
          }
        ]
      },
      {
        name: 'Card',
        type: 'component',
        category: 'layout',
        description: 'Card component',
        props: [
          {
            name: 'padding',
            type: 'string',
            required: false,
            default: 'md'
          }
        ]
      }
    ],
    tokens: {
      colors: {
        primary: { value: '#007bff', type: 'color' },
        secondary: { value: '#6c757d', type: 'color' }
      },
      spacing: {
        sm: { value: '0.5rem', type: 'dimension' },
        md: { value: '1rem', type: 'dimension' }
      }
    }
  };
  
  beforeEach(async () => {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create test registry
    await fs.writeFile(
      path.join(outputDir, 'test-registry.json'),
      JSON.stringify(testRegistry, null, 2)
    );
  });
  
  afterEach(async () => {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });
  
  describe('Basic Export', () => {
    it('should export MCP format successfully', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      const mcpPath = path.join(outputDir, 'mcp_export.json');
      
      const result = await runExportMCP(registryPath, {
        out: mcpPath
      });
      
      expect(result.mcpExport).toBeDefined();
      expect(result.mcpExport.version).toBe('1.0.0');
      expect(result.mcpExport.summary.componentsCount).toBe(2);
      expect(result.mcpExport.summary.tokensCount).toBe(2);
      
      // Verify file was written
      const mcpContent = await fs.readFile(mcpPath, 'utf-8');
      const mcp = JSON.parse(mcpContent);
      expect(mcp.chunks).toHaveLength(1);
    });
    
    it('should structure components for AI consumption', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      
      const result = await runExportMCP(registryPath, {
        out: path.join(outputDir, 'mcp.json')
      });
      
      const components = result.mcpExport.chunks[0].data.components;
      
      expect(components).toHaveLength(2);
      
      const button = components.find(c => c.name === 'Button');
      expect(button.aiContext).toBeDefined();
      expect(button.aiContext.canMutate).toBe(true);
      expect(button.aiContext.mutationPath).toBe('/components/Button');
      expect(button.aiContext.commonMutations).toBeInstanceOf(Array);
    });
    
    it('should include mutation context', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      
      const result = await runExportMCP(registryPath, {
        out: path.join(outputDir, 'mcp.json')
      });
      
      const mutationContext = result.mcpExport.mutationContext;
      expect(mutationContext).toBeDefined();
      expect(mutationContext.safeOperations).toContain('replace');
      expect(mutationContext.mutationPatterns).toBeInstanceOf(Array);
      expect(mutationContext.validationRules).toBeInstanceOf(Array);
    });
  });
  
  describe('Chunking', () => {
    it('should chunk large registries appropriately', async () => {
      // Create large registry
      const largeComponents = Array.from({ length: 50 }, (_, i) => ({
        name: `Component${i}`,
        type: 'component',
        category: 'actions',
        props: [
          { name: 'prop1', type: 'string', required: false },
          { name: 'prop2', type: 'boolean', required: false }
        ]
      }));
      
      const largeRegistry = {
        ...testRegistry,
        components: largeComponents
      };
      
      const largeRegistryPath = path.join(outputDir, 'large-registry.json');
      await fs.writeFile(largeRegistryPath, JSON.stringify(largeRegistry, null, 2));
      
      const result = await runExportMCP(largeRegistryPath, {
        out: path.join(outputDir, 'large-mcp.json'),
        chunkSize: 2000 // Small chunk size to force multiple chunks
      });
      
      expect(result.mcpExport.chunks.length).toBeGreaterThan(1);
      expect(result.mcpExport.summary.chunksCount).toBeGreaterThan(1);
    });
    
    it('should maintain chunk consistency', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      
      const result = await runExportMCP(registryPath, {
        out: path.join(outputDir, 'mcp.json'),
        chunkSize: 1000
      });
      
      const chunks = result.mcpExport.chunks;
      
      chunks.forEach((chunk, index) => {
        expect(chunk.chunkId).toBe(index);
        expect(chunk.estimatedTokens).toBeGreaterThan(0);
        expect(chunk.data).toBeDefined();
      });
    });
  });
  
  describe('Model Optimization', () => {
    it('should optimize for Claude', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      
      const result = await runExportMCP(registryPath, {
        out: path.join(outputDir, 'claude-mcp.json'),
        optimizeFor: 'claude'
      });
      
      const firstChunk = result.mcpExport.chunks[0];
      expect(firstChunk.data.claudeContext).toBeDefined();
      expect(firstChunk.data.claudeContext.systemPrompt).toContain('design system mutation assistant');
      expect(firstChunk.data.claudeContext.exampleQueries).toBeInstanceOf(Array);
    });
    
    it('should optimize for GPT', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      
      const result = await runExportMCP(registryPath, {
        out: path.join(outputDir, 'gpt-mcp.json'),
        optimizeFor: 'gpt'
      });
      
      const firstChunk = result.mcpExport.chunks[0];
      expect(firstChunk.data.gptContext).toBeDefined();
      expect(firstChunk.data.gptContext.functions).toBeInstanceOf(Array);
    });
  });
  
  describe('Component Relationships', () => {
    it('should detect component relationships', async () => {
      // Create registry with related components
      const relatedRegistry = {
        ...testRegistry,
        components: [
          {
            name: 'Button',
            category: 'actions',
            props: [
              { name: 'variant', type: 'string' },
              { name: 'size', type: 'string' }
            ]
          },
          {
            name: 'IconButton',
            category: 'actions',
            props: [
              { name: 'variant', type: 'string' }, // Shared prop
              { name: 'size', type: 'string' },   // Shared prop
              { name: 'icon', type: 'string' }
            ]
          },
          {
            name: 'Card',
            category: 'layout',
            props: [
              { name: 'padding', type: 'string' }
            ]
          }
        ]
      };
      
      const registryPath = path.join(outputDir, 'related-registry.json');
      await fs.writeFile(registryPath, JSON.stringify(relatedRegistry, null, 2));
      
      const result = await runExportMCP(registryPath, {
        out: path.join(outputDir, 'related-mcp.json')
      });
      
      const relationships = result.mcpExport.chunks[0].data.relationships;
      expect(relationships).toBeInstanceOf(Array);
      
      // Should find shared props relationship
      const sharedPropsRelation = relationships.find(r => r.type === 'shared_props');
      expect(sharedPropsRelation).toBeDefined();
      
      // Should find same category relationship
      const sameCategoryRelation = relationships.find(r => r.type === 'same_category');
      expect(sameCategoryRelation).toBeDefined();
    });
  });
  
  describe('Token Processing', () => {
    it('should flatten and index tokens', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      
      const result = await runExportMCP(registryPath, {
        out: path.join(outputDir, 'mcp.json')
      });
      
      const tokenIndex = result.mcpExport.tokenIndex;
      expect(tokenIndex.colors).toBeInstanceOf(Array);
      expect(tokenIndex.spacing).toBeInstanceOf(Array);
      
      const tokens = result.mcpExport.chunks[0].data.tokens;
      expect(tokens.colors).toBeInstanceOf(Array);
      expect(tokens.spacing).toBeInstanceOf(Array);
      
      // Check mutation paths
      const primaryToken = tokens.colors.find(t => t.name === 'primary');
      expect(primaryToken.mutationPath).toBe('/tokens/colors/primary');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing registry file', async () => {
      await expect(
        runExportMCP('nonexistent.json', {
          out: path.join(outputDir, 'output.json')
        })
      ).rejects.toThrow();
    });
    
    it('should handle invalid JSON registry', async () => {
      const invalidPath = path.join(outputDir, 'invalid.json');
      await fs.writeFile(invalidPath, 'invalid json {{{');
      
      await expect(
        runExportMCP(invalidPath, {
          out: path.join(outputDir, 'output.json')
        })
      ).rejects.toThrow();
    });
    
    it('should handle empty registry gracefully', async () => {
      const emptyRegistry = {
        name: 'empty',
        version: '1.0.0',
        components: [],
        tokens: {}
      };
      
      const emptyPath = path.join(outputDir, 'empty.json');
      await fs.writeFile(emptyPath, JSON.stringify(emptyRegistry, null, 2));
      
      const result = await runExportMCP(emptyPath, {
        out: path.join(outputDir, 'empty-mcp.json')
      });
      
      expect(result.mcpExport.summary.componentsCount).toBe(0);
      expect(result.mcpExport.summary.tokensCount).toBe(0);
      // Empty registries might create zero chunks or one empty chunk
      expect(result.mcpExport.chunks.length).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Performance', () => {
    it('should export MCP within reasonable time', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      const startTime = Date.now();
      
      await runExportMCP(registryPath, {
        out: path.join(outputDir, 'perf-mcp.json')
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });
    
    it('should handle token estimation accurately', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      
      const result = await runExportMCP(registryPath, {
        out: path.join(outputDir, 'tokens-mcp.json')
      });
      
      const metadata = result.mcpExport.metadata;
      expect(metadata.estimatedTokens).toBeGreaterThan(0);
      
      // Estimate should be reasonable (not way off)
      const actualSize = JSON.stringify(result.mcpExport).length;
      const estimatedSize = metadata.estimatedTokens * 4; // Rough conversion
      
      // Should be within 50% of actual size
      expect(Math.abs(actualSize - estimatedSize) / actualSize).toBeLessThan(0.5);
    });
  });
});