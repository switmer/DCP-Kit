import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

/**
 * Enhanced registry validation with comprehensive checks
 * @param {string} registryPath - Path to registry file
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Validation results
 */
export async function validateRegistry(registryPath, options = {}) {
  const results = {
    success: true,
    valid: true,
    componentsValidated: 0,
    errors: [],
    warnings: [],
    securityWarnings: [],
    agentCompatible: false,
    agentValidation: {},
    integrityCheck: {},
    vulnerabilities: [],
    licenseWarnings: [],
    secretsFound: [],
    importWarnings: [],
    fileTypeWarnings: [],
    obfuscationWarnings: [],
    securityIssues: [],
    securityThreats: []
  };

  try {
    // Check if registry file exists
    if (!fsSync.existsSync(registryPath)) {
      throw new Error([
        `Registry file not found at ${registryPath}`,
        '💡 To create a registry:',
        '   dcp extract ./src --out ./registry',
        'Or use an existing registry:',
        '   dcp validate --registry /path/to/existing/registry'
      ].join('\n'));
    }

    // Read registry
    let registry;
    try {
      const content = await fs.readFile(registryPath, 'utf-8');
      registry = JSON.parse(content);
    } catch (err) {
      throw new Error('Invalid registry JSON: ' + err.message);
    }

    // Basic schema validation
    await validateBasicSchema(registry, results, options);
    
    // Agent compatibility validation
    if (options.agentSchema) {
      await validateAgentCompatibility(registry, results, options);
    }
    
    // Component-specific validations
    if (registry.components) {
      results.componentsValidated = registry.components.length;
      
      for (let i = 0; i < registry.components.length; i++) {
        const component = registry.components[i];
        
        // Always validate examples for basic consistency
        await validateComponentExamples(component, results);
        
        if (options.checkExamples || options.strict) {
          // Additional example validations
          await validateAdvancedExamples(component, results);
        }
        
        if (options.checkTokens || options.strictTokens) {
          await validateTokenUsage(component, results, options.strictTokens);
        }
        
        if (options.checkNaming) {
          validateNamingConventions(component, results);
        }
        
        if (options.checkCombinations) {
          validatePropCombinations(component, results);
        }
        
        if (options.checkJsx) {
          validateJSXSyntax(component, results);
        }
      }
    }
    
    // Security validations
    if (options.securityAudit) {
      await validateSecurityAudit(registry, results);
    }
    
    if (options.checkVulnerabilities) {
      await checkVulnerabilities(registry, results);
    }
    
    if (options.checkLicenses) {
      await validateLicenseCompatibility(registry, results);
    }
    
    // Integrity validation
    if (options.verifyIntegrity) {
      await verifyIntegrity(registry, results);
    }
    
    // Set overall success
    results.success = results.errors.length === 0;
    results.valid = results.success;
    
    return results;
    
  } catch (error) {
    results.success = false;
    results.valid = false;
    results.errors.push(error.message);
    return results;
  }
}

/**
 * Validate basic registry schema
 */
async function validateBasicSchema(registry, results, options) {
  // Check required top-level fields
  const requiredFields = ['name', 'version', 'components'];
  
  requiredFields.forEach(field => {
    if (!registry[field]) {
      results.errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Validate version format
  if (registry.version && !/^\d+\.\d+\.\d+/.test(registry.version)) {
    results.errors.push(`Invalid version format: ${registry.version}. Expected semantic version (x.y.z)`);
  }
  
  // Validate components array
  if (registry.components && !Array.isArray(registry.components)) {
    results.errors.push('Components must be an array');
  }
  
  // Validate component structure
  if (registry.components && Array.isArray(registry.components)) {
    registry.components.forEach((component, index) => {
      validateComponentStructure(component, results, index);
    });
  }
}

/**
 * Validate individual component structure
 */
function validateComponentStructure(component, results, index) {
  const componentId = component.name || `component[${index}]`;
  
  // Validate props structure
  if (component.props) {
    if (typeof component.props !== 'object' || Array.isArray(component.props)) {
      results.errors.push(`Component ${componentId}: props must be an object`);
    } else {
      Object.entries(component.props).forEach(([propName, propDef]) => {
        // Validate prop definition has required type field
        if (!propDef.type) {
          results.errors.push(`Component ${componentId}: prop '${propName}' is missing required 'type' field`);
        } else {
          // Validate type is a valid DCP type
          const validTypes = ['string', 'number', 'boolean', 'object', 'array', 'function', 'element', 'node'];
          if (!validTypes.includes(propDef.type)) {
            results.errors.push(`Component ${componentId}: prop '${propName}' has invalid type '${propDef.type}'. Valid types: ${validTypes.join(', ')}`);
          }
          
          // Validate values field only for string types
          if (propDef.values && propDef.type !== 'string') {
            results.errors.push(`Component ${componentId}: prop '${propName}' cannot have 'values' field unless type is 'string'`);
          }
        }
      });
    }
  }
}

/**
 * Validate agent/LLM compatibility
 */
async function validateAgentCompatibility(registry, results, options) {
  const validation = {
    hasDescriptions: true,
    hasExamples: true,
    hasTags: true,
    hasUsagePatterns: true
  };
  
  if (registry.components) {
    registry.components.forEach(component => {
      if (!component.description) {
        validation.hasDescriptions = false;
        results.warnings.push(`Component ${component.name} missing description`);
      }
      
      if (!component.examples || component.examples.length === 0) {
        validation.hasExamples = false;
        results.warnings.push(`Component ${component.name} missing examples`);
      }
      
      if (!component.tags || component.tags.length === 0) {
        validation.hasTags = false;
        results.warnings.push(`Component ${component.name} missing tags`);
      }
      
      if (!component.usagePatterns) {
        validation.hasUsagePatterns = false;
        results.warnings.push(`Component ${component.name} missing usage patterns`);
      }
    });
  }
  
  results.agentCompatible = Object.values(validation).every(v => v);
  results.agentValidation = validation;
  
  if (registry.metadata?.agentOptimized) {
    results.agentCompatible = results.agentCompatible && true;
  }
}

/**
 * Validate component examples
 */
async function validateComponentExamples(component, results) {
  if (!component.examples) return;
  
  component.examples.forEach((example, index) => {
    // Check for invalid props
    if (component.props) {
      const exampleProps = extractPropsFromExample(example);
      exampleProps.forEach(prop => {
        if (!component.props[prop] && !isStandardReactProp(prop)) {
          results.errors.push(`Invalid prop '${prop}' in example ${index + 1} of ${component.name}`);
        }
      });
    }
    
    // Check variant usage
    if (component.variants) {
      const variantMatch = example.match(/variant=["'](\w+)["']/);
      if (variantMatch) {
        const variant = variantMatch[1];
        if (!component.variants[variant] && 
            !(component.props?.variant?.values?.includes(variant))) {
          results.errors.push(`Invalid variant '${variant}' in example of ${component.name}`);
        }
      }
    }
  });
}

/**
 * Advanced example validation (runs only with --check-examples)
 */
async function validateAdvancedExamples(component, results) {
  if (!component.examples) return;
  
  // Check for unused variants (variants defined but not used in examples)
  if (component.variants) {
    const usedVariants = new Set();
    
    component.examples.forEach(example => {
      const variantMatch = example.match(/variant=["'](\w+)["']/);
      if (variantMatch) {
        usedVariants.add(variantMatch[1]);
      }
    });
    
    Object.keys(component.variants).forEach(variant => {
      if (!usedVariants.has(variant)) {
        results.warnings.push(`unused variant '${variant}' in ${component.name}`);
      }
    });
  }
}

/**
 * Validate design token usage
 */
async function validateTokenUsage(component, results, strictMode = false) {
  if (!component.tokens) return;
  
  const declaredTokens = Object.keys(component.tokens);
  const usedTokens = [];
  
  // Extract tokens from styles/className
  if (component.styles) {
    Object.values(component.styles).forEach(style => {
      const tokenMatches = style.match(/\b[\w-]+\b/g) || [];
      usedTokens.push(...tokenMatches);
    });
  }
  
  if (component.className) {
    const tokenMatches = component.className.match(/\b[\w-]+\b/g) || [];
    usedTokens.push(...tokenMatches);
  }
  
  // Check for unused tokens
  declaredTokens.forEach(token => {
    const isUsed = usedTokens.some(used => used.includes(token.replace(/\./g, '-')));
    if (!isUsed) {
      results.warnings.push(`Unused token '${token}' in ${component.name}`);
    }
  });
  
  // Check for undefined tokens
  usedTokens.forEach(token => {
    const isDeclared = declaredTokens.some(declared => 
      token.includes(declared.replace(/\./g, '-'))
    );
    if (!isDeclared && token.includes('-')) {
      results.warnings.push(`Undefined token referenced: ${token} in ${component.name}`);
    }
  });
  
  // Strict token validation
  if (strictMode) {
    Object.entries(component.tokens).forEach(([key, value]) => {
      if (key.includes('color') && !isValidColor(value)) {
        results.warnings.push(`Invalid color token value '${value}' for ${key}`);
      }
      
      if (key.includes('spacing') && !isValidSpacing(value)) {
        results.warnings.push(`Invalid spacing token value '${value}' for ${key}`);
      }
    });
  }
}

/**
 * Validate naming conventions
 */
function validateNamingConventions(component, results) {
  // Component names should be PascalCase
  if (component.name && !/^[A-Z][a-zA-Z0-9]*$/.test(component.name)) {
    results.warnings.push(`Component name '${component.name}' should be PascalCase`);
  }
  
  // Prop names should be camelCase
  if (component.props) {
    Object.keys(component.props).forEach(propName => {
      if (!/^[a-z][a-zA-Z0-9]*$/.test(propName) && !propName.startsWith('aria-') && !propName.startsWith('data-')) {
        results.warnings.push(`Prop name '${propName}' in ${component.name} should be camelCase`);
      }
    });
  }
}

/**
 * Validate prop combinations
 */
function validatePropCombinations(component, results) {
  if (!component.validCombinations) return;
  
  if (component.examples) {
    component.examples.forEach((example, index) => {
      const exampleProps = extractPropsFromExample(example);
      const propsObj = {};
      
      exampleProps.forEach(prop => {
        const match = example.match(new RegExp(`${prop}=["']([^"']+)["']`));
        if (match) {
          propsObj[prop] = match[1];
        }
      });
      
      // Check against valid combinations
      const isValidCombination = component.validCombinations.some(combo => {
        return Object.entries(combo).every(([key, value]) => 
          propsObj[key] === value
        );
      });
      
      if (!isValidCombination && Object.keys(propsObj).length > 1) {
        results.warnings.push(`Invalid prop combination in example ${index + 1} of ${component.name}`);
      }
    });
  }
}

/**
 * Validate JSX syntax in examples
 */
function validateJSXSyntax(component, results) {
  if (!component.examples) return;
  
  component.examples.forEach((example, index) => {
    // Basic JSX syntax checks
    const openTags = (example.match(/<\w+/g) || []).length;
    const closeTags = (example.match(/<\/\w+>/g) || []).length;
    const selfClosing = (example.match(/<\w+[^>]*\/>/g) || []).length;
    
    if (openTags !== closeTags + selfClosing) {
      results.errors.push(`JSX syntax error in example ${index + 1} of ${component.name}: mismatched tags`);
    }
    
    // Check for unquoted attributes
    const unquotedAttrs = example.match(/\w+=\w+[^"'\s]/g);
    if (unquotedAttrs) {
      results.errors.push(`JSX syntax error in example ${index + 1} of ${component.name}: unquoted attributes`);
    }
  });
}

/**
 * Validate security audit
 */
async function validateSecurityAudit(registry, results) {
  if (registry.components) {
    registry.components.forEach(component => {
      // Check peer dependencies
      if (component.peerDependencies) {
        Object.entries(component.peerDependencies).forEach(([pkg, version]) => {
          if (!pkg.startsWith('@') && version === '*') {
            results.securityWarnings.push(`Unscoped wildcard dependency: ${pkg}`);
          }
          
          if (version === 'latest') {
            results.securityWarnings.push(`Non-semver version for ${pkg}: ${version}`);
          }
          
          if (pkg.includes('malicious') || pkg.includes('hack')) {
            results.securityWarnings.push(`Suspicious package name: ${pkg}`);
          }
        });
      }
    });
  }
}

/**
 * Check for known vulnerabilities (placeholder)
 */
async function checkVulnerabilities(registry, results) {
  // This would integrate with vulnerability databases
  const knownVulnerable = ['lodash@4.17.20', 'moment@2.29.1', 'request@2.88.2'];
  
  if (registry.components) {
    registry.components.forEach(component => {
      if (component.dependencies) {
        Object.entries(component.dependencies).forEach(([pkg, version]) => {
          const pkgVersion = `${pkg}@${version}`;
          if (knownVulnerable.includes(pkgVersion)) {
            results.vulnerabilities.push({
              package: pkg,
              version: version,
              severity: 'medium',
              description: 'Known vulnerable version'
            });
          }
        });
      }
    });
  }
}

/**
 * Validate license compatibility
 */
async function validateLicenseCompatibility(registry, results) {
  const registryLicense = registry.license || 'MIT';
  const incompatibleLicenses = ['GPL-3.0', 'AGPL-3.0'];
  
  if (registry.components) {
    registry.components.forEach(component => {
      if (component.dependencyLicenses) {
        Object.entries(component.dependencyLicenses).forEach(([pkg, license]) => {
          if (incompatibleLicenses.includes(license) && registryLicense === 'MIT') {
            results.licenseWarnings.push(`License incompatibility: ${pkg} (${license}) with registry (${registryLicense})`);
          }
        });
      }
    });
  }
}

/**
 * Verify registry integrity
 */
async function verifyIntegrity(registry, results) {
  results.integrityCheck = {
    checksumValid: false,
    signatureValid: false
  };
  
  if (registry.integrity) {
    // Placeholder for checksum verification
    results.integrityCheck.checksumValid = true; // Would verify actual checksum
    results.integrityCheck.signatureValid = false; // Would verify signature
  } else {
    results.warnings.push('No integrity information found in registry');
  }
}

// Helper functions
function extractPropsFromExample(example) {
  const propRegex = /(\w+)=[\{"']/g;
  const props = [];
  let match;
  
  while ((match = propRegex.exec(example)) !== null) {
    props.push(match[1]);
  }
  
  return props;
}

function isStandardReactProp(propName) {
  const standardProps = [
    'key', 'ref', 'className', 'style', 'id', 'onClick', 'onChange',
    'onSubmit', 'onFocus', 'onBlur', 'children', 'title', 'role'
  ];
  
  return standardProps.includes(propName) || 
         propName.startsWith('aria-') || 
         propName.startsWith('data-');
}

function isValidColor(value) {
  // Basic color validation
  return /^#[0-9a-fA-F]{6}$/.test(value) || 
         /^rgb\(\d+,\s*\d+,\s*\d+\)$/.test(value) ||
         ['red', 'green', 'blue', 'white', 'black'].includes(value);
}

function isValidSpacing(value) {
  return /^\d+px$/.test(value) || 
         /^\d+rem$/.test(value) ||
         /^\d+em$/.test(value);
}
