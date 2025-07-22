import * as babel from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default;

/**
 * Parse a component file and emit props / default values / doc comments
 * @param {string} fileText - Raw component file content
 * @returns {Promise<Object>} Extracted component API
 */
export async function extractComponentAPI(fileText) {
  try {
    const ast = babel.parse(fileText, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    const api = {
      props: {},
      description: '',
      displayName: '',
      defaultProps: {}
    };

    // Visit the AST
    traverse(ast, {
      // Extract interface/type definitions for props
      TSInterfaceDeclaration(path) {
        if (path.node.id.name.includes('Props')) {
          path.node.body.body.forEach(prop => {
            api.props[prop.key.name] = {
              type: prop.typeAnnotation.typeAnnotation.type,
              required: !prop.optional,
              description: extractDocComment(prop)
            };
          });
        }
      },

      // Extract component function/class
      ExportDefaultDeclaration(path) {
        const declaration = path.node.declaration;
        if (declaration.type === 'FunctionDeclaration' || 
            declaration.type === 'ArrowFunctionExpression') {
          api.displayName = declaration.id?.name || 'AnonymousComponent';
          api.description = extractDocComment(declaration);
        }
      },

      // Extract defaultProps
      AssignmentExpression(path) {
        if (path.node.left.property?.name === 'defaultProps') {
          const props = path.node.right.properties;
          props.forEach(prop => {
            api.defaultProps[prop.key.name] = prop.value.value;
          });
        }
      }
    });

    return api;
  } catch (err) {
    throw new Error(`Failed to extract component API: ${err.message}`);
  }
}

function extractDocComment(node) {
  if (node.leadingComments) {
    const docComment = node.leadingComments.find(
      comment => comment.type === 'CommentBlock' && comment.value.startsWith('*')
    );
    if (docComment) {
      return docComment.value
        .split('\n')
        .map(line => line.trim().replace(/^\* ?/, ''))
        .join('\n')
        .trim();
    }
  }
  return '';
} 