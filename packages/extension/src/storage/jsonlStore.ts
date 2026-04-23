import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  STATE_FILE_VERSION,
  STATE_FILE_VERSION_LEGACY,
  emptyState,
  type LastStoppedTask,
  type PersistedState,
  type Task,
  type TimeEntry,
} from "../types";

/** File name for the versioned JSON snapshot (atomic replace). */
export const STATE_FILE_NAME = "time-keeper-state.v1.json";

/**
 * Loads and saves persisted timer state under a directory (typically `ExtensionContext.globalStorageUri.fsPath`).
 * Uses a single versioned JSON file with atomic temp+rename writes.
 * Version **1** files (title + optional description) are migrated to **2** (description only) on load.
 */
export class JsonlStore {
  private readonly filePath: string;

  constructor(globalStorageDirFsPath: string) {
    this.filePath = path.join(globalStorageDirFsPath, STATE_FILE_NAME);
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
  const ver = o.version;
  if (ver === STATE_FILE_VERSION_LEGACY) {
    return migrateFromV1(o);
  }
  if (ver === STATE_FILE_VERSION) {
    return parseV2State(o);
  }
  return null;
}

function parseV2State(o: Record<string, unknown>): PersistedState | null {
  if (typeof o.tasks !== "object" || o.tasks === null || Array.isArray(o.tasks)) {
    return null;
  }
  if (!Array.isArray(o.entries)) {
    return null;
  }
  const tasks: Record<string, Task> = {};
  for (const [id, t] of Object.entries(o.tasks as Record<string, unknown>)) {
    const task = asTaskV2(id, t);
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
    const ls = asLastStoppedV2(o.lastStopped);
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

function migrateFromV1(o: Record<string, unknown>): PersistedState | null {
  if (typeof o.tasks !== "object" || o.tasks === null || Array.isArray(o.tasks)) {
    return null;
  }
  if (!Array.isArray(o.entries)) {
    return null;
  }
  const tasks: Record<string, Task> = {};
  for (const [id, t] of Object.entries(o.tasks as Record<string, unknown>)) {
    const task = migrateTaskFromV1(id, t);
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
    lastStopped = migrateLastStoppedFromV1(o.lastStopped);
  }
  return {
    version: STATE_FILE_VERSION,
    tasks,
    entries,
    lastStopped,
  };
}

function migrateTaskFromV1(id: string, v: unknown): Task | null {
  if (!v || typeof v !== "object") {
    return null;
  }
  const t = v as Record<string, unknown>;
  const title = typeof t.title === "string" ? t.title.trim() : "";
  const desc = typeof t.description === "string" ? t.description.trim() : "";
  let description = "";
  if (desc.length > 0) {
    description = title.length > 0 ? `${title} — ${desc}` : desc;
  } else {
    description = title;
  }
  if (!description) {
    return null;
  }
  return { id, description };
}

function migrateLastStoppedFromV1(v: unknown): LastStoppedTask | null {
  if (!v || typeof v !== "object") {
    return null;
  }
  const o = v as Record<string, unknown>;
  if (typeof o.taskId !== "string") {
    return null;
  }
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const desc = typeof o.description === "string" ? o.description.trim() : "";
  const description =
    desc.length > 0 ? (title.length > 0 ? `${title} — ${desc}` : desc) : title;
  if (!description) {
    return null;
  }
  return { taskId: o.taskId, description };
}

function asTaskV2(id: string, v: unknown): Task | null {
  if (!v || typeof v !== "object") {
    return null;
  }
  const t = v as Record<string, unknown>;
  if (typeof t.description !== "string" || t.description.trim().length === 0) {
    return null;
  }
  return { id, description: t.description.trim() };
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

function asLastStoppedV2(v: unknown): LastStoppedTask | null {
  if (!v || typeof v !== "object") {
    return null;
  }
  const o = v as Record<string, unknown>;
  if (typeof o.taskId !== "string" || typeof o.description !== "string") {
    return null;
  }
  const d = o.description.trim();
  if (!d) {
    return null;
  }
  return { taskId: o.taskId, description: d };
}
