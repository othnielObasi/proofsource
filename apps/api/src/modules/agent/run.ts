import type { AgentRunResult, PaidContext, PaymentAuthorization } from "../../../../../packages/shared/src/types.js";
import { store } from "../../db.js";
import { id, nowIso, isoPlusDays, sha256 } from "../../lib/hash.js";
import { buildChallenge, signProof, verifyProof } from "../../lib/x402.js";
import { decide } from "./decision.js";
import { policyCheck, verifyDelivery, createReceipt } from "../policy/index.js";
import { getPaymentAdapter } from "../../integrations/payments/index.js";
import { synthesizeAnswer } from "../../integrations/llm/index.js";
import { audit } from "../audit/index.js";
import { SettlementMachine } from "../settlement/machine.js";

export interface RunArgs { workspaceId: string; agentId: string; question: string; }

export async function runResearchAgent(args: RunArgs): Promise<AgentRunResult> {
  const ws = store.workspaces.get(args.workspaceId);
  if (!ws) throw new Error("Unknown workspace");
  const trace: AgentRunResult["trace"] = [];
  const t = (step: string, status: string, detail?: string) => trace.push({ step, status, detail });

  // 1) DISCOVER
  const candidates = store.listResources();
  t("discover", "ok", `${candidates.length} candidate source(s)`);

  // 2) DECIDE (agentic)
  const owned = store.paidContextsFor(args.workspaceId);
  const decision = await decide({
    question: args.question,
    candidates,
    ownedContexts: owned,
    budgetRemainingUsdc: ws.budgetUsdc,
    perTaskMaxUsdc: ws.perTaskMaxUsdc,
    mandate: ws.mandate,
  });
  audit("agent.decided", "decision", decision.resourceId ?? "none",
    { action: decision.action, reasoning: decision.reasoning }, args.workspaceId);
  t("decide", decision.action, decision.reasoning);

  // 3a) REUSE — free path
  if (decision.action === "REUSE" && decision.paidContextId) {
    const ctx = store.paidContexts.get(decision.paidContextId)!;
    audit("paid_context.reused", "paid_context", ctx.id, {}, args.workspaceId);
    const answer = await synthesizeAnswer(args.question, { title: ctx.sourceTitle, body: ctx.summary });
    t("answer", "ok", "reused paid context");
    return {
      answer, decision,
      sources: [{ resourceId: ctx.resourceId, providerName: providerName(ctx.resourceId),
        paidContextId: ctx.id, receiptId: ctx.receiptId, paymentStatus: "reused", reused: true }],
      spend: { totalUsdc: "0.000000", payments: 0, reusedContexts: 1 },
      trace,
    };
  }

  // 3b) SKIP — nothing worth buying
  if (decision.action === "SKIP" || !decision.resourceId) {
    audit("purchase.skipped", "decision", decision.resourceId ?? "none",
      { reasoning: decision.reasoning }, args.workspaceId);
    const answer = await synthesizeAnswer(args.question, null);
    t("answer", "ok", "no purchase");
    return {
      answer, decision,
      sources: decision.resourceId
        ? [{ resourceId: decision.resourceId, providerName: providerName(decision.resourceId),
            paymentStatus: "skipped", reused: false }]
        : [],
      spend: { totalUsdc: "0.000000", payments: 0, reusedContexts: 0 },
      trace,
    };
  }

  // 3c) BUY — deterministic settlement pipeline
  const resource = store.resources.get(decision.resourceId)!;
  const provider = store.providers.get(resource.providerId)!;

  // purchase request
  const purchaseRequestId = id("pr");
  audit("purchase.requested", "purchase_request", purchaseRequestId,
    { resourceId: resource.id, amountUsdc: resource.priceUsdc }, args.workspaceId);

  // policy
  const idempotencyKey = sha256(`${args.workspaceId}|${resource.id}|${dayKey()}`);
  const policy = policyCheck({
    resource, provider, amountUsdc: resource.priceUsdc,
    perTaskMaxUsdc: ws.perTaskMaxUsdc, budgetUsdc: ws.budgetUsdc, idempotencyKey,
  });
  if (policy.decision === "REJECTED") {
    audit("policy.rejected", "purchase_request", purchaseRequestId, { reason: policy.reason }, args.workspaceId);
    t("policy", "REJECTED", policy.reason);
    const answer = await synthesizeAnswer(args.question, null);
    return { answer, decision, sources: [], spend: { totalUsdc: "0.000000", payments: 0, reusedContexts: 0 }, trace };
  }
  audit("policy.approved", "purchase_request", purchaseRequestId, {}, args.workspaceId);
  t("policy", "APPROVED", policy.reason);

  const adapter = getPaymentAdapter();

  // authorization (reserve spend / open x402 payment context)
  const auth = await adapter.createAuthorization({
    purchaseRequestId, amountUsdc: resource.priceUsdc,
    providerWallet: provider.walletAddress, idempotencyKey,
  });
  const authorization: PaymentAuthorization = {
    id: auth.authorizationId, purchaseRequestId,
    workspaceId: args.workspaceId, agentId: args.agentId,
    providerId: provider.id, resourceId: resource.id,
    amountUsdc: resource.priceUsdc, currency: "USDC",
    status: "authorized", idempotencyKey, expiresAt: isoPlusDays(1),
    paymentMode: adapter.mode, externalReference: auth.externalReference, createdAt: nowIso(),
  };
  store.authorizations.set(authorization.id, authorization);
  store.idempotency.set(idempotencyKey, authorization.id);
  audit("payment.authorized", "authorization", authorization.id,
    { amountUsdc: resource.priceUsdc, mode: adapter.mode }, args.workspaceId);
  t("authorize", "authorized", `${resource.priceUsdc} USDC via ${adapter.mode}`);

  // create settlement record — tracks state through the deterministic pipeline
  const settlement = SettlementMachine.create({
    workspaceId: args.workspaceId,
    authorizationId: authorization.id,
    resourceId: resource.id,
  });

  // x402 handshake → content delivery
  settlement.transition("delivering");
  const challenge = buildChallenge({
    network: adapter.mode === "arc_testnet" ? "arc-testnet" : "mock",
    amountUsdc: resource.priceUsdc, payTo: provider.walletAddress ?? "platform_escrow",
    nonce: id("nonce"), resourceId: resource.id, expiresAt: isoPlusDays(1),
  });
  const proof = signProof(challenge, authorization.externalReference ?? authorization.id);
  const proofValid = verifyProof(challenge, proof);
  const payload = proofValid ? resource.contentBody : "";
  const delivery = {
    id: id("del"), authorizationId: authorization.id,
    providerId: provider.id, resourceId: resource.id,
    payload, contentHash: sha256(payload),
    status: (payload ? "submitted" : "failed") as "submitted" | "failed",
    deliveredAt: nowIso(),
  };
  store.deliveries.set(delivery.id, delivery);
  audit("delivery.submitted", "delivery", delivery.id, { x402: proofValid }, args.workspaceId);
  t("deliver", delivery.status, "x402 proof " + (proofValid ? "valid" : "invalid"));

  // verification (must pass before release)
  const verification = verifyDelivery({ authorization, delivery, resource });
  if (verification.status !== "passed") {
    audit("verification.failed", "verification", verification.id,
      { reason: verification.failureReason }, args.workspaceId);
    t("verify", "failed", verification.failureReason);
    settlement.markFailed("verification: " + (verification.failureReason ?? "unknown"));
    // PAYMENT IS NOT RELEASED. Authorization is voided.
    const answer = await synthesizeAnswer(args.question, null);
    return { answer, decision, sources: [], spend: { totalUsdc: "0.000000", payments: 0, reusedContexts: 0 }, trace };
  }
  audit("verification.passed", "verification", verification.id, {}, args.workspaceId);
  t("verify", "passed");
  settlement.transition("verified");

  // release (only now, after verification passes)
  settlement.transition("settling");
  let release;
  try {
    release = await adapter.releasePayment({
      authorizationId: authorization.id, verificationId: verification.id,
      amountUsdc: resource.priceUsdc, providerWallet: provider.walletAddress,
      resourceId: resource.id,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    settlement.markFailed("release error: " + reason);
    t("release", "failed", reason);
    const answer = await synthesizeAnswer(args.question, null);
    return { answer, decision, sources: [], spend: { totalUsdc: "0.000000", payments: 0, reusedContexts: 0 }, trace };
  }
  store.payments.set(release.paymentId, {
    id: release.paymentId, authorizationId: authorization.id,
    amountUsdc: resource.priceUsdc, status: "released",
    transactionHash: release.transactionHash, circleTransactionId: release.circleTransactionId,
    explorerUrl: release.explorerUrl, releasedAt: nowIso(),
  });
  ws.budgetUsdc = (Number(ws.budgetUsdc) - Number(resource.priceUsdc)).toFixed(6);
  audit("payment.released", "payment", release.paymentId,
    { tx: release.transactionHash ?? release.circleTransactionId }, args.workspaceId);
  t("release", "released", release.transactionHash ?? release.circleTransactionId);
  settlement.markSettled(release.paymentId);

  // receipt
  const receipt = createReceipt({
    authorization, delivery, verification, paymentId: release.paymentId, resource,
    chainReference: {
      transactionHash: release.transactionHash,
      circleTransactionId: release.circleTransactionId,
      explorerUrl: release.explorerUrl,
    },
  });
  audit("receipt.created", "receipt", receipt.id, { receiptHash: receipt.receiptHash }, args.workspaceId);
  t("receipt", "ok", receipt.id);

  // paid-context memory
  const ctx: PaidContext = {
    id: id("ctx"), workspaceId: args.workspaceId, resourceId: resource.id,
    receiptId: receipt.id, contentHash: delivery.contentHash,
    sourceTitle: resource.title, summary: resource.contentBody.slice(0, 600),
    reusable: resource.usageRights.reusable,
    expiresAt: resource.usageRights.expiresInDays ? isoPlusDays(resource.usageRights.expiresInDays) : undefined,
    createdAt: nowIso(),
  };
  store.paidContexts.set(ctx.id, ctx);
  audit("paid_context.created", "paid_context", ctx.id, {}, args.workspaceId);
  t("memory", "stored", ctx.id);

  // answer (LLM optional)
  const answer = await synthesizeAnswer(args.question, { title: resource.title, body: resource.contentBody });
  t("answer", "ok", "cited paid source");

  return {
    answer, decision,
    sources: [{
      resourceId: resource.id, providerName: provider.name,
      receiptId: receipt.id, deliveryHash: delivery.contentHash,
      paymentStatus: "released", reused: false,
    }],
    spend: { totalUsdc: resource.priceUsdc, payments: 1, reusedContexts: 0 },
    trace,
  };
}

function providerName(resourceId: string): string {
  const r = store.resources.get(resourceId);
  return (r && store.providers.get(r.providerId)?.name) || "Unknown";
}
function dayKey(): string { return new Date().toISOString().slice(0, 10); }
