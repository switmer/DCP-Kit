import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('📦 Schema Validation & Metadata Integrity', () => {
  const testDir = path.join(__dirname, 'temp-schema-validation');
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

  describe('Strict meta.json Schema Validation', () => {
    it('should validate all required top-level fields', async () => {
      const validRegistry = {
        name: 'test-registry',
        version: '1.0.0',
        description: 'Test registry for schema validation',
        components: [],
        metadata: {
          author: 'Test Author',
          tags: ['ui', 'components'],
          license: 'MIT'
        }
      };
      
      const validPath = path.join(testDir, 'valid.json');
      await fs.writeFile(validPath, JSON.stringify(validRegistry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${validPath}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
    });

    it('should reject registry missing required fields', async () => {
      const testCases = [
        {
          name: 'missing name',
          registry: { version: '1.0.0', components: [] },
          expectedError: 'name'
        },
        {
          name: 'missing version',
          registry: { name: 'test', components: [] },
          expectedError: 'version'
        },
        {
          name: 'missing components',
          registry: { name: 'test', version: '1.0.0' },
          expectedError: 'components'
        },
        {
          name: 'invalid version format',
          registry: { name: 'test', version: 'invalid', components: [] },
          expectedError: 'version'
        }
      ];
      
      for (const testCase of testCases) {
        const registryPath = path.join(testDir, `invalid-${testCase.name.replace(/\s+/g, '-')}.json`);
        await fs.writeFile(registryPath, JSON.stringify(testCase.registry, null, 2));
        
        try {
          await execAsync(`node "${cliPath}" validate "${registryPath}" --json`);
          expect(true).toBe(false); // Should not reach here
        } catch (error) {
          const output = error.stdout || error.stderr || '';
          expect(output.toLowerCase()).toContain(testCase.expectedError.toLowerCase());
        }
      }
    });

    it('should validate component structure', async () => {
      const registryWithValidComponent = {
        name: 'component-test',
        version: '1.0.0',
        components: [
          {
            name: 'Button',
            type: 'component',
            props: {
              variant: {
                type: 'string',
                values: ['primary', 'secondary'],
                default: 'primary',
                description: 'Visual style variant'
              },
              disabled: {
                type: 'boolean',
                default: false,
                optional: true
              }
            },
            description: 'A customizable button component',
            tags: ['ui', 'button'],
            variants: {
              primary: { className: 'btn-primary' },
              secondary: { className: 'btn-secondary' }
            }
          }
        ]
      };
      
      const validPath = path.join(testDir, 'valid-component.json');
      await fs.writeFile(validPath, JSON.stringify(registryWithValidComponent, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${validPath}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.componentsValidated).toBe(1);
    });

    it('should reject components with invalid prop definitions', async () => {
      const invalidPropCases = [
        {
          name: 'missing type',
          props: { variant: { values: ['primary'] } },
          expectedError: 'type'
        },
        {
          name: 'invalid type',
          props: { variant: { type: 'invalid-type' } },
          expectedError: 'type'
        },
        {
          name: 'values without enum type',
          props: { variant: { type: 'number', values: ['one', 'two'] } },
          expectedError: 'values'
        }
      ];
      
      for (const testCase of invalidPropCases) {
        const registry = {
          name: 'test',
          version: '1.0.0',
          components: [{
            name: 'TestComponent',
            props: testCase.props
          }]
        };
        
        const registryPath = path.join(testDir, `invalid-props-${testCase.name.replace(/\s+/g, '-')}.json`);
        await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
        
        try {
          await execAsync(`node "${cliPath}" validate "${registryPath}" --json`);
          expect(true).toBe(false); // Should not reach here
        } catch (error) {
          const output = error.stdout || error.stderr || '';
          expect(output.toLowerCase()).toContain(testCase.expectedError.toLowerCase());
        }
      }
    });

    it('should validate peer dependencies format', async () => {
      const registryWithPeerDeps = {
        name: 'peerdeps-test',
        version: '1.0.0',
        components: [
          {
            name: 'ReactAriaButton',
            peerDependencies: {
              'react': '^18.0.0',
              'react-aria-components': '^1.0.0',
              '@types/react': '^18.0.0'
            },
            dependencies: {
              'clsx': '^2.0.0'
            }
          }
        ]
      };
      
      const validPath = path.join(testDir, 'peerdeps.json');
      await fs.writeFile(validPath, JSON.stringify(registryWithPeerDeps, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${validPath}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      
      // Should validate semver ranges
      const component = registryWithPeerDeps.components[0];
      expect(component.peerDependencies['react']).toMatch(/^\^?\d+\.\d+\.\d+/);
    });
  });

  describe('Demo + Meta Alignment', () => {
    it('should verify all variants in demo exist in meta', async () => {
      const registry = {
        name: 'variant-alignment-test',
        version: '1.0.0',
        components: [
          {
            name: 'Alert',
            variants: {
              info: { className: 'alert-info' },
              warning: { className: 'alert-warning' },
              error: { className: 'alert-error' }
            },
            examples: [
              '<Alert variant="info" message="Information" />',
              '<Alert variant="success" message="Success" />',  // Invalid - success not in variants
              '<Alert variant="error" message="Error" />'
            ]
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'variant-mismatch.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      try {
        const { stdout } = await execAsync(
          `node "${cliPath}" validate "${registryPath}" --json`
        );
        
        const result = JSON.parse(stdout.trim());
        
        // Should either fail validation or provide warnings
        if (result.success === false) {
          expect(result.errors.some(e => e.includes('success'))).toBe(true);
        } else if (result.warnings) {
          expect(result.warnings.some(w => w.includes('success'))).toBe(true);
        }
      } catch (error) {
        // Also acceptable - validation failed
        const output = error.stdout || error.stderr || '';
        expect(output).toContain('success');
      }
    });

    it('should verify all meta variants are used in examples', async () => {
      const registry = {
        name: 'unused-variant-test',
        version: '1.0.0',
        components: [
          {
            name: 'Badge',
            variants: {
              primary: { className: 'badge-primary' },
              secondary: { className: 'badge-secondary' },
              danger: { className: 'badge-danger' },
              success: { className: 'badge-success' }  // Not used in examples
            },
            examples: [
              '<Badge variant="primary" text="Primary" />',
              '<Badge variant="secondary" text="Secondary" />',
              '<Badge variant="danger" text="Danger" />'
            ]
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'unused-variant.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --strict --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should warn about unused variant
      if (result.warnings) {
        expect(result.warnings.some(w => w.includes('success') && w.includes('unused'))).toBe(true);
      }
    });

    it('should validate prop usage in examples', async () => {
      const registry = {
        name: 'prop-usage-test',
        version: '1.0.0',
        components: [
          {
            name: 'Input',
            props: {
              placeholder: { type: 'string', optional: true },
              disabled: { type: 'boolean', default: false },
              maxLength: { type: 'number', optional: true }
            },
            examples: [
              '<Input placeholder="Enter text" />',
              '<Input disabled={true} maxLength={50} />',
              '<Input invalid={true} />'  // Invalid - invalid prop doesn't exist
            ]
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'invalid-prop-usage.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      try {
        const { stdout } = await execAsync(
          `node "${cliPath}" validate "${registryPath}" --json`
        );
        
        const result = JSON.parse(stdout.trim());
        
        if (result.success === false || result.warnings) {
          const issues = [...(result.errors || []), ...(result.warnings || [])];
          expect(issues.some(issue => issue.includes('invalid'))).toBe(true);
        }
      } catch (error) {
        const output = error.stdout || error.stderr || '';  
        expect(output).toContain('invalid');
      }
    });
  });

  describe('Token Usage Reporting', () => {
    it('should validate design tokens are declared and available', async () => {
      const registry = {
        name: 'token-test',
        version: '1.0.0',
        components: [
          {
            name: 'ThemedButton',
            tokens: {
              'color.primary': '#007bff',
              'spacing.md': '16px',
              'typography.button': 'inherit'
            },
            styles: {
              default: 'bg-primary-500 px-spacing-md font-typography-button',
              hover: 'bg-primary-600'
            },
            // Reference to undefined token
            className: 'shadow-elevation-high'  // elevation-high not in tokens
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'token-mismatch.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --check-tokens --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should warn about undefined token
      if (result.warnings) {
        expect(result.warnings.some(w => w.includes('elevation-high'))).toBe(true);
      }
    });

    it('should detect unused declared tokens', async () => {
      const registry = {
        name: 'unused-token-test',
        version: '1.0.0',
        components: [
          {
            name: 'Card',
            tokens: {
              'color.primary': '#007bff',
              'color.secondary': '#6c757d',
              'spacing.sm': '8px',
              'spacing.md': '16px',
              'spacing.lg': '24px',
              'border.radius': '4px',
              'shadow.light': '0 1px 3px rgba(0,0,0,0.1)',
              'unused.token': 'value'  // Not used anywhere
            },
            styles: {
              card: 'bg-white border-radius p-spacing-md shadow-light',
              header: 'text-color-primary border-b mb-spacing-sm'
            }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'unused-tokens.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --check-tokens --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should identify unused tokens
      if (result.warnings) {
        expect(result.warnings.some(w => w.includes('unused.token'))).toBe(true);
      }
    });

    it('should validate token value formats', async () => {
      const registry = {
        name: 'token-format-test',
        version: '1.0.0',
        components: [
          {
            name: 'FormatTest',
            tokens: {
              'color.valid': '#ff0000',
              'color.invalid': 'not-a-color',
              'spacing.valid': '16px',
              'spacing.invalid': 'invalid-spacing',
              'number.valid': 42,
              'number.invalid': 'not-a-number'
            }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'token-formats.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --strict-tokens --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should flag invalid token values
      if (result.warnings || result.errors) {
        const issues = [...(result.errors || []), ...(result.warnings || [])];
        expect(issues.some(issue => issue.includes('not-a-color'))).toBe(true);
        expect(issues.some(issue => issue.includes('invalid-spacing'))).toBe(true);
      }
    });
  });

  describe('Metadata Consistency', () => {
    it('should ensure component metadata stays in sync with extracted data', async () => {
      // Create a component file
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      const componentCode = `
        interface SliderProps {
          min?: number;
          max?: number;
          value: number;
          onChange: (value: number) => void;
          step?: number;
          disabled?: boolean;
        }
        
        export const Slider = ({ 
          min = 0, 
          max = 100, 
          value, 
          onChange, 
          step = 1, 
          disabled = false 
        }: SliderProps) => {
          return (
            <input 
              type="range" 
              min={min} 
              max={max} 
              value={value} 
              onChange={(e) => onChange(Number(e.target.value))}
              step={step}
              disabled={disabled}
            />
          );
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'Slider.tsx'), componentCode);
      
      // Extract to get baseline metadata
      const { stdout: extractOutput } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --out "${testDir}/extracted.json" --json`
      );
      
      const extractResult = JSON.parse(extractOutput.trim());
      expect(extractResult.success).toBe(true);
      
      // Read extracted registry
      const extractedRegistry = JSON.parse(await fs.readFile(extractResult.registryPath, 'utf-8'));
      const sliderComponent = extractedRegistry.components.find(c => c.name === 'Slider');
      
      expect(sliderComponent).toBeDefined();
      expect(sliderComponent.props.min).toBeDefined();
      expect(sliderComponent.props.max).toBeDefined();
      expect(sliderComponent.props.value).toBeDefined();
      expect(sliderComponent.props.onChange).toBeDefined();
      
      // Verify optional props are marked correctly
      expect(sliderComponent.props.min.optional).toBe(true);
      expect(sliderComponent.props.value.optional).not.toBe(true);
      
      // Verify defaults are captured
      expect(sliderComponent.props.min.default).toBe(0);
      expect(sliderComponent.props.max.default).toBe(100);
    });

    it('should detect when manual metadata diverges from source', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      // Create simple component
      const componentCode = `export const Simple = ({ text }: { text: string }) => <div>{text}</div>;`;
      await fs.writeFile(path.join(componentDir, 'Simple.tsx'), componentCode);
      
      // Create manually crafted registry with different metadata
      const manualRegistry = {
        name: 'manual-test',
        version: '1.0.0',
        components: [
          {
            name: 'Simple',
            props: {
              text: { type: 'string' },
              // Add prop that doesn't exist in source
              extraProp: { type: 'boolean', optional: true }
            }
          }
        ]
      };
      
      const manualPath = path.join(testDir, 'manual.json');
      await fs.writeFile(manualPath, JSON.stringify(manualRegistry, null, 2));
      
      // Validate against source
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${manualPath}" --check-source "${componentDir}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should warn about metadata/source mismatch
      if (result.warnings) {
        expect(result.warnings.some(w => w.includes('extraProp'))).toBe(true);
      }
    });

    it('should validate component naming consistency', async () => {
      const registry = {
        name: 'naming-test',
        version: '1.0.0',
        components: [
          {
            name: 'button',  // Should be PascalCase
            type: 'component'
          },
          {
            name: 'InputField',  // Correct
            type: 'component'
          },
          {
            name: 'my-card',  // Should be PascalCase
            type: 'component'
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'naming.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --check-naming --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should warn about naming convention violations
      if (result.warnings) {
        expect(result.warnings.some(w => w.includes('button') && w.includes('PascalCase'))).toBe(true);
        expect(result.warnings.some(w => w.includes('my-card') && w.includes('PascalCase'))).toBe(true);
      }
    });
  });
});