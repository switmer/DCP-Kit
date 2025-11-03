# DCP CLI Rationalization Plan

## 🎯 Current State
- **30+ Commands** scattered across main CLI 
- **1,400+ line** single CLI file
- Commands lack clear organization and hierarchy
- No deprecation strategy for experimental features

## 🏗️ New CLI Architecture

### Tier 1: Core Commands (Essential Workflow)
**Primary user journey - these stay at top level**

```bash
dcp extract <source>        # Extract components [KEEP]
dcp validate [path]         # Validate project [KEEP] 
dcp build                   # Build registry [KEEP]
dcp query <selector>        # Query registry [KEEP]
```

### Tier 2: Command Groups (Organized by Domain)

#### Registry Management
```bash
dcp registry generate <source>     # Generate ShadCN registry [MOVE: registry generate → registry generate]
dcp registry item <component>      # Single registry item [MOVE: registry item → registry item]  
dcp registry build-packs <registry>   # Build packages [MOVE: build-packs → registry build-packs]
dcp registry serve <packs-dir>      # Serve registry [MOVE: serve-registry → registry serve]
dcp registry publish <packs-dir>    # Publish to static [MOVE: publish-static → registry publish]
dcp registry add <component-url>    # Install components [MOVE: add → registry add]
dcp registry validate <registry>    # Validate registry [MOVE: validate-registry → registry validate]
```

#### Token Commands  
```bash
dcp tokens extract-radix [source]   # Extract Radix [MOVE: radix-tokens → tokens extract-radix]
dcp tokens export <registry>        # Export DTCG [MOVE: export-tokens → tokens export]
dcp tokens import <tokens>          # Import DTCG [MOVE: import-tokens → tokens import]  
dcp tokens build-assets [tokens]    # Generate CSS [MOVE: build-assets → tokens build-assets]
```

#### Workflow & Mutations
```bash
dcp workflow mutate <registry> <patch> <output>  # Apply patches [MOVE: mutate → workflow mutate]
dcp workflow rollback <registry> <undo>          # Rollback [MOVE: rollback → workflow rollback]
dcp workflow diff <from> <to>                    # Compare [MOVE: diff → workflow diff] 
dcp workflow agent <prompt>                      # AI mutations [MOVE: agent → workflow agent]
```

#### Development Tools
```bash
dcp dev watch <source>             # Watch changes [MOVE: watch → dev watch]
dcp dev transpile <registry>       # Transpile [MOVE: transpile → dev transpile]
dcp dev validate-ci <source>       # CI validation [MOVE: validate-ci → dev validate-ci]
dcp dev demo <demo-file>           # Demo processing [MOVE: demo → dev demo]
dcp dev docs <source>              # Generate docs [MOVE: docs → dev docs]
dcp dev api                        # API server [MOVE: api → dev api]
dcp dev companion                  # Companion [MOVE: companion → dev companion]
```

#### Export & Integration
```bash
dcp export mcp <registry>          # MCP export [MOVE: export-mcp → export mcp]
dcp export adaptors                # List adaptors [MOVE: adaptors → export adaptors]
```

### Tier 3: Deprecated Commands (With Warnings)
Commands to deprecate with migration guidance:

```bash
# Legacy extract commands - redirect to main extract
dcp extract-v2 → "⚠️  DEPRECATED: Use 'dcp extract' instead"
dcp extract-v3 → "⚠️  DEPRECATED: Use 'dcp extract' instead"  
dcp extract-legacy → "⚠️  DEPRECATED: Use 'dcp extract' instead"
```

## 🔄 Migration Strategy

### Phase 1: Add Grouped Commands (Backward Compatible)
- Add new grouped command structure
- Keep existing commands working 
- Add deprecation warnings to old commands

### Phase 2: Update Documentation & Examples
- Update all examples to use new command structure
- Update help text to guide users to new commands
- Add migration guide

### Phase 3: Remove Deprecated Commands (Breaking Change)
- Remove old commands in next major version
- Provide clear error messages with migration paths

## 📊 Benefits

### Before (Current)
```
❌ 30+ top-level commands
❌ No organization or hierarchy  
❌ Duplicate functionality
❌ Hard to discover related commands
❌ Massive single CLI file
```

### After (Rationalized)
```
✅ 4 core commands + 5 command groups
✅ Clear hierarchy and organization
✅ Consolidated functionality  
✅ Discoverable grouped commands
✅ Maintainable modular structure
```

## 🚀 Implementation Plan

1. **Create Command Group Files**
   - `src/cli/registry.js` - Registry management commands
   - `src/cli/tokens.js` - Token-related commands
   - `src/cli/workflow.js` - Mutation workflow commands
   - `src/cli/dev.js` - Development tool commands
   - `src/cli/export.js` - Export and integration commands

2. **Add Deprecation Warnings**
   - Add `@deprecated` JSDoc tags
   - Add console warnings for old commands
   - Provide migration guidance

3. **Update Main CLI**
   - Reorganize bin/dcp.js to use command groups
   - Add improved help text and examples
   - Update error messages

4. **Documentation Updates**
   - Update README examples
   - Update help text
   - Create migration guide

## 🎯 Success Metrics

- **Reduced complexity**: 30+ commands → 4 core + 5 groups
- **Better UX**: Organized, discoverable commands
- **Maintainability**: Modular CLI structure
- **Migration path**: Clear deprecation warnings
- **Documentation**: Updated examples and guides

This rationalization transforms DCP from a confusing 30+ command CLI into a well-organized, hierarchical command structure that's easier to learn, use, and maintain.