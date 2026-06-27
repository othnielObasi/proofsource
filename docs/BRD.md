# ProofSource — Business Requirements (Revised for Lepton)

## 1. One line
Content that earns every time an agent cites it — verified-delivery nanopayments that pay a source the moment an AI grounds an answer in it, settled sub-cent on Arc in USDC.

## 2. Problem
The fastest-growing consumers of content are AI agents, and they read paid work as free substrate. Creators and publishers were already priced out by the ~30-cent payment floor (hence subscriptions); now agents extract value from their work with no compensation path at all. The missing piece isn't the rail — it's proving that a specific source was actually used, and settling a sub-cent payment to it on that basis.

## 3. Lepton positioning
- **Primary RFB: 6 · Creator & Publisher Monetization** (this round's emphasis).
- **Secondary RFB: 1 · Autonomous Paying Agents** (the buyer is a budgeted research agent).
- **Prior Art #01 — "content that earns every time it is cited"**: ProofSource is a direct implementation. The hard part it calls out — *an attribution layer that detects reuse and proves it* — is exactly our verified-delivery + receipt + paid-context loop.

## 4. Users
- **Creators / publishers** — list a single article/snippet, set a sub-cent price + reuse policy, get a wallet, earn per citation without forcing a subscription.
- **AI research agents (and their operators)** — buy only what's worth it on a budget, never pay twice, get a receipt and reusable context per purchase.

## 5. What the product does
1. A creator lists priced content (real sources via RSSHub/Ghost connectors, not just seeded rows).
2. A research agent, answering a question, **decides** per source whether it's worth paying for (value-per-cent vs budget) — buy, reuse, or skip.
3. On buy: authorize → deliver over x402 → **verify delivery** → release sub-cent USDC on Arc → issue a tamper-evident **receipt** → store **reusable paid context**.
4. Later similar questions **reuse** paid context for free.
5. Dashboards show creators earning and agents spending, with per-receipt chain references.

## 6. Why it's differentiated
- **Verified delivery before payment** — payment finalizes into a receipt only after a deterministic seven-check gate, so settlement integrity never depends on the LLM.
- **Reusable receipts / paid context** — pay once, cite many times; no double-spend on the same knowledge.
- **The agent obeys an operator mandate, it doesn't improvise taste** — creators set price and terms; the operator sets budget, ceilings, a max price, preferred/blocked creators, and a require-citation rule; the agent only chooses which *permitted* source is worth buying now. Every choice carries a creator-legible verdict (bought / reused / blocked / skipped-and-why). The agent can skip a source but can never use it without paying.
- Distinct from any sibling/earlier project (e.g. an Agora-era build): ProofSource is a fresh Lepton entry with its own product and traction.

## 7. Goals & success metrics (matched to the submission form)
**Agency (30%)** — every purchase carries a logged buy/reuse/skip decision with scores; reuse rate > 0; off-topic sources demonstrably skipped.
**Traction (30%)** — real creators onboarded and earning; real readers/agents paying; report: creators earning, total creator payouts, payment count, average payment size (target sub-cent), reader-to-payer conversion.
**Circle usage (20%)** — real Gateway nanopayment settlement on Arc with explorer links; Wallets per agent/provider; x402-gated access.
**Innovation (20%)** — the citation-attribution + reusable-receipt loop as new territory for creator monetization.

In-window targets (14 days): ≥ 5–15 creators listing real content; ≥ 50 real autonomous payments on Arc testnet; average payment size well under one cent; a working live link judges can use hands-on.

## 8. Scope
**In:** creator listing, agent decision engine, x402 delivery + verification, Gateway settlement on Arc, receipts, paid-context reuse, dashboards, one real source connector, hosted demo.
**Out (this round):** multi-source recursive royalty splits, streaming/per-second payments, marketplace discovery, fiat on-ramp — noted as roadmap.

## 9. Risks
Gateway integration time (mitigated by mock fallback); low real volume in 14 days (mitigated by RSSHub real content + early creator outreach); agency being read as automation (mitigated by surfacing decision scores in UI + receipts).

## 10. Deliverables
Public GitHub repo · <3-min video (`docs/DEMO_SCRIPT.md`) · live link · traction metrics. Submit early and often; re-submit as numbers grow.
