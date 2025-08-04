/**
 * DEPRECATED: extract v1 
 * This command forwards to extract-v3 with deprecation warning
 * Use `dcp extract` directly for the latest features
 */

import { runExtractV1 } from './extract-legacy.js';

// Export the deprecated wrapper
export { runExtractV1 as runExtract };

// If called directly as a script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.error('⚠️  Direct execution of extract v1 is deprecated. Use: dcp extract');
  process.exit(1);
}