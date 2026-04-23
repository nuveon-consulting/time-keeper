import * as vscode from "vscode";
import { pickSegment } from "./pickTask";
import type { TimerService } from "../timer/timerService";
export function registerCommands(service: TimerService): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.startTask", async () => {
      const seg = await pickSegment(service, "Start or switch task");
      if (!seg?.title.trim()) {
        return;
      }
      await service.startTask(seg.title.trim(), seg.description);
    }),
  );

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.stopTask", async () => {
      const stopped = await service.stopTask();
      if (!stopped) {
        void vscode.window.showInformationMessage("No active task to stop.");
      }
    }),
  );

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.switchTask", async () => {
      const seg = await pickSegment(service, "Switch to task");
      if (!seg?.title.trim()) {
        return;
      }
      await service.switchTask(seg.title.trim(), seg.description);
    }),
  );

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.resumePrevious", async () => {
      if (service.getActiveEntry()) {
        void vscode.window.showInformationMessage(
          "A task is already running. Stop it before resuming the previous task.",
        );
        return;
      }
      const ok = await service.resumePrevious();
      if (!ok) {
        void vscode.window.showInformationMessage("No previous task to resume.");
      }
    }),
  );

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.statusBarClick", async () => {
      const active = service.getActiveEntry();

      type ActionPick = vscode.QuickPickItem & { readonly action: string };
      const items: ActionPick[] = active
        ? [
            { label: "$(debug-stop) Stop task", action: "stop" },
            { label: "$(arrow-swap) Switch task…", action: "switch" },
          ]
        : [
            { label: "$(play) Start task…", action: "start" },
            { label: "$(history) Resume previous task", action: "resume" },
          ];

      const picked = await vscode.window.showQuickPick<ActionPick>(items, {
        placeHolder: active ? "Time Keeper" : "Time Keeper — idle",
      });
      if (!picked) {
        return;
      }
      switch (picked.action) {
        case "stop":
          await vscode.commands.executeCommand("timeKeeper.stopTask");
          break;
        case "switch":
          await vscode.commands.executeCommand("timeKeeper.switchTask");
          break;
        case "resume":
          await vscode.commands.executeCommand("timeKeeper.resumePrevious");
          break;
        case "start":
          await vscode.commands.executeCommand("timeKeeper.startTask");
          break;
        default:
          break;
      }
    }),
  );

  return disposables;
}
