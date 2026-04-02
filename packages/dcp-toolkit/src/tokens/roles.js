/**
 * Canonical Semantic Role Definitions
 *
 * This is the contract between token extraction and consumption.
 * Roles are the stable API that generators, previews, and binding UIs target.
 * Token inventories are mapped TO these roles. Generators consume FROM them.
 *
 * Adding or removing roles is a versioned change.
 */

export const CONTRACT_VERSION = '0.1.0';

// ── Color Roles ──────────────────────────────────────────────────────

export const COLOR_ROLES = Object.freeze({
  // Surfaces
  'bg.default':    { category: 'surface',  description: 'Default page/content background' },
  'bg.muted':      { category: 'surface',  description: 'Subdued background for secondary areas' },
  'bg.elevated':   { category: 'surface',  description: 'Raised surface (cards, popovers)' },
  'bg.overlay':    { category: 'surface',  description: 'Overlay/backdrop behind modals' },

  // Content
  'text.primary':  { category: 'content',  description: 'Primary readable text' },
  'text.muted':    { category: 'content',  description: 'De-emphasized secondary text' },
  'text.onAccent': { category: 'content',  description: 'Text on accent-colored backgrounds' },
  'text.disabled': { category: 'content',  description: 'Disabled/inactive text' },

  // Borders
  'border.default': { category: 'border', description: 'Default border for containers' },
  'border.muted':   { category: 'border', description: 'Subtle dividers and separators' },
  'border.focus':   { category: 'border', description: 'Focus ring / keyboard navigation indicator' },

  // Accent
  'accent.primary': { category: 'accent', description: 'Primary brand/action color' },
  'accent.on':      { category: 'accent', description: 'Content on top of accent color' },

  // Intent
  'intent.danger':  { category: 'intent', description: 'Destructive/error state' },
  'intent.warning': { category: 'intent', description: 'Warning/caution state' },
  'intent.success': { category: 'intent', description: 'Success/positive state' },
  'intent.info':    { category: 'intent', description: 'Informational state' },
});

// ── Typography Roles ─────────────────────────────────────────────────

export const TYPOGRAPHY_ROLES = Object.freeze({
  'text.hero':       { category: 'heading',  description: 'Hero/display heading' },
  'text.h1':         { category: 'heading',  description: 'Page title' },
  'text.h2':         { category: 'heading',  description: 'Section heading' },
  'text.h3':         { category: 'heading',  description: 'Subsection heading' },
  'text.body':       { category: 'body',     description: 'Default body text' },
  'text.bodyStrong': { category: 'body',     description: 'Emphasized body text' },
  'text.label':      { category: 'ui',       description: 'Form labels and UI labels' },
  'text.caption':    { category: 'ui',       description: 'Small helper text, captions' },
  'text.button':     { category: 'ui',       description: 'Button label text' },
  'text.input':      { category: 'ui',       description: 'Form input text' },
});

// ── Spacing Roles ────────────────────────────────────────────────────

export const SPACING_ROLES = Object.freeze({
  'space.xs':  { category: 'spacing', description: 'Extra-small spacing (tight gaps)' },
  'space.sm':  { category: 'spacing', description: 'Small spacing' },
  'space.md':  { category: 'spacing', description: 'Medium/default spacing' },
  'space.lg':  { category: 'spacing', description: 'Large spacing' },
  'space.xl':  { category: 'spacing', description: 'Extra-large spacing (section gaps)' },
});

// ── Helpers ──────────────────────────────────────────────────────────

const ALL_COLOR_ROLE_IDS = Object.keys(COLOR_ROLES);
const ALL_TYPOGRAPHY_ROLE_IDS = Object.keys(TYPOGRAPHY_ROLES);
const ALL_SPACING_ROLE_IDS = Object.keys(SPACING_ROLES);

/**
 * Check if a string is a valid color role ID.
 */
export function isColorRole(id) {
  return ALL_COLOR_ROLE_IDS.includes(id);
}

/**
 * Check if a string is a valid typography role ID.
 */
export function isTypographyRole(id) {
  return ALL_TYPOGRAPHY_ROLE_IDS.includes(id);
}

/**
 * Check if a string is a valid spacing role ID.
 */
export function isSpacingRole(id) {
  return ALL_SPACING_ROLE_IDS.includes(id);
}

/**
 * Check if a string is a valid role ID of any type.
 */
export function isValidRole(id) {
  return isColorRole(id) || isTypographyRole(id) || isSpacingRole(id);
}

/**
 * Get the role definition for a given role ID, or null.
 */
export function getRoleDefinition(id) {
  return COLOR_ROLES[id] || TYPOGRAPHY_ROLES[id] || SPACING_ROLES[id] || null;
}

/**
 * Get all role IDs for a given domain.
 */
export function getRoleIds(domain) {
  switch (domain) {
    case 'color': return ALL_COLOR_ROLE_IDS;
    case 'typography': return ALL_TYPOGRAPHY_ROLE_IDS;
    case 'spacing': return ALL_SPACING_ROLE_IDS;
    default: return [...ALL_COLOR_ROLE_IDS, ...ALL_TYPOGRAPHY_ROLE_IDS, ...ALL_SPACING_ROLE_IDS];
  }
}

/**
 * Validate a bindings object. Returns { valid, errors }.
 * Checks that all role IDs are recognized and all required fields are present.
 */
export function validateBindings(bindings) {
  const errors = [];

  if (!bindings || typeof bindings !== 'object') {
    return { valid: false, errors: ['Bindings must be an object'] };
  }

  for (const domain of ['color', 'typography', 'spacing']) {
    const domainBindings = bindings[domain];
    if (!domainBindings) continue;

    for (const [roleId, binding] of Object.entries(domainBindings)) {
      // Check role ID is valid
      if (!isValidRole(roleId)) {
        errors.push(`Unknown role: "${roleId}" in ${domain} bindings`);
        continue;
      }

      // Check required fields
      if (!binding.token) {
        errors.push(`Missing "token" for role "${roleId}"`);
      }
      if (typeof binding.confidence !== 'number' || binding.confidence < 0 || binding.confidence > 1) {
        errors.push(`Invalid confidence for role "${roleId}": must be a number between 0 and 1`);
      }
      if (binding.source && !['auto', 'manual', 'site-import'].includes(binding.source)) {
        errors.push(`Invalid source for role "${roleId}": must be "auto", "manual", or "site-import"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
