# AGENTS.md

## Project Overview

**ADB Pro for VS Code** is a Visual Studio Code extension that provides Android Debug Bridge (ADB) integration directly within the editor. This extension allows developers to manage Android devices, install/uninstall applications, control device settings, and perform debugging operations without leaving VS Code.

## Project Structure

```
adb-pro-vscode-extension/
├── src/
│   ├── extension.ts          # Main extension entry point and command registration
│   ├── adbClient.ts          # ADB command execution wrapper
│   └── deviceTreeProvider.ts # Tree view provider for connected devices
├── resources/                # Extension icons and assets
├── out/                      # Compiled JavaScript output
├── package.json              # Extension manifest and configuration
└── tsconfig.json            # TypeScript configuration
```

## Key Components

### 1. Extension (`extension.ts`)
- Activates the extension and registers all commands
- Creates the output channel for ADB command logging
- Initializes the device tree view in the sidebar
- Registers command handlers for all ADB operations

### 2. ADB Client (`adbClient.ts`)
- Wraps the ADB command-line tool
- Executes ADB commands asynchronously
- Handles device connectivity and operations
- Manages error handling and output logging
- Configurable ADB path through VS Code settings

### 3. Device Tree Provider (`deviceTreeProvider.ts`)
- Provides a tree view of connected Android devices
- Refreshes device list automatically
- Displays device status (online, offline, unauthorized)

## Available Commands

The extension provides the following commands accessible via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

### Device Management
- **ADB: Connect to Device (IP)** - Connect to a device over TCP/IP
- **ADB: Disconnect Device** - Disconnect a specific device
- **ADB: Restart ADB Server** - Restart the ADB daemon

### Application Management
- **ADB: Install APK** - Install an APK file to the connected device
- **ADB: Uninstall App** - Uninstall an application by package name
- **ADB: Clear App Data** - Clear application data and cache
- **ADB: Kill App** - Force stop a running application

### Device Control
- **ADB: Toggle Wi-Fi** - Enable/disable Wi-Fi
- **ADB: Toggle Mobile Data** - Enable/disable mobile data
- **ADB: Toggle Airplane Mode** - Enable/disable airplane mode
- **ADB: Grant/Revoke App Permission** - Manage app permissions

### Debugging & Utilities
- **ADB: Take Screenshot** - Capture a screenshot from the device
- **ADB: Logcat** - View device logs in real-time

## Configuration

The extension can be configured through VS Code settings:

```json
{
  "adb.path": ""  // Path to adb executable. Leave empty to use adb from PATH
}
```

## Development

### Prerequisites
- Node.js and npm
- TypeScript
- VS Code Extension development environment

### Build Commands
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development
- `npm run lint` - Run ESLint on source files
- `npm run test` - Run extension tests

### Technology Stack
- **Language**: TypeScript
- **Framework**: VS Code Extension API
- **Runtime**: Node.js
- **External Dependency**: Android Debug Bridge (ADB)

## Extension Architecture

The extension follows a modular architecture:

1. **Command Layer** (`extension.ts`) - Handles VS Code command registration and user interactions
2. **Service Layer** (`adbClient.ts`) - Provides abstraction over ADB CLI commands
3. **UI Layer** (`deviceTreeProvider.ts`) - Manages the sidebar tree view

## AI Agent Instructions

When working on this project, AI agents should:

### General Guidelines
- Maintain TypeScript strict typing
- Follow the existing code structure and patterns
- Ensure all ADB commands are properly error-handled
- Log all ADB operations to the output channel
- Use async/await for all command execution

### Adding New Features
1. Register new commands in `package.json` under `contributes.commands`
2. Implement the command handler in `extension.ts`
3. Add the underlying ADB logic in `adbClient.ts`
4. Update the UI components if needed in `deviceTreeProvider.ts`

### Best Practices
- Always validate user input before executing ADB commands
- Provide clear error messages to users
- Refresh the device tree view after device state changes
- Use the output channel for debugging and command logs
- Handle cases where ADB is not installed or not in PATH

### Testing
- Test with both USB and TCP/IP connected devices
- Verify error handling for offline/unauthorized devices
- Test all commands with different device states
- Ensure proper cleanup of resources

### Common Modification Areas

**Adding a new ADB command:**
1. Add method to `AdbClient` class in `adbClient.ts`
2. Register command in `extension.ts` `activate()` function
3. Add command definition to `package.json` `contributes.commands`

**Modifying device tree view:**
1. Update `DeviceTreeProvider` class in `deviceTreeProvider.ts`
2. Modify tree item structure and labels as needed
3. Add context menu commands if required

**Changing ADB behavior:**
1. Modify the `execute()` method in `adbClient.ts` for global changes
2. Update specific command methods for targeted changes
3. Ensure output channel logging is maintained

## Dependencies

### Runtime Dependencies
- Android SDK Platform Tools (ADB must be installed separately)

### Development Dependencies
- `@types/vscode` - VS Code API types
- `@types/node` - Node.js types
- `typescript` - TypeScript compiler
- `eslint` - Code linting
- `@vscode/test-electron` - Extension testing

## Version Information

- **Current Version**: 0.0.1
- **Minimum VS Code Version**: 1.80.0
- **TypeScript Version**: 5.1.3

## Future Enhancement Ideas

- Device log filtering and search
- Screenshot preview in editor
- APK drag-and-drop installation
- Device screen recording
- File transfer between device and computer
- Shell command execution interface
- Device property viewer
- Wireless debugging setup assistant
