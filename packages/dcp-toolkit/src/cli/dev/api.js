/**
 * API Command Handler
 * Start development API server for registry access
 */

import chalk from 'chalk';

export default async function api(registry = './registry/registry.json', options = {}) {
  try {
    // Try to use the existing API server
    const { runApiServer } = await import('../../api-server.js');
    
    if (options.json) {
      // Don't start server in JSON mode, just return config
      console.log(JSON.stringify({
        success: true,
        registry,
        port: options.port || 7401,
        host: options.host || 'localhost',
        cors: options.cors || false,
        hotReload: options.hotReload || false
      }, null, 2));
      return;
    }
    
    console.log(chalk.blue(`🚀 Starting API server...`));
    console.log(chalk.gray(`   Registry: ${registry}`));
    console.log(chalk.gray(`   Port: ${options.port || 7401}`));
    console.log(chalk.gray(`   Host: ${options.host || 'localhost'}`));
    
    // Start the API server
    const result = await runApiServer({
      registryPath: registry,
      port: parseInt(options.port || 7401),
      host: options.host || 'localhost',
      verbose: options.verbose || false
    });
    
    console.log(chalk.green(`\n✅ API server running`));
    console.log(chalk.gray(`   ${result.url}`));
    console.log(chalk.gray(`   Docs: ${result.docsUrl}`));
    console.log(chalk.gray(`\nPress Ctrl+C to stop`));
    
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
    } else {
      console.error(chalk.red('❌ API server failed:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

