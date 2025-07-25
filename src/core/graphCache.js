// core/graphCache.js
/**
 * Centralized caching system for DCP component graph operations
 * 
 * Shared across all adaptors to provide:
 * - AST parsing memoization with LRU eviction
 * - Component symbol table with file metadata
 * - File system metadata caching
 * - Performance optimization for barrel recursion
 * 
 * Benefits:
 * - Prevents re-parsing same files during barrel recursion
 * - Enables incremental/watch mode extraction
 * - Provides unified cache invalidation
 * - Scales across monorepos and multi-adaptor workflows
 */

import QuickLRU from 'quick-lru';
import fs from 'fs';
import path from 'path';

// LRU cache for parsed ASTs - automatically evicts oldest when full
export const astCache = new QuickLRU({ maxSize: 500 });

// Symbol table for resolved barrel exports - no size limit needed
export const symbolTable = new Map();

// File metadata cache for invalidation
export const fileMetaCache = new QuickLRU({ maxSize: 1000 });

/**
 * @typedef {Object} FileMetadata
 * @property {string} filePath
 * @property {number} size
 * @property {Date} mtime
 * @property {boolean} isDirectory
 * @property {string[]} extensions
 */

/**
 * Clear all caches - useful for tests and fresh extraction runs
 */
export function clearCache() {
  astCache.clear();
  symbolTable.clear();
  fileMetaCache.clear();
}

/**
 * Get cache statistics for monitoring/debugging
 */
export function getCacheStats() {
  const memoryUsage = process.memoryUsage();
  
  return {
    astCacheSize: astCache.size,
    symbolTableSize: symbolTable.size,
    fileMetaCacheSize: fileMetaCache.size,
    memoryUsage: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    astCacheMaxSize: astCache.maxSize,
    hitRate: getHitRate()
  };
}

/**
 * Cache hit rate tracking
 */
let cacheHits = 0;
let cacheMisses = 0;

function getHitRate() {
  const total = cacheHits + cacheMisses;
  return total > 0 ? Math.round((cacheHits / total) * 100) : 0;
}

/**
 * Cache invalidation based on file modification time
 */
export function invalidateFile(filePath) {
  astCache.delete(filePath);
  
  // Remove all symbol table entries for this file
  for (const [key] of symbolTable.entries()) {
    if (key.startsWith(`${filePath}:`)) {
      symbolTable.delete(key);
    }
  }
  
  fileMetaCache.delete(filePath);
}

/**
 * Batch invalidation for multiple files (useful for watch mode)
 */
export function invalidateFiles(filePaths) {
  filePaths.forEach(invalidateFile);
}

/**
 * Check if a file needs to be re-parsed based on modification time
 */
export function isFileCacheValid(filePath) {
  const cached = fileMetaCache.get(filePath);
  if (!cached) return false;
  
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.getTime() === cached.mtime.getTime();
  } catch {
    return false;
  }
}

/**
 * Store file metadata for cache validation
 */
export function cacheFileMeta(filePath) {
  try {
    const stats = fs.statSync(filePath);
    
    const meta = {
      filePath,
      size: stats.size,
      mtime: stats.mtime,
      isDirectory: stats.isDirectory(),
      extensions: stats.isDirectory() ? [] : [path.extname(filePath)]
    };
    
    fileMetaCache.set(filePath, meta);
    return meta;
  } catch {
    return null;
  }
}

/**
 * Cache-aware AST retrieval with automatic invalidation
 */
export function getCachedAst(filePath) {
  // Check if cached version is still valid
  if (!isFileCacheValid(filePath)) {
    invalidateFile(filePath);
    cacheMisses++;
    return null;
  }
  
  const ast = astCache.get(filePath);
  if (ast) {
    cacheHits++;
    return ast;
  }
  
  cacheMisses++;
  return null;
}

/**
 * Store AST in cache with metadata
 */
export function setCachedAst(filePath, ast) {
  astCache.set(filePath, ast);
  cacheFileMeta(filePath);
}

/**
 * Symbol table helpers for barrel resolution
 */
export function getCachedSymbol(symbolKey) {
  return symbolTable.get(symbolKey) || null;
}

export function setCachedSymbol(symbolKey, descriptor) {
  symbolTable.set(symbolKey, descriptor);
}

/**
 * Debug/monitoring helpers
 */
export function logCacheStats(prefix = '[cache]') {
  const stats = getCacheStats();
  console.log(`${prefix} ASTs: ${stats.astCacheSize}/${stats.astCacheMaxSize}, Symbols: ${stats.symbolTableSize}, Hit Rate: ${stats.hitRate}%, Memory: ${stats.memoryUsage}`);
}

/**
 * Parse and cache AST from file path with error handling
 */
export function parseAndCacheAst(filePath, parseFunction, options = {}) {
  // Check cache first
  const cached = getCachedAst(filePath);
  if (cached) {
    if (options.trace) {
      console.log(`[cache] Using cached AST for ${path.basename(filePath)}`);
    }
    return cached;
  }

  try {
    const source = fs.readFileSync(filePath, 'utf-8');
    const ast = parseFunction(source);
    
    // Cache the result
    setCachedAst(filePath, ast);
    
    if (options.trace) {
      console.log(`[cache] Parsed and cached AST for ${path.basename(filePath)}`);
    }
    
    return ast;
  } catch (error) {
    if (options.verbose) {
      console.warn(`[cache] Failed to parse ${filePath}: ${error.message}`);
    }
    return null;
  }
}

/**
 * Cache warming for common file patterns
 */
export function warmCache(filePaths, parseFunction) {
  let warmed = 0;
  for (const filePath of filePaths) {
    try {
      parseAndCacheAst(filePath, parseFunction, { trace: false });
      warmed++;
    } catch {
      // Skip files that can't be parsed
    }
  }
  return warmed;
}

// Export for backward compatibility
export default {
  astCache,
  symbolTable,
  fileMetaCache,
  clearCache,
  getCacheStats,
  invalidateFile,
  invalidateFiles,
  isFileCacheValid,
  cacheFileMeta,
  getCachedAst,
  setCachedAst,
  getCachedSymbol,
  setCachedSymbol,
  logCacheStats,
  parseAndCacheAst,
  warmCache
};