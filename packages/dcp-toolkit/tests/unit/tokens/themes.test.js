/**
 * @jest-environment node
 */
import {
  formalizeThemes,
  extractBindingHints,
  getAllTokenNames,
  resolveTokenValue,
} from '../../../src/tokens/themes.js';

describe('formalizeThemes', () => {

  test('returns empty object for null/undefined input', () => {
    expect(formalizeThemes(null)).toEqual({});
    expect(formalizeThemes(undefined)).toEqual({});
  });

  test('normalizes light/dark CSS variables into theme scopes', () => {
    const themeContext = {
      cssVariables: {
        light: {
          '--background': { value: '0 0% 100%', colorSpace: 'hsl-like', computed: '0 0% 100%' },
          '--foreground': { value: '222 84% 5%', colorSpace: 'hsl-like', computed: '222 84% 5%' },
        },
        dark: {
          '--background': { value: '222 84% 5%', colorSpace: 'hsl-like', computed: '222 84% 5%' },
          '--foreground': { value: '0 0% 98%', colorSpace: 'hsl-like', computed: '0 0% 98%' },
        },
      },
    };

    const themes = formalizeThemes(themeContext);

    expect(themes.light).toBeDefined();
    expect(themes.dark).toBeDefined();

    // Structure
    expect(themes.light.id).toBe('light');
    expect(themes.light.selector).toBe(':root');
    expect(themes.light.mediaQuery).toBe('(prefers-color-scheme: light)');
    expect(themes.dark.id).toBe('dark');
    expect(themes.dark.selector).toBe('.dark');

    // Tokens
    expect(themes.light.tokens['--background']).toEqual({
      value: '0 0% 100%',
      type: 'color',
      colorSpace: 'hsl-like',
    });
    expect(themes.dark.tokens['--foreground']).toEqual({
      value: '0 0% 98%',
      type: 'color',
      colorSpace: 'hsl-like',
    });
  });

  test('handles custom themes nested under "custom" key', () => {
    const themeContext = {
      cssVariables: {
        light: {
          '--primary': { value: '#0066cc', computed: '#0066cc' },
        },
        custom: {
          'brand-blue': {
            '--primary': { value: '#003399', computed: '#003399' },
          },
        },
      },
    };

    const themes = formalizeThemes(themeContext);

    expect(themes.light).toBeDefined();
    expect(themes['brand-blue']).toBeDefined();
    expect(themes['brand-blue'].id).toBe('brand-blue');
    expect(themes['brand-blue'].selector).toBeNull();
    expect(themes['brand-blue'].tokens['--primary'].value).toBe('#003399');
  });

  test('skips empty theme scopes', () => {
    const themeContext = {
      cssVariables: {
        light: { '--bg': { value: '#fff', computed: '#fff' } },
        dark: {},
      },
    };

    const themes = formalizeThemes(themeContext);
    expect(themes.light).toBeDefined();
    expect(themes.dark).toBeUndefined();
  });

  test('handles string-only variable values', () => {
    const themeContext = {
      cssVariables: {
        light: {
          '--radius': '0.5rem',
          '--font-sans': 'Inter, sans-serif',
        },
      },
    };

    const themes = formalizeThemes(themeContext);
    expect(themes.light.tokens['--radius'].value).toBe('0.5rem');
    expect(themes.light.tokens['--radius'].type).toBe('dimension');
    expect(themes.light.tokens['--font-sans'].type).toBe('typography');
  });

  test('respects selector overrides in options', () => {
    const themeContext = {
      cssVariables: {
        light: { '--bg': { value: '#fff', computed: '#fff' } },
        dark: { '--bg': { value: '#000', computed: '#000' } },
      },
    };

    const themes = formalizeThemes(themeContext, {
      selectors: { dark: '[data-theme="dark"]' },
    });

    expect(themes.dark.selector).toBe('[data-theme="dark"]');
    expect(themes.light.selector).toBe(':root'); // default unchanged
  });

  test('enriches themes from config', () => {
    const themeContext = {
      cssVariables: {
        light: { '--bg': { value: '#fff', computed: '#fff' } },
      },
      config: {
        prefix: 'ui',
        themingMode: 'css-variables',
      },
    };

    const themes = formalizeThemes(themeContext);
    expect(themes.light.prefix).toBe('ui');
    expect(themes.light.themingMode).toBe('css-variables');
  });

  test('infers token types correctly', () => {
    const themeContext = {
      cssVariables: {
        light: {
          '--background': { value: '222 47% 11%', colorSpace: 'hsl-like', computed: '222 47% 11%' },
          '--primary': { value: '#3b82f6', computed: '#3b82f6' },
          '--radius': { value: '0.5rem', computed: '0.5rem' },
          '--ring': { value: '210 40% 98%', colorSpace: 'hsl-like', computed: '210 40% 98%' },
        },
      },
    };

    const themes = formalizeThemes(themeContext);
    expect(themes.light.tokens['--background'].type).toBe('color');
    expect(themes.light.tokens['--primary'].type).toBe('color');
    expect(themes.light.tokens['--radius'].type).toBe('dimension');
    expect(themes.light.tokens['--ring'].type).toBe('color');
  });
});

describe('extractBindingHints', () => {

  test('returns empty object for null input', () => {
    expect(extractBindingHints(null)).toEqual({});
    expect(extractBindingHints(undefined)).toEqual({});
  });

  test('groups utility mappings by CSS variable', () => {
    const utilityMappings = {
      'bg-background': { cssVariable: '--background', category: 'background' },
      'text-foreground': { cssVariable: '--foreground', category: 'text' },
      'border-border': { cssVariable: '--border', category: 'border' },
      'bg-primary': { cssVariable: '--primary', category: 'background' },
      'text-primary': { cssVariable: '--primary', category: 'text' },
    };

    const hints = extractBindingHints(utilityMappings);

    expect(hints['--background']).toEqual({
      categories: ['background'],
      utilities: ['bg-background'],
    });
    expect(hints['--primary'].categories).toEqual(['background', 'text']);
    expect(hints['--primary'].utilities).toEqual(['bg-primary', 'text-primary']);
  });
});

describe('getAllTokenNames', () => {

  test('returns unique names across themes', () => {
    const themes = {
      light: { tokens: { '--bg': {}, '--fg': {} } },
      dark: { tokens: { '--bg': {}, '--accent': {} } },
    };

    const names = getAllTokenNames(themes);
    expect(names).toHaveLength(3);
    expect(names).toContain('--bg');
    expect(names).toContain('--fg');
    expect(names).toContain('--accent');
  });
});

describe('resolveTokenValue', () => {

  const themes = {
    light: {
      tokens: {
        '--background': { value: '0 0% 100%' },
        '--foreground': { value: '222 84% 5%' },
      },
    },
    dark: {
      tokens: {
        '--background': { value: '222 84% 5%' },
        '--foreground': { value: '0 0% 98%' },
      },
    },
  };

  test('resolves from requested theme', () => {
    const result = resolveTokenValue(themes, '--background', 'dark');
    expect(result.value).toBe('222 84% 5%');
    expect(result.theme).toBe('dark');
    expect(result.fallback).toBe(false);
  });

  test('falls back to light theme', () => {
    const limited = {
      light: { tokens: { '--special': { value: 'yes' } } },
      dark: { tokens: {} },
    };
    const result = resolveTokenValue(limited, '--special', 'dark');
    expect(result.value).toBe('yes');
    expect(result.theme).toBe('light');
    expect(result.fallback).toBe(true);
  });

  test('returns null for nonexistent token', () => {
    expect(resolveTokenValue(themes, '--nonexistent', 'light')).toBeNull();
  });
});
