"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryClient = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const axios_1 = require("axios");
class RegistryClient {
    constructor(outputChannel) {
        this.registry = null;
        this.registryPath = null;
        this.apiUrl = null;
        this.outputChannel = outputChannel;
    }
    async loadRegistry() {
        const config = vscode.workspace.getConfiguration('dcp');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            this.outputChannel.appendLine('No workspace folder found');
            return false;
        }
        // Try local registry first
        const localRegistryPath = path.resolve(workspaceFolder.uri.fsPath, config.get('registryPath', './registry'));
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
    async tryLoadLocalRegistry(registryPath) {
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
        }
        catch (error) {
            this.outputChannel.appendLine(`Failed to load local registry: ${error}`);
            return false;
        }
    }
    async tryLoadApiRegistry(apiUrl) {
        try {
            // Check if API is available
            const healthResponse = await axios_1.default.get(`${apiUrl}/health`, { timeout: 2000 });
            if (healthResponse.data.status !== 'healthy') {
                this.outputChannel.appendLine(`API unhealthy: ${healthResponse.data.status}`);
                return false;
            }
            // Load registry from API
            const registryResponse = await axios_1.default.get(`${apiUrl}/registry`, { timeout: 5000 });
            this.registry = registryResponse.data;
            this.outputChannel.appendLine(`Loaded registry from API: ${apiUrl}`);
            return true;
        }
        catch (error) {
            this.outputChannel.appendLine(`Failed to load API registry: ${error}`);
            return false;
        }
    }
    getRegistry() {
        return this.registry;
    }
    getRegistryPath() {
        return this.registryPath;
    }
    getApiUrl() {
        return this.apiUrl;
    }
    getStats() {
        if (!this.registry) {
            return { components: 0, tokens: 0 };
        }
        return {
            components: this.registry.components?.length || 0,
            tokens: Object.keys(this.registry.tokens || {}).length
        };
    }
    // Get component by name
    getComponent(name) {
        if (!this.registry?.components) {
            return null;
        }
        return this.registry.components.find(c => c.name === name) || null;
    }
    // Get all component names
    getComponentNames() {
        if (!this.registry?.components) {
            return [];
        }
        return this.registry.components.map(c => c.name);
    }
    // Get component variants
    getComponentVariants(componentName) {
        const component = this.getComponent(componentName);
        return component?.variants || [];
    }
    // Get component props
    getComponentProps(componentName) {
        const component = this.getComponent(componentName);
        return component?.props || [];
    }
    // Get all tokens flattened
    getAllTokens() {
        if (!this.registry?.tokens) {
            return [];
        }
        const tokens = [];
        Object.entries(this.registry.tokens).forEach(([category, categoryTokens]) => {
            if (typeof categoryTokens === 'object' && categoryTokens !== null) {
                Object.entries(categoryTokens).forEach(([name, value]) => {
                    tokens.push({
                        name,
                        value: typeof value === 'object' ? value.value : String(value),
                        type: typeof value === 'object' ? value.type || 'unknown' : 'unknown',
                        category,
                        description: typeof value === 'object' ? value.description : undefined
                    });
                });
            }
        });
        return tokens;
    }
    // Get tokens by category
    getTokensByCategory(category) {
        return this.getAllTokens().filter(token => token.category === category);
    }
    // Find token by name (fuzzy search)
    findToken(name) {
        const tokens = this.getAllTokens();
        // Exact match first
        let token = tokens.find(t => t.name === name);
        if (token)
            return token;
        // Partial match
        token = tokens.find(t => t.name.includes(name));
        if (token)
            return token;
        // CSS variable style (--token-name)
        const cssVarName = name.startsWith('--') ? name.slice(2) : name;
        token = tokens.find(t => t.name === cssVarName || t.name.includes(cssVarName));
        return token || null;
    }
    // Validate via API
    async validateCode(code, filePath) {
        if (this.apiUrl) {
            try {
                const response = await axios_1.default.post(`${this.apiUrl}/validate`, {
                    code,
                    filePath
                }, { timeout: 10000 });
                return response.data;
            }
            catch (error) {
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
exports.RegistryClient = RegistryClient;
//# sourceMappingURL=registryClient.js.map