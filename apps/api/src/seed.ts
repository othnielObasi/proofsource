import { store } from "./db.js";
import { id, nowIso, sha256 } from "./lib/hash.js";
import type { Provider, Resource } from "../../../packages/shared/src/types.js";

export function seed() {
  store.reset();

  store.workspaces.set("ws_demo", {
    id: "ws_demo", name: "Demo Research Workspace",
    budgetUsdc: "1.000000", perTaskMaxUsdc: "0.050000",
    mandate: {
      budgetUsdc: "1.000000",
      perTaskMaxUsdc: "0.050000",
      maxPricePerSourceUsdc: "0.050000",
      minRelevance: 0.25,
      valuePerCentThreshold: 0.1,
      preferredProviderIds: [],
      blockedProviderIds: [],
      requireCitation: false,
    },
  });

  const mkProvider = (name: string, type: Provider["providerType"]): Provider => {
    const p: Provider = {
      id: id("prov"), name, providerType: type,
      walletAddress: "0x" + sha256(name).slice(7, 47),
      status: "active", createdAt: nowIso(), updatedAt: nowIso(),
    };
    store.providers.set(p.id, p);
    return p;
  };

  const mkResource = (
    prov: Provider, title: string, description: string, body: string,
    priceUsdc: string, reusable = true, expiresInDays = 30
  ): Resource => {
    const r: Resource = {
      id: id("res"), providerId: prov.id, title, description,
      resourceType: "article", contentBody: body, contentHash: sha256(body),
      priceUsdc, usageRights: { usageType: "citation", reusable, expiresInDays },
      freshnessHalfLifeDays: 90, status: "active",
      createdAt: nowIso(), updatedAt: nowIso(),
    };
    store.resources.set(r.id, r);
    return r;
  };

  const pub = mkProvider("Independent Ledger", "publisher");
  const writer = mkProvider("Maya Okonkwo (Newsletter)", "creator");
  const research = mkProvider("Frontier Notes", "research_provider");

  mkResource(
    pub,
    "AI content licensing and creator compensation: the state of play",
    "Premium explainer on AI content licensing, opt-out regimes, and per-use creator pay.",
    "AI content licensing centres on three contested questions: whether training on " +
    "copyrighted work is fair use, how creators are compensated when models reproduce or " +
    "ground answers in their work, and whether per-use settlement can replace blanket " +
    "licensing. Proponents of per-citation pay argue that nanopayments let a source earn " +
    "every time an agent grounds an answer in it, rather than once at training time. " +
    "Critics counter that attribution and reuse-detection remain unsolved at scale.",
    "0.030000"
  );
  mkResource(
    writer,
    "Why subscriptions priced out the five-cent article",
    "Short essay on the payment floor and what removing it unlocks for small creators.",
    "For as long as a payment could not clear below ~30 cents after fees, a five-cent " +
    "article could not be sold on its own — so everything was bundled into a monthly " +
    "subscription. Removing the floor makes the smallest unit sellable for the first time.",
    "0.010000"
  );
  mkResource(
    research,
    "Quantum error correction roadmaps 2026 (unrelated control source)",
    "Deep dive on surface codes — included to test the agent's value-per-cent filtering.",
    "Surface-code thresholds and logical qubit overheads, with 2026 roadmap comparisons.",
    "0.045000"
  );
}
