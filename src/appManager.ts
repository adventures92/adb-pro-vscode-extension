import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service to discover Android package names from the workspace.
 */
export class AppDiscoveryService {
    /**
     * Scans the workspace for potential Android package names.
     * Looks in build.gradle, build.gradle.kts, and AndroidManifest.xml.
     */
    public async findPackageNames(): Promise<string[]> {
        const packageNames = new Set<string>();
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            return [];
        }

        for (const folder of workspaceFolders) {
            await this.scanFolder(folder.uri.fsPath, packageNames);
        }

        return Array.from(packageNames).sort();
    }

    private async scanFolder(folderPath: string, packageNames: Set<string>) {
        // Limit recursion depth and ignore common folders
        const ignoreDirs = new Set(['node_modules', '.git', 'build', '.gradle', '.idea', '.vscode']);

        try {
            const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(folderPath, entry.name);

                if (entry.isDirectory()) {
                    if (!ignoreDirs.has(entry.name)) {
                        // Simple depth check or just shallow scan could be better for performance,
                        // but for now let's do a limited recursive scan.
                        // To be safe, let's just look in top-level and 'app' module.
                        // Actually, let's just check specific files if we find them.
                        await this.scanFolder(fullPath, packageNames);
                    }
                } else if (entry.isFile()) {
                    if (entry.name === 'build.gradle' || entry.name === 'build.gradle.kts') {
                        await this.extractFromGradle(fullPath, packageNames);
                    } else if (entry.name === 'AndroidManifest.xml') {
                        await this.extractFromManifest(fullPath, packageNames);
                    }
                }
            }
        } catch (e) {
            console.error(`Error scanning folder ${folderPath}:`, e);
        }
    }

    private async extractFromGradle(filePath: string, packageNames: Set<string>) {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            // Regex for applicationId "com.example.app" or applicationId = "com.example.app"
            const regex = /applicationId\s*=?\s*["']([^"']+)["']/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                packageNames.add(match[1]);
            }

            // Kotlin DSL might use: applicationId("com.example.app")
            const ktsRegex = /applicationId\s*\(\s*["']([^"']+)["']\s*\)/g;
            while ((match = ktsRegex.exec(content)) !== null) {
                packageNames.add(match[1]);
            }
        } catch (e) {
            // Ignore read errors
        }
    }

    private async extractFromManifest(filePath: string, packageNames: Set<string>) {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            // Regex for package="com.example.app"
            const regex = /package=["']([^"']+)["']/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                packageNames.add(match[1]);
            }
        } catch (e) {
            // Ignore read errors
        }
    }
}

/**
 * Manages the currently selected target app (package name).
 */
export class TargetAppManager {
    private statusBarItem: vscode.StatusBarItem;
    private discoveryService: AppDiscoveryService;
    private context: vscode.ExtensionContext;
    private static readonly STORAGE_KEY = 'adb-pro.targetApp';
    private static readonly HISTORY_KEY = 'adb-pro.appHistory';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.discoveryService = new AppDiscoveryService();
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'adb-pro.selectTargetApp';
        this.updateStatusBar();
        this.statusBarItem.show();
    }

    public getSelectedApp(): string | undefined {
        return this.context.workspaceState.get<string>(TargetAppManager.STORAGE_KEY);
    }

    public async setSelectedApp(packageName: string | undefined) {
        await this.context.workspaceState.update(TargetAppManager.STORAGE_KEY, packageName);
        if (packageName) {
            await this.addToHistory(packageName);
        }
        this.updateStatusBar();
    }

    private updateStatusBar() {
        const app = this.getSelectedApp();
        if (app) {
            this.statusBarItem.text = `$(android) ${app}`;
            this.statusBarItem.tooltip = 'Target App for ADB Commands (Click to change)';
        } else {
            this.statusBarItem.text = `$(android) Select App`;
            this.statusBarItem.tooltip = 'Click to select a Target App for ADB Commands';
        }
    }

    private async addToHistory(packageName: string) {
        let history = this.context.globalState.get<string[]>(TargetAppManager.HISTORY_KEY) || [];
        history = [packageName, ...history.filter(p => p !== packageName)].slice(0, 10); // Keep last 10
        await this.context.globalState.update(TargetAppManager.HISTORY_KEY, history);
    }

    public async pickApp(adbClient?: any, deviceId?: string): Promise<string | undefined> {
        const discovered = await this.discoveryService.findPackageNames();
        const history = this.context.globalState.get<string[]>(TargetAppManager.HISTORY_KEY) || [];
        const current = this.getSelectedApp();

        const items: vscode.QuickPickItem[] = [];

        if (current) {
            items.push({ label: 'Current Selection', kind: vscode.QuickPickItemKind.Separator });
            items.push({ label: `$(check) ${current}`, description: 'Currently Selected', picked: true });
        }

        if (history.length > 0) {
            items.push({ label: 'Recent Apps', kind: vscode.QuickPickItemKind.Separator });
            history.forEach(pkg => {
                if (pkg !== current) {
                    items.push({ label: `$(history) ${pkg}`, description: 'Recent' });
                }
            });
        }

        // Fetch installed apps if client and deviceId are provided
        // We prioritize installed apps over workspace discovery as they are more relevant to the device
        if (adbClient && deviceId) {
            try {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Fetching installed apps from ${deviceId}...`,
                    cancellable: false
                }, async () => {
                    const installed = await adbClient.getInstalledPackages(deviceId);
                    if (installed.length > 0) {
                        items.push({ label: 'Installed on Device', kind: vscode.QuickPickItemKind.Separator });
                        installed.forEach((pkg: string) => {
                            // Avoid duplicates
                            if (pkg !== current && !history.includes(pkg)) {
                                items.push({ label: `$(device-mobile) ${pkg}`, description: 'Installed' });
                            }
                        });
                    }
                });
            } catch (e) {
                console.error('Failed to fetch installed packages', e);
            }
        }

        if (discovered.length > 0) {
            items.push({ label: 'Discovered in Workspace', kind: vscode.QuickPickItemKind.Separator });
            discovered.forEach(pkg => {
                // Avoid duplicates from history or current (we don't check installed here easily without a set, but that's okay)
                if (pkg !== current && !history.includes(pkg)) {
                    items.push({ label: `$(file-code) ${pkg}`, description: 'Workspace' });
                }
            });
        }

        items.push({ label: 'Other', kind: vscode.QuickPickItemKind.Separator });
        items.push({ label: '$(add) Enter Manually...', alwaysShow: true });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select Target App (Package Name)',
            matchOnDescription: true
        });

        if (selected) {
            if (selected.label === '$(add) Enter Manually...') {
                const input = await vscode.window.showInputBox({
                    placeHolder: 'com.example.app',
                    prompt: 'Enter package name manually'
                });
                if (input) {
                    await this.setSelectedApp(input);
                    return input;
                }
            } else {
                // Extract package name from label (remove icon)
                // Label format is "$(icon) packageName"
                const parts = selected.label.split(' ');
                const packageName = parts.length > 1 ? parts[1] : selected.label;

                await this.setSelectedApp(packageName);
                return packageName;
            }
        }

        return undefined;
    }

    public dispose() {
        this.statusBarItem.dispose();
    }
}
