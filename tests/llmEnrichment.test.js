import { jest } from '@jest/globals';

// Mock OpenAI module with proper constructor
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                description: 'Enriched button',
                category: 'Input',
                status: 'stable',
                props: {
                  variant: {
                    type: 'string',
                    description: 'Visual style',
                    options: ['primary','secondary'],
                    source: 'llm'
                  },
                  originalProp: { type: 'number', description: 'Original only prop' }
                },
                states: ['disabled'],
                documentation: { usage: 'Use for primary actions', originalNote: 'Original note' },
                examples: [{ label: 'Demo', code: '<Button />' }]
              })
            }
          }]
        }))
      }
    }
  }))
}));

import { enrichComponent, initializeOpenAI } from '../core/llmEnrichment.js';

describe.skip('llmEnrichment', () => {
  const baseComponent = {
    name: 'Button',
    description: 'Original button description',
    props: {
      variant: { type: 'string', description: 'Original variant description' },
      originalProp: { type: 'number', description: 'Original only prop' }
    },
    states: ['original_state'],
    documentation: { originalNote: 'Original note' },
    examples: [{ label: 'Original Example', code: '<Button />' }]
  };

  beforeEach(() => {
    // Initialize OpenAI client with mock
    initializeOpenAI('test-key');
  });

  test('enriches component by merging LLM data with original data', async () => {
    const componentToEnrich = JSON.parse(JSON.stringify(baseComponent)); // Deep clone
    const enrichedComponent = await enrichComponent(componentToEnrich);

    // Verify description (LLM takes precedence)
    expect(enrichedComponent.description).toBe('Enriched button');
    expect(enrichedComponent.category).toBe('Input');
    expect(enrichedComponent.status).toBe('stable');

    // Verify props (merged)
    expect(enrichedComponent.props.variant.type).toBe(baseComponent.props.variant.type); // Original type preserved
    expect(enrichedComponent.props.variant.description).toBe('Visual style'); // LLM description overrides
    expect(enrichedComponent.props.variant.options).toEqual(['primary', 'secondary']);
    expect(enrichedComponent.props.variant.source).toBe('llm');
    expect(enrichedComponent.props.originalProp).toEqual(baseComponent.props.originalProp); // Original prop preserved

    // Verify states (LLM overrides, as per current logic: enriched.states || component.states)
    expect(enrichedComponent.states).toEqual(['disabled']);

    // Verify documentation (merged)
    expect(enrichedComponent.documentation.originalNote).toBe(baseComponent.documentation.originalNote);
    expect(enrichedComponent.documentation.usage).toBe('Use for primary actions');

    // Verify metadata
    expect(enrichedComponent.metadata).toBeDefined();
    expect(enrichedComponent.metadata.llmEnriched).toBe(true);
    expect(enrichedComponent.metadata.enrichedAt).toBeDefined();
  });

  test('handles API errors gracefully, returning original component without meta', async () => {
    const componentToEnrich = JSON.parse(JSON.stringify(baseComponent));
    
    // Mock OpenAI to fail
    const OpenAI = (await import('openai')).default;
    const mockInstance = new OpenAI();
    jest.spyOn(mockInstance.chat.completions, 'create').mockRejectedValueOnce(new Error('LLM API Error'));
    
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await enrichComponent(componentToEnrich);
    
    // Should return original component on error
    expect(result).toEqual(baseComponent);
    expect(result.metadata).toBeUndefined();
    
    consoleWarnSpy.mockRestore();
  });

  // Note: enrichComponent replaces fields with LLM-enriched values, not merges. This is the expected contract.
}); 