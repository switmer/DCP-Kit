# DCP Repository Reorganization Plan

## 🎯 **Objective**
Transform the current chaotic repository structure into a clean, professional, and maintainable codebase ready for v2.0 release.

## 📊 **Current Issues**
- **40+ top-level items** (should be ~15)
- **Test artifacts scattered** (`test-*`, `*-output/`, `*-test/`)
- **Temporary files committed** (`api.log`, `--verbose.txt`, `temp-*`)
- **Mixed concerns** (development, production, testing all mixed)
- **Documentation fragmented** across multiple locations
- **No clear module boundaries**

## 🏗️ **Target Structure**

```
DCP-Transformer/
├── 📁 src/                          # 🚀 Core source code
│   ├── adaptors/                   # Framework adaptors (moved from root)
│   ├── api/                        # API server code (reorganized)
│   ├── commands/                   # CLI commands (cleaned up)
│   ├── core/                       # Core extraction logic
│   └── lib/                        # Public library exports
│
├── 📁 integrations/                # 🔌 Platform integrations
│   ├── github-action/              # GitHub Action (new)
│   ├── vscode-dcp/                 # VS Code extension (cleaned)
│   ├── figma-dcp/                  # Figma plugin (cleaned)
│   └── chrome-extension/           # Chrome extension (renamed)
│
├── 📁 tests/                       # ✅ All test files
│   ├── unit/                       # Unit tests (reorganized)
│   ├── integration/                # Integration tests
│   ├── fixtures/                   # Test fixtures (consolidated)
│   └── outputs/                    # Test outputs (gitignored)
│
├── 📁 docs/                        # 📚 Documentation
│   ├── api/                        # API documentation
│   ├── guides/                     # User guides
│   ├── examples/                   # Example projects
│   └── development/                # Development docs
│
├── 📁 schemas/                     # 📋 JSON schemas (cleaned)
├── 📁 templates/                   # 🎨 Code generation templates
├── 📁 scripts/                     # 🔧 Build/dev scripts
│
├── 📁 .github/                     # 🤖 GitHub workflows
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── dcp-validate.yml        # Our GitHub Action example
│
├── 📁 dist/                        # 📦 Built artifacts (gitignored)
├── 📁 coverage/                    # 📊 Test coverage (gitignored)
├── 📁 node_modules/                # 📚 Dependencies (gitignored)
│
├── 📄 package.json                 # 📦 Project config
├── 📄 tsconfig.json                # 🔧 TypeScript config
├── 📄 jest.config.js               # 🧪 Test config
├── 📄 README.md                    # 📝 Main readme
├── 📄 CHANGELOG.md                 # 📋 Version history
├── 📄 LICENSE                      # ⚖️ License
├── 📄 CLAUDE.md                    # 🤖 AI instructions
└── 📄 .gitignore                   # 🚫 Git ignore rules
```

## 🗑️ **Files to Delete** (Safe to remove)

### **Temporary/Log Files**
- `api.log`
- `--verbose.txt` 
- `dcp-watch*.log`
- `server.log`
- `mutations.log.jsonl`

### **Test Outputs** (Regeneratable)
- `broad-glob-test/`
- `example-test/`
- `expandable-card-output/`
- `full-pipeline-test/`
- `sds-output/`
- `storybook-components-test/`
- `test-hash-debug/`
- `test-watch-delta/`
- `transpile-output/`

### **Temporary Development Files**
- `agent-test.patch.json`
- `mutated-dcp.json`
- `mutation-plan*.json`
- `output.json`
- `patch.json`
- `temp-*.json`
- `undo.json`
- `test.json`
- `test-registry.json`

### **Old/Duplicate Files**
- `new/` (empty test directory)
- `dcp-transformer-v*.zip` (old releases)
- `example-dcp.json`
- `example-tokens.json`

## 📦 **Files to Move**

### **From Root → src/**
- `adaptors/` → `src/adaptors/`
- `commands/` → `src/commands/`
- `core/` → `src/core/`
- `api/` → `src/api/`
- `lib/` → `src/lib/`
- `bin/` → `src/bin/` (or keep at root for CLI access)

### **From Root → docs/**
- `AGENT_GUIDE.md` → `docs/guides/agent-guide.md`
- `CONTRIBUTING.md` → `docs/development/contributing.md`
- `DCP-TRANSFORMER-V2.md` → `docs/development/v2-notes.md`
- `MCP_INTEGRATION.md` → `docs/api/mcp-integration.md`
- `TSDOC-BEST-PRACTICES.md` → `docs/development/tsdoc.md`
- `docs/` → keep but organize better

### **From Root → tests/**
- `tests/` → reorganize into `tests/unit/`, `tests/integration/`
- `coverage/` → keep but ensure gitignored

### **From Root → examples/** (new directory)
- `example/` → `docs/examples/basic/`
- `roster/` → `docs/examples/roster/`
- `sds-figma/` → `docs/examples/sds-figma/`
- `test-barrels/` → `tests/fixtures/barrel-resolution/`
- `test-project/` → `tests/fixtures/simple-project/`

### **Integrations Cleanup**
- `chrome-component-grabber/` → `integrations/chrome-extension/`
- `integrations/vscode-extension/` → `integrations/vscode-dcp/` (merge)

## 🔧 **Configuration Consolidation**

### **Keep at Root**
- `package.json` ✅
- `tsconfig.json` ✅ 
- `jest.config.js` ✅
- `vite.config.js` ✅

### **Move to Config Directory**
- `simple.config.json` → `docs/examples/configs/`
- `sds.config.json` → `docs/examples/configs/`
- `claude-mcp-config.json` → `docs/examples/configs/`

## 📚 **Documentation Reorganization**

### **Root Level Docs** (Keep)
- `README.md` ✅ (main project readme)
- `CHANGELOG.md` ✅ (version history)
- `LICENSE` ✅
- `CLAUDE.md` ✅ (AI instructions)

### **Move to docs/**
```
docs/
├── guides/
│   ├── quick-start.md
│   ├── agent-guide.md (from AGENT_GUIDE.md)
│   ├── extraction.md (from EXTRACTION_CAPABILITIES.md)
│   └── integrations.md
├── api/
│   ├── rest-api.md (from API_QUICKSTART.md)
│   ├── mcp-integration.md
│   └── openapi.yaml
├── development/
│   ├── contributing.md
│   ├── architecture.md
│   ├── tsdoc.md
│   └── v2-notes.md
└── examples/
    ├── basic/
    ├── roster/
    └── configs/
```

## 🎯 **Implementation Steps**

### **Phase 1: Backup & Safety**
1. ✅ Create feature branch: `git checkout -b repo-reorganization`
2. ✅ Backup critical files
3. ✅ Update .gitignore for new structure

### **Phase 2: Structure Creation**
1. Create new directory structure
2. Move core source files to `src/`
3. Organize integrations in `integrations/`
4. Consolidate tests in `tests/`
5. Reorganize documentation in `docs/`

### **Phase 3: Cleanup**
1. Delete temporary/generated files
2. Update import paths in source files
3. Update package.json scripts and paths
4. Update CI/CD configurations
5. Update documentation links

### **Phase 4: Validation**
1. Run full test suite
2. Verify all CLI commands work
3. Test integrations
4. Validate build process
5. Update README with new structure

## 🚨 **Critical Path Dependencies**

### **Must Update After Move**
- `package.json` → "main", "bin", "exports" paths
- `tsconfig.json` → "baseUrl", "paths" mappings
- Import statements throughout codebase
- Test file paths and imports
- Documentation internal links
- CI/CD workflow paths

### **Integration Points to Test**
- CLI commands (`dcp extract`, `dcp api`, etc.)
- VS Code extension packaging
- Figma plugin build process
- GitHub Action example
- API server startup
- MCP server functionality

## ✅ **Success Metrics**

1. **≤15 top-level items** (currently 40+)
2. **All tests passing** after reorganization
3. **Clean `git status`** (no untracked files)
4. **Documentation links working**
5. **Integrations building successfully**
6. **npm scripts functional**

## 🎉 **Benefits After Reorganization**

- ✅ **Professional structure** ready for open source
- ✅ **Clear separation of concerns**
- ✅ **Easy onboarding** for new contributors
- ✅ **Simplified maintenance**
- ✅ **Better IDE support** with logical modules
- ✅ **Cleaner CI/CD** with predictable paths
- ✅ **Reduced cognitive load** when navigating codebase

---

*This reorganization will transform DCP from a development prototype into a production-ready, enterprise-grade codebase suitable for v2.0 release and community adoption.*