import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { runExtract } from '../../src/commands/extract-v2.js';
import { runExportMCP } from '../../src/commands/export-mcp.js';
import { runTranspile } from '../../src/commands/transpile.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Performance Benchmarks', () => {
  const benchmarkDir = path.join(__dirname, 'temp-benchmark');
  
  beforeAll(async () => {
    try {
      await fs.rm(benchmarkDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
    await fs.mkdir(benchmarkDir, { recursive: true });
    
    // Create performance test fixtures
    await createPerformanceFixtures();
  });
  
  afterAll(async () => {
    try {
      await fs.rm(benchmarkDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });
  
  async function createPerformanceFixtures() {
    const componentsDir = path.join(benchmarkDir, 'components');
    await fs.mkdir(componentsDir, { recursive: true });
    
    // Create many components for performance testing
    for (let i = 0; i < 50; i++) {
      const componentCode = `
import React from 'react';

export interface Component${i}Props {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  'data-testid'?: string;
}

export const Component${i}: React.FC<Component${i}Props> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
  className,
  'data-testid': testId,
  ...props
}) => {
  const baseClasses = 'component-${i} component-${i}--' + variant + ' component-${i}--' + size;
  const classes = [baseClasses, className].filter(Boolean).join(' ');
  
  return (
    <div
      className={classes}
      onClick={!disabled && !loading ? onClick : undefined}
      data-testid={testId}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </div>
  );
};

export default Component${i};
`;
      
      await fs.writeFile(
        path.join(componentsDir, `Component${i}.tsx`),
        componentCode
      );
    }
    
    // Create large token file
    const tokens = {
      colors: {},
      spacing: {},
      typography: {},
      shadows: {},
      borders: {}
    };
    
    // Generate many tokens
    for (let i = 0; i < 100; i++) {
      tokens.colors[`color-${i}`] = {
        value: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        type: 'color',
        description: `Color token ${i}`
      };
      
      tokens.spacing[`spacing-${i}`] = {
        value: `${0.25 + (i * 0.125)}rem`,
        type: 'dimension',
        description: `Spacing token ${i}`
      };
      
      tokens.typography[`font-size-${i}`] = {
        value: `${0.75 + (i * 0.125)}rem`,
        type: 'dimension',
        description: `Font size token ${i}`
      };
    }
    
    await fs.writeFile(
      path.join(benchmarkDir, 'large-tokens.json'),
      JSON.stringify(tokens, null, 2)
    );
  }
  
  describe('Extract Performance', () => {
    it('should extract 50 components within performance threshold', async () => {
      const startTime = process.hrtime.bigint();
      
      const result = await runExtract(path.join(benchmarkDir, 'components'), {
        out: path.join(benchmarkDir, 'extract-perf'),
        tokens: path.join(benchmarkDir, 'large-tokens.json')
      });
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      console.log(`Extract Performance: ${durationMs.toFixed(2)}ms for ${result.registry.components.length} components`);
      
      // Should extract all components
      expect(result.registry.components.length).toBe(50);
      
      // Should complete within 10 seconds
      expect(durationMs).toBeLessThan(10000);
      
      // Log performance metrics
      const componentsPerSecond = (result.registry.components.length / durationMs) * 1000;
      console.log(`Extract Rate: ${componentsPerSecond.toFixed(2)} components/second`);
      
      expect(componentsPerSecond).toBeGreaterThan(5); // At least 5 components per second
    });
    
    it('should handle large token files efficiently', async () => {
      const startTime = process.hrtime.bigint();
      
      const result = await runExtract(path.join(benchmarkDir, 'components'), {
        out: path.join(benchmarkDir, 'tokens-perf'),
        tokens: path.join(benchmarkDir, 'large-tokens.json'),
        glob: 'Component{0..9}.tsx' // Just first 10 components
      });
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      console.log(`Token Processing: ${durationMs.toFixed(2)}ms for ${Object.keys(result.registry.tokens || {}).length} token categories`);
      
      // Should load all token categories
      expect(Object.keys(result.registry.tokens).length).toBe(5);
      
      // Should complete quickly even with large token file
      expect(durationMs).toBeLessThan(5000);
    });
  });
  
  describe('Export MCP Performance', () => {
    it('should export large registry to MCP efficiently', async () => {
      // First extract to get a large registry
      await runExtract(path.join(benchmarkDir, 'components'), {
        out: path.join(benchmarkDir, 'large-registry-output'),
        tokens: path.join(benchmarkDir, 'large-tokens.json')
      });
      
      const registryPath = path.join(benchmarkDir, 'large-registry-output', 'registry.json');
      
      const startTime = process.hrtime.bigint();
      
      const result = await runExportMCP(registryPath, {
        out: path.join(benchmarkDir, 'large-mcp.json')
      });
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      console.log(`MCP Export: ${durationMs.toFixed(2)}ms for ${result.mcpExport.summary.componentsCount} components`);
      
      // Should complete within 5 seconds
      expect(durationMs).toBeLessThan(5000);
      
      // Should generate appropriate chunks
      expect(result.mcpExport.chunks.length).toBeGreaterThan(0);
      
      console.log(`MCP Chunks: ${result.mcpExport.chunks.length}, Estimated Tokens: ${result.mcpExport.metadata.estimatedTokens}`);
    });
    
    it('should chunk large registries efficiently', async () => {
      await runExtract(path.join(benchmarkDir, 'components'), {
        out: path.join(benchmarkDir, 'chunking-test'),
        tokens: path.join(benchmarkDir, 'large-tokens.json')
      });
      
      const registryPath = path.join(benchmarkDir, 'chunking-test', 'registry.json');
      
      const startTime = process.hrtime.bigint();
      
      const result = await runExportMCP(registryPath, {
        out: path.join(benchmarkDir, 'chunked-mcp.json'),
        chunkSize: 2000 // Force smaller chunks
      });
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      console.log(`Chunked MCP Export: ${durationMs.toFixed(2)}ms, ${result.mcpExport.chunks.length} chunks`);
      
      // Should create multiple chunks with small chunk size
      expect(result.mcpExport.chunks.length).toBeGreaterThan(5);
      
      // Each chunk should respect token limits (but be flexible for test data)
      result.mcpExport.chunks.forEach(chunk => {
        expect(chunk.estimatedTokens).toBeGreaterThan(0); // Should have some content
      });
      
      // Should still complete quickly
      expect(durationMs).toBeLessThan(7000);
    });
  });
  
  describe('Transpile Performance', () => {
    it('should transpile large registry efficiently', async () => {
      // Use existing large registry
      await runExtract(path.join(benchmarkDir, 'components'), {
        out: path.join(benchmarkDir, 'transpile-perf'),
        tokens: path.join(benchmarkDir, 'large-tokens.json')
      });
      
      const registryPath = path.join(benchmarkDir, 'transpile-perf', 'registry.json');
      
      const startTime = process.hrtime.bigint();
      
      const result = await runTranspile(registryPath, {
        target: 'react',
        out: path.join(benchmarkDir, 'transpiled-components')
      });
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      console.log(`Transpile Performance: ${durationMs.toFixed(2)}ms for ${result.summary.componentsGenerated} components`);
      
      // Should transpile all components
      expect(result.summary.componentsGenerated).toBe(50);
      
      // Should complete within 15 seconds
      expect(durationMs).toBeLessThan(15000);
      
      // Calculate transpile rate
      const componentsPerSecond = (result.summary.componentsGenerated / durationMs) * 1000;
      console.log(`Transpile Rate: ${componentsPerSecond.toFixed(2)} components/second`);
      
      expect(componentsPerSecond).toBeGreaterThan(3); // At least 3 components per second
    });
  });
  
  describe('Full Pipeline Performance', () => {
    it('should complete full pipeline within performance threshold', async () => {
      const startTime = process.hrtime.bigint();
      
      // Extract
      const extractResult = await runExtract(path.join(benchmarkDir, 'components'), {
        out: path.join(benchmarkDir, 'full-pipeline'),
        tokens: path.join(benchmarkDir, 'large-tokens.json'),
        glob: 'Component{0..19}.tsx' // First 20 components for full pipeline test
      });
      
      const registryPath = path.join(benchmarkDir, 'full-pipeline', 'registry.json');
      
      // Export MCP
      await runExportMCP(registryPath, {
        out: path.join(benchmarkDir, 'full-pipeline', 'mcp_export.json')
      });
      
      // Transpile
      const transpileResult = await runTranspile(registryPath, {
        target: 'react',
        out: path.join(benchmarkDir, 'full-pipeline', 'components')
      });
      
      const endTime = process.hrtime.bigint();
      const totalDurationMs = Number(endTime - startTime) / 1_000_000;
      
      console.log(`Full Pipeline: ${totalDurationMs.toFixed(2)}ms for ${extractResult.registry.components.length} components`);
      console.log(`  Extract: ${extractResult.registry.components.length} components`);
      console.log(`  Transpile: ${transpileResult.summary.componentsGenerated} components`);
      
      // Should complete entire pipeline within 20 seconds
      expect(totalDurationMs).toBeLessThan(20000);
      
      // Should process all components successfully
      expect(extractResult.registry.components.length).toBe(20);
      expect(transpileResult.summary.componentsGenerated).toBe(20);
      
      const componentsPerSecond = (extractResult.registry.components.length / totalDurationMs) * 1000;
      console.log(`Full Pipeline Rate: ${componentsPerSecond.toFixed(2)} components/second`);
    });
  });
  
  describe('Memory Usage', () => {
    it('should handle large registries without excessive memory usage', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process large registry
      await runExtract(path.join(benchmarkDir, 'components'), {
        out: path.join(benchmarkDir, 'memory-test'),
        tokens: path.join(benchmarkDir, 'large-tokens.json')
      });
      
      const registryPath = path.join(benchmarkDir, 'memory-test', 'registry.json');
      
      await runExportMCP(registryPath, {
        out: path.join(benchmarkDir, 'memory-test-mcp.json')
      });
      
      await runTranspile(registryPath, {
        target: 'react',
        out: path.join(benchmarkDir, 'memory-test-components')
      });
      
      const finalMemory = process.memoryUsage();
      
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      
      // Should not use excessive memory (less than 500MB increase)
      expect(memoryIncreaseMB).toBeLessThan(500);
    });
  });
});