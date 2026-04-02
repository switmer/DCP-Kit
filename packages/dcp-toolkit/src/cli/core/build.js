/**
 * Build Command Implementation
 * Build DCP registry from configuration
 */

import { jsonError } from '../output.js';
import { missingDepMessage } from '../../utils/optionalImport.js';

export default async function build(options) {
  try {
    const { runBuild } = await import('../../../src/commands/build.js');
    const result = await runBuild({
      configPath: options.config,
      verbose: options.verbose || !options.json
    });
    
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        components: result.components?.length || 0,
        tokens: result.tokens?.length || 0,
        configPath: options.config,
        buildTime: result.buildTime
      }, null, 2));
    } else {
      console.log(`✅ Registry built successfully`);
      console.log(`📊 Components: ${result.components?.length || 0}`);
      console.log(`🎨 Tokens: ${result.tokens?.length || 0}`);
      console.log(`⚙️  Config: ${options.config}`);
    }
  } catch (error) {
    const installHint = missingDepMessage(error, 'dcp build', ['execa']);
    if (options.json) {
      jsonError(installHint ? new Error(installHint) : error);
    } else if (installHint) {
      console.error(`❌ ${installHint}`);
    } else {
      console.error('❌ Build failed:', error.message);
    }
    process.exit(1);
  }
}