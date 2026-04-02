/**
 * MCP Export Command Implementation
 * Export registry as MCP (Model Context Protocol) server
 */

import chalk from 'chalk';
import path from 'path';
import { jsonError } from '../output.js';

export default async function mcp(registry = './registry/registry.json', options = {}) {
  try {
    const { runExportMCP } = await import('../../commands/export-mcp.js');
    
    // Resolve registry path
    const registryPath = path.resolve(registry);
    
    if (!options.json) {
      console.log(chalk.blue(`📤 Exporting ${registryPath} to MCP format...`));
    }
    
    const result = await runExportMCP(registryPath, {
      out: options.output || './mcp_export.json',
      chunkSize: options.chunkSize || 4000,
      includeExamples: options.includeExamples || false,
      optimizeFor: options.optimizeFor || 'claude',
      verbose: options.verbose || false
    });
    
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        outputPath: result.outputPath,
        summary: result.summary
      }, null, 2));
    } else {
      console.log(chalk.green(`✅ MCP export completed`));
      console.log(chalk.gray(`   Output: ${result.outputPath}`));
      console.log(chalk.gray(`   Chunks: ${result.summary.chunksGenerated}`));
      console.log(chalk.gray(`   Components: ${result.summary.componentsExported}`));
      console.log(chalk.gray(`   Tokens: ${result.summary.tokensExported}`));
    }
  } catch (error) {
    if (options.json) {
      jsonError(error);
    } else {
      console.error(chalk.red('❌ MCP export failed:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}