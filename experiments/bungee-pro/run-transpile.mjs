#!/usr/bin/env node
/**
 * Direct invocation of runTranspile for the bungee-pro experiment.
 *
 * Why this script exists: the new modular CLI at src/cli/dev/transpile.js is a
 * stub that prints "Transpile command is under development". The working
 * transpile logic is src/commands/transpile.js (same entry point the test suite
 * uses — see tests/unit/transpile.test.js:130). This wrapper calls it directly.
 *
 * This is recorded in FINDINGS.md as a current-implementation gap.
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
