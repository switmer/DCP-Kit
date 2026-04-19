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
  "name": "thefirestore-experiment",
  "version": "0.1.0",
  "components": 3,
  "tokens": 1,
  "generatedAt": "2026-04-19T18:19:49.230Z"
};