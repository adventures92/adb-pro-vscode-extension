# GEMINI.md

## Project Overview

This project is a Visual Studio Code extension that integrates the Android Debug Bridge (ADB) into the editor. It provides a user-friendly interface in the activity bar for interacting with connected Android devices, allowing developers to perform common ADB operations without leaving the VS Code environment.

**Key Features:**

*   **Device Management:** View a list of connected devices and their status. Connect to devices over IP and disconnect from them.
*   **Application Management:** Install APKs, uninstall applications, clear application data, and force-stop applications.
*   **Device Control:** Toggle Wi-Fi, mobile data, and airplane mode. Grant or revoke application permissions.
*   **Debugging:** Take screenshots and view device logs using logcat.
*   **Custom ADB Path:** Configure the path to the `adb` executable.

**Technologies:**

*   **Language:** TypeScript
*   **Framework:** VS Code Extension API
*   **Build Tool:** `tsc` (TypeScript Compiler)
*   **Linter:** ESLint

**Architecture:**

*   `src/extension.ts`: The main entry point of the extension, responsible for registering commands and initializing the UI.
*   `src/adbClient.ts`: A client class that wraps the `adb` command-line tool, providing methods for executing ADB commands.
*   `src/deviceTreeProvider.ts`: A `TreeDataProvider` that populates the sidebar with a list of connected devices and available actions.

## Building and Running

### Prerequisites

*   Node.js and npm
*   The `adb` command-line tool installed and in your system's PATH (or configured in the extension's settings).

### Building

To compile the TypeScript code, run the following command:

```sh
npm run compile
```

To compile in watch mode, run:

```sh
npm run watch
```

### Running in VS Code

1.  Open the project in Visual Studio Code.
2.  Press `F5` to open a new Extension Development Host window with the extension running.

### Testing

To run the tests, use the following command:

```sh
npm test
```

## Development Conventions

*   **Language:** All code is written in TypeScript.
*   **Linting:** The project uses ESLint to enforce a consistent coding style. Run `npm run lint` to check for linting errors.
*   **VS Code API:** The extension is built on top of the Visual Studio Code Extension API.
*   **Asynchronous Operations:** The extension makes extensive use of `async/await` for handling asynchronous operations, particularly when interacting with the `adb` command-line tool.
*   **Error Handling:** Errors from ADB commands are caught and displayed to the user as error messages in the VS Code window.
*   **User Interaction:** The extension uses VS Code's built-in UI elements, such as `showInputBox`, `showQuickPick`, and `withProgress`, to interact with the user.
