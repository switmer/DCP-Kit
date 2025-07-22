import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { DCPTransformer, extract, mutate, rollback } from '../lib/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Programmatic API', () => {
  const testDir = path.join(__dirname, 'temp-api-tests');
  let dcp;
  
  beforeEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
    await fs.mkdir(testDir, { recursive: true });
    
    // Use the local CLI script during tests
    const cliPath = path.join(__dirname, '..', 'bin', 'dcp.js');
    dcp = new DCPTransformer({ cliPath: `node "${cliPath}"` });
  });
  
  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('DCPTransformer class', () => {
    it('should extract components via API', async () => {
      const result = await dcp.extract(path.join(__dirname, 'fixtures'), {
        out: testDir
      });
      
      expect(result.success).toBe(true);
      expect(result.components).toBeGreaterThan(0);
      expect(result.registryPath).toContain('registry.json');
      
      // Verify registry file was created
      const registryExists = await fs.access(result.registryPath).then(() => true).catch(() => false);
      expect(registryExists).toBe(true);
    });

    it('should mutate registry via API with object patch', async () => {
      // First extract
      const extractResult = await dcp.extract(path.join(__dirname, 'fixtures'), {
        out: testDir
      });
      
      // Then mutate with object patch
      const mutations = [
        {
          op: 'add',
          path: '/metadata/apiTest',
          value: true
        }
      ];
      
      const outputPath = path.join(testDir, 'mutated.json');
      const undoPath = path.join(testDir, 'undo.json');
      
      const result = await dcp.mutate(
        extractResult.registryPath,
        mutations,
        outputPath,
        { undo: undoPath, tempPatchFile: path.join(testDir, 'temp-patch.json') }
      );
      
      expect(result.success).toBe(true);
      expect(result.mutations).toBe(1);
      expect(result.undo).toBe(undoPath);
      
      // Verify mutation was applied
      const mutated = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
      expect(mutated.metadata.apiTest).toBe(true);
    });

    it('should rollback via API', async () => {
      // Create test files
      const original = { name: 'test', value: 'original' };
      const mutated = { name: 'test', value: 'mutated' };
      const undoPatch = [{ op: 'replace', path: '/value', value: 'original' }];
      
      const mutatedPath = path.join(testDir, 'mutated.json');
      const undoPath = path.join(testDir, 'undo.json');
      
      await fs.writeFile(mutatedPath, JSON.stringify(mutated));
      await fs.writeFile(undoPath, JSON.stringify(undoPatch));
      
      const result = await dcp.rollback(mutatedPath, undoPath);
      
      expect(result.success).toBe(true);
      expect(result.patchCount).toBe(1);
      
      // Verify rollback worked
      const rolledBack = JSON.parse(await fs.readFile(mutatedPath, 'utf-8'));
      expect(rolledBack.value).toBe('original');
    });

    it('should support agent planning via API', async () => {
      const result = await dcp.agent('Make all buttons accessible', {
        registry: './test-registry.json',
        planOnly: true
      });
      
      expect(result.success).toBe(true);
      expect(result.intent).toBe('Make all buttons accessible');
      expect(result.planOnly).toBe(true);
      expect(result.nextSteps).toBeDefined();
    });

    it('should support dry-run mutations', async () => {
      // Create test registry
      const registry = { name: 'test', components: [] };
      const registryPath = path.join(testDir, 'registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry));
      
      const mutations = [{ op: 'add', path: '/test', value: 'dryrun' }];
      const outputPath = path.join(testDir, 'output.json');
      
      const result = await dcp.mutate(registryPath, mutations, outputPath, { 
        dryRun: true,
        tempPatchFile: path.join(testDir, 'temp-patch.json')
      });
      
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.mutations).toBe(1);
      
      // Verify no output file was created
      const outputExists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(outputExists).toBe(false);
    });

    it('should complete full workflow', async () => {
      const result = await dcp.workflow(
        path.join(__dirname, 'fixtures'),
        [{ op: 'add', path: '/metadata/workflowTest', value: true }],
        {
          extractOut: testDir,
          mutateOut: path.join(testDir, 'mutated.json'),
          transpileOut: path.join(testDir, 'components')
        }
      );
      
      expect(result.extract).toBeDefined();
      expect(result.extract.success).toBe(true);
      
      expect(result.mutate).toBeDefined();
      expect(result.mutate.success).toBe(true);
      
      expect(result.transpile).toBeDefined();
      expect(result.transpile.success).toBe(true);
    });
  });

  describe('Convenience functions', () => {
    it('should work with direct extract function', async () => {
      // Use test CLI path for convenience functions too
      const cliPath = path.join(__dirname, '..', 'bin', 'dcp.js');
      const testDcp = new DCPTransformer({ cliPath: `node "${cliPath}"` });
      
      const result = await testDcp.extract(path.join(__dirname, 'fixtures'), {
        out: testDir
      });
      
      expect(result.success).toBe(true);
      expect(result.components).toBeGreaterThan(0);
    });

    it('should work with direct mutate function', async () => {
      // Create test files
      const registry = { name: 'test' };
      const patch = [{ op: 'add', path: '/test', value: true }];
      
      const registryPath = path.join(testDir, 'registry.json');
      const patchPath = path.join(testDir, 'patch.json');
      const outputPath = path.join(testDir, 'output.json');
      
      await fs.writeFile(registryPath, JSON.stringify(registry));
      await fs.writeFile(patchPath, JSON.stringify(patch));
      
      // Use test CLI path for convenience functions too
      const cliPath = path.join(__dirname, '..', 'bin', 'dcp.js');
      const testDcp = new DCPTransformer({ cliPath: `node "${cliPath}"` });
      
      const result = await testDcp.mutate(registryPath, patchPath, outputPath);
      
      expect(result.success).toBe(true);
      expect(result.mutations).toBe(1);
    });

    it('should work with direct rollback function', async () => {
      // Create test files
      const mutated = { name: 'test', value: 'mutated' };
      const undoPatch = [{ op: 'replace', path: '/value', value: 'original' }];
      
      const mutatedPath = path.join(testDir, 'mutated.json');
      const undoPath = path.join(testDir, 'undo.json');
      
      await fs.writeFile(mutatedPath, JSON.stringify(mutated));
      await fs.writeFile(undoPath, JSON.stringify(undoPatch));
      
      // Use test CLI path for convenience functions too
      const cliPath = path.join(__dirname, '..', 'bin', 'dcp.js');
      const testDcp = new DCPTransformer({ cliPath: `node "${cliPath}"` });
      
      const result = await testDcp.rollback(mutatedPath, undoPath);
      
      expect(result.success).toBe(true);
      expect(result.patchCount).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should handle missing files gracefully', async () => {
      await expect(
        dcp.mutate('nonexistent.json', '[]', 'output.json')
      ).rejects.toThrow('Mutation failed');
    });

    it('should handle invalid JSON patches', async () => {
      const registry = { name: 'test' };
      const registryPath = path.join(testDir, 'registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry));
      
      const invalidPatch = [{ op: 'invalid', path: '/test' }]; // Missing required 'value'
      
      await expect(
        dcp.mutate(registryPath, invalidPatch, path.join(testDir, 'output.json'), {
          tempPatchFile: path.join(testDir, 'temp-patch.json')
        })
      ).rejects.toThrow('Mutation failed');
    });
  });

  describe('Configuration', () => {
    it('should accept custom CLI path', () => {
      const customDcp = new DCPTransformer({ 
        cliPath: '/custom/path/to/dcp',
        verbose: true
      });
      
      expect(customDcp.cliPath).toBe('/custom/path/to/dcp');
      expect(customDcp.verbose).toBe(true);
    });
  });
});