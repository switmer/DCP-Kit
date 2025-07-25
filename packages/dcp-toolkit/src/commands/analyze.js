import path from 'path';
import fs from 'fs';
import os from 'os';
import simpleGit from 'simple-git';
import { runBuild } from './build.js';

export async function analyzeRepo(source, opts) {
  const isUrl = /^https?:\/\//.test(source);
  const baseDir = isUrl
    ? path.join(os.tmpdir(), `.dcp-${Date.now()}`)
    : path.resolve(source);

  if (isUrl) {
    await simpleGit().clone(source, baseDir);
    console.log(`🔄 cloned → ${baseDir}`);
  }

  const cfg = {
    registryName: path.basename(baseDir),
    registryVersion: '0.1.0',
    componentSource: 'src/components',
    tokenSources: ['tokens/theme.json'],
    docsSource: 'docs',
    outputPath: path.join(baseDir, 'dcp-registry'),
    llmEnrichment: !!opts.llm,
    schemaVersion: '2025-05'
  };

  fs.writeFileSync(path.join(baseDir, 'dcp.config.json'), JSON.stringify(cfg, null, 2));
  await runBuild({ config: path.join(baseDir, 'dcp.config.json'), llm: !!opts.llm });
}
