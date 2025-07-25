import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Compile and render a component demo for validation
 * @param {string} demoPath - Path to demo file (.demo.tsx)
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Demo compilation results
 */
export async function runDemo(demoPath, options = {}) {
  const startTime = Date.now();
  const results = {
    success: false,
    compiled: false,
    demoPath,
    detectedProps: {},
    errors: [],
    warnings: []
  };

  try {
    // Verify demo file exists
    await fs.access(demoPath);
    
    // Read demo file content
    const demoContent = await fs.readFile(demoPath, 'utf-8');
    
    // Parse demo for prop usage
    if (options.render) {
      const propAnalysis = await analyzeDemoProps(demoContent, demoPath);
      results.detectedProps = propAnalysis.props;
      results.variants = propAnalysis.variants;
    }
    
    // Validate API usage if requested
    if (options.validateApi) {
      const apiValidation = await validateDemoAgainstAPI(demoContent, demoPath);
      results.errors = apiValidation.errors;
      results.warnings = apiValidation.warnings;
    }
    
    // Attempt TypeScript compilation
    if (options.render || options.validateApi) {
      const compilationResult = await compileDemo(demoPath);
      results.compiled = compilationResult.success;
      
      if (!compilationResult.success) {
        results.errors.push(...compilationResult.errors);
      }
    }
    
    results.success = results.errors.length === 0;
    results.duration = Date.now() - startTime;
    
    return results;
    
  } catch (error) {
    results.errors.push(error.message);
    results.duration = Date.now() - startTime;
    return results;
  }
}

/**
 * Analyze demo content for prop usage patterns
 */
async function analyzeDemoProps(content, demoPath) {
  const props = {};
  const variants = [];
  
  try {
    // Extract JSX prop usage patterns
    const propRegex = /(\w+)=\{?([^}\s>]+)\}?/g;
    const variantRegex = /variant=["'](\w+)["']/g;
    const sizeRegex = /size=["'](\w+)["']/g;
    
    let match;
    
    // Extract variant values
    while ((match = variantRegex.exec(content)) !== null) {
      if (!props.variant) props.variant = [];
      if (!props.variant.includes(match[1])) {
        props.variant.push(match[1]);
      }
    }
    
    // Extract size values
    while ((match = sizeRegex.exec(content)) !== null) {
      if (!props.size) props.size = [];
      if (!props.size.includes(match[1])) {
        props.size.push(match[1]);
      }
    }
    
    // Extract other common props
    const booleanProps = ['disabled', 'loading', 'clickable', 'dismissible'];
    booleanProps.forEach(prop => {
      const regex = new RegExp(`${prop}(?:=\\{?(true|false)\\}?)?`, 'g');
      if (regex.test(content)) {
        if (!props[prop]) props[prop] = [];
        props[prop] = ['true', 'false'];
      }
    });
    
  } catch (error) {
    console.warn(`Failed to analyze props in ${demoPath}:`, error.message);
  }
  
  return { props, variants };
}

/**
 * Validate demo examples against component API
 */
async function validateDemoAgainstAPI(content, demoPath) {
  const errors = [];
  const warnings = [];
  
  try {
    // Find the component file (assumes same directory)
    const demoDir = path.dirname(demoPath);
    const demoName = path.basename(demoPath, '.demo.tsx');
    const componentPath = path.join(demoDir, `${demoName}.tsx`);
    
    try {
      await fs.access(componentPath);
      
      // Read component file to extract interface
      const componentContent = await fs.readFile(componentPath, 'utf-8');
      const interfaceProps = extractPropsInterface(componentContent);
      
      // Validate demo usage against interface
      const demoProps = extractDemoUsage(content);
      
      // Check for invalid props
      demoProps.forEach(prop => {
        if (!interfaceProps.includes(prop.name) && !isStandardReactProp(prop.name)) {
          errors.push(`Invalid prop '${prop.name}' not found in component interface`);
        }
      });
      
      // Check for missing required props
      const requiredProps = extractRequiredProps(componentContent);
      requiredProps.forEach(requiredProp => {
        const isUsed = demoProps.some(p => p.name === requiredProp);
        if (!isUsed) {
          errors.push(`Missing required prop '${requiredProp}' in demo`);
        }
      });
      
    } catch (componentError) {
      warnings.push(`Could not read component file for validation: ${componentError.message}`);
    }
    
  } catch (error) {
    warnings.push(`API validation failed: ${error.message}`);
  }
  
  return { errors, warnings };
}

/**
 * Attempt to compile demo with TypeScript
 */
async function compileDemo(demoPath) {
  try {
    // Create temporary tsconfig for compilation
    const tempDir = path.dirname(demoPath);
    const tempTsConfig = path.join(tempDir, 'temp.tsconfig.json');
    
    const tsConfig = {
      compilerOptions: {
        target: 'es2020',
        lib: ['dom', 'dom.iterable', 'es6'],
        allowJs: true,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx'
      },
      include: [demoPath]
    };
    
    await fs.writeFile(tempTsConfig, JSON.stringify(tsConfig, null, 2));
    
    try {
      // Try to compile with TypeScript
      const { stdout, stderr } = await execAsync(
        `npx tsc --noEmit --project "${tempTsConfig}"`,
        { timeout: 10000 }
      );
      
      // Clean up temp file
      await fs.unlink(tempTsConfig).catch(() => {});
      
      if (stderr && stderr.includes('error')) {
        return {
          success: false,
          errors: [stderr]
        };
      }
      
      return { success: true, errors: [] };
      
    } catch (compileError) {
      // Clean up temp file
      await fs.unlink(tempTsConfig).catch(() => {});
      
      return {
        success: false,
        errors: [compileError.stdout || compileError.stderr || compileError.message]
      };
    }
    
  } catch (error) {
    return {
      success: false,
      errors: [`Compilation setup failed: ${error.message}`]
    };
  }
}

/**
 * Extract props interface from component content
 */
function extractPropsInterface(content) {
  const props = [];
  
  try {
    // Match interface definitions
    const interfaceRegex = /interface\s+\w*Props\s*\{([^}]+)\}/g;
    const match = interfaceRegex.exec(content);
    
    if (match) {
      const interfaceBody = match[1];
      const propRegex = /(\w+)\??\s*:/g;
      let propMatch;
      
      while ((propMatch = propRegex.exec(interfaceBody)) !== null) {
        props.push(propMatch[1]);
      }
    }
    
    // Also check type definitions
    const typeRegex = /type\s+\w*Props\s*=\s*\{([^}]+)\}/g;
    const typeMatch = typeRegex.exec(content);
    
    if (typeMatch) {
      const typeBody = typeMatch[1];
      const propRegex = /(\w+)\??\s*:/g;
      let propMatch;
      
      while ((propMatch = propRegex.exec(typeBody)) !== null) {
        if (!props.includes(propMatch[1])) {
          props.push(propMatch[1]);
        }
      }
    }
    
  } catch (error) {
    console.warn('Failed to extract props interface:', error.message);
  }
  
  return props;
}

/**
 * Extract prop usage from demo content
 */
function extractDemoUsage(content) {
  const props = [];
  
  try {
    const propRegex = /(\w+)=\{?[^}\s>]+\}?/g;
    let match;
    
    while ((match = propRegex.exec(content)) !== null) {
      const propName = match[1];
      if (!props.find(p => p.name === propName)) {
        props.push({ name: propName });
      }
    }
  } catch (error) {
    console.warn('Failed to extract demo usage:', error.message);
  }
  
  return props;
}

/**
 * Extract required props from component content
 */
function extractRequiredProps(content) {
  const required = [];
  
  try {
    // Look for props without ? optional marker
    const interfaceRegex = /interface\s+\w*Props\s*\{([^}]+)\}/g;
    const match = interfaceRegex.exec(content);
    
    if (match) {
      const interfaceBody = match[1];
      const lines = interfaceBody.split('\n');
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
          // Check if line defines a prop without optional marker
          const propMatch = /(\w+)\s*:\s*/.exec(trimmed);
          if (propMatch && !trimmed.includes('?')) {
            required.push(propMatch[1]);
          }
        }
      });
    }
  } catch (error) {
    console.warn('Failed to extract required props:', error.message);
  }
  
  return required;
}

/**
 * Check if prop is a standard React prop
 */
function isStandardReactProp(propName) {
  const standardProps = [
    'key', 'ref', 'className', 'style', 'id', 'onClick', 'onChange', 
    'onSubmit', 'onFocus', 'onBlur', 'children', 'title', 'role', 
    'aria-label', 'aria-describedby', 'data-testid'
  ];
  
  return standardProps.includes(propName) || 
         propName.startsWith('aria-') || 
         propName.startsWith('data-');
}