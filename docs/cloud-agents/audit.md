# Cloud Agent Readiness Audit — DCP-Transformer

**Date:** 2026-04-02
**Repo:** `dcp-workspace` (monorepo)
**Primary package:** `packages/dcp-toolkit/`

---

## 1. Runtime & Package Manager

| Field | Value |
|-------|-------|
| Package manager | npm (workspaces) |
| Lockfile | `package-lock.json` |
| Node version | `>=16.0.0` (engines field); no `.nvmrc` |
| Module system | Pure ESM (`"type": "module"`) |
| Workspaces | `packages/*` (dcp-toolkit, dcp-spec, storybook-addon-registry) |

## 2. Available Scripts

### Root (`package.json`)
- `npm test` — delegates to `@dcp/toolkit`
- `npm run build` — delegates to all workspaces
- `npm run test:coverage` — Jest with coverage

### Toolkit (`packages/dcp-toolkit/package.json`)
- `test` — `node --experimental-vm-modules jest` (ESM-specific invocation)
- `build` — `tsc`
- `serve` — local dev server
- `extract` — component metadata extraction

## 3. Environment Variables

### DCP Toolkit Core (the actual product)

| Variable | File | Tier | Notes |
|----------|------|------|-------|
| `DCP_JWT_SECRET` | `api-server.js` | **Dev-safe** | Defaults to `'dev-secret-change-in-production'` |
| `MCP_STDIO` | `mcp-server.js` | **Dev-safe** | Boolean flag, defaults false |
| `DCP_MCP_SERVER` | `mcp-server.js` | **Dev-safe** | Set internally, not user-provided |
| `DCP_REGISTRY_TOKEN` | `mcp-server.js`, `dcp-add-v2.js`, `registry/add.js` | **Mock-safe** | Registry auth token; optional for local use |
| `OPENAI_API_KEY` | `llmEnrichment.js` | **Dashboard-only** | Optional LLM enrichment feature |
| `DCP_UNSAFE_CSS_EVAL` | `cssInJs.js` | **Dev-safe** | Opt-in unsafe eval flag |
| `AWS_ACCESS_KEY_ID` | `publish-static.js` | **Dashboard-only** | Only for S3 publish command |
| `AWS_SECRET_ACCESS_KEY` | `publish-static.js` | **Dashboard-only** | Only for S3 publish command |
| `GITHUB_ACTIONS` | `publish-static.js` | **Dev-safe** | CI detection flag |
| `GITHUB_TOKEN` | `publish-static.js` | **Dashboard-only** | Only for GitHub Pages publish |
| `JEST_VERBOSE` | `tests/unit/setup.js` | **Dev-safe** | Test verbosity flag |

### Example Projects (NOT part of DCP toolkit — in `docs/examples/`)

These are **separate projects** included as documentation examples. They have their own dependencies (Supabase, PostHog, Slack, AWS Comprehend, Figma API, etc.) but are NOT required for DCP build/test/demo.

| Project | Env vars | Risk |
|---------|----------|------|
| `sds-figma/` | `FIGMA_ACCESS_TOKEN`, `FIGMA_FILE_KEY` | Contained — separate project |
| `roster/` | `DATABASE_URL`, `SUPABASE_SERVICE_ROLE`, `SLACK_TOKEN`, `AWS_*`, `LLAMA_CLOUD_API_KEY`, `NEXT_PUBLIC_*` | Contained — separate project |

## 4. External Service Dependencies

### Core DCP Toolkit
| Service | Usage | Required for build/test? |
|---------|-------|--------------------------|
| **OpenAI API** | Optional LLM enrichment (`llmEnrichment.js`) | No |
| **AWS S3** | Optional static publish (`publish-static.js`) | No |
| **GitHub API** | Optional GitHub Pages publish | No |
| **Figma API** | Used in example scripts, not core | No |

**Key finding: DCP toolkit has NO required external services for build, test, or demo.** It is a CLI tool that processes local files. All external integrations are optional features.

## 5. Existing Infrastructure

| Item | Status |
|------|--------|
| Docker | None |
| CI | GitHub Actions — `.github/workflows/tests.yml` (Node 18.x, 20.x matrix) |
| Bootstrap scripts | None |
| Test framework | Jest with `--experimental-vm-modules` |
| E2E tests | None |
| Seed data | Registry fixtures in `registry/` directory |

## 6. Risk Assessment

**Overall risk: LOW**

DCP-Transformer is an excellent candidate for cloud agents because:
1. No database required
2. No external services required for core functionality
3. No secrets needed for build/test
4. Pure Node.js — no native dependencies or Docker requirements
5. Existing CI already runs clean with just `npm ci && npm test`

### Gaps to Address

1. **No `.nvmrc`** — agents may use wrong Node version
2. **No bootstrap script** — agent must know to run `npm ci` at root
3. **No `.env.agent.example`** — no env template for agents
4. **ESM test invocation** — requires `--experimental-vm-modules` flag (unusual)
5. **No env validation** — no guard against accidentally leaking secrets
6. **`docs/examples/` contains heavy projects** — agents might try to install their deps too
