import { extractCssVariablesToTokens } from './core/cssParser.js';
import fs from 'fs';

const css = fs.readFileSync('roster/src/app/globals.css', 'utf-8');
const tokens = await extractCssVariablesToTokens(css);

fs.writeFileSync('roster-extracted-tokens.json', JSON.stringify(tokens, null, 2));

console.log('✅ Extracted', Object.keys(tokens).length, 'token categories');
console.log('📊 Categories:', Object.keys(tokens).join(', '));

// Show sample tokens
Object.entries(tokens).forEach(([category, categoryTokens]) => {
  console.log(`\n${category}:`, Object.keys(categoryTokens).length, 'tokens');
  const sample = Object.entries(categoryTokens).slice(0, 3);
  sample.forEach(([name, token]) => {
    console.log(`  --${category}-${name}: ${token.value} (${token.type})`);
  });
});