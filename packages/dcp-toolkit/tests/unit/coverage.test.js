import path from 'path';
import fs from 'fs';
import { generateCoverageReport } from '../../src/commands/coverage.js';
import { createTestDir, cleanupTestDir, writeTestFile } from './.test-utils.js';

describe('generateCoverageReport', () => {
  let testDir;
  let registryPath;
  let outputPath;

  beforeEach(() => {
    testDir = createTestDir();
    registryPath = path.join(testDir, 'manifest.json');
    outputPath = path.join(testDir, 'coverage.json');

    // Create test component
    const buttonComponent = {
      name: 'Button',
      description: 'A test button',
      props: {
        variant: {
          type: 'string',
          description: 'Button variant',
          source: 'llm'
        }
      },
      tokensUsed: ['colors.primary', 'spacing.md']
    };

    // Create test token file
    const tokens = {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d'
      },
      spacing: {
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem'
      }
    };

    // Create test registry
    const registry = {
      registryName: 'Test Registry',
      registryVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      components: [{
        name: 'Button',
        path: './components/Button.dcp.json'
      }],
      tokens: [{
        name: 'tokens',
        path: './tokens/tokens.json'
      }]
    };

    // Write files
    fs.mkdirSync(path.join(testDir, 'components'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'tokens'), { recursive: true });
    writeTestFile(path.join(testDir, 'components/Button.dcp.json'), buttonComponent);
    writeTestFile(path.join(testDir, 'tokens/tokens.json'), tokens);
    writeTestFile(registryPath, registry);
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  test('generates coverage report successfully from a valid registry', async () => {
    const report = await generateCoverageReport({ registryPath, outputPath });
    
    expect(report).toEqual({
      totalTokens: 5, // colors.primary, colors.secondary, spacing.sm, spacing.md, spacing.lg
      usedTokens: 2, // colors.primary, spacing.md
      coverage: 40, // 2/5 * 100
      tokenUsage: {
        'colors.primary': ['Button'],
        'spacing.md': ['Button']
      },
      missingDescriptions: [],
      llmFields: 1,
      unusedTokens: ['colors.secondary', 'spacing.sm', 'spacing.lg']
    });

    // Verify report was written to file
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  test('handles missing components directory', async () => {
    fs.rmSync(path.join(testDir, 'components'), { recursive: true });
    
    const report = await generateCoverageReport({ registryPath, outputPath });
    expect(report.totalTokens).toBe(5);
    expect(report.usedTokens).toBe(0);
    expect(report.coverage).toBe(0);
  });

  test('handles invalid component JSON', async () => {
    fs.writeFileSync(path.join(testDir, 'components/Button.dcp.json'), 'invalid json');
    
    const report = await generateCoverageReport({ registryPath, outputPath });
    expect(report.totalTokens).toBe(5);
    expect(report.usedTokens).toBe(0);
    expect(report.coverage).toBe(0);
  });

  test('correctly identifies missing descriptions', async () => {
    const noDescComponent = {
      name: 'NoDesc',
      props: {}
    };
    writeTestFile(path.join(testDir, 'components/NoDesc.dcp.json'), noDescComponent);
    
    // Update registry to include the new component
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    registry.components.push({
      name: 'NoDesc',
      path: './components/NoDesc.dcp.json'
    });
    writeTestFile(registryPath, registry);
    
    const report = await generateCoverageReport({ registryPath, outputPath });
    expect(report.missingDescriptions).toContain('NoDesc');
  });

  test('correctly counts LLM fields', async () => {
    const llmComponent = {
      name: 'LLMTest',
      description: 'Test component',
      props: {
        test: {
          type: 'string',
          description: 'Test prop',
          source: 'llm'
        }
      }
    };
    writeTestFile(path.join(testDir, 'components/LLMTest.dcp.json'), llmComponent);
    
    // Update registry to include the new component
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    registry.components.push({
      name: 'LLMTest',
      path: './components/LLMTest.dcp.json'
    });
    writeTestFile(registryPath, registry);
    
    const report = await generateCoverageReport({ registryPath, outputPath });
    expect(report.llmFields).toBe(2); // One from Button, one from LLMTest
  });
}); 