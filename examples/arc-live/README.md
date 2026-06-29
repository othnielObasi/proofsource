# arc-live — one real sub-cent payment on Arc

The gate to everything else in ProofSource: a creator endpoint protected by **x402**, paid by the **agent** through **Circle Gateway** batched nanopayments, settled on **Arc testnet** in **USDC**. Produces a real on-chain `transaction` reference — the thing the ProofSource receipt records.

Verified against (Jun 2026): `@circle-fin/x402-batching@3.0.4`, `@x402/core@^2.15`, `viem@^2`.

## Setup

```bash
cd examples/arc-live && npm install
cp .env.example .env   # fill in the values below
```

Required env vars:

| Variable | Where to get it |
|---|---|
| `AGENT_PRIVATE_KEY` | Agent/buyer wallet private key (hex, `0x...`) |
| `SELLER_WALLET_ADDRESS` | Creator/seller wallet address — receives USDC |
| `ARC_TESTNET_RPC_URL` | `https://rpc.testnet.arc.network` (or ARC CLI bundled RPC) |
| `ARC_TESTNET_CHAIN_ID` | `5042002` |
| `CIRCLE_GATEWAY_URL` | `https://gateway-api-testnet.circle.com` |

Optional:
- `RESOURCE_URL` — URL to pay (default `http://localhost:4021/research/demo`)
- `PRICE_USDC` — price the seller charges (default `0.001`)
- `DEPOSIT_AMOUNT` — USDC to deposit into Gateway wallet (default `5`)

## Run

```bash
# Step 1 (one-time) — deposit USDC from your wallet into the Circle Gateway contract
npm run deposit

# Step 2 — start the creator's x402-protected content endpoint
npm run seller     # → http://localhost:4021/research/demo

# Step 3 — the agent pays and fetches
RESOURCE_URL=http://localhost:4021/research/demo npm run buyer
```

Expected buyer output:
```
HTTP 200
Paid: 0.001000 USDC
Transaction: <uuid>

✅ Real Arc settlement:
   https://testnet.arcscan.app/tx/<uuid>
```

The `transaction` UUID is the on-chain Circle Gateway settlement reference.

## How the payment flow works

`buyer.ts` uses `GatewayClient.pay(resourceUrl)` which handles the full x402 handshake automatically:
1. Hits the resource URL → receives a `402 PAYMENT-REQUIRED` response
2. Signs and submits the batched USDC payment via Circle Gateway
3. Retries the request with a `PAYMENT-SIGNATURE` header → receives `200` + content

`seller.ts` manually builds the `402` response and calls `BatchFacilitatorClient.verify()` + `.settle()` directly — this bypasses `x402ResourceServer` because Circle Gateway testnet does not yet advertise the Arc chain ID (`eip155:5042002`) in its `/supported` response.

## How this maps back into ProofSource

- The **seller** here = a ProofSource creator's resource behind x402
- The **buyer** here = `apps/api/src/integrations/payments/gateway.ts` (`payAndFetch()`)
- The `transaction` returned by `GatewayClient.pay()` is written to `receipt.chainReference.transactionHash`
- ProofSource's delivery verification + tamper-evident receipt + reusable paid-context is the attribution layer **on top of** this payment rail

## Wallet generation

```bash
node gen-wallets.mjs   # generates a fresh keypair for testing
```
