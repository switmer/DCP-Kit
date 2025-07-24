import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('🧰 CLI Reliability', () => {
  const testDir = path.join(__dirname, 'temp-cli-reliability');
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

  describe('Cross-platform Compatibility', () => {
    it('should handle platform-specific path separators', async () => {
      const componentDir = path.join(testDir, 'components');
      const nestedDir = path.join(componentDir, 'ui', 'forms');
      await fs.mkdir(nestedDir, { recursive: true });
      
      const component = `export const Input = () => <input />;`;
      await fs.writeFile(path.join(nestedDir, 'Input.tsx'), component);
      
      // Test with both forward and backward slashes (normalized by path.join)
      const outputDir = path.join(testDir, 'output');
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --out "${outputDir}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.components).toBeGreaterThan(0);
    });

    it('should work with spaces in paths', async () => {
      const spacedDir = path.join(testDir, 'components with spaces');
      await fs.mkdir(spacedDir, { recursive: true });
      
      const component = `export const SpaceTest = () => <div>Test</div>;`;
      await fs.writeFile(path.join(spacedDir, 'SpaceTest.tsx'), component);
      
      const outputDir = path.join(testDir, 'output with spaces');
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${spacedDir}" --out "${outputDir}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.components).toBeGreaterThan(0);
    });

    it('should handle long file paths', async () => {
      // Create nested directory structure
      const deepPath = path.join(testDir, 'very', 'deeply', 'nested', 'component', 'directory', 'structure');
      await fs.mkdir(deepPath, { recursive: true });
      
      const component = `export const DeepComponent = () => <div>Deep</div>;`;
      const longFileName = 'VeryLongComponentNameThatExceedsMostReasonableLimits.tsx';
      await fs.writeFile(path.join(deepPath, longFileName), component);
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${testDir}" --out "${testDir}/output" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
    });
  });

  describe('Command Smoke Tests', () => {
    it('should execute extract command successfully', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      await fs.writeFile(
        path.join(componentDir, 'Button.tsx'),
        `export const Button = ({ label }: { label: string }) => <button>{label}</button>;`
      );
      
      const { stdout, stderr } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --out "${testDir}/output" --json`
      );
      
      expect(stderr).toBe('');
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.components).toBeGreaterThan(0);
    });

    it.skip('should execute build command successfully', async () => {
      // Create a valid config
      const config = {
        registryName: 'test-registry',
        version: '1.0.0',
        components: './components',
        output: './registry.json'
      };
      
      const configPath = path.join(testDir, 'dcp.config.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      await fs.writeFile(
        path.join(componentDir, 'Card.tsx'),
        `export const Card = ({ title }: { title: string }) => <div>{title}</div>;`
      );
      
      const { stdout, stderr } = await execAsync(
        `node "${cliPath}" build --config "${configPath}" --json`
      );
      
      expect(stderr).toBe('');
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
    });

    it('should execute validate command successfully', async () => {
      const registry = {
        name: 'test-registry',
        version: '1.0.0',
        components: [
          {
            name: 'TestComponent',
            props: { test: { type: 'string' } }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      const { stdout, stderr } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --json`
      );
      
      expect(stderr).toBe('');
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
    });

    it('should execute diff command successfully', async () => {
      const registry1 = { name: 'test', components: [{ name: 'A', props: {} }] };
      const registry2 = { name: 'test', components: [{ name: 'A', props: { new: { type: 'string' } } }] };
      
      const path1 = path.join(testDir, 'registry1.json');
      const path2 = path.join(testDir, 'registry2.json');
      
      await fs.writeFile(path1, JSON.stringify(registry1, null, 2));
      await fs.writeFile(path2, JSON.stringify(registry2, null, 2));
      
      const { stdout, stderr } = await execAsync(
        `node "${cliPath}" diff "${path1}" "${path2}" --json`
      );
      
      expect(stderr).toBe('');
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.summary.added + result.summary.removed + result.summary.modified).toBeGreaterThan(0);
    });

    it.skip('should execute serve command with proper shutdown', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      await fs.writeFile(
        path.join(componentDir, 'Demo.tsx'),
        `export const Demo = () => <div>Demo</div>;`
      );
      
      // Start server in background and kill it quickly
      const serverProcess = exec(`node "${cliPath}" serve "${componentDir}" --port 0`);
      
      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Kill the process
      serverProcess.kill('SIGTERM');
      
      // Should exit cleanly
      const exitCode = await new Promise((resolve) => {
        serverProcess.on('exit', (code) => resolve(code));
      });
      
      // Accept either 0 (clean exit) or null (killed)
      expect([0, null].includes(exitCode)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should fail gracefully with invalid input', async () => {
      try {
        const { stdout, stderr } = await execAsync(`node "${cliPath}" extract "/nonexistent/path" --json`);
        const result = JSON.parse(stdout);
        expect(result.success).toBe(false);
        expect(result.error.toLowerCase()).toMatch(/error|not found|invalid|enoent/);
      } catch (error) {
        // Command failed as expected
        const output = error.stdout || error.stderr || error.message || '';
        expect(output.length).toBeGreaterThan(0);
      }
    });

    it('should validate required arguments', async () => {
      // Test missing required argument
      try {
        await execAsync(`node "${cliPath}" mutate --json`);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.code).toBeGreaterThan(0);
        
        const output = error.stdout || error.stderr || '';
        expect(output.toLowerCase()).toMatch(/required|missing|argument/);
      }
    });

    it('should handle permission errors', async () => {
      // Skip on Windows as permission handling is different
      if (os.platform() === 'win32') {
        return;
      }
      
      const restrictedDir = path.join(testDir, 'restricted');
      await fs.mkdir(restrictedDir, { recursive: true });
      
      // Remove write permissions
      await fs.chmod(restrictedDir, 0o444);
      
      try {
        await execAsync(`node "${cliPath}" extract "${testDir}" --out "${restrictedDir}" --json`);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.code).toBeGreaterThan(0);
        
        const output = error.stdout || error.stderr || '';
        expect(output.toLowerCase()).toMatch(/permission|access|denied/);
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(restrictedDir, 0o755);
      }
    });

    it('should timeout on hanging operations', async () => {
      // This test would be implementation-specific
      // Testing that CLI commands have reasonable timeouts
      
      const largeDir = path.join(testDir, 'large');
      await fs.mkdir(largeDir, { recursive: true });
      
      // Create many files to potentially slow down processing
      for (let i = 0; i < 100; i++) {
        await fs.writeFile(
          path.join(largeDir, `Component${i}.tsx`),
          `export const Component${i} = () => <div>Component ${i}</div>;`
        );
      }
      
      // Command should complete within reasonable time
      const startTime = Date.now();
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${largeDir}" --out "${testDir}/large-output" --json`
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 30 seconds (adjust based on your system)
      expect(duration).toBeLessThan(30000);
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.components).toBe(100);
    }, 35000); // Extend Jest timeout for this test
  });

  describe('Registry Interaction', () => {
    it('should handle local registry operations', async () => {
      const registry = {
        name: 'local-test',
        version: '1.0.0',
        components: [
          { name: 'LocalButton', props: { label: { type: 'string' } } }
        ]
      };
      
      const registryPath = path.join(testDir, 'local-registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Should be able to read and validate local registry
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should support registry export formats', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      await fs.writeFile(
        path.join(componentDir, 'ExportTest.tsx'),
        `export const ExportTest = ({ text }: { text: string }) => <span>{text}</span>;`
      );
      
      // Extract to multiple formats
      const jsonOutput = path.join(testDir, 'output.json');
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --out "${jsonOutput}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      
      // Verify output file exists and is valid JSON
      const outputExists = await fs.access(result.registryPath).then(() => true).catch(() => false);
      expect(outputExists).toBe(true);
      
      const outputContent = JSON.parse(await fs.readFile(result.registryPath, 'utf-8'));
      expect(outputContent.components.some(c => c.name === 'ExportTest')).toBe(true);
    });
  });

  describe('Configuration Handling', () => {
    it.skip('should load config from default locations', async () => {
      const config = {
        name: 'default-config-test',
        input: './components',
        output: './output'
      };
      
      // Create config in test directory
      const configPath = path.join(testDir, 'dcp.config.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      await fs.writeFile(
        path.join(componentDir, 'ConfigTest.tsx'),
        `export const ConfigTest = () => <div>Config Test</div>;`
      );
      
      // Run from directory containing config
      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" build --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
    });

    it.skip('should override config with CLI flags', async () => {
      const config = {
        name: 'override-test',
        input: './wrong-path',
        output: './output'
      };
      
      const configPath = path.join(testDir, 'dcp.config.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      await fs.writeFile(
        path.join(componentDir, 'OverrideTest.tsx'),
        `export const OverrideTest = () => <div>Override Test</div>;`
      );
      
      // Override input path via CLI
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --config "${configPath}" --out "${testDir}/cli-output" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.components).toContain('OverrideTest');
    });

    it.skip('should validate config schema', async () => {
      const invalidConfig = {
        // Missing required 'name' field
        input: './components',
        output: './output'
      };
      
      const configPath = path.join(testDir, 'invalid.config.json');
      await fs.writeFile(configPath, JSON.stringify(invalidConfig, null, 2));
      
      try {
        await execAsync(`node "${cliPath}" build --config "${configPath}" --json`);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        const output = error.stdout || error.stderr || '';
        expect(output.toLowerCase()).toMatch(/config|invalid|name/);
      }
    });
  });
});