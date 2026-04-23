# Time Keeper extension

VS Code / Cursor extension package (v1 surface for Time Keeper).

## Scripts

From the **repository root** (npm workspaces):

```bash
npm install
npm run compile -w time-keeper
npm run watch -w time-keeper
npm run test -w time-keeper
npm run package -w time-keeper
```

From **this directory**:

```bash
npm install
npm run compile
npm run watch
npm run test
npm run package
```

- **compile** — TypeScript build to `out/`
- **watch** — Rebuild on changes
- **test** — Smoke step (currently runs compile)
- **package** — Produce a `.vsix` via `@vscode/vsce`

## Run in development

Open the **repository root** in VS Code or Cursor, choose **Run Extension: Time Keeper** from Run and Debug, or press **F5**. This uses [`.vscode/launch.json`](../../.vscode/launch.json) and the `compile-time-keeper` preLaunch task.

## Specs

Product and UX documentation: [../../docs/spec/README.md](../../docs/spec/README.md).
