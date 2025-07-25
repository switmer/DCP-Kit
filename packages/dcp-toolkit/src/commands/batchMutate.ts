import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { applyPatch, compare } from 'fast-json-patch';
import { Command } from 'commander';

const ajv = new Ajv({ allErrors: true });

function readJSON(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function validateWithSchema(data: any, schemaPath: string) {
  const schema = readJSON(schemaPath);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    throw new Error('Schema validation failed: ' + ajv.errorsText(validate.errors));
  }
}

const program = new Command();
program
  .argument('<ir>', 'Input IR JSON file')
  .argument('<patch>', 'JSON Patch file')
  .argument('<output>', 'Output mutated IR file')
  .option('--undo <undo>', 'Write undo patch to this file')
  .option('--schema <schema>', 'Path to schema for validation', 'schemas/manifest.schema.json')
  .action((ir, patch, output, options) => {
    const irData = readJSON(ir);
    const patchData = readJSON(patch);
    const original = JSON.parse(JSON.stringify(irData));
    const mutated = applyPatch(irData, patchData, true, false).newDocument;

    // Validate mutated IR
    validateWithSchema(mutated, options.schema);

    // Write mutated IR
    writeJSON(output, mutated);
    console.log(`✅ Mutated IR written to ${output}`);

    // Optionally write undo patch
    if (options.undo) {
      const undoPatch = compare(mutated, original);
      writeJSON(options.undo, undoPatch);
      console.log(`↩️  Undo patch written to ${options.undo}`);
    }
  });

program.parse(process.argv); 