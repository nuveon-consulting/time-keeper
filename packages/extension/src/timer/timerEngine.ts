import { randomUUID } from "node:crypto";
import type { JsonlStore } from "../storage/jsonlStore";
import {
  emptyState,
  type LastStoppedTask,
  type PersistedState,
  type Task,
  type TimeEntry,
} from "../types";
import { computeAlignedSpan, normalizeAlignmentMinutes } from "./alignment";

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Timer state machine + persistence without VS Code APIs (shared by `TimerService` and the stdio MCP entry).
 */
export type UpdateSegmentPatch = {
  /** Non-empty after trim; updates the task row for this segment. */
  description?: string;
  /** ISO-8601 UTC wall time */
  startIso?: string;
  /** ISO-8601 UTC; omit when not changing. Running segments must keep `end` null. */
  endIso?: string | null;
};

export type UpdateSegmentResult =
  | { ok: true }
  | { ok: false; reason: string };

export class TimerEngine {
  private state: PersistedState;

  constructor(
    private readonly store: JsonlStore,
    initial: PersistedState,
    private readonly onAfterPersist?: () => void,
    /** When it returns ≥1 minute, closed segments snap start/end to that grid (never shorter). */
    private readonly getAlignmentIntervalMinutes?: () => number,
  ) {
    this.state = this.repairInvariants(initial);
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

  /** Reload state from disk (e.g. after MCP or another writer updates the store). */
  async reloadFromDisk(): Promise<void> {
    const { state, corrupt } = await this.store.load();
    this.state = this.repairInvariants(corrupt ? emptyState() : state);
    this.onAfterPersist?.();
  }

  /**
   * Closes any running segment, then starts a **new** `Task` (new id) and a **new** `TimeEntry`
   * with a fresh `start`. No concurrent segments.
   */
  async startTask(description: string): Promise<void> {
    const trimmed = description.trim();
    if (!trimmed) {
      return;
    }
    await this.closeActiveIfAny();
    this.appendRunningSegment(trimmed);
    await this.persist();
  }

  async switchTask(description: string): Promise<void> {
    await this.startTask(description);
  }

  async stopTask(): Promise<boolean> {
    const active = this.getActiveEntry();
    if (!active) {
      return false;
    }
    const task = this.state.tasks[active.taskId];
    active.end = nowIso();
    this.applyAlignmentToCompleted(active);
    if (task) {
      this.state.lastStopped = {
        taskId: task.id,
        description: task.description,
      };
    }
    await this.persist();
    return true;
  }

  /**
   * Starts a **new** `Task` (new id) with the same description as the last stopped segment.
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
    const description = source?.description ?? ls.description;
    this.appendRunningSegment(description);
    await this.persist();
    return true;
  }

  /**
   * Updates raw fields on a segment. Duration and aligned columns are derived on save (alignment
   * settings apply to finished segments only).
   */
  async updateSegment(entryId: string, patch: UpdateSegmentPatch): Promise<UpdateSegmentResult> {
    const entry = this.state.entries.find((e) => e.id === entryId);
    if (!entry) {
      return { ok: false, reason: "Segment not found." };
    }
    const task = this.state.tasks[entry.taskId];
    if (!task) {
      return { ok: false, reason: "Task not found." };
    }

    const running = entry.end === null;

    if (patch.description !== undefined) {
      const trimmed = patch.description.trim();
      if (!trimmed) {
        return { ok: false, reason: "Description cannot be empty." };
      }
      task.description = trimmed;
    }

    let nextStart = entry.start;
    if (patch.startIso !== undefined) {
      const startMs = Date.parse(patch.startIso);
      if (!Number.isFinite(startMs)) {
        return { ok: false, reason: "Invalid start time." };
      }
      nextStart = new Date(startMs).toISOString();
    }

    let nextEnd: string | null = entry.end;
    if (patch.endIso !== undefined) {
      if (running) {
        return { ok: false, reason: "Cannot set end time while the segment is running." };
      }
      if (patch.endIso === null) {
        return { ok: false, reason: "End time is required for a completed segment." };
      }
      const endMs = Date.parse(patch.endIso);
      if (!Number.isFinite(endMs)) {
        return { ok: false, reason: "Invalid end time." };
      }
      nextEnd = new Date(endMs).toISOString();
    }

    const startMs = Date.parse(nextStart);
    const endMs = nextEnd === null ? NaN : Date.parse(nextEnd);
    if (!Number.isFinite(startMs)) {
      return { ok: false, reason: "Invalid start time." };
    }
    if (running) {
      entry.start = nextStart;
      delete entry.alignedStart;
      delete entry.alignedDurationMs;
      await this.persist();
      return { ok: true };
    }
    if (!Number.isFinite(endMs)) {
      return { ok: false, reason: "Invalid end time." };
    }
    if (endMs < startMs) {
      return { ok: false, reason: "End time must be on or after start time." };
    }
    entry.start = nextStart;
    entry.end = nextEnd;
    this.applyAlignmentToCompleted(entry);
    await this.persist();
    return { ok: true };
  }

  private async closeActiveIfAny(): Promise<void> {
    const active = this.getActiveEntry();
    if (!active) {
      return;
    }
    const task = this.state.tasks[active.taskId];
    active.end = nowIso();
    this.applyAlignmentToCompleted(active);
    if (task) {
      this.state.lastStopped = {
        taskId: task.id,
        description: task.description,
      };
    }
    await this.persist();
  }

  /** New `Task` row + new running `TimeEntry`; caller persists. */
  private appendRunningSegment(description: string): void {
    const task: Task = {
      id: randomUUID(),
      description: description.trim(),
    };
    this.state.tasks[task.id] = task;
    const entry: TimeEntry = {
      id: randomUUID(),
      taskId: task.id,
      start: nowIso(),
      end: null,
    };
    this.state.entries.push(entry);
  }

  private applyAlignmentToCompleted(entry: TimeEntry): void {
    if (!entry.end) {
      return;
    }
    const mins = normalizeAlignmentMinutes(this.getAlignmentIntervalMinutes?.());
    if (!mins) {
      delete entry.alignedStart;
      delete entry.alignedDurationMs;
      return;
    }
    const span = computeAlignedSpan(entry.start, entry.end, mins);
    if (!span) {
      delete entry.alignedStart;
      delete entry.alignedDurationMs;
      return;
    }
    entry.alignedStart = span.alignedStart;
    entry.alignedDurationMs = span.alignedDurationMs;
  }

  private repairInvariants(s: PersistedState): PersistedState {
    const running = s.entries.filter((e) => e.end === null);
    if (running.length <= 1) {
      return s;
    }
    const sorted = [...running].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    for (const e of sorted.slice(0, -1)) {
      e.end = e.start;
      delete e.alignedStart;
      delete e.alignedDurationMs;
    }
    return s;
  }

  private async persist(): Promise<void> {
    await this.store.save(this.state);
    this.onAfterPersist?.();
  }
}
