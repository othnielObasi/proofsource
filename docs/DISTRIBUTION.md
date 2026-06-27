# ProofSource — Distribution Surfaces

One core, several doors. The agent + verified-settlement engine stays in `apps/api`; every
distribution surface is a thin adapter over the same SDK, so behaviour is identical no
matter how value enters.

```
                 ┌──────────────────────────────────────────────┐
                 │  CORE  (apps/api)                            │
                 │  agent decision · mandate · x402 deliver ·   │
                 │  verify · Arc/Gateway settle · receipts ·    │
                 │  traction · persistence                      │
                 └──────────────────────────────────────────────┘
                          ▲ @proofsource/sdk (typed client)
        ┌─────────────────┼───────────────────┬────────────────────┐
        │                 │                   │                    │
   MCP server         x402 / Gateway       OSS plugins         OpenClaw plugin
 (@proofsource/mcp)   seller endpoint      RSSHub / Ghost /    (ClawHub · 380k★
 agents in Claude/    other agents pay     Jellyfin sidecars   assistants pay
 Cursor/Windsurf      ProofSource per call over the SDK        creators per cite)
```

## 1. MCP server — `@proofsource/mcp`  (Keryx parity)

The distribution channel agents already live in. One line wires ProofSource into any MCP client:

```bash
claude mcp add proofsource -- npx -y @proofsource/mcp     # Claude Code/Desktop, Cursor, Windsurf
```

Tools: `proofsource_ask` (agent decides, pays sources, cites), `proofsource_traction`,
`proofsource_creator_earnings`, `proofsource_wallet_status`. Config via env
`PROOFSOURCE_URL` / `PROOFSOURCE_TOKEN` / `PROOFSOURCE_WORKSPACE`. Code: `packages/mcp/`.
Install deps: `npm i @modelcontextprotocol/sdk @proofsource/sdk`.

## 2. SDK — `@proofsource/sdk`

The shared typed client every other surface sits on (`ask`, `decide`, `traction`,
`earnings`, `connectFeed`, `mandate`). Code: `packages/sdk/`. Used by the MCP server and
any external agent/plugin.

## 3. Gateway / x402 seller endpoint

ProofSource content exposed as x402-protected, Gateway-batched endpoints so *other teams'*
agents can pay ProofSource per call (and ProofSource's agent can pay theirs). The working
reference is `examples/arc-live/` (seller gates a resource behind a USDC nanopayment;
buyer pays it). This is also the entry ticket into the hackathon's cross-team payment loops
— keep the dialect **Gateway-batched** (header `PAYMENT-REQUIRED`) to match the Arc builders.

## 4. OSS plugin adapters (Distribution Bootstrap)

The brief's thesis: the users are already gathered in self-hosted OSS communities that
expose webhooks/plugins/APIs. A plugin adapter attaches ProofSource settlement from the
outside — no fork required:
- **RSSHub** (44k★) — citation tolls when an answer is grounded in a source (closest fit; `seed:feeds` already ingests RSSHub routes).
- **Ghost** (54k★) — paid memberships/newsletters for writers.
- **Jellyfin / Owncast / PeerTube** — pay-per-view / per-second streaming.

Each is a small sidecar that subscribes to the host's events and calls `@proofsource/sdk`.

## 5. OpenClaw plugin — `@proofsource/openclaw-plugin`

OpenClaw is the self-hosted, multi-channel personal-AI-assistant gateway (~380k★, very
active). Its plugin system lets a plugin register agent tools via `api.registerTool` +
`contracts.tools`, installable from ClawHub / npm / git. The ProofSource plugin registers
`proofsource_ask`, `proofsource_traction`, `proofsource_creator_earnings`, so any OpenClaw
user's assistant can answer with cited sources **and pay those creators per citation** in
USDC on Arc. Code: `packages/openclaw-plugin/` (manifest + entry over `@proofsource/sdk`).

```bash
openclaw plugins install proofsource        # from ClawHub once published
```

This is a large distribution surface: every assistant that installs it becomes a paying
reader. Confirm the exact Plugin SDK signatures against your installed gateway version.

## 6. Secrets / key custody — 1Claw (optional hardening)

Separately from distribution: the paying agent's Arc **signer key** should not sit in
plaintext `.env`. 1Claw (`1claw.dev`, a Lepton sponsor — secrets management for AI agents,
promo `LEPTON26`) can hold it and hand it to the agent at runtime, enforcing the security
rule from the settlement runbook. A hardening dependency, not a distribution door.

## Build order (highest leverage first)

1. **MCP server** live (Keryx parity; agent clients + cross-team loops). ← scaffolded
2. **OpenClaw plugin** published to ClawHub (huge ready-made user base). ← scaffolded
3. **x402/Gateway seller** deployed so other agents can pay you. ← `examples/arc-live` ready
4. **RSSHub plugin** so real sources become real creators. ← `seed:feeds` ready
5. **1Claw** for signer-key custody (hardening).
