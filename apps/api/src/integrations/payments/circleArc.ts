import type { PaymentAdapter, AuthorizeInput, AuthorizeResult, ReleaseInput, ReleaseResult } from "./adapter.js";
import { env, ARC_EXPLORER } from "../../env.js";
import { id } from "../../lib/hash.js";
import { payAndFetch } from "./gateway.js";

// Circle/Arc-first settlement.
//
// Targets the `circlefin/arc-nanopayments` reference pattern: x402-protected access +
// Circle Gateway batched nanopayments ($0.000001 floor, gasless) settled on Arc in USDC.
//
// Wiring (filled in during the event window once CIRCLE_API_KEY + a funded testnet
// wallet are available — see docs/PLAN.md day 3-4):
//
//   createAuthorization  ->  reserve spend on the buyer's Circle Wallet and open the
//                            x402 payment context (Gateway intent). Returns the Gateway
//                            reference used as the x402 proof.
//   releasePayment       ->  capture the Gateway nanopayment to the provider wallet,
//                            batched for sub-cent economy, and return the Arc tx hash +
//                            Circle transaction id + explorer URL.
//
// Until credentials are present this throws, and the factory falls back to mock so the
// build always runs. Settlement is NEVER driven by the LLM — only by verified delivery.

export class CircleArcAdapter implements PaymentAdapter {
  mode = "arc_testnet" as const;

  private assertConfigured() {
    if (!env.agentPrivateKey || !env.platformWallet) {
      throw new Error(
        "CircleArcAdapter not configured: set AGENT_PRIVATE_KEY and PLATFORM_WALLET_ADDRESS"
      );
    }
  }

  async createAuthorization(input: AuthorizeInput): Promise<AuthorizeResult> {
    this.assertConfigured();
    // TODO(event-window): POST to Circle Gateway to open a nanopayment intent /
    // x402 payment context for `input.amountUsdc` to `input.providerWallet`.
    // const intent = await circle.gateway.createIntent({ ... });
    return {
      authorizationId: id("auth"),
      status: "authorized",
      externalReference: `gw_intent_${input.idempotencyKey.slice(0, 12)}`,
    };
  }

  async releasePayment(input: ReleaseInput): Promise<ReleaseResult> {
    this.assertConfigured();
    // Real settlement: the agent pays the creator's x402-protected endpoint via
    // Circle Gateway (batched, gas-free) and we record the on-chain `transaction`.
    // ProofSource only reaches this call AFTER its own delivery verification passes,
    // so the receipt it issues is the attribution proof layered on the rail.
    const url =
      input.resourceUrl ??
      `${env.sellerBaseUrl}/research/${input.resourceId ?? "demo"}`;
    const settle = await payAndFetch(url);
    if (!settle.success) {
      throw new Error("Gateway settlement failed: " + (settle.payload ?? "unknown"));
    }
    return {
      paymentId: id("pay"),
      status: "released",
      transactionHash: settle.transaction,
      circleTransactionId: settle.transaction,
      explorerUrl: settle.transaction
        ? `${ARC_EXPLORER}/tx/${settle.transaction}`
        : undefined,
    };
  }
}
