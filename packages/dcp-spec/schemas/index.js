// DCP Schema exports
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to load JSON schema
const loadSchema = (filename) => {
  const path = join(__dirname, filename);
  return JSON.parse(readFileSync(path, 'utf-8'));
};

export const componentSchema = loadSchema('dcp.component.schema.json');
export const configSchema = loadSchema('config.schema.json');
export const manifestSchema = loadSchema('manifest.schema.json');
export const themeSchema = loadSchema('theme.schema.json');

// Schema validation utilities
export { default as Ajv } from 'ajv';
export { default as addFormats } from 'ajv-formats';

// Re-export all schemas as a collection
export const schemas = {
  component: componentSchema,
  config: configSchema,
  manifest: manifestSchema,
  theme: themeSchema
};