# UX and commands

This document defines **contribution IDs**, default interactions, and speech grammar. **Update this file** when adding or renaming commands.

Implementation manifest: [`packages/extension/package.json`](../../packages/extension/package.json).

## Command palette

| Command ID | Title | Purpose |
|------------|--------|---------|
| `timeKeeper.startTask` | Time Keeper: Start… | Quick Pick (**recent rows are templates** + new text). Creates a **new `Task` id** and **new segment** with a **description** only (`start` now, `end` when stopped). Stops any running segment first. |
| `timeKeeper.stopTask` | Time Keeper: Stop | Sets **`end`** on the active segment; updates **resume previous** snapshot. |
| `timeKeeper.switchTask` | Time Keeper: Switch… | Same picker and rules as start: stop current segment, then **new task** + **new segment** for the chosen description. |
| `timeKeeper.resumePrevious` | Time Keeper: Resume previous | When **idle**, creates a **new task** (new id) with the **same description** as the last stopped segment. Message if already running or no snapshot. |
| `timeKeeper.openSummary` | Time Keeper: Open summary | Opens an **editor tab** with a **filterable grid** of all segments (start, end, duration, description). |
| `timeKeeper.statusBarClick` | Time Keeper: Status bar menu | **Open summary**, then Start / Resume when idle, or Stop / Switch when running. |

`timeKeeper.toggleTimer` remains **optional** (not contributed in v1).

## Default keybindings

| Command | Windows / Linux | macOS |
|---------|-----------------|--------|
| Start task | `ctrl+shift+;` | `cmd+shift+;` |
| Stop task | `ctrl+shift+'` | `cmd+shift+'` |
| Resume previous | `ctrl+shift+,` | `cmd+shift+,` |

Switch task is available from the **status bar** menu or Command Palette (no default chord).

Users may remap via Keyboard Shortcuts.

## Status bar

- **Idle:** `$(watch) Time Keeper` (visible after extension activation on startup).
- **Running:** `$(watch)` + truncated description + elapsed `mm:ss` (500ms refresh).
- **Click:** Quick Pick — idle: Start, Resume previous; running: Stop, Switch.

## Quick Pick flows

1. **Start / switch:** recent descriptions (by last activity) + “New entry…” → `showInputBox` for a new description. Choosing a recent row **copies** that description text into a **new** task id for this segment.
2. **Summary:** use **Open summary** for the webview grid and filters (see [architecture.md](architecture.md)).
3. **Ambiguous speech:** (future) show top transcript interpretations before committing.

## Speech command grammar (informal)

Push-to-talk sends audio to STT; the **transcript** is parsed with simple intent detection (exact strings are implementation details):

- **Start:** phrases containing “start” / “begin” / “new task” + remainder as task description.
- **Stop:** “stop”, “stop task”, “stop timer”.
- **Resume:** “resume”, “resume previous”, “back to previous”.
- **Switch:** “switch to …” / “change task to …”.

If parsing fails, fall back to **treating full transcript as the description** on start, or show Quick Pick.

## Accessibility

- All flows available without voice.
- Sufficient contrast for status bar labels in default themes.
