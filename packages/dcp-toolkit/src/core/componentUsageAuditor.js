/**
 * Component Usage Auditor
 * Scans codebase for component usages, extracts props, groups by signature, detects drift
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

export class ComponentUsageAuditor {
  constructor(rootPath) {
    this.rootPath = path.resolve(rootPath);
  }

  /**
   * Parse Tailwind classes into semantic categories
   */
  parseTailwindClasses(className) {
    if (!className || typeof className !== 'string') {
      return null;
    }

    const classes = className.split(/\s+/).filter(Boolean);
    const parsed = {
      width: [],
      height: [],
      spacing: [],
      layout: [],
      color: [],
      typography: [],
      effects: [],
      other: []
    };

    for (const cls of classes) {
      // Width patterns
      if (cls.match(/^(w-|max-w-|min-w-)/)) {
        const match = cls.match(/(max-w-|min-w-|w-)(\[?[\d.]+(px|rem|em|%|vw|vh)\]?|full|screen|auto|fit|min|max)/);
        if (match) {
          parsed.width.push({
            class: cls,
            type: match[1].replace('-', ''),
            value: match[2],
            semantic: this.categorizeWidth(match[2])
          });
        }
      }
      // Height patterns
      else if (cls.match(/^(h-|max-h-|min-h-)/)) {
        const match = cls.match(/(max-h-|min-h-|h-)(\[?[\d.]+(px|rem|em|%|vh|dvh)\]?|full|screen|auto|fit|min|max)/);
        if (match) {
          parsed.height.push({
            class: cls,
            type: match[1].replace('-', ''),
            value: match[2],
            semantic: this.categorizeHeight(match[2])
          });
        }
      }
      // Spacing (padding, margin, gap)
      else if (cls.match(/^(p-|px-|py-|pt-|pr-|pb-|pl-|m-|mx-|my-|mt-|mr-|mb-|ml-|gap-|space-)/)) {
        parsed.spacing.push(cls);
      }
      // Layout (flex, grid, display)
      else if (cls.match(/^(flex|grid|block|inline|hidden|absolute|relative|fixed|sticky|overflow-|justify-|items-|content-|self-|order-|col-|row-|wrap)/)) {
        parsed.layout.push(cls);
      }
      // Color (bg-, text-, border-)
      else if (cls.match(/^(bg-|text-|border-|ring-|outline-)/)) {
        parsed.color.push(cls);
      }
      // Typography
      else if (cls.match(/^(text-|font-|leading-|tracking-|uppercase|lowercase|capitalize|italic|not-italic|antialiased)/)) {
        parsed.typography.push(cls);
      }
      // Effects (shadow, opacity, backdrop, etc.)
      else if (cls.match(/^(shadow-|opacity-|backdrop-|blur-|brightness-|contrast-|grayscale-|hue-rotate-|invert-|saturate-|sepia-)/)) {
        parsed.effects.push(cls);
      }
      else {
        parsed.other.push(cls);
      }
    }

    return parsed;
  }

  /**
   * Categorize width values into semantic buckets
   */
  categorizeWidth(value) {
    if (value === 'full' || value === 'screen') return 'full';
    if (value === 'auto' || value === 'fit' || value === 'min' || value === 'max') return 'auto';
    
    // Extract numeric value
    const numMatch = value.match(/\[?([\d.]+)/);
    if (!numMatch) return 'unknown';
    
    const num = parseFloat(numMatch[1]);
    const unit = value.includes('px') ? 'px' : value.includes('rem') ? 'rem' : value.includes('%') ? '%' : 'px';
    
    // Convert to px for comparison (rough approximation)
    const px = unit === 'rem' ? num * 16 : unit === '%' ? null : num;
    
    if (px === null) return 'percentage';
    if (px <= 450) return 'small';      // 300-450px
    if (px <= 650) return 'medium';     // 500-650px
    if (px <= 960) return 'large';      // 700-960px
    return 'xl';                         // 960px+
  }

  /**
   * Categorize height values into semantic buckets
   */
  categorizeHeight(value) {
    if (value === 'full' || value === 'screen' || value.includes('100vh') || value.includes('100dvh')) return 'fullscreen';
    if (value === 'auto' || value === 'fit') return 'auto';
    
    const numMatch = value.match(/\[?([\d.]+)/);
    if (!numMatch) return 'unknown';
    
    const num = parseFloat(numMatch[1]);
    const unit = value.includes('px') ? 'px' : value.includes('rem') ? 'rem' : value.includes('vh') ? 'vh' : 'px';
    
    const px = unit === 'rem' ? num * 16 : unit === 'vh' ? null : num;
    
    if (px === null || unit === 'vh') return 'viewport';
    if (px <= 400) return 'small';
    if (px <= 700) return 'medium';
    return 'large';
  }

  /**
   * Audit component usages across the codebase
   */
  async auditComponent(componentName, options = {}) {
    const {
      importPath,
      groupByProps, // Optional - will auto-infer if not provided
      glob: globPattern = '**/*.{tsx,jsx}'
    } = options;

    // Find all files that might use this component
    const files = await glob(globPattern, { 
      cwd: this.rootPath,
      ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**']
    });

    const usages = [];
    const importPaths = new Set();

    // Scan each file for component usages
    for (const file of files) {
      const filePath = path.join(this.rootPath, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const fileUsages = this.extractUsagesFromFile(content, componentName, filePath, importPath);
        
        if (fileUsages.length > 0) {
          usages.push(...fileUsages);
          // Track import paths found
          fileUsages.forEach(u => {
            if (u.importPath) importPaths.add(u.importPath);
          });
        }
      } catch (error) {
        // Skip files that can't be parsed (binary, etc.)
        continue;
      }
    }

    // Discover all props used across all usages
    const propsDiscovered = this.discoverProps(usages);

    // Auto-infer groupByProps if not provided
    const inferredGroupByProps = groupByProps || this.inferGroupByProps(propsDiscovered, usages.length);

    // Group usages by signature
    const signatures = this.groupBySignature(usages, inferredGroupByProps);

    // Detect drift
    const driftIndicators = this.detectDrift(usages, inferredGroupByProps);

    // Generate suggestions
    const suggestions = this.generateSuggestions(propsDiscovered, usages.length, driftIndicators);

    return {
      success: true,
      component: componentName,
      totalUsages: usages.length,
      filesScanned: files.length,
      filesWithUsages: new Set(usages.map(u => u.file)).size,
      importPaths: Array.from(importPaths),
      propsDiscovered,
      suggestedGroupByProps: inferredGroupByProps,
      signatures: signatures.map(sig => ({
        signature: sig.signature,
        count: sig.count,
        percentage: ((sig.count / usages.length) * 100).toFixed(1) + '%',
        examples: sig.examples.slice(0, 3) // Top 3 examples
      })),
      driftIndicators,
      suggestions,
      allUsages: usages.slice(0, 100) // Limit to first 100 for response size
    };
  }

  /**
   * Extract component usages from a single file
   */
  extractUsagesFromFile(content, componentName, filePath, expectedImportPath) {
    const usages = [];

    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties']
      });

      let foundImport = null;

      traverse.default(ast, {
        // Find imports
        ImportDeclaration: (path) => {
          const source = path.node.source.value;
          const specifiers = path.node.specifiers || [];
          
          for (const spec of specifiers) {
            if (t.isImportDefaultSpecifier(spec) && spec.local.name === componentName) {
              foundImport = { path: source, type: 'default' };
            } else if (t.isImportSpecifier(spec) && spec.imported.name === componentName) {
              foundImport = { path: source, type: 'named' };
            }
          }
        },

        // Find JSX usages
        JSXElement: (path) => {
          const openingElement = path.node.openingElement;
          const jsxName = t.isJSXIdentifier(openingElement.name) 
            ? openingElement.name.name 
            : null;

          if (jsxName === componentName) {
            const props = this.extractPropsFromJSX(openingElement);
            const location = this.getLocation(path, content);

            usages.push({
              file: filePath,
              line: location.line,
              column: location.column,
              props,
              importPath: foundImport?.path,
              code: this.getCodeSnippet(content, location.line, 3)
            });
          }
        }
      });
    } catch (error) {
      // File might not be valid JSX/TSX, skip it
    }

    return usages;
  }

  /**
   * Extract props from JSX opening element
   */
  extractPropsFromJSX(openingElement) {
    const props = {};
    
    for (const attr of openingElement.attributes || []) {
      if (t.isJSXAttribute(attr)) {
        const name = t.isJSXIdentifier(attr.name) ? attr.name.name : null;
        if (!name) continue;

        let value = null;
        
        if (attr.value === null) {
          // Boolean prop: <Component disabled />
          value = true;
        } else if (t.isJSXExpressionContainer(attr.value)) {
          // Expression: <Component count={5} />
          const expr = attr.value.expression;
          if (t.isStringLiteral(expr)) {
            value = expr.value;
          } else if (t.isNumericLiteral(expr)) {
            value = expr.value;
          } else if (t.isBooleanLiteral(expr)) {
            value = expr.value;
          } else if (t.isNullLiteral(expr)) {
            value = null;
          } else {
            // Complex expression - store as string representation
            value = 'expression';
          }
        } else if (t.isStringLiteral(attr.value)) {
          // String: <Component variant="primary" />
          value = attr.value.value;
        }

        props[name] = value;
      }
    }

    return props;
  }

  /**
   * Group usages by prop signature
   */
  groupBySignature(usages, groupByProps) {
    const signatureMap = new Map();

    for (const usage of usages) {
      // Build signature from groupByProps
      const signatureParts = [];
      for (const propName of groupByProps) {
        const value = usage.props[propName];
        if (value !== undefined && value !== null) {
          signatureParts.push(`${propName}=${value}`);
        } else {
          signatureParts.push(`${propName}=unset`);
        }
      }

      // Add other props that are set
      const otherProps = Object.entries(usage.props)
        .filter(([name]) => !groupByProps.includes(name))
        .map(([name, value]) => `${name}=${value}`)
        .sort();

      const signature = signatureParts.length > 0
        ? signatureParts.join('|') + (otherProps.length > 0 ? `|${otherProps.join(',')}` : '')
        : otherProps.length > 0 ? otherProps.join(',') : 'no-props';

      if (!signatureMap.has(signature)) {
        signatureMap.set(signature, []);
      }
      signatureMap.get(signature).push(usage);
    }

    // Convert to array and sort by count
    return Array.from(signatureMap.entries())
      .map(([signature, examples]) => ({
        signature,
        count: examples.length,
        examples
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Discover all props used across usages
   */
  discoverProps(usages) {
    const propsMap = new Map();
    const classNamePatterns = {
      utilities: new Map(), // Individual utility classes
      combinations: new Map(), // Common utility combinations
      semantic: {
        width: new Map(),
        height: new Map(),
        layout: new Map(),
        spacing: new Map()
      }
    };

    for (const usage of usages) {
      for (const [propName, value] of Object.entries(usage.props)) {
        if (!propsMap.has(propName)) {
          propsMap.set(propName, {
            count: 0,
            values: new Set(),
            dynamicCount: 0,
            tailwindParsed: propName === 'className'
          });
        }

        const propData = propsMap.get(propName);
        propData.count++;

        if (value === 'expression' || value === null) {
          propData.dynamicCount++;
        } else if (value !== true && value !== false) {
          // Store static values (strings, numbers)
          propData.values.add(String(value));
        }

        // Special handling for className: parse Tailwind
        if (propName === 'className' && typeof value === 'string') {
          const parsed = this.parseTailwindClasses(value);
          if (parsed) {
            // Track individual utilities
            const allClasses = value.split(/\s+/).filter(Boolean);
            for (const cls of allClasses) {
              classNamePatterns.utilities.set(
                cls,
                (classNamePatterns.utilities.get(cls) || 0) + 1
              );
            }

            // Track semantic patterns
            for (const width of parsed.width) {
              const key = width.semantic || 'unknown';
              classNamePatterns.semantic.width.set(
                key,
                (classNamePatterns.semantic.width.get(key) || 0) + 1
              );
            }

            for (const height of parsed.height) {
              const key = height.semantic || 'unknown';
              classNamePatterns.semantic.height.set(
                key,
                (classNamePatterns.semantic.height.get(key) || 0) + 1
              );
            }

            // Track common layout combinations
            const layoutCombo = parsed.layout.sort().join(' ');
            if (layoutCombo) {
              classNamePatterns.semantic.layout.set(
                layoutCombo,
                (classNamePatterns.semantic.layout.get(layoutCombo) || 0) + 1
              );
            }

            // Track spacing patterns
            const spacingCombo = parsed.spacing.sort().join(' ');
            if (spacingCombo) {
              classNamePatterns.semantic.spacing.set(
                spacingCombo,
                (classNamePatterns.semantic.spacing.get(spacingCombo) || 0) + 1
              );
            }
          }
        }
      }
    }

    // Convert to object format
    const propsDiscovered = {};
    for (const [propName, data] of propsMap.entries()) {
      propsDiscovered[propName] = {
        count: data.count,
        values: Array.from(data.values).sort(),
        dynamicCount: data.dynamicCount,
        coverage: `${data.count}/${usages.length} (${((data.count / usages.length) * 100).toFixed(1)}%)`,
        ...(propName === 'className' && {
          tailwindPatterns: {
            topUtilities: Array.from(classNamePatterns.utilities.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([cls, count]) => ({ class: cls, count, percentage: `${((count / usages.length) * 100).toFixed(1)}%` })),
            widthPatterns: Object.fromEntries(
              Array.from(classNamePatterns.semantic.width.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([semantic, count]) => [semantic, { count, percentage: `${((count / usages.length) * 100).toFixed(1)}%` }])
            ),
            heightPatterns: Object.fromEntries(
              Array.from(classNamePatterns.semantic.height.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([semantic, count]) => [semantic, { count, percentage: `${((count / usages.length) * 100).toFixed(1)}%` }])
            ),
            commonLayoutCombos: Array.from(classNamePatterns.semantic.layout.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([combo, count]) => ({ combination: combo, count, percentage: `${((count / usages.length) * 100).toFixed(1)}%` })),
            commonSpacingCombos: Array.from(classNamePatterns.semantic.spacing.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([combo, count]) => ({ combination: combo, count, percentage: `${((count / usages.length) * 100).toFixed(1)}%` }))
          }
        })
      };
    }

    return propsDiscovered;
  }

  /**
   * Auto-infer which props are meaningful for grouping
   */
  inferGroupByProps(propsDiscovered, totalUsages) {
    // Props to ignore (common React/HTML props that aren't meaningful for grouping)
    const IGNORE_PROPS = [
      'className', 'children', 'onClick', 'onChange', 'onBlur', 'onFocus',
      'onSubmit', 'onKeyDown', 'onKeyUp', 'onMouseEnter', 'onMouseLeave',
      'ref', 'key', 'style', 'id', 'data-testid', 'aria-label', 'aria-describedby',
      'aria-hidden', 'role', 'tabIndex', 'disabled', 'readOnly', 'required',
      'name', 'value', 'placeholder', 'type', 'href', 'target', 'rel'
    ];

    return Object.entries(propsDiscovered)
      .filter(([propName, data]) => {
        // Skip ignored props
        if (IGNORE_PROPS.some(ignored => 
          propName === ignored || 
          propName.startsWith('data-') || 
          propName.startsWith('aria-')
        )) {
          return false;
        }

        // Need at least 2 distinct static values to be meaningful
        if (data.values.length < 2) return false;

        // Should appear in at least 10% of usages to be significant
        if (data.count / totalUsages < 0.1) return false;

        return true;
      })
      .sort((a, b) => {
        // Sort by: 1) number of distinct values (desc), 2) coverage (desc)
        const aScore = a[1].values.length * (a[1].count / totalUsages);
        const bScore = b[1].values.length * (b[1].count / totalUsages);
        return bScore - aScore;
      })
      .slice(0, 5) // Top 5 most meaningful props
      .map(([propName]) => propName);
  }

  /**
   * Generate suggestions based on discovered props and drift
   */
  generateSuggestions(propsDiscovered, totalUsages, driftIndicators) {
    const suggestions = [];

    // Check for props that appear frequently but aren't in groupByProps
    const classNameData = propsDiscovered.className;
    if (classNameData && classNameData.count > totalUsages * 0.2) {
      // Check for repeated utilities that should be defaults
      if (classNameData.tailwindPatterns) {
        const topUtil = classNameData.tailwindPatterns.topUtilities[0];
        if (topUtil && topUtil.count > totalUsages * 0.5) {
          suggestions.push({
            type: 'repeated_utility',
            message: `"${topUtil.class}" appears in ${topUtil.count} usages (${topUtil.percentage}). Consider making it the default.`,
            severity: 'high',
            utility: topUtil.class,
            count: topUtil.count
          });
        }

        // Check for width pattern fragmentation
        const widthPatterns = classNameData.tailwindPatterns.widthPatterns;
        if (widthPatterns && Object.keys(widthPatterns).length > 3) {
          const totalWidthUsages = Object.values(widthPatterns).reduce((sum, p) => sum + p.count, 0);
          if (totalWidthUsages > totalUsages * 0.3) {
            suggestions.push({
              type: 'width_fragmentation',
              message: `Width classes appear in ${totalWidthUsages} usages with ${Object.keys(widthPatterns).length} different patterns. Consider adding a "size" prop with variants (sm/md/lg/xl/full).`,
              severity: 'high',
              patterns: widthPatterns
            });
          }
        }

        // Check for common layout combinations
        const layoutCombos = classNameData.tailwindPatterns.commonLayoutCombos;
        if (layoutCombos && layoutCombos.length > 0) {
          const topCombo = layoutCombos[0];
          if (topCombo.count > totalUsages * 0.5) {
            suggestions.push({
              type: 'repeated_layout_combo',
              message: `Layout combination "${topCombo.combination}" appears in ${topCombo.count} usages (${topCombo.percentage}). Consider making it the default.`,
              severity: 'medium',
              combination: topCombo.combination
            });
          }
        }
      }

      const avgLength = classNameData.values.reduce((sum, v) => sum + v.length, 0) / classNameData.values.length;
      if (avgLength > 30) {
        suggestions.push({
          type: 'excessive_classname_overrides',
          message: `${classNameData.count} usages (${((classNameData.count / totalUsages) * 100).toFixed(1)}%) have className overrides. Consider adding variants to the component.`,
          severity: 'medium'
        });
      }
    }

    // Check for missing props from drift indicators
    for (const indicator of driftIndicators) {
      if (indicator.type === 'missing_prop') {
        suggestions.push({
          type: 'missing_prop',
          message: `${indicator.count} usages (${indicator.percentage}) are missing the '${indicator.prop}' prop. Consider making it optional or providing a default.`,
          severity: 'high',
          prop: indicator.prop
        });
      }
    }

    // Check for props with many unique values (fragmentation)
    for (const [propName, data] of Object.entries(propsDiscovered)) {
      if (data.values.length > 10 && data.count > totalUsages * 0.3) {
        suggestions.push({
          type: 'high_fragmentation',
          message: `Prop '${propName}' has ${data.values.length} unique values across ${data.count} usages. Consider standardizing to a variant system.`,
          severity: 'medium',
          prop: propName
        });
      }
    }

    return suggestions;
  }

  /**
   * Detect drift indicators
   */
  detectDrift(usages, groupByProps) {
    const indicators = [];

    // Check for missing props
    for (const propName of groupByProps) {
      const missing = usages.filter(u => 
        u.props[propName] === undefined || u.props[propName] === null
      ).length;

      if (missing > 0) {
        indicators.push({
          type: 'missing_prop',
          prop: propName,
          count: missing,
          percentage: ((missing / usages.length) * 100).toFixed(1) + '%',
          message: `${missing} usages missing ${propName} prop`
        });
      }
    }

    // Check for className overrides (smell for missing variant)
    const classNameOverrides = usages.filter(u => {
      const className = u.props.className;
      return className && typeof className === 'string' && className.length > 20;
    }).length;

    if (classNameOverrides > usages.length * 0.1) {
      indicators.push({
        type: 'excessive_classname_overrides',
        count: classNameOverrides,
        percentage: ((classNameOverrides / usages.length) * 100).toFixed(1) + '%',
        message: `${classNameOverrides} usages have className overrides (consider adding variants)`
      });
    }

    // Check for inconsistent prop values
    const propValueCounts = new Map();
    for (const usage of usages) {
      for (const [propName, value] of Object.entries(usage.props)) {
        if (groupByProps.includes(propName)) {
          const key = `${propName}=${value}`;
          propValueCounts.set(key, (propValueCounts.get(key) || 0) + 1);
        }
      }
    }

    // Flag if there are many unique signatures (fragmentation)
    const uniqueSignatures = new Set(
      usages.map(u => {
        return groupByProps.map(p => `${p}=${u.props[p] || 'unset'}`).join('|');
      })
    ).size;

    if (uniqueSignatures > 10 && usages.length > 20) {
      indicators.push({
        type: 'signature_fragmentation',
        uniqueSignatures,
        totalUsages: usages.length,
        message: `${uniqueSignatures} unique prop combinations detected (consider standardizing)`
      });
    }

    return indicators;
  }

  /**
   * Get location from AST node
   */
  getLocation(path, content) {
    if (path.node.loc) {
      return {
        line: path.node.loc.start.line,
        column: path.node.loc.start.column
      };
    }
    return { line: 0, column: 0 };
  }

  /**
   * Get code snippet around a line
   */
  getCodeSnippet(content, line, context = 2) {
    const lines = content.split('\n');
    const start = Math.max(0, line - context - 1);
    const end = Math.min(lines.length, line + context);
    return lines.slice(start, end).join('\n');
  }
}

