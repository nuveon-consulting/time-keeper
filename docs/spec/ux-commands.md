# UX and commands

This document defines **contribution IDs**, default interactions, and speech grammar. **Update this file** when adding or renaming commands.

Implementation manifest: [`packages/extension/package.json`](../../packages/extension/package.json).

## Command palette

| Command ID | Title | Purpose |
|------------|--------|---------|
| `timeKeeper.startTask` | Time Keeper: Start task… | Quick Pick (**recent rows are templates** + new title). Creates a **new `Task` id** and **new segment** (`start` now, `end` when stopped). If something is already running, it is **stopped first**—never concurrent running segments. |
| `timeKeeper.stopTask` | Time Keeper: Stop task | Sets **`end`** on the active segment; updates **resume previous** snapshot. |
| `timeKeeper.switchTask` | Time Keeper: Switch task… | Same picker and **same segment rules** as start: stop current segment, then **new task** + **new segment** for the chosen title/description. |
| `timeKeeper.resumePrevious` | Time Keeper: Resume previous task | When **idle**, creates a **new task** (new id) with the **same title/description** as the last stopped item and starts a **new interval** (fresh `start`; **duration** applies once stopped). Shows a message if a timer is already running or there is no previous snapshot. |
| `timeKeeper.statusBarClick` | Time Keeper: Status bar menu | Idle: Start / Resume. Running: Stop / Switch. |

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
- **Running:** `$(watch)` + truncated task title + elapsed `mm:ss` (500ms refresh).
- **Click:** Quick Pick — idle: Start, Resume previous; running: Stop, Switch.

## Quick Pick flows

1. **Start / switch:** recent tasks (by last activity) + “New task…” → `showInputBox` for a new title. Choosing a recent row **does not** resume that row’s id—it **copies** label/description into a **new** task for this segment.
2. **Ambiguous speech:** (future) show top transcript interpretations before committing.

## Speech command grammar (informal)

Push-to-talk sends audio to STT; the **transcript** is parsed with simple intent detection (exact strings are implementation details):

- **Start:** phrases containing “start” / “begin” / “new task” + remainder as task description.
- **Stop:** “stop”, “stop task”, “stop timer”.
- **Resume:** “resume”, “resume previous”, “back to previous”.
- **Switch:** “switch to …” / “change task to …”.

If parsing fails, fall back to **treating full transcript as task title** on start, or show Quick Pick.

## Accessibility

- All flows available without voice.
- Sufficient contrast for status bar labels in default themes.
