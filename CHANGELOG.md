# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-11-03

### 🚀 Major Features

#### Component Installer (`dcp-add` v2) - NEW!
- **Zero-Fetch Installation**: Single HTTP request downloads everything
- **File:// Support**: Install from local packs (`./dist/packs/r/ui/button`)
- **SHA1 Content-Addressing**: Reliable blob downloads from `/blobs/:hash`
- **ShadCN Convention**: Auto-detects `components.json` for target directory
- **Registry Formats**: `shadcn` (group by component) or `raw` (mirror structure)
- **Multi-PM Support**: Auto-detects npm, pnpm, yarn, or bun from lockfiles
- **Overwrite Policies**: `skip`, `prompt`, or `force` for file conflicts
- **Authentication**: Bearer token support for private registries
- **Dry-Run Mode**: Preview installation without writing files

#### Multi-Registry Support (Breaking Change)
- **MCP Server v3.0**: Completely redesigned architecture
  - Registry path now **optional** - auto-detects from CWD
  - Accept `registryPath` parameter on every tool call
  - Work with multiple projects without restarting Claude Desktop
  - LRU cache for up to 10 registries simultaneously
  - Per-registry hot-reload watchers

#### Registry Auto-Detection
- Searches: CWD, `./registry`, `../registry`, default path
- No configuration needed for standard project structures
- Falls back gracefully with helpful error messages

### ✨ Improvements

#### Extraction Accuracy
- **Props counting fixed**: Now correctly counts props as objects (92.7% coverage!)
- **Framework detection fixed**: Now correctly displays Next.js, React, etc.
- **Project intelligence**: Scans project root instead of source path for better detection

#### Component Search
- Case-insensitive matching
- Partial name matching
- Better error messages with suggestions
- Shows total components and "did you mean?" suggestions

#### Registry Cache
- Intelligent LRU caching (max 10 registries)
- Per-registry file watchers with hot-reload
- No performance penalty for multi-project workflows

### 🐛 Bug Fixes
- **CRITICAL: Fixed MCP `dcp_add_component` tool crash**
  - Error: `installer.install is not a function`
  - Root cause: Was importing old `dcp-add.js` instead of `dcp-add-v2.js`
  - Fixed parameter mapping to v2 installer options
  - Now uses `overwrite` policy instead of legacy `force` flag
- **CRITICAL: Fixed pack format mismatch between `build-packs` and `dcp-add`**
  - Error: `Invalid pack: missing files[]`
  - Root cause: `build-packs` was generating `files` as object, installer expected array
  - Fixed `build-packs` to generate DCP-compliant file arrays with `path`, `type`, `sha1`, `size`
  - Fixed `storeBlob` to return metadata object instead of just URL string
  - Fixed `dcp-add-v2` to extract extension from `path` when downloading SHA1 blobs
- **CRITICAL: Fixed `serve-registry` to handle new file array format**
  - Error: `filePath.startsWith is not a function`
  - Root cause: Server was treating `meta.files` as object after format change to array
  - Fixed server to use file arrays directly (no transformation needed)
  - Fixed duplicate baseUrl bug in `registryUrl` (was prepending to already-absolute URL)
  - Added explicit `blobsBaseUrl` to response for installer
- **CRITICAL: Fixed MCP server props handling** - Props are objects in DCP spec, not arrays
  - `dcp_get_component` now correctly filters required/optional props
  - `validatePropsInCode` now correctly extracts valid prop names
  - `suggestPropAlternatives` now correctly suggests prop alternatives
  - `generateComponentExamples` now correctly generates example code
- **Fixed component name matching** - Prioritizes exact matches over fuzzy matches
  - Searching for "Button" now returns "Button", not "UploadHistoricalButton"
  - Two-pass search: exact match first, then fuzzy/partial match as fallback
- Fixed props counting showing 0% (props are objects, not arrays)
- Fixed framework detection showing "unknown" (wrong object path)
- Fixed project intelligence scanning wrong directory
- Fixed registry auto-reload after extraction
- Added detection for misplaced registry files (e.g., in `tokens/` dir)

### 📚 Documentation
- Updated Claude Desktop setup guide for v3.0
- Added multi-registry usage examples
- Documented auto-detection behavior
- Added troubleshooting for common issues

### 💥 Breaking Changes
- MCP Server CLI now optional registry path: `dcp-mcp [registryPath]`
- Tools now accept `registryPath` parameter (optional, auto-detects if not provided)
- Server no longer bound to single registry at startup

---

## [1.2.0] - 2024-05-20

### Added
- Enhanced test coverage implementation
- Improved token usage tracking

### Changed
- Improved OpenAI client mocking in tests
- Better handling of component description enrichment
- Updated path resolution to be relative to config file

### Fixed
- Fixed flattenTokens functionality
- Resolved issue with path resolution in build process
- Ensured enrichmentMeta is always attached with correct fieldsAdded count
- Fixed component merging logic for LLM data
- Corrected build process to handle both componentSource and components config keys

## [1.1.0] - 2024-03-08

### Added
- MCP compatibility layer for AI agent integration
- JSON-RPC endpoints for component/token queries
- Preview UI via `/browse` endpoint
- LLM enrichment capabilities
- Token coverage reporting
- Registry comparison tools
- S3 publishing support

### Changed
- Improved error handling and logging
- Updated all dependencies to latest versions
- Enhanced test coverage and fixtures

### Fixed
- Schema validation for nested token references
- Component analysis edge cases
- Registry versioning conflicts

## [1.0.0] - 2024-02-15

### Added
- Initial release
- Basic DCP transformation capabilities
- Component and token analysis
- Schema validation 