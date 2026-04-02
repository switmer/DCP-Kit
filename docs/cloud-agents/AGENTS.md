# Cloud Agent Setup — DCP-Transformer

## Quick Start

```bash
./scripts/agent/bootstrap   # Install deps, set up env, verify CLI
./scripts/agent/verify       # Run tests + build + smoke test
./scripts/agent/demo         # Validate registry, query components, write artifacts
```

## Environment

Agent environments use `.env.agent.example` as their template.

### Provided by template (safe to include)

| Variable | Purpose |
|----------|---------|
| `AGENT_MODE=true` | Signals agent execution context |
| `DCP_JWT_SECRET` | Dev-only JWT secret for local API server |
| `MCP_STDIO` | MCP transport flag |
| `DCP_MCP_SERVER` | MCP server mode flag |
| `DCP_UNSAFE_CSS_EVAL` | CSS eval opt-in (disabled) |
| `DCP_REGISTRY_TOKEN` | Registry auth (empty = local mode) |

### Set in cloud agent dashboard (if needed)

| Variable | Only needed for |
|----------|-----------------|
| `OPENAI_API_KEY` | `dcp extract --enrich` (LLM enrichment) |
| `AWS_ACCESS_KEY_ID` | `dcp registry publish --target s3` |
| `AWS_SECRET_ACCESS_KEY` | `dcp registry publish --target s3` |
| `GITHUB_TOKEN` | `dcp registry publish --target github-pages` |

### Never include

| Variable | Reason |
|----------|--------|
| Any `*_PROD_*` key | Production credentials |
| `SUPABASE_SERVICE_ROLE` | Only in example projects, not DCP core |
| `STRIPE_SECRET_KEY` | Only in example projects, not DCP core |

## Agent Mode

DCP-Transformer is a CLI tool that processes local files. It has **no required external services** for build, test, or core functionality. This means:

- **No mocking needed** — core extraction, validation, query, and build commands work entirely offline
- **OpenAI enrichment** — automatically skipped when `OPENAI_API_KEY` is not set
- **API server** — uses dev-safe defaults (localhost, dev JWT secret)
- **Publish commands** — fail gracefully when cloud credentials are absent

The `AGENT_MODE=true` flag is set in the env template for future use and to signal to any downstream tools that the environment is agent-controlled.

## Network Requirements

**Minimal.** Only `npm ci` requires network access (to install dependencies). All core DCP commands work offline after installation.

Optional network access for:
- `dcp extract --enrich` (OpenAI API)
- `dcp registry publish` (AWS S3 or GitHub Pages)

## Test Execution

Tests require the `--experimental-vm-modules` flag due to pure ESM:

```bash
cd packages/dcp-toolkit
node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --no-coverage
```

The `scripts/agent/verify` script handles this automatically.

## Important Notes

- **`docs/examples/`** contains separate projects (roster, sds-figma) with their own heavy dependencies. Agents should NOT install or build these — they are documentation examples only.
- **Monorepo structure** — always run `npm ci` from the root, not from `packages/dcp-toolkit/`.
- **Node >= 18** required (ESM + experimental VM modules).

## Limitations

- Some test suites require unimplemented features and will fail (mutation, security audit, agent modes, demo rendering)
- Storybook requires peer dependencies (react, react-dom) which are dev-only
- No E2E test suite exists
