# ProofSource

**Creators price their work. Agents pay to use it. The receipt proves they earned it.** Verified-delivery nanopayments for AI-used content, settled on **Arc** in **USDC** via **Circle Gateway**.

An AI research agent, working under an operator's budget and policy, pays a creator to ground an answer in their content — but the source is only accessible through a sub-cent payment (x402), and that payment only finalizes into a ProofSource receipt once delivery is cryptographically verified. The agent can decline a source; it cannot use one without paying. Every purchase produces a tamper-evident receipt and a reusable paid-context record, so the agent never pays twice for the same knowledge.# ProofSource

**Creators price their work. Agents pay to use it. The receipt proves the creator earned it.** Verified-delivery nanopayments for AI-cited content, settled on **Arc** in **USDC** via **Circle Gateway**.

An AI research agent, working under an operator's budget and policy, pays to ground an answer in a creator's content — but the source is only accessible through a sub-cent payment (x402), and that payment only finalizes once delivery is verified, producing a tamper-evident, cryptographically signed ProofSource receipt. The agent can decline a source; it cannot use one without paying. Every purchase also writes a reusable paid-context record, so the agent never pays twice for the same source.

Built for the **Lepton Agents Hackathon** (Canteen × Circle × Arc). Primary fit: **RFB 6 · Creator & Publisher Monetization**, with **RFB 1 · Autonomous Paying Agents** as the buyer. Maps directly to the hackathon's **Prior Art #01 — "content that earns every time it is cited."**

## The problem

AI agents and answer engines have become major consumers of written work, but they read it as free raw material. An agent grounds its answer in an article, a feed, or a report and returns nothing to whoever produced it: the value accrues to the model and the aggregator, while the source — the reporter, the publisher, the researcher — captures none of it.

This was never only an attribution gap; it was an economics gap. Until a payment could clear below roughly thirty cents after fees, a single article or citation was never worth selling on its own, so creators were pushed into subscriptions, ads, and bundles. The natural unit — one use, one citation — was too small to price.

Two developments remove that floor. Sub-cent settlement on Arc — USDC as native gas, gasless Gateway batching, sub-second finality — makes a per-citation payment economical for the first time. And verified delivery plus tamper-evident receipts make each payment *provable* — the harder half, and the one the hackathon brief names as the real build: not the payment itself, but the layer that detects use and proves it.

ProofSource closes the gap between "AI used my work" and "I was paid for it, and can prove it":

- **Creators are paid per use, not per subscription** — a sub-cent payment each time an agent grounds an answer in their work.
- **Agents pay only for what they use,** under an operator's budget and policy, and can never use a source without paying — access is gated at the settlement layer.
- **Every use is provable,** through a cryptographically signed, tamper-evident receipt the creator can see and an auditor can verify.

---

## Quickstart

```bash
# 1. install (npm workspaces)
cd apps/api && npm install

# 2. prove the loop end-to-end (no credentials needed)
npm run smoke

# 3. run the live console
npm start          # → http://localhost:3000
```

`npm run smoke` runs three scenarios and asserts the outcomes:

| Scenario | Decision | Why |
|---|---|---|
| New licensing question | **BUY** | Most relevant source clears the value-per-cent bar → authorize → x402 deliver → verify → release → receipt → memory |
| Similar follow-up question | **REUSE** | Owned paid context covers it → no payment |
| Off-topic question (sourdough) | **SKIP** | Nothing clears the relevance/value bar → no payment |

The console lets you type a question and watch the decision, the full lifecycle trace, the answer, and the receipt.

---

## What the AI actually decides (rubric: 30% agentic sophistication)

The framing matters: **creators price their work and set usage terms. The operator sets a standing mandate — budget, per-task ceiling, a max price, preferred/blocked creators, and whether answers must cite a paid source. The agent executes that mandate.** Its only real freedom is choosing which *permitted* source is worth buying for this task, on value-per-cent. It can skip a source — but it can never use one without paying, because access is gated by x402 at the settlement layer.

For each question the agent:

- scores every candidate source's **task-relevance** (LLM rerank when `LLM_ENABLED`, deterministic keyword scorer otherwise),
- discounts by **freshness decay**,
- computes **expected value-per-cent** = `expectedValue ÷ price-in-cents`,
- drops creators the operator **blocked** and respects the **max price** and **budget/ceiling** limits,
- biases toward operator-**preferred** creators,
- and chooses **REUSE** (free) vs **BUY** (best permitted value-per-cent) vs **SKIP** (nothing permitted clears the bar).

Every candidate gets a **legible verdict** — `bought`, `reused`, `blocked by operator policy`, `skipped: relevance below floor`, etc. — so both the buyer *and the creator* can see exactly why a source was or wasn't paid. See `src/modules/agent/decision.ts`; set the mandate via `PUT /v1/proofsource/mandate`. The decision governs **what/whether** to buy — it never governs whether a payment **releases**. That stays deterministic.

## What stays deterministic (settlement integrity)

The LLM is walled off from money. Payment releases only when `verifyDelivery()` passes seven checks (resource match, provider match, payload present, hash generated, non-empty, delivered-before-expiry, usage rights attached). Idempotency keys prevent duplicate settlement. Every state transition writes an audit event. See `src/modules/policy/index.ts` and `src/modules/agent/run.ts`.

## Surfaces (one coherent product)

A single front door (`/`) leads into sign-in / create-account (`/auth.html`) with a creator or operator role, a shared design system (`app.css` + `app.js`), and wallet connection (MetaMask via `window.ethereum`, a managed-wallet option for non-crypto users, or paste). Auth is hackathon-grade (scrypt-hashed passwords, bearer tokens; `POST /auth/register|login`, `GET /auth/me`, `POST /auth/wallet`).

- **Creators (writers, publishers, professors)** sign up, connect their wallet (or get a managed one), connect an RSS/RSSHub feed to list work, and watch earnings at `/creator.html` — total, per-piece, and a feed of recent citations each backed by a verifiable receipt.
- **Operators (research teams running an agent)** sign up, get a workspace + mandate, and use the console at `/console.html` to ask questions and watch the agent decide, pay, verify, and cite — against real creator content — with the traction dashboard at `/traction.html`.
- **The agent** is not a screen; it transacts through the API the operator's workspace drives.

The full loop is real and persisted end to end: a creator onboards → an operator's agent cites their work → the creator sees the payment land with proof.

## Real content (rubric: 30% traction)

The agent doesn't only buy seeded demo rows — `src/connectors/rss/` ingests a real **RSS/Atom feed** (e.g. from **RSSHub**, named in the hackathon's Prior Art #01 as the natural host for citation-tolls) and turns each article into a priced, hash-verified resource credited to its real author, with **freshness driven by the real publish date**. `POST /v1/proofsource/connectors/rss/ingest` takes a feed `url` (any RSSHub route or RSS/Atom URL) or `{ "sample": true }` for the bundled fixture. `npm run rss:demo` proves it end-to-end offline: three real articles ingested → agent buys the on-topic one, crediting the real author → reuses it on the follow-up. Point it at live RSSHub routes on deploy to onboard real creators and generate real in-window payments.

## Traction engine + persistence

Traction is the 30% the rubric weights highest, and it has to be *real volume that survives a restart*. Two pieces make that true:

- **Harness (`scripts/harness.ts`, `npm run harness`)** stands up N independent reader-agents — each with its own budget and operator mandate — and runs them through batches of questions against the ingested creator catalog. Every reader pays creators independently, so payouts and payment counts accrue exactly as with real users; reuse appears when a reader revisits a paid topic. In mock mode it proves the funnel offline; with Circle creds (`PAYMENT_MODE=arc_testnet`) the same loop produces real sub-cent Arc settlements. Example: `npm run harness -- --readers 25 --questions 6`.
- **Persistence (`src/persistence/`)** snapshots the store so accrued volume survives restarts and is countable. Default backend is a JSON file (zero setup); set `PERSIST_BACKEND=postgres` + `DATABASE_URL` to use Postgres instead (lazy `pg`, no hard dependency). The runtime store stays synchronous — no hot-path refactor — and the normalized `prisma/schema.prisma` remains the production target.

Metrics are computed from settled receipts (`src/modules/metrics/traction.ts`) and served at `GET /v1/proofsource/dashboard/traction`, with a live judge-facing page at `/traction.html`: creators earning, total payouts, payment count, average sub-cent size, reader-to-payer conversion, reuse rate, and per-creator earnings — the exact RFB 1 + RFB 6 figures.

## Circle/Arc-first (rubric: 20% Circle tooling)

Payment runs through a `PaymentAdapter` seam (`src/integrations/payments/`). `PAYMENT_MODE` **auto-selects `arc_testnet` when Circle credentials are present**, falling back to `mock` only for CI/offline — the inverse of a mock-first design. The real settlement path is wired against the **published Circle SDK** (verified Jun 2026):

- buyer (`gateway.ts` / `CircleArcAdapter`): `@circle-fin/x402-batching` `BatchEvmScheme` + `@x402/core` `x402HTTPClient` sign an EIP-3009 authorization via `viem` and settle gas-free through Gateway on Arc;
- seller (creator endpoint): `@x402/express` `paymentMiddleware` + `BatchFacilitatorClient({ url })` → Circle Gateway `verify`/`settle`;
- `settle()` returns the on-chain `transaction`, recorded on `receipt.chainReference`.

**A standalone, runnable proof lives in `examples/arc-live/`** — a creator seller + paying agent buyer you can point at Arc testnet to produce one real sub-cent settlement (the day-3 gate in `docs/PLAN.md`). Both it and the core API typecheck clean against the real packages.

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

| Layer | File |
|---|---|
| Agent decision | `src/modules/agent/decision.ts` |
| Orchestrator | `src/modules/agent/run.ts` |
| Policy / verification / receipt | `src/modules/policy/index.ts` |
| x402 handshake | `src/lib/x402.ts` |
| Payment adapter (mock + Circle/Arc) | `src/integrations/payments/` |
| LLM (relevance + answer, optional) | `src/integrations/llm/index.ts` |
| HTTP API + console | `src/routes.ts`, `src/server.ts`, `public/index.html` |
| Shared contracts | `packages/shared/src/types.ts` |
| Production schema | `apps/api/prisma/schema.prisma` |

## Honest status

- **Runs today, zero credentials:** full loop, reuse, skip, operator mandate, per-source verdicts, idempotency, audit, dashboards, console, the RSS/RSSHub connector, the traction harness, durable persistence, **and the creator self-serve experience (onboarding + earnings)** — proven by `npm run smoke`, `npm run rss:demo`, and `npm run harness`, with `npm run typecheck` clean.
- **Wired against the real SDK, pending live creds:** Gateway settlement in `gateway.ts`/`CircleArcAdapter` and the `examples/arc-live` seller+buyer compile against the published Circle packages; they need a funded Arc-testnet wallet (USDC deposited into Gateway) to produce live settlements. Persistence swap from in-memory store to Prisma/Postgres is schema-complete (store mirrors it 1:1).
- **Confirm-at-integration (noted in `examples/arc-live/README.md`):** the buyer signer adapter for `BatchEvmScheme` and exact testnet Gateway base URL / Arc chain id.
- **Next (see `docs/PLAN.md`):** first real testnet settlement (day 3) + a real source connector (RSSHub/Ghost) to drive in-window traction.

## Docs

- `docs/BRD.md` — product requirements (revised for Lepton)
- `docs/TRD.md` — technical requirements (Circle/x402-first)
- `docs/PLAN.md` — 14-day build plan mapped to the judging rubric
- `docs/DEMO_SCRIPT.md` — sub-3-minute video walkthrough


Built for the **Lepton Agents Hackathon** (Canteen × Circle × Arc). Primary fit: **RFB 6 · Creator & Publisher Monetization**, with **RFB 1 · Autonomous Paying Agents** as the buyer. Maps directly to the hackathon's **Prior Art #01 — "content that earns every time it is cited."**

---

## Quickstart

```bash
# 1. install (npm workspaces)
cd apps/api && npm install

# 2. prove the loop end-to-end (no credentials needed)
npm run smoke

# 3. run the live console
npm start          # → http://localhost:3000
```

`npm run smoke` runs three scenarios and asserts the outcomes:

| Scenario | Decision | Why |
|---|---|---|
| New licensing question | **BUY** | Most relevant source clears the value-per-cent bar → authorize → x402 deliver → verify → release → receipt → memory |
| Similar follow-up question | **REUSE** | Owned paid context covers it → no payment |
| Off-topic question (sourdough) | **SKIP** | Nothing clears the relevance/value bar → no payment |

The console lets you type a question and watch the decision, the full lifecycle trace, the answer, and the receipt.

---

## What the AI actually decides (rubric: 30% agentic sophistication)

The framing matters: **creators price their work and set usage terms. The operator sets a standing mandate — budget, per-task ceiling, a max price, preferred/blocked creators, and whether answers must cite a paid source. The agent executes that mandate.** Its only real freedom is choosing which *permitted* source is worth buying for this task, on value-per-cent. It can skip a source — but it can never use one without paying, because access is gated by x402 at the settlement layer.

For each question the agent:

- scores every candidate source's **task-relevance** (LLM rerank when `LLM_ENABLED`, deterministic keyword scorer otherwise),
- discounts by **freshness decay**,
- computes **expected value-per-cent** = `expectedValue ÷ price-in-cents`,
- drops creators the operator **blocked** and respects the **max price** and **budget/ceiling** limits,
- biases toward operator-**preferred** creators,
- and chooses **REUSE** (free) vs **BUY** (best permitted value-per-cent) vs **SKIP** (nothing permitted clears the bar).

Every candidate gets a **legible verdict** — `bought`, `reused`, `blocked by operator policy`, `skipped: relevance below floor`, etc. — so both the buyer *and the creator* can see exactly why a source was or wasn't paid. See `src/modules/agent/decision.ts`; set the mandate via `PUT /v1/proofsource/mandate`. The decision governs **what/whether** to buy — it never governs whether a payment **releases**. That stays deterministic.

## What stays deterministic (settlement integrity)

The LLM is walled off from money. Payment releases only when `verifyDelivery()` passes seven checks (resource match, provider match, payload present, hash generated, non-empty, delivered-before-expiry, usage rights attached). Idempotency keys prevent duplicate settlement. Every state transition writes an audit event. See `src/modules/policy/index.ts` and `src/modules/agent/run.ts`.

## Surfaces (one coherent product)

A single front door (`/`) leads into sign-in / create-account (`/auth.html`) with a creator or operator role, a shared design system (`app.css` + `app.js`), and wallet connection (MetaMask via `window.ethereum`, a managed-wallet option for non-crypto users, or paste). Auth is hackathon-grade (scrypt-hashed passwords, bearer tokens; `POST /auth/register|login`, `GET /auth/me`, `POST /auth/wallet`).

- **Creators (writers, publishers, professors)** sign up, connect their wallet (or get a managed one), connect an RSS/RSSHub feed to list work, and watch earnings at `/creator.html` — total, per-piece, and a feed of recent citations each backed by a verifiable receipt.
- **Operators (research teams running an agent)** sign up, get a workspace + mandate, and use the console at `/console.html` to ask questions and watch the agent decide, pay, verify, and cite — against real creator content — with the traction dashboard at `/traction.html`.
- **The agent** is not a screen; it transacts through the API the operator's workspace drives.

The full loop is real and persisted end to end: a creator onboards → an operator's agent cites their work → the creator sees the payment land with proof.

## Real content (rubric: 30% traction)

The agent doesn't only buy seeded demo rows — `src/connectors/rss/` ingests a real **RSS/Atom feed** (e.g. from **RSSHub**, named in the hackathon's Prior Art #01 as the natural host for citation-tolls) and turns each article into a priced, hash-verified resource credited to its real author, with **freshness driven by the real publish date**. `POST /v1/proofsource/connectors/rss/ingest` takes a feed `url` (any RSSHub route or RSS/Atom URL) or `{ "sample": true }` for the bundled fixture. `npm run rss:demo` proves it end-to-end offline: three real articles ingested → agent buys the on-topic one, crediting the real author → reuses it on the follow-up. Point it at live RSSHub routes on deploy to onboard real creators and generate real in-window payments.

## Traction engine + persistence

Traction is the 30% the rubric weights highest, and it has to be *real volume that survives a restart*. Two pieces make that true:

- **Harness (`scripts/harness.ts`, `npm run harness`)** stands up N independent reader-agents — each with its own budget and operator mandate — and runs them through batches of questions against the ingested creator catalog. Every reader pays creators independently, so payouts and payment counts accrue exactly as with real users; reuse appears when a reader revisits a paid topic. In mock mode it proves the funnel offline; with Circle creds (`PAYMENT_MODE=arc_testnet`) the same loop produces real sub-cent Arc settlements. Example: `npm run harness -- --readers 25 --questions 6`.
- **Persistence (`src/persistence/`)** snapshots the store so accrued volume survives restarts and is countable. Default backend is a JSON file (zero setup); set `PERSIST_BACKEND=postgres` + `DATABASE_URL` to use Postgres instead (lazy `pg`, no hard dependency). The runtime store stays synchronous — no hot-path refactor — and the normalized `prisma/schema.prisma` remains the production target.

Metrics are computed from settled receipts (`src/modules/metrics/traction.ts`) and served at `GET /v1/proofsource/dashboard/traction`, with a live judge-facing page at `/traction.html`: creators earning, total payouts, payment count, average sub-cent size, reader-to-payer conversion, reuse rate, and per-creator earnings — the exact RFB 1 + RFB 6 figures.

## Circle/Arc-first (rubric: 20% Circle tooling)

Payment runs through a `PaymentAdapter` seam (`src/integrations/payments/`). `PAYMENT_MODE` **auto-selects `arc_testnet` when Circle credentials are present**, falling back to `mock` only for CI/offline — the inverse of a mock-first design. The real settlement path is wired against the **published Circle SDK** (verified Jun 2026):

- buyer (`gateway.ts` / `CircleArcAdapter`): `@circle-fin/x402-batching` `GatewayClient.pay(resourceUrl)` handles the full x402 handshake — 402 challenge → signed payment → 200 content — gas-free through Circle Gateway on Arc. Returns an on-chain `transaction` recorded on `receipt.chainReference`.
- seller (creator endpoint): `BatchFacilitatorClient({ url })` → Circle Gateway `verify`/`settle`; manually builds the `PAYMENT-REQUIRED` header (Circle testnet does not yet advertise Arc chain ID in `/supported`, so `x402ResourceServer` is bypassed).
- `PAYMENT_MODE` auto-selects `arc_testnet` when `AGENT_PRIVATE_KEY` + `PLATFORM_WALLET_ADDRESS` are set. `CIRCLE_API_KEY` is **not required** for `GatewayClient.pay()`.

**A standalone, runnable proof lives in `examples/arc-live/`** — a creator seller + paying agent buyer you can point at Arc testnet to produce one real sub-cent settlement (the day-3 gate in `docs/PLAN.md`). Both it and the core API typecheck clean against the real packages.

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

| Layer | File |
|---|---|
| Agent decision | `src/modules/agent/decision.ts` |
| Orchestrator | `src/modules/agent/run.ts` |
| Policy / verification / receipt | `src/modules/policy/index.ts` |
| x402 handshake | `src/lib/x402.ts` |
| Payment adapter (mock + Circle/Arc) | `src/integrations/payments/` |
| LLM (relevance + answer, optional) | `src/integrations/llm/index.ts` |
| HTTP API + console | `src/routes.ts`, `src/server.ts`, `public/index.html` |
| Shared contracts | `packages/shared/src/types.ts` |
| Production schema | `apps/api/prisma/schema.prisma` |

## Honest status

- **Runs today, zero credentials:** full loop, reuse, skip, operator mandate, per-source verdicts, idempotency, audit, dashboards, console, the RSS/RSSHub connector, the traction harness, durable persistence, **and the creator self-serve experience (onboarding + earnings)** — proven by `npm run smoke`, `npm run rss:demo`, and `npm run harness`, with `npm run typecheck` clean.
- **Arc testnet settlement confirmed:** `examples/arc-live` (`buyer.ts` + `seller.ts`) produces real sub-cent USDC settlements on Arc via `GatewayClient.pay()`. The `deposit.ts` helper loads Gateway balance in one step. The returned `transaction` hash flows into `receipt.chainReference` in the main API. `PAYMENT_MODE` auto-activates `arc_testnet` when `AGENT_PRIVATE_KEY` + `PLATFORM_WALLET_ADDRESS` are present — no `CIRCLE_API_KEY` required.
- **Wallet connection wired:** MetaMask uses `window.ethereum.request({ method: 'eth_requestAccounts' })` directly. WalletConnect uses Reown AppKit (CDN) — set `WC_PROJECT_ID` in `public/index.html` to enable. Managed wallet provisions a Circle Wallet stub via `POST /auth/wallet`.
- **Persistence:** in-memory store snapshots to JSON on every settled run; Prisma/Postgres schema is complete and swap-ready (`PERSIST_BACKEND=postgres`).

## Docs

- `docs/BRD.md` — product requirements (revised for Lepton)
- `docs/TRD.md` — technical requirements (Circle/x402-first)
- `docs/PLAN.md` — 14-day build plan mapped to the judging rubric
- `docs/DEMO_SCRIPT.md` — sub-3-minute video walkthrough
