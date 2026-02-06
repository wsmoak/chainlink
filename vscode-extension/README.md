# Chainlink Issue Tracker - VS Code Extension

A simple, lean issue tracker for AI-assisted development, integrated directly into VS Code.

## Features

- **Session Management**: Start/end work sessions with handoff notes for context preservation
- **Context Compression Resilience**: Breadcrumb tracking via `session action` survives AI context resets
- **Issue Tracking**: Create, update, and manage issues without leaving your editor
- **Quick Workflow**: `chainlink quick` creates, labels, and starts work in one command
- **Issue Templates**: Built-in templates for bugs, features, audits, investigations, and more
- **JSON & Quiet Modes**: `--json` for structured output, `--quiet` for pipe-friendly results
- **Stale Session Detection**: Auto-ends sessions idle >4 hours on next startup
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

All commands are available from the VS Code Command Palette (Ctrl+Shift+P / Cmd+Shift+P).

### Session Management

| VS Code Command | CLI Equivalent | Description |
|-----------------|----------------|-------------|
| `Chainlink: Start Session` | `chainlink session start` | Start a new work session |
| `Chainlink: End Session` | `chainlink session end --notes "..."` | End session with optional handoff notes |
| `Chainlink: Session Status` | `chainlink session status` | Show current session info and last action |
| `Chainlink: Set Working Issue` | `chainlink session work <id>` | Set the issue you're currently working on |
| `Chainlink: Record Action Breadcrumb` | `chainlink session action "..."` | Record a breadcrumb (survives context compression) |
| `Chainlink: Show Last Handoff Notes` | `chainlink session last-handoff` | Retrieve handoff notes from the previous session |

### Issue Creation

| VS Code Command | CLI Equivalent | Description |
|-----------------|----------------|-------------|
| `Chainlink: Create Issue` | `chainlink create <title> -p <priority>` | Create a new issue with priority picker |
| `Chainlink: Quick Create` | `chainlink quick <title> -p <pri> -l <label>` | Create + label + set as active work item |
| `Chainlink: Create from Template` | `chainlink create <title> --template <tmpl>` | Create from template (bug/feature/audit/etc.) |
| `Chainlink: Create Subissue` | `chainlink subissue <parent> <title>` | Create a subissue under a parent |

### Issue Management

| VS Code Command | CLI Equivalent | Description |
|-----------------|----------------|-------------|
| `Chainlink: Show Issue Details` | `chainlink show <id>` | View details of a specific issue |
| `Chainlink: Update Issue` | `chainlink update <id> ...` | Update title, description, or priority |
| `Chainlink: Close Issue` | `chainlink close <id>` | Close an issue |
| `Chainlink: Close All Issues` | `chainlink close-all` | Close all open issues (with confirmation) |
| `Chainlink: Reopen Issue` | `chainlink reopen <id>` | Reopen a closed issue |
| `Chainlink: Delete Issue` | `chainlink delete <id>` | Delete an issue (with confirmation) |

### Comments, Labels & Dependencies

| VS Code Command | CLI Equivalent | Description |
|-----------------|----------------|-------------|
| `Chainlink: Add Comment` | `chainlink comment <id> "text"` | Add a comment to an issue |
| `Chainlink: Add Label` | `chainlink label <id> <label>` | Add a label to an issue |
| `Chainlink: Remove Label` | `chainlink unlabel <id> <label>` | Remove a label from an issue |
| `Chainlink: Block Issue` | `chainlink block <id> <blocker>` | Mark issue as blocked by another |
| `Chainlink: Unblock Issue` | `chainlink unblock <id> <blocker>` | Remove blocking relationship |
| `Chainlink: Relate Issues` | `chainlink relate <id1> <id2>` | Link two related issues together |
| `Chainlink: Unrelate Issues` | `chainlink unrelate <id1> <id2>` | Remove relationship between issues |

### Navigation & Search

| VS Code Command | CLI Equivalent | Description |
|-----------------|----------------|-------------|
| `Chainlink: List Issues` | `chainlink list` | Show all open issues |
| `Chainlink: Show Ready Issues` | `chainlink ready` | List issues ready to work on (no blockers) |
| `Chainlink: Show Blocked Issues` | `chainlink blocked` | List all blocked issues |
| `Chainlink: Suggest Next Issue` | `chainlink next` | Recommend the next issue to work on |
| `Chainlink: Show Issue Tree` | `chainlink tree` | Show all issues in a tree hierarchy |
| `Chainlink: Search Issues` | `chainlink search <query>` | Search issues by keyword |

### Setup & Daemon

| VS Code Command | CLI Equivalent | Description |
|-----------------|----------------|-------------|
| `Chainlink: Initialize Project` | `chainlink init` | Initialize chainlink in current workspace |
| `Chainlink: Start Daemon` | `chainlink daemon start` | Manually start the background daemon |
| `Chainlink: Stop Daemon` | `chainlink daemon stop` | Stop the background daemon |
| `Chainlink: Daemon Status` | `chainlink daemon status` | Check if daemon is running |

> **Tip:** All commands also work via CLI. Add `--quiet` / `-q` for minimal output, or `--json` for structured output.

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
