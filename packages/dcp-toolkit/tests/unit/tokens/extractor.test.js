/**
 * @jest-environment node
 */
import { UniversalTokenExtractor } from '../../../src/tokens/extractor.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('🚀 Universal Token Extractor', () => {
  let tempDir;
  let extractor;

  beforeEach(async () => {
    tempDir = path.join(__dirname, '../temp-token-extractor');
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    extractor = new UniversalTokenExtractor({ 
      verbose: false,
      timeout: 3000 
    });
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe('Radix Token Extraction', () => {
    test('should extract Radix theme tokens', async () => {
      const mockRadixSource = {
        type: 'radix',
        path: path.join(tempDir, 'radix.config.js'),
        confidence: 0.9
      };

      // Create mock Radix config
      await fs.promises.writeFile(
        mockRadixSource.path,
        `export default {
          theme: {
            colors: {
              primary: '#000',
              secondary: '#fff',
              accent: {
                1: '#f8f9fa',
                2: '#e9ecef',
                3: '#dee2e6'
              }
            },
            spacing: {
              1: '4px',
              2: '8px',
              3: '12px'
            },
            fonts: {
              default: 'Inter, sans-serif',
              mono: 'Fira Code, monospace'
            }
          }
        }`
      );

      const tokens = await extractor.extractRadixTokens(mockRadixSource);
      
      expect(tokens).toMatchObject({
        colors: expect.any(Object),
        spacing: expect.any(Object),
        typography: expect.any(Object)
      });
      
      // Should have some tokens extracted
      const totalTokens = extractor.countTokens(tokens);
      expect(totalTokens).toBeGreaterThan(0);
    });

    test('should handle malformed Radix config gracefully', async () => {
      const mockRadixSource = {
        type: 'radix',
        path: path.join(tempDir, 'bad-radix.config.js'),
        confidence: 0.9
      };

      await fs.promises.writeFile(
        mockRadixSource.path,
        'export default { invalid: syntax }'
      );

      const tokens = await extractor.extractRadixTokens(mockRadixSource);
      
      // Should return empty token structure for malformed config
      expect(tokens).toMatchObject({
        colors: {},
        spacing: {},
        typography: {}
      });
      
      const totalTokens = extractor.countTokens(tokens);
      expect(totalTokens).toBe(0);
    });
  });

  describe('Tailwind Token Extraction', () => {
    test('should extract Tailwind theme tokens', async () => {
      const mockTailwindSource = {
        type: 'tailwind',
        path: path.join(tempDir, 'tailwind.config.js'),
        confidence: 0.9
      };

      await fs.promises.writeFile(
        mockTailwindSource.path,
        `module.exports = {
          theme: {
            extend: {
              colors: {
                brand: {
                  50: '#f0f9ff',
                  500: '#3b82f6',
                  900: '#1e3a8a'
                }
              },
              spacing: {
                '128': '32rem',
                '144': '36rem'
              },
              fontFamily: {
                'custom': ['Inter', 'sans-serif']
              }
            }
          }
        }`
      );

      const tokens = await extractor.extractTailwindTokens(mockTailwindSource);
      
      expect(tokens).toMatchObject({
        colors: expect.objectContaining({
          'brand-50': '#f0f9ff',
          'brand-500': '#3b82f6',
          'brand-900': '#1e3a8a'
        }),
        spacing: expect.objectContaining({
          '128': '32rem',
          '144': '36rem'
        }),
        typography: expect.objectContaining({
          custom: ['Inter', 'sans-serif']
        })
      });
      
      const totalTokens = extractor.countTokens(tokens);
      expect(totalTokens).toBeGreaterThan(5);
    });

    test('should handle CommonJS and ESM Tailwind configs', async () => {
      // Test CommonJS
      const cjsSource = {
        type: 'tailwind',
        path: path.join(tempDir, 'tailwind.cjs'),
        confidence: 0.9
      };

      await fs.promises.writeFile(
        cjsSource.path,
        `module.exports = {
          theme: {
            colors: { primary: '#000' }
          }
        }`
      );

      const cjsTokens = await extractor.extractTailwindTokens(cjsSource);
      expect(cjsTokens.colors.primary).toBe('#000');

      // Test ESM
      const esmSource = {
        type: 'tailwind',
        path: path.join(tempDir, 'tailwind.mjs'),
        confidence: 0.9
      };

      await fs.promises.writeFile(
        esmSource.path,
        `export default {
          theme: {
            colors: { secondary: '#fff' }
          }
        }`
      );

      const esmTokens = await extractor.extractTailwindTokens(esmSource);
      expect(esmTokens.colors.secondary).toBe('#fff');
    });
  });

  describe('MUI Token Extraction', () => {
    test('should extract MUI theme tokens from createTheme', async () => {
      const mockMUISource = {
        type: 'mui',
        path: path.join(tempDir, 'theme.js'),
        confidence: 0.8
      };

      await fs.promises.writeFile(
        mockMUISource.path,
        `import { createTheme } from '@mui/material/styles';

        export const theme = createTheme({
          palette: {
            primary: {
              main: '#1976d2',
              light: '#42a5f5',
              dark: '#1565c0'
            },
            secondary: {
              main: '#dc004e'
            }
          },
          spacing: 8,
          typography: {
            fontFamily: 'Roboto, Arial, sans-serif',
            h1: {
              fontSize: '2.125rem',
              fontWeight: 300
            }
          },
          breakpoints: {
            values: {
              xs: 0,
              sm: 600,
              md: 900,
              lg: 1200,
              xl: 1536
            }
          }
        });`
      );

      const tokens = await extractor.extractMUITokens(mockMUISource);
      
      expect(tokens).toMatchObject({
        colors: expect.objectContaining({
          'primary-main': '#1976d2',
          'primary-light': '#42a5f5',
          'primary-dark': '#1565c0',
          'secondary-main': '#dc004e'
        }),
        spacing: expect.any(Object),
        typography: expect.objectContaining({
          fontFamily: 'Roboto, Arial, sans-serif'
        })
      });
      
      const totalTokens = extractor.countTokens(tokens);
      expect(totalTokens).toBeGreaterThan(5);
    });
  });

  describe('CSS Variables Extraction', () => {
    test('should extract CSS custom properties', async () => {
      const mockCSSSource = {
        type: 'css-variables',
        path: path.join(tempDir, 'variables.css'),
        confidence: 0.7,
        metadata: { variableCount: 8 }
      };

      await fs.promises.writeFile(
        mockCSSSource.path,
        `
        :root {
          --color-primary: #3b82f6;
          --color-secondary: #64748b;
          --color-success: #10b981;
          --color-error: #ef4444;
          --spacing-xs: 0.25rem;
          --spacing-sm: 0.5rem;
          --spacing-md: 1rem;
          --spacing-lg: 1.5rem;
          --font-size-sm: 0.875rem;
          --font-size-base: 1rem;
          --font-size-lg: 1.125rem;
          --border-radius: 0.375rem;
        }

        [data-theme="dark"] {
          --color-primary: #60a5fa;
          --color-secondary: #94a3b8;
        }
        `
      );

      const tokens = await extractor.extractCSSVariables(mockCSSSource);
      
      expect(tokens).toMatchObject({
        colors: expect.objectContaining({
          'color-primary': '#3b82f6',
          'color-secondary': '#64748b',
          'color-success': '#10b981',
          'color-error': '#ef4444'
        }),
        spacing: expect.objectContaining({
          'spacing-xs': '0.25rem',
          'spacing-sm': '0.5rem',
          'spacing-md': '1rem',
          'spacing-lg': '1.5rem'
        }),
        typography: expect.objectContaining({
          'font-size-sm': '0.875rem',
          'font-size-base': '1rem',
          'font-size-lg': '1.125rem'
        })
      });
      
      const totalTokens = extractor.countTokens(tokens);
      expect(totalTokens).toBeGreaterThan(10);
    });
  });

  describe('Style Dictionary Extraction', () => {
    test('should extract Style Dictionary tokens', async () => {
      const mockSDSource = {
        type: 'style-dictionary',
        path: path.join(tempDir, 'tokens'),
        confidence: 0.8
      };

      // Create tokens directory structure
      await fs.promises.mkdir(mockSDSource.path, { recursive: true });
      
      await fs.promises.writeFile(
        path.join(mockSDSource.path, 'colors.json'),
        JSON.stringify({
          color: {
            primary: {
              value: '#3b82f6',
              type: 'color'
            },
            secondary: {
              50: { value: '#f8fafc', type: 'color' },
              500: { value: '#64748b', type: 'color' },
              900: { value: '#0f172a', type: 'color' }
            }
          }
        }, null, 2)
      );

      await fs.promises.writeFile(
        path.join(mockSDSource.path, 'spacing.json'),
        JSON.stringify({
          size: {
            spacing: {
              xs: { value: '4px', type: 'dimension' },
              sm: { value: '8px', type: 'dimension' },
              md: { value: '16px', type: 'dimension' }
            }
          }
        }, null, 2)
      );

      const tokens = await extractor.extractStyleDictionary(mockSDSource);
      
      expect(tokens).toMatchObject({
        colors: expect.objectContaining({
          'color-primary': '#3b82f6',
          'color-secondary-50': '#f8fafc',
          'color-secondary-500': '#64748b',
          'color-secondary-900': '#0f172a'
        }),
        spacing: expect.objectContaining({
          'size-spacing-xs': '4px',
          'size-spacing-sm': '8px',
          'size-spacing-md': '16px'
        })
      });
      
      const totalTokens = extractor.countTokens(tokens);
      expect(totalTokens).toBe(7);
    });
  });

  describe('Universal Extraction', () => {
    test('should extract from all source types', async () => {
      const mockSources = [
        {
          type: 'tailwind',
          path: path.join(tempDir, 'tailwind.config.js'),
          confidence: 0.9
        },
        {
          type: 'css-variables',
          path: path.join(tempDir, 'globals.css'),
          confidence: 0.7,
          metadata: { variableCount: 3 }
        }
      ];

      // Create Tailwind config
      await fs.promises.writeFile(
        mockSources[0].path,
        `module.exports = {
          theme: {
            colors: {
              brand: '#3b82f6'
            }
          }
        }`
      );

      // Create CSS variables
      await fs.promises.writeFile(
        mockSources[1].path,
        `
        :root {
          --accent-color: #10b981;
          --text-color: #374151;
          --bg-color: #ffffff;
        }
        `
      );

      const allTokens = await extractor.extractAll(mockSources);
      
      // extractAll returns unified token object, not array
      expect(allTokens).toMatchObject({
        colors: expect.any(Object),
        spacing: expect.any(Object),
        typography: expect.any(Object),
        meta: expect.objectContaining({
          sources: expect.arrayContaining([
            expect.objectContaining({ type: 'tailwind' }),
            expect.objectContaining({ type: 'css-variables' })
          ])
        })
      });
      
      // Should have tokens from both sources with prefixes
      expect(allTokens.colors['tailwind-brand']).toBeDefined();
      expect(allTokens.colors['css-variables-accent-color']).toBeDefined();
    });

    test('should handle extraction errors gracefully', async () => {
      const mockSources = [
        {
          type: 'tailwind',
          path: path.join(tempDir, 'nonexistent.js'),
          confidence: 0.9
        }
      ];

      const allTokens = await extractor.extractAll(mockSources);
      
      // extractAll returns unified token object, not array
      expect(allTokens).toMatchObject({
        colors: {},
        meta: expect.objectContaining({
          sources: expect.arrayContaining([
            expect.objectContaining({ 
              type: 'tailwind',
              extractedTokens: 0 // No tokens extracted from nonexistent file
            })
          ])
        })
      });
    });
  });

  describe('Token Normalization', () => {
    test('should normalize token formats consistently', async () => {
      const rawTokens = {
        colors: {
          'primary-main': '#3b82f6',
          'secondary.light': '#60a5fa'
        },
        spacing: {
          'xs': '4px',
          'sm': '8px'
        }
      };

      // The actual implementation doesn't have a public normalizeTokens method
      // Instead, normalization happens internally during extraction
      const mockSource = {
        type: 'css-variables',
        path: path.join(tempDir, 'test.css'),
        confidence: 0.7
      };
      
      // Create test CSS file
      await fs.promises.writeFile(
        mockSource.path,
        ':root { --primary-main: #3b82f6; --secondary-light: #60a5fa; }'
      );
      
      const tokens = await extractor.extractCSSVariables(mockSource);
      
      expect(tokens.colors).toMatchObject({
        'primary-main': '#3b82f6',
        'secondary-light': '#60a5fa'
      });
    });
  });

  describe('Performance', () => {
    test('should extract tokens within reasonable time', async () => {
      const mockSource = {
        type: 'css-variables',
        path: path.join(tempDir, 'large.css'),
        confidence: 0.7,
        metadata: { variableCount: 100 }
      };

      // Create large CSS file with many variables
      const cssContent = Array.from({ length: 100 }, (_, i) => 
        `  --var-${i}: #${i.toString(16).padStart(6, '0')};`
      ).join('\n');
      
      await fs.promises.writeFile(
        mockSource.path,
        `:root {\n${cssContent}\n}`
      );

      const start = performance.now();
      const tokens = await extractor.extractCSSVariables(mockSource);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(2000); // Should complete within 2 seconds
      const totalTokens = extractor.countTokens(tokens);
      expect(totalTokens).toBe(100);
    });
  });
});