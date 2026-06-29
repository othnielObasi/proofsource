// ProofSource OpenClaw / OpenAI-compatible plugin server.
// Serves the plugin manifest and OpenAPI spec, and proxies /ask → ProofSource agent/run.
//
// Usage:
//   PROOFSOURCE_API_KEY=ps_live_... node src/index.js
//
// Env vars:
//   PROOFSOURCE_API_KEY      — operator API key (ps_live_...)
//   PROOFSOURCE_BASE_URL     — ProofSource deployment URL (default: https://proofsource-mu.vercel.app)
//   PLUGIN_URL               — public URL this server is reachable at (for manifest links)
//   PORT                     — port to listen on (default: 3100)

import http from "node:http";

const BASE_URL = (process.env.PROOFSOURCE_BASE_URL ?? "https://proofsource-mu.vercel.app").replace(/\/$/, "");
const API_KEY = process.env.PROOFSOURCE_API_KEY ?? "";
const PLUGIN_URL = (process.env.PLUGIN_URL ?? "http://localhost:3100").replace(/\/$/, "");
const PORT = Number(process.env.PORT ?? 3100);

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-proofsource-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(payload);
}

function yaml(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "text/yaml",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

const MANIFEST = {
  schema_version: "v1",
  name_for_human: "ProofSource",
  name_for_model: "proofsource",
  description_for_human:
    "Pay sources your AI cites. ProofSource settles sub-cent USDC nanopayments to creators on Arc with verifiable receipts.",
  description_for_model:
    "Use ProofSource to answer research questions. POST /ask with { question } to run the full pipeline: discover → decide → buy → verify → settle. Every cited creator is paid in USDC on Arc and the response includes citation receipts.",
  auth: {
    type: "service_http",
    authorization_type: "custom",
    custom_auth_header: "x-proofsource-key",
  },
  api: { type: "openapi", url: `${PLUGIN_URL}/openapi.yaml` },
  logo_url: `${BASE_URL}/favicon.ico`,
  contact_email: "hello@proofsource.ai",
  legal_info_url: BASE_URL,
};

function getOpenApiYaml() {
  return `openapi: "3.1.0"
info:
  title: ProofSource Plugin API
  version: "1.0.0"
  description: Pay creators for every source your agent cites.
servers:
  - url: "${PLUGIN_URL}"
security:
  - apiKey: []
components:
  securitySchemes:
    apiKey:
      type: apiKey
      in: header
      name: x-proofsource-key
paths:
  /ask:
    post:
      operationId: askAgent
      summary: Ask a research question and pay cited sources
      security:
        - apiKey: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [question]
              properties:
                question:
                  type: string
                  description: The research question to answer.
                workspaceId:
                  type: string
                  description: Operator workspace id (optional).
      responses:
        "200":
          description: Agent run result with answer and citation receipts
          content:
            application/json:
              schema:
                type: object
                properties:
                  answer:
                    type: string
                  decision:
                    type: object
                  sources:
                    type: array
                    items:
                      type: object
                  spend:
                    type: object
        "401":
          description: Missing or invalid API key
`;
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-proofsource-key",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    });
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/.well-known/ai-plugin.json") {
    return json(res, 200, MANIFEST);
  }

  if (req.method === "GET" && url.pathname === "/openapi.yaml") {
    return yaml(res, 200, getOpenApiYaml());
  }

  if (req.method === "POST" && url.pathname === "/ask") {
    const callerKey = req.headers["x-proofsource-key"] ?? API_KEY;
    if (!callerKey) return json(res, 401, { error: "x-proofsource-key header required" });
    const body = await readBody(req);
    if (!body.question) return json(res, 400, { error: "question is required" });
    try {
      const upstream = await fetch(`${BASE_URL}/v1/proofsource/agent/run`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-proofsource-key": String(callerKey),
        },
        body: JSON.stringify({ question: body.question, ...(body.workspaceId ? { workspaceId: body.workspaceId } : {}) }),
      });
      const data = await upstream.json();
      return json(res, upstream.status, data);
    } catch (e) {
      return json(res, 502, { error: `Upstream error: ${e.message}` });
    }
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`ProofSource OpenClaw plugin server listening on port ${PORT}`);
  console.log(`  Manifest : ${PLUGIN_URL}/.well-known/ai-plugin.json`);
  console.log(`  OpenAPI  : ${PLUGIN_URL}/openapi.yaml`);
  console.log(`  Ask      : POST ${PLUGIN_URL}/ask`);
});
