# @proofsource/sdk

Typed JavaScript/TypeScript client for [ProofSource](https://proofsource-mu.vercel.app) — the AI content licensing platform that pays creators in USDC on Arc every time their work is cited.

## Install

```bash
npm install @proofsource/sdk
```

## Quick start

```ts
import { ProofSource } from "@proofsource/sdk";

const ps = new ProofSource({
  baseUrl: "https://proofsource-mu.vercel.app",
  apiKey: "ps_live_...",          // from your operator account
});

const result = await ps.ask({
  question: "What are the key arguments around AI content licensing?",
});

console.log(result.answer);
console.log(result.sources);     // who was paid and their receipt IDs
console.log(result.spend);       // { totalUsdc: "0.030000" }
```

## Get an API key

1. Sign up at [proofsource-mu.vercel.app](https://proofsource-mu.vercel.app) as an **operator**
2. Your `ps_live_...` API key is returned on registration and visible in **Settings → API Key**
3. Or fetch it via REST: `GET /v1/proofsource/auth/me` with your JWT

## API reference

### `new ProofSource(options)`

| Option | Type | Description |
|---|---|---|
| `baseUrl` | `string` | Your ProofSource deployment URL |
| `apiKey` | `string` | Operator API key (`ps_live_...`) — for agent calls |
| `token` | `string` | JWT bearer token — for user-session calls (`me`, `regenerateApiKey`) |

---

### `ps.ask(input)` → `AskResult`

Runs the full paying research agent: discovers sources, scores them, buys the ones that pass the value threshold, settles USDC micropayments to creators on Arc, and returns a cited answer.

```ts
const result = await ps.ask({
  question: "What is per-use content licensing?",
  workspaceId: "ws_abc123",   // optional — defaults to your account's workspace
});
```

**Returns:**

```ts
{
  decision: {
    action: "BUY" | "REUSE" | "SKIP",
    reasoning: string,
    scores: Array<{ providerId, relevance, value, price }>
  },
  answer: string,              // cited answer
  sources: Array<{
    providerName?: string,
    receiptId?: string,        // verify at GET /v1/proofsource/receipts/:id
    deliveryHash?: string,
  }>,
  spend: { totalUsdc: string },
  trace: Array<{ step: string }>
}
```

---

### `ps.decide(input)` → preview

Score sources and decide without spending anything. Useful for dry runs.

```ts
const preview = await ps.decide({
  workspaceId: "ws_abc123",
  question: "What is fair use in AI training?",
});
```

---

### `ps.traction()` → `Traction`

Live platform metrics — creators earning, total payout volume, payment count.

```ts
const stats = await ps.traction();
// { creatorsEarning: 12, totalPayoutUsdc: "4.320000", paymentCount: 144, ... }
```

---

### `ps.earnings(providerId)` → creator earnings

Fetch a creator's citation receipts and total earned.

```ts
const data = await ps.earnings("prov_abc123");
```

---

### `ps.mandate(workspaceId)` → operator mandate

Fetch the budget policy the agent obeys for a workspace.

```ts
const mandate = await ps.mandate("ws_abc123");
// { budgetUsdc, perTaskMaxUsdc, maxPricePerSourceUsdc, minRelevance, requireCitation }
```

---

### `ps.connectFeed(input)` → list creator content

List a creator's work from an RSS/RSSHub feed (requires JWT auth).

```ts
const feed = await ps.connectFeed({
  feedUrl: "https://example.com/feed.xml",
  priceUsdc: "0.010000",
});
```

---

### `ps.regenerateApiKey()` → `{ apiKey: string }`

Issue a new `ps_live_...` key for the JWT-authenticated account.

```ts
const ps = new ProofSource({ baseUrl, token: "Bearer ..." });
const { apiKey } = await ps.regenerateApiKey();
```

---

## Use with LangChain / custom agents

```ts
import { ProofSource } from "@proofsource/sdk";

const ps = new ProofSource({ baseUrl: process.env.PROOFSOURCE_URL!, apiKey: process.env.PROOFSOURCE_API_KEY! });

// As a LangChain tool
const proofSourceTool = {
  name: "proofsource_ask",
  description: "Research a question using paid, verified sources. Creators are paid in USDC per citation.",
  async call(question: string) {
    const r = await ps.ask({ question });
    return r.answer;
  },
};
```

## REST API

The SDK wraps the ProofSource REST API. All endpoints are also accessible directly:

```bash
# Run the research agent
curl -X POST https://proofsource-mu.vercel.app/v1/proofsource/agent/run \
  -H "x-proofsource-key: ps_live_..." \
  -H "content-type: application/json" \
  -d '{"question": "What is per-use content licensing?"}'

# OpenAPI spec (for Codex / GPT Actions)
curl https://proofsource-mu.vercel.app/openapi.json

# Claude/OpenAI plugin manifest
curl https://proofsource-mu.vercel.app/.well-known/ai-plugin.json
```

## Connect to Claude / Cursor via MCP

Install the MCP server to use ProofSource as a native tool in Claude Desktop or Cursor:

```bash
npm install -g @proofsource/mcp
```

Add to `claude_desktop_config.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "proofsource": {
      "command": "npx",
      "args": ["-y", "@proofsource/mcp"],
      "env": {
        "PROOFSOURCE_BASE_URL": "https://proofsource-mu.vercel.app",
        "PROOFSOURCE_API_KEY": "ps_live_...",
        "PROOFSOURCE_WORKSPACE_ID": "ws_..."
      }
    }
  }
}
```

Or via Claude Code CLI:

```bash
claude mcp add proofsource -- npx -y @proofsource/mcp
```

## License

MIT
