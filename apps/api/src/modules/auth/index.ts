import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { store } from "../../db.js";
import { id, nowIso, sha256 } from "../../lib/hash.js";
import { audit } from "../audit/index.js";
import type { Provider } from "../../../../../packages/shared/src/types.js";

// ── Stateless JWT sessions ────────────────────────────────────────────────────
// Tokens are HMAC-SHA256 signed so they work across any serverless instance
// without a shared session store. Set JWT_SECRET in env; falls back to a
// per-process random value in dev (sessions reset on restart, fine for local).
const JWT_SECRET = process.env.JWT_SECRET ?? randomBytes(32).toString("hex");
const JWT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function makeJwt(accountId: string): string {
  const header  = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: accountId, exp: Date.now() + JWT_TTL_MS })).toString("base64url");
  const sig     = createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

function verifyJwt(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url"))) return null;
    const { sub, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!sub || Date.now() > exp) return null;
    return sub as string;
  } catch { return null; }
}

export type Role = "creator" | "operator" | "admin";
export interface Account {
  id: string;
  email: string;
  name: string;
  role: Role;
  pass: string;            // salt:hash
  walletAddress?: string;
  walletKind?: "connected" | "managed";
  providerId?: string;     // creators: their listing identity
  workspaceId?: string;    // operators: their agent workspace
  apiKey?: string;         // operators: machine-readable API key (ps_live_<32hex>)
  createdAt: string;
  lastLoginAt?: string;
}

export interface PublicAccount {
  id: string; email: string; name: string; role: Role;
  walletAddress?: string; walletKind?: string; providerId?: string; workspaceId?: string;
  apiKey?: string;
}

function hashPw(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(pw, salt, 64).toString("hex");
}
function verifyPw(pw: string, stored: string): boolean {
  const [salt, h] = stored.split(":");
  if (!salt || !h) return false;
  const a = Buffer.from(h, "hex");
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}
function publicOf(a: Account, includeApiKey = false): PublicAccount {
  return { id: a.id, email: a.email, name: a.name, role: a.role,
    walletAddress: a.walletAddress, walletKind: a.walletKind,
    providerId: a.providerId, workspaceId: a.workspaceId,
    ...(includeApiKey && a.apiKey ? { apiKey: a.apiKey } : {}) };
}

function findByEmail(email: string): Account | undefined {
  for (const a of store.accounts.values()) if (a.email === email.toLowerCase()) return a as Account;
  return undefined;
}

export function findByApiKey(key: string): Account | undefined {
  for (const a of store.accounts.values()) if ((a as Account).apiKey === key) return a as Account;
  return undefined;
}

function generateApiKey(): string {
  return "ps_live_" + randomBytes(16).toString("hex");
}

export function register(input: { email: string; password: string; name: string; role: Role }):
  { token: string; account: PublicAccount; apiKey?: string } | { error: string } {
  const email = (input.email || "").trim().toLowerCase();
  if (!email || !input.password || !input.name) return { error: "name, email and password are required" };
  if (input.password.length < 6) return { error: "password must be at least 6 characters" };
  if (input.role !== "creator" && input.role !== "operator") return { error: "role must be creator or operator" };
  if (findByEmail(email)) return { error: "an account with that email already exists" };

  const account: Account = {
    id: id("acct"), email, name: input.name.trim(), role: input.role,
    pass: hashPw(input.password), createdAt: nowIso(),
  };

  if (input.role === "creator") {
    const pid = "prov_" + sha256("acct:" + email).slice(7, 23);
    const provider: Provider = {
      id: pid, name: account.name, providerType: "publisher",
      status: "active", createdAt: nowIso(), updatedAt: nowIso(),
    };
    store.providers.set(pid, provider);
    account.providerId = pid;
    audit("provider.created", "provider", pid, { via: "signup" });
  } else {
    const wid = "ws_" + account.id.slice(5);
    store.workspaces.set(wid, {
      id: wid, name: `${account.name}'s workspace`,
      budgetUsdc: "1.000000", perTaskMaxUsdc: "0.050000",
      mandate: { budgetUsdc: "1.000000", perTaskMaxUsdc: "0.050000", maxPricePerSourceUsdc: "0.050000",
        minRelevance: 0.25, valuePerCentThreshold: 0.1, preferredProviderIds: [], blockedProviderIds: [], requireCitation: false },
    });
    account.workspaceId = wid;
    account.apiKey = generateApiKey();
  }

  store.accounts.set(account.id, account);
  return { token: makeJwt(account.id), account: publicOf(account, true), apiKey: account.apiKey };
}

export function login(
  input: { email: string; password: string },
  meta?: { ip?: string; userAgent?: string }
): { token: string; account: PublicAccount; apiKey?: string } | { error: string } {
  const a = findByEmail((input.email || "").trim().toLowerCase());
  if (!a || !verifyPw(input.password || "", a.pass)) return { error: "invalid email or password" };
  const at = nowIso();
  a.lastLoginAt = at;
  store.accounts.set(a.id, a);
  store.loginEvents.push({ id: id("login"), accountId: a.id, at, ip: meta?.ip, userAgent: meta?.userAgent });
  return { token: makeJwt(a.id), account: publicOf(a, true), apiKey: a.apiKey };
}

export function accountFromToken(token?: string): Account | undefined {
  if (!token) return undefined;
  const t = token.replace(/^Bearer\s+/i, "");
  const aid = verifyJwt(t);
  return aid ? (store.accounts.get(aid) as Account | undefined) : undefined;
}

export function me(token?: string, includeApiKey = false): PublicAccount | { error: string } {
  const a = accountFromToken(token);
  return a ? publicOf(a, includeApiKey) : { error: "not authenticated" };
}

export function regenerateApiKey(token?: string): { apiKey: string } | { error: string } {
  const a = accountFromToken(token);
  if (!a) return { error: "not authenticated" };
  const newKey = generateApiKey();
  a.apiKey = newKey;
  store.accounts.set(a.id, a);
  return { apiKey: newKey };
}

export function setWallet(token: string | undefined, walletAddress: string | undefined, kind: "connected" | "managed"):
  PublicAccount | { error: string } {
  const a = accountFromToken(token);
  if (!a) return { error: "not authenticated" };
  let addr = walletAddress;
  if (kind === "managed" && !addr) addr = "0x" + sha256("managed:" + a.email + a.id).slice(7, 47); // provisioned stub
  if (!addr) return { error: "walletAddress required" };
  a.walletAddress = addr;
  a.walletKind = kind;
  if (a.providerId) {
    const p = store.providers.get(a.providerId);
    if (p) { p.walletAddress = addr; p.updatedAt = nowIso(); }
  }
  store.accounts.set(a.id, a);
  return publicOf(a);
}

// ── Super-admin ───────────────────────────────────────────────────────────────
// No self-serve signup grants the admin role (see the role check in register()).
// The one admin account is bootstrapped from env vars on boot, mirroring how
// AGENT_PRIVATE_KEY and other operational secrets are handled in this codebase.
export function ensureBootstrapAdmin(): void {
  const email = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || "";
  if (!email || !password) return;
  if (findByEmail(email)) return;
  const account: Account = {
    id: id("acct"), email, name: "Super Admin", role: "admin",
    pass: hashPw(password), createdAt: nowIso(),
  };
  store.accounts.set(account.id, account);
}

export function requireAdmin(token?: string): { account: Account } | { error: string; code: number } {
  const a = accountFromToken(token);
  if (!a) return { error: "not authenticated", code: 401 };
  if (a.role !== "admin") return { error: "forbidden", code: 403 };
  return { account: a };
}

export { publicOf, generateApiKey };
