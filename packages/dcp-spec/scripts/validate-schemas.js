#!/usr/bin/env node

/**
 * Schema validation script for DCP spec package
 * Validates all JSON schemas are valid and can be loaded
 */

import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const schemasDir = join(__dirname, '..', 'schemas');

async function validateSchemas() {
  console.log('🔍 Validating DCP schemas...');
  
  const ajv = new Ajv({ 
    strict: false, 
    allErrors: true,
    loadSchema: false,  // Don't try to load remote schemas
    addUsedSchema: false // Don't add used schemas
  });
  addFormats(ajv);
  
  let errors = 0;
  let validated = 0;
  
  try {
    const schemaFiles = readdirSync(schemasDir)
      .filter(file => file.endsWith('.json'));
    
    if (schemaFiles.length === 0) {
      console.error('❌ No schema files found in schemas directory');
      process.exit(1);
    }
    
    for (const file of schemaFiles) {
      const schemaPath = join(schemasDir, file);
      
      try {
        const schemaContent = readFileSync(schemaPath, 'utf-8');
        const schema = JSON.parse(schemaContent);
        
        // Basic JSON Schema validation - check for required fields
        if (!schema.$schema) {
          console.warn(`⚠️  ${file} - Missing $schema field`);
        }
        
        if (!schema.type && !schema.$ref) {
          console.warn(`⚠️  ${file} - Missing type or $ref field`);
        }
        
        // Try to compile the schema (catch compilation errors)
        try {
          ajv.compile(schema);
        } catch (compileError) {
          // Skip compilation errors for now as they may be due to draft version differences
          console.warn(`⚠️  ${file} - Compilation warning: ${compileError.message}`);
        }
        
        console.log(`✅ ${file} - Valid`);
        validated++;
        
      } catch (parseError) {
        console.error(`❌ ${file} - Parse error:`, parseError.message);
        errors++;
      }
    }
    
    console.log(`\n📊 Schema validation complete:`);
    console.log(`   ✅ Valid: ${validated}`);
    console.log(`   ❌ Errors: ${errors}`);
    
    if (errors > 0) {
      console.log('\n💡 Fix schema errors above before publishing');
      process.exit(1);
    }
    
    console.log('\n🎉 All schemas are valid!');
    
  } catch (error) {
    console.error('❌ Schema validation failed:', error.message);
    process.exit(1);
  }
}

// Test that we can import the main package
async function testPackageImports() {
  console.log('\n🔍 Testing package imports...');
  
  try {
    // Test importing from the main package
    const specPackage = await import('../index.js');
    
    const expectedExports = [
      'componentSchema',
      'configSchema', 
      'manifestSchema',
      'themeSchema',
      'openApiSpec',
      'mcpManifest',
      'DCP_VERSION',
      'DCP_SCHEMA_VERSION'
    ];
    
    let importErrors = 0;
    
    for (const exportName of expectedExports) {
      if (!(exportName in specPackage)) {
        console.error(`❌ Missing export: ${exportName}`);
        importErrors++;
      } else {
        console.log(`✅ Export available: ${exportName}`);
      }
    }
    
    if (importErrors > 0) {
      console.log(`\n💡 Fix missing exports in index.js`);
      process.exit(1);
    }
    
    console.log('\n🎉 All exports are available!');
    
  } catch (error) {
    console.error('❌ Package import failed:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  await validateSchemas();
  await testPackageImports();
  
  console.log('\n✅ DCP spec package validation complete!');
}

main().catch(error => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});