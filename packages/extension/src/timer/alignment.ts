/**
 * Snap segment boundaries to multiples of {@link intervalMinutes} without shrinking duration:
 * aligned start rounds down (floor); aligned end rounds up (ceil) in UTC millis.
 */

export function normalizeAlignmentMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const n = Math.trunc(value);
  if (n < 1) {
    return 0;
  }
  if (n > 1440) {
    return 1440;
  }
  return n;
}

export function parseAlignmentMinutesEnv(raw: string | undefined): number {
  if (raw === undefined || !raw.trim()) {
    return 0;
  }
  const n = Number.parseInt(raw.trim(), 10);
  return normalizeAlignmentMinutes(n);
}

export function alignmentSnapStartEndPreserveDuration(
  startIso: string,
  endIso: string,
  intervalMinutes: number,
): { start: string; end: string } {
  const mins = normalizeAlignmentMinutes(intervalMinutes);
  if (mins === 0) {
    return { start: startIso, end: endIso };
  }
  const intervalMs = mins * 60_000;

  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return { start: startIso, end: endIso };
  }

  const alignedStartMs = Math.floor(startMs / intervalMs) * intervalMs;
  const alignedEndMs = Math.ceil(endMs / intervalMs) * intervalMs;

  return {
    start: new Date(alignedStartMs).toISOString(),
    end: new Date(alignedEndMs).toISOString(),
  };
}

/** Persisted snapshot: grid start + aligned length in ms (never shorter than raw span). */
export function computeAlignedSpan(
  startIso: string,
  endIso: string,
  intervalMinutes: number,
): { alignedStart: string; alignedDurationMs: number } | null {
  const mins = normalizeAlignmentMinutes(intervalMinutes);
  if (mins === 0) {
    return null;
  }
  const { start, end } = alignmentSnapStartEndPreserveDuration(startIso, endIso, mins);
  const a0 = Date.parse(start);
  const a1 = Date.parse(end);
  if (!Number.isFinite(a0) || !Number.isFinite(a1) || a1 <= a0) {
    return null;
  }
  return { alignedStart: start, alignedDurationMs: a1 - a0 };
}
