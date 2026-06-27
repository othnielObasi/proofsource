/* ProofSource redesign — Solutions + Developers pages. Exports window.Solutions, window.Developers. */

function UseCard({ tag, title, body, accent }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(1)} onMouseLeave={() => setH(0)} style={{ background: 'var(--card-fill)', border: '1px solid ' + (h ? 'var(--line-soft)' : 'var(--line)'), borderColor: h ? (accent === 'earn' ? 'var(--earned-line)' : '#2c5a70') : 'var(--line)', borderRadius: 16, padding: 22, transition: 'border-color .2s, transform .2s', transform: h ? 'translateY(-2px)' : 'none' }}>
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

      {/* integrity strip */}
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

const CODE = `// Ask your agent. It decides, pays, verifies, cites.
const res = await fetch(
  "/v1/proofsource/demo/research-agent/run",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      workspaceId,
      question: "AI content licensing arguments?",
    }),
  }
).then(r => r.json());

res.decision.action;        // "BUY" | "REUSE" | "SKIP"
res.spend.totalUsdc;        // 0.002000
res.sources[0].receiptId;   // tamper-evident proof
res.decision.scores;        // per-source relevance + value/cent`;

function Developers({ go }) {
  const DOORS = [
    {
      label: 'MCP server',
      sub: 'Claude Code · Cursor · Windsurf',
      cmd: 'claude mcp add proofsource -- npx -y @proofsource/mcp',
      body: 'One line wires ProofSource into any MCP client. Tools: proofsource_ask, proofsource_traction, proofsource_creator_earnings, proofsource_wallet_status.',
      tone: 'buy',
    },
    {
      label: 'OpenClaw plugin',
      sub: '~380k★ self-hosted AI gateway',
      cmd: 'openclaw plugins install proofsource',
      body: 'Any OpenClaw assistant can answer with cited sources and pay those creators per citation — installed from ClawHub in one command.',
      tone: 'earned',
    },
    {
      label: 'SDK',
      sub: '@proofsource/sdk',
      cmd: 'npm i @proofsource/sdk',
      body: 'The shared typed client every surface sits on. Methods: ask(), decide(), traction(), earnings(), connectFeed(), mandate(). Used by MCP, OpenClaw, and the web app.',
      tone: 'buy',
    },
    {
      label: 'x402 / Gateway',
      sub: 'Circle Arc · cross-team loops',
      cmd: 'PAYMENT_MODE=arc_testnet npm start',
      body: 'Content served as x402-protected, Gateway-batched endpoints. Other agents pay ProofSource per call; ProofSource pays them. The hackathon cross-team payment loop.',
      tone: 'skip',
    },
  ];

  return (
    <div className="page" style={{ maxWidth: 1180, margin: '0 auto', padding: '52px 26px 70px' }}>
      <SectionHead eyebrow="Developers" tone="buy" title="One core engine. Four doors." lead="The agent decision → x402 → verify → Arc/Gateway settle → receipt loop lives in one place. MCP, OpenClaw, SDK, and x402 are thin adapters over the same engine — behavior is identical no matter how you connect." />

      {/* distribution doors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginTop: 28 }} className="dev-doors">
        {DOORS.map((d) => (
          <div key={d.label} style={{ background: 'var(--card-fill)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17, letterSpacing: '-.03em' }}>{d.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>{d.sub}</span>
            </div>
            <div style={{ background: '#06080d', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: TONE_INK[d.tone], marginBottom: 10, overflowX: 'auto', whiteSpace: 'nowrap' }}>{d.cmd}</div>
            <p style={{ color: 'var(--mut)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{d.body}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginTop: 32, alignItems: 'start' }} className="dev-grid">
        {/* code */}
        <div style={{ background: '#06080d', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--line)', color: 'var(--faint)', fontSize: 12 }}>
            <span style={{ display: 'flex', gap: 6 }}>
              <i style={{ width: 9, height: 9, borderRadius: 99, background: '#E06A5E' }} /><i style={{ width: 9, height: 9, borderRadius: 99, background: '#E0A458' }} /><i style={{ width: 9, height: 9, borderRadius: 99, background: '#54B488' }} />
            </span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>run.ts · REST API</span>
          </div>
          <pre style={{ margin: 0, padding: 18, overflow: 'auto', color: '#C8D3E6', fontSize: 12.5, lineHeight: 1.7, fontFamily: 'var(--font-mono)' }}>{CODE}</pre>
        </div>

        {/* steps */}
        <div>
          {[
            { n: '01', t: 'Ingest real sources', d: 'POST /connectors/rss/ingest with any RSSHub route or RSS/Atom URL — each article becomes a priced, hash-verified resource credited to its real author.' },
            { n: '02', t: 'Set the mandate', d: 'PUT budget, per-task ceiling, max price, preferred/blocked creators. The agent obeys it strictly.' },
            { n: '03', t: 'Ask & settle', d: 'POST a question. The agent decides, pays on x402, verifies delivery, releases on Arc, and returns the answer + receipt.' },
            { n: '04', t: 'Secure the signer key', d: '1Claw (1claw.dev, promo LEPTON26) holds the Arc signer key and hands it to the agent at runtime — never in plaintext .env.' },
          ].map((s) => (
            <div key={s.n} style={{ display: 'grid', gridTemplateColumns: '46px 1fr', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <span style={{ width: 38, height: 38, borderRadius: 99, display: 'grid', placeItems: 'center', border: '1px solid var(--earned-line)', color: 'var(--earned2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s.n}</span>
              <div><h4 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '-.03em', margin: '0 0 5px' }}>{s.t}</h4><p style={{ color: 'var(--mut)', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>{s.d}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* endpoints */}
      <div style={{ marginTop: 36 }}>
        <Eyebrow>Core endpoints</Eyebrow>
        <div style={{ border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', background: 'var(--card-fill)' }}>
          {PS_DATA.endpoints.map((e, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 320px 1fr', gap: 16, padding: '14px 18px', borderTop: i ? '1px solid var(--line)' : 'none', alignItems: 'center' }} className="ep-row">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: e.m === 'GET' ? 'var(--buy)' : 'var(--earned2)' }}>{e.m}</span>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text)' }}>{e.p}</code>
              <span style={{ color: 'var(--mut)', fontSize: 13 }}>{e.d}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Btn variant="primary" onClick={() => go('demo')}>Try the live demo</Btn>
        <Btn variant="ghost" onClick={() => go('home')}>← Back to the floor</Btn>
      </div>
    </div>
  );
}

window.Solutions = Solutions;
window.Developers = Developers;
