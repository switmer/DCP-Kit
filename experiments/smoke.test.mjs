#!/usr/bin/env node
/**
 * Smoke test for the live-site experiments dashboard.
 *
 * Starts server.mjs on an ephemeral port, loads dashboard.html in jsdom with
 * real fixtures (bungee-pro, thefirestore, and every ad-hoc site), and fails
 * if any render path throws. Catches the class of bugs that motivated it:
 * `.toFixed()` on undefined, reading properties of undefined in render loops.
 *
 * Does NOT exercise POST /api/analyze (would require GSS). The server-side
 * hostname-directory fallback in findLatestGssOutput is out of scope here.
 */
import { spawn } from 'child_process';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8799;
const BASE = `http://localhost:${PORT}`;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/api/adhoc`);
      if (r.ok) return;
    } catch {}
    await wait(100);
  }
  throw new Error('server did not become ready within 5s');
}

async function pollUntil(fn, label, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fn()) return;
    await wait(50);
  }
  throw new Error(`timeout waiting for: ${label}`);
}

async function main() {
  const serverPath = path.join(__dirname, 'server.mjs');
  const server = spawn('node', [serverPath, String(PORT)], {
    cwd: path.resolve(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  server.stdout.on('data', d => { serverLog += d.toString(); });
  server.stderr.on('data', d => { serverLog += d.toString(); });

  let failed = false;
  const errors = [];
  const record = (kind, msg) => {
    failed = true;
    errors.push(`[${kind}] ${msg}`);
  };

  try {
    await waitForServer();

    const html = await (await fetch(`${BASE}/dashboard.html`)).text();

    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', e => record('jsdom', e.message + '\n' + (e.detail?.stack || '')));
    virtualConsole.on('error', msg => record('console.error', String(msg)));

    const dom = new JSDOM(html, {
      url: `${BASE}/dashboard.html`,
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true,
      virtualConsole,
    });
    const { window } = dom;

    window.addEventListener('error', ev => record('window.error', ev.message || String(ev.error)));
    window.addEventListener('unhandledrejection', ev => record('unhandledrejection', String(ev.reason?.message || ev.reason)));

    // The page's top-level script is an async IIFE that populates these four
    // containers. Wait for all of them to have content.
    await pollUntil(
      () => {
        const doc = window.document;
        return (doc.getElementById('summary-body')?.children.length || 0) > 0
          && (doc.getElementById('site-bungee')?.children.length || 0) > 0
          && (doc.getElementById('site-firestore')?.children.length || 0) > 0
          && (doc.getElementById('disagreements-body')?.children.length || 0) > 0
          && doc.getElementById('adhoc-list') !== null;
      },
      'dashboard initial render',
    );

    // Each ad-hoc fixture exercises renderAdHocResult. Click every pill and
    // confirm #analyze-result gets populated without throwing.
    const pills = [...window.document.querySelectorAll('.adhoc-pill')];
    if (pills.length === 0) {
      record('fixture', 'no ad-hoc pills rendered (expected ≥1 from experiments/ad-hoc/)');
    }
    for (const pill of pills) {
      const hostname = pill.dataset.hostname;
      const resultEl = window.document.getElementById('analyze-result');
      resultEl.innerHTML = '';
      pill.click();
      try {
        await pollUntil(
          () => resultEl.innerHTML.includes('GSS measured'),
          `ad-hoc render for ${hostname}`,
          3000,
        );
      } catch (e) {
        record('adhoc', `${hostname}: ${e.message}`);
      }
    }

    dom.window.close();
  } catch (e) {
    record('fatal', e.message + '\n' + e.stack);
  } finally {
    server.kill('SIGTERM');
  }

  if (failed) {
    console.error('FAIL — dashboard smoke test caught render-path errors:');
    for (const e of errors) console.error('  ' + e.replace(/\n/g, '\n    '));
    console.error('\nServer log tail:\n' + serverLog.split('\n').slice(-15).join('\n'));
    process.exit(1);
  }
  console.log('PASS — dashboard renders cleanly for all fixtures + ad-hoc sites.');
}

main().catch(e => { console.error(e); process.exit(1); });
