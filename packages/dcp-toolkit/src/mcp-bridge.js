#!/usr/bin/env node

/**
 * DCP-Figma MCP Bridge Server
 * Proxies and enriches Figma Dev Mode MCP requests with DCP registry metadata
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { createProxyMiddleware } from 'http-proxy-middleware';

const DEFAULT_FIGMA_MCP_PORT = 3845;
const DEFAULT_BRIDGE_PORT = 3846;

export class DCPFigmaBridge {
  constructor(options = {}) {
    this.registryPath = options.registryPath || './registry';
    this.figmaPort = options.figmaPort || DEFAULT_FIGMA_MCP_PORT;
    this.bridgePort = options.bridgePort || DEFAULT_BRIDGE_PORT;
    this.verbose = options.verbose || false;
    this.registry = null;
    this.tokenMapping = null;
    
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    if (this.verbose) {
      this.app.use((req, res, next) => {
        console.log(chalk.gray(`[${new Date().toISOString()}] ${req.method} ${req.path}`));
        next();
      });
    }
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        bridge: 'dcp-figma-mcp-bridge',
        figmaPort: this.figmaPort,
        registryPath: this.registryPath,
        registryLoaded: !!this.registry
      });
    });

    // MCP bridge endpoint - intercepts and enriches MCP requests
    this.app.use('/mcp', this.createMCPProxy());
    
    // Direct DCP registry access
    this.app.get('/dcp/registry', async (req, res) => {
      try {
        await this.loadRegistry();
        res.json(this.registry);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Token mapping endpoint
    this.app.get('/dcp/tokens', async (req, res) => {
      try {
        await this.loadRegistry();
        res.json(this.registry?.tokens || {});
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Component details with enriched metadata
    this.app.get('/dcp/components/:name', async (req, res) => {
      try {
        await this.loadRegistry();
        const component = this.registry?.components?.find(c => c.name === req.params.name);
        if (!component) {
          return res.status(404).json({ error: 'Component not found' });
        }
        
        // Enrich with additional DCP metadata
        const enriched = await this.enrichComponent(component);
        res.json(enriched);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  createMCPProxy() {
    return createProxyMiddleware({
      target: `http://127.0.0.1:${this.figmaPort}`,
      changeOrigin: true,
      pathRewrite: {
        '^/mcp': '/mcp'
      },
      onProxyRes: async (proxyRes, req, res) => {
        // Intercept responses and enrich with DCP data
        if (req.method === 'POST' && req.body?.method) {
          try {
            await this.enrichMCPResponse(proxyRes, req, res);
          } catch (error) {
            if (this.verbose) {
              console.error(chalk.red('Error enriching MCP response:'), error.message);
            }
          }
        }
      },
      onError: (err, req, res) => {
        console.error(chalk.red('MCP Proxy Error:'), err.message);
        res.status(502).json({ 
          error: 'Figma MCP server unavailable',
          details: `Make sure Figma desktop app is running with Dev Mode MCP server enabled on port ${this.figmaPort}`
        });
      }
    });
  }

  async enrichMCPResponse(proxyRes, req, res) {
    const method = req.body?.method;
    
    // Load registry data if needed
    await this.loadRegistry();
    
    if (!this.registry) return;

    // Buffer the response to modify it
    let body = '';
    proxyRes.on('data', chunk => body += chunk);
    proxyRes.on('end', async () => {
      try {
        const originalResponse = JSON.parse(body);
        const enrichedResponse = await this.enrichResponseByMethod(method, originalResponse, req.body);
        
        // Send enriched response
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(enrichedResponse, null, 2));
      } catch (error) {
        if (this.verbose) {
          console.error('Failed to enrich response:', error.message);
        }
        res.end(body); // Send original response if enrichment fails
      }
    });
  }

  async enrichResponseByMethod(method, originalResponse, requestBody) {
    switch (method) {
      case 'get_code':
        return this.enrichGetCode(originalResponse, requestBody);
      
      case 'get_variable_defs':
        return this.enrichGetVariableDefs(originalResponse, requestBody);
      
      case 'get_code_connect_map':
        return this.enrichGetCodeConnectMap(originalResponse, requestBody);
      
      default:
        return originalResponse;
    }
  }

  async enrichGetCode(response, request) {
    if (!response.result) return response;

    // Add DCP component metadata to code generation context
    const nodeId = request.params?.nodeId;
    if (nodeId) {
      const dcpComponent = await this.findComponentByFigmaNode(nodeId);
      if (dcpComponent) {
        response.result.dcpMetadata = {
          componentName: dcpComponent.name,
          props: dcpComponent.props,
          designTokens: this.extractComponentTokens(dcpComponent),
          category: dcpComponent.category,
          description: dcpComponent.description
        };
      }
    }

    return response;
  }

  async enrichGetVariableDefs(response, request) {
    if (!response.result || !this.registry?.tokens) return response;

    // Merge Figma variables with DCP tokens
    const dcpTokens = this.convertDCPTokensToFigmaFormat(this.registry.tokens);
    
    response.result.dcpTokens = dcpTokens;
    response.result.tokenMapping = this.createTokenMapping(response.result.variables, dcpTokens);

    return response;
  }

  async enrichGetCodeConnectMap(response, request) {
    if (!response.result) return response;

    // Add DCP component information to Code Connect mappings
    const enrichedMappings = {};
    
    for (const [nodeId, mapping] of Object.entries(response.result)) {
      const dcpComponent = await this.findComponentByFigmaNode(nodeId);
      enrichedMappings[nodeId] = {
        ...mapping,
        dcpComponent: dcpComponent ? {
          name: dcpComponent.name,
          category: dcpComponent.category,
          props: Object.keys(dcpComponent.props || {}),
          variants: Object.keys(dcpComponent.variants || {}),
          tokens: this.extractComponentTokens(dcpComponent)
        } : null
      };
    }

    response.result = enrichedMappings;
    return response;
  }

  async loadRegistry() {
    if (this.registry) return;

    try {
      // Load main registry file
      const registryFile = path.join(this.registryPath, 'registry.json');
      const registryContent = await fs.readFile(registryFile, 'utf-8');
      this.registry = JSON.parse(registryContent);

      if (this.verbose) {
        console.log(chalk.green(`✓ Loaded DCP registry: ${this.registry.components?.length || 0} components`));
      }
    } catch (error) {
      if (this.verbose) {
        console.warn(chalk.yellow(`⚠️  Could not load DCP registry: ${error.message}`));
      }
    }
  }

  async findComponentByFigmaNode(nodeId) {
    // This would need a mapping file or metadata to connect Figma node IDs to DCP components
    // For now, we'll try to match by name patterns or use a mapping file
    
    // Try to load figma mapping if it exists
    try {
      const mappingFile = path.join(this.registryPath, 'figma-mapping.json');
      const mapping = JSON.parse(await fs.readFile(mappingFile, 'utf-8'));
      
      // Find component name that maps to this node ID
      for (const [componentName, figmaUrl] of Object.entries(mapping)) {
        if (figmaUrl.includes(`node-id=${nodeId}`) || figmaUrl.includes(`node-id=${nodeId.replace(':', '%3A')}`)) {
          return this.registry?.components?.find(c => c.name === componentName);
        }
      }
    } catch (error) {
      // Mapping file not found or invalid
    }

    return null;
  }

  extractComponentTokens(component) {
    const tokens = {};
    
    // Extract tokens from component metadata
    if (component.extensions?.designTokens) {
      tokens.component = component.extensions.designTokens;
    }
    
    // Extract from registry tokens that might reference this component
    if (this.registry?.tokens) {
      Object.entries(this.registry.tokens).forEach(([key, token]) => {
        if (token.source?.includes(component.name) || 
            key.toLowerCase().includes(component.name.toLowerCase())) {
          tokens[key] = token;
        }
      });
    }
    
    return tokens;
  }

  convertDCPTokensToFigmaFormat(dcpTokens) {
    const figmaTokens = {};
    
    Object.entries(dcpTokens).forEach(([key, token]) => {
      figmaTokens[key] = {
        name: key,
        value: token.value,
        type: this.mapDCPTokenTypeToFigma(token.type),
        description: token.description || '',
        dcpSource: token.source || 'unknown'
      };
    });
    
    return figmaTokens;
  }

  mapDCPTokenTypeToFigma(dcpType) {
    const mapping = {
      'color': 'color',
      'spacing': 'dimension',
      'fontSize': 'dimension', 
      'fontFamily': 'string',
      'fontWeight': 'number',
      'borderRadius': 'dimension',
      'shadow': 'effect'
    };
    
    return mapping[dcpType] || 'string';
  }

  createTokenMapping(figmaVars, dcpTokens) {
    const mapping = {};
    
    // Try to match Figma variables with DCP tokens by name similarity
    Object.keys(figmaVars || {}).forEach(figmaKey => {
      const normalizedFigmaKey = figmaKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      Object.keys(dcpTokens).forEach(dcpKey => {
        const normalizedDCPKey = dcpKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (normalizedFigmaKey === normalizedDCPKey || 
            normalizedFigmaKey.includes(normalizedDCPKey) ||
            normalizedDCPKey.includes(normalizedFigmaKey)) {
          mapping[figmaKey] = dcpKey;
        }
      });
    });
    
    return mapping;
  }

  async enrichComponent(component) {
    return {
      ...component,
      figmaMapping: await this.findFigmaUrlForComponent(component.name),
      relatedTokens: this.extractComponentTokens(component),
      usage: await this.getComponentUsageStats(component.name)
    };
  }

  async findFigmaUrlForComponent(componentName) {
    try {
      const mappingFile = path.join(this.registryPath, 'figma-mapping.json');
      const mapping = JSON.parse(await fs.readFile(mappingFile, 'utf-8'));
      return mapping[componentName] || null;
    } catch (error) {
      return null;
    }
  }

  async getComponentUsageStats(componentName) {
    // This would analyze usage across the codebase
    // For now, return placeholder data
    return {
      instances: 0,
      files: [],
      lastModified: null
    };
  }

  async start() {
    await this.loadRegistry();
    
    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.bridgePort, (err) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(chalk.green(`🌉 DCP-Figma MCP Bridge Server started`));
        console.log(chalk.gray(`   Bridge: http://localhost:${this.bridgePort}/mcp`));
        console.log(chalk.gray(`   Figma MCP: http://localhost:${this.figmaPort}/mcp`));
        console.log(chalk.gray(`   Registry: ${this.registryPath}`));
        console.log(chalk.gray(`   Health: http://localhost:${this.bridgePort}/health`));
        
        console.log(`\n${chalk.cyan('Usage:')}`);
        console.log(`   Update your MCP client to use: ${chalk.yellow(`http://localhost:${this.bridgePort}/mcp`)}`);
        console.log(`   Instead of: http://localhost:${this.figmaPort}/mcp`);
        
        resolve({
          port: this.bridgePort,
          figmaPort: this.figmaPort,
          url: `http://localhost:${this.bridgePort}/mcp`,
          healthUrl: `http://localhost:${this.bridgePort}/health`
        });
      });

      // Graceful shutdown
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n🛑 Shutting down DCP-Figma MCP Bridge...'));
        server.close(() => {
          console.log(chalk.gray('Bridge server stopped'));
          process.exit(0);
        });
      });
    });
  }
}

// CLI usage
export async function runMCPBridge(options = {}) {
  const bridge = new DCPFigmaBridge(options);
  return await bridge.start();
}

// Direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    registryPath: args.includes('--registry') ? args[args.indexOf('--registry') + 1] : './registry',
    figmaPort: args.includes('--figma-port') ? parseInt(args[args.indexOf('--figma-port') + 1]) : DEFAULT_FIGMA_MCP_PORT,
    bridgePort: args.includes('--port') ? parseInt(args[args.indexOf('--port') + 1]) : DEFAULT_BRIDGE_PORT,
    verbose: args.includes('--verbose')
  };

  runMCPBridge(options).catch(error => {
    console.error(chalk.red('Failed to start MCP bridge:'), error.message);
    process.exit(1);
  });
}