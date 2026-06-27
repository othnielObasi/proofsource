# ProofSource — 14-Day Plan (Lepton Agents Hackathon)

**Window:** Jun 15 → Jun 29, 2026 · online · async judging (no demo day) · submit early and often.

**Required at submission:** public GitHub repo + recorded video demo (<3 min). Live deployed link strongly encouraged. Traction questions asked on the form: how many users onboarded, what problem you're building for.

## How the rubric drives the plan

| Weight | Axis | What moves the needle here |
|---|---|---|
| 30% | **Agentic sophistication** | The agent *decides* buy/reuse/skip on value-per-cent + budget, not exact-match plumbing. Make the decision legible (scores surfaced in UI + receipt). |
| 30% | **Traction** | Real creators listing, real readers/agents paying, real volume *in-window*. Seeded demos score low — wire one real source and get real testnet payments. |
| 20% | **Circle tool usage** | Gateway nanopayments + x402 + Wallets on Arc, used for real, not mocked. |
| 20% | **Innovation** | The "earns every time it's cited" attribution loop + reusable receipts is novel territory (Prior Art #01). |

Agency and traction are weighted equally and are where most teams underinvest. Spend accordingly.

## Day-by-day

**Days 1–2 (Jun 15–16) — Spine + agency [DONE in scaffold]**
- Full citation-pay loop running in mock mode; agent decision layer (value-per-cent, budget, reuse/skip); verification gate; receipts; paid-context memory; audit; console; smoke + typecheck green.
- Register on Luma (passphrase `SITEx2224`), join Canteen + Arc Discords, install ARC CLI + Circle CLI.

**Days 3–4 (Jun 17–18) — Circle/Arc settlement (20% axis)**
- Provision Circle API key + entity secret; create buyer + provider agent **Wallets**; fund buyer wallet on Arc testnet and **deposit USDC into the Gateway wallet contract** (one-time).
- Get a real settlement using the included **`examples/arc-live/`** (already compiles against the published SDK): run the seller (`@x402/express` `paymentMiddleware` + `BatchFacilitatorClient`), then the buyer (`@circle-fin/x402-batching` `BatchEvmScheme` + `@x402/core` `x402HTTPClient` + `viem`). Confirm `settle()` returns a real `transaction`.
- Point the main app at it: set Circle env vars so `PAYMENT_MODE` auto-selects `arc_testnet`; `CircleArcAdapter.releasePayment` records the on-chain `transaction` on the receipt.
- First real sub-cent USDC settlement on Arc, visible in the trace. Submit v1 (repo + 90-sec video) — submit early.

**Days 5–7 (Jun 19–21) — Real source + traction engine (30% axis)**
- **Source connector [scaffolded — `src/connectors/rss/`]:** ingests real RSS/Atom feeds (RSSHub routes or any feed URL) into priced, hash-verified resources credited to real authors, freshness from real publish dates. Proven offline by `npm run rss:demo`. Day-5 task is pointing it at live RSSHub routes and adding a Ghost Content API variant.
- Provider onboarding: a creator lists a real piece (or imports a feed), sets a sub-cent price + reuse policy, supplies a payout wallet.
- Reader/agent surface: a hosted research agent that pays per citation. Instrument creators-earning + readers-paying counters for the form's traction questions.

**Days 8–10 (Jun 22–24) — Deploy + onboard real users**
- Deploy API + console + `/traction.html` (Vultr or Vercel + managed Postgres; set `PERSIST_BACKEND=postgres`). Persistence layer is built — accrued volume already survives restarts.
- Run the **traction harness** against live RSSHub feeds in `arc_testnet` mode so real sub-cent payments accrue continuously (it's built and proven in mock; `npm run harness`). This is the volume number.
- Recruit 5–15 real creators (indie newsletters, RSSHub feeds) with real wallets and run real agent purchases against them. Log every payment.
- Harden idempotency, failure paths, and the failed-verification → no-release path under real conditions.

**Days 11–12 (Jun 25–26) — Polish + dashboards**
- Buyer/provider dashboards with real numbers (spend, earnings, reuse rate, avg payment size — target sub-cent).
- Transaction-trace view per receipt; explorer links live.
- Write up Circle developer-tooling feedback (there's a $500 incentive for the most useful DX feedback).

**Days 13–14 (Jun 27–29) — Submission**
- Record the final <3-min video (script in `docs/DEMO_SCRIPT.md`): problem → live BUY with real Arc settlement → REUSE → creator earnings → traction numbers.
- Final README pass for a reviewer who clicks around without you in the room.
- Submit final via the project form with repo + video + live link + traction metrics. Re-submit as numbers grow.

## Traction metrics to report (from the RFB 6 list)
Creators earning · total creator payouts · average payment per piece · reader-to-payer conversion · total autonomous payments · average transaction size (target sub-cent).

## Risks & mitigations
- **Gateway integration slips** → mock fallback keeps the build demoable; prioritize one real settlement over many features.
- **Low real volume in 14 days** → RSSHub gives instant real content; seed a handful of friendly creators day 8.
- **Agency reads as automation** → surface the decision scores + reasoning in UI and receipts so judges see the AI deciding.

## Eligibility note
The "Coming from Agora" rule requires fresh progress on *both* product and traction since any prior Agora entry. ProofSource is a distinct new build; keep it clearly separate from any earlier project.
