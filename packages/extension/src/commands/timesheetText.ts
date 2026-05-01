import * as vscode from "vscode";
import type { PersistedState, TimeEntry } from "../types";
import { timeEntryAlignedDurationMs } from "../types";
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
 * Ceiling to `significantDigits` significant figures (for positive values).
 */
export function ceilToSignificantFigures(value: number, significantDigits: number): number {
  if (!Number.isFinite(value) || value === 0) {
    return 0;
  }
  const x = Math.abs(value);
  const exp = Math.floor(Math.log10(x));
  const pow = significantDigits - 1 - exp;
  const mult = 10 ** pow;
  const ceilScaled = Math.ceil(x * mult - Number.EPSILON);
  const rounded = ceilScaled / mult;
  return value < 0 ? -rounded : rounded;
}

function formatHoursPlainNoExponent(hours: number): string {
  const p = hours.toPrecision(2);
  if (!/[eE]/.test(p)) {
    return p;
  }
  return Number(hours.toPrecision(2)).toString();
}

/**
 * Hours for timesheet headers: **two significant figures**, **always rounded up**
 * (ceiling at that precision), e.g. `0.25 hrs`, `4.5 hrs`.
 */
export function formatDurationDecimalHours(ms: number): string {
  const hours = ms / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) {
    return "0.0 hrs";
  }
  const ceiled = ceilToSignificantFigures(hours, 2);
  return `${formatHoursPlainNoExponent(ceiled)} hrs`;
}

/** Resolved wall span for timesheet overlap (UTC ms). */
function timesheetSegmentSpanMs(
  entry: TimeEntry,
  nowMs: number,
  preferAligned: boolean,
): { start: number; end: number } | null {
  if (preferAligned && entry.end !== null) {
    const alignedLen = timeEntryAlignedDurationMs(entry);
    const alignedStartMs = entry.alignedStart ? Date.parse(entry.alignedStart) : NaN;
    if (alignedLen !== null && Number.isFinite(alignedStartMs)) {
      const alignedEndMs = alignedStartMs + alignedLen;
      if (alignedEndMs > alignedStartMs) {
        return { start: alignedStartMs, end: alignedEndMs };
      }
    }
  }
  const segStart = Date.parse(entry.start);
  if (!Number.isFinite(segStart)) {
    return null;
  }
  const segEnd = entry.end === null ? nowMs : Date.parse(entry.end);
  if (!Number.isFinite(segEnd) || segEnd <= segStart) {
    return null;
  }
  return { start: segStart, end: segEnd };
}

/**
 * Milliseconds overlapping each task description for an inclusive local-date range
 * `[startYmd, endYmd]` (aligned vs raw per options).
 */
export function durationByDescriptionForLocalDayRange(
  state: PersistedState,
  startYmd: string,
  endYmd: string,
  nowMs: number,
  options?: { useAlignedSpans?: boolean },
): { totalMs: number; byDescription: Map<string, number> } {
  const useAlignedSpans = options?.useAlignedSpans === true;
  const startBounds = parseLocalYMD(startYmd);
  const endBounds = parseLocalYMD(endYmd);
  const byDescription = new Map<string, number>();
  if (!startBounds || !endBounds || startBounds.startMs > endBounds.startMs) {
    return { totalMs: 0, byDescription };
  }
  const rangeStart = startBounds.startMs;
  const rangeEnd = endBounds.endExclusiveMs;
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
    const span = timesheetSegmentSpanMs(entry, nowMs, useAlignedSpans);
    if (!span) {
      continue;
    }
    const { start: segStart, end: segEnd } = span;
    const overlapStart = Math.max(segStart, rangeStart);
    const overlapEnd = Math.min(segEnd, rangeEnd);
    const overlap = overlapEnd - overlapStart;
    if (overlap <= 0) {
      continue;
    }
    totalMs += overlap;
    byDescription.set(desc, (byDescription.get(desc) ?? 0) + overlap);
  }

  return { totalMs, byDescription };
}

/**
 * Milliseconds of each entry overlapping the given local calendar day,
 * keyed by task description. Running segments use `nowMs` as the open end.
 *
 * When `useAlignedSpans` is true, completed entries with `alignedStart` + `alignedDurationMs`
 * use that span; others still use raw `start`/`end`.
 */
export function durationByDescriptionForLocalDay(
  state: PersistedState,
  ymd: string,
  nowMs: number,
  options?: { useAlignedSpans?: boolean },
): { totalMs: number; byDescription: Map<string, number> } {
  return durationByDescriptionForLocalDayRange(state, ymd, ymd, nowMs, options);
}

/** One calendar day: `YYYY-MM-DD [hours]` header line (2 sig figs, ceil), then sorted task bullets. */
export function buildTimesheetDayBlock(ymd: string, totalMs: number, descriptions: readonly string[]): string {
  const head = `${ymd} [${formatDurationDecimalHours(totalMs)}]`;
  if (descriptions.length === 0) {
    return head;
  }
  const bullets = descriptions.map((d) => `- ${d}`).join("\n");
  return `${head}\n${bullets}`;
}

function iterateInclusiveLocalYmds(startYmd: string, endYmd: string): string[] {
  const startB = parseLocalYMD(startYmd);
  const endB = parseLocalYMD(endYmd);
  if (!startB || !endB || startB.startMs > endB.startMs) {
    return [];
  }
  const out: string[] = [];
  const d = new Date(startB.startMs);
  const rangeEndExclusive = endB.endExclusiveMs;
  while (d.getTime() < rangeEndExclusive) {
    out.push(localYMD(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Plaintext timesheet: one block per local calendar day, separated by a blank line. */
export function buildTimesheetBodyFromDayBlocks(
  sections: readonly { ymd: string; totalMs: number; descriptions: readonly string[] }[],
): string {
  return sections
    .map((s) => buildTimesheetDayBlock(s.ymd, s.totalMs, s.descriptions))
    .join("\n\n");
}

type DayPick = vscode.QuickPickItem & { readonly ymd: string | null };

async function pickLocalCalendarDay(title: string, placeHolder: string): Promise<string | undefined> {
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
    title,
    placeHolder,
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

async function pickLocalCalendarEndDay(startYmd: string): Promise<string | undefined> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items: DayPick[] = [
    {
      label: `Same as start (${startYmd})`,
      description: "Single calendar day",
      ymd: startYmd,
    },
  ];
  for (let i = 0; i < 21; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ymd = localYMD(d);
    if (ymd === startYmd) {
      continue;
    }
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
    title: "Nuveon Time Keeper — timesheet end date",
    placeHolder: `End date (default: ${startYmd})`,
  });
  if (!picked) {
    return undefined;
  }
  if (picked.ymd !== null) {
    return picked.ymd;
  }
  const raw = await vscode.window.showInputBox({
    title: "Timesheet end date",
    prompt: `Local calendar day as YYYY-MM-DD (on or after ${startYmd})`,
    placeHolder: startYmd,
    validateInput: (v) => {
      const t = v.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
        return "Use YYYY-MM-DD";
      }
      if (!parseLocalYMD(t)) {
        return "Invalid date";
      }
      if (t < startYmd) {
        return `Must be on or after ${startYmd}`;
      }
      return undefined;
    },
  });
  return raw?.trim();
}

export async function runBuildTimesheetText(service: TimerService): Promise<void> {
  const startYmd = await pickLocalCalendarDay(
    "Nuveon Time Keeper — timesheet start date",
    "Choose the start date",
  );
  if (!startYmd) {
    return;
  }
  let endYmd: string | undefined;
  for (;;) {
    endYmd = await pickLocalCalendarEndDay(startYmd);
    if (!endYmd) {
      return;
    }
    if (endYmd >= startYmd) {
      break;
    }
    void vscode.window.showErrorMessage("End date must be on or after the start date.");
  }
  const state = service.getState();
  const useAligned =
    vscode.workspace.getConfiguration("timeKeeper").get<boolean>("timesheetUseAlignedValues") === true;
  const nowMs = Date.now();
  const days = iterateInclusiveLocalYmds(startYmd, endYmd);
  const sections = days
    .map((ymd) => {
      const { totalMs, byDescription } = durationByDescriptionForLocalDay(state, ymd, nowMs, {
        useAlignedSpans: useAligned,
      });
      const descriptions = [...byDescription.keys()].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      );
      return { ymd, totalMs, descriptions };
    })
    .filter((s) => s.totalMs > 0);
  if (sections.length === 0) {
    void vscode.window.showInformationMessage("No logged time in that date range.");
    return;
  }
  const body = buildTimesheetBodyFromDayBlocks(sections);
  const doc = await vscode.workspace.openTextDocument({
    content: body,
    language: "plaintext",
  });
  await vscode.window.showTextDocument(doc, { preview: false });
}
