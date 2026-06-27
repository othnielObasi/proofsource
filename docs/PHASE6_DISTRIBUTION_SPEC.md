# Phase 6 — Distribution Surfaces · Ticket-by-Ticket Spec (agent-executable)

**Scope.** Take the distribution surfaces from *scaffolded* to *shipped*: the SDK on npm,
the MCP server runnable + published, the OpenClaw plugin on ClawHub, a deployable
x402/Gateway **seller**, and the Integrations section on the live site. Every surface
authenticates, respects the operator mandate, and settles on the **same core** — so all of
this depends on **Phase 1 (real settlement)** being green to settle for real.

**Repo anchors:** `packages/sdk`, `packages/mcp`, `packages/openclaw-plugin`,
`examples/arc-live/src/seller.ts`, `apps/api/public/index.html` (Developers screen),
`docs/DISTRIBUTION.md`.

**Ticket template:** *Goal · Files · Steps · DoD · Depends · Gates.* Advance only on a green
DoD. Mark unverifiable external SDK details **[confirm-at-integration]** and check current
official docs before relying on them. Never commit secrets/tokens.

**Order:** `PS6-00 → PS6-01 → PS6-02 → PS6-03 → PS6-05`; `PS6-04` (UI) is independent and
already done.

---

### PS6-00 — SDK publish-ready  `@proofsource/sdk`
**Goal:** the typed client every other surface depends on, installable from npm.
**Files:** `packages/sdk/` (add build, types export, `tsconfig`, `.npmignore`).
**Steps:**
1. Build to ESM + d.ts; set `exports`, `types`, `files`; semver from `0.1.0`.
2. Pin the API contract the client targets; add a consumer typecheck test.
3. `npm publish --access public` (dry-run first).
**DoD:** a fresh project `npm i @proofsource/sdk` imports `ProofSource` and typechecks;
`ask/decide/traction/earnings/connectFeed/mandate` work against a deployed API.
**Depends:** Phase 1 (for real settlement behind `ask`).

### PS6-01 — MCP server finish + verify + publish  `@proofsource/mcp`
**Goal:** `claude mcp add proofsource` works for real.
**Files:** `packages/mcp/` (deps, build, bin shebang).
**Steps:**
1. `npm i @modelcontextprotocol/sdk @proofsource/sdk`; **typecheck and run** the server
   (this was not possible in the build sandbox — do it here).
2. Confirm tool schemas + handler shapes against the installed SDK version
   **[confirm-at-integration]**; add a smoke test that lists tools and calls
   `proofsource_traction` against a staging API.
3. Provide a runnable `bin` (tsx or compiled JS); publish to npm.
**DoD:** `claude mcp add proofsource -- npx -y @proofsource/mcp` registers; all four tools
appear and return real data from staging; smoke test green.
**Depends:** PS6-00.

### PS6-02 — OpenClaw plugin finish + publish  `@proofsource/openclaw-plugin`
**Goal:** `openclaw plugins install proofsource` works for real.
**Files:** `packages/openclaw-plugin/` (entry, manifest).
**Steps:**
1. Install a current OpenClaw gateway; **confirm the exact `api.registerTool` signature +
   manifest schema** for that version **[confirm-at-integration]**; align `index.ts`.
2. Validate `openclaw.plugin.json` against the gateway's manifest validator; set `compat`
   to the installed version range.
3. Install from local dir → test the three tools end-to-end → publish to ClawHub (and/or npm/git).
**DoD:** the plugin installs on a real gateway; `proofsource_ask` returns a cited, paid
answer; manifest validates; listed on ClawHub.
**Depends:** PS6-00.

### PS6-03 — x402 / Gateway **seller** as a deployable package  `packages/x402-seller`
**Goal:** the missing surface — expose ProofSource content as Gateway-batched x402 endpoints
that *other* agents pay.
**Files:** new `packages/x402-seller/` (promote `examples/arc-live/src/seller.ts` to a real
service), wired to the core via `@proofsource/sdk`.
**Steps:**
1. Serve priced resources behind x402 **Gateway-batched** terms (`PAYMENT-REQUIRED` header
   dialect — matches the Arc builders); on payment, deliver + record a receipt via the core.
2. Map each paid endpoint to a creator/provider so external payments accrue as real
   earnings + traction.
3. Deploy (testnet → mainnet behind the Phase 1 flag); document the endpoint catalog.
**DoD:** an external agent pays a ProofSource x402 endpoint on testnet (arcscan-verifiable),
the seller delivers, and the payment shows up as creator earnings; dialect interoperable with
other Arc x402 buyers.
**Depends:** Phase 1; PS6-00.

### PS6-04 — Integrations on the live site  ✅ done
**Goal:** make the surfaces visible to anyone clicking the live link.
**Files:** `apps/api/public/index.html` (Developers screen — *Integrations* section).
**Status:** shipped — MCP / OpenClaw / SDK / x402 with one-line installs are on the
Developers page. Keep the commands in sync with published package names as PS6-00..03 land.
**DoD:** install one-liners visible on the deployed site; commands match published packages.

### PS6-05 — Cross-team interoperability (enter the loops)
**Goal:** be a real buyer *and* seller in the Arc builder ecosystem.
**Files:** `integrations/payments/*`, the x402 seller.
**Steps:**
1. Ensure buyer + seller both speak **Gateway-batched** (header dialect); optionally bridge
   plain-body EIP-3009 for teams that need it (post-core, clearly separated).
2. Pay another team's x402 endpoint from ProofSource's agent; let another team's agent pay
   yours; record both as real cross-team settlements.
3. Report via `arc-canteen update traction`.
**DoD:** at least one real inbound and one real outbound cross-team payment, each
arcscan-verifiable and reflected in traction.
**Depends:** PS6-03.

---

## Phase-6 exit criteria
- `@proofsource/sdk` and `@proofsource/mcp` published; `claude mcp add proofsource` works.
- OpenClaw plugin installs from ClawHub and pays creators per citation.
- x402 seller deployed; external agents pay it; payments become real creator earnings.
- Integrations visible on the live site, commands matching published packages.
- At least one real cross-team payment in each direction, reported via `arc-canteen`.
- Every surface settles on the same core (Phase 1) — no surface has its own shadow payment
  path; all are observable and reconciled.

> All surfaces are doors into one engine. None produce real value until Phase 1 settlement is
> green; once it is, each door turns real usage into real, on-chain, attributable payouts.
