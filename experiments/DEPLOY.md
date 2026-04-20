# Deploying the live-site DCP dashboard

The dashboard at `experiments/dashboard.html` auto-detects whether a Node backend (`server.mjs`) is reachable. When it isn't, it falls back to reading committed files directly from the deployed tree. That means the whole dashboard works as a pure-static site for everything already analyzed; only the **"Analyze a new site"** form is disabled on deploys (it requires a local subprocess running Get-Site-Styles).

## Static deploy to Vercel (recommended — fastest path)

From the repo root:

```bash
npx vercel
# or for production
npx vercel --prod
```

`vercel.json` at repo root declares:

- `outputDirectory: experiments` — the dashboard tree is served as-is
- `/` rewrites to `/dashboard.html`
- `*.md` served as `text/plain` so pack files render in-browser

No build step. No env vars. The dashboard reads:

- `./ad-hoc-index.json` — list of previously analyzed sites
- `./ad-hoc/<hostname>/meta.json` + `gss-bindings.json` — per-site captured data
- `./bungee-pro/site-spec/*.md` + `./thefirestore/site-spec/*.md` + `./ad-hoc/<hostname>/site-spec/*.md` — pre-built pack files

All of which are committed to the repo.

**What works on Vercel:**
- Summary comparison (both baseline experiments + GSS measurement)
- Per-site role tables with validity flags
- Per-role disagreements table (29+ entries across both baselines)
- Full site-spec pack viewer (DESIGN.md / STRUCTURE.md / IMPLEMENTATION.md / CAVEATS.md / REFUSAL.md) for all 7 analyzed sites
- Previously-analyzed-sites pill list

**What doesn't:**
- **Analyze-a-new-site form.** Requires Node server spawning GSS as subprocess (~60s per site). Vercel serverless caps out at 60s on hobby plans and the GSS repo isn't on the deploy anyway. The form shows an explanatory notice in static mode.

## Dynamic deploy to Render (if you need the analyze form)

Render supports long-running Node services. The catch: GSS must be installed next to the deploy so the server can `spawn('npm', ['run', 'start', ...])` against it.

Two options:

**Option A — vendor GSS as a git submodule:**

```bash
git submodule add https://github.com/switmer/Get-Site-Styles.git vendor/Get-Site-Styles
git commit -am "vendor GSS as submodule for Render deploy"
```

Then set `GSS_ROOT=vendor/Get-Site-Styles` as an env var on Render. Build command: `cd vendor/Get-Site-Styles && npm install`. Start command: `node experiments/server.mjs`.

**Option B — hit the GSS production API from the server** (requires an API key, not currently wired):
Rewrite `server.mjs:runGss` to POST to `https://get-site-styles-api.onrender.com/api/v1/analyze` instead of spawning a subprocess. Simpler deploy, harder credentials story.

## Local development (full functionality)

```bash
cd /path/to/DCP-Transformer
node experiments/server.mjs 8765
# open http://localhost:8765/dashboard.html
```

Requires `Get-Site-Styles` checked out at a sibling path (or `GSS_ROOT=/path/to/Get-Site-Styles`).
