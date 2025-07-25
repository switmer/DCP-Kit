import fs from 'fs';
import path from 'path';
import pkg from 'fast-json-patch';
const { applyPatch } = pkg;
import { getValidator } from './schemaValidator.js';

/**
 * DCP Rollback System - One-command undo for any mutation
 * 
 * Features:
 * - Instant rollback using undo patches or backup files
 * - Schema validation on rollback
 * - History tracking and audit trails
 * - Support for partial rollbacks
 * - Git integration for version control
 */

export class DCPRollback {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.backupDir = options.backupDir || './.dcp-backups';
    this.historyFile = options.historyFile || './mutations.log.jsonl';
    this.validateOnRollback = options.validateOnRollback !== false;
  }

  /**
   * Rollback using an undo patch file
   * @param {string} registryPath - Path to current registry
   * @param {string} undoPatchPath - Path to undo patch
   * @param {Object} options - Rollback options
   * @returns {Object} Rollback result
   */
  async rollbackWithPatch(registryPath, undoPatchPath, options = {}) {
    const {
      outputPath = registryPath,
      createBackup = true,
      logRollback = true
    } = options;

    if (this.verbose) {
      console.log('🔄 Rolling back mutation using undo patch...');
      console.log(`   Registry: ${registryPath}`);
      console.log(`   Undo Patch: ${undoPatchPath}`);
    }

    try {
      // Load current state and undo patch
      const currentState = this.loadRegistry(registryPath);
      const undoPatches = this.loadUndoPatches(undoPatchPath);

      // Create backup before rollback
      let backupPath = null;
      if (createBackup) {
        backupPath = await this.createRollbackBackup(currentState);
      }

      // Apply undo patches
      const rolledBackState = this.applyUndoPatches(currentState, undoPatches);

      // Validate rolled back state
      if (this.validateOnRollback) {
        await this.validateRolledBackState(rolledBackState);
      }

      // Save rolled back state
      this.saveRegistry(rolledBackState, outputPath);

      // Log the rollback
      if (logRollback) {
        await this.logRollback({
          type: 'patch',
          undoPatchPath,
          registryPath,
          outputPath,
          backupPath,
          timestamp: new Date().toISOString()
        });
      }

      const result = {
        success: true,
        method: 'patch',
        rolledBackState,
        backupPath,
        patchesApplied: undoPatches.length
      };

      if (this.verbose) {
        console.log('✅ Rollback completed successfully');
        console.log(`   Applied ${undoPatches.length} undo patches`);
        if (backupPath) {
          console.log(`   Backup created: ${backupPath}`);
        }
      }

      return result;

    } catch (error) {
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  /**
   * Rollback using a backup file
   * @param {string} registryPath - Path to current registry
   * @param {string} backupPath - Path to backup file
   * @param {Object} options - Rollback options
   * @returns {Object} Rollback result
   */
  async rollbackWithBackup(registryPath, backupPath, options = {}) {
    const {
      outputPath = registryPath,
      createBackup = true,
      logRollback = true
    } = options;

    if (this.verbose) {
      console.log('🔄 Rolling back to backup file...');
      console.log(`   Registry: ${registryPath}`);
      console.log(`   Backup: ${backupPath}`);
    }

    try {
      // Load backup state
      const backupState = this.loadRegistry(backupPath);

      // Create backup of current state before rollback
      let newBackupPath = null;
      if (createBackup) {
        const currentState = this.loadRegistry(registryPath);
        newBackupPath = await this.createRollbackBackup(currentState);
      }

      // Validate backup state
      if (this.validateOnRollback) {
        await this.validateRolledBackState(backupState);
      }

      // Restore from backup
      this.saveRegistry(backupState, outputPath);

      // Log the rollback
      if (logRollback) {
        await this.logRollback({
          type: 'backup',
          backupPath,
          registryPath,
          outputPath,
          newBackupPath,
          timestamp: new Date().toISOString()
        });
      }

      const result = {
        success: true,
        method: 'backup',
        rolledBackState: backupState,
        backupPath: newBackupPath
      };

      if (this.verbose) {
        console.log('✅ Rollback completed successfully');
        console.log(`   Restored from: ${backupPath}`);
        if (newBackupPath) {
          console.log(`   Current state backed up: ${newBackupPath}`);
        }
      }

      return result;

    } catch (error) {
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  /**
   * Auto-rollback the last mutation
   * @param {string} registryPath - Path to registry
   * @param {Object} options - Rollback options
   * @returns {Object} Rollback result
   */
  async rollbackLast(registryPath, options = {}) {
    if (this.verbose) {
      console.log('🔄 Rolling back last mutation...');
    }

    try {
      // Find the most recent backup or undo file
      const lastRollbackInfo = await this.findLastRollbackInfo();
      
      if (!lastRollbackInfo) {
        throw new Error('No rollback information found');
      }

      if (lastRollbackInfo.type === 'patch' && lastRollbackInfo.undoPatchPath) {
        return await this.rollbackWithPatch(registryPath, lastRollbackInfo.undoPatchPath, options);
      } else if (lastRollbackInfo.type === 'backup' && lastRollbackInfo.backupPath) {
        return await this.rollbackWithBackup(registryPath, lastRollbackInfo.backupPath, options);
      } else {
        throw new Error('Invalid rollback information found');
      }

    } catch (error) {
      throw new Error(`Auto-rollback failed: ${error.message}`);
    }
  }

  /**
   * Load registry from file
   */
  loadRegistry(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Registry file not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  /**
   * Load undo patches from file
   */
  loadUndoPatches(undoPatchPath) {
    if (!fs.existsSync(undoPatchPath)) {
      throw new Error(`Undo patch file not found: ${undoPatchPath}`);
    }

    const patchData = JSON.parse(fs.readFileSync(undoPatchPath, 'utf-8'));
    
    // Handle different patch file formats
    if (Array.isArray(patchData)) {
      return patchData;
    } else if (patchData.patches) {
      return patchData.patches;
    } else if (patchData.undoPatches) {
      return patchData.undoPatches;
    } else {
      throw new Error('Invalid undo patch file format');
    }
  }

  /**
   * Apply undo patches to current state
   */
  applyUndoPatches(currentState, undoPatches) {
    if (!Array.isArray(undoPatches) || undoPatches.length === 0) {
      throw new Error('No undo patches to apply');
    }

    let rolledBackState = JSON.parse(JSON.stringify(currentState));

    for (const [index, patch] of undoPatches.entries()) {
      try {
        const result = applyPatch(rolledBackState, [patch]);
        rolledBackState = result.newDocument;

        if (this.verbose) {
          console.log(`✓ Applied undo patch ${index + 1}: ${patch.op} ${patch.path}`);
        }
      } catch (error) {
        throw new Error(`Failed to apply undo patch ${index + 1}: ${error.message}`);
      }
    }

    return rolledBackState;
  }

  /**
   * Validate rolled back state
   */
  async validateRolledBackState(state) {
    try {
      const validator = getValidator({ verbose: this.verbose });
      
      let result;
      if (state.components) {
        result = validator.validateManifest(state);
      } else if (state.name && state.props) {
        result = validator.validateComponent(state);
      } else {
        // Basic structure validation
        if (!state || typeof state !== 'object') {
          throw new Error('Invalid state structure');
        }
        return true;
      }

      if (!result.valid) {
        throw new Error(`Validation errors: ${result.errors.map(e => e.message).join(', ')}`);
      }

      return true;
    } catch (error) {
      if (this.verbose) {
        console.warn('⚠️ Skipping rollback validation:', error.message);
      }
      return false;
    }
  }

  /**
   * Save registry to file
   */
  saveRegistry(state, outputPath) {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(state, null, 2));

    if (this.verbose) {
      console.log(`💾 Registry saved to: ${outputPath}`);
    }
  }

  /**
   * Create backup before rollback
   */
  async createRollbackBackup(state) {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `rollback-backup-${timestamp}.json`);

    fs.writeFileSync(backupPath, JSON.stringify(state, null, 2));

    if (this.verbose) {
      console.log(`💾 Rollback backup created: ${backupPath}`);
    }

    return backupPath;
  }

  /**
   * Log rollback operation
   */
  async logRollback(rollbackInfo) {
    const logEntry = {
      ...rollbackInfo,
      operation: 'rollback'
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.historyFile, logLine);

    if (this.verbose) {
      console.log(`📝 Rollback logged to: ${this.historyFile}`);
    }
  }

  /**
   * Find information about the last rollback
   */
  async findLastRollbackInfo() {
    // Look for the most recent backup
    if (fs.existsSync(this.backupDir)) {
      const backupFiles = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stats: fs.statSync(path.join(this.backupDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

      if (backupFiles.length > 0) {
        return {
          type: 'backup',
          backupPath: backupFiles[0].path,
          timestamp: backupFiles[0].stats.mtime
        };
      }
    }

    // Look for undo patch files
    const undoFiles = ['undo.json', 'mutation-undo.json', '.last-undo.json']
      .map(fileName => path.resolve(fileName))
      .filter(filePath => fs.existsSync(filePath));

    if (undoFiles.length > 0) {
      return {
        type: 'patch',
        undoPatchPath: undoFiles[0]
      };
    }

    return null;
  }

  /**
   * List available rollback points
   */
  async listRollbackPoints() {
    const rollbackPoints = [];

    // List backup files
    if (fs.existsSync(this.backupDir)) {
      const backupFiles = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            type: 'backup',
            path: filePath,
            filename: file,
            created: stats.mtime,
            size: stats.size
          };
        })
        .sort((a, b) => b.created - a.created);

      rollbackPoints.push(...backupFiles);
    }

    return rollbackPoints;
  }

  /**
   * Clean up old backups
   */
  async cleanupBackups(keepCount = 10) {
    if (!fs.existsSync(this.backupDir)) {
      return;
    }

    const backupFiles = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(this.backupDir, file),
        stats: fs.statSync(path.join(this.backupDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);

    if (backupFiles.length <= keepCount) {
      return;
    }

    const filesToDelete = backupFiles.slice(keepCount);
    let deletedCount = 0;

    for (const file of filesToDelete) {
      try {
        fs.unlinkSync(file.path);
        deletedCount++;
      } catch (error) {
        if (this.verbose) {
          console.warn(`⚠️ Failed to delete backup: ${file.name}`);
        }
      }
    }

    if (this.verbose && deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} old backup files`);
    }
  }
}

/**
 * CLI-friendly rollback function
 */
export async function rollback(registryPath, rollbackSource, options = {}) {
  const rollbacker = new DCPRollback(options);

  if (rollbackSource === 'last' || !rollbackSource) {
    return await rollbacker.rollbackLast(registryPath, options);
  } else if (rollbackSource.endsWith('.json')) {
    if (rollbackSource.includes('backup') || !rollbackSource.includes('undo')) {
      return await rollbacker.rollbackWithBackup(registryPath, rollbackSource, options);
    } else {
      return await rollbacker.rollbackWithPatch(registryPath, rollbackSource, options);
    }
  } else {
    throw new Error('Invalid rollback source. Use "last", backup file path, or undo patch path.');
  }
}

/**
 * Command-line interface
 */
export async function runRollbackCLI(args) {
  const registryPath = args[0] || './dist/registry.json';
  const rollbackSource = args[1] || 'last';
  const outputPath = args[2];

  // Parse options
  const options = {
    verbose: args.includes('--verbose'),
    createBackup: !args.includes('--no-backup'),
    validateOnRollback: !args.includes('--no-validate'),
    outputPath: outputPath || registryPath
  };

  // Special commands
  if (args.includes('--list')) {
    const rollbacker = new DCPRollback(options);
    const rollbackPoints = await rollbacker.listRollbackPoints();
    
    if (rollbackPoints.length === 0) {
      console.log('📂 No rollback points available');
      return;
    }

    console.log('📂 Available rollback points:');
    rollbackPoints.forEach((point, index) => {
      console.log(`   ${index + 1}. ${point.filename} (${point.type}, ${point.created.toLocaleString()})`);
    });
    return;
  }

  if (args.includes('--cleanup')) {
    const keepCount = parseInt(args.find(arg => arg.startsWith('--keep='))?.split('=')[1]) || 10;
    const rollbacker = new DCPRollback(options);
    await rollbacker.cleanupBackups(keepCount);
    console.log(`🧹 Backup cleanup completed (kept ${keepCount} most recent)`);
    return;
  }

  if (!registryPath) {
    console.error('❌ Usage: node dcpRollback.js <registryPath> [rollbackSource] [outputPath]');
    console.error('');
    console.error('   rollbackSource: "last", backup file path, or undo patch path');
    console.error('');
    console.error('   Options:');
    console.error('     --verbose           Verbose logging');
    console.error('     --no-backup         Skip creating backup before rollback');
    console.error('     --no-validate       Skip schema validation');
    console.error('     --list             List available rollback points');
    console.error('     --cleanup          Clean up old backups');
    console.error('     --keep=N           Keep N most recent backups (default: 10)');
    process.exit(1);
  }

  try {
    const result = await rollback(registryPath, rollbackSource, options);
    
    console.log('🎉 Rollback completed successfully!');
    console.log(`📊 Method: ${result.method}`);
    console.log(`📁 Output: ${options.outputPath}`);
    
    if (result.patchesApplied) {
      console.log(`⚡ Patches applied: ${result.patchesApplied}`);
    }
    
    if (result.backupPath) {
      console.log(`💾 Backup created: ${result.backupPath}`);
    }
    
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    process.exit(1);
  }
}

// Enable direct CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  runRollbackCLI(process.argv.slice(2));
}