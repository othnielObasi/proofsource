/* ProofSource redesign — Home page. Exports window.Home. */

/* Auto-playing settlement monitor for the hero right column. */
function MiniMonitor() {
  const order = ['licensing', 'royalties', 'sourdough'];
  const [idx, setIdx] = useState(0);
  const [reached, setReached] = useState(0);
  const run = PS_DATA.runs[order[idx]];
  const steps = run.pipeline;

  useEffect(() => {
    setReached(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1; setReached(i);
      if (i >= steps.length) {
        clearInterval(id);
        setTimeout(() => setIdx((x) => (x + 1) % order.length), 4200);
      }
    }, 620);
    return () => clearInterval(id);
  }, [idx]);

  const settled = reached >= steps.length;
  return (
    <div style={{ background: 'linear-gradient(180deg,rgba(21,29,43,.92),rgba(14,20,32,.92))', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'rgba(7,10,16,.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--earned)', boxShadow: 'var(--glow-earned)', animation: 'tagdot 1.4s infinite' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mut)' }}>demo agent run</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>arc · usdc</span>
      </div>

      <div style={{ padding: '16px 16px 18px' }}>
        <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 800, marginBottom: 7 }}>question</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '-.02em', lineHeight: 1.25, minHeight: 40 }}>{run.q}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
          <Badge tone={run.action === 'BUY' ? 'buy' : run.action === 'REUSE' ? 'reuse' : 'skip'}>{run.action}</Badge>
          <span style={{ fontSize: 12.5, color: 'var(--mut)' }}>{settled ? run.reasoning : 'evaluating permitted sources…'}</span>
        </div>

        <Pipeline steps={steps} reached={reached} />

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>settled</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, letterSpacing: '-.05em', color: run.amount ? 'var(--earned2)' : 'var(--faint)', marginTop: 2, animation: settled && run.amount ? 'flashEarn .9s ease' : 'none' }}>
              {usd(run.amount, 6)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>{run.paid ? 'paid creator' : 'no payment'}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{run.paid || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCell({ label, children, tone, sub }) {
  return (
    <div style={{ padding: '4px 4px' }}>
      <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(30px,3.6vw,44px)', letterSpacing: '-.05em', lineHeight: 1, marginTop: 8, color: TONE_INK[tone] || 'var(--text)' }}>{children}</div>
      {sub && <div style={{ color: 'var(--mut)', fontSize: 12.5, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Door({ accent, kicker, title, body, cta, onClick }) {
  const [h, setH] = useState(false);
  const c = accent === 'earn' ? 'var(--earned2)' : 'var(--buy)';
  return (
    <div onMouseEnter={() => setH(1)} onMouseLeave={() => setH(0)}
      style={{ position: 'relative', background: 'var(--card-fill)', border: '1px solid ' + (h ? (accent === 'earn' ? 'var(--earned-line)' : '#2c5a70') : 'var(--line)'), borderRadius: 18, padding: 26, overflow: 'hidden', transition: 'border-color .2s, transform .2s', transform: h ? 'translateY(-2px)' : 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(420px 200px at 100% 0%, ' + (accent === 'earn' ? 'rgba(84,180,136,.10)' : 'rgba(91,192,235,.10)') + ', transparent 70%)', opacity: h ? 1 : .5, transition: 'opacity .3s', pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: c, marginBottom: 14 }}>{kicker}</div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 25, letterSpacing: '-.035em', margin: '0 0 10px', color: c }}>{title}</h3>
        <p style={{ color: 'var(--mut)', fontSize: 14.5, lineHeight: 1.55, margin: '0 0 20px', maxWidth: 380 }}>{body}</p>
        <Btn variant={accent === 'earn' ? 'earn' : 'primary'} onClick={onClick}>{cta}</Btn>
      </div>
    </div>
  );
}

const HOW = [
  { n: '01', t: 'Creators list work', d: 'Connect a feed, set a sub-cent price, add a wallet — or get a managed one.' },
  { n: '02', t: 'Agents decide', d: 'A budgeted agent scores permitted sources on value-per-cent and picks one to buy.' },
  { n: '03', t: 'Verified settlement', d: 'Payment releases on Arc only after delivery passes seven deterministic checks.' },
  { n: '04', t: 'Proof of earning', d: 'Every citation leaves a tamper-evident receipt and a reusable paid-context record.' },
];

function Home({ go }) {
  const [traction, setTraction] = useState(null);

  useEffect(() => {
    window.PS_API.traction().then(setTraction).catch(() => {});
  }, []);

  const fmt = (n, d = 4) => n != null ? '$' + Number(n).toFixed(d) : '—';
  const platPaid    = traction ? fmt(traction.totalPayoutUsdc) : '…';
  const platCount   = traction ? Number(traction.paymentCount).toLocaleString() : '…';
  const platAvg     = traction ? fmt(traction.avgTransactionUsdc, 4) : '…';
  const platEarning = traction ? String(traction.creatorsEarning) : '…';

  return (
    <div className="page">
      {/* HERO */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '46px 26px 30px', display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,.95fr)', gap: 54, alignItems: 'center' }} className="hero-grid">
        <div>
          <Tag tone="earned" style={{ marginBottom: 22 }}>Live on Arc · USDC · sub-cent citations</Tag>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(40px,6vw,68px)', lineHeight: 1.0, letterSpacing: '-.055em', margin: '0 0 20px' }}>
            Knowledge that<br /><em style={{ fontStyle: 'normal', color: 'var(--earned2)' }}>settles in real time.</em>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--mut)', lineHeight: 1.55, maxWidth: 520, margin: '0 0 28px' }}>
            ProofSource is the settlement floor for AI-cited content. Agents pay creators a sub-cent amount the moment they ground an answer in their work — verified, on-chain, with a receipt every time.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Btn variant="earn" size="lg" onClick={() => go('creators')}>Get paid for your work</Btn>
            <Btn variant="outline" size="lg" onClick={() => go('demo')}>Watch the floor live →</Btn>
          </div>
          <div style={{ display: 'flex', gap: 22, marginTop: 26, flexWrap: 'wrap', color: 'var(--faint)', fontSize: 12.5, fontFamily: 'var(--font-mono)' }}>
            <span>x402 settlement</span><span>·</span><span>Circle Gateway</span><span>·</span><span>7-check verified delivery</span>
          </div>
        </div>
        <MiniMonitor />
      </section>

      <Ticker />

      {/* METRICS BAND — real from API */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 26px 44px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14 }} className="metrics-grid">
          {[
            { label: 'Paid to creators', val: platPaid,    tone: 'earned', sub: 'USDC, all-time' },
            { label: 'Settlements',      val: platCount,   tone: 'buy',    sub: 'autonomous, on-chain' },
            { label: 'Avg payment',      val: platAvg,     tone: null,     sub: 'per citation' },
            { label: 'Creators earning', val: platEarning, tone: 'earned', sub: 'distinct paid sources' },
          ].map(({ label, val, tone, sub }, i) => (
            <div key={i} style={{ padding: '22px 26px', borderLeft: i ? '1px solid rgba(255,255,255,.07)' : 'none' }}>
              <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, letterSpacing: '-.03em', marginTop: 8, color: tone === 'earned' ? 'var(--earned2)' : tone === 'buy' ? 'var(--buy)' : 'var(--text)' }}>{val}</div>
              <div style={{ color: 'var(--mut)', fontSize: 12, marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROOF MOMENT */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 26px 56px', borderTop: '1px solid var(--line-soft)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, alignItems: 'center' }} className="proof-grid">
        <div>
          <SectionHead eyebrow="The proof moment" tone="earned" title="A citation becomes a payment — and a receipt." lead="Type a question and watch the agent retrieve licensed evidence, clear rights, cite the work, pay the creator, and seal a tamper-evident receipt. Nothing settles until delivery is verified." />
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <Btn variant="primary" onClick={() => go('demo')}>Open the live demo</Btn>
            <Btn variant="ghost" onClick={() => go('solutions')}>See who it's for →</Btn>
          </div>
        </div>
        <div>
          <Receipt title="Verified settlement" rows={[{ k: 'content', v: 'AI licensing · per-use' }, { k: 'delivery', v: '7-check verified' }, { k: 'settled on', v: 'Arc · USDC' }]} amount="$0.002" />
        </div>
      </section>

      {/* DOORS */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 26px 16px' }}>
        <SectionHead eyebrow="Two sides of the floor" title="Pick your side." center style={{ marginBottom: 26 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="doors-grid">
          <Door accent="earn" kicker="Creators · writers · publishers" title="Get paid every time AI cites you." body="List your articles, set a price per citation, and earn whenever an agent grounds an answer in your work. We can set up a wallet for you — no crypto knowledge needed." cta="Start earning" onClick={() => go('creators')} />
          <Door accent="buy" kicker="Operators · research teams" title="Your agent pays sources, by the rules." body="Give your agent a budget and a policy, and let it pay per use — transparently, within limits you set, with a receipt for every citation it makes." cta="Run a paying agent" onClick={() => go('operators')} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '60px 26px 80px' }}>
        <SectionHead eyebrow="How it works" title="From a creator's feed to a provable, paid citation." center style={{ marginBottom: 30 }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }} className="how-grid">
          <div style={{ position: 'absolute', left: '12%', right: '12%', top: 19, height: 2, background: 'linear-gradient(90deg,var(--earned),var(--buy),var(--skip))', opacity: .55 }} className="how-rail" />
          {HOW.map((s) => (
            <div key={s.n} style={{ position: 'relative', textAlign: 'center', paddingTop: 44 }}>
              <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 40, height: 40, borderRadius: 99, display: 'grid', placeItems: 'center', background: 'var(--ink)', border: '1px solid var(--earned-line)', color: 'var(--earned2)', fontFamily: 'var(--font-mono)', fontSize: 12, boxShadow: '0 0 0 6px rgba(11,15,23,1)' }}>{s.n}</span>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, letterSpacing: '-.03em', margin: '0 0 7px' }}>{s.t}</h4>
              <p style={{ color: 'var(--mut)', fontSize: 13.5, lineHeight: 1.5, margin: '0 auto', maxWidth: 220 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

window.Home = Home;
window.MiniMonitor = MiniMonitor;
