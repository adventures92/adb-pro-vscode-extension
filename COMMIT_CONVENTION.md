# Git Commit Guidelines

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
Must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, missing semi-colons, etc)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scope
Optional, can be anything specifying the place of the commit change:
- `adb` - ADB client related changes
- `ui` - UI/tree view changes
- `commands` - Command implementations
- `config` - Configuration changes

### Subject
- Use imperative, present tense: "add" not "added" or "adds"
- Don't capitalize first letter
- No period (.) at the end
- Maximum 50 characters

### Body
- Wrap at 72 characters
- Explain what and why, not how
- Use bullet points if needed

### Footer
Reference issues and breaking changes:
- `Fixes #123`
- `Closes #456`
- `BREAKING CHANGE: description`

## Examples

```
feat(adb): add device screenshot command

Implement screenshot capture functionality for connected devices.
Screenshots are saved to workspace folder with timestamp.

Closes #42
```

```
fix(client): resolve connection timeout issue

Increase timeout for device connection from 5s to 10s to handle
slower network conditions.

Fixes #78
```

```
docs: update README with installation steps
```

## Git Hooks

This project includes:

### Pre-commit Hook
- Runs ESLint on staged TypeScript files
- Prevents commits if linting fails

### Commit-msg Hook
- Validates commit message format
- Enforces conventional commits specification
- Checks subject line length

## Testing Hooks

Test the commit message hook:
```bash
git commit -m "invalid message"  # Should fail
git commit -m "feat: add new feature"  # Should succeed
```

## Bypassing Hooks (Not Recommended)
Only in exceptional cases:
```bash
git commit --no-verify -m "your message"
```
