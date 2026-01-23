# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Comprehensive edge case testing for Unicode and stress scenarios
- Sanitizing MCP server for safe web fetching
- Recursive framing interdiction protocol for web search
- ELI5.md documentation
- Automatic changelog generation on issue close

### Fixed
- UTF-8 panic in list truncation with multi-byte characters
- macOS binary missing from VSCode plugin
- TypeScript rule enhancements

### Changed
- Refactor codebase to reduce duplication (#6)
- Extract `issue_from_row` helper in db.rs (#9)
- Improve session management with auto-start and stronger rules

## [1.4] - 2026-01-08

### Fixed
- Issue import/export functionality

### Changed
- Extension version bump

## [1.3] - 2026-01-07

### Added
- Elixir and Phoenix language rules (contributed by Viscosity4373)
- New language detection improvements

### Changed
- Plugin build system now auto-rebuilds binaries
- Improved global.md defaults

## [1.2] - 2026-01-05

### Added
- VSCode extension plugin
- Agent agnostic context provider
- Fuzzing with cargo-fuzz
- Property-based testing with proptest
- Cross-platform CI workflow
- Database corruption recovery

### Fixed
- Path resolution issues
- Code formatting consistency
- Various bugfixes from testing

### Security
- Bump qs dependency (dependabot)

### Changed
- Chainlink daemon now auto-starts
- Python dependency made explicit

## [1.1] - 2025-12-28

### Added
- Issue templates for common workflows
- Export/Import functionality for issues
- Milestones and epics support
- Issue archiving
- Best practices hooks for 15+ detected languages
- Composable rules system

### Fixed
- Language detection now checks subdirectories

## [1.0] - 2025-12-27

### Added
- Initial release of Chainlink issue tracker
- Core CLI commands: create, list, show, update, close, reopen, delete
- Subissue support for breaking down large tasks
- Comments and labels for organization
- Blocking/dependency tracking between issues
- Session management with handoff notes
- Claude Code hooks integration
- Smart navigation and context injection
- Language-specific rules injection based on project detection
