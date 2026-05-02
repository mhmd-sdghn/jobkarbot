import { loadConfig } from "../config.js";
import { scoreJob } from "../scorer.js";
import { isNewJob, markJobSeen } from "../deduplicator.js";
import { broadcastMessage, formatJobMessage } from "../bale/client.js";
import { getRegisteredChatIds } from "../bale/users.js";
import { beginCrawl, endCrawl, abortCrawl, isCrawlRunning } from "./cancellation.js";
import { JobinjaAdapter } from "./adapters/jobinja.js";
import type { BaseAdapter } from "./adapters/base.js";
import type { SiteConfig, JobPost } from "../types.js";

export const lastRunBySite: Record<string, string> = {};

function getAdapter(site: SiteConfig): BaseAdapter | null {
  switch (site.name) {
    case "jobinja":
      return new JobinjaAdapter(site);
    default:
      console.warn(`[runner] No adapter for site: ${site.name}`);
      return null;
  }
}

function resolveTargetChatIds(): string[] {
  const { bale } = loadConfig();
  if (bale.chatIds.length > 0) return bale.chatIds;
  return getRegisteredChatIds();
}

export async function runAdapter(site: SiteConfig, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;

  const adapter = getAdapter(site);
  if (!adapter) return;

  console.log(`[runner] Crawling ${site.name}...`);

  let jobs: JobPost[];
  try {
    jobs = await adapter.scrape();
  } catch (err) {
    console.error(`[runner] Error scraping ${site.name}:`, err);
    return;
  }

  if (signal.aborted) {
    console.log(`[runner] Crawl aborted after scraping ${site.name}`);
    return;
  }

  const { keywords } = loadConfig();
  const chatIds = resolveTargetChatIds();

  if (chatIds.length === 0) {
    console.log("[runner] No recipients configured — skipping notification.");
    lastRunBySite[site.name] = new Date().toLocaleString("fa-IR");
    return;
  }

  let sentCount = 0;

  for (const job of jobs) {
    if (signal.aborted) break;
    if (!isNewJob(job.id)) continue;

    const { score, matchedTerms } = scoreJob(job, keywords);
    if (score < keywords.minScoreToNotify) continue;

    job.score = score;
    job.matchedTerms = matchedTerms;

    const message = formatJobMessage(job);
    await broadcastMessage(message, chatIds);
    markJobSeen(job.id);
    sentCount++;

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`[runner] ${site.name}: sent ${sentCount} new job(s)`);
  lastRunBySite[site.name] = new Date().toLocaleString("fa-IR");
}

export async function runAllAdapters(): Promise<void> {
  if (isCrawlRunning()) {
    console.log("[runner] A crawl is already running — skipping.");
    return;
  }

  const signal = beginCrawl();
  const { sites } = loadConfig();
  const enabled = sites.filter((s) => s.enabled);

  try {
    for (const site of enabled) {
      if (signal.aborted) break;
      await runAdapter(site, signal);
    }
  } finally {
    endCrawl();
  }
}

export { abortCrawl, isCrawlRunning };
