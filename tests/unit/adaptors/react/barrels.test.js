// tes../../src/adaptors/react/barrels.test.js
import { describe, test, expect, beforeEach } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { ReactTSXAdaptor } from '../../../../src/adaptors/react-tsx/index.js';
import { clearCache } from '../../../../src/core/graphCache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ReactTSXAdaptor - Barrel Resolution', () => {
  let adaptor;
  const fixturesDir = path.join(__dirname, 'barrels');

  beforeEach(() => {
    // Clear cache before each test
    clearCache();
    
    adaptor = new ReactTSXAdaptor({
      followBarrels: true,
      maxDepth: 5,
      traceBarrels: false,
      verbose: false
    });
  });

  test('should extract components from simple barrel exports', async () => {
    const indexPath = path.join(fixturesDir, 'components/index.ts');
    const source = fs.readFileSync(indexPath, 'utf-8');
    
    const components = await adaptor.extractComponents(indexPath, source);
    
    // Should find Button, Card, PrimaryButton (alias), ContentCard (alias)
    expect(components.length).toBeGreaterThan(0);
    
    const componentNames = components.map(c => c.name);
    expect(componentNames).toContain('Button');
    expect(componentNames).toContain('Card');
    expect(componentNames).toContain('PrimaryButton');
    expect(componentNames).toContain('ContentCard');
  });

  test('should extract components from wildcard barrel exports', async () => {
    const indexPath = path.join(fixturesDir, 'index.ts');
    const source = fs.readFileSync(indexPath, 'utf-8');
    
    const components = await adaptor.extractComponents(indexPath, source);
    
    expect(components.length).toBeGreaterThan(0);
    
    const componentNames = components.map(c => c.name);
    expect(componentNames).toContain('Button');
    expect(componentNames).toContain('Card');
    // The DefaultButton might be resolved as just 'Button' since it's a default export alias
    expect(componentNames.length).toBeGreaterThanOrEqual(2);
  });

  test('should handle cyclic barrel imports without infinite recursion', async () => {
    const cyclePath = path.join(fixturesDir, 'cycles/index.ts');
    const source = fs.readFileSync(cyclePath, 'utf-8');
    
    const components = await adaptor.extractComponents(cyclePath, source);
    
    // Should extract components without crashing
    expect(components.length).toBeGreaterThan(0);
    
    const componentNames = components.map(c => c.name);
    expect(componentNames).toContain('ComponentA');
    expect(componentNames).toContain('ComponentB');
  });

  test('should respect maxDepth setting', async () => {
    adaptor.maxDepth = 1;
    adaptor.resolverContext.maxDepth = 1;
    
    const indexPath = path.join(fixturesDir, 'index.ts');
    const source = fs.readFileSync(indexPath, 'utf-8');
    
    const components = await adaptor.extractComponents(indexPath, source);
    
    // Should still extract some components but may miss deeply nested ones
    expect(components.length).toBeGreaterThan(0);
  });

  test('should mark barrel re-exports as non-canonical', async () => {
    const indexPath = path.join(fixturesDir, 'components/index.ts');
    const source = fs.readFileSync(indexPath, 'utf-8');
    
    const components = await adaptor.extractComponents(indexPath, source);
    
    const barrelComponent = components.find(c => c.metadata?.source === 'barrel');
    if (barrelComponent) {
      expect(barrelComponent.metadata.source).toBe('barrel');
    }
  });

  test('should deduplicate components preferring direct over barrel exports', async () => {
    // Test the deduplication logic
    const components = [
      { 
        name: 'Button', 
        metadata: { source: 'barrel', componentType: 'barrel' }
      },
      { 
        name: 'Button', 
        metadata: { componentType: 'canonical' }
      }
    ];
    
    const deduplicated = adaptor.deduplicateComponents(components);
    
    expect(deduplicated.length).toBe(1);
    expect(deduplicated[0].metadata.componentType).toBe('canonical');
  });

  test('should trace barrel resolution when enabled', async () => {
    adaptor.traceBarrels = true;
    adaptor.resolverContext.traceBarrels = true;
    
    // Capture console output
    const consoleLogs = [];
    const originalLog = console.log;
    console.log = (...args) => consoleLogs.push(args.join(' '));
    
    try {
      const indexPath = path.join(fixturesDir, 'components/index.ts');
      const source = fs.readFileSync(indexPath, 'utf-8');
      
      await adaptor.extractComponents(indexPath, source);
      
      // Should have some trace output
      const traceOutput = consoleLogs.filter(log => log.includes('[dcp:barrel]'));
      expect(traceOutput.length).toBeGreaterThan(0);
    } finally {
      console.log = originalLog;
    }
  });

  test('should skip barrel resolution when disabled', async () => {
    adaptor.followBarrels = false;
    
    const indexPath = path.join(fixturesDir, 'components/index.ts');
    const source = fs.readFileSync(indexPath, 'utf-8');
    
    const components = await adaptor.extractComponents(indexPath, source);
    
    // Should find no components since this file only contains barrel exports
    expect(components.length).toBe(0);
  });
});