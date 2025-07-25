import fs from 'fs';
import path from 'path';
import { readJSON } from '../core/utils.js';

/**
 * Compare two DCP registries and return differences
 */
export async function runDiff(fromPath, toPath, options = {}) {
  try {
    // Read both registry files
    const fromRegistry = JSON.parse(await fs.promises.readFile(fromPath, 'utf-8'));
    const toRegistry = JSON.parse(await fs.promises.readFile(toPath, 'utf-8'));
    
    const changes = {
      added: [],
      removed: [],
      modified: [],
      unchanged: []
    };
    
    // Get component lists
    const fromComponents = fromRegistry.components || [];
    const toComponents = toRegistry.components || [];
    
    const fromNames = new Set(fromComponents.map(c => c.name));
    const toNames = new Set(toComponents.map(c => c.name));
    
    // Find added components
    for (const component of toComponents) {
      if (!fromNames.has(component.name)) {
        changes.added.push(component.name);
      }
    }
    
    // Find removed components
    for (const component of fromComponents) {
      if (!toNames.has(component.name)) {
        changes.removed.push(component.name);
      }
    }
    
    // Find modified components
    for (const fromComp of fromComponents) {
      const toComp = toComponents.find(c => c.name === fromComp.name);
      if (toComp) {
        // Simple comparison - could be made more sophisticated
        const fromStr = JSON.stringify(fromComp, null, 2);
        const toStr = JSON.stringify(toComp, null, 2);
        
        if (fromStr !== toStr) {
          changes.modified.push({
            name: fromComp.name,
            changes: compareComponents(fromComp, toComp)
          });
        } else {
          changes.unchanged.push(fromComp.name);
        }
      }
    }
    
    if (options.json) {
      return {
        success: true,
        changes,
        summary: {
          added: changes.added.length,
          removed: changes.removed.length, 
          modified: changes.modified.length,
          unchanged: changes.unchanged.length
        }
      };
    }
    
    // Console output
    if (changes.added.length > 0) {
      console.log('🟢 Added components:');
      changes.added.forEach(name => console.log(`  - ${name}`));
    }
    
    if (changes.removed.length > 0) {
      console.log('🔴 Removed components:');
      changes.removed.forEach(name => console.log(`  - ${name}`));
    }
    
    if (changes.modified.length > 0) {
      console.log('🟡 Modified components:');
      changes.modified.forEach(mod => console.log(`  - ${mod.name}`));
    }
    
    return { success: true, changes };
    
  } catch (error) {
    if (options.json) {
      return {
        success: false,
        error: error.message
      };
    }
    
    console.error('❌ Diff failed:', error.message);
    process.exit(1);
  }
}

/**
 * Compare two components and return change details
 */
function compareComponents(from, to) {
  const changes = [];
  
  // Compare props - handle both array and object formats
  const fromProps = from.props || [];
  const toProps = to.props || [];
  
  // Convert object format to array format for comparison
  const normalizeProps = (props) => {
    if (Array.isArray(props)) {
      return props;
    }
    return Object.entries(props).map(([name, config]) => ({ name, ...config }));
  };
  
  const normalizedFromProps = normalizeProps(fromProps);
  const normalizedToProps = normalizeProps(toProps);
  
  const fromPropNames = new Set(normalizedFromProps.map(p => p.name));
  const toPropNames = new Set(normalizedToProps.map(p => p.name));
  
  // Added props
  for (const prop of normalizedToProps) {
    if (!fromPropNames.has(prop.name)) {
      changes.push({ type: 'prop_added', prop: prop.name });
    }
  }
  
  // Removed props
  for (const prop of normalizedFromProps) {
    if (!toPropNames.has(prop.name)) {
      changes.push({ type: 'prop_removed', prop: prop.name });
    }
  }
  
  // Modified props
  for (const fromProp of normalizedFromProps) {
    const toProp = normalizedToProps.find(p => p.name === fromProp.name);
    if (toProp && JSON.stringify(fromProp) !== JSON.stringify(toProp)) {
      changes.push({
        type: 'prop_modified',
        prop: fromProp.name,
        from: fromProp,
        to: toProp
      });
    }
  }
  
  return changes;
}

export function diffRegistries(options) {
  return runDiff(options.from, options.to, options);
}
