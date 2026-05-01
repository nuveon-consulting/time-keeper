/** Persisted document version; v2 removes `title` in favor of a single `description` per task. */
export const STATE_FILE_VERSION = 2 as const;
export const STATE_FILE_VERSION_LEGACY = 1 as const;

export interface Task {
  id: string;
  /** What the user is working on (only user-visible label). */
  description: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  /** ISO-8601 UTC */
  start: string;
  /** ISO-8601 UTC when completed; null while running */
  end: string | null;
  /** ISO-8601 UTC; optional grid-aligned start (floor) when alignment is enabled at close */
  alignedStart?: string;
  /** Aligned duration in ms (grid end ceil minus `alignedStart`); optional, see `alignedStart` */
  alignedDurationMs?: number;
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

/** Aligned billing duration when persisted; otherwise `null`. */
export function timeEntryAlignedDurationMs(entry: TimeEntry): number | null {
  if (entry.alignedDurationMs === undefined || entry.alignedDurationMs === null) {
    return null;
  }
  const n =
    typeof entry.alignedDurationMs === "number" ? Math.trunc(entry.alignedDurationMs) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export interface LastStoppedTask {
  taskId: string;
  description: string;
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
