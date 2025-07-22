import fs from 'fs';

// Simple CSS custom property extractor
function extractCssCustomProperties(css) {
  const tokens = {};
  
  // Match CSS custom properties: --category-name: value;
  const customPropRegex = /--([a-zA-Z0-9-]+):\s*([^;]+);/g;
  
  let match;
  while ((match = customPropRegex.exec(css)) !== null) {
    const [, propName, value] = match;
    
    // Split property name by dash to get category and name
    const parts = propName.split('-');
    const category = parts[0] || 'misc';
    const name = parts.slice(1).join('-') || propName;
    
    // Infer type from value
    const trimmedValue = value.trim();
    let type = 'string';
    
    if (trimmedValue.includes('hsl') || trimmedValue.includes('rgb') || trimmedValue.startsWith('#')) {
      type = 'color';
    } else if (trimmedValue.match(/\d+(px|rem|em|%)/)) {
      type = 'spacing';
    } else if (trimmedValue.match(/\d+(\.\d+)?s/)) {
      type = 'duration';
    } else if (trimmedValue.match(/\d{3}/)) {
      type = 'fontWeight';
    }
    
    if (!tokens[category]) tokens[category] = {};
    tokens[category][name] = {
      value: trimmedValue,
      type,
      source: 'globals.css'
    };
  }
  
  return tokens;
}

const css = fs.readFileSync('roster/src/app/globals.css', 'utf-8');
const tokens = extractCssCustomProperties(css);

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