# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ADB Pro is a VS Code extension that integrates the Android Debug Bridge (ADB) for managing Android devices directly from the editor. It provides both a webview-based sidebar UI and tree view for device management.

## Build & Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-recompile on changes)
npm run watch

# Run linter
npm run lint

# Fix linting issues automatically
npm run lint -- --fix

# Run tests
npm test

# Build for production (before publishing)
npm run vscode:prepublish
```

### Testing the Extension
1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. Or press `Cmd+Shift+B` (Mac) / `Ctrl+Shift+B` (Windows/Linux) and select `npm: watch`
4. The extension will be active in the new window

## Architecture

### Core Components

**`extension.ts`** - Main entry point
- Registers all commands (connect, disconnect, installApk, etc.)
- Initializes `AdbClient`, `AdbWebviewProvider`, `DeviceTreeProvider`, and `TargetAppManager`
- Handles command palette interactions
- Contains helper function `pickDevice()` for device selection

**`adbClient.ts`** - ADB CLI wrapper
- Executes all ADB shell commands using `child_process`
- Provides clean async API: `getConnectedDevices()`, `installApk()`, `toggleWifi()`, etc.
- Outputs all commands and results to "ADB Pro" output channel
- Handles error parsing and timeout management
- Uses configurable ADB path from VS Code settings (`adb.path`)

**`adbWebviewProvider.ts`** - Webview sidebar UI
- Implements `WebviewViewProvider` for the "ADB Control Panel" view
- Two-way message passing between webview and extension host
- Renders device cards with toggle switches (Wi-Fi, Mobile Data, Airplane Mode)
- Action buttons delegate to command palette commands
- HTML/CSS/JavaScript embedded in `_getHtmlForWebview()`

**`deviceTreeProvider.ts`** - Tree view provider
- Implements `TreeDataProvider` for the "Devices & Apps" view
- Shows connected devices in collapsible tree structure
- Each device has child action items that trigger commands
- Includes `TargetAppTreeItem` at the top for quick app selection

**`appManager.ts`** - Package name discovery and management
- `TargetAppManager`: Manages currently selected target app (package name)
  - Shows status bar item with current selection
  - Persists selection in workspace state
  - Maintains global history of recent apps (last 10)
- `AppDiscoveryService`: Auto-discovers package names from workspace
  - Scans `build.gradle`, `build.gradle.kts`, `AndroidManifest.xml`
  - Extracts `applicationId` and `package` declarations
  - Ignores common directories (node_modules, .git, build, etc.)

### Key Design Patterns

**Command Registration Pattern**
All commands follow this pattern:
1. Accept optional `arg` parameter (string deviceId or `DeviceTreeItem` instance)
2. If no arg provided, call `pickDevice()` to show device picker
3. For app-related commands, call `resolvePackageName()` which uses `TargetAppManager`
4. Execute ADB operation via `AdbClient`
5. Show success/error notification
6. Refresh UI (`adbWebviewProvider.refresh()` and/or `deviceTreeProvider.refresh()`)

**Device Selection Logic**
- `pickDevice()` helper function:
  - If 0 devices: show error
  - If 1 device: auto-select
  - If multiple: show QuickPick

**Toggle Commands**
- Use shared `toggleHandler()` in extension.ts
- Accept optional boolean `enable` parameter
- If not provided, show QuickPick for "Enable" or "Disable"
- Used for Wi-Fi, Mobile Data, Airplane Mode

**App Target Selection**
The extension uses a sophisticated target app system:
1. User can select a target app via status bar or "Select Target App" command
2. App selection shows (in order):
   - Current selection
   - Recent history (last 10 apps)
   - Apps installed on selected device (fetched via ADB)
   - Apps discovered in workspace (from gradle/manifest files)
   - Manual entry option
3. When commands like "Uninstall App", "Clear App Data", "Kill App", or "Logcat" are invoked, they use the selected target app
4. If no app is selected, user is prompted to choose one

### Data Flow

1. User triggers action (button click in webview, tree item click, or command palette)
2. Command handler in `extension.ts` is invoked
3. Handler calls `AdbClient` method
4. `AdbClient` constructs ADB command string and executes via `child_process.execAsync()`
5. Output is logged to output channel
6. Result is parsed and returned
7. UI is updated (notifications, refresh views)

## ADB Command Configuration

The extension uses the ADB path from VS Code settings:
```json
{
  "adb.path": "/path/to/adb"
}
```
If not set, defaults to `"adb"` (assumes it's in PATH).

## Important Implementation Notes

### Logcat Streaming
- Logcat uses `child_process.spawn()` instead of `exec()` for streaming output
- Supports filtering by PID (resolved from package name via `getPidForPackage()`)
- Supports filtering by log level (V, D, I, W, E, F)
- Output streams directly to "ADB Pro" output channel

### Permission Management
- Interactive loop allows toggling multiple permissions without exiting
- Parses `dumpsys package` output to extract runtime permissions
- Shows checkmark/X icons in QuickPick based on grant status
- "Done" option exits the permission manager

### Screenshot Workflow
1. Capture to device: `screencap -p /sdcard/screenshot.png`
2. Pull to local: `adb pull /sdcard/screenshot.png <localPath>`
3. Cleanup remote: `rm /sdcard/screenshot.png`

### Webview State Management
- Toggle switches in webview are stateless (don't query device state on refresh)
- Treated as action triggers rather than state indicators
- Future enhancement could query actual device state

## Testing Notes

- Test files should be in `test/` directory (not currently implemented)
- Manual testing requires:
  - Android device with USB debugging enabled
  - ADB installed and configured
  - Valid APK files for install testing
  - Test Android app for uninstall/clear data/kill operations

## Common Gotchas

1. **ADB Path**: If ADB commands fail, verify `adb.path` setting or ensure ADB is in system PATH
2. **Device Authorization**: Devices may show as "unauthorized" - check device screen for authorization prompt
3. **Root Permissions**: Some operations (e.g., Mobile Data toggle on newer Android) require root
4. **Process ID Resolution**: Logcat filtering by package requires the app to be running
5. **Airplane Mode**: Toggling airplane mode may not work on all Android versions/OEM ROMs

## Extension Contribution Points

- Commands: 14 registered commands (all prefixed `adb-pro.*`)
- Views: 2 views in activity bar sidebar (`adb-device-list`, `adbWebview`)
- Configuration: 1 setting (`adb.path`)
- View Container: Custom "ADB" activity bar icon
- Menus: View title buttons for refresh and connect

## TypeScript Configuration

- Target: ES2020
- Module: CommonJS
- Output: `out/` directory
- Strict mode enabled
- Source maps enabled for debugging
