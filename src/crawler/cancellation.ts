let abortController: AbortController | null = null;
let running = false;

export function beginCrawl(): AbortSignal {
  abortController = new AbortController();
  running = true;
  return abortController.signal;
}

export function abortCrawl() {
  abortController?.abort();
  running = false;
}

export function endCrawl() {
  running = false;
  abortController = null;
}

export function isCrawlRunning(): boolean {
  return running;
}
