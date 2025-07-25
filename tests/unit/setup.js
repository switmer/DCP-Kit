// Jest setup file for DCP Transformer tests
import { jest } from '@jest/globals';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Store original console methods for verbose output when needed
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

// Set up test environment
beforeEach(() => {
  // Suppress console output during tests unless JEST_VERBOSE is set
  if (process.env.JEST_VERBOSE !== 'true') {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Keep error messages for debugging
    // jest.spyOn(console, 'error').mockImplementation(() => {});
  }
});

afterEach(() => {
  // Restore console methods
  if (console.log.mockRestore) {
    console.log.mockRestore();
  }
  if (console.warn.mockRestore) {
    console.warn.mockRestore();
  }
  if (console.error.mockRestore) {
    console.error.mockRestore();
  }
});

// Add custom matchers
expect.extend({
  toBeValidJSON(received) {
    try {
      JSON.parse(received);
      return {
        message: () => `Expected string to not be valid JSON`,
        pass: true
      };
    } catch (error) {
      return {
        message: () => `Expected string to be valid JSON, but got: ${error.message}`,
        pass: false
      };
    }
  },
  
  toHaveValidDCPStructure(received) {
    const requiredFields = ['name', 'version', 'components'];
    const missingFields = requiredFields.filter(field => !received[field]);
    
    if (missingFields.length === 0) {
      return {
        message: () => `Expected object to not have valid DCP structure`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected object to have valid DCP structure, missing: ${missingFields.join(', ')}`,
        pass: false
      };
    }
  },
  
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `Expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  // Helper to create temporary test directories
  async createTempDir(prefix = 'test-') {
    const { mkdtemp } = await import('fs/promises');
    const { tmpdir } = await import('os');
    const { join } = await import('path');
    
    return mkdtemp(join(tmpdir(), prefix));
  },
  
  // Helper to clean up test directories
  async cleanupDir(dirPath) {
    const { rm } = await import('fs/promises');
    
    try {
      await rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's fine
    }
  },
  
  // Helper to wait for a condition
  async waitFor(condition, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 