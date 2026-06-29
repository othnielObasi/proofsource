/**
 * Buyer-side Circle Gateway settlement using GatewayClient.pay() —
 * the same path proven in examples/arc-live/src/buyer.ts.
 */
import { env } from "../../env.js";

export interface GatewaySettleResult {
  success: boolean;
  transaction?: string;
  network?: string;
  payer?: string;
  payload?: string;
}

const P_CLIENT = ["@circle-fin", "x402-batching", "client"].join("/");

export async function payAndFetch(resourceUrl: string): Promise<GatewaySettleResult> {
  if (!env.agentPrivateKey || !env.platformWallet) {
    throw new Error("Gateway not configured (AGENT_PRIVATE_KEY + PLATFORM_WALLET_ADDRESS).");
  }
  const { GatewayClient }: any = await import(P_CLIENT);
  const gateway = new GatewayClient({
    chain: "arcTestnet",
    privateKey: env.agentPrivateKey,
    ...(env.arcRpcUrl ? { rpcUrl: env.arcRpcUrl } : {}),
  });
  const result = await gateway.pay(resourceUrl);
  return {
    success: result.status === 200,
    transaction: result.transaction,
    payer: gateway.address,
    payload: JSON.stringify(result.data),
  };
}
