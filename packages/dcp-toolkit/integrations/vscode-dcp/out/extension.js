"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const chokidar = require("chokidar");
// Core classes
const registryClient_1 = require("./registryClient");
const diagnosticsProvider_1 = require("./diagnosticsProvider");
const completionProvider_1 = require("./completionProvider");
const hoverProvider_1 = require("./hoverProvider");
let registryClient;
let diagnosticsProvider;
let statusBarItem;
let outputChannel;
function activate(context) {
    console.log('DCP Design System extension is activating...');
    // Create output channel for debugging
    outputChannel = vscode.window.createOutputChannel('DCP Design System');
    outputChannel.appendLine('DCP extension starting...');
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'dcp.openRegistry';
    statusBarItem.show();
    // Initialize registry client
    registryClient = new registryClient_1.RegistryClient(outputChannel);
    // Initialize providers
    diagnosticsProvider = new diagnosticsProvider_1.DCPDiagnosticsProvider(registryClient, outputChannel);
    // Setup providers
    setupProviders(context);
    // Setup commands
    setupCommands(context);
    // Setup file watchers
    setupFileWatchers(context);
    // Initial registry load
    loadRegistry();
    outputChannel.appendLine('DCP extension activated successfully');
}
exports.activate = activate;
async function loadRegistry() {
    try {
        statusBarItem.text = "$(loading~spin) DCP Loading...";
        statusBarItem.tooltip = "Loading DCP registry...";
        const success = await registryClient.loadRegistry();
        if (success) {
            const stats = registryClient.getStats();
            statusBarItem.text = "$(check) DCP Ready";
            statusBarItem.tooltip = `DCP Ready - ${stats.components} components, ${stats.tokens} tokens`;
            statusBarItem.color = undefined;
            outputChannel.appendLine(`Registry loaded: ${stats.components} components, ${stats.tokens} tokens`);
            // Validate current file if open
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && shouldValidateFile(activeEditor.document)) {
                diagnosticsProvider.validateDocument(activeEditor.document);
            }
        }
        else {
            statusBarItem.text = "$(warning) DCP Missing";
            statusBarItem.tooltip = "No DCP registry found. Click to extract.";
            statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
            // Show helpful message for first-time users
            showRegistrySetupPrompt();
        }
    }
    catch (error) {
        statusBarItem.text = "$(error) DCP Error";
        statusBarItem.tooltip = `DCP Error: ${error}`;
        statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        outputChannel.appendLine(`Error loading registry: ${error}`);
    }
}
function setupProviders(context) {
    // Completion provider for TypeScript/JavaScript files
    const completionProvider = new completionProvider_1.DCPCompletionProvider(registryClient);
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider([
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'javascriptreact' }
    ], completionProvider, '"', "'", '=', ' ', '.'));
    // Hover provider for token previews
    const hoverProvider = new hoverProvider_1.DCPHoverProvider(registryClient);
    context.subscriptions.push(vscode.languages.registerHoverProvider([
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'javascriptreact' }
    ], hoverProvider));
    // Document save listener for validation
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => {
        const config = vscode.workspace.getConfiguration('dcp');
        if (config.get('enableValidation') && config.get('validationTrigger') === 'onSave') {
            if (shouldValidateFile(document)) {
                diagnosticsProvider.validateDocument(document);
            }
        }
    }));
    // Document change listener for live validation
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
        const config = vscode.workspace.getConfiguration('dcp');
        if (config.get('enableValidation') && config.get('validationTrigger') === 'onType') {
            if (shouldValidateFile(event.document)) {
                // Debounce validation to avoid excessive API calls
                debounceValidation(event.document);
            }
        }
    }));
}
let validationTimeout;
function debounceValidation(document) {
    if (validationTimeout) {
        clearTimeout(validationTimeout);
    }
    validationTimeout = setTimeout(() => {
        diagnosticsProvider.validateDocument(document);
    }, 500); // 500ms debounce
}
function setupCommands(context) {
    // Manual validation command
    context.subscriptions.push(vscode.commands.registerCommand('dcp.validateFile', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && shouldValidateFile(activeEditor.document)) {
            await diagnosticsProvider.validateDocument(activeEditor.document);
            vscode.window.showInformationMessage('DCP validation completed');
        }
        else {
            vscode.window.showWarningMessage('No valid file to validate');
        }
    }));
    // Refresh registry command
    context.subscriptions.push(vscode.commands.registerCommand('dcp.refreshRegistry', async () => {
        await loadRegistry();
        vscode.window.showInformationMessage('DCP registry refreshed');
    }));
    // Open registry command
    context.subscriptions.push(vscode.commands.registerCommand('dcp.openRegistry', async () => {
        const registryPath = registryClient.getRegistryPath();
        if (registryPath && fs.existsSync(registryPath)) {
            const uri = vscode.Uri.file(path.join(registryPath, 'registry.json'));
            await vscode.window.showTextDocument(uri);
        }
        else {
            showRegistrySetupPrompt();
        }
    }));
    // Extract registry command
    context.subscriptions.push(vscode.commands.registerCommand('dcp.extractRegistry', async () => {
        await extractRegistry();
    }));
}
function setupFileWatchers(context) {
    const config = vscode.workspace.getConfiguration('dcp');
    if (!config.get('autoRefresh')) {
        return;
    }
    // Watch for registry file changes
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const registryPath = path.join(workspaceFolder.uri.fsPath, 'registry');
        const registryPattern = path.join(registryPath, '**/*.json');
        const watcher = chokidar.watch(registryPattern, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: true
        });
        watcher.on('change', () => {
            outputChannel.appendLine('Registry file changed, reloading...');
            loadRegistry();
        });
        context.subscriptions.push({
            dispose: () => watcher.close()
        });
    }
}
function shouldValidateFile(document) {
    const supportedLanguages = [
        'typescript',
        'typescriptreact',
        'javascript',
        'javascriptreact'
    ];
    return supportedLanguages.includes(document.languageId) &&
        document.uri.scheme === 'file';
}
async function showRegistrySetupPrompt() {
    const action = await vscode.window.showInformationMessage('No DCP registry found. Extract components from your codebase to enable design system validation.', 'Extract Now', 'Configure Path', 'Learn More');
    switch (action) {
        case 'Extract Now':
            await extractRegistry();
            break;
        case 'Configure Path':
            await vscode.commands.executeCommand('workbench.action.openSettings', 'dcp.registryPath');
            break;
        case 'Learn More':
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/stevewitmer/dcp-transformer#readme'));
            break;
    }
}
async function extractRegistry() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }
    const srcPath = await vscode.window.showInputBox({
        prompt: 'Source directory to extract from',
        value: './src',
        placeHolder: './src'
    });
    if (!srcPath) {
        return;
    }
    try {
        statusBarItem.text = "$(loading~spin) DCP Extracting...";
        // Run dcp extract command
        const terminal = vscode.window.createTerminal('DCP Extract');
        terminal.show();
        terminal.sendText(`npx dcp extract ${srcPath} --out ./registry --verbose`);
        // Wait a bit then try to reload
        setTimeout(() => {
            loadRegistry();
        }, 3000);
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to extract registry: ${error}`);
        outputChannel.appendLine(`Extract error: ${error}`);
    }
}
function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map