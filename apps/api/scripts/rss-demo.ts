// Proves the RSS/RSSHub connector end-to-end with no network:
//   ingest a real-shaped feed → priced creators/resources → agent buys a real article.
// Run: npm run rss:demo  (from apps/api)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { store } from "../src/db.js";
import { seed } from "../src/seed.js";
import { ingestFromString } from "../src/connectors/rss/ingest.js";
import { runResearchAgent } from "../src/modules/agent/run.js";

function assert(cond: unknown, msg: string) {
  if (!cond) { console.error("✗ " + msg); process.exitCode = 1; throw new Error(msg); }
  console.log("✓ " + msg);
}

async function main() {
  seed(); // workspace + mandate; we'll replace seeded sources with real feed content
  // Drop the synthetic seed resources so the agent only sees ingested real content.
  store.resources.clear();
  store.providers.clear();

  const xml = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "connectors", "rss", "sample-feed.xml"), "utf8");

  console.log("— Ingest feed —");
  const res = ingestFromString(xml, { priceUsdc: "0.002", sourceLabel: "sample-feed.xml" });
  console.log(`ingested: ${res.providers} creator(s), ${res.resources} article(s)`);
  for (const it of res.items) console.log(`   • "${it.title.slice(0, 48)}…" — ${it.author} @ ${it.priceUsdc} USDC (${it.publishedAt.slice(0,10)})`);
  assert(res.resources === 9, "Nine real articles ingested");
  assert(res.providers === 8, "Eight distinct creators registered");
  const licensing = [...store.resources.values()].find((r) => /licensing/i.test(r.title))!;
  assert(licensing.contentBody.length > 50 && !/[<>]/.test(licensing.contentBody), "Article body is real, HTML-stripped text");
  assert(licensing.createdAt.startsWith("2026-06-13"), "Resource freshness uses the real publish date");

  console.log("\n— Agent answers from the real feed (expect BUY) —");
  const r1 = await runResearchAgent({
    workspaceId: "ws_demo", agentId: "agent_research_01",
    question: "What are the key arguments around AI content licensing and creator compensation?",
  });
  console.log("decision:", r1.decision.action, "| spend:", r1.spend.totalUsdc, "USDC");
  console.log("verdicts:", r1.decision.scores.map((s) => `${s.relevance.toFixed(2)}→${s.verdict.split(":")[0]}`).join(" | "));
  assert(r1.decision.action === "BUY", "Agent bought a real article");
  assert(r1.decision.resourceId === licensing.id, "Bought the on-topic licensing article, not the off-topic control");
  assert(r1.sources[0]?.receiptId, "Produced a receipt for the real purchase");
  assert(r1.sources[0]?.providerName === "Maya Okonkwo", "Receipt credits the real author");

  console.log("\n— Second similar question (expect REUSE) —");
  const r2 = await runResearchAgent({
    workspaceId: "ws_demo", agentId: "agent_research_01",
    question: "Summarise the arguments on AI content licensing and creator compensation.",
  });
  console.log("decision:", r2.decision.action, "| spend:", r2.spend.totalUsdc, "USDC");
  assert(r2.decision.action === "REUSE", "Reused the paid article — no second payment to the creator");

  console.log("\nRSS connector demo passed.");
}

main().catch((e) => { console.error(e); process.exit(1); });
