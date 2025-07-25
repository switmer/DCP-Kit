/**
 * Usage Guidelines & Integration Checklist Generator
 * Creates comprehensive onboarding documentation and checklists
 * for seamless component integration
 */

import path from 'path';

export class UsageGuideGenerator {
  constructor(componentData, projectIntelligence, dependencyGraph, assetAnalysis) {
    this.componentData = componentData;
    this.projectIntelligence = projectIntelligence;
    this.dependencyGraph = dependencyGraph;
    this.assetAnalysis = assetAnalysis;
  }

  /**
   * Generate comprehensive usage guidelines
   */
  generateUsageGuidelines() {
    const guidelines = {
      quickStart: this.generateQuickStart(),
      requiredProps: this.generateRequiredPropsGuide(),
      optionalProps: this.generateOptionalPropsGuide(),
      contextRequirements: this.generateContextRequirements(),
      stylingGuidance: this.generateStylingGuidance(),
      responsiveBehavior: this.generateResponsiveGuidance(),
      accessibilityNotes: this.generateAccessibilityGuidance(),
      bestPractices: this.generateBestPractices(),
      troubleshooting: this.generateTroubleshooting()
    };

    return guidelines;
  }

  /**
   * Generate quick start section
   */
  generateQuickStart() {
    const componentName = this.getMainComponentName();
    const requiredProps = this.getRequiredProps();
    
    const exampleProps = requiredProps.map(prop => {
      return `${prop.name}={${this.generateExampleValue(prop)}}`;
    }).join('\n  ');

    return {
      title: 'Quick Start',
      description: `Get started with ${componentName} in under 2 minutes`,
      example: `import { ${componentName} } from './components/ui/${this.getComponentFileName()}';

function App() {
  return (
    <${componentName}
      ${exampleProps}
    />
  );
}`,
      steps: [
        'Install required dependencies (see setup instructions)',
        'Import the component',
        'Provide required props',
        'Customize with optional props as needed'
      ]
    };
  }

  /**
   * Generate required props guide
   */
  generateRequiredPropsGuide() {
    const requiredProps = this.getRequiredProps();
    
    if (requiredProps.length === 0) {
      return {
        title: 'Required Props',
        description: 'This component has no required props - you can use it immediately!',
        props: []
      };
    }

    return {
      title: 'Required Props',
      description: 'These props must be provided for the component to function correctly',
      props: requiredProps.map(prop => ({
        name: prop.name,
        type: prop.type,
        description: prop.description || this.generatePropDescription(prop),
        example: this.generateExampleValue(prop)
      }))
    };
  }

  /**
   * Generate optional props guide
   */
  generateOptionalPropsGuide() {
    const optionalProps = this.getOptionalProps();

    return {
      title: 'Optional Props',
      description: 'These props can be used to customize the component behavior',
      props: optionalProps.map(prop => ({
        name: prop.name,
        type: prop.type,
        description: prop.description || this.generatePropDescription(prop),
        defaultValue: prop.defaultValue,
        example: this.generateExampleValue(prop)
      }))
    };
  }

  /**
   * Generate context requirements
   */
  generateContextRequirements() {
    const contextUsage = this.dependencyGraph.contextUsage || new Set();
    const requirements = [];

    if (contextUsage.has('ThemeProvider')) {
      requirements.push({
        context: 'ThemeProvider',
        required: true,
        description: 'Wrap your app with ThemeProvider for theming support',
        setup: `import { ThemeProvider } from './components/theme-provider';

function App() {
  return (
    <ThemeProvider>
      <YourComponent />
    </ThemeProvider>
  );
}`
      });
    }

    if (contextUsage.has('TooltipProvider')) {
      requirements.push({
        context: 'TooltipProvider',
        required: false,
        description: 'Required for tooltip functionality',
        setup: `import { TooltipProvider } from './components/ui/tooltip';

<TooltipProvider>
  <YourComponent />
</TooltipProvider>`
      });
    }

    return {
      title: 'Context Requirements',
      description: contextUsage.size > 0 ? 
        'This component requires certain React contexts to be available' :
        'This component does not require any specific React contexts',
      requirements
    };
  }

  /**
   * Generate styling guidance
   */
  generateStylingGuidance() {
    const framework = this.projectIntelligence?.projectStructure?.conventions?.framework;
    const styling = this.projectIntelligence?.projectStructure?.conventions?.styling || [];
    
    const guidance = {
      title: 'Styling Guidance',
      framework: framework || 'unknown',
      approaches: []
    };

    if (styling.includes('Tailwind CSS')) {
      guidance.approaches.push({
        method: 'Tailwind CSS',
        description: 'Component uses Tailwind utility classes',
        customization: 'Override classes using className prop or CSS-in-JS',
        example: `<Component className="bg-blue-500 text-white rounded-lg" />`
      });
    }

    if (styling.includes('Styled Components')) {
      guidance.approaches.push({
        method: 'Styled Components',
        description: 'Component supports styled-components theming',
        customization: 'Use theme props or styled() wrapper',
        example: `const StyledComponent = styled(Component)\`
  background: \${props => props.theme.primary};
\`;`
      });
    }

    return guidance;
  }

  /**
   * Generate responsive guidance
   */
  generateResponsiveGuidance() {
    return {
      title: 'Responsive Behavior',
      description: 'How this component adapts to different screen sizes',
      breakpoints: this.detectBreakpoints(),
      recommendations: [
        'Test component on mobile, tablet, and desktop sizes',
        'Ensure touch targets are at least 44px on mobile',
        'Verify text remains readable at all sizes',
        'Check that interactive elements remain accessible'
      ]
    };
  }

  /**
   * Generate accessibility guidance
   */
  generateAccessibilityGuidance() {
    const componentName = this.getMainComponentName();
    
    return {
      title: 'Accessibility Notes',
      description: 'Ensuring your component is accessible to all users',
      requirements: [
        'Ensure proper keyboard navigation support',
        'Provide ARIA labels for screen readers',
        'Maintain sufficient color contrast ratios',
        'Test with screen reader software'
      ],
      ariaProps: this.detectAriaProps(),
      keyboardSupport: this.generateKeyboardGuidance(componentName)
    };
  }

  /**
   * Generate best practices
   */
  generateBestPractices() {
    const practices = [];

    // Performance practices
    if (this.hasAnimations()) {
      practices.push({
        category: 'Performance',
        practice: 'Animation Optimization',
        description: 'Use transform and opacity for smooth animations',
        recommendation: 'Avoid animating layout properties (width, height, top, left)'
      });
    }

    // State management practices
    if (this.hasStateManagement()) {
      practices.push({
        category: 'State Management',
        practice: 'Controlled vs Uncontrolled',
        description: 'Choose between controlled and uncontrolled patterns consistently',
        recommendation: 'Use controlled components for form validation, uncontrolled for simple cases'
      });
    }

    // Asset practices
    if (this.assetAnalysis?.imageProps?.length > 0) {
      practices.push({
        category: 'Assets',
        practice: 'Image Optimization',
        description: 'Provide appropriate fallbacks for missing images',
        recommendation: 'Use next/image or similar for automatic optimization'
      });
    }

    return {
      title: 'Best Practices',
      description: 'Recommended patterns for using this component effectively',
      practices
    };
  }

  /**
   * Generate troubleshooting guide
   */
  generateTroubleshooting() {
    const issues = [];

    // Common dependency issues
    if (this.dependencyGraph?.metrics?.totalExternalDeps > 5) {
      issues.push({
        problem: 'Component not rendering',
        cause: 'Missing dependencies',
        solution: 'Install all required packages (see setup instructions)',
        diagnostic: 'Check browser console for import errors'
      });
    }

    // Style issues
    if (this.projectIntelligence?.projectStructure?.conventions?.styling?.includes('Tailwind CSS')) {
      issues.push({
        problem: 'Styles not applying',
        cause: 'Tailwind CSS not configured',
        solution: 'Ensure Tailwind is installed and configured correctly',
        diagnostic: 'Check if tailwind.config.js exists and includes your component paths'
      });
    }

    // Context issues
    if (this.dependencyGraph?.contextUsage?.size > 0) {
      issues.push({
        problem: 'Context errors',
        cause: 'Missing context providers',
        solution: 'Wrap component tree with required providers',
        diagnostic: 'Check React DevTools for missing contexts'
      });
    }

    return {
      title: 'Troubleshooting',
      description: 'Common issues and their solutions',
      issues
    };
  }

  /**
   * Generate integration checklist
   */
  generateIntegrationChecklist() {
    const checklist = [];

    // Environment checks
    checklist.push({
      category: 'Environment',
      items: [
        {
          task: 'Node.js version compatibility',
          check: this.projectIntelligence?.environment?.nodeVersion ? '✅' : '⚠️',
          description: 'Ensure Node.js version meets requirements'
        },
        {
          task: 'Package manager setup',
          check: this.projectIntelligence?.environment?.packageManager ? '✅' : '❌',
          description: `Using ${this.projectIntelligence?.environment?.packageManager || 'unknown'} package manager`
        }
      ]
    });

    // Dependencies checks
    const missingDeps = this.projectIntelligence?.dependencies?.missing || [];
    checklist.push({
      category: 'Dependencies',
      items: [
        {
          task: 'Required packages installed',
          check: missingDeps.length === 0 ? '✅' : '❌',
          description: missingDeps.length > 0 ? 
            `Missing: ${missingDeps.join(', ')}` : 
            'All required dependencies are installed'
        },
        {
          task: 'Peer dependencies resolved',
          check: '⚠️',
          description: 'Verify peer dependencies are compatible'
        }
      ]
    });

    // Project structure checks
    const hasComponents = this.projectIntelligence?.projectStructure?.detectedPaths?.components;
    checklist.push({
      category: 'Project Structure',
      items: [
        {
          task: 'Components directory exists',
          check: hasComponents ? '✅' : '❌',
          description: hasComponents ? 
            `Found at ${hasComponents.path}` : 
            'Create components directory structure'
        },
        {
          task: 'TypeScript configuration',
          check: this.projectIntelligence?.environment?.configFiles?.['tsconfig.json'] ? '✅' : '⚠️',
          description: 'TypeScript config for better type safety'
        }
      ]
    });

    // Component-specific checks
    checklist.push({
      category: 'Component Integration',
      items: [
        {
          task: 'Import paths verified',
          check: '⚠️',
          description: 'Ensure all import paths resolve correctly'
        },
        {
          task: 'Required props provided',
          check: '⚠️',
          description: `Provide values for: ${this.getRequiredProps().map(p => p.name).join(', ')}`
        },
        {
          task: 'Context providers wrapped',
          check: this.dependencyGraph?.contextUsage?.size > 0 ? '⚠️' : '✅',
          description: this.dependencyGraph?.contextUsage?.size > 0 ?
            'Add required context providers' :
            'No context providers needed'
        }
      ]
    });

    // Asset checks
    if (this.assetAnalysis?.missingAssets?.length > 0) {
      checklist.push({
        category: 'Assets',
        items: [
          {
            task: 'Required assets provided',
            check: '❌',
            description: `Missing ${this.assetAnalysis.missingAssets.length} assets`
          },
          {
            task: 'Fallback images configured',
            check: '⚠️',
            description: 'Provide fallbacks for missing images'
          }
        ]
      });
    }

    // Testing checks
    checklist.push({
      category: 'Testing',
      items: [
        {
          task: 'Component renders without errors',
          check: '⚠️',
          description: 'Test basic rendering in your app'
        },
        {
          task: 'Responsive behavior verified',
          check: '⚠️',
          description: 'Test on mobile, tablet, and desktop'
        },
        {
          task: 'Accessibility tested',
          check: '⚠️',
          description: 'Test keyboard navigation and screen readers'
        }
      ]
    });

    return {
      title: 'Integration Checklist',
      description: 'Complete this checklist to ensure successful component integration',
      categories: checklist,
      summary: {
        totalItems: checklist.reduce((sum, cat) => sum + cat.items.length, 0),
        completed: checklist.reduce((sum, cat) => 
          sum + cat.items.filter(item => item.check === '✅').length, 0
        )
      }
    };
  }

  // Helper methods

  getMainComponentName() {
    if (this.componentData?.exports?.length > 0) {
      return this.componentData.exports[0].name;
    }
    return 'Component';
  }

  getComponentFileName() {
    if (this.componentData?.filePath) {
      return path.basename(this.componentData.filePath, path.extname(this.componentData.filePath));
    }
    return 'component';
  }

  getRequiredProps() {
    return this.componentData?.props?.filter(prop => prop.required) || [];
  }

  getOptionalProps() {
    return this.componentData?.props?.filter(prop => !prop.required) || [];
  }

  generatePropDescription(prop) {
    const descriptions = {
      title: 'The main heading or title text',
      children: 'Child elements to render inside the component',
      className: 'Additional CSS classes to apply',
      style: 'Inline styles to apply to the component',
      onClick: 'Handler function called when component is clicked',
      onChange: 'Handler function called when value changes',
      value: 'The current value of the component',
      disabled: 'Whether the component should be disabled',
      loading: 'Whether the component is in a loading state',
      variant: 'Visual variant of the component',
      size: 'Size variant of the component'
    };

    return descriptions[prop.name] || `${prop.name} prop for the component`;
  }

  generateExampleValue(prop) {
    const exampleValues = {
      string: `"${prop.name === 'title' ? 'Example Title' : 'example'}"`,
      number: '42',
      boolean: 'true',
      array: '[]',
      object: '{}',
      function: '() => {}'
    };

    return exampleValues[prop.type] || '"example"';
  }

  detectBreakpoints() {
    const tailwindBreakpoints = ['sm', 'md', 'lg', 'xl', '2xl'];
    // In a real implementation, this would analyze the component's styles
    return tailwindBreakpoints;
  }

  detectAriaProps() {
    const props = this.componentData?.props || [];
    return props.filter(prop => prop.name.startsWith('aria-')).map(prop => prop.name);
  }

  generateKeyboardGuidance(componentName) {
    const keyboardPatterns = {
      Button: ['Tab to focus', 'Enter or Space to activate'],
      Input: ['Tab to focus', 'Type to enter text'],
      Select: ['Tab to focus', 'Enter or Space to open', 'Arrow keys to navigate'],
      Modal: ['Escape to close', 'Tab to cycle through elements'],
      Card: ['Tab to focus interactive elements within']
    };

    return keyboardPatterns[componentName] || ['Tab to navigate to interactive elements'];
  }

  hasAnimations() {
    return this.dependencyGraph?.externalDependencies?.has('framer-motion') ||
           this.componentData?.props?.some(prop => prop.name.includes('animation'));
  }

  hasStateManagement() {
    return this.dependencyGraph?.hookUsage?.has('useState') ||
           this.dependencyGraph?.hookUsage?.has('useReducer');
  }
}