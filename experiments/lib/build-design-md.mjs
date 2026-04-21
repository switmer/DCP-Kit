/**
 * build-design-md.mjs — turn a GSS shadcn.analysis.json into a per-site DESIGN.md.
 *
 * Design principle from the compiler-layers framing:
 *   raw observed → canonical filtered → semantic-overlayed → DESIGN.md synthesis
 *
 * Each synthesized claim carries source basis + confidence. Ambiguity is
 * recorded in-line, not polished away. Sections that the current instrument
 * cannot fill are named explicitly as gaps, not silently dropped.
 *
 * Input: the full GSS shadcn.analysis.json object (as written to
 * experiments/<slug>/gss-bindings.json).
 * Output: a markdown string.
 */

// ── HSL helpers (GSS writes shadcn-style "H S% L%" strings) ────────────
function hslStrToHex(hsl) {
  if (!hsl || typeof hsl !== 'string') return null;
  const m = hsl.trim().match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) return null;

  const hue = (t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue(h + 1 / 3);
    g = hue(h);
    b = hue(h - 1 / 3);
  }
  const to2 = (x) => Math.max(0, Math.min(255, Math.round(x * 255)))
    .toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

// ── Noise filters — what to drop from raw observed pools ───────────────
const NOISE_COLOR_RE = /^#(?:0{3,4}|fff0|[0-9a-f]{6}00|[0-9a-f]{8})$|^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$|^transparent$/i;

function isNoiseColor(hex) {
  if (!hex || typeof hex !== 'string') return true;
  const h = hex.trim();
  if (NOISE_COLOR_RE.test(h)) return true;
  if (h.startsWith('rgba') && /,\s*0\s*\)$/.test(h)) return true;
  return false;
}

function classifySpacing(token) {
  if (!token || typeof token !== 'string') return 'other';
  const t = token.trim();
  if (/^(?:\d+(?:\.\d+)?)(?:px|rem|em)$/.test(t)) {
    const n = parseFloat(t);
    if (t.endsWith('px') && n <= 64) return 'scale';
    if (t.endsWith('rem') || t.endsWith('em')) return n <= 4 ? 'scale' : 'section';
    if (t.endsWith('px')) return 'section';
  }
  if (/vw|vh|%$/.test(t)) return 'layout';
  if (/clamp\(/.test(t)) return 'fluid';
  return 'other';
}

// ── Canonical extraction ──────────────────────────────────────────────
function extractCanonical(gss) {
  const theme = gss.theme || {};
  const light = theme.light || {};
  const colorAnalysis = (gss.meta && gss.meta.colorAnalysis) || [];
  const bindings = (gss.bindings && gss.bindings.bindings) || {};
  const tokens = gss.tokens || {};

  // Colors: prefer entries from colorAnalysis that have real HSL data + decent
  // frequency. Drop transparent/short alphas.
  const colorCandidates = colorAnalysis
    .filter(c => c && c.color && !isNoiseColor(c.color))
    .filter(c => c.lightness != null && c.saturation != null)
    .sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

  // shadcn-style role tokens from theme.light (HSL → hex)
  const shadcnRoles = {};
  for (const [key, v] of Object.entries(light)) {
    if (typeof v === 'string' && /^\d+/.test(v.trim())) {
      shadcnRoles[key] = { hsl: v, hex: hslStrToHex(v) };
    }
  }

  // Typography: just the raw buckets, filtered
  const fontSizes = (tokens.fontSizes || []).filter(s =>
    typeof s === 'string' && (s.includes('rem') || s.includes('em') || s.includes('px'))
  );

  // Spacing: classify
  const spacingClassified = { scale: [], section: [], layout: [], fluid: [], other: [] };
  for (const s of (tokens.spacing || [])) {
    const cls = classifySpacing(s);
    if (!spacingClassified[cls].includes(s)) spacingClassified[cls].push(s);
  }

  const radii = (tokens.radii || []).filter(r =>
    typeof r === 'string' && !r.includes('%')
  );
  const percentRadii = (tokens.radii || []).filter(r =>
    typeof r === 'string' && r.includes('%')
  );

  return {
    colorCandidates,
    bindings,
    shadcnRoles,
    fontSizes,
    spacingClassified,
    radii,
    percentRadii,
    buttonColors: theme.buttonColors || {},
    layoutZoneColors: theme.layoutZoneColors || {},
    tailwind: (gss.meta?.semanticAnalysis?.tailwind) || null,
    totalTokens: gss.meta?.totalTokens || null,
    rawCss: gss.css || '',
  };
}

// ── Synthesis helpers ─────────────────────────────────────────────────
function countClamp(css) {
  return (css.match(/clamp\s*\(/g) || []).length;
}

function countMedia(css) {
  return (css.match(/@media[^{]*\{/g) || []).length;
}

function confBand(c) {
  if (typeof c !== 'number') return 'unknown';
  if (c >= 0.85) return 'high';
  if (c >= 0.65) return 'medium';
  return 'low';
}

// ── Validity rules ─────────────────────────────────────────────────────
// Validity is a rule-based plausibility score, independent of saliency
// (frequency × alias-depth × context-diversity). A binding can be highly
// salient and still low-validity — the canonical example is
// bg.default = rgba(0,0,0,.5): the extractor found it frequently, but a
// 50%-alpha black is shape-wrong for the role.
//
// The rules are explicit and documented. Adapters that disagree either
// override specific rules or compute their own validity. The point is
// that "validity" is not prose — it's a named prior.
//
// Each rule returns a penalty ∈ [0, 1] (how much to reduce validity by).
// Rules compose multiplicatively on (1 - penalty).

function parseColorForValidity(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const s = hex.trim();
  // 8-digit hex with alpha
  const m8 = s.match(/^#([0-9a-f]{8})$/i);
  if (m8) {
    const alpha = parseInt(m8[1].slice(6, 8), 16) / 255;
    return { kind: 'hex', alpha };
  }
  // 4-digit hex with alpha
  const m4 = s.match(/^#([0-9a-f]{4})$/i);
  if (m4) {
    const a = m4[1][3];
    const alpha = parseInt(a + a, 16) / 255;
    return { kind: 'hex', alpha };
  }
  // rgba() / rgb()
  const mr = s.match(/^rgba?\(([^)]+)\)$/i);
  if (mr) {
    const parts = mr[1].split(',').map(p => p.trim());
    const alpha = parts.length === 4 ? parseFloat(parts[3]) : 1;
    return { kind: 'rgba', alpha };
  }
  // 3/6-digit hex, no alpha channel
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return { kind: 'hex', alpha: 1 };
  // `transparent`
  if (s.toLowerCase() === 'transparent') return { kind: 'transparent', alpha: 0 };
  return null;
}

/**
 * Rule set for color-role validity. Each rule returns { penalty, reason } or null.
 * Final validity = product of (1 - penalty) over all firing rules.
 *
 * These rules are the schema-level contract for validity. Documented, testable,
 * replaceable. When a downstream consumer disagrees with a rule, they override
 * that specific rule — not the whole concept of validity.
 */
const COLOR_VALIDITY_RULES = [
  {
    id: 'surface-role-needs-opaque',
    applies: (role) => role.startsWith('bg.') || role === 'border.default' || role === 'border.muted',
    evaluate: (hex) => {
      const p = parseColorForValidity(hex);
      if (!p) return null;
      if (p.alpha < 0.95) {
        return {
          penalty: 0.75,
          reason: `role ${'bg.*/border.*'} expects opaque fill; observed alpha ${p.alpha.toFixed(2)}`,
        };
      }
      return null;
    },
  },
  {
    id: 'text-role-needs-substantial-opacity',
    applies: (role) => role.startsWith('text.'),
    evaluate: (hex) => {
      const p = parseColorForValidity(hex);
      if (!p) return null;
      if (p.alpha < 0.5) {
        return {
          penalty: 0.70,
          reason: `text role expects readable opacity; observed alpha ${p.alpha.toFixed(2)}`,
        };
      }
      return null;
    },
  },
  {
    id: 'collision-shared-hex-across-semantic-roles',
    // Populated by collision detector (not a per-token rule; applied at binding-set level).
    applies: () => false,
    evaluate: () => null,
  },
  {
    id: 'degenerate-value',
    applies: () => true,
    evaluate: (hex) => {
      if (typeof hex !== 'string') return { penalty: 1.0, reason: 'non-string color value' };
      const s = hex.trim();
      if (!s) return { penalty: 1.0, reason: 'empty color value' };
      if (/nan/i.test(s)) return { penalty: 1.0, reason: 'NaN in color value' };
      return null;
    },
  },
];

function computeColorValidity(role, hex) {
  let validity = 1.0;
  const appliedRules = [];
  for (const rule of COLOR_VALIDITY_RULES) {
    if (!rule.applies(role)) continue;
    const result = rule.evaluate(hex);
    if (!result) continue;
    validity *= (1 - result.penalty);
    appliedRules.push({ ruleId: rule.id, penalty: result.penalty, reason: result.reason });
  }
  return { validity, appliedRules };
}

/**
 * Detect cross-role hex collisions — same hex bound to two different semantic
 * roles on the same site. Each role in the collision takes a validity hit
 * scaled by how divergent the semantic intents are. This is what the
 * #c12126 accent.primary + intent.danger case needs.
 */
function applyCollisionPenalties(bindingsWithValidity) {
  const byHex = new Map();
  for (const [role, entry] of Object.entries(bindingsWithValidity)) {
    const key = (entry.hex || '').toLowerCase();
    if (!key) continue;
    if (!byHex.has(key)) byHex.set(key, []);
    byHex.get(key).push(role);
  }
  for (const [hex, roles] of byHex) {
    if (roles.length < 2) continue;
    // Cross-category collisions (e.g., accent.* and intent.*) are higher-penalty
    // than intra-category (e.g., two text.* roles) because the semantic distance
    // is larger.
    const categories = new Set(roles.map(r => r.split('.')[0]));
    const crossCategory = categories.size > 1;
    const penalty = crossCategory ? 0.45 : 0.20;
    for (const role of roles) {
      const e = bindingsWithValidity[role];
      // annotateBindingsWithValidity stores these as _validity / _validityRules
      // (underscore prefix). Keep the contract consistent here — previously
      // this function read e.validity / e.appliedRules and silently never
      // fired because no prior binding set had cross-role collisions.
      if (typeof e._validity === 'number') e._validity *= (1 - penalty);
      if (!Array.isArray(e._validityRules)) e._validityRules = [];
      e._validityRules.push({
        ruleId: 'collision-shared-hex-across-semantic-roles',
        penalty,
        reason: `${hex} also bound to ${roles.filter(r => r !== role).join(', ')}${crossCategory ? ' (cross-category)' : ''}`,
      });
    }
  }
}

// ── Substrate quality scoring + refusal floor ──────────────────────────
// Graceful degradation needs a refusal floor. Below a substrate threshold,
// emitting a 9-section narrative misleads readers who don't reliably
// downweight on "medium confidence" labels. Refusal is itself a useful
// output — it gives a cleanly measurable working range.
const REFUSAL_THRESHOLD = 0.55;
const ROLE_COVERAGE_FLOOR = 0.50;  // hard floor: must have ≥ half the contract slots filled

function scoreSubstrate(canonical, gss) {
  const bindings = gss.bindings?.bindings || {};
  const report = gss.bindings?.report || {};
  const boundRoles = Object.keys(bindings).length;
  const unmappedRoles = (report.unmappedRoles || []).length;
  const totalContractRoles = boundRoles + unmappedRoles;

  // Score components, each ∈ [0, 1].
  const roleCoverage = totalContractRoles ? boundRoles / totalContractRoles : 0;
  const fontSizeCoverage = Math.min(1, (canonical.fontSizes?.length || 0) / 8);
  const spacingCoverage = Math.min(1, (
    (canonical.spacingClassified?.scale?.length || 0) +
    (canonical.spacingClassified?.section?.length || 0)
  ) / 12);
  const responsiveSignal = ((canonical.rawCss || '').match(/clamp\s*\(/g) || []).length > 0 ||
                           ((canonical.rawCss || '').match(/@media[^{]*\{/g) || []).length > 0 ? 1 : 0;
  const colorCandidateDepth = Math.min(1, (canonical.colorCandidates?.length || 0) / 10);

  // Weighted sum. Role coverage dominates; responsive is a tiebreaker.
  const score = (
    roleCoverage       * 0.45 +
    colorCandidateDepth * 0.20 +
    fontSizeCoverage   * 0.15 +
    spacingCoverage    * 0.10 +
    responsiveSignal   * 0.10
  );

  // Refusal logic: weighted score OR hard floor on role coverage.
  // Role coverage is the single most load-bearing signal for "is this
  // reconstructable?" — if more than half the DCP contract's slots are empty,
  // narrative synthesis is mostly invention regardless of how rich the palette
  // or spacing happens to be. A smooth-mush case like a yellow-accent-only
  // brand site (4/14 roles bound, no @media, no clamp) should refuse even if
  // incidental signals (color saturation, spacing variety) are high.
  const roleCoverageBelowFloor = roleCoverage < ROLE_COVERAGE_FLOOR;
  const scoreBelowThreshold = score < REFUSAL_THRESHOLD;
  const refuse = scoreBelowThreshold || roleCoverageBelowFloor;

  return {
    score,
    components: {
      roleCoverage: { value: roleCoverage, weight: 0.45, note: `${boundRoles} / ${totalContractRoles} DCP roles bound${roleCoverageBelowFloor ? ' — BELOW HARD FLOOR (' + ROLE_COVERAGE_FLOOR + ')' : ''}` },
      colorCandidateDepth: { value: colorCandidateDepth, weight: 0.20, note: `${canonical.colorCandidates?.length || 0} usable color candidates` },
      fontSizeCoverage: { value: fontSizeCoverage, weight: 0.15, note: `${canonical.fontSizes?.length || 0} font-size tokens` },
      spacingCoverage: { value: spacingCoverage, weight: 0.10, note: `${(canonical.spacingClassified?.scale?.length || 0) + (canonical.spacingClassified?.section?.length || 0)} spacing tokens (scale+section)` },
      responsiveSignal: { value: responsiveSignal, weight: 0.10, note: responsiveSignal ? 'clamp() or @media present' : 'no clamp() or @media rules observed' },
    },
    refusalThreshold: REFUSAL_THRESHOLD,
    roleCoverageFloor: ROLE_COVERAGE_FLOOR,
    refuse,
    refuseReason: refuse
      ? (roleCoverageBelowFloor
          ? `role coverage ${roleCoverage.toFixed(2)} below hard floor ${ROLE_COVERAGE_FLOOR}`
          : `substrate score ${score.toFixed(2)} below threshold ${REFUSAL_THRESHOLD}`)
      : null,
  };
}

function renderRefusal({ gss, hostname, url, canonical, substrate }) {
  const bindings = gss.bindings?.bindings || {};
  const report = gss.bindings?.report || {};
  const now = new Date().toISOString();
  const lines = [];

  lines.push('---');
  lines.push(`source_url: ${url || 'https://' + hostname}`);
  lines.push(`hostname: ${hostname}`);
  lines.push(`extracted_at: ${now}`);
  lines.push(`extraction_mode: automatic`);
  lines.push(`extractor: Get-Site-Styles (semantic-bindings v${gss.bindings?.contractVersion || '?'})`);
  lines.push(`synthesizer: build-design-md.mjs (DCP live-site pipeline, refusal path)`);
  lines.push(`substrate_quality_score: ${substrate.score.toFixed(2)}`);
  lines.push(`refusal_threshold: ${substrate.refusalThreshold.toFixed(2)}`);
  lines.push(`role_coverage_floor: ${substrate.roleCoverageFloor.toFixed(2)}`);
  lines.push(`refuse_reason: ${substrate.refuseReason}`);
  lines.push(`status: refused`);
  lines.push('---');
  lines.push('');
  lines.push(`# DESIGN.md — ${hostname} *(refusal)*`);
  lines.push('');
  lines.push(`> **Reconstruction-grade narrative was NOT generated for this site.** Substrate quality score \`${substrate.score.toFixed(2)}\` is below the refusal threshold \`${substrate.refusalThreshold.toFixed(2)}\`. The authoring surface exposed does not carry enough evidence to reconstruct a design system with the fidelity a full DESIGN.md claims. Below you'll find the raw extraction — use it as material, not as a spec.`);
  lines.push('');
  lines.push('## Why this refusal');
  lines.push('');
  lines.push('Each dimension contributes to the substrate score. Weak dimensions explain the refusal:');
  lines.push('');
  lines.push('| Dimension | Value | Weight | Detail |');
  lines.push('|---|---|---|---|');
  for (const [name, c] of Object.entries(substrate.components)) {
    lines.push(`| \`${name}\` | ${c.value.toFixed(2)} | ${c.weight.toFixed(2)} | ${c.note} |`);
  }
  lines.push('');
  lines.push('Prose is sticky — a reader skimming a full 9-section narrative does not reliably downweight it based on confidence labels alone. The honest behavior at this substrate level is to emit the raw extraction and say so, rather than write smoother-than-warranted prose.');
  lines.push('');

  lines.push('## Raw extraction — use as material, not as spec');
  lines.push('');
  lines.push('### Color role bindings (what the auto-mapper did find)');
  lines.push('');
  if (Object.keys(bindings).length === 0) {
    lines.push('*No role bindings produced.*');
  } else {
    for (const [roleId, b] of Object.entries(bindings).sort()) {
      lines.push(`- **${roleId}** — \`${b.hex}\`  \n  *Confidence:* ${b.confidence.toFixed(2)} (${confBand(b.confidence)}) · *Reason:* ${b.reason || '—'}`);
    }
  }
  lines.push('');
  if ((report.unmappedRoles || []).length) {
    lines.push(`**${report.unmappedRoles.length} of the DCP contract's roles were unmapped** on this site: ${report.unmappedRoles.map(r => `\`${r}\``).join(', ')}. That is the bulk of the refusal reason — with most semantic slots empty, narrative synthesis would be mostly invention.`);
    lines.push('');
  }

  if (canonical.fontSizes?.length) {
    lines.push('### Typography (raw only)');
    lines.push('');
    lines.push('```');
    lines.push(canonical.fontSizes.join(', '));
    lines.push('```');
    lines.push('');
  }
  if (canonical.spacingClassified) {
    const sp = canonical.spacingClassified;
    const any = sp.scale.length || sp.section.length || sp.layout.length || sp.fluid.length;
    if (any) {
      lines.push('### Spacing (raw, classified)');
      lines.push('');
      if (sp.scale.length) lines.push(`- scale (≤64px / ≤4rem): ${sp.scale.slice(0, 12).map(x => `\`${x}\``).join(', ')}`);
      if (sp.section.length) lines.push(`- section: ${sp.section.slice(0, 12).map(x => `\`${x}\``).join(', ')}`);
      if (sp.layout.length) lines.push(`- layout: ${sp.layout.slice(0, 12).map(x => `\`${x}\``).join(', ')}`);
      if (sp.fluid.length) lines.push(`- fluid: ${sp.fluid.slice(0, 12).map(x => `\`${x}\``).join(', ')}`);
      lines.push('');
    }
  }

  lines.push('## What would change this refusal');
  lines.push('');
  lines.push(`- **Bind more roles.** The extractor left ${(report.unmappedRoles || []).length} DCP roles unmapped. Adding site-crawl breadth (subpages beyond the homepage), running with \`--use-browser\` for JS-rendered sites, or improving role-detection heuristics are the three levers.`);
  lines.push(`- **Broaden substrate.** Typography, spacing, and responsive signals score below threshold. A site that declares no \`@media\` and minimal \`clamp()\` inherently produces less extractable substrate than one that does.`);
  lines.push(`- **Lower the threshold.** \`REFUSAL_THRESHOLD = ${substrate.refusalThreshold.toFixed(2)}\` in \`build-design-md.mjs\`. If you want narrative anyway on low-substrate sites, the system is willing — just at the explicit cost of readers reading smoother prose than evidence warrants.`);
  lines.push('');
  lines.push(`_Generated by DCP live-site pipeline (refusal path) · synthesizer \`experiments/lib/build-design-md.mjs\` · ${now}_`);
  lines.push('');

  return lines.join('\n');
}

// Render a color binding entry for the palette section
function renderBindingEntry(roleId, binding, provenance) {
  const validityPart = typeof binding._validity === 'number'
    ? ` · *Validity:* ${binding._validity.toFixed(2)}${binding._validityRules?.length ? ` (${binding._validityRules.map(r => r.ruleId).join(', ')})` : ''}`
    : '';
  return `- **${roleId}** — \`${binding.hex}\`  \n  *Saliency:* ${binding.confidence.toFixed(2)} (${confBand(binding.confidence)})${validityPart} · *Source:* ${provenance} · *Reason:* ${binding.reason || '—'}`;
}

/**
 * Compute validity for every role binding in place, then apply collision
 * penalties across the set. Mutates the bindings object with _validity
 * and _validityRules fields.
 */
function annotateBindingsWithValidity(bindings) {
  const annotated = {};
  for (const [role, entry] of Object.entries(bindings)) {
    const { validity, appliedRules } = computeColorValidity(role, entry.hex);
    annotated[role] = { ...entry, _validity: validity, _validityRules: appliedRules };
  }
  applyCollisionPenalties(annotated);
  return annotated;
}

// ── Site-spec pack — multi-file output ────────────────────────────────
// A single DESIGN.md overloads four different jobs: style prior, structural
// recipe, implementation adapter, and truth boundary. The agent feedback and
// the review converged: split into a site-spec pack where each file answers
// one question and the absence of a file is information.
//
// Pack inclusion by substrate tier:
//   refuse        → CAVEATS.md + REFUSAL.md
//   above-floor   → DESIGN.md + IMPLEMENTATION.md + CAVEATS.md
//                   STRUCTURE.md also included, honest about limits
//
// Agent pushback accepted: no separate COMPONENTS.md until component
// geometry extraction is real. Component notes live inside STRUCTURE.md
// as section descriptions.

function buildDesignSpecFile({ canonical, bindings, gss, substrate, context }) {
  const lines = [];
  const bindingRoles = Object.entries(bindings).sort((a, b) => a[0].localeCompare(b[0]));
  const report = gss.bindings?.report || {};
  const clampCount = countClamp(canonical.rawCss);
  const topColors = canonical.colorCandidates.slice(0, 5);

  lines.push('---');
  lines.push(`file: DESIGN.md`);
  lines.push(`role_in_pack: style_and_system`);
  lines.push(`answers_question: "What does it feel like?"`);
  lines.push(`hostname: ${context.hostname}`);
  lines.push(`source_url: ${context.url || 'https://' + context.hostname}`);
  lines.push(`substrate_score: ${substrate.score.toFixed(2)}`);
  lines.push(`section_confidence: { visual_theme: low, color_roles: medium, typography: low, dos_donts: low-medium }`);
  lines.push(`siblings: STRUCTURE.md, IMPLEMENTATION.md, CAVEATS.md`);
  lines.push('---');
  lines.push('');
  lines.push(`# DESIGN.md — ${context.hostname}`);
  lines.push('');
  lines.push(`> **Provisional style and system spec, synthesized from rendered-surface evidence.** Covers color roles, typography tokens, and visual tone. **Does not cover** page structure (see STRUCTURE.md), component geometry (not yet extractable), or implementation defaults (see IMPLEMENTATION.md). **Read CAVEATS.md before treating any claim here as canonical.**`);
  lines.push('');

  // §1 Visual theme — low confidence, labeled
  lines.push('## 1. Visual theme & atmosphere *(confidence: low — synthesized from palette extremes)*');
  lines.push('');
  if (topColors.length) {
    const darkest = topColors.slice().sort((a, b) => a.lightness - b.lightness)[0];
    const lightest = topColors.slice().sort((a, b) => b.lightness - a.lightness)[0];
    const saturated = topColors.slice().sort((a, b) => b.saturation - a.saturation)[0];
    lines.push(`Observed palette spans \`${darkest.color}\` (L=${darkest.lightness}) → \`${lightest.color}\` (L=${lightest.lightness}); most saturated tone is \`${saturated.color}\` (S=${saturated.saturation}). Wording is heuristic — use as vibe only.`);
  } else {
    lines.push('*No high-confidence color candidates to synthesize from.*');
  }
  if (clampCount > 0) {
    lines.push('');
    lines.push(`\`clamp()\` used ${clampCount}× → fluid design intent is author-declared.`);
  }
  lines.push('');

  // §2 Color palette — strongest part
  lines.push('## 2. Color palette & roles *(confidence: medium)*');
  lines.push('');
  lines.push('Each role was chosen by Get-Site-Styles. Saliency is measured (evidence-weighted). Validity is rule-based (canonical-membership under named rules; see CAVEATS.md for rule set). Low-validity bindings are called out explicitly.');
  lines.push('');
  if (bindingRoles.length === 0) {
    lines.push('*No role bindings produced.*');
  } else {
    for (const [roleId, b] of bindingRoles) {
      lines.push(renderBindingEntry(roleId, b, 'auto-mapper'));
    }
  }
  lines.push('');

  // §3 Typography — honest about gaps
  lines.push('## 3. Typography tokens *(confidence: low — tokens only, no hierarchy inferred)*');
  lines.push('');
  if (canonical.fontSizes.length) {
    lines.push('Observed font-size tokens (raw, un-ranked):');
    lines.push('');
    lines.push('```');
    lines.push(canonical.fontSizes.slice(0, 30).join(', '));
    if (canonical.fontSizes.length > 30) lines.push(`… + ${canonical.fontSizes.length - 30} more`);
    lines.push('```');
    lines.push('');
    lines.push('**Gap:** H1/H2/H3 hierarchy is not inferred from rendered CSS. Font-family-to-role, line-height-to-role, and letter-spacing systems are not recovered. These sizes are raw material, not a typed scale.');
  } else {
    lines.push('*No typography tokens recovered.*');
  }
  lines.push('');

  // §7 Do's/don'ts — low-medium
  lines.push(`## 7. Do's and don'ts *(confidence: low-medium — heuristic, not authoritative)*`);
  lines.push('');
  const primaryAccent = bindings['accent.primary'];
  const intentDanger = bindings['intent.danger'];
  const textRole = bindings['text.primary'] || bindings['text.muted'];
  const bgRole = bindings['bg.default'];

  // Separate observation from recommendation
  if (primaryAccent) {
    const isHighValidity = typeof primaryAccent._validity !== 'number' || primaryAccent._validity >= 0.5;
    lines.push(`- **Observed likely primary CTA color:** \`${primaryAccent.hex}\` (saliency ${primaryAccent.confidence.toFixed(2)}${typeof primaryAccent._validity === 'number' ? ', validity ' + primaryAccent._validity.toFixed(2) : ''}). ${isHighValidity ? '**Recommended:** use as primary CTA default; confirm against live site before shipping.' : '**Caution:** validity flags this as suspicious — review before using.'}`);
  }
  if (textRole && bgRole) {
    const bgValidityOk = typeof bgRole._validity !== 'number' || bgRole._validity >= 0.5;
    lines.push(`- **Observed body/canvas pairing:** text \`${textRole.hex}\` on \`${bgRole.hex}\`. ${bgValidityOk ? '' : '**⚠ Canvas validity is low** — background candidate may be a transparent overlay, not the real page background. Verify before using.'}`);
  }
  if (primaryAccent && intentDanger && primaryAccent.hex === intentDanger.hex) {
    lines.push(`- **⚠ Brand/danger collision:** \`${intentDanger.hex}\` is bound to both \`accent.primary\` and \`intent.danger\` on this site. Disambiguate by context at implementation time.`);
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('**Where to look next:**');
  lines.push('- Need layout/composition? → `STRUCTURE.md` (weak doc — honest about limits)');
  lines.push('- Need implementation defaults? → `IMPLEMENTATION.md` (shadcn/Tailwind scaffold)');
  lines.push('- Need to calibrate trust? → `CAVEATS.md` (substrate score, validity flags, unmapped roles)');

  return lines.join('\n');
}

function buildStructureFile({ canonical, gss, substrate, context }) {
  const lines = [];
  const sp = canonical.spacingClassified;
  const clampCount = countClamp(canonical.rawCss);
  const mediaCount = countMedia(canonical.rawCss);

  lines.push('---');
  lines.push(`file: STRUCTURE.md`);
  lines.push(`role_in_pack: layout_and_composition`);
  lines.push(`answers_question: "What is it made of?"`);
  lines.push(`hostname: ${context.hostname}`);
  lines.push(`source_url: ${context.url || 'https://' + context.hostname}`);
  lines.push(`status: weak`);
  lines.push(`readiness: partial — raw material only; no inferred structure`);
  lines.push('---');
  lines.push('');
  lines.push(`# STRUCTURE.md — ${context.hostname}`);
  lines.push('');
  lines.push(`> **This is the weak document in the pack.** The pipeline cannot currently infer page structure from rendered CSS alone. What you'll find here is the *raw layout material* (spacing buckets, radii, responsive-pattern classification) and explicit statements of what is *not* recoverable. If you need actual page structure — sections in order, container patterns, hierarchy, full-bleed vs contained — **examine the live site directly**. This file is known-insufficient for reconstruction.`);
  lines.push('');
  lines.push('## Layout material (raw — classified)');
  lines.push('');
  if (sp.scale.length) {
    lines.push('**Spacing scale (≤64px, ≤4rem/em)** — component-level candidates:');
    lines.push(`\`${sp.scale.slice(0, 20).join('`, `')}\``);
    lines.push('');
  }
  if (sp.section.length) {
    lines.push('**Section-level spacing:**');
    lines.push(`\`${sp.section.slice(0, 20).join('`, `')}\``);
    lines.push('');
  }
  if (sp.fluid.length) {
    lines.push('**Fluid tokens (`clamp()`):**');
    lines.push(`\`${sp.fluid.slice(0, 10).join('`, `')}\``);
    lines.push('');
  }
  if (sp.layout.length) {
    lines.push('**Layout constraints (vw/vh/%):**');
    lines.push(`\`${sp.layout.slice(0, 20).join('`, `')}\``);
    lines.push('');
  }
  if (canonical.radii.length) {
    lines.push(`**Border radii (absolute):** \`${canonical.radii.slice(0, 12).join('`, `')}\``);
    if (canonical.percentRadii.length) {
      lines.push(`**Pill / circle radii:** \`${canonical.percentRadii.slice(0, 5).join('`, `')}\``);
    }
    lines.push('');
  }

  lines.push('## Responsive pattern (classified, not enumerated)');
  lines.push('');
  lines.push(`- \`clamp()\` usage: ${clampCount}×`);
  lines.push(`- \`@media\` queries: ${mediaCount} rules`);
  lines.push('');
  if (clampCount > 10 && mediaCount < 10) {
    lines.push('**Pattern:** fluid-first. Author relies on `clamp()` for smooth scaling rather than breakpoint cutoffs.');
  } else if (mediaCount > 20 && clampCount < 5) {
    lines.push('**Pattern:** breakpoint-driven. Discrete viewport tiers.');
  } else if (clampCount > 0 && mediaCount > 0) {
    lines.push('**Pattern:** hybrid — fluid scaling paired with explicit breakpoints.');
  } else {
    lines.push('**Pattern:** indeterminate from available evidence.');
  }
  lines.push('');

  lines.push('## What this file does NOT contain');
  lines.push('');
  lines.push('- **Section ordering.** Which sections appear, in what order, hero-vs-content-vs-footer relationships — not inferred.');
  lines.push('- **Container/grid patterns.** Full-bleed vs contained, grid gutter conventions, column counts — not recovered.');
  lines.push('- **Component hierarchy.** Which components nest inside which — not extractable from CSS alone.');
  lines.push('- **Component geometry.** Button padding, card radius-per-variant, input heights — not recoverable without DOM-level analysis.');
  lines.push('- **Route-level composition.** How layout changes across routes — homepage-only sampling (see CAVEATS.md § coverage).');
  lines.push('');
  lines.push('These gaps are the Layer-B / Layer-C research problems documented in `experiments/live-site-comparison.md`. They are not "not yet implemented" — they are open problems for which the rendered-surface evidence is structurally insufficient.');
  lines.push('');
  lines.push('**If you are an agent reconstructing this site, use this file for raw spacing/radii/responsive-pattern hints, and use the live site or a screenshot for structural decisions. Do not trust this file to tell you the shape of a page.**');

  return lines.join('\n');
}

function buildImplementationFile({ canonical, gss, substrate, context, bindings }) {
  const lines = [];

  lines.push('---');
  lines.push(`file: IMPLEMENTATION.md`);
  lines.push(`role_in_pack: adapter_and_defaults`);
  lines.push(`answers_question: "How do I build it?"`);
  lines.push(`hostname: ${context.hostname}`);
  lines.push(`status: adapter-specific`);
  lines.push(`evidence_preserving: false`);
  lines.push(`lossy: true`);
  lines.push(`warning: "Content is shadcn/ui-shaped. The scaffold loses information that DESIGN.md preserves (role vocabulary, confidence, validity). Do not treat shadcn values as source of truth."`);
  lines.push('---');
  lines.push('');
  lines.push(`# IMPLEMENTATION.md — ${context.hostname}`);
  lines.push('');
  lines.push(`> **Adapter-specific, lossy, not evidence-preserving.** This file is downstream of DESIGN.md / STRUCTURE.md / CAVEATS.md and subordinate to all three. The CSS scaffold below is shaped for **shadcn/ui specifically** — its structure reflects that adapter's conventions, not the site's own design language. It drops role confidence, role validity, and provenance. Use it to bootstrap an implementation, then **always return to DESIGN.md for semantic reasoning and CAVEATS.md for trust calibration**. If you find yourself copying from this file into a PR without consulting the others, you're using it wrong.`);
  lines.push('');

  lines.push('## Agent prompt guide');
  lines.push('');
  lines.push('When handing this pack to a coding agent:');
  lines.push('');
  lines.push('- Use **DESIGN.md** for palette, role bindings, and style-tone decisions.');
  lines.push('- Use **STRUCTURE.md** for raw spacing/radii/responsive classification *only* — do not trust it for page layout.');
  lines.push('- Use **CAVEATS.md** to calibrate trust. Low-validity bindings and unmapped roles belong in human-review queues, not as auto-generated defaults.');
  lines.push('- For layout, hierarchy, and composition: **use the live site or a screenshot**. This pack knows color + tokens, not page shape.');
  const primaryAccent = bindings['accent.primary'];
  const bgRole = bindings['bg.default'];
  const bgOk = bgRole && (typeof bgRole._validity !== 'number' || bgRole._validity >= 0.5);
  if (primaryAccent && bgOk) {
    lines.push('');
    lines.push(`**Suggested one-liner:** *"Use \`${primaryAccent.hex}\` as the primary CTA and \`${bgRole.hex}\` as the canvas. For any role marked validity < 0.5 in DESIGN.md, prefer default shadcn/Tailwind equivalents and flag for review."*`);
  } else if (primaryAccent) {
    lines.push('');
    lines.push(`**Suggested one-liner:** *"Use \`${primaryAccent.hex}\` as the primary CTA. Canvas binding is flagged as low-validity — default to white or your project's conventional background and flag for review."*`);
  }
  lines.push('');

  // shadcn adapter
  if (gss.theme?.light && Object.keys(gss.theme.light).length) {
    lines.push('## shadcn/ui theme scaffold');
    lines.push('');
    lines.push('*Implementation convenience, not source of truth. Generated by GSS. Use as a starting point; prefer DESIGN.md §2 for semantic reasoning.*');
    lines.push('');
    lines.push('```css');
    lines.push(':root {');
    for (const [k, v] of Object.entries(gss.theme.light)) lines.push(`  ${k}: ${v};`);
    lines.push('}');
    if (gss.theme.dark) {
      lines.push('');
      lines.push('.dark {');
      for (const [k, v] of Object.entries(gss.theme.dark)) lines.push(`  ${k}: ${v};`);
      lines.push('}');
    }
    lines.push('```');
  }

  return lines.join('\n');
}

function buildCaveatsFile({ canonical, bindings, gss, substrate, context }) {
  const lines = [];
  const bindingRoles = Object.entries(bindings).sort((a, b) => a[0].localeCompare(b[0]));
  const report = gss.bindings?.report || {};
  const unmapped = report.unmappedRoles || [];
  const highConf = bindingRoles.filter(([, v]) => v.confidence >= 0.85).length;
  const medConf = bindingRoles.filter(([, v]) => v.confidence >= 0.65 && v.confidence < 0.85).length;
  const lowConf = bindingRoles.filter(([, v]) => v.confidence < 0.65).length;
  const suspicious = bindingRoles.filter(([, v]) => typeof v._validity === 'number' && v._validity < 0.5);

  lines.push('---');
  lines.push(`file: CAVEATS.md`);
  lines.push(`role_in_pack: truth_boundaries`);
  lines.push(`answers_question: "What don't we know?"`);
  lines.push(`hostname: ${context.hostname}`);
  lines.push(`substrate_score: ${substrate.score.toFixed(2)}`);
  lines.push(`refusal_threshold: ${substrate.refusalThreshold?.toFixed?.(2) || '?'}`);
  lines.push('---');
  lines.push('');
  lines.push(`# CAVEATS.md — ${context.hostname}`);
  lines.push('');
  lines.push('> The truth-boundaries doc. Read this before treating anything in the rest of the pack as canonical. Prose is sticky — if a claim sounds confident elsewhere in the pack but contradicts something here, this file wins.');
  lines.push('');

  // Substrate score
  lines.push('## Substrate');
  lines.push('');
  lines.push(`- **Score:** ${substrate.score.toFixed(2)} / 1.0 (above-refusal-threshold: ${!substrate.refuse})`);
  lines.push('');
  lines.push('| Dimension | Value | Weight | Detail |');
  lines.push('|---|---|---|---|');
  for (const [name, c] of Object.entries(substrate.components || {})) {
    lines.push(`| \`${name}\` | ${c.value.toFixed(2)} | ${c.weight.toFixed(2)} | ${c.note} |`);
  }
  lines.push('');

  // Confidence distribution
  lines.push('## Binding confidence distribution');
  lines.push('');
  lines.push(`- **${bindingRoles.length}** roles bound. High-saliency (≥0.85): **${highConf}**. Medium (0.65–0.85): **${medConf}**. Low (<0.65): **${lowConf}**.`);
  lines.push(`- **${unmapped.length}** DCP roles unmapped: ${unmapped.map(r => `\`${r}\``).join(', ') || '*none*'}`);
  lines.push('');

  // Validity-flagged bindings — the key honesty surface
  if (suspicious.length) {
    lines.push('## ⚠ Low-validity bindings (saliency and validity disagree)');
    lines.push('');
    lines.push('The extractor found these, but rule-based validity checks flag them as likely-wrong for the role regardless of how often they were observed. Treat as extraction noise, not as canonical design decisions.');
    lines.push('');
    for (const [role, b] of suspicious) {
      lines.push(`- \`${role}\` = \`${b.hex}\` — validity **${b._validity.toFixed(2)}**. Failed rules:`);
      for (const r of (b._validityRules || [])) {
        lines.push(`  - *${r.ruleId}*: ${r.reason}`);
      }
    }
    lines.push('');
  }

  // Gaps — the pipeline-level honesty
  lines.push('## Named gaps');
  lines.push('');
  lines.push('What this pipeline does **not** produce, and won\'t until research problems are addressed:');
  lines.push('');
  lines.push('- **Typography hierarchy.** Raw font-size tokens appear in DESIGN.md §3, but H1/H2/H3 assignment is not recovered.');
  lines.push('- **Component geometry.** Button padding, card radius-per-variant, input height-per-state — not extractable from CSS alone.');
  lines.push('- **Layout composition.** Section ordering, container patterns, page shells, route-level composition — see STRUCTURE.md for the gap list.');
  lines.push('- **Interaction & motion.** Hover, transitions, animations — not captured.');
  lines.push('- **Multi-page coverage.** Homepage-only sampling. A site\'s dashboard, checkout, and marketing surfaces may use materially different token subsets.');
  lines.push('');

  lines.push('## Calibration note');
  lines.push('');
  lines.push('Get-Site-Styles assigns saliency via frequency, saturation, and lightness heuristics. Validity is applied on top as a rule-based prior (see `experiments/lib/build-design-md.mjs:COLOR_VALIDITY_RULES`). Neither score is calibrated against a ground-truth corpus. Treat numbers as *relative within a run*, not *absolute across the web*.');

  return lines.join('\n');
}

function buildManifest({ files, substrate, context }) {
  const manifest = {
    hostname: context.hostname,
    source_url: context.url || `https://${context.hostname}`,
    generated_at: new Date().toISOString(),
    substrate_score: Number(substrate.score.toFixed(2)),
    refusal_threshold: Number(substrate.refusalThreshold?.toFixed?.(2) || 0),
    refused: !!substrate.refuse,
    refuse_reason: substrate.refuseReason || null,
    tier: substrate.refuse ? 'refused' : (substrate.score >= 0.75 ? 'high' : 'medium'),
    files: Object.fromEntries(
      Object.entries(files).map(([name, content]) => [name, { bytes: content.length, lines: content.split('\n').length }])
    ),
    absent_files: [],
  };
  const ALL = ['DESIGN.md', 'STRUCTURE.md', 'IMPLEMENTATION.md', 'CAVEATS.md', 'REFUSAL.md'];
  for (const f of ALL) if (!files[f]) manifest.absent_files.push(f);
  return manifest;
}

/**
 * Build the full site-spec pack. Each file answers one question; absence is information.
 *
 * @returns {{ files: Record<string, string>, manifest: object }}
 */
export function buildSiteSpecPack({ gss, hostname, url, force = false }) {
  const canonical = extractCanonical(gss);
  const substrate = scoreSubstrate(canonical, gss);
  const bindings = annotateBindingsWithValidity(canonical.bindings);
  const context = { hostname, url };

  const files = {};

  // CAVEATS.md is always emitted. Always.
  files['CAVEATS.md'] = buildCaveatsFile({ canonical, bindings, gss, substrate, context });

  if (substrate.refuse && !force) {
    // Refusal pack: CAVEATS + REFUSAL, nothing else.
    files['REFUSAL.md'] = renderRefusal({ gss, hostname, url, canonical, substrate });
    const manifest = buildManifest({ files, substrate, context });
    return { files, manifest };
  }

  // Above-floor pack: DESIGN + STRUCTURE + IMPLEMENTATION + CAVEATS.
  files['DESIGN.md'] = buildDesignSpecFile({ canonical, bindings, gss, substrate, context });
  files['STRUCTURE.md'] = buildStructureFile({ canonical, gss, substrate, context });
  files['IMPLEMENTATION.md'] = buildImplementationFile({ canonical, gss, substrate, context, bindings });

  const manifest = buildManifest({ files, substrate, context });
  return { files, manifest };
}

// ── Main synthesis (legacy single-file) ────────────────────────────────
// Preserved as back-compat for callers that expect a single markdown string.
// New callers should use buildSiteSpecPack. The single-file version now
// just concatenates the pack files with visible separators, so it still
// reflects the split even when rendered as one blob.
export function buildDesignMdLegacySingleFile({ gss, hostname, url, force = false }) {
  const pack = buildSiteSpecPack({ gss, hostname, url, force });
  const order = ['REFUSAL.md', 'DESIGN.md', 'STRUCTURE.md', 'IMPLEMENTATION.md', 'CAVEATS.md'];
  return order
    .filter(f => pack.files[f])
    .map(f => `<!-- ===== ${f} ===== -->\n\n${pack.files[f]}`)
    .join('\n\n---\n\n');
}

export function buildDesignMd({ gss, hostname, url, force = false }) {
  const c = extractCanonical(gss);
  const substrate = scoreSubstrate(c, gss);
  if (substrate.refuse && !force) {
    return renderRefusal({ gss, hostname, url, canonical: c, substrate });
  }

  const now = new Date().toISOString();
  const bindingsWithValidity = annotateBindingsWithValidity(c.bindings);
  const bindingRoles = Object.entries(bindingsWithValidity).sort((a, b) => a[0].localeCompare(b[0]));
  const report = gss.bindings?.report || {};
  const unmapped = report.unmappedRoles || [];
  const suspiciousRoles = bindingRoles.filter(([, b]) => b._validity < 0.5);
  const highConfRoles = bindingRoles.filter(([, v]) => v.confidence >= 0.85).length;
  const medConfRoles = bindingRoles.filter(([, v]) => v.confidence >= 0.65 && v.confidence < 0.85).length;
  const lowConfRoles = bindingRoles.filter(([, v]) => v.confidence < 0.65).length;

  const clampCount = countClamp(c.rawCss);
  const mediaCount = countMedia(c.rawCss);

  const lines = [];

  // ── Frontmatter ─────────────────────────────────────────────────────
  lines.push('---');
  lines.push(`source_url: ${url || 'https://' + hostname}`);
  lines.push(`hostname: ${hostname}`);
  lines.push(`extracted_at: ${now}`);
  lines.push(`extraction_mode: automatic`);
  lines.push(`extractor: Get-Site-Styles (semantic-bindings v${gss.bindings?.contractVersion || '?'})`);
  lines.push(`synthesizer: build-design-md.mjs (DCP live-site pipeline)`);
  lines.push(`substrate_quality_score: ${substrate.score.toFixed(2)}`);
  lines.push(`refusal_threshold: ${substrate.refusalThreshold.toFixed(2)}`);
  lines.push(`confidence_summary: { high: ${highConfRoles}, medium: ${medConfRoles}, low: ${lowConfRoles}, unmapped_dcp_roles: ${unmapped.length} }`);
  lines.push('---');
  lines.push('');

  lines.push(`# DESIGN.md — ${hostname}`);
  lines.push('');
  lines.push(`> Reconstruction-grade design spec extracted automatically from the rendered surface of **${hostname}**. Each section marks what was *observed* vs *inferred* vs *unfillable from the current instrument*. Confidence numbers are from the extraction algorithm, not the author of this file. See **§8 Ambiguity & caveats** before treating any claim as canonical.`);
  lines.push('');

  // ── 1. Visual theme ────────────────────────────────────────────────
  lines.push('## 1. Visual theme & atmosphere');
  lines.push('');
  const topColors = c.colorCandidates.slice(0, 5);
  if (topColors.length) {
    const darkest = topColors.slice().sort((a, b) => a.lightness - b.lightness)[0];
    const lightest = topColors.slice().sort((a, b) => b.lightness - a.lightness)[0];
    const saturated = topColors.slice().sort((a, b) => b.saturation - a.saturation)[0];
    lines.push(`Observed palette spans from \`${darkest.color}\` (L=${darkest.lightness}, most shadow) to \`${lightest.color}\` (L=${lightest.lightness}, most light), with the most saturated tone being \`${saturated.color}\` (S=${saturated.saturation}, H=${Math.round((saturated.hue||0))}). This section is *synthesized* — wording is heuristic; swap to human judgment if copying to a brand doc.`);
  } else {
    lines.push('*No high-confidence color candidates could be synthesized from the instrument output.*');
  }
  if (clampCount > 0) {
    lines.push('');
    lines.push(`Layout uses \`clamp()\` ${clampCount}× in the stylesheet → fluid/responsive design intent is author-declared, not just emergent.`);
  }
  lines.push('');

  // ── 2. Color palette & roles ───────────────────────────────────────
  lines.push('## 2. Color palette & roles');
  lines.push('');
  lines.push('*Source: DCP canonical role contract overlaid on algorithmic bindings. Each role below was chosen by Get-Site-Styles (not hand-authored). Low-confidence entries mean the instrument itself is uncertain — review before shipping.*');
  lines.push('');
  if (bindingRoles.length === 0) {
    lines.push('*No role bindings produced.*');
  } else {
    for (const [roleId, b] of bindingRoles) {
      lines.push(renderBindingEntry(roleId, b, 'auto-mapper'));
    }
  }
  if (unmapped.length) {
    lines.push('');
    lines.push(`**Unmapped DCP roles** (contract slots the auto-mapper did not fill): ${unmapped.map(r => `\`${r}\``).join(', ')}. Treat these as judgment gaps, not absent-from-site.`);
  }

  // shadcn cross-reference
  const shadcnKeys = Object.keys(c.shadcnRoles).slice(0, 12);
  if (shadcnKeys.length) {
    lines.push('');
    lines.push('<details><summary>shadcn-style role snapshot (same data, different vocabulary)</summary>');
    lines.push('');
    lines.push('| var | hex | hsl |');
    lines.push('|---|---|---|');
    for (const k of shadcnKeys) {
      const e = c.shadcnRoles[k];
      lines.push(`| \`${k}\` | \`${e.hex || '—'}\` | \`${e.hsl}\` |`);
    }
    lines.push('');
    lines.push('</details>');
  }
  lines.push('');

  // ── 3. Typography rules ─────────────────────────────────────────────
  lines.push('## 3. Typography rules');
  lines.push('');
  if (c.fontSizes.length) {
    lines.push(`Observed font-size tokens (${c.fontSizes.length}) in rendered CSS:`);
    lines.push('');
    lines.push('```');
    lines.push(c.fontSizes.slice(0, 30).join(', '));
    if (c.fontSizes.length > 30) lines.push(`… + ${c.fontSizes.length - 30} more`);
    lines.push('```');
    lines.push('');
    lines.push('**Gap (research):** the instrument emits a flat list of sizes; it does not infer heading scale tiers (H1/H2/H3…), font-family-to-role mapping, line-height-to-role mapping, or letter-spacing system. Recovering typography hierarchy from rendered CSS is an unsolved Layer-B problem in this pipeline.');
  } else {
    lines.push('*No typography tokens recovered.*');
  }
  lines.push('');

  // ── 4. Layout & spacing ─────────────────────────────────────────────
  lines.push('## 4. Layout & spacing');
  lines.push('');
  const sp = c.spacingClassified;
  if (sp.scale.length || sp.section.length || sp.layout.length || sp.fluid.length) {
    if (sp.scale.length) {
      lines.push(`**Spacing scale (≤64px, ≤4rem/em)** — likely component-level:`);
      lines.push(`\`${sp.scale.slice(0, 20).join('`, `')}\``);
      lines.push('');
    }
    if (sp.section.length) {
      lines.push(`**Section-level spacing** (larger px/rem values):`);
      lines.push(`\`${sp.section.slice(0, 20).join('`, `')}\``);
      lines.push('');
    }
    if (sp.fluid.length) {
      lines.push(`**Fluid tokens** (\`clamp()\`-based, responsive by intent):`);
      lines.push(`\`${sp.fluid.slice(0, 10).join('`, `')}\``);
      lines.push('');
    }
    if (sp.layout.length) {
      lines.push(`**Layout constraints** (vw/vh/%, container-shaped):`);
      lines.push(`\`${sp.layout.slice(0, 20).join('`, `')}\``);
      lines.push('');
    }
  } else {
    lines.push('*No spacing tokens recovered.*');
  }

  if (c.radii.length) {
    lines.push(`**Border radii** (absolute): \`${c.radii.slice(0, 12).join('`, `')}\``);
    if (c.percentRadii.length) {
      lines.push(`**Pill / circle radii** (percent-based): \`${c.percentRadii.slice(0, 5).join('`, `')}\``);
    }
    lines.push('');
  }

  lines.push('**Gap (research):** the instrument does not yet infer container max-width, section spacing tiers, grid gap conventions, or route-level composition patterns. See `experiments/MODEL-GAPS.md` and `live-site-comparison.md` § template/layout inference.');
  lines.push('');

  // ── 5. Component primitives ─────────────────────────────────────────
  lines.push('## 5. Component primitives (observed)');
  lines.push('');
  const btnColors = Object.entries(c.buttonColors);
  if (btnColors.length) {
    lines.push(`**Button palette** (clustered from observed button elements; up to 5 distinct treatments):`);
    lines.push('');
    lines.push('| slot | hex |');
    lines.push('|---|---|');
    for (const [k, v] of btnColors) {
      lines.push(`| \`${k}\` | \`${hslStrToHex(v) || v}\` |`);
    }
    lines.push('');
  }
  const zoneColors = Object.entries(c.layoutZoneColors);
  if (zoneColors.length) {
    lines.push(`**Layout zones** (header / footer / etc):`);
    lines.push('');
    lines.push('| zone | hex |');
    lines.push('|---|---|');
    for (const [k, v] of zoneColors) {
      lines.push(`| \`${k}\` | \`${hslStrToHex(v) || v}\` |`);
    }
    lines.push('');
  }
  lines.push('**Gap (research):** the instrument reports button *colors* but not button *geometry* (padding, border-radius, height by variant). Full component-primitive extraction requires DOM-level analysis, not CSS alone — this is the variant-axis inference problem the two baseline experiments document. See `experiments/bungee-pro/FINDINGS.md` § 2.');
  lines.push('');

  // ── 6. Responsive behavior ──────────────────────────────────────────
  lines.push('## 6. Responsive behavior');
  lines.push('');
  lines.push(`- \`clamp()\` usage: ${clampCount}× in rendered CSS`);
  lines.push(`- \`@media\` queries: ${mediaCount} rules`);
  lines.push('');
  if (clampCount > 10 && mediaCount < 10) {
    lines.push('**Pattern:** fluid-first. Author relies on `clamp()` to scale type/spacing smoothly across viewports rather than hard-cutting at breakpoints.');
  } else if (mediaCount > 20 && clampCount < 5) {
    lines.push('**Pattern:** breakpoint-driven. Discrete viewport tiers; minimal fluid scaling.');
  } else if (clampCount > 0 && mediaCount > 0) {
    lines.push('**Pattern:** hybrid — some fluid scaling paired with explicit breakpoint cutoffs.');
  } else {
    lines.push('**Pattern:** indeterminate from available evidence.');
  }
  lines.push('');
  lines.push('**Gap (implementation):** specific breakpoint values and fluid-scaling curves are not currently extracted into structured form. To get them, parse the `@media` rules directly from the raw CSS string attached to this output.');
  lines.push('');

  // ── 7. Do's and don'ts ──────────────────────────────────────────────
  lines.push(`## 7. Do's and don'ts`);
  lines.push('');
  lines.push('*Synthesized from observed palette + token structure. Heuristic, not authoritative.*');
  lines.push('');
  // Pull the highest-confidence accent color, if any, for the "do" claim
  const primaryAccent = c.bindings['accent.primary'];
  const intentDanger = c.bindings['intent.danger'];
  if (primaryAccent) {
    lines.push(`- **Do** lean on \`${primaryAccent.hex}\` as the primary call-to-action color (auto-mapper: \`accent.primary\`, conf ${primaryAccent.confidence.toFixed(2)}).`);
  }
  const textRole = c.bindings['text.primary'] || c.bindings['text.muted'];
  const bgRole = c.bindings['bg.default'];
  if (textRole && bgRole) {
    lines.push(`- **Do** keep body text \`${textRole.hex}\` on \`${bgRole.hex}\` surfaces — this is the declared body/background pairing.`);
  }
  if (c.radii.length && c.radii.every(r => {
    const n = parseFloat(r);
    return !Number.isNaN(n) && n <= 16;
  })) {
    lines.push(`- **Don't** over-round components beyond the observed modest radii (all ≤16px on this site).`);
  }
  if (intentDanger && primaryAccent && intentDanger.hex === primaryAccent.hex) {
    lines.push(`- **Warning:** \`${intentDanger.hex}\` is bound to **both** \`accent.primary\` and \`intent.danger\` on this site. Using it as an error state will read as a brand emphasis to users who see it elsewhere as primary. Disambiguate in context.`);
  }
  lines.push('');

  // ── 8. Ambiguity & caveats ──────────────────────────────────────────
  lines.push('## 8. Ambiguity & caveats');
  lines.push('');
  lines.push(`- **${bindingRoles.length} color roles** were auto-bound. Of those, **${highConfRoles}** crossed 0.85 saliency, **${medConfRoles}** landed in the 0.65–0.85 band, **${lowConfRoles}** below 0.65. Every binding below 0.85 warrants human review.`);
  if (suspiciousRoles.length) {
    lines.push(`- **⚠ ${suspiciousRoles.length} binding(s) with validity < 0.5** — the extractor found these, but rule-based validity checks flag them as likely-wrong for the role regardless of how confident the extractor was:`);
    for (const [role, b] of suspiciousRoles) {
      lines.push(`  - \`${role}\` = \`${b.hex}\` — validity ${b._validity.toFixed(2)}. Failed rules: ${b._validityRules.map(r => `*${r.ruleId}* (${r.reason})`).join('; ')}`);
    }
    lines.push(`  These are the bindings where saliency (measured) and validity (rule-based plausibility) disagree. Treat them as extraction noise to review, not as canonical design decisions.`);
  }
  if (unmapped.length) {
    lines.push(`- **${unmapped.length} DCP roles unmapped**: ${unmapped.map(r => `\`${r}\``).join(', ')}. Unmapped means the mapper did not find a confident candidate, not that the role is absent from the site.`);
  }
  lines.push(`- **Typography hierarchy not inferred.** Raw font-size tokens are listed in §3, but H1/H2/H3 semantic assignment is not recovered. A DCP pipeline extension for typography roles is open work.`);
  lines.push(`- **Component geometry not inferred.** Button/card/input padding, radius, and height are not extracted from CSS alone. The two baseline experiments hand-authored these; automation is a Layer-B research problem.`);
  lines.push(`- **Layout composition not inferred.** Section rhythm, container widths, slot structures, and route-level composition are not captured. This is the template/layout inference gap.`);
  lines.push(`- **Interaction / motion not captured.** Hover states, transitions, and animations are not reconstructed.`);
  lines.push(`- **Confidence calibration is heuristic.** Get-Site-Styles assigns confidence via frequency, saturation, and lightness heuristics. Its scale is conservative — by its own rubric, ≥0.85 is "auto-bind"; most real-site runs produce 0 auto-bindings. Treat the numbers as *relative*, not *absolute*.`);
  lines.push('');

  // ── 9. Agent prompt guide ───────────────────────────────────────────
  lines.push('## 9. Agent prompt guide');
  lines.push('');
  lines.push('When handing this file to a coding agent for implementation:');
  lines.push('');
  lines.push('- Instruct the agent to **prefer the role bindings in §2** over the raw color observations; the roles already carry semantic intent.');
  lines.push('- Instruct the agent to **treat §3/§4 as raw materials, not a finished type/spacing system**. They need human grouping into a tiered scale.');
  lines.push('- Instruct the agent to **read §8 before resolving ambiguity**. Low-confidence role assignments should default to conservative interpretation.');
  if (primaryAccent && bgRole) {
    lines.push(`- Suggested one-liner for the agent: *"Build components using \`${primaryAccent.hex}\` as the primary CTA, \`${bgRole.hex}\` as the canvas, and the role bindings in §2. For any role marked confidence < 0.65, prefer default shadcn/Tailwind equivalents and flag for review."*`);
  }
  lines.push('');

  // ── Appendix — implementation adapter ───────────────────────────────
  if (Object.keys(c.shadcnRoles).length) {
    lines.push('---');
    lines.push('');
    lines.push('## Appendix A — shadcn/ui theme scaffold (implementation adapter)');
    lines.push('');
    lines.push('*This is an implementation convenience, not a source of truth. Generated by GSS from the observed palette. Use as a starting point; prefer §2 for semantic reasoning.*');
    lines.push('');
    lines.push('```css');
    lines.push(':root {');
    for (const [k, v] of Object.entries(gss.theme?.light || {})) {
      lines.push(`  ${k}: ${v};`);
    }
    lines.push('}');
    if (gss.theme?.dark) {
      lines.push('');
      lines.push('.dark {');
      for (const [k, v] of Object.entries(gss.theme.dark)) {
        lines.push(`  ${k}: ${v};`);
      }
      lines.push('}');
    }
    lines.push('```');
    lines.push('');
  }

  // ── Footer ──────────────────────────────────────────────────────────
  lines.push('---');
  lines.push('');
  lines.push(`_Generated by DCP live-site pipeline · extraction via [Get-Site-Styles](https://github.com/switmer/Get-Site-Styles) · synthesizer \`experiments/lib/build-design-md.mjs\` · ${now}_`);
  lines.push('');

  return lines.join('\n');
}
