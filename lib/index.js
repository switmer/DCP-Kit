/**
 * DCP-Transformer Programmatic API
 * 
 * Provides a JavaScript interface to the DCP-Transformer CLI commands
 * for seamless integration with Node.js applications and AI agents.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';

const execAsync = promisify(exec);

export class DCPTransformer {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.cliPath = options.cliPath || 'dcp';
  }

  /**
   * Extract components from source directory
   * @param {string} source - Source directory path
   * @param {object} options - Extraction options
   * @returns {Promise<object>} Extraction result
   */
  async extract(source, options = {}) {
    const flags = [
      options.out ? `--out ${options.out}` : '',
      options.tokens ? `--tokens ${options.tokens}` : '',
      options.glob ? `--glob "${options.glob}"` : '',
      '--json'
    ].filter(Boolean).join(' ');

    const cmd = `${this.cliPath} extract ${source} ${flags}`;
    
    try {
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Extract failed: ${error.message}`);
    }
  }

  /**
   * Apply JSON Patch mutations to registry
   * @param {string} registry - Registry file path
   * @param {string|object} patch - Patch file path or patch object
   * @param {string} output - Output file path
   * @param {object} options - Mutation options
   * @returns {Promise<object>} Mutation result
   */
  async mutate(registry, patch, output, options = {}) {
    let patchPath = patch;
    
    // If patch is an object, write it to a temporary file
    if (typeof patch === 'object') {
      patchPath = options.tempPatchFile || './temp-patch.json';
      await writeFile(patchPath, JSON.stringify(patch, null, 2));
    }

    const flags = [
      options.undo ? `--undo ${options.undo}` : '',
      options.schema ? `--schema ${options.schema}` : '',
      options.dryRun ? '--dry-run' : '',
      '--json'
    ].filter(Boolean).join(' ');

    const cmd = `${this.cliPath} mutate ${registry} ${patchPath} ${output} ${flags}`;
    
    try {
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Mutation failed: ${error.message}`);
    }
  }

  /**
   * Rollback using undo patch
   * @param {string} registry - Registry file path
   * @param {string} undo - Undo patch file path
   * @param {object} options - Rollback options
   * @returns {Promise<object>} Rollback result
   */
  async rollback(registry, undo, options = {}) {
    const flags = [
      options.backup ? '--backup' : '',
      '--json'
    ].filter(Boolean).join(' ');

    const cmd = `${this.cliPath} rollback ${registry} ${undo} ${flags}`;
    
    try {
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  /**
   * Transpile registry to target framework
   * @param {string} registry - Registry file path
   * @param {object} options - Transpilation options
   * @returns {Promise<object>} Transpilation result
   */
  async transpile(registry, options = {}) {
    const flags = [
      options.target ? `--target ${options.target}` : '',
      options.format ? `--format ${options.format}` : '',
      options.out ? `--out ${options.out}` : '',
      options.includeStories ? '--include-stories' : '',
      '--json'
    ].filter(Boolean).join(' ');

    const cmd = `${this.cliPath} transpile ${registry} ${flags}`;
    
    try {
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Transpilation failed: ${error.message}`);
    }
  }

  /**
   * Export registry to Model Context Protocol format
   * @param {string} registry - Registry file path
   * @param {object} options - Export options
   * @returns {Promise<object>} Export result
   */
  async exportMCP(registry, options = {}) {
    const flags = [
      options.out ? `--out ${options.out}` : '',
      options.optimizeFor ? `--optimize-for ${options.optimizeFor}` : '',
      options.chunkSize ? `--chunk-size ${options.chunkSize}` : '',
      '--json'
    ].filter(Boolean).join(' ');

    const cmd = `${this.cliPath} export-mcp ${registry} ${flags}`;
    
    try {
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`MCP export failed: ${error.message}`);
    }
  }

  /**
   * Natural language agent planning
   * @param {string} prompt - Natural language prompt
   * @param {object} options - Agent options
   * @returns {Promise<object>} Agent plan result
   */
  async agent(prompt, options = {}) {
    const flags = [
      options.registry ? `--registry ${options.registry}` : '',
      options.planOnly ? '--plan-only' : '',
      options.dryRun ? '--dry-run' : '',
      options.out ? `--out ${options.out}` : '',
      '--json'
    ].filter(Boolean).join(' ');

    const cmd = `${this.cliPath} agent "${prompt}" ${flags}`;
    
    try {
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Agent planning failed: ${error.message}`);
    }
  }

  /**
   * Complete workflow: extract → mutate → transpile
   * @param {string} source - Source directory
   * @param {object|string} mutations - Mutation patches or file path
   * @param {object} options - Workflow options
   * @returns {Promise<object>} Complete workflow result
   */
  async workflow(source, mutations, options = {}) {
    const results = {};

    // Step 1: Extract
    results.extract = await this.extract(source, {
      out: options.extractOut || './temp-registry',
      tokens: options.tokens
    });

    // Step 2: Mutate (if mutations provided)
    if (mutations) {
      results.mutate = await this.mutate(
        results.extract.registryPath,
        mutations,
        options.mutateOut || './temp-mutated.json',
        {
          undo: options.generateUndo || './temp-undo.json',
          dryRun: options.dryRun
        }
      );
    }

    // Step 3: Transpile
    const registryPath = results.mutate ? results.mutate.output : results.extract.registryPath;
    results.transpile = await this.transpile(registryPath, {
      target: options.target || 'react',
      out: options.transpileOut || './temp-components'
    });

    return results;
  }
}

// Convenience functions for direct use
export async function extract(source, options) {
  const dcp = new DCPTransformer();
  return dcp.extract(source, options);
}

export async function mutate(registry, patch, output, options) {
  const dcp = new DCPTransformer();
  return dcp.mutate(registry, patch, output, options);
}

export async function rollback(registry, undo, options) {
  const dcp = new DCPTransformer();
  return dcp.rollback(registry, undo, options);
}

export async function transpile(registry, options) {
  const dcp = new DCPTransformer();
  return dcp.transpile(registry, options);
}

export async function exportMCP(registry, options) {
  const dcp = new DCPTransformer();
  return dcp.exportMCP(registry, options);
}

export async function agent(prompt, options) {
  const dcp = new DCPTransformer();
  return dcp.agent(prompt, options);
}

export default DCPTransformer;