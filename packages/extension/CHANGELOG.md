# Changelog

## [1.0.0] - 2026-05-01

### Changed

- Summary **Export visible rows to CSV** no longer includes a redundant **`duration_ms`** column (`duration_seconds` remains).

## [0.0.37] - 2026-05-01

### Changed

- Default shortcut **Ctrl+Shift+;** / **Cmd+Shift+;** runs **Toggle start or stop** (start picker when idle, stop when running). Removed the default **Ctrl+Shift+'** / **Cmd+Shift+'** stop chord. **Start…** and **Stop** remain in the Command Palette and can be rebound.

## [0.0.33] - 2026-05-01

### Fixed

- MCP setup: wait one event-loop turn after writing user `mcp.json` before opening Settings, avoiding a hang in Cursor when the Quick Pick closes in the same turn.

### Changed

- Dependency updates recorded in `package-lock.json`.

## [0.0.31] - 2026-05-01

### Added

- Time alignment settings (`timeKeeper.alignmentIntervalMinutes`, `timeKeeper.timesheetUseAlignedValues`), persisted aligned spans on finished segments, and summary / timesheet support for aligned values.

## [0.0.29] - 2026-05-01

### Added

- Watch the MCP/timer state file and reload in-process timer state when the ledger is updated externally.

### Fixed

- Resolve `npm audit` issues in the extension dependency tree.

## [0.0.27] - 2026-04-23

### Added

- MCP stdio server integration, timer engine, and setup flow; dependency on `@modelcontextprotocol/sdk` and `zod`.
- Command title clarification for MCP setup (VS Code or Cursor).

### Changed

- `npm run package` uses `vsce package` (dependencies bundled as required for MCP).
