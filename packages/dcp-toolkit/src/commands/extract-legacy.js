/**
 * DEPRECATED: Legacy extract commands (v1 & v2)
 * Use `dcp extract` (v3) instead for the latest features
 */

import chalk from 'chalk';
import { runExtract } from './extract-v3.js';

/**
 * Deprecated wrapper for extract v1
 */
export async function runExtractV1(source, options = {}) {
  console.warn(chalk.yellow('⚠️  DEPRECATED: extract v1 is deprecated. Use `dcp extract` (v3) for better performance and features.'));
  console.warn(chalk.gray('   Migration: dcp extract ./src --auto-detect-tokens --verbose'));
  
  // Forward to v3 with compatible options
  return runExtract(source, {
    ...options,
    autoDetectTokens: true // Enable modern token detection
  });
}

/**
 * Deprecated wrapper for extract v2  
 */
export async function runExtractV2(source, options = {}) {
  console.warn(chalk.yellow('⚠️  DEPRECATED: extract v2 is deprecated. Use `dcp extract` (v3) for universal token detection and override support.'));
  console.warn(chalk.gray('   Migration: dcp extract ./src --auto-detect-tokens --verbose'));
  
  // Forward to v3 with compatible options
  return runExtract(source, {
    ...options,
    autoDetectTokens: true, // Enable modern token detection
    verbose: true // Enable logging for better debugging
  });
}

// Keep the original exports but with deprecation warnings
export { runExtractV1 as runExtract };
export { runExtractV2 as runExtractV2 };