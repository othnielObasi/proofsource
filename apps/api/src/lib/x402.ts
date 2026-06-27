// Minimal x402 ("Payment Required") helpers.
//
// This models the HTTP 402 flow Circle's x402 + Gateway use for pay-per-access:
//   1. Buyer requests a protected resource.
//   2. Seller responds 402 with a payment challenge (price, pay-to, nonce, scheme).
//   3. Buyer settles via the payment adapter and re-requests with a payment proof.
//   4. Seller validates the proof and returns the payload.
//
// In `mock` mode the proof is a locally-signed token. In `arc_testnet` mode the
// Circle adapter swaps these for real Gateway nanopayment settlement on Arc, and
// the proof becomes the on-chain/Gateway transaction reference. The HANDSHAKE
// SHAPE is identical, which is the whole point of the adapter pattern.

import { sha256 } from "./hash.js";

export interface X402Challenge {
  scheme: "x402";
  network: "arc-testnet" | "mock";
  asset: "USDC";
  amountUsdc: string;
  payTo: string; // provider wallet (or platform escrow)
  nonce: string;
  resourceId: string;
  expiresAt: string;
}

export interface X402Proof {
  scheme: "x402";
  nonce: string;
  resourceId: string;
  externalReference: string; // authorization id / gateway ref / tx hash
  signature: string;
}

export function buildChallenge(c: Omit<X402Challenge, "scheme" | "asset">): X402Challenge {
  return { scheme: "x402", asset: "USDC", ...c };
}

export function challengeHeaders(c: X402Challenge): Record<string, string> {
  // x402 advertises the requirement on a 402 via an Accept-Payment style header.
  return {
    "Accept-Payment": `x402 network=${c.network}; asset=USDC; amount=${c.amountUsdc}; payTo=${c.payTo}; nonce=${c.nonce}; resource=${c.resourceId}`,
  };
}

export function signProof(challenge: X402Challenge, externalReference: string): X402Proof {
  const signature = sha256(
    `${challenge.nonce}|${challenge.resourceId}|${externalReference}|${challenge.amountUsdc}`
  );
  return {
    scheme: "x402",
    nonce: challenge.nonce,
    resourceId: challenge.resourceId,
    externalReference,
    signature,
  };
}

export function verifyProof(challenge: X402Challenge, proof: X402Proof): boolean {
  if (proof.nonce !== challenge.nonce) return false;
  if (proof.resourceId !== challenge.resourceId) return false;
  const expected = sha256(
    `${challenge.nonce}|${challenge.resourceId}|${proof.externalReference}|${challenge.amountUsdc}`
  );
  return expected === proof.signature;
}
