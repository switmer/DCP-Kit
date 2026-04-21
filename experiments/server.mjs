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

// ── Shadcn-variable → DCP-role mapping ───────────────────────────────
// The hosted GSS API (at least the version currently deployed) returns
// data.theme with shadcn-convention CSS variables but does NOT emit a
// bindings field the way the local CLI does. Synthesize bindings on this
// side from the theme data. This is actually the architecturally-right
// place for it — role mapping belongs to DCP, not the extractor.
const SHADCN_TO_DCP = {
  '--background':            { role: 'bg.default',     confidence: 0.88 },
  '--card':                  { role: 'bg.elevated',    confidence: 0.82 },
  '--popover':               { role: 'bg.elevated',    confidence: 0.70 },
  '--muted':                 { role: 'bg.muted',       confidence: 0.82 },
  '--foreground':            { role: 'text.primary',   confidence: 0.88 },
  '--muted-foreground':      { role: 'text.muted',     confidence: 0.85 },
  '--primary':               { role: 'accent.primary', confidence: 0.85 },
  '--primary-foreground':    { role: 'text.onAccent',  confidence: 0.80 },
  '--secondary':             { role: 'accent.secondary', confidence: 0.78 },
  '--border':                { role: 'border.default', confidence: 0.85 },
  '--input':                 { role: 'border.muted',   confidence: 0.72 },
  '--destructive':           { role: 'intent.danger',  confidence: 0.85 },
};

function hslToHex(hslStr) {
  if (!hslStr || typeof hslStr !== 'string') return null;
  // GSS emits shadcn-style strings: "216 92% 52%" (space-separated HSL)
  // or sometimes hsl(...) form.
  const cleaned = hslStr.replace(/^hsl\(|\)$/g, '').trim();
  const m = cleaned.match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  let h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue = (t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1/6) return p + (q - p) * 6 * tt;
    if (tt < 1/2) return q;
    if (tt < 2/3) return p + (q - p) * (2/3 - tt) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue(h + 1/3); g = hue(h); b = hue(h - 1/3);
  }
  const to2 = (x) => Math.max(0, Math.min(255, Math.round(x * 255))).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/**
 * If the payload is missing the bindings block (deployed GSS version
 * doesn't emit it), synthesize one from data.theme.light using shadcn
 * convention matching. No-op if bindings already present.
 */
function synthesizeBindingsFromTheme(payload) {
  if (payload?.bindings?.bindings && Object.keys(payload.bindings.bindings).length > 0) {
    return payload; // already has bindings; don't overwrite
  }
  const themeLight = payload?.theme?.light;
  if (!themeLight || typeof themeLight !== 'object') return payload;

  const bindings = {};
  const unmappedShadcnVars = [];
  for (const [cssVar, value] of Object.entries(themeLight)) {
    const mapping = SHADCN_TO_DCP[cssVar];
    if (!mapping) {
      unmappedShadcnVars.push(cssVar);
      continue;
    }
    if (bindings[mapping.role]) continue; // keep highest-priority match
    const hex = hslToHex(value) || value;
    bindings[mapping.role] = {
      role: mapping.role,
      hex,
      confidence: mapping.confidence,
      source: 'auto',
      reason: `shadcn convention: ${cssVar} → ${mapping.role}`,
    };
  }

  // Compute unmapped DCP roles (for the report)
  const ALL_DCP_COLOR_ROLES = [
    'bg.default', 'bg.muted', 'bg.elevated',
    'text.primary', 'text.muted', 'text.onAccent',
    'border.default', 'border.muted',
    'accent.primary', 'accent.secondary',
    'intent.danger', 'intent.warning', 'intent.success', 'intent.info',
  ];
  const unmappedRoles = ALL_DCP_COLOR_ROLES.filter(r => !bindings[r]);

  payload.bindings = {
    contractVersion: '0.1.0',
    bindings,
    report: {
      totalCandidates: Object.keys(themeLight).length,
      autoBound: 0,
      suggested: Object.keys(bindings).length,
      uncertain: 0,
      unmappedRoles,
      reviewItems: Object.values(bindings).map(b => ({
        role: b.role, hex: b.hex, confidence: b.confidence, reason: b.reason,
      })),
    },
  };
  return payload;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const GSS_ROOT = process.env.GSS_ROOT || path.resolve(REPO_ROOT, '..', 'Get-Site-Styles');
const GSS_API_URL = process.env.GSS_API_URL || null;     // e.g. https://get-site-styles-api.onrender.com/api/v1/analyze
const GSS_API_KEY = process.env.GSS_API_KEY || null;     // X-API-Key header
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

/**
 * Invoke Get-Site-Styles. Two modes:
 *
 *   1. Hosted API (preferred for deploys): POST to GSS_API_URL with
 *      X-API-Key: GSS_API_KEY. Returns the shadcn.analysis.json payload
 *      directly in the response body. No filesystem interaction.
 *
 *   2. Local subprocess (dev mode): spawn `npm run start` in GSS_ROOT,
 *      wait for exit, read the written shadcn.analysis.json from the
 *      outputs/ directory. Only activates when GSS_API_URL is unset.
 *
 * Returns { hosted: boolean, payload: object | null } where payload
 * contains the full analysis JSON in hosted mode; in local mode it's null
 * and the caller uses findLatestGssOutput() to locate the file.
 */
async function runGss(url) {
  // Mode 1: hosted API.
  if (GSS_API_URL) {
    if (!GSS_API_KEY) {
      throw new Error('GSS_API_URL is set but GSS_API_KEY is missing. Set both as env vars on this service.');
    }
    const r = await fetch(GSS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': GSS_API_KEY,
      },
      body: JSON.stringify({
        url,
        format: 'shadcn',
        semanticAnalysis: true,
      }),
    });
    const bodyText = await r.text();
    if (!r.ok) {
      // Try to extract the real error from the GSS envelope, otherwise show
      // the raw body truncated. Also translate common failures into
      // human-readable guidance instead of dumping an AxiosError blob.
      let clean;
      try {
        const envelope = JSON.parse(bodyText);
        const inner = envelope?.error?.message || envelope?.error?.code || bodyText;
        if (typeof inner === 'string' && /404/.test(inner)) {
          clean = `Target URL returned 404 — check the URL. For Webflow/Framer/hosted templates, try without the \`www.\` prefix.`;
        } else if (typeof inner === 'string' && /timeout|ETIMEDOUT/i.test(inner)) {
          clean = `Target URL timed out. GSS couldn't fetch the page within its timeout.`;
        } else {
          clean = typeof inner === 'string' ? inner.slice(0, 300) : JSON.stringify(inner).slice(0, 300);
        }
      } catch {
        clean = bodyText.slice(0, 300);
      }
      throw new Error(`GSS ${r.status}: ${clean}`);
    }
    let json;
    try { json = JSON.parse(bodyText); }
    catch { throw new Error(`GSS API returned non-JSON body: ${bodyText.slice(0, 200)}`); }

    // The hosted API wraps the GSS analysis payload in a REST envelope:
    //   { success, data, meta, timestamp, requestId }
    // Where .data holds the same shape the local CLI writes to
    // shadcn.analysis.json. Unwrap so downstream code is shape-agnostic.
    let payload = (json && typeof json === 'object' && 'data' in json && !('bindings' in json))
      ? json.data
      : json;
    if (!payload || typeof payload !== 'object') {
      throw new Error(`GSS API returned unexpected shape: ${bodyText.slice(0, 200)}`);
    }

    // The deployed GSS version returns data without a bindings field
    // (predates formatter.ts's bindings: bindingResult addition). Synthesize
    // bindings from the shadcn theme CSS variables using convention
    // matching — this is DCP's job per the canonical/semantic split.
    payload = synthesizeBindingsFromTheme(payload);

    return { hosted: true, payload };
  }

  // Mode 2: local subprocess.
  try {
    await fs.access(path.join(GSS_ROOT, 'package.json'));
  } catch {
    throw new Error(`GSS_ROOT not found at ${GSS_ROOT}. Set GSS_ROOT to a local Get-Site-Styles checkout, or set GSS_API_URL + GSS_API_KEY to use the hosted API.`);
  }

  await new Promise((resolve, reject) => {
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
  return { hosted: false, payload: null };
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

  const runResult = await runGss(url);
  let gss;
  if (runResult.hosted) {
    // Hosted API returned the payload directly — no disk intermediate.
    gss = runResult.payload;
  } else {
    // Local subprocess wrote to disk; locate and read it.
    const gssPath = await findLatestGssOutput(hostname, started);
    gss = JSON.parse(await fs.readFile(gssPath, 'utf8'));
  }

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
