#!/usr/bin/env node
// Reconciliation job (PS1-05).
//
// For each settled receipt, checks that an on-chain settlement reference exists
// and (in arc_testnet mode) that the explorer can locate the transaction.
// Reports zero unexplained drift; public traction numbers only count reconciled
// settlements (i.e. those with a valid chainReference in arc_testnet mode).
//
// Usage:
//   npm run reconcile
//   RECONCILE_RPC=https://rpc.testnet.arc.network npm run reconcile

import { store } from "../src/db.js";
import { env, ARC_EXPLORER } from "../src/env.js";
import { persistence } from "../src/persistence/index.js";

interface ReconcileResult {
  total: number;
  reconciled: number;
  pending: number;       // waiting on batch settlement
  unmatched: number;     // receipt exists but no on-chain reference — alert
  mode: string;
  entries: Array<{
    receiptId: string;
    paymentId?: string;
    tx?: string;
    explorerUrl?: string;
    status: "reconciled" | "pending" | "unmatched";
    note?: string;
  }>;
}

async function reconcile(): Promise<ReconcileResult> {
  // Restore persisted state so we see the full settlement history
  await persistence.restore();

  const receipts = [...store.receipts.values()];
  const result: ReconcileResult = {
    total: receipts.length,
    reconciled: 0,
    pending: 0,
    unmatched: 0,
    mode: env.paymentMode,
    entries: [],
  };

  for (const receipt of receipts) {
    const payment = store.payments.get(receipt.paymentId);
    const ref = receipt.chainReference;
    const tx = ref?.transactionHash ?? ref?.circleTransactionId;

    if (env.paymentMode === "mock") {
      // Mock mode: no on-chain reference expected — all settlements are self-consistent.
      result.reconciled++;
      result.entries.push({
        receiptId: receipt.id,
        paymentId: receipt.paymentId,
        status: "reconciled",
        note: "mock mode — no on-chain verification required",
      });
      continue;
    }

    // arc_testnet mode: require a transaction reference.
    if (!tx) {
      result.unmatched++;
      result.entries.push({
        receiptId: receipt.id,
        paymentId: receipt.paymentId,
        status: "unmatched",
        note: "no on-chain transaction reference — payment may not have settled",
      });
      continue;
    }

    // Optionally verify the tx exists on the explorer (requires network access).
    const explorerUrl = ref?.explorerUrl ?? `${ARC_EXPLORER}/tx/${tx}`;
    let onChainStatus: "reconciled" | "pending" = "reconciled";
    let note: string | undefined;

    if (process.env.RECONCILE_VERIFY_ONCHAIN === "true") {
      try {
        const res = await fetch(`${ARC_EXPLORER}/api/v1/tx/${tx}`);
        if (!res.ok) {
          onChainStatus = "pending";
          note = `explorer returned ${res.status} — batch may not have settled yet`;
        }
      } catch {
        onChainStatus = "pending";
        note = "explorer unreachable — marking as pending";
      }
    }

    if (onChainStatus === "reconciled") result.reconciled++;
    else result.pending++;

    result.entries.push({
      receiptId: receipt.id,
      paymentId: receipt.paymentId,
      tx,
      explorerUrl,
      status: onChainStatus,
      note,
    });
  }

  return result;
}

reconcile().then((r) => {
  console.log("\n=== ProofSource Reconciliation Report ===");
  console.log(`Mode:        ${r.mode}`);
  console.log(`Total:       ${r.total} receipts`);
  console.log(`Reconciled:  ${r.reconciled}`);
  console.log(`Pending:     ${r.pending}  (batch settlement lag — check later)`);
  console.log(`Unmatched:   ${r.unmatched}  ${r.unmatched > 0 ? "⚠️  ALERT — investigate" : "✓"}`);

  if (r.unmatched > 0) {
    console.log("\n--- Unmatched receipts (requires investigation) ---");
    r.entries.filter((e) => e.status === "unmatched").forEach((e) => {
      console.log(`  Receipt: ${e.receiptId}  Payment: ${e.paymentId ?? "?"}  Note: ${e.note}`);
    });
  }

  if (r.pending > 0) {
    console.log("\n--- Pending receipts (batch not yet confirmed) ---");
    r.entries.filter((e) => e.status === "pending").forEach((e) => {
      console.log(`  Receipt: ${e.receiptId}  TX: ${e.tx}  ${e.explorerUrl}`);
    });
  }

  console.log("\n=== End Report ===\n");

  // Exit non-zero if there are unmatched settlements — CI can alert on this
  process.exit(r.unmatched > 0 ? 1 : 0);
}).catch((err) => {
  console.error("Reconciliation failed:", err);
  process.exit(2);
});
