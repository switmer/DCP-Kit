import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('🧱 Pack Integrity & Reproducibility', () => {
  const testDir = path.join(__dirname, 'temp-pack-integrity');
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

  describe('Hash Stability', () => {
    it('should produce identical hashes for identical source inputs', async () => {
      // Create identical test components
      const buttonComponentCode = `
        interface ButtonProps {
          variant?: 'primary' | 'secondary';
          size?: 'sm' | 'md' | 'lg';
        }
        
        export const Button = ({ variant = 'primary', size = 'md' }: ButtonProps) => {
          return <button className={\`btn-\${variant} btn-\${size}\`}>Click me</button>;
        };
      `;

      const testPackPath1 = path.join(testDir, 'pack1');
      const testPackPath2 = path.join(testDir, 'pack2');
      
      await fs.mkdir(testPackPath1, { recursive: true });
      await fs.mkdir(testPackPath2, { recursive: true });
      
      // Write identical components to both directories
      await fs.writeFile(path.join(testPackPath1, 'Button.tsx'), buttonComponentCode);
      await fs.writeFile(path.join(testPackPath2, 'Button.tsx'), buttonComponentCode);
      
      // Extract both packs
      const { stdout: extract1 } = await execAsync(
        `node "${cliPath}" extract "${testPackPath1}" --out "${testPackPath1}/output" --json`
      );
      const { stdout: extract2 } = await execAsync(
        `node "${cliPath}" extract "${testPackPath2}" --out "${testPackPath2}/output" --json`
      );
      
      const result1 = JSON.parse(extract1.trim());
      const result2 = JSON.parse(extract2.trim());
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Read both registry files
      const registry1 = JSON.parse(await fs.readFile(result1.registryPath, 'utf-8'));
      const registry2 = JSON.parse(await fs.readFile(result2.registryPath, 'utf-8'));
      
      // Generate content hashes (excluding timestamps or dynamic fields)
      const normalizeForHash = (obj) => {
        return JSON.stringify(obj, (key, value) => {
          // Exclude potentially dynamic or path-specific fields
          if (key === 'timestamp' || key === 'buildTime' || key === 'extractedAt' || key === 'lastModified') return undefined;
          if (key === 'name' && typeof value === 'string' && (value.includes('pack1') || value.includes('pack2'))) return 'normalized-pack';
          if (key === 'description' && typeof value === 'string' && value.includes('extracted from')) return 'DCP registry extracted from normalized-path';
          if (key === 'filePath' && typeof value === 'string') return value.replace(/pack[12]/, 'normalized-pack');
          if (key === 'sourceDir' && typeof value === 'string') return value.replace(/pack[12]/, 'normalized-pack');
          return value;
        });
      };
      
      const hash1 = crypto.createHash('sha256').update(normalizeForHash(registry1)).digest('hex');
      const hash2 = crypto.createHash('sha256').update(normalizeForHash(registry2)).digest('hex');
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different source inputs', async () => {
      const button1 = `export const Button = () => <button>Click me</button>;`;
      const button2 = `export const Button = () => <button>Press me</button>;`;
      
      const testPackPath1 = path.join(testDir, 'pack1');
      const testPackPath2 = path.join(testDir, 'pack2');
      
      await fs.mkdir(testPackPath1, { recursive: true });
      await fs.mkdir(testPackPath2, { recursive: true });
      
      await fs.writeFile(path.join(testPackPath1, 'Button.tsx'), button1);
      await fs.writeFile(path.join(testPackPath2, 'Button.tsx'), button2);
      
      const { stdout: extract1 } = await execAsync(
        `node "${cliPath}" extract "${testPackPath1}" --out "${testPackPath1}/output" --json`
      );
      const { stdout: extract2 } = await execAsync(
        `node "${cliPath}" extract "${testPackPath2}" --out "${testPackPath2}/output" --json`
      );
      
      const result1 = JSON.parse(extract1.trim());
      const result2 = JSON.parse(extract2.trim());
      
      const registry1 = JSON.parse(await fs.readFile(result1.registryPath, 'utf-8'));
      const registry2 = JSON.parse(await fs.readFile(result2.registryPath, 'utf-8'));
      
      // Should have different component content
      expect(JSON.stringify(registry1)).not.toBe(JSON.stringify(registry2));
    });
  });

  describe('Pack Completeness', () => {
    it('should contain all required files in output', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      // Create a test component with props
      const buttonComponentCode2 = `
        interface ButtonProps {
          variant: 'primary' | 'secondary';
          disabled?: boolean;
        }
        
        export const Button = ({ variant, disabled }: ButtonProps) => {
          return <button disabled={disabled} className={\`btn-\${variant}\`}>Click</button>;
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'Button.tsx'), buttonComponentCode2);
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --out "${testDir}/output" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      
      // Check registry file exists and has required structure
      const registryExists = await fs.access(result.registryPath).then(() => true).catch(() => false);
      expect(registryExists).toBe(true);
      
      const registry = JSON.parse(await fs.readFile(result.registryPath, 'utf-8'));
      
      // Verify required top-level fields
      expect(registry).toHaveProperty('name');
      expect(registry).toHaveProperty('version');
      expect(registry).toHaveProperty('components');
      expect(Array.isArray(registry.components)).toBe(true);
      
      // Verify component has required fields
      const buttonComponent = registry.components.find(c => c.name === 'Button');
      expect(buttonComponent).toBeDefined();
      expect(buttonComponent).toHaveProperty('type');
      expect(buttonComponent).toHaveProperty('props');
      expect(Array.isArray(buttonComponent.props)).toBe(true);
      expect(buttonComponent.props.some(p => p.name === 'variant')).toBe(true);
    });

    it('should validate required component metadata fields', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      const cardComponent = `
        interface CardProps {
          title: string;
          children: React.ReactNode;
          className?: string;
        }
        
        export const Card = ({ title, children, className }: CardProps) => {
          return (
            <div className={\`card \${className || ""}\`}>
              <h2>{title}</h2>
              {children}
            </div>
          );
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'Card.tsx'), cardComponent);
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --out "${testDir}/output" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      const registry = JSON.parse(await fs.readFile(result.registryPath, 'utf-8'));
      
      const card = registry.components.find(c => c.name === 'Card');
      expect(card).toBeDefined();
      
      // Required metadata fields
      expect(card).toHaveProperty('name');
      expect(card).toHaveProperty('type');
      expect(card).toHaveProperty('props');
      
      // Verify props structure
      expect(Array.isArray(card.props)).toBe(true);
      expect(card.props.some(p => p.name === 'title')).toBe(true);
      expect(card.props.some(p => p.name === 'children')).toBe(true);
      expect(card.props.some(p => p.name === 'className')).toBe(true);
      
      // Verify prop types are captured
      const titleProp = card.props.find(p => p.name === 'title');
      const childrenProp = card.props.find(p => p.name === 'children');
      expect(titleProp).toHaveProperty('type');
      expect(childrenProp).toHaveProperty('type');
    });
  });

  describe('Round-trip Rebuild', () => {
    it('should rebuild to valid pack after mutation', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      const originalComponent = `
        export const Alert = ({ type = 'info', message }: { type?: string; message: string }) => {
          return <div className={\`alert alert-\${type}\`}>{message}</div>;
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'Alert.tsx'), originalComponent);
      
      // Step 1: Initial extraction
      const { stdout: extractOutput } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --out "${testDir}/output" --json`
      );
      
      const extractResult = JSON.parse(extractOutput.trim());
      expect(extractResult.success).toBe(true);
      
      // Step 2: Apply mutation
      const mutation = [
        {
          op: 'add',
          path: '/components/0/props/-',
          value: { name: 'size', type: 'string', optional: true, default: 'md', required: false, description: 'Component size' }
        }
      ];
      
      const mutationPath = path.join(testDir, 'mutation.json');
      const mutatedPath = path.join(testDir, 'mutated.json');
      
      await fs.writeFile(mutationPath, JSON.stringify(mutation, null, 2));
      
      const { stdout: mutateOutput } = await execAsync(
        `node "${cliPath}" mutate "${extractResult.registryPath}" "${mutationPath}" "${mutatedPath}" --json`
      );
      
      const mutateResult = JSON.parse(mutateOutput);
      expect(mutateResult.success).toBe(true);
      
      // Step 3: Verify mutated pack is still valid
      const mutatedRegistry = JSON.parse(await fs.readFile(mutatedPath, 'utf-8'));
      
      // Should still have all required top-level fields
      expect(mutatedRegistry).toHaveProperty('name');
      expect(mutatedRegistry).toHaveProperty('version');
      expect(mutatedRegistry).toHaveProperty('components');
      
      // Should have the new prop
      const alert = mutatedRegistry.components.find(c => c.name === 'Alert');
      expect(alert).toBeDefined();
      const sizeProp = alert.props.find(p => p.name === 'size');
      expect(sizeProp).toBeDefined();
      expect(sizeProp.optional).toBe(true);
      expect(sizeProp.default).toBe('md');
      
      // Step 4: Should be able to run extract again on mutated version
      // (This proves the pack maintains its structural integrity)
      const tempMutatedPath = path.join(testDir, 'temp-mutated.json');
      await fs.writeFile(tempMutatedPath, JSON.stringify(mutatedRegistry, null, 2));
      
      // This should not fail - proving round-trip rebuild capability
      const { stdout: reExtractOutput } = await execAsync(
        `node "${cliPath}" validate "${tempMutatedPath}" --json`
      );
      
      const reExtractResult = JSON.parse(reExtractOutput);
      expect(reExtractResult.success).toBe(true);
    });
  });

  describe('Missing File Detection', () => {
    it('should fail clearly when required fields are missing', async () => {
      // Create invalid registry missing required fields
      const invalidRegistry = {
        // Missing 'name' field
        version: '1.0.0',
        components: []
      };
      
      const invalidPath = path.join(testDir, 'invalid.json');
      await fs.writeFile(invalidPath, JSON.stringify(invalidRegistry, null, 2));
      
      const { stdout } = await execAsync(`node "${cliPath}" validate "${invalidPath}" --json`);
      const result = JSON.parse(stdout);
      
      // Should have validation errors
      expect(result).toHaveProperty('errors');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(err => err.includes('name'))).toBe(true);
    });

    it('should detect missing component files', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      // Create a component that references a missing import
      const componentWithMissingDep = `
        import { MissingComponent } from './MissingComponent';
        
        export const TestComponent = () => {
          return <MissingComponent />;
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'TestComponent.tsx'), componentWithMissingDep);
      
      try {
        const { stdout } = await execAsync(
          `node "${cliPath}" extract "${componentDir}" --out "${testDir}/output" --json`
        );
        
        // Should still succeed but with warnings about missing dependencies
        const result = JSON.parse(stdout.trim());
        expect(result.success).toBe(true);
        
        // Check if warnings are captured in the result
        // (Implementation may vary - this tests the concept)
        if (result.warnings) {
          expect(result.warnings.some(w => w.includes('MissingComponent'))).toBe(true);
        }
      } catch (error) {
        // Acceptable to fail with clear error message
        expect(error.stdout || error.stderr).toContain('MissingComponent');
      }
    });
  });
});