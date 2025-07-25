/**
 * DCP Query Engine - CSS-like selectors for design system registry
 * Enables: npx dcp query "tokens.color.*" --format=json
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

/**
 * Query selector parser - supports CSS-like syntax
 */
class QueryParser {
  constructor() {
    this.operators = {
      '=': (a, b) => a === b,
      '!=': (a, b) => a !== b,
      '*=': (a, b) => String(a).includes(b),
      '^=': (a, b) => String(a).startsWith(b),
      '$=': (a, b) => String(a).endsWith(b),
      '>': (a, b) => Number(a) > Number(b),
      '<': (a, b) => Number(a) < Number(b),
    };
  }

  /**
   * Parse query selector into structured query
   * Examples:
   * - "tokens.color.*" -> { type: "tokens", path: "color.*" }
   * - "components where name != 'Button'" -> { type: "components", filters: [...] }
   * - "tokens where tokenSet = 'system'" -> { type: "tokens", filters: [...] }
   */
  parse(selector) {
    const query = {
      type: null,
      path: null,
      filters: [],
      output: '*'
    };

    // Remove extra whitespace
    selector = selector.trim();

    // Check for WHERE clause
    const whereMatch = selector.match(/^(.*?)\s+where\s+(.+)$/i);
    if (whereMatch) {
      const [, baseSelector, whereClause] = whereMatch;
      query.type = this.extractType(baseSelector);
      query.filters = this.parseWhereClause(whereClause);
    } else {
      // Simple path selector
      const parts = selector.split('.');
      query.type = parts[0];
      if (parts.length > 1) {
        query.path = parts.slice(1).join('.');
      }
    }

    return query;
  }

  extractType(selector) {
    const cleanSelector = selector.trim();
    if (cleanSelector.startsWith('tokens')) return 'tokens';
    if (cleanSelector.startsWith('components')) return 'components';
    if (cleanSelector.startsWith('themes')) return 'themes';
    if (cleanSelector.startsWith('variants')) return 'variants';
    return 'tokens'; // default
  }

  parseWhereClause(whereClause) {
    const filters = [];
    
    // Split by AND/OR (for now, just support AND)
    const conditions = whereClause.split(/\s+and\s+/i);
    
    for (const condition of conditions) {
      const filter = this.parseCondition(condition.trim());
      if (filter) filters.push(filter);
    }

    return filters;
  }

  parseCondition(condition) {
    // Match: property operator value
    const match = condition.match(/^([^=!<>*^$]+)(=|!=|\*=|\^=|\$=|>|<)\s*['"]?([^'"]+)['"]?$/);
    if (!match) return null;

    const [, property, operator, value] = match;
    return {
      property: property.trim(),
      operator: operator.trim(),
      value: value.trim()
    };
  }
}

/**
 * Registry query executor
 */
class RegistryQueryExecutor {
  constructor(registryPath) {
    this.registryPath = registryPath;
    this.registry = null;
  }

  async loadRegistry() {
    if (!this.registry) {
      try {
        const registryFile = path.join(this.registryPath, 'registry.json');
        const data = await fs.readFile(registryFile, 'utf8');
        this.registry = JSON.parse(data);
      } catch (error) {
        throw new Error(`Failed to load registry: ${error.message}`);
      }
    }
    return this.registry;
  }

  async executeQuery(query) {
    const registry = await this.loadRegistry();
    
    switch (query.type) {
      case 'tokens':
        return this.queryTokens(registry, query);
      case 'components':
        return this.queryComponents(registry, query);
      case 'themes':
        return this.queryThemes(registry, query);
      default:
        throw new Error(`Unknown query type: ${query.type}`);
    }
  }

  queryTokens(registry, query) {
    let tokens = registry.tokens || {};
    
    // Apply path filtering
    if (query.path) {
      tokens = this.filterByPath(tokens, query.path);
    }

    // Apply WHERE filters
    if (query.filters.length > 0) {
      tokens = this.applyFilters(tokens, query.filters, 'token');
    }

    return {
      type: 'tokens',
      count: this.countTokens(tokens),
      data: tokens,
      metadata: {
        query: query,
        source: registry.metadata || {},
        themeContext: registry.themeContext || null
      }
    };
  }

  queryComponents(registry, query) {
    let components = registry.components || [];

    // Apply WHERE filters
    if (query.filters.length > 0) {
      components = components.filter(component => {
        return query.filters.every(filter => {
          const value = this.getPropertyValue(component, filter.property);
          const parser = new QueryParser();
          return parser.operators[filter.operator](value, filter.value);
        });
      });
    }

    // Apply path filtering (component name matching)
    if (query.path) {
      const pathRegex = this.pathToRegex(query.path);
      components = components.filter(comp => {
        const name = comp.name || comp.displayName || '';
        return pathRegex.test(name);
      });
    }

    return {
      type: 'components',
      count: components.length,
      data: components,
      metadata: {
        query: query,
        source: registry.metadata || {}
      }
    };
  }

  queryThemes(registry, query) {
    const themeContext = registry.themeContext || {};
    let themes = {
      config: themeContext.config,
      cssVariables: themeContext.cssVariables || {}
    };

    // Apply path filtering
    if (query.path) {
      themes = this.filterByPath(themes, query.path);
    }

    return {
      type: 'themes',
      count: Object.keys(themes).length,
      data: themes,
      metadata: {
        query: query,
        source: registry.metadata || {}
      }
    };
  }

  filterByPath(data, pathPattern) {
    const pathRegex = this.pathToRegex(pathPattern);
    return this.filterObjectByPath(data, pathRegex);
  }

  pathToRegex(pathPattern) {
    // Convert glob-like pattern to regex
    // "color.*" -> /^color\..*$/
    // "*.primary" -> /^.*\.primary$/
    const regexPattern = pathPattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^.]*')
      .replace(/\*\*/g, '.*');
    
    return new RegExp(`^${regexPattern}$`);
  }

  filterObjectByPath(obj, pathRegex, currentPath = '') {
    const result = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;
      
      if (pathRegex.test(fullPath)) {
        // Direct match - include this value
        result[key] = value;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Check if any nested paths might match
        const nestedResult = this.filterObjectByPath(value, pathRegex, fullPath);
        if (Object.keys(nestedResult).length > 0) {
          result[key] = nestedResult;
        }
      }
    }
    
    return result;
  }

  applyFilters(data, filters, context) {
    if (context === 'token') {
      // For tokens, apply filters to flattened structure
      const flattened = this.flattenTokens(data);
      const filtered = {};
      
      for (const [tokenPath, tokenValue] of Object.entries(flattened)) {
        const tokenObj = {
          path: tokenPath,
          value: tokenValue.value || tokenValue,
          ...tokenValue
        };
        
        const matches = filters.every(filter => {
          const value = this.getPropertyValue(tokenObj, filter.property);
          const parser = new QueryParser();
          return parser.operators[filter.operator](value, filter.value);
        });
        
        if (matches) {
          filtered[tokenPath] = tokenValue;
        }
      }
      
      return this.unflattenTokens(filtered);
    }
    
    return data;
  }

  flattenTokens(tokens, prefix = '') {
    const flattened = {};
    
    for (const [key, value] of Object.entries(tokens)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if ('value' in value) {
          // This is a token value
          flattened[currentPath] = value;
        } else {
          // Nested object - recurse
          Object.assign(flattened, this.flattenTokens(value, currentPath));
        }
      } else {
        // Simple value
        flattened[currentPath] = { value };
      }
    }
    
    return flattened;
  }

  unflattenTokens(flattened) {
    const unflattened = {};
    
    for (const [path, value] of Object.entries(flattened)) {
      const parts = path.split('.');
      let current = unflattened;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part];
      }
      
      current[parts[parts.length - 1]] = value;
    }
    
    return unflattened;
  }

  countTokens(tokens) {
    return Object.keys(this.flattenTokens(tokens)).length;
  }

  getPropertyValue(obj, property) {
    const parts = property.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
}

/**
 * Output formatters
 */
class OutputFormatter {
  static format(result, format, options = {}) {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, options.pretty ? 2 : 0);
      case 'table':
        return OutputFormatter.formatTable(result);
      case 'list':
        return OutputFormatter.formatList(result);
      case 'count':
        return OutputFormatter.formatCount(result);
      default:
        return OutputFormatter.formatDefault(result);
    }
  }

  static formatTable(result) {
    if (result.type === 'tokens') {
      const flattened = new RegistryQueryExecutor().flattenTokens(result.data);
      const rows = Object.entries(flattened).map(([path, token]) => {
        return {
          Token: path,
          Value: token.value || token,
          Type: token.type || 'unknown'
        };
      });
      
      return OutputFormatter.createTable(rows);
    }
    
    if (result.type === 'components') {
      const rows = result.data.map(comp => ({
        Name: comp.name || comp.displayName,
        Props: (comp.props || []).length,
        Variants: Object.keys(comp.variants || {}).length,
        Description: (comp.description || '').substring(0, 50)
      }));
      
      return OutputFormatter.createTable(rows);
    }
    
    return JSON.stringify(result, null, 2);
  }

  static formatList(result) {
    if (result.type === 'tokens') {
      const flattened = new RegistryQueryExecutor().flattenTokens(result.data);
      return Object.keys(flattened).join('\n');
    }
    
    if (result.type === 'components') {
      return result.data.map(comp => comp.name || comp.displayName).join('\n');
    }
    
    return JSON.stringify(result, null, 2);
  }

  static formatCount(result) {
    return `${result.count} ${result.type} found`;
  }

  static formatDefault(result) {
    let output = '';
    output += chalk.blue(`📊 Query Results (${result.type})\n`);
    output += chalk.gray(`Found ${result.count} matches\n\n`);
    
    if (result.type === 'tokens') {
      const flattened = new RegistryQueryExecutor().flattenTokens(result.data);
      for (const [path, token] of Object.entries(flattened)) {
        output += chalk.green(`${path}: `) + chalk.white(`${token.value || token}\n`);
      }
    } else if (result.type === 'components') {
      for (const comp of result.data) {
        output += chalk.green(`${comp.name || comp.displayName}\n`);
        if (comp.props && comp.props.length > 0) {
          output += chalk.gray(`  Props: ${comp.props.map(p => p.name).join(', ')}\n`);
        }
      }
    } else {
      output += JSON.stringify(result.data, null, 2);
    }
    
    return output;
  }

  static createTable(rows) {
    if (rows.length === 0) return 'No results found';
    
    const headers = Object.keys(rows[0]);
    const columnWidths = headers.map(header => 
      Math.max(header.length, ...rows.map(row => String(row[header] || '').length))
    );
    
    let table = '';
    
    // Header
    table += '┌' + columnWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐\n';
    table += '│' + headers.map((h, i) => ` ${h.padEnd(columnWidths[i])} `).join('│') + '│\n';
    table += '├' + columnWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤\n';
    
    // Rows
    for (const row of rows) {
      table += '│' + headers.map((h, i) => ` ${String(row[h] || '').padEnd(columnWidths[i])} `).join('│') + '│\n';
    }
    
    // Footer
    table += '└' + columnWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘\n';
    
    return table;
  }
}

/**
 * Main query command
 */
export async function runQuery(selector, options = {}) {
  const {
    registry: registryPath = './registry',
    format = 'default',
    output: outputFile,
    pretty = false,
    verbose = false
  } = options;

  try {
    if (verbose) {
      console.log(chalk.gray(`Querying registry at: ${registryPath}`));
      console.log(chalk.gray(`Selector: ${selector}`));
    }

    // Parse query
    const parser = new QueryParser();
    const query = parser.parse(selector);
    
    if (verbose) {
      console.log(chalk.gray(`Parsed query:`, JSON.stringify(query, null, 2)));
    }

    // Execute query
    const executor = new RegistryQueryExecutor(registryPath);
    const result = await executor.executeQuery(query);

    // Format output
    const formatted = OutputFormatter.format(result, format, { pretty });

    // Output results
    if (outputFile) {
      await fs.writeFile(outputFile, formatted);
      if (!options.json) {
        console.log(chalk.green(`Results written to: ${outputFile}`));
      }
    } else {
      console.log(formatted);
    }

    return result;

  } catch (error) {
    if (options.json) {
      console.error(JSON.stringify({ error: error.message }));
    } else {
      console.error(chalk.red(`Query failed: ${error.message}`));
    }
    process.exit(1);
  }
}

/**
 * Example queries for testing
 */
export const exampleQueries = [
  'tokens.color.*',
  'tokens where tokenSet != "system"',
  'components where name = "Button"',
  'tokens.spacing.* where value > "16px"',
  'components',
  'themes.cssVariables.*'
];

export { QueryParser, RegistryQueryExecutor, OutputFormatter };