/**
 * ts-morph-based TypeScript prop extractor
 * Replaces react-docgen-typescript with direct TypeScript compiler API
 * 
 * Architecture:
 * 1. Parse project with tsconfig resolution
 * 2. For each component, resolve & flatten prop types  
 * 3. Graceful per-prop degradation (unknown instead of component failure)
 * 4. No subprocess calls, no JSON parsing failures
 */

import { Project, SyntaxKind, ts } from 'ts-morph';
import path from 'path';
import fs from 'fs/promises';

export class TSMorphExtractor {
  constructor(options = {}) {
    this.options = {
      // Graceful fallback options
      fallbackToUnknown: true,
      includeInheritedProps: true,
      maxDepth: 10,
      ...options
    };
    
    this.project = null;
    this.typeChecker = null;
    
    // Performance caches
    this.typeCache = new Map(); // typeText → PropInfo[]
    this.symbolCache = new Map(); // symbolId → PropInfo[]
    this.intersectionCache = new Map(); // intersection signature → PropInfo[]
    
    // Performance metrics
    this.cacheStats = {
      typeCacheHits: 0,
      symbolCacheHits: 0,
      intersectionCacheHits: 0,
      reactDomSkips: 0,
      totalQueries: 0
    };
  }

  /**
   * Initialize ts-morph project with tsconfig resolution
   */
  async initialize(projectPath) {
    try {
      // TEMPORARY: Skip tsconfig entirely for BaseWeb (has illegal JSON comments)
      // This will be much faster and avoid the parsing issues
      // console.log(`[TSMorphExtractor] Using fallback config (skipping tsconfig due to JSON comments)`);
      
      this.project = new Project({
        compilerOptions: {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.NodeNext,
          moduleResolution: ts.ModuleResolutionKind.NodeNext,
          lib: ['dom', 'esnext'],
          jsx: ts.JsxEmit.React,
          strict: false,
          noEmit: true,
          esModuleInterop: true,
          skipLibCheck: true,
          isolatedModules: true,
          allowSyntheticDefaultImports: true,
          // CRITICAL: Restore BaseWeb's path mappings for type resolution
          baseUrl: projectPath,
          paths: {
            "baseui": ["./src"],
            "baseui/*": ["./src/*"]
          }
        }
      });
      
      this.typeChecker = this.project.getTypeChecker();
      
      return true;
    } catch (error) {
      console.warn(`[TSMorphExtractor] Failed to initialize project: ${error.message}`);
      return false;
    }
  }

  /**
   * Find tsconfig.json in project hierarchy
   */
  async findTsConfig(startPath) {
    let currentPath = path.resolve(startPath);
    
    while (currentPath !== path.dirname(currentPath)) {
      const tsconfigPath = path.join(currentPath, 'tsconfig.json');
      
      try {
        await fs.access(tsconfigPath);
        return tsconfigPath;
      } catch {
        // Continue searching up the directory tree
      }
      
      currentPath = path.dirname(currentPath);
    }
    
    throw new Error('No tsconfig.json found');
  }

  /**
   * Extract props from a component file
   */
  async extractComponentProps(filePath, componentName) {
    try {
      if (!this.project) {
        throw new Error('TSMorphExtractor not initialized');
      }

      // Add source file to project
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      
      // Find the component declaration
      const component = this.findComponent(sourceFile, componentName);
      if (!component) {
        return { success: false, error: `Component ${componentName} not found` };
      }

      // Extract prop type information
      const props = await this.extractPropsFromComponent(component);
      
      return {
        success: true,
        props,
        component: {
          name: componentName,
          type: this.getComponentType(component),
          filePath
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallback: this.options.fallbackToUnknown
      };
    }
  }

  /**
   * Find component declaration in source file
   */
  findComponent(sourceFile, componentName) {
    // Try different patterns for component declarations
    
    // 1. Function declaration: function ComponentName() {}
    const functionDecl = sourceFile.getFunction(componentName);
    if (functionDecl) return functionDecl;
    
    // 2. Variable declaration: const ComponentName = () => {}
    const variableDecl = sourceFile.getVariableDeclaration(componentName);
    if (variableDecl) return variableDecl;
    
    // 3. Export assignment: export const ComponentName = ...
    const exportedDecls = sourceFile.getExportedDeclarations().get(componentName);
    if (exportedDecls && exportedDecls.length > 0) {
      return exportedDecls[0];
    }
    
    // 4. Default export
    const defaultExport = sourceFile.getDefaultExportSymbol();
    if (defaultExport && defaultExport.getName() === componentName) {
      return defaultExport.getDeclarations()[0];
    }
    
    return null;
  }

  /**
   * Extract props from component declaration
   */
  async extractPropsFromComponent(component) {
    try {
      // Get the component's prop type
      const propType = this.getComponentPropType(component);
      if (!propType) {
        return [];
      }

      // Resolve prop type to individual properties
      const props = this.resolveTypeProperties(propType);
      
      return props.map(prop => ({
        name: prop.name,
        type: this.formatType(prop.type),
        description: prop.description || '',
        required: prop.required,
        defaultValue: prop.defaultValue,
        source: 'ts-morph'
      }));

    } catch (error) {
      if (this.options.fallbackToUnknown) {
        return [{
          name: 'props',
          type: 'unknown',
          description: `Failed to extract props: ${error.message}`,
          required: false,
          source: 'ts-morph-fallback'
        }];
      }
      throw error;
    }
  }

  /**
   * Get component's prop type from its signature - ENTERPRISE EDITION
   * Handles React.FC, forwardRef, intersection types, and complex generics
   */
  getComponentPropType(component) {
    try {
      // TIER 1: Direct function parameter extraction
      const directType = this.extractDirectPropType(component);
      if (directType) return directType;
      
      // TIER 2: React.FC generic type extraction (THE BREAKTHROUGH)
      const reactFCType = this.extractReactFCGenericType(component);
      if (reactFCType) return reactFCType;
      
      // TIER 3: Complex HOC unwrapping
      const hocType = this.extractHOCPropType(component);
      if (hocType) return hocType;
      
      return null;
    } catch (error) {
      console.warn(`[TSMorphExtractor] Failed to get prop type: ${error.message}`);
      return null;
    }
  }

  /**
   * TIER 1: Extract props from direct function parameters
   */
  extractDirectPropType(component) {
    // Function declarations
    if (component.getKind() === SyntaxKind.FunctionDeclaration) {
      const parameters = component.getParameters();
      if (parameters.length > 0) {
        return parameters[0].getType();
      }
    }
    
    // Arrow/function expressions in variable declarations
    if (component.getKind() === SyntaxKind.VariableDeclaration) {
      const initializer = component.getInitializer();
      if (!initializer) return null;
      
      if (initializer.getKind() === SyntaxKind.ArrowFunction ||
          initializer.getKind() === SyntaxKind.FunctionExpression) {
        const parameters = initializer.getParameters();
        if (parameters.length > 0) {
          return parameters[0].getType();
        }
      }
    }
    
    return null;
  }

  /**
   * TIER 2: THE BREAKTHROUGH - Extract React.FC<T> generic type parameter
   * This handles: const Block: React.FC<BlockProps & {...}> = (props) => {...}
   */
  extractReactFCGenericType(component) {
    if (component.getKind() !== SyntaxKind.VariableDeclaration) return null;
    
    const typeNode = component.getTypeNode();
    if (!typeNode) return null;
    
    // Handle React.FC<T> pattern
    if (this.isReactFCTypeReference(typeNode)) {
      const typeArgs = typeNode.getTypeArguments();
      if (typeArgs && typeArgs.length > 0) {
        // Get the first generic parameter (T in React.FC<T>)
        const propTypeNode = typeArgs[0];
        return this.typeChecker.getTypeAtLocation(propTypeNode);
      }
    }
    
    // Handle type aliases that resolve to React.FC<T>
    const type = this.typeChecker.getTypeAtLocation(typeNode);
    if (this.isReactFCType(type)) {
      const typeArgs = type.getTypeArguments();
      if (typeArgs && typeArgs.length > 0) {
        return typeArgs[0];
      }
    }
    
    return null;
  }

  /**
   * TIER 3: Extract props from HOC patterns (forwardRef, memo, etc.)
   */
  extractHOCPropType(component) {
    if (component.getKind() !== SyntaxKind.VariableDeclaration) return null;
    
    const initializer = component.getInitializer();
    if (!initializer || initializer.getKind() !== SyntaxKind.CallExpression) return null;
    
    // Handle forwardRef((props: Props, ref) => {...})
    const callExpr = initializer;
    const args = callExpr.getArguments();
    if (args.length > 0) {
      const firstArg = args[0];
      if (firstArg.getKind() === SyntaxKind.ArrowFunction ||
          firstArg.getKind() === SyntaxKind.FunctionExpression) {
        const parameters = firstArg.getParameters();
        if (parameters.length > 0) {
          return parameters[0].getType();
        }
      }
    }
    
    return null;
  }

  /**
   * Pattern Detection: Is this a React.FC type reference?
   */
  isReactFCTypeReference(typeNode) {
    if (typeNode.getKind() !== SyntaxKind.TypeReference) return false;
    
    const typeName = typeNode.getTypeName();
    if (!typeName) return false;
    
    // Handle React.FC
    if (typeName.getKind() === SyntaxKind.QualifiedName) {
      const left = typeName.getLeft();
      const right = typeName.getRight();
      return left.getText() === 'React' && right.getText() === 'FC';
    }
    
    // Handle direct FC import
    if (typeName.getKind() === SyntaxKind.Identifier) {
      return typeName.getText() === 'FC';
    }
    
    return false;
  }

  /**
   * Type Detection: Is this type a React.FC?
   */
  isReactFCType(type) {
    const typeText = type.getText();
    return typeText.includes('React.FC') || 
           typeText.includes('FunctionComponent') ||
           typeText.includes('React.FunctionComponent');
  }

  /**
   * Resolve type properties into prop info
   */
  resolveTypeProperties(type, depth = 0) {
    if (depth > this.options.maxDepth) {
      return [];
    }

    try {
      const typeText = type.getText();
      this.cacheStats.totalQueries++;

      // React DOM fast-skip (don't waste time on built-in HTML attr bags)
      // BUT be more careful - only skip if the ENTIRE type is DOM-related, not intersection types that CONTAIN DOM props
      const REACT_DOM_SKIP = /^(React\.(?:\w+)?HTMLAttributes|DetailedHTMLProps<|ClassAttributes<|DOMAttributes<)/;
      if (REACT_DOM_SKIP.test(typeText)) {
        this.cacheStats.reactDomSkips++;
        this.typeCache.set(typeText, []);
        return [];
      }

      // Check type cache first - massive performance gain
      if (this.typeCache.has(typeText)) {
        this.cacheStats.typeCacheHits++;
        return this.typeCache.get(typeText);
      }

      // Skip React DOM built-in types - but only if the ENTIRE type is DOM-related
      // Don't skip intersection types that happen to contain DOM properties  
      const REACT_DOM_SKIP_PATTERNS = [
        /^React\.ImgHTMLAttributes/,
        /^React\.DivHTMLAttributes/,
        /^React\.ButtonHTMLAttributes/,
        /^React\.InputHTMLAttributes/,
        /^React\.FormHTMLAttributes/,
        /^React\.HTMLAttributes/,
        /^React\.ClassAttributes/,
        /^HTMLAttributes</,
        /^DetailedHTMLProps</
      ];

      if (REACT_DOM_SKIP_PATTERNS.some(pattern => pattern.test(typeText))) {
        this.cacheStats.reactDomSkips++;
        this.typeCache.set(typeText, []);
        return [];
      }

      // Depth guard: prevent descending into React/JSX internals at deep levels
      if (depth > 2 && typeText.startsWith('React.')) {
        this.typeCache.set(typeText, []);
        return [];
      }

      const properties = [];

      // Handle intersection types (A & B) FIRST - this is the most common pattern
      if (type.isIntersection()) {
        const intersectionKey = typeText; // Use full type text as cache key
        if (this.intersectionCache.has(intersectionKey)) {
          this.cacheStats.intersectionCacheHits++;
          return this.intersectionCache.get(intersectionKey);
        }

        for (const intersectionType of type.getIntersectionTypes()) {
          const intersectionProps = this.resolveTypeProperties(intersectionType, depth + 1);
          properties.push(...intersectionProps);
        }
        
        this.intersectionCache.set(intersectionKey, properties);
        this.typeCache.set(typeText, properties);
        return properties;
      }

      // Handle union types (A | B) - take first non-undefined
      if (type.isUnion()) {
        const nonUndefinedTypes = type.getUnionTypes().filter(t => !t.isUndefined());
        if (nonUndefinedTypes.length > 0) {
          const unionProps = this.resolveTypeProperties(nonUndefinedTypes[0], depth + 1);
          properties.push(...unionProps);
        }
        this.typeCache.set(typeText, properties);
        return properties;
      }
      
      // Handle direct object types
      const symbol = type.getSymbol();
      if (!symbol) {
        this.typeCache.set(typeText, []);
        return [];
      }

      // Check symbol cache
      const symbolName = symbol.getName();
      const symbolId = `${symbolName}:${typeText.slice(0, 100)}`; // Avoid huge cache keys
      if (this.symbolCache.has(symbolId)) {
        this.cacheStats.symbolCacheHits++;
        const cached = this.symbolCache.get(symbolId);
        this.typeCache.set(typeText, cached);
        return cached;
      }
      
      // Get direct properties
      const members = symbol.getMembers();
      
      for (const property of members) {
        const propInfo = this.extractPropertyInfo(property, depth);
        if (propInfo) {
          properties.push(propInfo);
        }
      }

      // Cache the results
      this.symbolCache.set(symbolId, properties);
      this.typeCache.set(typeText, properties);
      return properties;
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract information from a single property
   */
  extractPropertyInfo(property, depth = 0) {
    try {
      const name = property.getName();
      const declarations = property.getDeclarations();
      
      let type = 'unknown';
      let required = true;
      
      if (declarations && declarations.length > 0) {
        const declaration = declarations[0];
        const symbol = property;
        
        // Check if property is optional
        if (symbol.hasFlag && symbol.hasFlag(ts.SymbolFlags.Optional)) {
          required = false;
        }
        
        // Try to get type information
        try {
          const typeAtLocation = this.typeChecker.getTypeOfSymbolAtLocation(symbol, declaration);
          if (typeAtLocation) {
            type = typeAtLocation;
          }
        } catch (typeError) {
          // Fallback to getting type from declaration
          if (declaration.getType) {
            type = declaration.getType();
          }
        }
      }
      
      return {
        name,
        type,
        description: this.getPropertyDescription(property),
        required,
        defaultValue: this.getDefaultValue(property)
      };
    } catch (error) {
      if (this.options.fallbackToUnknown) {
        return {
          name: property.getName(),
          type: 'unknown',
          description: `Failed to extract: ${error.message}`,
          required: false,
          defaultValue: undefined
        };
      }
      return null;
    }
  }

  /**
   * Get property description from JSDoc
   */
  getPropertyDescription(property) {
    try {
      // Get JSDoc comments from the property's declarations
      const declarations = property.getDeclarations();
      if (!declarations || declarations.length === 0) return '';
      
      const declaration = declarations[0];
      const jsDocNodes = declaration.getJsDocs();
      
      if (jsDocNodes && jsDocNodes.length > 0) {
        const jsDoc = jsDocNodes[0];
        const description = jsDoc.getDescription();
        return description ? description.trim() : '';
      }
      
      // Fallback: try to get JSDoc from symbol
      const jsDocTags = property.getJsDocTags();
      if (jsDocTags && jsDocTags.length > 0) {
        const descriptionTag = jsDocTags.find(tag => tag.getName() === 'description');
        if (descriptionTag) {
          return descriptionTag.getText().trim();
        }
      }
      
      return '';
    } catch {
      return '';
    }
  }

  /**
   * Get default value for property
   */
  getDefaultValue(property) {
    try {
      // This is complex - would need to analyze initializers
      // For now, return undefined (can be enhanced later)
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Format type for display
   */
  formatType(type) {
    try {
      if (!type) return 'unknown';
      
      // Get type text with appropriate detail level
      const typeText = type.getText();
      
      // Simplify complex types
      if (typeText.length > 100) {
        return this.simplifyType(typeText);
      }
      
      return typeText;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Simplify complex type strings
   */
  simplifyType(typeText) {
    // Remove overly complex generic parameters
    return typeText
      .replace(/React\.FC<.*?>/, 'React.FC')
      .replace(/React\.Component<.*?>/, 'React.Component')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get component type (function, class, forwardRef, etc.)
   */
  getComponentType(component) {
    try {
      const kind = component.getKind();
      
      switch (kind) {
        case SyntaxKind.FunctionDeclaration:
          return 'function';
        case SyntaxKind.ClassDeclaration:
          return 'class';
        case SyntaxKind.VariableDeclaration:
          // Check if it's forwardRef, memo, etc.
          const initializer = component.getInitializer();
          if (initializer) {
            const text = initializer.getText();
            if (text.includes('forwardRef')) return 'forwardRef';
            if (text.includes('memo')) return 'memo';
            if (text.includes('=>')) return 'arrow';
          }
          return 'variable';
        default:
          return 'unknown';
      }
    } catch {
      return 'unknown';
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.project) {
      // ts-morph doesn't have explicit cleanup, but we can null references
      this.project = null;
      this.typeChecker = null;
    }
  }
}

// Factory function for easy use
export function createTSMorphExtractor(options) {
  return new TSMorphExtractor(options);
}