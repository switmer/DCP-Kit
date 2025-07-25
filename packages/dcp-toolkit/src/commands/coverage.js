import fs from 'fs';
import path from 'path';

/**
 * Recursively flattens nested token objects to dot-paths.
 */
function flattenTokens(node, prefix = '', out = {}) {
  Object.entries(node).forEach(([key, val]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      flattenTokens(val, fullKey, out);
    } else {
      out[fullKey] = val;
    }
  });
  return out;
}

export async function generateCoverageReport({ registryPath, outputPath }) {
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const allTokens = new Set();
    const tokenUsage = {};
    const usedTokens = new Set();
    const missingDescriptions = [];
    let llmFields = 0;

    // Process token files to get all available tokens
    for (const token of registry.tokens) {
      const tokenPath = path.join(path.dirname(registryPath), token.path);
      try {
        const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        const flattened = flattenTokens(tokenData);
        Object.keys(flattened).forEach(token => allTokens.add(token));
      } catch (err) {
        console.warn(`⚠️ Failed to process token file: ${token.path}`, err.message);
      }
    }

    // Process components to find token usage and track descriptions/LLM fields
    for (const comp of registry.components) {
      const componentPath = path.join(path.dirname(registryPath), comp.path);
      try {
        if (!fs.existsSync(componentPath)) {
          continue;
        }
        
        const component = JSON.parse(fs.readFileSync(componentPath, 'utf8'));
        
        // Track token usage
        if (component.tokensUsed) {
          component.tokensUsed.forEach(token => {
            usedTokens.add(token);
            tokenUsage[token] = tokenUsage[token] || [];
            tokenUsage[token].push(component.name);
          });
        }

        // Track missing descriptions
        if (!component.description) {
          missingDescriptions.push(component.name);
        }

        // Track LLM fields
        if (component.props) {
          Object.values(component.props).forEach(prop => {
            if (prop.source === 'llm') {
              llmFields++;
            }
          });
        }
      } catch (err) {
        console.warn(`⚠️ Failed to process component: ${comp.path}`, err.message);
      }
    }

    // Calculate unused tokens
    const unusedTokens = Array.from(allTokens).filter(token => !usedTokens.has(token));

    // Calculate coverage percentage
    const coverage = allTokens.size > 0 ? Math.round((usedTokens.size / allTokens.size) * 100) : 0;

    const report = {
      totalTokens: allTokens.size,
      usedTokens: usedTokens.size,
      coverage,
      tokenUsage,
      unusedTokens,
      missingDescriptions,
      llmFields
    };

    // Write report to file if outputPath is provided
    if (outputPath) {
      const outputDir = path.dirname(outputPath);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    }

    return report;
  } catch (err) {
    console.error('Failed to generate coverage report:', err);
    throw err;
  }
}
