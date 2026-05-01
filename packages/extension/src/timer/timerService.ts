import * as vscode from "vscode";
import type { JsonlStore } from "../storage/jsonlStore";
import { emptyState, type LastStoppedTask, type PersistedState, type Task, type TimeEntry } from "../types";
import { TimerEngine, type UpdateSegmentPatch, type UpdateSegmentResult } from "./timerEngine";

export class TimerService implements vscode.Disposable {
  private readonly engine: TimerEngine;
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(
    store: JsonlStore,
    initial: PersistedState,
    getAlignmentIntervalMinutes?: () => number,
  ) {
    this.engine = new TimerEngine(
      store,
      initial,
      () => this._onDidChange.fire(),
      getAlignmentIntervalMinutes,
    );
  }

  dispose(): void {
    this._onDidChange.dispose();
  }

  getState(): Readonly<PersistedState> {
    return this.engine.getState();
  }

  getActiveEntry(): TimeEntry | undefined {
    return this.engine.getActiveEntry();
  }

  getActiveTask(): Task | undefined {
    return this.engine.getActiveTask();
  }

  listRecentTasks(limit: number): Task[] {
    return this.engine.listRecentTasks(limit);
  }

  getLastStopped(): LastStoppedTask | null {
    return this.engine.getLastStopped();
  }

  async startTask(description: string): Promise<void> {
    await this.engine.startTask(description);
  }

  async switchTask(description: string): Promise<void> {
    await this.engine.switchTask(description);
  }

  async stopTask(): Promise<boolean> {
    return this.engine.stopTask();
  }

  async resumePrevious(): Promise<boolean> {
    return this.engine.resumePrevious();
  }

  async updateSegment(entryId: string, patch: UpdateSegmentPatch): Promise<UpdateSegmentResult> {
    return this.engine.updateSegment(entryId, patch);
  }

  /** Sync in-memory state from disk when another process (e.g. MCP stdio) updates the ledger. */
  async reloadFromDisk(): Promise<void> {
    await this.engine.reloadFromDisk();
  }
}

export async function hydrateTimerService(
  store: JsonlStore,
  getAlignmentIntervalMinutes?: () => number,
): Promise<{ service: TimerService; corrupt: boolean }> {
  const { state, corrupt } = await store.load();
  const base = corrupt ? emptyState() : state;
  const service = new TimerService(store, base, getAlignmentIntervalMinutes);
  return { service, corrupt };
}
