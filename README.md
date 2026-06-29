# ProofSource

**Creators price their work. Agents pay to use it. The receipt proves they earned it.**

Verified-delivery nanopayments for AI-cited content, settled on **Arc** in **USDC** via **Circle Gateway**.

Live at → **[proofsource-mu.vercel.app](https://proofsource-mu.vercel.app)**

Built for the **Lepton Agents Hackathon** (Canteen × Circle × Arc). Primary fit: **RFB 6 · Creator & Publisher Monetization**, with **RFB 1 · Autonomous Paying Agents** as the buyer.

---

## The problem

AI agents and answer engines have become major consumers of written work, but they read it as free raw material. An agent grounds its answer in an article, a feed, or a report and returns nothing to whoever produced it — the value accrues to the model and the aggregator, while the source captures none of it.

Two developments remove the economics floor. Sub-cent settlement on Arc — USDC as native gas, gasless Gateway batching, sub-second finality — makes a per-citation payment economical for the first time. And verified delivery plus tamper-evident receipts make each payment *provable* — the harder half, and the one the hackathon brief names as the real build.

ProofSource closes the gap between "AI used my work" and "I was paid for it, and can prove it."

---

## Quickstart

```bash
git clone https://github.com/othnielObasi/proofsource
cd proofsource
npm install

# Prove the loop end-to-end (no credentials needed)
npm run smoke -w @proofsource/api

# Start the dev server
npm run dev -w @proofsource/api    # → http://localhost:3000
```

**`npm run smoke` runs three scenarios and asserts the outcomes:**

| Scenario | Decision | Why |
|---|---|---|
| New licensing question | **BUY** | Best source clears value-per-cent bar → x402 deliver → verify → settle → receipt |
| Similar follow-up | **REUSE** | Paid context already covers it → no payment |
| Off-topic (sourdough) | **SKIP** | Nothing clears the relevance floor → no payment |

---

## npm packages

All integration surfaces are published to npm under `@proofsource`:

| Package | Install | What it does |
|---|---|---|
| [`@proofsource/sdk`](https://npmjs.com/package/@proofsource/sdk) | `npm i @proofsource/sdk` | Typed JS/TS client — `ask()`, `decide()`, `traction()`, `earnings()` |
| [`@proofsource/mcp`](https://npmjs.com/package/@proofsource/mcp) | `npx -y @proofsource/mcp` | MCP server for Claude Desktop, Cursor, Windsurf |
| [`@proofsource/openclaw-plugin`](https://npmjs.com/package/@proofsource/openclaw-plugin) | `npx @proofsource/openclaw-plugin` | OpenAI-compatible plugin sidecar |

---

## Integration

### SDK (Node.js / TypeScript)

```ts
import { ProofSource } from "@proofsource/sdk";

const ps = new ProofSource({
  baseUrl: "https://proofsource-mu.vercel.app",
  apiKey: "ps_live_...",   // from your operator account
});

const result = await ps.ask({
  question: "What are the key arguments around AI content licensing?",
});

console.log(result.answer);
console.log(result.sources);     // who was paid, receipt IDs
console.log(result.spend);       // { totalUsdc: "0.002000" }
```

### REST API (any language)

```bash
curl -X POST https://proofsource-mu.vercel.app/v1/proofsource/agent/run \
  -H "x-proofsource-key: ps_live_..." \
  -H "content-type: application/json" \
  -d '{"question": "What is per-use content licensing?"}'
```

Response:
```json
{
  "decision": { "action": "BUY", "reasoning": "...", "scores": [...] },
  "answer": "...",
  "sources": [{ "providerName": "Ada Powell", "receiptId": "rcpt_..." }],
  "spend": { "totalUsdc": "0.002000" }
}
```

### Claude Desktop / Cursor (MCP)

```json
{
  "mcpServers": {
    "proofsource": {
      "command": "npx",
      "args": ["-y", "@proofsource/mcp"],
      "env": {
        "PROOFSOURCE_BASE_URL": "https://proofsource-mu.vercel.app",
        "PROOFSOURCE_API_KEY": "ps_live_...",
        "PROOFSOURCE_WORKSPACE_ID": "ws_..."
      }
    }
  }
}
```

Or via Claude Code CLI:
```bash
claude mcp add proofsource -- npx -y @proofsource/mcp
```

MCP tools exposed: `proofSource_ask`, `proofSource_decide`, `proofSource_traction`

### OpenAI / Codex (GPT Actions)

OpenAPI 3.1 spec: `GET https://proofsource-mu.vercel.app/openapi.json`
Plugin manifest: `GET https://proofsource-mu.vercel.app/.well-known/ai-plugin.json`

### OpenClaw plugin

```bash
PROOFSOURCE_API_KEY=ps_live_... npx @proofsource/openclaw-plugin
```

Serves the plugin manifest + `/ask` proxy on port 3100. Point your OpenClaw or Claude.ai plugin URL at it.

---

## Get an operator API key

1. Sign up at [proofsource-mu.vercel.app](https://proofsource-mu.vercel.app) as an **operator**
2. Your `ps_live_...` key is returned on registration
3. Fetch it anytime: `GET /v1/proofsource/auth/me` (JWT auth)
4. Rotate it: `POST /v1/proofsource/auth/apikey/regenerate` (JWT auth)

---

## How the agent decides (RFB 1 — 30% of judging rubric)

The agent operates under an operator's standing **mandate** — budget, per-task ceiling, max price per source, preferred/blocked creators, and whether answers must cite a paid source. Its only real freedom: choosing which *permitted* source is worth buying on value-per-cent.

For each question the agent:
- scores every candidate source's **task-relevance** (LLM rerank when `LLM_ENABLED`, deterministic keyword scorer otherwise)
- discounts by **freshness decay**
- computes **value-per-cent** = `expectedValue ÷ price-in-cents`
- drops blocked creators, respects budget/ceiling/maxPrice limits, biases toward preferred creators
- chooses **REUSE** → **BUY** → **SKIP** in that priority order

Every candidate gets a legible verdict — `bought`, `reused`, `blocked by operator policy`, `skipped: relevance below floor` — visible to both buyer and creator.

## What stays deterministic (settlement integrity)

The LLM is walled off from money. Payment releases only when `verifyDelivery()` passes seven checks: resource match, provider match, payload present, hash generated, non-empty, delivered-before-expiry, usage rights attached. Idempotency keys prevent duplicate settlement. Every state transition writes an audit event.

---

## Architecture

```
question
  → discover sources
  → AGENT DECISION  (relevance · freshness · value-per-cent · budget)   [probabilistic]
      ├─ REUSE → answer from owned paid context (no payment)
      ├─ SKIP  → answer without paid source (no payment)
      └─ BUY ↓                                                          [deterministic]
          policy gate → authorize → x402 deliver → VERIFY → release
          → receipt (tamper-evident) → paid-context memory → answer (cites source)
```

| Layer | Path |
|---|---|
| Agent decision | `apps/api/src/modules/agent/decision.ts` |
| Orchestrator | `apps/api/src/modules/agent/run.ts` |
| Policy / verification / receipt | `apps/api/src/modules/policy/index.ts` |
| x402 handshake | `apps/api/src/lib/x402.ts` |
| Circle/Arc payment adapter | `apps/api/src/integrations/payments/` |
| Circle managed wallets | `apps/api/src/integrations/wallet/circleManagedWallet.ts` |
| RSS/RSSHub connector | `apps/api/src/connectors/rss/` |
| HTTP API | `apps/api/src/routes.ts` |
| SDK | `packages/sdk/src/index.ts` |
| MCP server | `packages/mcp/src/index.ts` |
| OpenClaw plugin | `packages/openclaw-plugin/src/index.js` |
| Shared types | `packages/shared/src/types.ts` |

---

## Circle / Arc integration (RFB — 20% of judging rubric)

Payment runs through a `PaymentAdapter` seam. `PAYMENT_MODE` auto-selects `arc_testnet` when Circle credentials are present, falling back to `mock` for CI/offline.

- **Settlement:** `GatewayClient.pay(resourceUrl)` handles the full x402 handshake — 402 challenge → EIP-3009 signed payment → 200 content — gas-free through Circle Gateway on Arc
- **Managed wallets:** `@circle-fin/developer-controlled-wallets` provisions real Circle wallets for creators who don't have MetaMask; USDC settlements land directly; creators withdraw via API
- **Chain:** Arc testnet (chain ID `5042002`, `eip155:5042002`), USDC at `0x360...`
- **Receipts:** `receipt.chainReference.transactionHash` + live [ArcScan](https://arcscan.app) explorer link

A standalone runnable proof lives in `examples/arc-live/` — a creator seller + paying agent buyer that produces one real sub-cent settlement on Arc testnet.

---

## Traction engine (RFB 6 — 30% of judging rubric)

- **Harness** (`scripts/harness.ts`, `npm run harness`): N independent reader-agents each with their own budget, running batches of questions. Example: `npm run harness -- --readers 25 --questions 6`. In `arc_testnet` mode this produces real on-chain settlements.
- **RSS connector:** `POST /v1/proofsource/connectors/rss/ingest` ingests any RSSHub route or RSS/Atom URL into priced, hash-verified resources credited to real authors with freshness from the real publish date.
- **Persistence:** Neon Postgres (`PERSIST_BACKEND=postgres` + `DATABASE_URL`) snapshots the full store on every settled run, surviving Vercel cold starts. `await persistence.saveNow()` on every write — no debounce timer that would silently drop in serverless.
- **Auth:** HMAC-SHA256 stateless JWTs (30-day TTL) — survive cold starts without a shared session store.
- **Metrics dashboard:** `GET /v1/proofsource/dashboard/traction` → live page at `/traction` — creators earning, total payouts, payment count, avg sub-cent size, reuse rate, per-creator breakdown.

---

## Repo structure

```
apps/
  api/         Fastify backend (Vercel serverless)
  mcp/         → now in packages/mcp
  openclaw-plugin/ → now in packages/openclaw-plugin
examples/
  arc-live/    Standalone Arc testnet settlement proof (buyer + seller)
packages/
  sdk/         @proofsource/sdk — typed API client
  mcp/         @proofsource/mcp — MCP server
  openclaw-plugin/  @proofsource/openclaw-plugin — OpenAI plugin sidecar
  shared/      Shared TypeScript types
public/        Frontend (React JSX, no bundler)
scripts/       Harness, smoke tests, RSS demo
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes (prod) | Signs HMAC-SHA256 session tokens |
| `DATABASE_URL` | Yes (prod) | Neon Postgres connection string |
| `AGENT_PRIVATE_KEY` | Yes (arc_testnet) | Operator wallet private key for Arc settlements |
| `PLATFORM_WALLET_ADDRESS` | Yes (arc_testnet) | Operator wallet address |
| `CIRCLE_API_KEY` | Yes (managed wallets) | Circle developer API key |
| `CIRCLE_ENTITY_SECRET` | Yes (managed wallets) | Circle entity secret (registered in Circle Dashboard) |
| `PERSIST_BACKEND` | — | `postgres` or `json` (default: json) |
| `PAYMENT_MODE` | — | `arc_testnet` or `mock` (auto-detected from creds) |

---

## Docs

- `docs/BRD.md` — product requirements
- `docs/TRD.md` — technical requirements (Circle/x402-first)
- `docs/PLAN.md` — 14-day build plan mapped to the rubric
- `docs/DEMO_SCRIPT.md` — sub-3-minute video walkthrough
