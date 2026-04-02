/**
 * Query Command Implementation
 * Query design system registry with CSS-like selectors
 */

import { jsonError } from '../output.js';

export default async function query(selector, options) {
  try {
    const { runQuery } = await import('../../../src/commands/query.js');
    
    if (!options.json && options.verbose) {
      console.log(`🔍 Querying registry with selector: "${selector}"`);
      console.log(`📁 Registry path: ${options.registry}`);
    }
    
    await runQuery(selector, options);
  } catch (error) {
    if (options.json) {
      console.error(JSON.stringify({
        success: false,
        error: error.message,
        selector
      }, null, 2));
    } else {
      console.error('❌ Query failed:', error.message);
    }
    process.exit(1);
  }
}