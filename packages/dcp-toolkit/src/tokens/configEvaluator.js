/**
 * ConfigEvaluator - Safely evaluate JS/TS configuration files
 * Handles Tailwind configs, MUI themes, and custom token files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'node:module';

export class ConfigEvaluator {
  constructor(options = {}) {
    this.timeout = options.timeout || 5000; // 5s timeout for safety
    this.maxFileSize = options.maxFileSize || 1024 * 1024; // 1MB max
    this.verbose = options.verbose || false;
  }

  /**
   * Evaluate any config file (JS/TS/JSON)
   */
  async evaluateConfig(configPath) {
    const ext = path.extname(configPath).toLowerCase();
    const stats = fs.statSync(configPath);
    
    // Safety check: file size
    if (stats.size > this.maxFileSize) {
      throw new Error(`Config file too large: ${stats.size} bytes (max: ${this.maxFileSize})`);
    }

    switch (ext) {
      case '.js':
      case '.mjs':
        return this.evaluateJS(configPath);
      case '.cjs':
        return this.evaluateCJS(configPath);
      case '.ts':
        return this.evaluateTS(configPath);
      case '.json':
        return this.evaluateJSON(configPath);
      default:
        throw new Error(`Unsupported config file type: ${ext}`);
    }
  }

  /**
   * Evaluate JavaScript config files
   */
  async evaluateJS(configPath) {
    try {
      if (this.verbose) {
        console.log(`📄 Evaluating JS config: ${configPath}`);
      }

      // Check if file uses CommonJS - try CJS evaluation first
      const content = fs.readFileSync(configPath, 'utf8');
      if (content.includes('module.exports')) {
        try {
          return await this.evaluateCJS(configPath);
        } catch (cjsError) {
          // CJS failed, fall through to static extraction
          return this.extractStaticFromFile(configPath);
        }
      }

      // Convert to file URL for dynamic import
      const fileUrl = pathToFileURL(path.resolve(configPath)).href;

      // Add cache busting to ensure fresh imports
      const moduleUrl = `${fileUrl}?t=${Date.now()}`;

      // Dynamic import with timeout
      let module;
      try {
        module = await this.withTimeout(
          import(moduleUrl),
          this.timeout,
          `Config evaluation timeout: ${configPath}`
        );
      } catch (importError) {
        // Import failed - static fallback
        return this.extractStaticFromFile(configPath);
      }

      // Extract default export or module itself
      const config = module.default || module;

      // If import returned empty, try static extraction as fallback
      if (typeof config === 'object' && config !== null && Object.keys(config).length === 0) {
        return this.extractStaticFromFile(configPath);
      }

      if (typeof config === 'function') {
        // Handle functional configs (common in Tailwind)
        try {
          return config();
        } catch (err) {
          // If function call fails, try to extract static parts
          if (this.verbose) {
            console.warn(`Function call failed, attempting static extraction: ${err.message}`);
          }
          return this.extractStaticFromFunction(fs.readFileSync(configPath, 'utf8'));
        }
      }

      return config;
    } catch (error) {
      if (this.verbose) {
        console.warn(`Failed to evaluate JS config ${configPath}:`, error.message);
      }

      // Fallback: try CJS require for module.exports files
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        if (content.includes('module.exports')) {
          return await this.evaluateCJS(configPath);
        }
      } catch (cjsError) {
        // CJS fallback also failed, continue to static extraction
      }

      // Final fallback: try static analysis
      return this.extractStaticFromFile(configPath);
    }
  }

  /**
   * Evaluate CommonJS config files (.cjs or .js with module.exports)
   */
  async evaluateCJS(configPath) {
    try {
      if (this.verbose) {
        console.log(`📄 Evaluating CJS config: ${configPath}`);
      }
      const require = createRequire(import.meta.url);
      const absPath = path.resolve(configPath);

      // If the file is .js (may be in ESM context), copy to a .cjs temp file
      const ext = path.extname(absPath);
      let requirePath = absPath;
      let tempFile = null;
      if (ext === '.js') {
        tempFile = absPath + `.${Date.now()}.cjs`;
        fs.copyFileSync(absPath, tempFile);
        requirePath = tempFile;
      }

      try {
        // Clear require cache for fresh load
        delete require.cache[requirePath];
        const config = require(requirePath);
        return config;
      } finally {
        if (tempFile && fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    } catch (error) {
      if (this.verbose) {
        console.warn(`Failed to evaluate CJS config ${configPath}:`, error.message);
      }
      return this.extractStaticFromFile(configPath);
    }
  }

  /**
   * Evaluate TypeScript config files
   */
  async evaluateTS(configPath) {
    try {
      if (this.verbose) {
        console.log(`📄 Evaluating TS config: ${configPath}`);
      }

      // Try to compile TS to JS first
      const content = fs.readFileSync(configPath, 'utf8');
      
      // Check if TypeScript is available
      let typescript;
      try {
        typescript = await import('typescript');
      } catch (err) {
        if (this.verbose) {
          console.warn('TypeScript not available, falling back to static extraction');
        }
        return this.extractStaticFromFile(configPath);
      }

      // Transpile TS to JS
      const jsCode = typescript.transpile(content, {
        module: typescript.ModuleKind.ES2020,
        target: typescript.ScriptTarget.ES2020
      });

      // Write temporary JS file and import it
      const tempPath = configPath.replace('.ts', '.temp.js');
      fs.writeFileSync(tempPath, jsCode);
      
      try {
        const result = await this.evaluateJS(tempPath);
        fs.unlinkSync(tempPath); // Clean up
        return result;
      } catch (err) {
        fs.unlinkSync(tempPath); // Clean up on error
        throw err;
      }
    } catch (error) {
      if (this.verbose) {
        console.warn(`Failed to evaluate TS config ${configPath}:`, error.message);
      }
      
      // Fallback: try static analysis
      return this.extractStaticFromFile(configPath);
    }
  }

  /**
   * Evaluate JSON config files
   */
  async evaluateJSON(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse JSON config ${configPath}: ${error.message}`);
    }
  }

  /**
   * Extract static values from config file content using regex/AST
   */
  extractStaticFromFile(configPath) {
    const content = fs.readFileSync(configPath, 'utf8');

    if (configPath.includes('tailwind')) {
      return this.extractTailwindStatic(content);
    } else if (configPath.includes('mui') || configPath.includes('theme')) {
      return this.extractMUIStatic(content);
    } else {
      return this.extractGenericStatic(content);
    }
  }

  /**
   * Extract static Tailwind config values
   */
  extractTailwindStatic(content) {
    const config = { theme: { extend: {} } };
    
    try {
      // Extract theme.extend.colors
      const colorsMatch = content.match(/colors\s*:\s*\{([\s\S]*?)\}/);
      if (colorsMatch) {
        config.theme.extend.colors = this.parseObjectLiteral(colorsMatch[1]);
      }

      // Extract theme.extend.spacing
      const spacingMatch = content.match(/spacing\s*:\s*\{([\s\S]*?)\}/);
      if (spacingMatch) {
        config.theme.extend.spacing = this.parseObjectLiteral(spacingMatch[1]);
      }

      // Extract theme.extend.fontSize
      const fontSizeMatch = content.match(/fontSize\s*:\s*\{([\s\S]*?)\}/);
      if (fontSizeMatch) {
        config.theme.extend.fontSize = this.parseObjectLiteral(fontSizeMatch[1]);
      }

      if (this.verbose) {
        console.log('📦 Extracted Tailwind static config');
      }
    } catch (err) {
      if (this.verbose) {
        console.warn('Failed to extract Tailwind static config:', err.message);
      }
    }

    return config;
  }

  /**
   * Extract static MUI theme values
   */
  extractMUIStatic(content) {
    const theme = { palette: {}, spacing: 8, typography: {} };

    try {
      // Extract palette colors (needs balanced braces for nested objects)
      const paletteBody = this.extractBalancedBlock(content, 'palette');
      if (paletteBody) {
        theme.palette = this.parseNestedObjectLiteral(paletteBody);
      }

      // Extract spacing
      const spacingMatch = content.match(/spacing\s*:\s*(\d+)/);
      if (spacingMatch) {
        theme.spacing = parseInt(spacingMatch[1]);
      }

      // Extract typography (needs balanced braces for nested objects)
      const typographyBody = this.extractBalancedBlock(content, 'typography');
      if (typographyBody) {
        theme.typography = this.parseNestedObjectLiteral(typographyBody);
      }

      if (this.verbose) {
        console.log('📦 Extracted MUI static theme');
      }
    } catch (err) {
      if (this.verbose) {
        console.warn('Failed to extract MUI static theme:', err.message);
      }
    }

    return theme;
  }

  /**
   * Extract generic static values (exported objects)
   */
  extractGenericStatic(content) {
    const exports = {};
    
    try {
      // Extract export default { ... }
      const defaultExportMatch = content.match(/export\s+default\s*\{([\s\S]*?)\}/);
      if (defaultExportMatch) {
        exports.default = this.parseObjectLiteral(defaultExportMatch[1]);
      }

      // Extract export const name = { ... }
      const namedExportMatches = content.matchAll(/export\s+const\s+(\w+)\s*=\s*\{([\s\S]*?)\}/g);
      for (const match of namedExportMatches) {
        exports[match[1]] = this.parseObjectLiteral(match[2]);
      }

      // Extract module.exports = { ... } (CommonJS)
      if (!exports.default) {
        const moduleExportsMatch = content.match(/module\.exports\s*=\s*\{([\s\S]*?)\}/);
        if (moduleExportsMatch) {
          exports.default = this.parseObjectLiteral(moduleExportsMatch[1]);
        }
      }

      if (this.verbose) {
        console.log('📦 Extracted generic static exports');
      }
    } catch (err) {
      if (this.verbose) {
        console.warn('Failed to extract generic static exports:', err.message);
      }
    }

    return exports.default || exports;
  }

  /**
   * Extract a balanced-brace block for a given key from source content.
   * Returns the inner content between the outermost braces.
   */
  extractBalancedBlock(content, key) {
    const re = new RegExp(key + '\\s*:\\s*\\{');
    const match = re.exec(content);
    if (!match) return null;

    let depth = 1;
    let start = match.index + match[0].length;
    let i = start;
    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') depth--;
      i++;
    }
    return depth === 0 ? content.slice(start, i - 1) : null;
  }

  /**
   * Parse an object literal that may contain one level of nested objects.
   * Returns nested structure: { primary: { main: '#...', ... }, ... }
   */
  parseNestedObjectLiteral(objectString) {
    const obj = {};
    // Match nested objects: key: { ... }
    const nestedRe = /([\w-]+)\s*:\s*\{([^}]*)\}/g;
    let nestedMatch;
    const nestedRanges = [];
    while ((nestedMatch = nestedRe.exec(objectString)) !== null) {
      const key = nestedMatch[1];
      obj[key] = this.parseObjectLiteral(nestedMatch[2]);
      nestedRanges.push([nestedMatch.index, nestedMatch.index + nestedMatch[0].length]);
    }

    // Match top-level simple properties (not inside a nested block)
    const simpleRe = /([\w-]+)\s*:\s*(['"`])([^'"`]*)\2/g;
    let simpleMatch;
    while ((simpleMatch = simpleRe.exec(objectString)) !== null) {
      // Skip if this match falls inside a nested range
      const pos = simpleMatch.index;
      const inNested = nestedRanges.some(([s, e]) => pos >= s && pos < e);
      if (!inNested) {
        obj[simpleMatch[1]] = simpleMatch[3];
      }
    }

    // Match top-level numeric properties not inside nested blocks
    const numRe = /([\w-]+)\s*:\s*(\d+(?:\.\d+)?)\s*[,\n}]/g;
    let numMatch;
    while ((numMatch = numRe.exec(objectString)) !== null) {
      const pos = numMatch.index;
      const inNested = nestedRanges.some(([s, e]) => pos >= s && pos < e);
      if (!inNested && !obj.hasOwnProperty(numMatch[1])) {
        obj[numMatch[1]] = parseFloat(numMatch[2]);
      }
    }

    return obj;
  }

  /**
   * Parse simple object literal strings into objects
   * Handles basic cases: strings, numbers, nested objects
   */
  parseObjectLiteral(objectString) {
    const obj = {};
    
    try {
      // Simple regex-based parsing for basic cases
      const propertyMatches = objectString.matchAll(/(['"`]?)(\w+)\1\s*:\s*(['"`]?)([^,}\n]+)\3/g);
      
      for (const match of propertyMatches) {
        const key = match[2];
        let value = match[4].trim();
        
        // Try to parse as JSON-like value
        if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`')) {
          value = value.slice(1, -1); // Remove quotes
        } else if (/^\d+(\.\d+)?$/.test(value)) {
          value = parseFloat(value); // Parse numbers
        } else if (value === 'true' || value === 'false') {
          value = value === 'true'; // Parse booleans
        }
        
        obj[key] = value;
      }
    } catch (err) {
      if (this.verbose) {
        console.warn('Failed to parse object literal:', err.message);
      }
    }
    
    return obj;
  }

  /**
   * Extract static values from function source code
   */
  extractStaticFromFunction(content) {
    try {
      // Look for return statements with object literals
      const returnMatch = content.match(/return\s*\{([\s\S]*?)\}/);
      if (returnMatch) {
        return this.parseObjectLiteral(returnMatch[1]);
      }
    } catch (err) {
      if (this.verbose) {
        console.warn('Failed to extract from function:', err.message);
      }
    }
    
    return {};
  }

  /**
   * Utility: Run promise with timeout
   */
  async withTimeout(promise, ms, errorMessage) {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), ms);
    });
    
    return Promise.race([promise, timeout]);
  }

  /**
   * Validate config structure for specific types
   */
  validateTailwindConfig(config) {
    return config && 
           typeof config === 'object' && 
           (config.theme || config.extend || config.colors);
  }

  validateMUIConfig(config) {
    return config && 
           typeof config === 'object' && 
           (config.palette || config.spacing || config.typography);
  }
}