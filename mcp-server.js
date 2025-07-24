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
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
// Core functionality imports - only what we need for MCP
// import { extractCssCustomProps, mapTailwindClassesToCSSVariables } from './core/tokenHandler.js';
// import { parseTSX } from './core/parser.js';
import { ProjectIntelligenceScanner } from './core/projectIntelligence.js';
// import { AssetAnalyzer } from './core/assetAnalyzer.js';

class DCPMCPServer {
  constructor(registryPath = './registry') {
    this.registryPath = registryPath;
    this.registry = null;
    this.server = new Server(
      {
        name: 'dcp-registry',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
  }

  async loadRegistry() {
    if (!this.registry) {
      try {
        const registryFile = path.join(this.registryPath, 'registry.json');
        const registryData = await fs.readFile(registryFile, 'utf8');
        this.registry = JSON.parse(registryData);
      } catch (error) {
        console.error('Failed to load registry:', error.message);
        this.registry = { components: [], tokens: {}, themeContext: null };
      }
    }
    return this.registry;
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
  }

  async handleQueryTokens({ filter = '*', category, format = 'css' }) {
    const registry = await this.loadRegistry();
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
    
    // Get theme context if available
    const themeContext = registry.themeContext || {};
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            tokens: formattedTokens,
            count: Object.keys(this.flattenTokens(formattedTokens)).length,
            themeContext: {
              mode: themeContext.config?.themingMode || 'unknown',
              cssVariables: themeContext.cssVariables || {},
            },
            usage: `Use these tokens in your code. Example: color="primary.500" or className="text-primary-500"`,
          }, null, 2),
        },
      ],
    };
  }

  async handleGetComponent({ component, include = ['props', 'variants'] }) {
    const registry = await this.loadRegistry();
    const components = registry.components || [];
    
    const comp = components.find(c => 
      c.name === component || 
      c.displayName === component ||
      c.exportName === component
    );
    
    if (!comp) {
      const available = components.map(c => c.name || c.displayName).filter(Boolean);
      return {
        content: [
          {
            type: 'text',
            text: `Component "${component}" not found. Available components: ${available.join(', ')}`,
          },
        ],
      };
    }

    const response = {
      name: comp.name || comp.displayName,
      description: comp.description || 'No description available',
    };

    if (include.includes('props')) {
      response.props = comp.props || [];
      response.requiredProps = comp.props?.filter(p => p.required) || [];
      response.optionalProps = comp.props?.filter(p => !p.required) || [];
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
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  async handleValidateCode({ code, component, checkTokens = true, checkProps = true }) {
    const registry = await this.loadRegistry();
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
          text: JSON.stringify({
            valid: isValid,
            violations,
            suggestions,
            message: isValid ? 
              'Code follows design system constraints ✅' : 
              `Found ${violations.length} design system violations`,
          }, null, 2),
        },
      ],
    };
  }

  async handleSuggestAlternatives({ type, current, component, category }) {
    const registry = await this.loadRegistry();
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
          text: JSON.stringify({
            type,
            current,
            suggestions: suggestions.slice(0, 5), // Top 5 suggestions
            message: suggestions.length > 0 ? 
              `Found ${suggestions.length} alternatives for "${current}"` :
              `No alternatives found for "${current}"`,
          }, null, 2),
        },
      ],
    };
  }

  async handleProjectScan({ path: projectPath = '.', deep = false }) {
    try {
      const scanner = new ProjectIntelligenceScanner(projectPath);
      const intelligence = await scanner.scan();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              projectPath,
              framework: intelligence.projectStructure.conventions.framework,
              confidence: intelligence.intelligence.confidence,
              readiness: intelligence.intelligence.readiness,
              setupInstructions: intelligence.setupInstructions,
              integrationChecklist: intelligence.integrationChecklist,
              recommendations: intelligence.intelligence.recommendations,
              detectedPaths: intelligence.projectStructure.detectedPaths,
              dependencies: intelligence.dependencies,
            }, null, 2),
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

    const validProps = (component.props || []).map(p => p.name);
    
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
    
    const validProps = (component.props || []).map(p => p.name);
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
    const requiredProps = (component.props || []).filter(p => p.required);
    
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

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const registryPath = process.argv[2] || './registry';
  const server = new DCPMCPServer(registryPath);
  
  console.error('🧠 DCP MCP Server starting...');
  console.error(`📁 Registry path: ${registryPath}`);
  
  server.start().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}

export { DCPMCPServer };