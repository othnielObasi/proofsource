import type { PaymentMode } from "../../../../../packages/shared/src/types.js";

export interface AuthorizeInput {
  purchaseRequestId: string;
  amountUsdc: string;
  providerWallet?: string;
  idempotencyKey: string;
}

export interface AuthorizeResult {
  authorizationId: string;
  status: "authorized";
  externalReference?: string;
}

export interface ReleaseInput {
  authorizationId: string;
  verificationId: string;
  amountUsdc: string;
  providerWallet?: string;
  resourceId?: string;
  resourceUrl?: string; // creator's x402-protected endpoint (arc mode)
}

export interface ReleaseResult {
  paymentId: string;
  status: "released";
  transactionHash?: string;
  circleTransactionId?: string;
  explorerUrl?: string;
}

export interface PaymentAdapter {
  mode: PaymentMode;
  createAuthorization(input: AuthorizeInput): Promise<AuthorizeResult>;
  releasePayment(input: ReleaseInput): Promise<ReleaseResult>;
}
