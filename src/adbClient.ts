import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

/**
 * Represents a connected Android device.
 */
export interface ConnectedDevice {
    id: string;
    type: string; // 'device' | 'offline' | 'unauthorized'
}

/**
 * Client for interacting with the Android Debug Bridge (ADB).
 */
export class AdbClient {
    private adbPath: string;

    constructor(private outputChannel: vscode.OutputChannel) {
        const config = vscode.workspace.getConfiguration('adb');
        this.adbPath = config.get<string>('path') || 'adb';
    }

    private async execute(command: string): Promise<string> {
        const fullCommand = `${this.adbPath} ${command}`;
        this.outputChannel.appendLine(`> ${fullCommand}`);
        try {
            const { stdout, stderr } = await execAsync(fullCommand);
            if (stdout) {
                this.outputChannel.appendLine(stdout);
            }
            if (stderr) {
                this.outputChannel.appendLine(`stderr: ${stderr}`);
            }
            return stdout.trim();
        } catch (error: any) {
            this.outputChannel.appendLine(`Error: ${error.message}`);
            this.outputChannel.show(true);
            throw new Error(`ADB Error: ${error.message}`);
        }
    }

    /**
     * Retrieves a list of connected devices.
     * @returns A promise that resolves to an array of ConnectedDevice objects.
     */
    async getConnectedDevices(): Promise<ConnectedDevice[]> {
        const output = await this.execute('devices');
        const lines = output.split('\n').slice(1); // Skip first line "List of devices attached"
        return lines
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                const [id, type] = line.split(/\s+/);
                return { id, type };
            });
    }

    async connectToDevice(ip: string): Promise<string> {
        return this.execute(`connect ${ip}`);
    }

    async disconnectDevice(deviceId: string): Promise<string> {
        return this.execute(`disconnect ${deviceId}`);
    }

    async installApk(deviceId: string, apkPath: string): Promise<string> {
        return this.execute(`-s ${deviceId} install -r "${apkPath}"`);
    }

    async uninstallApp(deviceId: string, packageName: string): Promise<string> {
        return this.execute(`-s ${deviceId} uninstall ${packageName}`);
    }

    async clearAppData(deviceId: string, packageName: string): Promise<string> {
        return this.execute(`-s ${deviceId} shell pm clear ${packageName}`);
    }

    async killApp(deviceId: string, packageName: string): Promise<string> {
        return this.execute(`-s ${deviceId} shell am force-stop ${packageName}`);
    }

    async restartServer(): Promise<string> {
        await this.execute('kill-server');
        return this.execute('start-server');
    }

    async executeShellCommand(deviceId: string, command: string): Promise<string> {
        return this.execute(`-s ${deviceId} shell ${command}`);
    }

    async toggleWifi(deviceId: string, enable: boolean): Promise<string> {
        const state = enable ? 'enable' : 'disable';
        return this.execute(`-s ${deviceId} shell svc wifi ${state}`);
    }

    async toggleMobileData(deviceId: string, enable: boolean): Promise<string> {
        const state = enable ? 'enable' : 'disable';
        return this.execute(`-s ${deviceId} shell svc data ${state}`);
    }

    async toggleAirplaneMode(deviceId: string, enable: boolean): Promise<string> {
        const state = enable ? '1' : '0';
        // Try to set global setting and broadcast intent
        await this.execute(`-s ${deviceId} shell settings put global airplane_mode_on ${state}`);
        return this.execute(`-s ${deviceId} shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state ${enable}`);
    }

    async setAppPermission(deviceId: string, packageName: string, permission: string, grant: boolean): Promise<string> {
        const action = grant ? 'grant' : 'revoke';
        return this.execute(`-s ${deviceId} shell pm ${action} ${packageName} ${permission}`);
    }

    async takeScreenshot(deviceId: string, localPath: string): Promise<string> {
        // Capture to device temp file
        const remotePath = '/sdcard/screenshot.png';
        await this.execute(`-s ${deviceId} shell screencap -p ${remotePath}`);
        // Pull to local path
        await this.execute(`-s ${deviceId} pull ${remotePath} "${localPath}"`);
        // Clean up remote file
        await this.execute(`-s ${deviceId} shell rm ${remotePath}`);
        return localPath;
    }

    /**
     * Gets the Process ID (PID) for a given package name.
     * @param deviceId The ID of the target device.
     * @param packageName The package name to look up.
     * @returns The PID as a string, or undefined if not found.
     */
    public async getPidForPackage(deviceId: string, packageName: string): Promise<string | undefined> {
        try {
            // pidof might return multiple PIDs, we take the first one
            const output = await this.execute(`-s ${deviceId} shell pidof ${packageName}`);
            return output.trim().split(/\s+/)[0];
        } catch (e) {
            return undefined;
        }
    }

    /**
     * Starts a Logcat session for the device.
     * @param deviceId The ID of the target device.
     * @param pid Optional PID to filter logs by process.
     * @param level Optional log level to filter by (V, D, I, W, E, F).
     */
    public async getLogcat(deviceId: string, pid?: string, level?: string): Promise<void> {
        this.outputChannel.show();
        this.outputChannel.appendLine(`Starting Logcat for device ${deviceId}...`);

        const args = ['-s', deviceId, 'logcat', '-v', 'time'];
        if (pid) {
            args.push(`--pid=${pid}`);
        }
        if (level) {
            args.push(`*:${level}`);
        }

        // We need to use spawn directly to handle streaming output
        const child = require('child_process').spawn(this.adbPath, args);

        child.stdout.on('data', (data: any) => {
            this.outputChannel.append(data.toString());
        });

        child.stderr.on('data', (data: any) => {
            this.outputChannel.append(data.toString());
        });

        child.on('close', (code: any) => {
            this.outputChannel.appendLine(`Logcat process exited with code ${code}`);
        });
    }

    public async getInstalledPackages(deviceId: string): Promise<string[]> {
        const output = await this.execute(`-s ${deviceId} shell pm list packages -3`);
        return output
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('package:'))
            .map(line => line.replace('package:', ''))
            .sort();
    }

    /**
     * Retrieves the requested permissions for a package and their granted status.
     * @param deviceId The ID of the target device.
     * @param packageName The package name.
     * @returns A promise that resolves to an array of permission objects.
     */
    public async getAppPermissions(deviceId: string, packageName: string): Promise<{ name: string; granted: boolean }[]> {
        try {
            const output = await this.execute(`-s ${deviceId} shell dumpsys package ${packageName}`);
            const lines = output.split('\n');
            const permissions: { name: string; granted: boolean }[] = [];
            let inPermissionsSection = false;

            for (const line of lines) {
                const trimmed = line.trim();

                // Look for the "runtime permissions:" section
                if (trimmed.startsWith('runtime permissions:')) {
                    inPermissionsSection = true;
                    continue;
                }

                // If we hit another section (usually starts with something like "sharedUser" or unindented text), stop
                if (inPermissionsSection && !line.startsWith('    ')) { // Permissions are indented
                    // Simple heuristic: if indentation drops, we might be out of the section.
                    // However, dumpsys output can be complex. 
                    // "runtime permissions:" block usually ends when indentation decreases or a new block starts.
                    // Let's assume if it doesn't match the permission pattern, we might be done or it's a continuation.
                }

                if (inPermissionsSection) {
                    // Line format: "android.permission.CAMERA: granted=true"
                    const match = trimmed.match(/^([^:]+):\s*granted=(true|false)/);
                    if (match) {
                        permissions.push({
                            name: match[1],
                            granted: match[2] === 'true'
                        });
                    } else if (trimmed === "") {
                        // Empty line might mean end of section
                        inPermissionsSection = false;
                    }
                }
            }
            return permissions.sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) {
            console.error('Failed to get app permissions', e);
            return [];
        }
    }

    async startApp(deviceId: string, packageName: string): Promise<string> {
        // Using monkey to start the app is a common trick to avoid needing the main activity name
        return this.execute(`-s ${deviceId} shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`);
    }
}
