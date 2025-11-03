/**
 * @jest-environment node
 */
import { TokenDetector } from '../../../src/tokens/detector.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('🎯 Universal Token Detector', () => {
  let tempDir;
  let detector;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = path.join(__dirname, '../temp-token-detector');
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    detector = new TokenDetector(tempDir, { 
      verbose: false,
      outputDir: path.join(tempDir, 'registry')
    });
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe('Radix Token Detection', () => {
    test('should detect Radix UI package in node_modules', async () => {
      // Create mock node_modules structure
      const radixPath = path.join(tempDir, 'node_modules/@radix-ui/themes');
      await fs.promises.mkdir(radixPath, { recursive: true });
      await fs.promises.writeFile(path.join(radixPath, 'package.json'), '{"name": "@radix-ui/themes"}');

      const sources = await detector.detectAll();
      
      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({
        type: 'radix',
        confidence: 0.9,
        description: 'Radix UI theme tokens'
      });
    });

    test('should detect radix config files', async () => {
      await fs.promises.writeFile(
        path.join(tempDir, 'radix.config.js'), 
        'export default { theme: { colors: { primary: "#000" } } }'
      );

      const sources = await detector.detectAll();
      
      expect(sources).toHaveLength(1);
      expect(sources[0].type).toBe('radix');
      expect(sources[0].path).toContain('radix.config.js');
    });
  });

  describe('Tailwind Config Detection', () => {
    test('should detect tailwind.config.js', async () => {
      await fs.promises.writeFile(
        path.join(tempDir, 'tailwind.config.js'),
        'module.exports = { theme: { extend: { colors: { primary: "#000" } } } }'
      );

      const sources = await detector.detectAll();
      
      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({
        type: 'tailwind',
        confidence: 0.9,
        description: 'Tailwind CSS configuration'
      });
    });

    test('should detect all Tailwind config variants', async () => {
      const configs = [
        'tailwind.config.js',
        'tailwind.config.ts', 
        'tailwind.config.mjs',
        'tailwind.config.cjs'
      ];

      for (const config of configs) {
        await fs.promises.writeFile(
          path.join(tempDir, config),
          'export default { theme: {} }'
        );
      }

      const sources = await detector.detectAll();
      
      expect(sources).toHaveLength(1); // Should detect first one and break
      expect(sources[0].type).toBe('tailwind');
    });
  });

  describe('CSS Variables Detection', () => {
    test('should detect CSS variables in common files', async () => {
      await fs.promises.writeFile(
        path.join(tempDir, 'src/globals.css'),
        `
        :root {
          --primary-color: #000;
          --secondary-color: #fff;
          --spacing-sm: 8px;
          --spacing-md: 16px;
          --spacing-lg: 24px;
          --font-size-base: 16px;
        }
        `
      );

      // Create src directory first
      await fs.promises.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.promises.writeFile(
        path.join(tempDir, 'src/globals.css'),
        `
        :root {
          --primary-color: #000;
          --secondary-color: #fff;
          --spacing-sm: 8px;
          --spacing-md: 16px;
          --spacing-lg: 24px;
          --font-size-base: 16px;
        }
        `
      );

      const sources = await detector.detectAll();
      
      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({
        type: 'css-variables',
        description: expect.stringContaining('6 variables found')
      });
      expect(sources[0].metadata.variableCount).toBe(6);
    });

    test('should ignore files with few CSS variables', async () => {
      await fs.promises.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.promises.writeFile(
        path.join(tempDir, 'src/globals.css'),
        ':root { --single-var: #000; }'
      );

      const sources = await detector.detectAll();
      
      expect(sources).toHaveLength(0); // Should be ignored (< 5 variables)
    });
  });

  describe('MUI Token Detection', () => {
    test('should detect MUI package in node_modules', async () => {
      const muiPath = path.join(tempDir, 'node_modules/@mui/material');
      await fs.promises.mkdir(muiPath, { recursive: true });
      await fs.promises.writeFile(path.join(muiPath, 'package.json'), '{"name": "@mui/material"}');

      const sources = await detector.detectAll();
      
      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({
        type: 'mui',
        confidence: 0.8,
        description: 'Material-UI theme system'
      });
    });

    test('should detect custom MUI theme files', async () => {
      await fs.promises.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.promises.writeFile(
        path.join(tempDir, 'src/theme.js'),
        `
        import { createTheme } from '@mui/material/styles';
        export const theme = createTheme({
          palette: { primary: { main: '#000' } }
        });
        `
      );

      const sources = await detector.detectAll();
      
      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({
        type: 'mui',
        confidence: 0.7,
        description: 'Custom MUI theme configuration'
      });
    });
  });

  describe('Style Dictionary Detection', () => {
    test('should detect style dictionary directories', async () => {
      const tokensDir = path.join(tempDir, 'tokens');
      await fs.promises.mkdir(tokensDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(tokensDir, 'colors.json'),
        '{"primary": {"value": "#000", "type": "color"}}'
      );
      await fs.promises.writeFile(
        path.join(tokensDir, 'spacing.json'), 
        '{"sm": {"value": "8px", "type": "dimension"}}'
      );

      const sources = await detector.detectAll();
      
      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({
        type: 'style-dictionary',
        description: expect.stringContaining('2 files')
      });
    });

    test('should detect style dictionary config files', async () => {
      await fs.promises.writeFile(
        path.join(tempDir, 'style-dictionary.config.js'),
        'module.exports = { source: ["tokens/**/*.json"] }'
      );

      const sources = await detector.detectAll();
      
      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({
        type: 'style-dictionary',
        confidence: 0.7
      });
    });
  });

  describe('Custom Token Detection', () => {
    test('should detect custom token files', async () => {
      await fs.promises.writeFile(
        path.join(tempDir, 'tokens.js'),
        `
        export const colors = {
          primary: '#000',
          secondary: '#fff'
        };
        export const spacing = {
          sm: '8px',
          md: '16px'
        };
        `
      );

      const sources = await detector.detectAll();
      
      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({
        type: 'custom',
        confidence: 0.6,
        description: 'Custom token definitions'
      });
      expect(sources[0].metadata).toMatchObject({
        hasColors: true,
        hasSpacing: true
      });
    });
  });

  describe('Figma Token Detection', () => {
    test('should detect Figma token exports', async () => {
      await fs.promises.writeFile(
        path.join(tempDir, 'figma-tokens.json'),
        JSON.stringify({
          $metadata: { version: "1.0" },
          global: {
            color: {
              primary: { value: "#000", type: "color" }
            }
          }
        }, null, 2)
      );

      const sources = await detector.detectAll();
      
      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({
        type: 'figma',
        confidence: 0.8,
        description: 'Figma token export'
      });
    });
  });

  describe('Detection Summary', () => {
    test('should generate comprehensive summary', async () => {
      // Create multiple token sources
      await fs.promises.writeFile(path.join(tempDir, 'tailwind.config.js'), 'module.exports = {}');
      await fs.promises.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.promises.writeFile(
        path.join(tempDir, 'src/globals.css'), 
        ':root { --color1: #000; --color2: #fff; --color3: #f00; --color4: #0f0; --color5: #00f; --color6: #ff0; }'
      );

      await detector.detectAll();
      const summary = detector.getSummary();
      
      expect(summary).toMatchObject({
        totalSources: 2,
        byType: {
          tailwind: 1,
          'css-variables': 1
        }
      });
      expect(summary.recommendations).toBeInstanceOf(Array);
    });

    test('should provide recommendations for no sources', async () => {
      await detector.detectAll();
      const summary = detector.getSummary();
      
      expect(summary.totalSources).toBe(0);
      expect(summary.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'setup',
            priority: 'high',
            message: expect.stringContaining('No token sources detected')
          })
        ])
      );
    });
  });

  describe('Performance', () => {
    test('should complete detection quickly', async () => {
      const start = performance.now();
      await detector.detectAll();
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});