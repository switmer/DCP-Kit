import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/register.tsx', 'src/preset.ts'],
  splitting: false,
  format: ['cjs'], // Storybook manager expects CommonJS
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@storybook/manager-api',
    '@storybook/components',
    '@storybook/theming'
  ],
  dts: true,
  clean: true
});