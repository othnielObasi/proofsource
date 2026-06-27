// Serialize the whole store to a portable snapshot and back. Keeps the runtime store
// synchronous (no async refactor of the hot path) while making state durable: load on
// boot, save after writes. The Prisma schema in prisma/schema.prisma remains the
// normalized production target; this snapshot layer is what makes accrued volume
// survive restarts today.

import { store } from "../db.js";

export interface Snapshot {
  v: 1;
  workspaces: unknown[];
  providers: unknown[];
  resources: unknown[];
  authorizations: unknown[];
  payments: unknown[];
  deliveries: unknown[];
  verifications: unknown[];
  receipts: unknown[];
  paidContexts: unknown[];
  auditEvents: unknown[];
  accounts: unknown[];
  idempotency: Array<[string, string]>;
}

export function toSnapshot(): Snapshot {
  return {
    v: 1,
    workspaces: [...store.workspaces.values()],
    providers: [...store.providers.values()],
    resources: [...store.resources.values()],
    authorizations: [...store.authorizations.values()],
    payments: [...store.payments.values()],
    deliveries: [...store.deliveries.values()],
    verifications: [...store.verifications.values()],
    receipts: [...store.receipts.values()],
    paidContexts: [...store.paidContexts.values()],
    auditEvents: [...store.auditEvents],
    accounts: [...store.accounts.values()],
    idempotency: [...store.idempotency.entries()],
  };
}

export function loadSnapshot(s: Snapshot): void {
  store.reset();
  for (const w of s.workspaces as any[]) store.workspaces.set(w.id, w);
  for (const p of s.providers as any[]) store.providers.set(p.id, p);
  for (const r of s.resources as any[]) store.resources.set(r.id, r);
  for (const a of s.authorizations as any[]) store.authorizations.set(a.id, a);
  for (const p of s.payments as any[]) store.payments.set(p.id, p);
  for (const d of s.deliveries as any[]) store.deliveries.set(d.id, d);
  for (const v of s.verifications as any[]) store.verifications.set(v.id, v);
  for (const r of s.receipts as any[]) store.receipts.set(r.id, r);
  for (const c of s.paidContexts as any[]) store.paidContexts.set(c.id, c);
  store.auditEvents.push(...(s.auditEvents as any[]));
  for (const a of (s.accounts ?? []) as any[]) store.accounts.set(a.id, a);
  for (const [k, v] of s.idempotency) store.idempotency.set(k, v);
}

export function isEmptySnapshot(s: Snapshot | null): boolean {
  return !s || (s.workspaces.length === 0 && s.receipts.length === 0 && s.providers.length === 0);
}
