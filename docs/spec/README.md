# Time Keeper specifications

Authoritative product and technical notes for Time Keeper. **v1** targets a **Cursor/VS Code extension**; a native desktop shell is documented as a later phase.

## Index

| Document | Purpose |
|----------|---------|
| [product.md](product.md) | Problem, personas, v1 stories, UX principles |
| [ux-commands.md](ux-commands.md) | Commands, keybindings, status bar, speech grammar |
| [architecture.md](architecture.md) | Extension structure, state, persistence |
| [persistence.md](persistence.md) | Storage tiers, optional local DB, remote sync |
| [speech-to-text.md](speech-to-text.md) | STT providers, capture model, secrets, failures |
| [mcp.md](mcp.md) | MCP server for AI-assisted timer control, tools, persistence, security |
| [roadmap-native.md](roadmap-native.md) | Deferred macOS/Windows tray app and shared core |

## Glossary

| Term | Meaning |
|------|---------|
| **Task** | Named unit of work the user tracks (may include description or tags). |
| **Time entry** | A contiguous interval with **start** and **end** timestamps on a task; **duration** is `end − start` (or unset while running). |
| **Active timer** | The extension’s notion of a running clock tied to the current task (or idle). |
| **Session** | Optional grouping (e.g. workday); may be inferred later for reporting. |
| **MCP** | [Model Context Protocol](https://modelcontextprotocol.io/) server exposing timer tools to user-configured AI clients. |

## Conventions

- Specs are **markdown**; keep them versioned with code.
- When implementation diverges, **update the spec** or file a tracked correction.
