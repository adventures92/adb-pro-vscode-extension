# Contributing to ADB Pro for VS Code

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to ADB Pro for VS Code. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Getting Started

### Prerequisites

*   **Node.js**: Version 16.x or higher.
*   **npm**: Version 8.x or higher.
*   **VS Code**: The latest stable version.
*   **ADB**: The Android Debug Bridge command-line tool must be installed and available in your PATH.

### Installation

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/your-username/adb-pro.git
    cd adb-pro
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```

## Building and Running

1.  **Open the project in VS Code**:
    ```bash
    code .
    ```
2.  **Start the compiler in watch mode**:
    *   Press `Cmd+Shift+B` (or `Ctrl+Shift+B`) and select `npm: watch`.
    *   Alternatively, run `npm run watch` in the terminal.
3.  **Launch the Extension**:
    *   Press `F5` to open a new **Extension Development Host** window.
    *   The extension will be active in this new window.

## Development Workflow

### Project Structure

*   `src/extension.ts`: Main entry point. Registers commands and providers.
*   `src/adbClient.ts`: Wrapper around the `adb` CLI. Handles all shell execution.
*   `src/deviceTreeProvider.ts`: Logic for the "Devices & Apps" sidebar view.
*   `src/adbWebview.ts`: Logic for the Webview-based control panel (if applicable).

### Linting

We use ESLint to maintain code quality.

*   Run the linter:
    ```bash
    npm run lint
    ```
*   Fix auto-fixable issues:
    ```bash
    npm run lint -- --fix
    ```

### Testing

*   Run unit tests:
    ```bash
    npm test
    ```

## Submitting a Pull Request

1.  Create a new branch for your feature or bug fix:
    ```bash
    git checkout -b feature/my-awesome-feature
    ```
2.  Make your changes and commit them with clear, descriptive messages.
3.  Push your branch to your fork:
    ```bash
    git push origin feature/my-awesome-feature
    ```
4.  Open a Pull Request on the main repository.
    *   Describe your changes in detail.
    *   Link to any relevant issues.
    *   Attach screenshots or GIFs if your changes affect the UI.

## Code Style

*   Use **TypeScript** for all new code.
*   Follow the existing formatting (indentation, naming conventions).
*   Ensure all new features have appropriate error handling.

## Need Help?

If you have questions, feel free to open an issue or start a discussion on GitHub.

Happy coding! 🚀
