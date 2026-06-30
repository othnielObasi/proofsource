/* ProofSource redesign — Home page. Exports window.Home. */

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
        <div style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.4, minHeight: 40, color: 'var(--text)' }}>{run.q}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
          <Badge tone={run.action === 'BUY' ? 'buy' : run.action === 'REUSE' ? 'reuse' : 'skip'}>{run.action}</Badge>
          <span style={{ fontSize: 12.5, color: 'var(--mut)' }}>{settled ? run.reasoning : 'evaluating permitted sources…'}</span>
        </div>

        <Pipeline steps={steps} reached={reached} />

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>settled</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, letterSpacing: '-.01em', color: run.amount ? 'var(--earned2)' : 'var(--faint)', marginTop: 2, animation: settled && run.amount ? 'flashEarn .9s ease' : 'none' }}>
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
  return (
    <div className="page">

      {/* 0–5s: WHAT IS THIS */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '46px 26px 40px', display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,.95fr)', gap: 54, alignItems: 'center' }} className="hero-grid">
        <div>
          <Tag tone="earned" style={{ marginBottom: 22 }}>Live on Arc · USDC · sub-cent citations</Tag>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(40px,6vw,68px)', lineHeight: 1.0, letterSpacing: '-.055em', margin: '0 0 20px' }}>
            Knowledge that<br /><em style={{ fontStyle: 'normal', color: 'var(--earned2)' }}>settles in real time.</em>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--mut)', lineHeight: 1.6, maxWidth: 500, margin: '0 0 28px' }}>
            The settlement floor for AI-cited content. An agent reads your work, pays you a sub-cent amount, and seals a tamper-evident receipt — all in one step.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Btn variant="earn" size="lg" onClick={() => go('creators')}>Get paid for your work</Btn>
            <Btn variant="outline" size="lg" onClick={() => go('demo')}>Watch the floor live →</Btn>
          </div>
        </div>
        <MiniMonitor />
      </section>

      <Ticker />

      {/* 5–15s: HOW IT WORKS */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '56px 26px 60px', borderTop: '1px solid var(--line-soft)' }}>
        <SectionHead eyebrow="How it works" title="From a creator's feed to a provable, paid citation." center style={{ marginBottom: 36 }} />
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

      {/* 15–30s: WHICH SIDE ARE YOU ON */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 26px 56px' }}>
        <SectionHead eyebrow="Two sides of the floor" title="Pick your side." center style={{ marginBottom: 26 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="doors-grid">
          <Door accent="earn" kicker="Creators · writers · publishers" title="Get paid every time AI cites you." body="List your articles, set a price per citation, and earn whenever an agent grounds an answer in your work. We can set up a wallet for you — no crypto knowledge needed." cta="Start earning" onClick={() => go('creators')} />
          <Door accent="buy" kicker="Operators · research teams" title="Your agent pays sources, by the rules." body="Give your agent a budget and a policy, and let it pay per use — transparently, within limits you set, with a receipt for every citation it makes." cta="Run a paying agent" onClick={() => go('operators')} />
        </div>
      </section>

      {/* 30s+: ACT */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 26px 88px' }}>
        <div style={{ borderRadius: 22, background: 'linear-gradient(135deg,rgba(9,14,26,1) 0%,rgba(14,24,40,1) 100%)', border: '1px solid rgba(91,192,235,.14)', padding: 'clamp(44px,6vw,72px) clamp(28px,5vw,64px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 50% 110%, rgba(84,180,136,.09), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(34px,5vw,58px)', letterSpacing: '-.04em', margin: '0 0 14px', lineHeight: 1.08 }}>
              One API.<br /><em style={{ fontStyle: 'normal', color: 'var(--earned2)' }}>Every citation paid.</em>
            </h2>
            <p style={{ color: 'var(--mut)', fontSize: 16, maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.55 }}>
              Wires into any LLM pipeline in minutes. Creators list once and earn every time an agent cites their work.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Btn variant="earn" size="lg" onClick={() => go('creators')}>Start earning</Btn>
              <Btn variant="primary" size="lg" onClick={() => go('operators')}>Run a paying agent</Btn>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

window.Home = Home;
window.MiniMonitor = MiniMonitor;
