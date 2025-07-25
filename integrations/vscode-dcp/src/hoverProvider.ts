import * as vscode from 'vscode';
import { RegistryClient, DCPComponent, DCPToken } from './registryClient';

export class DCPHoverProvider implements vscode.HoverProvider {
    private registryClient: RegistryClient;

    constructor(registryClient: RegistryClient) {
        this.registryClient = registryClient;
    }

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        
        if (!this.registryClient.getRegistry()) {
            return null;
        }

        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return null;
        }

        const word = document.getText(wordRange);
        const lineText = document.lineAt(position).text;
        const linePrefix = lineText.substring(0, wordRange.start.character);
        
        // Analyze what we're hovering over
        const hoverContext = this.analyzeHoverContext(word, linePrefix, lineText, position, document);
        
        switch (hoverContext.type) {
            case 'component':
                return this.createComponentHover(hoverContext.componentName!, wordRange);
            
            case 'token':
                return this.createTokenHover(hoverContext.tokenName!, wordRange);
            
            case 'prop':
                return this.createPropHover(
                    hoverContext.componentName!,
                    hoverContext.propName!,
                    wordRange
                );
            
            default:
                return null;
        }
    }

    private analyzeHoverContext(
        word: string,
        linePrefix: string,
        lineText: string,
        position: vscode.Position,
        document: vscode.TextDocument
    ): HoverContext {
        
        // JSX Component name: <Button>
        const componentMatch = linePrefix.match(/<(\w+)$/);
        if (componentMatch && word === componentMatch[1]) {
            const component = this.registryClient.getComponent(word);
            if (component) {
                return {
                    type: 'component',
                    componentName: word
                };
            }
        }

        // Token in className: className="bg-primary-500"
        const classNameMatch = lineText.match(/className\s*=\s*["']([^"']*)/);
        if (classNameMatch) {
            const className = classNameMatch[1];
            const tokenName = this.extractTokenFromClassName(className, word);
            if (tokenName) {
                const token = this.registryClient.findToken(tokenName);
                if (token) {
                    return {
                        type: 'token',
                        tokenName: token.name
                    };
                }
            }
        }

        // CSS variable: var(--primary-500)
        const cssVarMatch = lineText.match(/var\(--([^)]+)\)/);
        if (cssVarMatch && word === cssVarMatch[1]) {
            const token = this.registryClient.findToken(word);
            if (token) {
                return {
                    type: 'token',
                    tokenName: token.name
                };
            }
        }

        // Token reference: tokens.primary.500
        const tokenRefMatch = linePrefix.match(/tokens?\.[\w.]*$/);
        if (tokenRefMatch) {
            const token = this.registryClient.findToken(word);
            if (token) {
                return {
                    type: 'token',
                    tokenName: token.name
                };
            }
        }

        // JSX Prop name: <Button variant="primary">
        const propMatch = linePrefix.match(/<(\w+)[^>]*\s+(\w+)$/);
        if (propMatch && word === propMatch[2]) {
            const componentName = propMatch[1];
            const component = this.registryClient.getComponent(componentName);
            const prop = component?.props.find(p => p.name === word);
            
            if (prop) {
                return {
                    type: 'prop',
                    componentName,
                    propName: word
                };
            }
        }

        // Prop value that might be a variant: variant="primary"
        const propValueMatch = lineText.match(/(\w+)\s*=\s*["']([^"']+)["']/);
        if (propValueMatch) {
            const propName = propValueMatch[1];
            const propValue = propValueMatch[2];
            
            if (word === propValue) {
                const componentName = this.findComponentNameInLine(lineText);
                if (componentName && propName === 'variant') {
                    const variants = this.registryClient.getComponentVariants(componentName);
                    if (variants.includes(word)) {
                        return {
                            type: 'variant',
                            componentName,
                            variantName: word
                        };
                    }
                }
            }
        }

        return { type: 'unknown' };
    }

    private extractTokenFromClassName(className: string, hoveredWord: string): string | null {
        // Extract token name from Tailwind-style class names
        const patterns = [
            /^bg-(.+)$/,      // bg-primary-500 -> primary-500
            /^text-(.+)$/,    // text-red-500 -> red-500
            /^border-(.+)$/,  // border-gray-200 -> gray-200
            /^p-(.+)$/,       // p-4 -> 4
            /^m-(.+)$/,       // m-2 -> 2
            /^w-(.+)$/,       // w-full -> full
            /^h-(.+)$/        // h-screen -> screen
        ];

        for (const pattern of patterns) {
            const match = className.match(pattern);
            if (match && (className.includes(hoveredWord) || match[1] === hoveredWord)) {
                return match[1];
            }
        }

        return null;
    }

    private findComponentNameInLine(lineText: string): string | null {
        const match = lineText.match(/<(\w+)/);
        return match ? match[1] : null;
    }

    private createComponentHover(componentName: string, range: vscode.Range): vscode.Hover {
        const component = this.registryClient.getComponent(componentName);
        if (!component) {
            return new vscode.Hover('Component not found', range);
        }

        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;

        // Component header
        markdown.appendMarkdown(`### 🧩 ${component.name}\n\n`);
        
        if (component.description) {
            markdown.appendMarkdown(`${component.description}\n\n`);
        }

        // Category
        if (component.category) {
            markdown.appendMarkdown(`**Category:** ${component.category}\n\n`);
        }

        // Required props
        const requiredProps = component.props.filter(p => p.required);
        if (requiredProps.length > 0) {
            markdown.appendMarkdown(`**Required Props:** ${requiredProps.map(p => `\`${p.name}\``).join(', ')}\n\n`);
        }

        // Variants
        if (component.variants && component.variants.length > 0) {
            markdown.appendMarkdown(`**Variants:** ${component.variants.map(v => `\`${v}\``).join(', ')}\n\n`);
        }

        // Example usage
        if (component.examples && component.examples.length > 0) {
            markdown.appendMarkdown(`**Example:**\n\`\`\`tsx\n${component.examples[0]}\n\`\`\`\n\n`);
        }

        // Quick props reference
        if (component.props.length > 0) {
            markdown.appendMarkdown(`**Props:**\n`);
            component.props.slice(0, 5).forEach(prop => { // Show first 5 props
                const required = prop.required ? '*(required)*' : '';
                markdown.appendMarkdown(`- \`${prop.name}: ${prop.type}\` ${required}\n`);
            });
            
            if (component.props.length > 5) {
                markdown.appendMarkdown(`- *...and ${component.props.length - 5} more*\n`);
            }
        }

        return new vscode.Hover(markdown, range);
    }

    private createTokenHover(tokenName: string, range: vscode.Range): vscode.Hover {
        const token = this.registryClient.findToken(tokenName);
        if (!token) {
            return new vscode.Hover('Token not found', range);
        }

        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;

        // Token header with visual indicator
        const icon = this.getTokenIcon(token.type);
        markdown.appendMarkdown(`### ${icon} ${token.name}\n\n`);

        // Token value with visual preview
        if (token.type === 'color') {
            // Create color swatch
            const colorValue = token.value;
            const svg = `<svg width="20" height="20" style="vertical-align: middle; margin-right: 8px;"><rect width="20" height="20" fill="${colorValue}" stroke="#ccc" stroke-width="1"/></svg>`;
            const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
            markdown.appendMarkdown(`![color](${dataUrl}) **\`${colorValue}\`**\n\n`);
        } else {
            markdown.appendMarkdown(`**Value:** \`${token.value}\`\n\n`);
        }

        // Additional info
        markdown.appendMarkdown(`**Type:** ${token.type}\n\n`);
        markdown.appendMarkdown(`**Category:** ${token.category}\n\n`);

        if (token.description) {
            markdown.appendMarkdown(`${token.description}\n\n`);
        }

        // Usage examples
        markdown.appendMarkdown(`**Usage:**\n`);
        
        if (token.type === 'color') {
            markdown.appendMarkdown(`\`\`\`tsx\n<div className="bg-${token.name}">\n<div style={{backgroundColor: "var(--${token.name})"}}>\n\`\`\`\n\n`);
        } else if (token.category === 'spacing') {
            markdown.appendMarkdown(`\`\`\`tsx\n<div className="p-${token.name}">\n<div style={{padding: "var(--${token.name})"}}>\n\`\`\`\n\n`);
        } else {
            markdown.appendMarkdown(`\`\`\`css\nvar(--${token.name})\n\`\`\`\n\n`);
        }

        // Related tokens
        const relatedTokens = this.findRelatedTokens(token);
        if (relatedTokens.length > 0) {
            markdown.appendMarkdown(`**Related:** ${relatedTokens.map(t => `\`${t.name}\``).join(', ')}\n\n`);
        }

        return new vscode.Hover(markdown, range);
    }

    private createPropHover(
        componentName: string,
        propName: string,
        range: vscode.Range
    ): vscode.Hover {
        const component = this.registryClient.getComponent(componentName);
        const prop = component?.props.find(p => p.name === propName);
        
        if (!prop) {
            return new vscode.Hover('Property not found', range);
        }

        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;

        // Prop header
        const icon = prop.required ? '⚠️' : '📝';
        markdown.appendMarkdown(`### ${icon} ${propName}\n\n`);

        // Type and requirement
        const required = prop.required ? ' *(required)*' : '';
        markdown.appendMarkdown(`**Type:** \`${prop.type}\`${required}\n\n`);

        if (prop.description) {
            markdown.appendMarkdown(`${prop.description}\n\n`);
        }

        if (prop.default) {
            markdown.appendMarkdown(`**Default:** \`${prop.default}\`\n\n`);
        }

        // Show possible values for union types
        if (prop.type.includes('|')) {
            const values = prop.type.split('|').map(v => v.trim().replace(/['"]/g, ''));
            markdown.appendMarkdown(`**Possible values:** ${values.map(v => `\`${v}\``).join(', ')}\n\n`);
        }

        // Show variants if this is a variant prop
        if (propName === 'variant') {
            const variants = this.registryClient.getComponentVariants(componentName);
            if (variants.length > 0) {
                markdown.appendMarkdown(`**Available variants:** ${variants.map(v => `\`${v}\``).join(', ')}\n\n`);
            }
        }

        return new vscode.Hover(markdown, range);
    }

    private getTokenIcon(type: string): string {
        const icons: Record<string, string> = {
            'color': '🎨',
            'spacing': '📏',
            'typography': '📝',
            'border': '🔲',
            'shadow': '🌫️',
            'animation': '⏯️',
            'size': '📐'
        };
        
        return icons[type] || '🏷️';
    }

    private findRelatedTokens(token: DCPToken): DCPToken[] {
        const allTokens = this.registryClient.getAllTokens();
        
        // Find tokens in the same category with similar names
        const related = allTokens.filter(t => 
            t.category === token.category &&
            t.name !== token.name &&
            (t.name.includes(token.name.split('-')[0]) || token.name.includes(t.name.split('-')[0]))
        );
        
        return related.slice(0, 3); // Limit to 3 related tokens
    }
}

interface HoverContext {
    type: 'component' | 'token' | 'prop' | 'variant' | 'unknown';
    componentName?: string;
    propName?: string;
    tokenName?: string;
    variantName?: string;
}