// Turn a parsed feed into ProofSource creators (providers) + priced content
// (resources). Idempotent: ids derive from author name / item guid, so re-ingesting
// the same feed updates in place rather than duplicating. Freshness is REAL here —
// resource.createdAt is the article's publish date, so the agent's freshness decay
// reflects how old the source actually is.

import { store } from "../../db.js";
import { sha256, nowIso } from "../../lib/hash.js";
import { audit } from "../../modules/audit/index.js";
import { parseFeed, type NormalizedItem } from "./parse.js";
import type { Provider, Resource } from "../../../../../packages/shared/src/types.js";

export interface IngestOptions {
  priceUsdc?: string; // default sub-cent per citation
  freshnessHalfLifeDays?: number;
  maxItems?: number;
  sourceLabel?: string; // e.g. the RSSHub route, for provenance
  assignToProviderId?: string; // attribute every item to this creator (self-serve onboarding)
}

export interface IngestResult {
  source?: string;
  providers: number;
  resources: number;
  items: Array<{ resourceId: string; title: string; author: string; priceUsdc: string; publishedAt: string }>;
}

function upsertProvider(name: string): Provider {
  const id = "prov_" + sha256("rss:" + name).slice(7, 23);
  const existing = store.providers.get(id);
  if (existing) return existing;
  // Real onboarding collects the creator's actual payout wallet; until then we
  // synthesize a deterministic placeholder so the demo can settle. Mark provenance.
  const p: Provider = {
    id, name, providerType: "publisher",
    walletAddress: "0x" + sha256("wallet:" + name).slice(7, 47),
    status: "active", createdAt: nowIso(), updatedAt: nowIso(),
  };
  store.providers.set(id, p);
  audit("provider.created", "provider", id, { via: "rss" });
  return p;
}

function upsertResource(item: NormalizedItem, provider: Provider, opts: IngestOptions): Resource {
  const id = "res_" + sha256(item.guid).slice(7, 23);
  const body = item.content;
  const r: Resource = {
    id, providerId: provider.id,
    title: item.title,
    description: body.slice(0, 160) + (body.length > 160 ? "…" : ""),
    resourceType: "article",
    contentBody: body,
    contentHash: sha256(body),
    priceUsdc: opts.priceUsdc ?? "0.002",
    usageRights: { usageType: "citation", reusable: true, expiresInDays: 30 },
    freshnessHalfLifeDays: opts.freshnessHalfLifeDays ?? 14,
    status: "active",
    createdAt: item.publishedAt, // REAL publish date drives freshness decay
    updatedAt: nowIso(),
  };
  store.resources.set(id, r);
  audit("resource.created", "resource", id, { via: "rss", source: opts.sourceLabel });
  return r;
}

export function ingestFromString(xml: string, opts: IngestOptions = {}): IngestResult {
  let items = parseFeed(xml);
  if (opts.maxItems) items = items.slice(0, opts.maxItems);
  const providerIds = new Set<string>();
  const out: IngestResult["items"] = [];
  const owner = opts.assignToProviderId ? store.providers.get(opts.assignToProviderId) : undefined;
  for (const it of items) {
    const provider = owner ?? upsertProvider(it.author); // creator owns their feed when assigned
    providerIds.add(provider.id);
    const r = upsertResource(it, provider, opts);
    out.push({ resourceId: r.id, title: r.title, author: provider.name, priceUsdc: r.priceUsdc, publishedAt: it.publishedAt });
  }
  return { source: opts.sourceLabel, providers: providerIds.size, resources: out.length, items: out };
}

export async function ingestFromUrl(url: string, opts: IngestOptions = {}): Promise<IngestResult> {
  // Works against a public RSSHub instance (https://rsshub.app/<route>) or any
  // RSS/Atom URL when the deployment has network egress.
  const res = await fetch(url, { headers: { "user-agent": "ProofSource/0.1 (+rss-connector)" } });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);
  const xml = await res.text();
  return ingestFromString(xml, { ...opts, sourceLabel: opts.sourceLabel ?? url });
}
