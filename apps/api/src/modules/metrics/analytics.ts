// Public analytics — registered users by category and daily traffic. Derived from
// real accounts/login events only (same "no fake data" rule as traction.ts), so the
// chart starts sparse and grows organically as people actually sign up and log in.

import { store } from "../../db.js";

export interface PublicAnalytics {
  generatedAt: string;
  totalUsers: number;
  usersByCategory: Array<{ category: string; count: number }>;
  dailyTraffic: Array<{ date: string; logins: number; signups: number }>;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

export function computePublicAnalytics(days = 14): PublicAnalytics {
  const accounts = [...store.accounts.values()] as Array<{ role: string; createdAt: string }>;
  const visible = accounts.filter((a) => a.role !== "admin"); // admin headcount isn't public

  const byCategory = new Map<string, number>();
  for (const a of visible) byCategory.set(a.role, (byCategory.get(a.role) ?? 0) + 1);

  const dateKeys: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dateKeys.push(d.toISOString().slice(0, 10));
  }

  const loginsByDay = new Map<string, number>();
  for (const e of store.loginEvents) loginsByDay.set(dayKey(e.at), (loginsByDay.get(dayKey(e.at)) ?? 0) + 1);

  const signupsByDay = new Map<string, number>();
  for (const a of visible) signupsByDay.set(dayKey(a.createdAt), (signupsByDay.get(dayKey(a.createdAt)) ?? 0) + 1);

  const dailyTraffic = dateKeys.map((date) => ({
    date,
    logins: loginsByDay.get(date) ?? 0,
    signups: signupsByDay.get(date) ?? 0,
  }));

  return {
    generatedAt: new Date().toISOString(),
    totalUsers: visible.length,
    usersByCategory: [...byCategory.entries()].map(([category, count]) => ({ category, count })),
    dailyTraffic,
  };
}
