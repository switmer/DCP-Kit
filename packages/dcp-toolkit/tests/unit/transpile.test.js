import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { runTranspile } from '../../src/commands/transpile.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Transpile Module', () => {
  const outputDir = path.join(__dirname, 'temp-transpile');
  const testRegistry = {
    name: 'test-registry',
    version: '1.0.0',
    description: 'Test registry for transpilation',
    components: [
      {
        name: 'TestButton',
        type: 'component',
        category: 'actions',
        description: 'Test button component',
        props: [
          {
            name: 'variant',
            type: 'union',
            required: false,
            default: 'primary',
            description: 'Button variant'
          },
          {
            name: 'size',
            type: 'union',
            required: false,
            default: 'md',
            description: 'Button size'
          },
          {
            name: 'disabled',
            type: 'boolean',
            required: false,
            default: false,
            description: 'Whether button is disabled'
          }
        ],
        variants: [
          {
            name: 'primary',
            props: {
              backgroundColor: '#007bff',
              textColor: '#ffffff'
            }
          },
          {
            name: 'secondary',
            props: {
              backgroundColor: '#6c757d',
              textColor: '#ffffff'
            }
          }
        ]
      },
      {
        name: 'TestCard',
        type: 'component',
        category: 'layout',
        description: 'Test card component',
        props: [
          {
            name: 'padding',
            type: 'union',
            required: false,
            default: 'md',
            description: 'Card padding'
          }
        ]
      }
    ],
    tokens: {
      colors: {
        primary: {
          value: '#007bff',
          type: 'color'
        },
        secondary: {
          value: '#6c757d',
          type: 'color'
        }
      },
      spacing: {
        sm: {
          value: '0.5rem',
          type: 'dimension'
        },
        md: {
          value: '1rem',
          type: 'dimension'
        }
      }
    }
  };
  
  beforeEach(async () => {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create test registry file
    await fs.writeFile(
      path.join(outputDir, 'test-registry.json'),
      JSON.stringify(testRegistry, null, 2)
    );
  });
  
  afterEach(async () => {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });
  
  describe('Basic Transpilation', () => {
    it('should transpile React components successfully', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      const transpileOutput = path.join(outputDir, 'components');
      
      const result = await runTranspile(registryPath, {
        target: 'react',
        out: transpileOutput,
        format: 'typescript'
      });
      
      expect(result).toBeDefined();
      expect(result.summary.componentsGenerated).toBe(2);
      expect(result.summary.target).toBe('react');
      
      // Check that files were created
      const files = await fs.readdir(path.join(transpileOutput, 'components'));
      expect(files).toContain('TestButton.tsx');
      expect(files).toContain('TestCard.tsx');
    });
    
    it('should generate valid TypeScript interfaces', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      const transpileOutput = path.join(outputDir, 'components');
      
      await runTranspile(registryPath, {
        target: 'react',
        out: transpileOutput,
        format: 'typescript'
      });
      
      const buttonContent = await fs.readFile(
        path.join(transpileOutput, 'components', 'TestButton.tsx'),
        'utf-8'
      );
      
      // Check for TypeScript interface
      expect(buttonContent).toContain('export interface TestButtonProps');
      expect(buttonContent).toContain('variant');
      expect(buttonContent).toContain('size');
      expect(buttonContent).toContain('disabled');
    });
    
    it('should generate JavaScript components when requested', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      const transpileOutput = path.join(outputDir, 'components');
      
      await runTranspile(registryPath, {
        target: 'react',
        out: transpileOutput,
        format: 'javascript'
      });
      
      const files = await fs.readdir(path.join(transpileOutput, 'components'));
      expect(files).toContain('TestButton.jsx');
      expect(files).toContain('TestCard.jsx');
      
      const buttonContent = await fs.readFile(
        path.join(transpileOutput, 'components', 'TestButton.jsx'),
        'utf-8'
      );
      
      // Should not contain TypeScript interfaces
      expect(buttonContent).not.toContain('export interface');
    });
  });
  
  describe('Output Structure', () => {
    it('should generate index.ts with proper exports', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      const transpileOutput = path.join(outputDir, 'components');
      
      await runTranspile(registryPath, {
        target: 'react',
        out: transpileOutput
      });
      
      const indexContent = await fs.readFile(
        path.join(transpileOutput, 'index.ts'),
        'utf-8'
      );
      
      expect(indexContent).toContain('export { TestButton }');
      expect(indexContent).toContain('export { TestCard }');
      expect(indexContent).toContain('export * from \'./types\'');
      expect(indexContent).toContain('export * from \'./tokens\'');
    });
    
    it('should generate tokens.ts with design tokens', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      const transpileOutput = path.join(outputDir, 'components');
      
      await runTranspile(registryPath, {
        target: 'react',
        out: transpileOutput
      });
      
      const tokensContent = await fs.readFile(
        path.join(transpileOutput, 'tokens.ts'),
        'utf-8'
      );
      
      expect(tokensContent).toContain('export const colors');
      expect(tokensContent).toContain('export const spacing');
      expect(tokensContent).toContain('#007bff');
      expect(tokensContent).toContain('1rem');
    });
    
    it('should generate package.json with correct dependencies', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      const transpileOutput = path.join(outputDir, 'components');
      
      await runTranspile(registryPath, {
        target: 'react',
        out: transpileOutput
      });
      
      const packageContent = await fs.readFile(
        path.join(transpileOutput, 'package.json'),
        'utf-8'
      );
      
      const packageJson = JSON.parse(packageContent);
      
      expect(packageJson.name).toBe('@dcp/test-registry');
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.peerDependencies.react).toBeDefined();
      expect(packageJson.dependencies['class-variance-authority']).toBeDefined();
    });
  });
  
  describe('Storybook Integration', () => {
    it('should generate Storybook stories when requested', async () => {
      // Add examples to test registry
      const registryWithExamples = {
        ...testRegistry,
        components: testRegistry.components.map(comp => ({
          ...comp,
          examples: [
            {
              name: 'Default',
              props: {}
            },
            {
              name: 'Primary',
              props: { variant: 'primary' }
            }
          ]
        }))
      };
      
      const registryPath = path.join(outputDir, 'test-registry-with-examples.json');
      await fs.writeFile(registryPath, JSON.stringify(registryWithExamples, null, 2));
      
      const transpileOutput = path.join(outputDir, 'components');
      
      const result = await runTranspile(registryPath, {
        target: 'react',
        out: transpileOutput,
        includeStories: true
      });
      
      expect(result.summary.storiesGenerated).toBe(2);
      
      const storiesFiles = await fs.readdir(path.join(transpileOutput, 'stories'));
      expect(storiesFiles).toContain('TestButton.stories.tsx');
      expect(storiesFiles).toContain('TestCard.stories.tsx');
    });
    
    it('should generate valid Storybook story format', async () => {
      const registryWithExamples = {
        ...testRegistry,
        components: [
          {
            ...testRegistry.components[0],
            examples: [{ name: 'Default', props: {} }]
          }
        ]
      };
      
      const registryPath = path.join(outputDir, 'test-registry-with-examples.json');
      await fs.writeFile(registryPath, JSON.stringify(registryWithExamples, null, 2));
      
      const transpileOutput = path.join(outputDir, 'components');
      
      await runTranspile(registryPath, {
        target: 'react',
        out: transpileOutput,
        includeStories: true
      });
      
      const storyContent = await fs.readFile(
        path.join(transpileOutput, 'stories', 'TestButton.stories.tsx'),
        'utf-8'
      );
      
      expect(storyContent).toContain('import type { Meta, StoryObj }');
      expect(storyContent).toContain('export default meta');
      expect(storyContent).toContain('export const Default: Story');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing registry file', async () => {
      const nonexistentPath = path.join(outputDir, 'nonexistent.json');
      
      await expect(
        runTranspile(nonexistentPath, {
          target: 'react',
          out: outputDir
        })
      ).rejects.toThrow();
    });
    
    it('should handle invalid JSON in registry', async () => {
      const invalidRegistryPath = path.join(outputDir, 'invalid.json');
      await fs.writeFile(invalidRegistryPath, 'invalid json {{{');
      
      await expect(
        runTranspile(invalidRegistryPath, {
          target: 'react',
          out: outputDir
        })
      ).rejects.toThrow();
    });
    
    it('should handle registry with no components', async () => {
      const emptyRegistry = {
        name: 'empty',
        version: '1.0.0',
        components: []
      };
      
      const registryPath = path.join(outputDir, 'empty-registry.json');
      await fs.writeFile(registryPath, JSON.stringify(emptyRegistry, null, 2));
      
      const result = await runTranspile(registryPath, {
        target: 'react',
        out: path.join(outputDir, 'empty-output')
      });
      
      expect(result.summary.componentsGenerated).toBe(0);
    });
    
    it('should handle unsupported transpile target', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      
      await expect(
        runTranspile(registryPath, {
          target: 'unsupported',
          out: outputDir
        })
      ).rejects.toThrow('Unsupported transpile target');
    });
  });
  
  describe('Performance', () => {
    it('should transpile components within reasonable time', async () => {
      const registryPath = path.join(outputDir, 'test-registry.json');
      const startTime = Date.now();
      
      await runTranspile(registryPath, {
        target: 'react',
        out: path.join(outputDir, 'perf-test')
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Should complete in under 3 seconds
    });
  });
});