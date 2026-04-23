import * as vscode from "vscode";
import { JsonlStore } from "./storage/jsonlStore";
import { hydrateTimerService } from "./timer/timerService";
import { registerCommands } from "./commands/registerCommands";
import { StatusBarController } from "./ui/statusBar";
import { SummaryPanelController } from "./ui/summaryPanel";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const store = new JsonlStore(context.globalStorageUri.fsPath);
  const { service, corrupt } = await hydrateTimerService(store);
  if (corrupt) {
    void vscode.window.showWarningMessage(
      "Nuveon Time Keeper storage was unreadable or corrupt; started a fresh ledger.",
    );
  }

  const statusBar = new StatusBarController(service);
  const summaryPanel = new SummaryPanelController(context.extensionUri, service);
  context.subscriptions.push(statusBar, service, summaryPanel);
  for (const d of registerCommands(context, service, summaryPanel)) {
    context.subscriptions.push(d);
  }
}

export function deactivate(): void {}
