import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { TIME_KEEPER_GLOBAL_STORAGE_ENV } from "../timeKeeperPaths";

const SERVER_KEY = "nuveon-time-keeper";

/**
 * | Target | File |
 * |--------|------|
 * | VS Code — this repo | `.vscode/mcp.json` (`servers`, VS Code / Copilot MCP shape) |
 * | VS Code — all repos | `%APPDATA%\\Code\\User\\mcp.json` (or macOS/Linux equivalents) |
 * | Cursor — this repo | `.cursor/mcp.json` (`mcpServers`, Cursor docs) |
 * | Cursor — all repos | `~/.cursor/mcp.json` |
 *
 * The server process is always **`node`** on **`out/mcp/index.js` inside the installed extension** (ships in the VSIX), with **`TIME_KEEPER_GLOBAL_STORAGE`** set to `ExtensionContext.globalStorageUri.fsPath` so MCP uses the same ledger as the UI.
 */
type McpSetupTarget = "vscode-workspace" | "vscode-user" | "cursor-workspace" | "cursor-user";

type McpHost = "vscode" | "cursor";
/** `workspace` = repo mcp.json. `user` = editor **user profile** MCP (all workspaces). */
type McpScope = "workspace" | "user";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function readJsonWorkspace(uri: vscode.Uri): Promise<Record<string, unknown>> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const raw = new TextDecoder("utf8").decode(bytes);
    if (!raw.trim()) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function readJsonDisk(filePath: string): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    if (!raw.trim()) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function mergeCursorMcpServers(
  root: Record<string, unknown>,
  server: Record<string, unknown>,
): Record<string, unknown> {
  const prev = isRecord(root.mcpServers) ? root.mcpServers : {};
  return {
    ...root,
    mcpServers: {
      ...prev,
      [SERVER_KEY]: server,
    },
  };
}

/** VS Code MCP uses top-level `servers` (not `mcpServers`). @see https://code.visualstudio.com/docs/copilot/customization/mcp-servers */
function mergeVsCodeMcpServers(
  root: Record<string, unknown>,
  server: Record<string, unknown>,
): Record<string, unknown> {
  const prev = isRecord(root.servers) ? root.servers : {};
  return {
    ...root,
    servers: {
      ...prev,
      [SERVER_KEY]: server,
    },
  };
}

async function fileExistsFs(absPath: string): Promise<boolean> {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

/** Cursor user profile MCP (`~/.cursor/mcp.json`). @see https://cursor.com/docs/mcp */
function cursorGlobalMcpJsonPath(): string {
  return path.join(os.homedir(), ".cursor", "mcp.json");
}

/** VS Code user profile `mcp.json` path (stable vs Insiders from `appName`). In Cursor, `appName` is "Cursor" → we default to stable `Code`. */
function vscodeUserMcpJsonPath(): string {
  const app = vscode.env.appName;
  const codeDir = app.includes("Insiders") ? "Code - Insiders" : "Code";

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", codeDir, "User", "mcp.json");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (!appData) {
      return path.join(os.homedir(), "AppData", "Roaming", codeDir, "User", "mcp.json");
    }
    return path.join(appData, codeDir, "User", "mcp.json");
  }
  return path.join(os.homedir(), ".config", codeDir, "User", "mcp.json");
}

function bundledMcpScriptPath(extensionPath: string): string {
  return path.join(extensionPath, "out", "mcp", "index.js");
}

function cursorBundledMcpEntry(ctx: vscode.ExtensionContext): Record<string, unknown> {
  const script = bundledMcpScriptPath(ctx.extensionPath);
  return {
    command: "node",
    args: [script],
    env: {
      [TIME_KEEPER_GLOBAL_STORAGE_ENV]: ctx.globalStorageUri.fsPath,
    },
  };
}

function vscodeBundledMcpEntry(ctx: vscode.ExtensionContext): Record<string, unknown> {
  const script = bundledMcpScriptPath(ctx.extensionPath);
  return {
    type: "stdio",
    command: "node",
    args: [script],
    env: {
      [TIME_KEEPER_GLOBAL_STORAGE_ENV]: ctx.globalStorageUri.fsPath,
    },
  };
}

async function writeCursorWorkspaceMcp(ctx: vscode.ExtensionContext): Promise<vscode.Uri> {
  const wf = vscode.workspace.workspaceFolders?.[0];
  if (!wf) {
    throw new Error("Open a folder workspace first.");
  }
  const dir = vscode.Uri.joinPath(wf.uri, ".cursor");
  const file = vscode.Uri.joinPath(dir, "mcp.json");
  await vscode.workspace.fs.createDirectory(dir);
  const root = await readJsonWorkspace(file);
  const merged = mergeCursorMcpServers(root, cursorBundledMcpEntry(ctx));
  await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(`${JSON.stringify(merged, null, 2)}\n`));
  return file;
}

async function writeVsCodeWorkspaceMcp(ctx: vscode.ExtensionContext): Promise<vscode.Uri> {
  const wf = vscode.workspace.workspaceFolders?.[0];
  if (!wf) {
    throw new Error("Open a folder workspace first.");
  }
  const dir = vscode.Uri.joinPath(wf.uri, ".vscode");
  const file = vscode.Uri.joinPath(dir, "mcp.json");
  await vscode.workspace.fs.createDirectory(dir);
  const root = await readJsonWorkspace(file);
  const merged = mergeVsCodeMcpServers(root, vscodeBundledMcpEntry(ctx));
  await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(`${JSON.stringify(merged, null, 2)}\n`));
  return file;
}

async function writeCursorGlobalMcp(ctx: vscode.ExtensionContext): Promise<string> {
  const filePath = cursorGlobalMcpJsonPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const root = await readJsonDisk(filePath);
  const merged = mergeCursorMcpServers(root, cursorBundledMcpEntry(ctx));
  await fs.writeFile(filePath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return filePath;
}

async function writeVsCodeUserMcp(ctx: vscode.ExtensionContext): Promise<string> {
  const filePath = vscodeUserMcpJsonPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const root = await readJsonDisk(filePath);
  const merged = mergeVsCodeMcpServers(root, vscodeBundledMcpEntry(ctx));
  await fs.writeFile(filePath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return filePath;
}

async function openMcpSettingsUi(): Promise<void> {
  const attempts: readonly (readonly [string, string])[] = [
    ["workbench.action.openSettings", "Model Context Protocol"],
    ["workbench.action.openSettings", "mcp"],
  ];
  for (const [command, query] of attempts) {
    try {
      await vscode.commands.executeCommand(command, query);
      return;
    } catch {
      /* try next */
    }
  }
}

function combineTarget(host: McpHost, scope: McpScope): McpSetupTarget {
  if (host === "vscode" && scope === "workspace") {
    return "vscode-workspace";
  }
  if (host === "vscode" && scope === "user") {
    return "vscode-user";
  }
  if (host === "cursor" && scope === "workspace") {
    return "cursor-workspace";
  }
  return "cursor-user";
}

async function pickMcpHost(): Promise<McpHost | undefined> {
  type H = vscode.QuickPickItem & { readonly host: McpHost };
  const picked = await vscode.window.showQuickPick<H>(
    [
      {
        label: "VS Code",
        description: "VS Code / GitHub Copilot MCP (`servers` in mcp.json)",
        host: "vscode",
      },
      {
        label: "Cursor",
        description: "Cursor MCP (`mcpServers` in mcp.json)",
        host: "cursor",
      },
    ],
    { title: "Setup MCP", placeHolder: "Choose an editor" },
  );
  return picked?.host;
}

async function pickMcpScope(host: McpHost): Promise<McpScope | undefined> {
  type S = vscode.QuickPickItem & { readonly scope: McpScope };
  const editor = host === "vscode" ? "VS Code" : "Cursor";
  const items: S[] =
    host === "vscode"
      ? [
          {
            label: "This workspace",
            description: ".vscode/mcp.json",
            detail: "MCP for this repository only.",
            scope: "workspace",
          },
          {
            label: "All workspaces",
            description: "User profile MCP configuration",
            detail: "Updates …/Code/User/mcp.json in your VS Code user profile. Every window; uses the installed extension’s bundled MCP server.",
            scope: "user",
          },
        ]
      : [
          {
            label: "This workspace",
            description: ".cursor/mcp.json",
            detail: "MCP for this repository only.",
            scope: "workspace",
          },
          {
            label: "All workspaces",
            description: "User profile MCP configuration",
            detail: "Updates ~/.cursor/mcp.json (Cursor user profile). Every workspace; uses the installed extension’s bundled MCP server.",
            scope: "user",
          },
        ];

  const picked = await vscode.window.showQuickPick<S>(items, {
    title: `Setup MCP — ${editor}`,
    placeHolder: "This workspace, or user profile for all workspaces",
  });
  return picked?.scope;
}

async function pickMcpSetupTarget(): Promise<McpSetupTarget | undefined> {
  const host = await pickMcpHost();
  if (!host) {
    return undefined;
  }
  const scope = await pickMcpScope(host);
  if (!scope) {
    return undefined;
  }
  return combineTarget(host, scope);
}

async function openMcpFile(uri: vscode.Uri): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false });
}

/** When the bundled MCP script is missing (broken install), append a short note to the setup toast. */
async function mcpBundleMissingSuffix(extensionPath: string): Promise<string> {
  const entryPath = bundledMcpScriptPath(extensionPath);
  if (await fileExistsFs(entryPath)) {
    return "";
  }
  return " The bundled MCP script is missing from this extension install; reinstall the extension.";
}

export async function runSetupMcp(context: vscode.ExtensionContext): Promise<void> {
  const target = await pickMcpSetupTarget();
  if (!target) {
    return;
  }
  try {
    const built = await mcpBundleMissingSuffix(context.extensionPath);

    if (target === "vscode-workspace") {
      const file = await writeVsCodeWorkspaceMcp(context);
      await openMcpFile(file);
      void vscode.window.showInformationMessage(
        `Added "${SERVER_KEY}" to this repository's .vscode/mcp.json (VS Code). Reload the window or restart MCP if tools do not appear.${built}`,
      );
      return;
    }
    if (target === "cursor-workspace") {
      const file = await writeCursorWorkspaceMcp(context);
      await openMcpFile(file);
      void vscode.window.showInformationMessage(
        `Added "${SERVER_KEY}" to this repository's .cursor/mcp.json (Cursor). Reload the window or restart MCP if tools do not appear.${built}`,
      );
      return;
    }

    if (target === "vscode-user") {
      const filePath = await writeVsCodeUserMcp(context);
      await openMcpSettingsUi();
      const openJson = "Open user profile mcp.json";
      const picked = await vscode.window.showInformationMessage(
        `Updated VS Code user profile MCP configuration (${filePath}). Reload the window or restart MCP if tools do not appear.${built}`,
        openJson,
      );
      if (picked === openJson) {
        await openMcpFile(vscode.Uri.file(filePath));
      }
      return;
    }

    if (target === "cursor-user") {
      const filePath = await writeCursorGlobalMcp(context);
      await openMcpSettingsUi();
      const openJson = "Open user profile mcp.json";
      const picked = await vscode.window.showInformationMessage(
        `Updated Cursor user profile MCP configuration (${filePath}). Reload the window or restart MCP if tools do not appear.${built}`,
        openJson,
      );
      if (picked === openJson) {
        await openMcpFile(vscode.Uri.file(filePath));
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    void vscode.window.showErrorMessage(`Nuveon Time Keeper MCP setup failed: ${msg}`);
  }
}
