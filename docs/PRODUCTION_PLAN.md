# ProofSource — Production Build Plan (agent-executable)

**Purpose.** Take ProofSource from a working hackathon system to a production-grade,
real-money settlement layer for AI-cited content — the kind of thing that is *credible*
enough to be notable: real creators earning real USDC, with attribution you can verify and
custody you can defend. This document is written to be executed by an autonomous coding
agent (or a small team) with a human owner for the decisions an agent must not make alone.

**Honest framing.** "Headline-worthy" is not a coding task. What earns attention here is
(1) real, verifiable on-chain payouts to real creators at volume, (2) an attribution layer
nobody can game, and (3) trustworthy custody/compliance. Code gets you (1) and (2)'s
mechanics; the human owner must carry custody, legal, banking, and creator relationships.
This plan marks every **[HUMAN]** gate explicitly. An agent that pretends those are code
tasks will build something that looks production-grade and is not.

---

## Agent operating protocol (read first, follow every phase)

1. **Plan → implement → verify → gate.** For each task: write the change, write/extend
   tests, run the full suite, and only advance when the phase's *Definition of Done* (DoD)
   passes. Never mark a phase done on a green build alone if a DoD item is unmet.
2. **Fail closed, always.** Money never moves without verified delivery. Any ambiguity
   resolves to "do not pay / do not release." Reversing a prior correct refusal requires a
   human decision, not an emotional or convenience argument.
3. **Never expose secrets.** No private keys, API keys, or tokens in code, logs, env files
   committed to git, prompts, or test fixtures. Signer keys are loaded at runtime from a
   secrets manager. Never run a third party's script with your signer key in env.
4. **No fabricated facts.** For any external API/chain/SDK detail, verify against current
   official docs before coding; mark "confirm-at-integration" where live verification
   wasn't possible. Cite sources in PRs.
5. **Small, reviewed changes.** One concern per PR, with tests, a description of the DoD
   items it satisfies, and a rollback note. Request human review for anything touching
   money movement, custody, auth, or compliance.
6. **Stop and ask at [HUMAN] gates.** Do not invent a custody model, a legal position, a
   compliance program, or a banking relationship. Surface the decision with options and
   tradeoffs; wait.
7. **Observability is part of done.** Every money path emits structured, queryable events
   and reconciles. If you can't see it, it isn't shipped.

A phase is shippable only when: tests green, DoD met, security checklist for that phase
passed, observability in place, and any [HUMAN] gate it depends on is resolved.

---

## Current baseline (what already exists)

Working in `apps/api`: agent decision + operator mandate + per-source verdicts; x402
deliver → verify (fail-closed) → settle → receipt; RSS/RSSHub ingest; traction harness +
metrics + dashboard; snapshot persistence (file/Postgres); hackathon-grade auth + wallet;
coherent web app (landing/auth/creator/console/traction). Distribution scaffolds:
`packages/sdk`, `packages/mcp`, `packages/openclaw-plugin`, `examples/arc-live`. Settlement
runs in **mock** mode; real Arc settlement is written but not yet executed.

The gap to production is not features — it's **realness, trust, custody, and compliance.**

---

## Phase 0 — Foundations & guardrails

**Goal:** a safe environment to build money software in.

- CI on every PR: typecheck, lint, unit + integration tests, dependency audit, SAST,
  secret-scanning. Block merge on failure.
- Secrets management from day one: signer keys + API keys in a vault (AWS Secrets Manager /
  GCP Secret Manager / 1Claw for the agent signer). Nothing sensitive in git.
- Branch protection, required review for money/auth/compliance paths, signed commits.
- Environments: `dev` → `staging` (testnet) → `prod` (mainnet), each isolated.
- Error tracking + structured logging + metrics/tracing wired before feature work.

**DoD:** red build blocks merge; a planted secret is caught by scanning; staging deploys
from `main` automatically; a thrown error surfaces in the tracker with a trace.

---

## Phase 1 — Real settlement core (the gate)

**Goal:** replace mock settlement with real USDC on Arc, testnet first, then mainnet.

- Wire the live Gateway-batched x402 flow from `examples/arc-live` into the app's
  `circleArc` adapter: deposit into the Gateway Wallet contract, sign EIP-3009 per payment,
  verify, settle, record the on-chain reference on the receipt.
- Enforce idempotency on settlement (no double-pay) and fail-closed verification (no release
  without a passing delivery check). Add a settlement state machine with explicit terminal
  states and retry/backoff for batch settlement lag.
- Reconciliation job: every receipt maps to an on-chain settlement (or a known-pending
  batch); alert on drift.
- **[HUMAN] Custody decision.** Custodial (you hold and manage creator balances and keys —
  powerful UX, makes you a regulated money business) vs non-custodial (creators hold keys —
  lighter legal load, more friction). This decision shapes Phases 2, 5, and all of
  compliance. Do not proceed to mainnet without it.
- Mainnet cutover behind a flag, after testnet runs clean for a sustained period.

**DoD:** a real testnet payment produces an explorer-verifiable tx; 1,000 settlements run
with zero double-pays and zero releases on failed verification (chaos-tested); reconciliation
reports zero unexplained drift; mainnet path gated on the custody decision.

---

## Phase 2 — Ledger-grade persistence

**Goal:** money records that are correct under load and survive anything.

- Replace snapshot persistence with the normalized Postgres schema (`prisma/schema.prisma`),
  migrations, and transactional writes. Make all data access async behind a repository layer.
- Introduce a **double-entry ledger** for value movement (debits/credits must balance);
  receipts and payouts post to it. Money is never a mutable counter.
- Backups + point-in-time recovery; concurrency safety (row locks / serializable txns where
  money is involved); load-tested write path.

**DoD:** ledger balances reconcile to the on-chain truth and to themselves; kill -9 mid-write
loses nothing; concurrent settlements don't corrupt balances; restore-from-backup drill
passes.

---

## Phase 3 — Trust & attribution integrity (the real differentiator)

**Goal:** make "this creator was genuinely cited, and owns this work" unforgeable. The
Lepton brief names this as the actual build: *the payment is easy; the attribution layer
that detects reuse and proves it is the hard part.*

- **Feed/work ownership verification** before any payout: DNS TXT challenge, a verification
  meta tag on the source, or OAuth into the CMS (Ghost/Substack). No payout to an unverified
  owner.
- **Attribution integrity:** citations are cryptographically bound to the delivered content
  and the answer; a paying agent cannot omit or falsely assert a citation without detection.
  Sign receipts (Ed25519) and chain them (tamper-evident).
- **Anti-sybil / anti-wash-trading:** detect self-dealing loops (operator paying creators it
  controls), velocity anomalies, and collusion; reputation + rate limits; quarantine
  suspicious flows from public metrics.

**DoD:** an unverified source cannot receive a payout; a forged or omitted citation is
detected and rejected in tests; a simulated wash-trading ring is flagged and excluded from
traction numbers.

---

## Phase 4 — Identity, auth, and application security

**Goal:** production auth and a defensible security posture.

- Replace hackathon auth with real identity: OAuth / passkeys for humans, scoped API keys
  for operators/agents, RBAC, session management, MFA option.
- Authorization on every route (the current open mandate/run/payment routes must be gated);
  rate limiting; input validation; output encoding.
- Secrets in vault; audit logging of every privileged + money action; dependency and
  container scanning; a third-party penetration test before mainnet.

**DoD:** every route enforces authz (verified by tests); no plaintext secrets anywhere; pen
test findings triaged and criticals fixed; audit log reconstructs any money action.

---

## Phase 5 — Payments operations & compliance

**Goal:** real creators can actually get paid and withdraw, lawfully.

- Withdrawals: USDC→fiat off-ramp (most writers want dollars), payout cadence, fees, a
  **[HUMAN]-set take-rate**, dunning, and reconciliation.
- **[HUMAN] Compliance program:** KYC/AML on payouts, sanctions screening (never pay a
  sanctioned wallet), tax reporting (1099/equivalent), money-transmitter analysis per the
  custody model, ToS / privacy policy / payout agreement / content-licensing terms. Requires
  a lawyer; not a code task.
- **[HUMAN] Banking + entity:** legal entity, business banking, and a fiat off-ramp partner.

**DoD:** a real creator completes KYC, earns, and withdraws to a bank account in staging;
sanctioned-wallet payout is blocked; tax records generate; legal docs are live and linked at
signup. (The [HUMAN] gates are owner-completed; the agent builds the enforcement.)

---

## Phase 6 — Distribution surfaces to production

**Goal:** every door is installable and pays for real.

- Publish `@proofsource/sdk` and `@proofsource/mcp` (npm); the **OpenClaw plugin** to
  ClawHub; deploy the **x402/Gateway seller** so other agents can pay you; ship RSSHub/Ghost
  adapters.
- Each surface authenticates, respects the mandate, and settles on the same core. Versioning,
  changelogs, and docs for each.

**DoD:** `claude mcp add proofsource …` works against prod; `openclaw plugins install
proofsource` works; an external agent pays the x402 seller on testnet→mainnet; SDK consumers
pinned to a stable version.

---

## Phase 7 — Scale, reliability, observability

**Goal:** it stays up and you can see it.

- Horizontal scale; a durable queue for settlement batching; caching; idempotent workers.
- SLOs (availability, settlement latency, reconciliation freshness); dashboards; alerting;
  on-call + incident runbooks; chaos testing of the fail-closed path.

**DoD:** load test to the target tx/sec with SLOs met; an injected dependency failure
degrades safely (no incorrect payments); dashboards show live money flow and reconciliation
status; a simulated incident is resolved via the runbook.

---

## Phase 8 — Real traction & the public proof (what actually makes it notable)

**Goal:** the thing people can point to.

- **[HUMAN] Two-sided cold start:** onboard real creators (attach to existing OSS audiences —
  RSSHub/Ghost/Jellyfin — per the Distribution Bootstrap) and real paying agents (run your
  own at first). Ten real creators earning beats any feature.
- A **public, verifiable transparency dashboard**: live, real, on-chain payouts; total paid
  to creators; per-citation receipts anyone can check on the explorer. Verifiability is the
  story.
- Case studies (a named writer earning from AI citations), an open methodology for
  attribution, and a launch only once the numbers are real.

**DoD:** real GMV with real creators; every headline number is independently verifiable
on-chain; a third party can reproduce a "cited → paid" event end to end.

---

## [HUMAN] decision register (an agent must not decide these)

| Decision | Why it's human | Blocks |
|---|---|---|
| Custody model (custodial vs non-custodial) | Determines regulatory status | Phase 1 mainnet, 2, 5 |
| Legal entity + jurisdiction | Liability, licensing | Phase 5 |
| Compliance program (KYC/AML/sanctions/tax) | Legal obligation; needs counsel | Phase 5 mainnet |
| Banking + fiat off-ramp partner | Real money handling | Phase 5 |
| Take-rate / pricing | Business model | Phase 5 |
| Which real creators to onboard, and consent | Relationships + rights | Phase 8 |
| Go-live / press timing | Reputation; only on real numbers | Phase 8 |

---

## Risk register (top risks to manage continuously)

- **Wash-trading / sybil payouts** faking traction → Phase 3 controls + exclude from public
  metrics.
- **Custody/compliance misstep** → [HUMAN] gates; do not touch mainnet money without them.
- **Attribution forgery** undermines the entire value prop → Phase 3 cryptographic binding.
- **Key compromise** → vault + rotation + never-in-env rule + least privilege.
- **Settlement drift / double-pay** → idempotency + double-entry ledger + reconciliation
  alerting.
- **Two-sided cold start stall** → seed the agent side yourself; attach to existing
  audiences rather than recruiting cold.

---

## Definition of "production-grade" (the bar)

Real USDC settles to verified, consenting creators; every payout is attribution-bound and
on-chain-verifiable; money is double-entry and reconciled; auth and secrets meet a passed
security review; custody and compliance are owner-decided and enforced in code; the system
meets its SLOs under load and fails closed; and the public can verify the numbers
themselves. Hit that, with real creators earning, and the story tells itself — honestly.
