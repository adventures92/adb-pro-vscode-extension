# Publishing Guide

This guide explains how to publish the ADB Pro VS Code extension using the automated GitHub Actions workflow.

## Prerequisites

Before running the workflow, you must configure the following secrets in your GitHub Repository settings (`Settings` > `Secrets and variables` > `Actions`):

| Secret Name | Description |
| :--- | :--- |
| `VSCE_PAT` | Personal Access Token for the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/). |
| `OVSX_PAT` | Personal Access Token for the [Open VSX Registry](https://open-vsx.org/). |

## Workflow: Publish Extension

The workflow is located at `.github/workflows/publish.yml`. It is a **manual** workflow that you trigger from the "Actions" tab in GitHub.

### Steps to Publish

1.  **Update Version**:
    - Manually update the `version` field in `package.json` (e.g., `1.0.0` -> `1.0.1`).
    - Commit and push this change to the `main` branch.

2.  **Trigger Workflow**:
    - Go to the **Actions** tab in the GitHub repository.
    - Select the **Publish Extension** workflow from the left sidebar.
    - Click the **Run workflow** button.
    - (Optional) Check **Dry Run** if you only want to test the build and packaging process without actually publishing.
    - Click **Run workflow**.

### What the Workflow Does

1.  **Build & Test**: Installs dependencies, runs tests, and compiles the extension.
2.  **Package**: Creates the `.vsix` extension package.
3.  **Release & Publish** (if not a Dry Run):
    - Creates a **GitHub Release** with the tag `v<version>` (e.g., `v1.0.1`) and attaches the `.vsix` file.
    - Publishes the extension to the **VS Code Marketplace**.
    - Publishes the extension to the **Open VSX Registry**.
