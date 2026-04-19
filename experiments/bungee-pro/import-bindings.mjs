#!/usr/bin/env node
/**
 * Apply site-bindings.json to registry.json.
 *
 * Path B from the plan: this reuses the same semantics as the MCP handler
 * `handleImportSiteBindings` (packages/dcp-toolkit/src/mcp-server.js:3308-3444)
 * but calls them in-process. For Monday demo purposes the artifact is the
 * updated registry.json; the MCP path is documented in FINDINGS.md.
 *
 * Logic mirrors the handler:
 *   - Validate role IDs against DCP's COLOR_ROLES contract
 *   - Recognized roles: write a `--site-<role>` CSS var to
 *     registry.themeContext.cssVariables.light and create a
 *     registry.bindings.color[role] entry with source: 'site-import'
 *   - Unrecognized roles: stash under registry.siteImport.extensions
 *   - Never override manual bindings; in merge mode, never override existing auto
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONTRACT_VERSION, isColorRole, getRoleIds } from '../../packages/dcp-toolkit/src/tokens/roles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const registryPath = path.join(__dirname, 'registry.json');
const bindingsPath = path.join(__dirname, 'site-bindings.json');

const mode = 'merge';

const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
const gssInput = JSON.parse(await fs.readFile(bindingsPath, 'utf8'));

const gssBindings = gssInput.bindings;
const gssVersion = gssInput.contractVersion;
const siteUrl = gssInput.siteUrl;

const versionWarning = gssVersion && gssVersion !== CONTRACT_VERSION
  ? `GSS contract version "${gssVersion}" differs from DCP "${CONTRACT_VERSION}".`
  : null;

// Ensure structures exist
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

console.log(JSON.stringify(summary, null, 2));
