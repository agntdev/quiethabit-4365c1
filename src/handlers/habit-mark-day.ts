import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { activeHabits, dateBefore, getData, menuBack, record, stats, today } from "../habits/core.js";
import { snoozeHabit } from "../habits/reminders.js";

registerMainMenuItem({ label: "Mark a day", data: "habit:mark_day", order: 30 });
const composer = new Composer<Ctx>();
composer.callbackQuery("habit:mark_day", async (ctx) => {
  await ctx.answerCallbackQuery(); const u = getData(ctx);
  if (!activeHabits(ctx).length) { await ctx.reply("No habits yet — tap Add habit to create one.", { reply_markup: menuBack() }); return; }
  const rows = Array.from({ length: 8 }, (_, i) => [inlineButton(i === 0 ? "Today" : `${i} days ago`, `habit:day:${dateBefore(i, u.timeZone)}`)]);
  await ctx.reply("Choose a day from the last week.", { reply_markup: inlineKeyboard([...rows, [inlineButton("Back to menu", "menu:main")]]) });
});
composer.callbackQuery(/^habit:day:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
  await ctx.answerCallbackQuery(); const date = ctx.match[1]; const u = getData(ctx);
  if (date < dateBefore(7, u.timeZone) || date > today(u.timeZone)) { await ctx.reply("That day is outside the last seven days. Choose a more recent day."); return; }
  await ctx.editMessageText("Which habit are you logging?", { reply_markup: inlineKeyboard(activeHabits(ctx).map((h) => [inlineButton(h.title, `habit:pick:${date}:${h.id}`)])) });
});
composer.callbackQuery(/^habit:pick:(\d{4}-\d{2}-\d{2}):(h[^:]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery(); const [, date, id] = ctx.match;
  await ctx.editMessageText("How did it go?", { reply_markup: inlineKeyboard([[inlineButton("Done", `habit:check:${id}:done:${date}`), inlineButton("Skipped", `habit:check:${id}:skipped:${date}`)], [inlineButton("Back to menu", "menu:main")]]) });
});
composer.callbackQuery(/^habit:check:(h[^:]+):(done|skipped)(?::(\d{4}-\d{2}-\d{2}))?$/, async (ctx) => {
  await ctx.answerCallbackQuery(); const [, id, status, picked] = ctx.match; const u = getData(ctx); const date = picked ?? today(u.timeZone);
  const habit = activeHabits(ctx).find((h) => h.id === id); if (!habit) { await ctx.reply("I couldn’t find that habit. Try opening your menu again.", { reply_markup: menuBack() }); return; }
  const fresh = record(ctx, id, date, status as "done" | "skipped"); const s = stats(ctx, habit);
  if (status === "done" && u.milestones && fresh && [7, 30, 90].includes(s.current)) await ctx.reply(`${s.current} days in a row for “${habit.title}”. That steady care adds up.`);
  await ctx.editMessageText(status === "done" ? `Logged “${habit.title}” as done. Your current streak is ${s.current} day${s.current === 1 ? "" : "s"}.` : `Logged “${habit.title}” as skipped. Tomorrow is a fresh chance.`, { reply_markup: menuBack() });
});
composer.callbackQuery(/^reminder:(h[^:]+):(done|skipped|snooze)$/, async (ctx) => {
  await ctx.answerCallbackQuery(); const [, id, action] = ctx.match; const habit = activeHabits(ctx).find((h) => h.id === id);
  if (!habit) { await ctx.reply("That habit is no longer active."); return; }
  if (action === "snooze") { await snoozeHabit(ctx, habit); await ctx.editMessageText(`Okay — I’ll check in about “${habit.title}” again in 30 minutes.`, { reply_markup: inlineKeyboard([[inlineButton("Done", `reminder:${id}:done`), inlineButton("Skip", `reminder:${id}:skipped`)]]), }); return; }
  const fresh = record(ctx, id, today(getData(ctx).timeZone), action as "done" | "skipped"); const s = stats(ctx, habit);
  await ctx.editMessageText(action === "done" ? `Nice work — “${habit.title}” is logged. Your streak is ${s.current} day${s.current === 1 ? "" : "s"}.` : `“${habit.title}” is skipped for today. Be gentle with yourself.`, { reply_markup: menuBack() });
  if (!fresh) return;
});
export default composer;
