# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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