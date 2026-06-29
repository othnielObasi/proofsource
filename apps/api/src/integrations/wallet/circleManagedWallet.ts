/**
 * Circle Programmable Wallets — managed wallet path for creators who don't have MetaMask.
 * Circle holds the keys server-side; creators interact via ProofSource only.
 *
 * Requires: CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET in env.
 * Generate entity secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
import { env } from "../../env.js";

const WALLET_SET_NAME = "ProofSource Creators";
const BLOCKCHAIN     = "ARC-TESTNET";

let _client: any = null;
let _walletSetId: string | null = null;

async function getClient() {
  if (_client) return _client;
  if (!env.circleApiKey || !env.circleEntitySecret) {
    throw new Error("CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET are required for managed wallets.");
  }
  const { initiateDeveloperControlledWalletsClient } = await import("@circle-fin/developer-controlled-wallets");
  _client = initiateDeveloperControlledWalletsClient({
    apiKey: env.circleApiKey,
    entitySecret: env.circleEntitySecret,
  });
  return _client;
}

async function getOrCreateWalletSet(): Promise<string> {
  if (_walletSetId) return _walletSetId;
  const client = await getClient();
  const list = await client.listWalletSets();
  const existing = list.data?.walletSets?.find((ws: any) => ws.name === WALLET_SET_NAME);
  if (existing) { _walletSetId = existing.id; return existing.id; }
  const created = await client.createWalletSet({ name: WALLET_SET_NAME });
  _walletSetId = created.data?.walletSet?.id;
  if (!_walletSetId) throw new Error("Failed to create Circle wallet set.");
  return _walletSetId;
}

export async function provisionManagedWallet(creatorName: string): Promise<{ walletId: string; walletAddress: string }> {
  const client    = await getClient();
  const walletSetId = await getOrCreateWalletSet();
  const res = await client.createWallets({
    accountType: "SCA",
    blockchains: [BLOCKCHAIN],
    walletSetId,
    count: 1,
    metadata: [{ name: creatorName, refId: "proofsource-creator" }],
  });
  const wallet = res.data?.wallets?.[0];
  if (!wallet?.id || !wallet?.address) throw new Error("Circle wallet creation failed — no wallet returned.");
  return { walletId: wallet.id, walletAddress: wallet.address };
}

export async function getWalletBalance(walletId: string): Promise<{ usdc: string; walletId: string }> {
  const client = await getClient();
  const res = await client.getWalletTokenBalance({ id: walletId });
  const balances = res.data?.tokenBalances ?? [];
  const usdc = balances.find((b: any) => b.token?.symbol === "USDC")?.amount ?? "0.000000";
  return { walletId, usdc };
}

export async function transferToExternal(walletId: string, destinationAddress: string, amountUsdc: string): Promise<{ txId: string }> {
  const client = await getClient();
  const res = await client.createTransaction({
    walletId,
    tokenId: "USDC",
    destinationAddress,
    amounts: [amountUsdc],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });
  const txId = res.data?.transaction?.id;
  if (!txId) throw new Error("Circle transfer initiation failed.");
  return { txId };
}

export function isManagedWalletConfigured(): boolean {
  return Boolean(env.circleApiKey && env.circleEntitySecret);
}
