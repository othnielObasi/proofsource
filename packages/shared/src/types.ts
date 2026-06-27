// ProofSource shared types — canonical contracts used across api/web/sdk.
// Settlement-critical types deliberately separate the AGENT DECISION (probabilistic,
// may use an LLM) from the PAYMENT RELEASE (deterministic, never LLM-driven).

export type ProviderType = "creator" | "publisher" | "research_provider";
export type ResourceType = "article" | "snippet" | "premium_note";
export type UsageType = "citation" | "summary" | "internal_context";
export type PaymentMode = "mock" | "arc_testnet";

export interface Provider {
  id: string;
  name: string;
  providerType: ProviderType;
  walletAddress?: string;
  status: "active" | "pending" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface UsageRights {
  usageType: UsageType;
  reusable: boolean;
  expiresInDays?: number;
}

export interface Resource {
  id: string;
  providerId: string;
  title: string;
  description: string;
  resourceType: ResourceType;
  contentBody: string;
  contentHash: string;
  priceUsdc: string; // string to avoid float drift on sub-cent amounts
  usageRights: UsageRights;
  // Signals the agent uses for its value-per-cent decision (see modules/agent).
  freshnessHalfLifeDays?: number; // how fast this source's value decays
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// ---- Agentic decision layer (the 30% "agentic sophistication" axis) ----
export type AgentAction = "REUSE" | "BUY" | "SKIP";

// The operator's standing policy. The agent EXECUTES this mandate — it doesn't
// improvise taste. Creators price their work; the operator decides the budget and
// the rules; the agent's only freedom is which permitted source is worth buying now.
export interface OperatorMandate {
  budgetUsdc: string;
  perTaskMaxUsdc: string;
  maxPricePerSourceUsdc?: string;
  minRelevance?: number;
  valuePerCentThreshold?: number;
  preferredProviderIds?: string[]; // bias toward these creators
  blockedProviderIds?: string[]; // never pay these
  requireCitation?: boolean; // must ground on a paid source when answering on-topic
}

export interface SourceScore {
  resourceId: string;
  title?: string;
  providerId?: string; // so a creator can see their own verdict
  relevance: number; // 0..1
  priceUsdc: string;
  expectedValue: number; // 0..1 task value if purchased
  valuePerCent: number; // expectedValue / price-in-cents
  freshnessFactor: number; // 0..1
  preferred?: boolean;
  blocked?: boolean;
  verdict: string; // human-readable: why this source was bought / skipped / blocked
}

export interface AgentDecision {
  action: AgentAction;
  resourceId?: string;
  paidContextId?: string;
  reasoning: string;
  budgetRemainingUsdc: string;
  policyNotes: string[]; // which operator-mandate rules shaped this decision
  scores: SourceScore[];
}

// ---- Settlement primitives (deterministic) ----
export interface PaymentAuthorization {
  id: string;
  purchaseRequestId: string;
  workspaceId: string;
  agentId: string;
  providerId: string;
  resourceId: string;
  amountUsdc: string;
  currency: "USDC";
  status: "created" | "authorized" | "expired" | "cancelled";
  idempotencyKey: string;
  expiresAt: string;
  paymentMode: PaymentMode;
  externalReference?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  authorizationId: string;
  amountUsdc: string;
  status: "released" | "failed" | "cancelled";
  transactionHash?: string;
  circleTransactionId?: string;
  explorerUrl?: string;
  releasedAt: string;
}

export interface Delivery {
  id: string;
  authorizationId: string;
  providerId: string;
  resourceId: string;
  payload: string;
  contentHash: string;
  status: "submitted" | "failed";
  deliveredAt: string;
}

export interface VerificationChecks {
  resourceIdMatches: boolean;
  providerIdMatches: boolean;
  payloadPresent: boolean;
  contentHashGenerated: boolean;
  contentNotEmpty: boolean;
  deliveredBeforeExpiry: boolean;
  usageRightsAttached: boolean;
}

export interface Verification {
  id: string;
  authorizationId: string;
  deliveryId: string;
  status: "passed" | "failed";
  checks: VerificationChecks;
  failureReason?: string;
  verifiedAt: string;
}

export interface Receipt {
  id: string;
  workspaceId: string;
  agentId: string;
  providerId: string;
  resourceId: string;
  authorizationId: string;
  deliveryId: string;
  verificationId: string;
  paymentId: string;
  deliveryHash: string;
  receiptHash: string;
  usageRights: UsageRights;
  chainReference?: {
    transactionHash?: string;
    circleTransactionId?: string;
    explorerUrl?: string;
  };
  createdAt: string;
}

export interface PaidContext {
  id: string;
  workspaceId: string;
  resourceId: string;
  receiptId: string;
  contentHash: string;
  sourceTitle: string;
  summary: string;
  reusable: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  workspaceId?: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AgentRunResult {
  answer: string;
  decision: AgentDecision;
  sources: Array<{
    resourceId: string;
    providerName: string;
    receiptId?: string;
    paidContextId?: string;
    deliveryHash?: string;
    paymentStatus: "released" | "reused" | "skipped";
    reused: boolean;
  }>;
  spend: { totalUsdc: string; payments: number; reusedContexts: number };
  trace: Array<{ step: string; status: string; detail?: string }>;
}
