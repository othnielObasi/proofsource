import Fastify from "fastify";
import { seed } from "./seed.js";
import { registerRoutes } from "./routes.js";
import { persistence } from "./persistence/index.js";
import { ensureBootstrapAdmin } from "./modules/auth/index.js";

// Singleton — Vercel reuses warm lambda instances across requests.
let _app: ReturnType<typeof Fastify> | null = null;

export async function createApp() {
  if (_app) return _app;
  const app = Fastify({ logger: false });
  await registerRoutes(app);
  const restored = await persistence.restore();
  if (!restored) seed();
  ensureBootstrapAdmin();
  await app.ready();
  _app = app;
  return app;
}
