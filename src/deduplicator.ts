import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(process.cwd(), "data");
const SEEN_FILE = resolve(DATA_DIR, "seen-jobs.json");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readSeen(): Set<string> {
  ensureDataDir();
  if (!existsSync(SEEN_FILE)) return new Set();
  const raw = JSON.parse(readFileSync(SEEN_FILE, "utf-8")) as string[];
  return new Set(raw);
}

function writeSeen(seen: Set<string>) {
  ensureDataDir();
  writeFileSync(SEEN_FILE, JSON.stringify([...seen], null, 2), "utf-8");
}

export function isNewJob(id: string): boolean {
  return !readSeen().has(id);
}

export function markJobSeen(id: string) {
  const seen = readSeen();
  seen.add(id);
  writeSeen(seen);
}

export function markJobsSeen(ids: string[]) {
  const seen = readSeen();
  for (const id of ids) seen.add(id);
  writeSeen(seen);
}

export function makeJobId(site: string, title: string, company: string, postedAt: string): string {
  const raw = `${site}::${title}::${company}::${postedAt}`;
  return Buffer.from(raw).toString("base64url").slice(0, 64);
}
