/**
 * arc-live · BUYER (the ProofSource research agent's wallet)
 * ---------------------------------------------------------------------------
 * Pays a creator's x402-protected content endpoint on Arc testnet using Circle
 * Gateway batched nanopayments (gas-free, sub-cent). Prints the returned content
 * and the on-chain settlement reference — that `transaction` is what ProofSource
 * records on its receipt.
 *
 * Verified against (Jun 2026):
 *   @circle-fin/x402-batching@3.0.4  → BatchEvmScheme, CompositeEvmScheme
 *   @x402/core@^2.15                 → x402Client, x402HTTPClient
 *   @x402/evm@^2                     → ExactEvmScheme (non-batched fallback)
 *   viem@^2
 *
 * Flow (manual x402 loop using confirmed x402HTTPClient methods):
 *   1. fetch protected URL → 402 + payment-required header
 *   2. x402HTTPClient.getPaymentRequiredResponse(...) → requirements
 *   3. x402HTTPClient.createPaymentPayload(req) → signs EIP-3009 via Circle scheme
 *   4. encode header, re-fetch with payment → 200 + content + settle header
 *   5. x402HTTPClient.getPaymentSettleResponse(...) → { success, transaction, network }
 *
 * Prereqs: a funded Arc-testnet wallet whose USDC is deposited into the Circle
 * Gateway wallet contract (one-time). See README for the deposit step.
 */
import "dotenv/config";
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { x402Client } from "@x402/core/client";
import { x402HTTPClient } from "@x402/core/client";
import { BatchEvmScheme, CompositeEvmScheme } from "@circle-fin/x402-batching/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";

const RESOURCE_URL = process.env.RESOURCE_URL ?? "http://localhost:4021/research/demo";
const PRIVATE_KEY = (process.env.AGENT_PRIVATE_KEY ?? "") as Hex;
const RPC_URL = process.env.ARC_TESTNET_RPC_URL!;
// x402 network namespace for Arc testnet, e.g. "eip155:<ARC_TESTNET_CHAIN_ID>".
const NETWORK = process.env.ARC_X402_NETWORK ?? `eip155:${process.env.ARC_TESTNET_CHAIN_ID}`;

async function main() {
  if (!PRIVATE_KEY) throw new Error("Set AGENT_PRIVATE_KEY (funded Arc testnet wallet, USDC deposited into Gateway).");

  const account = privateKeyToAccount(PRIVATE_KEY);
  const wallet = createWalletClient({ account, transport: http(RPC_URL) });

  // The Circle batch scheme signs EIP-3009 TransferWithAuthorization against the
  // GatewayWallet contract; ExactEvmScheme is the non-batched fallback. The viem
  // account/walletClient is the EVM signer. (Confirm the signer adapter shape
  // against the @circle-fin/x402-batching client example for your SDK minor.)
  const signer: any = { account, walletClient: wallet, address: account.address };
  const batch = new BatchEvmScheme(signer);
  const fallback = new ExactEvmScheme(signer);
  const composite = new CompositeEvmScheme(batch, fallback);

  const client = new x402Client();
  client.register(NETWORK as `${string}:${string}`, composite as any); // interop cast: @x402/core version skew
  const http402 = new x402HTTPClient(client);

  // 1) first request → expect 402
  let res = await fetch(RESOURCE_URL);
  if (res.status === 402) {
    const required = http402.getPaymentRequiredResponse(
      (n) => res.headers.get(n),
      await safeJson(res),
    );
    // 2) sign payment (gas-free, offchain EIP-3009 via Circle Gateway scheme)
    const paymentPayload = await http402.createPaymentPayload(required);
    const payHeaders = http402.encodePaymentSignatureHeader(paymentPayload);
    // 3) retry with payment attached
    res = await fetch(RESOURCE_URL, { headers: { ...payHeaders } });
    const settle = http402.getPaymentSettleResponse((n) => res.headers.get(n));
    const body = await res.text();

    console.log("HTTP", res.status);
    console.log("settlement:", JSON.stringify(settle)); // { success, transaction, network, payer }
    console.log("content:", body.slice(0, 400));
    if (settle?.transaction) {
      console.log("\n✅ Real Arc settlement reference (record this on the ProofSource receipt):");
      console.log("   transaction =", settle.transaction);
    }
  } else {
    console.log("Endpoint did not return 402 (status " + res.status + "). Is the seller running and protected?");
    console.log(await res.text());
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try { return await res.clone().json(); } catch { return undefined; }
}

main().catch((e) => { console.error(e); process.exit(1); });
