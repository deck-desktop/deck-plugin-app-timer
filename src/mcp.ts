// The agent-facing tools for this plugin's timers, in the `app-closer` file.
//
// Named for this plugin (deck_add_app_timer) rather than the deck_add_timer they were when App
// Timer and Power Timer were one Schedules plugin: two plugins registering the same tool name
// would collide in the MCP server.
//
// Nothing is imported at run time — the server passes its own zod and store helpers in. The type
// import below is erased at build time.
import type { DeckMcp, McpServer, Job, JobFile, Weekday } from "../shim/mcp.js";

const module = "app-closer";

export function register(server: McpServer, deck: DeckMcp) {
  const { z, ok, weekday, readJson, writeJson, newId, nextFire } = deck;

  server.tool(
    "deck_add_app_timer",
    "Schedule an app to close. " +
      "Either delayMinutes (one-time) OR atTime 'HH:mm'. Recurring needs atTime + days.",
    {
      target: z.string().describe("the app's process name, e.g. chrome.exe"),
      delayMinutes: z.number().int().positive().optional(),
      atTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).optional(),
      recurring: z.boolean().default(false),
      days: z.array(weekday).default([]),
    },
    async ({ target, delayMinutes, atTime, recurring, days }) => {
      const now = Date.now();
      let mode: "delay" | "atTime";
      let fireAt: number | null;
      if (delayMinutes != null) {
        if (recurring) return ok("Error: recurring needs atTime, not delayMinutes.");
        mode = "delay"; fireAt = now + delayMinutes * 60_000;
      } else if (atTime) {
        if (recurring && days.length === 0) return ok("Error: recurring needs at least one day.");
        mode = "atTime";
        fireAt = nextFire({ mode, recurring, days, timeOfDay: atTime, fireAt: 0 }, now);
      } else {
        return ok("Error: provide delayMinutes or atTime.");
      }
      if (fireAt == null) return ok("Error: could not compute a fire time.");

      const payload = { app: target };
      const job: Job = {
        id: newId(), module, label: target, mode, recurring, days: days as Weekday[],
        timeOfDay: mode === "atTime" ? atTime : undefined, fireAt, warned: false, payload,
      };
      const f = readJson<JobFile>(module, { jobs: [] });
      f.jobs.push(job);
      writeJson(module, f);
      return ok(`Added app timer '${target}' (id ${job.id}) firing ${new Date(fireAt).toISOString()}.`);
    },
  );

  server.tool(
    "deck_cancel_app_timer",
    "Cancel a timer by id (from deck_list).",
    { id: z.string() },
    async ({ id }) => {
      const f = readJson<JobFile>(module, { jobs: [] });
      const before = f.jobs.length;
      f.jobs = f.jobs.filter((j) => j.id !== id);
      writeJson(module, f);
      return ok(before === f.jobs.length ? `No timer with id ${id}.` : `Cancelled ${id}.`);
    },
  );
}
