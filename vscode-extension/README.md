# Chainlink Issue Tracker - VS Code Extension

A simple, lean issue tracker for AI-assisted development, integrated directly into VS Code.

## Features

- **Session Management**: Start/end work sessions with handoff notes for context preservation
- **Issue Tracking**: Create, update, and manage issues without leaving your editor
- **Daemon Auto-Start**: Background daemon keeps session state fresh
- **Cross-Platform**: Works on Windows, Linux, and macOS
- **Agent-Agnostic**: Context provider script works with any AI coding assistant

## Requirements

- **Python 3.6+**: Required for Claude Code hooks to function. The extension will warn you if Python is not detected in your PATH.

## Installation

1. Install from the VS Code Extensions Marketplace (search "Chainlink Issue Tracker")
2. Open a project folder
3. Run `Chainlink: Initialize Project` from the command palette

## Commands

| VS Code Command | CLI Equivalent | Description |
|-----------------|----------------|-------------|
| `Chainlink: Initialize Project` | `chainlink init` | Initialize chainlink in current workspace |
| `Chainlink: Start Session` | `chainlink session start` | Start a new work session |
| `Chainlink: End Session` | `chainlink session end --notes "..."` | End session with optional handoff notes |
| `Chainlink: Session Status` | `chainlink session status` | Show current session info |
| `Chainlink: Start Daemon` | `chainlink daemon start` | Manually start the background daemon |
| `Chainlink: Stop Daemon` | `chainlink daemon stop` | Stop the background daemon |
| `Chainlink: Daemon Status` | `chainlink daemon status` | Check if daemon is running |
| `Chainlink: List Issues` | `chainlink list` | Show all open issues |
| `Chainlink: Create Issue` | `chainlink create <title>` | Create a new issue |
| `Chainlink: Show Issue Details` | `chainlink show <id>` | View details of a specific issue |

### Additional CLI Commands

These commands are available via CLI but not yet exposed in the VS Code command palette:

```bash
chainlink create <title> -p high          # Create with priority (low/medium/high/critical)
chainlink create <title> -d "description" # Create with description
chainlink subissue <parent_id> <title>    # Create subissue under parent
chainlink update <id> --title "New"       # Update issue title
chainlink update <id> -p critical         # Update priority
chainlink close <id>                      # Close an issue
chainlink reopen <id>                     # Reopen closed issue
chainlink delete <id>                     # Delete an issue
chainlink comment <id> "message"          # Add comment to issue
chainlink label <id> <label>              # Add label to issue
chainlink block <id> <blocker_id>         # Mark issue as blocked
chainlink unblock <id> <blocker_id>       # Remove blocking relationship
chainlink ready                           # List issues ready to work on
chainlink blocked                         # List blocked issues
chainlink session work <id>               # Set current working issue
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `chainlink.binaryPath` | `""` | Override path to chainlink binary (for development) |
| `chainlink.autoStartDaemon` | `true` | Auto-start daemon when .chainlink project detected |
| `chainlink.showOutputChannel` | `false` | Show output channel for daemon logs |

## Development

### Building the Extension

```bash
# Install dependencies
cd vscode-extension
npm install

# Compile TypeScript
npm run compile

# Build binaries for all platforms
npm run build:binaries

# Package the extension
npm run package
```

### Building Binaries

The extension bundles platform-specific binaries. To build them:

```bash
# Build all platforms (Windows native, Linux via WSL)
node scripts/build-binaries.js

# Build specific platform
node scripts/build-binaries.js --platform windows
node scripts/build-binaries.js --platform linux
```

**Requirements:**
- Windows: Visual Studio Build Tools with Rust
- Linux: WSL with Fedora 42 (or another distro with Rust installed)
- macOS: Xcode Command Line Tools with Rust

### Testing Locally

1. Open the `vscode-extension` folder in VS Code
2. Press F5 to launch Extension Development Host
3. Set `chainlink.binaryPath` to your local debug binary path

## Architecture

```
vscode-extension/
├── src/
│   ├── extension.ts    # Extension entry point, command registration
│   ├── daemon.ts       # Daemon lifecycle management
│   └── platform.ts     # Platform detection, binary resolution
├── bin/                # Platform binaries (populated by build script)
│   ├── chainlink-win.exe
│   ├── chainlink-linux
│   └── chainlink-darwin
├── scripts/
│   └── build-binaries.js  # Cross-compilation orchestration
└── package.json
```

## Daemon Behavior

The daemon runs as a background process that:
- Auto-flushes session state every 30 seconds
- Self-terminates when VS Code closes (zombie prevention via stdin monitoring)
- Writes logs to `.chainlink/daemon.log`

## Using with Any AI Agent

Chainlink includes a context provider script that works with **any** AI coding assistant, not just Claude Code.

### Context Provider

After running `Chainlink: Initialize Project`, you'll have a context provider at:
```
.chainlink/integrations/context-provider.py
```

This script generates intelligent context including:
- Current session state and handoff notes
- Open/ready issues
- Project structure
- Language-specific coding rules

### Shell Aliases

Add to your `~/.bashrc`, `~/.zshrc`, or PowerShell profile:

**Bash/Zsh:**
```bash
# Copy chainlink context to clipboard
chainlink-ctx() {
    python .chainlink/integrations/context-provider.py --clipboard
}

# Aider with chainlink context
aider-cl() {
    python .chainlink/integrations/context-provider.py --format md > /tmp/cl-ctx.md
    aider --read /tmp/cl-ctx.md "$@"
}
```

**PowerShell:**
```powershell
function chainlink-ctx {
    python .chainlink\integrations\context-provider.py | Set-Clipboard
}
```

### Usage Examples

```bash
# Full context (XML format, best for LLMs)
python .chainlink/integrations/context-provider.py

# Markdown format (human readable)
python .chainlink/integrations/context-provider.py --format md

# Just coding rules
python .chainlink/integrations/context-provider.py --rules

# Copy to clipboard for web UIs
python .chainlink/integrations/context-provider.py --clipboard

# Generate .cursorrules for Cursor
python .chainlink/integrations/context-provider.py --format md --rules > .cursorrules
```

### Agent-Specific Integration

| Agent | Method |
|-------|--------|
| **Cursor** | `python context-provider.py --format md --rules > .cursorrules` |
| **Aider** | `aider --read context.md` (generate context.md first) |
| **Continue.dev** | Add exec context provider in `.continue/config.json` |
| **Web UIs** | `--clipboard` then paste as first message |
| **Claude Code** | Built-in hooks, no setup needed |

### What Gets Injected

```xml
<chainlink-session>
Session #5 active
Working on: #12 Fix authentication bug
</chainlink-session>

<chainlink-issues>
Ready issues (unblocked):
  #12   high     Fix authentication bug
</chainlink-issues>

<coding-rules>
### Rust Best Practices
- Use `?` operator over `.unwrap()`
...
</coding-rules>
```

For full documentation, see the [main README](https://github.com/dollspace-gay/chainlink#using-chainlink-with-any-ai-agent).

## License

MIT
