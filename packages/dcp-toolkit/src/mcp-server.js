#!/usr/bin/env node

/**
 * DCP MCP Server - Model Context Protocol Integration
 * Provides Claude and other AI agents with live access to design system registry
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import chokidar from 'chokidar';

// -------------------------------------------------------------------------------------------------
// CRITICAL: Prevent human-readable logs from corrupting the MCP JSON stream.
// MCP servers MUST output only JSON-RPC on stdout. All logging goes to stderr.
// This MUST happen BEFORE any imports that might log.
// -------------------------------------------------------------------------------------------------

// Always redirect console.log to stderr for MCP server (stdout is JSON-RPC only)
// Check if we're running as MCP server:
// 1. Explicit --stdio flag
// 2. MCP_STDIO env var
// 3. Running via dcp-mcp command (process.argv[1] contains mcp-server)
// 4. stdin is a pipe (typical for MCP stdio transport)
const isMCPServer = 
  process.argv.includes('--stdio') || 
  process.env.MCP_STDIO === 'true' ||
  process.argv[1]?.includes('mcp-server') ||
  (!process.stdin.isTTY && process.stdin.isReadable());

if (isMCPServer) {
  // Redirect console.log BEFORE any imports that might log
  const originalLog = console.log;
  console.log = (...args) => {
    console.error(...args);
  };
  
  // Also redirect process.stdout.write to stderr for safety
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = function(chunk, encoding, fd) {
    // Only allow through if it looks like JSON (starts with { or [)
    const str = chunk.toString();
    if (str.trim().match(/^[\s]*[{[]/)) {
      return originalStdoutWrite(chunk, encoding, fd);
    }
    // Otherwise redirect to stderr
    return process.stderr.write(chunk, encoding, fd);
  };
  
  // Set environment variable so imported modules know to be silent
  process.env.DCP_MCP_SERVER = 'true';
}

// Core functionality imports - only what we need for MCP
// import { extractCssCustomProps, mapTailwindClassesToCSSVariables } from './tokens/legacyCssVarExtractor.js';
// import { parseTSX } from './core/parser.js';
import { ProjectIntelligenceScanner } from './core/projectIntelligence.js';
import { ProjectValidator } from './core/projectValidator.js';
// import { AssetAnalyzer } from './core/assetAnalyzer.js';

class DCPMCPServer {
  constructor(defaultRegistryPath = './registry') {
    // Support legacy behavior: if a default path is provided, we'll use it as fallback
    this.defaultRegistryPath = defaultRegistryPath ? path.resolve(defaultRegistryPath) : null;
    
    // Registry cache: { path: { registry, loadedAt, watcher } }
    this.registryCache = new Map();
    this.maxCacheSize = 10; // LRU cache max registries
    
    this.server = new Server(
      {
        name: 'dcp-registry',
        version: '3.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupTools();
  }

  /**
   * Auto-detect registry path if not provided
   * Looks in: CWD, CWD/registry, parent/registry
   */
  async autoDetectRegistry() {
    const searchPaths = [
      process.cwd(),
      path.join(process.cwd(), 'registry'),
      path.join(process.cwd(), '..', 'registry'),
      this.defaultRegistryPath
    ].filter(Boolean);

    for (const searchPath of searchPaths) {
      try {
        const registryFile = path.join(searchPath, 'registry.json');
        await fs.access(registryFile);
        return path.resolve(searchPath);
      } catch (error) {
        // Continue searching
      }
    }

    return null;
  }

  /**
   * Load a registry from a specific path (with caching)
   */
  async loadRegistry(registryPath = null, force = false) {
    // Auto-detect if not provided
    if (!registryPath) {
      registryPath = await this.autoDetectRegistry();
      if (!registryPath) {
        return {
          components: [],
          tokens: {},
          themeContext: null,
          metadata: { 
            error: 'No registry found. Provide registryPath or run from a project with ./registry/'
          }
        };
      }
    }

    const resolvedPath = path.resolve(registryPath);
    
    // Check cache
    if (!force && this.registryCache.has(resolvedPath)) {
      const cached = this.registryCache.get(resolvedPath);
      // Move to end (LRU)
      this.registryCache.delete(resolvedPath);
      this.registryCache.set(resolvedPath, cached);
      return cached.registry;
    }

    // Load from disk
    try {
      const registryFile = path.join(resolvedPath, 'registry.json');
      const registryData = await fs.readFile(registryFile, 'utf8');
      const registry = JSON.parse(registryData);
      
      // Setup hot-reload watcher for this registry
      const watcher = this.setupHotReloadForPath(resolvedPath);
      
      // Cache it
      const cacheEntry = {
        registry,
        loadedAt: Date.now(),
        watcher
      };
      
      // LRU eviction
      if (this.registryCache.size >= this.maxCacheSize) {
        const firstKey = this.registryCache.keys().next().value;
        const evicted = this.registryCache.get(firstKey);
        if (evicted.watcher) {
          evicted.watcher.close();
        }
        this.registryCache.delete(firstKey);
      }
      
      this.registryCache.set(resolvedPath, cacheEntry);
      
      if (force) {
        console.error(`Registry loaded: ${registry.components?.length || 0} components, ${Object.keys(registry.tokens || {}).length} token categories from ${resolvedPath}`);
      }
      
      return registry;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Check if registry.json exists in wrong location (like tokens/)
        const tokensRegistryFile = path.join(resolvedPath, 'tokens', 'registry.json');
        try {
          await fs.access(tokensRegistryFile);
          console.error(`⚠️  Registry found in wrong location: ${tokensRegistryFile}`);
          console.error(`⚠️  Registry files should be at: ${resolvedPath}/registry.json`);
          console.error(`⚠️  Files found in tokens/ directory should be moved to the registry root.`);
          console.error(`⚠️  Expected structure:`);
          console.error(`    ${resolvedPath}/`);
          console.error(`    ${resolvedPath}/registry.json`);
          console.error(`    ${resolvedPath}/metadata.json`);
          console.error(`    ${resolvedPath}/schemas.json`);
          console.error(`    ${resolvedPath}/components/`);
          console.error(`    ${resolvedPath}/tokens/`);
        } catch (tokensError) {
          // registry.json not in tokens/ either
        }
        
        console.error(`Registry not found at ${path.join(resolvedPath, 'registry.json')}`);
        console.error(`Hint: Run 'dcp extract' to create a registry first`);
      } else {
        console.error(`Failed to load registry from ${resolvedPath}:`, error.message);
      }
      
      // Return empty registry as fallback with helpful error
      return {
        components: [],
        tokens: {},
        themeContext: null,
        metadata: { 
          error: error.code === 'ENOENT' 
            ? `Registry not found at ${resolvedPath}. Run 'dcp extract' first.`
            : `Failed to parse registry: ${error.message}`
        }
      };
    }
  }

  setupHotReloadForPath(registryPath) {
    const watchPattern = path.join(registryPath, '**/*.json');
    
    const watcher = chokidar.watch(watchPattern, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    let reloadDebounceTimer = null;

    watcher.on('change', (filePath) => {
      // Debounce registry reloads to avoid excessive refreshing
      if (reloadDebounceTimer) {
        clearTimeout(reloadDebounceTimer);
      }
      
      reloadDebounceTimer = setTimeout(async () => {
        console.error(`Registry file changed: ${path.relative(registryPath, filePath)}`);
        await this.loadRegistry(registryPath, true); // Force reload
      }, 200); // 200ms debounce
    });

    watcher.on('add', (filePath) => {
      if (path.basename(filePath) === 'registry.json') {
        console.error(`Registry file created: ${path.relative(registryPath, filePath)}`);
        setTimeout(async () => {
          await this.loadRegistry(registryPath, true);
        }, 100);
      }
    });

    console.error(`Watching for registry changes in: ${registryPath}`);
    
    return watcher;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error(`DCP MCP Server v3.0 started`);
    console.error(`Multi-registry support enabled`);
    console.error(`Default registry: ${this.defaultRegistryPath || 'auto-detect'}`);
  }

  async stop() {
    // Close all watchers
    for (const [, cached] of this.registryCache) {
      if (cached.watcher) {
        await cached.watcher.close();
      }
    }
    this.registryCache.clear();
  }

  setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'dcp_query_tokens',
            description: 'Query design tokens from the registry with optional filtering',
            inputSchema: {
              type: 'object',
              properties: {
                registryPath: {
                  type: 'string',
                  description: 'Path to the registry directory (optional, auto-detects if not provided)',
                },
                filter: {
                  type: 'string',
                  description: 'Token filter pattern (e.g., "color.*", "spacing.lg", "*primary*")',
                },
                category: {
                  type: 'string',
                  description: 'Token category to filter by (color, spacing, typography, etc.)',
                },
                format: {
                  type: 'string',
                  enum: ['css', 'js', 'tailwind', 'raw'],
                  description: 'Output format for token values',
                  default: 'css',
                },
              },
            },
          },
          {
            name: 'dcp_get_component',
            description: 'Get detailed information about a specific component',
            inputSchema: {
              type: 'object',
              properties: {
                registryPath: {
                  type: 'string',
                  description: 'Path to the registry directory (optional, auto-detects if not provided)',
                },
                component: {
                  type: 'string',
                  description: 'Component name to retrieve (e.g., "Button", "Card")',
                },
                include: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['props', 'variants', 'examples', 'dependencies', 'usage'],
                  },
                  description: 'What information to include in the response',
                  default: ['props', 'variants'],
                },
              },
              required: ['component'],
            },
          },
          {
            name: 'dcp_validate_code',
            description: 'Validate code against design system constraints',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Code snippet to validate (JSX/TSX)',
                },
                component: {
                  type: 'string',
                  description: 'Component name being used (optional)',
                },
                checkTokens: {
                  type: 'boolean',
                  description: 'Whether to validate token usage',
                  default: true,
                },
                checkProps: {
                  type: 'boolean',
                  description: 'Whether to validate component props',
                  default: true,
                },
              },
              required: ['code'],
            },
          },
          {
            name: 'dcp_suggest_alternatives',
            description: 'Suggest valid alternatives for off-spec tokens or props',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['token', 'prop', 'variant'],
                  description: 'Type of suggestion needed',
                },
                current: {
                  type: 'string',
                  description: 'Current value that needs alternatives',
                },
                component: {
                  type: 'string',
                  description: 'Component context (for prop/variant suggestions)',
                },
                category: {
                  type: 'string',
                  description: 'Token category (for token suggestions)',
                },
              },
              required: ['type', 'current'],
            },
          },
          {
            name: 'dcp_project_scan',
            description: 'Scan project for design system intelligence and setup requirements',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Project path to scan (defaults to current directory)',
                  default: '.',
                },
                deep: {
                  type: 'boolean',
                  description: 'Whether to perform deep analysis',
                  default: false,
                },
              },
            },
          },
          {
            name: 'dcp_validate_project',
            description: 'Validate project configuration for DCP extraction readiness',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Project path to validate (defaults to current directory)',
                  default: '.',
                },
                autoFix: {
                  type: 'boolean',
                  description: 'Whether to automatically fix common issues',
                  default: false,
                },
              },
            },
          },
          {
            name: 'dcp_transpile_component',
            description: 'Generate React/TypeScript code from a component definition',
            inputSchema: {
              type: 'object',
              properties: {
                component: {
                  type: 'string',
                  description: 'Component name to transpile',
                },
                target: {
                  type: 'string',
                  enum: ['react', 'react-typescript', 'vue', 'svelte'],
                  description: 'Target framework for code generation',
                  default: 'react-typescript',
                },
                includeStyles: {
                  type: 'boolean',
                  description: 'Whether to include CSS/styling in output',
                  default: true,
                },
                useTokens: {
                  type: 'boolean',
                  description: 'Whether to use design tokens in generated code',
                  default: true,
                },
                outputPath: {
                  type: 'string',
                  description: 'Output file path (optional)',
                },
              },
              required: ['component'],
            },
          },
          {
            name: 'dcp_generate_code',
            description: 'Generate complete component library code from registry',
            inputSchema: {
              type: 'object',
              properties: {
                framework: {
                  type: 'string',
                  enum: ['react', 'react-typescript', 'vue', 'svelte', 'flutter', 'ios', 'android'],
                  description: 'Target framework for generation',
                  default: 'react-typescript',
                },
                outputPath: {
                  type: 'string',
                  description: 'Output directory path',
                  default: './generated-components',
                },
                components: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific components to generate (empty = all)',
                  default: [],
                },
                includeTests: {
                  type: 'boolean',
                  description: 'Whether to generate test files',
                  default: false,
                },
                includeStories: {
                  type: 'boolean',
                  description: 'Whether to generate Storybook stories',
                  default: false,
                },
              },
            },
          },
          {
            name: 'dcp_create_mutation_plan',
            description: 'Create AI-powered mutation plan from natural language prompt',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Natural language description of desired changes',
                },
                context: {
                  type: 'object',
                  description: 'Additional context for mutation planning',
                  properties: {
                    targetComponents: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Specific components to target',
                    },
                    scope: {
                      type: 'string',
                      enum: ['component', 'registry', 'tokens', 'global'],
                      description: 'Scope of changes',
                      default: 'component',
                    },
                  },
                },
                dryRun: {
                  type: 'boolean',
                  description: 'Whether to only plan without applying changes',
                  default: true,
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'dcp_apply_mutations',
            description: 'Apply JSON Patch mutations to registry with atomic rollback',
            inputSchema: {
              type: 'object',
              properties: {
                patches: {
                  type: 'array',
                  description: 'Array of JSON Patch operations',
                  items: {
                    type: 'object',
                    properties: {
                      op: { type: 'string', enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'] },
                      path: { type: 'string' },
                      value: {},
                    },
                    required: ['op', 'path'],
                  },
                },
                validate: {
                  type: 'boolean',
                  description: 'Whether to validate mutations before applying',
                  default: true,
                },
                createUndo: {
                  type: 'boolean',
                  description: 'Whether to create undo operations',
                  default: true,
                },
              },
              required: ['patches'],
            },
          },
          {
            name: 'dcp_build_registry',
            description: 'Build a complete DCP registry from configuration and sources',
            inputSchema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  description: 'Registry build configuration',
                  properties: {
                    name: { type: 'string' },
                    version: { type: 'string' },
                    sources: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Source directories to include',
                    },
                  },
                },
                outputPath: {
                  type: 'string',
                  description: 'Output path for built registry',
                  default: './built-registry',
                },
                includeAssets: {
                  type: 'boolean',
                  description: 'Whether to build and include assets',
                  default: true,
                },
                optimize: {
                  type: 'boolean',
                  description: 'Whether to optimize the registry',
                  default: true,
                },
              },
            },
          },
          {
            name: 'dcp_extract_components',
            description: 'Extract components from source code to create a design system registry',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  description: 'Source directory path to extract components from',
                  default: '.',
                },
                output: {
                  type: 'string',
                  description: 'Output directory for the generated registry',
                  default: './registry',
                },
                glob: {
                  type: 'string',
                  description: 'Glob pattern for component files (e.g., "**/*.{tsx,jsx}")',
                  default: '**/*.{tsx,jsx,ts,js}',
                },
                adaptor: {
                  type: 'string',
                  description: 'Framework adaptor to use (react-tsx, vue-sfc, svelte)',
                  default: 'react-tsx',
                },
                includeTokens: {
                  type: 'boolean',
                  description: 'Whether to extract design tokens',
                  default: true,
                },
                validate: {
                  type: 'boolean',
                  description: 'Whether to validate project setup before extraction',
                  default: true,
                },
                autoFix: {
                  type: 'boolean',
                  description: 'Whether to automatically fix common issues',
                  default: false,
                },
              },
              required: ['source'],
            },
          },
          {
            name: 'dcp_analyze_dependencies',
            description: 'Analyze component dependencies and usage patterns',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  description: 'Source directory to analyze',
                  default: '.',
                },
                includeExternal: {
                  type: 'boolean',
                  description: 'Include external package dependencies',
                  default: true,
                },
                generateGraph: {
                  type: 'boolean',
                  description: 'Generate dependency graph visualization',
                  default: false,
                },
                outputFormat: {
                  type: 'string',
                  enum: ['json', 'graph', 'summary'],
                  description: 'Output format for dependency analysis',
                  default: 'json',
                },
              },
            },
          },
          {
            name: 'dcp_build_assets',
            description: 'Build and optimize design system assets (CSS, JS, images)',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  description: 'Source directory containing assets',
                  default: '.',
                },
                outputPath: {
                  type: 'string',
                  description: 'Output directory for built assets',
                  default: './dist/assets',
                },
                optimize: {
                  type: 'boolean',
                  description: 'Whether to optimize assets (minify, compress)',
                  default: true,
                },
                includeSourceMaps: {
                  type: 'boolean',
                  description: 'Generate source maps for debugging',
                  default: false,
                },
              },
            },
          },
          {
            name: 'dcp_build_packs',
            description: 'Build static component packages for distribution and sharing',
            inputSchema: {
              type: 'object',
              properties: {
                registry: {
                  type: 'string',
                  description: 'Path to registry file',
                  default: 'registry/registry.json',
                },
                outputDir: {
                  type: 'string',
                  description: 'Output directory for component packs',
                  default: './dist/packs',
                },
                baseUrl: {
                  type: 'string',
                  description: 'Base URL for hosted blobs',
                  default: '',
                },
                namespace: {
                  type: 'string',
                  description: 'Component namespace/scope',
                  default: 'ui',
                },
                version: {
                  type: 'string',
                  description: 'Package version',
                  default: '1.0.0',
                },
              },
            },
          },
          {
            name: 'dcp_serve_registry',
            description: 'Start development server for component registry testing',
            inputSchema: {
              type: 'object',
              properties: {
                packsDir: {
                  type: 'string',
                  description: 'Directory containing component packs',
                  default: './dist/packs',
                },
                port: {
                  type: 'number',
                  description: 'Server port',
                  default: 7401,
                },
                host: {
                  type: 'string',
                  description: 'Server host',
                  default: 'localhost',
                },
                baseUrl: {
                  type: 'string',
                  description: 'Base URL for hosted files',
                  default: '',
                },
              },
            },
          },
          {
            name: 'dcp_add_component',
            description: 'Install a component from a registry into a project',
            inputSchema: {
              type: 'object',
              properties: {
                componentUrl: {
                  type: 'string',
                  description: 'Component URL or registry path',
                },
                targetDir: {
                  type: 'string',
                  description: 'Target directory for components',
                  default: './components/ui',
                },
                packageJson: {
                  type: 'string',
                  description: 'Path to package.json',
                  default: './package.json',
                },
                skipInstall: {
                  type: 'boolean',
                  description: 'Skip peer dependency installation',
                  default: false,
                },
                force: {
                  type: 'boolean',
                  description: 'Overwrite existing components',
                  default: false,
                },
                dryRun: {
                  type: 'boolean',
                  description: 'Preview installation without making changes',
                  default: false,
                },
              },
              required: ['componentUrl'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'dcp_query_tokens':
            return await this.handleQueryTokens(request.params.arguments);
          case 'dcp_get_component':
            return await this.handleGetComponent(request.params.arguments);
          case 'dcp_validate_code':
            return await this.handleValidateCode(request.params.arguments);
          case 'dcp_suggest_alternatives':
            return await this.handleSuggestAlternatives(request.params.arguments);
          case 'dcp_project_scan':
            return await this.handleProjectScan(request.params.arguments);
          case 'dcp_validate_project':
            return await this.handleValidateProject(request.params.arguments);
          case 'dcp_extract_components':
            return await this.handleExtractComponents(request.params.arguments);
          case 'dcp_transpile_component':
            return await this.handleTranspileComponent(request.params.arguments);
          case 'dcp_generate_code':
            return await this.handleGenerateCode(request.params.arguments);
          case 'dcp_create_mutation_plan':
            return await this.handleCreateMutationPlan(request.params.arguments);
          case 'dcp_apply_mutations':
            return await this.handleApplyMutations(request.params.arguments);
          case 'dcp_build_registry':
            return await this.handleBuildRegistry(request.params.arguments);
          case 'dcp_analyze_dependencies':
            return await this.handleAnalyzeDependencies(request.params.arguments);
          case 'dcp_build_assets':
            return await this.handleBuildAssets(request.params.arguments);
          case 'dcp_build_packs':
            return await this.handleBuildPacks(request.params.arguments);
          case 'dcp_serve_registry':
            return await this.handleServeRegistry(request.params.arguments);
          case 'dcp_add_component':
            return await this.handleAddComponent(request.params.arguments);
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Add MCP resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      await this.loadRegistry();
      const resources = [];
      
      // Add registry as a resource
      resources.push({
        uri: `registry://components`,
        name: 'Design System Components',
        description: 'Complete component registry with props, variants, and design tokens',
        mimeType: 'application/json'
      });

      // Add individual components as resources
      if (this.registry?.components) {
        for (const component of this.registry.components) {
          resources.push({
            uri: `registry://component/${component.name}`,
            name: `${component.name} Component`,
            description: component.description || `${component.name} component definition`,
            mimeType: 'application/json'
          });
        }
      }

      // Add tokens as a resource
      if (this.registry?.tokens) {
        resources.push({
          uri: `registry://tokens`,
          name: 'Design Tokens',
          description: 'Complete design token system with semantic and primitive tokens',
          mimeType: 'application/json'
        });
      }

      return { resources };
    });

    // Add resource reader handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      
      try {
        if (uri === 'registry://components') {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.registry, null, 2),
              },
            ],
          };
        } else if (uri.startsWith('registry://component/')) {
          const componentName = uri.replace('registry://component/', '');
          const component = this.registry?.components?.find(c => c.name === componentName);
          
          if (!component) {
            throw new Error(`Component not found: ${componentName}`);
          }
          
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(component, null, 2),
              },
            ],
          };
        } else if (uri === 'registry://tokens') {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.registry?.tokens || {}, null, 2),
              },
            ],
          };
        } else {
          throw new Error(`Unknown resource: ${uri}`);
        }
      } catch (error) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                error: true,
                message: error.message,
                uri
              }, null, 2),
            },
          ],
        };
      }
    });

    // Add MCP prompts handler  
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'validate-component-usage',
            description: 'Validate if component usage follows design system standards',
            arguments: [
              {
                name: 'code',
                description: 'JSX/TSX code to validate',
                required: true
              },
              {
                name: 'component',
                description: 'Component name being used',
                required: false
              }
            ]
          },
          {
            name: 'suggest-component-alternatives',
            description: 'Suggest valid alternatives for design system violations',
            arguments: [
              {
                name: 'current',
                description: 'Current token, prop, or variant being used',
                required: true
              },
              {
                name: 'type',
                description: 'Type of suggestion needed (token, prop, variant)',
                required: true
              }
            ]
          },
          {
            name: 'generate-component-example',
            description: 'Generate usage examples for a component',
            arguments: [
              {
                name: 'component',
                description: 'Component name to generate examples for',
                required: true
              },
              {
                name: 'variant',
                description: 'Specific variant to show',
                required: false
              }
            ]
          }
        ]
      };
    });
  }

  async handleQueryTokens({ registryPath, filter = '*', category, format = 'css' }) {
    const registry = await this.loadRegistry(registryPath);
    const tokens = registry.tokens || {};
    
    let filteredTokens = tokens;
    
    // Apply category filter
    if (category && tokens[category]) {
      filteredTokens = { [category]: tokens[category] };
    }
    
    // Apply pattern filter
    if (filter !== '*') {
      filteredTokens = this.filterTokensByPattern(filteredTokens, filter);
    }

    // Format tokens based on requested format
    const formattedTokens = this.formatTokens(filteredTokens, format);
    
    // Get enhanced theme context from the CLI query engine
    const themeContext = registry.themeContext || {};
    
    return {
      content: [
        {
          type: 'text',
          text: `Tokens Query Results:

Found: ${Object.keys(this.flattenTokens(formattedTokens)).length} tokens
Format: ${format}
Category: ${category || 'all'}
Filter: ${filter}

${Object.keys(formattedTokens).length > 0 ? 
  Object.entries(formattedTokens).map(([key, value]) => 
    `${key}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`
  ).join('\n') : 
  'No tokens found matching the criteria'
}

Usage: Use these tokens in your code. Example: color="primary.500" or className="text-primary-500"`,
        },
      ],
    };
  }

  async handleGetComponent({ registryPath, component, include = ['props', 'variants'] }) {
    const registry = await this.loadRegistry(registryPath);
    const components = registry.components || [];
    
    // Case-insensitive search with multiple name fields
    // Prioritize exact matches over partial matches
    const searchTerm = component.toLowerCase();
    
    // First pass: exact match only
    let comp = components.find(c => {
      const name = (c.name || '').toLowerCase();
      const displayName = (c.displayName || '').toLowerCase();
      const exportName = (c.exportName || '').toLowerCase();
      return name === searchTerm || 
             displayName === searchTerm ||
             exportName === searchTerm;
    });
    
    // Second pass: fuzzy match if no exact match found
    if (!comp) {
      comp = components.find(c => {
        const name = (c.name || '').toLowerCase();
        const displayName = (c.displayName || '').toLowerCase();
        return name.includes(searchTerm) ||
               displayName.includes(searchTerm);
      });
    }
    
    if (!comp) {
      const available = components.map(c => c.name || c.displayName || c.exportName).filter(Boolean);
      const suggestions = available
        .filter(name => name.toLowerCase().includes(searchTerm))
        .slice(0, 5);
      
      let errorMessage = `Component "${component}" not found.\n\n`;
      errorMessage += `Total components in registry: ${components.length}\n`;
      if (available.length > 0) {
        errorMessage += `Available components (showing first 20): ${available.slice(0, 20).join(', ')}`;
        if (available.length > 20) {
          errorMessage += ` ... and ${available.length - 20} more`;
        }
      }
      if (suggestions.length > 0) {
        errorMessage += `\n\nDid you mean: ${suggestions.join(', ')}?`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
          },
        ],
      };
    }

    const response = {
      name: comp.name || comp.displayName,
      description: comp.description || 'No description available',
    };

    if (include.includes('props')) {
      // Props is an object in DCP spec, not an array
      response.props = comp.props || {};
      
      // Convert props object to array for required/optional filtering
      const propsArray = Object.entries(comp.props || {}).map(([name, prop]) => ({
        name,
        ...prop
      }));
      
      response.requiredProps = propsArray.filter(p => p.required);
      response.optionalProps = propsArray.filter(p => !p.required);
    }

    if (include.includes('variants')) {
      response.variants = comp.variants || {};
    }

    if (include.includes('examples')) {
      response.examples = this.generateComponentExamples(comp);
    }

    if (include.includes('dependencies')) {
      response.dependencies = comp.dependencies || [];
    }

    return {
      content: [
        {
          type: 'text',
          text: `Component: ${response.name}

Description: ${response.description || 'No description available'}
Category: ${response.category || 'unknown'}

${response.requiredProps?.length > 0 ? `Required Props:
${response.requiredProps.map(p => `  - ${p.name}: ${p.type} - ${p.description || 'No description'}`).join('\n')}` : ''}

${response.optionalProps?.length > 0 ? `Optional Props:
${response.optionalProps.map(p => `  - ${p.name}: ${p.type} - ${p.description || 'No description'}`).join('\n')}` : ''}

${Object.keys(response.variants || {}).length > 0 ? `Variants:
${Object.entries(response.variants).map(([key, values]) => `  - ${key}: ${Array.isArray(values) ? values.join(', ') : JSON.stringify(values)}`).join('\n')}` : ''}

${response.examples?.length > 0 ? `Examples:
${response.examples.map((ex, i) => `${i + 1}. ${ex.name}: ${ex.code}`).join('\n')}` : ''}`,
        },
      ],
    };
  }

  async handleValidateCode({ registryPath, code, component, checkTokens = true, checkProps = true }) {
    const registry = await this.loadRegistry(registryPath);
    const violations = [];
    const suggestions = [];

    // Basic token validation
    if (checkTokens) {
      const tokenViolations = this.validateTokensInCode(code, registry.tokens || {});
      violations.push(...tokenViolations);
    }

    // Basic prop validation
    if (checkProps && component) {
      const propViolations = this.validatePropsInCode(code, component, registry.components || []);
      violations.push(...propViolations);
    }

    // Generate suggestions for violations
    for (const violation of violations) {
      if (violation.type === 'invalid-token') {
        const alternatives = this.suggestTokenAlternatives(violation.value, registry.tokens);
        suggestions.push({
          issue: violation.message,
          alternatives: alternatives.slice(0, 3), // Top 3 suggestions
        });
      }
    }

    const isValid = violations.length === 0;

    return {
      content: [
        {
          type: 'text',
          text: `Code Validation Results:

Status: ${isValid ? 'VALID' : 'INVALID'}
Component: ${component || 'Not specified'}
Violations: ${violations.length}

${violations.length > 0 ? `Issues Found:
${violations.map((v, i) => `${i + 1}. ${v.message} (Line ${v.line || 'unknown'})`).join('\n')}` : ''}

${suggestions.length > 0 ? `Suggestions:
${suggestions.map((s, i) => `${i + 1}. ${s.issue}
   Alternatives: ${s.alternatives.join(', ')}`).join('\n')}` : ''}

Summary: ${isValid ? 
  'Code follows design system constraints' : 
  `Found ${violations.length} design system violations`}`,
        },
      ],
    };
  }

  async handleSuggestAlternatives({ registryPath, type, current, component, category }) {
    const registry = await this.loadRegistry(registryPath);
    let suggestions = [];

    switch (type) {
      case 'token':
        suggestions = this.suggestTokenAlternatives(current, registry.tokens, category);
        break;
      case 'prop':
        suggestions = this.suggestPropAlternatives(current, component, registry.components);
        break;
      case 'variant':
        suggestions = this.suggestVariantAlternatives(current, component, registry.components);
        break;
    }

    return {
      content: [
        {
          type: 'text',
          text: `Alternatives for "${current}" (${type}):

${suggestions.length > 0 ? 
  suggestions.slice(0, 5).map((alt, i) => `${i + 1}. ${alt}`).join('\n') :
  'No alternatives found'
}

Total: ${suggestions.length} suggestions found`,
        },
      ],
    };
  }

  async handleProjectScan({ path: projectPath = '.', deep = false }) {
    try {
      // Run both intelligence scanner and validation
      const scanner = new ProjectIntelligenceScanner(projectPath);
      const validator = new ProjectValidator(projectPath, { silent: true });
      
      const [intelligence, validation] = await Promise.all([
        scanner.scan(),
        validator.validate()
      ]);
      
      return {
        content: [
          {
            type: 'text',
            text: `Project Scan Results:

Path: ${projectPath}
Framework: ${intelligence.projectStructure.conventions.framework}
Confidence: ${intelligence.intelligence.confidence}%
Readiness: ${intelligence.intelligence.readiness}

${validation.canProceed ? 'CAN PROCEED' : 'NEEDS SETUP'}

${validation.extractionCapabilities?.length > 0 ? `Extraction Capabilities:
${validation.extractionCapabilities.map(cap => `   - ${cap}`).join('\n')}` : ''}

${intelligence.setupInstructions?.length > 0 ? `Setup Instructions:
${intelligence.setupInstructions.map(instr => `   • ${instr}`).join('\n')}` : ''}

${intelligence.intelligence.recommendations?.length > 0 ? `Recommendations:
${intelligence.intelligence.recommendations.map(rec => `   • ${rec}`).join('\n')}` : ''}

Summary: ${validation.summary.errors} errors, ${validation.summary.warnings} warnings, ${validation.summary.suggestions} suggestions`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Project scan failed: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleValidateProject({ path: projectPath = '.', autoFix = false }) {
    try {
      const validator = new ProjectValidator(projectPath, { silent: true });
      const validation = await validator.validate();
      
      // Auto-fix if requested and there are fixable issues
      let autoFixApplied = false;
      if (autoFix && validation.issues.some(i => i.autoFix)) {
        await validator.autoFix();
        autoFixApplied = true;
        
        // Re-validate after fixes
        const revalidation = await validator.validate();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                projectPath,
                autoFixApplied: true,
                beforeFix: {
                  valid: validation.valid,
                  canProceed: validation.canProceed,
                  summary: validation.summary
                },
                afterFix: {
                  valid: revalidation.valid,
                  canProceed: revalidation.canProceed,
                  issues: revalidation.issues,
                  warnings: revalidation.warnings,
                  suggestions: revalidation.suggestions,
                  summary: revalidation.summary
                }
              }, null, 2),
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              projectPath,
              valid: validation.valid,
              canProceed: validation.canProceed,
              issues: validation.issues,
              warnings: validation.warnings,
              suggestions: validation.suggestions,
              summary: validation.summary,
              autoFixAvailable: validation.issues.some(i => i.autoFix)
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Project validation failed: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleExtractComponents({ 
    source = '.', 
    output = './registry', 
    glob = '**/*.{tsx,jsx,ts,js}', 
    adaptor = 'react-tsx',
    includeTokens = true,
    validate = true,
    autoFix = false 
  }) {
    try {
      // Import the extraction engine
      const { runExtract } = await import('./commands/extract-v3.js');
      
      // Run validation first if requested
      if (validate) {
        const validator = new ProjectValidator(source, { silent: true });
        const validation = await validator.validate();
        
        if (!validation.canProceed && autoFix) {
          await validator.autoFix();
        } else if (!validation.canProceed) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Project validation failed',
                validation: {
                  issues: validation.issues,
                  warnings: validation.warnings,
                  suggestions: validation.suggestions
                },
                recommendation: 'Use autoFix: true to attempt automatic fixes'
              }, null, 2),
            }],
            isError: true,
          };
        }
      }
      
      // Run extraction
      const result = await runExtract(source, {
        out: output,
        glob,
        adaptor,
        verbose: false,
        json: true,
        silent: true, // Suppress all console output for MCP
        skipValidation: !validate
      });
      
      // Resolve output path to absolute
      const outputPath = path.resolve(output);
      
      // Force reload the registry if it's already cached
      await this.loadRegistry(outputPath, true);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            source,
            output,
            components: result.registry.components.length,
            tokens: Object.keys(result.registry.tokens || {}).length,
            registryPath: `${output}/registry.json`,
            themeContext: result.registry.themeContext?.summary || 'No theme context',
            adaptorUsage: result.summary?.adaptorUsage || {},
            extractedAt: new Date().toISOString(),
            registryReloaded: true,
            registryPath: outputPath
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Component extraction failed: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  async handleTranspileComponent({ component, target = 'react-typescript', includeStyles = true, useTokens = true, outputPath }) {
    try {
      const registry = await this.loadRegistry();
      const comp = registry.components.find(c => c.name === component);
      
      if (!comp) {
        throw new Error(`Component '${component}' not found in registry`);
      }

      // Import transpilation engine
      const { runTranspile } = await import('./commands/transpile.js');
      
      const result = await runTranspile(this.registryPath, {
        target,
        components: [component],
        out: outputPath || `./generated-${component.toLowerCase()}`,
        includeStyles,
        useTokens
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            component,
            target,
            outputPath: result.outputPath,
            generatedFiles: result.files || [],
            codePreview: result.preview || 'Code generation completed'
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Component transpilation failed: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  async handleGenerateCode({ framework = 'react-typescript', outputPath = './generated-components', components = [], includeTests = false, includeStories = false }) {
    try {
      // Import code generation engine
      const { runTranspile } = await import('./commands/transpile.js');
      
      const result = await runTranspile(this.registryPath, {
        target: framework,
        components: components.length > 0 ? components : undefined,
        out: outputPath,
        includeTests,
        includeStories,
        verbose: false
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            framework,
            outputPath,
            componentsGenerated: result.componentsGenerated || 0,
            filesCreated: result.files?.length || 0,
            summary: result.summary || 'Code generation completed successfully'
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Code generation failed: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  async handleCreateMutationPlan({ prompt, context = {}, dryRun = true }) {
    try {
      // Import AI planning engine
      const { AIPlanner } = await import('./core/aiPlanner.js');
      
      const planner = new AIPlanner({ verbose: false });
      const plan = await planner.planMutation(prompt, this.registryPath);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            prompt,
            plan: {
              patches: plan.patches || [],
              description: plan.description || 'Mutation plan generated',
              confidence: plan.confidence || 0.8,
              warnings: plan.warnings || [],
              previewChanges: plan.preview || []
            },
            dryRun,
            instructions: dryRun ? 'Use dcp_apply_mutations to execute this plan' : 'Plan executed successfully'
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Mutation planning failed: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  async handleApplyMutations({ patches, validate = true, createUndo = true }) {
    try {
      // Import mutation engine
      const { runBatchMutate } = await import('./commands/batchMutate.js');
      
      // Create temporary patch file
      const patchPath = '/tmp/dcp-mcp-patches.json';
      await fs.writeFile(patchPath, JSON.stringify(patches, null, 2));
      
      const result = await runBatchMutate(
        this.registryPath, 
        patchPath, 
        this.registryPath, 
        {
          undo: createUndo ? '/tmp/dcp-mcp-undo.json' : null,
          verbose: false
        }
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            patchesApplied: patches.length,
            undoFile: result.undoFile || null,
            changes: result.changes || [],
            validation: result.validation || { passed: true },
            registryUpdated: true
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Mutation application failed: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  async handleBuildRegistry({ source = '.', config = './dcp.config.json', verbose = false, withStorybook = false }) {
    try {
      // Import registry builder
      const { runBuild } = await import('./commands/build.js');
      
      const result = await runBuild({
        configPath: config,
        verbose,
        withStorybook
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            outputPath,
            registryCreated: true,
            components: result.components?.length || 0,
            assets: result.assets?.length || 0,
            optimized: optimize,
            buildTime: result.buildTime || 'Unknown'
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Registry build failed: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  async handleAnalyzeDependencies({ source = '.', includeExternal = true, generateGraph = false, outputFormat = 'json' }) {
    try {
      // Import dependency analyzer
      const { DependencyGraphAnalyzer } = await import('./core/dependencyGraph.js');
      
      const analyzer = new DependencyGraphAnalyzer(source);
      
      // Analyze all components in the source directory
      const { globSync } = await import('glob');
      const componentFiles = globSync('**/*.{tsx,jsx,ts,js}', { cwd: source });
      
      for (const file of componentFiles) {
        const filePath = path.join(source, file);
        const sourceCode = await fs.readFile(filePath, 'utf-8');
        await analyzer.analyzeComponent(filePath, sourceCode);
      }
      
      const graph = analyzer.buildGraph();
      const suggestions = analyzer.generateSuggestions();
      
      let result = {
        success: true,
        source,
        dependencies: {
          internal: Array.from(analyzer.internalDependencies.entries()).map(([dep, usedBy]) => ({
            path: dep,
            usedBy: Array.from(usedBy)
          })),
          external: includeExternal ? Array.from(analyzer.externalDependencies) : [],
          hooks: Array.from(analyzer.hookUsage.entries()).map(([hook, usedBy]) => ({
            name: hook,
            usedBy: usedBy
          })),
          context: Array.from(analyzer.contextUsage)
        },
        metrics: graph.metrics,
        suggestions: suggestions
      };
      
      if (generateGraph) {
        result.graph = graph;
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Dependency analysis failed: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  async handleBuildAssets({ source = '.', outputPath = './dist/assets', optimize = true, includeSourceMaps = false }) {
    try {
      // Import asset builder
      const { runBuildAssets } = await import('./commands/build-assets.js');
      
      const result = await runBuildAssets({
        source,
        outputPath,
        optimize,
        includeSourceMaps,
        verbose: false
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            source,
            outputPath,
            assetsBuilt: result.assets?.length || 0,
            totalSize: result.totalSize || 'Unknown',
            optimized: optimize,
            sourceMaps: includeSourceMaps,
            buildTime: result.buildTime || 'Unknown'
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Asset build failed: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  // Helper methods
  filterTokensByPattern(tokens, pattern) {
    const filtered = {};
    const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
    
    function filterObject(obj, path = '') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          if ('value' in value) {
            // This is a token value
            if (regex.test(currentPath) || regex.test(key)) {
              result[key] = value;
            }
          } else {
            // This is a nested object
            const nestedResult = filterObject(value, currentPath);
            if (Object.keys(nestedResult).length > 0) {
              result[key] = nestedResult;
            }
          }
        }
      }
      return result;
    }
    
    return filterObject(tokens);
  }

  formatTokens(tokens, format) {
    switch (format) {
      case 'css':
        return this.formatTokensAsCSS(tokens);
      case 'js':
        return this.formatTokensAsJS(tokens);
      case 'tailwind':
        return this.formatTokensAsTailwind(tokens);
      default:
        return tokens;
    }
  }

  formatTokensAsCSS(tokens) {
    const flattened = this.flattenTokens(tokens);
    const css = {};
    for (const [key, value] of Object.entries(flattened)) {
      css[`--${key.replace(/\./g, '-')}`] = value.value || value;
    }
    return css;
  }

  formatTokensAsJS(tokens) {
    return this.flattenTokens(tokens);
  }

  formatTokensAsTailwind(tokens) {
    // Convert to Tailwind-style class names
    const flattened = this.flattenTokens(tokens);
    const tailwind = {};
    for (const [key, value] of Object.entries(flattened)) {
      const className = key.replace(/\./g, '-');
      tailwind[className] = value.value || value;
    }
    return tailwind;
  }

  flattenTokens(tokens, prefix = '') {
    const flattened = {};
    for (const [key, value] of Object.entries(tokens)) {
      const currentKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if ('value' in value) {
          flattened[currentKey] = value;
        } else {
          Object.assign(flattened, this.flattenTokens(value, currentKey));
        }
      } else {
        flattened[currentKey] = { value };
      }
    }
    return flattened;
  }

  validateTokensInCode(code, tokens) {
    const violations = [];
    const flattened = this.flattenTokens(tokens);
    const tokenNames = Object.keys(flattened);
    
    // Look for hardcoded values that should use tokens
    const hardcodedColors = code.match(/#[0-9a-fA-F]{3,6}/g) || [];
    for (const color of hardcodedColors) {
      violations.push({
        type: 'invalid-token',
        value: color,
        message: `Hardcoded color "${color}" should use design token`,
        line: this.getLineNumber(code, color),
      });
    }

    // Look for invalid token references
    const tokenRefs = code.match(/color="[^"]*"/g) || [];
    for (const ref of tokenRefs) {
      const tokenValue = ref.match(/color="([^"]*)"/)[1];
      if (!tokenNames.some(name => name.includes(tokenValue))) {
        violations.push({
          type: 'invalid-token',
          value: tokenValue,
          message: `Token "${tokenValue}" not found in design system`,
          line: this.getLineNumber(code, ref),
        });
      }
    }

    return violations;
  }

  validatePropsInCode(code, componentName, components) {
    const violations = [];
    const component = components.find(c => c.name === componentName);
    
    if (!component) return violations;

    // Props is an object in DCP spec - convert to array of prop names
    const validProps = Object.keys(component.props || {});
    
    // Extract props from JSX
    const jsxMatch = code.match(new RegExp(`<${componentName}[^>]*>`, 'g'));
    if (jsxMatch) {
      for (const jsx of jsxMatch) {
        const propMatches = jsx.match(/\s+(\w+)=/g) || [];
        for (const propMatch of propMatches) {
          const propName = propMatch.trim().replace('=', '');
          if (!validProps.includes(propName)) {
            violations.push({
              type: 'invalid-prop',
              value: propName,
              message: `Prop "${propName}" not valid for component "${componentName}"`,
              line: this.getLineNumber(code, propMatch),
            });
          }
        }
      }
    }

    return violations;
  }

  suggestTokenAlternatives(current, tokens, category) {
    const flattened = this.flattenTokens(tokens);
    const tokenNames = Object.keys(flattened);
    
    // Simple fuzzy matching
    const suggestions = tokenNames
      .filter(name => category ? name.startsWith(category) : true)
      .map(name => ({
        name,
        score: this.similarity(current, name),
        value: flattened[name].value || flattened[name],
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => ({ token: s.name, value: s.value }));
    
    return suggestions;
  }

  suggestPropAlternatives(current, componentName, components) {
    const component = components.find(c => c.name === componentName);
    if (!component) return [];
    
    // Props is an object in DCP spec - convert to array of prop names
    const validProps = Object.keys(component.props || {});
    return validProps
      .map(prop => ({ prop, score: this.similarity(current, prop) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.prop);
  }

  suggestVariantAlternatives(current, componentName, components) {
    const component = components.find(c => c.name === componentName);
    if (!component || !component.variants) return [];
    
    const variants = Object.values(component.variants).flat();
    return variants
      .map(variant => ({ variant, score: this.similarity(current, variant) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.variant);
  }

  generateComponentExamples(component) {
    const examples = [];
    const componentName = component.name || component.displayName;
    
    // Props is an object in DCP spec - convert to array of required props
    const propsArray = Object.entries(component.props || {}).map(([name, prop]) => ({
      name,
      ...prop
    }));
    const requiredProps = propsArray.filter(p => p.required);
    
    // Basic example
    const basicProps = requiredProps.map(prop => {
      const exampleValue = this.generateExampleValue(prop.type);
      return `${prop.name}=${exampleValue}`;
    }).join(' ');
    
    examples.push({
      title: 'Basic Usage',
      code: `<${componentName} ${basicProps} />`,
    });

    // With variants (if available)
    if (component.variants && Object.keys(component.variants).length > 0) {
      const variantKey = Object.keys(component.variants)[0];
      const variantValue = component.variants[variantKey][0];
      examples.push({
        title: 'With Variant',
        code: `<${componentName} ${basicProps} ${variantKey}="${variantValue}" />`,
      });
    }

    return examples;
  }

  generateExampleValue(type) {
    const examples = {
      string: '"example"',
      number: '42',
      boolean: 'true',
      array: '[]',
      object: '{}',
      function: '() => {}',
    };
    return examples[type] || '"example"';
  }

  similarity(a, b) {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    const editDistance = this.levenshtein(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  getLineNumber(code, search) {
    const lines = code.substring(0, code.indexOf(search)).split('\n');
    return lines.length;
  }

  async handleBuildPacks({ registry = 'registry/registry.json', outputDir = './dist/packs', baseUrl = '', namespace = 'ui', version = '1.0.0' }) {
    try {
      // Import build packs command
      const { runBuildPacks } = await import('./commands/build-packs.js');
      
      const result = await runBuildPacks(registry, {
        out: outputDir,
        baseUrl,
        namespace,
        version,
        verbose: false,
        json: true
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Build Packs Results:

Success: ${result.success}
Packs Built: ${result.packs}
Output Directory: ${result.outputDir}
Index URL: ${result.indexUrl}

${result.errors > 0 ? `Errors: ${result.errors} components failed to build` : 'All components built successfully'}

Summary: Built ${result.packs} component packs for distribution`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Build Packs Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleServeRegistry({ packsDir = './dist/packs', port = 7401, host = 'localhost', baseUrl = '' }) {
    try {
      // Import serve registry command
      const { runServeRegistry } = await import('./commands/serve-registry.js');
      
      const result = await runServeRegistry(packsDir, {
        port,
        host,
        baseUrl,
        verbose: false,
        json: true
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Registry Server Started:

Server URL: ${result.url}
Packs Directory: ${result.packsDir}
Components Available: ${result.componentsCount || 'Unknown'}

The development server is now running and serving your component registry.
You can browse components and test installations from this URL.

Status: Server running successfully`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Serve Registry Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleAddComponent({ componentUrl, targetDir = './components/ui', packageJson = './package.json', skipInstall = false, force = false, dryRun = false }) {
    try {
      // Import add component command v2 (zero-fetch installer)
      const { runDcpAdd } = await import('./commands/dcp-add-v2.js');
      
      const result = await runDcpAdd(componentUrl, {
        target: targetDir,
        pm: null, // Auto-detect
        token: process.env.DCP_REGISTRY_TOKEN,
        dryRun,
        yes: true, // Skip prompts in MCP context
        overwrite: force ? 'force' : 'skip',
        registryFormat: 'shadcn',
        verbose: false,
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Component Installation Results:

${dryRun ? '🔍 DRY RUN - Preview Only' : '✅ Installation Complete'}

Component: ${result.component?.name || 'Unknown'}${result.component?.version ? `@${result.component.version}` : ''}
Namespace: ${result.component?.namespace || 'N/A'}
Target Directory: ${result.targetDir}
Files Installed: ${result.files?.length || 0}
Dependencies: ${result.depsInstalled ? 'Installed' : 'Skipped'}

${dryRun ? 
  'This was a preview - run without dryRun to actually install' : 
  `Successfully installed ${result.component?.name} component!`}

Files written:
${result.files?.slice(0, 10).map(f => `  - ${f}`).join('\n') || '  (none)'}
${result.files?.length > 10 ? `  ... and ${result.files.length - 10} more` : ''}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Component Installation Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const registryPath = process.argv[2] || './registry';
  const server = new DCPMCPServer(registryPath);
  
  console.error('DCP MCP Server starting...');
  console.error(`Registry path: ${registryPath}`);
  
  server.start().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}

export { DCPMCPServer };