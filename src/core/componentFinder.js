import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { validateComponentPatterns } from './configHandler.js';

/**
 * Find component files with intelligent path detection and validation
 * @param {string} basePath - Base directory to search in
 * @param {Object} options - Search options
 * @returns {Object} Found files and diagnostics
 */
export async function findComponentFiles(basePath, options = {}) {
  const {
    patterns: configPatterns,
    verbose = false,
    maxDepth = 5,
  } = options;

  // Validate patterns
  const patterns = validateComponentPatterns(configPatterns);

  const diagnostics = {
    searchedPaths: [],
    warnings: [],
    suggestions: []
  };

  if (verbose) {
    console.log(`🔍 Searching for components in: ${basePath}`);
    console.log(`🔍 Using patterns:`, patterns);
  }

  // Resolve and validate base path
  const absoluteBasePath = path.resolve(basePath);
  if (!fs.existsSync(absoluteBasePath)) {
    const error = `⚠️ Component directory not found: ${absoluteBasePath}`;
    if (verbose) {
      console.warn(error);
      console.warn(`💡 Current working directory: ${process.cwd()}`);
      console.warn(`💡 Resolved from: ${basePath}`);
      console.warn(`💡 Directory exists: ${fs.existsSync(path.dirname(absoluteBasePath)) ? 'Yes' : 'No'}`);
    }
    diagnostics.warnings.push(error);
    diagnostics.suggestions.push(
      `💡 Try creating the directory: mkdir -p ${absoluteBasePath}`,
      `💡 Check if the path in your config file is correct`
    );
    return { files: [], diagnostics };
  }

  if (verbose) {
    console.log(`✅ Found component directory at: ${absoluteBasePath}`);
  }

  // Search for component files
  const files = [];
  const searchedDirs = new Set();

  for (const pattern of patterns) {
    if (verbose) {
      console.log(`🔍 Searching with pattern: ${pattern}`);
    }

    const matches = await glob(pattern, {
      cwd: absoluteBasePath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      maxDepth,
      absolute: true
    });

    if (verbose) {
      console.log(`📁 Found ${matches.length} files matching ${pattern}`);
      matches.forEach(file => console.log(`   - ${path.relative(process.cwd(), file)}`));
    }

    files.push(...matches);
    
    // Track searched directories for diagnostics
    matches.forEach(match => {
      const dir = path.dirname(match);
      searchedDirs.add(dir);
    });
  }

  // Add searched paths to diagnostics
  diagnostics.searchedPaths = Array.from(searchedDirs);

  // If no files found, try to detect component directories
  if (files.length === 0) {
    if (verbose) {
      console.warn(`⚠️ No component files found in ${absoluteBasePath}`);
      console.warn(`➡️ Using patterns: ${patterns.join(', ')}`);
      console.warn(`📁 Directory exists: ${fs.existsSync(absoluteBasePath) ? 'Yes' : 'No'}`);
      console.warn(`📁 Directory contents:`, fs.readdirSync(absoluteBasePath));
    }

    const potentialDirs = await detectPotentialComponentDirs(absoluteBasePath, maxDepth, verbose);
    
    if (potentialDirs.length > 0) {
      diagnostics.warnings.push(`⚠️ No component files found in ${absoluteBasePath}`);
      diagnostics.suggestions.push(
        '💡 Found potential component directories:',
        ...potentialDirs.map(dir => `   - ${dir}`),
        '\n💡 Update your config to point to one of these directories'
      );

      if (verbose) {
        console.log('💡 Found potential component directories:');
        potentialDirs.forEach(dir => console.log(`   - ${dir}`));
      }
    } else {
      diagnostics.warnings.push(`⚠️ No component files or potential component directories found`);
      diagnostics.suggestions.push(
        '💡 Check your configuration:',
        '   - Ensure componentSource points to your component directory',
        '   - Verify you have .tsx or .jsx files',
        '   - Consider using componentPatterns in your config to specify custom patterns',
        '   - Check file permissions and access'
      );
    }
  }

  return { files, diagnostics };
}

/**
 * Detect directories that might contain components
 * @param {string} basePath - Base directory to search in
 * @param {number} maxDepth - Maximum directory depth to search
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Promise<string[]>} Potential component directories
 */
async function detectPotentialComponentDirs(basePath, maxDepth = 5, verbose = false) {
  const potentialDirs = [];
  
  // Common component directory names
  const componentDirPatterns = [
    '**/components',
    '**/Components',
    '**/ui',
    '**/UI',
    '**/primitives',
    '**/atoms',
    '**/molecules',
    '**/organisms'
  ];

  if (verbose) {
    console.log(`🔍 Searching for component directories in: ${basePath}`);
    console.log(`🔍 Using patterns:`, componentDirPatterns);
  }

  // Search for potential component directories
  for (const pattern of componentDirPatterns) {
    if (verbose) {
      console.log(`🔍 Searching for directories matching: ${pattern}`);
    }

    const matches = await glob(pattern, {
      cwd: basePath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      maxDepth,
      onlyDirectories: true
    });

    if (verbose && matches.length > 0) {
      console.log(`📁 Found ${matches.length} potential directories matching ${pattern}:`);
      matches.forEach(dir => console.log(`   - ${dir}`));
    }

    // Filter to directories that actually contain .tsx or .jsx files
    for (const match of matches) {
      const fullPath = path.join(basePath, match);
      const hasComponentFiles = await glob('**/*.{tsx,jsx}', {
        cwd: fullPath,
        ignore: ['**/node_modules/**'],
        maxDepth: 2
      });

      if (hasComponentFiles.length > 0) {
        const relativePath = path.relative(process.cwd(), fullPath);
        potentialDirs.push(relativePath);
        
        if (verbose) {
          console.log(`✅ Found components in: ${relativePath}`);
          hasComponentFiles.forEach(file => console.log(`   - ${file}`));
        }
      }
    }
  }

  return potentialDirs;
}

/**
 * Validate component file structure
 * @param {string} filePath - Path to component file
 * @returns {Object} Validation result
 */
export async function validateComponentFile(filePath) {
  const warnings = [];
  const suggestions = [];

  try {
    const content = await fs.promises.readFile(filePath, 'utf8');

    // Check for React component patterns
    if (!content.includes('React') && !content.includes('export')) {
      warnings.push(`⚠️ File may not export a React component: ${filePath}`);
      suggestions.push('💡 Ensure the file exports a React component');
    }

    // Check for TypeScript props interface/type
    if (filePath.endsWith('.tsx') && !content.includes('interface') && !content.includes('type')) {
      warnings.push(`⚠️ TypeScript component missing props interface/type: ${filePath}`);
      suggestions.push('💡 Consider adding a props interface/type for better type safety');
    }

    return { warnings, suggestions };
  } catch (error) {
    warnings.push(`❌ Failed to read component file: ${filePath}`);
    return { warnings, suggestions };
  }
} 