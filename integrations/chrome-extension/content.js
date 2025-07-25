// Content script for Design System Extractor
let extractorActive = false;
let hoveredElement = null;
let overlay = null;
let selectedElements = [];
// Create overlay for highlighting elements
function createOverlay() {
  overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.border = '2px solid #3b82f6';
  overlay.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '2147483647'; // Maximum z-index
  overlay.style.display = 'none';
  document.body.appendChild(overlay);
}
// Extract DOM tree recursively
function extractDOMTree(root) {
  if (!root) return null;
  function serializeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue?.trim();
      return text ? { type: 'text', value: text } : null;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const element = node;
    const tag = element.tagName.toLowerCase();
    const classList = Array.from(element.classList);
    const id = element.id || null;
    const role = element.getAttribute('role') || null;
    const computed = window.getComputedStyle(element);
    // Extract useful computed styles
    const style = {
      // Layout
      display: computed.display,
      position: computed.position,
      flexDirection: computed.flexDirection,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      gap: computed.gap,
      // Spacing
      padding: computed.padding,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      margin: computed.margin,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,
      // Sizing
      width: computed.width,
      height: computed.height,
      maxWidth: computed.maxWidth,
      maxHeight: computed.maxHeight,
      minWidth: computed.minWidth,
      minHeight: computed.minHeight,
      // Typography
      color: computed.color,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontFamily: computed.fontFamily,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textAlign: computed.textAlign,
      textTransform: computed.textTransform,
      // Appearance
      backgroundColor: computed.backgroundColor,
      backgroundImage: computed.backgroundImage,
      borderRadius: computed.borderRadius,
      border: computed.border,
      borderWidth: computed.borderWidth,
      borderStyle: computed.borderStyle,
      borderColor: computed.borderColor,
      boxShadow: computed.boxShadow,
      opacity: computed.opacity,
      // Transitions
      transition: computed.transition,
      transitionProperty: computed.transitionProperty,
      transitionDuration: computed.transitionDuration,
      transitionTimingFunction: computed.transitionTimingFunction,
    };
    // Get bounding client rect for layout information
    const rect = element.getBoundingClientRect();
    const boundingBox = {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      x: rect.x,
      y: rect.y,
    };
    // Add computed design tokens
    const designTokens = mapStylesToTokens(style);
    return {
      type: 'element',
      tag,
      id,
      role,
      classList,
      style,
      designTokens,
      boundingBox,
      children: Array.from(element.childNodes)
        .map(serializeNode)
        .filter(Boolean),
    };
  }
  return serializeNode(root);
}
// Map computed styles to design system tokens
function mapStylesToTokens(styles) {
  const tokens = {};
  // Color mapping
  if (styles.backgroundColor) {
    // Primary colors
    if (
      styles.backgroundColor === 'rgb(37, 99, 235)' ||
      styles.backgroundColor === 'rgb(59, 130, 246)'
    ) {
      tokens.backgroundColor = 'primary';
    }
    // Secondary colors
    else if (
      styles.backgroundColor === 'rgb(243, 244, 246)' ||
      styles.backgroundColor === 'rgb(229, 231, 235)'
    ) {
      tokens.backgroundColor = 'secondary';
    }
    // Success colors
    else if (
      styles.backgroundColor === 'rgb(22, 163, 74)' ||
      styles.backgroundColor === 'rgb(34, 197, 94)'
    ) {
      tokens.backgroundColor = 'success';
    }
    // Warning colors
    else if (
      styles.backgroundColor === 'rgb(234, 179, 8)' ||
      styles.backgroundColor === 'rgb(250, 204, 21)'
    ) {
      tokens.backgroundColor = 'warning';
    }
    // Error colors
    else if (
      styles.backgroundColor === 'rgb(220, 38, 38)' ||
      styles.backgroundColor === 'rgb(239, 68, 68)'
    ) {
      tokens.backgroundColor = 'error';
    }
    // Transparent
    else if (
      styles.backgroundColor === 'rgba(0, 0, 0, 0)' ||
      styles.backgroundColor === 'transparent'
    ) {
      tokens.backgroundColor = 'transparent';
    }
  }
  // Text colors
  if (styles.color) {
    if (styles.color === 'rgb(255, 255, 255)') {
      tokens.textColor = 'white';
    } else if (
      styles.color === 'rgb(17, 24, 39)' ||
      styles.color === 'rgb(31, 41, 55)'
    ) {
      tokens.textColor = 'foreground';
    } else if (styles.color === 'rgb(107, 114, 128)') {
      tokens.textColor = 'muted-foreground';
    } else if (styles.color === 'rgb(37, 99, 235)') {
      tokens.textColor = 'primary';
    }
  }
  // Border radius
  if (styles.borderRadius) {
    if (styles.borderRadius === '0.125rem' || styles.borderRadius === '2px') {
      tokens.borderRadius = 'rounded-sm';
    } else if (
      styles.borderRadius === '0.25rem' ||
      styles.borderRadius === '4px'
    ) {
      tokens.borderRadius = 'rounded';
    } else if (
      styles.borderRadius === '0.375rem' ||
      styles.borderRadius === '6px'
    ) {
      tokens.borderRadius = 'rounded-md';
    } else if (
      styles.borderRadius === '0.5rem' ||
      styles.borderRadius === '8px'
    ) {
      tokens.borderRadius = 'rounded-lg';
    } else if (
      styles.borderRadius === '0.75rem' ||
      styles.borderRadius === '12px'
    ) {
      tokens.borderRadius = 'rounded-xl';
    } else if (
      styles.borderRadius === '1rem' ||
      styles.borderRadius === '16px'
    ) {
      tokens.borderRadius = 'rounded-2xl';
    } else if (styles.borderRadius === '9999px') {
      tokens.borderRadius = 'rounded-full';
    }
  }
  // Font sizes
  if (styles.fontSize) {
    if (styles.fontSize === '0.75rem' || styles.fontSize === '12px') {
      tokens.fontSize = 'text-xs';
    } else if (styles.fontSize === '0.875rem' || styles.fontSize === '14px') {
      tokens.fontSize = 'text-sm';
    } else if (styles.fontSize === '1rem' || styles.fontSize === '16px') {
      tokens.fontSize = 'text-base';
    } else if (styles.fontSize === '1.125rem' || styles.fontSize === '18px') {
      tokens.fontSize = 'text-lg';
    } else if (styles.fontSize === '1.25rem' || styles.fontSize === '20px') {
      tokens.fontSize = 'text-xl';
    } else if (styles.fontSize === '1.5rem' || styles.fontSize === '24px') {
      tokens.fontSize = 'text-2xl';
    }
  }
  // Font weights
  if (styles.fontWeight) {
    if (styles.fontWeight === '300') {
      tokens.fontWeight = 'font-light';
    } else if (styles.fontWeight === '400') {
      tokens.fontWeight = 'font-normal';
    } else if (styles.fontWeight === '500') {
      tokens.fontWeight = 'font-medium';
    } else if (styles.fontWeight === '600') {
      tokens.fontWeight = 'font-semibold';
    } else if (styles.fontWeight === '700') {
      tokens.fontWeight = 'font-bold';
    }
  }
  // Spacing (padding and margin)
  if (styles.padding === '0.25rem 0.5rem' || styles.padding === '4px 8px') {
    tokens.padding = 'p-1';
  } else if (
    styles.padding === '0.5rem 1rem' ||
    styles.padding === '8px 16px'
  ) {
    tokens.padding = 'px-4 py-2';
  } else if (
    styles.padding === '0.75rem 1.5rem' ||
    styles.padding === '12px 24px'
  ) {
    tokens.padding = 'px-6 py-3';
  }
  // Shadow mapping
  if (styles.boxShadow) {
    if (
      styles.boxShadow.includes('0 1px 2px') ||
      styles.boxShadow.includes('0 1px 3px')
    ) {
      tokens.shadow = 'shadow-sm';
    } else if (
      styles.boxShadow.includes('0 4px 6px') ||
      styles.boxShadow.includes('0 10px 15px')
    ) {
      tokens.shadow = 'shadow-md';
    } else if (
      styles.boxShadow.includes('0 10px 25px') ||
      styles.boxShadow.includes('0 20px 25px')
    ) {
      tokens.shadow = 'shadow-lg';
    }
  }
  return tokens;
}
// Generate a component name based on the element and its classes
function generateComponentName(element) {
  if (!element) return 'Component';
  const { tag, classList } = element;
  // Try to derive name from class list first
  if (classList) {
    if (classList.includes('primary-button')) return 'PrimaryButton';
    if (classList.includes('secondary-button')) return 'SecondaryButton';
    if (classList.includes('tertiary-button')) return 'TertiaryButton';
    if (classList.includes('card-primary')) return 'PrimaryCard';
    if (classList.includes('card-secondary')) return 'SecondaryCard';
    if (classList.includes('form-input')) return 'FormInput';
    // Look for meaningful class names
    const significantClass = classList.find(c => 
      c.includes('button') || 
      c.includes('card') || 
      c.includes('input') ||
      c.includes('nav') ||
      c.includes('header') ||
      c.includes('footer') ||
      c.includes('menu') ||
      c.includes('modal') ||
      c.includes('dialog') ||
      c.includes('alert')
    );
    if (significantClass) {
      // Convert kebab-case to PascalCase
      return significantClass
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
    }
  }
  // Fall back to tag-based naming with capitalization
  const tagName = tag.charAt(0).toUpperCase() + tag.slice(1);
  if (tag === 'button') return 'Button';
  if (tag === 'input') return 'Input';
  if (tag === 'div' && classList && classList.some(c => c.includes('card'))) return 'Card';
  return tagName + 'Component';
}
// Generate Tailwind classes from styles and design tokens
function generateTailwindClasses(styles, designTokens = {}) {
  const classes = [];
  // Use design tokens if available, otherwise fallback to direct style mapping
  // Background
  if (designTokens.backgroundColor) {
    classes.push(`bg-${designTokens.backgroundColor}`);
  } else if (
    styles.backgroundColor &&
    styles.backgroundColor !== 'rgba(0, 0, 0, 0)'
  ) {
    // Would need color parsing logic for exact mapping
    if (styles.backgroundColor === 'rgb(37, 99, 235)')
      classes.push('bg-blue-600');
    if (styles.backgroundColor === 'rgb(22, 163, 74)')
      classes.push('bg-green-600');
  }
  // Text color
  if (designTokens.textColor) {
    classes.push(`text-${designTokens.textColor}`);
  } else if (styles.color) {
    if (styles.color === 'rgb(255, 255, 255)') classes.push('text-white');
    if (styles.color === 'rgb(107, 114, 128)') classes.push('text-gray-500');
  }
  // Border radius
  if (designTokens.borderRadius) {
    classes.push(designTokens.borderRadius);
  } else if (styles.borderRadius) {
    if (styles.borderRadius === '0.375rem') classes.push('rounded-md');
    if (styles.borderRadius === '9999px') classes.push('rounded-full');
  }
  // Font size
  if (designTokens.fontSize) {
    classes.push(designTokens.fontSize);
  } else if (styles.fontSize) {
    if (styles.fontSize === '0.875rem') classes.push('text-sm');
    if (styles.fontSize === '1rem') classes.push('text-base');
  }
  // Font weight
  if (designTokens.fontWeight) {
    classes.push(designTokens.fontWeight);
  } else if (styles.fontWeight) {
    if (styles.fontWeight === '500') classes.push('font-medium');
    if (styles.fontWeight === '600') classes.push('font-semibold');
  }
  // Padding
  if (designTokens.padding) {
    classes.push(designTokens.padding);
  } else if (styles.padding) {
    if (styles.padding === '0.5rem 1rem') classes.push('px-4 py-2');
    if (styles.padding === '0.75rem 1.5rem') classes.push('px-6 py-3');
  }
  // Shadow
  if (designTokens.shadow) {
    classes.push(designTokens.shadow);
  } else if (styles.boxShadow && styles.boxShadow !== 'none') {
    classes.push('shadow');
  }
  // Layout classes
  if (styles.display === 'flex') classes.push('flex');
  if (styles.alignItems === 'center') classes.push('items-center');
  if (styles.justifyContent === 'center') classes.push('justify-center');
  if (styles.flexDirection === 'column') classes.push('flex-col');
  // Border
  if (styles.border && styles.border !== 'none') classes.push('border');
  if (styles.borderColor === 'rgb(229, 231, 235)')
    classes.push('border-gray-200');
  return classes.join(' ');
}
// Generate a React component from extracted data
function generateReactComponent(data) {
  if (!data) return '';
  const { tag, style, designTokens } = data;
  const componentName = generateComponentName(data);
  const tailwindClasses = generateTailwindClasses(style, designTokens);
  return `import React from 'react';
export interface ${componentName}Props {
  children?: React.ReactNode;
  className?: string;
}
export const ${componentName}: React.FC<${componentName}Props> = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <${tag}
      className={\`${tailwindClasses} \${className || ''}\`}
      {...props}
    >
      {children}
    </${tag}>
  );
};`;
}
// Get a unique path to identify an element
function getElementPath(element) {
  let path = '';
  let current = element;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className) {
      const classes = Array.from(current.classList).join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }
    const siblings = Array.from(current.parentElement?.children || []);
    const index = siblings.indexOf(current);
    selector += `:nth-child(${index + 1})`;
    path = `${selector} > ${path}`;
    current = current.parentElement;
  }
  return path.slice(0, -3); // Remove trailing ' > '
}
// Handle element hover
function handleMouseOver(e) {
  if (!extractorActive) return;
  hoveredElement = e.target;
  // Update overlay position
  if (overlay && hoveredElement) {
    const rect = hoveredElement.getBoundingClientRect();
    overlay.style.top = `${window.scrollY + rect.top}px`;
    overlay.style.left = `${window.scrollX + rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.display = 'block';
  }
}
// Handle mouse out
function handleMouseOut() {
  if (!extractorActive) return;
  hoveredElement = null;
  if (overlay) {
    overlay.style.display = 'none';
  }
}
// Handle element click
function handleClick(e) {
  if (!extractorActive) return;
  e.preventDefault();
  e.stopPropagation();
  if (hoveredElement) {
    const isShiftClick = e.shiftKey;
    const data = extractDOMTree(hoveredElement);
    const elementPath = getElementPath(hoveredElement);
    if (isShiftClick) {
      // Check if element is already selected
      const isAlreadySelected = selectedElements.some(
        item => item.path === elementPath
      );
      if (!isAlreadySelected) {
        // Add to selection
        selectedElements.push({
          data,
          originalElement: hoveredElement,
          path: elementPath
        });
      }
    } else {
      // Replace selection
      selectedElements = [{
        data,
        originalElement: hoveredElement,
        path: elementPath
      }];
    }
    // Send extracted data to background script
    chrome.runtime.sendMessage({ 
      action: 'elementExtracted', 
      data: selectedElements.length === 1 ? data : {
        type: 'batch',
        elements: selectedElements.map(item => item.data)
      }
    });
    // Provide visual feedback
    showFeedback(isShiftClick 
      ? `Element added to selection (${selectedElements.length})` 
      : 'Element extracted!');
  }
}

// Show feedback message
function showFeedback(message) {
  const existingFeedback = document.querySelector('.dse-feedback');
  if (existingFeedback) {
    document.body.removeChild(existingFeedback);
  }
  const feedback = document.createElement('div');
  feedback.className = 'dse-feedback';
  feedback.textContent = message;
  document.body.appendChild(feedback);
  setTimeout(() => {
    if (document.body.contains(feedback)) {
      document.body.removeChild(feedback);
    }
  }, 2000);
}

// Create selection indicators for all selected elements
function updateSelectionHighlights() {
  // Remove existing selection highlights
  document.querySelectorAll('.dse-selection-highlight').forEach(el => {
    document.body.removeChild(el);
  });
  // Create new highlights for each selected element
  selectedElements.forEach((item, index) => {
    const { originalElement } = item;
    if (!originalElement || !document.body.contains(originalElement)) return;
    const rect = originalElement.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.className = 'dse-selection-highlight';
    highlight.style.top = `${window.scrollY + rect.top}px`;
    highlight.style.left = `${window.scrollX + rect.left}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
    // Add badge with selection number
    const badge = document.createElement('div');
    badge.className = 'dse-selection-badge';
    badge.textContent = `${index + 1}`;
    highlight.appendChild(badge);
    document.body.appendChild(highlight);
  });
}

// ---------------- In-page helper UI ----------------
let toolbarEl = null;
function createToolbar() {
  if (toolbarEl) return;
  toolbarEl = document.createElement('div');
  toolbarEl.className = 'dse-toolbar';
  toolbarEl.style.cssText = `
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 2147483647;
    background: #1e293b;
    color: #f1f5f9;
    border: 1px solid #334155;
    border-radius: 6px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    padding: 8px 12px;
    box-shadow: 0 2px 6px rgba(0,0,0,.25);
    max-width: 220px;
  `;
  toolbarEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <strong style="font-size:13px;">Selection Mode</strong>
      <button id="dse-exit-btn" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px;">Exit</button>
    </div>
    <div style="line-height:1.3;">
      • Click to select element<br/>
      • Shift&nbsp;+ Click = multi-select<br/>
      • Press Shift key (no click) to move <em>up</em> one parent<br/>
      • Esc or Exit button to quit
    </div>`;
  document.body.appendChild(toolbarEl);
  toolbarEl.querySelector('#dse-exit-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'toggleExtractor', value: false });
  });
}
function removeToolbar() {
  if (toolbarEl && document.body.contains(toolbarEl)) {
    document.body.removeChild(toolbarEl);
  }
  toolbarEl = null;
}

// ---------------- Keyboard shortcuts --------------
function handleKeyDown(e) {
  // Esc exits selection mode
  if (e.key === 'Escape') {
    chrome.runtime.sendMessage({ action: 'toggleExtractor', value: false });
    return;
  }
  // Shift bumps highlight to parent element (no click required)
  if (e.key === 'Shift' && hoveredElement) {
    bumpHoverParent();
  }
}

function bumpHoverParent() {
  if (!hoveredElement) return;
  const parent = hoveredElement.parentElement;
  if (parent && parent !== document.body) {
    hoveredElement = parent;
    if (overlay) {
      const rect = hoveredElement.getBoundingClientRect();
      overlay.style.top = `${window.scrollY + rect.top}px`;
      overlay.style.left = `${window.scrollX + rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.display = 'block';
    }
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'traverseUp') {
    bumpHoverParent();
    sendResponse({ ok: true });
    return true;
  }
  if (message.action === 'extractorStateChanged') {
    extractorActive = message.value;
    if (extractorActive) {
      // Create overlay if it doesn't exist
      if (!overlay) {
        createOverlay();
      }
      // Reset selections when activating
      selectedElements = [];
      // Add event listeners
      document.addEventListener('mouseover', handleMouseOver);
      document.addEventListener('mouseout', handleMouseOut);
      document.addEventListener('click', handleClick, true);
      // Change cursor for all elements
      document.body.style.cursor = 'crosshair';
      // Show feedback
      showFeedback('Selection mode active. Click on any element to extract.');
      // Create helper toolbar and keyboard shortcuts
      createToolbar();
      document.addEventListener('keydown', handleKeyDown);
    } else {
      // Remove event listeners
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick, true);
      // Reset cursor
      document.body.style.cursor = '';
      // Hide overlay
      if (overlay) {
        overlay.style.display = 'none';
      }
      // Remove selection highlights
      document.querySelectorAll('.dse-selection-highlight').forEach(el => {
        if (document.body.contains(el)) {
          document.body.removeChild(el);
        }
      });
      removeToolbar();
      document.removeEventListener('keydown', handleKeyDown);
    }
    sendResponse({ success: true });
  }
  return true;
});

// Initialize: check if we need to create overlay on script load
if (extractorActive && !overlay) {
  createOverlay();
}

// Handle window resize to update highlights
window.addEventListener('resize', () => {
  if (extractorActive && selectedElements.length > 0) {
    updateSelectionHighlights();
  }
});

// Handle scroll to update highlights
window.addEventListener('scroll', () => {
  if (extractorActive) {
    // Update hover overlay
    if (hoveredElement && overlay) {
      const rect = hoveredElement.getBoundingClientRect();
      overlay.style.top = `${window.scrollY + rect.top}px`;
      overlay.style.left = `${window.scrollX + rect.left}px`;
    }
    // Update selection highlights
    if (selectedElements.length > 0) {
      updateSelectionHighlights();
    }
  }
});

// Let the background script know the content script is loaded
chrome.runtime.sendMessage({ action: 'contentScriptLoaded' }); 