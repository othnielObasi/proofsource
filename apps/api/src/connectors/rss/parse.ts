// Parse an RSS 2.0 or Atom feed (e.g. from RSSHub) into normalized items.
// RSSHub is named in the hackathon's Prior Art #01 as the natural host for
// citation-tolls: it generates feeds for sources that don't publish their own,
// so it turns almost any creator/publisher into priceable, agent-readable content.

import { XMLParser } from "fast-xml-parser";

export interface NormalizedItem {
  guid: string;
  title: string;
  author: string;
  link: string;
  content: string; // plain text, HTML stripped
  publishedAt: string; // ISO; falls back to now if the feed omits a date
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function txt(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("#text" in o) return String(o["#text"]);
  }
  return "";
}

function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toIso(d: unknown): string {
  const s = txt(d);
  const t = s ? Date.parse(s) : NaN;
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

function arr<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export function parseFeed(xml: string): NormalizedItem[] {
  const root = parser.parse(xml);

  // ---- RSS 2.0 ----
  if (root?.rss?.channel) {
    const ch = root.rss.channel;
    const feedAuthor = txt(ch.title) || "Unknown source";
    return arr<any>(ch.item).map((it) => {
      const content = stripHtml(txt(it["content:encoded"]) || txt(it.description) || "");
      const link = txt(it.link);
      return {
        guid: txt(it.guid) || link || txt(it.title),
        title: txt(it.title) || "(untitled)",
        author: txt(it["dc:creator"]) || txt(it.author) || feedAuthor,
        link,
        content,
        publishedAt: toIso(it.pubDate),
      };
    }).filter((i) => i.content.length > 0);
  }

  // ---- Atom ----
  if (root?.feed) {
    const f = root.feed;
    const feedAuthor = txt(f.author?.name) || txt(f.title) || "Unknown source";
    return arr<any>(f.entry).map((e) => {
      const links = arr<any>(e.link);
      const alt = links.find((l) => l?.["@_rel"] === "alternate") ?? links[0];
      const content = stripHtml(txt(e.content) || txt(e.summary) || "");
      return {
        guid: txt(e.id) || txt(alt?.["@_href"]) || txt(e.title),
        title: txt(e.title) || "(untitled)",
        author: txt(e.author?.name) || feedAuthor,
        link: txt(alt?.["@_href"]),
        content,
        publishedAt: toIso(e.published || e.updated),
      };
    }).filter((i) => i.content.length > 0);
  }

  return [];
}
