import fs from 'fs';
import path from 'path';
import { diffLines, diffJson } from 'diff';

/**
 * Diff Preview System - Visual before/after comparison for mutations
 * 
 * Features:
 * - Side-by-side diff visualization
 * - JSON-aware diff highlighting
 * - Terminal and HTML output modes
 * - Component-level change summaries
 * - Interactive approval workflows
 */

export class DiffPreview {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.outputFormat = options.outputFormat || 'terminal'; // 'terminal' | 'html' | 'json'
    this.enableColors = options.colorize !== false;
  }

  /**
   * Generate diff preview between original and mutated DCP
   * @param {Object} original - Original DCP IR
   * @param {Object} mutated - Mutated DCP IR
   * @param {Array} patches - Applied mutation patches
   * @returns {Object} Diff preview with multiple format outputs
   */
  async generatePreview(original, mutated, patches = []) {
    if (this.verbose) {
      console.log('🔍 Generating diff preview...');
    }

    const preview = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(original, mutated, patches),
      diff: this.generateDiff(original, mutated),
      componentChanges: this.analyzeComponentChanges(original, mutated),
      patches: patches,
      formats: {}
    };

    // Generate different output formats
    preview.formats.terminal = this.generateTerminalOutput(preview);
    preview.formats.html = this.generateHTMLOutput(preview);
    preview.formats.json = this.generateJSONOutput(preview);

    if (this.verbose) {
      console.log(`✅ Diff preview generated - ${preview.summary.totalChanges} changes detected`);
    }

    return preview;
  }

  /**
   * Generate high-level summary of changes
   */
  generateSummary(original, mutated, patches) {
    const summary = {
      totalChanges: patches.length,
      componentsAffected: new Set(),
      changeTypes: {
        add: 0,
        remove: 0,
        replace: 0,
        move: 0,
        copy: 0,
        test: 0
      },
      riskLevel: 'low'
    };

    // Analyze patches
    for (const patch of patches) {
      summary.changeTypes[patch.op]++;
      
      // Extract component name from path
      const pathParts = patch.path.split('/');
      if (pathParts[1] === 'components' && pathParts[2]) {
        summary.componentsAffected.add(pathParts[2]);
      }
    }

    // Convert Set to Array for serialization
    summary.componentsAffected = Array.from(summary.componentsAffected);

    // Determine risk level
    if (summary.changeTypes.remove > 0 || summary.changeTypes.move > 0) {
      summary.riskLevel = 'high';
    } else if (summary.totalChanges > 10 || summary.componentsAffected.length > 5) {
      summary.riskLevel = 'medium';
    }

    return summary;
  }

  /**
   * Generate detailed diff using diff library
   */
  generateDiff(original, mutated) {
    const originalJson = JSON.stringify(original, null, 2);
    const mutatedJson = JSON.stringify(mutated, null, 2);

    // Generate line-by-line diff
    const lineDiff = diffLines(originalJson, mutatedJson);
    
    // Generate JSON-aware diff
    const jsonDiff = diffJson(original, mutated);

    return {
      lines: lineDiff,
      json: jsonDiff,
      stats: this.calculateDiffStats(lineDiff)
    };
  }

  /**
   * Calculate diff statistics
   */
  calculateDiffStats(lineDiff) {
    const stats = {
      linesAdded: 0,
      linesRemoved: 0,
      linesModified: 0,
      totalLines: 0
    };

    for (const part of lineDiff) {
      const lineCount = part.value.split('\n').length - 1;
      stats.totalLines += lineCount;

      if (part.added) {
        stats.linesAdded += lineCount;
      } else if (part.removed) {
        stats.linesRemoved += lineCount;
      } else {
        stats.linesModified += lineCount;
      }
    }

    return stats;
  }

  /**
   * Analyze changes at the component level
   */
  analyzeComponentChanges(original, mutated) {
    const changes = [];
    const originalComponents = new Map();
    const mutatedComponents = new Map();

    // Index components by name
    if (original.components) {
      for (const comp of original.components) {
        originalComponents.set(comp.name, comp);
      }
    }

    if (mutated.components) {
      for (const comp of mutated.components) {
        mutatedComponents.set(comp.name, comp);
      }
    }

    // Find added components
    for (const [name, comp] of mutatedComponents) {
      if (!originalComponents.has(name)) {
        changes.push({
          type: 'component_added',
          component: name,
          description: `New component "${name}" added`
        });
      }
    }

    // Find removed components
    for (const [name, comp] of originalComponents) {
      if (!mutatedComponents.has(name)) {
        changes.push({
          type: 'component_removed',
          component: name,
          description: `Component "${name}" removed`
        });
      }
    }

    // Find modified components
    for (const [name, originalComp] of originalComponents) {
      const mutatedComp = mutatedComponents.get(name);
      if (mutatedComp) {
        const componentChanges = this.analyzeComponentDiff(originalComp, mutatedComp);
        if (componentChanges.length > 0) {
          changes.push({
            type: 'component_modified',
            component: name,
            description: `Component "${name}" modified`,
            changes: componentChanges
          });
        }
      }
    }

    return changes;
  }

  /**
   * Analyze differences within a single component
   */
  analyzeComponentDiff(original, mutated) {
    const changes = [];

    // Check props changes
    if (JSON.stringify(original.props) !== JSON.stringify(mutated.props)) {
      changes.push({
        type: 'props_changed',
        description: 'Props modified'
      });
    }

    // Check variants changes
    if (JSON.stringify(original.variants) !== JSON.stringify(mutated.variants)) {
      changes.push({
        type: 'variants_changed',
        description: 'Variants modified'
      });
    }

    // Check examples changes
    if (JSON.stringify(original.examples) !== JSON.stringify(mutated.examples)) {
      changes.push({
        type: 'examples_changed',
        description: 'Examples modified'
      });
    }

    return changes;
  }

  /**
   * Generate terminal-friendly output
   */
  generateTerminalOutput(preview) {
    let output = [];

    // Header
    output.push('');
    output.push('🔍 DCP MUTATION PREVIEW');
    output.push('═'.repeat(50));
    output.push('');

    // Summary
    output.push('📊 SUMMARY:');
    output.push(`   Total Changes: ${preview.summary.totalChanges}`);
    output.push(`   Components Affected: ${preview.summary.componentsAffected.length}`);
    output.push(`   Risk Level: ${this.colorizeRiskLevel(preview.summary.riskLevel)}`);
    output.push('');

    // Change types breakdown
    output.push('🔧 CHANGE TYPES:');
    for (const [type, count] of Object.entries(preview.summary.changeTypes)) {
      if (count > 0) {
        output.push(`   ${type.toUpperCase()}: ${count}`);
      }
    }
    output.push('');

    // Component changes
    if (preview.componentChanges.length > 0) {
      output.push('🧩 COMPONENT CHANGES:');
      for (const change of preview.componentChanges) {
        output.push(`   ${this.colorizeChangeType(change.type)} ${change.description}`);
        if (change.changes) {
          for (const subChange of change.changes) {
            output.push(`      - ${subChange.description}`);
          }
        }
      }
      output.push('');
    }

    // Diff stats
    if (preview.diff.stats) {
      const stats = preview.diff.stats;
      output.push('📈 DIFF STATISTICS:');
      output.push(`   Lines Added: ${this.colorize('+' + stats.linesAdded, 'green')}`);
      output.push(`   Lines Removed: ${this.colorize('-' + stats.linesRemoved, 'red')}`);
      output.push(`   Total Lines: ${stats.totalLines}`);
      output.push('');
    }

    // Diff preview (truncated)
    output.push('📋 DIFF PREVIEW:');
    output.push('-'.repeat(50));
    const diffLines = this.generateTerminalDiff(preview.diff.lines);
    // Show first 20 lines of diff
    output.push(...diffLines.slice(0, 20));
    if (diffLines.length > 20) {
      output.push(`... (${diffLines.length - 20} more lines)`);
    }
    output.push('-'.repeat(50));

    return output.join('\n');
  }

  /**
   * Generate colorized terminal diff
   */
  generateTerminalDiff(lineDiff) {
    const output = [];
    
    for (const part of lineDiff) {
      const lines = part.value.split('\n');
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        if (part.added) {
          output.push(this.colorize(`+ ${line}`, 'green'));
        } else if (part.removed) {
          output.push(this.colorize(`- ${line}`, 'red'));
        } else {
          output.push(`  ${line}`);
        }
      }
    }

    return output;
  }

  /**
   * Generate HTML output for web viewing
   */
  generateHTMLOutput(preview) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DCP Mutation Preview</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace; margin: 20px; }
        .header { border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .diff-line { margin: 2px 0; padding: 2px 5px; font-family: monospace; }
        .added { background: #d4edda; color: #155724; }
        .removed { background: #f8d7da; color: #721c24; }
        .risk-high { color: #dc3545; font-weight: bold; }
        .risk-medium { color: #fd7e14; font-weight: bold; }
        .risk-low { color: #28a745; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 DCP Mutation Preview</h1>
        <p>Generated: ${preview.timestamp}</p>
    </div>
    
    <div class="summary">
        <h2>📊 Summary</h2>
        <p><strong>Total Changes:</strong> ${preview.summary.totalChanges}</p>
        <p><strong>Components Affected:</strong> ${preview.summary.componentsAffected.join(', ')}</p>
        <p><strong>Risk Level:</strong> <span class="risk-${preview.summary.riskLevel}">${preview.summary.riskLevel.toUpperCase()}</span></p>
    </div>

    <div class="changes">
        <h2>🧩 Component Changes</h2>
        ${preview.componentChanges.map(change => `
            <div>
                <strong>${change.type}:</strong> ${change.description}
                ${change.changes ? change.changes.map(c => `<li>${c.description}</li>`).join('') : ''}
            </div>
        `).join('')}
    </div>

    <div class="diff">
        <h2>📋 Diff Preview</h2>
        <pre>${this.generateHTMLDiff(preview.diff.lines)}</pre>
    </div>
</body>
</html>`;
  }

  /**
   * Generate HTML diff markup
   */
  generateHTMLDiff(lineDiff) {
    let html = '';
    
    for (const part of lineDiff) {
      const lines = part.value.split('\n');
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        if (part.added) {
          html += `<div class="diff-line added">+ ${this.escapeHtml(line)}</div>`;
        } else if (part.removed) {
          html += `<div class="diff-line removed">- ${this.escapeHtml(line)}</div>`;
        } else {
          html += `<div class="diff-line">  ${this.escapeHtml(line)}</div>`;
        }
      }
    }

    return html;
  }

  /**
   * Generate structured JSON output
   */
  generateJSONOutput(preview) {
    return JSON.stringify(preview, null, 2);
  }

  /**
   * Colorize text for terminal output
   */
  colorize(text, color) {
    if (!this.enableColors) return text;
    
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      reset: '\x1b[0m'
    };

    return `${colors[color] || ''}${text}${colors.reset}`;
  }

  /**
   * Colorize risk level
   */
  colorizeRiskLevel(level) {
    const colorMap = {
      low: 'green',
      medium: 'yellow',
      high: 'red'
    };
    return this.colorize(level.toUpperCase(), colorMap[level]);
  }

  /**
   * Colorize change type
   */
  colorizeChangeType(type) {
    const colorMap = {
      component_added: 'green',
      component_removed: 'red',
      component_modified: 'yellow'
    };
    return this.colorize('●', colorMap[type] || 'white');
  }

  /**
   * Escape HTML entities
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Save preview to file
   */
  async savePreview(preview, outputPath, format = null) {
    const targetFormat = format || this.outputFormat;
    let content;
    let extension;

    switch (targetFormat) {
      case 'html':
        content = preview.formats.html;
        extension = '.html';
        break;
      case 'json':
        content = preview.formats.json;
        extension = '.json';
        break;
      case 'terminal':
      default:
        content = preview.formats.terminal;
        extension = '.txt';
        break;
    }

    const fullPath = outputPath.endsWith(extension) ? outputPath : outputPath + extension;
    const outputDir = path.dirname(fullPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content);

    if (this.verbose) {
      console.log(`💾 Diff preview saved to: ${fullPath}`);
    }

    return fullPath;
  }
}

/**
 * CLI-friendly diff preview function
 */
export async function generateDiffPreview(originalPath, mutatedPath, options = {}) {
  // Load files
  const original = JSON.parse(fs.readFileSync(originalPath, 'utf-8'));
  const mutated = JSON.parse(fs.readFileSync(mutatedPath, 'utf-8'));

  const previewer = new DiffPreview(options);
  const preview = await previewer.generatePreview(original, mutated);

  return preview;
}

/**
 * Command-line interface
 */
export async function runPreviewCLI(args) {
  const originalPath = args[0];
  const mutatedPath = args[1];
  const outputPath = args[2];

  if (!originalPath || !mutatedPath) {
    console.error('❌ Usage: node diffPreview.js <originalPath> <mutatedPath> [outputPath]');
    console.error('   Options: --format html|json|terminal, --no-color, --verbose');
    process.exit(1);
  }

  // Parse options
  const options = {
    verbose: args.includes('--verbose'),
    colorize: !args.includes('--no-color'),
    outputFormat: args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'terminal'
  };

  try {
    const preview = await generateDiffPreview(originalPath, mutatedPath, options);
    
    // Display preview
    console.log(preview.formats.terminal);
    
    // Save to file if requested
    if (outputPath) {
      const previewer = new DiffPreview(options);
      await previewer.savePreview(preview, outputPath);
    }
    
  } catch (error) {
    console.error('❌ Preview generation failed:', error.message);
    process.exit(1);
  }
}

// Enable direct CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  runPreviewCLI(process.argv.slice(2));
}