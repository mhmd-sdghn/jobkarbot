import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(process.cwd(), "data");
const SEEN_FILE = resolve(DATA_DIR, "seen-jobs.json");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

type SeenMap = Record<string, string[]>;

function readSeenMap(): SeenMap {
  ensureDataDir();
  if (!existsSync(SEEN_FILE)) return {};
  const raw = JSON.parse(readFileSync(SEEN_FILE, "utf-8")) as SeenMap | string[];
  // Migrate old flat-array format: treat all existing IDs as seen for the sentinel key,
  // then the caller (runner) seeds real users on first run.
  if (Array.isArray(raw)) return { __legacy__: raw };
  return raw;
}

function writeSeenMap(map: SeenMap) {
  ensureDataDir();
  writeFileSync(SEEN_FILE, JSON.stringify(map, null, 2), "utf-8");
}

export function isNewJobForUser(id: string, chatId: string): boolean {
  const map = readSeenMap();
  const legacy = map.__legacy__ ?? [];
  const userSeen = map[chatId] ?? [];
  return !legacy.includes(id) && !userSeen.includes(id);
}

export function markJobSeenForUser(id: string, chatId: string) {
  const map = readSeenMap();
  if (!map[chatId]) map[chatId] = [];
  if (!map[chatId].includes(id)) map[chatId].push(id);
  writeSeenMap(map);
}

export function markJobsSeenForUser(ids: string[], chatId: string) {
  const map = readSeenMap();
  if (!map[chatId]) map[chatId] = [];
  for (const id of ids) {
    if (!map[chatId].includes(id)) map[chatId].push(id);
  }
  writeSeenMap(map);
}

export function clearSeenForUser(chatId: string) {
  const map = readSeenMap();
  delete map[chatId];
  writeSeenMap(map);
}

export function makeJobId(site: string, title: string, company: string, postedAt: string): string {
  const raw = `${site}::${title}::${company}::${postedAt}`;
  return Buffer.from(raw).toString("base64url").slice(0, 64);
}
