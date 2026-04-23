import * as vscode from "vscode";
import type { TimerService } from "../timer/timerService";

function formatElapsed(startMs: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max - 1)}…`;
}

export class StatusBarController implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private tick: ReturnType<typeof setInterval> | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly service: TimerService) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.item.command = "timeKeeper.statusBarClick";
    this.disposables.push(this.item);
    this.disposables.push(
      this.service.onDidChange(() => {
        this.refresh();
      }),
    );
    this.refresh();
  }

  refresh(): void {
    this.clearTick();
    const active = this.service.getActiveEntry();
    const task = this.service.getActiveTask();
    if (!active || !task) {
      this.item.text = "$(watch) Nuveon Time Keeper";
      this.item.tooltip = "Nuveon Time Keeper — click for actions";
      this.item.show();
      return;
    }
    const startMs = Date.parse(active.start);
    const update = (): void => {
      this.item.text = `$(watch) ${truncate(task.description, 28)} ${formatElapsed(startMs)}`;
      this.item.tooltip = `${task.description} — running`;
      this.item.show();
    };
    update();
    this.tick = setInterval(update, 500);
  }

  dispose(): void {
    this.clearTick();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.item.dispose();
  }

  private clearTick(): void {
    if (this.tick !== undefined) {
      clearInterval(this.tick);
      this.tick = undefined;
    }
  }
}
