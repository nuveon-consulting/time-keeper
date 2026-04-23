import * as vscode from "vscode";
import type { Task } from "../types";
import type { TimerService } from "../timer/timerService";

const newTaskItem: vscode.QuickPickItem = {
  label: "$(add) New entry…",
  description: "Describe what you are doing",
  alwaysShow: true,
};

export type SegmentPickResult = {
  description: string;
};

type PickItem = vscode.QuickPickItem & { fromTask?: Task };

function truncate(s: string, max: number): string {
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max - 1)}…`;
}

/**
 * Picks a description for a **new work segment**. Recent rows are templates only (new task id each time).
 */
export async function pickSegment(
  service: TimerService,
  placeHolder: string,
): Promise<SegmentPickResult | undefined> {
  const recent = service.listRecentTasks(12);
  const recentItems: PickItem[] = recent.map((t) => ({
    label: truncate(t.description, 72),
    fromTask: t,
  }));

  const picked = await vscode.window.showQuickPick<PickItem>(
    [newTaskItem as PickItem, ...recentItems],
    { placeHolder },
  );
  if (!picked) {
    return undefined;
  }
  if (picked === (newTaskItem as PickItem)) {
    const description = await vscode.window.showInputBox({
      prompt: "What are you working on?",
      validateInput: (s) =>
        s.trim().length > 0 ? undefined : "Enter a short description",
    });
    if (!description?.trim()) {
      return undefined;
    }
    return { description: description.trim() };
  }
  const from = picked.fromTask;
  if (!from) {
    return undefined;
  }
  return { description: from.description };
}
