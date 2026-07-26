import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import type { Habit } from "./core.js";
import { now } from "./core.js";

export async function snoozeHabit(ctx: Ctx, habit: Habit): Promise<void> {
  const env = (ctx as unknown as { env?: unknown }).env;
  if (!env || !ctx.chat) return;
  const { remindAt } = await import("../toolkit/session/durable.js");
  await remindAt(env as Parameters<typeof remindAt>[0], ctx.chat.id, now().getTime() + 30 * 60_000, `A gentle check-in: did you do “${habit.title}”?`, inlineKeyboard([[inlineButton("Done", `reminder:${habit.id}:done`), inlineButton("Skip", `reminder:${habit.id}:skipped`)]]));
}
