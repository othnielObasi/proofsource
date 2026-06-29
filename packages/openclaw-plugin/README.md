# @proofsource/openclaw-plugin

OpenAI-compatible plugin server for ProofSource. Serves the plugin manifest, OpenAPI spec, and proxies `/ask` to the ProofSource API — so any GPT Actions or OpenClaw-compatible client can pay sources it cites.

## Setup

```bash
cd packages/openclaw-plugin
# no extra deps needed — uses Node built-ins
node src/index.js
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PROOFSOURCE_API_KEY` | Yes | Operator API key (`ps_live_...`) |
| `PROOFSOURCE_BASE_URL` | No | ProofSource deployment URL (default: `https://proofsource-mu.vercel.app`) |
| `PLUGIN_URL` | No | Public URL this plugin server is reachable at — used in manifest/spec links (default: `http://localhost:3100`) |
| `PORT` | No | Port to listen on (default: `3100`) |

## Run

```bash
PROOFSOURCE_API_KEY=ps_live_... PLUGIN_URL=https://your-plugin.example.com node src/index.js
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/.well-known/ai-plugin.json` | OpenAI / OpenClaw plugin manifest |
| `GET` | `/openapi.yaml` | OpenAPI 3.1 spec |
| `POST` | `/ask` | Proxy to ProofSource `/v1/proofsource/agent/run` |

## Adding to ChatGPT / OpenClaw

1. Run the plugin server with a public URL (e.g. via ngrok or a cloud deployment).
2. In ChatGPT Plugins or OpenClaw, add a new plugin using the manifest URL:
   `https://your-plugin-url/.well-known/ai-plugin.json`
3. Set your `PROOFSOURCE_API_KEY` in the plugin server environment — it will be forwarded to ProofSource.

## OpenClaw plugin (index.ts)

The `index.ts` file at the package root is the OpenClaw native plugin entry (activated via the gateway's `openclaw.plugin.json` extension point). It registers `proofsource_ask`, `proofsource_traction`, and `proofsource_creator_earnings` tools directly into the OpenClaw runtime — no HTTP server needed when running inside the gateway.
