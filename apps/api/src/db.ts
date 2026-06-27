// Lightweight in-memory store so the scaffold runs with zero external services.
// The collections mirror prisma/schema.prisma 1:1; swapping to Prisma+Postgres is a
// drop-in replacement of these accessors. The smoke test and live console both use this.

import type {
  Provider, Resource, PaymentAuthorization, Payment, Delivery,
  Verification, Receipt, PaidContext, AuditEvent, OperatorMandate,
} from "../../../packages/shared/src/types.js";
import type { SettlementRecord } from "./modules/settlement/machine.js";

interface Workspace {
  id: string;
  name: string;
  budgetUsdc: string; // remaining workspace budget (mutated as the agent spends)
  perTaskMaxUsdc: string;
  mandate: OperatorMandate; // the operator's standing policy the agent obeys
}

class Store {
  workspaces = new Map<string, Workspace>();
  providers = new Map<string, Provider>();
  resources = new Map<string, Resource>();
  authorizations = new Map<string, PaymentAuthorization>();
  payments = new Map<string, Payment>();
  deliveries = new Map<string, Delivery>();
  verifications = new Map<string, Verification>();
  receipts = new Map<string, Receipt>();
  paidContexts = new Map<string, PaidContext>();
  settlements = new Map<string, SettlementRecord>();
  auditEvents: AuditEvent[] = [];
  accounts = new Map<string, any>();    // user accounts (creators/operators)
  sessions = new Map<string, string>(); // token -> accountId (not persisted)
  // idempotencyKey -> authorizationId, guards duplicate settlement
  idempotency = new Map<string, string>();

  reset() {
    this.workspaces.clear();
    this.providers.clear();
    this.resources.clear();
    this.authorizations.clear();
    this.payments.clear();
    this.deliveries.clear();
    this.verifications.clear();
    this.receipts.clear();
    this.paidContexts.clear();
    this.settlements.clear();
    this.auditEvents = [];
    this.accounts.clear();
    this.sessions.clear();
    this.idempotency.clear();
  }

  listResources(): Resource[] {
    return [...this.resources.values()].filter((r) => r.status === "active");
  }
  paidContextsFor(workspaceId: string): PaidContext[] {
    return [...this.paidContexts.values()].filter((p) => p.workspaceId === workspaceId);
  }
}

export const store = new Store();
export type { Workspace };
