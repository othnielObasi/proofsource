import type { PaymentAdapter, AuthorizeInput, AuthorizeResult, ReleaseInput, ReleaseResult } from "./adapter.js";
import { id } from "../../lib/hash.js";

// Deterministic, credential-free settlement for CI and offline dev.
// Produces fake-but-shaped references so the receipt/trace render identically to Arc.
export class MockPaymentAdapter implements PaymentAdapter {
  mode = "mock" as const;

  async createAuthorization(input: AuthorizeInput): Promise<AuthorizeResult> {
    return {
      authorizationId: id("auth"),
      status: "authorized",
      externalReference: `mock_gw_${input.idempotencyKey.slice(0, 10)}`,
    };
  }

  async releasePayment(_input: ReleaseInput): Promise<ReleaseResult> {
    const ref = id("mocktx");
    return {
      paymentId: id("pay"),
      status: "released",
      transactionHash: `0xmock${ref.slice(-12)}`,
      circleTransactionId: `mock_${ref}`,
      explorerUrl: `https://mock.local/tx/0xmock${ref.slice(-12)}`,
    };
  }
}
