import { readJSON, writeJSON, getAllFiles } from './utils.js';
import { enrichComponent, enrichToken } from './llmEnrichment.js';
import { loadOrCreateTokenFile } from '../tokens/legacyCssVarExtractor.js';
import { findComponentFiles, validateComponentFile } from './componentFinder.js';
import { parseTSX } from './parser.js';
import path from 'path';
import fs from 'fs';

export function flattenTokenTree(tokens, prefix = '') {
  const flattened = {};
  
  function processValue(value) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      if ('value' in value) return value;
      if ('css' in value) return { value: value.css };
    }
    return { value: String(value) };
  }

  function flatten(obj, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Skip internal or metadata fields
      if (key.startsWith('_') || key === 'meta' || key === 'metadata') continue;
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !('value' in value) && !('css' in value)) {
        flatten(value, currentPath);
      } else {
        const processed = processValue(value);
        if (processed) {
          flattened[currentPath] = processed;
        }
      }
    }
  }

  flatten(tokens);
  return flattened;
}

export function buildManifest({
  registryName,
  registryVersion,
  components,
  tokens,
  generator,
  outputPath,
  rootDir = process.cwd(),
  verbose = false
}) {
  if (!registryName || !registryVersion || !components || !tokens || !generator || !outputPath) {
    console.error('buildManifest missing required parameters:', { 
      registryName, 
      registryVersion, 
      components_isArray: Array.isArray(components), 
      tokens_isArray: Array.isArray(tokens), 
      generator_exists: !!generator, 
      outputPath 
    });
    throw new Error('buildManifest: Missing required configuration parameters');
  }

  // Process tokens if they're file references
  const processedTokens = Array.isArray(tokens) 
    ? tokens.map(t => ({
        name: t.name,
        path: t.path,
        tokens: loadOrCreateTokenFile(path.resolve(rootDir, t.path), verbose)
      }))
    : tokens;

  const manifest = {
    registryName,
    version: registryVersion,
    components: components.map(c => ({
      name: c.name,
      path: c.path,
      category: c.category || 'Components'
    })),
    tokens: processedTokens,
    generator,
    generated: new Date().toISOString()
  };

  // Write output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (verbose) {
      console.log(`📁 Created output directory: ${outputDir}`);
    }
  }

  writeJSON(outputPath, manifest);
  if (verbose) {
    console.log(`📦 Manifest written to ${outputPath}`);
  }
  return manifest;
}

export async function buildRegistry({ 
  componentsPath, 
  tokensPath, 
  outputPath,
  rootDir = process.cwd(),
  verbose = false,
  glob = null
}) {
  // Read and validate config
  if (!componentsPath || !tokensPath || !outputPath) {
    throw new Error('Missing required configuration');
  }

  // Resolve paths relative to rootDir
  const absoluteTokensPath = path.resolve(rootDir, tokensPath);
  const absoluteComponentsPath = path.resolve(rootDir, componentsPath);
  const absoluteOutputPath = path.resolve(rootDir, outputPath);

  // Read tokens with fallback
  const tokensData = loadOrCreateTokenFile(absoluteTokensPath, verbose);

  // Find and process components
  const { files: componentFiles, diagnostics } = await findComponentFiles(absoluteComponentsPath, {
    patterns: glob ? [glob] : undefined,
    verbose
  });

  // Log diagnostics if in verbose mode
  if (verbose) {
    diagnostics.warnings.forEach(warning => console.warn(warning));
    diagnostics.suggestions.forEach(suggestion => console.log(suggestion));
    
    if (diagnostics.searchedPaths.length > 0) {
      console.log('🔍 Searched directories:');
      diagnostics.searchedPaths.forEach(dir => console.log(`   - ${dir}`));
    }
  }

  const components = [];
  
  if (verbose) {
    console.log(`🔍 Processing ${componentFiles.length} component files`);
  }
  
  for (const file of componentFiles) {
    try {
      // Validate component file structure
      const validation = await validateComponentFile(file);
      if (validation.warnings.length > 0 && verbose) {
        validation.warnings.forEach(warning => console.warn(warning));
        validation.suggestions.forEach(suggestion => console.log(suggestion));
      }

      // Parse TSX/JSX files
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        const component = parseTSX(file);
        if (component) {
          const enrichedComponent = await enrichComponent(component);
          components.push(enrichedComponent);
          if (verbose) {
            console.log(`✅ Processed component: ${path.relative(process.cwd(), file)}`);
          }
        }
      } else {
        // For JSON files, read directly
        const component = readJSON(file);
        if (component) {
          const enrichedComponent = await enrichComponent(component);
          components.push(enrichedComponent);
          if (verbose) {
            console.log(`✅ Processed component: ${path.relative(process.cwd(), file)}`);
          }
        }
      }
    } catch (err) {
      console.error(`❌ Failed to process component ${file}:`, err);
    }
  }

  // Process tokens (flattening and enriching)
  const flatTokens = flattenTokenTree(tokensData);
  const enrichedTokens = {};
  
  if (verbose) {
    console.log(`🔍 Enriching ${Object.keys(flatTokens).length} tokens`);
  }
  
  for (const [key, value] of Object.entries(flatTokens)) {
    enrichedTokens[key] = await enrichToken(value);
  }

  // Build registry
  const registry = {
    components,
    tokens: enrichedTokens,
    version: '1.2.0',
    generated: new Date().toISOString()
  };

  // Create output directory if needed
  const outputDir = path.dirname(absoluteOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (verbose) {
      console.log(`📁 Created output directory: ${outputDir}`);
    }
  }

  // Write output
  writeJSON(absoluteOutputPath, registry);
  if (verbose) {
    console.log(`✅ Registry written to ${absoluteOutputPath}`);
    console.log(`📊 Summary: ${components.length} components, ${Object.keys(enrichedTokens).length} tokens`);
  }
  return registry;
}

function validateTokenStructure(tokens) {
  // Basic structure validation
  if (!tokens || typeof tokens !== 'object') {
    throw new Error('Invalid token file structure: must be an object');
  }
  
  // Check for required top-level categories
  const requiredCategories = ['color', 'spacing', 'typography'];
  const missingCategories = requiredCategories.filter(cat => !(cat in tokens));
  
  if (missingCategories.length > 0) {
    console.warn(`⚠️ Missing recommended token categories: ${missingCategories.join(', ')}`);
  }

  // Validate value structure
  function validateValue(obj, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (value && typeof value === 'object') {
        if ('value' in value) {
          // Validate value format
          if (typeof value.value !== 'string' && typeof value.value !== 'number') {
            console.warn(`⚠️ Invalid token value type at ${currentPath}: expected string or number`);
          }
        } else {
          validateValue(value, currentPath);
        }
      }
    }
  }

  validateValue(tokens);
}

function generateDefaultTokens() {
  return {
    color: {
      surface: {
        primary: { value: "#0066CC" },
        background: { value: "#FFFFFF" }
      },
      text: {
        primary: { value: "#000000" }
      }
    },
    spacing: {
      md: { value: "16px" }
    },
    typography: {
      size: {
        md: { value: "16px" }
      }
    }
  };
}

async function processTokens(tokenSources, rootDir) {
  const tokens = [];
  
  if (!tokenSources || tokenSources.length === 0) {
    if (global.verbose) {
      console.log('ℹ️ No token sources configured, skipping token processing');
    }
    return tokens;
  }

  if (global.verbose) {
    console.log(`📦 Processing ${tokenSources.length} token source(s)`);
  }

  for (const tokenPath of tokenSources) {
    const fullPath = path.isAbsolute(tokenPath) ? tokenPath : path.join(rootDir, tokenPath);
    
    try {
      // First check if it's a CSS file
      if (fullPath.endsWith('.css')) {
        const { tokensFlat } = await parseCSSFile(fullPath);
        if (tokensFlat) {
          validateTokenStructure(tokensFlat);
          tokens.push({
            source: tokenPath,
            tokens: tokensFlat
          });
          if (global.verbose) {
            console.log(`✅ Extracted tokens from CSS file: ${tokenPath}`);
          }
          continue;
        }
      }

      // Then try as JSON
      if (!fs.existsSync(fullPath)) {
        if (global.verbose) {
          console.log(`⚠️ Token file not found: ${fullPath}`);
          console.log(`💡 Creating default token file...`);
        }
        
        // Create directory if it doesn't exist
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        
        // Write default tokens
        const defaultTokens = generateDefaultTokens();
        fs.writeFileSync(fullPath, JSON.stringify(defaultTokens, null, 2));
        
        tokens.push({
          source: tokenPath,
          tokens: defaultTokens
        });
        
        if (global.verbose) {
          console.log(`✅ Created default token file at: ${fullPath}`);
        }
        continue;
      }

      const tokenData = readJSON(fullPath);
      if (!tokenData) {
        if (global.verbose) {
          console.log(`⚠️ Failed to parse token file: ${fullPath}`);
        }
        continue;
      }

      validateTokenStructure(tokenData);
      tokens.push({
        source: tokenPath,
        tokens: tokenData
      });

      if (global.verbose) {
        console.log(`✅ Loaded tokens from: ${tokenPath}`);
      }
    } catch (error) {
      if (global.verbose) {
        console.log(`❌ Error processing token file ${fullPath}:`, error.message);
      }
      // Continue processing other token files
      continue;
    }
  }

  return tokens;
} 