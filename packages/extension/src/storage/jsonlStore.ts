import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  STATE_FILE_VERSION,
  emptyState,
  type LastStoppedTask,
  type PersistedState,
  type Task,
  type TimeEntry,
} from "../types";

/** File name for the versioned JSON snapshot (atomic replace). */
export const STATE_FILE_NAME = "time-keeper-state.v1.json";

/**
 * Loads and saves persisted timer state under `globalStorageUri`.
 * v1 uses a single versioned JSON file with atomic temp+rename writes (not line-delimited JSONL)
 * so running entries can be ended in place reliably.
 */
export class JsonlStore {
  private readonly filePath: string;

  constructor(globalStorageUri: vscode.Uri) {
    this.filePath = path.join(globalStorageUri.fsPath, STATE_FILE_NAME);
  }

  async load(): Promise<{ state: PersistedState; corrupt: boolean }> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      const state = normalizeState(parsed);
      if (!state) {
        return { state: emptyState(), corrupt: true };
      }
      return { state, corrupt: false };
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return { state: emptyState(), corrupt: false };
      }
      return { state: emptyState(), corrupt: true };
    }
  }

  async save(state: PersistedState): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const payload = JSON.stringify(state, null, 0);
    const dir = path.dirname(this.filePath);
    const tmp = path.join(dir, `${STATE_FILE_NAME}.tmp`);
    await fs.writeFile(tmp, payload, "utf8");
    try {
      await fs.unlink(this.filePath);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
        throw e;
      }
    }
    await fs.rename(tmp, this.filePath);
  }

  listRecentTasks(state: PersistedState, limit: number): Task[] {
    const lastUse = new Map<string, number>();
    for (const e of state.entries) {
      const t = e.end ?? e.start;
      const ms = Date.parse(t);
      const prev = lastUse.get(e.taskId) ?? 0;
      if (ms >= prev) {
        lastUse.set(e.taskId, ms);
      }
    }
    const tasks = Object.values(state.tasks);
    tasks.sort((a, b) => (lastUse.get(b.id) ?? 0) - (lastUse.get(a.id) ?? 0));
    return tasks.slice(0, limit);
  }
}

function normalizeState(parsed: unknown): PersistedState | null {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const o = parsed as Record<string, unknown>;
  if (o.version !== STATE_FILE_VERSION) {
    return null;
  }
  if (typeof o.tasks !== "object" || o.tasks === null || Array.isArray(o.tasks)) {
    return null;
  }
  if (!Array.isArray(o.entries)) {
    return null;
  }
  const tasks: Record<string, Task> = {};
  for (const [id, t] of Object.entries(o.tasks as Record<string, unknown>)) {
    const task = asTask(id, t);
    if (task) {
      tasks[id] = task;
    }
  }
  const entries: TimeEntry[] = [];
  for (const item of o.entries) {
    const e = asEntry(item);
    if (e) {
      entries.push(e);
    }
  }
  let lastStopped: PersistedState["lastStopped"] = null;
  if (o.lastStopped !== null && o.lastStopped !== undefined) {
    const ls = asLastStopped(o.lastStopped);
    if (ls) {
      lastStopped = ls;
    }
  }
  return {
    version: STATE_FILE_VERSION,
    tasks,
    entries,
    lastStopped,
  };
}

function asTask(id: string, v: unknown): Task | null {
  if (!v || typeof v !== "object") {
    return null;
  }
  const t = v as Record<string, unknown>;
  if (typeof t.title !== "string" || t.title.length === 0) {
    return null;
  }
  const task: Task = { id, title: t.title };
  if (typeof t.description === "string" && t.description.length > 0) {
    task.description = t.description;
  }
  return task;
}

function asEntry(v: unknown): TimeEntry | null {
  if (!v || typeof v !== "object") {
    return null;
  }
  const e = v as Record<string, unknown>;
  if (
    typeof e.id !== "string" ||
    typeof e.taskId !== "string" ||
    typeof e.start !== "string" ||
    (e.end !== null && typeof e.end !== "string")
  ) {
    return null;
  }
  return {
    id: e.id,
    taskId: e.taskId,
    start: e.start,
    end: e.end as string | null,
  };
}

function asLastStopped(v: unknown): LastStoppedTask | null {
  if (!v || typeof v !== "object") {
    return null;
  }
  const o = v as Record<string, unknown>;
  if (typeof o.taskId !== "string" || typeof o.title !== "string") {
    return null;
  }
  const out: LastStoppedTask = { taskId: o.taskId, title: o.title };
  if (typeof o.description === "string" && o.description.length > 0) {
    out.description = o.description;
  }
  return out;
}
