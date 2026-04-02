/**
 * DCP Browse UI - Component Browser
 * Production-ready with facet filters, PM detection, AI prompts, and accessibility
 */

(function() {
  'use strict';

  // State
  let indexData = null;
  let components = [];
  let tokens = [];
  let allItems = []; // Combined components + tokens
  let activeFacets = {
    namespace: [],
    type: [], // 'component', 'token', 'hook', etc.
    category: []
  };
  let currentPM = 'npm';
  let lastFocusedCard = null;
  let searchDebounceTimer = null;

  // Telemetry (console only, opt-in via ?telemetry)
  const telemetryEnabled = new URLSearchParams(window.location.search).has('telemetry');
  
  function track(event, data) {
    if (!telemetryEnabled) return;
    console.log('[DCP Telemetry]', event, data);
  }

  // Initialize global API object early (before functions that use it)
  window.dcpBrowse = {
    _sourceCode: null,
    _examples: null,
    copyInstallCommand: null, // Will be set later
    copyShareLink: null,
    copyAIPrompt: null,
    copySourceCode: null,
    copySourcePath: null,
    copyExampleCode: null
  };

  // DOM Elements
  const elements = {
    app: null,
    grid: null,
    modal: null,
    searchInput: null,
    loadingState: null,
    errorState: null,
    emptyState: null,
    stalenessBadge: null,
    registryName: null,
    registryVersion: null,
    searchResultsLive: null,
    toastContainer: null
  };

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    // Cache DOM elements
    elements.app = document.getElementById('app');
    elements.grid = document.getElementById('component-grid');
    elements.modal = document.getElementById('component-modal');
    elements.searchInput = document.getElementById('search-input');
    elements.loadingState = document.getElementById('loading-state');
    elements.errorState = document.getElementById('error-state');
    elements.emptyState = document.getElementById('empty-state');
    elements.stalenessBadge = document.getElementById('staleness-badge');
    elements.registryName = document.getElementById('registry-name');
    elements.registryVersion = document.getElementById('registry-version');
    elements.searchResultsLive = document.getElementById('search-results-live');
    elements.toastContainer = document.getElementById('toast-container');

    // Setup event listeners
    setupEventListeners();

    // Detect package manager preference
    currentPM = detectPackageManager();

    // Load registry
    try {
      await loadIndex();
      renderGrid();
      initFacets();
      
      // Handle deep links
      if (window.location.hash) {
        await openItemFromHash();
      }
    } catch (error) {
      showError(error.message);
    }

    // Handle hash changes
    window.addEventListener('hashchange', openItemFromHash);
  }

  function setupEventListeners() {
    // Search with debouncing
    elements.searchInput.addEventListener('input', handleSearch);

    // Modal close
    document.getElementById('modal-close').addEventListener('click', closeModal);
    elements.modal.addEventListener('click', (e) => {
      if (e.target === elements.modal) closeModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
  }

  function handleKeyboard(e) {
    // Escape closes modal
    if (e.key === 'Escape' && elements.modal.open) {
      closeModal();
    }

    // Ctrl/Cmd + K focuses search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      elements.searchInput.focus();
    }
  }

  // ============================================================================
  // Data Loading
  // ============================================================================

  async function loadIndex() {
    try {
      const response = await fetch('./index.json');
      if (!response.ok) {
        throw new Error(`Failed to load registry: ${response.status} ${response.statusText}`);
      }
      
      indexData = await response.json();
      components = (indexData.components || []).map(c => ({ ...c, itemType: 'component' }));
      tokens = (indexData.tokens || []).map(t => ({ ...t, itemType: 'token' }));
      allItems = [...components, ...tokens];

      // Update header
      if (indexData.metadata) {
        elements.registryName.textContent = indexData.metadata.name || 'Design System';
        if (indexData.metadata.version) {
          elements.registryVersion.textContent = `v${indexData.metadata.version}`;
        }
        renderStalenessBadge(indexData.metadata);
      }

      elements.loadingState.classList.add('hidden');
      
      track('registry_loaded', {
        componentCount: components.length,
        tokenCount: tokens.length,
        version: indexData.metadata?.version
      });
    } catch (error) {
      console.error('Failed to load index:', error);
      throw error;
    }
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  function renderGrid() {
    if (!allItems.length) {
      showEmptyState('No items found in this registry.');
      return;
    }

    elements.grid.innerHTML = '';
    elements.emptyState.classList.add('hidden');

    allItems.forEach(item => {
      const card = item.itemType === 'token' ? createTokenCard(item) : createComponentCard(item);
      elements.grid.appendChild(card);
    });

    updateResultCount();
  }

  function createComponentCard(comp) {
    const card = document.createElement('div');
    card.className = 'component-card';
    card.tabIndex = 0;
    card.role = 'button';
    card.setAttribute('aria-label', `Open ${comp.name || comp.displayName} component details`);
    
    // Data attributes for filtering
    card.dataset.namespace = comp.namespace || 'ui';
    card.dataset.type = comp.type || 'component';
    card.dataset.categories = (comp.categories || []).join(',');
    card.dataset.name = (comp.name || '').toLowerCase();
    card.dataset.description = (comp.description || '').toLowerCase();

    const namespace = escapeHtml(comp.namespace || 'ui');
    const name = escapeHtml(comp.name || comp.displayName || 'Unknown');
    const description = escapeHtml(comp.description || 'No description available');
    const type = escapeHtml(comp.type || 'component');
    const propsCount = comp.propsCount || 0;

    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-namespace">${namespace}</div>
          <h3 class="card-title">${name}</h3>
        </div>
        <span class="card-type-badge">${type}</span>
      </div>
      <p class="card-description">${description}</p>
      <div class="card-footer">
        <span class="card-props-count">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/>
            <line x1="9" y1="9" x2="15" y2="9" stroke-width="2"/>
            <line x1="9" y1="15" x2="15" y2="15" stroke-width="2"/>
          </svg>
          ${propsCount} props
        </span>
      </div>
    `;

    card.addEventListener('click', () => openItem(namespace, name));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openItem(namespace, name);
      }
    });

    return card;
  }

  function createTokenCard(token) {
    const card = document.createElement('div');
    card.className = 'component-card token-card';
    card.tabIndex = 0;
    card.role = 'button';
    card.setAttribute('aria-label', `Open ${token.name} token details`);
    
    // Data attributes for filtering
    card.dataset.namespace = 'tokens';
    card.dataset.type = 'token';
    card.dataset.tokenType = token.category || 'unknown';
    card.dataset.name = (token.name || '').toLowerCase();
    card.dataset.description = (token.description || '').toLowerCase();
    card.dataset.categories = '';

    const name = escapeHtml(token.name || 'Unknown');
    const description = escapeHtml(token.description || 'No description available');
    const category = escapeHtml(token.category || 'token');
    const value = escapeHtml(String(token.value || ''));
    const tokenValue = String(token.value || '').trim();

    // Create preview element safely using DOM manipulation
    let previewElement = null;
    if (token.category === 'colors' && tokenValue) {
      const sanitizedColor = sanitizeCSSValue(tokenValue, 'color');
      if (sanitizedColor) {
        previewElement = document.createElement('div');
        previewElement.className = 'token-preview-color';
        previewElement.style.setProperty('background-color', sanitizedColor);
        previewElement.setAttribute('title', sanitizedColor);
      }
    } else if ((token.category === 'space' || token.category === 'radius') && tokenValue) {
      const sanitizedSize = sanitizeCSSValue(tokenValue, 'size');
      if (sanitizedSize) {
        previewElement = document.createElement('div');
        previewElement.className = 'token-preview-size';
        previewElement.style.setProperty('width', sanitizedSize);
        previewElement.style.setProperty('height', sanitizedSize);
        previewElement.style.setProperty('background', 'var(--accent)');
        previewElement.setAttribute('title', sanitizedSize);
      }
    } else if (token.category === 'typography' && tokenValue) {
      const sanitizedSize = sanitizeCSSValue(tokenValue, 'size');
      if (sanitizedSize) {
        previewElement = document.createElement('div');
        previewElement.className = 'token-preview-text';
        previewElement.style.setProperty('font-size', sanitizedSize);
        previewElement.textContent = 'Aa';
        previewElement.setAttribute('title', sanitizedSize);
      }
    }

    // Use safe HTML for the rest, and append preview element separately
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-namespace">tokens</div>
          <h3 class="card-title">${name}</h3>
        </div>
        <span class="card-type-badge">${category}</span>
      </div>
      <div class="token-preview">
        ${previewElement ? '' : `<div class="token-preview-generic"><code>${value}</code></div>`}
      </div>
      <p class="card-description">${description}</p>
      <div class="card-footer">
        <code class="token-value">${value}</code>
      </div>
    `;

    // Safely append preview element if it exists
    if (previewElement) {
      const previewContainer = card.querySelector('.token-preview');
      if (previewContainer) {
        previewContainer.appendChild(previewElement);
      }
    }

    card.addEventListener('click', () => openTokenDetail(token));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openTokenDetail(token);
      }
    });

    return card;
  }

  function sanitizeCSSValue(value, type) {
    if (typeof value !== 'string') return '';
    
    const trimmed = value.trim();
    if (!trimmed) return '';
    
    // Remove any CSS injection attempts (semicolons, URLs, expressions, etc.)
    const dangerous = /[<>"'`;{}\\]|url\s*\(|expression\s*\(|javascript:|import|@import/i;
    if (dangerous.test(trimmed)) {
      console.warn('Potentially dangerous CSS value detected:', trimmed);
      return '';
    }
    
    // Validate based on type
    if (type === 'color') {
      // Allow:
      // - Hex: #rgb, #rrggbb, #rrggbbaa
      // - RGB/RGBA: rgb(...), rgba(...)
      // - HSL/HSLA: hsl(...), hsla(...)
      // - Named colors: transparent, inherit, currentColor, or common color names
      // - CSS variables: var(--name)
      const colorPattern = /^(#[0-9a-fA-F]{3,8}|rgb\s*\([^)]+\)|rgba\s*\([^)]+\)|hsl\s*\([^)]+\)|hsla\s*\([^)]+\)|transparent|inherit|currentColor|var\s*\(--[a-z0-9-]+\)|[a-z]+)$/i;
      if (!colorPattern.test(trimmed)) {
        console.warn('Invalid color value:', trimmed);
        return '';
      }
      return trimmed;
    } else if (type === 'size') {
      // Allow numeric values with units (px, rem, em, %, etc.) or CSS variables
      // Examples: 16px, 1.5rem, 50%, 0, var(--spacing-lg)
      const sizePattern = /^(\d+(\.\d+)?(px|rem|em|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)|0|var\s*\(--[a-z0-9-]+\))$/i;
      if (!sizePattern.test(trimmed)) {
        console.warn('Invalid size value:', trimmed);
        return '';
      }
      return trimmed;
    }
    
    // For unknown types, return empty string (don't trust it)
    return '';
  }

  function renderStalenessBadge(metadata) {
    const lastExtracted = metadata?.lastExtracted || metadata?.generatedAt;
    if (!lastExtracted) return;

    const age = Date.now() - new Date(lastExtracted).getTime();
    const daysOld = Math.floor(age / (1000 * 60 * 60 * 24));

    if (daysOld > 7) {
      elements.stalenessBadge.innerHTML = `
        <div class="staleness-badge warning">
          ⚠️ Updated ${daysOld} days ago
          <a href="#how-to-update" class="update-link">How to update</a>
        </div>
      `;
    } else {
      elements.stalenessBadge.innerHTML = `
        <div class="staleness-badge fresh">
          ✓ Updated ${daysOld} day${daysOld === 1 ? '' : 's'} ago
        </div>
      `;
    }
  }

  // ============================================================================
  // Facet Filters
  // ============================================================================

  function initFacets() {
    const namespaces = [...new Set(allItems.map(c => c.namespace || (c.itemType === 'token' ? 'tokens' : 'ui')))];
    const types = [...new Set(allItems.map(c => c.type || c.itemType || 'component'))];
    const categories = [...new Set(allItems.flatMap(c => c.categories || []))];

    renderFacetGroup('namespace', namespaces);
    renderFacetGroup('type', types);
    if (categories.length) {
      renderFacetGroup('category', categories);
    }
  }

  function renderFacetGroup(facetType, values) {
    const container = document.getElementById(`${facetType}-facets`);
    if (!container || !values.length) return;

    values.forEach(value => {
      const count = allItems.filter(c => {
        if (facetType === 'namespace') return (c.namespace || (c.itemType === 'token' ? 'tokens' : 'ui')) === value;
        if (facetType === 'type') return (c.type || c.itemType || 'component') === value;
        if (facetType === 'category') return (c.categories || []).includes(value);
        return false;
      }).length;

      const chip = document.createElement('button');
      chip.className = 'facet-chip';
      chip.dataset.facetType = facetType;
      chip.dataset.facetValue = value;
      chip.innerHTML = `
        <span>${escapeHtml(value)}</span>
        <span class="facet-count">(${count})</span>
      `;

      chip.addEventListener('click', () => toggleFacet(facetType, value, chip));
      container.appendChild(chip);
    });
  }

  function toggleFacet(facetType, value, chipElement) {
    const isActive = activeFacets[facetType].includes(value);

    if (isActive) {
      activeFacets[facetType] = activeFacets[facetType].filter(v => v !== value);
      chipElement.classList.remove('active');
    } else {
      activeFacets[facetType].push(value);
      chipElement.classList.add('active');
    }

    filterCards();
    track('facet_toggle', { facetType, value, active: !isActive });
  }

  function clearFilters() {
    activeFacets = { namespace: [], type: [], category: [] };
    elements.searchInput.value = '';
    
    // Remove active class from all chips
    document.querySelectorAll('.facet-chip').forEach(chip => {
      chip.classList.remove('active');
    });

    filterCards();
    track('filters_cleared', {});
  }

  // ============================================================================
  // Search & Filter
  // ============================================================================

  function handleSearch(e) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      filterCards();
      const query = e.target.value.toLowerCase();
      track('search', { query, resultCount: getVisibleCardCount() });
    }, 300);
  }

  function filterCards() {
    const query = elements.searchInput.value.toLowerCase().trim();
    const cards = elements.grid.querySelectorAll('.component-card');
    let visibleCount = 0;

    cards.forEach(card => {
      const matchesSearch = !query || 
        (card.dataset.name && card.dataset.name.includes(query)) ||
        (card.dataset.description && card.dataset.description.includes(query));

      const matchesNamespace = !activeFacets.namespace || !activeFacets.namespace.length || 
        activeFacets.namespace.includes(card.dataset.namespace);

      const matchesType = !activeFacets.type || !activeFacets.type.length || 
        activeFacets.type.includes(card.dataset.type);

      const cardCategories = card.dataset.categories || '';
      const matchesCategory = !activeFacets.category || !activeFacets.category.length || 
        cardCategories.split(',').filter(c => c.trim()).some(c => activeFacets.category.includes(c.trim()));

      const isVisible = matchesSearch && matchesNamespace && matchesType && matchesCategory;
      
      card.style.display = isVisible ? 'flex' : 'none';
      if (isVisible) visibleCount++;
    });

    updateResultCount();

    // Show empty state if no results
    if (visibleCount === 0) {
      elements.emptyState.classList.remove('hidden');
      const hasFilters = query || 
        (activeFacets.namespace && activeFacets.namespace.length) || 
        (activeFacets.type && activeFacets.type.length) || 
        (activeFacets.category && activeFacets.category.length);
      document.getElementById('empty-message').textContent = 
        hasFilters
          ? 'No items match your search or filters.'
          : 'No items found in this registry.';
    } else {
      elements.emptyState.classList.add('hidden');
    }
  }

  function updateResultCount() {
    const visible = getVisibleCardCount();
    const total = elements.grid.querySelectorAll('.component-card').length;
    elements.searchResultsLive.textContent = `Showing ${visible} of ${total} items`;
  }

  function getVisibleCardCount() {
    return elements.grid.querySelectorAll('.component-card:not([style*="display: none"])').length;
  }

  // ============================================================================
  // Component Detail Modal
  // ============================================================================

  async function openItem(namespace, name) {
    lastFocusedCard = document.activeElement;

    try {
      // Fetch component details
      const url = `./r/${namespace}/${name}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          show404Modal(name);
          return;
        }
        throw new Error(`Failed to load component: ${response.status}`);
      }

      const component = await response.json();
      renderModal(component, namespace, name);
      elements.modal.showModal();

      track('modal_open', { component: name, namespace });
    } catch (error) {
      console.error('Failed to load component:', error);
      showToast('Failed to load component details', 'error');
    }
  }

  function openTokenDetail(token) {
    lastFocusedCard = document.activeElement;

    document.getElementById('modal-title').textContent = token.name || 'Token';
    document.getElementById('modal-description').textContent = token.description || '';

    const modalBody = document.getElementById('modal-body');
    
    // Create preview element safely using DOM manipulation instead of string interpolation
    let previewElement = null;
    const tokenValue = String(token.value || '').trim();
    
    if (token.category === 'colors' && tokenValue) {
      const sanitizedColor = sanitizeCSSValue(tokenValue, 'color');
      if (sanitizedColor) {
        previewElement = document.createElement('div');
        previewElement.className = 'token-modal-preview-color';
        previewElement.style.setProperty('background-color', sanitizedColor);
        previewElement.style.setProperty('width', '100px');
        previewElement.style.setProperty('height', '100px');
        previewElement.style.setProperty('border-radius', '8px');
        previewElement.style.setProperty('border', '1px solid var(--border-color)');
      }
    } else if ((token.category === 'space' || token.category === 'radius') && tokenValue) {
      const sanitizedSize = sanitizeCSSValue(tokenValue, 'size');
      if (sanitizedSize) {
        previewElement = document.createElement('div');
        previewElement.className = 'token-modal-preview-size';
        previewElement.style.setProperty('width', sanitizedSize);
        previewElement.style.setProperty('height', sanitizedSize);
        previewElement.style.setProperty('background', 'var(--accent)');
        previewElement.style.setProperty('border-radius', '4px');
      }
    } else if (token.category === 'typography' && tokenValue) {
      const sanitizedSize = sanitizeCSSValue(tokenValue, 'size');
      if (sanitizedSize) {
        previewElement = document.createElement('div');
        previewElement.className = 'token-modal-preview-text';
        previewElement.style.setProperty('font-size', sanitizedSize);
        previewElement.textContent = 'The quick brown fox jumps over the lazy dog';
      }
    }

    modalBody.innerHTML = `
      <div class="token-detail">
        ${previewElement ? '<div class="token-preview-large"></div>' : ''}
        
        <div class="token-info">
          <div class="info-row">
            <span class="info-label">Category:</span>
            <span class="info-value">${escapeHtml(token.category || 'unknown')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Value:</span>
            <code class="info-value">${escapeHtml(tokenValue)}</code>
          </div>
          <div class="info-row">
            <span class="info-label">Type:</span>
            <span class="info-value">${escapeHtml(token.type || 'unknown')}</span>
          </div>
        </div>

        <div class="copy-section">
          <button class="copy-btn" data-copy="${escapeHtml(tokenValue)}" onclick="copyToClipboard(this)">
            📋 Copy Value
          </button>
        </div>
      </div>
    `;

    // Safely append preview element if it exists
    if (previewElement) {
      const previewContainer = modalBody.querySelector('.token-preview-large');
      if (previewContainer) {
        previewContainer.appendChild(previewElement);
      }
    }

    elements.modal.showModal();
    track('modal_open', { token: token.name, category: token.category });
  }

  async function openItemFromHash() {
    const parsed = parseHash();
    if (!parsed) return;

    try {
      await openItem(parsed.ns, parsed.name);
    } catch (err) {
      console.error('Failed to open from hash:', err);
    }
  }

  function parseHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return null;

    const normalized = decodeURIComponent(hash.trim().toLowerCase());
    const [ns, name] = normalized.split('/');

    return name ? { ns, name } : { ns: 'ui', name: ns };
  }

  function show404Modal(name) {
    const modalBody = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = 'Component Not Found';
    document.getElementById('modal-description').textContent = '';

    modalBody.innerHTML = `
      <div class="not-found">
        <p>We couldn't find a component named "${escapeHtml(name)}".</p>
        <p>Try searching for it:</p>
        <input type="search" id="fallback-search" value="${escapeHtml(name)}" class="search-input" autofocus>
      </div>
    `;

    elements.modal.showModal();

    // Pre-fill search and trigger filter
    document.getElementById('fallback-search').addEventListener('input', (e) => {
      elements.searchInput.value = e.target.value;
      handleSearch({ target: { value: e.target.value } });
    });
  }

  function renderModal(component, namespace, name) {
    document.getElementById('modal-title').textContent = component.name || name;
    document.getElementById('modal-description').textContent = component.description || '';

    const modalBody = document.getElementById('modal-body');
    const shareUrl = `${window.location.origin}${window.location.pathname}#${namespace}/${name}`;

    modalBody.innerHTML = `
      ${renderInstallPanel(component, namespace, name, shareUrl)}
      ${renderOverviewSection(component)}
      ${renderUsageExamples(component)}
      ${renderPropsSection(component)}
      <div id="source-code-section" class="source-section">
        <h3>Source Code</h3>
        <div class="source-loading">Loading source code...</div>
      </div>
      ${renderMetadataSection(component)}
    `;

    // Setup PM switcher
    setupPMSwitcher(component);
    
    // Setup example tabs
    setupExampleTabs();
    
    // Load source code asynchronously
    loadSourceCode(component);
  }

  async function loadSourceCode(component) {
    const sourceSection = document.getElementById('source-code-section');
    if (!sourceSection) return;

    try {
      // Find the source file (index.tsx) in the files array
      const sourceFile = component.files?.find(f => 
        f.path && f.path.includes('index.tsx') && f.sha1
      );

      if (!sourceFile || !sourceFile.sha1) {
        sourceSection.innerHTML = `
          <h3>Source Code</h3>
          <p class="source-unavailable">Source code not available</p>
        `;
        return;
      }

      // Fetch source from blob (blobs are stored as ${sha1}.${extension})
      // blobsBaseUrl already includes /blobs, so just append the filename
      const blobBaseUrl = component.blobsBaseUrl || `${window.location.origin}/blobs`;
      // Extract extension from path (e.g., "index.tsx" -> "tsx")
      const extension = sourceFile.path.split('.').pop() || 'tsx';
      // blobsBaseUrl is like "http://localhost:7401/blobs", so append "/${sha1}.${extension}"
      const blobUrl = `${blobBaseUrl}/${sourceFile.sha1}.${extension}`;
      
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`Failed to load source: ${response.status}`);
      }

      const sourceCode = await response.text();
      
      sourceSection.innerHTML = `
        <div class="source-header">
          <h3>Source Code</h3>
          <button class="btn btn-secondary btn-small" onclick="window.dcpBrowse.copySourceCode()">
            📋 Copy Source
          </button>
        </div>
        <pre class="source-code"><code id="source-code-text">${escapeHtml(sourceCode)}</code></pre>
      `;

      // Store source code for copying
      window.dcpBrowse._sourceCode = sourceCode;

      track('source_loaded', { component: component.name });
    } catch (error) {
      console.error('Failed to load source:', error);
      sourceSection.innerHTML = `
        <h3>Source Code</h3>
        <p class="source-error">Failed to load source code: ${escapeHtml(error.message)}</p>
      `;
    }
  }

  function renderInstallPanel(component, namespace, name, shareUrl) {
    const registryUrl = component.registryUrl || `./r/${namespace}/${name}`;
    const aiPrompt = generateAIPrompt(component, namespace, name, shareUrl);

    return `
      <div class="install-panel">
        <h3>Installation</h3>
        
        <div class="pm-switcher">
          ${['npm', 'pnpm', 'yarn', 'bun'].map(pm => `
            <button class="pm-tab ${pm === currentPM ? 'active' : ''}" data-pm="${pm}">
              ${pm}
            </button>
          `).join('')}
        </div>

        <div id="install-command-container">
          ${renderInstallCommand(registryUrl, currentPM)}
        </div>

        ${renderDependencies(component.dependencies || [], component.peerDependencies || [])}

        <div class="action-buttons">
          <button class="btn btn-primary" onclick="window.dcpBrowse.copyInstallCommand()">
            📋 Copy Install Command
          </button>
          <button class="btn btn-secondary" onclick="window.dcpBrowse.copyShareLink('${shareUrl}')">
            🔗 Copy Link to Component
          </button>
          <button class="btn btn-ai" onclick="window.dcpBrowse.copyAIPrompt(\`${escapeForAttr(aiPrompt)}\`)">
            🤖 Ask AI About This
          </button>
        </div>
      </div>
    `;
  }

  function renderInstallCommand(registryUrl, pm) {
    const commands = {
      npm: `npx dcp registry add "${registryUrl}"`,
      pnpm: `pnpm dlx dcp registry add "${registryUrl}"`,
      yarn: `yarn dlx dcp registry add "${registryUrl}"`,
      bun: `bunx dcp registry add "${registryUrl}"`
    };

    return `
      <pre class="install-command"><code id="install-command-text">${escapeHtml(commands[pm])}</code></pre>
    `;
  }

  function renderDependencies(deps = [], peerDeps = []) {
    // Handle both array and object formats (server may return {} or [])
    const depsArray = Array.isArray(deps) ? deps : (deps && typeof deps === 'object' ? Object.keys(deps) : []);
    const peerDepsArray = Array.isArray(peerDeps) ? peerDeps : (peerDeps && typeof peerDeps === 'object' ? Object.keys(peerDeps) : []);
    const allDeps = [...depsArray, ...peerDepsArray];
    if (!allDeps.length) return '';

    return `
      <div class="dependencies">
        <h4>Dependencies</h4>
        <ul>
          ${allDeps.map(dep => `<li><code>${escapeHtml(dep)}</code></li>`).join('')}
        </ul>
      </div>
    `;
  }

  function renderPropsSection(component) {
    if (!component.props || Object.keys(component.props).length === 0) {
      return '<div class="props-section"><h3>Props</h3><p>No props documented.</p></div>';
    }

    const propsArray = Object.entries(component.props).map(([name, prop]) => ({
      name,
      ...prop
    }));

    return `
      <div class="props-section">
        <h3>Props</h3>
        <table class="props-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${propsArray.map(prop => `
              <tr>
                <td>
                  <code>${escapeHtml(prop.name)}</code>
                  ${prop.required ? '<span class="required-badge">Required</span>' : ''}
                </td>
                <td><code>${escapeHtml(prop.type || 'any')}</code></td>
                <td>${prop.default ? `<code>${escapeHtml(String(prop.default))}</code>` : '—'}</td>
                <td>${escapeHtml(prop.description || '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderOverviewSection(component) {
    const rows = [];
    
    // Data completeness badge
    const validation = component._validation || {};
    const completenessBadge = validation.complete 
      ? '<span class="completeness-badge complete">✅ Complete</span>'
      : validation.missing?.length > 0
        ? `<span class="completeness-badge incomplete" title="Missing: ${escapeHtml(validation.missing.join(', '))}">⚠️ Incomplete</span>`
        : '';
    
    if (component.version) {
      rows.push(`<tr><td><strong>Version</strong></td><td>${escapeHtml(component.version)}</td></tr>`);
    }
    if (component.type) {
      rows.push(`<tr><td><strong>Type</strong></td><td>${escapeHtml(component.type)}</td></tr>`);
    }
    if (component.namespace) {
      rows.push(`<tr><td><strong>Namespace</strong></td><td>${escapeHtml(component.namespace)}</td></tr>`);
    }
    if (component.categories?.length) {
      rows.push(`<tr><td><strong>Categories</strong></td><td>${component.categories.map(c => escapeHtml(c)).join(', ')}</td></tr>`);
    }
    if (component.sourceFile) {
      rows.push(`<tr><td><strong>Source File</strong></td><td><code class="source-file-path" onclick="copySourcePath(this)">${escapeHtml(component.sourceFile)}</code></td></tr>`);
    }
    if (component.lastExtracted) {
      const extractedDate = new Date(component.lastExtracted);
      const daysAgo = Math.floor((Date.now() - extractedDate.getTime()) / (1000 * 60 * 60 * 24));
      const relativeTime = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
      rows.push(`<tr><td><strong>Updated</strong></td><td>${relativeTime} <span class="text-tertiary">(${extractedDate.toLocaleDateString()})</span></td></tr>`);
    }

    if (!rows.length) return '';

    return `
      <div class="overview-section">
        <div class="overview-header">
          <h3>Overview</h3>
          ${completenessBadge}
        </div>
        ${validation.warnings?.length > 0 ? `
          <div class="validation-warnings">
            ${validation.warnings.map(w => `<div class="warning-item">⚠️ ${escapeHtml(w)}</div>`).join('')}
          </div>
        ` : ''}
        <table class="overview-table">
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function copySourcePath(element) {
    const text = element.textContent.trim();
    copyToClipboard(text, 'Source path copied!');
  }

  // Expose to global scope (object already initialized)
  if (window.dcpBrowse) {
    window.dcpBrowse.copySourcePath = copySourcePath;
  }

  /**
   * Convert name to PascalCase for JSX usage
   */
  function toPascalCase(name) {
    if (!name) return 'Component';
    // Handle already PascalCase
    if (/^[A-Z][a-zA-Z0-9]*$/.test(name) && name.charAt(0) === name.charAt(0).toUpperCase()) {
      return name;
    }
    // Split on various delimiters and capitalize each word
    return name
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  function renderUsageExamples(component) {
    // PRIORITY 1: Use canonical examples from meta.json (built during build-packs)
    // These come from the actual extracted component code/schema
    if (component.examples && Array.isArray(component.examples) && component.examples.length > 0) {
      // Examples are already built correctly from extraction - use them!
      const examples = component.examples;
      
      if (examples.length === 0) return '';

      const tabsHtml = examples.map((ex, i) => `
        <button class="example-tab ${i === 0 ? 'active' : ''}" data-example-index="${i}">
          ${escapeHtml(ex.title || ex.name || 'Example')}
        </button>
      `).join('');

      const examplesHtml = examples.map((ex, i) => `
        <div class="example-content ${i === 0 ? 'active' : ''}" data-example-index="${i}">
          <pre class="example-code"><code>${escapeHtml(ex.code || ex.codeBlock || '')}</code></pre>
          <button class="btn btn-secondary btn-small" onclick="window.dcpBrowse.copyExampleCode(${i})">
            📋 Copy Code
          </button>
        </div>
      `).join('');

      // Store examples globally for copy function
      if (window.dcpBrowse) {
        window.dcpBrowse._examples = examples;
      }

      return `
        <div class="usage-examples-section">
          <h3>Usage Examples</h3>
          <div class="example-tabs">
            ${tabsHtml}
          </div>
          ${examplesHtml}
        </div>
      `;
    }

    // PRIORITY 2: Fallback generation (only if examples missing from meta.json)
    // This should rarely happen if build-packs worked correctly
    const jsxName = component.jsxName || 
      toPascalCase(component.title || component.displayName || component.name || 'Component');
    const props = component.props || {};
    const variants = component.variants || {};
    const propsArray = Object.entries(props).map(([name, prop]) => ({ name, ...prop }));
    
    const examples = [];
    
    // Basic usage example - only include props with valid example values
    const requiredProps = propsArray
      .filter(p => p.required)
      .map(p => {
        const exampleValue = generateExampleValue(p.type, p.default);
        // Skip props with empty values (like empty objects)
        if (!exampleValue || exampleValue.trim() === '') {
          return null;
        }
        return `${p.name}${exampleValue.includes('=') ? '' : '='}${exampleValue}`;
      })
      .filter(Boolean); // Remove nulls
    
    const basicProps = requiredProps.length > 0 ? ` ${requiredProps.join(' ')}` : '';
    
    // Don't show "Content goes here" for components that don't take children
    const hasChildren = propsArray.some(p => p.name === 'children');
    const childrenContent = hasChildren ? '\n  Content goes here\n' : '\n';
    
    examples.push({
      title: 'Basic',
      code: `<${jsxName}${basicProps}>${childrenContent}</${jsxName}>`
    });

    // Variant examples
    if (Object.keys(variants).length > 0) {
      const firstVariantKey = Object.keys(variants)[0];
      const firstVariantValues = Array.isArray(variants[firstVariantKey]) 
        ? variants[firstVariantKey] 
        : [variants[firstVariantKey]];
      
      if (firstVariantValues.length > 0) {
        examples.push({
          title: `With ${firstVariantKey}`,
          code: `<${jsxName} ${firstVariantKey}="${firstVariantValues[0]}"${basicProps}>
  Content
</${jsxName}>`
        });
      }
    }

    // Complex example with multiple props (but skip empty/invalid values)
    const optionalProps = propsArray
      .filter(p => !p.required)
      .slice(0, 2)
      .map(p => {
        const exampleValue = generateExampleValue(p.type, p.default);
        // Skip props with empty values (like empty objects)
        if (!exampleValue || exampleValue.trim() === '') {
          return null;
        }
        return `${p.name}${exampleValue.includes('=') ? '' : '='}${exampleValue}`;
      })
      .filter(Boolean); // Remove nulls
    
    if (optionalProps.length > 0) {
      examples.push({
        title: 'Complex',
        code: `<${jsxName} ${optionalProps.join(' ')}${basicProps}>
  <span>Custom content</span>
</${jsxName}>`
      });
    }

    if (examples.length === 0) return '';

    const tabsHtml = examples.map((ex, i) => `
      <button class="example-tab ${i === 0 ? 'active' : ''}" data-example-index="${i}">
        ${escapeHtml(ex.title)}
      </button>
    `).join('');

    const examplesHtml = examples.map((ex, i) => `
      <div class="example-content ${i === 0 ? 'active' : ''}" data-example-index="${i}">
        <pre class="example-code"><code>${escapeHtml(ex.code)}</code></pre>
        <button class="btn btn-secondary btn-small" onclick="window.dcpBrowse.copyExampleCode(${i})">
          📋 Copy Code
        </button>
      </div>
    `).join('');

    // Store examples globally for copy function (object already initialized)
    if (window.dcpBrowse) {
      window.dcpBrowse._examples = examples;
    }

    return `
      <div class="usage-examples-section">
        <h3>Usage Examples</h3>
        <div class="example-tabs">
          ${tabsHtml}
        </div>
        ${examplesHtml}
      </div>
    `;
  }

  function generateExampleValue(type, defaultValue) {
    if (defaultValue !== null && defaultValue !== undefined) {
      if (typeof defaultValue === 'string') {
        return `"${defaultValue}"`;
      } else if (typeof defaultValue === 'boolean') {
        return `{${defaultValue}}`;
      } else if (typeof defaultValue === 'number') {
        return `{${defaultValue}}`;
      }
      return `{${JSON.stringify(defaultValue)}}`;
    }
    
    // Better defaults based on type
    const typeLower = (type || '').toLowerCase();
    
    if (typeLower.includes('number')) {
      return '{42}';
    }
    if (typeLower.includes('boolean') || typeLower.includes('bool')) {
      return '{true}';
    }
    if (typeLower.includes('function') || typeLower.includes('callback')) {
      return '{() => {}}';
    }
    if (typeLower.includes('array') || typeLower.includes('[]')) {
      return '{[]}';
    }
    if (typeLower.includes('object') || typeLower.includes('{}')) {
      // Don't generate empty object props - they're usually wrong
      return ''; // Skip props with empty object defaults
    }
    if (typeLower.includes('enum') || typeLower.includes('variant')) {
      return '"default"';
    }
    
    // Default to string
    return '"example"';
  }

  function renderMetadataSection(component) {
    const metadata = [];
    
    if (component.version) metadata.push(`Version: ${component.version}`);
    if (component.type) metadata.push(`Type: ${component.type}`);
    if (component.categories?.length) metadata.push(`Categories: ${component.categories.join(', ')}`);

    if (!metadata.length) return '';

    return `
      <div class="props-section">
        <h3>Metadata</h3>
        <p>${metadata.map(escapeHtml).join(' • ')}</p>
      </div>
    `;
  }

  function setupExampleTabs() {
    const tabs = document.querySelectorAll('.example-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const index = tab.dataset.exampleIndex;
        document.querySelectorAll('.example-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.example-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const content = document.querySelector(`.example-content[data-example-index="${index}"]`);
        if (content) content.classList.add('active');
        
        track('example_tab_switch', { index });
      });
    });
  }

  function copyExampleCode(index) {
    const examples = window.dcpBrowse._examples || [];
    const example = examples[index];
    if (example) {
      copyToClipboard(example.code, 'Example copied!');
      track('example_copied', { index, component: example.title });
    }
  }

  // Expose to global scope (object already initialized)
  if (window.dcpBrowse) {
    window.dcpBrowse.copyExampleCode = copyExampleCode;
  }

  function setupPMSwitcher(component) {
    const tabs = document.querySelectorAll('.pm-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const pm = tab.dataset.pm;
        currentPM = pm;
        localStorage.setItem('preferred-pm', pm);

        // Update active state
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update command
        const registryUrl = component.registryUrl || './r/ui/component';
        document.getElementById('install-command-container').innerHTML = 
          renderInstallCommand(registryUrl, pm);

        track('pm_switched', { pm });
      });
    });
  }

  function closeModal() {
    elements.modal.close();
    window.location.hash = '';
    
    if (lastFocusedCard) {
      lastFocusedCard.focus();
      lastFocusedCard = null;
    }
  }

  // ============================================================================
  // Clipboard & AI Prompts
  // ============================================================================

  function generateAIPrompt(component, namespace, name, url) {
    const props = Object.keys(component.props || {}).join(', ');
    return `Use @${namespace}/${name} from ${url}. Props: ${props}. Generate a [describe your use case].`;
  }

  async function copyToClipboard(text, successMessage = 'Copied to clipboard!') {
    try {
      // Modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast(successMessage, 'success');
        return;
      }

      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (success) {
        showToast(successMessage, 'success');
      } else {
        throw new Error('Copy command failed');
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast('Failed to copy. Please copy manually.', 'error');
    }
  }

  // ============================================================================
  // Package Manager Detection
  // ============================================================================

  function detectPackageManager() {
    const stored = localStorage.getItem('preferred-pm');
    if (stored) return stored;

    // Default to npm (can't detect lockfiles from browser)
    return 'npm';
  }

  // ============================================================================
  // Toast Notifications
  // ============================================================================

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' 
      ? '✓' 
      : type === 'error' 
      ? '✕' 
      : 'ℹ';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  function showError(message) {
    elements.loadingState.classList.add('hidden');
    elements.errorState.classList.remove('hidden');
    document.getElementById('error-message').textContent = message;
    track('error', { message });
  }

  function showEmptyState(message) {
    elements.emptyState.classList.remove('hidden');
    document.getElementById('empty-message').textContent = message;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeForAttr(unsafe) {
    return escapeHtml(unsafe).replace(/`/g, '\\`');
  }

  // ============================================================================
  // Public API (for inline event handlers)
  // ============================================================================
  // Initialize methods (object already exists, just populate methods)

  window.dcpBrowse.copyInstallCommand = () => {
    const text = document.getElementById('install-command-text')?.textContent;
    if (text) {
      copyToClipboard(text, 'Install command copied!');
      track('copy_install', { pm: currentPM });
    }
  };

  window.dcpBrowse.copyShareLink = (url) => {
    copyToClipboard(url, 'Link copied!');
    track('copy_link', { url });
  };

  window.dcpBrowse.copyAIPrompt = (prompt) => {
    copyToClipboard(prompt, 'AI prompt copied!');
    track('copy_ai_prompt', {});
  };

  window.dcpBrowse.copySourceCode = () => {
    const sourceCode = window.dcpBrowse._sourceCode;
    if (sourceCode) {
      copyToClipboard(sourceCode, 'Source code copied!');
      track('copy_source', {});
    } else {
      showToast('Source code not loaded yet', 'error');
    }
  };

})();

