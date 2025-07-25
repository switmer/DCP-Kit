import fs from 'fs';
import path from 'path';
import pkg from 'fast-json-patch';
const { applyPatch } = pkg;
import { DCPRollback } from '../core/dcpRollback.js';

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function runRollback(registryPath, undoPath, options = {}) {
  const {
    backup = true,
    verbose = true,
    outputPath = null
  } = options;

  const finalOutputPath = outputPath || registryPath;

  if (verbose) {
    console.log(`↩️  Rolling back ${registryPath}...`);
    console.log(`   Undo patch: ${undoPath}`);
    console.log(`   Output: ${finalOutputPath}`);
  }

  try {
    // Create backup if requested
    if (backup) {
      const backupPath = `${registryPath}.backup.${Date.now()}.json`;
      fs.copyFileSync(registryPath, backupPath);
      if (verbose) console.log(`💾 Backup created: ${backupPath}`);
    }

    // Load current registry and undo patch
    const currentRegistry = readJSON(registryPath);
    const undoPatches = readJSON(undoPath);

    // Apply undo patches
    const rolledBack = applyPatch(currentRegistry, undoPatches, true, false).newDocument;

    // Write rolled back registry
    writeJSON(finalOutputPath, rolledBack);
    if (verbose) console.log(`✅ Rollback complete: ${finalOutputPath}`);

    // Log rollback for audit trail
    const rollbackLog = {
      timestamp: new Date().toISOString(),
      operation: 'rollback',
      source: registryPath,
      undo: undoPath,
      output: finalOutputPath,
      backup: backup,
      patchCount: undoPatches.length
    };

    const logPath = './mutations.log.jsonl';
    fs.appendFileSync(logPath, JSON.stringify(rollbackLog) + '\n');

    return {
      success: true,
      rollback: finalOutputPath,
      undo: undoPath,
      patchCount: undoPatches.length,
      log: rollbackLog
    };

  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
}

export { runRollback as rollback };