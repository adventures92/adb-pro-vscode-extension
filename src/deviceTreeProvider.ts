import * as vscode from 'vscode';
import { AdbClient, ConnectedDevice } from './adbClient';
import { TargetAppManager } from './appManager';
import * as path from 'path';

export class DeviceTreeProvider implements vscode.TreeDataProvider<DeviceTreeItem | ActionTreeItem | TargetAppTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DeviceTreeItem | ActionTreeItem | TargetAppTreeItem | undefined | null | void> = new vscode.EventEmitter<DeviceTreeItem | ActionTreeItem | TargetAppTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DeviceTreeItem | ActionTreeItem | TargetAppTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private adbClient: AdbClient, private targetAppManager: TargetAppManager) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DeviceTreeItem | ActionTreeItem | TargetAppTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DeviceTreeItem | ActionTreeItem | TargetAppTreeItem): Promise<(DeviceTreeItem | ActionTreeItem | TargetAppTreeItem)[]> {
        if (!element) {
            const items: (DeviceTreeItem | TargetAppTreeItem)[] = [];

            // Add Target App Item
            const selectedApp = this.targetAppManager.getSelectedApp();
            items.push(new TargetAppTreeItem(selectedApp));

            try {
                const devices = await this.adbClient.getConnectedDevices();
                devices.forEach(device => items.push(new DeviceTreeItem(device)));
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to get devices: ${error.message}`);
            }
            return items;
        } else if (element instanceof DeviceTreeItem) {
            return [
                new ActionTreeItem('Install APK', element.device.id, 'adb-pro.installApk'),
                new ActionTreeItem('Uninstall App', element.device.id, 'adb-pro.uninstallApp'),
                new ActionTreeItem('Clear App Data', element.device.id, 'adb-pro.clearAppData'),
                new ActionTreeItem('Kill App', element.device.id, 'adb-pro.killApp'),
                new ActionTreeItem('Logcat', element.device.id, 'adb-pro.logcat'),
                new ActionTreeItem('Shell', element.device.id, 'adb-pro.shell'),
                new ActionTreeItem('Toggle Wi-Fi', element.device.id, 'adb-pro.toggleWifi'),
                new ActionTreeItem('Toggle Mobile Data', element.device.id, 'adb-pro.toggleMobileData'),
                new ActionTreeItem('Toggle Airplane Mode', element.device.id, 'adb-pro.toggleAirplaneMode'),
                new ActionTreeItem('Manage Permissions', element.device.id, 'adb-pro.setAppPermission'),
                new ActionTreeItem('Take Screenshot', element.device.id, 'adb-pro.screenshot')
            ];
        }
        return [];
    }
}

export class DeviceTreeItem extends vscode.TreeItem {
    constructor(public readonly device: ConnectedDevice) {
        super(device.id, vscode.TreeItemCollapsibleState.Collapsed);
        this.tooltip = `${device.id} (${device.type})`;
        this.description = device.type;
        this.contextValue = 'device';
        this.iconPath = new vscode.ThemeIcon('device-mobile');
    }
}

export class ActionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly deviceId: string,
        public readonly commandId: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'action';
        this.command = {
            command: commandId,
            title: label,
            arguments: [deviceId]
        };
    }
}

export class TargetAppTreeItem extends vscode.TreeItem {
    constructor(selectedApp: string | undefined) {
        super(selectedApp ? `Target App: ${selectedApp}` : 'Select Target App', vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'targetApp';
        this.iconPath = new vscode.ThemeIcon('android');
        this.command = {
            command: 'adb-pro.selectTargetApp',
            title: 'Select Target App'
        };
        this.tooltip = selectedApp ? `Target App: ${selectedApp}` : 'Click to select a target app';
    }
}
