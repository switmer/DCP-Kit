#!/usr/bin/env node

/**
 * DCP Companion Process
 * 
 * Runs a local HTTP server that enables Figma plugin (and other tools) 
 * to interact with the local file system for folder picking and registry management.
 * 
 * Usage:
 *   dcp companion [--port 7415]
 * 
 * Endpoints:
 *   GET  /health           - Health check
 *   GET  /registries       - List active registries  
 *   POST /discover         - Analyze folder for DCP compatibility
 *   POST /start            - Start registry API for folder
 *   POST /stop             - Stop registry API
 */

import express from 'express';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = 7415;

class CompanionServer {
  constructor(port = DEFAULT_PORT) {
    this.port = port;
    this.app = express();
    this.registries = new Map(); // path -> { proc, port, url, name, pid }
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', version: '1.0.0', port: this.port });
    });

    // List active registries
    this.app.get('/registries', (req, res) => {
      const active = Array.from(this.registries.entries()).map(([folder, data]) => ({
        folder,
        name: data.name || path.basename(folder),
        url: data.url,
        port: data.port,
        status: data.proc && !data.proc.killed ? 'running' : 'stopped',
        pid: data.pid,
        lastUsed: data.lastUsed || new Date().toISOString()
      }));
      
      res.json({
        count: active.length,
        registries: active.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      });
    });

    // Discover folder capabilities
    this.app.post('/discover', async (req, res) => {
      try {
        const { folder } = req.body;
        
        if (!folder) {
          return res.status(400).json({ error: 'folder path required' });
        }

        const analysis = await this.analyzeFolder(folder);
        res.json(analysis);
      } catch (error) {
        console.error('Discovery error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Start registry API for folder
    this.app.post('/start', async (req, res) => {
      try {
        const { folder, port } = req.body;
        
        if (!folder) {
          return res.status(400).json({ error: 'folder path required' });
        }

        const result = await this.startRegistry(folder, port);
        res.json(result);
      } catch (error) {
        console.error('Start error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Stop registry API
    this.app.post('/stop', async (req, res) => {
      try {
        const { folder } = req.body;
        
        if (!folder) {
          return res.status(400).json({ error: 'folder path required' });
        }

        const result = await this.stopRegistry(folder);
        res.json(result);
      } catch (error) {
        console.error('Stop error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'endpoint not found' });
    });
  }

  async analyzeFolder(folder) {
    const registryPath = path.join(folder, 'registry', 'registry.json');
    const tokensPath = path.join(folder, 'tokens.json');
    const designTokensPath = path.join(folder, 'design-tokens.json');
    const packageJsonPath = path.join(folder, 'package.json');

    const [
      hasRegistry,
      hasTokens,
      hasDesignTokens,
      hasPackageJson,
      componentFiles,
      tokenFiles
    ] = await Promise.all([
      this.fileExists(registryPath),
      this.fileExists(tokensPath),
      this.fileExists(designTokensPath),
      this.fileExists(packageJsonPath),
      glob('**/*.{tsx,jsx,ts,js}', { cwd: folder, ignore: 'node_modules/**' }).catch(() => []),
      glob('**/*.{css,scss,less}', { cwd: folder, ignore: 'node_modules/**' }).catch(() => [])
    ]);

    let projectName = path.basename(folder);
    if (hasPackageJson) {
      try {
        const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        projectName = pkg.name || projectName;
      } catch {}
    }

    const analysis = {
      folder,
      name: projectName,
      hasRegistry,
      hasTokens: hasTokens || hasDesignTokens,
      hasComponents: componentFiles.length > 0,
      hasStyles: tokenFiles.length > 0,
      componentCount: componentFiles.length,
      styleFileCount: tokenFiles.length,
      canExtract: componentFiles.length > 0 || tokenFiles.length > 0,
      suggestedCommand: null
    };

    // Suggest extraction command if no registry exists but has extractable content
    if (!hasRegistry && analysis.canExtract) {
      const tokenArg = hasTokens ? '--tokens tokens.json' : 
                      hasDesignTokens ? '--tokens design-tokens.json' :
                      tokenFiles.length > 0 ? `--tokens ${tokenFiles[0]}` : '';
      
      analysis.suggestedCommand = `dcp extract ${folder} ${tokenArg} --out ${path.join(folder, 'registry')}`;
    }

    return analysis;
  }

  async startRegistry(folder, requestedPort) {
    // Check if already running
    const existing = this.registries.get(folder);
    if (existing && existing.proc && !existing.proc.killed) {
      existing.lastUsed = new Date().toISOString();
      return {
        folder,
        url: existing.url,
        port: existing.port,
        status: 'already_running',
        message: 'Registry API is already running for this folder'
      };
    }

    // Find available port
    const port = requestedPort || this.findFreePort();
    const registryDir = path.join(folder, 'registry');
    const registryFile = path.join(registryDir, 'registry.json');

    // Extract if registry doesn't exist
    if (!await this.fileExists(registryFile)) {
      console.log(`📁 Extracting registry for ${folder}...`);
      await this.runCommand('dcp', ['extract', folder, '--out', registryDir]);
      console.log(`✅ Registry extracted to ${registryDir}`);
    }

    // Start DCP API server
    console.log(`🚀 Starting DCP API on port ${port}...`);
    const proc = spawn('dcp', ['api', '--registry', registryDir, '--port', port.toString()], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    const url = `http://localhost:${port}/api/v1`;
    const name = path.basename(folder);

    // Store registry info
    this.registries.set(folder, {
      proc,
      port,
      url,
      name,
      pid: proc.pid,
      lastUsed: new Date().toISOString()
    });

    // Handle process events
    proc.stdout.on('data', (data) => {
      console.log(`[${name}:${port}] ${data.toString().trim()}`);
    });

    proc.stderr.on('data', (data) => {
      console.error(`[${name}:${port}] ${data.toString().trim()}`);
    });

    proc.on('close', (code) => {
      console.log(`[${name}:${port}] Process exited with code ${code}`);
      this.registries.delete(folder);
    });

    // Wait a moment for server to start
    await this.sleep(1000);

    return {
      folder,
      name,
      url,
      port,
      pid: proc.pid,
      status: 'started',
      message: `Registry API started for ${name} on port ${port}`
    };
  }

  async stopRegistry(folder) {
    const registry = this.registries.get(folder);
    
    if (!registry || !registry.proc || registry.proc.killed) {
      return {
        folder,
        status: 'not_running',
        message: 'Registry API is not running for this folder'
      };
    }

    const { name, port, proc } = registry;
    
    proc.kill('SIGTERM');
    this.registries.delete(folder);

    return {
      folder,
      name,
      port,
      status: 'stopped',
      message: `Registry API stopped for ${name}`
    };
  }

  findFreePort(start = 7401) {
    const usedPorts = Array.from(this.registries.values()).map(r => r.port);
    let port = start;
    while (usedPorts.includes(port)) {
      port++;
    }
    return port;
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async runCommand(cmd, args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, { stdio: 'inherit' });
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  start() {
    return new Promise((resolve, reject) => {
      this.app.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`🔗 DCP Companion listening on http://localhost:${this.port}`);
          console.log(`📱 Figma Plugin: Connect to http://localhost:${this.port}`);
          console.log(`🛠️  VS Code: Auto-discovery enabled`);
          console.log(`\n💡 Usage:`);
          console.log(`   POST /start {"folder": "/path/to/project"} - Start registry API`);
          console.log(`   GET  /registries - List running registries`);
          console.log(`   POST /stop {"folder": "/path/to/project"} - Stop registry API`);
          resolve();
        }
      });
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down companion server...');
      
      // Stop all registry processes
      for (const [folder, registry] of this.registries) {
        if (registry.proc && !registry.proc.killed) {
          console.log(`   Stopping ${registry.name}...`);
          registry.proc.kill('SIGTERM');
        }
      }
      
      process.exit(0);
    });
  }
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.argv.includes('--port') 
    ? parseInt(process.argv[process.argv.indexOf('--port') + 1]) 
    : DEFAULT_PORT;

  const server = new CompanionServer(port);
  
  server.start().catch(err => {
    console.error('Failed to start companion server:', err);
    process.exit(1);
  });
}

export default CompanionServer;