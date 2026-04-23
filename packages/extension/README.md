# Nuveon Time Keeper

**Nuveon Time Keeper** helps you log what you are doing in **Visual Studio Code** or **Cursor** with minimal friction. You work in **segments**: each segment has a **short description**, a **start** time, and an **end** time (or it can still be **running**). Only **one** segment runs at a time.

Your data is stored in the editor’s **global storage** for this extension (not inside your project folders).

---

## Quick start

1. **Start timing** — Press `Ctrl+Shift+;` (Windows/Linux) or `Cmd+Shift+;` (macOS), or click **Nuveon Time Keeper** in the **status bar** (bottom) and choose **Start…**. Pick a recent description or choose **New entry…** and type what you are doing.
2. **Stop** — `Ctrl+Shift+'` / `Cmd+Shift+'`, or use the status bar menu **Stop** while a segment is running.
3. **See everything** — Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`), run **Nuveon Time Keeper: Open summary**, and use the filters to explore past work.

You can change shortcuts under **File → Preferences → Keyboard Shortcuts** and search for `Nuveon Time Keeper`.

---

## Status bar

| State | What you see |
|--------|----------------|
| **Idle** | `Nuveon Time Keeper` with a watch icon. |
| **Running** | Watch icon, your **description** (truncated if long), and a **live** timer (`mm:ss`). |

**Click** the status bar item to open a small menu:

- **Open summary…** — Opens the full summary table (see below).
- **Start…** or **Switch…** — When nothing is running, you can start or (after starting) switch from the same flows as the commands.
- **Stop** — Ends the current segment (when one is running).
- **Resume previous** — When idle, starts a **new** segment with the **same description** as the one you stopped last (handy when you jump back to prior work).

---

## Commands (Command Palette)

| Command | What it does |
|---------|----------------|
| **Nuveon Time Keeper: Start…** | Opens a picker: **recent descriptions** (as templates) or **New entry…** then asks what you are doing. Starts a **new** segment. If something was already running, it is **stopped** first, then the new segment starts. |
| **Nuveon Time Keeper: Stop** | Ends the **current** segment and records the end time. |
| **Nuveon Time Keeper: Switch…** | Same as Start: pick what to do next; the current segment **stops** and a **new** one starts with the new description. |
| **Nuveon Time Keeper: Resume previous** | When **nothing** is running, starts a **new** segment using the **last stopped** description. If a segment is already running, you are asked to stop it first. |
| **Nuveon Time Keeper: Open summary** | Opens the **summary** page in the main editor area (see next section). |
| **Nuveon Time Keeper: Status bar menu** | Same choices as **clicking** the status bar (mostly for rebinding keys). |

---

## Default keyboard shortcuts

| Action | Windows / Linux | macOS |
|--------|-----------------|--------|
| Start (or switch if something runs) | `Ctrl+Shift+;` | `Cmd+Shift+;` |
| Stop | `Ctrl+Shift+'` | `Cmd+Shift+'` |
| Resume previous | `Ctrl+Shift+,` | `Cmd+Shift+,` |

**Switch** is available from the status bar or Command Palette; there is no default key for it alone.

---

## Summary (table and filters)

**Nuveon Time Keeper: Open summary** opens a **table** of every logged **segment** with these columns:

| Column | Meaning |
|--------|---------|
| **Start** | When the segment started (your **local** date and time). |
| **End** | When it ended, or **… running** if it is still open. |
| **Duration** | Length of the segment. **Running** rows show a live duration and a `*` marker. |
| **Description** | The text you entered for that segment. |

**Toolbar filters** (all optional):

- **Description contains** — Show only rows whose description includes the text you type (ignores case).
- **Duration (seconds)** — **Min** and/or **max** length in seconds.
- **Start time** — **Any**, a single **calendar day**, an inclusive **day range**, or **between two local date-times**.
- **End time** — Same modes as start (for finished work, or for “as if it ended now” while still running).
- **Treat running segments as ending “now”** — When checked (default), **end-time** filters can include in-progress segments by comparing against the current time.

The line under the table shows how many rows match the filters and the **total** of their durations.

**Export to CSV** — Click **Export visible rows to CSV…** (under the filters). You choose where to save the file. The file includes **only the rows currently shown** (after filters), with a UTF-8 BOM for Excel. Columns:

| CSV column | Contents |
|------------|----------|
| `segment_id` | Internal id for that segment |
| `start_iso` | Segment start (ISO-8601 UTC) |
| `end_iso` | Segment end, or empty while **running** |
| `duration_seconds` | Decimal seconds (matches the summary at export time) |
| `duration_ms` | Same duration in whole milliseconds |
| `description` | Your description text (quoted in CSV if needed) |
| `running` | `yes` or `no` |

To export **everything**, clear or widen the filters first, then export.

---

## How segments and descriptions work

- Each time you **start** (or **switch**), Nuveon Time Keeper creates a **new** segment and a **new** internal id, even if the **description** matches something you used before.
- **Recent** entries in the picker are **shortcuts**: they copy the old text; they do not “continue” the old row.
- **Resume previous** copies the **last stopped** description into a **new** segment so you can pick up the same kind of work again.

---

## Privacy and data

- Data stays **on your machine** in the editor’s extension storage.
- There is **no** built-in cloud sync or team server in this version.