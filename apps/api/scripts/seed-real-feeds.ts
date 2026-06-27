// ───────────────────────────────────────────────────────────────────────────
// SEED REAL FEEDS
//
// Turns real published sources into real ProofSource creators by ingesting their
// RSS / RSSHub feeds. The Lepton brief points straight at this: RSSHub (44k stars)
// is named as the natural host for "citation tolls when an answer is grounded in a
// source," and creator-side traction is judged on "creators getting paid." Sample
// data doesn't count — real feeds do.
//
//   npm run seed:feeds                 # ingest the FEEDS below
//   FEEDS_FILE=./my-feeds.json npm run seed:feeds   # or supply your own list
//
// NOTE: each entry should be a source you can legitimately point at (a public RSS/
// Atom feed). For REAL payouts to a creator, get their consent + wallet; for a public
// demo of grounding/citation, public feeds are fine. Wallets attach when the creator
// signs up and connects this same provider, or via the managed-wallet path.
// ───────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from "node:fs";
import { store } from "../src/db.js";
import { env } from "../src/env.js";
import { ingestFromUrl } from "../src/connectors/rss/ingest.js";
import { persistence } from "../src/persistence/index.js";
import { sha256, nowIso } from "../src/lib/hash.js";
import type { Provider } from "../../../packages/shared/src/types.js";

interface FeedEntry { name: string; feedUrl: string; priceUsdc?: string }

// Edit this list, or pass FEEDS_FILE=path/to/list.json (same shape).
// Examples mix direct independent-publication RSS (Ghost/Substack expose /feed) with
// RSSHub routes for sources that lack a native feed. Replace with sources you actually
// want to represent.
const DEFAULT_FEEDS: FeedEntry[] = [
  // Direct RSS from independent publications (each writer owns their feed):
  { name: "Platformer (Casey Newton)", feedUrl: "https://www.platformer.news/rss/", priceUsdc: "0.002" },
  { name: "404 Media", feedUrl: "https://www.404media.co/rss/", priceUsdc: "0.002" },
  // RSSHub routes (self-host or use https://rsshub.app) for sources without native feeds:
  { name: "The Verge (via RSSHub)", feedUrl: "https://rsshub.app/verge", priceUsdc: "0.001" },
];

function loadFeeds(): FeedEntry[] {
  const p = process.env.FEEDS_FILE;
  if (p && existsSync(p)) return JSON.parse(readFileSync(p, "utf8")) as FeedEntry[];
  return DEFAULT_FEEDS;
}

function ensureProvider(name: string): string {
  const id = "prov_" + sha256("creator:" + name).slice(7, 23);
  if (!store.providers.get(id)) {
    const provider: Provider = {
      id, name, providerType: "publisher",
      status: "active", createdAt: nowIso(), updatedAt: nowIso(),
    };
    store.providers.set(id, provider);
  }
  return id;
}

async function main() {
  await persistence.restore();
  const feeds = loadFeeds();
  console.log(`ingesting ${feeds.length} real feed(s) (mode: ${env.paymentMode})\n`);

  let ok = 0, total = 0;
  for (const f of feeds) {
    const providerId = ensureProvider(f.name);
    try {
      const r = await ingestFromUrl(f.feedUrl, {
        priceUsdc: f.priceUsdc ?? "0.002",
        assignToProviderId: providerId,
        sourceLabel: f.feedUrl,
      });
      ok++; total += r.resources;
      console.log(`  ✓ ${f.name.padEnd(28)} ${r.resources} pieces  (${f.feedUrl})`);
    } catch (e) {
      console.log(`  ✗ ${f.name.padEnd(28)} ${(e as Error).message}  (${f.feedUrl})`);
    }
  }
  await persistence.saveNow();
  console.log(`\n${ok}/${feeds.length} feeds ingested, ${total} pieces now listed as real sources.`);
  console.log("Run the harness (or the console) to have agents cite — and pay — these creators.");
}

main().catch((e) => { console.error(e); process.exit(1); });
