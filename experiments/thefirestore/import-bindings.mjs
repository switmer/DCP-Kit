#!/usr/bin/env node
/**
 * Thin wrapper — logic lives in ../lib/import-bindings.mjs.
 * Run: `node experiments/thefirestore/import-bindings.mjs`
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { runForExperiment } from '../lib/import-bindings.mjs';

await runForExperiment(path.dirname(fileURLToPath(import.meta.url)));
