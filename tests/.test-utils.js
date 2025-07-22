import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_DIR_PREFIX = 'dcp-transformer-test-';

/**
 * Creates a temporary directory for testing.
 * @returns {string} The path to the created temporary directory.
 */
export function createTestDir() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), TEST_DIR_PREFIX));
  return tempDir;
}

/**
 * Removes a directory and all its contents.
 * @param {string} dirPath The path to the directory to remove.
 */
export function cleanupTestDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Writes a JSON file to a specified path, creating directories if they don't exist.
 * @param {string} filePath Full path to the file.
 * @param {object} data The JSON data to write.
 */
export function writeTestFile(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Reads a JSON file from a specified path.
 * @param {string} filePath Full path to the file.
 * @returns {object | null} The parsed JSON data or null if an error occurs.
 */
export function readTestFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Failed to read test file ${filePath}:`, err);
    return null;
  }
} 