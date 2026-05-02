import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { loadConfig } from "./config.js";
import { startPolling } from "./bale/poller.js";
import { startScheduler, stopScheduler, getSchedulerStatus } from "./scheduler.js";
import { runAllAdapters } from "./crawler/runner.js";

const config = loadConfig();
const app = new Hono();

app.get("/", (c) => c.json({ status: "ok", service: "jobkar" }));

app.get("/status", (c) => c.json(getSchedulerStatus()));

app.post("/crawl/run", async (c) => {
  runAllAdapters().catch(console.error);
  return c.json({ ok: true, message: "Crawl started" });
});

app.post("/scheduler/start", (c) => {
  startScheduler();
  return c.json({ ok: true, message: "Scheduler started" });
});

app.post("/scheduler/stop", (c) => {
  stopScheduler();
  return c.json({ ok: true, message: "Scheduler stopped" });
});

const PORT = Number(process.env.PORT) || 3658;

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  startPolling();
  console.log(`[bot] Bale bot polling started — token: ${config.bale.botToken.slice(0, 10)}...`);
});
