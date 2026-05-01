import * as path from "node:path";
import * as os from "node:os";
import * as vscode from "vscode";
import type { TimerService } from "../timer/timerService";
import type { PersistedState } from "../types";
import { timeEntryAlignedDurationMs, timeEntryDurationMs } from "../types";

export interface SegmentRowJson {
  id: string;
  description: string;
  start: string;
  end: string | null;
  durationMs: number;
  /** ISO UTC when stored; null if no alignment row */
  alignedStart: string | null;
  /** ISO UTC, alignedStart + alignedDurationMs; null if unavailable */
  alignedEnd: string | null;
  /** Same source as datastore; null if absent */
  alignedDurationMs: number | null;
  running: boolean;
}

function alignedEndIso(alignedStart: string | null, alignedDurationMs: number | null): string | null {
  if (!alignedStart || alignedDurationMs === null || !Number.isFinite(alignedDurationMs)) {
    return null;
  }
  const t = Date.parse(alignedStart);
  if (!Number.isFinite(t)) {
    return null;
  }
  return new Date(t + alignedDurationMs).toISOString();
}

export function buildSegmentRows(state: PersistedState): SegmentRowJson[] {
  const rows: SegmentRowJson[] = [];
  for (const e of state.entries) {
    const task = state.tasks[e.taskId];
    const description = task?.description ?? "";
    const running = e.end === null;
    const startMs = Date.parse(e.start);
    const baseStart = Number.isFinite(startMs) ? startMs : Date.now();
    const durationMs = running
      ? Math.max(0, Date.now() - baseStart)
      : (timeEntryDurationMs(e) ?? 0);
    const alignedDur = running ? null : timeEntryAlignedDurationMs(e);
    const alignedStart = running || !e.alignedStart ? null : e.alignedStart;
    rows.push({
      id: e.id,
      description,
      start: e.start,
      end: e.end,
      durationMs,
      alignedStart,
      alignedEnd: alignedEndIso(alignedStart, alignedDur),
      alignedDurationMs: alignedDur,
      running,
    });
  }
  rows.sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  return rows;
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function writeSegmentCsv(rows: SegmentRowJson[]): Promise<void> {
  if (rows.length === 0) {
    void vscode.window.showInformationMessage("No rows to export (adjust filters or log time first).");
    return;
  }
  const defaultName = `nuveon-time-keeper-export-${new Date().toISOString().slice(0, 10)}.csv`;
  const uri = await vscode.window.showSaveDialog({
    title: "Export Nuveon Time Keeper summary",
    defaultUri: vscode.Uri.file(path.join(os.homedir(), defaultName)),
    filters: { CSV: ["csv"] },
    saveLabel: "Export",
  });
  if (!uri) {
    return;
  }
  const header = [
    "segment_id",
    "start_iso",
    "end_iso",
    "duration_seconds",
    "duration_ms",
    "aligned_start_iso",
    "aligned_end_iso",
    "aligned_duration_ms",
    "description",
    "running",
  ];
  const lines = rows.map((r) =>
    [
      escapeCsvField(r.id),
      escapeCsvField(r.start),
      escapeCsvField(r.end ?? ""),
      (r.durationMs / 1000).toFixed(3),
      String(Math.round(r.durationMs)),
      escapeCsvField(r.alignedStart ?? ""),
      escapeCsvField(r.alignedEnd ?? ""),
      r.alignedDurationMs === null ? "" : String(Math.round(r.alignedDurationMs)),
      escapeCsvField(r.description),
      r.running ? "yes" : "no",
    ].join(","),
  );
  const body = `\uFEFF${[header.join(","), ...lines].join("\n")}\n`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, "utf8"));
  void vscode.window.showInformationMessage(`Exported ${rows.length} row(s) to ${uri.fsPath}`);
}

function getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const cssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "summaryPanel.css"),
  );
  const jsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "summaryPanel.js"),
  );
  const csp = [
    "default-src 'none'",
    `style-src ${webview.cspSource}`,
    `script-src ${webview.cspSource}`,
    `font-src ${webview.cspSource}`,
  ].join("; ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${cssUri}" rel="stylesheet" />
  <title>Nuveon Time Keeper — Summary</title>
</head>
<body>
  <h1>Nuveon Time Keeper — Summary</h1>
  <p class="hint">Times use your local timezone. Duration for a running segment updates when data refreshes (*). <strong>Aligned start / end / duration</strong> columns show stored grid-aligned values for finished segments when <strong>Alignment interval</strong> is enabled in settings; otherwise they show —.</p>
  <div class="toolbar">
    <div class="row">
      <label for="fDesc">Description contains</label>
      <input type="text" id="fDesc" class="grow" placeholder="substring…" />
    </div>
    <div class="row">
      <label for="fDurMin">Duration (seconds)</label>
      <input type="number" id="fDurMin" min="0" step="1" placeholder="min" style="width:6rem" />
      <span>–</span>
      <input type="number" id="fDurMax" min="0" step="1" placeholder="max" style="width:6rem" />
    </div>
    <div class="row">
      <label for="fStartMode">Start time</label>
      <select id="fStartMode">
        <option value="any">Any</option>
        <option value="day">Calendar day</option>
        <option value="dayRange">Day range</option>
        <option value="between">Between date-times</option>
      </select>
    </div>
    <div class="row hidden" id="fStartDayRow">
      <label for="fStartDay">Date</label>
      <input type="date" id="fStartDay" />
    </div>
    <div class="row hidden" id="fStartRangeRow">
      <label for="fStartDayFrom">From / to</label>
      <input type="date" id="fStartDayFrom" />
      <input type="date" id="fStartDayTo" />
    </div>
    <div class="row hidden" id="fStartBetweenRow">
      <label for="fStartDtFrom">From / to</label>
      <input type="datetime-local" id="fStartDtFrom" class="grow" />
      <input type="datetime-local" id="fStartDtTo" class="grow" />
    </div>
    <div class="row">
      <label for="fEndMode">End time</label>
      <select id="fEndMode">
        <option value="any">Any</option>
        <option value="day">Calendar day</option>
        <option value="dayRange">Day range</option>
        <option value="between">Between date-times</option>
      </select>
    </div>
    <div class="row hidden" id="fEndDayRow">
      <label for="fEndDay">Date</label>
      <input type="date" id="fEndDay" />
    </div>
    <div class="row hidden" id="fEndRangeRow">
      <label for="fEndDayFrom">From / to</label>
      <input type="date" id="fEndDayFrom" />
      <input type="date" id="fEndDayTo" />
    </div>
    <div class="row hidden" id="fEndBetweenRow">
      <label for="fEndDtFrom">From / to</label>
      <input type="datetime-local" id="fEndDtFrom" class="grow" />
      <input type="datetime-local" id="fEndDtTo" class="grow" />
    </div>
    <div class="row">
      <label></label>
      <label style="min-width:auto"><input type="checkbox" id="fEndIncludeRunning" checked /> For end filters, treat running segments as ending “now”</label>
    </div>
    <div class="row actions">
      <label></label>
      <button type="button" id="btnExport">Export visible rows to CSV…</button>
    </div>
  </div>
  <div id="meta"></div>
  <div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>Start</th>
        <th>End</th>
        <th>Duration</th>
        <th>Aligned start</th>
        <th>Aligned end</th>
        <th>Aligned duration</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>
  </div>
  <script src="${jsUri}"></script>
</body>
</html>`;
}

export class SummaryPanelController implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private serviceListener: vscode.Disposable | undefined;
  private webviewMessageListener: vscode.Disposable | undefined;
  private tick: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly service: TimerService,
  ) {}

  open(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One, false);
      this.push();
      return;
    }
    this.panel = vscode.window.createWebviewPanel(
      "timeKeeper.summaryPanel",
      "Nuveon Time Keeper — Summary",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    this.panel.webview.html = getHtml(this.panel.webview, this.extensionUri);
    this.webviewMessageListener = this.panel.webview.onDidReceiveMessage(
      (msg: unknown) => {
        void this.handleWebviewMessage(msg);
      },
    );
    this.serviceListener = this.service.onDidChange(() => {
      this.push();
    });
    this.tick = setInterval(() => {
      this.push();
    }, 1000);
    this.panel.onDidDispose(() => {
      if (this.tick !== undefined) {
        clearInterval(this.tick);
        this.tick = undefined;
      }
      this.webviewMessageListener?.dispose();
      this.webviewMessageListener = undefined;
      this.serviceListener?.dispose();
      this.serviceListener = undefined;
      this.panel = undefined;
    });
    this.push();
  }

  private async handleWebviewMessage(msg: unknown): Promise<void> {
    if (!msg || typeof msg !== "object") {
      return;
    }
    const m = msg as { type?: string; rows?: unknown };
    if (m.type !== "exportCsv") {
      return;
    }
    if (!Array.isArray(m.rows)) {
      return;
    }
    const rows = m.rows as SegmentRowJson[];
    try {
      await writeSegmentCsv(rows);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      void vscode.window.showErrorMessage(`Export failed: ${message}`);
    }
  }

  private push(): void {
    if (!this.panel) {
      return;
    }
    void this.panel.webview.postMessage({
      type: "update",
      payload: { rows: buildSegmentRows(this.service.getState()) },
    });
  }

  dispose(): void {
    if (this.tick !== undefined) {
      clearInterval(this.tick);
      this.tick = undefined;
    }
    this.webviewMessageListener?.dispose();
    this.webviewMessageListener = undefined;
    this.serviceListener?.dispose();
    this.serviceListener = undefined;
    this.panel?.dispose();
    this.panel = undefined;
  }
}
