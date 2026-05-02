import type { BaleUpdate, JobPost } from "../types.js";
import { loadConfig } from "../config.js";

type KeyboardButton = { text: string };
type ReplyKeyboardMarkup = {
  keyboard: KeyboardButton[][];
  resize_keyboard?: boolean;
};
type InlineKeyboardButton = { text: string; callback_data?: string; url?: string };
type InlineKeyboardMarkup = { inline_keyboard: InlineKeyboardButton[][] };
type ReplyMarkup = ReplyKeyboardMarkup | InlineKeyboardMarkup;

export const MAIN_MENU: ReplyKeyboardMarkup = {
  keyboard: [
    [{ text: "🔍 جستجوی فوری" }, { text: "📊 وضعیت" }],
    [{ text: "✅ روشن کردن" },    { text: "⏹ خاموش کردن" }],
    [{ text: "🛑 توقف جستجو" },   { text: "🚪 لغو اشتراک" }],
  ],
  resize_keyboard: true,
};

export function approvalKeyboard(chatId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[
      { text: "✅ تأیید",    callback_data: `approve:${chatId}` },
      { text: "❌ رد کردن", callback_data: `reject:${chatId}` },
    ]],
  };
}

function apiUrl(method: string): string {
  const { bale } = loadConfig();
  return `${bale.apiBaseUrl}/bot${bale.botToken}/${method}`;
}

export async function getUpdates(offset?: number): Promise<BaleUpdate[]> {
  const params = new URLSearchParams({ limit: "100", timeout: "10" });
  if (offset !== undefined) params.set("offset", String(offset));

  const res = await fetch(`${apiUrl("getUpdates")}?${params}`);
  const data = (await res.json()) as { ok: boolean; result: BaleUpdate[] };
  return data.ok ? data.result : [];
}

export async function sendMessage(
  chatId: string,
  text: string,
  replyMarkup?: ReplyMarkup
): Promise<void> {
  await fetch(apiUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await fetch(apiUrl("answerCallbackQuery"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

export async function editMessageReplyMarkup(
  chatId: string,
  messageId: number,
  replyMarkup: InlineKeyboardMarkup | Record<string, never>
): Promise<void> {
  await fetch(apiUrl("editMessageReplyMarkup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    }),
  });
}

export async function broadcastMessage(text: string, chatIds: string[]): Promise<void> {
  await Promise.allSettled(chatIds.map((id) => sendMessage(id, text)));
}

export function formatJobMessage(job: JobPost): string {
  const stars = "⭐".repeat(Math.min(Math.round(job.score), 10));
  const terms = job.matchedTerms.length ? `🔑 کلمات کلیدی: ${job.matchedTerms.join(", ")}` : "";

  return [
    `💼 *${job.title}*`,
    `🏢 شرکت: ${job.company}`,
    `📍 مکان: ${job.location}`,
    `🕐 نوع قرارداد: ${job.jobType}`,
    `📅 تاریخ انتشار: ${job.postedAt}`,
    `امتیاز: ${job.score}/10 ${stars}`,
    terms,
    `🌐 سایت: ${job.site}`,
    `🔗 [مشاهده آگهی](${job.url})`,
  ]
    .filter(Boolean)
    .join("\n");
}
