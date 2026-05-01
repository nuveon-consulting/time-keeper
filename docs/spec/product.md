# Product specification

## Problem

Developers need to **capture time on tasks** without breaking flow. Traditional timers demand too many clicks and context switches. Time Keeper optimizes for **start, stop, and resume** from the IDE.

## Personas

- **IDE-native developer:** Spends most of the day in Cursor or VS Code; wants keyboard-first control.
- **Multi-tasker:** Frequently switches work; needs **return to previous task** without hunting history.

## Extension scope

**Implemented**

- **Start / switch:** each action creates a **new task record** (new id) and a **new time segment** with a fresh **start**; picking a “recent” row only **copies** its **description** text. **No concurrent running segments**; each segment has its own **stop** (`end`) and **duration**.
- Stop the active segment (sets `end` on the current `TimeEntry`).
- **Resume previous:** starts a **new task record** (new id) with the **same description** as the segment you last stopped, and a **new time segment** with a fresh **start**; **duration** is derived when you stop (`end` − `start`).
- **Summary:** **Open summary** shows every **segment** in a main-window **table** with filters (description, duration, start/end calendar day, day range, or local date-time range), optional **aligned** columns when alignment is enabled, and **CSV export** of visible rows.
- **Timesheet text:** **Build timesheet text…** produces a plaintext buffer for a chosen local calendar day (raw vs aligned overlap per settings).
- Low-friction UX: commands, default keybindings, status bar indicator, Quick Pick where disambiguation is needed.
- **MCP:** bundled stdio server plus **Set up MCP** command so user-configured assistants can use start / stop / switch / resume and read timer state under the same persistence rules as the UI. Spec: [mcp.md](mcp.md).

**Not in the extension**

- Menu bar / system tray application (the shipped surface is the editor extension only).
- Team sync, billing export, and invoicing as product features.

## User stories

1. **As a user**, I can start timing a new task with a **single command** and minimal prompts so I can stay in flow.
2. **As a user**, I can **stop** the active task with one action so boundaries are accurate.
3. **As a user**, I can **switch** work: the current segment **stops** (`end` set) and a **new task** + **new segment** opens for the next **description** (same rules as start—no overlap, one running segment at a time).
4. **As a user**, I can **resume the work I had before** with one action: a **new task** row copying the previous **description** and a **new interval** (start now; duration once stopped).
5. **As a user** who configures MCP, I can have a **trusted assistant** start or stop the timer and switch tasks in line with the same rules as the extension, without extra palette steps.

## UX principles

- Prefer **one primary action** per intent (start / stop / resume / switch).
- **Defaults over forms:** reuse recent **descriptions** from Quick Pick before asking for full input.
- **Visible state:** status bar shows active task and elapsed time at a glance.

## Acceptance criteria

- Flows **start**, **stop**, **switch**, and **resume previous** are reachable via **commands** documented in [ux-commands.md](ux-commands.md).
- Default **keybindings** exist where they do not conflict with common editor bindings (document overrides).
- Stopping persists **`end`** on the active entry; start/switch/resume each persist a **new** `Task` and a **new** running entry with **`start`**; **never** two segments with `end: null` at once.
- Core timer flows require **no** third-party API keys. MCP setup is documented in [mcp.md](mcp.md).
- MCP surface is documented in [mcp.md](mcp.md); shipped tools match extension semantics and persistence rules.
