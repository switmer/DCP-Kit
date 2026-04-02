#!/usr/bin/env node

/**
 * E2E validation script for component packs
 * 
 * Validates JSON invariants and data completeness.
 * Run after build-packs to catch regressions before they hit the UI.
 * 
 * Usage:
 *   node scripts/validate-packs.js <packs-dir> [base-url]
 * 
 * Example:
 *   node scripts/validate-packs.js ./dist/packs http://localhost:7401
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function validatePacks(packsDir, baseUrl = '') {
  const errors = [];
  const warnings = [];
  const checks = [];

  try {
    // Check 1: index.json exists and is valid
    checks.push('Checking index.json...');
    const indexPath = path.join(packsDir, 'index.json');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    
    if (!indexData.components || !Array.isArray(indexData.components)) {
      errors.push('index.json missing or invalid components array');
    } else {
      checks.push(`✅ index.json: ${indexData.components.length} components`);
    }

    // Check 2: Each component has meta.json with required fields
    checks.push('Validating component meta.json files...');
    for (const comp of indexData.components || []) {
      const componentDir = path.join(packsDir, comp.name);
      const metaPath = path.join(componentDir, 'meta.json');
      
      try {
        const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
        
        // Required fields
        const required = ['name', 'title', 'type', 'files', 'props', 'categories', 'namespace'];
        const missing = required.filter(field => {
          if (field === 'files' && (!meta.files || !Array.isArray(meta.files))) return true;
          if (field === 'props' && (!meta.props || typeof meta.props !== 'object')) return true;
          if (field === 'categories' && (!meta.categories || !Array.isArray(meta.categories))) return true;
          return !meta[field] || meta[field] === '';
        });
        
        if (missing.length > 0) {
          errors.push(`${comp.name}: Missing required fields: ${missing.join(', ')}`);
        }
        
        // Schema version check
        if (!meta.metaVersion) {
          warnings.push(`${comp.name}: Missing metaVersion (may be using old schema)`);
        }
        
        // Quality checks
        if (!meta.description) {
          warnings.push(`${comp.name}: Missing description`);
        }
        
        if (!meta.sourceFile) {
          warnings.push(`${comp.name}: Missing sourceFile`);
        }
        
        // Props validation
        const props = meta.props || {};
        const propsWithoutDescriptions = Object.entries(props)
          .filter(([_, prop]) => !prop.description || prop.description.trim() === '')
          .length;
        
        if (propsWithoutDescriptions > 0) {
          warnings.push(`${comp.name}: ${propsWithoutDescriptions} props missing descriptions`);
        }
        
      } catch (error) {
        errors.push(`${comp.name}: Failed to read/parse meta.json: ${error.message}`);
      }
    }

    // Check 3: Test HTTP endpoints if baseUrl provided
    if (baseUrl) {
      checks.push(`Testing HTTP endpoints at ${baseUrl}...`);
      
      try {
        const indexResponse = await fetch(`${baseUrl}/index.json`);
        if (!indexResponse.ok) {
          errors.push(`GET ${baseUrl}/index.json returned ${indexResponse.status}`);
        } else {
          const remoteIndex = await indexResponse.json();
          checks.push(`✅ GET /index.json: ${remoteIndex.components?.length || 0} components`);
        }
        
        // Test a few component endpoints
        const sampleComponents = (indexData.components || []).slice(0, 3);
        for (const comp of sampleComponents) {
          const url = `${baseUrl}/r/${comp.namespace || 'ui'}/${comp.name}`;
          const compResponse = await fetch(url);
          if (!compResponse.ok) {
            errors.push(`GET ${url} returned ${compResponse.status}`);
          } else {
            const compData = await compResponse.json();
            if (!compData.props || typeof compData.props !== 'object') {
              errors.push(`${comp.name}: Component endpoint missing props object`);
            }
            if (!compData.sourceFile) {
              warnings.push(`${comp.name}: Component endpoint missing sourceFile`);
            }
          }
        }
        checks.push(`✅ Tested ${sampleComponents.length} component endpoints`);
      } catch (error) {
        warnings.push(`Could not test HTTP endpoints: ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 Validation Summary');
    console.log('='.repeat(60));
    
    checks.forEach(check => console.log(check));
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(w => console.log(`   ${w}`));
    }
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(e => console.log(`   ${e}`));
      console.log('\n❌ Validation FAILED');
      process.exit(1);
    } else {
      console.log('\n✅ All validation checks passed!');
      if (warnings.length > 0) {
        console.log(`   (${warnings.length} warnings - consider addressing)`);
      }
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Validation script failed:', error.message);
    process.exit(1);
  }
}

// CLI
const packsDir = process.argv[2] || './dist/packs';
const baseUrl = process.argv[3] || '';

if (!packsDir) {
  console.error('Usage: node validate-packs.js <packs-dir> [base-url]');
  process.exit(1);
}

validatePacks(packsDir, baseUrl);

