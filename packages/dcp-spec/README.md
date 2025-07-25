# @dcp/spec

Design Component Protocol (DCP) specification package containing JSON schemas, OpenAPI definitions, and MCP manifest.

## Overview

This package contains the **contract** definition for the Design Component Protocol:

- 📋 **JSON Schemas** - Component, config, manifest, and theme definitions
- 🔗 **OpenAPI Spec** - HTTP API contract for DCP services  
- 🔌 **MCP Manifest** - Model Context Protocol integration specification

## Installation

```bash
npm install @dcp/spec
```

## Usage

### Import Schemas

```javascript
import { componentSchema, configSchema, schemas } from '@dcp/spec';

// Validate a component against the schema
import Ajv, { addFormats } from '@dcp/spec';

const ajv = new Ajv();
addFormats(ajv);
const validate = ajv.compile(componentSchema);

if (validate(myComponent)) {
  console.log('Valid component!');
} else {
  console.error('Validation errors:', validate.errors);
}
```

### Access OpenAPI Spec

```javascript
import { openApiSpec } from '@dcp/spec';

// Use for API client generation, documentation, etc.
console.log(openApiSpec.info.title); // "DCP API"
```

### MCP Integration

```javascript
import { mcpManifest } from '@dcp/spec';

// Use for MCP server setup
console.log(mcpManifest.capabilities.tools);
```

## Schema Definitions

- `dcp.component.schema.json` - Individual component definition
- `config.schema.json` - DCP configuration file format  
- `manifest.schema.json` - Registry manifest structure
- `theme.schema.json` - Design token/theme definitions

## API Contract

The OpenAPI specification defines:

- `/extract` - Component extraction endpoints
- `/mutate` - Registry mutation operations  
- `/validate` - Schema validation services
- `/query` - Registry search and filtering

## Contributing

This package contains only the DCP **specification**. For implementation changes, see the `@dcp/toolkit` package.

To modify schemas or API contracts:

1. Update relevant files in this package
2. Increment version according to semver (breaking changes = major bump)
3. Update dependent packages (`@dcp/toolkit`, etc.)

## Versioning

- **Major** - Breaking schema changes, API contract changes
- **Minor** - New optional fields, backward-compatible API additions  
- **Patch** - Documentation updates, clarifications

Current version: **1.0.0**