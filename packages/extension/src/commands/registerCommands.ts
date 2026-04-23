import * as vscode from "vscode";
import { pickSegment } from "./pickTask";
import type { TimerService } from "../timer/timerService";
import type { SummaryPanelController } from "../ui/summaryPanel";
import { runBuildTimesheetText } from "./timesheetText";
import { runSetupMcp } from "./setupMcp";

export function registerCommands(
  context: vscode.ExtensionContext,
  service: TimerService,
  summaryPanel: SummaryPanelController,
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.openSummary", () => {
      summaryPanel.open();
    }),
  );

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.buildTimesheetText", async () => {
      await runBuildTimesheetText(service);
    }),
  );

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.setupMcp", async () => {
      await runSetupMcp(context);
    }),
  );

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.startTask", async () => {
      const seg = await pickSegment(service, "Start or switch work");
      if (!seg?.description.trim()) {
        return;
      }
      await service.startTask(seg.description.trim());
    }),
  );

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.stopTask", async () => {
      const stopped = await service.stopTask();
      if (!stopped) {
        void vscode.window.showInformationMessage("No active segment to stop.");
      }
    }),
  );

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.switchTask", async () => {
      const seg = await pickSegment(service, "Switch to different work");
      if (!seg?.description.trim()) {
        return;
      }
      await service.switchTask(seg.description.trim());
    }),
  );

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.resumePrevious", async () => {
      if (service.getActiveEntry()) {
        void vscode.window.showInformationMessage(
          "A segment is already running. Stop it before resuming the previous one.",
        );
        return;
      }
      const ok = await service.resumePrevious();
      if (!ok) {
        void vscode.window.showInformationMessage("No previous segment to resume.");
      }
    }),
  );

  disposables.push(
    vscode.commands.registerCommand("timeKeeper.statusBarClick", async () => {
      const active = service.getActiveEntry();

      type StatusBarAction =
        | "summary"
        | "timesheet"
        | "setupMcp"
        | "stop"
        | "switch"
        | "resume"
        | "start";
      type ActionPick = vscode.QuickPickItem & { readonly action: StatusBarAction };
      const tail: ActionPick[] = active
        ? [
            { label: "$(debug-stop) Stop", action: "stop" },
            { label: "$(arrow-swap) Switch…", action: "switch" },
          ]
        : [
            { label: "$(play) Start…", action: "start" },
            { label: "$(history) Resume previous", action: "resume" },
          ];
      const items: ActionPick[] = [
        { label: "$(table) Open summary…", action: "summary" },
        { label: "$(file-text) Build timesheet text…", action: "timesheet" },
        { label: "$(server-process) Set up MCP (VS Code or Cursor)…", action: "setupMcp" },
        ...tail,
      ];

      const picked = await vscode.window.showQuickPick<ActionPick>(items, {
        placeHolder: active ? "Nuveon Time Keeper" : "Nuveon Time Keeper — idle",
      });
      if (!picked) {
        return;
      }
      switch (picked.action) {
        case "summary":
          await vscode.commands.executeCommand("timeKeeper.openSummary");
          break;
        case "timesheet":
          await vscode.commands.executeCommand("timeKeeper.buildTimesheetText");
          break;
        case "setupMcp":
          await vscode.commands.executeCommand("timeKeeper.setupMcp");
          break;
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
        default: {
          const _exhaustive: never = picked.action;
          void _exhaustive;
          break;
        }
      }
    }),
  );

  return disposables;
}
