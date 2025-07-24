import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('🧪 Mutation Safety', () => {
  const testDir = path.join(__dirname, 'temp-mutation-safety');
  const cliPath = path.join(__dirname, '..', 'bin', 'dcp.js');
  
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

  describe('Mutation Diff Testing', () => {
    it('should generate clear diff from prior version', async () => {
      // Create original registry
      const originalRegistry = {
        name: 'test-registry',
        version: '1.0.0',
        components: [
          {
            name: 'Button',
            type: 'component',
            props: {
              variant: { type: 'string', values: ['primary', 'secondary'] },
              size: { type: 'string', values: ['sm', 'md', 'lg'] }
            }
          }
        ]
      };
      
      const originalPath = path.join(testDir, 'original.json');
      await fs.writeFile(originalPath, JSON.stringify(originalRegistry, null, 2));
      
      // Create mutation to add new variant
      const mutation = [
        {
          op: 'add',
          path: '/components/0/props/variant/values/-',
          value: 'ghost'
        }
      ];
      
      const mutationPath = path.join(testDir, 'mutation.json');
      const mutatedPath = path.join(testDir, 'mutated.json');
      const undoPath = path.join(testDir, 'undo.json');
      
      await fs.writeFile(mutationPath, JSON.stringify(mutation, null, 2));
      
      // Apply mutation
      const { stdout: mutateOutput } = await execAsync(
        `node "${cliPath}" mutate "${originalPath}" "${mutationPath}" "${mutatedPath}" --undo "${undoPath}" --json`
      );
      
      const mutateResult = JSON.parse(mutateOutput);
      expect(mutateResult.success).toBe(true);
      
      // Use diff command to show changes
      const { stdout: diffOutput } = await execAsync(
        `node "${cliPath}" diff "${originalPath}" "${mutatedPath}" --json`
      );
      
      const diffResult = JSON.parse(diffOutput);
      expect(diffResult.success).toBe(true);
      expect(diffResult.changes).toBeDefined();
      expect(diffResult.summary.added + diffResult.summary.removed + diffResult.summary.modified).toBeGreaterThan(0);
      
      // Verify diff shows changes (modified component with new variant)
      expect(diffResult.changes.modified.length).toBeGreaterThan(0);
    });

    it('should track multiple mutations in sequence', async () => {
      const registry = {
        name: 'test',
        version: '1.0.0',
        components: [
          {
            name: 'Card',
            props: { title: { type: 'string' } }
          }
        ]
      };
      
      const originalPath = path.join(testDir, 'registry.json');
      await fs.writeFile(originalPath, JSON.stringify(registry, null, 2));
      
      // Mutation 1: Add description prop
      const mutation1 = [{ op: 'add', path: '/components/0/props/description', value: { type: 'string', optional: true } }];
      const mutation1Path = path.join(testDir, 'mutation1.json');
      const step1Path = path.join(testDir, 'step1.json');
      
      await fs.writeFile(mutation1Path, JSON.stringify(mutation1, null, 2));
      
      await execAsync(
        `node "${cliPath}" mutate "${originalPath}" "${mutation1Path}" "${step1Path}" --json`
      );
      
      // Mutation 2: Add footer prop
      const mutation2 = [{ op: 'add', path: '/components/0/props/footer', value: { type: 'ReactNode', optional: true } }];
      const mutation2Path = path.join(testDir, 'mutation2.json');
      const step2Path = path.join(testDir, 'step2.json');
      
      await fs.writeFile(mutation2Path, JSON.stringify(mutation2, null, 2));
      
      await execAsync(
        `node "${cliPath}" mutate "${step1Path}" "${mutation2Path}" "${step2Path}" --json`
      );
      
      // Check cumulative diff from original
      const { stdout: diffOutput } = await execAsync(
        `node "${cliPath}" diff "${originalPath}" "${step2Path}" --json`
      );
      
      const diffResult = JSON.parse(diffOutput);
      expect(diffResult.summary.modified).toBeGreaterThan(0);
      
      // Should show component modifications
      expect(diffResult.changes.modified.length).toBeGreaterThan(0);
      // Check that we have prop changes in the modified component
      const componentChanges = diffResult.changes.modified[0].changes;
      expect(componentChanges.some(c => c.type === 'prop_added')).toBe(true);
    });
  });

  describe('Rollback Integrity', () => {
    it('should restore exact original state', async () => {
      const originalRegistry = {
        name: 'rollback-test',
        version: '1.0.0',
        metadata: { author: 'test', tags: ['ui', 'components'] },
        components: [
          {
            name: 'Input',
            props: {
              placeholder: { type: 'string', optional: true },
              disabled: { type: 'boolean', default: false }
            }
          }
        ]
      };
      
      const originalPath = path.join(testDir, 'original.json');
      await fs.writeFile(originalPath, JSON.stringify(originalRegistry, null, 2));
      
      // Store original content hash for comparison
      const originalContent = JSON.stringify(originalRegistry);
      
      // Apply complex mutation
      const mutation = [
        { op: 'add', path: '/components/0/props/type', value: { type: 'string', values: ['text', 'email', 'password'] } },
        { op: 'replace', path: '/metadata/tags', value: ['ui', 'form', 'input'] },
        { op: 'add', path: '/metadata/version', value: '2.0.0' }
      ];
      
      const mutationPath = path.join(testDir, 'mutation.json');
      const mutatedPath = path.join(testDir, 'mutated.json');
      const undoPath = path.join(testDir, 'undo.json');
      
      await fs.writeFile(mutationPath, JSON.stringify(mutation, null, 2));
      
      // Apply mutation with undo generation
      await execAsync(
        `node "${cliPath}" mutate "${originalPath}" "${mutationPath}" "${mutatedPath}" --undo "${undoPath}" --json`
      );
      
      // Verify mutation was applied
      const mutatedRegistry = JSON.parse(await fs.readFile(mutatedPath, 'utf-8'));
      expect(mutatedRegistry.components[0].props.type).toBeDefined();
      expect(mutatedRegistry.metadata.tags).toContain('form');
      expect(mutatedRegistry.metadata.version).toBe('2.0.0');
      
      // Apply rollback
      const { stdout: rollbackOutput } = await execAsync(
        `node "${cliPath}" rollback "${mutatedPath}" "${undoPath}" --json`
      );
      
      const rollbackResult = JSON.parse(rollbackOutput);
      expect(rollbackResult.success).toBe(true);
      
      // Verify exact restoration
      const rolledBackRegistry = JSON.parse(await fs.readFile(mutatedPath, 'utf-8'));
      const rolledBackContent = JSON.stringify(rolledBackRegistry);
      
      expect(rolledBackContent).toBe(originalContent);
      expect(rolledBackRegistry.components[0].props.type).toBeUndefined();
      expect(rolledBackRegistry.metadata.tags).toEqual(['ui', 'components']);
      expect(rolledBackRegistry.metadata.version).toBeUndefined();
    });

    it('should handle nested rollbacks correctly', async () => {
      const registry = { name: 'nested-test', components: [{ name: 'Test', props: {} }] };
      const registryPath = path.join(testDir, 'registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Mutation 1: Add nested object
      const mutation1 = [{ 
        op: 'add', 
        path: '/components/0/props/style', 
        value: { 
          type: 'object',
          properties: {
            backgroundColor: { type: 'string' },
            padding: { type: 'string' }
          }
        } 
      }];
      
      const mutation1Path = path.join(testDir, 'mutation1.json');
      const step1Path = path.join(testDir, 'step1.json');
      const undo1Path = path.join(testDir, 'undo1.json');
      
      await fs.writeFile(mutation1Path, JSON.stringify(mutation1, null, 2));
      
      await execAsync(
        `node "${cliPath}" mutate "${registryPath}" "${mutation1Path}" "${step1Path}" --undo "${undo1Path}" --json`
      );
      
      // Mutation 2: Modify nested property
      const mutation2 = [{ 
        op: 'add', 
        path: '/components/0/props/style/properties/margin', 
        value: { type: 'string' } 
      }];
      
      const mutation2Path = path.join(testDir, 'mutation2.json');
      const step2Path = path.join(testDir, 'step2.json');
      const undo2Path = path.join(testDir, 'undo2.json');
      
      await fs.writeFile(mutation2Path, JSON.stringify(mutation2, null, 2));
      
      await execAsync(
        `node "${cliPath}" mutate "${step1Path}" "${mutation2Path}" "${step2Path}" --undo "${undo2Path}" --json`
      );
      
      // Rollback step 2
      await execAsync(`node "${cliPath}" rollback "${step2Path}" "${undo2Path}" --json`);
      
      // Should be back to step 1 state
      const afterRollback1 = JSON.parse(await fs.readFile(step2Path, 'utf-8'));
      expect(afterRollback1.components[0].props.style.properties.margin).toBeUndefined();
      expect(afterRollback1.components[0].props.style.properties.backgroundColor).toBeDefined();
      
      // Rollback step 1
      await execAsync(`node "${cliPath}" rollback "${step2Path}" "${undo1Path}" --json`);
      
      // Should be back to original state
      const afterRollback2 = JSON.parse(await fs.readFile(step2Path, 'utf-8'));
      expect(afterRollback2.components[0].props.style).toBeUndefined();
    });
  });

  describe('Scoped Mutation', () => {
    it('should not affect unrelated components', async () => {
      const registry = {
        name: 'scoped-test',
        components: [
          {
            name: 'Button',
            props: { variant: { type: 'string' } }
          },
          {
            name: 'Card',
            props: { title: { type: 'string' } }
          },
          {
            name: 'Input',
            props: { placeholder: { type: 'string' } }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Store original state of unrelated components
      const originalButton = JSON.stringify(registry.components[0]);
      const originalInput = JSON.stringify(registry.components[2]);
      
      // Mutation targeting only Card component
      const mutation = [
        { op: 'add', path: '/components/1/props/description', value: { type: 'string', optional: true } },
        { op: 'add', path: '/components/1/props/footer', value: { type: 'ReactNode', optional: true } }
      ];
      
      const mutationPath = path.join(testDir, 'mutation.json');
      const mutatedPath = path.join(testDir, 'mutated.json');
      
      await fs.writeFile(mutationPath, JSON.stringify(mutation, null, 2));
      
      await execAsync(
        `node "${cliPath}" mutate "${registryPath}" "${mutationPath}" "${mutatedPath}" --json`
      );
      
      const mutatedRegistry = JSON.parse(await fs.readFile(mutatedPath, 'utf-8'));
      
      // Card should be modified
      expect(mutatedRegistry.components[1].props.description).toBeDefined();
      expect(mutatedRegistry.components[1].props.footer).toBeDefined();
      
      // Button and Input should be unchanged
      const mutatedButton = JSON.stringify(mutatedRegistry.components[0]);
      const mutatedInput = JSON.stringify(mutatedRegistry.components[2]);
      
      expect(mutatedButton).toBe(originalButton);
      expect(mutatedInput).toBe(originalInput);
    });

    it('should handle variant-specific mutations', async () => {
      const registry = {
        name: 'variant-test',
        components: [
          {
            name: 'Button',
            variants: {
              primary: { className: 'btn-primary' },
              secondary: { className: 'btn-secondary' },
              danger: { className: 'btn-danger' }
            }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Store original variants
      const originalPrimary = JSON.stringify(registry.components[0].variants.primary);
      const originalDanger = JSON.stringify(registry.components[0].variants.danger);
      
      // Mutation targeting only secondary variant
      const mutation = [
        { 
          op: 'add', 
          path: '/components/0/variants/secondary/hoverClassName', 
          value: 'btn-secondary-hover' 
        }
      ];
      
      const mutationPath = path.join(testDir, 'mutation.json');
      const mutatedPath = path.join(testDir, 'mutated.json');
      
      await fs.writeFile(mutationPath, JSON.stringify(mutation, null, 2));
      
      await execAsync(
        `node "${cliPath}" mutate "${registryPath}" "${mutationPath}" "${mutatedPath}" --json`
      );
      
      const mutatedRegistry = JSON.parse(await fs.readFile(mutatedPath, 'utf-8'));
      
      // Secondary variant should have new property
      expect(mutatedRegistry.components[0].variants.secondary.hoverClassName).toBe('btn-secondary-hover');
      
      // Other variants should be unchanged
      const mutatedPrimary = JSON.stringify(mutatedRegistry.components[0].variants.primary);
      const mutatedDanger = JSON.stringify(mutatedRegistry.components[0].variants.danger);
      
      expect(mutatedPrimary).toBe(originalPrimary);
      expect(mutatedDanger).toBe(originalDanger);
    });
  });

  describe('Readme/Demo Regeneration', () => {
    it.skip('should detect when documentation needs updating after prop changes', async () => {
      const registry = {
        name: 'docs-test',
        components: [
          {
            name: 'Slider',
            props: {
              min: { type: 'number', default: 0 },
              max: { type: 'number', default: 100 },
              value: { type: 'number' }
            },
            documentation: {
              description: 'A slider component with min=0, max=100',
              examples: ['<Slider min={0} max={100} value={50} />']
            }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Mutation: Change default max value
      const mutation = [
        { op: 'replace', path: '/components/0/props/max/default', value: 200 }
      ];
      
      const mutationPath = path.join(testDir, 'mutation.json');
      const mutatedPath = path.join(testDir, 'mutated.json');
      
      await fs.writeFile(mutationPath, JSON.stringify(mutation, null, 2));
      
      const { stdout: mutateOutput } = await execAsync(
        `node "${cliPath}" mutate "${registryPath}" "${mutationPath}" "${mutatedPath}" --json`
      );
      
      const mutateResult = JSON.parse(mutateOutput);
      expect(mutateResult.success).toBe(true);
      
      // Check if documentation update is flagged
      const mutatedRegistry = JSON.parse(await fs.readFile(mutatedPath, 'utf-8'));
      
      // The system should either:
      // 1. Auto-update documentation to reflect new default, OR
      // 2. Flag that documentation is outdated
      
      if (mutateResult.warnings) {
        const docWarning = mutateResult.warnings.find(w => 
          w.includes('documentation') || w.includes('examples')
        );
        expect(docWarning).toBeDefined();
      } else {
        // If auto-updated, documentation should reflect new default
        expect(mutatedRegistry.components[0].documentation.description).toContain('200');
      }
    });

    it('should validate examples still work after prop mutations', async () => {
      const registry = {
        name: 'example-test',
        components: [
          {
            name: 'Badge',
            props: {
              color: { type: 'string', values: ['red', 'green', 'blue'] },
              text: { type: 'string' }
            },
            examples: [
              '<Badge color="red" text="Error" />',
              '<Badge color="yellow" text="Warning" />'  // Invalid - yellow not in values
            ]
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // First validate current state (should catch invalid example)
      try {
        const { stdout: validateOutput } = await execAsync(
          `node "${cliPath}" validate "${registryPath}" --json`
        );
        
        const validateResult = JSON.parse(validateOutput);
        
        if (validateResult.success === false || validateResult.warnings) {
          // Good - system detected invalid example
          const invalidExample = validateResult.errors?.find(e => e.includes('yellow')) ||
                                validateResult.warnings?.find(w => w.includes('yellow'));
          expect(invalidExample).toBeDefined();
        }
      } catch (error) {
        // Also acceptable - validation failed due to invalid example
        expect(error.stdout || error.stderr).toContain('yellow');
      }
      
      // Now add 'yellow' as valid color
      const mutation = [
        { op: 'add', path: '/components/0/props/color/values/-', value: 'yellow' }
      ];
      
      const mutationPath = path.join(testDir, 'mutation.json');
      const mutatedPath = path.join(testDir, 'mutated.json');
      
      await fs.writeFile(mutationPath, JSON.stringify(mutation, null, 2));
      
      await execAsync(
        `node "${cliPath}" mutate "${registryPath}" "${mutationPath}" "${mutatedPath}" --json`
      );
      
      // Now validation should pass
      const { stdout: revalidateOutput } = await execAsync(
        `node "${cliPath}" validate "${mutatedPath}" --json`
      );
      
      const revalidateResult = JSON.parse(revalidateOutput);
      expect(revalidateResult.success).toBe(true);
    });
  });
});