import { glob } from 'glob';
import path from 'path';

/**
 * Recursively list code files in a repository with glob filters
 * @param {string} root - Root directory to start crawling from
 * @param {string[]} patterns - Glob patterns to match files against
 * @returns {Promise<string[]>} Array of matching file paths
 */
export async function crawlRepository(root, patterns = ['**/*.tsx', '**/*.jsx']) {
  try {
    const files = await glob(patterns, {
      cwd: root,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    return files.map(file => path.relative(process.cwd(), file));
  } catch (err) {
    throw new Error(`Failed to crawl repository: ${err.message}`);
  }
} 