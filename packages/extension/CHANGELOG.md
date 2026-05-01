# Changelog

## [0.0.33] - 2026-05-01

### Fixed

- MCP setup: wait one event-loop turn after writing user `mcp.json` before opening Settings, avoiding a hang in Cursor when the Quick Pick closes in the same turn.

### Changed

- Dependency updates recorded in `package-lock.json`.

## [0.0.31] - 2026-05-01

### Added

- Time alignment settings (`timeKeeper.alignmentIntervalMinutes`, `timeKeeper.timesheetUseAlignedValues`), persisted aligned spans on finished segments, and summary / timesheet support for aligned values (`147b6b9`).

## [0.0.30] - 2026-05-01

### Changed

- Version bump (`ef5b819`).

## [0.0.29] - 2026-05-01

### Added

- Watch the MCP/timer state file and reload in-process timer state when the ledger is updated externally (`bc65cc5`).

### Fixed

- Resolve `npm audit` issues in the extension dependency tree (`cf3692c`).

## [0.0.27] - 2026-04-23

### Added

- MCP stdio server integration, timer engine, and setup flow; dependency on `@modelcontextprotocol/sdk` and `zod` (`c21265c`).
- Command title clarification for MCP setup (VS Code or Cursor) (`c21265c`).

### Changed

- `npm run package` uses `vsce package` (dependencies bundled as required for MCP) (`c21265c`).

## Earlier releases

Prior manifest bumps and renames (display name, package id, publisher, initial feature set) are visible in `git log -- packages/extension/package.json` and historical commits under `packages/extension/`.
