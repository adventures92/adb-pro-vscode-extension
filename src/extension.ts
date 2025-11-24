import * as vscode from 'vscode';
import * as path from 'path';
import { AdbClient } from './adbClient';
import { AdbWebviewProvider } from './adbWebviewProvider';
import { DeviceTreeItem, DeviceTreeProvider } from './deviceTreeProvider';
import { TargetAppManager } from './appManager';

/**
 * Activates the extension.
 * Registers the Webview provider and all commands.
 * @param context The extension context.
 */
export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('ADB Pro');
    const adbClient = new AdbClient(outputChannel);
    const targetAppManager = new TargetAppManager(context);
    context.subscriptions.push(targetAppManager);

    // Webview Provider
    const adbWebviewProvider = new AdbWebviewProvider(context.extensionUri, adbClient);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(AdbWebviewProvider.viewType, adbWebviewProvider)
    );

    // Tree View Provider
    const deviceTreeProvider = new DeviceTreeProvider(adbClient, targetAppManager);
    vscode.window.registerTreeDataProvider('adb-device-list', deviceTreeProvider);

    // Select Target App Command
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.selectTargetApp', async () => {
        // Try to get a device ID for listing installed apps
        let deviceId = await pickDevice(adbClient);

        await targetAppManager.pickApp(adbClient, deviceId);
        deviceTreeProvider.refresh();
    }));

    // Refresh Command
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.refresh', () => {
        adbWebviewProvider.refresh();
        deviceTreeProvider.refresh();
    }));

    // Connect
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.connect', async () => {
        const ip = await vscode.window.showInputBox({ placeHolder: 'Enter Device IP (e.g., 192.168.1.5)' });
        if (ip) {
            try {
                const result = await adbClient.connectToDevice(ip);
                vscode.window.showInformationMessage(`Connect Result: ${result}`);
                adbWebviewProvider.refresh();
            } catch (e: any) {
                vscode.window.showErrorMessage(e.message);
            }
        }
    }));

    // Disconnect
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.disconnect', async (arg?: string | DeviceTreeItem) => {
        let deviceId: string | undefined;
        if (arg instanceof DeviceTreeItem) {
            deviceId = arg.device.id;
        } else {
            deviceId = arg;
        }
        if (!deviceId) {
            deviceId = await pickDevice(adbClient);
        }
        if (deviceId) {
            try {
                const result = await adbClient.disconnectDevice(deviceId);
                vscode.window.showInformationMessage(`Disconnect Result: ${result}`);
                adbWebviewProvider.refresh();
            } catch (e: any) {
                vscode.window.showErrorMessage(e.message);
            }
        }
    }));

    // Install APK
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.installApk', async (arg?: string | DeviceTreeItem) => {
        let deviceId: string | undefined;
        if (arg instanceof DeviceTreeItem) {
            deviceId = arg.device.id;
        } else {
            deviceId = arg;
        }
        if (!deviceId) {
            deviceId = await pickDevice(adbClient);
        }

        if (deviceId) {
            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: { 'APK Files': ['apk'] }
            });

            if (uris && uris.length > 0) {
                const apkPath = uris[0].fsPath;
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Installing APK on ${deviceId}...`,
                    cancellable: false
                }, async () => {
                    try {
                        const result = await adbClient.installApk(deviceId!, apkPath);
                        vscode.window.showInformationMessage(`Install Result: ${result}`);
                    } catch (e: any) {
                        vscode.window.showErrorMessage(e.message);
                    }
                });
            }
        }
    }));

    // Helper to resolve package name (using TargetAppManager)
    const resolvePackageName = async (deviceId: string): Promise<string | undefined> => {
        return targetAppManager.pickApp(adbClient, deviceId);
    };

    // Uninstall App
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.uninstallApp', async (arg?: string | DeviceTreeItem) => {
        let deviceId: string | undefined;
        if (arg instanceof DeviceTreeItem) {
            deviceId = arg.device.id;
        } else {
            deviceId = arg;
        }
        if (!deviceId) {
            deviceId = await pickDevice(adbClient);
        }
        if (deviceId) {
            const packageName = await resolvePackageName(deviceId);
            if (packageName) {
                try {
                    const result = await adbClient.uninstallApp(deviceId, packageName);
                    vscode.window.showInformationMessage(`Uninstall Result: ${result}`);
                } catch (e: any) {
                    vscode.window.showErrorMessage(e.message);
                }
            }
        }
    }));

    // Clear App Data
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.clearAppData', async (arg?: string | DeviceTreeItem) => {
        let deviceId: string | undefined;
        if (arg instanceof DeviceTreeItem) {
            deviceId = arg.device.id;
        } else {
            deviceId = arg;
        }
        if (!deviceId) {
            deviceId = await pickDevice(adbClient);
        }
        if (deviceId) {
            const packageName = await resolvePackageName(deviceId);
            if (packageName) {
                try {
                    const result = await adbClient.clearAppData(deviceId, packageName);
                    vscode.window.showInformationMessage(`Clear Data Result: ${result}`);
                } catch (e: any) {
                    vscode.window.showErrorMessage(e.message);
                }
            }
        }
    }));

    // Kill App
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.killApp', async (arg?: string | DeviceTreeItem) => {
        let deviceId: string | undefined;
        if (arg instanceof DeviceTreeItem) {
            deviceId = arg.device.id;
        } else {
            deviceId = arg;
        }
        if (!deviceId) {
            deviceId = await pickDevice(adbClient);
        }
        if (deviceId) {
            const packageName = await resolvePackageName(deviceId);
            if (packageName) {
                try {
                    const result = await adbClient.killApp(deviceId, packageName);
                    vscode.window.showInformationMessage(`Kill App Result: ${result}`);
                } catch (e: any) {
                    vscode.window.showErrorMessage(e.message);
                }
            }
        }
    }));

    // Restart Server
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.restartServer', async () => {
        try {
            const result = await adbClient.restartServer();
            vscode.window.showInformationMessage(`Restart Server Result: ${result}`);
            adbWebviewProvider.refresh();
        } catch (e: any) {
            vscode.window.showErrorMessage(e.message);
        }
    }));

    // Execute Shell Command
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.shell', async (arg?: string | DeviceTreeItem) => {
        let deviceId: string | undefined;
        if (arg instanceof DeviceTreeItem) {
            deviceId = arg.device.id;
        } else {
            deviceId = arg;
        }
        if (!deviceId) {
            deviceId = await pickDevice(adbClient);
        }
        if (deviceId) {
            const command = await vscode.window.showInputBox({ placeHolder: 'Enter Shell Command (e.g., ls -l /sdcard)' });
            if (command) {
                try {
                    const result = await adbClient.executeShellCommand(deviceId, command);
                    vscode.window.showInformationMessage(`Shell Result: ${result}`);
                } catch (e: any) {
                    vscode.window.showErrorMessage(e.message);
                }
            }
        }
    }));

    // Toggles
    const toggleHandler = async (arg: string | DeviceTreeItem | undefined, enableArg: boolean | undefined, name: string, action: (id: string, enable: boolean) => Promise<string>) => {
        let deviceId: string | undefined;
        if (arg instanceof DeviceTreeItem) {
            deviceId = arg.device.id;
        } else if (typeof arg === 'string') {
            deviceId = arg;
        }

        if (!deviceId) {
            deviceId = await pickDevice(adbClient);
        }

        if (deviceId) {
            let enable = enableArg;
            if (enable === undefined) {
                const selected = await vscode.window.showQuickPick(['Enable', 'Disable'], { placeHolder: `${name}: Enable or Disable?` });
                if (selected) {
                    enable = selected === 'Enable';
                }
            }

            if (enable !== undefined) {
                try {
                    const result = await action(deviceId, enable);
                    vscode.window.showInformationMessage(`${name} ${enable ? 'Enabled' : 'Disabled'}: ${result}`);
                    adbWebviewProvider.refresh();
                } catch (e: any) {
                    vscode.window.showErrorMessage(e.message);
                }
            }
        }
    };

    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.toggleWifi', (arg, enable) => toggleHandler(arg, enable, 'Wi-Fi', (id, en) => adbClient.toggleWifi(id, en))));
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.toggleMobileData', (arg, enable) => toggleHandler(arg, enable, 'Mobile Data', (id, en) => adbClient.toggleMobileData(id, en))));
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.toggleAirplaneMode', (arg, enable) => toggleHandler(arg, enable, 'Airplane Mode', (id, en) => adbClient.toggleAirplaneMode(id, en))));

    // Permissions
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.setAppPermission', async (arg?: string | DeviceTreeItem) => {
        let deviceId: string | undefined;
        if (arg instanceof DeviceTreeItem) {
            deviceId = arg.device.id;
        } else {
            deviceId = arg;
        }
        if (!deviceId) {
            deviceId = await pickDevice(adbClient);
        }
        if (deviceId) {
            const packageName = await resolvePackageName(deviceId);
            if (packageName) {
                try {
                    // Loop to allow multiple permission changes
                    while (true) {
                        const permissions = await adbClient.getAppPermissions(deviceId, packageName);

                        const items: vscode.QuickPickItem[] = permissions.map(p => ({
                            label: `${p.granted ? '$(check)' : '$(x)'} ${p.name}`,
                            description: p.granted ? 'Granted' : 'Denied',
                            detail: 'Click to toggle'
                        }));

                        items.push({ label: '$(close) Done', description: 'Exit permission manager' });

                        const selected = await vscode.window.showQuickPick(items, {
                            placeHolder: `Manage Permissions for ${packageName}`
                        });

                        if (!selected || selected.label === '$(close) Done') {
                            break;
                        }

                        // Extract permission name
                        // Label is "$(icon) permission.name"
                        const parts = selected.label.split(' ');
                        const permName = parts.length > 1 ? parts[1] : selected.label;
                        const isGranted = selected.description === 'Granted';

                        // Toggle
                        const result = await adbClient.setAppPermission(deviceId, packageName, permName, !isGranted);
                        vscode.window.showInformationMessage(`Permission ${!isGranted ? 'Granted' : 'Revoked'}: ${result}`);
                    }
                } catch (e: any) {
                    vscode.window.showErrorMessage(e.message);
                }
            }
        }
    }));

    // Screenshot
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.screenshot', async (arg?: string | DeviceTreeItem) => {
        let deviceId: string | undefined;
        if (arg instanceof DeviceTreeItem) {
            deviceId = arg.device.id;
        } else {
            deviceId = arg;
        }
        if (!deviceId) {
            deviceId = await pickDevice(adbClient);
        }
        if (deviceId) {
            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Save Screenshot Here'
            });

            if (uris && uris.length > 0) {
                const folderPath = uris[0].fsPath;
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const localPath = `${folderPath}/screenshot-${timestamp}.png`;

                try {
                    await adbClient.takeScreenshot(deviceId, localPath);
                    vscode.window.showInformationMessage(`Screenshot saved to: ${localPath}`);
                } catch (e: any) {
                    vscode.window.showErrorMessage(e.message);
                }
            }
        }
    }));

    // Logcat
    context.subscriptions.push(vscode.commands.registerCommand('adb-pro.logcat', async (arg?: string | DeviceTreeItem) => {
        let deviceId: string | undefined;
        if (arg instanceof DeviceTreeItem) {
            deviceId = arg.device.id;
        } else {
            deviceId = arg;
        }
        if (!deviceId) {
            deviceId = await pickDevice(adbClient);
        }
        if (deviceId) {
            try {
                // Use TargetAppManager for package selection
                let packageName = targetAppManager.getSelectedApp();
                if (!packageName) {
                    // If no app selected, ask user: "Select App" or "Show All"
                    const choice = await vscode.window.showQuickPick(
                        ['Select App to Filter', 'Show All Logs'],
                        { placeHolder: 'Filter Logcat?' }
                    );
                    if (choice === 'Select App to Filter') {
                        packageName = await targetAppManager.pickApp();
                    }
                } else {
                    // Confirm or Change
                    const selection = await vscode.window.showQuickPick(
                        [
                            { label: 'Yes', description: `Filter by ${packageName}` },
                            { label: 'Change App', description: 'Filter by different app' },
                            { label: 'Show All', description: 'No filtering' }
                        ],
                        { placeHolder: `Logcat: Filter by '${packageName}'?` }
                    );
                    if (selection?.label === 'Change App') {
                        packageName = await targetAppManager.pickApp();
                    } else if (selection?.label === 'Show All') {
                        packageName = undefined;
                    } else if (!selection) {
                        return; // Cancelled
                    }
                }

                // Optional: Filter by Level
                const levels = ['V', 'D', 'I', 'W', 'E', 'F']; // Verbose, Debug, Info, Warn, Error, Fatal
                const level = await vscode.window.showQuickPick(levels, { placeHolder: 'Select Log Level (Optional)' });

                let pid: string | undefined;
                if (packageName) {
                    pid = await adbClient.getPidForPackage(deviceId, packageName);
                    if (!pid) {
                        vscode.window.showWarningMessage(`Could not find PID for package: ${packageName}. Showing all logs.`);
                    }
                }

                await adbClient.getLogcat(deviceId, pid, level);
            } catch (e: any) {
                vscode.window.showErrorMessage(e.message);
            }
        }
    }));
}

/**
 * Helper function to pick a connected device.
 * If only one device is connected, it returns that device ID automatically.
 * If multiple devices are connected, it shows a QuickPick.
 * @param client The AdbClient instance.
 * @returns The selected device ID or undefined.
 */
async function pickDevice(client: AdbClient): Promise<string | undefined> {
    const devices = await client.getConnectedDevices();
    if (devices.length === 0) {
        vscode.window.showErrorMessage('No devices connected');
        return undefined;
    }
    if (devices.length === 1) {
        return devices[0].id;
    }
    const selected = await vscode.window.showQuickPick(devices.map(d => d.id), { placeHolder: 'Select Device' });
    return selected;
}




export function deactivate() { }
