import { jest } from '@jest/globals';
import path from 'path';
import fs from 'fs'; // For manually writing invalid JSON
import { validateRegistry } from '../../src/commands/validate.js';
import { createTestDir, cleanupTestDir, writeTestFile } from './.test-utils.js';

// Valid component for testing
const validComponent = {
  name: "Button",
  description: "A simple button component.",
  version: "1.0.0",
  props: {
    label: {
      type: "string",
      description: "The text to display on the button.",
      required: true
    }
  }
};

// Invalid component (missing description)
const invalidComponent = {
  name: "Invalid Button",
  version: "1.0.0",
  props: {}
};

// Valid registry structure
const validRegistryData = {
  name: "Test Design System",
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  components: [{
    name: validComponent.name,
    path: "./components/Button.dcp.json",
    category: "Core",
    tags: ["interactive"]
  }],
  tokens: [{
    name: "theme",
    path: "./tokens/theme.dcp.json"
  }]
};

describe('validateRegistry', () => {
  let testDir;

  beforeEach(() => {
    testDir = createTestDir();
    // Create component and token files
    const componentsDir = path.join(testDir, 'components');
    const tokensDir = path.join(testDir, 'tokens');
    fs.mkdirSync(componentsDir);
    fs.mkdirSync(tokensDir);
    writeTestFile(path.join(componentsDir, 'Button.dcp.json'), validComponent);
    writeTestFile(path.join(tokensDir, 'theme.dcp.json'), {
      colors: { primary: "#007bff" }
    });
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  test('validates a valid registry file successfully', async () => {
    const registryPath = path.join(testDir, 'valid-registry.json');
    writeTestFile(registryPath, validRegistryData);

    const result = await validateRegistry(registryPath);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('returns error for missing registry file', async () => {
    const registryPath = path.join(testDir, 'non-existent-registry.json');
    const result = await validateRegistry(registryPath);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not found'))).toBe(true);
  });

  test('returns error for invalid JSON in registry file', async () => {
    const registryPath = path.join(testDir, 'invalid-json.json');
    fs.writeFileSync(registryPath, 'this is not json');

    const result = await validateRegistry(registryPath);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid registry JSON'))).toBe(true);
  });

  test('returns error for registry not matching manifest schema', async () => {
    const registryPath = path.join(testDir, 'invalid-structure.json');
    const invalidStructureData = { ...validRegistryData };
    delete invalidStructureData.components;
    writeTestFile(registryPath, invalidStructureData);

    const result = await validateRegistry(registryPath);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('returns error for registry with missing required fields', async () => {
    const registryPath = path.join(testDir, 'invalid-component-registry.json');
    // Registry missing name and version — required fields
    const registryMissingFields = {
      generatedAt: new Date().toISOString(),
      components: [{ name: 'Button', path: './components/Button.dcp.json' }]
    };
    writeTestFile(registryPath, registryMissingFields);

    const result = await validateRegistry(registryPath);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
