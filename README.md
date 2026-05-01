# Time Keeper

**Time Keeper** is a low-friction time tracker for developers. Version 1 ships as a **Visual Studio Code** and **Cursor** extension (cross-platform): start, stop, and resume work segments with minimal interaction, optional push-to-talk notes, and a summary view with filters and CSV export.

For **installing and using** the extension (commands, shortcuts, summary, privacy), see **[packages/extension/README.md](packages/extension/README.md)**.

## Repository layout

| Path | Purpose |
|------|---------|
| [`packages/extension`](packages/extension) | VS Code / Cursor extension (v1) |
| `packages/core` *(planned)* | Shared domain and persistence when extracted |
| `apps/desktop` *(planned)* | Future optional native shell (e.g. Tauri) |
| [`docs/spec`](docs/spec) | Product and technical specifications |
| [`.cursor/skills`](.cursor/skills) | Project-local Cursor agent skills |

## Specifications

Authoritative behavior, UX, architecture, speech, MCP, and persistence notes live under **[docs/spec](docs/spec/README.md)**.

## Developing the extension

The extension is **not** hoisted in an npm workspace (`vsce` packaging expects a normal `node_modules` tree under `packages/extension`). Install and run scripts from that package:

```bash
npm run install-extension
npm run compile --prefix packages/extension
npm run test --prefix packages/extension
npm run watch --prefix packages/extension
npm run package --prefix packages/extension
```

Alternatively, `cd packages/extension` after install and use `npm run compile`, `npm run test`, etc., there.

Contributor-oriented conventions and entry points: **[AGENTS.md](AGENTS.md)**.

## License

This repository is proprietary. See **[LICENSE.md](LICENSE.md)**.
