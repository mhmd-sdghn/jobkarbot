import { PlaywrightCrawler, sleep } from "crawlee";
import { BaseAdapter } from "./base.js";
import { makeJobId } from "../../deduplicator.js";
import { loadConfig } from "../../config.js";
import type { JobPost } from "../../types.js";

export class JobinjaAdapter extends BaseAdapter {
  async scrape(): Promise<JobPost[]> {
    const { keywords } = loadConfig();
    const results: JobPost[] = [];
    const seen = new Set<string>();

    for (const query of keywords.searchQueries) {
      const url = this.buildSearchUrl(query);
      const pageResults = await this.scrapePage(url);

      for (const job of pageResults) {
        if (!seen.has(job.id)) {
          seen.add(job.id);
          results.push(job);
        }
      }

      await sleep(3000);
    }

    return results;
  }

  private async scrapePage(url: string): Promise<JobPost[]> {
    const { keywords } = loadConfig();
    const jobs: JobPost[] = [];

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,
      requestHandlerTimeoutSecs: 30,
      headless: true,

      requestHandler: async ({ page }) => {
        await page.waitForSelector("ul.o-listView__list li", { timeout: 15000 }).catch(() => {});

        const cards = await page.$$eval("ul.o-listView__list li", (items) =>
          items.map((el) => {
            const titleEl = el.querySelector("h2 a, .title a, [class*='title'] a");
            const companyEl = el.querySelector("[class*='company'], [class*='employer']");
            const locationEl = el.querySelector("[class*='location'], [class*='city']");
            const typeEl = el.querySelector("[class*='type'], [class*='contract'], [class*='badge']");
            const dateEl = el.querySelector("[class*='date'], [class*='time'], [class*='ago']");
            const linkEl = el.querySelector("a[href*='/jobs/']");

            return {
              title: titleEl?.textContent?.trim() || "",
              company: companyEl?.textContent?.trim() || "",
              location: locationEl?.textContent?.trim() || "",
              jobType: typeEl?.textContent?.trim() || "",
              postedAt: dateEl?.textContent?.trim() || "",
              url: linkEl?.getAttribute("href") || "",
            };
          })
        );

        for (const card of cards) {
          if (!card.title || !card.url) continue;

          const fullUrl = card.url.startsWith("http")
            ? card.url
            : `${this.site.baseUrl}${card.url}`;

          if (!this.isWithinDays(card.postedAt, this.site.maxDaysOld)) continue;

          const searchText = `${card.title} ${card.company} ${card.location} ${card.jobType}`;
          const matches = keywords.requiredMatch.some((group) =>
            group.some((term) =>
              searchText.toLowerCase().includes(term.toLowerCase())
            )
          );
          if (!matches) continue;

          const id = makeJobId(this.site.name, card.title, card.company, card.postedAt);

          jobs.push({
            id,
            title: card.title,
            company: card.company,
            location: card.location,
            jobType: card.jobType,
            postedAt: card.postedAt,
            url: fullUrl,
            site: this.site.name,
            score: 0,
            matchedTerms: [],
          });
        }
      },
    });

    await crawler.run([url]);
    return jobs;
  }
}
