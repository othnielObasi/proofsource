/* ProofSource — Live demo page. Exports window.Demo. */

const ACTION_COLOR = { BUY: 'var(--buy)', REUSE: 'var(--reuse)', SKIP: 'var(--faint)', BLOCK: 'var(--block)' };

const MANDATE = { budget: 5.0, ceiling: 0.05, maxPer: 0.01, requireCite: true };

function RelBar({ v }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 64, height: 5, borderRadius: 6, background: '#0a0e16', border: '1px solid rgba(255,255,255,.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: Math.round(v * 100) + '%', background: 'linear-gradient(90deg,#33506b,var(--buy))', transition: 'width .5s var(--ease)' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mut)', width: 28, textAlign: 'right' }}>{Math.round(v * 100)}%</span>
    </div>
  );
}

function Demo({ go }) {
  const keys = Object.keys(PS_DATA.runs);
  const [key, setKey] = useState('licensing');
  const [phase, setPhase] = useState('idle');
  const [reached, setReached] = useState(0);
  const run = PS_DATA.runs[key];
  const steps = run.pipeline;

  const runRef = React.useRef({ active: false });

  const start = useCallback((k) => {
    const kk = k || key;
    runRef.current.active = false;
    setKey(kk); setPhase('running'); setReached(0);
    const s = PS_DATA.runs[kk].pipeline;
    const token = { active: true };
    runRef.current = token;
    let i = 0;
    function tick() {
      if (!token.active) return;
      i += 1; setReached(i);
      if (i >= s.length) { token.active = false; setPhase('done'); return; }
      setTimeout(tick, 460);
    }
    setTimeout(tick, 460);
  }, [key]);

  useEffect(() => { const t = setTimeout(() => start('licensing'), 500); return () => clearTimeout(t); }, []);

  const done = phase === 'done';
  const showTable = reached >= 2 || done;
  const showAnswer = done;
  const badgeTone = run.action === 'BUY' ? 'buy' : run.action === 'REUSE' ? 'reuse' : 'skip';

  return (
    <div className="page" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 26px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Eyebrow tone="buy">Live demo · settlement floor</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(28px,4.2vw,48px)', letterSpacing: '-.05em', lineHeight: 1.05, margin: '6px 0 10px' }}>
              Watch the agent pay the source it cites.
            </h1>
            <p style={{ color: 'var(--mut)', fontSize: 15, lineHeight: 1.55, maxWidth: 580, margin: 0 }}>
              Pick a scenario. The agent scores permitted sources, decides BUY / REUSE / SKIP, runs the deterministic settlement lifecycle, and seals a receipt.
            </p>
          </div>
          <Btn variant="outline" size="sm" onClick={() => start(key)} style={{ flexShrink: 0, alignSelf: 'flex-end' }}>↻ Run again</Btn>
        </div>

        {/* Scenario picker */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
          {keys.map((k) => {
            const r = PS_DATA.runs[k];
            const on = key === k;
            const tone = r.action === 'BUY' ? 'var(--buy)' : r.action === 'REUSE' ? 'var(--reuse)' : 'var(--skip)';
            return (
              <button key={k} onClick={() => start(k)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: on ? 'var(--text)' : 'var(--mut)', background: on ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.025)', border: '1px solid ' + (on ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.07)'), borderRadius: 8, padding: '8px 14px', cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font-sans)' }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: on ? tone : 'var(--faint)', flexShrink: 0 }} />
                {r.label}
                <Badge tone={r.action === 'BUY' ? 'buy' : r.action === 'REUSE' ? 'reuse' : 'skip'} style={{ fontSize: 10, padding: '2px 6px' }}>{r.action}</Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 288px', gap: 18, alignItems: 'start' }} className="demo-layout">

        {/* LEFT — main run view */}
        <div style={{ display: 'grid', gap: 14 }}>

          {/* Question */}
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(91,192,235,.1)', border: '1px solid rgba(91,192,235,.22)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
              <span style={{ width: 6, height: 6, borderRadius: 1, background: 'var(--buy)' }} />
            </div>
            <span style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--text)' }}>{run.q}</span>
          </div>

          {/* Decision + source table */}
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: showTable ? '1px solid rgba(255,255,255,.07)' : 'none' }}>
              <Badge tone={badgeTone}>{phase === 'running' && reached < 2 ? '…' : run.action}</Badge>
              <span style={{ fontSize: 13, color: 'var(--mut)', flex: 1 }}>
                {showTable ? run.reasoning : 'Scoring permitted sources against value-per-cent threshold…'}
              </span>
            </div>
            {showTable && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,.2)' }}>
                    {['Source', 'Relevance', 'Price', 'Verdict'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', fontWeight: 700, padding: '10px 14px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {run.candidates.map((c, i) => {
                    const pick = /bought|reused/.test(c.verdict);
                    return (
                      <tr key={i} style={{ background: pick ? 'rgba(91,192,235,.035)' : 'transparent', animation: 'pageIn .35s ease both', animationDelay: (i * 80) + 'ms' }}>
                        <td style={{ padding: '11px 14px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                          <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.3 }}>{c.work}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--mut)', marginTop: 2 }}>{c.creator}</div>
                        </td>
                        <td style={{ padding: '11px 14px', borderTop: '1px solid rgba(255,255,255,.05)', minWidth: 110 }}>
                          <RelBar v={c.rel} />
                        </td>
                        <td style={{ padding: '11px 14px', borderTop: '1px solid rgba(255,255,255,.05)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mut)', whiteSpace: 'nowrap' }}>${c.price.toFixed(3)}</td>
                        <td style={{ padding: '11px 14px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                          <Badge tone={c.tone}>{c.verdict.split(':')[0].split(' ')[0]}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Settlement lifecycle */}
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: 12 }}>Settlement lifecycle</div>
            <Pipeline steps={steps} reached={reached} />
          </div>

          {/* Answer */}
          <div style={{ background: showAnswer ? 'linear-gradient(180deg,rgba(84,180,136,.06),rgba(255,255,255,.01))' : 'rgba(255,255,255,.015)', border: '1px solid ' + (showAnswer ? 'rgba(84,180,136,.25)' : 'rgba(255,255,255,.07)'), borderRadius: 12, padding: '16px 18px', transition: 'all .5s', minHeight: 80 }}>
            <div style={{ fontSize: 10, color: showAnswer ? 'var(--earned2)' : 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: 10 }}>Grounded answer</div>
            {showAnswer
              ? <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15.5, lineHeight: 1.65, color: '#C9D5E8' }} dangerouslySetInnerHTML={{ __html: run.answer }} />
              : <div style={{ color: 'var(--faint)', fontSize: 13.5 }}>The answer appears once delivery is verified and the citation is sealed.</div>
            }
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <div style={{ position: 'sticky', top: 20, display: 'grid', gap: 14 }} className="demo-proof">

          {/* Mandate */}
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: 10 }}>Operator mandate</div>
            {[
              ['Budget', '$' + MANDATE.budget.toFixed(2)],
              ['Per-task ceiling', '$' + MANDATE.ceiling.toFixed(2)],
              ['Max / source', '$' + MANDATE.maxPer.toFixed(2)],
              ['Require citation', MANDATE.requireCite ? 'yes' : 'no'],
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: i ? '1px solid rgba(255,255,255,.05)' : 'none', fontSize: 12.5 }}>
                <span style={{ color: 'var(--mut)' }}>{r[0]}</span>
                <b style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 12 }}>{r[1]}</b>
              </div>
            ))}
            <p style={{ fontSize: 11.5, color: 'var(--faint)', lineHeight: 1.5, margin: '10px 0 0' }}>
              Creators price their work. You set the rules. The agent only chooses <em>which</em> permitted source is worth buying.
            </p>
          </div>

          {/* This run */}
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: 10 }}>This run</div>
            {[
              ['Decision', run.action, ACTION_COLOR[run.action] || 'var(--mut)'],
              ['Settled', usd(run.amount, 6), 'var(--text)'],
              ['Verification', run.amount ? (done ? 'passed' : '—') : 'n/a', 'var(--earned)'],
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: i ? '1px solid rgba(255,255,255,.05)' : 'none', fontSize: 12.5 }}>
                <span style={{ color: 'var(--mut)' }}>{r[0]}</span>
                <b style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: r[2], fontSize: 12 }}>{r[1]}</b>
              </div>
            ))}
          </div>

          {/* Receipt */}
          {done && run.paid && (
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <Receipt printing title={'Paid ' + run.paid}
                rows={[
                  { k: 'amount',   v: usd(run.amount, 6) },
                  { k: 'delivery', v: 'sha256:9f3a…c01b' },
                  { k: 'receipt',  v: 'rcpt_8821…4f' },
                  { k: 'settled on', v: 'Arc · USDC' },
                ]}
                amount={'$' + run.amount.toFixed(3)}
              />
            </div>
          )}

          {done && !run.paid && (
            <div style={{ background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.08)', borderRadius: 12, padding: '16px', textAlign: 'center', color: 'var(--mut)', fontSize: 13, lineHeight: 1.5 }}>
              No payment this run —<br />
              {run.action === 'REUSE' ? 'agent reused owned paid context.' : 'nothing cleared the relevance floor.'}
            </div>
          )}

          {/* CTA */}
          <div style={{ background: 'linear-gradient(180deg,rgba(84,180,136,.06),rgba(255,255,255,.01))', border: '1px solid rgba(84,180,136,.18)', borderRadius: 12, padding: '16px' }}>
            <div style={{ fontSize: 12.5, color: 'var(--earned2)', fontWeight: 600, marginBottom: 4 }}>Run this for real</div>
            <div style={{ fontSize: 12, color: 'var(--mut)', lineHeight: 1.5, marginBottom: 12 }}>Create an account to run the agent against live ingested sources, with real receipts on Arc.</div>
            <Btn variant="earn" size="sm" style={{ width: '100%' }} onClick={() => go('auth')}>Create account →</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Demo = Demo;
