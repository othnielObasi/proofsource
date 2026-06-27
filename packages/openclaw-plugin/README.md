# ProofSource — OpenClaw plugin

Let your OpenClaw assistant **pay the sources it cites**. When ProofSource grounds an
answer in a creator's work, it settles a sub-cent USDC nanopayment to them on Arc, with a
verifiable receipt — turning your personal assistant into something that compensates the
writers, publishers, and researchers it relies on.

## Install

```bash
# from ClawHub (once published)
openclaw plugins install proofsource

# or from npm / git / a local checkout
openclaw plugins install @proofsource/openclaw-plugin
openclaw plugins install proofsource --marketplace <owner/repo>
openclaw plugins install ./packages/openclaw-plugin     # local dev
```

Restart the Gateway after install/config changes.

## Configure

Set in the plugin config (or the matching env vars):

| key | env | meaning |
|---|---|---|
| `url` | `PROOFSOURCE_URL` | your ProofSource deployment URL |
| `token` | `PROOFSOURCE_TOKEN` | operator bearer token (from ProofSource sign-in) |
| `workspaceId` | `PROOFSOURCE_WORKSPACE` | the operator workspace the agent pays from |

## Tools it registers

- **`proofsource_ask`** — answer a question using paid sources; the agent decides what's worth buying within your budget/mandate, pays each cited creator in USDC on Arc, and returns the answer with citations + receipts.
- **`proofsource_traction`** — live metrics: creators earning, total payouts, payment count, sub-cent average, conversion.
- **`proofsource_creator_earnings`** — a creator's earnings and verified citation receipts.

## How it fits

This plugin is a thin adapter over `@proofsource/sdk` — the same client the MCP server and
the web app use. One core engine (agent decision · mandate · x402 deliver · verify ·
Arc/Gateway settle · receipts), several doors. See `docs/DISTRIBUTION.md`.

> The OpenClaw Plugin SDK surface evolves with the gateway version; if `api.registerTool`
> field names differ on your installed version, align `index.ts` with
> docs.openclaw.ai/plugins/building-plugins. The tool *logic* is unchanged.
