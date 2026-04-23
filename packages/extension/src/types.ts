export const STATE_FILE_VERSION = 1 as const;

export interface Task {
  id: string;
  title: string;
  description?: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  /** ISO-8601 UTC */
  start: string;
  /** ISO-8601 UTC when completed; null while running */
  end: string | null;
}

/**
 * Milliseconds between `start` and `end`, or `null` while running or if timestamps are invalid.
 */
export function timeEntryDurationMs(entry: TimeEntry): number | null {
  if (entry.end === null) {
    return null;
  }
  const startMs = Date.parse(entry.start);
  const endMs = Date.parse(entry.end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return null;
  }
  return endMs - startMs;
}

export interface LastStoppedTask {
  taskId: string;
  title: string;
  description?: string;
}

export interface PersistedState {
  version: typeof STATE_FILE_VERSION;
  tasks: Record<string, Task>;
  entries: TimeEntry[];
  lastStopped: LastStoppedTask | null;
}

export function emptyState(): PersistedState {
  return {
    version: STATE_FILE_VERSION,
    tasks: {},
    entries: [],
    lastStopped: null,
  };
}
