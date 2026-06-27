// Smoke test — proves the citation-pay loop end to end with no external services.
// Run: npm run smoke   (from apps/api)
import { store } from "../src/db.js";
import { seed } from "../src/seed.js";
import { runResearchAgent } from "../src/modules/agent/run.js";

function assert(cond: unknown, msg: string) {
  if (!cond) { console.error("✗ " + msg); process.exitCode = 1; throw new Error(msg); }
  console.log("✓ " + msg);
}

async function main() {
  seed();
  console.log("\n— Run 1: new question (expect BUY + receipt) —");
  const q = "What are the key arguments around AI content licensing and creator compensation?";
  const r1 = await runResearchAgent({ workspaceId: "ws_demo", agentId: "agent_research_01", question: q });
  console.log("decision:", r1.decision.action, "| spend:", r1.spend);
  console.log("trace:", r1.trace.map((s) => `${s.step}:${s.status}`).join(" → "));

  assert(r1.decision.action === "BUY", "Run 1 chose to BUY the most relevant source");
  assert(r1.spend.payments === 1, "Run 1 made exactly one payment");
  assert(r1.sources[0]?.receiptId, "Run 1 produced a receipt");
  assert(store.receipts.size === 1, "One receipt stored");
  assert(store.paidContexts.size === 1, "Paid context stored for reuse");
  const ver = [...store.verifications.values()][0];
  assert(ver?.status === "passed", "Delivery verification passed before release");
  assert(store.payments.size === 1, "Payment released only after verification");

  console.log("\n— Run 2: similar question (expect REUSE, no payment) —");
  const r2 = await runResearchAgent({
    workspaceId: "ws_demo", agentId: "agent_research_01",
    question: "Summarise the arguments on AI content licensing and creator compensation.",
  });
  console.log("decision:", r2.decision.action, "| spend:", r2.spend);
  assert(r2.decision.action === "REUSE", "Run 2 reused paid context");
  assert(r2.spend.payments === 0, "Run 2 made no payment");
  assert(store.receipts.size === 1, "No new receipt on reuse");

  console.log("\n— Run 3: off-topic question (expect SKIP on value-per-cent / relevance) —");
  const r3 = await runResearchAgent({
    workspaceId: "ws_demo", agentId: "agent_research_01",
    question: "What is the best recipe for sourdough bread?",
  });
  console.log("decision:", r3.decision.action, "|", r3.decision.reasoning);
  assert(r3.decision.action === "SKIP", "Run 3 skipped — nothing cleared the value bar");
  assert(r3.spend.payments === 0, "Run 3 made no payment");

  console.log("\n— Idempotency / duplicate guard —");
  assert(store.idempotency.size === 1, "Exactly one idempotency key recorded across runs");

  console.log("\n— Audit trail (runs 1–3) —");
  const types = store.auditEvents.map((e) => e.eventType);
  for (const t of ["agent.decided", "payment.authorized", "verification.passed", "payment.released", "receipt.created", "paid_context.created", "paid_context.reused", "purchase.skipped"])
    assert(types.includes(t), `audit event present: ${t}`);

  console.log("\n— Operator mandate: block a creator (agent must obey) —");
  seed(); // reset state
  const ws = store.workspaces.get("ws_demo")!;
  // Find the licensing source + its creator, then block that creator via the mandate.
  const licensing = [...store.resources.values()].find((r) => /licensing/i.test(r.title))!;
  ws.mandate.blockedProviderIds = [licensing.providerId];
  const r4 = await runResearchAgent({
    workspaceId: "ws_demo", agentId: "agent_research_01",
    question: "What are the key arguments around AI content licensing and creator compensation?",
  });
  console.log("decision:", r4.decision.action, "| policyNotes:", r4.decision.policyNotes.join("; "));
  const blockedScore = r4.decision.scores.find((s) => s.providerId === licensing.providerId);
  assert(blockedScore?.verdict === "blocked by operator policy", "Blocked creator carries a legible 'blocked by operator policy' verdict");
  assert(!(r4.decision.action === "BUY" && r4.decision.resourceId === licensing.id), "Agent did NOT pay the operator-blocked creator");
  const blockedEarned = [...store.receipts.values()].some((rc) => rc.providerId === licensing.providerId);
  assert(!blockedEarned, "Blocked creator earned nothing (agent routed to a permitted source instead)");
  assert(r4.decision.policyNotes.some((n) => /blocked/.test(n)), "Decision surfaces the active mandate as policy notes");

  console.log(`\nAll smoke assertions passed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
