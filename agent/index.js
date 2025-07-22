import { program } from 'commander';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { crawlRepository } from './tools/crawler.js';
import { extractComponentAPI } from './tools/extractors/component.js';
import { extractTokensUsed } from './tools/extractors/tokens.js';
import { writeSchema } from './tools/writers.js';
import { proposeRefactor } from './tools/refactors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

program
  .option('-p, --path <path>', 'Path to component source directory', './src')
  .option('-o, --output <path>', 'Output directory for DCP files', './dcp-registry')
  .option('--patterns <patterns...>', 'File patterns to match', ['**/*.tsx', '**/*.jsx'])
  .option('--loglevel <level>', 'Logging level (error, warn, info, debug)', 'info')
  .option('--dry-run', 'Show what would be done without writing files', false)
  .parse(process.argv);

const options = program.opts();

// Configure logging
const logLevels = ['error', 'warn', 'info', 'debug'];
const logLevel = logLevels.indexOf(options.loglevel);

function log(level, ...args) {
  const msgLevel = logLevels.indexOf(level);
  if (msgLevel <= logLevel) {
    console[level === 'info' ? 'log' : level](...args);
  }
}

async function processComponent(filePath, content) {
  try {
    log('debug', `Processing ${filePath}...`);

    // Extract component API (props, types, docs)
    const api = await extractComponentAPI(content);
    if (!api) {
      log('warn', `No component API found in ${filePath}`);
      return;
    }
    log('debug', 'Extracted component API');

    // Extract design tokens used
    const tokens = await extractTokensUsed(content);
    log('debug', `Found ${Object.values(tokens).flat().length} design tokens`);

    // Combine into DCP schema
    const schema = {
      name: path.basename(filePath, path.extname(filePath)),
      api,
      tokens,
      sourcePath: filePath
    };

    if (options.dryRun) {
      log('info', '\nWould write schema:', JSON.stringify(schema, null, 2));
      return;
    }

    // Write schema file
    const outputPath = path.join(
      options.output,
      'components',
      `${schema.name}.dcp.json`
    );
    await writeSchema(outputPath, schema);
    log('debug', `Wrote schema to ${outputPath}`);

    // Generate refactor proposals if needed
    const proposals = await proposeRefactor(schema);
    if (proposals) {
      const proposalPath = path.join(
        options.output,
        'proposals',
        `${schema.name}.md`
      );
      await writeSchema(proposalPath, proposals, 'md');
      log('debug', `Wrote refactor proposals to ${proposalPath}`);
    }

    log('info', `✓ Processed ${filePath}`);
  } catch (err) {
    log('error', `Failed to process ${filePath}:`, err);
  }
}

async function main() {
  try {
    // Validate input path exists
    try {
      await fs.access(options.path);
    } catch {
      log('error', `Input path does not exist: ${options.path}`);
      process.exit(1);
    }

    // Crawl repository for components
    const files = await crawlRepository(options.path, options.patterns);
    log('info', `Found ${files.length} component files`);

    if (files.length === 0) {
      log('warn', 'No component files found matching patterns:', options.patterns);
      process.exit(0);
    }

    // Process each component
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      await processComponent(file, content);
    }

    log('info', '\n🎉 DCP extraction complete!');
  } catch (err) {
    log('error', 'Agent failed:', err);
    process.exit(1);
  }
}

main(); 