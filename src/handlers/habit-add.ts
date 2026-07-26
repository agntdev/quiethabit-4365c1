import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { activeHabits, clearFlow, currentUser, flow, menuBack, now, scheduleKeyboard, validTime } from "../habits/core.js";

registerMainMenuItem({ label: "Add habit", data: "habit:add", order: 10 });
const composer = new Composer<Ctx>();

composer.callbackQuery("habit:add", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (activeHabits(ctx).length >= 5) { await ctx.reply("You’ve reached the five-habit free limit. Your existing habits are still here to support you.", { reply_markup: menuBack() }); return; }
  flow(ctx, "habit_title");
  await ctx.reply("What would you like to make a habit? Send a short title.", { reply_markup: { force_reply: true, input_field_placeholder: "For example, Read for 10 minutes" } });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "habit_title") return next();
  const title = ctx.message.text.trim();
  if (!title || title.length > 80 || title.startsWith("/")) { await ctx.reply("Keep it between 1 and 80 characters, then try again."); return; }
  flow(ctx, undefined, { title });
  await ctx.reply("How often would you like to do it?", { reply_markup: scheduleKeyboard() });
});

composer.callbackQuery(/^habit:schedule:(daily|weekdays|weekly)$/, async (ctx, next) => {
  if (ctx.session.draft?.id) return next();
  await ctx.answerCallbackQuery();
  const schedule = ctx.match[1] as "daily" | "weekdays" | "weekly";
  flow(ctx, "habit_times", { ...ctx.session.draft, schedule });
  await ctx.editMessageText("When should I remind you? Send one or two local times, like 08:00 or 08:00, 20:30.");
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "habit_times") return next();
  const times = ctx.message.text.trim();
  if (!validTime(times)) { await ctx.reply("Use one or two times in 24-hour format, like 08:00 or 08:00, 20:30."); return; }
  const draft = ctx.session.draft;
  if (!draft?.title || !draft.schedule) { clearFlow(ctx); await ctx.reply("That setup slipped away. Tap Add habit and we’ll start again.", { reply_markup: menuBack() }); return; }
  const user = currentUser(ctx); const id = `h${nowId(ctx)}`;
  user.habits.push({ id, title: draft.title, schedule: draft.schedule, times: times.split(",").map((t) => t.trim()), enabled: true, createdAt: now().toISOString() });
  clearFlow(ctx);
  await ctx.reply(`“${draft.title}” is ready. I’ll remind you at ${times} in your ${user.timeZone} time zone.`, { reply_markup: inlineKeyboard([[inlineButton("Mark today", `habit:check:${id}:done`)], [inlineButton("Back to menu", "menu:main")]]) });
});

function nowId(ctx: Ctx): string { return String(currentUser(ctx).habits.length + 1); }
export default composer;
