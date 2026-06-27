import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { env } from "./env.js";
import { seed } from "./seed.js";
import { registerRoutes } from "./routes.js";
import { persistence } from "./persistence/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const app = Fastify({ logger: false });
  await app.register(fastifyStatic, { root: join(__dirname, "..", "public"), prefix: "/" });
  // Serve the redesign at /app  (__dirname = apps/api/src → 4 levels up = proofsource root)
  await app.register(fastifyStatic, {
    root: join(__dirname, "..", "..", "..", "..", "redesign"),
    prefix: "/app/",
    decorateReply: false,
  });
  await registerRoutes(app);

  // Restore accrued state if present; otherwise seed a fresh demo.
  const restored = await persistence.restore();
  if (!restored) seed();

  await app.listen({ port: env.port, host: "0.0.0.0" });
  console.log(`ProofSource API on http://localhost:${env.port}  (payment mode: ${env.paymentMode})`);
  console.log(`Persistence: ${persistence.backendName}${restored ? " (state restored)" : " (seeded)"}`);
  console.log(`Console: http://localhost:${env.port}/`);
}
main().catch((e) => { console.error(e); process.exit(1); });

