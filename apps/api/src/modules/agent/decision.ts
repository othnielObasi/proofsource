// ───────────────────────────────────────────────────────────────────────────
// AGENTIC DECISION LAYER  (Lepton rubric: 30% "agentic sophistication")
//
// The corrected story this encodes:
//   • CREATORS price their work and set usage terms (not the agent).
//   • The OPERATOR sets a standing mandate — budget, ceilings, preferred/blocked
//     creators, a max price, and whether answers must cite a paid source.
//   • The AGENT executes that mandate. Its only freedom is choosing which PERMITTED
//     source is worth buying for THIS task, on value-per-cent. It can skip a source,
//     but it can never use one without paying — enforcement lives in settlement.
//
// Every candidate gets a legible VERDICT (bought / reused / blocked / skipped: why),
// so both the buyer and the creator can see exactly why a source was or wasn't paid.
// The decision never releases a payment; it only proposes what to buy.
// ───────────────────────────────────────────────────────────────────────────

import type {
  Resource, PaidContext, AgentDecision, SourceScore, OperatorMandate,
} from "../../../../../packages/shared/src/types.js";
import { estimateRelevance } from "../../integrations/llm/index.js";
import { centsOf } from "../../lib/hash.js";

export interface DecisionInput {
  question: string;
  candidates: Resource[];
  ownedContexts: PaidContext[];
  budgetRemainingUsdc: string;
  perTaskMaxUsdc: string;
  mandate?: OperatorMandate;
  valuePerCentThreshold?: number;
}

const PREFERRED_BIAS = 1.25; // operator-preferred creators get a ranking nudge

function freshnessFactor(r: Resource): number {
  if (!r.freshnessHalfLifeDays) return 1;
  const ageDays = (Date.now() - new Date(r.createdAt).getTime()) / 86_400_000;
  return Math.pow(0.5, ageDays / r.freshnessHalfLifeDays);
}

export async function decide(input: DecisionInput): Promise<AgentDecision> {
  const m = input.mandate ?? {} as OperatorMandate;
  const threshold = m.valuePerCentThreshold ?? input.valuePerCentThreshold ?? 0.1;
  const relevanceFloor = m.minRelevance ?? 0.25;
  const budget = Number(input.budgetRemainingUsdc);
  const perTaskMax = Number(input.perTaskMaxUsdc);
  const maxPerSource = m.maxPricePerSourceUsdc ? Number(m.maxPricePerSourceUsdc) : Infinity;
  const blocked = new Set(m.blockedProviderIds ?? []);
  const preferred = new Set(m.preferredProviderIds ?? []);
  const policyNotes: string[] = [];
  if (blocked.size) policyNotes.push(`${blocked.size} creator(s) blocked by operator policy`);
  if (preferred.size) policyNotes.push(`${preferred.size} creator(s) preferred by operator policy`);
  if (Number.isFinite(maxPerSource)) policyNotes.push(`max price per source ${maxPerSource} USDC`);
  if (m.requireCitation) policyNotes.push("operator requires a cited paid source for on-topic answers");

  // Score every candidate, applying preferred bias and tagging blocked creators.
  const scores: SourceScore[] = [];
  for (const r of input.candidates) {
    const relevance = await estimateRelevance(input.question, r);
    const fresh = freshnessFactor(r);
    const expectedValue = relevance * fresh; // 0..1
    const cents = Math.max(centsOf(r.priceUsdc), 0.0001);
    const isBlocked = blocked.has(r.providerId);
    const isPreferred = preferred.has(r.providerId);
    const raw = expectedValue / cents;
    scores.push({
      resourceId: r.id,
      title: r.title,
      providerId: r.providerId,
      relevance,
      priceUsdc: r.priceUsdc,
      expectedValue,
      freshnessFactor: fresh,
      valuePerCent: isPreferred ? raw * PREFERRED_BIAS : raw,
      preferred: isPreferred,
      blocked: isBlocked,
      verdict: "", // filled below
    });
  }
  scores.sort((a, b) => b.valuePerCent - a.valuePerCent);

  // Eligibility = permitted by the operator AND relevant enough AND within price cap.
  const eligible = scores.filter(
    (s) => !s.blocked && s.relevance >= relevanceFloor && Number(s.priceUsdc) <= maxPerSource
  );
  const best = eligible[0];

  // Default verdicts for everything not selected (creator-legible).
  for (const s of scores) {
    if (s.blocked) s.verdict = "blocked by operator policy";
    else if (Number(s.priceUsdc) > maxPerSource) s.verdict = `skipped: above operator max price (${maxPerSource} USDC)`;
    else if (s.relevance < relevanceFloor) s.verdict = `skipped: relevance ${s.relevance.toFixed(2)} below floor ${relevanceFloor}`;
    else s.verdict = best && s.resourceId !== best.resourceId ? "not selected: lower value-per-cent than the chosen source" : "eligible";
  }

  // 1) Reuse something already paid for (free).
  if (best) {
    const owned = input.ownedContexts.find(
      (c) => c.resourceId === best.resourceId && c.reusable &&
             (!c.expiresAt || new Date(c.expiresAt) > new Date())
    );
    if (owned) {
      best.verdict = "reused (already paid — no new payment)";
      return {
        action: "REUSE", resourceId: best.resourceId, paidContextId: owned.id,
        reasoning:
          `Owned paid context "${owned.sourceTitle}" already covers this (relevance ` +
          `${best.relevance.toFixed(2)}, reusable). Reusing — no payment.`,
        budgetRemainingUsdc: input.budgetRemainingUsdc, policyNotes, scores,
      };
    }
  }

  // 2) Nothing permitted + relevant → skip (can't cite what isn't allowed/available).
  if (!best) {
    return {
      action: "SKIP",
      reasoning:
        "No permitted source cleared the operator's relevance/price rules; nothing to cite. " +
        "No payment.",
      budgetRemainingUsdc: input.budgetRemainingUsdc, policyNotes, scores,
    };
  }

  // 3) Budget/ceiling are hard operator limits — never breached, even to cite.
  const price = Number(best.priceUsdc);
  if (price > perTaskMax) {
    best.verdict = `skipped: ${price} USDC exceeds operator per-task ceiling ${perTaskMax}`;
    return { action: "SKIP", resourceId: best.resourceId, reasoning: best.verdict,
      budgetRemainingUsdc: input.budgetRemainingUsdc, policyNotes, scores };
  }
  if (price > budget) {
    best.verdict = `skipped: insufficient remaining budget (${budget} USDC) for ${price} USDC`;
    return { action: "SKIP", resourceId: best.resourceId, reasoning: best.verdict,
      budgetRemainingUsdc: input.budgetRemainingUsdc, policyNotes, scores };
  }

  // 4) Within limits: buy if value clears the bar — OR if the operator mandates a citation.
  const mandatedBuy = Boolean(m.requireCitation);
  if (best.valuePerCent < threshold && !mandatedBuy) {
    best.verdict = `skipped: value-per-cent ${best.valuePerCent.toFixed(2)} below threshold ${threshold}`;
    return { action: "SKIP", resourceId: best.resourceId, reasoning: best.verdict,
      budgetRemainingUsdc: input.budgetRemainingUsdc, policyNotes, scores };
  }

  best.verdict = mandatedBuy && best.valuePerCent < threshold
    ? "bought (operator requires a cited source)"
    : "bought (best permitted value-per-cent, within budget)";
  return {
    action: "BUY", resourceId: best.resourceId,
    reasoning:
      `Chose best permitted source of ${scores.length}: value-per-cent ${best.valuePerCent.toFixed(2)}` +
      `${best.preferred ? " (operator-preferred)" : ""}, price ${price} USDC within ceiling ${perTaskMax} ` +
      `and budget ${budget}.${mandatedBuy ? " Operator requires a cited paid source." : ""}`,
    budgetRemainingUsdc: input.budgetRemainingUsdc, policyNotes, scores,
  };
}
