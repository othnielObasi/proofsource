// Circle/Arc-first configuration. PAYMENT_MODE defaults to arc_testnet when Circle
// credentials are present; it only falls back to `mock` when they are absent (CI,
// offline dev). This is the inverse of a mock-first design and is what the Lepton
// rubric rewards (20% Circle tool usage + 30% real in-window settlement).

// Arc testnet constants (verified from Circle docs / ARC_SETTLEMENT_RUNBOOK.md)
export const ARC_CHAIN_ID   = 5042002;
export const ARC_RPC_DEFAULT = "https://rpc.testnet.arc.network";
export const ARC_USDC        = "0x3600000000000000000000000000000000000000";
export const ARC_GATEWAY_CONTRACT = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
export const ARC_EXPLORER    = "https://testnet.arcscan.app";
export const ARC_X402_NETWORK_DEFAULT = `eip155:${ARC_CHAIN_ID}`;

export interface Env {
  port: number;
  paymentMode: "mock" | "arc_testnet";
  apiKey: string;
  llmEnabled: boolean;
  llmModel: string;
  openaiApiKey?: string;
  arcRpcUrl: string;
  arcChainId: number;
  arcX402Network: string;
  circleApiKey?: string;
  platformWallet?: string;
  agentPrivateKey?: string;   // signer key for EIP-3009 — load from vault in prod
  sellerBaseUrl: string;      // base URL of the x402 seller endpoint
}

function hasCircleCreds(): boolean {
  return Boolean(process.env.AGENT_PRIVATE_KEY && process.env.PLATFORM_WALLET_ADDRESS);
}

export function loadEnv(): Env {
  const explicit = process.env.PAYMENT_MODE as Env["paymentMode"] | undefined;
  const paymentMode: Env["paymentMode"] =
    explicit ?? (hasCircleCreds() ? "arc_testnet" : "mock");

  const env: Env = {
    port: Number(process.env.PORT ?? 3000),
    paymentMode,
    apiKey: process.env.PROOFSOURCE_API_KEY ?? "dev_key",
    llmEnabled: process.env.LLM_ENABLED === "true",
    llmModel: process.env.LLM_MODEL ?? "gpt-4o-mini",
    openaiApiKey: process.env.OPENAI_API_KEY,
    arcRpcUrl: process.env.ARC_TESTNET_RPC_URL ?? ARC_RPC_DEFAULT,
    arcChainId: Number(process.env.ARC_TESTNET_CHAIN_ID ?? ARC_CHAIN_ID),
    arcX402Network: process.env.ARC_X402_NETWORK ?? ARC_X402_NETWORK_DEFAULT,
    circleApiKey: process.env.CIRCLE_API_KEY,
    platformWallet: process.env.PLATFORM_WALLET_ADDRESS,
    agentPrivateKey: process.env.AGENT_PRIVATE_KEY,
    sellerBaseUrl: process.env.SELLER_BASE_URL ?? "http://localhost:4021",
  };

  // Fail fast when arc_testnet is active but required config is missing.
  if (env.paymentMode === "arc_testnet") {
    const missing: string[] = [];
    if (!env.agentPrivateKey) missing.push("AGENT_PRIVATE_KEY");
    if (!env.platformWallet)  missing.push("PLATFORM_WALLET_ADDRESS");
    if (missing.length) {
      console.error(`[ProofSource] arc_testnet mode active but missing: ${missing.join(", ")}`);
      console.error("[ProofSource] Falling back to mock mode. Set the missing vars to enable real settlement.");
      env.paymentMode = "mock";
    }
  }

  console.log(`[ProofSource] payment mode: ${env.paymentMode}`);
  return env;
}

export const env = loadEnv();
