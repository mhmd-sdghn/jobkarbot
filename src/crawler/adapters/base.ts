import type { SiteConfig, JobPost } from "../../types.js";

export abstract class BaseAdapter {
  constructor(protected site: SiteConfig) {}

  abstract scrape(): Promise<JobPost[]>;

  protected buildSearchUrl(keyword: string): string {
    return this.site.searchUrl.replace("{keyword}", encodeURIComponent(keyword));
  }

  protected isWithinDays(postedText: string, maxDays: number): boolean {
    const norm = postedText.toLowerCase();

    const todayPatterns = ["امروز", "today", "لحظاتی پیش", "همین الان", "ساعتی پیش", "چند ساعت"];
    if (todayPatterns.some((p) => norm.includes(p))) return true;

    const match = norm.match(/(\d+)\s*(روز|day)/);
    if (match) return parseInt(match[1]) <= maxDays;

    const weekMatch = norm.match(/(\d+)\s*(هفته|week)/);
    if (weekMatch) return parseInt(weekMatch[1]) * 7 <= maxDays;

    return true;
  }
}
