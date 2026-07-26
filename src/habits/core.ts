import type { Ctx, Session } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

export type Schedule = "daily" | "weekdays" | "weekly";
export type Status = "done" | "skipped";

export interface Habit { id: string; title: string; schedule: Schedule; times: string[]; enabled: boolean; createdAt: string; }
export interface Occurrence { habitId: string; date: string; status: Status; timestamp: string; }
export interface UserData { timeZone: string; milestones: boolean; habits: Habit[]; occurrences: Occurrence[]; }

declare global { var __habitClock: (() => Date) | undefined; }
export const now = (): Date => globalThis.__habitClock?.() ?? new Date();
export const today = (timeZone = "UTC"): string => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now());
export const dateBefore = (days: number, timeZone: string): string => {
  const d = new Date(now().getTime() - days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

function data(ctx: Ctx): UserData {
  const s = ctx.session as Session;
  s.habits ??= { timeZone: "UTC", milestones: true, habits: [], occurrences: [] };
  const cutoff = dateBefore(365, s.habits.timeZone);
  s.habits.occurrences = s.habits.occurrences.filter((o) => o.date >= cutoff);
  return s.habits;
}
export const getData = data;
export function currentUser(ctx: Ctx): UserData { return data(ctx); }
export function activeHabits(ctx: Ctx): Habit[] { return data(ctx).habits.filter((h) => h.enabled); }
export function findHabit(ctx: Ctx, id: string): Habit | undefined { return data(ctx).habits.find((h) => h.id === id); }
export function record(ctx: Ctx, habitId: string, date: string, status: Status): boolean {
  const d = data(ctx); const old = d.occurrences.find((o) => o.habitId === habitId && o.date === date);
  if (old) { old.status = status; old.timestamp = now().toISOString(); return false; }
  d.occurrences.push({ habitId, date, status, timestamp: now().toISOString() }); return true;
}
export function stats(ctx: Ctx, habit: Habit) {
  const d = data(ctx); const all = d.occurrences.filter((o) => o.habitId === habit.id);
  const week = Array.from({ length: 7 }, (_, i) => dateBefore(i, d.timeZone));
  const completed = week.filter((day) => all.some((o) => o.date === day && o.status === "done")).length;
  let current = 0; for (const day of week) { if (all.some((o) => o.date === day && o.status === "done")) current++; else break; }
  const doneDays = new Set(all.filter((o) => o.status === "done").map((o) => o.date)); let longest = 0; let run = 0;
  for (let i = 364; i >= 0; i--) { if (doneDays.has(dateBefore(i, d.timeZone))) { run++; longest = Math.max(longest, run); } else run = 0; }
  return { completed, current, longest, rate: Math.round((completed / 7) * 100) };
}
export function menuBack() { return inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]); }
export function scheduleKeyboard() { return inlineKeyboard([[inlineButton("Daily", "habit:schedule:daily"), inlineButton("Weekdays", "habit:schedule:weekdays")], [inlineButton("Times each week", "habit:schedule:weekly")], [inlineButton("Back", "menu:main")]]); }
export function flow(ctx: Ctx, step: Session["step"], draft?: Session["draft"]): void { ctx.session.step = step; ctx.session.draft = draft; }
export function clearFlow(ctx: Ctx): void { ctx.session.step = undefined; ctx.session.draft = undefined; }
export function validTime(value: string): boolean { return /^([01]\d|2[0-3]):[0-5]\d(?:\s*,\s*([01]\d|2[0-3]):[0-5]\d)?$/.test(value); }
