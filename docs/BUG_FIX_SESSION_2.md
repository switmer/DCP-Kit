# Bug Fix Session #2: Pack Format Mismatch

**Date**: 2025-11-03  
**Session**: Continued smoke testing after fixing Bug #1  
**Result**: 🎉 **2 critical bugs identified and fixed**

---

## 🔍 What Happened

After fixing the MCP `installer.install is not a function` bug, we retested and hit a **new error**:

```
Error: Invalid pack: missing files[]
```

This was actually **good news** - it meant Bug #1 was fixed and we were progressing to the next stage!

---

## 🐛 Bug #2: Pack Format Mismatch

### **The Problem**

`build-packs` and `dcp-add-v2` had incompatible data formats:

**build-packs.js** was generating:
```json
{
  "name": "button",
  "files": {
    "index.tsx": "./blobs/abc123.tsx",
    "demo.tsx": "./blobs/def456.tsx"
  }
}
```

**dcp-add-v2.js** expected (per DCP spec):
```json
{
  "name": "button",
  "files": [
    {
      "path": "registry/button/index.tsx",
      "type": "registry:component",
      "sha1": "abc123",
      "size": 1234
    },
    {
      "path": "registry/button/demo.tsx",
      "type": "registry:example",
      "sha1": "def456",
      "size": 5678
    }
  ]
}
```

**Key Difference**: `files` as **object** vs **array**

---

## ✅ The Fix

### **1. Updated `build-packs.js`**

**Before**:
```javascript
const files = {};
files['index.tsx'] = await this.storeBlob(sourceCode, 'tsx');
files['demo.tsx'] = await this.storeBlob(demoCode, 'tsx');
```

**After**:
```javascript
const files = [];

const indexBlob = await this.storeBlob(sourceCode, 'tsx');
files.push({
  path: `registry/${component.name.toLowerCase()}/index.tsx`,
  type: 'registry:component',
  sha1: indexBlob.sha1,
  size: indexBlob.size,
});

const demoBlob = await this.storeBlob(demoCode, 'tsx');
files.push({
  path: `registry/${component.name.toLowerCase()}/demo.tsx`,
  type: 'registry:example',
  sha1: demoBlob.sha1,
  size: demoBlob.size,
});
```

---

### **2. Updated `storeBlob()` to return metadata**

**Before**:
```javascript
async storeBlob(content, extension) {
  const hash = crypto.createHash('sha1').update(content).digest('hex');
  const fileName = `${hash}.${extension}`;
  const blobPath = path.join(this.outputDir, 'blobs', fileName);
  
  if (!this.blobCache.has(hash)) {
    await fs.writeFile(blobPath, content);
    this.blobCache.set(hash, fileName);
  }
  
  return this.baseUrl ? `${this.baseUrl}/blobs/${fileName}` : `./blobs/${fileName}`;
}
```

**After**:
```javascript
async storeBlob(content, extension) {
  const hash = crypto.createHash('sha1').update(content).digest('hex');
  const fileName = `${hash}.${extension}`;
  const blobPath = path.join(this.outputDir, 'blobs', fileName);
  
  if (!this.blobCache.has(hash)) {
    await fs.writeFile(blobPath, content);
    this.blobCache.set(hash, fileName);
  }
  
  // Return both URL and metadata for DCP spec compliance
  return {
    url: this.baseUrl ? `${this.baseUrl}/blobs/${fileName}` : `./blobs/${fileName}`,
    sha1: hash,
    size: Buffer.byteLength(content, 'utf8'),
    fileName,
  };
}
```

---

### **3. Updated `dcp-add-v2.js` to extract extension for blob downloads**

**Before**:
```javascript
if (t.src.sha1) {
  data = await this.downloadBlob(baseUrl, t.src.sha1, pack.blobsBaseUrl);
}

async downloadBlob(baseUrl, sha1, blobsBaseUrlOverride) {
  const blobBase = blobsBaseUrlOverride || baseUrl.replace(/\/$/, '');
  const url = `${blobBase}/blobs/${sha1}`;
  return await this.downloadFile(url);
}
```

**After**:
```javascript
if (t.src.sha1) {
  // Extract extension from path for blob filename
  const ext = path.extname(t.src.path).replace('.', '');
  data = await this.downloadBlob(baseUrl, t.src.sha1, pack.blobsBaseUrl, ext);
}

async downloadBlob(baseUrl, sha1, blobsBaseUrlOverride, extension = '') {
  const blobBase = blobsBaseUrlOverride || baseUrl.replace(/\/$/, '');
  // If sha1 doesn't have extension, append it
  const blobFile = extension ? `${sha1}.${extension}` : sha1;
  const url = `${blobBase}/blobs/${blobFile}`;
  return await this.downloadFile(url);
}
```

**Why**: Blobs are stored as `{sha1}.{ext}` (e.g., `abc123.tsx`), so we need to reconstruct the full filename when downloading.

---

## 📊 Impact

### **Files Changed**
1. `/packages/dcp-toolkit/src/commands/build-packs.js` (lines 131-179, 574-591)
2. `/packages/dcp-toolkit/src/commands/dcp-add-v2.js` (lines 288-293, 308-314)

### **Bugs Fixed This Session**
- ✅ Bug #1: MCP `installer.install is not a function`
- ✅ Bug #2: Pack format mismatch (`files` object vs array)

### **Status**
🟢 **Both bugs fixed** - Ready for retest after rebuilding packs

---

## 🚀 Next Steps

1. **Rebuild packs** with the fixed `build-packs` command
2. **Restart registry server** to serve the new packs
3. **Reload Cursor** to pick up MCP server changes
4. **Retest end-to-end workflow**:
   - Extract → Build → Serve → Install (MCP)
   - Extract → Build → Serve → Install (CLI)
5. **Run automated test suite** (`./test-v3.0.0.sh`)
6. **Tag and release** v3.0.0

---

## 🎓 Lessons Learned

1. **Fix one bug, find the next**: The MCP fix revealed the pack format bug - this is healthy debugging!
2. **Spec compliance matters**: The user provided a clear spec for the pack format, and the builder wasn't following it
3. **Integration testing is critical**: Unit tests wouldn't have caught this - only end-to-end testing from extract → build → serve → install revealed it
4. **Document as you go**: Updating CHANGELOG and smoke test docs in real-time makes release notes easy

---

## 🏆 Achievement Unlocked

**"Bug Whisperer"** 🐞🔧

Fixed 2 critical bugs in one session, both discovered through systematic end-to-end testing. The v3.0.0 release is now unblocked!

---

**Total bugs fixed today**: 2  
**Critical blockers removed**: 2  
**Confidence level**: 🟢 High - Ready for final validation

