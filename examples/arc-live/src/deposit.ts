/**
 * One-time: deposit USDC from your wallet into the Circle Gateway Wallet.
 * Run this before buyer.ts — gasless payments draw from Gateway balance, not raw wallet.
 */
import "dotenv/config";
import { GatewayClient } from "@circle-fin/x402-batching/client";
import type { Hex } from "viem";

const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY as Hex;
const AMOUNT = process.env.DEPOSIT_AMOUNT ?? "5"; // USDC to deposit
const RPC = process.env.ARC_TESTNET_RPC_URL;

async function main() {
  if (!PRIVATE_KEY) throw new Error("Set AGENT_PRIVATE_KEY in .env");

  const gateway = new GatewayClient({
    chain: "arcTestnet",
    privateKey: PRIVATE_KEY,
    ...(RPC ? { rpcUrl: RPC } : {}),
  });

  console.log(`Depositing ${AMOUNT} USDC into Circle Gateway...`);
  console.log(`Account: ${gateway.address}`);

  const before = await gateway.getBalances();
  console.log(`Wallet USDC before:  ${before.wallet.formatted}`);
  console.log(`Gateway USDC before: ${before.gateway.formattedAvailable}`);

  const result = await gateway.deposit(AMOUNT);
  console.log(`\n✅ Deposited ${result.formattedAmount} USDC`);
  if (result.approvalTxHash) console.log(`   Approval tx: https://testnet.arcscan.app/tx/${result.approvalTxHash}`);
  console.log(`   Deposit tx:  https://testnet.arcscan.app/tx/${result.depositTxHash}`);

  const after = await gateway.getBalances();
  console.log(`\nGateway USDC after: ${after.gateway.formattedAvailable} (ready for gasless payments)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
