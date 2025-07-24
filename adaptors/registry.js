import path from 'path';
import ReactTSXAdaptor from './react-tsx/index.js';
import ShadCNReactTSXAdaptor from './shadcn-react-tsx/index.js';

/**
 * Adaptor Registry
 * 
 * Manages component extraction adaptors for different frameworks and file types.
 * Supports auto-detection and manual selection via CLI flags.
 */

class AdaptorRegistry {
  constructor() {
    this.adaptors = new Map();
    this.autoDetectOrder = [];
    
    // Register built-in adaptors
    this.registerDefaults();
  }

  registerDefaults() {
    // React TSX Adaptor (default)
    this.register('react-tsx', ReactTSXAdaptor, {
      priority: 100,
      extensions: ['.tsx', '.jsx', '.ts', '.js'],
      description: 'React components with TypeScript/JSX support'
    });
    
    // ShadCN React TSX Adaptor (specialized for ShadCN/UI components)
    this.register('shadcn-react-tsx', ShadCNReactTSXAdaptor, {
      priority: 110,
      extensions: ['.tsx', '.jsx', '.ts', '.js'],
      description: 'ShadCN/UI React components with CVA variants and Tailwind tokens'
    });
    
    // TODO: Add more adaptors
    // this.register('vue-sfc', VueSFCAdaptor, {...});
    // this.register('svelte', SvelteAdaptor, {...});
  }

  register(name, AdaptorClass, options = {}) {
    this.adaptors.set(name, {
      name,
      AdaptorClass,
      priority: options.priority || 50,
      extensions: options.extensions || [],
      description: options.description || '',
      experimental: options.experimental || false
    });
    
    // Update auto-detect order (highest priority first)
    this.autoDetectOrder = Array.from(this.adaptors.values())
      .sort((a, b) => b.priority - a.priority);
  }

  getAdaptor(name, options = {}) {
    const adaptorInfo = this.adaptors.get(name);
    if (!adaptorInfo) {
      throw new Error(`Unknown adaptor: ${name}. Available: ${this.getAvailableNames().join(', ')}`);
    }
    
    return new adaptorInfo.AdaptorClass(options);
  }

  autoDetectAdaptor(filePath, source, options = {}) {
    for (const adaptorInfo of this.autoDetectOrder) {
      const adaptor = new adaptorInfo.AdaptorClass(options);
      
      if (adaptor.canProcess(filePath, source)) {
        return {
          name: adaptorInfo.name,
          adaptor,
          confidence: this.calculateConfidence(filePath, source, adaptorInfo)
        };
      }
    }
    
    return null;
  }

  calculateConfidence(filePath, source, adaptorInfo) {
    let confidence = 0;
    
    // Extension match
    const ext = path.extname(filePath);
    if (adaptorInfo.extensions.includes(ext)) {
      confidence += 50;
    }
    
    // Content heuristics (framework-specific)
    if (adaptorInfo.name === 'react-tsx') {
      if (source.includes('React')) confidence += 30;
      if (source.includes('jsx') || source.includes('<')) confidence += 20;
    }
    
    if (adaptorInfo.name === 'shadcn-react-tsx') {
      if (source.includes('React')) confidence += 20;
      if (source.includes('cva(') || source.includes('import { cva }')) confidence += 40;
      if (source.includes('@radix-ui/')) confidence += 30;
      if (/\b(bg-|text-|border-|p-|m-)/.test(source)) confidence += 20;
      if (source.includes('asChild')) confidence += 15;
    }
    
    return Math.min(confidence, 100);
  }

  getAvailableNames() {
    return Array.from(this.adaptors.keys());
  }

  getAvailableAdaptors() {
    return Array.from(this.adaptors.values()).map(info => ({
      name: info.name,
      description: info.description,
      extensions: info.extensions,
      experimental: info.experimental
    }));
  }

  getDefaultAdaptor() {
    return 'react-tsx';
  }
}

// Singleton instance
export const adaptorRegistry = new AdaptorRegistry();

// Helper functions
export function createAdaptor(name, options = {}) {
  return adaptorRegistry.getAdaptor(name, options);
}

export function autoDetectAdaptor(filePath, source, options = {}) {
  return adaptorRegistry.autoDetectAdaptor(filePath, source, options);
}

export function listAdaptors() {
  return adaptorRegistry.getAvailableAdaptors();
}

export default adaptorRegistry;