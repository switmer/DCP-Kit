/**
 * Shared site-bindings importer for the experiments/ directory.
 *
 * Mirrors the semantics of `handleImportSiteBindings` from
 * packages/dcp-toolkit/src/mcp-server.js (approximately lines 3308–3444). Does
 * not literally reuse that function because it's defined as an instance method
 * on DCPMCPServer; instead this module re-implements the same logic against
 * plain JSON files so experiment scripts can exercise the seam without the MCP
 * handshake. The input and output shapes are identical.
 *
 * Each experiment's `import-bindings.mjs` is a thin wrapper calling `applyBindings`.
 */
import fs from 'fs/promises';
import path from 'path';
import { CONTRACT_VERSION, isColorRole, getRoleIds } from '../../packages/dcp-toolkit/src/tokens/roles.js';

/**
 * Apply a site-bindings payload to a registry on disk.
 *
 * @param {object} opts
 * @param {string} opts.registryPath  Absolute path to registry.json (mutated in place)
 * @param {string} opts.bindingsPath  Absolute path to site-bindings.json
 * @param {'merge'|'override'} [opts.mode='merge']
 * @returns {Promise<object>} summary report
 */
export async function applyBindings({ registryPath, bindingsPath, mode = 'merge' }) {
  const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
  const gssInput = JSON.parse(await fs.readFile(bindingsPath, 'utf8'));

  const gssBindings = gssInput.bindings || {};
  const gssExtensions = gssInput.extensions || {};
  const gssVersion = gssInput.contractVersion;
  const siteUrl = gssInput.siteUrl;

  const versionWarning = gssVersion && gssVersion !== CONTRACT_VERSION
    ? `GSS contract version "${gssVersion}" differs from DCP "${CONTRACT_VERSION}".`
    : null;

  if (!registry.bindings) registry.bindings = { contractVersion: CONTRACT_VERSION, color: {} };
  if (!registry.bindings.color) registry.bindings.color = {};
  if (!registry.themeContext) registry.themeContext = { cssVariables: { light: {} } };
  if (!registry.themeContext.cssVariables) registry.themeContext.cssVariables = { light: {} };
  if (!registry.themeContext.cssVariables.light) registry.themeContext.cssVariables.light = {};

  const lightVars = registry.themeContext.cssVariables.light;
  const colorBindings = registry.bindings.color;

  const stats = { imported: 0, skipped: 0, overridden: 0, extensions: 0 };
  const extensions = {};
  const importedRoles = [];

  for (const [roleId, entry] of Object.entries(gssBindings)) {
    if (!entry || typeof entry !== 'object') continue;
    const hex = entry.hex || entry.value;
    const confidence = typeof entry.confidence === 'number' ? entry.confidence : 0.5;
    const reason = entry.reason || '';

    if (!isColorRole(roleId)) {
      extensions[roleId] = { hex, confidence, reason, siteUrl, importedAt: new Date().toISOString() };
      stats.extensions++;
      continue;
    }

    const varName = `--site-${roleId.replace(/\./g, '-')}`;
    const existing = colorBindings[roleId];
    if (existing) {
      if (existing.source === 'manual') { stats.skipped++; continue; }
      if (mode === 'merge') { stats.skipped++; continue; }
      stats.overridden++;
    } else {
      stats.imported++;
    }

    colorBindings[roleId] = {
      token: varName,
      confidence,
      source: 'site-import',
      reason: `GSS: ${reason}`,
    };
    lightVars[varName] = { value: hex, computed: hex, colorSpace: 'srgb' };
    importedRoles.push(roleId);
  }

  // Forward any declared GSS extensions (non-canonical roles) to the registry
  for (const [extName, entry] of Object.entries(gssExtensions)) {
    extensions[extName] = { ...entry, siteUrl, importedAt: new Date().toISOString() };
    stats.extensions++;
  }

  if (Object.keys(extensions).length > 0) {
    if (!registry.siteImport) registry.siteImport = {};
    registry.siteImport.extensions = extensions;
    if (siteUrl) registry.siteImport.siteUrl = siteUrl;
    registry.siteImport.importedAt = new Date().toISOString();
  }

  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

  const allColorRoles = getRoleIds('color');
  const unmappedRoles = allColorRoles.filter(r => !colorBindings[r]);

  const summary = {
    imported: stats.imported,
    overridden: stats.overridden,
    skipped: stats.skipped,
    extensions: stats.extensions,
    importedRoles,
    unmappedDcpRoles: unmappedRoles,
    mode,
    siteUrl,
  };
  if (versionWarning) summary.versionWarning = versionWarning;
  if (gssInput.report) summary.gssReport = gssInput.report;

  return summary;
}

/**
 * Convenience CLI wrapper: resolves paths relative to an experiment dir and
 * prints the summary as JSON.
 */
export async function runForExperiment(experimentDir) {
  const summary = await applyBindings({
    registryPath: path.join(experimentDir, 'registry.json'),
    bindingsPath: path.join(experimentDir, 'site-bindings.json'),
  });
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}
