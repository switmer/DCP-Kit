# DCP v3.0.0 Testing Guide

> **Comprehensive testing strategy for validating DCP's zero-fetch installer, MCP fixes, and full workflow**

---

## 📋 Test Results

**Latest smoke test results**: See [SMOKE_TEST_RESULTS.md](./SMOKE_TEST_RESULTS.md)

**Status**: ✅ **1 critical bug found and fixed** - MCP `dcp_add_component` tool now working

---

## 🚀 Quick Start: Automated Test Suite

Run the full automated test suite (25+ tests):

```bash
./test-v3.0.0.sh
```

**What it tests:**
- ✅ Component extraction (props, variants, metadata)
- ✅ Pack building (SHA1 blobs, meta.json, index.json)
- ✅ Registry server (HTTP endpoints, health checks)
- ✅ Component installation (HTTP, file://, overwrite policies)
- ✅ Registry formats (shadcn vs raw)
- ✅ Auto-detection (components.json, package managers)

**Expected output:**
```
Tests run:    25
Tests passed: 25
Tests failed: 0

✓ ALL TESTS PASSED - Ready for v3.0.0!
```

---

## 🧪 Manual Testing Guide

### Test 1: Extract → Build → Serve → Install (Full Workflow)

**Goal:** Validate the complete end-to-end workflow

```bash
# 1. Create test project
mkdir -p /tmp/dcp-test && cd /tmp/dcp-test
npm init -y

# 2. Create sample component
mkdir -p src/components/ui
cat > src/components/ui/button.tsx << 'EOF'
import * as React from 'react'

export interface ButtonProps {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm'
}

export const Button: React.FC<ButtonProps> = ({ variant = 'default', ...props }) => {
  return <button {...props} />
}
EOF

# 3. Extract
npx dcp extract ./src/components/ui --out ./registry --verbose

# Expected: registry.json created with Button component
# Verify: cat ./registry/registry.json | jq '.components[0].name'

# 4. Build packs
npx dcp registry build-packs ./registry/registry.json \
  --out ./dist/packs \
  --namespace ui \
  --version 1.0.0 \
  --base-url http://localhost:7401 \
  --verbose

# Expected: ./dist/packs/button/meta.json created
# Verify: ls -la ./dist/packs/button/

# 5. Serve registry
npx dcp registry serve ./dist/packs --port 7401 --verbose &

# Wait for server to start
sleep 2

# 6. Test endpoints
curl http://localhost:7401/health                    # Should return healthy
curl http://localhost:7401/index.json               # Should list button
curl http://localhost:7401/r/ui/button | jq '.'    # Should return pack

# 7. Install in new project
cd /tmp && mkdir my-app && cd my-app
npm init -y
echo '{ "aliases": { "components": "./src/components" } }' > components.json

npx dcp registry add "http://localhost:7401/r/ui/button" --verbose

# Expected: ./src/components/button/button.tsx created
# Verify: cat ./src/components/button/button.tsx

# Cleanup
pkill -f "dcp registry serve"
rm -rf /tmp/dcp-test /tmp/my-app
```

---

### Test 2: MCP Server (Props Fix + Component Search)

**Goal:** Validate MCP server bug fixes

```bash
# 1. Start MCP server
cd /Users/stevewitmer/local_AI_Projects/onroster.app-2
npx dcp-mcp ./registry &

# 2. Test props handling (was crashing before)
# In Claude Desktop or via HTTP:
curl http://localhost:3000/tools/dcp_get_component -d '{
  "component": "Button",
  "include": ["props", "variants"]
}'

# Expected: Returns props as object with requiredProps/optionalProps arrays
# Should NOT crash with "props.filter is not a function"

# 3. Test component search (exact match priority)
# Search for "Button" should return "Button", not "UploadHistoricalButton"
curl http://localhost:3000/tools/dcp_get_component -d '{
  "component": "Button"
}'

# Expected: { "name": "Button", ... }
# NOT: { "name": "UploadHistoricalButton", ... }

# Cleanup
pkill -f "dcp-mcp"
```

---

### Test 3: Zero-Fetch Installation

**Goal:** Validate single HTTP request installation

```bash
# Setup test registry
cd /tmp && mkdir zero-fetch-test && cd zero-fetch-test
npx dcp registry serve /path/to/packs --port 7401 --verbose &

# Monitor network requests
# In another terminal, watch server logs or use Charles Proxy

# Install component
mkdir test-app && cd test-app
npx dcp registry add "http://localhost:7401/r/ui/button" --verbose

# Expected network requests:
# 1. GET http://localhost:7401/r/ui/button (pack metadata)
# 2. GET http://localhost:7401/blobs/{sha1} (content-addressed file)
# Total: 2 requests (vs 1 + N files in traditional approach)

# Cleanup
pkill -f "dcp registry serve"
rm -rf /tmp/zero-fetch-test
```

---

### Test 4: File:// Local Installation

**Goal:** Validate offline/local pack installation

```bash
# 1. Build packs
cd /tmp && mkdir file-test && cd file-test
# ... extract and build packs ...
npx dcp registry build-packs ./registry/registry.json --out ./dist/packs

# 2. Install from file://
cd /tmp && mkdir file-app && cd file-app
npm init -y

# Absolute path
npx dcp registry add "file:///tmp/file-test/dist/packs/r/ui/button" --verbose

# Relative path
npx dcp registry add "../file-test/dist/packs/r/ui/card" --verbose

# Expected: Components installed without network requests
# Verify: ls -la ./components/

# Cleanup
rm -rf /tmp/file-test /tmp/file-app
```

---

### Test 5: Authentication & Private Registries

**Goal:** Validate Bearer token auth

```bash
# 1. Start server with auth
npx dcp registry serve ./dist/packs --port 7401 --secret mysecret &

# 2. Try without token (should fail)
npx dcp registry add "http://localhost:7401/r/ui/button"
# Expected: "Authentication required" error

# 3. Try with token
npx dcp registry add "http://localhost:7401/r/ui/button" --token mysecret
# Expected: Success

# 4. Try with env var
export DCP_REGISTRY_TOKEN=mysecret
npx dcp registry add "http://localhost:7401/r/ui/button"
# Expected: Success

# Cleanup
pkill -f "dcp registry serve"
unset DCP_REGISTRY_TOKEN
```

---

### Test 6: Overwrite Policies

**Goal:** Validate skip/prompt/force behavior

```bash
cd /tmp && mkdir overwrite-test && cd overwrite-test
npm init -y

# 1. Install component
npx dcp registry add "http://localhost:7401/r/ui/button"

# 2. Modify installed file
echo "// MODIFIED" >> ./components/button/button.tsx

# 3. Try to reinstall with skip (should keep modification)
npx dcp registry add "http://localhost:7401/r/ui/button" --overwrite skip
cat ./components/button/button.tsx | grep "MODIFIED"
# Expected: "MODIFIED" comment still present

# 4. Reinstall with force (should replace)
npx dcp registry add "http://localhost:7401/r/ui/button" --overwrite force
cat ./components/button/button.tsx | grep "MODIFIED"
# Expected: No "MODIFIED" comment (file replaced)

# Cleanup
rm -rf /tmp/overwrite-test
```

---

### Test 7: Package Manager Detection

**Goal:** Validate npm/pnpm/yarn/bun auto-detection

```bash
cd /tmp && mkdir pm-test && cd pm-test

# Test pnpm
touch pnpm-lock.yaml
npm init -y
npx dcp registry add "http://localhost:7401/r/ui/button" --verbose 2>&1 | grep "pnpm"
# Expected: "Installing dependencies with pnpm"

# Test yarn
rm pnpm-lock.yaml && touch yarn.lock
npx dcp registry add "http://localhost:7401/r/ui/card" --verbose 2>&1 | grep "yarn"
# Expected: "Installing dependencies with yarn"

# Test bun
rm yarn.lock && touch bun.lockb
npx dcp registry add "http://localhost:7401/r/ui/avatar" --verbose 2>&1 | grep "bun"
# Expected: "Installing dependencies with bun"

# Test npm (fallback)
rm bun.lockb
npx dcp registry add "http://localhost:7401/r/ui/badge" --verbose 2>&1 | grep "npm"
# Expected: "Installing dependencies with npm"

# Cleanup
rm -rf /tmp/pm-test
```

---

### Test 8: Registry Formats (ShadCN vs Raw)

**Goal:** Validate target directory mapping

```bash
cd /tmp && mkdir format-test && cd format-test
npm init -y

# 1. ShadCN format (default) - groups by component
npx dcp registry add "http://localhost:7401/r/ui/button" --registry-format shadcn
# Expected: ./components/button/button.tsx

# 2. Raw format - mirrors internal structure
npx dcp registry add "http://localhost:7401/r/ui/card" --registry-format raw --target ./lib
# Expected: ./lib/registry/card.tsx (or similar)

# Cleanup
rm -rf /tmp/format-test
```

---

### Test 9: Dry-Run Mode

**Goal:** Validate preview without changes

```bash
cd /tmp && mkdir dryrun-test && cd dryrun-test
npm init -y

# Run dry-run
npx dcp registry add "http://localhost:7401/r/ui/button" --dry-run --verbose

# Expected:
# - Prints installation plan
# - Shows files to download
# - Shows dependencies to install
# - NO files actually written
# - NO dependencies installed

# Verify
ls -la ./components/
# Expected: Empty (no files written)

# Cleanup
rm -rf /tmp/dryrun-test
```

---

### Test 10: Components.json Auto-Detection

**Goal:** Validate ShadCN convention support

```bash
cd /tmp && mkdir shadcn-test && cd shadcn-test
npm init -y

# 1. Without components.json (default target)
npx dcp registry add "http://localhost:7401/r/ui/button"
# Expected: ./components/button/button.tsx

# 2. With components.json
rm -rf ./components
cat > components.json << 'EOF'
{
  "aliases": {
    "components": "./src/ui"
  }
}
EOF

npx dcp registry add "http://localhost:7401/r/ui/card"
# Expected: ./src/ui/card/card.tsx

# Cleanup
rm -rf /tmp/shadcn-test
```

---

## 📊 Test Matrix

| Feature | Test Status | Notes |
|---------|-------------|-------|
| HTTP Installation | ✅ | Single request per component |
| File:// Installation | ✅ | Offline support |
| SHA1 Blobs | ✅ | Content-addressed storage |
| Authentication | ✅ | Bearer token + env var |
| Overwrite Policies | ✅ | skip/prompt/force |
| PM Detection | ✅ | npm/pnpm/yarn/bun |
| Registry Formats | ✅ | shadcn/raw |
| Dry-Run | ✅ | Preview mode |
| components.json | ✅ | Auto-detection |
| Versioning | ✅ | button@2.1.0 syntax |
| MCP Props Fix | ✅ | Objects not arrays |
| MCP Search Fix | ✅ | Exact match priority |

---

## 🐛 Known Issues / Edge Cases

### Issue: Missing SHA1 blob
**Symptom:** "GET /blobs/{sha1} → 404"
**Fix:** Ensure `build-packs` completes successfully and blobs/ directory exists

### Issue: Authentication fails with token
**Symptom:** "401 Unauthorized" even with --token
**Fix:** Check server started with --secret flag, token matches

### Issue: Component name not found
**Symptom:** "Component 'X' not found"
**Fix:** Verify exact component name in index.json, check case sensitivity

---

## ✅ Pre-Release Checklist

Before tagging v3.0.0, ensure:

- [ ] All automated tests pass (`./test-v3.0.0.sh`)
- [ ] Manual smoke test completed (extract → build → serve → install)
- [ ] MCP server props handling verified (no crashes)
- [ ] MCP server component search verified (exact matches work)
- [ ] Zero-fetch installation verified (2 requests max)
- [ ] File:// installation works offline
- [ ] Authentication works with tokens
- [ ] Overwrite policies behave correctly
- [ ] Package manager detection works
- [ ] Registry formats work (shadcn + raw)
- [ ] Dry-run mode works
- [ ] components.json auto-detection works
- [ ] Documentation updated
- [ ] CHANGELOG.md complete

---

## 🚀 Post-Test: Release Steps

Once all tests pass:

```bash
# 1. Commit everything
git add -A
git commit -m "feat(v3.0.0): zero-fetch installer + critical MCP fixes"

# 2. Tag release
git tag v3.0.0

# 3. Push to GitHub
git push origin main --tags

# 4. Publish to npm
pnpm -r publish --no-git-checks

# 5. Deploy demo registry
npx dcp registry publish ./dist/packs --provider github-pages
```

---

## 📚 Related Documentation

- [CHANGELOG.md](../CHANGELOG.md) - v3.0.0 release notes
- [Component Packs](./COMPONENT_PACKS.md) - Distribution architecture
- [ShadCN vs DCP](./SHADCN_VS_DCP.md) - Comparison & history
- [MCP Integration](./api/mcp-integration.md) - AI agent integration

---

**Questions? Issues?** Open a GitHub issue with test logs attached.

