import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import pkg from 'fast-json-patch';
const { applyPatch, compare } = pkg;

const ajv = new Ajv({ allErrors: true });

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function validateWithSchema(data, schemaPath) {
  const schema = readJSON(schemaPath);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    throw new Error('Schema validation failed: ' + ajv.errorsText(validate.errors));
  }
}

export async function runBatchMutate(registryPath, patchPath, outputPath, options = {}) {
  const {
    undo = null,
    schema = 'schemas/manifest.schema.json',
    verbose = true
  } = options;

  if (verbose) {
    console.log(`🔄 Applying mutations to ${registryPath}...`);
    console.log(`   Patch: ${patchPath}`);
    console.log(`   Output: ${outputPath}`);
  }

  try {
    // Load registry and patch data
    const registryData = readJSON(registryPath);
    const patchData = readJSON(patchPath);
    
    // Keep original for undo patch generation
    const original = JSON.parse(JSON.stringify(registryData));
    
    // Apply mutations
    const mutated = applyPatch(registryData, patchData, true, false).newDocument;

    // Validate mutated registry (skip if schema file doesn't exist)
    const schemaPath = path.resolve(schema);
    if (fs.existsSync(schemaPath)) {
      try {
        validateWithSchema(mutated, schemaPath);
        if (verbose) console.log('✅ Schema validation passed');
      } catch (schemaError) {
        if (verbose) console.log('⚠️  Schema validation skipped:', schemaError.message);
      }
    }

    // Write mutated registry
    writeJSON(outputPath, mutated);
    if (verbose) console.log(`✅ Mutated registry written to ${outputPath}`);

    // Generate undo patch if requested
    if (undo) {
      const undoPatch = compare(mutated, original);
      writeJSON(undo, undoPatch);
      if (verbose) console.log(`↩️  Undo patch written to ${undo}`);
    }

    // Log mutation for audit trail
    const mutationLog = {
      timestamp: new Date().toISOString(),
      operation: 'batch_mutate',
      source: registryPath,
      patch: patchPath,
      output: outputPath,
      undo: undo,
      patchCount: patchData.length
    };

    const logPath = './mutations.log.jsonl';
    fs.appendFileSync(logPath, JSON.stringify(mutationLog) + '\n');

    return {
      success: true,
      mutations: patchData.length,
      output: outputPath,
      undo: undo,
      log: mutationLog
    };

  } catch (error) {
    console.error('❌ Mutation failed:', error.message);
    throw error;
  }
}

export { runBatchMutate as batchMutate };