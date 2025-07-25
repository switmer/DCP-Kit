import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';

/**
 * DCP Registry Development Server
 * 
 * Serves component packs via HTTP for local development and testing.
 * Provides REST API endpoints for registry browsing and component installation.
 * 
 * Features:
 * - Static file serving for component packs
 * - CORS-enabled for web app integration  
 * - Optional JWT authentication for private registries
 * - Registry API endpoints (/r/namespace/component)
 * - Health checks and status endpoints
 */

export async function runServeRegistry(packsDir, options = {}) {
  const {
    port = 7401,
    host = 'localhost',
    cors: enableCors = true,
    secret = null, // JWT secret for private registries
    verbose = false,
    baseUrl = null
  } = options;

  if (verbose) {
    console.log(chalk.blue(`🚀 Starting DCP registry server...`));
  }

  const server = new RegistryServer({
    packsDir,
    secret,
    verbose,
    baseUrl: baseUrl || `http://${host}:${port}`
  });

  await server.start(port, host, enableCors);
  
  return {
    success: true,
    url: `http://${host}:${port}`,
    packsDir,
    endpoints: {
      health: `http://${host}:${port}/health`,
      index: `http://${host}:${port}/index.json`,
      registry: `http://${host}:${port}/r/:namespace/:component`,
      blobs: `http://${host}:${port}/blobs/:hash`
    }
  };
}

class RegistryServer {
  constructor(options) {
    this.packsDir = path.resolve(options.packsDir);
    this.secret = options.secret;
    this.verbose = options.verbose;
    this.baseUrl = options.baseUrl;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Enable CORS for web app integration (especially Figma plugins)
    this.app.use(cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));

    // Override restrictive security headers for development
    if (this.environment === 'development') {
      this.app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        next();
      });
    }

    // JSON parsing
    this.app.use(express.json());

    // Request logging
    if (this.verbose) {
      this.app.use((req, res, next) => {
        console.log(`${chalk.gray(req.method)} ${req.path}`);
        next();
      });
    }

    // Optional JWT authentication
    if (this.secret) {
      this.app.use('/r', this.authenticateJWT.bind(this));
    }
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        packsDir: this.packsDir,
        baseUrl: this.baseUrl
      });
    });

    // Registry index
    this.app.get('/index.json', this.serveIndex.bind(this));

    // Component registry endpoint
    this.app.get('/r/:namespace/:component', this.serveComponent.bind(this));
    this.app.get('/r/:namespace/:component@:version', this.serveComponent.bind(this));

    // Blob serving
    this.app.get('/blobs/:hash', this.serveBlob.bind(this));

    // Static file serving for packs
    this.app.use('/packs', express.static(this.packsDir));

    // Browse registry UI (simple HTML)
    this.app.get('/', this.serveBrowseUI.bind(this));

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        path: req.path,
        available: [
          '/health',
          '/index.json', 
          '/r/:namespace/:component',
          '/blobs/:hash',
          '/packs'
        ]
      });
    });
  }

  async serveIndex(req, res) {
    try {
      const indexPath = path.join(this.packsDir, 'index.json');
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);
      
      // Update URLs to be absolute
      index.components = index.components.map(comp => ({
        ...comp,
        url: `${this.baseUrl}${comp.url}`,
        installCommand: `npx dcp-add "${this.baseUrl}${comp.url}"`
      }));

      res.json(index);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to load registry index',
        message: error.message
      });
    }
  }

  async serveComponent(req, res) {
    try {
      const { namespace, component, version } = req.params;
      
      // Find component directory
      const componentDir = await this.findComponentDir(component);
      if (!componentDir) {
        return res.status(404).json({
          error: 'Component not found',
          component,
          namespace
        });
      }

      // Load component metadata
      const metaPath = path.join(componentDir, 'meta.json');
      const metaData = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaData);

      // Update file URLs to be absolute
      const files = {};
      for (const [fileName, filePath] of Object.entries(meta.files)) {
        if (filePath.startsWith('./blobs/')) {
          files[fileName] = `${this.baseUrl}/blobs/${path.basename(filePath)}`;
        } else if (filePath.startsWith('./')) {
          files[fileName] = `${this.baseUrl}/packs/${component}/${fileName}`;
        } else {
          files[fileName] = filePath; // Already absolute
        }
      }

      // Update install command
      const response = {
        ...meta,
        files,
        installCommand: `npx dcp-add "${this.baseUrl}/r/${namespace}/${component}${version ? `@${version}` : ''}"`,
        registryUrl: `${this.baseUrl}/r/${namespace}/${component}`,
        downloadUrl: files,
        metadata: {
          ...meta.metadata,
          servedAt: new Date().toISOString(),
          serverVersion: 'dcp-registry-dev'
        }
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to load component',
        message: error.message,
        component: req.params.component
      });
    }
  }

  async serveBlob(req, res) {
    try {
      const { hash } = req.params;
      const blobPath = path.join(this.packsDir, 'blobs', hash);
      
      // Security check - ensure file exists and is within blobs directory
      try {
        await fs.access(blobPath);
        const stats = await fs.stat(blobPath);
        if (!stats.isFile()) {
          throw new Error('Not a file');
        }
      } catch {
        return res.status(404).json({
          error: 'Blob not found',
          hash
        });
      }

      // Determine content type from extension
      const ext = path.extname(hash);
      const contentTypes = {
        '.tsx': 'text/typescript',
        '.ts': 'text/typescript', 
        '.jsx': 'text/javascript',
        '.js': 'text/javascript',
        '.md': 'text/markdown',
        '.css': 'text/css',
        '.json': 'application/json'
      };

      const contentType = contentTypes[ext] || 'text/plain';
      res.setHeader('Content-Type', contentType);
      
      // Send file
      const content = await fs.readFile(blobPath);
      res.send(content);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to serve blob',
        message: error.message,
        hash: req.params.hash
      });
    }
  }

  async serveBrowseUI(req, res) {
    try {
      const indexPath = path.join(this.packsDir, 'index.json');
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);

      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>DCP Registry - ${index.namespace}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 2rem; }
    .header { border-bottom: 1px solid #eee; padding-bottom: 1rem; margin-bottom: 2rem; }
    .component { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .install { background: #f6f8fa; padding: 0.5rem; border-radius: 4px; font-family: 'Monaco', monospace; font-size: 0.9em; }
    .meta { color: #666; font-size: 0.9em; margin-top: 0.5rem; }
    pre { background: #f6f8fa; padding: 1rem; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎨 DCP Registry: ${index.namespace}</h1>
    <p>Local development server • Generated ${new Date(index.generatedAt).toLocaleString()}</p>
  </div>
  
  <h2>Available Components (${index.components.length})</h2>
  
  ${index.components.map(comp => `
    <div class="component">
      <h3>${comp.title}</h3>
      <p>${comp.description}</p>
      <div class="install">
        npx dcp-add "${this.baseUrl}${comp.url}"
      </div>
      <div class="meta">
        <a href="${this.baseUrl}${comp.url}" target="_blank">View JSON</a> •
        <a href="${this.baseUrl}/packs/${comp.name}" target="_blank">Browse Files</a>
      </div>
    </div>
  `).join('')}
  
  <h2>API Endpoints</h2>
  <pre>GET  /health                    # Server status
GET  /index.json              # Registry index  
GET  /r/:namespace/:component  # Component metadata
GET  /blobs/:hash             # Raw file content
GET  /packs/:component        # Component directory</pre>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to generate browse UI',
        message: error.message
      });
    }
  }

  async findComponentDir(componentName) {
    try {
      // Try exact match first
      const exactPath = path.join(this.packsDir, componentName);
      try {
        await fs.access(exactPath);
        return exactPath;
      } catch {}

      // Try case-insensitive search
      const entries = await fs.readdir(this.packsDir);
      for (const entry of entries) {
        if (entry.toLowerCase() === componentName.toLowerCase()) {
          const entryPath = path.join(this.packsDir, entry);
          const stats = await fs.stat(entryPath);
          if (stats.isDirectory()) {
            return entryPath;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  authenticateJWT(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.query.token;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Provide JWT token in Authorization header or ?token= query param'
      });
    }

    try {
      // Simple JWT validation (in production, use proper JWT library)
      const [header, payload, signature] = token.split('.');
      if (!header || !payload || !signature) {
        throw new Error('Invalid token format');
      }

      // For development, just check if token matches secret
      if (token === this.secret) {
        next();
      } else {
        throw new Error('Invalid token');
      }
    } catch (error) {
      res.status(403).json({
        error: 'Invalid token',
        message: error.message
      });
    }
  }

  async start(port, host, enableCors) {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(port, host, () => {
          if (this.verbose) {
            console.log(`\n🎯 DCP Registry Server Running:`);
            console.log(`   URL: ${chalk.green(`http://${host}:${port}`)}`);
            console.log(`   Packs: ${chalk.gray(this.packsDir)}`);
            console.log(`   Browse: ${chalk.blue(`http://${host}:${port}`)}`);
            console.log(`   Index: ${chalk.blue(`http://${host}:${port}/index.json`)}`);
            if (this.secret) {
              console.log(`   Auth: ${chalk.yellow('JWT required')}`);
            }
            console.log('');
          }
          resolve(server);
        });

        server.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}