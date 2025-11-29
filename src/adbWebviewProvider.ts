import * as vscode from 'vscode';
import { AdbClient, ConnectedDevice } from './adbClient';

/**
 * Provides the Webview-based sidebar for ADB operations.
 * Handles UI rendering and message passing between the Webview and the Extension Host.
 */
export class AdbWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'adbWebview';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly adbClient: AdbClient
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'connect':
                    try {
                        const result = await this.adbClient.connectToDevice(data.ip);
                        vscode.window.showInformationMessage(result);
                        this.refresh();
                    } catch (e: any) {
                        vscode.window.showErrorMessage(e.message);
                    }
                    break;
                case 'refresh':
                    this.refresh();
                    break;
                case 'disconnect':
                    try {
                        await this.adbClient.disconnectDevice(data.deviceId);
                        vscode.window.showInformationMessage(`Disconnected ${data.deviceId}`);
                        this.refresh();
                    } catch (e: any) {
                        vscode.window.showErrorMessage(e.message);
                    }
                    break;
                case 'installApk':
                    vscode.commands.executeCommand('adb-pro.installApk', data.deviceId);
                    break;
                case 'uninstallApp':
                    vscode.commands.executeCommand('adb-pro.uninstallApp', data.deviceId);
                    break;
                case 'clearAppData':
                    vscode.commands.executeCommand('adb-pro.clearAppData', data.deviceId);
                    break;
                case 'killApp':
                    vscode.commands.executeCommand('adb-pro.killApp', data.deviceId);
                    break;
                case 'logcat':
                    vscode.commands.executeCommand('adb-pro.logcat', data.deviceId);
                    break;
                case 'screenshot':
                    vscode.commands.executeCommand('adb-pro.screenshot', data.deviceId);
                    break;
                case 'toggleWifi':
                    vscode.commands.executeCommand('adb-pro.toggleWifi', data.deviceId, data.enabled);
                    break;
                case 'toggleMobileData':
                    vscode.commands.executeCommand('adb-pro.toggleMobileData', data.deviceId, data.enabled);
                    break;
                case 'toggleAirplaneMode':
                    vscode.commands.executeCommand('adb-pro.toggleAirplaneMode', data.deviceId, data.enabled);
                    break;
                case 'setPermission':
                    vscode.commands.executeCommand('adb-pro.setAppPermission', data.deviceId);
                    break;
            }
        });

        // Initial refresh
        this.refresh();
    }

    /**
     * Refreshes the device list in the Webview.
     * Fetches connected devices from AdbClient and sends an 'updateDevices' message to the Webview.
     */
    public async refresh() {
        if (this._view) {
            try {
                const devices = await this.adbClient.getConnectedDevices();
                this._view.webview.postMessage({ type: 'updateDevices', devices });
            } catch (e) {
                // console.error('Failed to get devices', e);
            }
        }
    }

    /**
     * Generates the HTML content for the Webview.
     * Includes the CSS styles and JavaScript logic for the UI.
     * @param webview The Webview instance.
     * @returns The complete HTML string.
     */
    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ADB Control Panel</title>
            <style>
                :root {
                    --container-padding: 10px;
                    --input-padding-vertical: 6px;
                    --input-padding-horizontal: 4px;
                    --input-margin-vertical: 4px;
                    --input-margin-horizontal: 0;
                }

                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-sideBar-background);
                    padding: var(--container-padding);
                    margin: 0;
                }

                h3 {
                    margin: 16px 0 8px 0;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    color: var(--vscode-sideBarSectionHeader-foreground);
                    letter-spacing: 0.5px;
                }
                
                h3:first-child {
                    margin-top: 0;
                }

                /* Input Group */
                .input-group {
                    display: flex;
                    gap: 6px;
                    margin-bottom: 16px;
                }

                input[type="text"] {
                    flex: 1;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 4px 8px;
                    height: 28px;
                    box-sizing: border-box;
                    outline: none;
                    border-radius: 2px;
                }

                input[type="text"]:focus {
                    border-color: var(--vscode-focusBorder);
                }

                input[type="text"]::placeholder {
                    color: var(--vscode-input-placeholderForeground);
                }

                /* VS Code Button Styles */
                button {
                    border: none;
                    padding: 4px 12px;
                    height: 28px;
                    cursor: pointer;
                    font-family: var(--vscode-font-family);
                    font-size: 13px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    outline: none;
                    border-radius: 4px; /* Matches screenshot */
                    box-sizing: border-box;
                    width: 100%;
                    font-weight: 500;
                }

                /* Primary Button */
                button.primary {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }

                button.primary:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }

                /* Secondary Button */
                button.secondary {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-widget-border); /* Subtle border like screenshot */
                }

                button.secondary:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                
                /* Small Button variant */
                button.small {
                    height: 24px;
                    font-size: 12px;
                    padding: 2px 8px;
                }

                /* Icon Button (Toolbar style) */
                button.icon-btn {
                    background: transparent;
                    color: var(--vscode-icon-foreground);
                    padding: 4px;
                    width: 22px;
                    height: 22px;
                    border-radius: 3px;
                    width: auto;
                }
                
                button.icon-btn:hover {
                    background: var(--vscode-toolbar-hoverBackground);
                }

                /* Device List Item */
                .device-item {
                    background: var(--vscode-list-inactiveSelectionBackground);
                    border: 1px solid transparent;
                    padding: 10px;
                    margin-bottom: 10px;
                    border-radius: 4px;
                }

                .device-item:hover {
                    border-color: var(--vscode-focusBorder);
                }

                .device-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .device-name {
                    font-weight: 600;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .connection-badge {
                    font-size: 9px;
                    padding: 2px 6px;
                    border-radius: 2px;
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    text-transform: uppercase;
                }

                /* Action Groups */
                .action-section {
                    margin-top: 16px;
                }
                
                .section-title {
                    font-size: 10px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    font-weight: 600;
                }

                .actions-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                }

                .full-width {
                    grid-column: span 2;
                }
                
                /* Connectivity Rows */
                .connectivity-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 6px;
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    padding: 6px 8px;
                    border-radius: 4px;
                }
                
                .connectivity-label {
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .connectivity-actions {
                    display: flex;
                    gap: 4px;
                }
                
                .connectivity-actions button {
                    width: auto;
                    min-width: 40px;
                }

                /* SVG Icons */
                .icon {
                    width: 16px;
                    height: 16px;
                    fill: currentColor;
                }

            </style>
        </head>
        <body>
            <div class="container">
                <h3>Connect Device</h3>
                <div class="input-group">
                    <input type="text" id="ipInput" placeholder="IP Address (e.g. 192.168.1.5:5555)">
                    <button id="connectBtn" class="primary" style="width: auto;">Connect</button>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h3>Connected Devices</h3>
                    <button id="refreshBtn" class="icon-btn" title="Refresh">
                        <svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M13.65 2.35A7.958 7.958 0 0 0 8 0a8 8 0 1 0 0 16c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 8 14 6 6 0 1 1 8 2c1.66 0 3.14.69 4.22 1.78L9 7h7V0l-2.35 2.35z"/></svg>
                    </button>
                </div>
                <div id="deviceList"></div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const deviceList = document.getElementById('deviceList');
                const ipInput = document.getElementById('ipInput');

                document.getElementById('connectBtn').addEventListener('click', () => {
                    const ip = ipInput.value;
                    if (ip) {
                        vscode.postMessage({ type: 'connect', ip });
                        ipInput.value = '';
                    }
                });

                document.getElementById('refreshBtn').addEventListener('click', () => {
                    vscode.postMessage({ type: 'refresh' });
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'updateDevices':
                            renderDevices(message.devices);
                            break;
                    }
                });

                function renderDevices(devices) {
                    deviceList.innerHTML = '';
                    if (devices.length === 0) {
                        deviceList.innerHTML = '<div style="color: var(--vscode-descriptionForeground); font-style: italic; padding: 10px; text-align: center;">No devices connected</div>';
                        return;
                    }

                    devices.forEach(device => {
                        const item = document.createElement('div');
                        item.className = 'device-item';
                        
                        const displayName = device.model ? device.model.replace(/_/g, ' ') : device.id;
                        const icon = device.connectionType === 'wireless' 
                            ? '<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.66 10.14a.5.5 0 0 1-.72.08A4.96 4.96 0 0 0 8 9a4.96 4.96 0 0 0-2.94 1.22.5.5 0 0 1-.62-.78A5.95 5.95 0 0 1 8 8c1.3 0 2.5.41 3.5 1.12a.5.5 0 0 1 .16.7v.32zM8 6a7.94 7.94 0 0 1 4.9 1.69.5.5 0 0 1-.6.8A6.95 6.95 0 0 0 8 7a6.95 6.95 0 0 0-4.3 1.49.5.5 0 0 1-.6-.8A7.94 7.94 0 0 1 8 6zm0-3a10.94 10.94 0 0 1 6.8 2.33.5.5 0 1 1-.58.82A9.95 9.95 0 0 0 8 4a9.95 9.95 0 0 0-6.22 2.15.5.5 0 1 1-.58-.82A10.94 10.94 0 0 1 8 3z"/></svg>'
                            : '<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M12 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM8 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>';

                        item.innerHTML = \`
                            <div class="device-header">
                                <div class="device-name">
                                    \${icon}
                                    <span>\${displayName}</span>
                                </div>
                                <span class="connection-badge">\${device.connectionType}</span>
                            </div>
                            <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 12px; margin-left: 22px;">
                                ID: \${device.id}
                            </div>

                            <div class="action-section">
                                <div class="section-title">Connectivity</div>
                                
                                <div class="connectivity-row">
                                    <span class="connectivity-label">
                                        <svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 3a5 5 0 0 1 3.54 1.46l.7-.7A6 6 0 0 0 8 2a6 6 0 0 0-4.24 1.76l.7.7A5 5 0 0 1 8 3zm0 3a2 2 0 0 1 1.41.59l.7-.7A3 3 0 0 0 8 5a3 3 0 0 0-2.12.88l.7.7A2 2 0 0 1 8 6zm0 3a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1zM8 0a8 8 0 0 1 5.66 2.34l-.7.7A7 7 0 0 0 8 1a7 7 0 0 0-4.95 2.05l-.7-.7A8 8 0 0 1 8 0z"/></svg>
                                        Wi-Fi
                                    </span>
                                    <div class="connectivity-actions">
                                        <button class="secondary small" onclick="toggleFeature('toggleWifi', '\${device.id}', true)">On</button>
                                        <button class="secondary small" onclick="toggleFeature('toggleWifi', '\${device.id}', false)">Off</button>
                                    </div>
                                </div>

                                <div class="connectivity-row">
                                    <span class="connectivity-label">
                                        <svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M5 9h2v4.5l2-2 1.5 1.5-4.5 4.5-4.5-4.5 1.5-1.5 2 2V9zm6-2V2.5l-2 2-1.5-1.5 4.5-4.5 4.5 4.5-1.5 1.5-2-2V7H11z"/></svg>
                                        Data
                                    </span>
                                    <div class="connectivity-actions">
                                        <button class="secondary small" onclick="toggleFeature('toggleMobileData', '\${device.id}', true)">On</button>
                                        <button class="secondary small" onclick="toggleFeature('toggleMobileData', '\${device.id}', false)">Off</button>
                                    </div>
                                </div>

                                <div class="connectivity-row">
                                    <span class="connectivity-label">
                                        <svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 1L9.5 2v5l-4-2V3L4.5 2 3 3.5 4 5H2.5L1 6.5V9l1.5 1.5H4l-1 1.5L4.5 13l1-1v2l1 1 1-1V9.5l4-2V12l1 1 1-1V1z"/></svg>
                                        Airplane
                                    </span>
                                    <div class="connectivity-actions">
                                        <button class="secondary small" onclick="toggleFeature('toggleAirplaneMode', '\${device.id}', true)">On</button>
                                        <button class="secondary small" onclick="toggleFeature('toggleAirplaneMode', '\${device.id}', false)">Off</button>
                                    </div>
                                </div>
                            </div>

                            <div class="action-section">
                                <div class="section-title">App Management</div>
                                <div class="actions-grid">
                                    <button class="secondary" onclick="sendCommand('installApk', '\${device.id}')">Install APK</button>
                                    <button class="secondary" onclick="sendCommand('uninstallApp', '\${device.id}')">Uninstall</button>
                                    <button class="secondary" onclick="sendCommand('clearAppData', '\${device.id}')">Clear Data</button>
                                    <button class="secondary" onclick="sendCommand('killApp', '\${device.id}')">Kill App</button>
                                </div>
                            </div>

                            <div class="action-section">
                                <div class="section-title">Tools</div>
                                <div class="actions-grid">
                                    <button class="secondary" onclick="sendCommand('logcat', '\${device.id}')">Logcat</button>
                                    <button class="secondary" onclick="sendCommand('screenshot', '\${device.id}')">Screenshot</button>
                                    <button class="secondary full-width" onclick="sendCommand('setPermission', '\${device.id}')">Manage Permissions</button>
                                </div>
                            </div>

                            <div style="margin-top: 12px;">
                                <button class="secondary" style="color: var(--vscode-errorForeground); width: 100%;" onclick="sendCommand('disconnect', '\${device.id}')">Disconnect</button>
                            </div>
                        \`;
                        deviceList.appendChild(item);
                    });
                }

                window.sendCommand = (type, deviceId) => {
                    vscode.postMessage({ type, deviceId });
                };

                window.toggleFeature = (type, deviceId, enabled) => {
                    vscode.postMessage({ type, deviceId, enabled });
                };
            </script>
        </body>
        </html>`;
    }
}
