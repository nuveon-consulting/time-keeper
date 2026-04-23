import * as vscode from "vscode";
import type { PersistedState } from "../types";
import type { TimerService } from "../timer/timerService";

/** Local calendar YYYY-MM-DD for a `Date` (same idea as summary webview). */
export function localYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalYMD(ymd: string): { startMs: number; endExclusiveMs: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) {
    return null;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const start = new Date(y, mo - 1, d, 0, 0, 0, 0).getTime();
  const endExclusive = new Date(y, mo - 1, d + 1, 0, 0, 0, 0).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(endExclusive)) {
    return null;
  }
  return { startMs: start, endExclusiveMs: endExclusive };
}

/** Same shape as the summary webview `formatDur` (rounded to whole seconds). */
export function formatDurationMs(ms: number): string {
  const sec = Math.round(ms / 1000);
  const h = Math.floor(sec / 3600);
  const mi = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}h ${mi}m`;
  }
  if (mi > 0) {
    return `${mi}m ${s}s`;
  }
  return `${s}s`;
}

/**
 * Milliseconds of each entry overlapping the given local calendar day,
 * keyed by task description. Running segments use `nowMs` as the open end.
 */
export function durationByDescriptionForLocalDay(
  state: PersistedState,
  ymd: string,
  nowMs: number,
): { totalMs: number; byDescription: Map<string, number> } {
  const bounds = parseLocalYMD(ymd);
  const byDescription = new Map<string, number>();
  if (!bounds) {
    return { totalMs: 0, byDescription };
  }
  const { startMs: dayStart, endExclusiveMs: dayEnd } = bounds;
  let totalMs = 0;

  for (const entry of state.entries) {
    const task = state.tasks[entry.taskId];
    if (!task) {
      continue;
    }
    const desc = task.description.trim();
    if (!desc) {
      continue;
    }
    const segStart = Date.parse(entry.start);
    if (!Number.isFinite(segStart)) {
      continue;
    }
    const segEnd = entry.end === null ? nowMs : Date.parse(entry.end);
    if (!Number.isFinite(segEnd) || segEnd <= segStart) {
      continue;
    }
    const overlapStart = Math.max(segStart, dayStart);
    const overlapEnd = Math.min(segEnd, dayEnd);
    const overlap = overlapEnd - overlapStart;
    if (overlap <= 0) {
      continue;
    }
    totalMs += overlap;
    byDescription.set(desc, (byDescription.get(desc) ?? 0) + overlap);
  }

  return { totalMs, byDescription };
}

export function buildTimesheetBody(ymd: string, totalMs: number, descriptions: readonly string[]): string {
  const head = `${formatDurationMs(totalMs)}\n${ymd}`;
  if (descriptions.length === 0) {
    return head;
  }
  const bullets = descriptions.map((d) => `- ${d}`).join("\n");
  return `${head}\n${bullets}`;
}

async function pickLocalCalendarDay(): Promise<string | undefined> {
  type DayPick = vscode.QuickPickItem & { readonly ymd: string | null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items: DayPick[] = [];
  for (let i = 0; i < 21; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ymd = localYMD(d);
    const label =
      i === 0 ? `Today (${ymd})` : i === 1 ? `Yesterday (${ymd})` : ymd;
    items.push({
      label,
      description: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      ymd,
    });
  }
  items.push({ label: "Other date…", description: "Enter YYYY-MM-DD", ymd: null });

  const picked = await vscode.window.showQuickPick(items, {
    title: "Time Keeper — timesheet date",
    placeHolder: "Choose the calendar day",
  });
  if (!picked) {
    return undefined;
  }
  if (picked.ymd !== null) {
    return picked.ymd;
  }
  const raw = await vscode.window.showInputBox({
    title: "Timesheet date",
    prompt: "Local calendar day as YYYY-MM-DD",
    placeHolder: "2026-04-23",
    validateInput: (v) => {
      const t = v.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
        return "Use YYYY-MM-DD";
      }
      if (!parseLocalYMD(t)) {
        return "Invalid date";
      }
      return undefined;
    },
  });
  return raw?.trim();
}

export async function runBuildTimesheetText(service: TimerService): Promise<void> {
  const ymd = await pickLocalCalendarDay();
  if (!ymd) {
    return;
  }
  const state = service.getState();
  const { totalMs, byDescription } = durationByDescriptionForLocalDay(state, ymd, Date.now());
  const distinct = [...byDescription.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const body = buildTimesheetBody(ymd, totalMs, distinct);
  const doc = await vscode.workspace.openTextDocument({
    content: body,
    language: "plaintext",
  });
  await vscode.window.showTextDocument(doc, { preview: false });
}
