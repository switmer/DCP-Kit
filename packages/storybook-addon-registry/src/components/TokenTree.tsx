
import { useState } from 'react';
import { DCPToken } from '../types';

interface TokenTreeProps {
  tokens: Record<string, Record<string, DCPToken>>;
}

interface TokenGroupProps {
  name: string;
  tokens: Record<string, DCPToken>;
  isOpen: boolean;
  onToggle: () => void;
}

const TokenGroup: React.FC<TokenGroupProps> = ({ name, tokens, isOpen, onToggle }) => {
  const tokenCount = Object.keys(tokens).length;
  
  return (
    <div style={{ marginBottom: '8px' }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 12px',
          border: 'none',
          backgroundColor: '#f6f8fa',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          color: '#1d2635',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ 
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            fontSize: '10px'
          }}>
            ▶
          </span>
          <span style={{ textTransform: 'capitalize' }}>{name}</span>
        </div>
        <span style={{ 
          fontSize: '11px', 
          color: '#68758a',
          backgroundColor: '#ffffff',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {tokenCount}
        </span>
      </button>
      
      {isOpen && (
        <div style={{ 
          marginTop: '4px',
          paddingLeft: '16px'
        }}>
          {Object.entries(tokens).map(([tokenName, token]) => (
            <div
              key={tokenName}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                marginBottom: '2px',
                backgroundColor: '#ffffff',
                border: '1px solid #e3e8ee',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span style={{ 
                  fontWeight: '500',
                  color: '#1d2635',
                  fontFamily: 'Monaco, monospace'
                }}>
                  {tokenName}
                </span>
                {token.type && (
                  <span style={{
                    fontSize: '10px',
                    color: '#68758a',
                    backgroundColor: '#f6f8fa',
                    padding: '1px 4px',
                    borderRadius: '3px',
                  }}>
                    {token.type}
                  </span>
                )}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {token.type === 'color' && (
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: String(token.value),
                    borderRadius: '2px',
                    border: '1px solid #e3e8ee',
                  }} />
                )}
                <code style={{
                  fontSize: '11px',
                  color: '#0969da',
                  backgroundColor: '#f6f8fa',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontFamily: 'Monaco, monospace'
                }}>
                  {String(token.value)}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const TokenTree: React.FC<TokenTreeProps> = ({ tokens }) => {
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(['colors', 'spacing']) // Auto-open common groups
  );

  const toggleGroup = (groupName: string) => {
    const newOpenGroups = new Set(openGroups);
    if (newOpenGroups.has(groupName)) {
      newOpenGroups.delete(groupName);
    } else {
      newOpenGroups.add(groupName);
    }
    setOpenGroups(newOpenGroups);
  };

  if (Object.keys(tokens).length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '20px',
        color: '#68758a',
        fontSize: '13px'
      }}>
        No tokens found in registry
      </div>
    );
  }

  return (
    <div>
      {Object.entries(tokens).map(([groupName, groupTokens]) => (
        <TokenGroup
          key={groupName}
          name={groupName}
          tokens={groupTokens}
          isOpen={openGroups.has(groupName)}
          onToggle={() => toggleGroup(groupName)}
        />
      ))}
    </div>
  );
};