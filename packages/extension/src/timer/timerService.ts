import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import { JsonlStore } from "../storage/jsonlStore";
import {
  emptyState,
  type LastStoppedTask,
  type PersistedState,
  type Task,
  type TimeEntry,
} from "../types";

function nowIso(): string {
  return new Date().toISOString();
}

export class TimerService implements vscode.Disposable {
  private state: PersistedState;
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(
    private readonly store: JsonlStore,
    initial: PersistedState,
  ) {
    this.state = this.repairInvariants(initial);
  }

  dispose(): void {
    this._onDidChange.dispose();
  }

  getState(): Readonly<PersistedState> {
    return this.state;
  }

  getActiveEntry(): TimeEntry | undefined {
    return this.state.entries.find((e) => e.end === null);
  }

  getActiveTask(): Task | undefined {
    const e = this.getActiveEntry();
    if (!e) {
      return undefined;
    }
    return this.state.tasks[e.taskId];
  }

  listRecentTasks(limit: number): Task[] {
    return this.store.listRecentTasks(this.state, limit);
  }

  getLastStopped(): LastStoppedTask | null {
    return this.state.lastStopped;
  }

  /**
   * Closes any running segment, then starts a **new** `Task` (new id) and a **new** `TimeEntry`
   * with a fresh `start`. No concurrent segments; each segment has its own start/stop pair.
   */
  async startTask(title: string, description?: string): Promise<void> {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    await this.closeActiveIfAny();
    this.appendRunningSegment(trimmed, description);
    await this.persist();
  }

  async switchTask(title: string, description?: string): Promise<void> {
    await this.startTask(title, description);
  }

  async stopTask(): Promise<boolean> {
    const active = this.getActiveEntry();
    if (!active) {
      return false;
    }
    const task = this.state.tasks[active.taskId];
    active.end = nowIso();
    if (task) {
      this.state.lastStopped = {
        taskId: task.id,
        title: task.title,
        ...(task.description !== undefined && task.description.length > 0
          ? { description: task.description }
          : {}),
      };
    }
    await this.persist();
    return true;
  }

  /**
   * Starts a **new** `Task` (new id) with the same title/description as the last stopped work item,
   * and a new `TimeEntry` with a fresh `start`. Duration for each segment is `end - start` once stopped.
   */
  async resumePrevious(): Promise<boolean> {
    if (this.getActiveEntry()) {
      return false;
    }
    const ls = this.state.lastStopped;
    if (!ls) {
      return false;
    }
    const source = this.state.tasks[ls.taskId];
    const title = source?.title ?? ls.title;
    const description = source?.description ?? ls.description;
    this.appendRunningSegment(title, description);
    await this.persist();
    return true;
  }

  private async closeActiveIfAny(): Promise<void> {
    const active = this.getActiveEntry();
    if (!active) {
      return;
    }
    const task = this.state.tasks[active.taskId];
    active.end = nowIso();
    if (task) {
      this.state.lastStopped = {
        taskId: task.id,
        title: task.title,
        ...(task.description !== undefined && task.description.length > 0
          ? { description: task.description }
          : {}),
      };
    }
    await this.persist();
  }

  /** New `Task` row + new running `TimeEntry`; caller persists. */
  private appendRunningSegment(title: string, description?: string): void {
    const task: Task = {
      id: randomUUID(),
      title,
    };
    const d = description?.trim();
    if (d !== undefined && d.length > 0) {
      task.description = d;
    }
    this.state.tasks[task.id] = task;
    const entry: TimeEntry = {
      id: randomUUID(),
      taskId: task.id,
      start: nowIso(),
      end: null,
    };
    this.state.entries.push(entry);
  }

  private repairInvariants(s: PersistedState): PersistedState {
    const running = s.entries.filter((e) => e.end === null);
    if (running.length <= 1) {
      return s;
    }
    const sorted = [...running].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    const keep = sorted[sorted.length - 1];
    for (const e of sorted.slice(0, -1)) {
      e.end = e.start;
    }
    return s;
  }

  private async persist(): Promise<void> {
    await this.store.save(this.state);
    this._onDidChange.fire();
  }
}

export async function hydrateTimerService(
  store: JsonlStore,
): Promise<{ service: TimerService; corrupt: boolean }> {
  const { state, corrupt } = await store.load();
  const base = corrupt ? emptyState() : state;
  const service = new TimerService(store, base);
  return { service, corrupt };
}
