import type {
  Resource, Provider, PaymentAuthorization, Delivery, Verification, Receipt,
} from "../../../../../packages/shared/src/types.js";
import { store } from "../../db.js";
import { id, nowIso, sha256 } from "../../lib/hash.js";

// ---- Policy (deterministic gate before any authorization) ----
export interface PolicyDecision { decision: "APPROVED" | "REJECTED"; reason: string; }

export function policyCheck(args: {
  resource: Resource; provider: Provider; amountUsdc: string;
  perTaskMaxUsdc: string; budgetUsdc: string; idempotencyKey: string;
}): PolicyDecision {
  if (args.resource.status !== "active") return { decision: "REJECTED", reason: "Resource inactive" };
  if (args.provider.status !== "active") return { decision: "REJECTED", reason: "Provider inactive" };
  if (Number(args.amountUsdc) > Number(args.perTaskMaxUsdc))
    return { decision: "REJECTED", reason: "Exceeds per-task max spend" };
  if (Number(args.amountUsdc) > Number(args.budgetUsdc))
    return { decision: "REJECTED", reason: "Exceeds workspace budget" };
  if (store.idempotency.has(args.idempotencyKey))
    return { decision: "REJECTED", reason: "Duplicate request (idempotency)" };
  return { decision: "APPROVED", reason: "Resource active, provider active, within budget & ceiling" };
}

// ---- Verification (the gate that must pass before payment release) ----
export function verifyDelivery(args: {
  authorization: PaymentAuthorization; delivery: Delivery; resource: Resource;
}): Verification {
  const { authorization: a, delivery: d, resource: r } = args;
  const checks = {
    resourceIdMatches: d.resourceId === a.resourceId && d.resourceId === r.id,
    providerIdMatches: d.providerId === a.providerId && d.providerId === r.providerId,
    payloadPresent: typeof d.payload === "string",
    contentHashGenerated: Boolean(d.contentHash),
    contentNotEmpty: d.payload.trim().length > 0,
    deliveredBeforeExpiry: new Date(d.deliveredAt) <= new Date(a.expiresAt),
    usageRightsAttached: Boolean(r.usageRights),
  };
  const passed = Object.values(checks).every(Boolean);
  const failureReason = passed
    ? undefined
    : Object.entries(checks).filter(([, v]) => !v).map(([k]) => k).join(", ");
  const v: Verification = {
    id: id("ver"),
    authorizationId: a.id,
    deliveryId: d.id,
    status: passed ? "passed" : "failed",
    checks,
    failureReason,
    verifiedAt: nowIso(),
  };
  store.verifications.set(v.id, v);
  return v;
}

// ---- Receipt (tamper-evident proof of the verified purchase) ----
export function createReceipt(args: {
  authorization: PaymentAuthorization; delivery: Delivery;
  verification: Verification; paymentId: string; resource: Resource;
  chainReference?: Receipt["chainReference"];
}): Receipt {
  const { authorization: a, delivery: d, verification: v, resource: r } = args;
  const receiptHash = sha256(
    [a.id, d.id, v.id, args.paymentId, d.contentHash, a.amountUsdc, a.workspaceId].join("|")
  );
  const receipt: Receipt = {
    id: id("rcpt"),
    workspaceId: a.workspaceId,
    agentId: a.agentId,
    providerId: a.providerId,
    resourceId: a.resourceId,
    authorizationId: a.id,
    deliveryId: d.id,
    verificationId: v.id,
    paymentId: args.paymentId,
    deliveryHash: d.contentHash,
    receiptHash,
    usageRights: r.usageRights,
    chainReference: args.chainReference,
    createdAt: nowIso(),
  };
  store.receipts.set(receipt.id, receipt);
  return receipt;
}
