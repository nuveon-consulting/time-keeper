# UX and commands

This document defines **contribution IDs**, default interactions, and UX notes. **Update this file** when adding or renaming commands.

Implementation manifest: [`packages/extension/package.json`](../../packages/extension/package.json).

## Command palette

| Command ID | Title | Purpose |
|------------|--------|---------|
| `timeKeeper.startTask` | Nuveon Time Keeper: Start… | Quick Pick (**recent rows are templates** + new text). Creates a **new `Task` id** and **new segment** with a **description** only (`start` now, `end` when stopped). Stops any running segment first. |
| `timeKeeper.stopTask` | Nuveon Time Keeper: Stop | Sets **`end`** on the active segment; updates **resume previous** snapshot. |
| `timeKeeper.switchTask` | Nuveon Time Keeper: Switch… | Same picker and rules as start: stop current segment, then **new task** + **new segment** for the chosen description. |
| `timeKeeper.resumePrevious` | Nuveon Time Keeper: Resume previous | When **idle**, creates a **new task** (new id) with the **same description** as the last stopped segment. Message if already running or no snapshot. |
| `timeKeeper.openSummary` | Nuveon Time Keeper: Open summary | Opens an **editor tab** with a **filterable grid** of segments (raw + aligned columns when stored). |
| `timeKeeper.buildTimesheetText` | Nuveon Time Keeper: Build timesheet text… | Quick Pick **local calendar day** → opens a plaintext buffer: total duration for that day + sorted task bullets. Uses **aligned** span overlap when `timeKeeper.timesheetUseAlignedValues` is **true** and the segment has `alignedStart` / `alignedDurationMs`; otherwise uses raw `start`/`end`. |
| `timeKeeper.setupMcp` | Nuveon Time Keeper: Set up MCP (VS Code or Cursor)… | Writes/merges **`mcp.json`** for bundled stdio MCP. |
| `timeKeeper.statusBarClick` | Nuveon Time Keeper: Status bar menu | **Open summary**, **Build timesheet text**, **Set up MCP**, then Start / Resume when idle, or Stop / Switch when running. |

## Default keybindings

| Command | Windows / Linux | macOS |
|---------|-----------------|--------|
| Start task | `ctrl+shift+;` | `cmd+shift+;` |
| Stop task | `ctrl+shift+'` | `cmd+shift+'` |
| Resume previous | `ctrl+shift+,` | `cmd+shift+,` |

Switch task is available from the **status bar** menu or Command Palette (no default chord).

Users may remap via Keyboard Shortcuts.

## Status bar

- **Idle:** `$(watch) Nuveon Time Keeper` (visible after extension activation on startup).
- **Running:** `$(watch)` + truncated description + elapsed `mm:ss` (500ms refresh).
- **Click:** Quick Pick — **Open summary…**, **Build timesheet text…**, **Set up MCP…**, then idle: Start…, Resume previous; running: Stop, Switch….

## Quick Pick flows

1. **Start / switch:** recent descriptions (by last activity) + “New entry…” → `showInputBox` for a new description. Choosing a recent row **copies** that description text into a **new** task id for this segment.
2. **Summary:** use **Open summary** for the webview grid and filters (see [architecture.md](architecture.md)).

## Accessibility

- All flows available from the keyboard, status bar, and Command Palette.
- Sufficient contrast for status bar labels in default themes.
