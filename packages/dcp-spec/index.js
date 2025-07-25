// Main DCP Spec exports
export * from './schemas/index.js';

// OpenAPI spec
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { load } from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const openApiSpec = (() => {
  const yamlPath = join(__dirname, 'api', 'openapi.yaml');
  const yamlContent = readFileSync(yamlPath, 'utf-8');
  return load(yamlContent);
})();

// MCP manifest
export const mcpManifest = (() => {
  const manifestPath = join(__dirname, 'mcp', 'manifest.json');
  return JSON.parse(readFileSync(manifestPath, 'utf-8'));
})();

// Version and metadata
export const DCP_VERSION = '1.0.0';
export const DCP_SCHEMA_VERSION = '1.0.0';