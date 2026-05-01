# Model Context Protocol (MCP) — AI control

## Goal

Expose Time Keeper’s **core timer operations** through an **[MCP](https://modelcontextprotocol.io/) server** so a **user-configured** AI assistant (for example Cursor’s agent) can start, stop, switch, and resume tasks and **read active timer state**, using the same semantics as the IDE extension.

This is **opt-in**: the user adds the server to their MCP configuration; nothing runs or listens until they do.

## Relationship to the extension

- **Behavioral parity:** MCP tools must match the flows in [product.md](product.md) and the command IDs in [ux-commands.md](ux-commands.md) (`timeKeeper.startTask`, `timeKeeper.stopTask`, `timeKeeper.switchTask`, `timeKeeper.resumePrevious`). Natural-language intent stays in the assistant; the server exposes **discrete, idempotent-friendly** operations.
- **Persistence:** The server reads and updates the **same versioned state** as the extension ([architecture.md](architecture.md) — `timeKeeper-state.v1.json` and schema rules). Implementation must avoid corrupting snapshots (reuse the extension’s invariants: no overlapping active intervals, atomic replace where applicable). If two writers can run concurrently (extension UI + MCP), last write wins at the file level; the extension **watches** that snapshot and **reloads** in-memory state so the status bar and summary stay aligned after MCP (or other external) updates.
- **Packaging:** A dedicated workspace package (for example `packages/mcp` or `packages/mcp-server`) is the expected home for the server entrypoint and tool handlers; exact layout follows the repo when added.

## Intended tool surface (v1)

Names are illustrative until implementation ships; each tool should return structured errors the model can interpret (e.g. “already idle”, “no previous task”).

| Concern | Illustrative capability |
|---------|-------------------------|
| Start | Begin timing a named task; if something is running, close that interval first (same as start/switch in UX). |
| Stop | End the active interval; refresh **resume previous** target. |
| Switch | Stop current (if any) and start the named task. |
| Resume | Resume last stopped task when idle; error if already running or no previous. |
| Observe | Return active segment **description**, start time, elapsed summary, and idle/running state. |

Optional later: list recent tasks or entries for richer agent context (still read-only or clearly scoped writes).

## Security and trust

- **Local-first:** Prefer **stdio** MCP or a **localhost-only** transport; do not require cloud credentials for core timer control.
- **No broad filesystem access** beyond the agreed state file path (and any explicit user-configured paths).
- **Secrets:** Timer MCP does not embed STT or cloud API keys; if future tools call external services, follow [AGENTS.md](../../AGENTS.md) secret handling.
- **Telemetry:** Off by default; no silent exfiltration of task descriptions.

## Out of scope (MCP-specific)

- Replacing the extension as the primary UI; MCP complements keyboard/status-bar flows.
- Multi-user or team **sync** via MCP (see [persistence.md](persistence.md) for product direction on sync).
- Granting AI control **without** the user having enabled the MCP server in their client configuration.

## Acceptance notes

- When MCP ships, add the server to contributor docs (how to run locally, Cursor `mcp.json` fragment) beside [packages/extension/README.md](../../packages/extension/README.md).
- Extend [ux-commands.md](ux-commands.md) or this file with **final tool names and JSON schemas** once implemented.
