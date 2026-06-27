/**
 * Buyer-side Circle Gateway settlement for the ProofSource agent.
 *
 * Performs the real x402 pay-and-fetch against a creator's protected endpoint and
 * returns the on-chain settlement reference. Uses the same primitives proven in
 * examples/arc-live (BatchEvmScheme + x402HTTPClient + viem). The SDK is loaded via
 * dynamic import so the core API stays dependency-light and typechecks/runs in mock
 * mode without the peer packages installed; install them only when going live:
 *
 *   npm i @circle-fin/x402-batching @x402/core @x402/evm viem
 *
 * Returns { transaction } — written to receipt.chainReference by the orchestrator.
 */
import { env } from "../../env.js";

export interface GatewaySettleResult {
  success: boolean;
  transaction?: string;
  network?: string;
  payer?: string;
  payload?: string;
}

// Non-literal specifiers so tsc treats these as `any` when the peers aren't installed.
const P_BATCH = ["@circle-fin", "x402-batching", "client"].join("/");
const P_CORE = ["@x402", "core", "client"].join("/");
const P_EVM = ["@x402", "evm", "exact", "client"].join("/");

export async function payAndFetch(resourceUrl: string): Promise<GatewaySettleResult> {
  if (!env.circleApiKey || !env.platformWallet) {
    throw new Error("Gateway not configured (CIRCLE_API_KEY + PLATFORM_WALLET_ADDRESS).");
  }
  const viem: any = await import("viem" + "");
  const { privateKeyToAccount }: any = await import("viem/accounts" + "");
  const { x402Client, x402HTTPClient }: any = await import(P_CORE);
  const { BatchEvmScheme, CompositeEvmScheme }: any = await import(P_BATCH);
  const { ExactEvmScheme }: any = await import(P_EVM);

  const account = privateKeyToAccount(env.agentPrivateKey as `0x${string}`);
  const wallet = viem.createWalletClient({ account, transport: viem.http(env.arcRpcUrl) });
  const signer = { account, walletClient: wallet, address: account.address };

  const client = new x402Client();
  const network = env.arcX402Network;
  client.register(network, new CompositeEvmScheme(new BatchEvmScheme(signer), new ExactEvmScheme(signer)));
  const http402 = new x402HTTPClient(client);

  let res = await fetch(resourceUrl);
  if (res.status !== 402) {
    return { success: false, payload: await res.text() };
  }
  const required = http402.getPaymentRequiredResponse((n: string) => res.headers.get(n));
  const paymentPayload = await http402.createPaymentPayload(required);
  const payHeaders = http402.encodePaymentSignatureHeader(paymentPayload);
  res = await fetch(resourceUrl, { headers: { ...payHeaders } });
  const settle = http402.getPaymentSettleResponse((n: string) => res.headers.get(n));
  const payload = await res.text();

  return {
    success: Boolean(settle?.success),
    transaction: settle?.transaction,
    network: settle?.network,
    payer: settle?.payer,
    payload,
  };
}
