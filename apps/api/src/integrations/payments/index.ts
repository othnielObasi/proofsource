import type { PaymentAdapter } from "./adapter.js";
import { MockPaymentAdapter } from "./mock.js";
import { CircleArcAdapter } from "./circleArc.js";
import { env } from "../../env.js";

export function getPaymentAdapter(): PaymentAdapter {
  if (env.paymentMode === "arc_testnet" && env.circleApiKey && env.platformWallet) {
    return new CircleArcAdapter();
  }
  return new MockPaymentAdapter();
}
