# Model Context Protocol (MCP) — AI control

## Goal

Expose Time Keeper’s **timer operations** through an **[MCP](https://modelcontextprotocol.io/) server** so a **user-configured** AI assistant (for example Cursor’s agent) can start, stop, switch, and resume tasks and **read active timer state**, using the same semantics as the IDE extension.

This is **opt-in**: the user adds the server to their MCP configuration; the stdio process does not start until the editor launches it.

## Relationship to the extension

- **Behavioral parity:** MCP tools match the flows in [product.md](product.md) and the command IDs in [ux-commands.md](ux-commands.md) (`timeKeeper.startTask`, `timeKeeper.stopTask`, `timeKeeper.switchTask`, `timeKeeper.resumePrevious`). Natural-language intent stays in the assistant; the server exposes **discrete** operations.
- **Persistence:** The server reads and updates the **same versioned state** as the extension ([architecture.md](architecture.md) — `time-keeper-state.v1.json` and schema rules). Implementation avoids corrupting snapshots (same invariants: no overlapping active intervals, atomic replace). If two writers can run concurrently (extension UI + MCP), last write wins at the file level; the extension **reloads** persisted state so the status bar and summary stay aligned after MCP updates.
- **Alignment interval:** The stdio MCP process does not read VS Code settings. To compute the same **`alignedStart` / `alignedDurationMs`** fields as `timeKeeper.alignmentIntervalMinutes` when MCP closes segments, set optional **`TIME_KEEPER_ALIGNMENT_INTERVAL_MINUTES`** (integer minutes, 1–1440). The extension command **Nuveon Time Keeper: Set up MCP** merges this env when the workspace setting is &gt; 0 until you edit settings or MCP config separately.
- **Packaging:** The server entrypoint is **`packages/extension/out/mcp/index.js`**, built from [`packages/extension/src/mcp/index.ts`](../../packages/extension/src/mcp/index.ts) and included in the VSIX. **Nuveon Time Keeper: Set up MCP** writes `mcp.json` entries that run **`node`** on that path with **`TIME_KEEPER_GLOBAL_STORAGE`** set to the extension’s `globalStorageUri` so MCP and the UI share one ledger.

## Shipped tools (stdio)

| Tool | Role |
|------|------|
| `timeKeeper_get_state` | Returns running vs idle, active task/segment (if any), and last stopped task info. |
| `timeKeeper_start_task` | Start timing a task; closes any running segment first (same as extension start). |
| `timeKeeper_stop_task` | Stop the active segment; updates last-stopped for resume. |
| `timeKeeper_switch_task` | Stop current (if any) and start the named task. |
| `timeKeeper_resume_previous` | When idle, start a new segment with the last stopped description; error text if already running or no previous segment. |

Tool handlers use the same `TimerEngine` and `JsonlStore` as the extension host.

## Security and trust

- **Local-first:** **stdio** MCP; no network port opened by the server for core timer control.
- **No broad filesystem access** beyond the persisted state directory supplied via **`TIME_KEEPER_GLOBAL_STORAGE`** (written by **Set up MCP**).
- **Secrets:** Core timer control needs no API keys; follow [AGENTS.md](../../AGENTS.md) for any optional third-party integrations.

## Out of scope (MCP-specific)

- Replacing the extension as the primary UI; MCP complements keyboard/status-bar flows.
- Multi-user or team **sync** via MCP (see [persistence.md](persistence.md) for storage context).
- Granting AI control **without** the user having enabled the MCP server in their client configuration.

## Documentation

- End-user setup is covered by **Nuveon Time Keeper: Set up MCP** and [packages/extension/README.md](../../packages/extension/README.md).
- Command IDs for parity checks remain in [ux-commands.md](ux-commands.md).
