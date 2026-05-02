import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { loadConfig } from "../config.js";
import { clearSeenForUser } from "../deduplicator.js";
import type { BotUser } from "../types.js";

const DATA_DIR = resolve(process.cwd(), "data");
const APPROVED_FILE = resolve(DATA_DIR, "approved-users.json");
const PENDING_FILE = resolve(DATA_DIR, "pending-users.json");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readFile<T>(path: string, fallback: T): T {
  ensureDataDir();
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function writeFile<T>(path: string, data: T) {
  ensureDataDir();
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

// Admins are the chatIds defined in settings.json — always authorized
export function getAdminChatIds(): string[] {
  return loadConfig().bale.chatIds;
}

export function getAdminChatId(): string | null {
  return loadConfig().bale.chatIds[0] ?? null;
}

export function isAdmin(chatId: string): boolean {
  return loadConfig().bale.chatIds.includes(chatId);
}

// Approved users — added by admin via inline button
function readApproved(): BotUser[] {
  return readFile<BotUser[]>(APPROVED_FILE, []);
}

export function approveUser(chatId: string, firstName: string) {
  const users = readApproved();
  if (!users.find((u) => u.chatId === chatId)) {
    users.push({ chatId, firstName, registeredAt: new Date().toISOString() });
    writeFile(APPROVED_FILE, users);
  }
  removePending(chatId);
}

export function revokeUser(chatId: string) {
  writeFile(APPROVED_FILE, readApproved().filter((u) => u.chatId !== chatId));
  clearSeenForUser(chatId);
}

export function isApproved(chatId: string): boolean {
  return readApproved().some((u) => u.chatId === chatId);
}

export function getApprovedChatIds(): string[] {
  return readApproved().map((u) => u.chatId);
}

// Anyone in admins OR approved list can use the bot
export function isAuthorized(chatId: string): boolean {
  return isAdmin(chatId) || isApproved(chatId);
}

// All authorized recipients for job notifications
export function getRegisteredChatIds(): string[] {
  const adminIds = getAdminChatIds();
  const approvedIds = getApprovedChatIds();
  return [...new Set([...adminIds, ...approvedIds])];
}

// Pending users — waiting for admin approval
interface PendingUser {
  chatId: string;
  firstName: string;
  requestedAt: string;
}

function readPending(): PendingUser[] {
  return readFile<PendingUser[]>(PENDING_FILE, []);
}

export function addPending(chatId: string, firstName: string) {
  const pending = readPending();
  if (!pending.find((u) => u.chatId === chatId)) {
    pending.push({ chatId, firstName, requestedAt: new Date().toISOString() });
    writeFile(PENDING_FILE, pending);
  }
}

export function removePending(chatId: string) {
  writeFile(PENDING_FILE, readPending().filter((u) => u.chatId !== chatId));
}

export function isPending(chatId: string): boolean {
  return readPending().some((u) => u.chatId === chatId);
}

export function getPendingUser(chatId: string): PendingUser | undefined {
  return readPending().find((u) => u.chatId === chatId);
}
