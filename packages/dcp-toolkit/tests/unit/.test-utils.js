/**
 * Shared test utilities for unit tests
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Create a temporary test directory
 */
export function createTestDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dcp-test-'));
  return dir;
}

/**
 * Remove a test directory and all its contents
 */
export function cleanupTestDir(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Write JSON data to a file, creating parent directories as needed
 */
export function writeTestFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Read and parse a JSON file
 */
export function readTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}
