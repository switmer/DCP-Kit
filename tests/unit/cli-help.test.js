// tests/cli-help.test.js
import { describe, test, expect } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dcpPath = path.join(__dirname, '../../bin/dcp.js');

describe('CLI Help Output', () => {
  test('should show main help with all commands including new token verbs', () => {
    const output = execSync(`node "${dcpPath}" --help`, { 
      encoding: 'utf-8',
      timeout: 5000 
    });

    // Check that core structure is present
    expect(output).toContain('Design Component Protocol Transformer - CRISPR for Code');
    expect(output).toContain('Usage: dcp [options] [command]');
    
    // Check existing commands are present
    expect(output).toContain('extract [options] <source>');
    expect(output).toContain('adaptors [options]');
    expect(output).toContain('watch [options] <source>');
    expect(output).toContain('transpile [options] <registry>');
    expect(output).toContain('mutate [options] <registry> <patch> <output>');
    expect(output).toContain('agent [options] <prompt>');
    
    // Check new DTCG token commands are present
    expect(output).toContain('export-tokens [options] <registry>');
    expect(output).toContain('Export DCP registry tokens to DTCG format');
    expect(output).toContain('import-tokens [options] <tokens>');
    expect(output).toContain('Import DTCG tokens into DCP registry');
    
    // Check workflow examples are present
    expect(output).toContain('Complete Workflow:');
    expect(output).toContain('dcp extract ./src --json > registry.json');
    expect(output).toContain('Agent Mode:');
    expect(output).toContain('Learn more: https://github.com/stevewitmer/dcp-transformer');
  });

  test('should show export-tokens help', () => {
    const output = execSync(`node "${dcpPath}" export-tokens --help`, { 
      encoding: 'utf-8',
      timeout: 5000 
    });

    expect(output).toContain('Export DCP registry tokens to DTCG format');
    expect(output).toContain('Usage: dcp export-tokens [options] <registry>');
    expect(output).toContain('-o, --out <file>');
    expect(output).toContain('design.tokens.json');
    expect(output).toContain('--no-validate');
    expect(output).toContain('--no-extensions');
    expect(output).toContain('--group-prefix <prefix>');
    expect(output).toContain('--json');
  });

  test('should show import-tokens help', () => {
    const output = execSync(`node "${dcpPath}" import-tokens --help`, { 
      encoding: 'utf-8',
      timeout: 5000 
    });

    expect(output).toContain('Import DTCG tokens into DCP registry');
    expect(output).toContain('Usage: dcp import-tokens [options] <tokens>');
    expect(output).toContain('-r, --registry <file>');
    expect(output).toContain('registry.json');
    expect(output).toContain('--merge');
    expect(output).toContain('--no-validate');
    expect(output).toContain('--json');
  });
});