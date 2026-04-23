import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { JsonlStore } from "../storage/jsonlStore";
import { TIME_KEEPER_GLOBAL_STORAGE_ENV } from "../timeKeeperPaths";
import { TimerEngine } from "../timer/timerEngine";
import { emptyState } from "../types";

function okJson(body: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(body, null, 0) }] };
}

function errText(message: string) {
  return { isError: true as const, content: [{ type: "text" as const, text: message }] };
}

async function withEngine<T>(store: JsonlStore, fn: (engine: TimerEngine) => Promise<T>): Promise<T> {
  const { state, corrupt } = await store.load();
  const engine = new TimerEngine(store, corrupt ? emptyState() : state, undefined);
  return fn(engine);
}

async function main(): Promise<void> {
  const dir = process.env[TIME_KEEPER_GLOBAL_STORAGE_ENV];
  if (!dir?.trim()) {
    process.stderr.write(
      `${TIME_KEEPER_GLOBAL_STORAGE_ENV} is not set. Run "Nuveon Time Keeper: Set up MCP" from the extension so mcp.json includes this environment variable.\n`,
    );
    process.exit(1);
  }

  const store = new JsonlStore(dir.trim());
  const server = new McpServer(
    { name: "nuveon-time-keeper", version: "0.0.0" },
    { capabilities: { tools: {} } },
  );

  /** Raw Zod shape — `registerTool` accepts this or `z.object(...)` at runtime; the raw shape matches SDK typings without deep generic recursion. */
  const taskDescriptionArgs = {
    description: z.string().describe("Task label / description"),
  };

  server.registerTool(
    "timeKeeper_get_state",
    {
      description: "Return idle vs running timer state, active task description and times, and last stopped task.",
    },
    async () => {
      return withEngine(store, async (engine) => {
        const active = engine.getActiveEntry();
        const task = engine.getActiveTask();
        return okJson({
          running: Boolean(active),
          active: active
            ? {
                description: task?.description ?? "",
                start: active.start,
                taskId: active.taskId,
              }
            : null,
          lastStopped: engine.getLastStopped(),
        });
      });
    },
  );

  server.registerTool(
    "timeKeeper_start_task",
    {
      description: "Start timing a task; closes any running segment first (same as extension start/switch).",
      inputSchema: taskDescriptionArgs,
    },
    // @ts-expect-error TS2589: `ToolCallback` × `ShapeOutput<>` from @modelcontextprotocol/sdk exceeds TS recursion; input is still validated at runtime by the SDK.
    async (args: { description: string }) => {
      const { description } = args;
      await withEngine(store, async (engine) => {
        await engine.startTask(description);
      });
      return okJson({ ok: true });
    },
  );

  server.registerTool(
    "timeKeeper_stop_task",
    {
      description: "Stop the active segment if any; updates last-stopped for resume.",
    },
    async () => {
      const stopped = await withEngine(store, async (engine) => engine.stopTask());
      return stopped ? okJson({ ok: true, stopped: true }) : errText("No active segment to stop.");
    },
  );

  server.registerTool(
    "timeKeeper_switch_task",
    {
      description: "Stop current work (if any) and start timing a new task.",
      inputSchema: taskDescriptionArgs,
    },
    async (args: { description: string }) => {
      const { description } = args;
      await withEngine(store, async (engine) => {
        await engine.switchTask(description);
      });
      return okJson({ ok: true });
    },
  );

  server.registerTool(
    "timeKeeper_resume_previous",
    {
      description: "When idle, start a new segment copying the last stopped task description.",
    },
    async () => {
      const ok = await withEngine(store, async (engine) => engine.resumePrevious());
      return ok
        ? okJson({ ok: true })
        : errText("Cannot resume (already running or no previous segment).");
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

void main().catch((e) => {
  process.stderr.write(e instanceof Error ? `${e.stack ?? e.message}\n` : String(e));
  process.exit(1);
});
