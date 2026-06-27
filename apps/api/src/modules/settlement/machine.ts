// Settlement state machine (PS1-04).
//
// Every BUY path goes through explicit terminal states. Transitions are persisted
// so the system can resume after a crash and never double-pay.
//
// States:  authorized → delivering → verified → settling → settled
//                                 └→ failed  (on verify fail or settlement error)
//
// Invariants:
//   - `settling` and `settled` are only reachable after `verified`.
//   - Payment release is called only once per settlement (idempotency key guards it).
//   - Any exception in `settling` transitions to `failed` and releases nothing.

import { store } from "../../db.js";
import { id, nowIso } from "../../lib/hash.js";
import { audit } from "../audit/index.js";

export type SettlementState =
  | "authorized"
  | "delivering"
  | "verified"
  | "settling"
  | "settled"
  | "failed";

export interface SettlementTransition {
  from: SettlementState;
  to: SettlementState;
  at: string;
  detail?: string;
}

export interface SettlementRecord {
  id: string;
  workspaceId: string;
  authorizationId: string;
  resourceId: string;
  state: SettlementState;
  transitions: SettlementTransition[];
  paymentId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export class SettlementMachine {
  private record: SettlementRecord;

  constructor(record: SettlementRecord) {
    this.record = record;
  }

  static create(args: {
    workspaceId: string;
    authorizationId: string;
    resourceId: string;
  }): SettlementMachine {
    const rec: SettlementRecord = {
      id: id("stl"),
      workspaceId: args.workspaceId,
      authorizationId: args.authorizationId,
      resourceId: args.resourceId,
      state: "authorized",
      transitions: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.settlements.set(rec.id, rec);
    return new SettlementMachine(rec);
  }

  get state(): SettlementState { return this.record.state; }
  get settlementId(): string   { return this.record.id; }

  transition(to: SettlementState, detail?: string): void {
    const from = this.record.state;
    assertValidTransition(from, to);
    const t: SettlementTransition = { from, to, at: nowIso(), detail };
    this.record.transitions.push(t);
    this.record.state = to;
    this.record.updatedAt = nowIso();
    store.settlements.set(this.record.id, this.record);
    audit(`settlement.${to}`, "settlement", this.record.id,
      { from, detail }, this.record.workspaceId);
  }

  markSettled(paymentId: string): void {
    this.record.paymentId = paymentId;
    this.transition("settled", paymentId);
  }

  markFailed(reason: string): void {
    this.record.failureReason = reason;
    this.record.state = "failed";
    this.record.updatedAt = nowIso();
    this.record.transitions.push({ from: this.record.state, to: "failed", at: nowIso(), detail: reason });
    store.settlements.set(this.record.id, this.record);
    audit("settlement.failed", "settlement", this.record.id,
      { reason }, this.record.workspaceId);
  }
}

const VALID_TRANSITIONS: Record<SettlementState, SettlementState[]> = {
  authorized:  ["delivering", "failed"],
  delivering:  ["verified",   "failed"],
  verified:    ["settling",   "failed"],
  settling:    ["settled",    "failed"],
  settled:     [],
  failed:      [],
};

function assertValidTransition(from: SettlementState, to: SettlementState): void {
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Invalid settlement transition: ${from} → ${to}`);
  }
}
