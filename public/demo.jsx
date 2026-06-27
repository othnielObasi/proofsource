/* ProofSource redesign — Live demo page. Exports window.Demo. */

const MANDATE = { budget: 5.0, ceiling: 0.05, maxPer: 0.01, requireCite: true };

function RelBar({ v }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 64, height: 6, borderRadius: 6, background: '#0a0e16', border: '1px solid var(--line)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: Math.round(v * 100) + '%', background: 'linear-gradient(90deg,#33506b,var(--buy))', transition: 'width .5s var(--ease)' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mut)', width: 30, textAlign: 'right' }}>{Math.round(v * 100)}%</span>
    </div>
  );
}

function Demo({ go }) {
  const keys = Object.keys(PS_DATA.runs);
  const [key, setKey] = useState('licensing');
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [reached, setReached] = useState(0);
  const run = PS_DATA.runs[key];
  const steps = run.pipeline;

  const runRef = React.useRef({ active: false });

  const start = useCallback((k) => {
    const kk = k || key;
    runRef.current.active = false;
    setKey(kk); setPhase('running'); setReached(0);
    const steps = PS_DATA.runs[kk].pipeline;
    const token = { active: true };
    runRef.current = token;
    let i = 0;
    function tick() {
      if (!token.active) return;
      i += 1;
      setReached(i);
      if (i >= steps.length) { token.active = false; setPhase('done'); return; }
      setTimeout(tick, 480);
    }
    setTimeout(tick, 480);
  }, [key]);

  useEffect(() => { const t = setTimeout(() => start('licensing'), 500); return () => clearTimeout(t); }, []);

  const done = phase === 'done';
  const showTable = reached >= 2 || done;
  const showAnswer = done;
  const badgeTone = run.action === 'BUY' ? 'buy' : run.action === 'REUSE' ? 'reuse' : 'skip';
  const budgetPct = Math.round((1 - run.amount / MANDATE.budget) * 100);

  return (
    <div className="page" style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 26px 70px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'end', marginBottom: 22 }} className="demo-head">
        <div>
          <Eyebrow tone="buy">Live demo · settlement floor</Eyebrow>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(30px,4.6vw,52px)', letterSpacing: '-.055em', lineHeight: 1, margin: 0 }}>Watch the agent pay the source it cites.</h1>
          <p style={{ color: 'var(--mut)', fontSize: 15.5, lineHeight: 1.55, maxWidth: 640, margin: '14px 0 0' }}>Pick a question. The agent scores permitted sources, decides BUY / REUSE / SKIP, runs the deterministic settlement lifecycle, and seals a receipt — live.</p>
        </div>
        <Btn variant="outline" onClick={() => start(key)}>↻ Run again</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px minmax(0,1fr) 340px', gap: 20, alignItems: 'start' }} className="demo-layout">
        {/* MANDATE */}
        <div style={{ position: 'sticky', top: 78, display: 'grid', gap: 14 }} className="demo-mandate">
          <div style={{ background: 'var(--card-fill)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
            <Eyebrow>Your mandate</Eyebrow>
            <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 6 }}>Budget remaining</div>
            <div style={{ height: 7, borderRadius: 6, background: '#0a0e16', border: '1px solid var(--line)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: budgetPct + '%', background: 'linear-gradient(90deg,#2f6f51,var(--earned))', transition: 'width .6s var(--ease)' }} />
            </div>
            <div style={{ marginTop: 12 }}>
              {[['Budget', '$' + MANDATE.budget.toFixed(2)], ['Per-task ceiling', '$' + MANDATE.ceiling.toFixed(2)], ['Max / source', '$' + MANDATE.maxPer.toFixed(2)], ['Require citation', MANDATE.requireCite ? 'yes' : 'no']].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none', fontSize: 13 }}>
                  <span style={{ color: 'var(--mut)' }}>{r[0]}</span><b style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{r[1]}</b>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--faint)', lineHeight: 1.5, marginTop: 12 }}>Creators price their work; you set the budget and policy; the agent only chooses which permitted source is worth paying for.</p>
          </div>
        </div>

        {/* RUN */}
        <div style={{ display: 'grid', gap: 14 }}>
          {/* ask */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--panel2)', border: '1px solid var(--line)', borderRadius: 12, padding: '7px 7px 7px 16px' }}>
            <span style={{ flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.q}</span>
            <Btn variant="primary" size="sm" onClick={() => start(key)}>Run</Btn>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {keys.map((k) => (
              <span key={k} onClick={() => start(k)} style={{ fontSize: 12.5, color: key === k ? 'var(--text)' : 'var(--mut)', background: key === k ? '#0f1a22' : 'var(--panel2)', border: '1px solid ' + (key === k ? '#2c5a70' : 'var(--line)'), borderRadius: 999, padding: '6px 13px', cursor: 'pointer' }}>{PS_DATA.runs[k].label}</span>
            ))}
          </div>

          {/* decision */}
          <div style={{ background: 'var(--card-fill)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, minHeight: 120 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Badge tone={badgeTone}>{phase === 'running' && reached < 2 ? '…' : run.action}</Badge>
              <span style={{ fontSize: 13, color: 'var(--mut)' }}>{showTable ? run.reasoning : 'scoring permitted sources…'}</span>
            </div>
            {showTable && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                <thead><tr>{['source', 'relevance', 'price', 'verdict'].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', fontWeight: 700, padding: '0 10px 8px' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {run.candidates.map((c, i) => {
                    const pick = /bought|reused/.test(c.verdict);
                    return (
                      <tr key={i} style={{ background: pick ? '#0f1a22' : 'transparent', animation: 'pageIn .4s ease both', animationDelay: (i * 90) + 'ms' }}>
                        <td style={{ padding: 10, borderTop: '1px solid var(--line)' }}><div style={{ fontFamily: 'var(--font-serif)', fontSize: 13.5 }}>{c.work}</div><div style={{ fontSize: 11.5, color: 'var(--mut)' }}>{c.creator}</div></td>
                        <td style={{ padding: 10, borderTop: '1px solid var(--line)', minWidth: 120 }}><RelBar v={c.rel} /></td>
                        <td style={{ padding: 10, borderTop: '1px solid var(--line)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mut)' }}>${c.price.toFixed(3)}</td>
                        <td style={{ padding: 10, borderTop: '1px solid var(--line)' }}><Badge tone={c.tone}>{c.verdict.split(':')[0].split(' ')[0]}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* lifecycle */}
          <div style={{ background: 'var(--card-fill)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
            <Eyebrow>Settlement lifecycle</Eyebrow>
            <Pipeline steps={steps} reached={reached} />
          </div>

          {/* answer */}
          <div style={{ background: showAnswer ? 'linear-gradient(180deg,rgba(84,180,136,.07),var(--ink2))' : 'var(--card-fill)', border: '1px solid ' + (showAnswer ? 'rgba(84,180,136,.3)' : 'var(--line)'), borderRadius: 14, padding: 18, transition: 'all .4s' }}>
            <Eyebrow tone="earned">Grounded answer</Eyebrow>
            {showAnswer
              ? <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15.5, lineHeight: 1.62, color: '#C9D5E8' }} dangerouslySetInnerHTML={{ __html: run.answer }} />
              : <div style={{ color: 'var(--faint)', fontSize: 13.5 }}>The answer appears once delivery is verified and the citation is sealed.</div>}
          </div>
        </div>

        {/* PROOF */}
        <div style={{ position: 'sticky', top: 78, display: 'grid', gap: 14 }} className="demo-proof">
          <div style={{ background: 'var(--card-fill)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
            <Eyebrow>This run</Eyebrow>
            {[['Decision', run.action, ACTION_COLOR[run.action]], ['Settled', usd(run.amount, 6), 'var(--text)'], ['Verification', run.amount ? (done ? 'passed' : '—') : 'n/a', 'var(--earned)']].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none', fontSize: 13 }}>
                <span style={{ color: 'var(--mut)' }}>{r[0]}</span><b style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: r[2] }}>{r[1]}</b>
              </div>
            ))}
          </div>
          {done && run.paid && (
            <div style={{ display: 'grid', placeItems: 'center', paddingTop: 4 }}>
              <Receipt printing title={'Paid ' + run.paid} rows={[{ k: 'amount', v: usd(run.amount, 6) }, { k: 'delivery', v: 'sha256:9f3a…c01b' }, { k: 'receipt', v: 'rcpt_8821…4f' }]} amount={'$' + run.amount.toFixed(3)} />
            </div>
          )}
          {done && !run.paid && (
            <div style={{ background: 'var(--card-fill)', border: '1px dashed var(--line)', borderRadius: 14, padding: 18, textAlign: 'center', color: 'var(--mut)', fontSize: 13 }}>
              No payment this run — {run.action === 'REUSE' ? 'the agent reused owned paid context.' : 'nothing cleared the relevance floor.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.Demo = Demo;
