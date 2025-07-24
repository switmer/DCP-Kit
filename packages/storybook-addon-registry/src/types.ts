export interface DCPToken {
  value: string | number;
  type: string;
  description?: string;
  category?: string;
  usage?: string[];
}

export interface DCPComponent {
  name: string;
  type: 'component';
  category: string;
  filePath: string;
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  tokens?: string[];
  metadata: {
    adaptor: string;
    extractedAt: string;
  };
}

export interface DCPRegistry {
  name?: string;
  version?: string;
  components: DCPComponent[];
  tokens: Record<string, Record<string, DCPToken>>;
  metadata?: {
    extractedAt: string;
    source: string;
  };
}

export interface RegistryUpdateEvent {
  type: 'registry:update' | 'registry:error' | 'registry:connected';
  payload: DCPRegistry | { error: string } | { status: string };
  timestamp: number;
}

export interface ConnectionState {
  connected: boolean;
  lastUpdate?: number;
  error?: string;
}