# arc-live — one real sub-cent payment on Arc

The gate to everything else in ProofSource: a creator endpoint protected by **x402**, paid by the **agent** through **Circle Gateway** batched nanopayments, settled on **Arc testnet** in **USDC**. Produces a real on-chain `transaction` reference — the thing the ProofSource receipt records.

Verified against (Jun 2026): `@circle-fin/x402-batching@3.0.4`, `@x402/core@^2.15`, `@x402/evm@^2`, `viem@^2`.

## Setup (≈ day 3 of the plan)

```bash
cd examples/arc-live && npm install
cp .env.example .env   # then fill in the values below
```

1. **Arc testnet access** — install the hackathon ARC CLI (`uv tool install git+https://github.com/the-canteen-dev/ARC-cli`); it bundles a Canteen-hosted Arc testnet RPC. Set `ARC_TESTNET_RPC_URL` and `ARC_TESTNET_CHAIN_ID` (→ `ARC_X402_NETWORK=eip155:<chainId>`).
2. **Circle CLI / Gateway** — `npm i -g @circle-fin/cli`; create agent + creator **Wallets**, get `CIRCLE_GATEWAY_URL` (use the testnet base from Circle's docs), set `SELLER_WALLET_ADDRESS` (creator payout) and `AGENT_PRIVATE_KEY` (buyer).
3. **Deposit (one-time)** — deposit USDC from the agent wallet into the Circle **Gateway wallet contract** so it has a gas-free spendable balance. (Buyer quickstart / Circle CLI.)

## Run

```bash
# terminal 1 — creator's protected content
npm run seller     # → http://localhost:4021/research/demo  (402-protected, $0.001/req)

# terminal 2 — the agent pays + fetches
RESOURCE_URL=http://localhost:4021/research/demo npm run buyer
```

Expected buyer output: `HTTP 200`, the content, and a settlement object `{ success: true, transaction: "...", network: "..." }`. That `transaction` is the on-chain reference. Seller earnings appear in the Gateway balance after the batch settles (a few minutes); withdraw crosschain to a payout wallet via the Circle CLI.

## How this maps back into ProofSource

- The **seller** here = a ProofSource creator's resource exposed over x402 (`BatchFacilitatorClient` → Circle Gateway).
- The **buyer** here = the ProofSource research agent's wallet. In the main app this lives behind `apps/api/src/integrations/payments/circleArc.ts`; `gateway.ts` is the same paid-fetch loop, and the returned `transaction` is written to `receipt.chainReference`.
- ProofSource's verification + tamper-evident receipt + reusable paid-context is the attribution layer **on top of** this rail (Prior Art #01).

## Fastest fork alternative
If you want a higher-level wrapper to start from, the community samples `BlockRunAI/circle-nanopayment-sample` and `Stephen-Kimoi/nanopayments-with-usdc` wrap this same flow; this example is written against the **published** SDK so it stays current.

## Confirm-at-integration
- Buyer signer adapter shape for `BatchEvmScheme` (the viem account/walletClient binding) — check the `@circle-fin/x402-batching` client example for your installed minor.
- Seller `processHTTPRequest` → Express response mapping (`HTTPProcessResult` fields) — check the `@x402/core` HTTP quickstart. The facilitator wiring and route/price config are correct as written.
