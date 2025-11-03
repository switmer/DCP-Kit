# Implementation Plan: DCP Browse UI (v3.1.0)

**Goal:** Visual component gallery that non-technical users can browse without any setup.

**Timeline:** 3-5 days  
**Complexity:** Low-medium  
**Impact:** High (enables designers/PMs)

---

## What We're Building

A single-page web app that:
1. Fetches `index.json` from registry
2. Displays components as a visual grid
3. Shows component details on click
4. Provides copy-paste code snippets
5. Works with zero installation

---

## Technical Architecture

### **File Structure**
```
packages/dcp-toolkit/src/commands/serve-registry.js
  └─ Serves static files from registry

packages/dcp-toolkit/static/
  └─ browse.html (new file - the UI)
```

### **How It Works**

```
User visits: http://localhost:7401/browse
                    ↓
         serve-registry.js serves browse.html
                    ↓
         browse.html fetches /index.json
                    ↓
         JavaScript renders component grid
                    ↓
         Click component → fetch /r/:ns/:component
                    ↓
         Display props, examples, install command
```

### **Tech Stack (Keep It Simple)**

- **Pure HTML/CSS/JS** (no build step)
- **Tailwind CSS** (via CDN for fast styling)
- **Highlight.js** (for code syntax highlighting)
- **Vanilla JS** (no React/Vue - keep bundle tiny)

---

## Implementation Steps

### **Step 1: Create `browse.html`** (2-3 hours)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DCP Component Browser</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
</head>
<body class="bg-gray-50">
  <div id="app"></div>
  <script src="./browse.js"></script>
</body>
</html>
```

### **Step 2: Create `browse.js`** (4-6 hours)

```javascript
// Fetch and render component gallery
async function init() {
  const index = await fetch('/index.json').then(r => r.json());
  renderGallery(index.components);
}

function renderGallery(components) {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="container mx-auto px-4 py-8">
      <header class="mb-8">
        <h1 class="text-4xl font-bold">${index.namespace || 'Design System'}</h1>
        <p class="text-gray-600">v${index.version || '1.0.0'}</p>
        <input type="search" id="search" placeholder="Search components..." 
               class="mt-4 w-full max-w-md px-4 py-2 border rounded-lg">
      </header>
      
      <div id="component-grid" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        ${components.map(renderComponentCard).join('')}
      </div>
      
      <div id="component-detail" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <!-- Component detail modal -->
      </div>
    </div>
  `;
  
  // Attach event listeners
  document.getElementById('search').addEventListener('input', handleSearch);
  components.forEach(c => {
    document.getElementById(`card-${c.name}`).addEventListener('click', () => showDetail(c));
  });
}

function renderComponentCard(component) {
  return `
    <div id="card-${component.name}" class="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition">
      <div class="h-32 bg-gray-100 rounded-md flex items-center justify-center mb-4">
        <span class="text-4xl">📦</span>
      </div>
      <h3 class="text-xl font-semibold">${component.title || component.name}</h3>
      <p class="text-gray-600 text-sm mt-2">${component.description || ''}</p>
      <div class="mt-4 flex gap-2 flex-wrap">
        ${(component.tags || []).map(tag => `
          <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${tag}</span>
        `).join('')}
      </div>
    </div>
  `;
}

async function showDetail(component) {
  const detail = await fetch(component.url).then(r => r.json());
  
  const modal = document.getElementById('component-detail');
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
      <div class="flex justify-between items-start mb-6">
        <div>
          <h2 class="text-3xl font-bold">${detail.title || detail.name}</h2>
          <p class="text-gray-600 mt-2">${detail.description || ''}</p>
        </div>
        <button onclick="closeDetail()" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- Props Section -->
      ${renderProps(detail.props)}
      
      <!-- Example Usage -->
      ${renderExample(detail)}
      
      <!-- Installation -->
      <div class="mt-8 p-4 bg-gray-100 rounded-lg">
        <h4 class="font-semibold mb-2">Install this component:</h4>
        <code class="text-sm">dcp add ${detail.registryUrl}</code>
        <button onclick="copyToClipboard('${detail.registryUrl}')" 
                class="ml-4 text-blue-600 hover:text-blue-800">
          Copy
        </button>
      </div>
    </div>
  `;
}

function renderProps(props) {
  if (!props || typeof props !== 'object' || Object.keys(props).length === 0) {
    return '<p class="text-gray-500 italic">No props documented</p>';
  }
  
  return `
    <div class="mt-6">
      <h3 class="text-xl font-semibold mb-4">Props</h3>
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2">Name</th>
            <th class="text-left py-2">Type</th>
            <th class="text-left py-2">Required</th>
            <th class="text-left py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(props).map(([name, prop]) => `
            <tr class="border-b">
              <td class="py-2 font-mono text-sm">${name}</td>
              <td class="py-2 text-sm text-gray-600">${prop.type || 'any'}</td>
              <td class="py-2 text-sm">${prop.required ? '✓' : ''}</td>
              <td class="py-2 text-sm text-gray-600">${prop.description || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderExample(detail) {
  // Generate basic example from props
  const requiredProps = Object.entries(detail.props || {})
    .filter(([_, prop]) => prop.required)
    .map(([name, prop]) => `${name}={${prop.type === 'string' ? '"value"' : 'value'}}`);
  
  const example = `<${detail.name} ${requiredProps.join(' ')}>\n  Content\n</${detail.name}>`;
  
  return `
    <div class="mt-6">
      <h3 class="text-xl font-semibold mb-4">Example Usage</h3>
      <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto"><code class="language-tsx">${example}</code></pre>
      <button onclick="copyToClipboard(\`${example}\`)" 
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Copy Code
      </button>
    </div>
  `;
}

function closeDetail() {
  document.getElementById('component-detail').classList.add('hidden');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert('Copied to clipboard!');
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const cards = document.querySelectorAll('[id^="card-"]');
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(query) ? 'block' : 'none';
  });
}

// Initialize on load
init();
```

### **Step 3: Update `serve-registry.js`** (1 hour)

Add route to serve `browse.html`:

```javascript
// In serve-registry.js setupRoutes()

// Serve browse UI
this.app.get('/browse', (req, res) => {
  res.sendFile(path.join(__dirname, '../../static/browse.html'));
});

// Serve browse.js
this.app.get('/browse.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../../static/browse.js'));
});
```

### **Step 4: Test** (1-2 hours)

```bash
# Build packs
dcp registry build-packs ./registry/registry.json --out ./dist/packs

# Start server
dcp registry serve ./dist/packs --port 7401

# Visit in browser
open http://localhost:7401/browse
```

**Test checklist:**
- [ ] Component grid loads
- [ ] Search filters components
- [ ] Click component opens detail modal
- [ ] Props table renders correctly
- [ ] Code example is valid
- [ ] Copy buttons work
- [ ] Mobile responsive

---

## Future Enhancements (v3.2+)

- **Screenshots:** Auto-generate component thumbnails
- **Live preview:** Render actual components in iframe
- **Prop editor:** Interactive controls to change props
- **Dark mode:** Toggle theme
- **Filtering:** By category, tag, framework
- **Export:** Download all components as zip

---

## Success Metrics

After shipping, measure:
- **Time to first browse:** How long from URL click to seeing gallery?
- **Search usage:** Are people using search?
- **Detail views:** Which components are most viewed?
- **Copy clicks:** Are people copying code/install commands?

**Target:** < 2 seconds to see gallery, > 50% of visitors click a component

---

## Deployment

Since it's just static files, deploy anywhere:

```bash
# GitHub Pages
git add static/
git commit -m "feat: add browse UI"
git push origin main

# The registry build already includes static files
# Users just visit: https://your-registry.com/browse
```

**Zero ops complexity** - it's just HTML/CSS/JS served by the existing registry server.

---

## Why This Wins

1. **Zero friction:** Just a URL, no install
2. **Fast to build:** < 1 week with polish
3. **High impact:** Unlocks non-technical users
4. **Low maintenance:** No backend changes, no auth, no database
5. **Demo-able:** Screenshot this for landing page

This is your **"wow" moment** - the thing people share screenshots of and say "look how organized our design system is!"

Ship it first. Iterate based on feedback. Keep it simple.

