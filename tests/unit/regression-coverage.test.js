import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('🧪 Regression Coverage', () => {
  const testDir = path.join(__dirname, 'temp-regression-coverage');
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

  describe('Full Regression on Core Commands', () => {
    const testComponents = {
      'Button.tsx': `
        interface ButtonProps {
          variant?: 'primary' | 'secondary' | 'danger';
          size?: 'sm' | 'md' | 'lg';
          disabled?: boolean;
          children: React.ReactNode;
          onClick?: () => void;
        }
        
        export const Button = ({ 
          variant = 'primary', 
          size = 'md', 
          disabled = false,
          children,
          onClick 
        }: ButtonProps) => {
          return (
            <button 
              className={\`btn btn-\${variant} btn-\${size}\`}
              disabled={disabled}
              onClick={onClick}
            >
              {children}
            </button>
          );
        };
      `,
      'Card.tsx': `
        interface CardProps {
          title: string;
          description?: string;
          variant?: 'default' | 'outlined' | 'elevated';
          children?: React.ReactNode;
        }
        
        export const Card = ({ title, description, variant = 'default', children }: CardProps) => {
          return (
            <div className={\`card card-\${variant}\`}>
              <h3>{title}</h3>
              {description && <p>{description}</p>}
              {children}
            </div>
          );
        };
      `,
      'Input.tsx': `
        interface InputProps {
          type?: 'text' | 'email' | 'password';
          placeholder?: string;
          value?: string;
          onChange?: (value: string) => void;
          disabled?: boolean;
          required?: boolean;
        }
        
        export const Input = ({ 
          type = 'text', 
          placeholder, 
          value, 
          onChange, 
          disabled = false,
          required = false
        }: InputProps) => {
          return (
            <input 
              type={type}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={disabled}
              required={required}
            />
          );
        };
      `
    };

    async function setupTestComponents() {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      for (const [filename, content] of Object.entries(testComponents)) {
        await fs.writeFile(path.join(componentDir, filename), content);
      }
      
      return componentDir;
    }

    it('should maintain extract command stability across versions', async () => {
      const componentDir = await setupTestComponents();
      
      // Extract components
      const { stdout: extractOutput } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --out "${testDir}/extracted.json" --json`
      );
      
      const extractResult = JSON.parse(extractOutput.trim());
      expect(extractResult.success).toBe(true);
      expect(extractResult.components).toHaveLength(3);
      expect(extractResult.components).toContain('Button');
      expect(extractResult.components).toContain('Card');
      expect(extractResult.components).toContain('Input');
      
      // Verify registry structure hasn't changed
      const registry = JSON.parse(await fs.readFile(extractResult.registryPath, 'utf-8'));
      
      // Core registry structure should remain stable
      expect(registry).toHaveProperty('name');
      expect(registry).toHaveProperty('version');
      expect(registry).toHaveProperty('components');
      expect(Array.isArray(registry.components)).toBe(true);
      
      // Each component should have expected structure
      registry.components.forEach(component => {
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('props');
        expect(typeof component.props).toBe('object');
      });
      
      // Button component specific checks (regression guard)
      const button = registry.components.find(c => c.name === 'Button');
      expect(button.props.variant).toBeDefined();
      expect(button.props.variant.values).toEqual(['primary', 'secondary', 'danger']);
      expect(button.props.size).toBeDefined();
      expect(button.props.size.values).toEqual(['sm', 'md', 'lg']);
      expect(button.props.disabled).toBeDefined();
      expect(button.props.disabled.type).toBe('boolean');
    });

    it('should maintain validate command consistency', async () => {
      const validRegistry = {
        name: 'regression-test',
        version: '1.0.0',
        components: [
          {
            name: 'TestComponent',
            props: {
              text: { type: 'string', required: true },
              count: { type: 'number', default: 0 },
              enabled: { type: 'boolean', optional: true }
            }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'valid-registry.json');
      await fs.writeFile(registryPath, JSON.stringify(validRegistry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.componentsValidated).toBe(1);
      
      // Error structure should remain consistent
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should maintain mutation command reliability', async () => {
      const registry = {
        name: 'mutation-regression',
        version: '1.0.0',
        components: [
          {
            name: 'Button',
            props: {
              variant: { type: 'string', values: ['primary', 'secondary'] }
            }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'mutation-registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Standard mutation that should always work
      const mutation = [
        {
          op: 'add',
          path: '/components/0/props/variant/values/-',
          value: 'danger'
        }
      ];
      
      const mutationPath = path.join(testDir, 'mutation.json');
      const outputPath = path.join(testDir, 'mutated.json');
      const undoPath = path.join(testDir, 'undo.json');
      
      await fs.writeFile(mutationPath, JSON.stringify(mutation, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" mutate "${registryPath}" "${mutationPath}" "${outputPath}" --undo "${undoPath}" --json`
      );
      
      const result = JSON.parse(stdout);
      expect(result.success).toBe(true);
      expect(result.mutations).toBe(1);
      
      // Verify mutation was applied
      const mutatedRegistry = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
      expect(mutatedRegistry.components[0].props.variant.values).toContain('danger');
      
      // Verify undo patch was created
      const undoExists = await fs.access(undoPath).then(() => true).catch(() => false);
      expect(undoExists).toBe(true);
    });

    it('should maintain rollback command integrity', async () => {
      const mutatedRegistry = {
        name: 'rollback-test',
        version: '1.0.0',
        components: [
          {
            name: 'Input',
            props: {
              type: { type: 'string', values: ['text', 'email', 'password', 'number'] },
              placeholder: { type: 'string', optional: true }
            }
          }
        ]
      };
      
      const undoPatch = [
        {
          op: 'remove',
          path: '/components/0/props/type/values/3'
        }
      ];
      
      const mutatedPath = path.join(testDir, 'mutated-rollback.json');
      const undoPath = path.join(testDir, 'undo-rollback.json');
      
      await fs.writeFile(mutatedPath, JSON.stringify(mutatedRegistry, null, 2));
      await fs.writeFile(undoPath, JSON.stringify(undoPatch, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" rollback "${mutatedPath}" "${undoPath}" --json`
      );
      
      const result = JSON.parse(stdout);
      expect(result.success).toBe(true);
      expect(result.patchCount).toBe(1);
      
      // Verify rollback was applied
      const rolledBackRegistry = JSON.parse(await fs.readFile(mutatedPath, 'utf-8'));
      expect(rolledBackRegistry.components[0].props.type.values).not.toContain('number');
      expect(rolledBackRegistry.components[0].props.type.values).toHaveLength(3);
    });

    it('should maintain diff command output format', async () => {
      const registry1 = {
        name: 'diff-test',
        components: [
          { name: 'Component', props: { prop1: { type: 'string' } } }
        ]
      };
      
      const registry2 = {
        name: 'diff-test',
        components: [
          { 
            name: 'Component', 
            props: { 
              prop1: { type: 'string' },
              prop2: { type: 'boolean', default: false }
            }
          }
        ]
      };
      
      const path1 = path.join(testDir, 'diff1.json');
      const path2 = path.join(testDir, 'diff2.json');
      
      await fs.writeFile(path1, JSON.stringify(registry1, null, 2));
      await fs.writeFile(path2, JSON.stringify(registry2, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" diff "${path1}" "${path2}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
      
      // Diff output format should remain consistent
      const change = result.changes[0];
      expect(change).toHaveProperty('op');
      expect(change).toHaveProperty('path');
      expect(change).toHaveProperty('value');
    });
  });

  describe('Version Diffing Engine Consistency', () => {
    it('should produce identical diffs for identical changes', async () => {
      const baseRegistry = {
        name: 'version-test',
        version: '1.0.0',
        components: [
          { name: 'Base', props: { initial: { type: 'string' } } }
        ]
      };
      
      const modifiedRegistry = {
        name: 'version-test',
        version: '1.0.0',
        components: [
          { 
            name: 'Base', 
            props: { 
              initial: { type: 'string' },
              added: { type: 'number' }
            }
          }
        ]
      };
      
      const basePath = path.join(testDir, 'base.json');
      const modifiedPath1 = path.join(testDir, 'modified1.json');
      const modifiedPath2 = path.join(testDir, 'modified2.json');
      
      await fs.writeFile(basePath, JSON.stringify(baseRegistry, null, 2));
      await fs.writeFile(modifiedPath1, JSON.stringify(modifiedRegistry, null, 2));
      await fs.writeFile(modifiedPath2, JSON.stringify(modifiedRegistry, null, 2));
      
      // Generate diff twice
      const { stdout: diff1 } = await execAsync(
        `node "${cliPath}" diff "${basePath}" "${modifiedPath1}" --json`
      );
      
      const { stdout: diff2 } = await execAsync(
        `node "${cliPath}" diff "${basePath}" "${modifiedPath2}" --json`
      );
      
      const result1 = JSON.parse(diff1.trim());
      const result2 = JSON.parse(diff2.trim());
      
      // Diffs should be identical
      expect(result1.changes).toEqual(result2.changes);
      expect(result1.summary).toEqual(result2.summary);
    });

    it('should handle complex nested changes consistently', async () => {
      const originalRegistry = {
        name: 'nested-test',
        components: [
          {
            name: 'Complex',
            props: {
              config: {
                type: 'object',
                properties: {
                  theme: { type: 'string', values: ['light', 'dark'] },
                  settings: {
                    type: 'object',
                    properties: {
                      animate: { type: 'boolean', default: true }
                    }
                  }
                }
              }
            }
          }
        ]
      };
      
      const modifiedRegistry = {
        name: 'nested-test',
        components: [
          {
            name: 'Complex',
            props: {
              config: {
                type: 'object',
                properties: {
                  theme: { type: 'string', values: ['light', 'dark', 'auto'] },
                  settings: {
                    type: 'object',
                    properties: {
                      animate: { type: 'boolean', default: false },
                      duration: { type: 'number', default: 300 }
                    }
                  }
                }
              }
            }
          }
        ]
      };
      
      const originalPath = path.join(testDir, 'nested-original.json');
      const modifiedPath = path.join(testDir, 'nested-modified.json');
      
      await fs.writeFile(originalPath, JSON.stringify(originalRegistry, null, 2));
      await fs.writeFile(modifiedPath, JSON.stringify(modifiedRegistry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" diff "${originalPath}" "${modifiedPath}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
      
      // Should detect all nested changes
      const changes = result.changes.map(c => c.path);
      expect(changes.some(path => path.includes('theme') && path.includes('values'))).toBe(true);
      expect(changes.some(path => path.includes('animate') && path.includes('default'))).toBe(true);
      expect(changes.some(path => path.includes('duration'))).toBe(true);
    });

    it('should maintain diff ordering consistency', async () => {
      const registry1 = {
        name: 'order-test',
        components: [
          { name: 'A', props: { prop1: { type: 'string' } } },
          { name: 'B', props: { prop2: { type: 'number' } } },
          { name: 'C', props: { prop3: { type: 'boolean' } } }
        ]
      };
      
      const registry2 = {
        name: 'order-test',
        components: [
          { name: 'A', props: { prop1: { type: 'string' }, newProp: { type: 'string' } } },
          { name: 'B', props: { prop2: { type: 'number' }, newProp: { type: 'number' } } },
          { name: 'C', props: { prop3: { type: 'boolean' }, newProp: { type: 'boolean' } } }
        ]
      };
      
      const path1 = path.join(testDir, 'order1.json');
      const path2 = path.join(testDir, 'order2.json');
      
      await fs.writeFile(path1, JSON.stringify(registry1, null, 2));
      await fs.writeFile(path2, JSON.stringify(registry2, null, 2));
      
      // Run diff multiple times
      const runs = [];
      for (let i = 0; i < 3; i++) {
        const { stdout } = await execAsync(
          `node "${cliPath}" diff "${path1}" "${path2}" --json`
        );
        runs.push(JSON.parse(stdout.trim()));
      }
      
      // All runs should produce identical ordering
      for (let i = 1; i < runs.length; i++) {
        expect(runs[i].changes).toEqual(runs[0].changes);
      }
    });
  });

  describe('Rebuild with Prior meta.json Consistency', () => {
    it('should produce same outputs when rebuilding with identical meta.json', async () => {
      const componentDir = await setupTestComponents();
      
      // Initial extraction
      const { stdout: extract1 } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --out "${testDir}/build1.json" --json`
      );
      
      const result1 = JSON.parse(extract1.trim());
      const registry1 = JSON.parse(await fs.readFile(result1.registryPath, 'utf-8'));
      
      // Save the meta.json
      const metaPath = path.join(testDir, 'saved-meta.json');
      await fs.writeFile(metaPath, JSON.stringify(registry1, null, 2));
      
      // Second extraction using saved meta
      const { stdout: extract2 } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --meta "${metaPath}" --out "${testDir}/build2.json" --json`
      );
      
      const result2 = JSON.parse(extract2.trim());
      const registry2 = JSON.parse(await fs.readFile(result2.registryPath, 'utf-8'));
      
      // Should produce identical results (excluding timestamps)
      delete registry1.timestamp;
      delete registry2.timestamp;
      delete registry1.buildTime;
      delete registry2.buildTime;
      
      expect(registry2).toEqual(registry1);
    });

    it('should maintain component order and structure across rebuilds', async () => {
      const componentDir = await setupTestComponents();
      
      // Extract multiple times
      const builds = [];
      for (let i = 0; i < 3; i++) {
        const { stdout } = await execAsync(
          `node "${cliPath}" extract "${componentDir}" --out "${testDir}/build-${i}.json" --json`
        );
        
        const result = JSON.parse(stdout.trim());
        const registry = JSON.parse(await fs.readFile(result.registryPath, 'utf-8'));
        builds.push(registry);
      }
      
      // All builds should have same component order and structure
      for (let i = 1; i < builds.length; i++) {
        expect(builds[i].components.map(c => c.name)).toEqual(builds[0].components.map(c => c.name));
        
        // Component structure should be identical
        builds[i].components.forEach((component, idx) => {
          const original = builds[0].components[idx];
          expect(component.name).toBe(original.name);
          expect(Object.keys(component.props)).toEqual(Object.keys(original.props));
        });
      }
    });

    it('should detect and handle meta.json format changes', async () => {
      const componentDir = await setupTestComponents();
      
      // Create old format meta.json
      const oldFormatMeta = {
        name: 'old-format',
        version: '1.0.0',
        // Missing required fields that newer versions expect
        components: [
          {
            name: 'Button',
            // Missing detailed prop structure
            props: ['variant', 'size', 'disabled']
          }
        ]
      };
      
      const oldMetaPath = path.join(testDir, 'old-meta.json');
      await fs.writeFile(oldMetaPath, JSON.stringify(oldFormatMeta, null, 2));
      
      try {
        const { stdout } = await execAsync(
          `node "${cliPath}" extract "${componentDir}" --meta "${oldMetaPath}" --out "${testDir}/migrated.json" --json`
        );
        
        const result = JSON.parse(stdout.trim());
        
        // Should either migrate or warn about format changes
        if (result.warnings) {
          expect(result.warnings.some(w => w.includes('format') || w.includes('migration'))).toBe(true);
        }
        
        // Should still produce valid output
        expect(result.success).toBe(true);
        
        const registry = JSON.parse(await fs.readFile(result.registryPath, 'utf-8'));
        const button = registry.components.find(c => c.name === 'Button');
        
        // Should have upgraded prop structure
        expect(typeof button.props).toBe('object');
        expect(button.props.variant).toBeDefined();
        expect(button.props.variant.type).toBeDefined();
      } catch (error) {
        // Also acceptable - should fail gracefully with clear error
        const output = error.stdout || error.stderr || '';
        expect(output.toLowerCase()).toMatch(/format|version|migration|incompatible/);
      }
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain extraction speed for large component sets', async () => {
      // Create large set of components
      const largeComponentDir = path.join(testDir, 'large-components');
      await fs.mkdir(largeComponentDir, { recursive: true });
      
      for (let i = 0; i < 50; i++) {
        const component = `
          interface Component${i}Props {
            prop1?: string;
            prop2?: number;
            prop3?: boolean;
            variant?: 'a' | 'b' | 'c';
          }
          
          export const Component${i} = ({ prop1, prop2, prop3, variant = 'a' }: Component${i}Props) => {
            return <div className={\`component-\${i} variant-\${variant}\`}>Component {${i}}</div>;
          };
        `;
        
        await fs.writeFile(path.join(largeComponentDir, `Component${i}.tsx`), component);
      }
      
      const startTime = Date.now();
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${largeComponentDir}" --out "${testDir}/large-extract.json" --json`
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(50);
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(15000); // 15 seconds
      
      console.log(`Large extraction completed in ${duration}ms`);
    }, 20000); // Extend Jest timeout for this test

    it('should maintain mutation performance', async () => {
      const registry = {
        name: 'performance-test',
        version: '1.0.0',
        components: Array.from({ length: 20 }, (_, i) => ({
          name: `Component${i}`,
          props: {
            prop1: { type: 'string' },
            prop2: { type: 'number' },
            prop3: { type: 'boolean' }
          }
        }))
      };
      
      const registryPath = path.join(testDir, 'perf-registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Create large mutation patch
      const largeMutation = Array.from({ length: 100 }, (_, i) => ({
        op: 'add',
        path: `/components/${i % 20}/props/newProp${i}`,
        value: { type: 'string', optional: true }
      }));
      
      const mutationPath = path.join(testDir, 'large-mutation.json');
      const outputPath = path.join(testDir, 'perf-output.json');
      
      await fs.writeFile(mutationPath, JSON.stringify(largeMutation, null, 2));
      
      const startTime = Date.now();
      
      const { stdout } = await execAsync(
        `node "${cliPath}" mutate "${registryPath}" "${mutationPath}" "${outputPath}" --json`
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const result = JSON.parse(stdout);
      expect(result.success).toBe(true);
      expect(result.mutations).toBe(100);
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      console.log(`Large mutation completed in ${duration}ms`);
    });

    it('should maintain validation speed', async () => {
      const largeRegistry = {
        name: 'validation-perf-test',
        version: '1.0.0',
        components: Array.from({ length: 100 }, (_, i) => ({
          name: `ValidateComponent${i}`,
          props: Object.fromEntries(
            Array.from({ length: 10 }, (_, j) => [
              `prop${j}`,
              {
                type: j % 3 === 0 ? 'string' : j % 3 === 1 ? 'number' : 'boolean',
                optional: j % 2 === 0,
                default: j % 3 === 0 ? 'default' : j % 3 === 1 ? 42 : true
              }
            ])
          ),
          examples: Array.from({ length: 5 }, (_, k) => `<ValidateComponent${i} prop${k}="value" />`)
        }))
      };
      
      const registryPath = path.join(testDir, 'validation-perf.json');
      await fs.writeFile(registryPath, JSON.stringify(largeRegistry, null, 2));
      
      const startTime = Date.now();
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --json`
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.componentsValidated).toBe(100);
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
      
      console.log(`Large validation completed in ${duration}ms`);
    });
  });
});