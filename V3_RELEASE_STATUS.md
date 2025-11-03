# DCP v3.0.0 & v3.1.0 Release Status

## 🎯 Current Status

### v3.0.0 - Core Fixes & Installer
**Status**: ✅ **CODE COMPLETE** - Ready for validation testing

**What's Fixed**:
1. ✅ MCP server multi-registry support with auto-detection
2. ✅ Component search exact-match prioritization
3. ✅ Props handling (object → array conversion)
4. ✅ `dcp-add` v2 zero-fetch installer
5. ✅ Pack format (files as array, not object)
6. ✅ Server file array handling

**What Needs Testing**:
- [ ] Run validation script: `./test-v3.0.0-fix.sh`
- [ ] Verify no `filePath.startsWith` errors
- [ ] Test one successful component install
- [ ] Tag v3.0.0 if tests pass

### v3.1.0 - Browse UI
**Status**: ✅ **CODE COMPLETE** - Ready for testing after v3.0.0

**What's Built**:
- ✅ `browse.html`, `browse.css`, `browse.js` (~1,500 LOC)
- ✅ Server integration (`serve-registry.js`, `build-packs.js`)
- ✅ Documentation (README, quickstart, testing guide)
- ✅ All planned features (search, facets, copy, deep links, PM switcher, etc.)

**What Needs Testing**:
- [ ] Run quickstart: `cat packages/dcp-toolkit/BROWSE_UI_QUICKSTART.md`
- [ ] Test in Chrome, Firefox, Safari
- [ ] Validate all features work
- [ ] Tag v3.1.0 if tests pass

---

## 📋 v3.0.0 Validation Steps

### Step 1: Run Automated Test

```bash
cd /Users/stevewitmer/local_AI_Projects/DCP-Transformer
./test-v3.0.0-fix.sh
```

**Expected Output**:
```
=== ✅ All Bug #3 Tests Passed! ===

The serve-registry.js fix is working correctly:
  - Files are stored as arrays (not objects)
  - Server correctly handles file array format
  - No 'filePath.startsWith' errors
  - Installer can fetch component metadata

✅ v3.0.0 is ready to tag!
```

### Step 2: Manual Smoke Test (Optional)

If automated test passes, optionally verify manually:

```bash
# 1. Build test packs
cd /tmp/dcp-v3-test
npx dcp registry serve ./dist/packs --port 7401 --verbose

# 2. In another terminal, test fetch
curl http://localhost:7401/r/ui/button | jq '.files | type'
# Should output: "array"

# 3. Test installer
cd /tmp/test-install
npx dcp registry add "http://localhost:7401/r/ui/button" --verbose
# Should succeed without errors
```

### Step 3: Tag v3.0.0

If tests pass:

```bash
cd /Users/stevewitmer/local_AI_Projects/DCP-Transformer

# Stage all v3.0.0 changes
git add -A

# Commit
git commit -m "feat: v3.0.0 - Multi-registry MCP, dcp-add v2, critical bug fixes

- Multi-registry support with auto-detection
- Zero-fetch component installer (dcp-add v2)
- Fixed props handling (object vs array)
- Fixed component search (exact match priority)
- Fixed pack format (files as array)
- Fixed serve-registry file handling

BREAKING CHANGES:
- MCP server registryPath is now optional (auto-detects)
- Files format changed from object to array (DCP spec compliant)

Closes #BUG-1, #BUG-2, #BUG-3"

# Tag
git tag -a v3.0.0 -m "v3.0.0 - Core Fixes & Zero-Fetch Installer"

# Push (when ready)
# git push origin main --tags
```

---

## 📋 v3.1.0 Validation Steps

**⚠️ ONLY START AFTER v3.0.0 IS TAGGED**

### Step 1: Quick Test (2 minutes)

```bash
cd /Users/stevewitmer/local_AI_Projects/DCP-Transformer/packages/dcp-toolkit
cat BROWSE_UI_QUICKSTART.md

# Follow the quickstart guide to:
# 1. Create test components
# 2. Extract & build packs
# 3. Serve with Browse UI
# 4. Open http://localhost:7401
# 5. Test 10 core features
```

### Step 2: Cross-Browser Testing

Use the comprehensive checklist:

```bash
cat packages/dcp-toolkit/BROWSE_UI_TESTING.md
```

Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS)
- [ ] Chrome Android (optional)
- [ ] iOS Safari (optional)

### Step 3: Feature Validation

Verify these work:
- [ ] Search filters cards
- [ ] Facet chips toggle
- [ ] Modal opens on card click
- [ ] Copy buttons work (install, link, AI prompt)
- [ ] PM switcher updates command
- [ ] Deep links work (`#ui/button`)
- [ ] Keyboard navigation (Tab, Enter, Escape, Ctrl/Cmd+K)
- [ ] 404 modal for invalid links

### Step 4: Tag v3.1.0

If tests pass:

```bash
cd /Users/stevewitmer/local_AI_Projects/DCP-Transformer

# Stage Browse UI changes
git add -A

# Commit
git commit -m "feat: v3.1.0 - Browse UI - Visual Component Discovery

- Production-ready component browser
- Smart search with debouncing
- Facet filters (namespace, type, category)
- Copy-to-clipboard (install, share link, AI prompt)
- PM switcher (npm/pnpm/yarn/bun)
- Deep linking with hash navigation
- Staleness badge
- Keyboard navigation & accessibility
- Mobile responsive
- Dark theme

Transforms DCP from 'engineer plumbing' to a product that designers,
PMs, and managers can recognize and adopt.

Files:
- static/browse.html (~150 lines)
- static/browse.css (~700 lines)
- static/browse.js (~650 lines)
- Integration with serve-registry & build-packs
- Documentation & testing guides"

# Tag
git tag -a v3.1.0 -m "v3.1.0 - Browse UI - Visual Component Discovery"

# Push (when ready)
# git push origin main --tags
```

---

## 🐛 Troubleshooting

### If v3.0.0 Test Fails

**Error: "filePath.startsWith is not a function"**

This means the server is running old code. Fix:

```bash
# 1. Kill all node processes
killall node

# 2. Clear any cached modules
rm -rf node_modules/.cache

# 3. Rebuild if using TypeScript
cd packages/dcp-toolkit
npm run build  # if applicable

# 4. Re-run test
cd /Users/stevewitmer/local_AI_Projects/DCP-Transformer
./test-v3.0.0-fix.sh
```

**Error: "Invalid pack: missing files[]"**

This means `build-packs` is generating old format. Check:

```bash
# Verify build-packs.js has the fix
grep -A 10 "const files = \[\]" packages/dcp-toolkit/src/commands/build-packs.js

# Should show:
# const files = [];
# 
# const indexBlob = await this.storeBlob(sourceCode, 'tsx');
# files.push({
#   path: `registry/${component.name.toLowerCase()}/index.tsx`,
#   type: 'registry:component',
#   sha1: indexBlob.sha1,
#   size: indexBlob.size,
# });
```

### If v3.1.0 Test Fails

**Browse UI not loading**

```bash
# Check static files exist
ls packages/dcp-toolkit/static/
# Should show: browse.html, browse.css, browse.js

# Check they were copied to packs
ls /tmp/dcp-v3-test/dist/packs/
# Should show: browse.html, browse.css, browse.js, index.json, blobs/, button/, card/
```

**Clipboard not working**

- Ensure you're on `localhost` (not `127.0.0.1`)
- Try a different browser
- Check browser console for permission errors

---

## 📊 Release Checklist

### Pre-Release (Both Versions)

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No linter errors
- [ ] No console errors in browser (v3.1.0)

### v3.0.0 Release

- [ ] Automated test passes (`./test-v3.0.0-fix.sh`)
- [ ] Manual smoke test passes (optional)
- [ ] Committed with proper message
- [ ] Tagged as v3.0.0
- [ ] Pushed to origin

### v3.1.0 Release

- [ ] Quick test passes (2 min)
- [ ] Cross-browser tested (Chrome, Firefox, Safari)
- [ ] All features validated
- [ ] Committed with proper message
- [ ] Tagged as v3.1.0
- [ ] Pushed to origin

### Post-Release

- [ ] Update README badges (if applicable)
- [ ] Announce in Discord/Slack
- [ ] Tweet/blog post (optional)
- [ ] Update demo site (if applicable)

---

## 📚 Documentation Index

### v3.0.0 Docs
- `CHANGELOG.md` - Full changelog
- `docs/BUG_FIX_SESSION_*.md` - Debugging sessions
- `docs/SMOKE_TEST_RESULTS.md` - Test results
- `docs/SHADCN_VS_DCP.md` - Comparison guide

### v3.1.0 Docs
- `packages/dcp-toolkit/BROWSE_UI_QUICKSTART.md` - 2-minute quick start
- `packages/dcp-toolkit/BROWSE_UI_TESTING.md` - Comprehensive testing
- `packages/dcp-toolkit/BROWSE_UI_IMPLEMENTATION_SUMMARY.md` - Technical details
- `docs/BROWSE_UI_IMPLEMENTATION.md` - Original plan

---

## 🎉 Success Criteria

### v3.0.0 Success
- ✅ Automated test passes without errors
- ✅ Component can be installed via `dcp registry add`
- ✅ No `filePath.startsWith` errors
- ✅ Files format is array (not object)

### v3.1.0 Success
- ✅ Browse UI loads at `http://localhost:7401`
- ✅ Search filters components
- ✅ Modal opens and displays props
- ✅ Copy buttons work
- ✅ Works in Chrome, Firefox, Safari

---

## 🚀 Ready to Ship?

**Current Status**: 
- v3.0.0: ✅ Code complete, needs validation
- v3.1.0: ✅ Code complete, needs validation

**Next Action**: 
Run `./test-v3.0.0-fix.sh` to validate v3.0.0

**Estimated Time**:
- v3.0.0 validation: 5 minutes
- v3.1.0 validation: 15 minutes
- Total: 20 minutes to ship both versions 🚀

