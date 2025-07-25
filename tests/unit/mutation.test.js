import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Mutation CLI Commands', () => {
  const testDir = path.join(__dirname, 'temp-mutation-tests');
  const cliPath = path.join(__dirname, '../../bin/dcp.js');
  
  beforeEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('dcp mutate command', () => {
    it('should apply JSON Patch mutations successfully', async () => {
      // Create test registry
      const registry = {
        name: 'test',
        version: '1.0.0',
        components: [
          {
            name: 'Button',
            type: 'component',
            props: { variant: 'primary' }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Create mutation patch
      const patch = [
        {
          op: 'replace',
          path: '/components/0/props/variant',
          value: 'ghost'
        }
      ];
      
      const patchPath = path.join(testDir, 'patch.json');
      await fs.writeFile(patchPath, JSON.stringify(patch, null, 2));
      
      const outputPath = path.join(testDir, 'output.json');
      const undoPath = path.join(testDir, 'undo.json');
      
      // Run mutation command
      const { stdout } = await execAsync(
        `node "${cliPath}" mutate "${registryPath}" "${patchPath}" "${outputPath}" --undo "${undoPath}"`
      );
      
      expect(stdout).toContain('✅ Applied 1 mutations');
      expect(stdout).toContain('↩️  Undo patch available');
      
      // Verify output file
      const output = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
      expect(output.components[0].props.variant).toBe('ghost');
      
      // Verify undo patch was created
      const undoExists = await fs.access(undoPath).then(() => true).catch(() => false);
      expect(undoExists).toBe(true);
    });

    it('should support --json output flag', async () => {
      const registry = { name: 'test', components: [] };
      const patch = [{ op: 'add', path: '/metadata', value: { test: true } }];
      
      const registryPath = path.join(testDir, 'registry.json');
      const patchPath = path.join(testDir, 'patch.json');
      const outputPath = path.join(testDir, 'output.json');
      
      await fs.writeFile(registryPath, JSON.stringify(registry));
      await fs.writeFile(patchPath, JSON.stringify(patch));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" mutate "${registryPath}" "${patchPath}" "${outputPath}" --json`
      );
      
      const result = JSON.parse(stdout);
      expect(result.success).toBe(true);
      expect(result.mutations).toBe(1);
      expect(result.output).toBe(outputPath);
    });

    it('should support --dry-run flag', async () => {
      const registry = { name: 'test', components: [] };
      const patch = [{ op: 'add', path: '/test', value: 'value' }];
      
      const registryPath = path.join(testDir, 'registry.json');
      const patchPath = path.join(testDir, 'patch.json');
      const outputPath = path.join(testDir, 'output.json');
      
      await fs.writeFile(registryPath, JSON.stringify(registry));
      await fs.writeFile(patchPath, JSON.stringify(patch));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" mutate "${registryPath}" "${patchPath}" "${outputPath}" --dry-run --json`
      );
      
      const result = JSON.parse(stdout);
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.mutations).toBe(1);
      
      // Verify no output file was created
      const outputExists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(outputExists).toBe(false);
    });
  });

  describe('dcp rollback command', () => {
    it('should rollback mutations successfully', async () => {
      // Create original registry
      const original = {
        name: 'test',
        version: '1.0.0',
        components: [{ name: 'Button', props: { variant: 'primary' } }]
      };
      
      // Create mutated version
      const mutated = {
        name: 'test', 
        version: '1.0.0',
        components: [{ name: 'Button', props: { variant: 'ghost' } }]
      };
      
      // Create undo patch
      const undoPatch = [
        {
          op: 'replace',
          path: '/components/0/props/variant',
          value: 'primary'
        }
      ];
      
      const mutatedPath = path.join(testDir, 'mutated.json');
      const undoPath = path.join(testDir, 'undo.json');
      
      await fs.writeFile(mutatedPath, JSON.stringify(mutated, null, 2));
      await fs.writeFile(undoPath, JSON.stringify(undoPatch, null, 2));
      
      // Run rollback command
      const { stdout } = await execAsync(
        `node "${cliPath}" rollback "${mutatedPath}" "${undoPath}" --backup`
      );
      
      expect(stdout).toContain('✅ Rollback complete');
      expect(stdout).toContain('↩️  Applied 1 undo patches');
      
      // Verify rollback worked
      const rolledBack = JSON.parse(await fs.readFile(mutatedPath, 'utf-8'));
      expect(rolledBack.components[0].props.variant).toBe('primary');
    });

    it('should support --json output flag', async () => {
      const mutated = { name: 'test', test: 'value' };
      const undoPatch = [{ op: 'remove', path: '/test' }];
      
      const mutatedPath = path.join(testDir, 'mutated.json');
      const undoPath = path.join(testDir, 'undo.json');
      
      await fs.writeFile(mutatedPath, JSON.stringify(mutated));
      await fs.writeFile(undoPath, JSON.stringify(undoPatch));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" rollback "${mutatedPath}" "${undoPath}" --json`
      );
      
      const result = JSON.parse(stdout);
      expect(result.success).toBe(true);
      expect(result.rollback).toBe(mutatedPath);
      expect(result.patchCount).toBe(1);
    });
  });

  describe('dcp agent command', () => {
    it('should accept natural language prompts', async () => {
      const { stdout } = await execAsync(
        `node "${cliPath}" agent "Make all buttons ghost variant" --json`
      );
      
      const result = JSON.parse(stdout);
      expect(result.success).toBe(true);
      expect(result.intent).toBe('Make all buttons ghost variant');
      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps.preview).toContain('dcp diffPreview');
      expect(result.nextSteps.apply).toContain('dcp mutate');
      expect(result.nextSteps.rollback).toContain('dcp rollback');
    });

    it('should support --plan-only flag', async () => {
      const { stdout } = await execAsync(
        `node "${cliPath}" agent "Update colors" --plan-only --json`
      );
      
      const result = JSON.parse(stdout);
      expect(result.success).toBe(true);
      expect(result.planOnly).toBe(true);
    });
  });

  describe('JSON output consistency', () => {
    it('should provide consistent JSON structure across commands', async () => {
      // Test extract command JSON output
      const { stdout: extractOutput } = await execAsync(
        `node "${cliPath}" extract "${path.join(__dirname, 'fixtures')}" --json`
      );
      
      // Should be pure JSON output now (no console logs mixed in)
      const extractResult = JSON.parse(extractOutput.trim());
      expect(extractResult).toHaveProperty('success');
      expect(extractResult).toHaveProperty('components');
      expect(extractResult).toHaveProperty('registryPath');
    });
  });

  describe('End-to-end mutation workflow', () => {
    it('should complete full extract → mutate → rollback cycle', async () => {
      // Step 1: Extract components
      const { stdout: extractOutput } = await execAsync(
        `node "${cliPath}" extract "${path.join(__dirname, 'fixtures')}" --out "${testDir}" --json`
      );
      
      const extractResult = JSON.parse(extractOutput.trim());
      expect(extractResult.success).toBe(true);
      
      // Step 2: Create and apply mutation
      const patch = [{ op: 'add', path: '/metadata/e2eTest', value: true }];
      const patchPath = path.join(testDir, 'e2e-patch.json');
      const mutatedPath = path.join(testDir, 'mutated.json');
      const undoPath = path.join(testDir, 'undo.json');
      
      await fs.writeFile(patchPath, JSON.stringify(patch, null, 2));
      
      const { stdout: mutateOutput } = await execAsync(
        `node "${cliPath}" mutate "${extractResult.registryPath}" "${patchPath}" "${mutatedPath}" --undo "${undoPath}" --json`
      );
      
      const mutateResult = JSON.parse(mutateOutput);
      expect(mutateResult.success).toBe(true);
      expect(mutateResult.mutations).toBe(1);
      
      // Step 3: Rollback
      const { stdout: rollbackOutput } = await execAsync(
        `node "${cliPath}" rollback "${mutatedPath}" "${undoPath}" --json`
      );
      
      const rollbackResult = JSON.parse(rollbackOutput);
      expect(rollbackResult.success).toBe(true);
      
      // Step 4: Verify rollback worked
      const originalData = JSON.parse(await fs.readFile(extractResult.registryPath, 'utf-8'));
      const rolledBackData = JSON.parse(await fs.readFile(mutatedPath, 'utf-8'));
      
      // Should not have the e2eTest property after rollback
      expect(rolledBackData.metadata?.e2eTest).toBeUndefined();
    });
  });
});