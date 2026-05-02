import { sendMessage, approvalKeyboard, answerCallbackQuery, editMessageReplyMarkup, MAIN_MENU } from "./client.js";
import {
  isAdmin, isAuthorized, isPending,
  addPending, approveUser, revokeUser, removePending, getPendingUser,
  getAdminChatId,
} from "./users.js";
import type { BaleMessage, BaleCallbackQuery } from "../types.js";

type CommandHandler = (msg: BaleMessage) => Promise<void>;

const BUTTON_ALIASES: Record<string, string> = {
  "🔍 جستجوی فوری": "/crawl",
  "📊 وضعیت":        "/status",
  "✅ روشن کردن":    "/on",
  "⏹ خاموش کردن":   "/off",
  "🛑 توقف جستجو":  "/stop",
  "🚪 لغو اشتراک":  "/leave",
};

const handlers: Record<string, CommandHandler> = {
  "/start": async (msg) => {
    const chatId = String(msg.chat.id);
    const name = msg.from.first_name || "کاربر";

    if (isAuthorized(chatId)) {
      await sendMessage(chatId, `سلام ${name}! 👋\nخوش آمدید.`, MAIN_MENU);
      return;
    }

    if (isPending(chatId)) {
      await sendMessage(chatId, "⏳ درخواست شما در انتظار تأیید ادمین است.");
      return;
    }

    const adminId = getAdminChatId();
    if (!adminId) {
      await sendMessage(chatId, "⚠️ در حال حاضر امکان ثبت‌نام وجود ندارد.");
      return;
    }

    addPending(chatId, name);

    await sendMessage(
      adminId,
      `👤 *درخواست دسترسی جدید*\n\nنام: ${name}\nآیدی: \`${chatId}\``,
      approvalKeyboard(chatId)
    );

    await sendMessage(chatId, "⏳ درخواست شما ارسال شد. منتظر تأیید ادمین باشید.");
  },

  "/leave": async (msg) => {
    const chatId = String(msg.chat.id);
    revokeUser(chatId);
    await sendMessage(chatId, "شما از لیست دریافت اعلان‌ها حذف شدید.\nبرای بازگشت /start را ارسال کنید.");
  },

  "/stop": async (msg) => {
    const chatId = String(msg.chat.id);
    if (!isAuthorized(chatId)) return;
    const { abortCrawl, isCrawlRunning } = await import("../crawler/runner.js");
    if (!isCrawlRunning()) {
      await sendMessage(chatId, "در حال حاضر جستجویی در جریان نیست.", MAIN_MENU);
      return;
    }
    abortCrawl();
    await sendMessage(chatId, "🛑 جستجوی در حال انجام متوقف شد.", MAIN_MENU);
  },

  "/crawl": async (msg) => {
    const chatId = String(msg.chat.id);
    if (!isAuthorized(chatId)) return;
    const { isCrawlRunning } = await import("../crawler/runner.js");
    if (isCrawlRunning()) {
      await sendMessage(chatId, "⚠️ یک جستجو در حال اجراست. برای توقف از 🛑 استفاده کنید.", MAIN_MENU);
      return;
    }
    await sendMessage(chatId, "🔍 در حال جستجو... لطفاً صبر کنید.", MAIN_MENU);
    const { runAllAdapters } = await import("../crawler/runner.js");
    await runAllAdapters();
    await sendMessage(chatId, "✅ جستجو به پایان رسید.", MAIN_MENU);
  },

  "/on": async (msg) => {
    const chatId = String(msg.chat.id);
    if (!isAuthorized(chatId)) return;
    const { startScheduler } = await import("../scheduler.js");
    startScheduler();
    await sendMessage(chatId, "✅ جستجوی خودکار فعال شد.", MAIN_MENU);
  },

  "/off": async (msg) => {
    const chatId = String(msg.chat.id);
    if (!isAuthorized(chatId)) return;
    const { stopScheduler } = await import("../scheduler.js");
    stopScheduler();
    await sendMessage(chatId, "⏹ جستجوی خودکار غیرفعال شد.", MAIN_MENU);
  },

  "/status": async (msg) => {
    const chatId = String(msg.chat.id);
    if (!isAuthorized(chatId)) return;
    const { getSchedulerStatus } = await import("../scheduler.js");
    const { isCrawlRunning } = await import("../crawler/runner.js");
    const status = getSchedulerStatus();
    const schedulerLabel = status.running ? "✅ فعال" : "⏹ غیرفعال";
    const crawlLabel = isCrawlRunning() ? "🔍 در حال اجرا" : "⏸ غیرفعال";
    const lastRuns = Object.entries(status.lastRunBySite)
      .map(([site, time]) => `  • ${site}: ${time}`)
      .join("\n");

    await sendMessage(
      chatId,
      `📊 *وضعیت سیستم*\n\nجستجوی خودکار: ${schedulerLabel}\nجستجوی جاری: ${crawlLabel}\n\nآخرین جستجو:\n${lastRuns || "  هنوز اجرا نشده"}`,
      MAIN_MENU
    );
  },
};

export async function handleCommand(msg: BaleMessage) {
  const text = (msg.text || "").trim();
  const resolved = BUTTON_ALIASES[text] ?? text.split(" ")[0].toLowerCase();
  const handler = handlers[resolved];
  if (handler) await handler(msg);
}

export async function handleCallbackQuery(cb: BaleCallbackQuery) {
  const adminChatId = String(cb.from.id);
  if (!isAdmin(adminChatId)) return;

  const [action, targetChatId] = (cb.data ?? "").split(":");
  if (!action || !targetChatId) return;

  if (action === "approve") {
    const pending = getPendingUser(targetChatId);
    approveUser(targetChatId, pending?.firstName ?? targetChatId);
    await sendMessage(targetChatId, "✅ درخواست شما تأیید شد! به ربات خوش آمدید.", MAIN_MENU);
    await answerCallbackQuery(cb.id, "کاربر تأیید شد");
    if (cb.message) {
      await editMessageReplyMarkup(adminChatId, cb.message.message_id, {});
      await sendMessage(adminChatId, `✅ کاربر \`${targetChatId}\` تأیید شد.`);
    }
  } else if (action === "reject") {
    removePending(targetChatId);
    revokeUser(targetChatId);
    await sendMessage(targetChatId, "❌ متأسفانه درخواست شما رد شد.");
    await answerCallbackQuery(cb.id, "کاربر رد شد");
    if (cb.message) {
      await editMessageReplyMarkup(adminChatId, cb.message.message_id, {});
      await sendMessage(adminChatId, `❌ کاربر \`${targetChatId}\` رد شد.`);
    }
  }
}
