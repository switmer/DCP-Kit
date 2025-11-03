/**
 * Query Command Implementation
 * Query design system registry with CSS-like selectors
 */

export default async function query(selector, options) {
  try {
    const { runQuery } = await import('../../../src/commands/query.js');
    
    if (!options.json && options.verbose) {
      console.log(`🔍 Querying registry with selector: "${selector}"`);
      console.log(`📁 Registry path: ${options.registry}`);
    }
    
    const result = await runQuery(selector, options);
    
    // The runQuery function handles output formatting internally
    // but we can add success tracking for JSON mode
    if (options.json && result) {
      console.log(JSON.stringify({
        success: true,
        selector,
        results: result.results || result,
        count: result.count || (Array.isArray(result.results) ? result.results.length : 0)
      }, null, 2));
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ 
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