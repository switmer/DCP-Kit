/**
 * @jest-environment node
 */
import { OverrideManager } from '../../../src/tokens/overrideManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('🎛️ Override Manager', () => {
  let tempDir;
  let manager;

  beforeEach(async () => {
    tempDir = path.join(__dirname, '../temp-override-manager');
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    manager = new OverrideManager(tempDir, { 
      verbose: false 
    });
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe('Configuration Loading', () => {
    test('should load token config from dcp.config.json', async () => {
      const config = {
        tokens: {
          autoDetect: true,
          include: [
            { type: 'tailwind', path: './custom-tailwind.config.js' }
          ],
          exclude: [
            { type: 'css-variables', pattern: '**/node_modules/**' }
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      const tokenConfig = await manager.loadConfig();

      expect(tokenConfig).toMatchObject({
        autoDetect: true,
        include: [
          { type: 'tailwind', path: './custom-tailwind.config.js' }
        ],
        exclude: [
          { type: 'css-variables', pattern: '**/node_modules/**' }
        ]
      });
    });

    test('should return default config when no config file exists', async () => {
      const tokenConfig = await manager.loadConfig();

      expect(tokenConfig).toMatchObject({
        autoDetect: true,
        include: [],
        exclude: []
      });
    });

    test('should handle malformed config gracefully', async () => {
      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        '{ "tokens": { invalid: json } }'
      );

      const tokenConfig = await manager.loadConfig();

      // Should return default config on parse error
      expect(tokenConfig.autoDetect).toBe(true);
      expect(tokenConfig.include).toEqual([]);
    });
  });

  describe('Include Rules', () => {
    test('should force include specified token sources', async () => {
      const config = {
        tokens: {
          include: [
            {
              type: 'tailwind',
              path: './custom-tailwind.config.js',
              confidence: 0.9
            },
            {
              type: 'css-variables',
              path: './src/custom-variables.css',
              confidence: 0.8
            }
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      // Create the forced include files
      await fs.promises.writeFile(
        path.join(tempDir, 'custom-tailwind.config.js'),
        'module.exports = { theme: {} };'
      );
      
      await fs.promises.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.promises.writeFile(
        path.join(tempDir, 'src/custom-variables.css'),
        ':root { --custom-color: #000; }'
      );

      const detectedSources = []; // No auto-detected sources
      const finalSources = await manager.applyOverrides(detectedSources);

      expect(finalSources).toHaveLength(2);
      expect(finalSources[0]).toMatchObject({
        type: 'tailwind',
        path: expect.stringContaining('custom-tailwind.config.js'),
        confidence: 0.9,
        source: 'manual'
      });
      expect(finalSources[1]).toMatchObject({
        type: 'css-variables',
        path: expect.stringContaining('custom-variables.css'),
        confidence: 0.8,
        source: 'manual'
      });
    });

    test('should support glob patterns in include paths', async () => {
      const config = {
        tokens: {
          include: [
            {
              type: 'css-variables',
              pattern: './src/**/*.css',
              confidence: 0.7
            }
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      // Create multiple CSS files matching the pattern
      await fs.promises.mkdir(path.join(tempDir, 'src/components'), { recursive: true });
      await fs.promises.writeFile(
        path.join(tempDir, 'src/globals.css'),
        ':root { --global-color: #000; }'
      );
      await fs.promises.writeFile(
        path.join(tempDir, 'src/components/button.css'),
        ':root { --button-color: #fff; }'
      );

      const detectedSources = [];
      const finalSources = await manager.applyOverrides(detectedSources);

      expect(finalSources).toHaveLength(2);
      expect(finalSources.every(s => s.type === 'css-variables')).toBe(true);
      expect(finalSources.every(s => s.confidence === 0.7)).toBe(true);
    });

    test('should validate included files exist', async () => {
      const config = {
        tokens: {
          include: [
            {
              type: 'tailwind',
              path: './nonexistent-config.js',
              confidence: 0.9
            }
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      const detectedSources = [];
      const finalSources = await manager.applyOverrides(detectedSources);

      // Should skip nonexistent files
      expect(finalSources).toHaveLength(0);
    });
  });

  describe('Exclude Rules', () => {
    test('should exclude sources by type', async () => {
      const config = {
        tokens: {
          exclude: [
            { type: 'css-variables' }
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      const detectedSources = [
        { type: 'tailwind', path: './tailwind.config.js', confidence: 0.9 },
        { type: 'css-variables', path: './src/globals.css', confidence: 0.7 },
        { type: 'radix', path: './radix.config.js', confidence: 0.8 }
      ];

      const finalSources = await manager.applyOverrides(detectedSources);

      expect(finalSources).toHaveLength(2);
      expect(finalSources.find(s => s.type === 'css-variables')).toBeUndefined();
      expect(finalSources.find(s => s.type === 'tailwind')).toBeDefined();
      expect(finalSources.find(s => s.type === 'radix')).toBeDefined();
    });

    test('should exclude sources by path pattern', async () => {
      const config = {
        tokens: {
          exclude: [
            { pattern: '**/node_modules/**' },
            { pattern: '**/test/**' }
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      const detectedSources = [
        { type: 'tailwind', path: './tailwind.config.js', confidence: 0.9 },
        { type: 'radix', path: './node_modules/@radix-ui/themes/package.json', confidence: 0.8 },
        { type: 'css-variables', path: './test/fixtures/globals.css', confidence: 0.6 },
        { type: 'mui', path: './src/theme.js', confidence: 0.7 }
      ];

      const finalSources = await manager.applyOverrides(detectedSources);

      expect(finalSources).toHaveLength(2);
      expect(finalSources.find(s => s.path.includes('node_modules'))).toBeUndefined();
      expect(finalSources.find(s => s.path.includes('test'))).toBeUndefined();
      expect(finalSources.find(s => s.type === 'tailwind')).toBeDefined();
      expect(finalSources.find(s => s.type === 'mui')).toBeDefined();
    });

    test('should exclude sources by confidence threshold', async () => {
      const config = {
        tokens: {
          exclude: [
            { minConfidence: 0.7 }
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      const detectedSources = [
        { type: 'tailwind', confidence: 0.9 },
        { type: 'radix', confidence: 0.8 },
        { type: 'css-variables', confidence: 0.6 },
        { type: 'custom', confidence: 0.5 }
      ];

      const finalSources = await manager.applyOverrides(detectedSources);

      expect(finalSources).toHaveLength(2);
      expect(finalSources.every(s => s.confidence >= 0.7)).toBe(true);
    });
  });

  describe('Combined Include and Exclude', () => {
    test('should apply both include and exclude rules', async () => {
      const config = {
        tokens: {
          include: [
            {
              type: 'custom',
              path: './custom-tokens.js',
              confidence: 0.8
            }
          ],
          exclude: [
            { type: 'css-variables' },
            { pattern: '**/node_modules/**' }
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      // Create the custom tokens file
      await fs.promises.writeFile(
        path.join(tempDir, 'custom-tokens.js'),
        'export const tokens = { primary: "#000" };'
      );

      const detectedSources = [
        { type: 'tailwind', path: './tailwind.config.js', confidence: 0.9 },
        { type: 'css-variables', path: './src/globals.css', confidence: 0.7 },
        { type: 'radix', path: './node_modules/@radix-ui/themes', confidence: 0.8 }
      ];

      const finalSources = await manager.applyOverrides(detectedSources);

      expect(finalSources).toHaveLength(2);
      
      // Should include auto-detected tailwind (not excluded)
      expect(finalSources.find(s => s.type === 'tailwind')).toBeDefined();
      
      // Should include manually added custom tokens
      expect(finalSources.find(s => s.type === 'custom')).toBeDefined();
      
      // Should exclude css-variables and node_modules radix
      expect(finalSources.find(s => s.type === 'css-variables')).toBeUndefined();
      expect(finalSources.find(s => s.type === 'radix')).toBeUndefined();
    });

    test('should prioritize include over exclude for same source', async () => {
      const config = {
        tokens: {
          include: [
            {
              type: 'css-variables',
              path: './src/important-vars.css',
              confidence: 0.9
            }
          ],
          exclude: [
            { type: 'css-variables' } // Exclude all CSS variables
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      // Create the important CSS variables file
      await fs.promises.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.promises.writeFile(
        path.join(tempDir, 'src/important-vars.css'),
        ':root { --important-color: #000; }'
      );

      const detectedSources = [
        { type: 'css-variables', path: './src/globals.css', confidence: 0.7 }
      ];

      const finalSources = await manager.applyOverrides(detectedSources);

      expect(finalSources).toHaveLength(1);
      expect(finalSources[0]).toMatchObject({
        type: 'css-variables',
        path: expect.stringContaining('important-vars.css'),
        confidence: 0.9,
        source: 'manual'
      });
    });
  });

  describe('Source Transformation and Metadata', () => {
    test('should mark manually included sources', async () => {
      const config = {
        tokens: {
          include: [
            {
              type: 'tailwind',
              path: './custom.config.js',
              confidence: 0.9,
              description: 'Custom Tailwind configuration'
            }
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      await fs.promises.writeFile(
        path.join(tempDir, 'custom.config.js'),
        'module.exports = {};'
      );

      const detectedSources = [];
      const finalSources = await manager.applyOverrides(detectedSources);

      expect(finalSources[0]).toMatchObject({
        type: 'tailwind',
        confidence: 0.9,
        source: 'manual',
        description: 'Custom Tailwind configuration'
      });
    });

    test('should preserve auto-detected source metadata', async () => {
      const config = {
        tokens: {
          exclude: [] // No exclusions
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      const detectedSources = [
        {
          type: 'tailwind',
          path: './tailwind.config.js',
          confidence: 0.9,
          source: 'auto',
          metadata: { fileSize: 1024, lastModified: '2024-01-01' }
        }
      ];

      const finalSources = await manager.applyOverrides(detectedSources);

      expect(finalSources[0]).toMatchObject({
        type: 'tailwind',
        source: 'auto',
        metadata: { fileSize: 1024, lastModified: '2024-01-01' }
      });
    });
  });

  describe('Rule Validation', () => {
    test('should validate include rule structure', async () => {
      const config = {
        tokens: {
          include: [
            { type: 'tailwind' }, // Missing path/pattern
            { path: './config.js' }, // Missing type
            {} // Empty rule
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      const detectedSources = [];
      const finalSources = await manager.applyOverrides(detectedSources);

      // Should skip invalid rules
      expect(finalSources).toHaveLength(0);
    });

    test('should validate exclude rule structure', async () => {
      const config = {
        tokens: {
          exclude: [
            {}, // Empty rule - should be ignored
            { invalidProperty: 'value' } // Invalid rule
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      const detectedSources = [
        { type: 'tailwind', path: './tailwind.config.js', confidence: 0.9 }
      ];

      const finalSources = await manager.applyOverrides(detectedSources);

      // Should preserve all sources since exclude rules are invalid
      expect(finalSources).toHaveLength(1);
    });
  });

  describe('Glob Pattern Matching', () => {
    test('should support complex glob patterns', async () => {
      const config = {
        tokens: {
          exclude: [
            { pattern: '**/*.{test,spec}.{js,ts}' }, // Test files
            { pattern: '**/stories/**' }, // Storybook files
            { pattern: 'packages/*/node_modules/**' } // Monorepo node_modules
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      const detectedSources = [
        { type: 'css-variables', path: './src/components/button.css', confidence: 0.7 },
        { type: 'css-variables', path: './src/components/button.test.js', confidence: 0.6 },
        { type: 'css-variables', path: './src/stories/button.stories.js', confidence: 0.5 },
        { type: 'tailwind', path: './packages/ui/node_modules/tailwindcss/package.json', confidence: 0.4 },
        { type: 'tailwind', path: './tailwind.config.js', confidence: 0.9 }
      ];

      const finalSources = await manager.applyOverrides(detectedSources);

      expect(finalSources).toHaveLength(2);
      expect(finalSources.find(s => s.path.includes('button.css'))).toBeDefined();
      expect(finalSources.find(s => s.path.includes('tailwind.config.js'))).toBeDefined();
      expect(finalSources.find(s => s.path.includes('.test.'))).toBeUndefined();
      expect(finalSources.find(s => s.path.includes('stories'))).toBeUndefined();
      expect(finalSources.find(s => s.path.includes('node_modules'))).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
      const config = {
        tokens: {
          include: [
            {
              type: 'tailwind',
              pattern: './restricted/**/*.config.js',
              confidence: 0.9
            }
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      // Create restricted directory (simulate permission error on some systems)
      const restrictedDir = path.join(tempDir, 'restricted');
      await fs.promises.mkdir(restrictedDir, { recursive: true });
      
      const detectedSources = [];
      
      // Should not throw error even if glob fails
      await expect(manager.applyOverrides(detectedSources)).resolves.toEqual([]);
    });

    test('should handle circular config references', async () => {
      const config = {
        tokens: {
          include: [
            {
              type: 'custom',
              path: './dcp.config.json', // Self-reference
              confidence: 0.9
            }
          ]
        }
      };

      await fs.promises.writeFile(
        path.join(tempDir, 'dcp.config.json'),
        JSON.stringify(config, null, 2)
      );

      const detectedSources = [];
      const finalSources = await manager.applyOverrides(detectedSources);

      // Should handle gracefully, likely skipping the self-reference
      expect(finalSources).toHaveLength(0);
    });
  });
});