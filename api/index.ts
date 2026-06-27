// Vercel serverless handler — wraps Fastify via inject() so the same
// route logic runs locally (npm start) and in Vercel lambdas.
import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../apps/api/src/app.js";

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  const m = (req.method ?? "GET").toUpperCase();
  if (!["POST", "PUT", "PATCH"].includes(m)) return undefined;
  return new Promise<Buffer>((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await createApp();
  const payload = await readBody(req);
  const response = await (app as any).inject({
    method: req.method ?? "GET",
    url: req.url ?? "/",
    headers: req.headers,
    payload,
  });
  res.statusCode = response.statusCode;
  for (const [k, v] of Object.entries(response.headers)) {
    if (v != null) res.setHeader(k, String(v));
  }
  res.end(response.rawPayload);
}
