import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

export interface DCPRegistry {
    components: DCPComponent[];
    tokens: Record<string, any>;
    metadata?: any;
    intelligence?: any;
}

export interface DCPComponent {
    name: string;
    description?: string;
    category?: string;
    props: DCPProp[];
    variants?: string[];
    examples?: any[];
}

export interface DCPProp {
    name: string;
    type: string;
    required: boolean;
    description?: string;
    default?: string;
}

export interface DCPToken {
    name: string;
    value: string;
    type: string;
    category: string;
    description?: string;
}

export class RegistryClient {
    private registry: DCPRegistry | null = null;
    private registryPath: string | null = null;
    private apiUrl: string | null = null;
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    async loadRegistry(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('dcp');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            this.outputChannel.appendLine('No workspace folder found');
            return false;
        }

        // Try local registry first
        const localRegistryPath = path.resolve(
            workspaceFolder.uri.fsPath,
            config.get('registryPath', './registry')
        );

        if (await this.tryLoadLocalRegistry(localRegistryPath)) {
            this.registryPath = localRegistryPath;
            return true;
        }

        // Fall back to API
        const apiUrl = config.get('apiUrl', 'http://localhost:7401/api/v1');
        if (await this.tryLoadApiRegistry(apiUrl)) {
            this.apiUrl = apiUrl;
            return true;
        }

        this.outputChannel.appendLine('No registry found - neither local nor API');
        return false;
    }

    private async tryLoadLocalRegistry(registryPath: string): Promise<boolean> {
        try {
            const registryFile = path.join(registryPath, 'registry.json');
            
            if (!fs.existsSync(registryFile)) {
                this.outputChannel.appendLine(`Local registry not found: ${registryFile}`);
                return false;
            }

            const content = fs.readFileSync(registryFile, 'utf-8');
            this.registry = JSON.parse(content);
            
            this.outputChannel.appendLine(`Loaded local registry from: ${registryFile}`);
            return true;
        } catch (error) {
            this.outputChannel.appendLine(`Failed to load local registry: ${error}`);
            return false;
        }
    }

    private async tryLoadApiRegistry(apiUrl: string): Promise<boolean> {
        try {
            // Check if API is available
            const healthResponse = await axios.get(`${apiUrl}/health`, { timeout: 2000 });
            
            if (healthResponse.data.status !== 'healthy') {
                this.outputChannel.appendLine(`API unhealthy: ${healthResponse.data.status}`);
                return false;
            }

            // Load registry from API
            const registryResponse = await axios.get(`${apiUrl}/registry`, { timeout: 5000 });
            this.registry = registryResponse.data;
            
            this.outputChannel.appendLine(`Loaded registry from API: ${apiUrl}`);
            return true;
        } catch (error) {
            this.outputChannel.appendLine(`Failed to load API registry: ${error}`);
            return false;
        }
    }

    getRegistry(): DCPRegistry | null {
        return this.registry;
    }

    getRegistryPath(): string | null {
        return this.registryPath;
    }

    getApiUrl(): string | null {
        return this.apiUrl;
    }

    getStats(): { components: number; tokens: number } {
        if (!this.registry) {
            return { components: 0, tokens: 0 };
        }

        return {
            components: this.registry.components?.length || 0,
            tokens: Object.keys(this.registry.tokens || {}).length
        };
    }

    // Get component by name
    getComponent(name: string): DCPComponent | null {
        if (!this.registry?.components) {
            return null;
        }

        return this.registry.components.find(c => c.name === name) || null;
    }

    // Get all component names
    getComponentNames(): string[] {
        if (!this.registry?.components) {
            return [];
        }

        return this.registry.components.map(c => c.name);
    }

    // Get component variants
    getComponentVariants(componentName: string): string[] {
        const component = this.getComponent(componentName);
        return component?.variants || [];
    }

    // Get component props
    getComponentProps(componentName: string): DCPProp[] {
        const component = this.getComponent(componentName);
        return component?.props || [];
    }

    // Get all tokens flattened
    getAllTokens(): DCPToken[] {
        if (!this.registry?.tokens) {
            return [];
        }

        const tokens: DCPToken[] = [];
        
        Object.entries(this.registry.tokens).forEach(([category, categoryTokens]) => {
            if (typeof categoryTokens === 'object' && categoryTokens !== null) {
                Object.entries(categoryTokens).forEach(([name, value]) => {
                    tokens.push({
                        name,
                        value: typeof value === 'object' ? (value as any).value : String(value),
                        type: typeof value === 'object' ? (value as any).type || 'unknown' : 'unknown',
                        category,
                        description: typeof value === 'object' ? (value as any).description : undefined
                    });
                });
            }
        });

        return tokens;
    }

    // Get tokens by category
    getTokensByCategory(category: string): DCPToken[] {
        return this.getAllTokens().filter(token => token.category === category);
    }

    // Find token by name (fuzzy search)
    findToken(name: string): DCPToken | null {
        const tokens = this.getAllTokens();
        
        // Exact match first
        let token = tokens.find(t => t.name === name);
        if (token) return token;

        // Partial match
        token = tokens.find(t => t.name.includes(name));
        if (token) return token;

        // CSS variable style (--token-name)
        const cssVarName = name.startsWith('--') ? name.slice(2) : name;
        token = tokens.find(t => t.name === cssVarName || t.name.includes(cssVarName));
        
        return token || null;
    }

    // Validate via API
    async validateCode(code: string, filePath?: string): Promise<any> {
        if (this.apiUrl) {
            try {
                const response = await axios.post(`${this.apiUrl}/validate`, {
                    code,
                    filePath
                }, { timeout: 10000 });
                
                return response.data;
            } catch (error) {
                this.outputChannel.appendLine(`Validation API error: ${error}`);
                throw error;
            }
        }

        // TODO: Implement local validation if no API available
        return {
            valid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };
    }
}