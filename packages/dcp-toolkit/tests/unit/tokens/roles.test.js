/**
 * @jest-environment node
 */
import {
  CONTRACT_VERSION,
  COLOR_ROLES,
  TYPOGRAPHY_ROLES,
  SPACING_ROLES,
  isColorRole,
  isTypographyRole,
  isSpacingRole,
  isValidRole,
  getRoleDefinition,
  getRoleIds,
  validateBindings,
} from '../../../src/tokens/roles.js';

describe('Canonical Role Enum', () => {

  test('CONTRACT_VERSION is a semver string', () => {
    expect(CONTRACT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('COLOR_ROLES has expected core roles', () => {
    const ids = Object.keys(COLOR_ROLES);
    expect(ids).toContain('bg.default');
    expect(ids).toContain('text.primary');
    expect(ids).toContain('border.default');
    expect(ids).toContain('accent.primary');
    expect(ids).toContain('intent.danger');
  });

  test('TYPOGRAPHY_ROLES has expected core roles', () => {
    const ids = Object.keys(TYPOGRAPHY_ROLES);
    expect(ids).toContain('text.body');
    expect(ids).toContain('text.h1');
    expect(ids).toContain('text.caption');
    expect(ids).toContain('text.button');
  });

  test('SPACING_ROLES has 5 scale steps', () => {
    expect(Object.keys(SPACING_ROLES)).toHaveLength(5);
    expect(Object.keys(SPACING_ROLES)).toEqual([
      'space.xs', 'space.sm', 'space.md', 'space.lg', 'space.xl',
    ]);
  });

  test('all role objects have category and description', () => {
    const allRoles = { ...COLOR_ROLES, ...TYPOGRAPHY_ROLES, ...SPACING_ROLES };
    for (const [id, def] of Object.entries(allRoles)) {
      expect(def).toHaveProperty('category');
      expect(def).toHaveProperty('description');
      expect(typeof def.category).toBe('string');
      expect(typeof def.description).toBe('string');
    }
  });

  test('role enums are frozen', () => {
    expect(Object.isFrozen(COLOR_ROLES)).toBe(true);
    expect(Object.isFrozen(TYPOGRAPHY_ROLES)).toBe(true);
    expect(Object.isFrozen(SPACING_ROLES)).toBe(true);
  });
});

describe('Role validation helpers', () => {

  test('isColorRole recognizes color roles', () => {
    expect(isColorRole('bg.default')).toBe(true);
    expect(isColorRole('text.primary')).toBe(true);
    expect(isColorRole('intent.danger')).toBe(true);
    expect(isColorRole('text.body')).toBe(false); // typography, not color
    expect(isColorRole('space.md')).toBe(false);
    expect(isColorRole('nonsense')).toBe(false);
  });

  test('isTypographyRole recognizes typography roles', () => {
    expect(isTypographyRole('text.body')).toBe(true);
    expect(isTypographyRole('text.h1')).toBe(true);
    expect(isTypographyRole('bg.default')).toBe(false);
  });

  test('isSpacingRole recognizes spacing roles', () => {
    expect(isSpacingRole('space.md')).toBe(true);
    expect(isSpacingRole('space.xs')).toBe(true);
    expect(isSpacingRole('bg.default')).toBe(false);
  });

  test('isValidRole accepts any valid role', () => {
    expect(isValidRole('bg.default')).toBe(true);
    expect(isValidRole('text.body')).toBe(true);
    expect(isValidRole('space.md')).toBe(true);
    expect(isValidRole('invalid.role')).toBe(false);
  });

  test('getRoleDefinition returns definition or null', () => {
    const def = getRoleDefinition('bg.default');
    expect(def).toEqual({ category: 'surface', description: expect.any(String) });
    expect(getRoleDefinition('nonexistent')).toBeNull();
  });

  test('getRoleIds returns all IDs or filtered by domain', () => {
    const all = getRoleIds();
    expect(all.length).toBe(
      Object.keys(COLOR_ROLES).length +
      Object.keys(TYPOGRAPHY_ROLES).length +
      Object.keys(SPACING_ROLES).length
    );

    const colorIds = getRoleIds('color');
    expect(colorIds.length).toBe(Object.keys(COLOR_ROLES).length);
    expect(colorIds).toContain('bg.default');
    expect(colorIds).not.toContain('text.body');
  });
});

describe('validateBindings', () => {

  test('accepts valid bindings', () => {
    const result = validateBindings({
      color: {
        'bg.default': { token: '--background', confidence: 0.95, source: 'auto' },
        'text.primary': { token: '--foreground', confidence: 0.90, source: 'manual' },
      },
      typography: {},
      spacing: {},
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects unknown role IDs', () => {
    const result = validateBindings({
      color: {
        'bg.imaginary': { token: '--x', confidence: 0.5, source: 'auto' },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Unknown role/);
  });

  test('rejects missing token field', () => {
    const result = validateBindings({
      color: {
        'bg.default': { confidence: 0.5, source: 'auto' },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Missing "token"/);
  });

  test('rejects invalid confidence', () => {
    const result = validateBindings({
      color: {
        'bg.default': { token: '--bg', confidence: 1.5, source: 'auto' },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Invalid confidence/);
  });

  test('rejects invalid source', () => {
    const result = validateBindings({
      color: {
        'bg.default': { token: '--bg', confidence: 0.5, source: 'magic' },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Invalid source/);
  });

  test('rejects null/non-object input', () => {
    expect(validateBindings(null).valid).toBe(false);
    expect(validateBindings('string').valid).toBe(false);
  });
});
