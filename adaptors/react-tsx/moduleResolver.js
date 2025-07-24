// adaptors/react-tsx/moduleResolver.js
import path from 'path';
import fs from 'fs';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { parseAndCacheAst, getCachedSymbol, setCachedSymbol, symbolTable } from '../../core/graphCache.js';

/**
 * Module Resolution Engine for React TSX Adaptor
 * 
 * Handles barrel file recursion with:
 * - Cycle detection and depth limits
 * - Symbol table memoization
 * - AST caching for performance
 * - Alias mapping and re-export tracking
 * - Trace logging for debugging
 */

/**
 * @typedef {Object} ResolverContext
 * @property {Set<string>} visitedFiles
 * @property {Map<string, ComponentDescriptor>} symbolTable
 * @property {number} maxDepth
 * @property {number} currentDepth
 * @property {boolean} traceBarrels
 * @property {boolean} verbose
 */

/**
 * @typedef {Object} ComponentDescriptor
 * @property {string} name
 * @property {string} filePath
 * @property {t.Node} node
 * @property {boolean} canonical - true if this is the original source, false if from barrel
 * @property {string} [alias] - if exported with different name
 */

/**
 * Core barrel export resolver - handles both named and wildcard re-exports
 */
export function resolveExport(node, filePath, ctx) {
  // 1. Cycle guard and depth limit
  if (ctx.visitedFiles.has(filePath) || ctx.currentDepth > ctx.maxDepth) {
    if (ctx.traceBarrels) {
      console.log(`[dcp:barrel] Skipped ${filePath} (cycle or depth ${ctx.currentDepth}/${ctx.maxDepth})`);
    }
    return [];
  }

  // 2. Resolve target file path
  if (!node.source?.value) {
    if (ctx.traceBarrels) {
      console.log(`[dcp:barrel] No source in export at ${filePath}`);
    }
    return [];
  }

  const targetFile = resolveModulePath(node.source.value, filePath, ctx);
  if (!targetFile) {
    if (ctx.traceBarrels) {
      console.log(`[dcp:barrel] Could not resolve ${node.source.value} from ${filePath}`);
    }
    return [];
  }

  if (ctx.traceBarrels) {
    console.log(`[dcp:barrel] ${path.basename(filePath)} → ${path.basename(targetFile)}`);
  }

  // 3. Guard against infinite recursion
  ctx.visitedFiles.add(filePath);
  ctx.currentDepth++;

  try {
    // 4. Parse target AST (from cache if available)
    const ast = parseAstFromFile(targetFile, ctx);
    if (!ast) {
      return [];
    }

    // 5. Extract components and handle different export types
    if (t.isExportNamedDeclaration(node)) {
      return handleNamedExports(node, ast, targetFile, ctx);
    } else if (t.isExportAllDeclaration(node)) {
      return handleWildcardExports(ast, targetFile, ctx);
    }

    return [];
  } finally {
    // 6. Clean up recursion guards
    ctx.visitedFiles.delete(filePath);
    ctx.currentDepth--;
  }
}

/**
 * Handle named barrel exports: export { Button, Card } from './components'
 */
function handleNamedExports(node, ast, targetFile, ctx) {
  const resolvedComponents = [];
  
  if (!node.specifiers) return resolvedComponents;

  // Create a map of all components in the target file
  const targetComponents = extractComponentsFromAst(ast, targetFile, ctx);
  const componentMap = new Map(targetComponents.map(c => [c.name, c]));

  // Resolve each export specifier
  for (const spec of node.specifiers) {
    if (t.isExportSpecifier(spec)) {
      const localName = spec.local.name;
      const exportedName = spec.exported.name || spec.exported.value;
      
      const component = componentMap.get(localName);
      if (component) {
        // Create descriptor with alias if names differ
        resolvedComponents.push({
          ...component,
          name: exportedName,
          alias: exportedName !== localName ? localName : undefined,
          canonical: false // This is a re-export
        });

        // Memoize in symbol table
        const symbolKey = `${targetFile}:${localName}`;
        setCachedSymbol(symbolKey, component);

        if (ctx.traceBarrels) {
          console.log(`[dcp:barrel]   Found ${localName} → ${exportedName}`);
        }
      } else if (ctx.traceBarrels) {
        console.log(`[dcp:barrel]   Missing ${localName} in ${path.basename(targetFile)}`);
      }
    }
  }

  return resolvedComponents;
}

/**
 * Handle wildcard barrel exports: export * from './components'
 */
function handleWildcardExports(ast, targetFile, ctx) {
  const components = extractComponentsFromAst(ast, targetFile, ctx);
  
  if (ctx.traceBarrels) {
    console.log(`[dcp:barrel]   Re-exported ${components.length} components via wildcard`);
  }

  // Mark all as non-canonical (re-exports) and cache in symbol table
  return components.map(c => {
    const symbolKey = `${targetFile}:${c.name}`;
    setCachedSymbol(symbolKey, c);
    return { ...c, canonical: false };
  });
}

/**
 * Extract components from a parsed AST
 */
function extractComponentsFromAst(ast, filePath, ctx) {
  const components = [];
  
  traverse.default(ast, {
    // Function declarations: function Button() {}
    FunctionDeclaration(path) {
      if (isComponentFunction(path.node)) {
        components.push(createDescriptor(path.node, filePath, true));
      }
    },

    // Arrow/const components: const Button = () => {}
    VariableDeclarator(path) {
      if (isComponentVariable(path.node)) {
        components.push(createDescriptor(path.node, filePath, true));
      }
    },

    // Default exports: export default function Button() {}
    ExportDefaultDeclaration(path) {
      const component = extractFromDefaultExport(path.node, filePath);
      if (component) {
        components.push(component);
      }
    },

    // Recursive barrel resolution
    ExportNamedDeclaration(path) {
      if (path.node.source) {
        const nested = resolveExport(path.node, filePath, ctx);
        components.push(...nested);
      }
    },

    ExportAllDeclaration(path) {
      if (path.node.source) {
        const nested = resolveExport(path.node, filePath, ctx);
        components.push(...nested);
      }
    }
  });

  return components;
}

/**
 * Parse AST from file with caching
 */
function parseAstFromFile(filePath, ctx) {
  // Use the centralized cache system
  const parseFunction = (source) => {
    return parse(source, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'optionalChaining',
        'nullishCoalescingOperator'
      ]
    });
  };

  return parseAndCacheAst(filePath, parseFunction, {
    trace: ctx.traceBarrels,
    verbose: ctx.verbose
  });
}

/**
 * Resolve module path with common extensions and index file support
 */
function resolveModulePath(importPath, currentFilePath, ctx) {
  // Skip non-relative imports (node_modules, etc.)
  if (!importPath.startsWith('.')) {
    return null;
  }

  const currentDir = path.dirname(currentFilePath);
  const resolved = path.resolve(currentDir, importPath);
  
  if (ctx.traceBarrels) {
    console.log(`[dcp:barrel]   Resolving ${importPath} → ${resolved}`);
  }

  // Try common extensions
  const extensions = ['.tsx', '.ts', '.jsx', '.js'];
  for (const ext of extensions) {
    const testPath = resolved + ext;
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }

  // Try index files
  const indexPaths = ['/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
  for (const indexPath of indexPaths) {
    const testPath = resolved + indexPath;
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }

  return null;
}

/**
 * Component detection helpers
 */
function isComponentFunction(node) {
  return !!(node.id?.name && isReactComponentName(node.id.name));
}

function isComponentVariable(node) {
  if (!t.isIdentifier(node.id) || !isReactComponentName(node.id.name)) {
    return false;
  }
  
  return t.isArrowFunctionExpression(node.init) || 
         t.isFunctionExpression(node.init) ||
         isHOCCall(node.init);
}

function isHOCCall(node) {
  if (!node || !t.isCallExpression(node)) return false;
  
  const callee = node.callee;
  const hocNames = ['forwardRef', 'memo', 'observer'];
  
  // React.forwardRef, React.memo
  if (t.isMemberExpression(callee) && 
      t.isIdentifier(callee.object, { name: 'React' }) &&
      t.isIdentifier(callee.property) &&
      hocNames.includes(callee.property.name)) {
    return true;
  }
  
  // forwardRef, memo (direct imports)
  return t.isIdentifier(callee) && hocNames.includes(callee.name);
}

function isReactComponentName(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

function extractFromDefaultExport(node, filePath) {
  const declaration = node.declaration;
  
  // Function declarations
  if (t.isFunctionDeclaration(declaration) && declaration.id?.name) {
    if (isReactComponentName(declaration.id.name)) {
      return createDescriptor(declaration, filePath, true);
    }
  }
  
  // Arrow/function expressions - infer name from filename
  if (t.isArrowFunctionExpression(declaration) || t.isFunctionExpression(declaration)) {
    const inferredName = inferComponentName(filePath);
    if (isReactComponentName(inferredName)) {
      return {
        name: inferredName,
        filePath,
        node: declaration,
        canonical: true
      };
    }
  }
  
  return null;
}

function createDescriptor(node, filePath, canonical) {
  let name = '';
  
  if (t.isFunctionDeclaration(node) && node.id?.name) {
    name = node.id.name;
  } else if (t.isVariableDeclarator(node) && t.isIdentifier(node.id)) {
    name = node.id.name;
  } else {
    name = inferComponentName(filePath);
  }
  
  return {
    name,
    filePath,
    node,
    canonical
  };
}

function inferComponentName(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  return fileName
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Unwrap Higher-Order Components (forwardRef, memo, etc.)
 */
export function unwrapHOC(node) {
  if (!t.isCallExpression(node)) return node;
  
  const callee = node.callee;
  const hocNames = ['forwardRef', 'memo', 'observer'];
  
  // React.forwardRef, React.memo, etc.
  if (t.isMemberExpression(callee) && 
      t.isIdentifier(callee.object, { name: 'React' }) &&
      t.isIdentifier(callee.property) &&
      hocNames.includes(callee.property.name)) {
    return unwrapHOC(node.arguments[0]);
  }
  
  // forwardRef, memo (imported)
  if (t.isIdentifier(callee) && hocNames.includes(callee.name)) {
    return unwrapHOC(node.arguments[0]);
  }
  
  return node;
}