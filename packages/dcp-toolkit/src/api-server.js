#!/usr/bin/env node

/**
 * DCP API Server - REST & GraphQL Platform
 * 
 * Transforms DCP from CLI tool into a full design system platform:
 * - Read/write registry operations
 * - Component validation & mutation 
 * - AI-powered planning & preview
 * - Real-time updates & webhooks
 * - Multi-tenant auth & access control
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { createOpenApiSpec } from './api/openapi.js';

export async function runApiServer(options = {}) {
  const {
    port = 7401,
    host = 'localhost',
    registryPath = './registry',
    jwtSecret = process.env.DCP_JWT_SECRET || 'dev-secret-change-in-production',
    rateLimitWindow = 15 * 60 * 1000, // 15 minutes
    rateLimitMax = 1000, // requests per window
    verbose = false,
    environment = 'development'
  } = options;

  if (verbose) {
    console.log(chalk.blue(`🚀 Starting DCP API Server v2.0...`));
  }

  const server = new DCPApiServer({
    registryPath,
    jwtSecret,
    rateLimitWindow,
    rateLimitMax,
    verbose,
    environment,
    baseUrl: `http://${host}:${port}`
  });

  await server.start(port, host);
  
  return {
    success: true,
    url: `http://${host}:${port}`,
    apiUrl: `http://${host}:${port}/api/v1`,
    docsUrl: `http://${host}:${port}/docs`,
    endpoints: {
      health: `http://${host}:${port}/api/v1/health`,
      registry: `http://${host}:${port}/api/v1/registry`,
      components: `http://${host}:${port}/api/v1/registry/components`,
      tokens: `http://${host}:${port}/api/v1/registry/tokens`,
      validate: `http://${host}:${port}/api/v1/validate`,
      openapi: `http://${host}:${port}/api/v1/meta`
    }
  };
}

class DCPApiServer {
  constructor(options) {
    this.registryPath = path.resolve(options.registryPath);
    this.jwtSecret = options.jwtSecret;
    this.verbose = options.verbose;
    this.environment = options.environment;
    this.baseUrl = options.baseUrl;
    
    this.app = express();
    this.setupSecurity();
    this.setupMiddleware(options);
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupSecurity() {
    // Security headers - configured for Figma plugin compatibility
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      // Allow cross-origin requests for Figma plugins in development
      crossOriginResourcePolicy: this.environment === 'development' 
        ? { policy: "cross-origin" } 
        : { policy: "same-origin" }
    }));

    // CORS with credentials
    this.app.use(cors({
      origin: this.environment === 'production' 
        ? ['https://dcp.dev', 'https://*.dcp.dev']
        : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));
  }

  setupMiddleware(options) {
    // Rate limiting
    const limiter = rateLimit({
      windowMs: options.rateLimitWindow,
      max: options.rateLimitMax,
      message: {
        error: 'Too many requests',
        retryAfter: Math.ceil(options.rateLimitWindow / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // JSON parsing with size limits
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));

    // Request logging
    if (this.verbose) {
      this.app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`${chalk.gray(timestamp)} ${chalk.blue(req.method)} ${req.path}`);
        next();
      });
    }

    // Request ID for tracing
    this.app.use((req, res, next) => {
      req.id = Math.random().toString(36).substr(2, 9);
      res.setHeader('X-Request-ID', req.id);
      next();
    });
  }

  setupRoutes() {
    // API Documentation
    this.setupSwaggerDocs();

    // Health check (no auth required)
    this.app.get('/health', this.handleHealth.bind(this));
    this.app.get('/api/v1/health', this.handleHealth.bind(this));

    // OpenAPI metadata
    this.app.get('/api/v1/meta', this.handleOpenApiMeta.bind(this));

    // Registry endpoints (read-only, public)
    this.app.get('/api/v1/registry', this.handleGetRegistry.bind(this));
    this.app.get('/api/v1/registry/components', this.handleGetComponents.bind(this));
    this.app.get('/api/v1/registry/components/:name', this.handleGetComponent.bind(this));
    this.app.get('/api/v1/registry/tokens', this.handleGetTokens.bind(this));
    this.app.get('/api/v1/registry/tokens/:category', this.handleGetTokenCategory.bind(this));

    // Query engine
    this.app.post('/api/v1/query', this.handleQuery.bind(this));

    // Validation endpoints
    this.app.post('/api/v1/validate', this.handleValidate.bind(this));
    this.app.post('/api/v1/validate/batch', this.handleValidateBatch.bind(this));

    // Analysis endpoints
    this.app.post('/api/v1/analyze', this.handleAnalyze.bind(this));
    this.app.get('/api/v1/analytics/usage', this.handleUsageAnalytics.bind(this));

    // Mutation endpoints (require auth)
    this.app.post('/api/v1/preview', this.authenticateToken.bind(this), this.handlePreview.bind(this));
    this.app.post('/api/v1/mutate', this.authenticateToken.bind(this), this.requireRole('contributor'), this.handleMutate.bind(this));
    this.app.post('/api/v1/rollback', this.authenticateToken.bind(this), this.requireRole('contributor'), this.handleRollback.bind(this));

    // Generation endpoints (require auth)
    this.app.post('/api/v1/extract', this.authenticateToken.bind(this), this.handleExtract.bind(this));
    this.app.post('/api/v1/transpile', this.authenticateToken.bind(this), this.handleTranspile.bind(this));
    this.app.post('/api/v1/generate', this.authenticateToken.bind(this), this.handleGenerate.bind(this));

    // Admin endpoints (require admin role)
    this.app.post('/api/v1/upload', this.authenticateToken.bind(this), this.requireRole('admin'), this.handleUpload.bind(this));
    this.app.post('/api/v1/build', this.authenticateToken.bind(this), this.requireRole('admin'), this.handleBuild.bind(this));

    // Legacy registry serving (for backward compatibility)
    this.app.get('/r/:namespace/:component', this.handleLegacyComponent.bind(this));
    this.app.get('/index.json', this.handleLegacyIndex.bind(this));

    // Root redirect
    this.app.get('/', (req, res) => {
      res.redirect('/docs');
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.path} not found`,
        docs: `${this.baseUrl}/docs`,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    });
  }

  setupSwaggerDocs() {
    const openApiSpec = createOpenApiSpec(this.baseUrl);
    
    // Swagger UI
    this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'DCP API Documentation',
      customCss: `
        .swagger-ui .topbar { background-color: #1a1a1a; }
        .swagger-ui .topbar .topbar-wrapper { content: 'DCP API v2.0'; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true
      }
    }));
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      const isProduction = this.environment === 'production';
      
      if (this.verbose && !isProduction) {
        console.error(`${chalk.red('Error')} [${req.id}]:`, error);
      }

      // JWT errors
      if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
          requestId: req.id
        });
      }

      // Validation errors  
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.message,
          details: error.details || null,
          requestId: req.id
        });
      }

      // Default error response
      res.status(error.status || 500).json({
        error: isProduction ? 'Internal Server Error' : error.name,
        message: isProduction ? 'Something went wrong' : error.message,
        requestId: req.id,
        ...(isProduction ? {} : { stack: error.stack })
      });
    });
  }

  // Authentication middleware
  authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];
    const token = authHeader?.replace('Bearer ', '') || apiKey || req.query.token;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Provide JWT token in Authorization header, X-API-Key header, or ?token= query param',
        requestId: req.id
      });
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(403).json({
        error: 'Invalid token',
        message: error.message,
        requestId: req.id
      });
    }
  }

  // Role-based access control
  requireRole(requiredRole) {
    const roleHierarchy = {
      'viewer': 0,
      'contributor': 1, 
      'admin': 2
    };

    return (req, res, next) => {
      const userRole = req.user?.role || 'viewer';
      const userLevel = roleHierarchy[userRole] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 999;

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Role '${requiredRole}' required, but user has '${userRole}'`,
          requestId: req.id
        });
      }

      next();
    };
  }

  // Route handlers
  async handleHealth(req, res) {
    try {
      // Check registry accessibility
      await fs.access(this.registryPath);
      
      // Check if registry is loaded and valid
      let registryLoaded = false;
      let registryStats = null;
      
      try {
        const registry = await this.loadRegistry();
        registryLoaded = true;
        registryStats = {
          components: registry.components?.length || 0,
          tokenCategories: Object.keys(registry.tokens || {}).length,
          hasMetadata: !!registry.metadata,
          hasIntelligence: !!registry.intelligence
        };
      } catch (registryError) {
        // Registry file exists but couldn't be loaded/parsed
        registryLoaded = false;
      }
      
      res.json({
        status: registryLoaded ? 'healthy' : 'degraded',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        environment: this.environment,
        registry: {
          path: this.registryPath,
          accessible: true,
          loaded: registryLoaded,
          stats: registryStats
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        requestId: req.id
      });
    } catch (error) {
      // Instead of 503, return 200 with actionable "setup-required" status so client UIs can guide the user
      res.json({
        status: 'setup-required',
        error: error.message,
        registry: {
          path: this.registryPath,
          accessible: false,
          loaded: false
        },
        requestId: req.id
      });
    }
  }

  async handleOpenApiMeta(req, res) {
    const openApiSpec = createOpenApiSpec(this.baseUrl);
    res.json(openApiSpec);
  }

  async handleGetRegistry(req, res) {
    try {
      const registryData = await this.loadRegistry();
      
      res.json({
        ...registryData,
        metadata: {
          ...registryData.metadata,
          servedAt: new Date().toISOString(),
          version: '2.0.0',
          endpoints: {
            components: `${this.baseUrl}/api/v1/registry/components`,
            tokens: `${this.baseUrl}/api/v1/registry/tokens`,
            validate: `${this.baseUrl}/api/v1/validate`,
            docs: `${this.baseUrl}/docs`
          }
        },
        requestId: req.id
      });
    } catch (error) {
      throw this.createError('Registry Load Failed', error.message, 500);
    }
  }

  async handleGetComponents(req, res) {
    try {
      const { page = 1, limit = 50, search, category } = req.query;
      const offset = (page - 1) * limit;
      
      const registry = await this.loadRegistry();
      let components = registry.components || [];

      // Apply filters
      if (search) {
        const searchLower = search.toLowerCase();
        components = components.filter(comp => 
          comp.name.toLowerCase().includes(searchLower) ||
          comp.description?.toLowerCase().includes(searchLower)
        );
      }

      if (category) {
        components = components.filter(comp => comp.category === category);
      }

      // Pagination
      const total = components.length;
      const paginatedComponents = components.slice(offset, offset + parseInt(limit));

      res.json({
        components: paginatedComponents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + parseInt(limit) < total,
          hasPrev: page > 1
        },
        filters: { search, category },
        requestId: req.id
      });
    } catch (error) {
      throw this.createError('Components Query Failed', error.message, 500);
    }
  }

  async handleGetComponent(req, res) {
    try {
      const { name } = req.params;
      const registry = await this.loadRegistry();
      
      const component = registry.components?.find(c => c.name === name);
      if (!component) {
        return res.status(404).json({
          error: 'Component not found',
          component: name,
          available: registry.components?.map(c => c.name) || [],
          requestId: req.id
        });
      }

      res.json({
        ...component,
        metadata: {
          ...component.metadata,
          apiEndpoint: `${this.baseUrl}/api/v1/registry/components/${name}`,
          installCommand: `npx dcp-add "${this.baseUrl}/r/ui/${name}"`
        },
        requestId: req.id
      });
    } catch (error) {
      throw this.createError('Component Query Failed', error.message, 500);
    }
  }

  async handleGetTokens(req, res) {
    try {
      const { page = 1, limit = 100, category, format = 'json' } = req.query;
      const offset = (page - 1) * limit;
      
      const registry = await this.loadRegistry();
      const tokens = registry.tokens || {};

      // Flatten tokens for pagination
      const flatTokens = this.flattenTokens(tokens);
      let tokenArray = Object.entries(flatTokens);

      // Filter by category
      if (category) {
        tokenArray = tokenArray.filter(([path]) => path.startsWith(category));
      }

      // Pagination
      const total = tokenArray.length;
      const paginatedTokens = tokenArray.slice(offset, offset + parseInt(limit));

      // Format output
      let formattedTokens;
      if (format === 'css') {
        formattedTokens = this.formatTokensAsCss(Object.fromEntries(paginatedTokens));
      } else {
        formattedTokens = Object.fromEntries(paginatedTokens);
      }

      res.json({
        tokens: formattedTokens,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + parseInt(limit) < total,
          hasPrev: page > 1
        },
        format,
        requestId: req.id
      });
    } catch (error) {
      throw this.createError('Tokens Query Failed', error.message, 500);
    }
  }

  async handleQuery(req, res) {
    try {
      const { selector, options = {} } = req.body;
      
      if (!selector) {
        return res.status(400).json({
          error: 'Missing selector',
          message: 'Provide a selector query in request body',
          requestId: req.id
        });
      }

      // Import and use query engine
      const { QueryEngine } = await import('./core/queryEngine.js');
      const registry = await this.loadRegistry();
      
      const engine = new QueryEngine(registry);
      const results = await engine.query(selector, options);

      res.json({
        selector,
        options,
        results,
        count: Array.isArray(results) ? results.length : Object.keys(results).length,
        requestId: req.id
      });
    } catch (error) {
      throw this.createError('Query Failed', error.message, 400);
    }
  }

  async handleValidate(req, res) {
    try {
      const { code, filePath, rules = [] } = req.body;
      
      if (!code) {
        return res.status(400).json({
          error: 'Missing code',
          message: 'Provide code content in request body',
          requestId: req.id
        });
      }

      // Import validation engine
      const { ValidationEngine } = await import('./core/validationEngine.js');
      const registry = await this.loadRegistry();
      
      const validator = new ValidationEngine(registry, { rules });
      const results = await validator.validate(code, filePath);

      res.json({
        valid: results.errors.length === 0,
        errors: results.errors,
        warnings: results.warnings,
        suggestions: results.suggestions,
        metadata: {
          filePath,
          linesChecked: code.split('\n').length,
          rulesApplied: rules.length || 'default'
        },
        requestId: req.id
      });
    } catch (error) {
      throw this.createError('Validation Failed', error.message, 400);
    }
  }

  async handleGetTokenCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 100, format = 'json' } = req.query;
      
      const registry = await this.loadRegistry();
      const tokens = registry.tokens || {};
      
      if (!tokens[category]) {
        return res.status(404).json({
          error: 'Token category not found',
          category,
          available: Object.keys(tokens),
          requestId: req.id
        });
      }
      
      const categoryTokens = this.flattenTokens({ [category]: tokens[category] });
      const tokenArray = Object.entries(categoryTokens);
      
      // Pagination
      const offset = (page - 1) * limit;
      const total = tokenArray.length;
      const paginatedTokens = tokenArray.slice(offset, offset + parseInt(limit));
      
      let formattedTokens;
      if (format === 'css') {
        formattedTokens = this.formatTokensAsCss(Object.fromEntries(paginatedTokens));
      } else {
        formattedTokens = Object.fromEntries(paginatedTokens);
      }
      
      res.json({
        category,
        tokens: formattedTokens,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + parseInt(limit) < total,
          hasPrev: page > 1
        },
        format,
        requestId: req.id
      });
    } catch (error) {
      throw this.createError('Token Category Query Failed', error.message, 500);
    }
  }

  async handleValidateBatch(req, res) {
    try {
      const { files = [] } = req.body;
      
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          error: 'Missing files array',
          message: 'Provide array of files to validate in request body',
          requestId: req.id
        });
      }
      
      const results = [];
      for (const file of files) {
        try {
          const validation = await this.handleValidateFile(file);
          results.push({ ...validation, file: file.path });
        } catch (error) {
          results.push({
            file: file.path,
            valid: false,
            errors: [{ message: error.message, line: 1, column: 1 }]
          });
        }
      }
      
      res.json({
        results,
        summary: {
          total: files.length,
          valid: results.filter(r => r.valid).length,
          invalid: results.filter(r => !r.valid).length
        },
        requestId: req.id
      });
    } catch (error) {
      throw this.createError('Batch Validation Failed', error.message, 400);
    }
  }

  async handleAnalyze(req, res) {
    try {
      const { source = '.', includeUsage = true, includeDependencies = true } = req.body;
      
      // Import analysis tools
      const { ProjectIntelligenceScanner } = await import('./core/projectIntelligence.js');
      const { DependencyGraphAnalyzer } = await import('./core/dependencyGraph.js');
      
      const results = {
        source,
        timestamp: new Date().toISOString()
      };
      
      // Project intelligence
      const scanner = new ProjectIntelligenceScanner(source);
      results.intelligence = await scanner.scan();
      
      // Dependency analysis if requested
      if (includeDependencies) {
        const analyzer = new DependencyGraphAnalyzer(source);
        // Would need to scan files and analyze dependencies
        results.dependencies = {
          external: [],
          internal: [],
          analysis: 'Not fully implemented in this endpoint'
        };
      }
      
      res.json({
        ...results,
        requestId: req.id
      });
    } catch (error) {
      throw this.createError('Analysis Failed', error.message, 500);
    }
  }

  async handleUsageAnalytics(req, res) {
    try {
      const registry = await this.loadRegistry();
      
      const analytics = {
        components: {
          total: registry.components?.length || 0,
          categories: this.groupBy(registry.components || [], 'category'),
          complexity: this.analyzeComplexity(registry.components || [])
        },
        tokens: {
          total: Object.keys(this.flattenTokens(registry.tokens || {})).length,
          categories: Object.keys(registry.tokens || {}),
          usage: 'Token usage tracking not yet implemented'
        },
        timestamp: new Date().toISOString(),
        requestId: req.id
      };
      
      res.json(analytics);
    } catch (error) {
      throw this.createError('Usage Analytics Failed', error.message, 500);
    }
  }

  async handlePreview(req, res) {
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Mutation preview endpoint not yet implemented',
      requestId: req.id
    });
  }

  async handleMutate(req, res) {
    res.status(501).json({
      error: 'Not Implemented', 
      message: 'Mutation endpoint not yet implemented',
      requestId: req.id
    });
  }

  async handleRollback(req, res) {
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Rollback endpoint not yet implemented', 
      requestId: req.id
    });
  }

  async handleExtract(req, res) {
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Extract endpoint not yet implemented',
      requestId: req.id
    });
  }

  async handleTranspile(req, res) {
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Transpile endpoint not yet implemented',
      requestId: req.id
    });
  }

  async handleGenerate(req, res) {
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Generate endpoint not yet implemented',
      requestId: req.id
    });
  }

  async handleUpload(req, res) {
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Upload endpoint not yet implemented',
      requestId: req.id
    });
  }

  async handleBuild(req, res) {
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Build endpoint not yet implemented',
      requestId: req.id
    });
  }

  async handleLegacyComponent(req, res) {
    // Redirect to new API
    const { namespace, component } = req.params;
    res.redirect(`/api/v1/registry/components/${component}`);
  }

  async handleLegacyIndex(req, res) {
    // Redirect to new API
    res.redirect('/api/v1/registry');
  }

  // Helper method for individual file validation
  async handleValidateFile(file) {
    const { ValidationEngine } = await import('./core/validationEngine.js');
    const registry = await this.loadRegistry();
    
    const validator = new ValidationEngine(registry);
    return await validator.validate(file.code, file.path);
  }

  // Helper methods
  async loadRegistry() {
    try {
      const registryFile = path.join(this.registryPath, 'registry.json');
      const content = await fs.readFile(registryFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const helpfulMessage = [
          `Registry not found at ${this.registryPath}`,
          '💡 To fix this:',
          '   1. Run: dcp extract ./src --out ./registry',
          '   2. Or provide existing registry path: dcp api --registry /path/to/registry',
          '   3. Or check your registry path is correct'
        ].join('\n');
        
        throw this.createError('Registry Not Found', helpfulMessage, 404);
      }
      throw this.createError('Registry Parse Error', `Failed to parse registry: ${error.message}`, 500);
    }
  }

  flattenTokens(tokens, prefix = '') {
    const result = {};
    
    for (const [key, value] of Object.entries(tokens)) {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ('value' in value) {
          // This is a token
          result[path] = value;
        } else {
          // This is a nested object
          Object.assign(result, this.flattenTokens(value, path));
        }
      }
    }
    
    return result;
  }

  formatTokensAsCss(tokens) {
    return Object.entries(tokens)
      .map(([path, token]) => `--${path.replace(/\./g, '-')}: ${token.value};`)
      .join('\n');
  }

  groupBy(array, keyFn) {
    const groups = {};
    array.forEach(item => {
      const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
      if (!groups[key]) groups[key] = 0;
      groups[key]++;
    });
    return groups;
  }

  analyzeComplexity(components) {
    const complexity = { simple: 0, moderate: 0, complex: 0 };
    
    components.forEach(component => {
      let score = 0;
      score += (component.props?.length || 0) * 2;
      score += (component.variants?.length || 0) * 3;
      score += component.children ? 5 : 0;
      
      if (score < 5) complexity.simple++;
      else if (score < 15) complexity.moderate++;
      else complexity.complex++;
    });
    
    return complexity;
  }

  createError(type, message, status = 500) {
    const error = new Error(message);
    error.name = type;
    error.status = status;
    return error;
  }

  async start(port, host) {
    // Check registry health on startup
    let registryStatus = 'unknown';
    try {
      await this.loadRegistry();
      registryStatus = 'healthy';
    } catch (error) {
      registryStatus = error.code === 'ENOENT' ? 'missing' : 'invalid';
      if (this.verbose) {
        console.warn(`⚠️  Registry issue: ${error.message}`);
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(port, host, () => {
          if (this.verbose) {
            console.log(`\n🎯 DCP API Server v2.0 Running:`);
            console.log(`   API: ${chalk.green(`http://${host}:${port}/api/v1`)}`);
            console.log(`   Docs: ${chalk.blue(`http://${host}:${port}/docs`)}`);
            console.log(`   Registry: ${chalk.gray(this.registryPath)} ${registryStatus === 'healthy' ? chalk.green('✓') : registryStatus === 'missing' ? chalk.red('✗ missing') : chalk.yellow('⚠ invalid')}`);
            console.log(`   Environment: ${chalk.yellow(this.environment)}`);
            
            if (registryStatus !== 'healthy') {
              console.log('');
              console.log(`💡 ${chalk.yellow('Quick fix:')} Run 'dcp extract ./src --out ${this.registryPath}' to create a registry`);
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

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.argv[2] || 7401;
  const registryPath = process.argv[3] || './registry';
  
  console.error('🚀 DCP API Server starting...');
  console.error(`📁 Registry: ${registryPath}`);
  console.error(`🌐 Port: ${port}`);
  
  runApiServer({ 
    port: parseInt(port), 
    registryPath,
    verbose: true 
  }).catch((error) => {
    console.error('Failed to start API server:', error);
    process.exit(1);
  });
}

export { DCPApiServer };