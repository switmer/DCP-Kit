import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import chalk from 'chalk';
import WebSocket, { WebSocketServer } from 'ws';
import { runExtract } from './extract-v2.js';

/**
 * DCP Watch - Live registry updates
 * 
 * Features:
 * - File system watching with chokidar
 * - Debounced extraction to prevent spam
 * - WebSocket streaming for live updates
 * - Delta detection for efficient updates
 * - In-memory caching for performance
 */

export async function runWatch(source, options = {}) {
  const {
    out: outputDir = './registry',
    tokens: tokensPath,
    debounce = 300,
    ws: wsPort,
    quiet = false,
    glob: globPattern = '**/*.{tsx,jsx,ts,js}'
  } = options;

  const watcher = new DCPWatcher({
    sourceDir: source,
    outputDir,
    tokensPath,
    globPattern,
    debounceMs: debounce,
    wsPort,
    quiet
  });

  await watcher.start();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    if (!quiet) {
      console.log(chalk.yellow('\n⏹️  Stopping watch mode...'));
    }
    await watcher.stop();
    process.exit(0);
  });
  
  return watcher;
}

class DCPWatcher {
  constructor(options) {
    this.sourceDir = options.sourceDir;
    this.outputDir = options.outputDir;
    this.tokensPath = options.tokensPath;
    this.globPattern = options.globPattern;
    this.debounceMs = options.debounceMs;
    this.wsPort = options.wsPort;
    this.quiet = options.quiet;
    
    this.watcher = null;
    this.wsServer = null;
    this.clients = new Set();
    this.debounceTimer = null;
    this.lastRegistry = null;
    this.isExtracting = false;
    this.stats = {
      totalExtractions: 0,
      lastExtractTime: 0,
      componentsCount: 0,
      tokensCount: 0
    };
  }
  
  async start() {
    if (!this.quiet) {
      console.log(chalk.blue(`👁️  Watching ${this.sourceDir} for changes...`));
      if (this.wsPort) {
        console.log(chalk.gray(`🔌 WebSocket server starting on port ${this.wsPort}`));
      }
    }
    
    // Initial extraction
    await this.extractWithStats('initial');
    
    // Setup WebSocket server if requested
    if (this.wsPort) {
      this.setupWebSocket();
    }
    
    // Setup file watcher
    this.watcher = chokidar.watch(this.sourceDir, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*'
      ],
      ignoreInitial: true,
      persistent: true
    });
    
    // Watch for changes
    this.watcher.on('change', (filePath) => this.handleFileChange(filePath, 'change'));
    this.watcher.on('add', (filePath) => this.handleFileChange(filePath, 'add'));
    this.watcher.on('unlink', (filePath) => this.handleFileChange(filePath, 'remove'));
    
    this.watcher.on('error', (error) => {
      console.error(chalk.red('❌ Watcher error:'), error);
    });
    
    if (!this.quiet) {
      console.log(chalk.green('✅ Watch mode active - save a file to see live updates'));
    }
  }
  
  async stop() {
    if (this.watcher) {
      await this.watcher.close();
    }
    
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
  
  setupWebSocket() {
    this.wsServer = new WebSocketServer({ port: this.wsPort });
    
    this.wsServer.on('connection', (ws) => {
      this.clients.add(ws);
      
      // Send current state to new client
      ws.send(JSON.stringify({
        type: 'connected',
        stats: this.stats,
        timestamp: new Date().toISOString()
      }));
      
      ws.on('close', () => {
        this.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error(chalk.red('WebSocket error:'), error);
        this.clients.delete(ws);
      });
    });
    
    if (!this.quiet) {
      console.log(chalk.gray(`🔌 WebSocket server listening on ws://localhost:${this.wsPort}`));
    }
  }
  
  broadcast(event) {
    if (this.clients.size === 0) return;
    
    const message = JSON.stringify({
      ...event,
      timestamp: new Date().toISOString()
    });
    
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
  
  handleFileChange(filePath, changeType) {
    // Only process files matching our glob pattern
    if (!this.matchesPattern(filePath)) {
      return;
    }
    
    if (!this.quiet) {
      const relativePath = path.relative(this.sourceDir, filePath);
      console.log(chalk.gray(`📝 ${changeType}: ${relativePath}`));
    }
    
    // Debounce multiple rapid changes
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.extractWithStats('file-change', { filePath, changeType });
    }, this.debounceMs);
  }
  
  matchesPattern(filePath) {
    // Simple pattern matching for common extensions
    const ext = path.extname(filePath);
    return ['.tsx', '.jsx', '.ts', '.js'].includes(ext) && 
           !filePath.includes('node_modules') &&
           !filePath.includes('.test.') &&
           !filePath.includes('.spec.');
  }
  
  async extractWithStats(trigger, metadata = {}) {
    if (this.isExtracting) {
      if (!this.quiet) {
        console.log(chalk.yellow('⏳ Extraction in progress, skipping...'));
      }
      return;
    }
    
    this.isExtracting = true;
    const startTime = Date.now();
    
    try {
      if (!this.quiet) {
        console.log(chalk.blue('🔄 Extracting components...'));
      }
      
      // Run extraction
      const result = await runExtract(this.sourceDir, {
        out: this.outputDir,
        tokens: this.tokensPath,
        glob: this.globPattern,
        json: true // Always use JSON mode for consistency
      });
      
      const extractTime = Date.now() - startTime;
      const currentRegistry = result.registry;
      
      // Update stats
      this.stats.totalExtractions++;
      this.stats.lastExtractTime = extractTime;
      this.stats.componentsCount = currentRegistry.components.length;
      this.stats.tokensCount = Object.keys(currentRegistry.tokens || {}).length;
      
      // Detect changes
      const changes = this.detectChanges(this.lastRegistry, currentRegistry);
      this.lastRegistry = currentRegistry;
      
      // Console output
      if (!this.quiet) {
        console.log(chalk.green(`✅ Registry updated in ${extractTime}ms`));
        console.log(chalk.gray(`   Components: ${this.stats.componentsCount}, Tokens: ${this.stats.tokensCount}`));
        
        if (changes.hasChanges) {
          console.log(chalk.cyan(`   Changes: +${changes.added} -${changes.removed} ~${changes.modified}`));
        }
      }
      
      // Broadcast to WebSocket clients
      this.broadcast({
        type: 'registryUpdated',
        trigger,
        stats: this.stats,
        changes,
        metadata
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Extraction failed:'), error.message);
      
      this.broadcast({
        type: 'extractionError',
        trigger,
        error: error.message,
        metadata
      });
    } finally {
      this.isExtracting = false;
    }
  }
  
  detectChanges(oldRegistry, newRegistry) {
    if (!oldRegistry) {
      return {
        hasChanges: true,
        added: newRegistry.components.length,
        removed: 0,
        modified: 0
      };
    }
    
    const oldComponents = new Map(oldRegistry.components.map(c => [c.name, c]));
    const newComponents = new Map(newRegistry.components.map(c => [c.name, c]));
    
    let added = 0;
    let removed = 0;
    let modified = 0;
    
    // Count added components
    for (const name of newComponents.keys()) {
      if (!oldComponents.has(name)) {
        added++;
      }
    }
    
    // Count removed components
    for (const name of oldComponents.keys()) {
      if (!newComponents.has(name)) {
        removed++;
      }
    }
    
    // Count modified components (simple prop count comparison)
    for (const [name, newComp] of newComponents.entries()) {
      const oldComp = oldComponents.get(name);
      if (oldComp && oldComp.props?.length !== newComp.props?.length) {
        modified++;
      }
    }
    
    return {
      hasChanges: added > 0 || removed > 0 || modified > 0,
      added,
      removed,
      modified
    };
  }
}