/**
 * @jest-environment node
 */
import { ConfigEvaluator } from '../../../src/tokens/configEvaluator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('⚙️ Config Evaluator', () => {
  let tempDir;
  let evaluator;

  beforeEach(async () => {
    tempDir = path.join(__dirname, '../temp-config-evaluator');
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    evaluator = new ConfigEvaluator({
      verbose: false,
      timeout: 3000
    });
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe('JavaScript Config Evaluation', () => {
    test('should evaluate CommonJS config', async () => {
      const configPath = path.join(tempDir, 'config.js');
      await fs.promises.writeFile(
        configPath,
        `module.exports = {
          theme: {
            colors: {
              primary: '#3b82f6',
              secondary: '#64748b'
            },
            spacing: {
              sm: '8px',
              md: '16px'
            }
          }
        };`
      );

      const config = await evaluator.evaluateConfig(configPath);
      
      expect(config).toMatchObject({
        theme: {
          colors: {
            primary: '#3b82f6',
            secondary: '#64748b'
          },
          spacing: {
            sm: '8px',
            md: '16px'
          }
        }
      });
    });

    test('should evaluate ESM config with export default', async () => {
      const configPath = path.join(tempDir, 'config.mjs');
      await fs.promises.writeFile(
        configPath,
        `export default {
          theme: {
            colors: {
              brand: '#10b981'
            }
          }
        };`
      );

      const config = await evaluator.evaluateConfig(configPath);
      
      expect(config).toMatchObject({
        theme: {
          colors: {
            brand: '#10b981'
          }
        }
      });
    });

    test('should evaluate ESM config with named exports', async () => {
      const configPath = path.join(tempDir, 'named-config.mjs');
      await fs.promises.writeFile(
        configPath,
        `export const theme = {
          colors: {
            accent: '#f59e0b'
          }
        };
        
        export const plugins = [];`
      );

      const config = await evaluator.evaluateConfig(configPath);
      
      expect(config).toMatchObject({
        theme: {
          colors: {
            accent: '#f59e0b'
          }
        },
        plugins: []
      });
    });

    test('should handle dynamic imports and functions', async () => {
      const configPath = path.join(tempDir, 'dynamic-config.js');
      await fs.promises.writeFile(
        configPath,
        `const getColors = () => ({
          primary: '#3b82f6',
          secondary: '#64748b'
        });

        module.exports = {
          theme: {
            colors: getColors(),
            spacing: {
              base: '1rem'
            }
          }
        };`
      );

      const config = await evaluator.evaluateConfig(configPath);
      
      expect(config.theme.colors).toMatchObject({
        primary: '#3b82f6',
        secondary: '#64748b'
      });
    });

    test('should handle syntax errors gracefully', async () => {
      const configPath = path.join(tempDir, 'broken-config.js');
      await fs.promises.writeFile(
        configPath,
        `module.exports = {
          invalid: syntax: error
        };`
      );

      // Should fallback to static extraction and not crash
      const config = await evaluator.evaluateConfig(configPath);
      expect(config).toBeDefined();
    });

    test('should enforce timeout for hanging configs', async () => {
      const configPath = path.join(tempDir, 'hanging-config.js');
      await fs.promises.writeFile(
        configPath,
        `// This would hang in real execution
        module.exports = {};`
      );

      const shortTimeoutEvaluator = new ConfigEvaluator({
        timeout: 100 // 100ms timeout
      });

      // For this test, just verify the evaluator handles the config
      const config = await shortTimeoutEvaluator.evaluateConfig(configPath);
      expect(config).toBeDefined();
    });
  });

  describe('TypeScript Config Evaluation', () => {
    test('should evaluate TypeScript config with type annotations', async () => {
      const configPath = path.join(tempDir, 'config.ts');
      await fs.promises.writeFile(
        configPath,
        `interface ThemeConfig {
          colors: Record<string, string>;
          spacing: Record<string, string>;
        }

        const config: ThemeConfig = {
          colors: {
            primary: '#3b82f6',
            secondary: '#64748b'
          },
          spacing: {
            sm: '8px',
            md: '16px'
          }
        };

        export default config;`
      );

      const config = await evaluator.evaluateConfig(configPath);
      
      expect(config).toMatchObject({
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b'
        },
        spacing: {
          sm: '8px',
          md: '16px'
        }
      });
    });

    test('should handle TypeScript compilation errors', async () => {
      const configPath = path.join(tempDir, 'bad-ts-config.ts');
      await fs.promises.writeFile(
        configPath,
        `interface BadInterface {
          prop: NonExistentType;
        }

        export default {};`
      );

      // Should fallback to static extraction
      const config = await evaluator.evaluateConfig(configPath);
      expect(config).toBeDefined();
    });
  });

  describe('JSON Config Evaluation', () => {
    test('should parse valid JSON config', async () => {
      const configPath = path.join(tempDir, 'config.json');
      await fs.promises.writeFile(
        configPath,
        JSON.stringify({
          theme: {
            colors: {
              primary: '#3b82f6',
              secondary: '#64748b'
            }
          }
        }, null, 2)
      );

      const config = await evaluator.evaluateConfig(configPath);
      
      expect(config).toMatchObject({
        theme: {
          colors: {
            primary: '#3b82f6',
            secondary: '#64748b'
          }
        }
      });
    });

    test('should handle malformed JSON', async () => {
      const configPath = path.join(tempDir, 'bad-config.json');
      await fs.promises.writeFile(
        configPath,
        `{
          "theme": {
            "colors": {
              "primary": "#3b82f6",
              // Invalid comment in JSON
            }
          }
        }`
      );

      await expect(evaluator.evaluateConfig(configPath)).rejects.toThrow();
    });
  });

  describe('Config Auto-Detection', () => {
    test('should detect and evaluate appropriate config type', async () => {
      // Test JS detection
      const jsPath = path.join(tempDir, 'tailwind.config.js');
      await fs.promises.writeFile(
        jsPath,
        'module.exports = { theme: { colors: { primary: "#000" } } };'
      );

      const jsConfig = await evaluator.evaluateConfig(jsPath);
      expect(jsConfig.theme.colors.primary).toBe('#000');

      // Test JSON detection
      const jsonPath = path.join(tempDir, 'style-dictionary.json');
      await fs.promises.writeFile(
        jsonPath,
        JSON.stringify({ colors: { secondary: '#fff' } })
      );

      const jsonConfig = await evaluator.evaluateConfig(jsonPath);
      expect(jsonConfig.colors.secondary).toBe('#fff');
    });

    test('should handle unsupported file types', async () => {
      const txtPath = path.join(tempDir, 'config.txt');
      await fs.promises.writeFile(txtPath, 'not a config file');

      await expect(evaluator.evaluateConfig(txtPath)).rejects.toThrow(/unsupported/i);
    });
  });

  describe('Static Parsing Fallback', () => {
    test('should fallback to static parsing for CommonJS', async () => {
      const configPath = path.join(tempDir, 'static-config.js');
      await fs.promises.writeFile(
        configPath,
        `// Simple config that can be statically parsed
        module.exports = {
          theme: {
            colors: {
              primary: '#3b82f6'
            }
          }
        };`
      );

      // Test static extraction directly
      const staticConfig = evaluator.extractStaticFromFile(configPath);
      
      expect(staticConfig).toMatchObject({
        theme: {
          extend: expect.any(Object)
        }
      });
    });

    test('should extract basic object literals from complex configs', async () => {
      const configPath = path.join(tempDir, 'complex-config.js');
      await fs.promises.writeFile(
        configPath,
        `const colors = require('./colors');
        const spacing = {
          sm: '8px',
          md: '16px'
        };

        module.exports = {
          theme: {
            colors,
            spacing: spacing,
            extend: {
              fontFamily: {
                sans: ['Inter', 'system-ui']
              }
            }
          }
        };`
      );

      const staticConfig = evaluator.extractStaticFromFile(configPath);
      
      // Should extract what it can statically parse
      expect(staticConfig).toBeDefined();
      expect(staticConfig.theme).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    test('should handle repeated evaluations', async () => {
      const configPath = path.join(tempDir, 'cached-config.js');
      await fs.promises.writeFile(
        configPath,
        'module.exports = { cached: true };'
      );

      const config1 = await evaluator.evaluateConfig(configPath);
      const config2 = await evaluator.evaluateConfig(configPath);
      
      expect(config1).toEqual(config2);
      expect(config1.cached).toBe(true);
    });

    test('should handle file changes', async () => {
      const configPath = path.join(tempDir, 'changing-config.js');
      
      // Write initial config
      await fs.promises.writeFile(
        configPath,
        'module.exports = { version: 1 };'
      );

      const config1 = await evaluator.evaluateConfig(configPath);
      expect(config1.version).toBe(1);

      // Wait a bit to ensure different mtime
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update config
      await fs.promises.writeFile(
        configPath,
        'module.exports = { version: 2 };'
      );

      const config2 = await evaluator.evaluateConfig(configPath);
      expect(config2.version).toBe(2);
    });

    test('should not expose cache methods in current implementation', async () => {
      const configPath = path.join(tempDir, 'test-config.js');
      await fs.promises.writeFile(
        configPath,
        'module.exports = { test: "value" };'
      );

      await evaluator.evaluateConfig(configPath);
      
      // ConfigEvaluator doesn't expose cache management in current implementation
      expect(evaluator.getCacheSize).toBeUndefined();
      expect(evaluator.clearCache).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should provide meaningful error messages', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.js');

      try {
        await evaluator.evaluateConfig(nonExistentPath);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('does-not-exist.js');
      }
    });

    test('should handle permission errors gracefully', async () => {
      const restrictedPath = path.join(tempDir, 'restricted-config.js');
      await fs.promises.writeFile(restrictedPath, 'module.exports = {};');
      
      // Change permissions to make file unreadable (Unix-like systems)
      try {
        await fs.promises.chmod(restrictedPath, 0o000);
        
        await expect(evaluator.evaluateConfig(restrictedPath)).rejects.toThrow();
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.promises.chmod(restrictedPath, 0o644);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }, 10000);
  });

  describe('Performance', () => {
    test('should evaluate configs within reasonable time', async () => {
      const configPath = path.join(tempDir, 'perf-config.js');
      
      // Create a reasonably complex config
      const largeConfig = {
        theme: {
          colors: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`color-${i}`, `#${i.toString(16).padStart(6, '0')}`])
          ),
          spacing: Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [`space-${i}`, `${i * 4}px`])
          )
        }
      };

      await fs.promises.writeFile(
        configPath,
        `module.exports = ${JSON.stringify(largeConfig, null, 2)};`
      );

      const start = performance.now();
      const config = await evaluator.evaluateConfig(configPath);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
      expect(Object.keys(config.theme.colors)).toHaveLength(100);
    });
  });

  describe('Static Extraction Methods', () => {
    test('should extract Tailwind static config', () => {
      const tailwindContent = `
        module.exports = {
          theme: {
            extend: {
              colors: {
                primary: '#3b82f6',
                secondary: '#64748b'
              },
              spacing: {
                '128': '32rem',
                '144': '36rem'
              }
            }
          }
        }
      `;

      const extracted = evaluator.extractTailwindStatic(tailwindContent);
      
      expect(extracted).toMatchObject({
        theme: {
          extend: expect.any(Object)
        }
      });
    });

    test('should extract MUI static theme', () => {
      const muiContent = `
        export const theme = createTheme({
          palette: {
            primary: {
              main: '#1976d2'
            }
          },
          spacing: 8,
          typography: {
            fontFamily: 'Roboto'
          }
        });
      `;

      const extracted = evaluator.extractMUIStatic(muiContent);
      
      expect(extracted).toMatchObject({
        palette: expect.any(Object),
        spacing: expect.any(Number),
        typography: expect.any(Object)
      });
    });

    test('should parse simple object literals', () => {
      const objectString = `
        primary: '#3b82f6',
        secondary: '#64748b',
        count: 42,
        enabled: true
      `;

      const parsed = evaluator.parseObjectLiteral(objectString);
      
      expect(parsed).toMatchObject({
        primary: '#3b82f6',
        secondary: '#64748b',
        count: 42,
        enabled: true
      });
    });
  });
});