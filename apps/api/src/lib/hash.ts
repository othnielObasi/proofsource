import { createHash, randomUUID } from "node:crypto";

export function sha256(input: string): string {
  return "sha256:" + createHash("sha256").update(input, "utf8").digest("hex");
}

export function id(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isoPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// USDC arithmetic in integer micro-units (1 USDC = 1_000_000 micro) to avoid float drift.
export function usdcToMicros(usdc: string | number): number {
  return Math.round(Number(usdc) * 1_000_000);
}
export function microsToUsdc(micros: number): string {
  return (micros / 1_000_000).toFixed(6);
}
export function centsOf(usdc: string | number): number {
  return Number(usdc) * 100;
}
