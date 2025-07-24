
import { DCPRegistry } from '../types';

interface RegistryStatsProps {
  tokenCount: number;
  componentCount: number;
  registry: DCPRegistry | null;
}

export const RegistryStats: React.FC<RegistryStatsProps> = ({ 
  tokenCount, 
  componentCount, 
  registry 
}) => {
  const stats = [
    {
      label: 'Components',
      value: componentCount,
      icon: '🧩',
      color: '#0969da'
    },
    {
      label: 'Tokens',
      value: tokenCount,
      icon: '🎨',
      color: '#7c3aed'
    },
    {
      label: 'Categories',
      value: registry ? Object.keys(registry.tokens).length : 0,
      icon: '📁',
      color: '#059669'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '8px',
      marginBottom: '16px'
    }}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          style={{
            padding: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #e3e8ee',
            borderRadius: '6px',
            textAlign: 'center'
          }}
        >
          <div style={{
            fontSize: '16px',
            marginBottom: '4px'
          }}>
            {stat.icon}
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: '700',
            color: stat.color,
            marginBottom: '2px'
          }}>
            {stat.value}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#68758a',
            fontWeight: '500'
          }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};