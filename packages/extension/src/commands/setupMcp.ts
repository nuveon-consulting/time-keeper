import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";

const SERVER_KEY = "nuveon-time-keeper";

/** Local = project `.cursor/mcp.json`. Global = user `~/.cursor/mcp.json`. */
type McpFileTarget = "local" | "global";

type McpRoot = {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseMcpRoot(raw: string): McpRoot {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    throw new Error("MCP config must be a JSON object.");
  }
  return parsed as McpRoot;
}

async function readMcpRootFromWorkspace(uri: vscode.Uri): Promise<McpRoot> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const raw = new TextDecoder("utf8").decode(bytes);
    if (!raw.trim()) {
      return {};
    }
    return parseMcpRoot(raw);
  } catch {
    return {};
  }
}

async function readMcpRootFromDisk(filePath: string): Promise<McpRoot> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    if (!raw.trim()) {
      return {};
    }
    return parseMcpRoot(raw);
  } catch {
    return {};
  }
}

function mergeServer(root: McpRoot, serverConfig: Record<string, unknown>): McpRoot {
  const prevServers = isRecord(root.mcpServers) ? root.mcpServers : {};
  return {
    ...root,
    mcpServers: {
      ...prevServers,
      [SERVER_KEY]: serverConfig,
    },
  };
}

function workspaceServerConfig(): Record<string, unknown> {
  return {
    command: "node",
    args: ["${workspaceFolder}/packages/mcp/dist/index.js"],
    cwd: "${workspaceFolder}",
  };
}

async function writeWorkspaceMcp(): Promise<vscode.Uri> {
  const wf = vscode.workspace.workspaceFolders?.[0];
  if (!wf) {
    throw new Error("Open a folder workspace first.");
  }
  const dir = vscode.Uri.joinPath(wf.uri, ".cursor");
  const file = vscode.Uri.joinPath(dir, "mcp.json");
  await vscode.workspace.fs.createDirectory(dir);
  const root = await readMcpRootFromWorkspace(file);
  const merged = mergeServer(root, workspaceServerConfig());
  await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(`${JSON.stringify(merged, null, 2)}\n`));
  return file;
}

async function pickRepoRootForUserMcp(): Promise<string | undefined> {
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Select repository root",
    title: "Nuveon Time Keeper MCP — repository root",
    defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
  });
  if (!picked?.[0]) {
    return undefined;
  }
  return picked[0].fsPath;
}

function userServerConfig(repoRoot: string): Record<string, unknown> {
  const entry = path.join(repoRoot, "packages", "mcp", "dist", "index.js");
  return {
    command: "node",
    args: [entry],
    cwd: repoRoot,
  };
}

async function writeUserMcp(repoRoot: string): Promise<string> {
  const cursorDir = path.join(os.homedir(), ".cursor");
  await fs.mkdir(cursorDir, { recursive: true });
  const filePath = path.join(cursorDir, "mcp.json");
  const root = await readMcpRootFromDisk(filePath);
  const merged = mergeServer(root, userServerConfig(repoRoot));
  await fs.writeFile(filePath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return filePath;
}

async function pickTarget(): Promise<McpFileTarget | undefined> {
  type Pick = vscode.QuickPickItem & { readonly target: McpFileTarget };
  const choice = await vscode.window.showQuickPick<Pick>(
    [
      {
        label: "$(folder) Local MCP",
        description: ".cursor/mcp.json in this workspace — only this folder",
        detail: "Uses ${workspaceFolder} for the server path. Good to commit for a shared team setup.",
        target: "local",
      },
      {
        label: "$(globe) Global MCP",
        description: "~/.cursor/mcp.json — applies everywhere in Cursor",
        detail: "You pick your time-keeper clone; absolute paths are written into your user config.",
        target: "global",
      },
    ],
    {
      title: "Nuveon Time Keeper — MCP scope",
      placeHolder: "Use local for this repo only, or global for all projects",
    },
  );
  return choice?.target;
}

async function openMcpFile(uri: vscode.Uri): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false });
}

export async function runSetupMcp(): Promise<void> {
  const target = await pickTarget();
  if (!target) {
    return;
  }
  try {
    if (target === "local") {
      const file = await writeWorkspaceMcp();
      await openMcpFile(file);
      void vscode.window.showInformationMessage(
        `Merged "${SERVER_KEY}" into local .cursor/mcp.json. Reload the window or restart MCP if tools do not appear.`,
      );
      return;
    }
    const repoRoot = await pickRepoRootForUserMcp();
    if (!repoRoot) {
      return;
    }
    const entryPath = path.join(repoRoot, "packages", "mcp", "dist", "index.js");
    try {
      await fs.access(entryPath);
    } catch {
      void vscode.window.showWarningMessage(
        `No file at packages/mcp/dist/index.js yet. Config was still written; build or add the MCP package when it exists.`,
      );
    }
    const filePath = await writeUserMcp(repoRoot);
    await openMcpFile(vscode.Uri.file(filePath));
    void vscode.window.showInformationMessage(
      `Merged "${SERVER_KEY}" into ~/.cursor/mcp.json. Reload the window or restart MCP if tools do not appear.`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    void vscode.window.showErrorMessage(`Nuveon Time Keeper MCP setup failed: ${msg}`);
  }
}
