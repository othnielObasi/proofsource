# Phase 1 — Real Arc Settlement · Ticket-by-Ticket Spec (agent-executable)

**Scope.** Replace mock settlement with real, gasless USDC nanopayments on Arc via Circle
Gateway-batched x402 — testnet first, mainnet behind a human-gated flag. Fail-closed,
idempotent, reconciled, observable. This is the gate: until it's done, every downstream
number is mock.

**Verified constants** (Circle/Arc, current): chain id `5042002` (`arc-canteen rpc
eth_chainId` → `0x4cef52`); RPC = `$RPC` from `arc-canteen login` (fallback
`https://rpc.testnet.arc.network`); USDC `0x3600000000000000000000000000000000000000`;
Gateway Wallet contract `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` (same on all EVM
testnets); explorer `https://testnet.arcscan.app`; SDK `@circle-fin/x402-batching`; payment
auth = EIP-3009 signatures, batch-settled. Dialect = **Gateway-batched** (`PAYMENT-REQUIRED`
header), not plain-body EIP-3009.

**Repo anchors:** `apps/api/src/integrations/payments/{adapter.ts,mock.ts,circleArc.ts,gateway.ts,index.ts}`,
`apps/api/src/env.ts`, `apps/api/src/modules/agent/run.ts`, `apps/api/src/modules/policy/index.ts`,
`apps/api/src/modules/metrics/traction.ts`, `examples/arc-live/src/{buyer,seller}.ts`.

**Ticket template.** Each ticket: *Goal · Files · Steps · Tests/Acceptance (DoD) ·
Depends · Gates*. Advance only when the ticket's DoD is green. Mark unresolved external
details **[confirm-at-integration]** and verify against current Circle/Gateway docs before
relying on them.

**Execution order (DAG):**
`PS1-00 → PS1-01 → PS1-02 → PS1-03 → PS1-04 → PS1-05 → PS1-06 → PS1-08`, with
`PS1-07 (mainnet)` gated on PS1-04..06 clean **and** the [HUMAN] custody decision.

---

### PS1-00 — Pre-flight: environment, wallets, secrets
**Goal:** a funded testnet buyer, a Gateway balance, and signer keys held safely.
**Files:** none in app code; produces `.env`/vault entries (never committed).
**Steps:**
1. `arc-canteen login` → capture `$RPC`. Verify `arc-canteen rpc eth_chainId` → `0x4cef52`.
2. Generate buyer + seller wallets locally (viem). Store the **buyer signer key in the
   secrets vault** (AWS/GCP/1Claw) — never in a committed file, never in a third party's env.
3. Faucet the buyer at `https://faucet.circle.com` (Arc Testnet + USDC).
4. Deposit ≥1 USDC into the Gateway Wallet contract for the buyer.
**DoD:** `$RPC` returns chain `5042002`; buyer shows testnet USDC on arcscan; Gateway
balance ≥ deposit; signer key resolvable only via the vault at runtime.
**Gates:** never print/commit the signer key.

### PS1-01 — Settlement config & feature flags
**Goal:** one validated source of truth for payment mode and chain config.
**Files:** `env.ts` (extend), new `config/settlement.ts`.
**Steps:**
1. Centralize: `PAYMENT_MODE` (`mock|arc_testnet|arc_mainnet`), RPC, chain id, Gateway URL
   **[confirm-at-integration]**, USDC + Gateway-contract addresses, x402 network
   (`eip155:5042002`). Load the signer key from the vault, not `process.env` plaintext.
2. Validate at boot: required fields present per mode; fail fast with a clear message; log
   the active mode (never the key). `arc_mainnet` requires an explicit `ALLOW_MAINNET` flag.
**DoD:** boot fails fast on missing config; mode is logged; mainnet inert without the flag;
a config unit test covers each mode's required set.
**Depends:** PS1-00.

### PS1-02 — Gateway client wrapper
**Goal:** a typed, testable wrapper around `@circle-fin/x402-batching`.
**Files:** `integrations/payments/gateway.ts`.
**Steps:**
1. Wrap `GatewayClient` with `deposit(amount)`, `balance()`, `pay({to, amountUsdc, ...})`
   (signs EIP-3009 from the vaulted signer), and `verify()` **[confirm-at-integration:
   exact method names/shapes per installed SDK version; mirror `examples/arc-live` +
   `circlefin/arc-nanopayments`]**.
2. Surface settlement references (tx hash / Circle settlement id, explorer URL) from results.
**DoD:** unit tests with the SDK mocked cover pay/deposit/balance/verify and error paths; an
integration test on testnet deposits and reads back the balance.
**Depends:** PS1-01.

### PS1-03 — circleArc adapter: real release path
**Goal:** `releasePayment` settles for real and records the on-chain reference.
**Files:** `integrations/payments/circleArc.ts`, `index.ts` (factory), `adapter.ts` (interface).
**Steps:**
1. Implement `releasePayment(authorization)` to call `gateway.pay(...)`, then write the
   on-chain reference (tx/settlement id + explorer URL) onto the receipt.
2. **Idempotency:** key settlement on `(workspaceId, resourceId, dayKey)` (existing
   `idempotency` map → move to the DB in Phase 2). A repeat with the same key returns the
   prior settlement, never a second payment.
3. Factory returns this adapter when `PAYMENT_MODE` ∈ {`arc_testnet`,`arc_mainnet`}.
**DoD:** a real testnet settlement returns an arcscan-verifiable reference recorded on the
receipt; replaying the same idempotency key does **not** double-pay (test proves it).
**Depends:** PS1-02.

### PS1-04 — Settlement state machine + fail-closed verification
**Goal:** money moves only after verified delivery; every payment ends in a correct terminal
state.
**Files:** `modules/agent/run.ts`, `modules/policy/index.ts` (verifyDelivery), new
`modules/settlement/machine.ts`.
**Steps:**
1. States: `authorized → delivering → delivered → verified → settling → settled` plus
   `failed` and `refunded`. Persist transitions.
2. **Fail-closed:** the existing delivery verification (7 checks) must pass before `settling`.
   On verify failure → `failed`, never settle, release nothing.
3. Retry/backoff for batch-settlement lag; bounded; idempotent; terminal on exhaustion.
**DoD:** failed verification never settles (test); chaos test (kill process mid-`settling`)
resumes to a correct terminal state with no double-pay; all transitions are persisted and
queryable.
**Depends:** PS1-03.

### PS1-05 — Reconciliation job
**Goal:** prove on-ledger == on-chain, continuously.
**Files:** new `scripts/reconcile.ts` (+ scheduled runner), `modules/metrics/traction.ts`
(read-side only counts settled).
**Steps:**
1. For each `settled` payment, confirm a matching on-chain settlement (or a known-pending
   batch). Flag and alert on any unmatched/extra.
2. Exclude unreconciled/pending from public traction numbers until confirmed.
**DoD:** injected drift (a fake settled row with no on-chain match) is detected and alerts;
a clean run reports zero drift; traction counts only reconciled settlements.
**Depends:** PS1-04.

### PS1-06 — Wire app + harness to real mode
**Goal:** the product and the volume engine settle for real on testnet.
**Files:** `routes.ts` (run route), `scripts/harness.ts`.
**Steps:**
1. `demo/research-agent/run` and the harness use the real adapter when
   `PAYMENT_MODE=arc_testnet`. No code path special-cases mock once real.
2. Run the harness in `arc_testnet`; confirm real txs accrue and persist; traction dashboard
   + creator earnings show real, reconciled numbers.
**DoD:** a harness run in `arc_testnet` produces arcscan-verifiable txs; `/traction.html`
and creator earnings reflect real, persisted, reconciled volume; smoke/rss:demo stay green
in mock (CI must still pass offline).
**Depends:** PS1-05.

### PS1-07 — Mainnet readiness gate  **[HUMAN: custody]**
**Goal:** real-money path, only when it's safe and decided.
**Files:** `config/settlement.ts` (mainnet branch), deploy config.
**Steps:**
1. Keep `arc_mainnet` inert behind `ALLOW_MAINNET` + the **[HUMAN] custody decision**
   (custodial vs non-custodial — shapes Phases 2/5) + a passed security review of the money
   path + sustained clean testnet.
2. Mainnet uses real USDC + production Gateway endpoints **[confirm-at-integration]**.
**DoD:** mainnet code paths exist but are unreachable without the flag and the documented
[HUMAN] sign-offs; a test asserts mainnet is refused when the flag/sign-off is absent.
**Depends:** PS1-04..06 clean; **[HUMAN]** custody + security review.

### PS1-08 — Observability for the money path
**Goal:** you can see every cent move.
**Files:** logging/metrics middleware, dashboard config.
**Steps:**
1. Emit a structured event per state transition (no secrets); metrics for settlements,
   failures, latency, retries, drift.
2. Dashboard: live settlement flow + reconciliation status + failure rate.
**DoD:** every settlement is reconstructable from events; the dashboard shows live flow and
would surface a drift or failure spike within the alert window.
**Depends:** PS1-04 (runs alongside 05–07).

---

## Phase-1 exit criteria (all must hold)
- Real testnet settlements are arcscan-verifiable and recorded on receipts.
- Zero double-pays and zero releases on failed verification across a 1,000-settlement chaos
  run.
- Reconciliation reports zero unexplained drift; public numbers count only reconciled
  settlements.
- App + harness produce real, persisted, reconciled volume in `arc_testnet`.
- Mainnet remains gated on `ALLOW_MAINNET` + [HUMAN] custody + security review.
- The money path is fully observable; the signer key lives only in the vault and never
  appears in code, logs, env, or fixtures.

> Next spec to expand: **Phase 3 — attribution integrity** (ownership verification, signed
> tamper-evident citations, anti-sybil), the differentiator the Lepton brief calls the real
> build.
