# Time Keeper — agent instructions

## Project identity

Time Keeper is a **low-friction time tracker** for developers, shipped as a **Cursor / VS Code extension** (cross-platform).

Goals: start, stop, switch, and resume tasks with minimal interaction; optional MCP-assisted control when the user configures MCP.

## Repository layout

| Path | Purpose |
|------|---------|
| `packages/extension` | VS Code / Cursor extension |
| `docs/spec/` | Product and technical specifications |
| `.cursor/skills/` | Project-local Cursor agent skills |

## Non-negotiables

- **Secrets:** API keys and tokens live in **VS Code Secret Storage** or environment variables configured by the user — never committed.
- **Telemetry:** the extension does not ship analytics or telemetry.

## Where truth lives

- Product, UX, architecture, **MCP (AI timer control)**, and **persistence** context: **[docs/spec/](docs/spec/)** — see [docs/spec/persistence.md](docs/spec/persistence.md) for storage and sync discussion; [docs/spec/mcp.md](docs/spec/mcp.md) for MCP scope and guardrails.
- When you change user-visible behavior, persistence, or commands, **update the relevant spec in the same change** (or follow up immediately if split PRs are unavoidable).

## Code and change discipline

- Prefer **TypeScript** with **strict** settings in extension code (enabled in `packages/extension/tsconfig.json`).
- Match existing patterns; avoid unrelated refactors.
- New commands and keybindings must be declared in `packages/extension/package.json` and documented in [docs/spec/ux-commands.md](docs/spec/ux-commands.md).
- **`packages/extension/CHANGELOG.md`:** update only when **`package.json` `"version"` is finalized** for the release commit (changelog headings must match that semver)—not on every mid-flight code change. See [.cursor/skills/time-keeper-extension-changelog/SKILL.md](.cursor/skills/time-keeper-extension-changelog/SKILL.md).

## Build, test, and package

The extension is **not** an npm workspace member (vsce cannot package hoisted/symlinked `node_modules` reliably). Install and run scripts **from `packages/extension`**:

```bash
npm install --prefix packages/extension
npm run compile --prefix packages/extension
npm run test --prefix packages/extension
npm run watch --prefix packages/extension
npm run package --prefix packages/extension
```

Or: `npm run install-extension` at the repo root, then `cd packages/extension` and use `npm run compile` / `npm run package` there.

Extension details: [packages/extension/README.md](packages/extension/README.md).

## Contribution entry points

- Extension manifest and contributions: [packages/extension/package.json](packages/extension/package.json)
- Activation and command registration: [packages/extension/src/extension.ts](packages/extension/src/extension.ts)
- Compiled output: `packages/extension/out/` (generated; do not edit by hand)

## Definition of Done (features)

- [ ] User-facing behavior matches [docs/spec/product.md](docs/spec/product.md) / [ux-commands.md](docs/spec/ux-commands.md); MCP behavior matches [docs/spec/mcp.md](docs/spec/mcp.md) when applicable.
- [ ] Commands registered with stable IDs; defaults documented.
- [ ] No secrets in repo or default logs.
- [ ] `npm run compile --prefix packages/extension` (or `cd packages/extension && npm run compile`) succeeds.
