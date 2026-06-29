/**
 * arc-live · BUYER — pays a creator's x402-protected endpoint on Arc testnet.
 * Uses GatewayClient.pay() which handles the full 402 handshake automatically.
 * Prereq: run `npm run deposit` first to load Gateway balance.
 */
import "dotenv/config";
import { GatewayClient } from "@circle-fin/x402-batching/client";
import type { Hex } from "viem";

const RESOURCE_URL = process.env.RESOURCE_URL ?? "http://localhost:4021/research/demo";
const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY as Hex;
const RPC = process.env.ARC_TESTNET_RPC_URL;

async function main() {
  if (!PRIVATE_KEY) throw new Error("Set AGENT_PRIVATE_KEY in .env");

  const gateway = new GatewayClient({
    chain: "arcTestnet",
    privateKey: PRIVATE_KEY,
    ...(RPC ? { rpcUrl: RPC } : {}),
  });

  console.log(`Buyer: ${gateway.address}`);
  console.log(`Paying for: ${RESOURCE_URL}\n`);

  const result = await gateway.pay(RESOURCE_URL);

  console.log(`HTTP ${result.status}`);
  console.log(`Paid: ${result.formattedAmount} USDC`);
  console.log(`Transaction: ${result.transaction}`);
  console.log(`\nContent: ${JSON.stringify(result.data).slice(0, 300)}`);

  if (result.transaction) {
    console.log(`\n✅ Real Arc settlement:`);
    console.log(`   https://testnet.arcscan.app/tx/${result.transaction}`);
    console.log(`\n   Record this on your ProofSource receipt:`);
    console.log(`   transaction = ${result.transaction}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
