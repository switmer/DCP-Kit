import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

export function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Failed to read JSON file ${filePath}:`, err);
    return null;
  }
}

export function writeJSON(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Failed to write JSON file ${filePath}:`, err);
    return false;
  }
}

export function getAllFiles(dirPath, pattern = '**/*.{js,jsx,ts,tsx}') {
  try {
    if (global.verbose) {
      console.log(`🔍 Searching for files in ${dirPath} with pattern ${pattern}`);
    }
    
    if (!fs.existsSync(dirPath)) {
      if (global.verbose) {
        console.log(`⚠️ Directory does not exist: ${dirPath}`);
      }
      return [];
    }
    
    // Use relative paths (not absolute) for better compatibility with components
    const files = glob.sync(pattern, { cwd: dirPath });
    
    if (global.verbose) {
      console.log(`📁 Found ${files.length} files:`);
      files.forEach(f => console.log(`   - ${f}`));
    }
    
    return files;
  } catch (err) {
    console.error(`Failed to get files from ${dirPath}:`, err);
    return [];
  }
}

export const flatten = (obj, prefix = '', out = {}) => {
  Object.entries(obj).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    v?.value !== undefined
      ? (out[key] = v)
      : flatten(v, key, out);
  });
  return out;
};
