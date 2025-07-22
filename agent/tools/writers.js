import fs from 'fs/promises';
import path from 'path';

/**
 * Persist a Component.dcp.json or Tokens.dcp.json to disk
 * @param {string} outputPath - Path to write the file to
 * @param {Object} payload - Data to write
 * @param {string} [format='json'] - Output format (json or md)
 * @returns {Promise<void>}
 */
export async function writeSchema(outputPath, payload, format = 'json') {
  try {
    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Format content based on type
    let content;
    if (format === 'json') {
      content = JSON.stringify(payload, null, 2);
    } else if (format === 'md') {
      content = formatMarkdown(payload);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    // Write file
    await fs.writeFile(outputPath, content, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to write schema: ${err.message}`);
  }
}

function formatMarkdown(payload) {
  if (typeof payload === 'string') return payload;

  const lines = ['# Component Analysis\n'];

  // Add sections based on payload content
  if (payload.name) {
    lines.push(`## ${payload.name}\n`);
  }

  if (payload.description) {
    lines.push(payload.description + '\n');
  }

  if (payload.props) {
    lines.push('## Props\n');
    Object.entries(payload.props).forEach(([name, prop]) => {
      lines.push(`### ${name}\n`);
      lines.push(`- Type: \`${prop.type}\``);
      if (prop.description) lines.push(`- Description: ${prop.description}`);
      if (prop.required) lines.push('- Required: ✓');
      if (prop.defaultValue) lines.push(`- Default: \`${prop.defaultValue}\``);
      lines.push('');
    });
  }

  if (payload.tokens) {
    lines.push('## Design Tokens\n');
    Object.entries(payload.tokens).forEach(([category, tokens]) => {
      if (tokens.length > 0) {
        lines.push(`### ${category}\n`);
        tokens.forEach(token => lines.push(`- \`${token}\``));
        lines.push('');
      }
    });
  }

  return lines.join('\n');
} 