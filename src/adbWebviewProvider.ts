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
                console.error('Failed to get devices', e);
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
                    --container-paddding: 20px;
                    --input-padding-vertical: 6px;
                    --input-padding-horizontal: 4px;
                    --input-margin-vertical: 4px;
                    --input-margin-horizontal: 0;
                }

                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: var(--container-paddding);
                    margin: 0;
                }

                h3 {
                    margin: 0 0 10px 0;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: var(--vscode-sideBarSectionHeader-foreground);
                }

                .section {
                    margin-bottom: 24px;
                }

                .input-group {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 10px;
                }

                input[type="text"] {
                    flex: 1;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: var(--input-padding-vertical) var(--input-padding-horizontal);
                    outline: none;
                }

                input[type="text"]:focus {
                    border-color: var(--vscode-focusBorder);
                }

                button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    cursor: pointer;
                    font-family: var(--vscode-font-family);
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                button.icon-btn {
                    padding: 4px;
                    background: transparent;
                    color: var(--vscode-icon-foreground);
                }
                
                button.icon-btn:hover {
                    background: var(--vscode-toolbar-hoverBackground);
                }

                .device-card {
                    background: var(--vscode-sideBar-background);
                    border: 1px solid var(--vscode-widget-border);
                    padding: 12px;
                    margin-bottom: 12px;
                    border-radius: 0px;
                }

                .device-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    font-weight: 600;
                    font-size: 13px;
                }

                .status-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                    margin-left: 8px;
                }

                .status-online { background-color: var(--vscode-testing-iconPassed); }
                .status-offline { background-color: var(--vscode-testing-iconFailed); }

                .toggles-container {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--vscode-settings-dropdownBorder);
                }

                .toggle-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                }

                /* Switch Toggle Style */
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 32px;
                    height: 18px;
                    margin-bottom: 4px;
                }

                .switch input { 
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    transition: .4s;
                    border-radius: 18px;
                }

                .slider:before {
                    position: absolute;
                    content: "";
                    height: 12px;
                    width: 12px;
                    left: 2px;
                    bottom: 2px;
                    background-color: var(--vscode-foreground);
                    transition: .4s;
                    border-radius: 50%;
                }

                input:checked + .slider {
                    background-color: var(--vscode-button-background);
                    border-color: var(--vscode-button-background);
                }

                input:checked + .slider:before {
                    transform: translateX(14px);
                    background-color: var(--vscode-button-foreground);
                }

                .actions-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                }

                .action-btn {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    padding: 6px;
                    font-size: 12px;
                    text-align: center;
                }

                .action-btn:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }

                .disconnect-btn {
                    grid-column: span 2;
                    margin-top: 8px;
                    background: var(--vscode-errorForeground);
                    color: white;
                    opacity: 0.9;
                }

                .disconnect-btn:hover {
                    opacity: 1;
                    background: var(--vscode-errorForeground);
                }

            </style>
        </head>
        <body>
            <div class="section">
                <h3>Connect Device</h3>
                <div class="input-group">
                    <input type="text" id="ipInput" placeholder="192.168.1.x:5555">
                    <button id="connectBtn">Connect</button>
                </div>
            </div>

            <div class="section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3>Connected Devices</h3>
                    <button id="refreshBtn" class="icon-btn" title="Refresh">
                        <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M13.65 2.35A7.958 7.958 0 0 0 8 0a8 8 0 1 0 0 16c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 8 14 6 6 0 1 1 8 2c1.66 0 3.14.69 4.22 1.78L9 7h7V0l-2.35 2.35z"/></svg>
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
                        deviceList.innerHTML = '<div style="color: var(--vscode-descriptionForeground); font-style: italic; padding: 10px;">No devices connected</div>';
                        return;
                    }

                    devices.forEach(device => {
                        const card = document.createElement('div');
                        card.className = 'device-card';
                        
                        const isOnline = device.type === 'device';
                        const statusClass = isOnline ? 'status-online' : 'status-offline';
                        
                        // Note: Toggle states are not persisted/read from device yet, defaulting to unchecked or needing state management
                        // For now, we will assume they are unchecked or we need a way to query them.
                        // Since ADB doesn't easily give us "is wifi on" without shell commands, we'll use these as stateless toggles 
                        // or we would need to query state on refresh. For this UI iteration, we'll treat them as actions.
                        
                        card.innerHTML = \`
                            <div class="device-header">
                                <span>\${device.id}</span>
                                <span class="status-indicator \${statusClass}" title="\${device.type}"></span>
                            </div>

                            <div class="toggles-container">
                                <div class="toggle-item">
                                    <label class="switch">
                                        <input type="checkbox" onchange="toggleFeature('toggleWifi', '\${device.id}', this.checked)">
                                        <span class="slider"></span>
                                    </label>
                                    <span>Wi-Fi</span>
                                </div>
                                <div class="toggle-item">
                                    <label class="switch">
                                        <input type="checkbox" onchange="toggleFeature('toggleMobileData', '\${device.id}', this.checked)">
                                        <span class="slider"></span>
                                    </label>
                                    <span>Data</span>
                                </div>
                                <div class="toggle-item">
                                    <label class="switch">
                                        <input type="checkbox" onchange="toggleFeature('toggleAirplaneMode', '\${device.id}', this.checked)">
                                        <span class="slider"></span>
                                    </label>
                                    <span>Airplane</span>
                                </div>
                            </div>

                            <div class="actions-grid">
                                <button class="action-btn" onclick="sendCommand('installApk', '\${device.id}')">Install APK</button>
                                <button class="action-btn" onclick="sendCommand('uninstallApp', '\${device.id}')">Uninstall</button>
                                <button class="action-btn" onclick="sendCommand('clearAppData', '\${device.id}')">Clear Data</button>
                                <button class="action-btn" onclick="sendCommand('killApp', '\${device.id}')">Kill App</button>
                                <button class="action-btn" onclick="sendCommand('logcat', '\${device.id}')">Logcat</button>
                                <button class="action-btn" onclick="sendCommand('screenshot', '\${device.id}')">Screenshot</button>
                                <button class="action-btn full-width" style="grid-column: span 2" onclick="sendCommand('setPermission', '\${device.id}')">Manage Permissions</button>
                                <button class="disconnect-btn" onclick="sendCommand('disconnect', '\${device.id}')">Disconnect</button>
                            </div>
                        \`;
                        deviceList.appendChild(card);
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
