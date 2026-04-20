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

// Render a color binding entry for the palette section
function renderBindingEntry(roleId, binding, provenance) {
  return `- **${roleId}** — \`${binding.hex}\`  \n  *Confidence:* ${binding.confidence.toFixed(2)} (${confBand(binding.confidence)}) · *Source:* ${provenance} · *Reason:* ${binding.reason || '—'}`;
}

// ── Main synthesis ────────────────────────────────────────────────────
export function buildDesignMd({ gss, hostname, url }) {
  const c = extractCanonical(gss);
  const now = new Date().toISOString();
  const bindingRoles = Object.entries(c.bindings).sort((a, b) => a[0].localeCompare(b[0]));
  const report = gss.bindings?.report || {};
  const unmapped = report.unmappedRoles || [];
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
  lines.push(`- **${bindingRoles.length} color roles** were auto-bound. Of those, **${highConfRoles}** crossed 0.85 confidence, **${medConfRoles}** landed in the 0.65–0.85 band, **${lowConfRoles}** below 0.65. Every binding below 0.85 warrants human review.`);
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
