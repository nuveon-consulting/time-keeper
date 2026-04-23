---
name: time-keeper-extension
description: >-
  VS Code / Cursor extension patterns for Time Keeper: package.json
  contributions, activation, SecretStorage, commands vs Quick Pick vs webview,
  and packaging. Use when editing packages/extension or extension UX.
---

# Time Keeper VS Code extension

## Trigger

- Editing `packages/extension`, `package.json` contributions, or extension entrypoints.
- Adding commands, keybindings, status bar items, or configuration.

## Workflow

1. Prefer **lazy activation**: use `onCommand:` for heavy paths; avoid `*` unless required.
2. Register disposables on `ExtensionContext.subscriptions` so cleanup runs on deactivate.
3. **Secrets** (STT API keys): `context.secrets.store` / `get` / `delete` — never `globalState` for secrets.
4. **Settings** (non-secret): `vscode.workspace.getConfiguration('timeKeeper')` with schema in `package.json` `contributes.configuration`.
5. New commands: add under `contributes.commands`, wire in activation events, document in [docs/spec/ux-commands.md](../../../docs/spec/ux-commands.md).
6. Package with workspace script `npm run package -w nuveon-time-keeper` (see [packages/extension/README.md](../../../packages/extension/README.md)).

## Guardrails

- Default **telemetry off** if telemetry is ever added.
- Do not bundle API keys; users supply keys or use env as documented in [speech-to-text.md](../../../docs/spec/speech-to-text.md).

## Output

- List of touched contribution points (commands, configuration keys, activation events).
