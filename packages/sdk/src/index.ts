// ProofSource SDK — a thin, typed client over the ProofSource API. Every distribution
// surface (MCP server, OSS plugins, external agents, the Gateway/x402 endpoint wrapper)
// sits on this one client, so behaviour stays consistent across doors.
//
//   import { ProofSource } from "@proofsource/sdk";
//   const ps = new ProofSource({ baseUrl: "https://your-deploy", token });
//   const res = await ps.ask({ workspaceId, question: "..." });

export interface ProofSourceOptions {
  baseUrl: string;
  /** JWT bearer token (for user-session calls like /me, /apikey/regenerate). */
  token?: string;
  /** Operator API key (ps_live_...) — used for /v1/proofsource/agent/run and machine-to-machine calls. */
  apiKey?: string;
}

export interface AskResult {
  decision: { action: "BUY" | "REUSE" | "SKIP"; reasoning: string; scores: unknown[] };
  answer: string;
  sources: Array<{ providerName?: string; receiptId?: string; deliveryHash?: string }>;
  spend: { totalUsdc: string };
  trace: Array<{ step: string }>;
}
export interface Traction {
  creatorsEarning: number; totalPayoutUsdc: string; paymentCount: number;
  avgTransactionUsdc: string; readerToPayerConversion: number; perCreator: unknown[];
}

export class ProofSource {
  constructor(private opts: ProofSourceOptions) {}

  private async call<T>(path: string, init: RequestInit = {}, useApiKey = false): Promise<T> {
    const headers: Record<string, string> = { "content-type": "application/json", ...(init.headers as Record<string, string> | undefined) };
    if (useApiKey && this.opts.apiKey) {
      headers["x-proofsource-key"] = this.opts.apiKey;
    } else if (this.opts.token) {
      headers.authorization = `Bearer ${this.opts.token}`;
    }
    const r = await fetch(this.opts.baseUrl.replace(/\/$/, "") + path, { ...init, headers });
    if (!r.ok) throw new Error(`ProofSource ${path} → ${r.status} ${await r.text()}`);
    return r.json() as Promise<T>;
  }

  /**
   * Run the paying research agent: discover → decide → (buy+verify+settle) → cite.
   * Uses the operator API key (x-proofsource-key) when available; falls back to JWT.
   */
  ask(input: { workspaceId?: string; agentId?: string; question: string }): Promise<AskResult> {
    const hasApiKey = Boolean(this.opts.apiKey);
    return this.call(
      "/v1/proofsource/agent/run",
      { method: "POST", body: JSON.stringify(input) },
      hasApiKey
    );
  }

  /** Preview the decision (scoring) without buying. */
  decide(input: { workspaceId: string; question: string }): Promise<unknown> {
    return this.call("/v1/proofsource/agent/decision", { method: "POST", body: JSON.stringify(input) });
  }

  /** Live traction metrics (RFB 1 + RFB 6). */
  traction(): Promise<Traction> { return this.call("/v1/proofsource/dashboard/traction"); }

  /** A creator's earnings + receipts. */
  earnings(providerId: string): Promise<unknown> { return this.call(`/v1/proofsource/creators/${providerId}/earnings`); }

  /** List a creator's work from an RSS/RSSHub feed (authed). */
  connectFeed(input: { feedUrl?: string; sample?: boolean; priceUsdc?: string }): Promise<unknown> {
    return this.call("/v1/proofsource/creators/connect-feed", { method: "POST", body: JSON.stringify(input) });
  }

  /** The operator mandate the agent obeys. */
  mandate(workspaceId: string): Promise<unknown> { return this.call(`/v1/proofsource/mandate?workspaceId=${workspaceId}`); }

  /** Regenerate the API key for the JWT-authenticated account. Returns the new key. */
  regenerateApiKey(): Promise<{ apiKey: string }> {
    return this.call("/v1/proofsource/auth/apikey/regenerate", { method: "POST" });
  }
}
