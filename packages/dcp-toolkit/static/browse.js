/**
 * DCP Browse UI - Component Browser
 * Production-ready with facet filters, PM detection, AI prompts, and accessibility
 */

(function() {
  'use strict';

  // State
  let indexData = null;
  let components = [];
  let activeFacets = {
    namespace: [],
    type: [],
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
      components = indexData.components || [];

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
    if (!components.length) {
      showEmptyState('No components found in this registry.');
      return;
    }

    elements.grid.innerHTML = '';
    elements.emptyState.classList.add('hidden');

    components.forEach(comp => {
      const card = createComponentCard(comp);
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
    const propsCount = comp.props ? Object.keys(comp.props).length : 0;

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
    const namespaces = [...new Set(components.map(c => c.namespace || 'ui'))];
    const types = [...new Set(components.map(c => c.type || 'component'))];
    const categories = [...new Set(components.flatMap(c => c.categories || []))];

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
      const count = components.filter(c => {
        if (facetType === 'namespace') return (c.namespace || 'ui') === value;
        if (facetType === 'type') return (c.type || 'component') === value;
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
        card.dataset.name.includes(query) ||
        card.dataset.description.includes(query);

      const matchesNamespace = !activeFacets.namespace.length || 
        activeFacets.namespace.includes(card.dataset.namespace);

      const matchesType = !activeFacets.type.length || 
        activeFacets.type.includes(card.dataset.type);

      const matchesCategory = !activeFacets.category.length || 
        card.dataset.categories.split(',').some(c => activeFacets.category.includes(c));

      const isVisible = matchesSearch && matchesNamespace && matchesType && matchesCategory;
      
      card.style.display = isVisible ? 'flex' : 'none';
      if (isVisible) visibleCount++;
    });

    updateResultCount();

    // Show empty state if no results
    if (visibleCount === 0) {
      elements.emptyState.classList.remove('hidden');
      document.getElementById('empty-message').textContent = 
        query || activeFacets.namespace.length || activeFacets.type.length || activeFacets.category.length
          ? 'No components match your search or filters.'
          : 'No components found in this registry.';
    } else {
      elements.emptyState.classList.add('hidden');
    }
  }

  function updateResultCount() {
    const visible = getVisibleCardCount();
    const total = elements.grid.querySelectorAll('.component-card').length;
    elements.searchResultsLive.textContent = `Showing ${visible} of ${total} components`;
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
      ${renderPropsSection(component)}
      ${renderMetadataSection(component)}
    `;

    // Setup PM switcher
    setupPMSwitcher(component);
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

        ${renderDependencies(component.dependencies, component.peerDependencies)}

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
    const allDeps = [...deps, ...peerDeps];
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

  window.dcpBrowse = {
    copyInstallCommand: () => {
      const text = document.getElementById('install-command-text').textContent;
      copyToClipboard(text, 'Install command copied!');
      track('copy_install', { pm: currentPM });
    },

    copyShareLink: (url) => {
      copyToClipboard(url, 'Link copied!');
      track('copy_link', { url });
    },

    copyAIPrompt: (prompt) => {
      copyToClipboard(prompt, 'AI prompt copied!');
      track('copy_ai_prompt', {});
    }
  };

})();

