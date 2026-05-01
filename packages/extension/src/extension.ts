import * as vscode from "vscode";
import { JsonlStore, STATE_FILE_NAME } from "./storage/jsonlStore";
import { normalizeAlignmentMinutes } from "./timer/alignment";
import { hydrateTimerService } from "./timer/timerService";
import { registerCommands } from "./commands/registerCommands";
import { StatusBarController } from "./ui/statusBar";
import { SummaryPanelController } from "./ui/summaryPanel";

const EXTERNAL_STATE_RELOAD_DEBOUNCE_MS = 120;

function readWorkspaceAlignmentMinutes(): number {
  const raw = vscode.workspace.getConfiguration("timeKeeper").get<number>("alignmentIntervalMinutes");
  return normalizeAlignmentMinutes(raw);
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const store = new JsonlStore(context.globalStorageUri.fsPath);
  const getAlignmentIntervalMinutes = (): number => readWorkspaceAlignmentMinutes();
  const { service, corrupt } = await hydrateTimerService(store, getAlignmentIntervalMinutes);
  if (corrupt) {
    void vscode.window.showWarningMessage(
      "Nuveon Time Keeper storage was unreadable or corrupt; started a fresh ledger.",
    );
  }

  const stateFilePattern = new vscode.RelativePattern(context.globalStorageUri, STATE_FILE_NAME);
  const stateWatcher = vscode.workspace.createFileSystemWatcher(stateFilePattern);
  let reloadTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleReloadFromDisk = (): void => {
    if (reloadTimer !== undefined) {
      clearTimeout(reloadTimer);
    }
    reloadTimer = setTimeout(() => {
      reloadTimer = undefined;
      void service.reloadFromDisk().catch(() => {
        /* ignore transient read races */
      });
    }, EXTERNAL_STATE_RELOAD_DEBOUNCE_MS);
  };
  stateWatcher.onDidChange(scheduleReloadFromDisk);
  stateWatcher.onDidCreate(scheduleReloadFromDisk);
  stateWatcher.onDidDelete(scheduleReloadFromDisk);

  const statusBar = new StatusBarController(service);
  const summaryPanel = new SummaryPanelController(context.extensionUri, service);
  context.subscriptions.push(
    statusBar,
    service,
    summaryPanel,
    stateWatcher,
    new vscode.Disposable(() => {
      if (reloadTimer !== undefined) {
        clearTimeout(reloadTimer);
      }
    }),
  );
  for (const d of registerCommands(context, service, summaryPanel)) {
    context.subscriptions.push(d);
  }
}

export function deactivate(): void {}
