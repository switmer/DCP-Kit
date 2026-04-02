import { jest } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { runBuild } from '../../src/commands/build.js';
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

    // Mock component source files
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
    const result = await runBuild({ configPath: mockConfigPath });

    expect(result).toBeDefined();
    expect(fs.existsSync(mockManifestPath)).toBe(true);
    const registry = readTestFile(mockManifestPath);

    // Registry should have been written with expected structure
    expect(registry.components).toBeDefined();
    expect(registry.tokens).toBeDefined();
    expect(registry.version).toBeDefined();
  });

  test('throws error for missing config file', async () => {
    const nonExistentConfigPath = path.join(testDir, 'non-existent.config.json');
    await expect(runBuild({ configPath: nonExistentConfigPath }))
      .rejects.toThrow(/Config file not found|Build failed/);
  });

  test('throws error for invalid config JSON', async () => {
    fs.writeFileSync(mockConfigPath, 'this is not json');
    await expect(runBuild({ configPath: mockConfigPath }))
      .rejects.toThrow(/Build failed/);
  });

  test('handles missing token file gracefully', async () => {
    const configWithMissingTokens = {
      components: path.relative(testDir, mockComponentsDir),
      tokens: './non-existent-tokens.json',
      output: path.relative(testDir, mockManifestPath)
    };
    writeTestFile(mockConfigPath, configWithMissingTokens);

    // Build succeeds with fallback tokens when specified file is missing
    const result = await runBuild({ configPath: mockConfigPath });
    expect(result).toBeDefined();
  });

  test('handles missing components directory gracefully', async () => {
    const configWithMissingComponents = {
      components: './non-existent-components',
      tokens: path.relative(testDir, mockTokensPath),
      output: path.relative(testDir, mockManifestPath)
    };
    writeTestFile(mockConfigPath, configWithMissingComponents);

    if (fs.existsSync(mockComponentsDir)) {
      fs.rmSync(mockComponentsDir, { recursive: true, force: true });
    }

    // Build succeeds with empty components when directory is missing
    const result = await runBuild({ configPath: mockConfigPath });
    expect(result).toBeDefined();
  });

  test('creates output directory if it does not exist', async () => {
    const deepManifestPath = path.join(testDir, 'new', 'deep', 'path', 'final-manifest.json');
    const configData = {
      components: path.relative(testDir, mockComponentsDir),
      tokens: path.relative(testDir, mockTokensPath),
      output: path.relative(testDir, deepManifestPath)
    };
    writeTestFile(mockConfigPath, configData);

    const result = await runBuild({ configPath: mockConfigPath });
    expect(result).toBeDefined();
    expect(fs.existsSync(deepManifestPath)).toBe(true);
  });
});
