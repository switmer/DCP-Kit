/**
 * Import DTCG tokens into DCP registry
 */

import fs from 'fs/promises';
import path from 'path';
import { importFromDTCG, validateDTCG } from '../core/tokenDTCG.js';

export async function runImportTokens(dtcgPath, options = {}) {
  const {
    registry: registryPath = 'registry.json',
    merge = false,
    validate = true,
    json = false
  } = options;

  try {
    // Read DTCG tokens
    const dtcg = JSON.parse(
      await fs.readFile(dtcgPath, 'utf-8')
    );

    // Validate if requested
    if (validate) {
      const errors = validateDTCG(dtcg);
      if (errors.length > 0) {
        console.error('❌ DTCG validation failed:');
        errors.forEach(err => console.error(`  - ${err}`));
        process.exit(1);
      }
    }

    // Read existing registry if merging
    let existingRegistry = null;
    if (merge) {
      try {
        existingRegistry = JSON.parse(
          await fs.readFile(registryPath, 'utf-8')
        );
      } catch (error) {
        if (!json) {
          console.warn(`⚠️  No existing registry found at ${registryPath}, creating new`);
        }
      }
    }

    // Convert to DCP format
    const dcp = importFromDTCG(dtcg, {
      merge,
      registry: existingRegistry
    });

    // Write output
    const outPath = path.resolve(process.cwd(), registryPath);
    await fs.writeFile(
      outPath,
      JSON.stringify(dcp, null, 2)
    );

    if (!json) {
      console.log(`✅ ${merge ? 'Merged' : 'Imported'} DTCG tokens to ${outPath}`);
      console.log(`   ${Object.keys(dcp.tokens).length} token groups ${merge ? 'total' : 'imported'}`);
    }

    return dcp;

  } catch (error) {
    if (!json) {
      console.error('❌ Token import failed:', error.message);
    }
    throw error;
  }
}