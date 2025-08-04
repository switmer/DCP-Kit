/**
 * DEPRECATED: extract v2
 * This command forwards to extract-v3 with deprecation warning  
 * Use `dcp extract` directly for universal token detection and modern features
 */

import { runExtractV2 } from './extract-legacy.js';

// Export the deprecated wrapper
export { runExtractV2 as runExtract };

// If called directly as a script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.error('⚠️  Direct execution of extract v2 is deprecated. Use: dcp extract');
  process.exit(1);
}