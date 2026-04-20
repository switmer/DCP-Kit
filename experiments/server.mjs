#!/usr/bin/env node
/**
 * Dashboard server for the live-site DCP experiments.
 *
 * Serves the static dashboard and exposes POST /api/analyze, which shells out
 * to Get-Site-Styles against a user-provided URL and returns the
 * DCP-compatible bindings. Results are persisted under experiments/ad-hoc/<hostname>/
 * so re-opens are instant and runs show up in the "previously analyzed" list.
 *
 * No dependencies. Vanilla Node http + child_process.
 *
 * Usage:
 *   node experiments/server.mjs [port]
 *   GSS_ROOT=/path/to/Get-Site-Styles node experiments/server.mjs
 *
 * Default port 8765. GSS_ROOT defaults to a sibling of the repo root.
 */
import http from 'http';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDesignMd, buildSiteSpecPack } from './lib/build-design-md.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const GSS_ROOT = process.env.GSS_ROOT || path.resolve(REPO_ROOT, '..', 'Get-Site-Styles');
const AD_HOC_DIR = path.join(__dirname, 'ad-hoc');
const PORT = Number(process.argv[2]) || Number(process.env.PORT) || 8765;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function isSafeUrl(u) {
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function runGss(url) {
  // Verify GSS_ROOT exists
  try {
    await fs.access(path.join(GSS_ROOT, 'package.json'));
  } catch {
    throw new Error(`GSS_ROOT not found at ${GSS_ROOT}. Set env GSS_ROOT to point at Get-Site-Styles.`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(
      'npm',
      ['run', 'start', '--', '--url', url, '--semantic-analysis', '--format', 'shadcn'],
      { cwd: GSS_ROOT, env: { ...process.env, NODE_NO_WARNINGS: '1' } }
    );
    let stderr = '';
    let stdout = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.on('exit', code => {
      if (code !== 0) {
        reject(new Error(`GSS exited ${code}. stderr tail: ${stderr.slice(-400)}`));
      } else {
        resolve();
      }
    });
    child.on('error', reject);
  });
}

async function findLatestGssOutput(hostname, runStartedAt) {
  // GSS may normalize the hostname it writes under (e.g. stripping `www.`),
  // so we can't rely on a strict prefix match. Strategy: consider candidate
  // hostname variants, fall back to "any directory modified after the run
  // started."
  const outputsDir = path.join(GSS_ROOT, 'outputs');
  const candidates = [hostname];
  if (hostname.startsWith('www.')) candidates.push(hostname.slice(4));
  else candidates.push('www.' + hostname);

  const entries = await fs.readdir(outputsDir, { withFileTypes: true });
  const dirNames = entries.filter(e => e.isDirectory()).map(e => e.name);

  // 1. Try exact-prefix match against any candidate hostname.
  let matched = dirNames
    .filter(d => candidates.some(h => d.startsWith(h + '-')))
    .sort()
    .reverse();

  // 2. Fall back: any directory modified after the run started.
  if (matched.length === 0 && runStartedAt) {
    const mtimes = await Promise.all(
      dirNames.map(async d => {
        try {
          const st = await fs.stat(path.join(outputsDir, d));
          return { d, mtime: st.mtimeMs };
        } catch {
          return { d, mtime: 0 };
        }
      })
    );
    matched = mtimes
      .filter(x => x.mtime >= runStartedAt)
      .sort((a, b) => b.mtime - a.mtime)
      .map(x => x.d);
  }

  if (matched.length === 0) {
    throw new Error(
      `no GSS output dir for ${hostname} (tried: ${candidates.join(', ')}; no dirs modified since run started)`
    );
  }

  const latestDir = path.join(outputsDir, matched[0]);
  const files = (await fs.readdir(latestDir))
    .filter(f => f.endsWith('shadcn.analysis.json'))
    .sort()
    .reverse();
  if (files.length === 0) {
    throw new Error(`no shadcn.analysis.json in ${latestDir}`);
  }
  return path.join(latestDir, files[0]);
}

async function analyzeSite(url) {
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  const started = Date.now();

  await runGss(url);
  const gssPath = await findLatestGssOutput(hostname, started);
  const gss = JSON.parse(await fs.readFile(gssPath, 'utf8'));

  const outDir = path.join(AD_HOC_DIR, hostname);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, 'gss-bindings.json'),
    JSON.stringify(gss, null, 2),
    'utf8'
  );
  await fs.writeFile(
    path.join(outDir, 'meta.json'),
    JSON.stringify({ url, hostname, analyzedAt: new Date().toISOString(), runtimeMs: Date.now() - started }, null, 2),
    'utf8'
  );

  return {
    hostname,
    url,
    analyzedAt: new Date().toISOString(),
    runtimeMs: Date.now() - started,
    bindings: gss.bindings?.bindings || {},
    report: gss.bindings?.report || {},
    tokens: gss.tokens || null,
  };
}

async function listAdHocSites() {
  try {
    const entries = await fs.readdir(AD_HOC_DIR, { withFileTypes: true });
    const results = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const metaPath = path.join(AD_HOC_DIR, e.name, 'meta.json');
      try {
        const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
        results.push(meta);
      } catch {
        results.push({ hostname: e.name });
      }
    }
    results.sort((a, b) => (b.analyzedAt || '').localeCompare(a.analyzedAt || ''));
    return results;
  } catch {
    return [];
  }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  try {
    // --- API routes ---
    if (req.method === 'POST' && req.url === '/api/analyze') {
      let body = '';
      req.on('data', chunk => { body += chunk; if (body.length > 10_000) req.destroy(); });
      req.on('end', async () => {
        try {
          const { url } = JSON.parse(body);
          if (!isSafeUrl(url)) {
            return sendJson(res, 400, { error: 'url must be http:// or https://' });
          }
          console.log(`[analyze] ${url}`);
          const result = await analyzeSite(url);
          console.log(`[analyze] done in ${result.runtimeMs}ms — ${Object.keys(result.bindings).length} roles`);
          sendJson(res, 200, result);
        } catch (e) {
          console.error(`[analyze] failed: ${e.message}`);
          sendJson(res, 500, { error: e.message });
        }
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/api/adhoc') {
      const sites = await listAdHocSites();
      return sendJson(res, 200, sites);
    }

    if (req.method === 'GET' && req.url.startsWith('/api/adhoc/')) {
      const hostname = decodeURIComponent(req.url.replace('/api/adhoc/', ''));
      try {
        const gss = JSON.parse(await fs.readFile(path.join(AD_HOC_DIR, hostname, 'gss-bindings.json'), 'utf8'));
        const meta = JSON.parse(await fs.readFile(path.join(AD_HOC_DIR, hostname, 'meta.json'), 'utf8'));
        return sendJson(res, 200, { ...meta, bindings: gss.bindings?.bindings || {}, report: gss.bindings?.report || {}, tokens: gss.tokens || null });
      } catch (e) {
        return sendJson(res, 404, { error: `no ad-hoc record for ${hostname}` });
      }
    }

    // GET /api/pack/:hostname           → JSON manifest of the site-spec pack
    // GET /api/pack/:hostname/:filename  → raw markdown for one file in the pack
    if (req.method === 'GET' && req.url.startsWith('/api/pack/')) {
      const rest = decodeURIComponent(req.url.replace('/api/pack/', '').split('?')[0]);
      const parts = rest.split('/');
      const hostname = parts[0];
      const filename = parts[1] || null; // if present, return just that file

      const candidatePaths = [
        path.join(AD_HOC_DIR, hostname, 'gss-bindings.json'),
        path.join(__dirname, 'bungee-pro', 'gss-bindings.json'),
        path.join(__dirname, 'thefirestore', 'gss-bindings.json'),
      ];
      let gssPath = null;
      for (const p of candidatePaths) {
        try { await fs.access(p); gssPath = p; break; } catch {}
      }
      if (!gssPath) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`No gss-bindings.json found for ${hostname}. Run /api/analyze first.`);
        return;
      }
      try {
        const gss = JSON.parse(await fs.readFile(gssPath, 'utf8'));
        let url = null;
        try {
          const meta = JSON.parse(await fs.readFile(path.join(path.dirname(gssPath), 'meta.json'), 'utf8'));
          url = meta.url;
        } catch {}
        const pack = buildSiteSpecPack({ gss, hostname, url });

        // Persist the whole pack to disk alongside the source for fast re-reads.
        try {
          const packDir = path.join(path.dirname(gssPath), 'site-spec');
          await fs.mkdir(packDir, { recursive: true });
          for (const [name, content] of Object.entries(pack.files)) {
            await fs.writeFile(path.join(packDir, name), content, 'utf8');
          }
          await fs.writeFile(path.join(packDir, 'manifest.json'), JSON.stringify(pack.manifest, null, 2), 'utf8');
        } catch {}

        if (filename) {
          const content = pack.files[filename];
          if (!content) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(`File '${filename}' not in pack. Available: ${Object.keys(pack.files).join(', ')}`);
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
          res.end(content);
          return;
        }

        // No filename: return manifest JSON
        return sendJson(res, 200, pack.manifest);
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`pack synthesis failed: ${e.message}`);
        return;
      }
    }

    // GET /api/design/:hostname → markdown DESIGN.md, synthesized on demand
    if (req.method === 'GET' && req.url.startsWith('/api/design/')) {
      const hostname = decodeURIComponent(req.url.replace('/api/design/', '').split('?')[0]);
      // Look up the gss-bindings.json for this hostname — first in ad-hoc,
      // then fall back to the baseline experiment directories.
      const candidatePaths = [
        path.join(AD_HOC_DIR, hostname, 'gss-bindings.json'),
        path.join(__dirname, 'bungee-pro', 'gss-bindings.json'),
        path.join(__dirname, 'thefirestore', 'gss-bindings.json'),
      ];
      let gssPath = null;
      for (const p of candidatePaths) {
        try { await fs.access(p); gssPath = p; break; } catch {}
      }
      if (!gssPath) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`No gss-bindings.json found for ${hostname}. Run /api/analyze first.`);
        return;
      }
      try {
        const gss = JSON.parse(await fs.readFile(gssPath, 'utf8'));
        let url = null;
        try {
          const meta = JSON.parse(await fs.readFile(path.join(path.dirname(gssPath), 'meta.json'), 'utf8'));
          url = meta.url;
        } catch {}
        const md = buildDesignMd({ gss, hostname, url });
        // Persist alongside the source
        try {
          await fs.writeFile(path.join(path.dirname(gssPath), 'DESIGN.md'), md, 'utf8');
        } catch {}
        res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
        res.end(md);
        return;
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`synthesis failed: ${e.message}`);
        return;
      }
    }

    // --- Static ---
    let urlPath = req.url === '/' ? '/dashboard.html' : req.url;
    urlPath = urlPath.split('?')[0];
    const fp = path.resolve(__dirname, '.' + urlPath);
    if (!fp.startsWith(__dirname)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const data = await fs.readFile(fp);
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found: ' + (e?.message || ''));
  }
});

server.listen(PORT, () => {
  console.log(`Dashboard server: http://localhost:${PORT}/dashboard.html`);
  console.log(`GSS_ROOT = ${GSS_ROOT}`);
  console.log(`Ad-hoc results persist under: ${AD_HOC_DIR}`);
});
