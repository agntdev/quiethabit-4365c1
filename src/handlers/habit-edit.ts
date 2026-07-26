import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { activeHabits, clearFlow, findHabit, flow, menuBack, scheduleKeyboard, validTime } from "../habits/core.js";

registerMainMenuItem({ label: "Edit habit", data: "habit:edit", order: 20 });
const composer = new Composer<Ctx>();
composer.callbackQuery("habit:edit", async (ctx) => {
  await ctx.answerCallbackQuery(); const habits = activeHabits(ctx);
  if (!habits.length) { await ctx.reply("No habits to edit yet — tap Add habit to create one.", { reply_markup: menuBack() }); return; }
  await ctx.reply("Choose a habit to adjust.", { reply_markup: inlineKeyboard([...habits.map((h) => [inlineButton(h.title, `edit:pick:${h.id}`)]), [inlineButton("Back to menu", "menu:main")]]) });
});
composer.callbackQuery(/^edit:pick:(h[^:]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery(); const h = findHabit(ctx, ctx.match[1]); if (!h) return;
  await ctx.editMessageText(`What would you like to change for “${h.title}”?`, { reply_markup: inlineKeyboard([[inlineButton("Title", `edit:title:${h.id}`), inlineButton("Schedule", `edit:schedule:${h.id}`)], [inlineButton("Reminder times", `edit:times:${h.id}`)], [inlineButton("Pause habit", `edit:pause:${h.id}`), inlineButton("Back to menu", "menu:main")]]) });
});
composer.callbackQuery(/^edit:title:(h[^:]+)$/, async (ctx) => { await ctx.answerCallbackQuery(); flow(ctx, "edit_title", { id: ctx.match[1] }); await ctx.editMessageText("Send the new title for this habit."); });
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "edit_title") return next(); const title = ctx.message.text.trim(); const h = ctx.session.draft?.id && findHabit(ctx, ctx.session.draft.id);
  if (!h || !title || title.length > 80) { await ctx.reply("Keep the title between 1 and 80 characters, then try again."); return; }
  h.title = title; clearFlow(ctx); await ctx.reply(`“${title}” has its new name.`, { reply_markup: menuBack() });
});
composer.callbackQuery(/^edit:schedule:(h[^:]+)$/, async (ctx) => { await ctx.answerCallbackQuery(); flow(ctx, undefined, { id: ctx.match[1] }); await ctx.editMessageText("Choose the new rhythm.", { reply_markup: scheduleKeyboard() }); });
composer.callbackQuery(/^habit:schedule:(daily|weekdays|weekly)$/, async (ctx, next) => {
  const id = ctx.session.draft?.id; if (!id) return next(); await ctx.answerCallbackQuery(); const h = findHabit(ctx, id); if (!h) return;
  h.schedule = ctx.match[1] as typeof h.schedule; clearFlow(ctx); await ctx.editMessageText("Your schedule has been updated.", { reply_markup: menuBack() });
});
composer.callbackQuery(/^edit:times:(h[^:]+)$/, async (ctx) => { await ctx.answerCallbackQuery(); flow(ctx, "edit_times", { id: ctx.match[1] }); await ctx.editMessageText("Send one or two local times, like 08:00 or 08:00, 20:30."); });
composer.on("message:text", async (ctx, next) => { if (ctx.session.step !== "edit_times") return next(); const h = ctx.session.draft?.id && findHabit(ctx, ctx.session.draft.id); const times = ctx.message.text.trim(); if (!h || !validTime(times)) { await ctx.reply("Use one or two times in 24-hour format, then try again."); return; } h.times = times.split(",").map((t) => t.trim()); clearFlow(ctx); await ctx.reply("Your reminder times are updated.", { reply_markup: menuBack() }); });
composer.callbackQuery(/^edit:pause:(h[^:]+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const h = findHabit(ctx, ctx.match[1]); if (!h) return; h.enabled = false; await ctx.editMessageText(`“${h.title}” is paused. You can add a new habit whenever you’re ready.`, { reply_markup: menuBack() }); });
export default composer;
