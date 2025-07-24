
import { ConnectionState } from '../types';

interface ConnectionStatusProps {
  state: ConnectionState;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state }) => {
  if (state.connected) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: '#22c55e'
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          backgroundColor: '#22c55e',
          borderRadius: '50%',
        }} />
        Live
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: '#ef4444'
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          backgroundColor: '#ef4444',
          borderRadius: '50%',
        }} />
        Error
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '12px',
      color: '#f59e0b'
    }}>
      <div style={{
        width: '6px',
        height: '6px',
        backgroundColor: '#f59e0b',
        borderRadius: '50%',
        animation: 'pulse 2s infinite'
      }} />
      Connecting...
    </div>
  );
};