# ProofSource — Technical Requirements (Revised for Lepton)

**Change from v1:** Circle/Arc/x402 is now the spine, not an optional mode (mock is the CI fallback). The agentic decision layer is a first-class module. A real-source connector + traction surface are in scope. Settlement remains deterministic and LLM-isolated.

## 1. Technical summary

ProofSource lets an AI research agent buy paid creator/publisher content through a verified payment-to-delivery lifecycle, settling sub-cent USDC on Arc via Circle Gateway. The agent decides **what/whether** to buy on a value-per-cent basis; the system releases payment **only** after deterministic delivery verification, then issues a tamper-evident receipt and stores reusable paid context.

## 2. Architecture

```
User / hosted agent
  → ProofSource Web (console + dashboards)
  → ProofSource API
      ├─ Source Registry (incl. real connectors: RSSHub / Ghost)
      ├─ Agent Decision Engine   ← relevance · freshness · value-per-cent · budget
      ├─ Policy Engine           ← deterministic gate
      ├─ Payment Service         ← x402 + Circle Gateway (Arc) / mock fallback
      ├─ Delivery + Verification ← seven-check gate
      ├─ Receipt Service         ← receipt hash + chain reference
      ├─ Paid-Context Store      ← reuse memory
      └─ Audit Log
  → Postgres (Prisma)  ·  Circle Gateway / Arc testnet
```

## 3. Stack

- **Frontend:** Next.js + React + TypeScript + Tailwind (scaffold ships a static console; Next.js is the production surface).
- **Backend:** Node 20.18.2+ / TypeScript / Fastify / REST.
- **DB:** Postgres + Prisma (`apps/api/prisma/schema.prisma`). Scaffold runs on an in-memory store that mirrors the schema 1:1 for zero-setup demos.
- **Payments:** `PaymentAdapter` seam. `CircleArcAdapter` (x402 + Gateway nanopayments on Arc) is primary; `MockPaymentAdapter` is the credential-free fallback. Targets the `circlefin/arc-nanopayments` reference.
- **Wallets:** Circle Wallets — one per agent and per provider.
- **AI:** OpenAI-compatible LLM, optional. Used only for source relevance and answer synthesis; deterministic fallbacks keep the build running with no key.
- **Deploy:** Docker Compose; Vultr or Vercel + managed Postgres.

## 4. Circle/Arc-first payment design

**Mode selection:** `PAYMENT_MODE` auto-resolves to `arc_testnet` when `CIRCLE_API_KEY` + `PLATFORM_WALLET_ADDRESS` are set, else `mock`.

**x402 handshake (`src/lib/x402.ts`):** buyer requests a protected resource → seller responds `402` with a payment challenge (amount, payTo wallet, nonce, network) → buyer settles and re-requests with a signed proof → seller returns the payload. The handshake shape is identical across mock and Arc; only the proof source changes (local signature vs Gateway reference).

**Gateway settlement (verified against the published Circle SDK, Jun 2026):**
- Buyer/agent: `@circle-fin/x402-batching` `BatchEvmScheme` (+ `CompositeEvmScheme` fallback) registered on `@x402/core` `x402Client`/`x402HTTPClient`; signs an EIP-3009 authorization via `viem` and settles gas-free through Gateway. See `src/integrations/payments/gateway.ts` and the runnable `examples/arc-live`.
- Seller/creator endpoint: `@x402/express` `paymentMiddleware` + `BatchFacilitatorClient({ url })` → Circle Gateway `POST /v1/x402/verify` and `/settle`. `settle()` returns `{ success, transaction, network, payer }`; `transaction` is persisted on `receipt.chainReference`.
- Nanopayments are batched (gasless, $0.000001 floor) on Arc; sellers withdraw from their Gateway balance crosschain.

**Invariant:** payment release is gated on `verifyDelivery().status === "passed"`. The LLM has no path to authorize or release.

## 5. Agent Decision Engine (the 30% axis)

`src/modules/agent/decision.ts`. Inputs: question, candidate resources, owned paid contexts, workspace budget, per-task ceiling. Output: `AgentDecision { action: REUSE | BUY | SKIP, resourceId?, paidContextId?, reasoning, scores[] }`.

Per candidate: `relevance` (0..1) × `freshnessFactor` = `expectedValue`; `valuePerCent = expectedValue ÷ priceInCents`. Only sources above a relevance floor are buy/reuse-eligible; among those the agent prefers the highest value-per-cent, subject to budget and ceiling and a value-per-cent threshold. Decision reasoning + scores are surfaced in the UI and persisted, so judges can see the AI deciding rather than automating.

## 6. Core modules
Provider · Resource (with real connectors) · Agent Decision · Policy · Payment (adapter) · Delivery · Verification · Receipt · Paid-Context · Audit. Type contracts live in `packages/shared/src/types.ts`.

## 7. Verification checks (deterministic gate)
`resourceIdMatches · providerIdMatches · payloadPresent · contentHashGenerated · contentNotEmpty · deliveredBeforeExpiry · usageRightsAttached`. All must pass. On failure: authorization voided, payment not released, `verification.failed` audited.

## 8. State machines
- **Buy:** discover → decide(BUY) → policy → authorize → x402 deliver → verify → release → receipt → paid-context → answer.
- **Reuse:** discover → decide(REUSE) → return paid context → answer (no payment).
- **Skip:** discover → decide(SKIP) → answer without paid source (no payment).
- **Failed verification:** authorize → deliver → verify(fail) → release blocked → logged.

## 9. API (selected)
`POST /demo/research-agent/run` · `POST /agent/decision` (preview scores without buying) · `POST /providers` · `POST /resources` · `GET /receipts[/:id]` · `GET /paid-contexts` · `GET /audit` · `GET /dashboard/{buyer,provider}` · `GET /health|/ready`. All under `/v1/proofsource`.

## 10. Persistence
In-memory store (`src/db.ts`) for demos; Prisma/Postgres for production via the identical schema. Swap is isolated to the store accessors.

## 11. Testing
- **Unit:** relevance/value-per-cent decision, content-hash, verification gate, payment-release guard, receipt hash.
- **Integration:** buy flow, reuse flow, failed-verification flow, idempotency.
- **Smoke (`npm run smoke`):** asserts BUY→receipt, REUSE→no-payment, SKIP→no-payment, verify-before-release, idempotency, and the full audit trail. Green today.

## 12. Acceptance criteria
Runs locally and deploys · creator lists real content · agent decides on value-per-cent · reuse checked before payment · payment releases only after verification · receipt + paid-context produced · second similar query reuses · real Arc settlement with explorer link · dashboards show real numbers · distinct from any prior Agora project.

## 13. Implementation priorities
1. Core loop + agency (done). 2. Circle/Arc real settlement. 3. Real source connector + traction surface. 4. Deploy + onboard real creators. 5. Dashboards + polish + DX feedback writeup.
