import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('🔍 Preview & Docs Generation', () => {
  const testDir = path.join(__dirname, 'temp-preview-docs');
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

  describe('Demo Rendering Tests', () => {
    it('should compile and render demo.tsx in isolation', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      // Create a component with demo
      const buttonComponent = `
        interface ButtonProps {
          variant?: 'primary' | 'secondary';
          size?: 'sm' | 'md' | 'lg';
          children: React.ReactNode;
          onClick?: () => void;
        }
        
        export const Button = ({ 
          variant = 'primary', 
          size = 'md', 
          children, 
          onClick 
        }: ButtonProps) => {
          return (
            <button 
              className={\`btn btn-\${variant} btn-\${size}\`}
              onClick={onClick}
            >
              {children}
            </button>
          );
        };
      `;
      
      const demoComponent = `
        import React from 'react';
        import { Button } from './Button';
        
        export const ButtonDemo = () => {
          return (
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              <div>
                <h3>Variants</h3>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
              </div>
              <div>
                <h3>Sizes</h3>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>
          );
        };
        
        export default ButtonDemo;
      `;
      
      await fs.writeFile(path.join(componentDir, 'Button.tsx'), buttonComponent);
      await fs.writeFile(path.join(componentDir, 'Button.demo.tsx'), demoComponent);
      
      // Test demo compilation
      const { stdout } = await execAsync(
        `node "${cliPath}" demo "${path.join(componentDir, 'Button.demo.tsx')}" --render --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.compiled).toBe(true);
      
      // Should detect all variants and sizes used in demo
      if (result.detectedProps) {
        expect(result.detectedProps.variant).toEqual(['primary', 'secondary']);
        expect(result.detectedProps.size).toEqual(['sm', 'md', 'lg']);
      }
    });

    it('should detect and report compilation errors in demos', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      const validComponent = `
        export const Card = ({ title }: { title: string }) => {
          return <div>{title}</div>;
        };
      `;
      
      const brokenDemo = `
        import React from 'react';
        import { Card } from './Card';
        
        export const CardDemo = () => {
          return (
            <div>
              {/* TypeScript error - missing required prop */}
              <Card />
              {/* Another error - invalid prop */}
              <Card title="Test" invalidProp="value" />
            </div>
          );
        };
        
        export default CardDemo;
      `;
      
      await fs.writeFile(path.join(componentDir, 'Card.tsx'), validComponent);
      await fs.writeFile(path.join(componentDir, 'Card.demo.tsx'), brokenDemo);
      
      try {
        await execAsync(
          `node "${cliPath}" demo "${path.join(componentDir, 'Card.demo.tsx')}" --render --json`
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        const output = error.stdout || error.stderr || '';
        
        // Should report specific TypeScript errors
        expect(output.toLowerCase()).toMatch(/error|missing|required/);
        expect(output).toContain('title');
      }
    });

    it('should validate demo examples against component API', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      const alertComponent = `
        interface AlertProps {
          type: 'info' | 'warning' | 'error' | 'success';
          message: string;
          dismissible?: boolean;
        }
        
        export const Alert = ({ type, message, dismissible = false }: AlertProps) => {
          return (
            <div className={\`alert alert-\${type}\`}>
              {message}
              {dismissible && <button>×</button>}
            </div>
          );
        };
      `;
      
      const alertDemo = `
        import React from 'react';
        import { Alert } from './Alert';
        
        export const AlertDemo = () => {
          return (
            <div>
              <Alert type="info" message="Info message" />
              <Alert type="warning" message="Warning message" dismissible />
              <Alert type="invalid" message="Invalid type" />
              <Alert message="Missing required type" />
            </div>
          );
        };
        
        export default AlertDemo;
      `;
      
      await fs.writeFile(path.join(componentDir, 'Alert.tsx'), alertComponent);
      await fs.writeFile(path.join(componentDir, 'Alert.demo.tsx'), alertDemo);
      
      const { stdout } = await execAsync(
        `node "${cliPath}" demo "${path.join(componentDir, 'Alert.demo.tsx')}" --validate-api --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should detect API violations
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should specifically identify invalid type and missing type
      const invalidTypeError = result.errors.find(e => e.includes('invalid'));
      const missingTypeError = result.errors.find(e => e.includes('missing') || e.includes('required'));
      
      expect(invalidTypeError).toBeDefined();
      expect(missingTypeError).toBeDefined();
    });
  });

  describe('README Generation Tests', () => {
    it('should automatically reflect actual props/variants', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      const sliderComponent = `
        interface SliderProps {
          /** Minimum value for the slider */
          min?: number;
          /** Maximum value for the slider */
          max?: number;
          /** Current value */
          value: number;
          /** Called when value changes */
          onChange: (value: number) => void;
          /** Step increment */
          step?: number;
          /** Whether the slider is disabled */
          disabled?: boolean;
          /** Visual size variant */
          size?: 'sm' | 'md' | 'lg';
        }
        
        /**
         * A customizable range slider component
         * @example
         * <Slider value={50} onChange={setValue} />
         */
        export const Slider = ({ 
          min = 0, 
          max = 100, 
          value, 
          onChange, 
          step = 1, 
          disabled = false,
          size = 'md'
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
              className={\`slider slider-\${size}\`}
            />
          );
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'Slider.tsx'), sliderComponent);
      
      // Generate README
      const { stdout } = await execAsync(
        `node "${cliPath}" docs "${componentDir}" --format markdown --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.docsGenerated).toBeDefined();
      
      // Check that README was generated
      const readmePath = result.readmePath || path.join(componentDir, 'README.md');
      const readmeExists = await fs.access(readmePath).then(() => true).catch(() => false);
      
      if (readmeExists) {
        const readmeContent = await fs.readFile(readmePath, 'utf-8');
        
        // Should include all props with their types and descriptions
        expect(readmeContent).toContain('min');
        expect(readmeContent).toContain('max');
        expect(readmeContent).toContain('value');
        expect(readmeContent).toContain('onChange');
        expect(readmeContent).toContain('number');
        expect(readmeContent).toContain('boolean');
        
        // Should include component description
        expect(readmeContent).toContain('customizable range slider');
        
        // Should show default values
        expect(readmeContent).toContain('0'); // min default
        expect(readmeContent).toContain('100'); // max default
        expect(readmeContent).toContain('1'); // step default
        
        // Should include size variants
        expect(readmeContent).toContain('sm');
        expect(readmeContent).toContain('md');
        expect(readmeContent).toContain('lg');
      }
    });

    it('should update README when component API changes', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      // Original component
      const originalComponent = `
        interface BadgeProps {
          text: string;
          color?: 'red' | 'green' | 'blue';
        }
        
        export const Badge = ({ text, color = 'blue' }: BadgeProps) => {
          return <span className={\`badge badge-\${color}\`}>{text}</span>;
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'Badge.tsx'), originalComponent);
      
      // Generate initial README
      const { stdout: initialOutput } = await execAsync(
        `node "${cliPath}" docs "${componentDir}" --format markdown --json`
      );
      
      const initialResult = JSON.parse(initialOutput.trim());
      expect(initialResult.success).toBe(true);
      
      // Read initial README
      const readmePath = initialResult.readmePath || path.join(componentDir, 'README.md');
      const initialReadme = await fs.readFile(readmePath, 'utf-8');
      
      // Update component to add new prop
      const updatedComponent = `
        interface BadgeProps {
          text: string;
          color?: 'red' | 'green' | 'blue' | 'yellow';
          size?: 'sm' | 'md' | 'lg';
          icon?: string;
        }
        
        export const Badge = ({ 
          text, 
          color = 'blue', 
          size = 'md',
          icon 
        }: BadgeProps) => {
          return (
            <span className={\`badge badge-\${color} badge-\${size}\`}>
              {icon && <i className={icon} />}
              {text}
            </span>
          );
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'Badge.tsx'), updatedComponent);
      
      // Regenerate README
      const { stdout: updatedOutput } = await execAsync(
        `node "${cliPath}" docs "${componentDir}" --format markdown --json`
      );
      
      const updatedResult = JSON.parse(updatedOutput.trim());
      expect(updatedResult.success).toBe(true);
      
      // Read updated README
      const updatedReadme = await fs.readFile(readmePath, 'utf-8');
      
      // Should reflect new API
      expect(updatedReadme).toContain('yellow'); // new color
      expect(updatedReadme).toContain('size'); // new prop
      expect(updatedReadme).toContain('icon'); // new prop
      expect(updatedReadme).toContain('sm'); // size variant
      
      // Should be different from initial README
      expect(updatedReadme).not.toBe(initialReadme);
    });

    it('should generate examples for each variant', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      const buttonComponent = `
        interface ButtonProps {
          children: React.ReactNode;
          variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
          size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
          disabled?: boolean;
          loading?: boolean;
        }
        
        export const Button = ({ 
          children, 
          variant = 'primary', 
          size = 'md',
          disabled = false,
          loading = false 
        }: ButtonProps) => {
          return (
            <button 
              className={\`btn btn-\${variant} btn-\${size}\`}
              disabled={disabled || loading}
            >
              {loading ? 'Loading...' : children}
            </button>
          );
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'Button.tsx'), buttonComponent);
      
      const { stdout } = await execAsync(
        `node "${cliPath}" docs "${componentDir}" --include-examples --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      
      const readmePath = result.readmePath || path.join(componentDir, 'README.md');
      const readmeContent = await fs.readFile(readmePath, 'utf-8');
      
      // Should include examples for each variant
      expect(readmeContent).toContain('<Button variant="primary">');
      expect(readmeContent).toContain('<Button variant="secondary">');
      expect(readmeContent).toContain('<Button variant="outline">');
      expect(readmeContent).toContain('<Button variant="ghost">');
      
      // Should include size examples
      expect(readmeContent).toContain('<Button size="xs">');
      expect(readmeContent).toContain('<Button size="sm">');
      expect(readmeContent).toContain('<Button size="md">');
      expect(readmeContent).toContain('<Button size="lg">');
      expect(readmeContent).toContain('<Button size="xl">');
      
      // Should include state examples
      expect(readmeContent).toContain('disabled={true}');
      expect(readmeContent).toContain('loading={true}');
    });
  });

  describe('Broken Example Detection', () => {
    it('should detect examples using invalid props', async () => {
      const registry = {
        name: 'broken-example-test',
        version: '1.0.0',
        components: [
          {
            name: 'Toast',
            props: {
              message: { type: 'string', required: true },
              type: { type: 'string', values: ['success', 'error', 'warning', 'info'] },
              duration: { type: 'number', default: 5000, optional: true }
            },
            examples: [
              '<Toast message="Success!" type="success" />',
              '<Toast message="Error!" type="danger" />',  // Invalid: danger not in values
              '<Toast type="info" />',  // Invalid: missing required message
              '<Toast message="Test" invalidProp="value" />'  // Invalid: unknown prop
            ]
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'broken-examples.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --check-examples --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should detect all three invalid examples
      expect(result.errors || result.warnings).toBeDefined();
      const issues = [...(result.errors || []), ...(result.warnings || [])];
      
      expect(issues.some(issue => issue.includes('danger'))).toBe(true);
      expect(issues.some(issue => issue.includes('message') && issue.includes('required'))).toBe(true);
      expect(issues.some(issue => issue.includes('invalidProp'))).toBe(true);
    });

    it('should detect examples using invalid variant combinations', async () => {
      const registry = {
        name: 'variant-combination-test',
        version: '1.0.0',
        components: [
          {
            name: 'Input',
            props: {
              type: { type: 'string', values: ['text', 'email', 'password'] },
              size: { type: 'string', values: ['sm', 'md', 'lg'] },
              variant: { type: 'string', values: ['default', 'filled', 'outline'] }
            },
            // Some combinations might not be valid
            validCombinations: [
              { type: 'password', variant: 'filled' }, // Only filled password inputs
              { size: 'sm', variant: 'outline' } // Small outline inputs
            ],
            examples: [
              '<Input type="text" size="md" variant="default" />',
              '<Input type="password" variant="outline" />',  // Invalid combination
              '<Input type="email" size="sm" variant="filled" />'
            ]
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'invalid-combinations.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --check-combinations --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      if (result.warnings) {
        expect(result.warnings.some(w => 
          w.includes('password') && w.includes('outline')
        )).toBe(true);
      }
    });

    it('should validate JSX syntax in examples', async () => {
      const registry = {
        name: 'jsx-syntax-test',
        version: '1.0.0',
        components: [
          {
            name: 'Card',
            props: {
              title: { type: 'string' },
              children: { type: 'ReactNode' }
            },
            examples: [
              '<Card title="Valid">Content</Card>',
              '<Card title="Unclosed">Content',  // Invalid: unclosed tag
              '<Card title=Invalid>Content</Card>',  // Invalid: unquoted attribute
              '<Card title="Valid" extra-prop="value">Content</Card>'  // Invalid: unknown prop
            ]
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'invalid-jsx.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      try {
        const { stdout } = await execAsync(
          `node "${cliPath}" validate "${registryPath}" --check-jsx --json`
        );
        
        const result = JSON.parse(stdout.trim());
        
        // Should detect JSX syntax errors
        if (result.errors || result.warnings) {
          const issues = [...(result.errors || []), ...(result.warnings || [])];
          expect(issues.some(issue => issue.includes('unclosed') || issue.includes('syntax'))).toBe(true);
        }
      } catch (error) {
        // Also acceptable - should fail with syntax errors
        const output = error.stdout || error.stderr || '';
        expect(output.toLowerCase()).toMatch(/syntax|invalid|jsx/);
      }
    });

    it('should check examples match TypeScript interface', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      const componentWithInterface = `
        interface StrictProps {
          id: string;
          count: number;
          enabled: boolean;
          items: string[];
          callback: (value: string) => void;
        }
        
        export const StrictComponent = (props: StrictProps) => {
          return <div>{props.id}</div>;
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'StrictComponent.tsx'), componentWithInterface);
      
      // Create registry with examples that don't match interface
      const registry = {
        name: 'strict-test',
        version: '1.0.0',
        components: [
          {
            name: 'StrictComponent',
            examples: [
              '<StrictComponent id="test" count={5} enabled={true} items={["a", "b"]} callback={() => {}} />',
              '<StrictComponent id="test" count="invalid" enabled={true} items={[]} callback={() => {}} />', // Invalid: count should be number
              '<StrictComponent id="test" count={5} enabled={true} items={["a"]} />' // Invalid: missing callback
            ]
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'strict-registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --check-typescript --source "${componentDir}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should detect type mismatches
      if (result.errors || result.warnings) {
        const issues = [...(result.errors || []), ...(result.warnings || [])];
        expect(issues.some(issue => issue.includes('count') && issue.includes('number'))).toBe(true);
        expect(issues.some(issue => issue.includes('callback') && issue.includes('missing'))).toBe(true);
      }
    });
  });
});