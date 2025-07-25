import { jest } from '@jest/globals';
import path from 'path';
import fs from 'fs'; // For manually writing invalid JSON
import { validateRegistry } from '../../src/commands/validate.js';
import { createTestDir, cleanupTestDir, writeTestFile } from './.test-utils.js';

// Correct paths to schemas, assuming test execution from project root
const projectRoot = process.cwd();
const manifestSchemaPath = path.resolve(projectRoot, 'schemas/manifest.schema.json');
const componentSchemaPath = path.resolve(projectRoot, 'schemas/dcp.component.schema.json');

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
  registryName: "Test Design System",
  registryVersion: "1.0.0",
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
    
    const result = await validateRegistry({ registryPath });
    expect(result).toBe(true);
  });

  test('throws error for missing registry file', async () => {
    const registryPath = path.join(testDir, 'non-existent-registry.json');
    await expect(validateRegistry({ registryPath })).rejects.toThrow('Registry file not found');
  });

  test('throws error for invalid JSON in registry file', async () => {
    const registryPath = path.join(testDir, 'invalid-json.json');
    fs.writeFileSync(registryPath, 'this is not json'); // Manually write invalid JSON

    await expect(validateRegistry({ registryPath })).rejects.toThrow('Invalid registry JSON');
  });

  test('throws error for registry not matching manifest schema', async () => {
    const registryPath = path.join(testDir, 'invalid-structure.json');
    const invalidStructureData = { ...validRegistryData };
    delete invalidStructureData.components; // 'components' is required by manifest
    writeTestFile(registryPath, invalidStructureData);

    await expect(validateRegistry({ registryPath })).rejects.toThrow('Invalid registry format based on manifest schema');
  });

  test('throws error for registry with invalid component', async () => {
    const registryPath = path.join(testDir, 'invalid-component-registry.json');
    const registryWithInvalidComponent = {
      ...validRegistryData,
      components: [{
        name: invalidComponent.name,
        path: "./components/InvalidButton.dcp.json"
      }]
    };
    writeTestFile(registryPath, registryWithInvalidComponent);

    await expect(validateRegistry({ registryPath })).rejects.toThrow('Invalid registry format: Component validation failed');
  });
}); 