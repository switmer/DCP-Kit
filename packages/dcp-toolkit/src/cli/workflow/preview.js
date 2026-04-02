/**
 * preview.js
 * CLI action to run extraction on a source directory into a temporary location,
 * compute a diff versus an existing registry, and print the diff without
 * mutating the working registry. First cut: unified JSON diff in console.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { diffLines, createTwoFilesPatch } from 'diff';
import chalk from 'chalk';
import { jsonError } from '../output.js';

export default async function preview(source, options) {
  try {
    const tmpDir = options.output ?? path.join(os.tmpdir(), 'dcp-preview-' + Date.now());

    // Ensure temp dir exists
    fs.mkdirSync(tmpDir, { recursive: true });

    // Dynamically import runExtract (avoids circular dep with CLI)
    const { runExtract } = await import('../../../commands/extract-v3.js');

    if (!options.json) {
      console.log(chalk.cyan(`🔍 Running extraction in preview mode for ${source}…`));
    }

    // Run extraction. We suppress stdout by not passing verbose.
    const result = await runExtract(source, {
      output: tmpDir,
      adaptor: options.adaptor,
      autoDetectTokens: options.autoDetectTokens,
      // Force silent, json output we don't need.
      json: true,
    });

    // Path to newly generated registry.json inside tmpDir
    const newRegistryPath = path.join(result.outputDir, 'registry.json');
    const existingRegistryPath = path.join(options.registry ?? './registry', 'registry.json');

    if (!fs.existsSync(existingRegistryPath)) {
      console.error(chalk.red(`❌ Existing registry not found at ${existingRegistryPath}`));
      process.exit(1);
    }

    const oldContent = fs.readFileSync(existingRegistryPath, 'utf-8');
    const newContent = fs.readFileSync(newRegistryPath, 'utf-8');

    if (options.json) {
      // Provide machine-readable diff lines
      const diff = diffLines(oldContent, newContent);
      console.log(JSON.stringify(diff, null, 2));
      return;
    }

    // Human-readable unified diff
    const patch = createTwoFilesPatch('registry.json (old)', 'registry.json (new)', oldContent, newContent, '', '', { context: Number(options.context || 3) });

    if (options.noColor) {
      console.log(patch);
    } else {
      // simple colorization: lines starting with + green, - red
      patch.split('\n').forEach(line => {
        if (line.startsWith('+')) {
          console.log(chalk.green(line));
        } else if (line.startsWith('-')) {
          console.log(chalk.red(line));
        } else {
          console.log(line);
        }
      });
    }

    // Clean up temp dir unless user specified a path
    if (!options.output) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } else if (!options.json && !options.noColor) {
      console.log(chalk.gray(`🗑️  Preview output kept at ${tmpDir}`));
    }
  } catch (err) {
    if (options.json) {
      jsonError(err);
    } else {
      console.error(chalk.red('❌ Preview failed:'), err.message);
    }
    process.exit(1);
  }
}