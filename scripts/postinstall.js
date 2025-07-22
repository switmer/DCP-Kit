#!/usr/bin/env node

/*
  Simple peer dependency checker.
  Runs after install. If required peers are missing, prints a warning.
  Does NOT fail installation—our CI will enforce via npm ls.
*/
import { execSync } from 'child_process';

const peers = [
  'react',
  'react-dom',
  '@storybook/react'
];

let missing = [];

for (const pkg of peers) {
  try {
    execSync(`npm ls ${pkg} --depth=0`, { stdio: 'ignore' });
  } catch {
    missing.push(pkg);
  }
}

if (missing.length) {
  console.warn('[DCP] Warning: required peer dependencies not detected:', missing.join(', '));
  console.warn('[DCP]    The package will still function, but some features may be limited.');
} 