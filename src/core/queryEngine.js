/**
 * Query Engine - Advanced registry querying with CSS-like selectors
 * 
 * Provides powerful querying capabilities for DCP registries:
 * - CSS-like selector syntax
 * - Component and token filtering
 * - Property-based queries
 * - Aggregation and analytics
 */

export class QueryEngine {
  constructor(registry) {
    this.registry = registry;
    this.components = registry.components || [];
    this.tokens = registry.tokens || {};
  }

  /**
   * Execute a query against the registry
   */
  async query(selector, options = {}) {
    try {
      const parsed = this.parseSelector(selector);
      let results = [];

      // Route to appropriate query handler
      switch (parsed.type) {
        case 'components':
          results = this.queryComponents(parsed);
          break;
        case 'tokens':
          results = this.queryTokens(parsed);
          break;
        case 'usage':
          results = this.queryUsage(parsed);
          break;
        default:
          throw new Error(`Unknown query type: ${parsed.type}`);
      }

      // Apply post-processing
      if (options.includeMetadata) {
        results = this.addMetadata(results, parsed);
      }

      if (options.format === 'summary') {
        results = this.summarizeResults(results, parsed);
      }

      return results;
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  /**
   * Parse CSS-like selector into query structure
   */
  parseSelector(selector) {
    // Simple parser for basic selectors
    // Format: type[filter1=value1][filter2=value2]...
    
    const typeMatch = selector.match(/^(\w+)/);
    if (!typeMatch) {
      throw new Error('Invalid selector: must start with type (components, tokens, usage)');
    }

    const type = typeMatch[1];
    const filterMatches = selector.matchAll(/\[([^=\]]+)(?:=([^\]]*))?\]/g);
    
    const filters = [];
    for (const match of filterMatches) {
      const [, property, value] = match;
      filters.push({
        property: property.trim(),
        value: value ? value.trim() : true,
        operator: value ? '=' : 'exists'
      });
    }

    return { type, filters, original: selector };
  }

  /**
   * Query components with filters
   */
  queryComponents(parsed) {
    let results = [...this.components];

    // Apply each filter
    for (const filter of parsed.filters) {
      results = results.filter(component => {
        return this.matchesFilter(component, filter);
      });
    }

    return results;
  }

  /**
   * Query tokens with filters
   */
  queryTokens(parsed) {
    const flatTokens = this.flattenTokens(this.tokens);
    let results = Object.entries(flatTokens).map(([path, token]) => ({
      path,
      ...token
    }));

    // Apply filters
    for (const filter of parsed.filters) {
      results = results.filter(token => {
        return this.matchesTokenFilter(token, filter);
      });
    }

    return results;
  }

  /**
   * Query usage patterns
   */
  queryUsage(parsed) {
    const results = {
      components: this.analyzeComponentUsage(),
      tokens: this.analyzeTokenUsage(),
      patterns: this.analyzeUsagePatterns()
    };

    // Apply filters to usage results
    for (const filter of parsed.filters) {
      if (filter.property in results) {
        results[filter.property] = this.filterUsageData(results[filter.property], filter);
      }
    }

    return results;
  }

  /**
   * Check if component matches filter
   */
  matchesFilter(component, filter) {
    const { property, value, operator } = filter;

    // Handle nested properties (e.g., props.variant)
    const propValue = this.getNestedProperty(component, property);

    switch (operator) {
      case 'exists':
        return propValue !== undefined && propValue !== null;
      
      case '=':
        if (Array.isArray(propValue)) {
          return propValue.includes(value);
        }
        return propValue === value || String(propValue) === value;
      
      case '!=':
        if (Array.isArray(propValue)) {
          return !propValue.includes(value);
        }
        return propValue !== value && String(propValue) !== value;
      
      case '*=':
        return String(propValue).toLowerCase().includes(String(value).toLowerCase());
      
      case '^=':
        return String(propValue).toLowerCase().startsWith(String(value).toLowerCase());
      
      case '$=':
        return String(propValue).toLowerCase().endsWith(String(value).toLowerCase());
      
      default:
        return false;
    }
  }

  /**
   * Check if token matches filter
   */
  matchesTokenFilter(token, filter) {
    const { property, value, operator } = filter;

    if (property === 'category') {
      const category = this.getTokenCategory(token.path);
      return this.matchesValue(category, value, operator);
    }

    if (property === 'path') {
      return this.matchesValue(token.path, value, operator);
    }

    if (property === 'value') {
      return this.matchesValue(token.value, value, operator);
    }

    if (property === 'type') {
      return this.matchesValue(token.type, value, operator);
    }

    return false;
  }

  /**
   * Generic value matching
   */
  matchesValue(actual, expected, operator) {
    switch (operator) {
      case 'exists':
        return actual !== undefined && actual !== null;
      case '=':
        return actual === expected || String(actual) === expected;
      case '!=':
        return actual !== expected && String(actual) !== expected;
      case '*=':
        return String(actual).toLowerCase().includes(String(expected).toLowerCase());
      case '^=':
        return String(actual).toLowerCase().startsWith(String(expected).toLowerCase());
      case '$=':
        return String(actual).toLowerCase().endsWith(String(expected).toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Get nested property from object using dot notation
   */
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      
      // Handle array access (e.g., props[0].name)
      const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        const [, arrayKey, index] = arrayMatch;
        const array = current[arrayKey];
        return Array.isArray(array) ? array[parseInt(index)] : undefined;
      }
      
      return current[key];
    }, obj);
  }

  /**
   * Flatten nested token object
   */
  flattenTokens(tokens, prefix = '') {
    const result = {};
    
    for (const [key, value] of Object.entries(tokens)) {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ('value' in value) {
          // This is a token
          result[path] = value;
        } else {
          // This is a nested object
          Object.assign(result, this.flattenTokens(value, path));
        }
      }
    }
    
    return result;
  }

  /**
   * Get token category from path
   */
  getTokenCategory(path) {
    const parts = path.split('.');
    return parts[0]; // First part is typically the category
  }

  /**
   * Analyze component usage patterns
   */
  analyzeComponentUsage() {
    const usage = {};
    
    this.components.forEach(component => {
      usage[component.name] = {
        props: component.props?.length || 0,
        variants: component.variants?.length || 0,
        examples: component.examples?.length || 0,
        category: component.category,
        complexity: this.calculateComplexity(component)
      };
    });
    
    return usage;
  }

  /**
   * Analyze token usage patterns
   */
  analyzeTokenUsage() {
    const flatTokens = this.flattenTokens(this.tokens);
    const usage = {};
    
    // Group by category
    Object.keys(flatTokens).forEach(path => {
      const category = this.getTokenCategory(path);
      if (!usage[category]) {
        usage[category] = { count: 0, tokens: [] };
      }
      usage[category].count++;
      usage[category].tokens.push(path);
    });
    
    return usage;
  }

  /**
   * Analyze general usage patterns
   */
  analyzeUsagePatterns() {
    return {
      totalComponents: this.components.length,
      totalTokens: Object.keys(this.flattenTokens(this.tokens)).length,
      categoriesUsed: this.getCategoriesUsed(),
      complexityDistribution: this.getComplexityDistribution()
    };
  }

  /**
   * Calculate component complexity score
   */
  calculateComplexity(component) {
    let score = 0;
    
    score += (component.props?.length || 0) * 2;
    score += (component.variants?.length || 0) * 3;
    score += component.children ? 5 : 0;
    score += (component.examples?.length || 0);
    
    if (score < 5) return 'simple';
    if (score < 15) return 'moderate';
    return 'complex';
  }

  /**
   * Get all categories used in registry
   */
  getCategoriesUsed() {
    const categories = new Set();
    
    // Component categories
    this.components.forEach(comp => {
      if (comp.category) categories.add(comp.category);
    });
    
    // Token categories
    Object.keys(this.tokens).forEach(category => {
      categories.add(category);
    });
    
    return Array.from(categories);
  }

  /**
   * Get complexity distribution
   */
  getComplexityDistribution() {
    const distribution = { simple: 0, moderate: 0, complex: 0 };
    
    this.components.forEach(component => {
      const complexity = this.calculateComplexity(component);
      distribution[complexity]++;
    });
    
    return distribution;
  }

  /**
   * Filter usage data based on filter
   */
  filterUsageData(data, filter) {
    if (typeof data !== 'object') return data;
    
    const filtered = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.matchesValue(key, filter.value, filter.operator)) {
        filtered[key] = value;
      }
    }
    
    return filtered;
  }

  /**
   * Add metadata to results
   */
  addMetadata(results, parsed) {
    return {
      results,
      metadata: {
        query: parsed.original,
        type: parsed.type,
        filters: parsed.filters,
        count: Array.isArray(results) ? results.length : Object.keys(results).length,
        executedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Summarize results for overview
   */
  summarizeResults(results, parsed) {
    if (parsed.type === 'components') {
      return {
        total: results.length,
        categories: this.groupBy(results, 'category'),
        complexity: this.groupBy(results, comp => this.calculateComplexity(comp)),
        sampleComponents: results.slice(0, 5).map(comp => comp.name)
      };
    }
    
    if (parsed.type === 'tokens') {
      return {
        total: results.length,
        categories: this.groupBy(results, token => this.getTokenCategory(token.path)),
        types: this.groupBy(results, 'type'),
        sampleTokens: results.slice(0, 5).map(token => token.path)
      };
    }
    
    return results;
  }

  /**
   * Group array by property or function
   */
  groupBy(array, keyFn) {
    const groups = {};
    array.forEach(item => {
      const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
      if (!groups[key]) groups[key] = 0;
      groups[key]++;
    });
    return groups;
  }
}