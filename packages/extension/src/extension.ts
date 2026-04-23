import * as vscode from "vscode";
import { JsonlStore } from "./storage/jsonlStore";
import { hydrateTimerService } from "./timer/timerService";
import { registerCommands } from "./commands/registerCommands";
import { StatusBarController } from "./ui/statusBar";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const store = new JsonlStore(context.globalStorageUri);
  const { service, corrupt } = await hydrateTimerService(store);
  if (corrupt) {
    void vscode.window.showWarningMessage(
      "Time Keeper storage was unreadable or corrupt; started a fresh ledger.",
    );
  }

  const statusBar = new StatusBarController(service);
  context.subscriptions.push(statusBar, service);
  for (const d of registerCommands(service)) {
    context.subscriptions.push(d);
  }
}

export function deactivate(): void {}
