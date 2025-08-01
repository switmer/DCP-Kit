// Debug script to reproduce the test scenario exactly
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const testDir = './debug-temp';
const cliPath = './packages/dcp-toolkit/bin/dcp.js';

// Clean up
try {
  await fs.rm(testDir, { recursive: true, force: true });
} catch {}

await fs.mkdir(testDir, { recursive: true });

const registry = {
  name: 'unused-variant-test',
  version: '1.0.0',
  components: [
    {
      name: 'Badge',
      variants: {
        primary: { className: 'badge-primary' },
        secondary: { className: 'badge-secondary' },
        danger: { className: 'badge-danger' },
        success: { className: 'badge-success' }  // Not used in examples
      },
      examples: [
        '<Badge variant="primary" text="Primary" />',
        '<Badge variant="secondary" text="Secondary" />',
        '<Badge variant="danger" text="Danger" />'
      ]
    }
  ]
};

const registryPath = path.join(testDir, 'unused-variant.json');
await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

const { stdout } = await execAsync(
  `node "${cliPath}" validate-registry "${registryPath}" --strict --json`
);

const result = JSON.parse(stdout.trim());
console.log('Full result:', JSON.stringify(result, null, 2));

// Test condition
if (result.warnings) {
  console.log('\nWarnings found:');
  result.warnings.forEach((w, i) => {
    console.log(`${i+1}. "${w}"`);
    console.log(`   Contains 'success': ${w.includes('success')}`);
    console.log(`   Contains 'unused': ${w.includes('unused')}`);
    console.log(`   Contains 'Unused': ${w.includes('Unused')}`);
    console.log(`   Test condition: ${w.includes('success') && w.includes('unused')}`);
  });
} else {
  console.log('No warnings found!');
}

// Clean up
await fs.rm(testDir, { recursive: true, force: true });