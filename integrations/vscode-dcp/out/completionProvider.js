"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DCPCompletionProvider = void 0;
const vscode = require("vscode");
class DCPCompletionProvider {
    constructor(registryClient) {
        this.registryClient = registryClient;
    }
    provideCompletionItems(document, position, token, context) {
        if (!this.registryClient.getRegistry()) {
            return [];
        }
        const lineText = document.lineAt(position).text;
        const beforeCursor = lineText.substring(0, position.character);
        // Determine completion context
        const completionContext = this.analyzeContext(beforeCursor, document, position);
        switch (completionContext.type) {
            case 'component':
                return this.getComponentCompletions();
            case 'component-prop':
                return this.getComponentPropCompletions(completionContext.componentName);
            case 'prop-value':
                return this.getPropValueCompletions(completionContext.componentName, completionContext.propName);
            case 'token':
                return this.getTokenCompletions(completionContext.category);
            case 'className':
                return this.getClassNameCompletions();
            default:
                return [];
        }
    }
    analyzeContext(beforeCursor, document, position) {
        // JSX Component detection: <Button |
        const componentMatch = beforeCursor.match(/<(\w+)\s*$/);
        if (componentMatch) {
            return {
                type: 'component-prop',
                componentName: componentMatch[1]
            };
        }
        // JSX Prop value: variant="|  or variant={"|
        const propValueMatch = beforeCursor.match(/(\w+)\s*=\s*[{"']([^"'}]*)$/);
        if (propValueMatch) {
            const propName = propValueMatch[1];
            const componentName = this.findComponentName(beforeCursor);
            return {
                type: 'prop-value',
                componentName,
                propName
            };
        }
        // JSX Prop name: <Button |variant
        const propNameMatch = beforeCursor.match(/<(\w+)[^>]*\s+(\w*)$/);
        if (propNameMatch) {
            return {
                type: 'component-prop',
                componentName: propNameMatch[1]
            };
        }
        // className prop: className="|
        const classNameMatch = beforeCursor.match(/className\s*=\s*[{"']([^"'}]*)$/);
        if (classNameMatch) {
            return {
                type: 'className'
            };
        }
        // Token reference in CSS/styled-components: var(--| or token.|
        const tokenMatch = beforeCursor.match(/(var\(--|\btokens?\.)([^)\s]*)$/);
        if (tokenMatch) {
            return {
                type: 'token',
                category: this.guessTokenCategory(beforeCursor)
            };
        }
        // Component tag opening: <|Button
        const componentTagMatch = beforeCursor.match(/<(\w*)$/);
        if (componentTagMatch) {
            return {
                type: 'component'
            };
        }
        return { type: 'unknown' };
    }
    findComponentName(text) {
        // Look backwards for the component name
        const match = text.match(/<(\w+)[^>]*$/);
        return match ? match[1] : undefined;
    }
    guessTokenCategory(text) {
        // Simple heuristics to guess token category from context
        if (text.includes('color') || text.includes('bg-') || text.includes('text-')) {
            return 'color';
        }
        if (text.includes('space') || text.includes('margin') || text.includes('padding')) {
            return 'spacing';
        }
        if (text.includes('font') || text.includes('text') || text.includes('size')) {
            return 'typography';
        }
        return undefined;
    }
    getComponentCompletions() {
        const components = this.registryClient.getComponentNames();
        return components.map(name => {
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Class);
            const component = this.registryClient.getComponent(name);
            item.detail = component?.description || `${name} component`;
            item.documentation = this.createComponentDocumentation(component);
            item.insertText = new vscode.SnippetString(`${name}$0`);
            item.sortText = `0_${name}`; // Prioritize components
            return item;
        });
    }
    getComponentPropCompletions(componentName) {
        const props = this.registryClient.getComponentProps(componentName);
        return props.map(prop => {
            const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
            item.detail = `${prop.type}${prop.required ? ' (required)' : ''}`;
            item.documentation = prop.description || `${prop.name} prop`;
            // Create snippet with appropriate value placeholder
            const valueSnippet = this.createValueSnippet(prop);
            item.insertText = new vscode.SnippetString(`${prop.name}=${valueSnippet}`);
            // Sort required props first
            item.sortText = prop.required ? `0_${prop.name}` : `1_${prop.name}`;
            return item;
        });
    }
    getPropValueCompletions(componentName, propName) {
        const completions = [];
        // Check for component variants
        if (propName === 'variant') {
            const variants = this.registryClient.getComponentVariants(componentName);
            variants.forEach(variant => {
                const item = new vscode.CompletionItem(variant, vscode.CompletionItemKind.Enum);
                item.detail = `${componentName} variant`;
                item.insertText = variant;
                completions.push(item);
            });
        }
        // Check for size prop common values
        if (propName === 'size') {
            const commonSizes = ['xs', 'sm', 'md', 'lg', 'xl'];
            commonSizes.forEach(size => {
                const item = new vscode.CompletionItem(size, vscode.CompletionItemKind.Enum);
                item.detail = 'Size value';
                item.insertText = size;
                completions.push(item);
            });
        }
        // Add boolean values for boolean props
        const prop = this.registryClient.getComponentProps(componentName)
            .find(p => p.name === propName);
        if (prop?.type === 'boolean') {
            ['true', 'false'].forEach(value => {
                const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
                item.detail = 'Boolean value';
                item.insertText = `{${value}}`;
                completions.push(item);
            });
        }
        return completions;
    }
    getTokenCompletions(category) {
        const tokens = category
            ? this.registryClient.getTokensByCategory(category)
            : this.registryClient.getAllTokens();
        return tokens.map(token => {
            const item = new vscode.CompletionItem(token.name, vscode.CompletionItemKind.Variable);
            item.detail = `${token.value} (${token.type})`;
            item.documentation = this.createTokenDocumentation(token);
            item.insertText = token.name;
            item.sortText = `${token.category}_${token.name}`;
            // Add visual indicator for color tokens
            if (token.type === 'color') {
                item.kind = vscode.CompletionItemKind.Color;
            }
            return item;
        });
    }
    getClassNameCompletions() {
        // Get all tokens that could be used as CSS classes
        const tokens = this.registryClient.getAllTokens();
        const completions = [];
        // Common Tailwind-style patterns
        const patterns = [
            { prefix: 'bg-', category: 'color', description: 'Background color' },
            { prefix: 'text-', category: 'color', description: 'Text color' },
            { prefix: 'border-', category: 'color', description: 'Border color' },
            { prefix: 'p-', category: 'spacing', description: 'Padding' },
            { prefix: 'm-', category: 'spacing', description: 'Margin' },
            { prefix: 'w-', category: 'spacing', description: 'Width' },
            { prefix: 'h-', category: 'spacing', description: 'Height' }
        ];
        patterns.forEach(pattern => {
            const categoryTokens = tokens.filter(t => t.category === pattern.category);
            categoryTokens.forEach(token => {
                const className = `${pattern.prefix}${token.name}`;
                const item = new vscode.CompletionItem(className, vscode.CompletionItemKind.Value);
                item.detail = `${pattern.description}: ${token.value}`;
                item.documentation = this.createTokenDocumentation(token);
                item.insertText = className;
                item.sortText = `${pattern.prefix}_${token.name}`;
                completions.push(item);
            });
        });
        return completions;
    }
    createValueSnippet(prop) {
        if (prop.type === 'string') {
            return `"$1"`;
        }
        else if (prop.type === 'boolean') {
            return `{$1}`;
        }
        else if (prop.type.includes('|')) {
            // Union type - show first option as placeholder
            const firstOption = prop.type.split('|')[0].trim().replace(/['"]/g, '');
            return `"${firstOption}"`;
        }
        else {
            return `{$1}`;
        }
    }
    createComponentDocumentation(component) {
        const docs = new vscode.MarkdownString();
        if (component.description) {
            docs.appendMarkdown(`${component.description}\n\n`);
        }
        // Add props table
        if (component.props.length > 0) {
            docs.appendMarkdown('**Props:**\n\n');
            docs.appendMarkdown('| Prop | Type | Required | Description |\n');
            docs.appendMarkdown('|------|------|----------|-------------|\n');
            component.props.forEach(prop => {
                const required = prop.required ? '✓' : '';
                const description = prop.description || '';
                docs.appendMarkdown(`| ${prop.name} | ${prop.type} | ${required} | ${description} |\n`);
            });
            docs.appendMarkdown('\n');
        }
        // Add variants
        if (component.variants && component.variants.length > 0) {
            docs.appendMarkdown(`**Variants:** ${component.variants.join(', ')}\n\n`);
        }
        docs.isTrusted = true;
        return docs;
    }
    createTokenDocumentation(token) {
        const docs = new vscode.MarkdownString();
        docs.appendMarkdown(`**${token.name}**\n\n`);
        docs.appendMarkdown(`**Value:** \`${token.value}\`\n\n`);
        docs.appendMarkdown(`**Type:** ${token.type}\n\n`);
        docs.appendMarkdown(`**Category:** ${token.category}\n\n`);
        if (token.description) {
            docs.appendMarkdown(`${token.description}\n\n`);
        }
        // Add visual preview for colors
        if (token.type === 'color') {
            // Create a small color swatch using SVG data URL
            const colorValue = token.value;
            const svg = `<svg width="16" height="16"><rect width="16" height="16" fill="${colorValue}"/></svg>`;
            const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
            docs.appendMarkdown(`![color](${dataUrl})\n\n`);
        }
        docs.isTrusted = true;
        return docs;
    }
}
exports.DCPCompletionProvider = DCPCompletionProvider;
//# sourceMappingURL=completionProvider.js.map