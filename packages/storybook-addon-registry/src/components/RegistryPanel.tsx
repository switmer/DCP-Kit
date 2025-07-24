import { useState, useEffect } from 'react';
import { dcpClient } from '../websocket-client';
import { DCPRegistry, RegistryUpdateEvent, ConnectionState } from '../types';
import { ConnectionStatus } from './ConnectionStatus';
import { TokenTree } from './TokenTree';
import { ComponentList } from './ComponentList';
import { RegistryStats } from './RegistryStats';

interface RegistryPanelProps {
  active: boolean;
}

export const RegistryPanel = ({ active }: RegistryPanelProps) => {
  const [registry, setRegistry] = useState<DCPRegistry | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
  });
  const [activeTab, setActiveTab] = useState<'tokens' | 'components'>('tokens');

  useEffect(() => {
    if (!active) return;

    // Connect to DCP WebSocket
    dcpClient.connect();

    // Subscribe to registry updates
    const unsubscribeRegistry = dcpClient.subscribe((event: RegistryUpdateEvent) => {
      switch (event.type) {
        case 'registry:update':
          setRegistry(event.payload as DCPRegistry);
          break;
        case 'registry:error':
          console.warn('Registry error:', event.payload);
          break;
      }
    });

    // Subscribe to connection state
    const unsubscribeConnection = dcpClient.subscribeToConnection(setConnectionState);

    return () => {
      unsubscribeRegistry();
      unsubscribeConnection();
    };
  }, [active]);

  // Disconnect when panel is not active
  useEffect(() => {
    if (!active) {
      dcpClient.disconnect();
    }
  }, [active]);

  if (!active) {
    return null;
  }

  // Guard against undefined data crashes
  if (!registry && connectionState.connected === false) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        color: '#68758a' 
      }}>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>🔍</div>
        <div style={{ marginBottom: '8px' }}>No DCP Registry detected</div>
        <div style={{ fontSize: '12px' }}>
          Start with: <code style={{ 
            backgroundColor: '#f6f8fa', 
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'Monaco, monospace'
          }}>dcp watch --ws</code>
        </div>
      </div>
    );
  }

  const tokenCount = registry?.tokens ? 
    Object.values(registry.tokens).reduce((acc, group) => acc + Object.keys(group || {}).length, 0) : 0;
  
  const componentCount = registry?.components?.length || 0;

  return (
    <div style={{ 
      padding: '16px', 
      height: '100%', 
      overflow: 'auto',
      fontFamily: '"Nunito Sans", sans-serif',
      fontSize: '14px',
      backgroundColor: '#ffffff'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '16px',
        borderBottom: '1px solid #e3e8ee',
        paddingBottom: '12px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px' 
        }}>
          <span style={{ 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#1d2635'
          }}>
            DCP Registry
          </span>
          <ConnectionStatus state={connectionState} />
        </div>
        
        <div style={{ fontSize: '12px', color: '#68758a' }}>
          {registry?.metadata?.extractedAt && 
            `Updated ${new Date(registry.metadata.extractedAt).toLocaleTimeString()}`
          }
        </div>
      </div>

      {!connectionState.connected && !registry ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          color: '#68758a' 
        }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>🔍</div>
          <div style={{ marginBottom: '8px' }}>No DCP Registry detected</div>
          <div style={{ fontSize: '12px' }}>
            Start with: <code style={{ 
              backgroundColor: '#f6f8fa', 
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'Monaco, monospace'
            }}>dcp watch --ws</code>
          </div>
        </div>
      ) : (
        <>
          <RegistryStats 
            tokenCount={tokenCount}
            componentCount={componentCount}
            registry={registry}
          />

          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              gap: '2px',
              backgroundColor: '#f6f8fa',
              padding: '2px',
              borderRadius: '6px'
            }}>
              <button
                onClick={() => setActiveTab('tokens')}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  border: 'none',
                  backgroundColor: activeTab === 'tokens' ? '#ffffff' : 'transparent',
                  color: activeTab === 'tokens' ? '#1d2635' : '#68758a',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: activeTab === 'tokens' ? '600' : '400',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'tokens' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Tokens ({tokenCount})
              </button>
              <button
                onClick={() => setActiveTab('components')}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  border: 'none',
                  backgroundColor: activeTab === 'components' ? '#ffffff' : 'transparent',
                  color: activeTab === 'components' ? '#1d2635' : '#68758a',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: activeTab === 'components' ? '600' : '400',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'components' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Components ({componentCount})
              </button>
            </div>
          </div>

          {activeTab === 'tokens' && (
            <TokenTree tokens={registry?.tokens || {}} />
          )}

          {activeTab === 'components' && (
            <ComponentList components={registry?.components || []} />
          )}
        </>
      )}
    </div>
  );
};