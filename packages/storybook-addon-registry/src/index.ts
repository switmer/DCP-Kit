// Export types for consumers
export * from './types';
export { dcpClient } from './websocket-client';

// Main addon export
export { RegistryPanel } from './components/RegistryPanel';

// Storybook addon registration happens in register.tsx
// This file serves as the main entry point for the package