# 🌐 Design-System MCP Server Generator

> Draft specification and rollout plan for automatically creating Model-Context-Protocol (MCP) servers for any public design-system – starting with the catalog on [designsystems.surf](https://designsystems.surf/design-systems).

---

## 0 · Why this? (Problem & Opportunity)

| Pain Point | Impact |
|------------|--------|
| Every design-system ships its *own* docs site / Storybook / Figma file—AI agents can’t consume them in a uniform way. | Hard for LLMs & tools to answer “What props does Uber `Button` accept?” |
| Manually hand-wiring an MCP server for each system ≈ 2–3 h x 500+ systems | Impractical, inconsistent quality |
| Designers & devs want cross-system comparisons, automated code-gen, drift analysis | Needs a machine-readable interface |  

**Goal:** 1 command → 1 ready-to-publish MCP package per design-system.

---

## 1 · High-Level Vision

```
dcp generate-mcp --system shopify-polaris
# → packages/@shopify/polaris-mcp/  (tools, manifest, README)
npm publish @shopify/polaris-mcp
```

* **Universal interface** – every design-system exposes the same baseline tools (`query_tokens`, `get_component`, …).
* **Pluggable extractors** – Storybook, GitHub source, Figma API, design-token JSON.
* **CI pipeline** – nightly regenerate & publish if upstream changes.

---

## 2 · Architecture Overview

```mermaid
flowchart LR
    subgraph Source
      A[designsystems.surf index] --> B{System
      classifier}
    end
    B -->|Docs-based| D[📄 Docs scraper]
    B -->|Storybook| E[📘 Storybook API]
    B -->|npm pkg|    F[📦 Package analyser]
    B -->|Figma|      G[🎨 Figma extractor]

    D & E & F & G --> H[Component & Token
    normaliser]
    H --> I[MCP Server template
    + Tool registry]
    I --> J[Generated MCP
    (npm package)]
```

* **Extractor layer** – converts heterogeneous inputs → `registry.json`.  
* **Normaliser** – maps tokens → DTCG, props/variants → DCP schema.  
* **Generator** – fills an MCP server template with registry + universal tools.

---

## 3 · Implementation Phases

| Phase | Timeline | Deliverable |
|-------|----------|-------------|
| 1. **PoC Big 3** | 2 weeks | Material Design, Shopify Polaris, GitHub Primer MCPs |
| 2. **Pipeline MVP** | +2 weeks | `dcp generate-mcp` CLI; Storybook + GitHub extractors |
| 3. **Scale 50 systems** | +4 weeks | Nightly GitHub Action; publishes top-50 packages |
| 4. **Community & UI** | +4 weeks | Web UI for one-click generation; contribution guide |

---

## 4 · Universal Tool Set (v 0.1)

| Tool | Purpose |
|------|---------|
| `dcp_query_tokens` | Filter tokens by name/category (wildcards) |
| `dcp_get_component` | Return full component schema inc. props & variants |
| `dcp_generate_usage` | Produce canonical code snippet for given variant set |
| `dcp_compare_variants` | Diff two variants (e.g. `primary` vs `secondary`) |
| `dcp_check_accessibility` | Axe-run on example markup |

System-specific tools can be appended by the generator (e.g. `polaris_app_bridge`).

---

## 5 · CLI Surface

```bash
# Analyse URL & generate registry.json only
dcp analyse-system https://designsystems.surf/design-systems/uber \
  --out ./uber-registry

# Full MCP generation & publish
dcp generate-mcp --system uber --publish
```

Flags:
* `--system` slug or URL from designsystems.surf
* `--out` output dir (default `packages/{slug}-mcp`)
* `--publish` npm publish after build
* `--extractors` override default extractor list

---

## 6 · Open Questions / Risks

1. **Licensing** – some design-system code is MIT, others custom licenses; confirm redistribution terms.  
2. **Version tracking** – how to detect upstream changes (git tags, docs RSS, npm versions).  
3. **Token normalisation edge-cases** – non-DTCG token files (YAML, SCSS maps).  
4. **Figma rate-limits** – mass extraction may hit API quotas.  
5. **Package namespace** – use scoped packages (`@system/mcp`) to avoid name collisions.

---

## 7 · Next Actions

1. Scaffold `packages/dcp-mcp-generator/` workspace package.  
2. Implement Storybook extractor (fetch `/iframe.html?viewMode=docs` JSON).  
3. Hard-code Material Design → validate registry output.  
4. Generate first MCP, test with Claude (`add-mcp @material/mcp`).  
5. Draft license matrix for top-50 systems.

---

## 8 · Self-Serve Landing Page — “Get your MCP server”

A marketing/developer-onboarding page that turns *any* public design-system repo or docs URL into a ready-to-install MCP package in <60 seconds.

### UX Flow (Happy Path)

1. **Input step** – user pastes:
   * GitHub repo (`https://github.com/org/design-system`), **or**
   * Storybook URL (`https://ds-site.com/storybook/`), **or**
   * Uploads a zip/folder containing `tokens/` + `components/`.
2. **System classification** – backend picks extractor(s) → shows preview of detected components & tokens.
3. **Click “Generate MCP”** – triggers `dcp generate-mcp --system {slug}` under the hood.
4. **Result page**
   * Success badge ✅
   * `npm install @yourorg/design-system-mcp` snippet
   * “Open in Claude” deep-link (`claude://add-mcp?package=@yourorg/design-system-mcp`).
   * Web download option (`.tgz` bundle) for offline use.
5. **Optional publish** – authenticated users can `npm publish` straight from UI using linked GitHub/NPM token.

### API Endpoints (proposed)

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| `POST` | `/analyse` | `{ sourceUrl: string }` | Runs extractor classification, returns preview JSON |
| `POST` | `/generate` | `{ sourceUrl, publish?: bool }` | Kicks off MCP generation & returns pkg name |
| `GET` | `/status/{jobId}` | – | Check progress (queued → extracting → building → success/error) |
| `GET` | `/download/{pkg}.tgz` | – | Download tarball if publish=false |

### Tech Notes

* **Queue** – generation can be heavy; use a worker queue (BullMQ) so the landing page stays snappy.
* **Caching** – hash of repo commit SHA → skip rebuild if unchanged.
* **Auth** – anonymous users get local download only; logged-in users can auto-publish under their NPM scope.
* **Cost control** – limit extract time (e.g., 180 s) and output size ( <50 MB) per job.

### Why it matters

* Drops the barrier to entry for design-system maintainers—no local install needed.
* Generates social buzz: “Paste your repo, get an AI-ready interface instantly.”
* Funnels more registries into the DCP ecosystem, improving coverage for agent workflows.

---

*Maintainer: `@stevewitmer`*  ·  *Last updated: <!-- DATE -->* 