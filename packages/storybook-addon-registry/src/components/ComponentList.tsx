
import { DCPComponent } from '../types';

interface ComponentListProps {
  components: DCPComponent[];
}

export const ComponentList: React.FC<ComponentListProps> = ({ components }) => {
  if (components.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '20px',
        color: '#68758a',
        fontSize: '13px'
      }}>
        No components found in registry
      </div>
    );
  }

  return (
    <div>
      {components.map((component) => (
        <div
          key={`${component.filePath}-${component.name}`}
          style={{
            padding: '12px',
            marginBottom: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #e3e8ee',
            borderRadius: '6px',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1d2635',
              fontFamily: 'Monaco, monospace'
            }}>
              {component.name}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {component.category && (
                <span style={{
                  fontSize: '10px',
                  color: '#68758a',
                  backgroundColor: '#f6f8fa',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  textTransform: 'capitalize'
                }}>
                  {component.category}
                </span>
              )}
              <span style={{
                fontSize: '10px',
                color: '#68758a',
                backgroundColor: '#f6f8fa',
                padding: '2px 6px',
                borderRadius: '3px',
              }}>
                {component.props.length} props
              </span>
            </div>
          </div>
          
          <div style={{
            fontSize: '11px',
            color: '#68758a',
            fontFamily: 'Monaco, monospace',
            marginBottom: '8px'
          }}>
            {component.filePath}
          </div>

          {component.props.length > 0 && (
            <div>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#1d2635',
                marginBottom: '4px'
              }}>
                Props:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {component.props.slice(0, 6).map((prop) => (
                  <span
                    key={prop.name}
                    style={{
                      fontSize: '10px',
                      color: prop.required ? '#0969da' : '#68758a',
                      backgroundColor: prop.required ? '#dbeafe' : '#f6f8fa',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontFamily: 'Monaco, monospace',
                      border: prop.required ? '1px solid #bfdbfe' : '1px solid #e3e8ee'
                    }}
                  >
                    {prop.name}
                    {prop.required && '*'}
                  </span>
                ))}
                {component.props.length > 6 && (
                  <span style={{
                    fontSize: '10px',
                    color: '#68758a',
                    padding: '2px 6px',
                  }}>
                    +{component.props.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {component.tokens && component.tokens.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#1d2635',
                marginBottom: '4px'
              }}>
                Uses tokens:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {component.tokens.slice(0, 4).map((token) => (
                  <span
                    key={token}
                    style={{
                      fontSize: '10px',
                      color: '#059669',
                      backgroundColor: '#d1fae5',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontFamily: 'Monaco, monospace',
                      border: '1px solid #a7f3d0'
                    }}
                  >
                    {token}
                  </span>
                ))}
                {component.tokens.length > 4 && (
                  <span style={{
                    fontSize: '10px',
                    color: '#68758a',
                    padding: '2px 6px',
                  }}>
                    +{component.tokens.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};