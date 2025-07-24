import { RegistryUpdateEvent, ConnectionState } from './types';

export class DCPWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Set<(event: RegistryUpdateEvent) => void> = new Set();
  private connectionListeners: Set<(state: ConnectionState) => void> = new Set();
  
  private connectionState: ConnectionState = {
    connected: false,
  };

  constructor(private url: string = 'ws://localhost:8081') {}

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('🟢 DCP Registry connected');
        this.reconnectAttempts = 0;
        this.updateConnectionState({ connected: true });
        
        this.emit({
          type: 'registry:connected',
          payload: { status: 'connected' },
          timestamp: Date.now(),
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit({
            type: 'registry:update',
            payload: data,
            timestamp: Date.now(),
          });
          
          this.updateConnectionState({ 
            connected: true, 
            lastUpdate: Date.now() 
          });
        } catch (error) {
          console.warn('Failed to parse registry update:', error);
          this.emit({
            type: 'registry:error',
            payload: { error: 'Failed to parse registry data' },
            timestamp: Date.now(),
          });
        }
      };

      this.ws.onclose = () => {
        console.log('🔴 DCP Registry disconnected');
        this.updateConnectionState({ connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.warn('DCP Registry WebSocket error:', error);
        this.updateConnectionState({ 
          connected: false, 
          error: 'Connection failed' 
        });
      };
    } catch (error) {
      console.warn('Failed to create WebSocket connection:', error);
      this.updateConnectionState({ 
        connected: false, 
        error: 'Failed to connect' 
      });
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateConnectionState({ connected: false });
  }

  subscribe(callback: (event: RegistryUpdateEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  subscribeToConnection(callback: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(callback);
    // Immediately notify of current state
    callback(this.connectionState);
    return () => this.connectionListeners.delete(callback);
  }

  private emit(event: RegistryUpdateEvent): void {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.warn('Error in registry event callback:', error);
      }
    });
  }

  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.connectionListeners.forEach(callback => {
      try {
        callback(this.connectionState);
      } catch (error) {
        console.warn('Error in connection state callback:', error);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        this.connect();
      }
    }, delay);
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }
}

// Singleton instance
export const dcpClient = new DCPWebSocketClient();