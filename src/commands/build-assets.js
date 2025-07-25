/**
 * Build platform-specific artifacts (CSS, Android XML, iOS, etc.)
 * from a DTCG-compatible token file using Style Dictionary.
 *
 * This is an OPTIONAL feature. Style Dictionary is required only when
 * this command is called. Users can install it with:
 *   pnpm add -D style-dictionary
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Dynamically load Style Dictionary, printing a helpful message if it’s absent.
 */
async function getStyleDictionary() {
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    // eslint-disable-next-line import/no-extraneous-dependencies
    return require('style-dictionary');
  } catch (err) {
    console.error('❌  style-dictionary is not installed.');
    console.error('    Install with: pnpm add -D style-dictionary');
    process.exit(1);
  }
}

/**
 * Build assets for given token file.
 *
 * @param {string} tokenFile – path to DTCG token JSON (default design.tokens.json)
 * @param {object} opts – { platform, out, theme }
 */
export async function runBuildAssets(tokenFile = 'design.tokens.json', opts = {}) {
  const SD = await getStyleDictionary();

  const {
    platform,          // e.g. 'css'
    out = 'build/',     // output directory
    theme,             // optional: build only a theme group path
    json = false,
  } = opts;

  // Resolve token JSON
  const tokenPath = path.resolve(process.cwd(), tokenFile);
  const tokensRaw = JSON.parse(await fs.readFile(tokenPath, 'utf-8'));

  // If a theme key is provided, slice tokens to that namespace
  const sourceTokens = theme ? { [theme]: tokensRaw.tokens[theme] } : tokensRaw.tokens;

  // Map into SD-friendly structure
  const sdTokens = Object.fromEntries(
    Object.entries(sourceTokens).map(([k, v]) => [k, v])
  );

  // We’ll use SD’s in-memory extend API with a custom parser to inject tokens
  const STYLE_DICTIONARY_SOURCE = '__dcp_memory.tokens.json';
  SD.registerParser({
    pattern: new RegExp(STYLE_DICTIONARY_SOURCE.replace('.', '\\.') + '$'),
    parse: () => sdTokens,
  });

  // Default platform configs – users can override by editing build-assets.js
  const basePlatforms = {
    css: {
      transformGroup: 'css',
      buildPath: path.join(out, 'css/'),
      files: [{ destination: 'variables.css', format: 'css/variables' }],
    },
    android: {
      transformGroup: 'android',
      buildPath: path.join(out, 'android/'),
      files: [{ destination: 'tokens.xml', format: 'android/resources' }],
    },
    ios: {
      transformGroup: 'ios',
      buildPath: path.join(out, 'ios/'),
      files: [{ destination: 'StyleDictionary.swift', format: 'ios-swift/class.swift' }],
    },
  };

  const config = {
    source: [STYLE_DICTIONARY_SOURCE],
    platforms: basePlatforms,
  };

  const sd = SD.extend(config);
  platform ? sd.buildPlatform(platform) : sd.buildAllPlatforms();

  if (!json) {
    console.log(`✅  Assets built in ${path.resolve(out)}`);
  }
} 