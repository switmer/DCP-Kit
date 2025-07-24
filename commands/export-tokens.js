/**
 * Export DCP registry tokens to DTCG format
 */

import fs from 'fs/promises';
import path from 'path';
import { exportToDTCG, validateDTCG } from '../core/tokenDTCG.js';

export async function runExportTokens(registryPath, options = {}) {
  const {
    out = 'design.tokens.json',
    validate = true,
    extensions = true,
    groupPrefix = '',
    json = false
  } = options;

  try {
    // Read registry
    const registry = JSON.parse(
      await fs.readFile(registryPath, 'utf-8')
    );

    // Convert to DTCG
    const dtcg = exportToDTCG(registry.tokens || {}, {
      includeExtensions: extensions,
      groupPrefix
    });

    // Validate if requested
    if (validate) {
      const errors = validateDTCG(dtcg);
      if (errors.length > 0) {
        console.error('❌ DTCG validation failed:');
        errors.forEach(err => console.error(`  - ${err}`));
        process.exit(1);
      }
    }

    // Write output
    const outPath = path.resolve(process.cwd(), out);
    await fs.writeFile(
      outPath,
      JSON.stringify(dtcg, null, 2)
    );

    if (!json) {
      console.log(`✅ Exported DTCG tokens to ${outPath}`);
      console.log(`   ${Object.keys(dtcg).filter(key => !key.startsWith('$')).length} token groups exported`);
    }

    return dtcg;

  } catch (error) {
    if (!json) {
      console.error('❌ Token export failed:', error.message);
    }
    throw error;
  }
}