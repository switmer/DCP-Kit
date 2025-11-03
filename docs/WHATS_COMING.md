# What's Coming: Roadmap & Incomplete Features

**Last Updated:** January 2025  
**DCP Version:** 2.0.1

This document provides an honest assessment of incomplete features, planned improvements, and timeline estimates for DCP-Transformer.

---

## Current Status Overview

**Production Ready:** ~75-80%  
**In Progress:** ~15-20%  
**Planned:** ~5-10%

---

## Partially Implemented Features

### Agent Mode - Infrastructure Only

**Status:** ⚠️ Partial - CLI accepts prompts, but NO LLM integration

**What Works:**
- ✅ CLI command accepts natural language prompts
- ✅ Prompt parsing and pattern matching
- ✅ Mutation plan generation infrastructure
- ✅ File structure and organization

**What's Missing:**
- ❌ Actual LLM API integration (OpenAI/Claude/Anthropic)
- ❌ Real intent understanding (currently rule-based pattern matching)
- ❌ Returns mock/stub responses
- ❌ Confidence scoring for LLM suggestions

**Files:**
- `src/commands/agent.js` - Command implementation
- `src/core/dcpAgent.js` - Agent infrastructure (882 lines)

**Timeline:** Q2 2025  
**Priority:** Medium

**Todo:**
- [ ] Integrate OpenAI API for prompt understanding
- [ ] Add Claude/Anthropic API support
- [ ] Implement real mutation planning with LLM
- [ ] Add confidence scoring for LLM suggestions
- [ ] Error handling for API failures
- [ ] Rate limiting and cost management

---

### Vue/Svelte Support - Stub Only

**Status:** ⚠️ Partial - Adaptor system exists, but implementations incomplete

**What Works:**
- ✅ Adaptor registry framework
- ✅ Vue SFC adaptor registered (stub)
- ✅ Basic file detection

**What's Missing:**
- ❌ Vue template parsing (only script props work)
- ❌ Svelte component extraction (not started)
- ❌ Template/JSX analysis for Vue
- ❌ Slot detection for Vue components
- ❌ Vue composition API support

**Files:**
- `src/adaptors/registry.js` - Adaptor system
- Vue adaptor: Not found (stub only)

**Timeline:** Q3 2025  
**Priority:** Medium

**Todo:**
- [ ] Implement Vue SFC template parser
- [ ] Add Svelte component adaptor
- [ ] Template → component metadata extraction
- [ ] Slot detection for Vue components
- [ ] Vue 3 Composition API support
- [ ] Test with real Vue/Svelte codebases

---

### CSS-in-JS Extraction - Partial

**Status:** ⚠️ Partial - Detection works, full extraction incomplete

**What Works:**
- ✅ CSS-in-JS library detection
- ✅ Basic styled-components/emotion detection
- ✅ Detection logging

**What's Missing:**
- ❌ Full AST visitor for CSS-in-JS
- ❌ Dynamic theme computation
- ❌ Runtime style extraction
- ❌ Template literal style parsing
- ❌ styled-components props extraction
- ❌ Emotion theme references

**Files:**
- `src/core/cssInJs.js` - Detection and basic extraction

**Timeline:** Q2 2025  
**Priority:** Medium

**Todo:**
- [ ] Implement Babel visitor for styled-components
- [ ] Add emotion CSS-in-JS extraction
- [ ] Handle dynamic theme references
- [ ] Extract runtime-computed styles
- [ ] Template literal parsing
- [ ] Theme context integration

---

### Transpilation - Framework Exists, Templates Basic

**Status:** ⚠️ Partial - Transpiler class exists, templates need work

**What Works:**
- ✅ Transpiler framework architecture
- ✅ React output generation (basic)
- ✅ Code structure generation

**What's Missing:**
- ❌ Production-ready React templates
- ❌ CVA integration in templates
- ❌ Vue transpilation (throws "not implemented" error)
- ❌ Svelte transpilation (throws "not implemented" error)
- ❌ Framework-specific optimizations
- ❌ Template customization options

**Files:**
- `src/commands/transpile.js` - Transpiler implementation
- Lines 682, 686: Vue/Svelte throw "not implemented" errors

**Timeline:** Q2 2025  
**Priority:** Low-Medium

**Todo:**
- [ ] Enhance React template generation
- [ ] Add CVA variant integration
- [ ] Implement Vue transpilation
- [ ] Implement Svelte transpilation
- [ ] Add template customization options
- [ ] Framework-specific optimizations

---

### Advanced TypeScript Features - Limited

**Status:** ⚠️ Partial - Common cases work, edge cases don't

**What Works:**
- ✅ Basic interface resolution
- ✅ Union types → enums
- ✅ Cross-file imports (simple cases)
- ✅ Required/optional detection
- ✅ Generic types (basic)

**What's Missing:**
- ❌ Declaration merging
- ❌ Module augmentation
- ❌ Complex path mapping (advanced tsconfig)
- ❌ Monorepo cross-package resolution
- ❌ Conditional types (currently flattened)
- ❌ Mapped types (simplified to object)
- ❌ Template literal types

**Files:**
- `src/extractors/tsMorphExtractor.js` - TypeScript extraction

**Timeline:** Q3-Q4 2025  
**Priority:** Low (affects edge cases)

**Todo:**
- [ ] Add declaration merging support
- [ ] Implement module augmentation detection
- [ ] Enhance path resolution for monorepos
- [ ] Better handling of advanced TypeScript features
- [ ] Conditional type preservation
- [ ] Mapped type extraction

---

### API Server Endpoints - Partial

**Status:** ⚠️ Partial - Core endpoints work, advanced features stubbed

**What Works:**
- ✅ GET registry endpoints
- ✅ Query endpoints
- ✅ Validation endpoints
- ✅ Health checks
- ✅ OpenAPI specification

**What's Missing:**
- ❌ `/api/v1/preview` - Returns 501 Not Implemented
- ❌ `/api/v1/mutate` - Returns 501 Not Implemented
- ❌ `/api/v1/analyze` - Stub exists, needs implementation
- ❌ `/api/v1/usage-analytics` - Stub exists, needs implementation

**Files:**
- `src/api-server.js` - Lines 758-860 have stubbed endpoints

**Timeline:** Q1 2025  
**Priority:** High

**Todo:**
- [ ] Implement mutation preview endpoint
- [ ] Implement mutation application endpoint
- [ ] Add usage analytics collection
- [ ] Implement analysis endpoint
- [ ] Add endpoint tests
- [ ] Update OpenAPI spec

---

### MCP Export Optimization - Basic Works, Optimization Partial

**Status:** ⚠️ Partial - Export works, but optimization is basic

**What Works:**
- ✅ Basic MCP export format
- ✅ Chunking for token limits
- ✅ Component indexing
- ✅ Basic optimization

**What's Missing:**
- ❌ Model-specific optimizations (Claude vs GPT-4)
- ❌ Advanced token optimization algorithms
- ❌ Context-aware chunking strategies
- ❌ Token deduplication
- ❌ Compression strategies

**Files:**
- `src/commands/export-mcp.js` - Export implementation (550 lines)

**Timeline:** Q1-Q2 2025  
**Priority:** Medium

**Todo:**
- [ ] Add Claude-specific optimizations
- [ ] Add GPT-4 specific optimizations
- [ ] Implement token optimization algorithms
- [ ] Add chunking strategy selection
- [ ] Token deduplication
- [ ] Compression for large exports

---

## Not Started Features

### Visual Diff/Preview - Not Started

**Status:** ❌ Not Started

**What's Missing:**
- ❌ Screenshot infrastructure
- ❌ Visual comparison engine
- ❌ Chromatic/Percy integration
- ❌ Before/after preview generation
- ❌ Diff visualization
- ❌ Change detection

**Timeline:** Q3 2025  
**Priority:** Low

**Research Needed:**
- Screenshot libraries (Puppeteer, Playwright)
- Visual diff algorithms
- Integration with Chromatic/Percy
- Performance considerations

**Todo:**
- [ ] Research screenshot libraries
- [ ] Add screenshot capture capability
- [ ] Integrate with Chromatic or Percy
- [ ] Build preview generation pipeline
- [ ] Add diff visualization
- [ ] Performance optimization

---

### Federation - Not Started

**Status:** ❌ Not Started

**What's Missing:**
- ❌ Multi-registry support
- ❌ Graph merging algorithms
- ❌ Conflict resolution
- ❌ Registry composition
- ❌ Namespace management
- ❌ Version management

**Timeline:** Q4 2025  
**Priority:** Low

**Design Needed:**
- Federation architecture
- Conflict resolution strategies
- Namespace conventions
- Version compatibility

**Todo:**
- [ ] Design federation architecture
- [ ] Implement registry merging
- [ ] Add conflict resolution
- [ ] Build composition APIs
- [ ] Namespace management
- [ ] Version compatibility checking

---

## Timeline Estimates

### Q1 2025 (Jan-Mar)
- ✅ Complete API server endpoints
- ✅ Enhance MCP export optimization
- ✅ Improve transpilation templates
- ✅ Storybook addon testing

### Q2 2025 (Apr-Jun)
- ✅ Agent mode LLM integration
- ✅ CSS-in-JS full extraction
- ✅ Enhanced TypeScript support (basic)

### Q3 2025 (Jul-Sep)
- ✅ Vue/Svelte adaptors
- ✅ Visual diff/preview (research phase)
- ✅ Advanced TypeScript features

### Q4 2025 (Oct-Dec)
- ✅ Federation architecture design
- ✅ Visual diff/preview implementation
- ✅ Advanced features polish

---

## Contribution Guidelines

### How to Contribute

We welcome contributions! Here's how to get started:

1. **Check Issues**: Look for issues labeled "good first issue" or "help wanted"
2. **Pick a Feature**: Choose from the roadmap above
3. **Fork & Branch**: Create a feature branch
4. **Implement**: Follow existing code patterns
5. **Test**: Add tests for new features
6. **Document**: Update relevant documentation
7. **Submit PR**: Create pull request with description

### Code Standards

- **TypeScript**: Use TypeScript for new code when possible
- **Tests**: Add tests for new features
- **Documentation**: Update docs for user-facing changes
- **Error Handling**: Use proper error handling patterns
- **Performance**: Consider performance implications

### Areas Needing Help

**High Priority:**
- API endpoint implementations
- MCP export optimization
- CSS-in-JS extraction

**Medium Priority:**
- Vue/Svelte adaptors
- Agent mode LLM integration
- Transpilation templates

**Low Priority:**
- Visual diff/preview
- Federation
- Advanced TypeScript features

---

## Known Limitations

### Current Limitations

1. **Framework Support**: Only React/TypeScript is production-ready
2. **CSS-in-JS**: Detection works, full extraction incomplete
3. **TypeScript**: Advanced features not fully supported
4. **Agent Mode**: No real LLM integration yet
5. **Visual Diff**: Not implemented
6. **Federation**: Not implemented

### Workarounds

- **Vue/Svelte**: Use React adaptor as reference, adapt as needed
- **CSS-in-JS**: Extract manually or use CSS variable approach
- **Advanced TypeScript**: Simplify types or use JSDoc comments
- **Agent Mode**: Use mutation planning manually
- **Visual Diff**: Use external tools (Chromatic, Percy)
- **Federation**: Use single registry for now

---

## Feature Requests

### Request a Feature

To request a new feature:

1. **Check Existing Issues**: Search GitHub issues first
2. **Create Issue**: Use the "Feature Request" template
3. **Describe Use Case**: Explain why you need it
4. **Provide Examples**: Show how you'd use it

### Prioritization

Features are prioritized based on:
- **User Demand**: How many users need it
- **Complexity**: Implementation difficulty
- **Dependencies**: Blocking other features
- **Alignment**: Fits project goals

---

## Questions?

For questions about the roadmap or incomplete features:

- **GitHub Discussions**: [Start a discussion](https://github.com/stevewitmer/dcp-transformer/discussions)
- **GitHub Issues**: [Create an issue](https://github.com/stevewitmer/dcp-transformer/issues)
- **Documentation**: See `/docs` directory

**Version:** 2.0.1  
**Last Updated:** January 2025

