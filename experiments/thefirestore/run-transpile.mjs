#!/usr/bin/env node
/**
 * Direct invocation of runTranspile for the thefirestore experiment.
 * Same pattern as experiments/bungee-pro/run-transpile.mjs — routes around
 * the stubbed CLI command at src/cli/dev/transpile.js.
 */
import { runTranspile } from '../../packages/dcp-toolkit/src/commands/transpile.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run(registry, outDir, label) {
  const registryPath = path.join(__dirname, registry);
  const outputPath = path.join(__dirname, outDir);
  console.log(`\n→ Transpiling ${label}`);
  console.log(`  registry: ${registryPath}`);
  console.log(`  output:   ${outputPath}`);
  const result = await runTranspile(registryPath, {
    target: 'react',
    out: outputPath,
    format: 'typescript',
    includeStories: false,
    includeStyles: true,
  });
  console.log(`  components generated: ${result?.summary?.componentsGenerated ?? '?'}`);
  return result;
}

const args = process.argv.slice(2);
if (args[0] === 'clean') {
  await run('registry.json', 'generated', 'CLEAN registry');
} else if (args[0] === 'failure') {
  await run('registry-failure-case.json', 'generated-failure-case', 'FAILURE-CASE registry');
} else {
  await run('registry.json', 'generated', 'CLEAN registry');
  await run('registry-failure-case.json', 'generated-failure-case', 'FAILURE-CASE registry');
}
