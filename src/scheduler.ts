import { loadConfig } from "./config.js";
import { runAllAdapters, lastRunBySite } from "./crawler/runner.js";
import type { SchedulerState } from "./types.js";

const timers: Map<string, ReturnType<typeof setInterval>> = new Map();
let schedulerRunning = false;

export function startScheduler() {
  if (schedulerRunning) return;
  schedulerRunning = true;

  const { sites } = loadConfig();
  const enabled = sites.filter((s) => s.enabled);

  for (const site of enabled) {
    const intervalMs = site.crawlIntervalMinutes * 60 * 1000;
    const timer = setInterval(() => runAllAdapters(), intervalMs);
    timers.set(site.name, timer);
    console.log(`[scheduler] ${site.name} scheduled every ${site.crawlIntervalMinutes}m`);
  }

  runAllAdapters();
}

export function stopScheduler() {
  for (const [name, timer] of timers) {
    clearInterval(timer);
    console.log(`[scheduler] ${name} stopped`);
  }
  timers.clear();
  schedulerRunning = false;
}

export function getSchedulerStatus(): SchedulerState {
  return {
    running: schedulerRunning,
    lastRunBySite: { ...lastRunBySite },
  };
}
