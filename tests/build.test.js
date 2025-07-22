import { jest } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { runBuild } from '../commands/build.js';
import { createTestDir, cleanupTestDir, writeTestFile, readTestFile } from './.test-utils.js';

describe('runBuild', () => {
  let testDir;
  let mockConfigPath;
  let mockTokensPath;
  let mockComponentsDir;
  let mockManifestPath;

  beforeEach(() => {
    testDir = createTestDir();
    mockConfigPath = path.join(testDir, 'dcp.config.json');
    mockTokensPath = path.join(testDir, 'src', 'tokens', 'theme.json');
    mockComponentsDir = path.join(testDir, 'src', 'components');
    mockManifestPath = path.join(testDir, 'dist', 'manifest.json');

    // Create mock components directory
    fs.mkdirSync(mockComponentsDir, { recursive: true });

    // Mock dcp.config.json
    const mockConfigData = {
      registryName: 'Test Registry From Config',
      version: '0.9.0',
      components: path.relative(testDir, mockComponentsDir),
      tokens: path.relative(testDir, mockTokensPath),
      output: path.relative(testDir, mockManifestPath),
      llmEnrich: false
    };
    writeTestFile(mockConfigPath, mockConfigData);

    // Mock token file
    const mockTokenData = {
      colors: {
        primary: { value: '#007bff', type: 'color' },
        secondary: { value: '#6c757d', type: 'color' }
      },
      spacing: {
        sm: { value: '0.5rem', type: 'dimension' },
        md: { value: '1rem', type: 'dimension' }
      }
    };
    writeTestFile(mockTokensPath, mockTokenData);

    // Mock component source files (e.g., Button.dcp.json, Input.dcp.json)
    // These are simplified component definitions
    const buttonComponentData = {
      name: 'Button',
      description: 'A simple button',
      props: { size: { type: 'string' } },
      tokensUsed: ['colors.primary', 'spacing.md']
    };
    writeTestFile(path.join(mockComponentsDir, 'Button.dcp.json'), buttonComponentData);

    const inputComponentData = {
      name: 'Input',
      description: 'A text input field',
      props: { placeholder: { type: 'string' } },
      tokensUsed: ['colors.secondary', 'spacing.sm']
    };
    writeTestFile(path.join(mockComponentsDir, 'Input.dcp.json'), inputComponentData);
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  test('builds registry successfully using file paths from config', async () => {
    const result = await runBuild({ config: mockConfigPath });

    expect(fs.existsSync(mockManifestPath)).toBe(true);
    const registry = readTestFile(mockManifestPath);

    expect(registry).toHaveProperty('version', '0.9.0');
    expect(registry).toHaveProperty('registryName', 'Test Registry From Config');
    expect(registry.tokens).toEqual({
      'colors.primary': { value: '#007bff', type: 'color' },
      'colors.secondary': { value: '#6c757d', type: 'color' },
      'spacing.sm': { value: '0.5rem', type: 'dimension' },
      'spacing.md': { value: '1rem', type: 'dimension' }
    });
    expect(registry.components).toHaveLength(2);
    expect(registry.components.find(c => c.name === 'Button')).toMatchObject({
      name: 'Button',
      description: 'A simple button',
      // LLM enrichment is off, so no extra fields like a11y notes, examples etc.
    });
    expect(registry.components.find(c => c.name === 'Input')).toBeDefined();
  });

  test('throws error for missing config file', async () => {
    const nonExistentConfigPath = path.join(testDir, 'non-existent.config.json');
    await expect(runBuild({ config: nonExistentConfigPath }))
      .rejects.toThrow('Config file not found');
  });

  test('throws error for invalid config JSON', async () => {
    fs.writeFileSync(mockConfigPath, 'this is not json');
    await expect(runBuild({ config: mockConfigPath }))
      .rejects.toThrow('Invalid config JSON');
  });

  test('throws error for missing token file specified in config', async () => {
    // Write a config that points to a non-existent token file
    const configWithMissingTokens = {
      components: path.relative(testDir, mockComponentsDir),
      tokens: './non-existent-tokens.json',
      output: path.relative(testDir, mockManifestPath)
    };
    writeTestFile(mockConfigPath, configWithMissingTokens);

    await expect(runBuild({ config: mockConfigPath }))
      .rejects.toThrow(/Token source not found at .*non-existent-tokens.json/);
  });

  test('throws error for missing components directory specified in config', async () => {
    // Write a config that points to a non-existent components directory
    const configWithMissingComponents = {
      components: './non-existent-components',
      tokens: path.relative(testDir, mockTokensPath),
      output: path.relative(testDir, mockManifestPath)
    };
    writeTestFile(mockConfigPath, configWithMissingComponents);
    
    // Also, ensure the directory actually doesn't exist for this test case
    if (fs.existsSync(mockComponentsDir)) {
      fs.rmSync(mockComponentsDir, { recursive: true, force: true });
    }

    await expect(runBuild({ config: mockConfigPath }))
      .rejects.toThrow('Components directory not found');
  });

  test('creates output directory if it does not exist', async () => {
    const deepManifestPath = path.join(testDir, 'new', 'deep', 'path', 'final-manifest.json');
    const configData = {
      components: path.relative(testDir, mockComponentsDir),
      tokens: path.relative(testDir, mockTokensPath),
      output: path.relative(testDir, deepManifestPath)
    };
    writeTestFile(mockConfigPath, configData);

    const deepOutputBaseDir = path.dirname(deepManifestPath);
    if (fs.existsSync(deepOutputBaseDir)) {
      fs.rmSync(deepOutputBaseDir, { recursive: true, force: true });
    }

    await runBuild({ config: mockConfigPath });
    expect(fs.existsSync(deepManifestPath)).toBe(true);
  });
}); 