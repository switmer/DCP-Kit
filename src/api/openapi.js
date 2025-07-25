/**
 * OpenAPI 3.0 Specification for DCP API
 * 
 * Provides comprehensive documentation for all endpoints,
 * authentication schemes, and data models.
 */

export function createOpenApiSpec(baseUrl = 'http://localhost:7401') {
  return {
    openapi: '3.0.3',
    info: {
      title: 'DCP API',
      version: '2.0.0',
      description: `
# Design Component Protocol API

The DCP API transforms design system management from a CLI tool into a comprehensive platform for teams, tools, and AI agents.

## Features

- 🔍 **Query & Browse** - Explore components, tokens, and usage patterns
- ✅ **Validate & Lint** - Check code against design system contracts  
- 🧬 **Mutate & Preview** - AI-powered design system mutations with visual diffs
- 🏗️ **Generate & Build** - Create component libraries for any framework
- 📊 **Analytics & Insights** - Track usage, coverage, and drift

## Authentication

Most endpoints require a Bearer token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limits

- **Public endpoints**: 1000 requests per 15 minutes
- **Authenticated endpoints**: 5000 requests per 15 minutes  
- **Admin endpoints**: No limit

## SDKs & Tools

- [TypeScript SDK](https://npmjs.com/package/@dcp/sdk)
- [VSCode Extension](https://marketplace.visualstudio.com/items?itemName=dcp.vscode)
- [Figma Plugin](https://figma.com/community/plugin/dcp)
- [MCP Server](https://github.com/dcp/mcp-server) for AI agents
      `,
      contact: {
        name: 'DCP Support',
        url: 'https://dcp.dev/support',
        email: 'support@dcp.dev'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: baseUrl + '/api/v1',
        description: 'DCP API v1'
      },
      {
        url: 'https://api.dcp.dev/v1',
        description: 'Production API'
      }
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health Check',
          description: 'Check API server health and registry status',
          tags: ['System'],
          responses: {
            200: {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' }
                }
              }
            },
            503: {
              description: 'Server is unhealthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/registry': {
        get: {
          summary: 'Get Full Registry',
          description: 'Retrieve the complete design system registry including components and tokens',
          tags: ['Registry'],
          responses: {
            200: {
              description: 'Complete registry data',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Registry' }
                }
              }
            }
          }
        }
      },
      '/registry/components': {
        get: {
          summary: 'List Components',
          description: 'Get paginated list of components with optional filtering',
          tags: ['Components'],
          parameters: [
            {
              name: 'page',
              in: 'query',
              description: 'Page number (1-based)',
              schema: { type: 'integer', minimum: 1, default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
            },
            {
              name: 'search',
              in: 'query',
              description: 'Search components by name or description',
              schema: { type: 'string' }
            },
            {
              name: 'category',
              in: 'query',
              description: 'Filter by component category',
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: {
              description: 'Paginated component list',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ComponentList' }
                }
              }
            }
          }
        }
      },
      '/registry/components/{name}': {
        get: {
          summary: 'Get Component Details',
          description: 'Retrieve detailed information about a specific component',
          tags: ['Components'],
          parameters: [
            {
              name: 'name',
              in: 'path',
              required: true,
              description: 'Component name',
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: {
              description: 'Component details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Component' }
                }
              }
            },
            404: {
              description: 'Component not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/registry/tokens': {
        get: {
          summary: 'List Design Tokens',
          description: 'Get paginated list of design tokens with optional formatting',
          tags: ['Tokens'],
          parameters: [
            {
              name: 'page',
              in: 'query',
              description: 'Page number (1-based)',
              schema: { type: 'integer', minimum: 1, default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page',
              schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 }
            },
            {
              name: 'category',
              in: 'query',
              description: 'Filter by token category (color, spacing, typography, etc.)',
              schema: { type: 'string' }
            },
            {
              name: 'format',
              in: 'query',
              description: 'Output format',
              schema: { type: 'string', enum: ['json', 'css'], default: 'json' }
            }
          ],
          responses: {
            200: {
              description: 'Paginated token list',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/TokenList' }
                }
              }
            }
          }
        }
      },
      '/query': {
        post: {
          summary: 'Query Registry',
          description: 'Execute advanced queries using DCP selector syntax',
          tags: ['Query'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/QueryRequest' }
              }
            }
          },
          responses: {
            200: {
              description: 'Query results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/QueryResponse' }
                }
              }
            },
            400: {
              description: 'Invalid query',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/validate': {
        post: {
          summary: 'Validate Code',
          description: 'Validate code against design system contracts and best practices',
          tags: ['Validation'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationRequest' }
              }
            }
          },
          responses: {
            200: {
              description: 'Validation results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidationResponse' }
                }
              }
            },
            400: {
              description: 'Invalid request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/preview': {
        post: {
          summary: 'Preview Mutations',
          description: 'Preview the effects of JSON Patch mutations before applying them',
          tags: ['Mutations'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PreviewRequest' }
              }
            }
          },
          responses: {
            200: {
              description: 'Mutation preview',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PreviewResponse' }
                }
              }
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            400: {
              description: 'Invalid patches',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/mutate': {
        post: {
          summary: 'Apply Mutations',
          description: 'Apply JSON Patch mutations to the registry (requires contributor role)',
          tags: ['Mutations'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MutationRequest' }
              }
            }
          },
          responses: {
            200: {
              description: 'Mutations applied successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MutationResponse' }
                }
              }
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            403: { $ref: '#/components/responses/ForbiddenError' },
            400: {
              description: 'Invalid patches or validation failed',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authenticated endpoints'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      },
      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            version: { type: 'string', example: '2.0.0' },
            timestamp: { type: 'string', format: 'date-time' },
            environment: { type: 'string', example: 'production' },
            registry: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                accessible: { type: 'boolean' }
              }
            },
            uptime: { type: 'number' },
            memory: { type: 'object' },
            requestId: { type: 'string' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            requestId: { type: 'string' },
            details: { type: 'object' }
          },
          required: ['error', 'message', 'requestId']
        },
        Registry: {
          type: 'object',
          properties: {
            namespace: { type: 'string', example: 'ui' },
            version: { type: 'string', example: '1.0.0' },
            components: {
              type: 'array',
              items: { $ref: '#/components/schemas/Component' }
            },
            tokens: { type: 'object' },
            metadata: { type: 'object' },
            requestId: { type: 'string' }
          }
        },
        Component: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Button' },
            description: { type: 'string' },
            category: { type: 'string', example: 'inputs' },
            props: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  required: { type: 'boolean' },
                  description: { type: 'string' },
                  default: { type: 'string' }
                }
              }
            },
            variants: {
              type: 'array',
              items: { type: 'string' }
            },
            examples: { type: 'array' },
            metadata: { type: 'object' }
          },
          required: ['name']
        },
        ComponentList: {
          type: 'object',
          properties: {
            components: {
              type: 'array',
              items: { $ref: '#/components/schemas/Component' }
            },
            pagination: { $ref: '#/components/schemas/Pagination' },
            filters: { type: 'object' },
            requestId: { type: 'string' }
          }
        },
        TokenList: {
          type: 'object',
          properties: {
            tokens: { type: 'object' },
            pagination: { $ref: '#/components/schemas/Pagination' },
            format: { type: 'string' },
            requestId: { type: 'string' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' }
          }
        },
        QueryRequest: {
          type: 'object',
          properties: {
            selector: { 
              type: 'string',
              description: 'DCP selector query',
              example: 'components[category=inputs][props.variant]'
            },
            options: {
              type: 'object',
              properties: {
                includeMetadata: { type: 'boolean', default: false },
                format: { type: 'string', enum: ['json', 'summary'], default: 'json' }
              }
            }
          },
          required: ['selector']
        },
        QueryResponse: {
          type: 'object',
          properties: {
            selector: { type: 'string' },
            options: { type: 'object' },
            results: { type: 'object' },
            count: { type: 'integer' },
            requestId: { type: 'string' }
          }
        },
        ValidationRequest: {
          type: 'object',
          properties: {
            code: { 
              type: 'string',
              description: 'Source code to validate'
            },
            filePath: { 
              type: 'string',
              description: 'File path for context (optional)'
            },
            rules: {
              type: 'array',
              items: { type: 'string' },
              description: 'Custom validation rules'
            }
          },
          required: ['code']
        },
        ValidationResponse: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  line: { type: 'integer' },
                  column: { type: 'integer' },
                  message: { type: 'string' },
                  rule: { type: 'string' },
                  severity: { type: 'string', enum: ['error', 'warning', 'info'] }
                }
              }
            },
            warnings: { type: 'array' },
            suggestions: { type: 'array' },
            metadata: { type: 'object' },
            requestId: { type: 'string' }
          }
        },
        PreviewRequest: {
          type: 'object',
          properties: {
            patches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  op: { type: 'string', enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'] },
                  path: { type: 'string' },
                  value: { type: 'object' },
                  from: { type: 'string' }
                },
                required: ['op', 'path']
              }
            },
            options: {
              type: 'object',
              properties: {
                generateDiff: { type: 'boolean', default: true },
                includeVisualPreview: { type: 'boolean', default: false }
              }
            }
          },
          required: ['patches']
        },
        PreviewResponse: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            patches: { type: 'array' },
            diff: { type: 'string' },
            changes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  operation: { type: 'string' },
                  before: { type: 'object' },
                  after: { type: 'object' }
                }
              }
            },
            warnings: { type: 'array' },
            requestId: { type: 'string' }
          }
        },
        MutationRequest: {
          type: 'object',
          properties: {
            patches: { type: 'array' },
            message: { 
              type: 'string',
              description: 'Commit message for the mutation'
            },
            createUndo: { 
              type: 'boolean',
              default: true,
              description: 'Whether to create undo information'
            }
          },
          required: ['patches']
        },
        MutationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            patchesApplied: { type: 'integer' },
            changes: { type: 'array' },
            undoId: { type: 'string' },
            registryUpdated: { type: 'boolean' },
            requestId: { type: 'string' }
          }
        }
      }
    },
    tags: [
      {
        name: 'System',
        description: 'System health and metadata endpoints'
      },
      {
        name: 'Registry',
        description: 'Registry data access and browsing'
      },
      {
        name: 'Components',
        description: 'Component management and discovery'
      },
      {
        name: 'Tokens',
        description: 'Design token access and formatting'
      },
      {
        name: 'Query',
        description: 'Advanced querying capabilities'
      },
      {
        name: 'Validation',
        description: 'Code validation and linting'
      },
      {
        name: 'Mutations',
        description: 'Registry mutations and previews'
      }
    ]
  };
}