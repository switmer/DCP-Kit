#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * DCP Add v2 - Zero-Fetch Component Installer
 * 
 * Production-ready installer matching your spec:
 * - File:// and HTTP support
 * - SHA1 content-addressed blobs
 * - components.json (ShadCN convention)
 * - Overwrite policies (skip/prompt/force)
 * - Registry formats (shadcn/raw)
 * - Multi-PM support (npm/pnpm/yarn/bun)
 * - Authentication tokens
 * - Dry-run mode
 */

const log = {
  info: (s) => console.log(chalk.blue('ℹ'), s),
  ok: (s) => console.log(chalk.green('✓'), s),
  warn: (s) => console.warn(chalk.yellow('▲'), s),
  err: (s) => console.error(chalk.red('✕'), s),
  dim: (s) => console.log(chalk.dim(s)),
};

export async function runDcpAdd(componentSpec, options = {}) {
  const {
    target = null, // Auto-detect from components.json or default
    pm = null, // Auto-detect from lockfiles
    token = process.env.DCP_REGISTRY_TOKEN,
    dryRun = false,
    yes = false,
    overwrite = 'prompt', // skip|prompt|force
    registryFormat = 'shadcn', // shadcn|raw
    verbose = false,
  } = options;

  const installer = new ComponentInstallerV2({
    target,
    pm,
    token,
    dryRun,
    yes,
    overwrite,
    registryFormat,
    verbose,
  });

  return await installer.install(componentSpec);
}

class ComponentInstallerV2 {
  constructor(options) {
    this.target = options.target;
    this.pm = options.pm;
    this.token = options.token;
    this.dryRun = options.dryRun;
    this.yes = options.yes;
    this.overwrite = options.overwrite;
    this.registryFormat = options.registryFormat;
    this.verbose = options.verbose;
  }

  async install(spec) {
    try {
      // 1. Parse spec
      const { base, ns, name, version } = this.parseSpec(spec);
      if (this.verbose) {
        log.info(`Installing ${ns ? `${ns}/` : ''}${name}${version ? `@${version}` : ''}`);
      }

      // 2. Load pack (HTTP or file://)
      const packUrl = await this.resolvePackUrl({ base, ns, name, version });
      if (this.verbose) {
        log.dim(`  Pack URL: ${packUrl}`);
      }

      const pack = await this.loadPack(packUrl);
      if (!pack?.files?.length) {
        throw new Error('Invalid pack: missing files[]');
      }

      // 3. Resolve target directory
      const componentsConfig = await this.getComponentsConfig();
      const targetDir = path.resolve(
        process.cwd(),
        this.target || componentsConfig?.componentsDir || './components'
      );

      if (this.verbose) {
        log.dim(`  Target dir: ${targetDir}`);
      }

      // 4. Compute write targets
      const targets = this.computeWriteTargets(pack, { targetDir, format: this.registryFormat });

      // 5. Write files
      const written = await this.writeFiles(pack, targets, base);

      // 6. Install dependencies
      const deps = [
        ...(pack.dependencies || []),
        ...(pack.peerDependencies || []),
      ].filter((v, i, a) => a.indexOf(v) === i); // Dedupe

      let installedDeps = false;
      if (deps.length > 0) {
        installedDeps = await this.installDeps(deps);
      }

      // 7. Success
      log.ok(`Installed ${pack.name}${pack.version ? `@${pack.version}` : ''}`);
      if (written.length > 0) {
        written.forEach((p) => log.dim(`  • ${path.relative(process.cwd(), p)}`));
      }
      if (pack.docs) {
        log.info('Docs:');
        console.log(pack.docs);
      }

      return {
        success: true,
        component: {
          name: pack.name,
          namespace: pack.namespace,
          version: pack.version,
        },
        targetDir,
        files: written,
        depsInstalled: installedDeps,
        dryRun: this.dryRun,
      };
    } catch (error) {
      log.err(error.message);
      throw error;
    }
  }

  parseSpec(input) {
    // Supports: /r/:ns/:name or /r/:ns/:name@ver or file:// or relative path
    if (this.isFile(input)) {
      const p = path.resolve(process.cwd(), input.replace('file://', ''));
      const parts = p.split(path.sep);
      const idx = Math.max(
        parts.lastIndexOf('r'),
        parts.lastIndexOf('packs'),
        parts.lastIndexOf('registry')
      );
      if (idx < 0 || idx + 2 >= parts.length) {
        throw new Error(`Cannot infer spec from path: ${input}`);
      }
      const ns = parts[idx + 1];
      const last = parts[idx + 2];
      const [name, version] = last.split('@');
      const base = `file://${parts.slice(0, idx).join(path.sep) || '/'}`;
      return { base, ns, name, version };
    }

    if (this.isHttp(input)) {
      const u = new URL(input);
      const parts = u.pathname.replace(/^\/+/, '').split('/');
      const rIdx = parts.indexOf('r');
      if (rIdx === -1 || rIdx + 2 >= parts.length) {
        throw new Error(`URL must be .../r/:namespace/:name[@version]`);
      }
      const ns = parts[rIdx + 1];
      const last = parts[rIdx + 2];
      const [name, version] = last.split('@');
      const base = `${u.origin}${parts.slice(0, rIdx).join('/') ? '/' + parts.slice(0, rIdx).join('/') : ''}`;
      return { base, ns, name, version };
    }

    throw new Error(`Unsupported spec: ${input}`);
  }

  async resolvePackUrl({ base, ns, name, version }) {
    const leaf = version ? `${name}@${version}` : name;
    return `${base}/r/${ns ?? 'ui'}/${leaf}`;
  }

  async loadPack(urlOrPath) {
    if (urlOrPath.startsWith('file://')) {
      const p = fileURLToPath(urlOrPath);
      const stat = await fs.stat(p);
      if (stat.isDirectory()) {
        // Try index.json, meta.json, pack.json
        for (const f of ['index.json', 'meta.json', 'pack.json']) {
          try {
            return JSON.parse(await fs.readFile(path.join(p, f), 'utf8'));
          } catch {}
        }
        throw new Error(`No pack JSON found in ${p}`);
      } else {
        return JSON.parse(await fs.readFile(p, 'utf8'));
      }
    }

    // HTTP fetch
    const headers = { 'Accept': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(urlOrPath, { headers });
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Authentication required. Use --token or DCP_REGISTRY_TOKEN env var.');
      }
      throw new Error(`GET ${urlOrPath} → ${res.status} ${res.statusText}`);
    }

    return await res.json();
  }

  async getComponentsConfig() {
    try {
      const raw = JSON.parse(await fs.readFile(path.join(process.cwd(), 'components.json'), 'utf8'));
      const dir =
        raw?.aliases?.components ||
        raw?.components?.dir ||
        raw?.style?.components ||
        raw?.componentsDir;
      if (dir) return { componentsDir: dir };
    } catch {}
    return null;
  }

  computeWriteTargets(pack, { targetDir, format }) {
    const out = [];
    for (const f of pack.files) {
      // registry:file or registry:page with explicit target
      if ((f.type === 'registry:file' || f.type === 'registry:page') && f.target) {
        const outPath = f.target.startsWith('~')
          ? path.resolve(process.cwd(), f.target.slice(1))
          : path.resolve(process.cwd(), f.target);
        out.push({ src: f, outPath });
        continue;
      }

      if (format === 'shadcn') {
        // Group under component name: {target}/{name}/{basename}
        const base = path.basename(f.path);
        const folder = pack.name;
        const outPath = path.join(targetDir, folder, base);
        out.push({ src: f, outPath });
      } else {
        // Raw: mirror internal path under target
        const outPath = path.join(targetDir, f.path.replace(/^registry\//, ''));
        out.push({ src: f, outPath });
      }
    }
    return out;
  }

  async writeFiles(pack, targets, baseUrl) {
    const written = [];
    for (const t of targets) {
      const exists = await fs
        .stat(t.outPath)
        .then(() => true)
        .catch(() => false);

      if (exists && this.overwrite !== 'force') {
        if (this.overwrite === 'skip') {
          log.dim(`  skip ${t.outPath}`);
          continue;
        }
        if (this.overwrite === 'prompt' && !this.yes) {
          // TODO: Add prompts library for interactive confirmation
          log.warn(`  File exists: ${t.outPath} (use --overwrite force to replace)`);
          continue;
        }
      }

      if (this.dryRun) {
        log.dim(`  [dry-run] write ${t.outPath}`);
        written.push(t.outPath);
        continue;
      }

      await fs.mkdir(path.dirname(t.outPath), { recursive: true });

      // Fetch content: prefer SHA1 blobs, fallback to path
      let data;
      if (t.src.sha1) {
        // Extract extension from path for blob filename
        const ext = path.extname(t.src.path).replace('.', '');
        data = await this.downloadBlob(baseUrl, t.src.sha1, pack.blobsBaseUrl, ext);
      } else {
        // Fallback: fetch by path
        const url = `${baseUrl.replace(/\/$/, '')}/${t.src.path}`;
        data = await this.downloadFile(url);
      }

      await fs.writeFile(t.outPath, data);
      if (typeof t.src.mode === 'number') {
        await fs.chmod(t.outPath, t.src.mode);
      }

      written.push(t.outPath);
    }
    return written;
  }

  async downloadBlob(baseUrl, sha1, blobsBaseUrlOverride, extension = '') {
    const blobBase = blobsBaseUrlOverride || baseUrl.replace(/\/$/, '');
    // If sha1 doesn't have extension, append it
    const blobFile = extension ? `${sha1}.${extension}` : sha1;
    const url = `${blobBase}/blobs/${blobFile}`;
    return await this.downloadFile(url);
  }

  async downloadFile(url) {
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
    }

    return Buffer.from(await res.arrayBuffer());
  }

  async installDeps(deps) {
    if (deps.length === 0) return false;

    const pm = this.pm || (await this.detectPM());
    const args = {
      npm: ['install', ...deps],
      pnpm: ['add', ...deps],
      yarn: ['add', ...deps],
      bun: ['add', ...deps],
    }[pm];

    log.info(`Installing dependencies with ${pm}: ${deps.join(', ')}`);
    if (this.dryRun) {
      log.dim(`  [dry-run] ${pm} ${args.join(' ')}`);
      return true;
    }

    try {
      execSync(`${pm} ${args.join(' ')}`, {
        stdio: this.verbose ? 'inherit' : 'pipe',
        cwd: process.cwd(),
      });
      return true;
    } catch (error) {
      log.warn(`Failed to install deps. Run manually: ${pm} ${args.join(' ')}`);
      return false;
    }
  }

  async detectPM() {
    const cwd = process.cwd();
    const byLock = [
      ['pnpm-lock.yaml', 'pnpm'],
      ['yarn.lock', 'yarn'],
      ['bun.lockb', 'bun'],
      ['package-lock.json', 'npm'],
    ];
    for (const [file, pm] of byLock) {
      try {
        await fs.access(path.join(cwd, file));
        return pm;
      } catch {}
    }
    return 'npm';
  }

  isHttp(u) {
    return /^https?:\/\//i.test(u);
  }

  isFile(u) {
    return u.startsWith('file://') || u.startsWith('.') || u.startsWith('/');
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const spec = process.argv[2];

  if (!spec) {
    log.err('Usage: dcp-add <url-or-path> [flags]');
    console.log('');
    console.log('Examples:');
    console.log('  dcp-add "https://demo.dcp.dev/r/ui/button"');
    console.log('  dcp-add "http://localhost:7401/r/ui/card@2.1.0"');
    console.log('  dcp-add "./dist/packs/r/ui/avatar"');
    console.log('');
    console.log('Flags:');
    console.log('  --target <dir>            Target directory (default: auto-detect)');
    console.log('  --pm <npm|pnpm|yarn|bun>  Package manager (default: auto-detect)');
    console.log('  --token <string>          Auth token for private registries');
    console.log('  --dry-run                 Preview without writing files');
    console.log('  --yes, -y                 Skip confirmation prompts');
    console.log('  --overwrite <policy>      skip|prompt|force (default: prompt)');
    console.log('  --registry-format <fmt>   shadcn|raw (default: shadcn)');
    console.log('  --verbose                 Extra logging');
    process.exit(1);
  }

  // Parse flags
  const flags = {};
  for (let i = 3; i < process.argv.length; i++) {
    const a = process.argv[i];
    const n = process.argv[i + 1];
    if (a === '--target') {
      flags.target = n;
      i++;
    } else if (a === '--pm') {
      flags.pm = n;
      i++;
    } else if (a === '--token') {
      flags.token = n;
      i++;
    } else if (a === '--dry-run') {
      flags.dryRun = true;
    } else if (a === '--yes' || a === '-y') {
      flags.yes = true;
    } else if (a === '--overwrite') {
      flags.overwrite = n || 'prompt';
      i++;
    } else if (a === '--registry-format') {
      flags.registryFormat = n || 'shadcn';
      i++;
    } else if (a === '--verbose') {
      flags.verbose = true;
    }
  }

  try {
    await runDcpAdd(spec, flags);
  } catch (error) {
    log.err(error.message);
    process.exit(1);
  }
}

