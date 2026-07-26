import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { activeHabits, getData, menuBack, stats } from "../habits/core.js";
registerMainMenuItem({ label: "View stats", data: "stats:view", order: 40 });
const composer = new Composer<Ctx>();
function recap(ctx: Ctx): string { const habits = activeHabits(ctx); if (!habits.length) return "No habits yet — tap Add habit to create one."; return "Your last 7 days:\n\n" + habits.map((h) => { const s = stats(ctx, h); return `“${h.title}”: ${s.completed}/7 done (${s.rate}%), current streak ${s.current}, best ${s.longest}.`; }).join("\n") + "\n\nSmall, kind steps count."; }
composer.callbackQuery("stats:view", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.reply(recap(ctx), { reply_markup: inlineKeyboard([[inlineButton("Settings", "settings:open")], [inlineButton("Back to menu", "menu:main")]]) }); });
composer.callbackQuery("stats:weekly", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.editMessageText(recap(ctx), { reply_markup: menuBack() }); });
composer.callbackQuery("settings:open", async (ctx) => { await ctx.answerCallbackQuery(); const u = getData(ctx); await ctx.editMessageText(`Your time zone is ${u.timeZone}. Milestone notes are ${u.milestones ? "on" : "off"}.`, { reply_markup: inlineKeyboard([[inlineButton("Set time zone", "settings:timezone")], [inlineButton(u.milestones ? "Turn milestones off" : "Turn milestones on", "settings:milestones")], [inlineButton("Back to menu", "menu:main")]]) }); });
composer.callbackQuery("settings:milestones", async (ctx) => { await ctx.answerCallbackQuery(); const u = getData(ctx); u.milestones = !u.milestones; await ctx.editMessageText(u.milestones ? "Milestone notes are on. I’ll celebrate your steady progress." : "Milestone notes are off. Your tracking stays quiet.", { reply_markup: menuBack() }); });
composer.callbackQuery("settings:timezone", async (ctx) => { await ctx.answerCallbackQuery(); ctx.session.step = "timezone"; await ctx.editMessageText("Send an IANA time zone, like Europe/London or America/New_York."); });
composer.on("message:text", async (ctx, next) => { if (ctx.session.step !== "timezone") return next(); const zone = ctx.message.text.trim(); try { new Intl.DateTimeFormat("en", { timeZone: zone }); } catch { await ctx.reply("I couldn’t use that time zone. Try a name like Europe/London."); return; } getData(ctx).timeZone = zone; ctx.session.step = undefined; await ctx.reply(`Your time zone is now ${zone}. Future reminders will follow your local time.`, { reply_markup: menuBack() }); });
export default composer;
