// ProofSource — OpenClaw plugin
//
// Registers ProofSource tools into an OpenClaw gateway, so a personal assistant can
// answer with cited sources AND pay those creators per citation in USDC on Arc.
// Installed from ClawHub / npm / git; configured via the plugin manifest's configSchema
// (url, token, workspaceId) or the matching PROOFSOURCE_* env vars.
//
// NOTE: the exact OpenClaw Plugin SDK surface (api.registerTool signature, handler shape)
// evolves with the gateway version. This entry follows the documented "register an agent
// tool via api.registerTool / contracts.tools" pattern; confirm field names against the
// Plugin SDK for your installed OpenClaw version (docs.openclaw.ai/plugins/building-plugins).

import { ProofSource } from "@proofsource/sdk";

// `api` is the OpenClaw plugin runtime context. Typed as any to avoid pinning to a
// specific gateway version's types; the calls below use only documented surfaces.
export default function activate(api: any) {
  const cfg = (api && api.config) || {};
  const ps = new ProofSource({
    baseUrl: cfg.url || process.env.PROOFSOURCE_URL || "http://localhost:3000",
    token: cfg.token || process.env.PROOFSOURCE_TOKEN,
  });
  const workspaceId = cfg.workspaceId || process.env.PROOFSOURCE_WORKSPACE || "ws_demo";

  api.registerTool({
    name: "proofsource_ask",
    description:
      "Answer a research question using paid sources. A budgeted agent decides which permitted sources are worth buying, pays every creator it cites (sub-cent USDC on Arc), and returns the answer with citations and receipts.",
    parameters: {
      type: "object",
      properties: { question: { type: "string", description: "The question to research and answer." } },
      required: ["question"],
    },
    handler: async (args: { question: string }) => {
      const r = await ps.ask({ workspaceId, question: args.question });
      return {
        answer: r.answer,
        decision: r.decision.action,
        paid: r.sources.map((s) => ({ creator: s.providerName, receipt: s.receiptId })),
        spentUsdc: r.spend.totalUsdc,
      };
    },
  });

  api.registerTool({
    name: "proofsource_traction",
    description: "Live ProofSource traction: creators earning, total payouts, payment count, sub-cent average, reader-to-payer conversion.",
    parameters: { type: "object", properties: {} },
    handler: async () => ps.traction(),
  });

  api.registerTool({
    name: "proofsource_creator_earnings",
    description: "A creator's earnings and verified citation receipts, by providerId.",
    parameters: {
      type: "object",
      properties: { providerId: { type: "string", description: "The creator's provider id." } },
      required: ["providerId"],
    },
    handler: async (args: { providerId: string }) => ps.earnings(args.providerId),
  });

  if (api.log?.info) api.log.info("ProofSource plugin activated — assistant can now pay sources it cites.");
}
