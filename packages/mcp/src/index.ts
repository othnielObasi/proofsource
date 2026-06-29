// ProofSource MCP server — exposes the paying research agent as MCP tools so any MCP
// client (Claude Code/Desktop, Cursor, Windsurf) can use it in one line:
//
//   claude mcp add proofsource -- npx -y @proofsource/mcp
//
// Tools registered:
//   proofSource_ask        — ask a question; agent decides, pays creators, cites
//   proofSource_decide     — preview scoring without buying
//   proofSource_traction   — live traction metrics (creators earning, payouts, volume)
//
// Config via env:
//   PROOFSOURCE_BASE_URL      — deployed API base URL (e.g. https://proofsource-mu.vercel.app)
//   PROOFSOURCE_API_KEY       — operator API key (ps_live_...)
//   PROOFSOURCE_WORKSPACE_ID  — operator workspace id (defaults to the key owner's workspace)

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = (process.env.PROOFSOURCE_BASE_URL ?? "https://proofsource-mu.vercel.app").replace(/\/$/, "");
const API_KEY = process.env.PROOFSOURCE_API_KEY ?? "";
const WORKSPACE_ID = process.env.PROOFSOURCE_WORKSPACE_ID ?? "";

// --- Typed fetch helper (uses Node 18+ built-in fetch; no @proofsource/sdk to avoid circular deps) ---
async function psCall<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (API_KEY) headers["x-proofsource-key"] = API_KEY;
  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ProofSource ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

const server = new Server(
  { name: "proofsource", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "proofSource_ask",
      description:
        "Ask a research question. A budgeted agent discovers paid sources, decides which are worth buying, settles sub-cent USDC micropayments to creators on Arc, and answers with citations and verifiable receipts.",
      inputSchema: {
        type: "object" as const,
        properties: {
          question: { type: "string", description: "The research question to answer." },
          workspaceId: { type: "string", description: "Override the workspace id (optional — defaults to the API key owner's workspace)." },
        },
        required: ["question"],
      },
    },
    {
      name: "proofSource_decide",
      description:
        "Preview how the ProofSource agent would score available sources for a question — without buying anything. Returns scoring details and the proposed action (BUY/REUSE/SKIP).",
      inputSchema: {
        type: "object" as const,
        properties: {
          question: { type: "string", description: "The question to score sources against." },
          workspaceId: { type: "string", description: "Workspace id (optional — defaults to PROOFSOURCE_WORKSPACE_ID or ws_demo)." },
        },
        required: ["question"],
      },
    },
    {
      name: "proofSource_traction",
      description:
        "Fetch live ProofSource traction metrics: creators earning, total payouts, payment count, average transaction size, and reader-to-payer conversion.",
      inputSchema: { type: "object" as const, properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const a = (args ?? {}) as Record<string, string>;
  const text = (v: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(v, null, 2) }],
  });

  try {
    switch (name) {
      case "proofSource_ask": {
        const workspaceId = a.workspaceId || WORKSPACE_ID || undefined;
        const result = await psCall<unknown>("/v1/proofsource/agent/run", "POST", {
          question: a.question,
          ...(workspaceId ? { workspaceId } : {}),
        });
        return text(result);
      }

      case "proofSource_decide": {
        const workspaceId = a.workspaceId || WORKSPACE_ID || "ws_demo";
        const result = await psCall<unknown>("/v1/proofsource/agent/decision", "POST", {
          question: a.question,
          workspaceId,
        });
        return text(result);
      }

      case "proofSource_traction": {
        const result = await psCall<unknown>("/v1/proofsource/dashboard/traction");
        return text(result);
      }

      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (e) {
    return {
      content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("ProofSource MCP server ready");
