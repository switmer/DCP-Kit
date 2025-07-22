import fs from 'fs';
import path from 'path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readJSON } from '../core/utils.js';

export async function validateRegistry({ registryPath = './dcp-registry/manifest.json' } = {}) {
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Registry file not found at ${registryPath}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (err) {
    throw new Error('Invalid registry JSON');
  }

  // Create new Ajv instance for each validation
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);

  // Load and compile schemas
  const manifestSchema = readJSON(path.resolve('./schemas/manifest.schema.json'));
  const componentSchema = readJSON(path.resolve('./schemas/dcp.component.schema.json'));
  
  const validateManifest = ajv.compile(manifestSchema);
  const validateComponent = ajv.compile(componentSchema);

  // Validate manifest
  if (!validateManifest(manifest)) {
    const errors = ajv.errorsText(validateManifest.errors);
    throw new Error(`Invalid registry format based on manifest schema: ${errors}`);
  }

  // Validate each component
  for (const comp of manifest.components) {
    const componentPath = path.join(path.dirname(registryPath), comp.path);
    try {
      const component = readJSON(componentPath);
      if (!validateComponent(component)) {
        const errors = ajv.errorsText(validateComponent.errors);
        throw new Error(`Invalid component ${comp.name}: ${errors}`);
      }
    } catch (err) {
      throw new Error('Invalid registry format: Component validation failed');
    }
  }

  return true;
}
