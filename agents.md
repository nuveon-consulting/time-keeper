# Time Keeper — agent instructions

## Project identity

Time Keeper is a **low-friction time tracker** for developers. **v1 ships as a Cursor/VS Code extension** (cross-platform). Optional native macOS/Windows shell (tray, global shortcuts) is deferred; see [docs/spec/roadmap-native.md](docs/spec/roadmap-native.md).

Goals: start, stop, and resume tasks with minimal interaction; optional **push-to-talk** speech for task notes.

## Repository layout (intended)

| Path | Purpose |
|------|---------|
| `packages/extension` | VS Code / Cursor extension (v1) |
| `packages/core` | Shared domain + persistence (when extracted) |
| `apps/desktop` | Future Tauri shell (optional) |
| `docs/spec/` | Product and technical specifications |
| `.cursor/skills/` | Project-local Cursor agent skills |

## Non-negotiables

- **No always-on microphone.** Capture only on explicit user action (command, keybinding, push-to-talk).
- **Secrets:** API keys and tokens live in **VS Code Secret Storage** or environment variables configured by the user — never committed.
- **No raw audio or transcripts in logs** that could be copied into issues or commits by default; redact before sharing diagnostics.
- **Telemetry off by default** if any analytics are added later.

## Where truth lives

- Product, UX, architecture, STT, **MCP (AI timer control)**, and **persistence tiers** (embedded store vs optional local DB vs remote sync): **[docs/spec/](docs/spec/)** — see [docs/spec/persistence.md](docs/spec/persistence.md) for database and sync considerations; [docs/spec/mcp.md](docs/spec/mcp.md) for MCP scope and guardrails.
- When you change user-visible behavior, persistence, or commands, **update the relevant spec in the same change** (or follow up immediately if split PRs are unavoidable).

## Code and change discipline

- Prefer **TypeScript** with **strict** settings in extension code once enabled.
- Match existing patterns; avoid unrelated refactors.
- New commands and keybindings must be declared in `packages/extension/package.json` and documented in [docs/spec/ux-commands.md](docs/spec/ux-commands.md).

## Build, test, and package

From repository root (npm workspaces):

```bash
npm install
npm run compile -w nuveon-time-keeper
npm run test -w nuveon-time-keeper
npm run watch -w nuveon-time-keeper
npm run package -w nuveon-time-keeper
```

Extension details: [packages/extension/README.md](packages/extension/README.md).

## Contribution entry points

- Extension manifest and contributions: [packages/extension/package.json](packages/extension/package.json)
- Activation and command registration: [packages/extension/src/extension.ts](packages/extension/src/extension.ts)
- Compiled output: `packages/extension/out/` (generated; do not edit by hand)

## Definition of Done (features)

- [ ] User-facing behavior matches [docs/spec/product.md](docs/spec/product.md) / [ux-commands.md](docs/spec/ux-commands.md); MCP behavior matches [docs/spec/mcp.md](docs/spec/mcp.md) when applicable.
- [ ] Commands registered with stable IDs; defaults documented.
- [ ] No secrets or raw audio in repo or default logs.
- [ ] `npm run compile -w nuveon-time-keeper` succeeds.
