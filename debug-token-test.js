// Debug script for token validation
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
  name: 'token-format-test',
  version: '1.0.0',
  components: [
    {
      name: 'FormatTest',
      tokens: {
        'color.valid': '#ff0000',
        'color.invalid': 'not-a-color',
        'spacing.valid': '16px',
        'spacing.invalid': 'invalid-spacing',
        'number.valid': 42,
        'number.invalid': 'not-a-number'
      }
    }
  ]
};

const registryPath = path.join(testDir, 'token-formats.json');
await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

const { stdout } = await execAsync(
  `node "${cliPath}" validate-registry "${registryPath}" --strict-tokens --json`
);

const result = JSON.parse(stdout.trim());
console.log('Full result:', JSON.stringify(result, null, 2));

// Test conditions  
if (result.warnings || result.errors) {
  const issues = [...(result.errors || []), ...(result.warnings || [])];
  console.log('\nIssues found:');
  issues.forEach((issue, i) => {
    console.log(`${i+1}. "${issue}"`);
    console.log(`   Contains 'not-a-color': ${issue.includes('not-a-color')}`);
    console.log(`   Contains 'invalid-spacing': ${issue.includes('invalid-spacing')}`);
  });
  
  console.log(`\nTest condition 1: ${issues.some(issue => issue.includes('not-a-color'))}`);
  console.log(`Test condition 2: ${issues.some(issue => issue.includes('invalid-spacing'))}`);
} else {
  console.log('No issues found!');
}

// Clean up
await fs.rm(testDir, { recursive: true, force: true });