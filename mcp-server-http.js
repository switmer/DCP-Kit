#!/usr/bin/env node

/**
 * DCP MCP HTTP Server - Agent-Installable Design System Registry
 * Provides HTTP endpoints for design system contract access
 * Enables: mcp install https://acme-corp.com/registry
 */

import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { DCPMCPServer } from './mcp-server.js';
import { ProjectIntelligenceScanner } from './core/projectIntelligence.js';

class DCPMCPHTTPServer {
  constructor(registryPath = './registry', options = {}) {
    this.registryPath = registryPath;
    this.options = {
      port: 3000,
      host: '0.0.0.0',
      enableCors: true,
      baseUrl: null,
      apiKey: null,
      version: '1.0.0',
      ...options
    };
    
    this.app = express();
    this.mcpServer = new DCPMCPServer(registryPath);
    this.registry = null;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // CORS support for browser-based agents
    if (this.options.enableCors) {
      this.app.use(cors({
        origin: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
      }));
    }

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));

    // API Key authentication (optional)
    if (this.options.apiKey) {
      this.app.use((req, res, next) => {
        const token = req.headers.authorization?.replace('Bearer ', '') ||
                     req.headers['x-api-key'] ||
                     req.query.apiKey;
        
        if (token !== this.options.apiKey) {
          return res.status(401).json({ 
            error: 'Unauthorized',
            message: 'Valid API key required'
          });
        }
        next();
      });
    }

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Root discovery endpoint
    this.app.get('/', this.getRegistryInfo.bind(this));
    
    // MCP protocol endpoints
    this.app.get('/mcp/tools', this.listMCPTools.bind(this));
    this.app.post('/mcp/call', this.callMCPTool.bind(this));
    
    // Registry access endpoints
    this.app.get('/registry', this.getRegistry.bind(this));
    this.app.get('/registry/meta', this.getRegistryMeta.bind(this));
    this.app.get('/registry/components', this.getComponents.bind(this));
    this.app.get('/registry/components/:name', this.getComponent.bind(this));
    this.app.get('/registry/tokens', this.getTokens.bind(this));
    this.app.get('/registry/tokens/:category', this.getTokensByPath.bind(this));
    this.app.get('/registry/themes', this.getThemes.bind(this));
    
    // Install and discovery endpoints
    this.app.get('/install', this.getInstallInstructions.bind(this));
    this.app.get('/meta.json', this.getRegistryMeta.bind(this));
    this.app.get('/capabilities', this.getCapabilities.bind(this));
    
    // Validation endpoints
    this.app.post('/validate', this.validateCode.bind(this));
    this.app.post('/query', this.queryRegistry.bind(this));
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: this.options.version
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Endpoint ${req.path} not found`,
        availableEndpoints: [
          '/',
          '/registry',
          '/mcp/tools',
          '/install',
          '/capabilities'
        ]
      });
    });

    // Error handler
    this.app.use((error, req, res, next) => {
      console.error('Server error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    });
  }

  async loadRegistry() {
    if (!this.registry) {
      try {
        const registryFile = path.join(this.registryPath, 'registry.json');
        const data = await fs.readFile(registryFile, 'utf8');
        this.registry = JSON.parse(data);
      } catch (error) {
        console.error('Failed to load registry:', error.message);
        this.registry = { components: [], tokens: {}, error: error.message };
      }
    }
    return this.registry;
  }

  // Route handlers
  async getRegistryInfo(req, res) {
    try {
      const registry = await this.loadRegistry();
      const baseUrl = this.getBaseUrl(req);
      
      res.json({
        name: 'DCP Design System Registry',
        version: this.options.version,
        description: 'Agent-installable design system contract',
        registryUrl: `${baseUrl}/registry`,
        mcpEndpoint: `${baseUrl}/mcp`,
        installUrl: `${baseUrl}/install`,
        capabilities: `${baseUrl}/capabilities`,
        components: registry.components?.length || 0,
        tokens: Object.keys(registry.tokens || {}).length,
        lastUpdated: registry.metadata?.extractedAt || new Date().toISOString(),
        documentation: `${baseUrl}/install`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRegistry(req, res) {
    try {
      const registry = await this.loadRegistry();
      res.json(registry);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRegistryMeta(req, res) {
    try {
      const registry = await this.loadRegistry();
      const baseUrl = this.getBaseUrl(req);
      
      const meta = {
        '@context': 'https://modelcontextprotocol.org/v1',
        name: registry.name || 'Design System Registry',
        version: registry.version || '1.0.0',
        description: registry.description || 'DCP-generated design system registry',
        mcpEndpoint: `${baseUrl}/mcp`,
        installCommand: `mcp install ${baseUrl}`,
        cliInstallCommand: `npx dcp connect --remote ${baseUrl}`,
        capabilities: [
          'query-tokens',
          'get-components', 
          'validate-code',
          'suggest-alternatives',
          'project-scan'
        ],
        lastUpdated: registry.metadata?.extractedAt || new Date().toISOString(),
        stats: {
          components: registry.components?.length || 0,
          tokens: Object.keys(registry.tokens || {}).length,
          themes: registry.themeContext ? 1 : 0
        },
        endpoints: {
          registry: '/registry',
          components: '/registry/components',
          tokens: '/registry/tokens',
          validate: '/validate',
          query: '/query'
        }
      };

      res.json(meta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getComponents(req, res) {
    try {
      const registry = await this.loadRegistry();
      const components = registry.components || [];
      
      // Optional filtering
      const { name, category, hasProps } = req.query;
      let filtered = components;
      
      if (name) {
        filtered = filtered.filter(c => 
          (c.name || '').toLowerCase().includes(name.toLowerCase())
        );
      }
      
      if (category) {
        filtered = filtered.filter(c => 
          (c.category || '').toLowerCase() === category.toLowerCase()
        );
      }
      
      if (hasProps === 'true') {
        filtered = filtered.filter(c => c.props && c.props.length > 0);
      }

      res.json({
        components: filtered,
        count: filtered.length,
        total: components.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getComponent(req, res) {
    try {
      const registry = await this.loadRegistry();
      const componentName = req.params.name;
      
      const component = registry.components?.find(c => 
        c.name === componentName || 
        c.displayName === componentName ||
        c.exportName === componentName
      );

      if (!component) {
        return res.status(404).json({
          error: 'Component not found',
          available: registry.components?.map(c => c.name || c.displayName) || []
        });
      }

      res.json({
        component,
        usage: this.generateComponentUsage(component),
        examples: this.generateComponentExamples(component)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTokens(req, res) {
    try {
      const registry = await this.loadRegistry();
      const tokens = registry.tokens || {};
      
      // Optional filtering
      const { category, type, format = 'nested' } = req.query;
      let filteredTokens = tokens;
      
      if (category && tokens[category]) {
        filteredTokens = { [category]: tokens[category] };
      }

      if (format === 'flat') {
        filteredTokens = this.flattenTokens(filteredTokens);
      }

      res.json({
        tokens: filteredTokens,
        themeContext: registry.themeContext,
        count: Object.keys(this.flattenTokens(filteredTokens)).length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTokensByPath(req, res) {
    try {
      const registry = await this.loadRegistry();
      const tokenPath = req.params.category;
      const tokens = registry.tokens || {};
      
      // Navigate to nested token
      const pathParts = tokenPath.split('.');
      let current = tokens;
      
      for (const part of pathParts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          return res.status(404).json({
            error: 'Token path not found',
            path: tokenPath
          });
        }
      }

      res.json({
        path: tokenPath,
        value: current,
        type: typeof current === 'object' && current.type ? current.type : 'unknown'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getThemes(req, res) {
    try {
      const registry = await this.loadRegistry();
      const themeContext = registry.themeContext || {};
      
      res.json({
        config: themeContext.config,
        cssVariables: themeContext.cssVariables || {},
        summary: themeContext.summary || 'No theme configuration detected'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getInstallInstructions(req, res) {
    try {
      const baseUrl = this.getBaseUrl(req);
      
      const instructions = {
        title: 'Install DCP Design System Registry',
        description: 'Connect to this design system registry for agents and humans',
        methods: {
          mcp: {
            title: 'For AI Agents (MCP)',
            command: `mcp install ${baseUrl}`,
            description: 'Install via Model Context Protocol for agent access',
            endpoints: {
              tools: `${baseUrl}/mcp/tools`,
              call: `${baseUrl}/mcp/call`
            }
          },
          cli: {
            title: 'For Developers (CLI)',
            command: `npx dcp connect --remote ${baseUrl}`,
            description: 'Connect via DCP CLI for human workflows',
            examples: [
              `npx dcp query "tokens.color.*" --remote ${baseUrl}`,
              `npx dcp validate-ci ./src --remote ${baseUrl}`
            ]
          },
          http: {
            title: 'For Custom Integrations (HTTP API)',
            baseUrl: baseUrl,
            description: 'Direct HTTP access to registry data',
            endpoints: {
              registry: `${baseUrl}/registry`,
              components: `${baseUrl}/registry/components`,
              tokens: `${baseUrl}/registry/tokens`,
              validate: `${baseUrl}/validate`
            }
          }
        },
        quickStart: [
          `1. Discover: GET ${baseUrl}/meta.json`,
          `2. Browse: GET ${baseUrl}/registry/components`,
          `3. Query: POST ${baseUrl}/query with selector`,
          `4. Validate: POST ${baseUrl}/validate with code`
        ]
      };

      res.json(instructions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCapabilities(req, res) {
    try {
      const baseUrl = this.getBaseUrl(req);
      
      res.json({
        '@context': 'https://modelcontextprotocol.org/v1',
        capabilities: {
          tools: {
            listSupported: true,
            callSupported: true
          },
          resources: {
            subscribe: false,
            listChanged: false
          }
        },
        tools: [
          {
            name: 'dcp_query_tokens',
            description: 'Query design tokens with filtering',
            endpoint: `${baseUrl}/mcp/call`
          },
          {
            name: 'dcp_get_component',
            description: 'Get component details and API',
            endpoint: `${baseUrl}/mcp/call`
          },
          {
            name: 'dcp_validate_code',
            description: 'Validate code against design system',
            endpoint: `${baseUrl}/mcp/call`
          },
          {
            name: 'dcp_suggest_alternatives',
            description: 'Suggest valid alternatives for off-spec code',
            endpoint: `${baseUrl}/mcp/call`
          },
          {
            name: 'dcp_project_scan',
            description: 'Analyze project for design system compatibility',
            endpoint: `${baseUrl}/mcp/call`
          }
        ]
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async listMCPTools(req, res) {
    try {
      // Delegate to our MCP server's tool list
      const tools = [
        {
          name: 'dcp_query_tokens',
          description: 'Query design tokens from the registry with optional filtering',
          inputSchema: {
            type: 'object',
            properties: {
              filter: { type: 'string', description: 'Token filter pattern' },
              category: { type: 'string', description: 'Token category' },
              format: { type: 'string', enum: ['css', 'js', 'tailwind', 'raw'] }
            }
          }
        },
        {
          name: 'dcp_get_component',
          description: 'Get detailed information about a specific component',
          inputSchema: {
            type: 'object',
            properties: {
              component: { type: 'string', description: 'Component name' },
              include: { 
                type: 'array', 
                items: { type: 'string', enum: ['props', 'variants', 'examples', 'dependencies'] }
              }
            },
            required: ['component']
          }
        },
        {
          name: 'dcp_validate_code',
          description: 'Validate code against design system constraints',
          inputSchema: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'Code to validate' },
              component: { type: 'string', description: 'Component name' },
              checkTokens: { type: 'boolean', default: true },
              checkProps: { type: 'boolean', default: true }
            },
            required: ['code']
          }
        }
      ];

      res.json({ tools });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async callMCPTool(req, res) {
    try {
      const { name, arguments: args } = req.body;
      
      if (!name) {
        return res.status(400).json({
          error: 'Missing required field: name'
        });
      }

      // Create a mock request that our MCP server can handle
      const mockRequest = {
        params: { name, arguments: args || {} }
      };

      // This is a simplified version - in practice, you'd want to properly
      // integrate with the MCP server's request handling
      let result;
      
      switch (name) {
        case 'dcp_query_tokens':
          result = await this.handleMCPQueryTokens(args || {});
          break;
        case 'dcp_get_component':
          result = await this.handleMCPGetComponent(args || {});
          break;
        case 'dcp_validate_code':
          result = await this.handleMCPValidateCode(args || {});
          break;
        default:
          return res.status(400).json({
            error: `Unknown tool: ${name}`
          });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: error.message,
        isError: true 
      });
    }
  }

  async queryRegistry(req, res) {
    try {
      const { selector, format = 'json' } = req.body;
      
      if (!selector) {
        return res.status(400).json({
          error: 'Missing required field: selector'
        });
      }

      // This would integrate with your existing query engine
      const result = await this.handleMCPQueryTokens({ filter: selector, format });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async validateCode(req, res) {
    try {
      const { code, component, checkTokens = true, checkProps = true } = req.body;
      
      if (!code) {
        return res.status(400).json({
          error: 'Missing required field: code'
        });
      }

      const result = await this.handleMCPValidateCode({
        code, component, checkTokens, checkProps
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // MCP tool handlers (simplified versions)
  async handleMCPQueryTokens(args) {
    const registry = await this.loadRegistry();
    const { filter = '*', category, format = 'json' } = args;
    
    let tokens = registry.tokens || {};
    
    if (category && tokens[category]) {
      tokens = { [category]: tokens[category] };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          tokens,
          count: Object.keys(this.flattenTokens(tokens)).length,
          themeContext: registry.themeContext
        }, null, 2)
      }]
    };
  }

  async handleMCPGetComponent(args) {
    const registry = await this.loadRegistry();
    const { component, include = ['props', 'variants'] } = args;
    
    const comp = registry.components?.find(c => 
      c.name === component || c.displayName === component
    );

    if (!comp) {
      return {
        content: [{
          type: 'text',
          text: `Component "${component}" not found`
        }]
      };
    }

    const response = {
      name: comp.name || comp.displayName,
      description: comp.description
    };

    if (include.includes('props')) {
      response.props = comp.props || [];
    }

    if (include.includes('variants')) {
      response.variants = comp.variants || {};
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  async handleMCPValidateCode(args) {
    const { code, component, checkTokens, checkProps } = args;
    
    // Simplified validation - in practice, integrate with your validation engine
    const violations = [];
    
    // Basic token validation
    if (checkTokens) {
      const hardcodedColors = code.match(/#[0-9a-fA-F]{3,6}/g) || [];
      for (const color of hardcodedColors) {
        violations.push({
          type: 'hardcoded-color',
          message: `Hardcoded color "${color}" should use design token`,
          severity: 'warning'
        });
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          valid: violations.length === 0,
          violations,
          message: violations.length === 0 ? 
            'Code follows design system constraints' :
            `Found ${violations.length} violations`
        }, null, 2)
      }]
    };
  }

  // Helper methods
  getBaseUrl(req) {
    if (this.options.baseUrl) {
      return this.options.baseUrl;
    }
    
    const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'http';
    const host = req.get('Host') || `${this.options.host}:${this.options.port}`;
    return `${protocol}://${host}`;
  }

  flattenTokens(tokens, prefix = '') {
    const flattened = {};
    
    for (const [key, value] of Object.entries(tokens)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if ('value' in value) {
          flattened[currentPath] = value;
        } else {
          Object.assign(flattened, this.flattenTokens(value, currentPath));
        }
      } else {
        flattened[currentPath] = { value };
      }
    }
    
    return flattened;
  }

  generateComponentUsage(component) {
    const name = component.name || component.displayName;
    const requiredProps = (component.props || [])
      .filter(p => p.required)
      .map(p => `${p.name}={/* ${p.type || 'any'} */}`)
      .join(' ');

    return {
      basic: `<${name} ${requiredProps} />`,
      withProps: `<${name} ${requiredProps} className="..." />`,
      description: `Import and use the ${name} component with required props`
    };
  }

  generateComponentExamples(component) {
    const name = component.name || component.displayName;
    const examples = [];

    examples.push({
      title: 'Basic Usage',
      code: `<${name} />`
    });

    if (component.variants && Object.keys(component.variants).length > 0) {
      const variantKey = Object.keys(component.variants)[0];
      const variantValue = component.variants[variantKey][0];
      examples.push({
        title: 'With Variant',
        code: `<${name} ${variantKey}="${variantValue}" />`
      });
    }

    return examples;
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(this.options.port, this.options.host, () => {
          const baseUrl = `http://${this.options.host}:${this.options.port}`;
          console.log(`🚀 DCP MCP HTTP Server running at ${baseUrl}`);
          console.log(`📁 Registry: ${this.registryPath}`);
          console.log(`🧠 MCP Endpoint: ${baseUrl}/mcp`);
          console.log(`📋 Install Instructions: ${baseUrl}/install`);
          console.log(`💡 Registry Info: ${baseUrl}/`);
          resolve({ server, baseUrl });
        });

        server.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const registryPath = process.argv[2] || './registry';
  const port = parseInt(process.argv[3]) || 3000;
  
  console.log('🧠 Starting DCP MCP HTTP Server...');
  console.log(`📁 Registry: ${registryPath}`);
  console.log(`🌐 Port: ${port}`);
  
  const server = new DCPMCPHTTPServer(registryPath, { port });
  
  server.start().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

export { DCPMCPHTTPServer };