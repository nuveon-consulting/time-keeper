# Roadmap: native desktop shell

## Motivation

Some users want **menu bar / system tray** access, **global shortcuts** outside the IDE, or a **minimal overlay** when not focused in the editor. This is **not v1**; the extension remains the first shipping surface.

## Target approach (draft)

- **Tauri 2** app for macOS and Windows: small footprint, tray support, global hotkeys.
- **Shared core:** extract timer, task model, and persistence ports to `packages/core` (TypeScript) consumed by:
  - `packages/extension` (via bundling or npm workspace dependency)
  - `apps/desktop` (Tauri front-end or Rust-side IPC — decide when starting native work)

## Boundaries

| Concern | Extension (v1) | Native (future) |
|---------|----------------|-----------------|
| Primary UI | Commands, status bar, Quick Pick | Tray menu, optional compact window |
| Global shortcuts | Limited to when IDE focused | OS-wide hotkeys |
| Storage | `globalStorageUri` | App data dir; optional sync/export same format as extension |

## IPC and packaging

- Define a **stable file or SQLite schema** for time entries so extension and desktop could share data later. For **optional local PostgreSQL/MongoDB** or **remote sync**, see [persistence.md](persistence.md).
- Avoid duplicating STT logic: same provider interface; native app may reuse TS in webview or call Rust HTTP client.

## Exit criteria before starting native work

- [ ] Task model and persistence format stable in extension for several weeks of dogfooding.
- [ ] Clear answer to “single source of truth” for storage (extension vs shared file).
