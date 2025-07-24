import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/register.tsx',
  output: {
    file: 'dist/register.js',
    format: 'es',
    sourcemap: false
  },
  external: (id) => {
    // External ALL node_modules and React-related imports
    return id.includes('node_modules') || 
           id.startsWith('react') || 
           id.startsWith('@storybook') ||
           id.includes('/components/') ||
           id.includes('/websocket-client') ||
           id.includes('/types');
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
      declarationMap: false
    })
  ]
};