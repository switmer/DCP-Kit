import { ConfigEvaluator } from './src/tokens/configEvaluator.js';

const evaluator = new ConfigEvaluator({ verbose: true });

console.log('🧪 Testing ConfigEvaluator...');

try {
  console.log('📄 Testing Tailwind config...');
  const tailwindResult = await evaluator.evaluateConfig('./demo/tailwind.config.js');
  console.log('✅ Tailwind SUCCESS:');
  console.log('Colors:', Object.keys(tailwindResult.theme?.extend?.colors || {}));
  console.log('Spacing:', Object.keys(tailwindResult.theme?.extend?.spacing || {}));
} catch (err) {
  console.error('❌ Tailwind ERROR:', err.message);
}

try {
  console.log('📄 Testing MUI theme...');
  const muiResult = await evaluator.evaluateConfig('./demo/mui-theme.js');
  console.log('✅ MUI SUCCESS:');
  console.log('Palette:', Object.keys(muiResult.palette || {}));
  console.log('Typography:', Object.keys(muiResult.typography || {}));
} catch (err) {
  console.error('❌ MUI ERROR:', err.message);
}