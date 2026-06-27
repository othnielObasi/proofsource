import { store } from "../../db.js";
import { id, nowIso } from "../../lib/hash.js";

export type AuditType =
  | "provider.created" | "resource.created" | "purchase.requested"
  | "reuse.checked" | "policy.approved" | "policy.rejected"
  | "agent.decided" | "payment.authorized" | "delivery.submitted"
  | "verification.passed" | "verification.failed" | "payment.released"
  | "receipt.created" | "paid_context.created" | "paid_context.reused"
  | "purchase.skipped";

export function audit(
  eventType: AuditType,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
  workspaceId?: string
) {
  store.auditEvents.push({
    id: id("evt"),
    workspaceId,
    eventType,
    entityType,
    entityId,
    metadata,
    createdAt: nowIso(),
  });
}
