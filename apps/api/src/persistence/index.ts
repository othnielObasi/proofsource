// Pluggable durability for the snapshot. Default backend is a JSON file (works
// everywhere, zero setup, survives restart). Set PERSIST_BACKEND=postgres + DATABASE_URL
// to store the snapshot in Postgres instead (uses `pg`, loaded lazily so the core never
// hard-depends on it). Saves are debounced and off the request hot path.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toSnapshot, loadSnapshot, isEmptySnapshot, type Snapshot } from "./snapshot.js";

const require = createRequire(import.meta.url);

interface Backend {
  name: string;
  load(): Promise<Snapshot | null>;
  save(s: Snapshot): Promise<void>;
}

const DEFAULT_FILE = join(
  dirname(fileURLToPath(import.meta.url)), "..", "..", ".data", "state.json"
);

class FileBackend implements Backend {
  name = "file";
  constructor(private path = process.env.PERSIST_FILE ?? DEFAULT_FILE) {}
  async load(): Promise<Snapshot | null> {
    if (!existsSync(this.path)) return null;
    try { return JSON.parse(readFileSync(this.path, "utf8")) as Snapshot; }
    catch { return null; }
  }
  async save(s: Snapshot): Promise<void> {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(s));
  }
}

class PostgresBackend implements Backend {
  name = "postgres";
  private pool: any;
  private async client() {
    if (this.pool) return this.pool;
    const pg: any = require("pg");
    this.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS proofsource_snapshot (
         id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz DEFAULT now())`
    );
    return this.pool;
  }
  async load(): Promise<Snapshot | null> {
    const c = await this.client();
    const r = await c.query("SELECT data FROM proofsource_snapshot WHERE id = 'default'");
    return r.rows[0]?.data ?? null;
  }
  async save(s: Snapshot): Promise<void> {
    const c = await this.client();
    await c.query(
      `INSERT INTO proofsource_snapshot (id, data, updated_at) VALUES ('default', $1, now())
       ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = now()`,
      [JSON.stringify(s)]
    );
  }
}

function backend(): Backend {
  if (process.env.PERSIST_BACKEND === "postgres" && process.env.DATABASE_URL) {
    return new PostgresBackend();
  }
  return new FileBackend();
}

const be = backend();
let timer: NodeJS.Timeout | null = null;

export const persistence = {
  backendName: be.name,
  /** Load durable state into the store on boot. Returns true if state was restored. */
  async restore(): Promise<boolean> {
    if (process.env.PERSIST_DISABLED === "true") return false;
    const snap = await be.load();
    if (isEmptySnapshot(snap)) return false;
    loadSnapshot(snap!);
    return true;
  },
  /** Persist immediately. */
  async saveNow(): Promise<void> {
    if (process.env.PERSIST_DISABLED === "true") return;
    await be.save(toSnapshot());
  },
  /** Debounced save (call after writes; coalesces bursts). */
  scheduleSave(ms = 800): void {
    if (process.env.PERSIST_DISABLED === "true") return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void be.save(toSnapshot()); }, ms);
  },
};
