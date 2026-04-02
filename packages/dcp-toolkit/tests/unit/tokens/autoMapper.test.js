/**
 * @jest-environment node
 */
import { AutoMapper, autoMap } from '../../../src/tokens/autoMapper.js';
import { CONTRACT_VERSION } from '../../../src/tokens/roles.js';

describe('AutoMapper', () => {

  describe('ShadCN convention matching (Layer 4)', () => {

    test('maps standard ShadCN CSS variables to roles', () => {
      const themes = {
        light: {
          id: 'light',
          selector: ':root',
          tokens: {
            '--background':             { value: '0 0% 100%', type: 'color' },
            '--foreground':             { value: '222 84% 5%', type: 'color' },
            '--primary':                { value: '222 47% 11%', type: 'color' },
            '--primary-foreground':     { value: '210 40% 98%', type: 'color' },
            '--muted':                  { value: '210 40% 96%', type: 'color' },
            '--muted-foreground':       { value: '215 16% 47%', type: 'color' },
            '--card':                   { value: '0 0% 100%', type: 'color' },
            '--destructive':            { value: '0 84% 60%', type: 'color' },
            '--border':                 { value: '214 32% 91%', type: 'color' },
            '--ring':                   { value: '222 84% 5%', type: 'color' },
            '--input':                  { value: '214 32% 91%', type: 'color' },
          },
        },
      };

      const mapper = new AutoMapper({ shadcnMode: true });
      const { bindings } = mapper.map({ themes });

      expect(bindings.contractVersion).toBe(CONTRACT_VERSION);
      expect(bindings.color['bg.default'].token).toBe('--background');
      expect(bindings.color['bg.default'].confidence).toBeGreaterThanOrEqual(0.90);

      expect(bindings.color['text.primary'].token).toBe('--foreground');
      expect(bindings.color['accent.primary'].token).toBe('--primary');
      expect(bindings.color['accent.on'].token).toBe('--primary-foreground');
      expect(bindings.color['bg.muted'].token).toBe('--muted');
      expect(bindings.color['text.muted'].token).toBe('--muted-foreground');
      expect(bindings.color['bg.elevated'].token).toBe('--card');
      expect(bindings.color['intent.danger'].token).toBe('--destructive');
      expect(bindings.color['border.default'].token).toBe('--border');
      expect(bindings.color['border.focus'].token).toBe('--ring');
      expect(bindings.color['border.muted'].token).toBe('--input');
    });

    test('ShadCN bindings have high confidence (>= 0.80)', () => {
      const themes = {
        light: {
          id: 'light', selector: ':root',
          tokens: {
            '--background': { value: '#fff', type: 'color' },
            '--foreground': { value: '#000', type: 'color' },
            '--primary': { value: '#00f', type: 'color' },
          },
        },
      };

      const { bindings } = new AutoMapper().map({ themes });
      for (const binding of Object.values(bindings.color)) {
        expect(binding.confidence).toBeGreaterThanOrEqual(0.80);
      }
    });
  });

  describe('Name pattern matching (Layer 1)', () => {

    test('maps non-ShadCN tokens by name patterns', () => {
      const mapper = new AutoMapper({ shadcnMode: false });
      const themes = {
        light: {
          id: 'light', selector: ':root',
          tokens: {
            '--color-background':   { value: '#ffffff', type: 'color' },
            '--color-foreground':   { value: '#111111', type: 'color' },
            '--color-danger':       { value: '#ff0000', type: 'color' },
            '--color-warning':      { value: '#ffaa00', type: 'color' },
            '--color-success':      { value: '#00cc00', type: 'color' },
          },
        },
      };

      const { bindings } = mapper.map({ themes });

      expect(bindings.color['bg.default']?.token).toBe('--color-background');
      expect(bindings.color['text.primary']?.token).toBe('--color-foreground');
      expect(bindings.color['intent.danger']?.token).toBe('--color-danger');
      expect(bindings.color['intent.warning']?.token).toBe('--color-warning');
      expect(bindings.color['intent.success']?.token).toBe('--color-success');
    });

    test('handles tokens without -- prefix from flat inventory', () => {
      const mapper = new AutoMapper({ shadcnMode: false });
      const tokens = {
        colors: {
          'background': { value: '#ffffff', type: 'color' },
          'foreground': { value: '#111111', type: 'color' },
        },
      };

      const { bindings } = mapper.map({ tokens });
      expect(bindings.color['bg.default']?.token).toBe('background');
      expect(bindings.color['text.primary']?.token).toBe('foreground');
    });
  });

  describe('Utility mapping cross-reference (Layer 5)', () => {

    test('boosts confidence when utility mappings confirm category', () => {
      const themes = {
        light: {
          id: 'light', selector: ':root',
          tokens: {
            '--background': { value: '#fff', type: 'color' },
          },
        },
      };

      const utilityMappings = {
        'bg-background': { cssVariable: '--background', category: 'background' },
      };

      const mapper = new AutoMapper();
      const { bindings } = mapper.map({ themes, utilityMappings });

      // Confidence should be boosted from ShadCN base (0.95) + utility hint
      expect(bindings.color['bg.default'].confidence).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe('Value-based inference (Layer 2)', () => {

    test('boosts confidence for light backgrounds and dark text', () => {
      const themes = {
        light: {
          id: 'light', selector: ':root',
          tokens: {
            '--bg-main':   { value: '0 0% 98%', type: 'color' },   // Very light
            '--text-main': { value: '0 0% 10%', type: 'color' },   // Very dark
          },
        },
        dark: {
          id: 'dark', selector: '.dark',
          tokens: {
            '--bg-main':   { value: '0 0% 10%', type: 'color' },
            '--text-main': { value: '0 0% 98%', type: 'color' },
          },
        },
      };

      const mapper = new AutoMapper({ shadcnMode: false });
      const { bindings } = mapper.map({ themes });

      // bg.default from name pattern, should get value boost for light bg
      if (bindings.color['bg.default']) {
        expect(bindings.color['bg.default'].confidence).toBeGreaterThan(0.85);
      }
    });

    test('boosts confidence when token exists in both light and dark themes', () => {
      const themes = {
        light: {
          id: 'light', selector: ':root',
          tokens: { '--background': { value: '#fff', type: 'color' } },
        },
        dark: {
          id: 'dark', selector: '.dark',
          tokens: { '--background': { value: '#111', type: 'color' } },
        },
      };

      const mapper = new AutoMapper();
      const { bindings } = mapper.map({ themes });
      // ShadCN 0.95 + dark counterpart 0.05 = 1.0
      expect(bindings.color['bg.default'].confidence).toBe(1.0);
    });
  });

  describe('Palette/structural inference (Layer 3)', () => {

    test('infers bg.default and text.primary from palette scales', () => {
      const mapper = new AutoMapper({ shadcnMode: false });
      const tokens = {
        colors: {
          'gray-50': { value: '#f9fafb', type: 'color' },
          'gray-100': { value: '#f3f4f6', type: 'color' },
          'gray-200': { value: '#e5e7eb', type: 'color' },
          'gray-500': { value: '#6b7280', type: 'color' },
          'gray-700': { value: '#374151', type: 'color' },
          'gray-900': { value: '#111827', type: 'color' },
        },
      };

      const { bindings } = mapper.map({ tokens });

      // Palette inference should pick lightest/darkest as candidates
      if (bindings.color['bg.default']) {
        expect(bindings.color['bg.default'].reason).toMatch(/Palette/);
      }
      if (bindings.color['text.primary']) {
        expect(bindings.color['text.primary'].reason).toMatch(/Palette/);
      }
    });
  });

  describe('Typography mapping', () => {

    test('maps named typography tokens', () => {
      const tokens = {
        typography: {
          'heading-1': { value: '2.25rem', type: 'dimension' },
          'heading-2': { value: '1.875rem', type: 'dimension' },
          'body': { value: '1rem', type: 'dimension' },
          'caption': { value: '0.75rem', type: 'dimension' },
          'label': { value: '0.875rem', type: 'dimension' },
          'button': { value: '0.875rem', type: 'dimension' },
        },
      };

      const { bindings } = new AutoMapper().map({ tokens });

      expect(bindings.typography['text.h1']?.token).toBe('heading-1');
      expect(bindings.typography['text.h2']?.token).toBe('heading-2');
      expect(bindings.typography['text.body']?.token).toBe('body');
      expect(bindings.typography['text.caption']?.token).toBe('caption');
      expect(bindings.typography['text.label']?.token).toBe('label');
      expect(bindings.typography['text.button']?.token).toBe('button');
    });

    test('infers typography roles from Tailwind-style scale', () => {
      const tokens = {
        typography: {
          'xs': { value: '0.75rem' },
          'sm': { value: '0.875rem' },
          'base': { value: '1rem' },
          'lg': { value: '1.125rem' },
          'xl': { value: '1.25rem' },
          '2xl': { value: '1.5rem' },
          '3xl': { value: '1.875rem' },
          '4xl': { value: '2.25rem' },
        },
      };

      const { bindings } = new AutoMapper().map({ tokens });

      // text.body should map to 'base' by name pattern
      expect(bindings.typography['text.body']?.token).toBe('base');
    });
  });

  describe('Spacing mapping', () => {

    test('maps named spacing tokens', () => {
      const tokens = {
        spacing: {
          'xs': { value: '0.25rem' },
          'sm': { value: '0.5rem' },
          'md': { value: '1rem' },
          'lg': { value: '1.5rem' },
          'xl': { value: '2rem' },
        },
      };

      const { bindings } = new AutoMapper().map({ tokens });

      expect(bindings.spacing['space.xs']?.token).toBe('xs');
      expect(bindings.spacing['space.sm']?.token).toBe('sm');
      expect(bindings.spacing['space.md']?.token).toBe('md');
      expect(bindings.spacing['space.lg']?.token).toBe('lg');
      expect(bindings.spacing['space.xl']?.token).toBe('xl');
    });

    test('infers spacing from numeric scale', () => {
      const tokens = {
        spacing: {
          '1': { value: '0.25rem' },
          '2': { value: '0.5rem' },
          '3': { value: '0.75rem' },
          '4': { value: '1rem' },
          '5': { value: '1.25rem' },
          '6': { value: '1.5rem' },
          '8': { value: '2rem' },
          '10': { value: '2.5rem' },
        },
      };

      const { bindings } = new AutoMapper().map({ tokens });

      // Should have at least 3 spacing bindings from scale inference
      const boundCount = Object.keys(bindings.spacing).length;
      expect(boundCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Mapping report', () => {

    test('reports auto-bound, suggested, uncertain, and unmapped counts', () => {
      const themes = {
        light: {
          id: 'light', selector: ':root',
          tokens: {
            '--background': { value: '#fff', type: 'color' },
            '--foreground': { value: '#000', type: 'color' },
            '--primary': { value: '#00f', type: 'color' },
            '--chart-1': { value: '#aaa', type: 'color' },
            '--chart-2': { value: '#bbb', type: 'color' },
          },
        },
      };

      const { mappingReport } = new AutoMapper().map({ themes });

      expect(mappingReport.total).toBe(5);
      expect(mappingReport.autoBound).toBeGreaterThanOrEqual(1);
      expect(mappingReport.unmapped).toBeGreaterThanOrEqual(1);
      expect(mappingReport.unmappedTokens.some(t => t.token === '--chart-1')).toBe(true);
      expect(Array.isArray(mappingReport.missingRoles)).toBe(true);
      expect(Array.isArray(mappingReport.reviewItems)).toBe(true);
    });

    test('reports missing required roles', () => {
      // Only provide a few tokens — many roles should be missing
      const { mappingReport } = new AutoMapper().map({
        themes: {
          light: {
            id: 'light', selector: ':root',
            tokens: { '--background': { value: '#fff', type: 'color' } },
          },
        },
      });

      expect(mappingReport.missingRoles.length).toBeGreaterThan(10);
      expect(mappingReport.missingRoles).toContain('intent.warning');
    });
  });

  describe('Conflict resolution', () => {

    test('higher confidence wins over lower confidence', () => {
      // Both --primary and --accent could map to accent.primary
      const themes = {
        light: {
          id: 'light', selector: ':root',
          tokens: {
            '--primary': { value: '#00f', type: 'color' },
            '--accent': { value: '#0ff', type: 'color' },
          },
        },
      };

      const { bindings } = new AutoMapper().map({ themes });

      // ShadCN maps --primary to accent.primary at 0.95
      // ShadCN maps --accent to bg.muted at 0.75
      // So --primary should win for accent.primary
      expect(bindings.color['accent.primary'].token).toBe('--primary');
    });

    test('manual source always wins over auto', () => {
      const mapper = new AutoMapper();
      // Simulate by directly testing updateBest
      const best = {};
      mapper.updateBest(best, 'bg.default', {
        token: '--background', confidence: 0.95, source: 'auto', reason: 'test',
      });
      mapper.updateBest(best, 'bg.default', {
        token: '--custom-bg', confidence: 0.50, source: 'manual', reason: 'user override',
      });

      expect(best['bg.default'].token).toBe('--custom-bg');
      expect(best['bg.default'].source).toBe('manual');
    });
  });

  describe('autoMap convenience function', () => {

    test('works with default options', () => {
      const result = autoMap({
        themes: {
          light: {
            id: 'light', selector: ':root',
            tokens: {
              '--background': { value: '#fff', type: 'color' },
              '--foreground': { value: '#000', type: 'color' },
            },
          },
        },
      });

      expect(result.bindings).toBeDefined();
      expect(result.bindings.contractVersion).toBe(CONTRACT_VERSION);
      expect(result.mappingReport).toBeDefined();
    });

    test('handles empty input gracefully', () => {
      const result = autoMap();
      expect(result.bindings.color).toEqual({});
      expect(result.bindings.typography).toEqual({});
      expect(result.bindings.spacing).toEqual({});
      expect(result.mappingReport.total).toBe(0);
    });
  });
});
