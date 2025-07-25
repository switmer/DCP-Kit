// tests/dtcg.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  exportToDTCG, 
  importFromDTCG, 
  validateDTCG, 
  testRoundTrip 
} from '../../src/core/tokenDTCG.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('DTCG Token Conversion', () => {
  const testDir = path.join(__dirname, 'fixtures/dtcg');
  
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('DCP to DTCG Export', () => {
    test('should export simple DCP tokens to DTCG format', () => {
      const dcpTokens = {
        colors: {
          primary: {
            value: '#0066cc',
            type: 'color',
            description: 'Primary brand color'
          },
          secondary: {
            value: '#666666',
            type: 'color'
          }
        },
        spacing: {
          small: {
            value: '8px',
            type: 'spacing',
            description: 'Small spacing value'
          }
        }
      };

      const result = exportToDTCG(dcpTokens);

      expect(result.colors.primary).toEqual({
        $value: '#0066cc',
        $type: 'color',
        $description: 'Primary brand color',
        $extensions: {
          'com.dcp.transformer': {}
        }
      });

      expect(result.spacing.small).toEqual({
        $value: '8px',
        $type: 'dimension',
        $description: 'Small spacing value',
        $extensions: {
          'com.dcp.transformer': {}
        }
      });
    });

    test('should handle nested token groups', () => {
      const dcpTokens = {
        colors: {
          brand: {
            primary: {
              value: '#0066cc',
              type: 'color'
            },
            secondary: {
              value: '#666666', 
              type: 'color'
            }
          }
        }
      };

      const result = exportToDTCG(dcpTokens);

      expect(result.colors.brand.primary.$value).toBe('#0066cc');
      expect(result.colors.brand.secondary.$value).toBe('#666666');
    });

    test('should include metadata by default', () => {
      const dcpTokens = {
        colors: {
          primary: { value: '#0066cc', type: 'color' }
        }
      };

      const result = exportToDTCG(dcpTokens);

      expect(result.$description).toBeDefined();
      expect(result.$extensions).toBeDefined();
      expect(result.$extensions['com.dcp.transformer']).toBeDefined();
    });

    test('should exclude metadata when requested', () => {
      const dcpTokens = {
        colors: {
          primary: { value: '#0066cc', type: 'color' }
        }
      };

      const result = exportToDTCG(dcpTokens, { includeMetadata: false });

      expect(result.$description).toBeUndefined();
      expect(result.$extensions).toBeUndefined();
    });

    test('should add group prefix when specified', () => {
      const dcpTokens = {
        colors: {
          primary: { value: '#0066cc', type: 'color' }
        }
      };

      const result = exportToDTCG(dcpTokens, { groupPrefix: 'brand' });

      expect(result['brand.colors']).toBeDefined();
      expect(result.colors).toBeUndefined();
    });
  });

  describe('DTCG to DCP Import', () => {
    test('should import DTCG tokens to DCP format', () => {
      const dtcgTokens = {
        color: {
          primary: {
            $value: '#0066cc',
            $type: 'color',
            $description: 'Primary brand color'
          }
        },
        spacing: {
          small: {
            $value: '8px',
            $type: 'dimension',
            $description: 'Small spacing value'
          }
        }
      };

      const result = importFromDTCG(dtcgTokens);

      expect(result.color.primary).toEqual({
        value: '#0066cc',
        type: 'color',
        description: 'Primary brand color'
      });

      expect(result.spacing.small).toEqual({
        value: '8px',
        type: 'spacing',
        description: 'Small spacing value'
      });
    });

    test('should preserve DCP extensions', () => {
      const dtcgTokens = {
        color: {
          primary: {
            $value: '#0066cc',
            $type: 'color',
            $extensions: {
              'com.dcp.transformer': {
                category: 'brand',
                usage: ['buttons', 'links'],
                filePath: './tokens/colors.json'
              }
            }
          }
        }
      };

      const result = importFromDTCG(dtcgTokens);

      expect(result.color.primary).toEqual({
        value: '#0066cc',
        type: 'color',
        category: 'brand',
        usage: ['buttons', 'links'],
        filePath: './tokens/colors.json'
      });
    });

    test('should handle category mapping', () => {
      const dtcgTokens = {
        color: {
          primary: { $value: '#0066cc', $type: 'color' }
        }
      };

      const result = importFromDTCG(dtcgTokens, {
        categoryMapping: { color: 'colors' }
      });

      expect(result.colors).toBeDefined();
      expect(result.color).toBeUndefined();
    });

    test('should flatten groups when requested', () => {
      const dtcgTokens = {
        color: {
          brand: {
            primary: { $value: '#0066cc', $type: 'color' }
          }
        }
      };

      const result = importFromDTCG(dtcgTokens, { preserveGroups: false });

      expect(result.color['brand.primary']).toBeDefined();
      expect(result.color.brand).toBeUndefined();
    });
  });

  describe('Round-trip Conversion', () => {
    test('should maintain data integrity through round-trip conversion', () => {
      const originalDcpTokens = {
        colors: {
          primary: {
            value: '#0066cc',
            type: 'color',
            description: 'Primary brand color',
            category: 'brand',
            usage: ['buttons', 'links']
          },
          secondary: {
            value: '#666666',
            type: 'color'
          }
        },
        spacing: {
          small: { value: '8px', type: 'spacing' },
          medium: { value: '16px', type: 'spacing' },
          large: { value: '24px', type: 'spacing' }
        },
        typography: {
          'font-size': {
            body: { value: '16px', type: 'font-size' },
            heading: { value: '24px', type: 'font-size' }
          }
        }
      };

      // DCP -> DTCG -> DCP
      const dtcg = exportToDTCG(originalDcpTokens);
      const roundTrip = importFromDTCG(dtcg);

      // Remove metadata for comparison
      delete roundTrip.$metadata;

      // Compare structure and values
      expect(roundTrip.colors.primary.value).toBe(originalDcpTokens.colors.primary.value);
      expect(roundTrip.colors.primary.description).toBe(originalDcpTokens.colors.primary.description);
      expect(roundTrip.colors.primary.category).toBe(originalDcpTokens.colors.primary.category);
      expect(roundTrip.spacing.small.value).toBe(originalDcpTokens.spacing.small.value);
    });

    test('should pass automated round-trip test', () => {
      const dcpTokens = {
        colors: {
          primary: { value: '#0066cc', type: 'color' },
          secondary: { value: '#666666', type: 'color' }
        },
        spacing: {
          small: { value: '8px', type: 'spacing' },
          medium: { value: '16px', type: 'spacing' }
        }
      };

      // Mock console.log to capture output
      const originalLog = console.log;
      const logs = [];
      console.log = (...args) => logs.push(args.join(' '));

      try {
        const success = testRoundTrip(dcpTokens);
        expect(success).toBe(true);
        
        // Check that logging occurred
        expect(logs.some(log => log.includes('Round-trip conversion successful'))).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('DTCG Validation', () => {
    test('should validate correct DTCG structure', () => {
      const validTokens = {
        color: {
          primary: {
            $value: '#0066cc',
            $type: 'color'
          }
        }
      };

      const errors = validateDTCG(validTokens);
      expect(errors).toHaveLength(0);
    });

    test('should detect missing $value', () => {
      const invalidTokens = {
        color: {
          primary: {
            $type: 'color'
            // Missing $value
          }
        }
      };

      const errors = validateDTCG(invalidTokens);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Missing $value');
    });

    test('should detect invalid $type', () => {
      const invalidTokens = {
        color: {
          primary: {
            $value: '#0066cc',
            $type: 'invalid-type'
          }
        }
      };

      const errors = validateDTCG(invalidTokens);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Invalid $type');
    });
  });

  describe('CLI Integration', () => {
    test('should create test registry for CLI testing', () => {
      const testRegistry = {
        name: 'test-registry',
        version: '1.0.0',
        description: 'Test registry for DTCG functionality',
        components: [],
        tokens: {
          colors: {
            primary: {
              value: '#0066cc',
              type: 'color',
              description: 'Primary brand color'
            },
            secondary: {
              value: '#666666',
              type: 'color',
              description: 'Secondary color'
            }
          },
          spacing: {
            small: { value: '8px', type: 'spacing' },
            medium: { value: '16px', type: 'spacing' },
            large: { value: '24px', type: 'spacing' }
          },
          typography: {
            fonts: {
              body: { value: 'Inter, sans-serif', type: 'font-family' },
              heading: { value: 'Poppins, sans-serif', type: 'font-family' }
            },
            sizes: {
              small: { value: '14px', type: 'font-size' },
              medium: { value: '16px', type: 'font-size' },
              large: { value: '24px', type: 'font-size' }
            }
          }
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          source: 'test-fixture'
        }
      };

      const registryPath = path.join(testDir, 'test-registry.json');
      fs.writeFileSync(registryPath, JSON.stringify(testRegistry, null, 2));

      expect(fs.existsSync(registryPath)).toBe(true);
      
      const written = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(written.tokens.colors.primary.value).toBe('#0066cc');
    });
  });

  describe('Type Inference', () => {
    test('should correctly infer token types from values', () => {
      const dcpTokens = {
        mixed: {
          hexColor: { value: '#ff0000' },
          rgbColor: { value: 'rgb(255, 0, 0)' },
          dimension: { value: '16px' },
          duration: { value: '200ms' },
          fontFamily: { value: 'Inter, sans-serif' },
          number: { value: 42 }
        }
      };

      const result = exportToDTCG(dcpTokens);

      expect(result.mixed.hexColor.$type).toBe('color');
      expect(result.mixed.rgbColor.$type).toBe('color');
      expect(result.mixed.dimension.$type).toBe('dimension');
      expect(result.mixed.duration.$type).toBe('duration');
      expect(result.mixed.fontFamily.$type).toBe('fontFamily');
      expect(result.mixed.number.$type).toBe('number');
    });
  });
});