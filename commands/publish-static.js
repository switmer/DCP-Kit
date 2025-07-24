import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';

/**
 * DCP Static Publisher
 * 
 * Publishes component packs to static hosting (S3, GitHub Pages, Vercel, etc.).
 * Generates public URLs for registry consumption and one-line installs.
 * 
 * Features:
 * - S3-compatible bucket upload (AWS, R2, GCS)
 * - GitHub Pages deployment
 * - Generic static file hosting
 * - CDN-friendly cache headers
 * - Public URL generation with install commands
 */

export async function runPublishStatic(packsDir, options = {}) {
  const {
    provider = 'detect', // s3, github-pages, generic
    bucket = null,
    region = 'us-east-1',
    accessKeyId = process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY,
    baseUrl = null,
    namespace = 'ui',
    dryRun = false,
    verbose = false
  } = options;

  if (verbose) {
    console.log(chalk.blue(`📤 Publishing component packs to static hosting...`));
  }

  const publisher = new StaticPublisher({
    packsDir,
    provider,
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    baseUrl,
    namespace,
    dryRun,
    verbose
  });

  const result = await publisher.publish();
  
  if (verbose && !dryRun) {
    console.log(`\n✅ Published successfully:`);
    console.log(`   Registry: ${chalk.green(result.registryUrl)}`);
    console.log(`   Components: ${result.components.length}`);
    console.log(`   Install: ${chalk.blue(`npx dcp-add "${result.registryUrl}/r/${namespace}/<component>"`)}`);
  }

  return result;
}

class StaticPublisher {
  constructor(options) {
    this.packsDir = path.resolve(options.packsDir);
    this.provider = options.provider;
    this.bucket = options.bucket;
    this.region = options.region;
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.baseUrl = options.baseUrl;
    this.namespace = options.namespace;
    this.dryRun = options.dryRun;
    this.verbose = options.verbose;
    
    this.uploadedFiles = [];
    this.errors = [];
  }

  async publish() {
    // Detect provider if not specified
    if (this.provider === 'detect') {
      this.provider = this.detectProvider();
    }

    // Validate configuration
    this.validateConfig();

    // Scan packs directory
    const files = await this.scanPacksDirectory();
    
    if (this.verbose) {
      console.log(`   Found ${files.length} files to upload`);
    }

    if (this.dryRun) {
      console.log(chalk.yellow('\n🔍 Dry run - no files will be uploaded:'));
      files.forEach(file => {
        console.log(`   ${file.relativePath} → ${this.getPublicUrl(file.relativePath)}`);
      });
      
      return {
        success: true,
        dryRun: true,
        files: files.length,
        registryUrl: this.getPublicUrl(''),
        components: await this.getComponentList()
      };
    }

    // Upload files based on provider
    switch (this.provider) {
      case 's3':
        await this.uploadToS3(files);
        break;
      case 'github-pages':
        await this.deployToGitHubPages(files);
        break;
      case 'generic':
        await this.uploadGeneric(files);
        break;
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }

    return {
      success: true,
      provider: this.provider,
      files: this.uploadedFiles.length,
      errors: this.errors.length,
      registryUrl: this.getPublicUrl(''),
      components: await this.getComponentList(),
      uploadedFiles: this.uploadedFiles
    };
  }

  detectProvider() {
    if (this.bucket) return 's3';
    if (process.env.GITHUB_ACTIONS) return 'github-pages';
    return 'generic';
  }

  validateConfig() {
    switch (this.provider) {
      case 's3':
        if (!this.bucket) {
          throw new Error('S3 bucket is required for S3 provider');
        }
        if (!this.accessKeyId || !this.secretAccessKey) {
          throw new Error('AWS credentials are required for S3 provider');
        }
        break;
      case 'github-pages':
        if (!process.env.GITHUB_TOKEN) {
          console.warn('⚠️  GITHUB_TOKEN not found - deployment may fail');
        }
        break;
      case 'generic':
        if (!this.baseUrl) {
          throw new Error('Base URL is required for generic provider');
        }
        break;
    }
  }

  async scanPacksDirectory() {
    const files = [];
    
    async function scanDir(dir, relativeTo) {
      const entries = await fs.readdir(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativePath = path.relative(relativeTo, fullPath);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await scanDir(fullPath, relativeTo);
        } else {
          files.push({
            fullPath,
            relativePath: relativePath.replace(/\\/g, '/'), // Normalize for web
            size: stats.size,
            contentType: this.getContentType(entry)
          });
        }
      }
    }

    await scanDir(this.packsDir, this.packsDir);
    return files;
  }

  async uploadToS3(files) {
    if (this.verbose) {
      console.log(`   Uploading to S3: s3://${this.bucket}`);
    }

    // Use AWS SDK v3 if available, otherwise provide helpful error
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey
        }
      });

      for (const file of files) {
        try {
          const content = await fs.readFile(file.fullPath);
          const key = file.relativePath;

          const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: content,
            ContentType: file.contentType,
            CacheControl: this.getCacheControl(file.relativePath)
          });

          await s3Client.send(command);
          this.uploadedFiles.push({
            ...file,
            url: this.getPublicUrl(key)
          });

          if (this.verbose) {
            console.log(`     ✓ ${key}`);
          }
        } catch (error) {
          this.errors.push({
            file: file.relativePath,
            error: error.message
          });
          
          if (this.verbose) {
            console.log(`     ✗ ${file.relativePath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'AWS SDK not found. Install with: npm install @aws-sdk/client-s3'
        );
      }
      throw error;
    }
  }

  async deployToGitHubPages(files) {
    if (this.verbose) {
      console.log(`   Deploying to GitHub Pages`);
    }

    // For GitHub Pages, we typically just copy files to a dist directory
    // and let GitHub Actions handle the actual deployment
    const distDir = path.join(process.cwd(), 'dist', 'github-pages');
    await fs.mkdir(distDir, { recursive: true });

    for (const file of files) {
      try {
        const targetPath = path.join(distDir, file.relativePath);
        const targetDir = path.dirname(targetPath);
        
        await fs.mkdir(targetDir, { recursive: true });
        await fs.copyFile(file.fullPath, targetPath);
        
        this.uploadedFiles.push({
          ...file,
          url: this.getPublicUrl(file.relativePath)
        });

        if (this.verbose) {
          console.log(`     ✓ ${file.relativePath}`);
        }
      } catch (error) {
        this.errors.push({
          file: file.relativePath,
          error: error.message
        });
      }
    }

    // Generate GitHub Pages workflow if it doesn't exist
    await this.generateGitHubPagesWorkflow(distDir);
  }

  async uploadGeneric(files) {
    if (this.verbose) {
      console.log(`   Generic upload to ${this.baseUrl}`);
    }

    console.log(chalk.yellow('⚠️  Generic provider: Files staged but not uploaded'));
    console.log('   Copy the packs directory to your static hosting provider:');
    console.log(`   ${this.packsDir} → ${this.baseUrl}`);
    
    // Just mark all files as "uploaded" with their target URLs
    for (const file of files) {
      this.uploadedFiles.push({
        ...file,
        url: this.getPublicUrl(file.relativePath)
      });
    }
  }

  async generateGitHubPagesWorkflow(distDir) {
    const workflowDir = path.join(process.cwd(), '.github', 'workflows');
    const workflowPath = path.join(workflowDir, 'deploy-registry.yml');
    
    // Only create if it doesn't exist
    try {
      await fs.access(workflowPath);
      return; // Workflow already exists
    } catch {}

    await fs.mkdir(workflowDir, { recursive: true });

    const workflow = `name: Deploy DCP Registry

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build registry
        run: |
          npm run build
          npx dcp build-packs registry/registry.json --out dist/packs
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist/packs'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

    await fs.writeFile(workflowPath, workflow);
    
    if (this.verbose) {
      console.log(`   Generated GitHub Pages workflow: ${workflowPath}`);
    }
  }

  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const types = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.jsx': 'text/javascript',
      '.ts': 'text/typescript',
      '.tsx': 'text/typescript',
      '.json': 'application/json',
      '.md': 'text/markdown',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    };
    return types[ext] || 'text/plain';
  }

  getCacheControl(filePath) {
    // Blobs are content-addressed, so they can be cached forever
    if (filePath.includes('/blobs/')) {
      return 'public, max-age=31536000, immutable';
    }
    
    // Registry files should be cached briefly
    if (filePath.endsWith('.json')) {
      return 'public, max-age=300';
    }
    
    // Component files can be cached for a while
    return 'public, max-age=3600';
  }

  getPublicUrl(relativePath) {
    if (!this.baseUrl) {
      // Generate URL based on provider
      switch (this.provider) {
        case 's3':
          return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${relativePath}`;
        case 'github-pages':
          // Assume GitHub Pages URL pattern
          const repo = process.env.GITHUB_REPOSITORY || 'user/repo';
          return `https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}/${relativePath}`;
        default:
          return `https://example.com/${relativePath}`;
      }
    }
    
    return `${this.baseUrl.replace(/\/$/, '')}/${relativePath}`;
  }

  async getComponentList() {
    try {
      const indexPath = path.join(this.packsDir, 'index.json');
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);
      return index.components || [];
    } catch {
      return [];
    }
  }
}