import * as vscode from 'vscode';
import * as path from 'path';
import { DaemonManager } from './daemon';
import { validateBinaries } from './platform';

let daemonManager: DaemonManager | null = null;
let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    outputChannel = vscode.window.createOutputChannel('Chainlink');
    context.subscriptions.push(outputChannel);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'chainlink.daemonStatus';
    context.subscriptions.push(statusBarItem);

    // Validate binaries are present
    const validation = validateBinaries(context.extensionPath);
    if (!validation.valid) {
        outputChannel.appendLine(`Binary validation failed: ${validation.error}`);
        vscode.window.showErrorMessage(
            `Chainlink: Binary not found for your platform. ${validation.error}`
        );
        return;
    }

    // Add binary directory to PATH for all terminals and child processes
    const binDir = path.join(context.extensionPath, 'bin');
    addToPath(context, binDir);
    outputChannel.appendLine(`Added to PATH: ${binDir}`);

    // Get workspace folder
    const workspaceFolder = getWorkspaceFolder();
    if (!workspaceFolder) {
        outputChannel.appendLine('No workspace folder open');
        updateStatusBar(false);
        registerCommands(context);
        return;
    }

    // Get configuration
    const config = vscode.workspace.getConfiguration('chainlink');
    const overridePath = config.get<string>('binaryPath');
    const autoStart = config.get<boolean>('autoStartDaemon', true);
    const showOutput = config.get<boolean>('showOutputChannel', false);

    // Initialize daemon manager
    daemonManager = new DaemonManager({
        extensionPath: context.extensionPath,
        workspaceFolder,
        outputChannel,
        overrideBinaryPath: overridePath,
    });

    // Register commands
    registerCommands(context);

    // Auto-start daemon if configured and .chainlink exists
    if (autoStart && daemonManager.hasChainlinkProject()) {
        try {
            await daemonManager.start();
            updateStatusBar(true);
            if (showOutput) {
                outputChannel.show();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            outputChannel.appendLine(`Failed to auto-start daemon: ${message}`);
            updateStatusBar(false);
        }
    } else {
        updateStatusBar(false);
    }

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('chainlink')) {
                handleConfigChange();
            }
        })
    );

    outputChannel.appendLine('Chainlink extension activated');
}

export function deactivate(): void {
    // Critical: Stop daemon when extension deactivates
    // This prevents zombie processes when VS Code closes
    if (daemonManager) {
        daemonManager.dispose();
        daemonManager = null;
    }
    outputChannel?.appendLine('Chainlink extension deactivated');
}

function registerCommands(context: vscode.ExtensionContext): void {
    // Init command
    context.subscriptions.push(
        vscode.commands.registerCommand('chainlink.init', async () => {
            await executeChainlinkCommand(['init'], 'Initializing chainlink project...');
        })
    );

    // Session commands
    context.subscriptions.push(
        vscode.commands.registerCommand('chainlink.sessionStart', async () => {
            await executeChainlinkCommand(['session', 'start'], 'Starting session...');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('chainlink.sessionEnd', async () => {
            const notes = await vscode.window.showInputBox({
                prompt: 'Enter handoff notes (optional)',
                placeHolder: 'What should the next session know?',
            });
            const args = ['session', 'end'];
            if (notes) {
                args.push('--notes', notes);
            }
            await executeChainlinkCommand(args, 'Ending session...');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('chainlink.sessionStatus', async () => {
            await executeChainlinkCommand(['session', 'status'], 'Getting session status...');
        })
    );

    // Daemon commands
    context.subscriptions.push(
        vscode.commands.registerCommand('chainlink.daemonStart', async () => {
            if (!daemonManager) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            try {
                await daemonManager.start();
                updateStatusBar(true);
                vscode.window.showInformationMessage('Chainlink daemon started');
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                vscode.window.showErrorMessage(`Failed to start daemon: ${message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('chainlink.daemonStop', async () => {
            if (!daemonManager) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            daemonManager.stop();
            updateStatusBar(false);
            vscode.window.showInformationMessage('Chainlink daemon stopped');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('chainlink.daemonStatus', async () => {
            if (!daemonManager) {
                vscode.window.showInformationMessage('Chainlink: No workspace open');
                return;
            }
            const running = daemonManager.isRunning();
            const pid = daemonManager.getPid();
            if (running && pid) {
                vscode.window.showInformationMessage(`Chainlink daemon running (PID: ${pid})`);
            } else {
                vscode.window.showInformationMessage('Chainlink daemon not running');
            }
        })
    );

    // Issue commands
    context.subscriptions.push(
        vscode.commands.registerCommand('chainlink.listIssues', async () => {
            await executeChainlinkCommand(['list'], 'Listing issues...');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('chainlink.createIssue', async () => {
            const title = await vscode.window.showInputBox({
                prompt: 'Issue title',
                placeHolder: 'Enter issue title',
            });
            if (!title) {
                return;
            }

            const priority = await vscode.window.showQuickPick(
                ['low', 'medium', 'high', 'critical'],
                { placeHolder: 'Select priority' }
            );

            const args = ['create', title];
            if (priority) {
                args.push('-p', priority);
            }

            await executeChainlinkCommand(args, 'Creating issue...');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('chainlink.showIssue', async () => {
            const id = await vscode.window.showInputBox({
                prompt: 'Issue ID',
                placeHolder: 'Enter issue number',
            });
            if (!id) {
                return;
            }
            await executeChainlinkCommand(['show', id], `Showing issue #${id}...`);
        })
    );
}

async function executeChainlinkCommand(args: string[], statusMessage: string): Promise<void> {
    if (!daemonManager) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: statusMessage,
                cancellable: false,
            },
            async () => {
                const output = await daemonManager!.executeCommand(args);
                if (output) {
                    outputChannel.appendLine(`$ chainlink ${args.join(' ')}`);
                    outputChannel.appendLine(output);
                    outputChannel.show(true);

                    // Show brief output in notification for short responses
                    const lines = output.split('\n');
                    if (lines.length <= 3) {
                        vscode.window.showInformationMessage(output);
                    }
                }
            }
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        outputChannel.appendLine(`Error: ${message}`);
        vscode.window.showErrorMessage(`Chainlink: ${message}`);
    }
}

function getWorkspaceFolder(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        return undefined;
    }
    // Use first workspace folder
    return folders[0].uri.fsPath;
}

function updateStatusBar(running: boolean): void {
    if (running) {
        statusBarItem.text = '$(pulse) Chainlink';
        statusBarItem.tooltip = 'Chainlink daemon running (click for status)';
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = '$(circle-slash) Chainlink';
        statusBarItem.tooltip = 'Chainlink daemon not running (click for status)';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    statusBarItem.show();
}

function handleConfigChange(): void {
    const config = vscode.workspace.getConfiguration('chainlink');
    const newOverridePath = config.get<string>('binaryPath');

    // If binary path changed, we need to restart the daemon
    if (daemonManager?.isRunning()) {
        outputChannel.appendLine('Configuration changed, restarting daemon...');
        daemonManager.stop();

        const workspaceFolder = getWorkspaceFolder();
        if (workspaceFolder) {
            daemonManager = new DaemonManager({
                extensionPath: vscode.extensions.getExtension('chainlink.chainlink-issue-tracker')?.extensionPath || '',
                workspaceFolder,
                outputChannel,
                overrideBinaryPath: newOverridePath,
            });

            daemonManager.start().then(() => {
                updateStatusBar(true);
            }).catch((err) => {
                const message = err instanceof Error ? err.message : String(err);
                outputChannel.appendLine(`Failed to restart daemon: ${message}`);
                updateStatusBar(false);
            });
        }
    }
}

/**
 * Adds the chainlink binary directory to PATH for all VS Code terminals and tasks.
 * Uses VS Code's EnvironmentVariableCollection API which persists across sessions.
 * This allows `chainlink` commands to work in terminals and from AI agents.
 */
function addToPath(context: vscode.ExtensionContext, binDir: string): void {
    const envCollection = context.environmentVariableCollection;

    // Clear any stale entries first
    envCollection.delete('PATH');

    // Prepend our bin directory to PATH
    // This works cross-platform: Windows uses `;` separator, Unix uses `:`
    const separator = process.platform === 'win32' ? ';' : ':';
    envCollection.prepend('PATH', binDir + separator);

    // Make the modification persistent across VS Code restarts
    envCollection.persistent = true;

    // Also set for Windows Path (case variation)
    if (process.platform === 'win32') {
        envCollection.prepend('Path', binDir + separator);
    }
}
