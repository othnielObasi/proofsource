import { env } from "../../env.js";
import type { Resource } from "../../../../../packages/shared/src/types.js";

// The LLM is allowed exactly two jobs: (1) estimate task-relevance of candidate
// sources, and (2) synthesise the final answer from purchased content. It NEVER
// authorises or releases payment. Both jobs degrade to deterministic fallbacks so
// the build runs with no API key.

export async function estimateRelevance(question: string, r: Resource): Promise<number> {
  if (env.llmEnabled && env.openaiApiKey) {
    try {
      return await llmRelevance(question, r);
    } catch {
      /* fall through to deterministic scorer */
    }
  }
  return keywordRelevance(question, r);
}

export async function synthesizeAnswer(
  question: string,
  source: { title: string; body: string } | null
): Promise<string> {
  if (source && env.llmEnabled && env.openaiApiKey) {
    try {
      return await llmAnswer(question, source);
    } catch {
      /* fall through */
    }
  }
  if (!source) {
    return `No paid source cleared the value-per-cent threshold for: "${question}". Answering from free context only (no payment made).`;
  }
  const snippet = source.body.slice(0, 280).trim();
  return `Based on the verified paid source "${source.title}": ${snippet}${source.body.length > 280 ? "…" : ""}`;
}

// ---- deterministic fallbacks ----
const STOP = new Set([
  "the","a","an","and","or","of","to","in","on","for","is","are","was","were","be",
  "what","which","who","how","why","when","where","with","without","about","around",
  "as","at","by","from","into","it","its","this","that","these","those","do","does",
  "best","key","i","you","we","they","my","our","your","can","could","should","would",
]);
function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((t) => t.length > 2 && !STOP.has(t))
    .map((t) => (t.endsWith("s") && t.length > 4 ? t.slice(0, -1) : t)); // crude de-plural
}
function keywordRelevance(question: string, r: Resource): number {
  const q = new Set(tokens(question));
  const hay = new Set(tokens(`${r.title} ${r.description}`));
  if (q.size === 0) return 0;
  let hits = 0;
  for (const t of q) if (hay.has(t)) hits++;
  return Math.min(1, hits / q.size);
}

// ---- live LLM (used only when LLM_ENABLED + OPENAI_API_KEY) ----
async function llmRelevance(question: string, r: Resource): Promise<number> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.openaiApiKey}` },
    body: JSON.stringify({
      model: env.llmModel,
      messages: [
        { role: "system", content: "Rate 0..1 how useful this source is for answering the question. Reply with only a number." },
        { role: "user", content: `Question: ${question}\nSource: ${r.title} — ${r.description}` },
      ],
      max_tokens: 4,
    }),
  });
  const data = await res.json();
  const n = parseFloat(data?.choices?.[0]?.message?.content ?? "0");
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : keywordRelevance(question, r);
}

async function llmAnswer(question: string, source: { title: string; body: string }): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.openaiApiKey}` },
    body: JSON.stringify({
      model: env.llmModel,
      messages: [
        { role: "system", content: "Answer using ONLY the provided paid source. Cite it." },
        { role: "user", content: `Question: ${question}\n\nSource "${source.title}":\n${source.body}` },
      ],
      max_tokens: 400,
    }),
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? `From "${source.title}": ${source.body.slice(0, 280)}`;
}
