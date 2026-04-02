/**
 * Auto-Mapping Heuristics Engine
 *
 * Maps extracted tokens to the canonical semantic role contract.
 * Five heuristic layers run in order; later layers can boost/override earlier ones.
 *
 * Layer 1: Name pattern matching
 * Layer 2: Value-based inference (color lightness/saturation)
 * Layer 3: Structural inference (palette scale detection)
 * Layer 4: ShadCN/Tailwind convention matching
 * Layer 5: Cross-reference with utilityMappings
 *
 * Output: role bindings with confidence scores + mapping report.
 */

import {
  CONTRACT_VERSION,
  COLOR_ROLES,
  TYPOGRAPHY_ROLES,
  SPACING_ROLES,
  getRoleIds,
} from './roles.js';

// ── Layer 1: Name Pattern Matching ───────────────────────────────────

/**
 * Patterns map token name substrings/regexes to candidate roles.
 * Order matters: first match wins within a layer, but later layers can override.
 */
const NAME_PATTERNS_COLOR = [
  // Surfaces — patterns match against name with -- stripped
  { pattern: /(?:^|[-_.])background$/i,                         role: 'bg.default',     confidence: 0.85 },
  { pattern: /muted(?!.*foreground)|subtle|secondary-bg/i,      role: 'bg.muted',       confidence: 0.75 },
  { pattern: /card(?!.*foreground)|elevated|popover(?!.*fore)/i, role: 'bg.elevated',    confidence: 0.75 },
  { pattern: /overlay|backdrop|scrim/i,                         role: 'bg.overlay',     confidence: 0.75 },

  // Content
  { pattern: /(?:^|[-_.])foreground$/i,                         role: 'text.primary',   confidence: 0.85 },
  { pattern: /muted.foreground|muted.text|text.muted/i,        role: 'text.muted',     confidence: 0.80 },
  { pattern: /on.?accent|primary.foreground|on.?primary/i,     role: 'text.onAccent',  confidence: 0.80 },
  { pattern: /disabled|inactive/i,                              role: 'text.disabled',  confidence: 0.80 },

  // Borders
  { pattern: /(?:^|[-_.])border$/i,                             role: 'border.default', confidence: 0.85 },
  { pattern: /input(?!.*foreground)|border.muted|divider/i,     role: 'border.muted',   confidence: 0.70 },
  { pattern: /ring|focus/i,                                     role: 'border.focus',   confidence: 0.80 },

  // Accent
  { pattern: /(?:^|[-_.])primary$/i,                            role: 'accent.primary', confidence: 0.85 },
  { pattern: /(?:^|[-_.])accent$/i,                             role: 'accent.primary', confidence: 0.80 },
  { pattern: /accent.foreground|primary.foreground/i,           role: 'accent.on',      confidence: 0.75 },

  // Intent
  { pattern: /destructive|danger|error/i,                       role: 'intent.danger',  confidence: 0.85 },
  { pattern: /warning|caution/i,                                role: 'intent.warning', confidence: 0.80 },
  { pattern: /success|positive/i,                               role: 'intent.success', confidence: 0.80 },
  { pattern: /info(?:rmation(?:al)?)?$/i,                       role: 'intent.info',    confidence: 0.75 },
];

// ── Layer 4: ShadCN Convention Matching ──────────────────────────────
// (Defined here because it's a static lookup used by the mapper)

const SHADCN_MAP = {
  '--background':              { role: 'bg.default',     confidence: 0.95 },
  '--foreground':              { role: 'text.primary',   confidence: 0.95 },
  '--card':                    { role: 'bg.elevated',    confidence: 0.90 },
  '--card-foreground':         { role: 'text.primary',   confidence: 0.80 },
  '--popover':                 { role: 'bg.elevated',    confidence: 0.85 },
  '--popover-foreground':      { role: 'text.primary',   confidence: 0.75 },
  '--primary':                 { role: 'accent.primary', confidence: 0.95 },
  '--primary-foreground':      { role: 'accent.on',      confidence: 0.90 },
  '--secondary':               { role: 'bg.muted',       confidence: 0.80 },
  '--secondary-foreground':    { role: 'text.primary',   confidence: 0.70 },
  '--muted':                   { role: 'bg.muted',       confidence: 0.90 },
  '--muted-foreground':        { role: 'text.muted',     confidence: 0.90 },
  '--accent':                  { role: 'bg.muted',       confidence: 0.75 },
  '--accent-foreground':       { role: 'text.primary',   confidence: 0.70 },
  '--destructive':             { role: 'intent.danger',  confidence: 0.95 },
  '--destructive-foreground':  { role: 'text.onAccent',  confidence: 0.75 },
  '--border':                  { role: 'border.default', confidence: 0.95 },
  '--input':                   { role: 'border.muted',   confidence: 0.80 },
  '--ring':                    { role: 'border.focus',   confidence: 0.90 },
};

// ── Main Mapper Class ────────────────────────────────────────────────

export class AutoMapper {
  /**
   * @param {Object} options
   * @param {boolean} [options.shadcnMode=true] - Boost ShadCN convention matching
   * @param {boolean} [options.verbose=false] - Log mapping decisions
   */
  constructor(options = {}) {
    this.shadcnMode = options.shadcnMode !== false;
    this.verbose = options.verbose || false;
  }

  /**
   * Main entry point. Maps tokens to roles.
   *
   * @param {Object} params
   * @param {Object} params.themes - Formalized themes from themes.js
   * @param {Object} [params.tokens] - Flat token inventory (colors, spacing, typography)
   * @param {Object} [params.utilityMappings] - From themeContext.utilityMappings
   * @returns {{ bindings, mappingReport }}
   */
  map({ themes = {}, tokens = {}, utilityMappings = {} }) {
    // Collect all candidate tokens for mapping
    const colorCandidates = this.collectColorCandidates(themes, tokens);
    const typographyCandidates = this.collectTypographyCandidates(tokens);
    const spacingCandidates = this.collectSpacingCandidates(tokens);

    // Extract binding hints from utility mappings
    const utilityHints = this.buildUtilityHints(utilityMappings);

    // Run heuristic layers for colors
    const colorBindings = this.mapColors(colorCandidates, themes, utilityHints);

    // Run heuristic layers for typography
    const typographyBindings = this.mapTypography(typographyCandidates);

    // Run heuristic layers for spacing
    const spacingBindings = this.mapSpacing(spacingCandidates);

    // Build mapping report
    const report = this.buildReport(colorBindings, typographyBindings, spacingBindings, {
      colorCandidates,
      typographyCandidates,
      spacingCandidates,
    });

    return {
      bindings: {
        contractVersion: CONTRACT_VERSION,
        color: colorBindings,
        typography: typographyBindings,
        spacing: spacingBindings,
      },
      mappingReport: report,
    };
  }

  // ── Candidate Collection ─────────────────────────────────────────

  /**
   * Collect all color token names from themes and flat tokens.
   * Returns array of { name, value, source, themeId }.
   */
  collectColorCandidates(themes, tokens) {
    const candidates = [];
    const seen = new Set();

    // From themes (higher priority — theme-scoped tokens are more reliable)
    for (const [themeId, theme] of Object.entries(themes)) {
      if (!theme.tokens) continue;
      for (const [name, data] of Object.entries(theme.tokens)) {
        if (data.type === 'color' || this.looksLikeColor(name, data.value)) {
          const key = name;
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push({
              name,
              value: data.value,
              type: 'color',
              source: 'theme',
              themeId,
            });
          }
        }
      }
    }

    // From flat token inventory
    if (tokens.colors) {
      for (const [name, data] of Object.entries(tokens.colors)) {
        if (!seen.has(name)) {
          seen.add(name);
          candidates.push({
            name,
            value: typeof data === 'object' ? data.value : data,
            type: 'color',
            source: 'inventory',
            themeId: null,
          });
        }
      }
    }

    return candidates;
  }

  collectTypographyCandidates(tokens) {
    const candidates = [];
    if (!tokens.typography) return candidates;

    for (const [name, data] of Object.entries(tokens.typography)) {
      candidates.push({
        name,
        value: typeof data === 'object' ? data.value : data,
        type: data?.type || 'typography',
        source: 'inventory',
      });
    }

    return candidates;
  }

  collectSpacingCandidates(tokens) {
    const candidates = [];
    if (!tokens.spacing) return candidates;

    for (const [name, data] of Object.entries(tokens.spacing)) {
      candidates.push({
        name,
        value: typeof data === 'object' ? data.value : data,
        type: 'dimension',
        source: 'inventory',
      });
    }

    return candidates;
  }

  // ── Color Mapping ────────────────────────────────────────────────

  mapColors(candidates, themes, utilityHints) {
    // Track best match per role: { role -> { token, confidence, source, reason } }
    const best = {};

    for (const candidate of candidates) {
      // Layer 4 first (ShadCN) — highest-confidence static lookup
      if (this.shadcnMode) {
        const shadcnKey = candidate.name.startsWith('--') ? candidate.name : `--${candidate.name}`;
        const shadcnMatch = SHADCN_MAP[shadcnKey];
        if (shadcnMatch) {
          this.updateBest(best, shadcnMatch.role, {
            token: candidate.name,
            confidence: shadcnMatch.confidence,
            source: 'auto',
            reason: `ShadCN convention: ${shadcnKey}`,
          });
          continue; // ShadCN match is definitive, skip other layers for this token
        }
      }

      // Layer 1: Name pattern matching
      for (const { pattern, role, confidence } of NAME_PATTERNS_COLOR) {
        const nameToTest = candidate.name.replace(/^--/, '');
        if (pattern.test(nameToTest) || pattern.test(candidate.name)) {
          this.updateBest(best, role, {
            token: candidate.name,
            confidence,
            source: 'auto',
            reason: `Name pattern: ${pattern.source}`,
          });
          break; // First pattern match wins for this candidate
        }
      }

      // Layer 5: Utility mapping cross-reference (confidence boost)
      const hintKey = candidate.name.startsWith('--') ? candidate.name : `--${candidate.name}`;
      const hint = utilityHints[hintKey];
      if (hint) {
        // If this token already has a binding, boost its confidence
        for (const [role, binding] of Object.entries(best)) {
          if (binding.token === candidate.name) {
            const categoryMatch = this.hintMatchesRole(hint.categories, role);
            if (categoryMatch) {
              binding.confidence = Math.min(1.0, binding.confidence + 0.10);
              binding.reason += ` + utility hint (${hint.categories.join(',')})`;
            }
          }
        }
      }
    }

    // Layer 2: Value-based inference (boost existing bindings)
    this.applyValueHeuristics(best, candidates, themes);

    // Layer 3: Structural inference (palette detection)
    this.applyPaletteHeuristics(best, candidates);

    return best;
  }

  // ── Typography Mapping ───────────────────────────────────────────

  mapTypography(candidates) {
    const best = {};

    // Sort by name to get predictable ordering for scale detection
    const sorted = [...candidates].sort((a, b) => {
      const sizeA = this.extractNumericSize(a);
      const sizeB = this.extractNumericSize(b);
      return sizeA - sizeB;
    });

    // Named pattern matching
    const typoPatterns = [
      { pattern: /hero|display|jumbo/i,          role: 'text.hero',       confidence: 0.70 },
      { pattern: /h1|heading-?1|title-?xl/i,     role: 'text.h1',         confidence: 0.70 },
      { pattern: /h2|heading-?2|title-?lg/i,     role: 'text.h2',         confidence: 0.65 },
      { pattern: /h3|heading-?3|title-?md/i,     role: 'text.h3',         confidence: 0.65 },
      { pattern: /^body$|^base$|body-?default|text-?base/i, role: 'text.body',   confidence: 0.80 },
      { pattern: /body.?strong|body.?bold|semibold/i, role: 'text.bodyStrong', confidence: 0.65 },
      { pattern: /label|form-?label/i,            role: 'text.label',      confidence: 0.70 },
      { pattern: /caption|helper|hint/i,          role: 'text.caption',    confidence: 0.70 },
      { pattern: /button|btn/i,                   role: 'text.button',     confidence: 0.65 },
      { pattern: /input|field/i,                  role: 'text.input',      confidence: 0.60 },
    ];

    for (const candidate of sorted) {
      for (const { pattern, role, confidence } of typoPatterns) {
        if (pattern.test(candidate.name)) {
          this.updateBest(best, role, {
            token: candidate.name,
            confidence,
            source: 'auto',
            reason: `Name pattern: ${pattern.source}`,
          });
          break;
        }
      }
    }

    // Scale-based inference: if we have a Tailwind-style size scale (xs, sm, base, lg, xl, 2xl...)
    if (sorted.length >= 4 && Object.keys(best).length < 4) {
      this.inferTypographyFromScale(best, sorted);
    }

    return best;
  }

  // ── Spacing Mapping ──────────────────────────────────────────────

  mapSpacing(candidates) {
    const best = {};

    // Sort by numeric value
    const sorted = [...candidates].sort((a, b) => {
      return this.parseSpacingValue(a.value) - this.parseSpacingValue(b.value);
    });

    // Named pattern matching
    const spacingPatterns = [
      { pattern: /^(xs|extra.?small|1|0\.25)$/i, role: 'space.xs', confidence: 0.70 },
      { pattern: /^(sm|small|2|0\.5)$/i,          role: 'space.sm', confidence: 0.70 },
      { pattern: /^(md|medium|base|4|1)$/i,       role: 'space.md', confidence: 0.70 },
      { pattern: /^(lg|large|6|1\.5)$/i,           role: 'space.lg', confidence: 0.65 },
      { pattern: /^(xl|extra.?large|8|2)$/i,       role: 'space.xl', confidence: 0.60 },
    ];

    for (const candidate of sorted) {
      for (const { pattern, role, confidence } of spacingPatterns) {
        if (pattern.test(candidate.name)) {
          this.updateBest(best, role, {
            token: candidate.name,
            confidence,
            source: 'auto',
            reason: `Name pattern: ${pattern.source}`,
          });
          break;
        }
      }
    }

    // Scale-based inference: map by position in sorted order
    if (sorted.length >= 4 && Object.keys(best).length < 3) {
      this.inferSpacingFromScale(best, sorted);
    }

    return best;
  }

  // ── Heuristic Helpers ────────────────────────────────────────────

  /**
   * Layer 2: Value-based heuristics. Boosts confidence for tokens whose
   * color values match expected patterns for their bound role.
   */
  applyValueHeuristics(best, candidates, themes) {
    for (const [role, binding] of Object.entries(best)) {
      const candidate = candidates.find(c => c.name === binding.token);
      if (!candidate) continue;

      const lightness = this.estimateLightness(candidate.value);
      if (lightness === null) continue;

      // Light theme heuristics
      if (role.startsWith('bg.') && lightness > 90) {
        binding.confidence = Math.min(1.0, binding.confidence + 0.05);
      }
      if (role.startsWith('text.') && role !== 'text.onAccent' && lightness < 20) {
        binding.confidence = Math.min(1.0, binding.confidence + 0.05);
      }
    }

    // Check for dark theme counterparts — if same token name exists in both
    // light and dark themes, it's more likely to be a role-level token
    if (themes.light && themes.dark) {
      const lightNames = new Set(Object.keys(themes.light.tokens || {}));
      const darkNames = new Set(Object.keys(themes.dark.tokens || {}));
      for (const [role, binding] of Object.entries(best)) {
        const name = binding.token.startsWith('--') ? binding.token : `--${binding.token}`;
        const rawName = binding.token.replace(/^--/, '');
        if ((lightNames.has(name) && darkNames.has(name)) ||
            (lightNames.has(rawName) && darkNames.has(rawName))) {
          binding.confidence = Math.min(1.0, binding.confidence + 0.05);
        }
      }
    }
  }

  /**
   * Layer 3: Palette/scale detection. If tokens form a numeric scale
   * (50, 100, ... 900), infer roles from position in the scale.
   */
  applyPaletteHeuristics(best, candidates) {
    // Group candidates by family (e.g., "slate-50", "slate-100" → family "slate")
    const families = {};
    for (const candidate of candidates) {
      const name = candidate.name.replace(/^--/, '');
      const match = name.match(/^(.+?)[-.]?(\d{2,3})$/);
      if (match) {
        const family = match[1];
        const step = parseInt(match[2], 10);
        if (!families[family]) families[family] = [];
        families[family].push({ ...candidate, step });
      }
    }

    // Only process families with palette-like scales (3+ steps)
    for (const [family, steps] of Object.entries(families)) {
      if (steps.length < 3) continue;
      steps.sort((a, b) => a.step - b.step);

      // Lightest step → bg.default candidate (if no better match)
      if (!best['bg.default'] || best['bg.default'].confidence < 0.70) {
        const lightest = steps[0];
        this.updateBest(best, 'bg.default', {
          token: lightest.name,
          confidence: 0.55,
          source: 'auto',
          reason: `Palette inference: lightest step of ${family}`,
        });
      }

      // Darkest step → text.primary candidate
      if (!best['text.primary'] || best['text.primary'].confidence < 0.70) {
        const darkest = steps[steps.length - 1];
        this.updateBest(best, 'text.primary', {
          token: darkest.name,
          confidence: 0.55,
          source: 'auto',
          reason: `Palette inference: darkest step of ${family}`,
        });
      }
    }
  }

  /**
   * Infer typography roles from a size scale when named patterns didn't match.
   */
  inferTypographyFromScale(best, sorted) {
    const roles = ['text.caption', 'text.label', 'text.body', 'text.h3', 'text.h2', 'text.h1', 'text.hero'];

    // Map scale positions to roles based on count
    const count = sorted.length;
    const bodyIndex = Math.floor(count * 0.4); // body is ~40% up the scale

    const assignments = [
      { index: 0, role: 'text.caption', confidence: 0.50 },
      { index: Math.max(1, bodyIndex - 1), role: 'text.label', confidence: 0.45 },
      { index: bodyIndex, role: 'text.body', confidence: 0.55 },
      { index: Math.min(count - 1, bodyIndex + 2), role: 'text.h3', confidence: 0.45 },
      { index: Math.min(count - 1, bodyIndex + 3), role: 'text.h2', confidence: 0.40 },
      { index: count - 1, role: 'text.h1', confidence: 0.40 },
    ];

    for (const { index, role, confidence } of assignments) {
      if (index < count && !best[role]) {
        this.updateBest(best, role, {
          token: sorted[index].name,
          confidence,
          source: 'auto',
          reason: 'Scale position inference',
        });
      }
    }
  }

  /**
   * Infer spacing roles from a value-sorted scale.
   */
  inferSpacingFromScale(best, sorted) {
    const count = sorted.length;
    const roleMap = ['space.xs', 'space.sm', 'space.md', 'space.lg', 'space.xl'];

    // Pick evenly-spaced indices
    for (let i = 0; i < roleMap.length && i < count; i++) {
      const index = Math.round((i / (roleMap.length - 1)) * (count - 1));
      if (!best[roleMap[i]]) {
        this.updateBest(best, roleMap[i], {
          token: sorted[index].name,
          confidence: 0.45,
          source: 'auto',
          reason: 'Scale position inference',
        });
      }
    }
  }

  // ── Utility Methods ──────────────────────────────────────────────

  /**
   * Update best match for a role. Higher confidence wins.
   * Manual bindings always beat auto bindings.
   */
  updateBest(best, role, candidate) {
    const existing = best[role];
    if (!existing) {
      best[role] = candidate;
      return;
    }

    // Manual always wins
    if (existing.source === 'manual' && candidate.source === 'auto') return;
    if (candidate.source === 'manual' && existing.source === 'auto') {
      best[role] = candidate;
      return;
    }

    // Higher confidence wins; on tie, prefer shorter token name (more canonical)
    if (candidate.confidence > existing.confidence ||
        (candidate.confidence === existing.confidence &&
         candidate.token.length < existing.token.length)) {
      best[role] = candidate;
    }
  }

  buildUtilityHints(utilityMappings) {
    if (!utilityMappings) return {};
    const hints = {};

    for (const [className, mapping] of Object.entries(utilityMappings)) {
      const varName = mapping.cssVariable;
      if (!varName) continue;
      if (!hints[varName]) hints[varName] = { categories: [], utilities: [] };
      if (!hints[varName].categories.includes(mapping.category)) {
        hints[varName].categories.push(mapping.category);
      }
      hints[varName].utilities.push(className);
    }

    return hints;
  }

  hintMatchesRole(categories, role) {
    if (role.startsWith('bg.') && categories.includes('background')) return true;
    if (role.startsWith('text.') && categories.includes('text')) return true;
    if (role.startsWith('border.') && (categories.includes('border') || categories.includes('ring'))) return true;
    if (role.startsWith('accent.') && categories.includes('background')) return true;
    return false;
  }

  looksLikeColor(name, value) {
    if (/color|background|foreground|primary|secondary|accent|destructive|muted|border|ring/i.test(name)) return true;
    if (typeof value !== 'string') return false;
    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return true;
    if (/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%/.test(value)) return true;
    if (/^(rgb|hsl|oklch)\(/.test(value)) return true;
    return false;
  }

  /**
   * Estimate lightness (0-100) from a value string. Returns null if unparseable.
   */
  estimateLightness(value) {
    if (typeof value !== 'string') return null;

    // HSL-like values: "222.2 47.4% 11.2%"
    const hslMatch = value.match(/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+(\d+(\.\d+)?)%$/);
    if (hslMatch) return parseFloat(hslMatch[3]);

    // hsl() function: "hsl(222, 47%, 11%)"
    const hslFnMatch = value.match(/hsl\(\s*\d+[^,]*,\s*\d+[^,]*,\s*(\d+(\.\d+)?)%/);
    if (hslFnMatch) return parseFloat(hslFnMatch[1]);

    // Hex values
    const hexMatch = value.match(/^#([0-9a-fA-F]{3,8})$/);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      // Approximate perceived lightness
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) * 100;
    }

    return null;
  }

  extractNumericSize(candidate) {
    const value = candidate.value;
    if (typeof value !== 'string') return 0;
    const match = value.match(/^(\d+(\.\d+)?)(px|rem|em)?$/);
    if (match) {
      let num = parseFloat(match[1]);
      if (match[3] === 'rem' || match[3] === 'em') num *= 16;
      return num;
    }
    return 0;
  }

  parseSpacingValue(value) {
    if (typeof value !== 'string') return 0;
    const match = value.match(/^(\d+(\.\d+)?)(px|rem|em|%)?$/);
    if (match) {
      let num = parseFloat(match[1]);
      if (match[3] === 'rem' || match[3] === 'em') num *= 16;
      return num;
    }
    return 0;
  }

  // ── Mapping Report ───────────────────────────────────────────────

  buildReport(colorBindings, typographyBindings, spacingBindings, candidates) {
    const allBindings = {
      ...colorBindings,
      ...typographyBindings,
      ...spacingBindings,
    };

    const totalCandidates =
      candidates.colorCandidates.length +
      candidates.typographyCandidates.length +
      candidates.spacingCandidates.length;

    const boundTokens = new Set(Object.values(allBindings).map(b => b.token));

    let autoBound = 0;
    let suggested = 0;
    let uncertain = 0;
    const conflicts = [];
    const reviewItems = [];

    for (const [role, binding] of Object.entries(allBindings)) {
      if (binding.confidence >= 0.85) autoBound++;
      else if (binding.confidence >= 0.70) {
        suggested++;
        reviewItems.push({
          role,
          token: binding.token,
          confidence: binding.confidence,
          reason: binding.reason,
        });
      } else {
        uncertain++;
        reviewItems.push({
          role,
          token: binding.token,
          confidence: binding.confidence,
          reason: binding.reason,
        });
      }
    }

    // Unmapped tokens
    const allCandidateNames = [
      ...candidates.colorCandidates.map(c => c.name),
      ...candidates.typographyCandidates.map(c => c.name),
      ...candidates.spacingCandidates.map(c => c.name),
    ];
    const unmappedTokens = allCandidateNames
      .filter(name => !boundTokens.has(name))
      .map(name => ({ token: name }));

    // Missing required roles (roles with no binding at all)
    const allRoleIds = getRoleIds();
    const boundRoles = new Set(Object.keys(allBindings));
    const missingRoles = allRoleIds.filter(r => !boundRoles.has(r));

    return {
      total: totalCandidates,
      autoBound,
      suggested,
      uncertain,
      unmapped: unmappedTokens.length,
      missingRoles,
      reviewItems,
      unmappedTokens,
    };
  }
}

/**
 * Convenience function: run auto-mapping with defaults.
 */
export function autoMap({ themes, tokens, utilityMappings } = {}) {
  const mapper = new AutoMapper();
  return mapper.map({ themes, tokens, utilityMappings });
}
