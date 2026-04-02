/**
 * Theme Formalization
 *
 * Normalizes the existing themeContext.cssVariables structure into
 * first-class theme scopes: { id, selector, mediaQuery, tokens }.
 *
 * This is a pure transform — no side effects, no file I/O.
 * Input: existing themeContext from extraction pipeline
 * Output: formalized themes object for the registry
 */

/**
 * Default selectors for well-known theme IDs.
 * These match what ShadCN, Tailwind, and most CSS-variable-based systems use.
 */
const DEFAULT_SELECTORS = {
  light: ':root',
  dark: '.dark',
};

const DEFAULT_MEDIA_QUERIES = {
  light: '(prefers-color-scheme: light)',
  dark: '(prefers-color-scheme: dark)',
};

/**
 * Normalize a themeContext (from DCP extraction) into formalized theme scopes.
 *
 * @param {Object} themeContext - The themeContext from extraction output
 * @param {Object} [options] - Override selectors or media queries
 * @returns {Object} Formalized themes: { [themeId]: { id, selector, mediaQuery, tokens } }
 */
export function formalizeThemes(themeContext, options = {}) {
  if (!themeContext) return {};

  const themes = {};

  // Extract from cssVariables (the primary source)
  if (themeContext.cssVariables) {
    for (const [themeId, variables] of Object.entries(themeContext.cssVariables)) {
      if (themeId === 'custom') {
        // Custom themes are nested one level deeper: { customName: { vars } }
        for (const [customId, customVars] of Object.entries(variables)) {
          if (customVars && typeof customVars === 'object' && Object.keys(customVars).length > 0) {
            themes[customId] = buildThemeScope(customId, customVars, options);
          }
        }
      } else if (variables && typeof variables === 'object' && Object.keys(variables).length > 0) {
        themes[themeId] = buildThemeScope(themeId, variables, options);
      }
    }
  }

  // If we have config-level info, enrich the theme scopes
  if (themeContext.config) {
    enrichFromConfig(themes, themeContext.config);
  }

  return themes;
}

/**
 * Build a single theme scope from raw CSS variable data.
 */
function buildThemeScope(themeId, rawVariables, options = {}) {
  const selectors = { ...DEFAULT_SELECTORS, ...options.selectors };
  const mediaQueries = { ...DEFAULT_MEDIA_QUERIES, ...options.mediaQueries };

  const tokens = {};
  for (const [varName, varData] of Object.entries(rawVariables)) {
    if (varData && typeof varData === 'object') {
      tokens[varName] = {
        value: varData.computed || varData.value || varData,
        type: inferTokenType(varName, varData),
        ...(varData.colorSpace ? { colorSpace: varData.colorSpace } : {}),
      };
    } else if (typeof varData === 'string') {
      tokens[varName] = {
        value: varData,
        type: inferTokenType(varName, { value: varData }),
      };
    }
  }

  return {
    id: themeId,
    selector: selectors[themeId] || null,
    mediaQuery: mediaQueries[themeId] || null,
    tokens,
  };
}

/**
 * Enrich themes with metadata from themeContext.config.
 */
function enrichFromConfig(themes, config) {
  // If config specifies a CSS variable prefix, note it
  if (config.prefix) {
    for (const theme of Object.values(themes)) {
      theme.prefix = config.prefix;
    }
  }

  // If config specifies theming mode, note it
  if (config.themingMode) {
    for (const theme of Object.values(themes)) {
      theme.themingMode = config.themingMode;
    }
  }
}

/**
 * Infer token type from variable name and value.
 */
function inferTokenType(varName, varData) {
  const value = typeof varData === 'object' ? (varData.value || '') : String(varData);

  // Color space indicators
  if (varData.colorSpace) return 'color';

  // HSL-like values (e.g., "222.2 47.4% 11.2%")
  if (/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(value)) return 'color';

  // Standard color formats
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return 'color';
  if (/^(rgb|hsl|oklch|lch|lab|hwb)\(/.test(value)) return 'color';

  // Dimension values
  if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(value)) return 'dimension';

  // Name-based inference
  const name = varName.toLowerCase();
  if (/color|background|foreground|primary|secondary|accent|destructive|muted|border|ring/.test(name)) {
    return 'color';
  }
  if (/radius|spacing|gap|padding|margin|size|width|height/.test(name)) {
    return 'dimension';
  }
  if (/font|weight|leading|tracking/.test(name)) {
    return 'typography';
  }

  return 'string';
}

/**
 * Merge utility mappings into theme scopes as binding hints.
 * This takes the existing utilityMappings and produces role-hint annotations.
 *
 * @param {Object} themes - Formalized themes object
 * @param {Object} utilityMappings - From themeContext.utilityMappings
 * @returns {Object} Token-to-hint map: { "--varName": { category, utilities } }
 */
export function extractBindingHints(utilityMappings) {
  if (!utilityMappings) return {};

  const hints = {};

  for (const [className, mapping] of Object.entries(utilityMappings)) {
    const varName = mapping.cssVariable;
    if (!varName) continue;

    if (!hints[varName]) {
      hints[varName] = { categories: new Set(), utilities: [] };
    }

    hints[varName].categories.add(mapping.category);
    hints[varName].utilities.push(className);
  }

  // Convert Sets to arrays for serialization
  const result = {};
  for (const [varName, hint] of Object.entries(hints)) {
    result[varName] = {
      categories: [...hint.categories],
      utilities: hint.utilities,
    };
  }

  return result;
}

/**
 * Get a flat list of all unique token names across all themes.
 */
export function getAllTokenNames(themes) {
  const names = new Set();
  for (const theme of Object.values(themes)) {
    if (theme.tokens) {
      for (const name of Object.keys(theme.tokens)) {
        names.add(name);
      }
    }
  }
  return [...names];
}

/**
 * Resolve a token value for a specific theme, falling back through themes.
 * Fallback order: requested theme → 'light' → first available theme.
 */
export function resolveTokenValue(themes, tokenName, themeId = 'light') {
  // Try requested theme
  const requestedTheme = themes[themeId];
  if (requestedTheme?.tokens?.[tokenName]) {
    return {
      value: requestedTheme.tokens[tokenName].value,
      theme: themeId,
      fallback: false,
    };
  }

  // Try light as fallback
  if (themeId !== 'light' && themes.light?.tokens?.[tokenName]) {
    return {
      value: themes.light.tokens[tokenName].value,
      theme: 'light',
      fallback: true,
    };
  }

  // Try first available theme
  for (const [id, theme] of Object.entries(themes)) {
    if (theme.tokens?.[tokenName]) {
      return {
        value: theme.tokens[tokenName].value,
        theme: id,
        fallback: true,
      };
    }
  }

  return null;
}
