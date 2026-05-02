import { getUpdates } from "./client.js";
import { handleCommand, handleCallbackQuery } from "./commands.js";
import type { BaleUpdate } from "../types.js";

let pollingActive = false;
let lastOffset = 0;

export async function startPolling() {
  if (pollingActive) return;
  pollingActive = true;
  console.log("[bale] Bot polling started");
  poll();
}

export function stopPolling() {
  pollingActive = false;
  console.log("[bale] Bot polling stopped");
}

async function poll() {
  while (pollingActive) {
    try {
      const updates: BaleUpdate[] = await getUpdates(lastOffset || undefined);

      for (const update of updates) {
        lastOffset = update.update_id + 1;

        if (update.callback_query) {
          await handleCallbackQuery(update.callback_query);
        } else if (update.message?.text) {
          await handleCommand(update.message);
        }
      }
    } catch (err) {
      console.error("[bale] Polling error:", err);
    }

    await sleep(2000);
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
