# Time Keeper specifications

Authoritative product and technical notes for **Nuveon Time Keeper**, the VS Code / Cursor extension in [`packages/extension`](../../packages/extension).

## Index

| Document | Purpose |
|----------|---------|
| [product.md](product.md) | Problem, personas, scope, user stories, UX principles |
| [ux-commands.md](ux-commands.md) | Commands, keybindings, status bar |
| [architecture.md](architecture.md) | Extension structure, state, persistence |
| [persistence.md](persistence.md) | Storage design context (shipped store: see architecture) |
| [mcp.md](mcp.md) | Bundled MCP server, tools, persistence, security |

## Glossary

| Term | Meaning |
|------|---------|
| **Task** | One **description** string per row (each segment is a new task id); used for labels and aggregation. |
| **Time entry** | A contiguous interval with **start** and **end** timestamps on a task; **duration** is `end − start` (or unset while running). |
| **Active timer** | The extension’s notion of a running clock tied to the current task (or idle). |
| **Session** | Optional grouping (e.g. workday); not used in the current data model. |
| **MCP** | [Model Context Protocol](https://modelcontextprotocol.io/) server exposing timer tools to user-configured AI clients. |

## Conventions

- Specs are **markdown**; keep them versioned with code.
- When implementation diverges, **update the spec** or file a tracked correction.
