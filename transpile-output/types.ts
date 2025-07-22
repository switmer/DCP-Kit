// Generated types for DCP components
export type ComponentVariant = 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
export type ComponentSize = 'sm' | 'md' | 'lg';

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Registry metadata
export interface RegistryInfo {
  name: string;
  version: string;
  components: number;
  tokens: number;
  generatedAt: string;
}

export const registryInfo: RegistryInfo = {
  "name": "example-components",
  "version": "1.0.0",
  "components": 2,
  "tokens": 5,
  "generatedAt": "2025-07-22T06:37:18.040Z"
};