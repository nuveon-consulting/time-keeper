# Architecture

## v1 component

| Piece | Responsibility |
|-------|----------------|
| `packages/extension` | VS Code / Cursor extension: commands, UI, STT client, persistence adapter |
| `packages/mcp` (or `packages/mcp-server`, TBD) | MCP server: AI-facing tools for timer control + state, same persistence contract as extension ([mcp.md](mcp.md)) |
| (future) `packages/core` | Shared task/timer logic and types for extension + native shell |
| (future) `apps/desktop` | Tauri tray / global shortcuts |

## Activation

- **`onStartupFinished`** is used so the **status bar** is available without running a command first (small extension footprint).
- **`onCommand:*`** entries are also listed so command-only activation remains documented and tooling can discover them.

## Timer state machine

```mermaid
stateDiagram_v2
  [*] --> Idle
  Idle --> Running: startTask
  Running --> Idle: stopTask
  Idle --> Running: resumePrevious
  Running --> Running: switchTask
```

- **`switchTask` / `startTask`:** close the running `TimeEntry` (`end = now`), then append a **new `Task`** (new UUID) and a **new `TimeEntry`** with `start = now`, `end = null`. No concurrent open segments; each segment is an independent start/stop interval.
- **`resumePrevious`** (idle only): creates a **new `Task`** (`id` = new UUID) copying **title and description** from the **last stopped** task snapshot, then appends a **new `TimeEntry`** with `start = now`, `end = null`. Each **completed** segment has **duration** = `Date.parse(end) - Date.parse(start)` (see `timeEntryDurationMs` in extension types). Edge cases: no `lastStopped` → no-op; missing `Task` row still resumes from `lastStopped.title` / optional `description` on disk.

## Clock semantics

- **Elapsed display while running:** prefer monotonic time sources to avoid skew from system sleep adjustments mid-interval.
- **Persisted boundaries:** store **UTC or local ISO-8601** start/end for reporting; document timezone handling in export (future).

## Persistence (v1 — implemented)

**Chosen format:** single versioned JSON snapshot **`time-keeper-state.v1.json`** under `ExtensionContext.globalStorageUri`, written with **temp file + rename** for atomic replace.

- **Schema** (`PersistedState`): `version: 1`, `tasks` map (`id` → `Task` with `title` / optional `description`), `entries` array (`TimeEntry` with `start`, `end: null` while running), `lastStopped` (`taskId`, `title`, optional `description`) for **resume previous** (new task id + new entry each resume).
- **Module:** [`packages/extension/src/storage/jsonlStore.ts`](../../packages/extension/src/storage/jsonlStore.ts) (`JsonlStore` class — name retained from planning; implementation is snapshot JSON, not line-delimited JSONL).

**Alternatives for later:** JSONL append-only or **SQLite** ([persistence.md](persistence.md)) if query/reporting needs grow.

Store location remains **global storage**, not the workspace, unless an explicit “project timesheet” mode is added later.

**Local PostgreSQL / MongoDB** and **remote synchronization** are **not v1 requirements**; they are optional evolutions (local sidecar service + sync worker, or direct extension-to-API). See [persistence.md](persistence.md) for tradeoffs, diagrams, and sync patterns.

## STT

- See [speech-to-text.md](speech-to-text.md). Extension hosts HTTP client to cloud STT; no long-lived local server required for v1.

## Extension module layout (suggested)

Keep files small and testable:

- `extension.ts` — activate/deactivate wiring
- `commands/*` — command handlers
- `timer/*` — state machine + persistence port
- `storage/jsonlStore.ts` — load/save persisted state
- `speech/*` — capture + provider adapter (stub README only)
- `ui/statusBar.ts` — status bar item(s)

Adjust names to match implementation.

## MCP (AI control)

See [mcp.md](mcp.md). The MCP server is a **separate entrypoint** from the extension host but must honor the same **timer state machine** and **persistence schema** so assistants and the IDE stay consistent.
