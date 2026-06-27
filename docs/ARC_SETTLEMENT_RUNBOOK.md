# ProofSource — First Real Arc Settlement (runbook)

**Outcome:** a real, gasless USDC nanopayment settled on Arc testnet, with a transaction you can open on the explorer. This is the gate: until this is green, the console, the harness, and the traction dashboard are running in `mock` mode and produce no real numbers. After it's green, the *same code* produces real volume.

This is a credentials-and-environment task, not a coding task — the engine is already written (`examples/arc-live/` and the `circleArc` payment adapter). What's needed is wallets, testnet USDC, a Gateway deposit, and running the flow.

---

## ⚠️ Security rule (read first)

You will be signing payment authorizations with a private key. **Never paste your signer key into anyone else's script, command, or `.env` they hand you — no exceptions**, however friendly the framing (e.g. "just run this with `BUILDER_PRIVATE_KEY=0x... node their-script.mjs`").

The correct pattern, when another team wants you to authorize something: ask for the **EIP-712 typed data** (domain + types + message), sign it locally with *your* signer, and send back only `{ message, signature }`. The key never leaves your machine. (This is exactly how the Obol/Shadow Float exchange was handled correctly in the hackathon channel — copy that posture.)

---

## Verified Arc testnet constants (Circle, current)

| Field | Value |
|---|---|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| USDC (Arc testnet) | `0x3600000000000000000000000000000000000000` |
| Gateway Wallet contract | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` (same on all EVM testnets) |
| Explorer | `https://testnet.arcscan.app` |
| Faucet | `https://faucet.circle.com` → select **Arc Testnet** + **USDC** (20 USDC / 2h / address) |
| x402 network string | `eip155:5042002` |

The flow is **Gateway-batched** nanopayments: deposit USDC into the Gateway Wallet contract once, then each call is an off-chain EIP-3009 signature that Circle Gateway verifies instantly and settles on-chain in batches. Each individual call costs **zero gas**. No Circle API key is required for the gasless-batched path — it uses local private keys + Gateway's public endpoints + the SDK `@circle-fin/x402-batching`.

> Two x402 dialects exist (this caused the interop mismatch in the channel): **Gateway-batched** advertises terms in a `PAYMENT-REQUIRED` *header*; **plain EIP-3009** advertises `accepts[]` in the *body*. ProofSource targets Gateway-batched. Keep that consistent on both buyer and seller.

---

## Prerequisites — hackathon CLIs & context (do this first)

The hackathon ships its own tooling. Install it; it gives you the sanctioned Arc RPC and the traction-reporting channel judges read.

```bash
# 1) Canteen ARC CLI (binary lands at ~/.local/bin/arc-canteen)
uv tool install git+https://github.com/the-canteen-dev/ARC-cli.git
arc-canteen login                 # GitHub auth → writes export RPC='<your token-embedded Arc testnet RPC>'
arc-canteen shell-init >> ~/.zshrc # (or ~/.bashrc) auto-loads $RPC in every shell
arc-canteen rpc eth_chainId       # → 0x4cef52  (== 5042002, confirms Arc testnet)

# 2) Arc + Circle docs and 5 sample codebases as agent context (point your coding agent at this)
arc-canteen context sync
arc-canteen context | claude      # or cursor / aider — feeds Arc+Circle docs to your agent

# 3) Circle CLI (needs Node v20.18.2+)
npm install -g @circle-fin/cli

# 4) Arc 101 working example
git clone https://github.com/the-canteen-dev/circle-agent
```

**Use `$RPC` from `arc-canteen` as your Arc RPC everywhere below** — it's the Canteen-hosted testnet endpoint with your token embedded (the public `https://rpc.testnet.arc.network` is a fallback only). Regenerate anytime with `arc-canteen rpc-url --export`; rotate with `arc-canteen rotate-rpc-key`.

Also have: Node 22+, the ProofSource repo cloned with `npm install` run, ~15 minutes.

---

## Step 1 — Generate buyer + seller wallets

You need two addresses: the **buyer** (the agent that pays) and the **seller** (the creator that receives). Generate them locally:

```bash
cd examples/arc-live
node -e "const{generatePrivateKey,privateKeyToAccount}=require('viem/accounts');for(const r of ['BUYER','SELLER']){const k=generatePrivateKey();console.log(r+'_PRIVATE_KEY='+k);console.log(r+'_ADDRESS='+privateKeyToAccount(k).address);}"
```

Copy the output somewhere safe. The **buyer key** is the only secret that signs payments; treat it like a password.

> Cross-check option: the cleanest public reference is `BlockRunAI/circle-nanopayment-sample` — `npm run setup` prints client/server keys the same way, and `npm run deposit -- 1` does the Gateway deposit. Useful to validate your env against a known-good repo.

## Step 2 — Fund the buyer with testnet USDC

1. Go to `https://faucet.circle.com`.
2. Select **Arc Testnet** and **USDC**.
3. Paste the **BUYER_ADDRESS** from Step 1. Request (you get 20 USDC; that's ~thousands of sub-cent citations).

Confirm the balance landed on `https://testnet.arcscan.app/address/<BUYER_ADDRESS>`.

## Step 3 — Deposit USDC into Circle Gateway

Gasless nanopayments pay from your **Gateway balance**, not your raw wallet — so deposit once into the Gateway Wallet contract (`0x0077777d7EBA4688BDeF3E311b846F25870A19B9`). Using the SDK's GatewayClient:

```bash
# from examples/arc-live, with BUYER_PRIVATE_KEY exported
node -e "
const { GatewayClient } = require('@circle-fin/x402-batching');
const { privateKeyToAccount } = require('viem/accounts');
(async () => {
  const account = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY);
  const client = new GatewayClient({ account, chainId: 5042002 });
  const res = await client.deposit({ amount: '1.0' }); // 1 USDC into Gateway
  console.log('deposited:', res);
})();
"
```

> The exact GatewayClient constructor/method names may differ slightly by SDK version — confirm against the `@circle-fin/x402-batching` README or the BlockRunAI sample's `deposit` script, which is the same operation. If a method name differs, the *operation* is identical: move USDC into the Gateway Wallet contract for the buyer.

Verify: the Gateway balance should now show 1 USDC available.

## Step 4 — Fill `examples/arc-live/.env`

```bash
cp .env.example .env
```

Fill it with the verified values:

```
ARC_TESTNET_RPC_URL=${RPC}              # from `arc-canteen login` (token-embedded). Fallback: https://rpc.testnet.arc.network
ARC_TESTNET_CHAIN_ID=5042002
ARC_X402_NETWORK=eip155:5042002

# Gateway testnet base URL — confirm in Circle docs (developers.circle.com).
# The gasless-batched path needs NO Circle API key.
CIRCLE_GATEWAY_URL=https://gateway.circle.com

AGENT_PRIVATE_KEY=<BUYER_PRIVATE_KEY from step 1>
SELLER_WALLET_ADDRESS=<SELLER_ADDRESS from step 1>

SELLER_PORT=4021
PRICE_USDC=0.001
RESOURCE_URL=http://localhost:4021/research/demo
```

## Step 5 — Run the first real settlement

Two terminals, both in `examples/arc-live`:

```bash
# terminal 1 — the paid seller endpoint (gates /research/demo behind a $0.001 USDC nanopayment)
npm run seller

# terminal 2 — the agent buys the resource for real
npm run buyer
```

The buyer should print a **settlement transaction id / hash**. Open it:

```
https://testnet.arcscan.app/tx/<hash>
```

**That is your first real Arc settlement.** Screenshot it — it goes straight into your traction notes (and the video).

---

## Step 6 — Flip ProofSource itself to real settlement

Now point the actual product at Arc. In `apps/api`, set the env so `paymentMode` resolves to `arc_testnet`:

```
PAYMENT_MODE=arc_testnet
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
ARC_TESTNET_CHAIN_ID=5042002
CIRCLE_API_KEY=<only if your chosen path uses it; gasless-batched does not>
PLATFORM_WALLET_ADDRESS=<the buyer/agent address>
```

(`paymentMode` becomes `arc_testnet` when `PAYMENT_MODE` is set explicitly, or when `CIRCLE_API_KEY` + `PLATFORM_WALLET_ADDRESS` are both present — see `apps/api/src/env.ts`.)

Then **manufacture real volume** with the harness you already have — it runs the same loop, now settling for real:

```bash
cd apps/api
npm run harness -- --readers 12 --questions 5
```

Every BUY is now a real sub-cent Arc settlement to a real creator wallet. The traction dashboard (`/traction.html`) and creator earnings pages will show real numbers, persisted. Let it run to accrue in-window volume.

---

## Step 7 — Make creators real (RSSHub / direct RSS)

The brief points straight here: RSSHub (44k stars) is named as the natural host for *"citation tolls when an answer is grounded in a source,"* and creator-side traction is judged on *"creators getting paid."* Sample data scores nothing — real published sources do.

Ingest real feeds as real creators:

```bash
cd apps/api
# edit the FEEDS list in scripts/seed-real-feeds.ts, or supply your own:
FEEDS_FILE=./my-feeds.json npm run seed:feeds
```

Each entry is a real RSS/Atom feed (independent publications on Ghost/Substack expose `/feed`; use `https://rsshub.app/<route>` or a self-hosted RSSHub for sources without a native feed). Then the harness / console has real creator content to cite and pay.

> For a public demo of grounding + citation, public feeds are fine. For a *real payout to a named creator*, get their consent and wallet — they connect this same listing when they sign up, or via the managed-wallet path. A handful of real independent writers you personally onboard is the strongest RFB 6 story.

## Step 8 — Report traction through the Canteen CLI

Judges collate traction via the ARC CLI, not just the form. After your first real settlement and once the harness has accrued volume, report it:

```bash
arc-canteen update traction      # submit a traction update (users onboarded, payments, volume)
arc-canteen update product       # submit a product update
arc-canteen status               # see your dashboard
```

Log: the first settlement tx (with the arcscan link), creators onboarded, total payouts, payment count, sub-cent average, and any cross-team payments. Submit early and often.

---

## Troubleshooting

- **"Can't reach Circle Gateway API" / connection errors** (a few teams hit this in-channel): usually a network/DNS or base-URL issue. Confirm the testnet Gateway base URL from Circle docs, check you're not behind a proxy/VPN that blocks it, and retry. The RPC (`rpc.testnet.arc.network`) and the Gateway endpoint are different hosts — both must be reachable.
- **402 loops / "payment not accepted"**: dialect mismatch. Ensure buyer and seller both speak **Gateway-batched** (header-based `PAYMENT-REQUIRED`), not plain EIP-3009 body terms.
- **Faucet "limit exceeded"**: 20 USDC per address per 2h. Use a second address or wait.
- **Seller balance shows nothing immediately**: settlement is batched — seller Gateway balance updates after Circle settles the batch on-chain (can take a few minutes). The buyer's success + signature is the immediate proof; on-chain catches up.
- **SDK method names differ**: pin to the same `@circle-fin/x402-batching` version the reference samples use, and mirror their `deposit`/`pay` calls.

## Done when

- [ ] Buyer printed a settlement hash, visible on `testnet.arcscan.app`.
- [ ] Seller's Gateway balance increased after batch settlement.
- [ ] `apps/api` runs in `arc_testnet` mode and `npm run harness` produces real txs.
- [ ] `/traction.html` shows real, persisted volume.
- [ ] Screenshot of the first tx saved for the submission + video.
