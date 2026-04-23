import * as vscode from "vscode";
import type { Task } from "../types";
import type { TimerService } from "../timer/timerService";

const newTaskItem: vscode.QuickPickItem = {
  label: "$(add) New task…",
  description: "Enter a new title",
  alwaysShow: true,
};

export type SegmentPickResult = {
  title: string;
  description?: string;
};

type PickItem = vscode.QuickPickItem & { fromTask?: Task };

/**
 * Picks title (and optional description when cloning a recent task) for a **new work segment**.
 * Each segment gets a new `Task` id in the timer service; recent rows are templates only.
 */
export async function pickSegment(
  service: TimerService,
  placeHolder: string,
): Promise<SegmentPickResult | undefined> {
  const recent = service.listRecentTasks(12);
  const recentItems: PickItem[] = recent.map((t) => ({
    label: t.title,
    description: t.description,
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
    const title = await vscode.window.showInputBox({
      prompt: "Task title",
      validateInput: (s) => (s.trim().length > 0 ? undefined : "Enter a title"),
    });
    if (!title?.trim()) {
      return undefined;
    }
    return { title: title.trim() };
  }
  const from = picked.fromTask;
  if (!from) {
    return undefined;
  }
  return {
    title: from.title,
    ...(from.description !== undefined && from.description.length > 0
      ? { description: from.description }
      : {}),
  };
}
