// ───────────────────────────────────────────────────────────────────────────
// TRACTION HARNESS
//
// Manufactures real, accruing volume: it ingests a feed of real creator content,
// stands up N independent reader-agents (each with its own budget + operator mandate),
// and runs each through a batch of research questions. Every reader pays creators
// independently, so payouts and payment counts accrue exactly as they would with real
// users — and reuse appears naturally when a reader revisits a topic it already paid for.
//
// In mock mode this proves the funnel offline. With Circle creds present (PAYMENT_MODE
// =arc_testnet) the SAME loop produces real sub-cent USDC settlements on Arc — point it
// at a live RSSHub feed and let it run to accrue genuine in-window volume.
//
//   npm run harness                  # 10 readers × 5 questions, accrues onto saved state
//   npm run harness -- --readers 25 --questions 6
//   npm run harness -- --reset       # start fresh
// ───────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { store } from "../src/db.js";
import { env } from "../src/env.js";
import { ingestFromString } from "../src/connectors/rss/ingest.js";
import { runResearchAgent } from "../src/modules/agent/run.js";
import { computeTraction } from "../src/modules/metrics/traction.js";
import { persistence } from "../src/persistence/index.js";
import type { OperatorMandate } from "../../../packages/shared/src/types.js";

function arg(name: string, def: number): number {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? Number(process.argv[i + 1]) : def;
}
const READERS = arg("readers", 10);
const QUESTIONS = arg("questions", 5);
const RESET = process.argv.includes("--reset");

// Questions span the feed's topics (→ buys), include a repeat (→ reuse), and a couple
// with no matching source (→ skip) so the funnel mirrors real usage.
const TOPICAL = [
  "What are the key arguments around AI content licensing and creator compensation?",
  "How are creators compensated when AI grounds answers in their work?",
  "How can citizen journalism be funded by per-story payments?",
  "How should music royalties be split by what listeners actually played?",
  "How does per-image licensing pay photographers instantly?",
  "How do streaming payments work per second for live media?",
  "How does attribution metadata drive recursive royalty splits?",
  "Why did subscriptions price out the cheap single article?",
];
const OFFTOPIC = [
  "What is the best sourdough bread recipe?",
  "Who won the football match last night?",
];

function mandate(): OperatorMandate {
  return {
    budgetUsdc: "1.000000", perTaskMaxUsdc: "0.050000", maxPricePerSourceUsdc: "0.050000",
    minRelevance: 0.25, valuePerCentThreshold: 0.1,
    preferredProviderIds: [], blockedProviderIds: [], requireCitation: false,
  };
}
function ensureReader(i: number) {
  const id = `reader_${i}`;
  if (!store.workspaces.get(id)) {
    store.workspaces.set(id, { id, name: `Reader ${i}`, budgetUsdc: "1.000000", perTaskMaxUsdc: "0.050000", mandate: mandate() });
  }
  return id;
}
function pickQuestions(seed: number): string[] {
  const out: string[] = [];
  const t1 = TOPICAL[seed % TOPICAL.length];
  out.push(t1, t1); // repeat → reuse on the second
  for (let k = 0; k < QUESTIONS - 3; k++) out.push(TOPICAL[(seed + k + 1) % TOPICAL.length]);
  out.push(OFFTOPIC[seed % OFFTOPIC.length]); // → skip
  return out.slice(0, QUESTIONS);
}

async function main() {
  if (!RESET) await persistence.restore();
  if (RESET) store.reset();

  // Ingest real creator content (idempotent — safe to re-run).
  const xml = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "connectors", "rss", "sample-feed.xml"), "utf8");
  const ing = ingestFromString(xml, { priceUsdc: "0.002", sourceLabel: "sample-feed.xml" });
  console.log(`catalog: ${ing.resources} articles from ${ing.providers} creators (mode: ${env.paymentMode})`);
  console.log(`running ${READERS} reader-agents × ${QUESTIONS} questions…\n`);

  let done = 0;
  for (let i = 1; i <= READERS; i++) {
    const ws = ensureReader(i);
    let buys = 0, reuses = 0, skips = 0;
    for (const q of pickQuestions(i)) {
      const r = await runResearchAgent({ workspaceId: ws, agentId: `agent_${i}`, question: q });
      if (r.decision.action === "BUY") buys++;
      else if (r.decision.action === "REUSE") reuses++;
      else skips++;
      done++;
    }
    process.stdout.write(`  reader ${String(i).padStart(2)}: ${buys} buy · ${reuses} reuse · ${skips} skip\n`);
  }

  await persistence.saveNow();

  const m = computeTraction(env.paymentMode);
  const usd = (s: string) => "$" + Number(s).toFixed(6);
  console.log("\n══════════ TRACTION ══════════");
  console.log(` mode:                 ${m.paymentMode}`);
  console.log(` reader-agents:        ${m.readers}`);
  console.log(` tasks run:            ${m.tasks}`);
  console.log(` ─ creators earning:   ${m.creatorsEarning}`);
  console.log(` ─ total payouts:      ${usd(m.totalPayoutUsdc)} USDC`);
  console.log(` ─ payments made:      ${m.paymentCount}`);
  console.log(` ─ avg payment:        ${usd(m.avgTransactionUsdc)} USDC (sub-cent)`);
  console.log(` ─ reader→payer conv:  ${(m.readerToPayerConversion * 100).toFixed(0)}%`);
  console.log(` ─ reuse rate:         ${(m.reuseRate * 100).toFixed(0)}% (paid once, cited free)`);
  console.log(` ─ budget utilization: ${(m.budgetUtilization * 100).toFixed(1)}%`);
  console.log(` ─ cost per task:      ${usd(m.costPerTaskUsdc)} USDC`);
  console.log("\n creators earning:");
  for (const c of m.perCreator) console.log(`   ${c.earningsUsdc.padStart(10)} USDC · ${c.sales}× · ${c.creator}`);
  console.log("══════════════════════════════");
  console.log(`\npersisted via ${persistence.backendName}; live dashboard: GET /v1/proofsource/dashboard/traction`);
}

main().catch((e) => { console.error(e); process.exit(1); });
