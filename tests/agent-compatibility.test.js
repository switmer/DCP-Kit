import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('🧠 Agent Compatibility & Machine Readability', () => {
  const testDir = path.join(__dirname, 'temp-agent-compatibility');
  const cliPath = path.join(__dirname, '..', 'bin', 'dcp.js');
  
  beforeEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('Schema Completeness for LLMs', () => {
    it('should include all required keys for agent parsing', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      const wellDocumentedComponent = `
        interface CardProps {
          /** The title displayed at the top of the card */
          title: string;
          /** Optional description text */
          description?: string;
          /** Visual style variant */
          variant?: 'default' | 'outlined' | 'elevated';
          /** Whether the card can be clicked */
          clickable?: boolean;
          /** Content to display in the card */
          children: React.ReactNode;
          /** Callback when card is clicked */
          onClick?: (event: MouseEvent) => void;
        }
        
        /**
         * A flexible card component for displaying content
         * 
         * @example
         * <Card title="Example" variant="outlined">
         *   <p>Card content here</p>
         * </Card>
         */
        export const Card = ({ 
          title, 
          description, 
          variant = 'default', 
          clickable = false,
          children,
          onClick 
        }: CardProps) => {
          return (
            <div 
              className={\`card card-\${variant} \${clickable ? 'clickable' : ''}\`}
              onClick={clickable ? onClick : undefined}
            >
              <h3>{title}</h3>
              {description && <p>{description}</p>}
              {children}
            </div>
          );
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'Card.tsx'), wellDocumentedComponent);
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --agent-ready --json`
      );
      
      const result = JSON.parse(stdout.trim());
      const registry = JSON.parse(await fs.readFile(result.registryPath, 'utf-8'));
      const card = registry.components.find(c => c.name === 'Card');
      
      // Required fields for agent compatibility
      expect(card).toHaveProperty('name');
      expect(card).toHaveProperty('description');
      expect(card).toHaveProperty('tags');
      expect(card).toHaveProperty('props');
      expect(card).toHaveProperty('examples');
      expect(card).toHaveProperty('variants');
      
      // Props should have rich metadata
      expect(card.props.title).toHaveProperty('type');
      expect(card.props.title).toHaveProperty('description');
      expect(card.props.title).toHaveProperty('required');
      
      expect(card.props.variant).toHaveProperty('values');
      expect(card.props.variant).toHaveProperty('default');
      
      // Should include usage examples
      expect(card.examples).toBeDefined();
      expect(Array.isArray(card.examples)).toBe(true);
      expect(card.examples.length).toBeGreaterThan(0);
      
      // Should categorize by tags for agent discovery
      expect(Array.isArray(card.tags)).toBe(true);
      expect(card.tags.length).toBeGreaterThan(0);
    });

    it('should provide semantic metadata for component relationships', async () => {
      const componentDir = path.join(testDir, 'components');
      await fs.mkdir(componentDir, { recursive: true });
      
      // Create a component system with relationships
      const buttonComponent = `
        export const Button = ({ children, variant = 'primary' }: { children: React.ReactNode; variant?: string }) => {
          return <button className={\`btn btn-\${variant}\`}>{children}</button>;
        };
      `;
      
      const buttonGroupComponent = `
        import { Button } from './Button';
        
        interface ButtonGroupProps {
          orientation?: 'horizontal' | 'vertical';
          spacing?: 'sm' | 'md' | 'lg';
          children: React.ReactNode;
        }
        
        export const ButtonGroup = ({ orientation = 'horizontal', spacing = 'md', children }: ButtonGroupProps) => {
          return (
            <div className={\`btn-group btn-group-\${orientation} spacing-\${spacing}\`}>
              {children}
            </div>
          );
        };
      `;
      
      const formComponent = `
        import { Button } from './Button';
        import { ButtonGroup } from './ButtonGroup';
        
        export const Form = ({ onSubmit }: { onSubmit: () => void }) => {
          return (
            <form onSubmit={onSubmit}>
              <ButtonGroup>
                <Button variant="secondary">Cancel</Button>
                <Button variant="primary">Submit</Button>
              </ButtonGroup>
            </form>
          );
        };
      `;
      
      await fs.writeFile(path.join(componentDir, 'Button.tsx'), buttonComponent);
      await fs.writeFile(path.join(componentDir, 'ButtonGroup.tsx'), buttonGroupComponent);
      await fs.writeFile(path.join(componentDir, 'Form.tsx'), formComponent);
      
      const { stdout } = await execAsync(
        `node "${cliPath}" extract "${componentDir}" --analyze-relationships --json`
      );
      
      const result = JSON.parse(stdout.trim());
      const registry = JSON.parse(await fs.readFile(result.registryPath, 'utf-8'));
      
      // Should detect component dependencies
      const buttonGroup = registry.components.find(c => c.name === 'ButtonGroup');
      const form = registry.components.find(c => c.name === 'Form');
      
      if (buttonGroup.dependencies) {
        expect(buttonGroup.dependencies).toContain('Button');
      }
      
      if (form.dependencies) {
        expect(form.dependencies).toContain('Button');
        expect(form.dependencies).toContain('ButtonGroup');
      }
      
      // Should provide semantic categorization
      const button = registry.components.find(c => c.name === 'Button');
      if (button.semantic) {
        expect(button.semantic.category).toBe('interactive');
        expect(button.semantic.subcategory).toBe('button');
        expect(button.semantic.patterns).toContain('action');
      }
    });

    it('should validate JSON schema compliance for agent consumption', async () => {
      const registry = {
        name: 'agent-test-registry',
        version: '1.0.0',
        description: 'Registry optimized for agent consumption',
        components: [
          {
            name: 'AgentFriendlyComponent',
            description: 'A component designed for LLM understanding',
            type: 'component',
            category: 'interactive',
            complexity: 'simple',
            tags: ['ui', 'button', 'interactive'],
            props: {
              label: {
                type: 'string',
                description: 'Text displayed on the button',
                required: true,
                examples: ['Click me', 'Submit', 'Cancel']
              },
              variant: {
                type: 'string',
                description: 'Visual style variant',
                values: ['primary', 'secondary', 'danger'],
                default: 'primary',
                examples: ['primary', 'secondary', 'danger']
              },
              disabled: {
                type: 'boolean',
                description: 'Whether the button is disabled',
                default: false,
                optional: true
              }
            },
            examples: [
              '<AgentFriendlyComponent label="Click me" />',
              '<AgentFriendlyComponent label="Submit" variant="primary" />',
              '<AgentFriendlyComponent label="Delete" variant="danger" />'
            ],
            usagePatterns: [
              'forms',
              'call-to-action',
              'navigation'
            ],
            accessibility: {
              role: 'button',
              keyboardSupport: true,
              screenReaderSupport: true
            },
            testingGuidance: {
              testIds: ['button-label', 'button-variant'],
              behaviors: ['click', 'keyboard-navigation', 'disabled-state']
            }
          }
        ],
        metadata: {
          agentOptimized: true,
          schemaVersion: '2.0.0',
          llmFriendly: true
        }
      };
      
      const registryPath = path.join(testDir, 'agent-optimized.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      const { stdout } = await execAsync(
        `node "${cliPath}" validate "${registryPath}" --agent-schema --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.agentCompatible).toBe(true);
      
      // Should validate all agent-required fields are present
      if (result.agentValidation) {
        expect(result.agentValidation.hasDescriptions).toBe(true);
        expect(result.agentValidation.hasExamples).toBe(true);
        expect(result.agentValidation.hasTags).toBe(true);
        expect(result.agentValidation.hasUsagePatterns).toBe(true);
      }
    });
  });

  describe('Mutation Hooks Testing', () => {
    it('should validate agent-created mutations result in valid packs', async () => {
      const originalRegistry = {
        name: 'mutation-test',
        version: '1.0.0',
        components: [
          {
            name: 'Button',
            props: {
              variant: { type: 'string', values: ['primary', 'secondary'] },
              size: { type: 'string', values: ['sm', 'md', 'lg'] }
            }
          }
        ]
      };
      
      const originalPath = path.join(testDir, 'original.json');
      await fs.writeFile(originalPath, JSON.stringify(originalRegistry, null, 2));
      
      // Simulate agent-generated mutation: add new variant
      const agentMutation = [
        {
          op: 'add',
          path: '/components/0/props/variant/values/-',
          value: 'ghost'
        },
        {
          op: 'add',
          path: '/components/0/examples',
          value: [
            '<Button variant="primary">Primary</Button>',
            '<Button variant="secondary">Secondary</Button>',
            '<Button variant="ghost">Ghost</Button>'
          ]
        },
        {
          op: 'add',
          path: '/components/0/description',
          value: 'A flexible button component with multiple variants'
        }
      ];
      
      const mutationPath = path.join(testDir, 'agent-mutation.json');
      const mutatedPath = path.join(testDir, 'mutated.json');
      
      await fs.writeFile(mutationPath, JSON.stringify(agentMutation, null, 2));
      
      // Apply agent mutation
      const { stdout: mutateOutput } = await execAsync(
        `node "${cliPath}" mutate "${originalPath}" "${mutationPath}" "${mutatedPath}" --agent-mode --json`
      );
      
      const mutateResult = JSON.parse(mutateOutput);
      expect(mutateResult.success).toBe(true);
      
      // Validate result is still agent-compatible
      const { stdout: validateOutput } = await execAsync(
        `node "${cliPath}" validate "${mutatedPath}" --agent-schema --json`
      );
      
      const validateResult = JSON.parse(validateOutput);
      expect(validateResult.success).toBe(true);
      expect(validateResult.agentCompatible).toBe(true);
      
      // Verify mutation was applied correctly
      const mutatedRegistry = JSON.parse(await fs.readFile(mutatedPath, 'utf-8'));
      const button = mutatedRegistry.components.find(c => c.name === 'Button');
      
      expect(button.props.variant.values).toContain('ghost');
      expect(button.examples).toBeDefined();
      expect(button.examples.some(ex => ex.includes('ghost'))).toBe(true);
      expect(button.description).toBeDefined();
    });

    it('should handle complex agent workflows with multiple mutations', async () => {
      const registry = {
        name: 'workflow-test',
        version: '1.0.0',
        components: [
          {
            name: 'Card',
            props: {
              title: { type: 'string' }
            }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'workflow.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Agent workflow: enhance Card component step by step
      const mutations = [
        // Step 1: Add description prop
        [{ op: 'add', path: '/components/0/props/description', value: { type: 'string', optional: true } }],
        
        // Step 2: Add variants
        [{ op: 'add', path: '/components/0/props/variant', value: { type: 'string', values: ['default', 'outlined'], default: 'default' } }],
        
        // Step 3: Add examples
        [{ op: 'add', path: '/components/0/examples', value: ['<Card title="Title" />', '<Card title="Title" description="Description" variant="outlined" />'] }],
        
        // Step 4: Add metadata
        [
          { op: 'add', path: '/components/0/description', value: 'A flexible card component' },
          { op: 'add', path: '/components/0/tags', value: ['ui', 'layout', 'content'] }
        ]
      ];
      
      let currentPath = registryPath;
      
      for (let i = 0; i < mutations.length; i++) {
        const mutationPath = path.join(testDir, `mutation-${i}.json`);
        const nextPath = path.join(testDir, `step-${i + 1}.json`);
        
        await fs.writeFile(mutationPath, JSON.stringify(mutations[i], null, 2));
        
        const { stdout } = await execAsync(
          `node "${cliPath}" mutate "${currentPath}" "${mutationPath}" "${nextPath}" --agent-mode --json`
        );
        
        const result = JSON.parse(stdout);
        expect(result.success).toBe(true);
        
        currentPath = nextPath;
      }
      
      // Final validation
      const { stdout: finalValidation } = await execAsync(
        `node "${cliPath}" validate "${currentPath}" --agent-schema --comprehensive --json`
      );
      
      const finalResult = JSON.parse(finalValidation);
      expect(finalResult.success).toBe(true);
      expect(finalResult.agentCompatible).toBe(true);
      
      // Verify final state
      const finalRegistry = JSON.parse(await fs.readFile(currentPath, 'utf-8'));
      const card = finalRegistry.components.find(c => c.name === 'Card');
      
      expect(card.props.description).toBeDefined();
      expect(card.props.variant).toBeDefined();
      expect(card.examples).toBeDefined();
      expect(card.description).toBeDefined();
      expect(card.tags).toBeDefined();
    });

    it('should preserve agent compatibility through rollbacks', async () => {
      const agentOptimizedRegistry = {
        name: 'rollback-test',
        version: '1.0.0',
        components: [
          {
            name: 'Input',
            description: 'A form input component',
            tags: ['form', 'input', 'ui'],
            props: {
              placeholder: { type: 'string', optional: true, description: 'Placeholder text' },
              disabled: { type: 'boolean', default: false, description: 'Whether input is disabled' }
            },
            examples: [
              '<Input placeholder="Enter text" />',
              '<Input placeholder="Disabled" disabled={true} />'
            ],
            usagePatterns: ['forms', 'search', 'data-entry']
          }
        ],
        metadata: {
          agentOptimized: true
        }
      };
      
      const originalPath = path.join(testDir, 'agent-original.json');
      await fs.writeFile(originalPath, JSON.stringify(agentOptimizedRegistry, null, 2));
      
      // Apply mutation that breaks agent compatibility
      const breakingMutation = [
        { op: 'remove', path: '/components/0/description' },
        { op: 'remove', path: '/components/0/tags' },
        { op: 'remove', path: '/components/0/examples' },
        { op: 'remove', path: '/metadata/agentOptimized' }
      ];
      
      const mutationPath = path.join(testDir, 'breaking-mutation.json');
      const brokenPath = path.join(testDir, 'broken.json');
      const undoPath = path.join(testDir, 'undo.json');
      
      await fs.writeFile(mutationPath, JSON.stringify(breakingMutation, null, 2));
      
      // Apply breaking mutation
      await execAsync(
        `node "${cliPath}" mutate "${originalPath}" "${mutationPath}" "${brokenPath}" --undo "${undoPath}" --json`
      );
      
      // Verify it's no longer agent compatible
      try {
        const { stdout: brokenValidation } = await execAsync(
          `node "${cliPath}" validate "${brokenPath}" --agent-schema --json`
        );
        
        const brokenResult = JSON.parse(brokenValidation);
        expect(brokenResult.agentCompatible).toBe(false);
      } catch (error) {
        // Also acceptable - validation should fail
      }
      
      // Rollback
      const { stdout: rollbackOutput } = await execAsync(
        `node "${cliPath}" rollback "${brokenPath}" "${undoPath}" --json`
      );
      
      const rollbackResult = JSON.parse(rollbackOutput);
      expect(rollbackResult.success).toBe(true);
      
      // Verify agent compatibility is restored
      const { stdout: restoredValidation } = await execAsync(
        `node "${cliPath}" validate "${brokenPath}" --agent-schema --json`
      );
      
      const restoredResult = JSON.parse(restoredValidation);
      expect(restoredResult.success).toBe(true);
      expect(restoredResult.agentCompatible).toBe(true);
    });
  });

  describe('Prompt Test Compatibility', () => {
    it('should handle natural language mutation requests', async () => {
      const registry = {
        name: 'prompt-test',
        version: '1.0.0',
        components: [
          {
            name: 'Button',
            props: {
              variant: { type: 'string', values: ['primary', 'secondary'] }
            }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'prompt-registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Test natural language prompt
      const prompt = 'Add a new variant called "outline" to the Button component';
      
      const { stdout } = await execAsync(
        `node "${cliPath}" agent "${prompt}" --registry "${registryPath}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      expect(result.intent).toContain('outline');
      expect(result.component).toBe('Button');
      
      // Should provide structured next steps
      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps.mutation).toBeDefined();
      expect(result.nextSteps.preview).toBeDefined();
      expect(result.nextSteps.apply).toBeDefined();
    });

    it('should understand component relationships in prompts', async () => {
      const registry = {
        name: 'relationship-test',
        version: '1.0.0',
        components: [
          {
            name: 'Button',
            props: { variant: { type: 'string', values: ['primary'] } }
          },
          {
            name: 'Card',
            props: { title: { type: 'string' } }
          },
          {
            name: 'Modal',
            props: { title: { type: 'string' }, footer: { type: 'ReactNode' } }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'relationship-registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Complex prompt involving multiple components
      const prompt = 'Make all buttons in modals use the secondary variant by default';
      
      const { stdout } = await execAsync(
        `node "${cliPath}" agent "${prompt}" --registry "${registryPath}" --analyze-relationships --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      
      // Should understand the relationship between Button and Modal
      expect(result.affectedComponents).toContain('Button');
      expect(result.affectedComponents).toContain('Modal');
      expect(result.context).toContain('modal');
      
      // Should provide scoped mutations
      if (result.mutations) {
        expect(result.mutations.some(m => 
          m.component === 'Button' && m.context === 'modal'
        )).toBe(true);
      }
    });

    it('should validate prompt results match expectations', async () => {
      const registry = {
        name: 'expectation-test',
        version: '1.0.0',
        components: [
          {
            name: 'Alert',
            props: {
              type: { type: 'string', values: ['info', 'warning', 'error'] },
              message: { type: 'string' }
            }
          }
        ]
      };
      
      const registryPath = path.join(testDir, 'expectation-registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Prompt with specific expectations
      const prompt = 'Add a success type to Alert component and update examples to show all four types';
      
      const { stdout: agentOutput } = await execAsync(
        `node "${cliPath}" agent "${prompt}" --registry "${registryPath}" --json`
      );
      
      const agentResult = JSON.parse(agentOutput.trim());
      expect(agentResult.success).toBe(true);
      
      // Apply the suggested mutation
      if (agentResult.mutation) {
        const mutationPath = path.join(testDir, 'prompt-mutation.json');
        const resultPath = path.join(testDir, 'prompt-result.json');
        
        await fs.writeFile(mutationPath, JSON.stringify(agentResult.mutation, null, 2));
        
        await execAsync(
          `node "${cliPath}" mutate "${registryPath}" "${mutationPath}" "${resultPath}" --json`
        );
        
        // Validate the result matches prompt expectations
        const resultRegistry = JSON.parse(await fs.readFile(resultPath, 'utf-8'));
        const alert = resultRegistry.components.find(c => c.name === 'Alert');
        
        // Should have added success type
        expect(alert.props.type.values).toContain('success');
        expect(alert.props.type.values).toHaveLength(4);
        
        // Should have updated examples to show all four types
        if (alert.examples) {
          expect(alert.examples.some(ex => ex.includes('info'))).toBe(true);
          expect(alert.examples.some(ex => ex.includes('warning'))).toBe(true);
          expect(alert.examples.some(ex => ex.includes('error'))).toBe(true);
          expect(alert.examples.some(ex => ex.includes('success'))).toBe(true);
        }
      }
    });

    it('should handle ambiguous prompts gracefully', async () => {
      const registry = {
        name: 'ambiguous-test',
        version: '1.0.0',
        components: [
          { name: 'Button', props: { variant: { type: 'string' } } },
          { name: 'Link', props: { variant: { type: 'string' } } },
          { name: 'Badge', props: { variant: { type: 'string' } } }
        ]
      };
      
      const registryPath = path.join(testDir, 'ambiguous-registry.json');
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      
      // Ambiguous prompt
      const prompt = 'Add a danger variant';
      
      const { stdout } = await execAsync(
        `node "${cliPath}" agent "${prompt}" --registry "${registryPath}" --json`
      );
      
      const result = JSON.parse(stdout.trim());
      expect(result.success).toBe(true);
      
      // Should request clarification
      expect(result.clarificationNeeded).toBe(true);
      expect(result.ambiguousComponents).toBeDefined();
      expect(result.ambiguousComponents.length).toBeGreaterThan(1);
      
      // Should suggest specific alternatives
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.some(s => s.includes('Button'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('Link'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('Badge'))).toBe(true);
    });
  });
});