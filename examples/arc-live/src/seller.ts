/**
 * arc-live · SELLER (a creator's x402-protected content endpoint)
 * ---------------------------------------------------------------------------
 * Exposes priced content behind HTTP 402 and settles through Circle Gateway's
 * batched facilitator on Arc. Uses the official @x402/express adapter, so the
 * middleware handles 402 → verify → settle; the route handler just serves content
 * once paid. Revenue lands in the seller's Gateway balance (withdraw crosschain).
 *
 * Verified against (Jun 2026):
 *   @circle-fin/x402-batching@3.0.4 → BatchFacilitatorClient (server)
 *   @x402/express@^2.15             → paymentMiddleware, x402ResourceServer
 *   settle() → { success, transaction, network, payer }   (transaction = on-chain ref)
 */
import "dotenv/config";
import express, { type Request, type Response } from "express";
import { x402ResourceServer, paymentMiddleware } from "@x402/express";
import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";

const PORT = Number(process.env.SELLER_PORT ?? 4021);
const GATEWAY_URL = process.env.CIRCLE_GATEWAY_URL ?? "https://gateway.circle.com"; // testnet base from Circle docs
const SELLER_WALLET = process.env.SELLER_WALLET_ADDRESS!; // payTo (creator wallet)
const NETWORK = (process.env.ARC_X402_NETWORK ?? `eip155:${process.env.ARC_TESTNET_CHAIN_ID}`) as `${string}:${string}`;
const PRICE_USDC = process.env.PRICE_USDC ?? "0.001"; // sub-cent per citation

const CONTENT: Record<string, { title: string; body: string }> = {
  demo: {
    title: "AI content licensing and creator compensation",
    body: "Per-citation settlement lets a source earn every time an agent grounds an " +
          "answer in it, rather than once at training time. The hard part is proving reuse " +
          "and attaching payment to it — the layer ProofSource adds on top of x402.",
  },
};

async function main() {
  if (!SELLER_WALLET) throw new Error("Set SELLER_WALLET_ADDRESS (creator payout/identity wallet).");

  // Circle Gateway is the facilitator (verify + batched settle). Structural cast: the
  // SDK's minimal PaymentPayload differs slightly from @x402/core's internal type.
  const facilitator = new BatchFacilitatorClient({ url: GATEWAY_URL });
  const server = new x402ResourceServer([facilitator as any]);

  // One protected route, priced sub-cent, paying the creator wallet.
  const routes = {
    "GET /research/*": {
      accepts: [
        { scheme: "exact", payTo: SELLER_WALLET, price: PRICE_USDC, network: NETWORK, maxTimeoutSeconds: 60 },
      ],
    },
  };

  const app = express();
  app.use(paymentMiddleware(routes as any, server)); // handles 402/verify/settle via Gateway
  app.get("/research/:id", (req: Request, res: Response) => {
    const item = CONTENT[req.params.id] ?? CONTENT.demo; // reached only after payment verified
    res.status(200).json(item);
  });

  app.listen(PORT, () => {
    console.log(`arc-live seller on http://localhost:${PORT} · payTo ${SELLER_WALLET} · ${PRICE_USDC} USDC/req`);
    console.log(`Protected: GET /research/demo (network ${NETWORK}, facilitator ${GATEWAY_URL})`);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
