/**
 * Suggest API or token refactors; returns a markdown diff
 * @param {Object} componentSchema - Component DCP schema
 * @returns {Promise<string|null>} Markdown-formatted refactor proposals
 */
export async function proposeRefactor(componentSchema) {
  const proposals = [];

  // Check prop naming conventions if props exist
  if (componentSchema && componentSchema.props) {
    const propNamingIssues = checkPropNaming(componentSchema.props);
    if (propNamingIssues.length > 0) {
      proposals.push(
        '## Prop Naming Conventions\n' +
        propNamingIssues.map(issue => `- ${issue}`).join('\n')
      );
    }

    // Check prop type consistency
    const typeIssues = checkPropTypes(componentSchema.props);
    if (typeIssues.length > 0) {
      proposals.push(
        '## Type System Improvements\n' +
        typeIssues.map(issue => `- ${issue}`).join('\n')
      );
    }
  }

  // Check token usage patterns if tokens exist
  if (componentSchema && componentSchema.tokens) {
    const tokenIssues = checkTokenUsage(componentSchema.tokens);
    if (tokenIssues.length > 0) {
      proposals.push(
        '## Design Token Optimization\n' +
        tokenIssues.map(issue => `- ${issue}`).join('\n')
      );
    }
  }

  return proposals.length > 0 ? proposals.join('\n\n') : null;
}

function checkPropNaming(props) {
  const issues = [];
  const eventProps = ['on', 'handle', 'emit'];
  const boolProps = ['is', 'has', 'should'];

  Object.keys(props).forEach(name => {
    // Check event handler naming
    if (eventProps.some(prefix => name.startsWith(prefix)) && 
        !name.match(/^(on[A-Z]|handle[A-Z]|emit[A-Z])/)) {
      issues.push(
        `Event handler "${name}" should follow "onEvent" or "handleEvent" pattern`
      );
    }

    // Check boolean prop naming
    if (props[name].type === 'boolean' && 
        !boolProps.some(prefix => name.startsWith(prefix))) {
      issues.push(
        `Boolean prop "${name}" should start with "is", "has", or "should"`
      );
    }

    // Check camelCase
    if (name !== name.toLowerCase() && !name.match(/^[a-z][a-zA-Z0-9]*$/)) {
      issues.push(`Prop "${name}" should use camelCase`);
    }
  });

  return issues;
}

function checkPropTypes(props) {
  const issues = [];
  const commonPatterns = {
    color: /string|Color$/,
    size: /string|Size$/,
    children: /ReactNode|ReactElement/
  };

  Object.entries(props).forEach(([name, prop]) => {
    // Check common prop patterns
    Object.entries(commonPatterns).forEach(([pattern, regex]) => {
      if (name.includes(pattern) && !prop.type.match(regex)) {
        issues.push(
          `Prop "${name}" suggests ${pattern} but has type "${prop.type}"`
        );
      }
    });

    // Check for any type
    if (prop.type === 'any') {
      issues.push(`Prop "${name}" uses "any" type - consider being more specific`);
    }
  });

  return issues;
}

function checkTokenUsage(tokens) {
  const issues = [];

  // Check for hardcoded values that could be tokens
  if (tokens.colors.length === 0) {
    issues.push('No color tokens used - check for hardcoded colors');
  }
  if (tokens.spacing.length === 0) {
    issues.push('No spacing tokens used - check for hardcoded dimensions');
  }

  // Check for token consistency
  const allTokens = [
    ...tokens.colors,
    ...tokens.spacing,
    ...tokens.typography,
    ...tokens.other
  ];

  // Check token naming patterns
  const tokenPatterns = {
    color: /^color-/,
    space: /^space-/,
    font: /^font-/
  };

  Object.entries(tokenPatterns).forEach(([category, pattern]) => {
    const invalidTokens = allTokens
      .filter(token => token.includes(category) && !pattern.test(token));
    
    if (invalidTokens.length > 0) {
      issues.push(
        `Inconsistent ${category} token naming: ${invalidTokens.join(', ')}`
      );
    }
  });

  return issues;
} 