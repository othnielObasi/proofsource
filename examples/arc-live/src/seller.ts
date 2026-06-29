/**
 * arc-live · SELLER — manual x402 implementation for Arc testnet.
 *
 * x402ResourceServer init fails because Circle Gateway testnet doesn't advertise
 * eip155:5042002 in its /supported response yet. This bypasses that by building
 * the PAYMENT-REQUIRED header directly (hardcoding the known Gateway contract)
 * and calling BatchFacilitatorClient.verify/settle directly.
 */
import "dotenv/config";
import express, { type Request, type Response } from "express";
import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";

const PORT = Number(process.env.SELLER_PORT ?? 4021);
const GATEWAY_URL = process.env.CIRCLE_GATEWAY_URL ?? "https://gateway-api-testnet.circle.com";
const SELLER_WALLET = process.env.SELLER_WALLET_ADDRESS!;
const NETWORK = process.env.ARC_X402_NETWORK ?? `eip155:${process.env.ARC_TESTNET_CHAIN_ID ?? "5042002"}`;
const PRICE_USDC = process.env.PRICE_USDC ?? "0.001";

// Arc testnet constants (from ARC_SETTLEMENT_RUNBOOK.md)
const ARC_USDC = "0x3600000000000000000000000000000000000000";
const ARC_GATEWAY_CONTRACT = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";

// Amount in USDC atomic units (6 decimals): 0.001 USDC = 1000
const AMOUNT_ATOMIC = String(Math.round(parseFloat(PRICE_USDC) * 1_000_000));

const CONTENT: Record<string, { title: string; body: string }> = {
  demo: {
    title: "AI content licensing and creator compensation",
    body: "Per-citation settlement lets a source earn every time an agent grounds an " +
          "answer in it, rather than once at training time. The hard part is proving reuse " +
          "and attaching payment to it — the layer ProofSource adds on top of x402.",
  },
};

// Payment requirements advertised in every 402 response.
const PAYMENT_REQUIREMENTS = {
  scheme: "exact",
  network: NETWORK,
  asset: ARC_USDC,
  amount: AMOUNT_ATOMIC,
  payTo: SELLER_WALLET,
  maxTimeoutSeconds: 60,
  extra: {
    name: "GatewayWalletBatched",
    version: "1",
    verifyingContract: ARC_GATEWAY_CONTRACT,
  },
};

const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
const decode = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

async function main() {
  if (!SELLER_WALLET) throw new Error("Set SELLER_WALLET_ADDRESS in .env");

  const facilitator = new BatchFacilitatorClient({ url: GATEWAY_URL });
  const app = express();
  app.use(express.json());

  app.get("/research/:id", async (req: Request, res: Response) => {
    const resourceUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const resource = { url: resourceUrl, description: "ProofSource research content", mimeType: "application/json" };

    // x402 v2 uses PAYMENT-SIGNATURE; v1 used X-PAYMENT — accept both
    const sigHeader = (req.headers["payment-signature"] ?? req.headers["x-payment"]) as string | undefined;

    if (!sigHeader) {
      // No payment — return 402 with resource + requirements in PAYMENT-REQUIRED header
      const paymentRequired = { x402Version: 2, resource, accepts: [PAYMENT_REQUIREMENTS] };
      return res.status(402)
        .set("PAYMENT-REQUIRED", encode(paymentRequired))
        .json(paymentRequired);
    }

    try {
      // Decode the signed payment payload from the buyer
      const paymentPayload = decode(sigHeader);

      // Verify with Circle Gateway
      const verification = await facilitator.verify(paymentPayload, PAYMENT_REQUIREMENTS as any);
      if (!verification.isValid) {
        return res.status(402).json({ error: "Payment invalid: " + verification.invalidReason });
      }

      // Settle with Circle Gateway
      const settlement = await facilitator.settle(paymentPayload, PAYMENT_REQUIREMENTS as any);
      if (!settlement.success) {
        return res.status(402).json({ error: "Settlement failed: " + settlement.errorReason });
      }

      console.log(`✅ Settled — tx: ${settlement.transaction}  payer: ${settlement.payer}`);
      console.log(`   https://testnet.arcscan.app/tx/${settlement.transaction}`);

      const item = CONTENT[req.params.id] ?? CONTENT.demo;
      return res.status(200)
        .set("PAYMENT-RESPONSE", encode(settlement))
        .json(item);
    } catch (err: any) {
      console.error("Payment error:", err?.message ?? err);
      return res.status(402).json({ error: "Payment processing failed: " + (err?.message ?? String(err)) });
    }
  });

  app.listen(PORT, () => {
    console.log(`arc-live seller on http://localhost:${PORT}`);
    console.log(`payTo: ${SELLER_WALLET}  price: ${PRICE_USDC} USDC  network: ${NETWORK}`);
    console.log(`Protected: GET /research/:id → verify+settle via ${GATEWAY_URL}`);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
