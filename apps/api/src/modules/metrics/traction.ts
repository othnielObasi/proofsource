// Traction metrics, computed from real settled state — the exact figures the Lepton
// rubric and submission form ask for:
//   RFB 6: creators earning · total creator payouts · average payment per piece · reader-to-payer conversion
//   RFB 1: total autonomous payments · average transaction size (sub-cent) · budget utilization · cost per task
// Everything here is derived from receipts/payments/audit, so it reflects what actually
// settled — seeded demos and mockups contribute nothing.

import { store } from "../../db.js";

export interface TractionReport {
  generatedAt: string;
  paymentMode: string;
  // task funnel
  tasks: number;          // agent runs
  buys: number;
  reuses: number;
  skips: number;
  // creator economics (RFB 6)
  creatorsEarning: number;
  totalPayoutUsdc: string;
  avgPaymentUsdc: string;
  readerToPayerConversion: number; // share of tasks that resulted in a payment
  reuseRate: number;               // share of tasks served from already-paid context
  // agent economics (RFB 1)
  paymentCount: number;
  avgTransactionUsdc: string;
  budgetUtilization: number;       // spent / total budget across readers
  costPerTaskUsdc: string;
  // breakdowns
  perCreator: Array<{ creator: string; sales: number; earningsUsdc: string }>;
  readers: number;
}

function countEvents(type: string): number {
  return store.auditEvents.filter((e) => e.eventType === type).length;
}

export function computeTraction(paymentMode = "mock"): TractionReport {
  const payments = [...store.payments.values()].filter((p) => p.status === "released");
  const paymentCount = payments.length;
  const totalPayout = payments.reduce((s, p) => s + Number(p.amountUsdc), 0);

  const tasks = countEvents("agent.decided");
  const buys = countEvents("payment.released");
  const reuses = countEvents("paid_context.reused");
  const skips = countEvents("purchase.skipped");

  const earningByProvider = new Map<string, number>();
  for (const r of store.receipts.values()) {
    const a = store.authorizations.get(r.authorizationId);
    const amt = Number(a?.amountUsdc ?? 0);
    earningByProvider.set(r.providerId, (earningByProvider.get(r.providerId) ?? 0) + amt);
  }
  const perCreator = [...earningByProvider.entries()].map(([pid, earnings]) => ({
    creator: store.providers.get(pid)?.name ?? pid,
    sales: [...store.receipts.values()].filter((r) => r.providerId === pid).length,
    earningsUsdc: earnings.toFixed(6),
  })).sort((a, b) => Number(b.earningsUsdc) - Number(a.earningsUsdc));

  const readers = store.workspaces.size;
  const totalBudget = [...store.workspaces.values()]
    .reduce((s, w) => s + Number(w.mandate?.budgetUsdc ?? w.budgetUsdc ?? 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    paymentMode,
    tasks, buys, reuses, skips,
    creatorsEarning: earningByProvider.size,
    totalPayoutUsdc: totalPayout.toFixed(6),
    avgPaymentUsdc: paymentCount ? (totalPayout / paymentCount).toFixed(6) : "0.000000",
    readerToPayerConversion: tasks ? +(buys / tasks).toFixed(3) : 0,
    reuseRate: tasks ? +(reuses / tasks).toFixed(3) : 0,
    paymentCount,
    avgTransactionUsdc: paymentCount ? (totalPayout / paymentCount).toFixed(6) : "0.000000",
    budgetUtilization: totalBudget ? +(totalPayout / totalBudget).toFixed(4) : 0,
    costPerTaskUsdc: tasks ? (totalPayout / tasks).toFixed(6) : "0.000000",
    perCreator,
    readers,
  };
}
