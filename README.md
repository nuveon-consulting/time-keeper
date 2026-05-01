# Time Keeper

**Time Keeper** (published as **Nuveon Time Keeper**) is a low-friction time tracker for **Visual Studio Code** and **Cursor**. It records **segments**: each has a short **description**, **start** and **end** times (or **running** until stopped). Only one segment runs at a time. The **summary** view supports filters and **CSV export**. Optional **alignment interval** (minutes, in settings) adds **rounded** start/end for finished segments on a fixed UTC minute grid—start rounds down, end rounds up—so reported blocks **never fall short** of real duration; that drives timesheet-by-day text and optional aligned columns when enabled. An MCP server ships with the extension for editor-assisted timer control when configured.

For **installing and using** the extension (commands, shortcuts, summary, privacy), see **[packages/extension/README.md](packages/extension/README.md)**.

## Repository layout

| Path | Purpose |
|------|---------|
| [`packages/extension`](packages/extension) | VS Code / Cursor extension (commands, UI, persistence, bundled MCP entrypoint) |
| [`docs/spec`](docs/spec) | Product and technical specifications |
| [`.cursor/skills`](.cursor/skills) | Project-local Cursor agent skills |

## Specifications

Behavior, UX, architecture, MCP, and persistence notes live under **[docs/spec](docs/spec/README.md)**.

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
