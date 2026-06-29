/* ProofSource — Solutions + Developers pages. Exports window.Solutions, window.Developers. */

/* ── Solutions ────────────────────────────────────────────── */

function UseCard({ tag, title, body, accent }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(1)} onMouseLeave={() => setH(0)} style={{ background: 'var(--card-fill)', border: '1px solid ' + (h ? (accent === 'earn' ? 'var(--earned-line)' : '#2c5a70') : 'var(--line)'), borderRadius: 16, padding: 22, transition: 'border-color .2s, transform .2s', transform: h ? 'translateY(-2px)' : 'none' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: accent === 'earn' ? 'var(--earned2)' : 'var(--buy)', letterSpacing: '.06em' }}>{tag}</div>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 21, letterSpacing: '-.035em', margin: '10px 0 8px' }}>{title}</h3>
      <p style={{ color: 'var(--mut)', fontSize: 14, lineHeight: 1.55, margin: 0 }}>{body}</p>
    </div>
  );
}

function Solutions({ go }) {
  const aud = window.__audience || 'creators';
  const leadCreator = aud !== 'operators';
  return (
    <div className="page" style={{ maxWidth: 1180, margin: '0 auto', padding: '52px 26px 70px' }}>
      <SectionHead eyebrow={leadCreator ? 'For creators & operators' : 'For operators & creators'} tone={leadCreator ? 'earned' : 'buy'} title="One floor. Two sides. Every citation accounted for." lead="Creators price their work and watch it earn. Operators give an agent a budget and a policy and let it pay per use. The settlement layer keeps both sides honest." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 34 }} className="sol-doors">
        <div style={{ background: 'linear-gradient(180deg,rgba(84,180,136,.08),var(--ink2))', border: '1px solid var(--earned-line)', borderRadius: 18, padding: 26 }}>
          <Eyebrow tone="earned">Creators</Eyebrow>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, letterSpacing: '-.04em', margin: '0 0 10px', color: 'var(--earned2)' }}>Get paid every time AI cites you.</h3>
          <p style={{ color: 'var(--mut)', fontSize: 14.5, lineHeight: 1.55, margin: '0 0 18px' }}>Connect a feed, set a sub-cent price, add a wallet — or let us manage one for you. Earnings land with a receipt the moment an agent grounds an answer in your work.</p>
          <Btn variant="earn" onClick={() => go('demo')}>See a creator earn →</Btn>
        </div>
        <div style={{ background: 'linear-gradient(180deg,rgba(91,192,235,.07),var(--ink2))', border: '1px solid #2c5a70', borderRadius: 18, padding: 26 }}>
          <Eyebrow tone="buy">Operators</Eyebrow>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, letterSpacing: '-.04em', margin: '0 0 10px', color: 'var(--buy)' }}>Pay sources by the rules you set.</h3>
          <p style={{ color: 'var(--mut)', fontSize: 14.5, lineHeight: 1.55, margin: '0 0 18px' }}>Hand your agent a budget, a per-task ceiling, a max price, and preferred or blocked creators. It buys only what clears the bar — and never uses a source without paying.</p>
          <Btn variant="primary" onClick={() => go('demo')}>Watch an agent decide →</Btn>
        </div>
      </div>

      <div style={{ marginTop: 44 }}>
        <SectionHead eyebrow="Where it fits" title="Built for content that earns every time it's cited." style={{ marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }} className="use-grid">
          {PS_DATA.useCases.map((u, i) => <UseCard key={i} {...u} accent={i < 2 ? 'earn' : 'buy'} />)}
        </div>
      </div>

      <div style={{ marginTop: 44, background: 'var(--card-fill)', border: '1px solid var(--line)', borderRadius: 18, padding: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }} className="integ-grid">
          {[
            { t: 'Probabilistic where it helps', d: 'An LLM ranks relevance and drafts the answer. It decides what to buy — never whether a payment releases.' },
            { t: 'Deterministic where it counts', d: 'Payment releases only when verifyDelivery() passes seven checks. Idempotency keys prevent double-settlement.' },
            { t: 'Auditable end to end', d: 'Every state transition writes an audit event. Every citation leaves a tamper-evident receipt.' },
          ].map((c, i) => (
            <div key={i}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: i === 1 ? 'var(--buy)' : 'var(--earned)', boxShadow: i === 1 ? 'var(--glow-buy)' : 'var(--glow-earned)', marginBottom: 12 }} />
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '-.03em', margin: '0 0 7px' }}>{c.t}</h4>
              <p style={{ color: 'var(--mut)', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Developer page constants ─────────────────────────────── */

const DEV_BASE = 'https://proofsource-mu.vercel.app';

const INT_CODE = {
  rest: `# 1. Register as an operator and receive your API key
curl -X POST ${DEV_BASE}/v1/proofsource/auth/register \\
  -H "content-type: application/json" \\
  -d '{"name":"Acme Research","email":"you@acme.com","password":"...","role":"operator"}'
# → { "token": "eyJ...", "apiKey": "ps_live_<32hex>", "account": {...} }

# 2. Run the paying agent
curl -X POST ${DEV_BASE}/v1/proofsource/agent/run \\
  -H "x-proofsource-key: ps_live_..." \\
  -H "content-type: application/json" \\
  -d '{"question":"What are the key arguments around AI content licensing?"}'

# 3. Fetch a receipt
curl ${DEV_BASE}/v1/proofsource/receipts/rcpt_...`,

  sdk: `npm install @proofsource/sdk

// TypeScript / Node.js
import { ProofSource } from "@proofsource/sdk";

const ps = new ProofSource({
  baseUrl: "${DEV_BASE}",
  apiKey: "ps_live_...",   // your operator key
});

// Run the paying agent
const res = await ps.ask({
  question: "What are the key arguments around AI content licensing?",
});

console.log(res.decision.action);       // "BUY" | "REUSE" | "SKIP"
console.log(res.answer);                // cited, grounded answer
console.log(res.spend.totalUsdc);       // "0.002000"
console.log(res.sources[0].receiptId);  // tamper-evident proof on Arc

// Configure your mandate (budget + policy)
await ps.mandate({
  budgetUsdc: "10.00",
  perTaskMaxUsdc: "0.05",
  maxPricePerSourceUsdc: "0.01",
  requireCitation: true,
});

// Ingest a creator's RSS feed
await ps.connectFeed({
  name: "Knowingly — AI & Media",
  feedUrl: "https://rsshub.app/substack/knowingly",
  pricePerCitationUsdc: "0.002",
});

// Get your earnings (creator accounts)
const earnings = await ps.earnings(providerId);`,

  mcp: `# Claude Code — one command
claude mcp add proofsource -- npx -y @proofsource/mcp

# Claude Desktop — claude_desktop_config.json
# (macOS: ~/Library/Application Support/Claude/claude_desktop_config.json)
{
  "mcpServers": {
    "proofsource": {
      "command": "npx",
      "args": ["-y", "@proofsource/mcp"],
      "env": {
        "PROOFSOURCE_BASE_URL": "${DEV_BASE}",
        "PROOFSOURCE_API_KEY": "ps_live_...",
        "PROOFSOURCE_WORKSPACE_ID": "ws_..."
      }
    }
  }
}

# Cursor — Settings → MCP → same JSON block above

# Tools Claude / Cursor can now call:
#   proofSource_ask(question)     → pays & cites sources, returns grounded answer
#   proofSource_decide(question)  → previews decision without spending
#   proofSource_traction()        → live platform metrics`,

  openclaw: `# Start the sidecar plugin (port 3100 by default)
PROOFSOURCE_API_KEY=ps_live_... npx @proofsource/openclaw-plugin

# Environment variables:
#   PROOFSOURCE_API_KEY   your ps_live_... operator key     (required)
#   PROOFSOURCE_BASE_URL  override the API base             (default: ${DEV_BASE})
#   PLUGIN_URL            public URL of this sidecar        (default: http://localhost:3100)
#   PORT                  local port                         (default: 3100)

# URLs served:
#   GET  /.well-known/ai-plugin.json   plugin manifest (import into Claude.ai / GPT Actions)
#   GET  /openapi.yaml                 OpenAPI 3.1 spec (import into Codex)
#   POST /ask { question }             proxies to ProofSource agent/run

# Import into Claude.ai:
#   Settings → Plugins → Add plugin → paste: http://localhost:3100

# Import into OpenAI Codex / GPT Actions:
#   Actions → Import → paste: ${DEV_BASE}/openapi.json`,
};

const RESPONSE_JSON = `{
  // ── Decision ──────────────────────────────────────────────
  "decision": {
    "action": "BUY",                        // BUY | REUSE | SKIP
    "reasoning": "Highest value-per-cent permitted source clears the bar.",
    "scores": [{
      "resourceId":  "res_a7f4c2...",
      "title":       "The case for per-use content licensing",
      "providerId":  "prov_3c12ab...",
      "relevance":    0.92,                  // 0–1 task-relevance
      "priceUsdc":   "0.002000",
      "verdict":     "bought"               // bought | reused | skipped | blocked
    }],
    "budgetRemainingUsdc": "4.998000"
  },

  // ── Grounded answer ───────────────────────────────────────
  "answer": "The strongest arguments converge on per-use compensation…",

  // ── Paid sources (one per purchased citation) ─────────────
  "sources": [{
    "receiptId":      "rcpt_88214f9c...",   // fetch at GET /receipts/:id
    "providerName":   "Ada Powell",
    "deliveryHash":   "sha256:9f3a4c...",   // tamper-evident content hash
    "paymentStatus":  "released"            // confirmed on Arc / USDC
  }],

  // ── Spend summary ─────────────────────────────────────────
  "spend": {
    "totalUsdc": "0.002000",
    "sources": 1
  },

  // ── Settlement lifecycle trace ────────────────────────────
  "trace": [
    { "step": "discover",  "status": "ok", "detail": "3 candidates found" },
    { "step": "decide",    "status": "ok", "detail": "BUY res_a7f4c2 (value/cent: 184)" },
    { "step": "authorize", "status": "ok", "detail": "x402 challenge issued" },
    { "step": "deliver",   "status": "ok", "detail": "content hash: sha256:9f3a…" },
    { "step": "verify",    "status": "ok", "detail": "7/7 checks passed" },
    { "step": "release",   "status": "ok", "detail": "Arc tx: 0x3f7c…" },
    { "step": "receipt",   "status": "ok", "detail": "rcpt_88214f9c" }
  ]
}`;

const ENDPOINTS_FULL = [
  {
    m: 'POST', p: '/v1/proofsource/auth/register', auth: 'none',
    params: 'name, email, password, role ("operator"|"creator")',
    returns: 'token · account · apiKey (operators only)',
    note: 'Operators immediately receive a ps_live_<32hex> key. Store it — it is only returned here and at /auth/me.',
  },
  {
    m: 'POST', p: '/v1/proofsource/auth/login', auth: 'none',
    params: 'email, password',
    returns: 'token · account · apiKey (if operator)',
    note: 'Returns a 30-day HMAC-SHA256 JWT. Cold-start safe — no shared session store needed.',
  },
  {
    m: 'GET', p: '/v1/proofsource/auth/me', auth: 'JWT',
    params: '—',
    returns: 'account object including apiKey for operator accounts',
    note: 'Use this to retrieve your key after logging in if you did not save it at registration.',
  },
  {
    m: 'POST', p: '/v1/proofsource/auth/apikey/regenerate', auth: 'JWT',
    params: '—',
    returns: 'new apiKey string',
    note: 'Rotates the ps_live_ key. Old key immediately invalid. Use /auth/me to confirm.',
  },
  {
    m: 'POST', p: '/v1/proofsource/agent/run', auth: 'API key',
    params: 'question (string) · workspaceId? (default: ws_demo)',
    returns: 'decision · answer · sources · spend · trace',
    note: 'Pass key as x-proofsource-key header or Authorization: Bearer <key>. No browser session needed.',
  },
  {
    m: 'GET', p: '/v1/proofsource/mandate', auth: 'JWT',
    params: '?workspaceId=ws_...',
    returns: 'budgetUsdc · perTaskMaxUsdc · maxPricePerSourceUsdc · requireCitation · budgetRemainingUsdc',
    note: 'Returns the current policy + remaining budget for the workspace.',
  },
  {
    m: 'PUT', p: '/v1/proofsource/mandate', auth: 'JWT',
    params: 'workspaceId · budgetUsdc · perTaskMaxUsdc · maxPricePerSourceUsdc · requireCitation',
    returns: 'updated mandate object',
    note: 'The agent strictly obeys this mandate on every run. It can decline a source but cannot use one without paying.',
  },
  {
    m: 'POST', p: '/v1/proofsource/connectors/rss/ingest', auth: 'JWT',
    params: 'name · feedUrl · pricePerCitationUsdc · walletAddress?',
    returns: 'providerId · resources[] (title, resourceId, hash, price)',
    note: 'Accepts any RSS/Atom URL or RSSHub route. Each article is hashed, priced, and listed as a permitted source.',
  },
  {
    m: 'GET', p: '/v1/proofsource/receipts/:id', auth: 'none',
    params: 'id (path param)',
    returns: 'receipt with deliveryHash · receiptHash · chainReference (Arc tx + explorerUrl)',
    note: 'Public — no auth needed. chainReference.explorerUrl links to ArcScan.',
  },
  {
    m: 'GET', p: '/v1/proofsource/receipts', auth: 'none',
    params: '—',
    returns: 'last 24 settlements enriched with providerName, resourceTitle, amountUsdc',
    note: 'Used by the Traction dashboard. Returns real-time settled data.',
  },
  {
    m: 'GET', p: '/v1/proofsource/dashboard/traction', auth: 'none',
    params: '—',
    returns: 'totalPayoutUsdc · paymentCount · avgTransactionUsdc · creatorsEarning · reuseRate · perCreator[]',
    note: 'Platform-wide metrics. Real numbers derived from settled receipts — not seeded.',
  },
  {
    m: 'GET', p: '/openapi.json', auth: 'none',
    params: '—',
    returns: 'OpenAPI 3.1 specification',
    note: 'Import into Codex, GPT Actions, Postman, or Insomnia.',
  },
  {
    m: 'GET', p: '/.well-known/ai-plugin.json', auth: 'none',
    params: '—',
    returns: 'OpenAI plugin manifest',
    note: 'Use the OpenClaw plugin sidecar for a local version that proxies to your key.',
  },
];

const ERROR_CODES = [
  { code: '400', title: 'Bad Request', when: 'Missing required field or malformed JSON', fix: 'Check your request body against the API reference above' },
  { code: '401', title: 'Unauthorized', when: 'Missing, expired, or invalid JWT token', fix: 'Re-authenticate via /auth/login and use the returned token' },
  { code: '403', title: 'Forbidden', when: 'Invalid API key (ps_live_...) or source blocked by mandate', fix: 'Verify key via GET /auth/me. For mandate blocks, check blockedCreators or raise the ceiling' },
  { code: '404', title: 'Not Found', when: 'Receipt, workspace, or resource ID not found', fix: 'IDs come from prior agent/run responses — verify they match' },
  { code: '429', title: 'Rate Limited', when: 'Too many requests in a short window', fix: 'Back off and retry with exponential delay' },
];

const NPM_PKGS = [
  {
    name: '@proofsource/sdk',
    install: 'npm install @proofsource/sdk',
    tag: 'JS / TypeScript client',
    desc: 'Typed client with zero dependencies. ask(), decide(), mandate(), connectFeed(), traction(), earnings(), regenerateApiKey(). Works in Node.js, Deno, Bun, and Edge runtimes.',
    tone: 'buy',
    link: 'https://npmjs.com/package/@proofsource/sdk',
  },
  {
    name: '@proofsource/mcp',
    install: 'npx -y @proofsource/mcp',
    tag: 'MCP server',
    desc: 'Model Context Protocol server. Exposes proofSource_ask, proofSource_decide, proofSource_traction to Claude Desktop, Cursor, Windsurf, and Claude Code. One command to wire it in.',
    tone: 'earned',
    link: 'https://npmjs.com/package/@proofsource/mcp',
  },
  {
    name: '@proofsource/openclaw-plugin',
    install: 'npx @proofsource/openclaw-plugin',
    tag: 'OpenAI plugin sidecar',
    desc: 'Zero-dependency Node http server. Serves /.well-known/ai-plugin.json and POST /ask. Compatible with Claude.ai plugins, GPT Actions, and any OpenAI-compatible assistant.',
    tone: 'skip',
    link: 'https://npmjs.com/package/@proofsource/openclaw-plugin',
  },
];

/* ── Helper components ────────────────────────────────────── */

function CodeBlock({ code, lang, id, copied, onCopy }) {
  return (
    <div style={{ background: '#06080d', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.02)' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <i style={{ width: 9, height: 9, borderRadius: 99, background: '#E06A5E' }} />
          <i style={{ width: 9, height: 9, borderRadius: 99, background: '#E0A458' }} />
          <i style={{ width: 9, height: 9, borderRadius: 99, background: '#54B488' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)', marginLeft: 6 }}>{lang}</span>
        </div>
        <button onClick={() => onCopy(id, code)} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: copied === id ? 'var(--earned2)' : 'var(--faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
          {copied === id ? '✓ copied' : 'copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '18px 20px', overflow: 'auto', color: '#C8D3E6', fontSize: 12.5, lineHeight: 1.72, fontFamily: 'var(--font-mono)', whiteSpace: 'pre' }}>{code}</pre>
    </div>
  );
}

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '52px 0 28px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
    </div>
  );
}

/* ── Developers page ──────────────────────────────────────── */

function Developers({ go }) {
  const [tab, setTab] = useState('rest');
  const [copied, setCopied] = useState(null);

  function copy(key, text) {
    try { navigator.clipboard.writeText(text); } catch {}
    setCopied(key);
    setTimeout(() => setCopied(null), 2200);
  }

  const INT_TABS = [
    { id: 'rest',      label: 'REST API',      sub: 'curl · any language' },
    { id: 'sdk',       label: 'Node SDK',       sub: 'npm i @proofsource/sdk' },
    { id: 'mcp',       label: 'MCP',            sub: 'Claude · Cursor · Windsurf' },
    { id: 'openclaw',  label: 'OpenClaw',       sub: 'Claude.ai · GPT Actions' },
  ];

  const INT_LANG = { rest: 'bash', sdk: 'typescript', mcp: 'json / bash', openclaw: 'bash' };

  const labS = { fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, margin: '0 0 14px', display: 'block' };

  return (
    <div className="page" style={{ maxWidth: 1120, margin: '0 auto', padding: '52px 26px 90px' }}>

      {/* ── Hero ────────────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--buy)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: 10 }}>API reference · developer guide</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(36px,5vw,60px)', letterSpacing: '-.055em', lineHeight: 1.0, margin: '0 0 18px' }}>
          Build with the<br /><em style={{ fontStyle: 'normal', color: 'var(--buy)' }}>settlement floor.</em>
        </h1>
        <p style={{ fontSize: 17, color: 'var(--mut)', lineHeight: 1.6, maxWidth: 600, margin: '0 0 28px' }}>
          One API call. Your agent scores permitted sources, decides what to buy, pays x402, verifies delivery on-chain, and returns a grounded answer with a tamper-evident receipt — every time.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Btn variant="primary" onClick={() => go('auth')}>Get an API key →</Btn>
          <Btn variant="outline" onClick={() => go('demo')}>Watch the live demo</Btn>
        </div>
      </div>

      {/* ── Three concepts ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 0 }} className="integ-grid">
        {[
          {
            icon: 'var(--buy)', label: 'Mandate',
            title: 'You set the rules',
            body: 'A mandate is the standing policy your agent obeys. Set a budget, a per-task ceiling, a max price per source, and whether answers must cite a paid source. The agent can decline a source but cannot use one without paying.',
          },
          {
            icon: 'var(--skip)', label: 'Agent run',
            title: 'One call does everything',
            body: 'POST /agent/run with a question. Internally: score candidates → decide BUY / REUSE / SKIP → authorize x402 → deliver content → 7-check verify → release payment on Arc → seal receipt → return grounded answer.',
          },
          {
            icon: 'var(--earned)', label: 'Receipt',
            title: 'Proof on Arc',
            body: 'Every BUY produces a tamper-evident receipt: delivery hash, receipt hash, and a live Arc testnet transaction. Receipts are public — anyone can verify a citation was paid. Store receiptId to prove provenance.',
          },
        ].map((c, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: c.icon, boxShadow: `0 0 8px ${c.icon}` }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{c.label}</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, letterSpacing: '-.03em', margin: '0 0 8px' }}>{c.title}</h3>
            <p style={{ color: 'var(--mut)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{c.body}</p>
          </div>
        ))}
      </div>

      {/* ── Quickstart ──────────────────────────────────── */}
      <SectionDivider label="5-minute quickstart" />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 18, marginBottom: 0 }} className="dev-grid">
        <div>
          {[
            {
              n: '01', t: 'Create an operator account',
              d: 'Sign up at proofsource-mu.vercel.app, choose "I run agents." Your ps_live_<32hex> key is returned immediately on registration and available anytime at GET /auth/me.',
              code: `curl -X POST ${DEV_BASE}/v1/proofsource/auth/register \\
  -H "content-type: application/json" \\
  -d '{
    "name": "Acme Research",
    "email": "you@acme.com",
    "password": "...",
    "role": "operator"
  }'
# → { "apiKey": "ps_live_...", "token": "eyJ...", "account": {...} }`,
            },
            {
              n: '02', t: 'Seed or ingest sources',
              d: 'The demo endpoint auto-seeds licensed content for testing. In production, POST /connectors/rss/ingest to list creator feeds — each article becomes a priced, hash-verified resource.',
              code: `# Quick seed for testing (no auth needed)
curl -X POST ${DEV_BASE}/v1/proofsource/demo/seed

# Or ingest a real RSS/Atom/RSSHub feed
curl -X POST ${DEV_BASE}/v1/proofsource/connectors/rss/ingest \\
  -H "Authorization: Bearer eyJ..." \\
  -H "content-type: application/json" \\
  -d '{
    "name": "Knowingly — AI & Media",
    "feedUrl": "https://rsshub.app/substack/knowingly",
    "pricePerCitationUsdc": "0.002"
  }'`,
            },
            {
              n: '03', t: 'Set your mandate',
              d: 'Configure your agent\'s budget and policy. The agent strictly obeys this — it can decline a source, but cannot use one without paying within these limits.',
              code: `curl -X PUT ${DEV_BASE}/v1/proofsource/mandate \\
  -H "Authorization: Bearer eyJ..." \\
  -H "content-type: application/json" \\
  -d '{
    "workspaceId": "ws_demo",
    "budgetUsdc": "10.00",
    "perTaskMaxUsdc": "0.05",
    "maxPricePerSourceUsdc": "0.01",
    "requireCitation": true
  }'`,
            },
            {
              n: '04', t: 'Run the agent and read the receipt',
              d: 'One call returns the decision, grounded answer, all source scores, spend, and receipt IDs. The trace shows every step of the settlement lifecycle.',
              code: `curl -X POST ${DEV_BASE}/v1/proofsource/agent/run \\
  -H "x-proofsource-key: ps_live_..." \\
  -H "content-type: application/json" \\
  -d '{"question":"Key arguments around AI content licensing?"}' | jq .

# → { "decision": { "action": "BUY", ... },
#     "answer": "...",
#     "sources": [{ "receiptId": "rcpt_...", ... }],
#     "spend": { "totalUsdc": "0.002000" } }

# Verify the receipt
curl ${DEV_BASE}/v1/proofsource/receipts/rcpt_...`,
            },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: i < 3 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 99, display: 'grid', placeItems: 'center', background: 'rgba(91,192,235,.08)', border: '1px solid rgba(91,192,235,.22)', color: 'var(--buy)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{s.n}</span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '-.03em', margin: 0 }}>{s.t}</h3>
              </div>
              <p style={{ color: 'var(--mut)', fontSize: 13.5, lineHeight: 1.55, margin: '0 0 14px', paddingLeft: 42 }}>{s.d}</p>
              <div style={{ paddingLeft: 42 }}>
                <CodeBlock code={s.code} lang="bash" id={'qs' + i} copied={copied} onCopy={copy} />
              </div>
            </div>
          ))}
        </div>

        {/* Right: response anatomy */}
        <div>
          <div style={{ position: 'sticky', top: 20 }}>
            <div style={labS}>Response from /agent/run</div>
            <CodeBlock code={RESPONSE_JSON} lang="json · annotated" id="response" copied={copied} onCopy={copy} />
            <div style={{ marginTop: 16, background: 'rgba(84,180,136,.05)', border: '1px solid rgba(84,180,136,.18)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--earned2)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, marginBottom: 8 }}>What to store</div>
              {[
                ['sources[].receiptId', 'Tamper-evident proof of payment. Verifiable at /receipts/:id'],
                ['decision.action', '"BUY" means content was paid for. "REUSE" means you already own it. "SKIP" means nothing cleared the floor.'],
                ['spend.totalUsdc', 'Deducted from workspace budget. Use budgetRemainingUsdc to track headroom.'],
                ['trace[].step', 'Full audit trail — every step of the settlement lifecycle.'],
              ].map(([k, v], i) => (
                <div key={i} style={{ paddingTop: i ? 10 : 0, marginTop: i ? 10 : 0, borderTop: i ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--earned2)' }}>{k}</code>
                  <p style={{ fontSize: 12, color: 'var(--mut)', margin: '4px 0 0', lineHeight: 1.5 }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Integration tabs ────────────────────────────── */}
      <SectionDivider label="Choose your integration" />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 18 }} className="dev-grid">
        {/* Tab switcher + code */}
        <div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {INT_TABS.map((t) => {
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (on ? 'rgba(91,192,235,.3)' : 'rgba(255,255,255,.08)'), background: on ? 'rgba(91,192,235,.08)' : 'rgba(255,255,255,.03)', color: on ? 'var(--buy)' : 'var(--mut)', transition: 'all .15s', fontWeight: on ? 600 : 400 }}>
                  {t.label}
                </button>
              );
            })}
          </div>
          <CodeBlock code={INT_CODE[tab]} lang={INT_LANG[tab]} id={'int-' + tab} copied={copied} onCopy={copy} />
        </div>

        {/* Integration notes */}
        <div style={{ display: 'grid', gap: 12 }}>
          {tab === 'rest' && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 18 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '-.02em', marginBottom: 8 }}>Authentication</div>
                <p style={{ color: 'var(--mut)', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>Two separate credential types — one for machines, one for browsers:</p>
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {[
                    { k: 'x-proofsource-key', v: 'Operator API key (ps_live_...). For machine-to-machine calls from agents, scripts, or servers. Use with /agent/run.' },
                    { k: 'Authorization: Bearer', v: '30-day HMAC-SHA256 JWT returned on login/register. For browser sessions and management endpoints (mandate, ingest, /auth/me).' },
                  ].map(({ k, v }, i) => (
                    <div key={i} style={{ background: '#06080d', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, padding: '10px 14px' }}>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--buy)' }}>{k}</code>
                      <p style={{ color: 'var(--mut)', fontSize: 12.5, margin: '5px 0 0', lineHeight: 1.5 }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 18 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '-.02em', marginBottom: 8 }}>Key rotation</div>
                <p style={{ color: 'var(--mut)', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 10px' }}>Rotate your ps_live_ key without losing your account:</p>
                <CodeBlock code={`curl -X POST ${DEV_BASE}/v1/proofsource/auth/apikey/regenerate \\
  -H "Authorization: Bearer eyJ..."
# → { "apiKey": "ps_live_<new-32hex>" }`} lang="bash" id="rotate" copied={copied} onCopy={copy} />
              </div>
            </div>
          )}
          {tab === 'sdk' && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 18 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '-.02em', marginBottom: 8 }}>SDK methods</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {[
                    { m: 'ps.ask(q)', d: 'Run paying agent. Returns decision, answer, sources, spend, trace.' },
                    { m: 'ps.decide(q)', d: 'Preview what the agent would do without spending any budget.' },
                    { m: 'ps.mandate(p)', d: 'Set budget, ceiling, max price, requireCitation for a workspace.' },
                    { m: 'ps.connectFeed(b)', d: 'Ingest an RSS/Atom/RSSHub URL as priced creator resources.' },
                    { m: 'ps.traction()', d: 'Live platform metrics — payouts, settlement count, creators.' },
                    { m: 'ps.earnings(pid)', d: 'Creator earnings by provider ID.' },
                    { m: 'ps.regenerateApiKey()', d: 'Rotate the operator API key. Returns new key.' },
                  ].map(({ m, d }, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12, padding: '8px 0', borderTop: i ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--buy)' }}>{m}</code>
                      <span style={{ color: 'var(--mut)', fontSize: 12.5, lineHeight: 1.4 }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 18 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '-.02em', marginBottom: 8 }}>LangChain / AI SDK</div>
                <CodeBlock code={`// Wrap as a LangChain tool
import { DynamicTool } from "@langchain/core/tools";
import { ProofSource } from "@proofsource/sdk";

const ps = new ProofSource({ baseUrl: "...", apiKey: "ps_live_..." });

const proofSourceTool = new DynamicTool({
  name: "proofSource",
  description: "Research a topic and pay licensed creators per citation",
  func: async (question) => {
    const res = await ps.ask({ question });
    return res.answer + "\\n[receipt: " + res.sources[0]?.receiptId + "]";
  },
});`} lang="typescript" id="langchain" copied={copied} onCopy={copy} />
              </div>
            </div>
          )}
          {tab === 'mcp' && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 18 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '-.02em', marginBottom: 8 }}>MCP tools exposed</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {[
                    { t: 'proofSource_ask', p: 'question: string', d: 'Research a question. The agent pays permitted sources, verifies delivery on Arc, and returns a grounded answer with receipt IDs. Budget is deducted from the configured workspace.' },
                    { t: 'proofSource_decide', p: 'question: string', d: 'Preview the agent\'s decision without spending. Returns what would be bought, scored, and skipped. Use to audit policy before committing budget.' },
                    { t: 'proofSource_traction', p: '—', d: 'Returns live platform metrics: total payouts, settlement count, creators earning, reuse rate, avg payment size.' },
                  ].map(({ t, p, d }, i) => (
                    <div key={i} style={{ background: '#06080d', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 5 }}>
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--earned2)', fontWeight: 600 }}>{t}</code>
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>({p})</code>
                      </div>
                      <p style={{ color: 'var(--mut)', fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>{d}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: 'rgba(91,192,235,.04)', border: '1px solid rgba(91,192,235,.15)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--buy)', fontWeight: 600, marginBottom: 6 }}>Where to find workspace ID</div>
                <p style={{ fontSize: 12.5, color: 'var(--mut)', margin: 0, lineHeight: 1.5 }}>Your workspaceId is in the console sidebar after login. Default is <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>ws_demo</code> for the seeded demo environment. For production, register as an operator — a workspace is created automatically.</p>
              </div>
            </div>
          )}
          {tab === 'openclaw' && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 18 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '-.02em', marginBottom: 8 }}>Import into Claude.ai</div>
                {[
                  '1. Run the sidecar: PROOFSOURCE_API_KEY=ps_live_... npx @proofsource/openclaw-plugin',
                  '2. Open Claude.ai → Settings → Extensions / Plugins → Add plugin',
                  '3. Paste: http://localhost:3100',
                  '4. Claude can now call POST /ask with any research question and will receive a paid, cited answer',
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: i ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--buy)', flexShrink: 0, width: 18 }}>{i + 1}.</span>
                    <span style={{ color: 'var(--mut)', fontSize: 13, lineHeight: 1.5 }}>{s.slice(3)}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 18 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '-.02em', marginBottom: 8 }}>Import OpenAPI spec into Codex</div>
                <CodeBlock code={`# Import into OpenAI Codex or Assistants
# URL:
${DEV_BASE}/openapi.json

# Or download the spec:
curl ${DEV_BASE}/openapi.json > proofsource-openapi.json

# Import into Postman / Insomnia as OpenAPI 3.1`} lang="bash" id="openapi" copied={copied} onCopy={copy} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── API Reference ────────────────────────────────── */}
      <SectionDivider label="API reference" />

      <div style={{ border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,.02)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(0,0,0,.2)', display: 'grid', gridTemplateColumns: '56px 240px 200px 1fr', gap: 12 }}>
          {['Method', 'Endpoint', 'Auth', 'Description'].map((h) => (
            <span key={h} style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>{h}</span>
          ))}
        </div>
        {ENDPOINTS_FULL.map((e, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '56px 240px 200px 1fr', gap: 12, padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,.05)', alignItems: 'start' }} className="ep-row">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, color: e.m === 'GET' ? 'var(--buy)' : 'var(--earned2)', paddingTop: 1 }}>{e.m}</span>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)', wordBreak: 'break-all' }}>{e.p}</code>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: e.auth === 'API key' ? 'var(--skip)' : e.auth === 'JWT' ? 'var(--buy)' : 'var(--faint)', background: e.auth !== 'none' ? 'rgba(255,255,255,.04)' : 'transparent', border: e.auth !== 'none' ? '1px solid rgba(255,255,255,.07)' : 'none', borderRadius: 4, padding: e.auth !== 'none' ? '2px 7px' : 0 }}>
                {e.auth === 'none' ? '— public' : e.auth}
              </span>
              {e.params !== '—' && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)', marginTop: 5, lineHeight: 1.5 }}>{e.params}</div>}
            </div>
            <div>
              <span style={{ color: 'var(--mut)', fontSize: 13, lineHeight: 1.5 }}>{e.returns}</span>
              {e.note && <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4, lineHeight: 1.5 }}>{e.note}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Error codes ─────────────────────────────────── */}
      <SectionDivider label="Error codes" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }} className="dev-ref-grid">
        {ERROR_CODES.map((e, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '14px 18px', display: 'grid', gridTemplateColumns: '48px 1fr', gap: 12, alignItems: 'start' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: e.code[0] === '4' ? (e.code === '401' || e.code === '403' ? 'var(--block)' : 'var(--skip)') : 'var(--faint)' }}>{e.code}</span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{e.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--mut)', lineHeight: 1.5 }}>When: {e.when}</div>
              <div style={{ fontSize: 12.5, color: 'var(--faint)', lineHeight: 1.5, marginTop: 3 }}>Fix: {e.fix}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── npm packages ────────────────────────────────── */}
      <SectionDivider label="Published packages" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }} className="integ-grid">
        {NPM_PKGS.map((p) => (
          <div key={p.name} style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>{p.tag}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, letterSpacing: '-.025em', marginBottom: 10, color: TONE_INK[p.tone] }}>{p.name}</div>
            <p style={{ color: 'var(--mut)', fontSize: 13, lineHeight: 1.6, margin: '0 0 14px', flex: 1 }}>{p.desc}</p>
            <div style={{ background: '#06080d', border: '1px solid rgba(255,255,255,.07)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: TONE_INK[p.tone], flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.install}</code>
              <button onClick={() => copy(p.name, p.install)} style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: copied === p.name ? 'var(--earned2)' : 'var(--faint)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                {copied === p.name ? '✓' : 'copy'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Architecture note ───────────────────────────── */}
      <SectionDivider label="How the settlement loop works" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="dev-grid">
        <div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, letterSpacing: '-.035em', margin: '0 0 12px' }}>Probabilistic where it helps. Deterministic where it counts.</h3>
          <p style={{ color: 'var(--mut)', fontSize: 14, lineHeight: 1.65, margin: '0 0 14px' }}>
            The agent uses an LLM to rank candidate sources by task-relevance and generate the grounded answer. That probabilistic layer only selects <em>which</em> source to buy — it has no control over whether payment is released.
          </p>
          <p style={{ color: 'var(--mut)', fontSize: 14, lineHeight: 1.65, margin: '0 0 14px' }}>
            Payment releases only when <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text)' }}>verifyDelivery()</code> passes seven deterministic checks: resource match, provider match, payload present, hash generated, non-empty, delivered before expiry, usage rights attached. Any check failure blocks the payment. Idempotency keys prevent double-settlement.
          </p>
          <p style={{ color: 'var(--mut)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            Every state transition writes an audit event. The Arc chain reference (transaction hash + ArcScan explorer URL) is attached to every receipt on BUY runs.
          </p>
        </div>
        <div>
          <div style={labS}>Settlement lifecycle</div>
          <div style={{ background: '#06080d', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '18px 20px', fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.9, color: '#C8D3E6' }}>
            <div style={{ color: 'var(--faint)' }}>question</div>
            <div style={{ paddingLeft: 16, color: 'var(--mut)' }}>→ discover candidates</div>
            <div style={{ paddingLeft: 16, color: 'var(--mut)' }}>→ AGENT DECISION  <span style={{ color: '#5E6B80' }}>(LLM · relevance · value/cent · budget)</span></div>
            <div style={{ paddingLeft: 30, color: 'var(--reuse)' }}>├─ REUSE → answer from paid context (no payment)</div>
            <div style={{ paddingLeft: 30, color: 'var(--faint)' }}>├─ SKIP → answer without paid source</div>
            <div style={{ paddingLeft: 30, color: 'var(--buy)' }}>└─ BUY</div>
            <div style={{ paddingLeft: 48, color: 'var(--faint)' }}>→ policy gate</div>
            <div style={{ paddingLeft: 48, color: 'var(--faint)' }}>→ x402 authorize</div>
            <div style={{ paddingLeft: 48, color: 'var(--faint)' }}>→ deliver content</div>
            <div style={{ paddingLeft: 48, color: 'var(--buy)' }}>→ VERIFY (7 checks)  <span style={{ color: '#5E6B80' }}>(deterministic)</span></div>
            <div style={{ paddingLeft: 48, color: 'var(--earned)' }}>→ release on Arc / USDC</div>
            <div style={{ paddingLeft: 48, color: 'var(--earned)' }}>→ receipt (hash + Arc tx)</div>
            <div style={{ paddingLeft: 48, color: 'var(--text)' }}>→ grounded answer (cites source)</div>
          </div>
        </div>
      </div>

      {/* ── CTA ─────────────────────────────────────────── */}
      <div style={{ marginTop: 52, background: 'linear-gradient(135deg,rgba(91,192,235,.07),rgba(84,180,136,.05))', border: '1px solid rgba(91,192,235,.18)', borderRadius: 18, padding: '32px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, letterSpacing: '-.04em', margin: '0 0 8px' }}>Ready to build?</h3>
          <p style={{ color: 'var(--mut)', fontSize: 14.5, margin: 0, lineHeight: 1.5 }}>Create an operator account, get your ps_live_... key, and make your first call in under five minutes.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Btn variant="primary" size="lg" onClick={() => go('auth')}>Create operator account</Btn>
          <Btn variant="ghost" onClick={() => go('demo')}>Try the live demo first</Btn>
        </div>
      </div>
    </div>
  );
}

window.Solutions = Solutions;
window.Developers = Developers;
