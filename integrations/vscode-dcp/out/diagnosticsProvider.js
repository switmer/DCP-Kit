"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DCPDiagnosticsProvider = void 0;
const vscode = require("vscode");
class DCPDiagnosticsProvider {
    constructor(registryClient, outputChannel) {
        this.registryClient = registryClient;
        this.outputChannel = outputChannel;
        this.diagnosticsCollection = vscode.languages.createDiagnosticCollection('dcp');
    }
    async validateDocument(document) {
        if (!this.registryClient.getRegistry()) {
            this.outputChannel.appendLine('No registry available for validation');
            return;
        }
        try {
            const code = document.getText();
            const filePath = document.uri.fsPath;
            this.outputChannel.appendLine(`Validating: ${filePath}`);
            // Call DCP validation API
            const result = await this.registryClient.validateCode(code, filePath);
            // Convert validation results to VS Code diagnostics
            const diagnostics = this.convertToDiagnostics(result, document);
            // Update diagnostics collection
            this.diagnosticsCollection.set(document.uri, diagnostics);
            this.outputChannel.appendLine(`Validation complete: ${diagnostics.length} issues found`);
        }
        catch (error) {
            this.outputChannel.appendLine(`Validation failed: ${error}`);
            // Clear diagnostics on error to avoid stale results
            this.diagnosticsCollection.set(document.uri, []);
        }
    }
    convertToDiagnostics(validationResult, document) {
        const diagnostics = [];
        const config = vscode.workspace.getConfiguration('dcp');
        const validationLevel = config.get('validationLevel', 'error');
        // Process errors
        if (validationResult.errors) {
            for (const error of validationResult.errors) {
                const diagnostic = this.createDiagnostic(error, document, vscode.DiagnosticSeverity.Error);
                if (diagnostic) {
                    diagnostics.push(diagnostic);
                }
            }
        }
        // Process warnings (only if validation level allows)
        if (validationResult.warnings && validationLevel !== 'error') {
            for (const warning of validationResult.warnings) {
                const diagnostic = this.createDiagnostic(warning, document, vscode.DiagnosticSeverity.Warning);
                if (diagnostic) {
                    diagnostics.push(diagnostic);
                }
            }
        }
        // Process suggestions (only if validation level is info)
        if (validationResult.suggestions && validationLevel === 'info') {
            for (const suggestion of validationResult.suggestions) {
                const diagnostic = this.createDiagnostic(suggestion, document, vscode.DiagnosticSeverity.Information);
                if (diagnostic) {
                    diagnostics.push(diagnostic);
                }
            }
        }
        return diagnostics;
    }
    createDiagnostic(issue, document, severity) {
        try {
            // Issue should have: line, column, message, rule
            const line = Math.max(0, (issue.line || 1) - 1); // Convert to 0-based
            const column = Math.max(0, (issue.column || 1) - 1);
            // Try to determine the end position for better highlighting
            const lineText = document.lineAt(line).text;
            const endColumn = this.findEndColumn(lineText, column, issue);
            const range = new vscode.Range(new vscode.Position(line, column), new vscode.Position(line, endColumn));
            const diagnostic = new vscode.Diagnostic(range, issue.message || 'Design system validation issue', severity);
            // Add additional metadata
            diagnostic.source = 'DCP';
            diagnostic.code = issue.rule || 'dcp-validation';
            // Add related information if available
            if (issue.suggestions) {
                diagnostic.relatedInformation = issue.suggestions.map((suggestion) => new vscode.DiagnosticRelatedInformation(new vscode.Location(document.uri, range), `Suggestion: ${suggestion}`));
            }
            return diagnostic;
        }
        catch (error) {
            this.outputChannel.appendLine(`Error creating diagnostic: ${error}`);
            return null;
        }
    }
    findEndColumn(lineText, startColumn, issue) {
        // Try to find the end of the problematic token/word
        let endColumn = startColumn;
        // Look for common patterns to highlight
        const patterns = [
            // String literals: "value" or 'value'
            /["'][^"']*["']/,
            // JSX attributes: variant="value"
            /\w+="[^"]*"/,
            // CSS classes: className="value"
            /className\s*=\s*["'][^"']*["']/,
            // Component names: <ComponentName
            /<\w+/,
            // Property names: propName=
            /\w+\s*=/,
            // Token references: token.name
            /[\w.-]+/
        ];
        const substring = lineText.substring(startColumn);
        for (const pattern of patterns) {
            const match = substring.match(pattern);
            if (match && match.index === 0) {
                endColumn = startColumn + match[0].length;
                break;
            }
        }
        // Fallback: highlight to end of word
        if (endColumn === startColumn) {
            const wordMatch = substring.match(/^\w+/);
            if (wordMatch) {
                endColumn = startColumn + wordMatch[0].length;
            }
            else {
                endColumn = startColumn + 1; // At least highlight one character
            }
        }
        return Math.min(endColumn, lineText.length);
    }
    clearDiagnostics(document) {
        this.diagnosticsCollection.set(document.uri, []);
    }
    clearAllDiagnostics() {
        this.diagnosticsCollection.clear();
    }
    dispose() {
        this.diagnosticsCollection.dispose();
    }
}
exports.DCPDiagnosticsProvider = DCPDiagnosticsProvider;
//# sourceMappingURL=diagnosticsProvider.js.map