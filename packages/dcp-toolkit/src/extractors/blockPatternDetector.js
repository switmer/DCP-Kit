import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';

/**
 * Block Pattern Detector - Identifies compound component patterns for registry:block generation
 * 
 * Detects:
 * - Multi-component compositions (Card + Avatar + Badge + Button)
 * - Layout patterns (Dashboard grids, navigation structures)
 * - Complex interactive patterns (Forms, modals, wizards)
 */
export class BlockPatternDetector {
  constructor(options = {}) {
    this.options = {
      minComponentsForBlock: 3,
      layoutPatterns: ['grid', 'flex', 'dashboard', 'sidebar', 'header'],
      complexPatterns: ['form', 'modal', 'wizard', 'table', 'chart'],
      ...options
    };

    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        allowJs: true,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    });
  }

  /**
   * Analyze component for block patterns
   */
  async analyzeForBlockPatterns(dcpComponent, sourceCode, filePath) {
    const patterns = [];

    try {
      const sourceFile = this.project.createSourceFile(filePath, sourceCode, { overwrite: true });

      // 1. Detect component composition patterns
      const compositionPattern = this.detectCompositionPattern(sourceFile, dcpComponent);
      if (compositionPattern) {
        patterns.push(compositionPattern);
      }

      // 2. Detect layout patterns
      const layoutPattern = this.detectLayoutPattern(sourceFile, dcpComponent);
      if (layoutPattern) {
        patterns.push(layoutPattern);
      }

      // 3. Detect complex interaction patterns
      const interactionPattern = this.detectInteractionPattern(sourceFile, dcpComponent);
      if (interactionPattern) {
        patterns.push(interactionPattern);
      }

      // 4. Detect naming-based patterns
      const namingPattern = this.detectNamingPattern(dcpComponent, filePath);
      if (namingPattern) {
        patterns.push(namingPattern);
      }

    } catch (error) {
      console.warn(`[BlockPatternDetector] AST analysis failed: ${error.message}`);
    }

    return {
      isBlock: patterns.length > 0,
      patterns,
      confidence: this.calculateBlockConfidence(patterns),
      suggestedBlockType: this.suggestBlockType(patterns)
    };
  }

  /**
   * Detect component composition patterns (multiple UI components used together)
   */
  detectCompositionPattern(sourceFile, dcpComponent) {
    const usedComponents = new Set();
    const componentUsageMap = new Map();

    // Find JSX elements and track component usage
    const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement);
    
    for (const element of jsxElements) {
      const tagName = element.getTagNameNode().getText();
      
      // Skip HTML elements, focus on component usage
      if (this.isReactComponent(tagName)) {
        usedComponents.add(tagName);
        componentUsageMap.set(tagName, (componentUsageMap.get(tagName) || 0) + 1);
      }
    }

    // Check if this qualifies as a compound component
    if (usedComponents.size >= this.options.minComponentsForBlock) {
      const commonUIComponents = Array.from(usedComponents).filter(comp => 
        this.isCommonUIComponent(comp)
      );

      if (commonUIComponents.length >= 2) {
        return {
          type: 'composition',
          confidence: 0.8,
          components: Array.from(usedComponents),
          commonUIComponents,
          usage: Object.fromEntries(componentUsageMap),
          description: `Compound component using ${commonUIComponents.join(', ')}`
        };
      }
    }

    return null;
  }

  /**
   * Detect layout patterns (grids, flex layouts, etc.)
   */
  detectLayoutPattern(sourceFile, dcpComponent) {
    const layoutClasses = [];
    const layoutStructure = {
      hasGrid: false,
      hasFlex: false,
      hasContainer: false,
      hasResponsive: false
    };

    // Find className attributes and analyze layout classes
    const jsxAttributes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute)
      .filter(attr => attr.getName() === 'className');

    for (const attr of jsxAttributes) {
      const value = attr.getInitializer();
      if (value && value.getKind() === SyntaxKind.StringLiteral) {
        const classes = value.getLiteralValue().split(/\s+/);
        layoutClasses.push(...classes);
      }
    }

    // Analyze layout patterns
    const gridClasses = layoutClasses.filter(cls => cls.includes('grid'));
    const flexClasses = layoutClasses.filter(cls => cls.includes('flex'));
    const containerClasses = layoutClasses.filter(cls => 
      cls.includes('container') || cls.includes('max-w') || cls.includes('mx-auto')
    );
    const responsiveClasses = layoutClasses.filter(cls => 
      /^(sm|md|lg|xl|2xl):/.test(cls)
    );

    layoutStructure.hasGrid = gridClasses.length > 0;
    layoutStructure.hasFlex = flexClasses.length > 0;
    layoutStructure.hasContainer = containerClasses.length > 0;
    layoutStructure.hasResponsive = responsiveClasses.length > 0;

    // Determine if this is a layout pattern
    const layoutScore = Object.values(layoutStructure).filter(Boolean).length;
    
    if (layoutScore >= 2) {
      return {
        type: 'layout',
        confidence: Math.min(layoutScore / 4, 0.9),
        structure: layoutStructure,
        classes: {
          grid: gridClasses,
          flex: flexClasses,
          container: containerClasses,
          responsive: responsiveClasses
        },
        description: this.describeLayoutPattern(layoutStructure)
      };
    }

    return null;
  }

  /**
   * Detect complex interaction patterns
   */
  detectInteractionPattern(sourceFile, dcpComponent) {
    const patterns = [];
    const hooks = [];
    const handlers = [];

    // Look for React hooks usage
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    
    for (const call of callExpressions) {
      const expression = call.getExpression();
      if (expression.getKind() === SyntaxKind.Identifier) {
        const hookName = expression.getText();
        if (hookName.startsWith('use')) {
          hooks.push(hookName);
        }
      }
    }

    // Look for event handlers
    const jsxAttributes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);
    for (const attr of jsxAttributes) {
      const name = attr.getName();
      if (name.startsWith('on') && name.length > 2) {
        handlers.push(name);
      }
    }

    // Classify interaction complexity
    const stateHooks = hooks.filter(hook => 
      ['useState', 'useReducer', 'useContext'].includes(hook)
    );
    const effectHooks = hooks.filter(hook => 
      ['useEffect', 'useLayoutEffect', 'useCallback', 'useMemo'].includes(hook)
    );
    const formHooks = hooks.filter(hook => 
      hook.includes('Form') || hook.includes('form')
    );

    if (stateHooks.length >= 2 || effectHooks.length >= 2 || formHooks.length >= 1) {
      return {
        type: 'interaction',
        confidence: 0.7,
        complexity: this.calculateInteractionComplexity(hooks, handlers),
        hooks: {
          state: stateHooks,
          effect: effectHooks,
          form: formHooks,
          all: hooks
        },
        handlers,
        description: this.describeInteractionPattern(hooks, handlers)
      };
    }

    return null;
  }

  /**
   * Detect patterns based on naming conventions
   */
  detectNamingPattern(dcpComponent, filePath) {
    const componentName = dcpComponent.name?.toLowerCase() || '';
    const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase();
    const dirName = path.basename(path.dirname(filePath)).toLowerCase();

    // Check for layout naming patterns
    const layoutNames = ['dashboard', 'layout', 'page', 'shell', 'container', 'wrapper'];
    const blockNames = ['card', 'modal', 'form', 'table', 'chart', 'sidebar', 'header', 'footer'];
    const complexNames = ['wizard', 'stepper', 'flow', 'builder', 'editor'];

    const nameToCheck = [componentName, fileName, dirName].join(' ');

    if (layoutNames.some(name => nameToCheck.includes(name))) {
      return {
        type: 'naming-layout',
        confidence: 0.6,
        indicators: layoutNames.filter(name => nameToCheck.includes(name)),
        description: `Layout component based on naming: ${componentName}`
      };
    }

    if (complexNames.some(name => nameToCheck.includes(name))) {
      return {
        type: 'naming-complex',
        confidence: 0.8,
        indicators: complexNames.filter(name => nameToCheck.includes(name)),
        description: `Complex interaction component: ${componentName}`
      };
    }

    if (blockNames.some(name => nameToCheck.includes(name))) {
      return {
        type: 'naming-block',
        confidence: 0.5,
        indicators: blockNames.filter(name => nameToCheck.includes(name)),
        description: `Block component: ${componentName}`
      };
    }

    return null;
  }

  /**
   * Helper methods
   */
  isReactComponent(tagName) {
    return /^[A-Z]/.test(tagName) && !['Fragment'].includes(tagName);
  }

  isCommonUIComponent(componentName) {
    const uiComponents = [
      'Button', 'Card', 'Avatar', 'Badge', 'Input', 'Label', 'Select',
      'Dialog', 'Modal', 'Popover', 'Tooltip', 'Dropdown', 'Menu',
      'Table', 'Form', 'Checkbox', 'Radio', 'Switch', 'Slider',
      'Progress', 'Skeleton', 'Alert', 'Toast', 'Accordion',
      'Tabs', 'Calendar', 'DatePicker', 'Chart', 'Icon'
    ];
    
    return uiComponents.some(ui => componentName.includes(ui));
  }

  calculateBlockConfidence(patterns) {
    if (patterns.length === 0) return 0;
    
    const avgConfidence = patterns.reduce((sum, pattern) => sum + pattern.confidence, 0) / patterns.length;
    const patternBonus = Math.min(patterns.length * 0.1, 0.3);
    
    return Math.min(avgConfidence + patternBonus, 1.0);
  }

  suggestBlockType(patterns) {
    const typeScores = {};
    
    for (const pattern of patterns) {
      const baseType = pattern.type.split('-')[0]; // 'naming-layout' -> 'naming'
      typeScores[baseType] = (typeScores[baseType] || 0) + pattern.confidence;
    }

    // Determine primary block type
    const maxScore = Math.max(...Object.values(typeScores));
    const primaryType = Object.keys(typeScores).find(type => typeScores[type] === maxScore);

    const blockTypeMap = {
      'composition': 'registry:block',
      'layout': 'registry:block',
      'interaction': 'registry:block',
      'naming': 'registry:block'
    };

    return blockTypeMap[primaryType] || 'registry:ui';
  }

  describeLayoutPattern(structure) {
    const features = [];
    if (structure.hasGrid) features.push('CSS Grid');
    if (structure.hasFlex) features.push('Flexbox');
    if (structure.hasContainer) features.push('Container');
    if (structure.hasResponsive) features.push('Responsive');
    
    return `Layout component with ${features.join(', ')}`;
  }

  calculateInteractionComplexity(hooks, handlers) {
    const stateHooks = hooks.filter(h => ['useState', 'useReducer'].includes(h)).length;
    const effectHooks = hooks.filter(h => ['useEffect', 'useLayoutEffect'].includes(h)).length;
    const handlerCount = handlers.length;
    
    if (stateHooks >= 3 || effectHooks >= 3 || handlerCount >= 5) return 'high';
    if (stateHooks >= 2 || effectHooks >= 2 || handlerCount >= 3) return 'medium';
    return 'low';
  }

  describeInteractionPattern(hooks, handlers) {
    const features = [];
    if (hooks.some(h => h.includes('Form'))) features.push('Form handling');
    if (hooks.includes('useState')) features.push('State management');
    if (hooks.includes('useEffect')) features.push('Side effects');
    if (handlers.length > 0) features.push(`${handlers.length} event handlers`);
    
    return `Interactive component with ${features.join(', ')}`;
  }
}