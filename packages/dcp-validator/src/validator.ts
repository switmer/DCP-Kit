import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ValidationError {
  message: string;
  path?: string;
  allowedValues?: string[];
}

export interface ValidationWarning {
  message: string;
  path?: string;
}

export interface ValidationSuggestion {
  message: string;
  fix?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
  suggestions?: ValidationSuggestion[];
}

export interface LintResult {
  fixed: boolean;
  data: any;
  suggestions: ValidationSuggestion[];
  issues: ValidationWarning[];
}

export interface ValidationOptions {
  strict?: boolean;
}

export interface LintOptions {
  autoFix?: boolean;
}

export class DCPValidator {
  private ajv: Ajv;
  private schema: any;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false // Allow additional properties for extensibility
    });
    addFormats(this.ajv);
  }

  async initialize() {
    if (!this.schema) {
      // Load schema from relative path (dist/../schemas)
      const schemaPath = join(__dirname, '../schemas/registry.schema.json');
      const schemaContent = await readFile(schemaPath, 'utf-8');
      this.schema = JSON.parse(schemaContent);
    }
  }

  async validate(data: any, options: ValidationOptions = {}): Promise<ValidationResult> {
    await this.initialize();

    const validate = this.ajv.compile(this.schema);
    const valid = validate(data);

    const result: ValidationResult = {
      valid,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!valid && validate.errors) {
      result.errors = validate.errors.map(error => {
        const message = this.formatErrorMessage(error);
        const path = error.instancePath || error.schemaPath;
        const allowedValues = (error.schema as any)?.enum || undefined;

        return { message, path, allowedValues };
      });
    }

    // Add custom validation warnings and suggestions
    const customChecks = this.performCustomChecks(data, options);
    result.warnings = customChecks.warnings;
    result.suggestions = customChecks.suggestions;

    return result;
  }

  async lint(data: any, options: LintOptions = {}): Promise<LintResult> {
    await this.initialize();

    let fixed = false;
    let lintedData = { ...data };

    const suggestions: ValidationSuggestion[] = [];
    const issues: ValidationWarning[] = [];

    // Auto-fix common issues
    if (options.autoFix) {
      const fixes = this.applyAutoFixes(lintedData);
      lintedData = fixes.data;
      fixed = fixes.applied;
    }

    // Generate suggestions
    const customChecks = this.performCustomChecks(lintedData);
    suggestions.push(...customChecks.suggestions);
    issues.push(...customChecks.warnings);

    return {
      fixed,
      data: lintedData,
      suggestions,
      issues
    };
  }

  createTemplate(type: string, options: { name?: string; title?: string } = {}) {
    const templates = {
      'registry:ui': {
        "$schema": "https://dcp.dev/schemas/registry.schema.json",
        "name": options.name || "my-component",
        "type": "registry:ui",
        "title": options.title || "My Component",
        "description": "A reusable UI component",
        "files": [
          {
            "path": "components/ui/my-component.tsx",
            "type": "registry:component"
          }
        ],
        "dependencies": [],
        "registryDependencies": []
      },
      'registry:block': {
        "$schema": "https://dcp.dev/schemas/registry.schema.json",
        "name": options.name || "my-block",
        "type": "registry:block",
        "title": options.title || "My Block",
        "description": "A compound component block with header, content, and sidebar",
        "files": [
          {
            "path": "blocks/my-block/page.tsx",
            "type": "registry:page",
            "target": "app/my-block/page.tsx",
            "content": "export default function MyBlockPage() {\n  return (\n    <div className=\"container mx-auto\">\n      <h1>My Block</h1>\n    </div>\n  );\n}"
          },
          {
            "path": "blocks/my-block/components.tsx",
            "type": "registry:component",
            "target": "components/blocks/my-block.tsx"
          }
        ],
        "dependencies": [],
        "registryDependencies": ["utils"],
        "meta": {
          "layoutHints": {
            "columns": 3,
            "hasHeader": true,
            "hasSidebar": true,
            "responsive": true
          },
          "intent": "layout:dashboard"
        }
      },
      'registry:theme': {
        "$schema": "https://dcp.dev/schemas/registry.schema.json",
        "name": options.name || "my-theme",
        "type": "registry:theme",
        "title": options.title || "My Theme",
        "description": "A custom theme with CSS variables",
        "cssVars": {
          "light": {},
          "dark": {},
          "theme": {}
        }
      }
    };

    return templates[type as keyof typeof templates] || templates['registry:ui'];
  }

  private formatErrorMessage(error: any): string {
    switch (error.keyword) {
      case 'required':
        return `Missing required property: ${error.params.missingProperty}`;
      case 'enum':
        return `Invalid value "${error.data}". Must be one of: ${error.schema.join(', ')}`;
      case 'type':
        return `Invalid type. Expected ${error.schema}, got ${typeof error.data}`;
      case 'pattern':
        return `Invalid format. Must match pattern: ${error.schema}`;
      default:
        return error.message || 'Validation error';
    }
  }

  private performCustomChecks(data: any, options: ValidationOptions = {}) {
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Check for common issues
    if (!data.description || data.description.length < 10) {
      warnings.push({
        message: 'Description is missing or too short',
        path: '/description'
      });
    }

    if (data.type === 'registry:ui' && !data.registryDependencies?.includes('utils')) {
      suggestions.push({
        message: 'Consider adding "utils" to registryDependencies for className merging',
        fix: 'Add "utils" to registryDependencies array'
      });
    }

    if (data.type === 'registry:block' && !data.meta?.layoutHints) {
      suggestions.push({
        message: 'Add layoutHints to meta for better block understanding',
        fix: 'Add meta.layoutHints with responsive, columns, etc.'
      });
    }

    if (data.files?.length > 0 && !data.files.some((f: any) => f.type === 'registry:component')) {
      warnings.push({
        message: 'No component files found',
        path: '/files'
      });
    }

    // Check for missing semantic fields
    if (!data.meta?.intent && options.strict) {
      suggestions.push({
        message: 'Add semantic intent for better AI understanding',
        fix: 'Add meta.intent field (e.g., "form-input:text", "navigation:primary")'
      });
    }

    // Check inline content and path consistency
    if (data.files) {
      data.files.forEach((file: any, index: number) => {
        // Warn if both content and path are missing
        if (!file.content && !file.path) {
          warnings.push({
            message: `File ${index} missing both content and path`,
            path: `/files/${index}`
          });
        }

        // Suggest inline content for zero-fetch installs
        if (file.path && !file.content && file.type === 'registry:component') {
          suggestions.push({
            message: 'Consider adding inline content for zero-fetch installs',
            fix: 'Add content field with file contents'
          });
        }

        // Validate target paths
        if (file.target) {
          if (file.target.includes('..') || file.target.startsWith('/')) {
            warnings.push({
              message: 'Target path should be relative and not escape project root',
              path: `/files/${index}/target`
            });
          }
        }

        // Suggest target for certain file types
        if (file.type === 'registry:page' && !file.target) {
          suggestions.push({
            message: 'Add target path for page components',
            fix: 'Add target field specifying installation path (e.g., "app/dashboard/page.tsx")'
          });
        }
      });
    }

    return { warnings, suggestions };
  }

  private applyAutoFixes(data: any) {
    let applied = false;
    const fixedData = { ...data };

    // Auto-fix kebab-case name
    if (fixedData.name && !/^[a-z0-9-]+$/.test(fixedData.name)) {
      fixedData.name = fixedData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      applied = true;
    }

    // Auto-add schema if missing
    if (!fixedData.$schema) {
      fixedData.$schema = 'https://dcp.dev/schemas/registry.schema.json';
      applied = true;
    }

    // Auto-fix file types
    if (fixedData.files) {
      fixedData.files.forEach((file: any) => {
        if (!file.type) {
          if (file.path.includes('.tsx') || file.path.includes('.jsx')) {
            file.type = 'registry:component';
            applied = true;
          } else if (file.path.includes('.css')) {
            file.type = 'registry:style';
            applied = true;
          }
        }
      });
    }

    return { data: fixedData, applied };
  }
}