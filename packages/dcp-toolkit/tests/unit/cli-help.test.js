// tests/cli-help.test.js
import { describe, test, expect } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dcpPath = path.join(__dirname, '../../bin/dcp.js');

describe('CLI Help Output', () => {
  test('should show main help with command groups and core commands', () => {
    const output = execSync(`node "${dcpPath}" --help`, {
      encoding: 'utf-8',
      timeout: 5000
    });

    // Check that core structure is present
    expect(output).toContain('DCP: Design Component Protocol CLI');
    expect(output).toContain('Usage: dcp [options] [command]');

    // Check core commands are present
    expect(output).toContain('extract [options] <source>');
    expect(output).toContain('validate [options]');
    expect(output).toContain('build [options]');
    expect(output).toContain('query [options]');

    // Check command groups are present
    expect(output).toContain('registry');
    expect(output).toContain('tokens');
    expect(output).toContain('workflow');
    expect(output).toContain('dev');
    expect(output).toContain('export');

    // Check workflow examples are present
    expect(output).toContain('Core Workflow:');
    expect(output).toContain('dcp extract');
    expect(output).toContain('Learn more: https://github.com/stevewitmer/dcp-transformer');
  });

  test('should show tokens group help', () => {
    const output = execSync(`node "${dcpPath}" tokens --help`, {
      encoding: 'utf-8',
      timeout: 5000
    });

    expect(output).toContain('Design token operations');
    expect(output).toContain('Usage: dcp tokens [options] [command]');
    expect(output).toContain('detect');
    expect(output).toContain('extract');
    expect(output).toContain('normalize');
    expect(output).toContain('merge');
  });

  test('should show workflow group help', () => {
    const output = execSync(`node "${dcpPath}" workflow --help`, {
      encoding: 'utf-8',
      timeout: 5000
    });

    expect(output).toContain('Mutation and transformation workflow');
    expect(output).toContain('Usage: dcp workflow [options] [command]');
    expect(output).toContain('mutate');
    expect(output).toContain('rollback');
    expect(output).toContain('diff');
    expect(output).toContain('agent');
  });
});
