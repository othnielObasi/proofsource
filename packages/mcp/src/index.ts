// ProofSource MCP server — exposes the paying research agent as MCP tools so any MCP
// client (Claude Code/Desktop, Cursor, Windsurf) can use it in one line:
//
//   claude mcp add proofsource -- npx -y @proofsource/mcp
//
// Tools:
//   proofsource_ask            — ask a question; the agent decides, pays sources, cites
//   proofsource_traction       — live traction metrics (creators earning, payouts, volume)
//   proofsource_creator_earnings — a creator's earnings + receipts
//   proofsource_wallet_status  — the platform/agent wallet the toll is paid from
//
// Config via env: PROOFSOURCE_URL (deploy URL), PROOFSOURCE_TOKEN (operator token),
// PROOFSOURCE_WORKSPACE (operator workspace id).
//
// Requires: npm install @modelcontextprotocol/sdk @proofsource/sdk

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema, ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ProofSource } from "@proofsource/sdk";

const ps = new ProofSource({
  baseUrl: process.env.PROOFSOURCE_URL ?? "http://localhost:3000",
  token: process.env.PROOFSOURCE_TOKEN,
});
const workspaceId = process.env.PROOFSOURCE_WORKSPACE ?? "ws_demo";

const server = new Server(
  { name: "proofsource", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "proofsource_ask",
      description: "Ask a research question. A budgeted agent decides which paid sources are worth buying, pays every creator it cites in USDC on Arc, and answers with citations.",
      inputSchema: { type: "object", properties: { question: { type: "string" } }, required: ["question"] },
    },
    { name: "proofsource_traction", description: "Live traction: creators earning, total payouts, payment count, sub-cent average, conversion.", inputSchema: { type: "object", properties: {} } },
    { name: "proofsource_creator_earnings", description: "A creator's earnings and verified citation receipts.", inputSchema: { type: "object", properties: { providerId: { type: "string" } }, required: ["providerId"] } },
    { name: "proofsource_wallet_status", description: "The mandate/budget the paying agent operates under.", inputSchema: { type: "object", properties: {} } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const text = (v: unknown) => ({ content: [{ type: "text", text: JSON.stringify(v, null, 2) }] });
  try {
    switch (name) {
      case "proofsource_ask": {
        const r = await ps.ask({ workspaceId, question: String((args as any)?.question ?? "") });
        return text({ answer: r.answer, decision: r.decision.action, paid: r.sources, spentUsdc: r.spend.totalUsdc });
      }
      case "proofsource_traction": return text(await ps.traction());
      case "proofsource_creator_earnings": return text(await ps.earnings(String((args as any)?.providerId ?? "")));
      case "proofsource_wallet_status": return text(await ps.mandate(workspaceId));
      default: return { content: [{ type: "text", text: `unknown tool: ${name}` }], isError: true };
    }
  } catch (e) {
    return { content: [{ type: "text", text: `error: ${(e as Error).message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("proofsource MCP server ready");
