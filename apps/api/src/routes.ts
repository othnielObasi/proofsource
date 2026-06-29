import type { FastifyInstance } from "fastify";
import { store } from "./db.js";
import { env } from "./env.js";
import { id, nowIso, sha256 } from "./lib/hash.js";
import { seed } from "./seed.js";
import { runResearchAgent } from "./modules/agent/run.js";
import { decide } from "./modules/agent/decision.js";
import { audit } from "./modules/audit/index.js";
import { ingestFromString, ingestFromUrl } from "./connectors/rss/ingest.js";
import { computeTraction } from "./modules/metrics/traction.js";
import { persistence } from "./persistence/index.js";
import * as auth from "./modules/auth/index.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Provider, Resource, OperatorMandate } from "../../../packages/shared/src/types.js";
import { ARC_USDC, ARC_GATEWAY_CONTRACT } from "./env.js";
import { provisionManagedWallet, getWalletBalance, transferToExternal, isManagedWalletConfigured } from "./integrations/wallet/circleManagedWallet.js";

let sampleXml = "<rss version=\"2.0\"><channel><title>Sample</title><item><title>Per-use licensing</title><link>https://example.com/1</link><description>Sample content</description></item></channel></rss>";
try {
  const __rssDir = join(dirname(fileURLToPath(import.meta.url)), "connectors", "rss");
  sampleXml = readFileSync(join(__rssDir, "sample-feed.xml"), "utf8");
} catch { /* bundled/serverless — inline fallback used */ }

export async function registerRoutes(app: FastifyInstance) {
  // Health
  app.get("/v1/proofsource/health", async () => ({ status: "ok", paymentMode: env.paymentMode }));
  app.get("/v1/proofsource/ready", async () => ({ ready: store.workspaces.size > 0 }));

  // ── Auth (accounts + sessions) ────────────────────────────────────────────
  app.post<{ Body: { email: string; password: string; name: string; role: auth.Role } }>(
    "/v1/proofsource/auth/register", async (req, reply) => {
      const r = auth.register(req.body ?? ({} as any));
      if ("error" in r) return reply.code(400).send(r);
      persistence.scheduleSave();
      return r;
    });
  app.post<{ Body: { email: string; password: string } }>(
    "/v1/proofsource/auth/login", async (req, reply) => {
      const r = auth.login(req.body ?? ({} as any));
      if ("error" in r) return reply.code(401).send(r);
      return r;
    });
  app.get("/v1/proofsource/auth/me", async (req, reply) => {
    const r = auth.me(req.headers.authorization);
    if ("error" in r) return reply.code(401).send(r);
    return r;
  });
  app.post<{ Body: { walletAddress?: string; kind?: "connected" | "managed" } }>(
    "/v1/proofsource/auth/wallet", async (req, reply) => {
      const { walletAddress, kind = "connected" } = req.body ?? ({} as any);
      if (!walletAddress && kind !== "managed") return reply.code(400).send({ error: "walletAddress required" });

      let resolvedAddress = walletAddress;
      let circleWalletId: string | undefined;

      if (kind === "managed") {
        if (!isManagedWalletConfigured()) {
          return reply.code(501).send({ error: "Managed wallets require CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET." });
        }
        const acct = auth.accountFromToken(req.headers.authorization);
        if (!acct) return reply.code(401).send({ error: "Not authenticated" });
        try {
          const provisioned = await provisionManagedWallet(acct.name);
          resolvedAddress = provisioned.walletAddress;
          circleWalletId = provisioned.walletId;
        } catch (e: any) {
          return reply.code(502).send({ error: "Failed to provision Circle wallet: " + e.message });
        }
      }

      const r = auth.setWallet(req.headers.authorization, resolvedAddress, kind);
      if ("error" in r) return reply.code(401).send(r);

      // Persist Circle wallet ID on the provider record
      if (circleWalletId) {
        const acct = auth.accountFromToken(req.headers.authorization);
        if (acct?.providerId) {
          const provider = store.providers.get(acct.providerId);
          if (provider) { provider.circleWalletId = circleWalletId; provider.walletKind = "managed"; }
        }
      }

      persistence.scheduleSave();
      return { ...r, walletAddress: resolvedAddress, managed: kind === "managed", circleWalletId };
    });

  // Demo control
  app.post("/v1/proofsource/demo/seed", async () => { seed(); return { ok: true, resources: store.listResources().length }; });

  // Providers
  app.post("/v1/proofsource/providers", async (req) => {
    const b = req.body as Partial<Provider>;
    const p: Provider = {
      id: id("prov"), name: b.name ?? "Unnamed", providerType: b.providerType ?? "creator",
      walletAddress: b.walletAddress, status: "active", createdAt: nowIso(), updatedAt: nowIso(),
    };
    store.providers.set(p.id, p);
    audit("provider.created", "provider", p.id, {});
    return p;
  });
  app.get("/v1/proofsource/providers", async () => [...store.providers.values()]);
  app.get<{ Params: { providerId: string } }>("/v1/proofsource/providers/:providerId",
    async (req) => store.providers.get(req.params.providerId) ?? { error: "not found" });

  // Resources
  app.post("/v1/proofsource/resources", async (req) => {
    const b = req.body as Partial<Resource> & { providerId: string; contentBody: string };
    const r: Resource = {
      id: id("res"), providerId: b.providerId, title: b.title ?? "Untitled",
      description: b.description ?? "", resourceType: b.resourceType ?? "article",
      contentBody: b.contentBody, contentHash: sha256(b.contentBody),
      priceUsdc: b.priceUsdc ?? "0.010000",
      usageRights: b.usageRights ?? { usageType: "citation", reusable: true, expiresInDays: 30 },
      freshnessHalfLifeDays: b.freshnessHalfLifeDays ?? 90,
      status: "active", createdAt: nowIso(), updatedAt: nowIso(),
    };
    store.resources.set(r.id, r);
    audit("resource.created", "resource", r.id, {});
    return r;
  });
  app.get("/v1/proofsource/resources", async () => store.listResources());

  // RSS/RSSHub connector — turn a real feed into priced, hash-verified content.
  app.post<{ Body: { url?: string; sample?: boolean; priceUsdc?: string; maxItems?: number } }>(
    "/v1/proofsource/connectors/rss/ingest", async (req) => {
      const { url, sample, priceUsdc, maxItems } = req.body ?? {};
      try {
        if (sample || !url) {
          const xml = sampleXml;
          const r = ingestFromString(xml, { priceUsdc, maxItems, sourceLabel: "sample-feed.xml" });
          persistence.scheduleSave();
          return r;
        }
        const r = await ingestFromUrl(url, { priceUsdc, maxItems });
        persistence.scheduleSave();
        return r;
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

  // ── Creator self-serve (the writer/publisher experience) ──────────────────
  // Register: list your work, set a price, get paid. Managed wallet provisions a real
  // Circle Programmable Wallet so the creator never has to understand crypto.
  app.post<{ Body: { name?: string; walletAddress?: string; feedUrl?: string; sample?: boolean; priceUsdc?: string; managedWallet?: boolean } }>(
    "/v1/proofsource/creators/register", async (req) => {
      const b = req.body ?? {};
      if (!b.name) return { error: "name is required" };
      if (!b.walletAddress && !b.managedWallet && !b.sample) return { error: "supply a wallet address or request a managed wallet" };
      const pid = "prov_" + sha256("creator:" + b.name).slice(7, 23);

      let walletAddress: string;
      let circleWalletId: string | undefined;
      if (b.walletAddress) {
        walletAddress = b.walletAddress;
      } else if (b.managedWallet && isManagedWalletConfigured()) {
        try {
          const provisioned = await provisionManagedWallet(b.name);
          walletAddress = provisioned.walletAddress;
          circleWalletId = provisioned.walletId;
        } catch (e: any) {
          return { error: "Failed to provision Circle wallet: " + e.message };
        }
      } else {
        // Fallback stub for sample/demo mode without Circle creds
        walletAddress = "0x" + sha256("managed:" + b.name).slice(7, 47);
      }

      const existing = store.providers.get(pid);
      const provider: Provider = existing ?? {
        id: pid, name: b.name, providerType: "publisher", walletAddress,
        walletKind: b.walletAddress ? "connected" : "managed",
        status: "active", createdAt: nowIso(), updatedAt: nowIso(),
      };
      provider.walletAddress = walletAddress;
      if (circleWalletId) provider.circleWalletId = circleWalletId;
      store.providers.set(pid, provider);
      if (!existing) audit("provider.created", "provider", pid, { via: "self-serve" });
      const id = pid;

      let listed = 0;
      try {
        if (b.feedUrl) {
          listed = (await ingestFromUrl(b.feedUrl, { priceUsdc: b.priceUsdc, assignToProviderId: id, sourceLabel: b.feedUrl })).resources;
        } else if (b.sample) {
          const xml = sampleXml;
          listed = ingestFromString(xml, { priceUsdc: b.priceUsdc, assignToProviderId: id, sourceLabel: "sample-feed.xml" }).resources;
        }
      } catch (e) {
        return { error: "registered, but feed import failed: " + (e as Error).message, providerId: id };
      }
      persistence.scheduleSave();
      return {
        providerId: id, name: provider.name, walletAddress, managed: !b.walletAddress,
        listed, dashboardUrl: `/creator.html?id=${id}`,
      };
    });

  // Authed: connect a feed to the logged-in creator's own listing identity.
  app.post<{ Body: { feedUrl?: string; sample?: boolean; priceUsdc?: string } }>(
    "/v1/proofsource/creators/connect-feed", async (req, reply) => {
      const acct = auth.accountFromToken(req.headers.authorization);
      if (!acct || acct.role !== "creator" || !acct.providerId)
        return reply.code(401).send({ error: "sign in as a creator first" });
      const b = req.body ?? {};
      try {
        let listed = 0;
        if (b.feedUrl) {
          listed = (await ingestFromUrl(b.feedUrl, { priceUsdc: b.priceUsdc, assignToProviderId: acct.providerId, sourceLabel: b.feedUrl })).resources;
        } else if (b.sample) {
          const xml = sampleXml;
          listed = ingestFromString(xml, { priceUsdc: b.priceUsdc, assignToProviderId: acct.providerId, sourceLabel: "sample-feed.xml" }).resources;
        } else {
          return reply.code(400).send({ error: "provide a feedUrl or set sample=true" });
        }
        persistence.scheduleSave();
        return { providerId: acct.providerId, listed };
      } catch (e) {
        return reply.code(400).send({ error: (e as Error).message });
      }
    });

  // A creator's earnings: total, per-piece, and recent verified citations (with proof).
  app.get<{ Params: { id: string } }>("/v1/proofsource/creators/:id/earnings", async (req) => {
    const provider = store.providers.get(req.params.id);
    if (!provider) return { error: "creator not found" };
    const receipts = [...store.receipts.values()].filter((r) => r.providerId === provider.id);
    const amountOf = (authId: string) => Number(store.authorizations.get(authId)?.amountUsdc ?? 0);
    const totalEarned = receipts.reduce((s, r) => s + amountOf(r.authorizationId), 0);

    const perPiece = new Map<string, { title: string; citations: number; earningsUsdc: number }>();
    for (const r of receipts) {
      const res = store.resources.get(r.resourceId);
      const k = r.resourceId;
      const cur = perPiece.get(k) ?? { title: res?.title ?? k, citations: 0, earningsUsdc: 0 };
      cur.citations++; cur.earningsUsdc += amountOf(r.authorizationId);
      perPiece.set(k, cur);
    }
    const recent = receipts
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 20)
      .map((r) => ({
        title: store.resources.get(r.resourceId)?.title ?? r.resourceId,
        amountUsdc: amountOf(r.authorizationId).toFixed(6),
        at: r.createdAt,
        receiptHash: r.receiptHash,
        transaction: r.chainReference?.transactionHash ?? r.chainReference?.circleTransactionId,
        explorerUrl: r.chainReference?.explorerUrl,
      }));

    const pieces = [...store.resources.values()].filter((x) => x.providerId === provider.id);
    return {
      creator: provider.name, walletAddress: provider.walletAddress,
      paymentMode: env.paymentMode,
      totalEarnedUsdc: totalEarned.toFixed(6),
      citations: receipts.length,
      avgPerCitationUsdc: receipts.length ? (totalEarned / receipts.length).toFixed(6) : "0.000000",
      listedPieces: pieces.length,
      perPiece: [...perPiece.values()].map((p) => ({ ...p, earningsUsdc: p.earningsUsdc.toFixed(6) }))
        .sort((a, b) => Number(b.earningsUsdc) - Number(a.earningsUsdc)),
      recent,
    };
  });

  // Managed wallet: live Circle balance for the creator
  app.get<{ Params: { id: string } }>("/v1/proofsource/creators/:id/balance", async (req, reply) => {
    const provider = store.providers.get(req.params.id);
    if (!provider) return reply.code(404).send({ error: "creator not found" });
    if (!provider.circleWalletId) return reply.code(400).send({ error: "no managed wallet — creator uses an external wallet" });
    try {
      const balance = await getWalletBalance(provider.circleWalletId);
      return { walletId: balance.walletId, walletAddress: provider.walletAddress, usdcBalance: balance.usdc };
    } catch (e: any) {
      return reply.code(502).send({ error: "Failed to fetch balance: " + e.message });
    }
  });

  // Managed wallet: withdraw USDC to an external address
  app.post<{ Params: { id: string }; Body: { destinationAddress: string; amountUsdc: string } }>(
    "/v1/proofsource/creators/:id/withdraw", async (req, reply) => {
      const provider = store.providers.get(req.params.id);
      if (!provider) return reply.code(404).send({ error: "creator not found" });
      if (!provider.circleWalletId) return reply.code(400).send({ error: "no managed wallet" });
      const { destinationAddress, amountUsdc } = req.body ?? {};
      if (!destinationAddress || !amountUsdc) return reply.code(400).send({ error: "destinationAddress and amountUsdc required" });
      try {
        const result = await transferToExternal(provider.circleWalletId, destinationAddress, amountUsdc);
        audit("creator.withdrawal", "provider", provider.id, { destinationAddress, amountUsdc, txId: result.txId });
        return { txId: result.txId, status: "pending", amountUsdc, destinationAddress };
      } catch (e: any) {
        return reply.code(502).send({ error: "Withdrawal failed: " + e.message });
      }
    });

  app.post<{ Body: { workspaceId: string; question: string } }>(
    "/v1/proofsource/agent/decision", async (req) => {
      const ws = store.workspaces.get(req.body.workspaceId);
      if (!ws) return { error: "unknown workspace" };
      return decide({
        question: req.body.question, candidates: store.listResources(),
        ownedContexts: store.paidContextsFor(ws.id),
        budgetRemainingUsdc: ws.budgetUsdc, perTaskMaxUsdc: ws.perTaskMaxUsdc,
        mandate: ws.mandate,
      });
    });

  // Operator mandate — the human-set policy the agent obeys.
  app.get<{ Querystring: { workspaceId?: string } }>("/v1/proofsource/mandate", async (req) => {
    const ws = store.workspaces.get(req.query.workspaceId ?? "ws_demo");
    return ws ? ws.mandate : { error: "unknown workspace" };
  });
  app.put<{ Body: { workspaceId?: string } & Partial<OperatorMandate> }>(
    "/v1/proofsource/mandate", async (req) => {
      const { workspaceId = "ws_demo", ...patch } = req.body ?? {};
      const ws = store.workspaces.get(workspaceId);
      if (!ws) return { error: "unknown workspace" };
      ws.mandate = { ...ws.mandate, ...patch };
      if (patch.budgetUsdc) ws.budgetUsdc = patch.budgetUsdc;
      if (patch.perTaskMaxUsdc) ws.perTaskMaxUsdc = patch.perTaskMaxUsdc;
      return ws.mandate;
    });

  // The demo: full research-agent run
  app.post<{ Body: { workspaceId: string; agentId: string; question: string } }>(
    "/v1/proofsource/demo/research-agent/run", async (req) => {
      const { workspaceId = "ws_demo", agentId = "agent_research_01", question } = req.body ?? {};
      const result = await runResearchAgent({ workspaceId, agentId, question });
      persistence.scheduleSave(); // durably record accrued volume (off hot path)
      return result;
    });

  // Traction metrics — the figures the rubric + submission form ask for.
  app.get("/v1/proofsource/dashboard/traction", async () => computeTraction(env.paymentMode));

  // Receipts, paid contexts, audit, dashboards
  app.get("/v1/proofsource/receipts", async () => [...store.receipts.values()]);
  app.get<{ Params: { receiptId: string } }>("/v1/proofsource/receipts/:receiptId",
    async (req) => store.receipts.get(req.params.receiptId) ?? { error: "not found" });
  app.get("/v1/proofsource/paid-contexts", async () => [...store.paidContexts.values()]);
  app.get("/v1/proofsource/audit", async () => store.auditEvents);

  app.get("/v1/proofsource/dashboard/buyer", async () => {
    const payments = [...store.payments.values()];
    const spent = payments.reduce((s, p) => s + Number(p.amountUsdc), 0);
    return {
      totalSpendUsdc: spent.toFixed(6),
      purchases: payments.length,
      reusedContexts: store.auditEvents.filter((e) => e.eventType === "paid_context.reused").length,
      receipts: store.receipts.size,
      failedVerifications: [...store.verifications.values()].filter((v) => v.status === "failed").length,
    };
  });
  app.get("/v1/proofsource/dashboard/provider", async () => {
    return [...store.providers.values()].map((p) => {
      const receipts = [...store.receipts.values()].filter((r) => r.providerId === p.id);
      const earnings = receipts.reduce((s, r) => {
        const a = store.authorizations.get(r.authorizationId);
        return s + Number(a?.amountUsdc ?? 0);
      }, 0);
      return { provider: p.name, sales: receipts.length, earningsUsdc: earnings.toFixed(6) };
    });
  });

  // ── x402 seller endpoint — serves resource content behind Circle Gateway nanopayment.
  // In arc_testnet mode the research agent calls this URL via GatewayClient.pay().
  // In mock mode it returns content directly (no payment required).
  app.get<{ Params: { resourceId: string } }>("/research/:resourceId", async (req, reply) => {
    const resource = store.resources.get(req.params.resourceId) ?? store.listResources()[0];
    if (!resource) return reply.code(404).send({ error: "no resources seeded yet" });

    const provider = store.providers.get(resource.providerId);
    const payTo = provider?.walletAddress ?? env.platformWallet ?? "0x0000000000000000000000000000000000000000";
    const amountAtomic = String(Math.round(parseFloat(resource.priceUsdc) * 1_000_000));

    if (env.paymentMode !== "arc_testnet") {
      return reply.send({ title: resource.title, body: resource.contentBody });
    }

    const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const decode = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

    const PAYMENT_REQUIREMENTS = {
      scheme: "exact", network: env.arcX402Network,
      asset: ARC_USDC, amount: amountAtomic, payTo,
      maxTimeoutSeconds: 60,
      extra: { name: "GatewayWalletBatched", version: "1", verifyingContract: ARC_GATEWAY_CONTRACT },
    };

    const sigHeader = (req.headers["payment-signature"] ?? req.headers["x-payment"]) as string | undefined;
    if (!sigHeader) {
      const resourceUrl = `${env.sellerBaseUrl}/research/${resource.id}`;
      const paymentRequired = { x402Version: 2, resource: { url: resourceUrl, description: resource.title, mimeType: "application/json" }, accepts: [PAYMENT_REQUIREMENTS] };
      return reply.code(402).header("PAYMENT-REQUIRED", encode(paymentRequired)).send(paymentRequired);
    }

    try {
      const { BatchFacilitatorClient }: any = await import("@circle-fin/x402-batching/server");
      const facilitator = new BatchFacilitatorClient({ url: env.circleGatewayUrl });
      const paymentPayload = decode(sigHeader);
      const verification = await facilitator.verify(paymentPayload, PAYMENT_REQUIREMENTS);
      if (!verification.isValid) return reply.code(402).send({ error: "Payment invalid: " + verification.invalidReason });
      const settlement = await facilitator.settle(paymentPayload, PAYMENT_REQUIREMENTS);
      if (!settlement.success) return reply.code(402).send({ error: "Settlement failed: " + settlement.errorReason });
      return reply.send({ title: resource.title, body: resource.contentBody });
    } catch (err: any) {
      return reply.code(402).send({ error: "Payment error: " + (err?.message ?? String(err)) });
    }
  });
}
