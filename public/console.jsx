/* ProofSource — Operator Console. Real editable question, smart routing.
   Exports window.AppConsole. */

const RUN_BUY_KEYWORDS = ['licens', 'copyright', 'creator', 'content', 'royalt', 'publish', 'journalist', 'pay', 'citation', 'attribution', 'monetiz', 'writer', 'article', 'source', 'knowledge'];
const RUN_SKIP_KEYWORDS = ['recipe', 'food', 'cook', 'sport', 'weather', 'movie', 'song', 'celebrity', 'game', 'bread', 'cake', 'pizza'];

function decideBuyReuseSkip(question, prevQuestions) {
  const q = question.toLowerCase();
  // REUSE: very similar to a previous question
  const similar = prevQuestions.find((p) => {
    const words = q.split(/\s+/).filter((w) => w.length > 4);
    const matches = words.filter((w) => p.toLowerCase().includes(w));
    return matches.length >= Math.min(3, Math.floor(words.length * 0.5));
  });
  if (similar) return 'royalties'; // maps to REUSE scenario
  // SKIP: clearly off-topic
  if (RUN_SKIP_KEYWORDS.some((k) => q.includes(k))) return 'sourdough'; // maps to SKIP
  // BUY: relevant topic
  if (RUN_BUY_KEYWORDS.some((k) => q.includes(k))) return 'licensing'; // maps to BUY
  // default: BUY for unknown topics
  return 'licensing';
}

function RelBar({ v }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 64, height: 6, borderRadius: 6, background: 'rgba(255,255,255,.04)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: Math.round(v * 100) + '%', background: 'linear-gradient(90deg,#33506b,var(--buy))', transition: 'width .5s var(--ease)' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mut)', width: 30, textAlign: 'right' }}>{Math.round(v * 100)}%</span>
    </div>
  );
}

const ACTION_COLOR = { BUY: 'var(--buy)', REUSE: 'var(--reuse)', SKIP: 'var(--faint)', BLOCK: 'var(--block)' };

function AppConsole({ go }) {
  const session = useStore((s) => s.session);
  const operator = useStore((s) => s.operator);
  const { mandate, spent, runs } = operator;
  const totals = window.Store.operatorTotals();

  const [question, setQuestion] = useState('');
  const [running, setRunning] = useState(false);
  const [reached, setReached] = useState(-1);
  const [editMandate, setEditMandate] = useState(false);
  const [mandateDraft, setMandateDraft] = useState(mandate);
  const [error, setError] = useState('');

  // Real result from the API (null until a run completes)
  const [result, setResult] = useState(null);
  // Steps replayed from the real trace
  const [replaySteps, setReplaySteps] = useState([]);

  const steps = replaySteps.length > 0 ? replaySteps : PS_DATA.runs.licensing.pipeline;
  const done = result && reached >= steps.length && reached > 0;
  const showTable = reached >= 2 || done;
  const idle = reached <= 0 && !running && !result;

  // Replay animation tick
  useEffect(() => {
    if (!running || reached < 0) return;
    if (reached >= steps.length) { setRunning(false); return; }
    const tid = setTimeout(() => setReached((r) => r + 1), 420);
    return () => clearTimeout(tid);
  }, [running, reached, steps.length]);

  async function startRun() {
    const q = question.trim();
    if (!q) return;
    setError('');
    setResult(null);
    setReached(0);
    setRunning(true);

    try {
      // Seed demo data on first run if workspace not ready
      await window.PS_API.seed().catch(() => {});

      const data = await window.PS_API.runAgent({
        workspaceId: 'ws_demo',
        agentId: 'agent_research_01',
        question: q,
      });
      setResult(data);

      // Map real trace to pipeline step labels
      const realSteps = (data.trace || []).map((t) => ({
        label: t.step.charAt(0).toUpperCase() + t.step.slice(1),
        status: t.status,
        detail: t.detail,
      }));
      setReplaySteps(realSteps.length > 0 ? realSteps : PS_DATA.runs.licensing.pipeline);
      setReached(0);

      // Record in local history
      const action = data.decision?.action || 'SKIP';
      const amount = Number(data.spend?.totalUsdc || 0);
      window.Store.recordRun({ q, action, amount, paid: data.sources?.[0]?.providerName || null, verified: data.sources?.[0]?.paymentStatus === 'released' });

    } catch (err) {
      setError(err.message || 'Agent run failed.');
      setRunning(false);
      setReached(-1);
    }
  }

  async function saveMandate() {
    const patch = { workspaceId: 'ws_demo', budgetUsdc: String(mandateDraft.budget), perTaskMaxUsdc: String(mandateDraft.ceiling), maxPricePerSourceUsdc: String(mandateDraft.maxPer), requireCitation: mandateDraft.requireCite };
    try { await window.PS_API.setMandate(patch); } catch {}
    window.Store.setMandate({ budget: +mandateDraft.budget, ceiling: +mandateDraft.ceiling, maxPer: +mandateDraft.maxPer, requireCite: mandateDraft.requireCite });
    setEditMandate(false);
  }

  // Derive display values from real result or fall back to mock for idle state
  const action = result?.decision?.action || 'BUY';
  const badgeTone = action === 'BUY' ? 'buy' : action === 'REUSE' ? 'reuse' : 'skip';
  const reasoning = result?.decision?.reasoning || '';
  const candidates = result?.decision?.scores?.map((s) => ({
    work: s.title || s.resourceId,
    creator: s.providerId,
    rel: s.relevance || 0,
    price: Number(s.priceUsdc || 0),
    tone: s.verdict === 'bought' ? 'buy' : s.verdict === 'reused' ? 'reuse' : 'skip',
    verdict: s.verdict || 'skipped',
  })) || PS_DATA.runs.licensing.candidates;
  const answer = result?.answer || '';
  const paidSource = result?.sources?.[0];
  const receiptId = paidSource?.receiptId;
  const deliveryHash = paidSource?.deliveryHash;
  const explorerUrl = null; // populated after real Arc settlement
  const settledAmount = Number(result?.spend?.totalUsdc || 0);
  const budgetPct = Math.min(100, Math.round((spent / mandate.budget) * 100));
  const remaining = Math.max(0, mandate.budget - spent);

  const fieldS = { background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 9, padding: '9px 12px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, width: '100%', outline: 'none' };
  const labS = { fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700, display: 'block', marginBottom: 5 };

  const SUGGESTIONS = [
    'What are the key arguments around AI content licensing?',
    'How should music royalties be split by listener plays?',
    'What is the best sourdough bread recipe?',
  ];

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 1120, margin: '0 auto' }}>

      {/* ── Page header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: 8 }}>Research agent</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.02em' }}>{session && session.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--faint)', marginTop: 6 }}>
            Budget <span style={{ color: 'var(--text)' }}>${(mandate.budget || 0).toFixed(2)}</span>
            <span style={{ margin: '0 8px', opacity: .35 }}>·</span>
            Ceiling <span style={{ color: 'var(--text)' }}>${(mandate.ceiling || 0).toFixed(2)}</span>
            <span style={{ margin: '0 8px', opacity: .35 }}>·</span>
            Cite <span style={{ color: 'var(--text)' }}>{mandate.requireCite ? 'required' : 'optional'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, marginTop: 4 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 3 }}>Remaining</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: remaining < 1 ? 'var(--skip)' : 'var(--text)', letterSpacing: '-.02em' }}>${remaining.toFixed(4)}</div>
          </div>
          <Btn variant="outline" size="sm" onClick={() => { setEditMandate(true); setMandateDraft(mandate); }}>Edit</Btn>
        </div>
      </div>

      {/* ── Budget bar ───────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: budgetPct + '%', background: 'linear-gradient(90deg,var(--earned),var(--buy))', transition: 'width .6s var(--ease)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--faint)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
          <span>${spent.toFixed(4)} spent</span><span>${mandate.budget.toFixed(2)} budget</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20, alignItems: 'start' }}>
        {/* ── Left: ask + results ──────────────────────────── */}
        <div style={{ display: 'grid', gap: 14 }}>

          {/* Ask */}
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12 }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startRun(); } }}
              placeholder="Ask a research question — the agent will decide, pay, and cite…"
              style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.5, padding: '16px 16px 0', resize: 'none', minHeight: 64, boxSizing: 'border-box' }}
              rows={2}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 12px' }}>
              <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SUGGESTIONS.map((s, i) => (
                  <span key={i} onClick={() => setQuestion(s)} style={{ fontSize: 11.5, color: 'var(--faint)', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {s.slice(0, 36)}…
                  </span>
                ))}
              </div>
              <Btn variant="primary" size="sm" onClick={startRun} disabled={remaining <= 0 || running}>
                {running ? 'Running…' : 'Run →'}
              </Btn>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div style={{ background: 'rgba(220,60,40,.07)', border: '1px solid rgba(220,60,40,.2)', borderRadius: 10, padding: '12px 16px', color: '#f4a09a', fontSize: 13 }}>{error}</div>
          )}

          {/* Decision + pipeline (only after run starts) */}
          {!idle && (
            <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Badge tone={badgeTone}>{running && reached < 2 ? '…' : action}</Badge>
                <span style={{ fontSize: 13, color: 'var(--mut)', flex: 1 }}>{showTable ? reasoning || 'Evaluating sources…' : 'Scoring permitted sources…'}</span>
              </div>

              {/* Pipeline */}
              <div style={{ marginBottom: showTable ? 14 : 0 }}>
                <Pipeline steps={steps} reached={reached} />
              </div>

              {/* Source table */}
              {showTable && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
                  <thead><tr>{['Source', 'Relevance', 'Price', 'Verdict'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', fontWeight: 700, padding: '0 10px 8px' }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {candidates.map((c, i) => {
                      const pick = /bought|reused/.test(c.verdict);
                      return (
                        <tr key={i} style={{ background: pick ? 'rgba(91,192,235,.04)' : 'transparent' }}>
                          <td style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13.5 }}>{c.work}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--mut)' }}>{c.creator}</div>
                          </td>
                          <td style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,.05)', minWidth: 110 }}><RelBar v={c.rel} /></td>
                          <td style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,.05)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mut)' }}>${c.price.toFixed(3)}</td>
                          <td style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,.05)' }}><Badge tone={c.tone}>{c.verdict.split(':')[0].split(' ')[0]}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Answer */}
          {done && (
            <div style={{ background: settledAmount > 0 ? 'rgba(84,180,136,.04)' : 'rgba(255,255,255,.02)', border: '1px solid ' + (settledAmount > 0 ? 'rgba(84,180,136,.22)' : 'rgba(255,255,255,.07)'), borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 11, color: settledAmount > 0 ? 'var(--earned2)' : 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, marginBottom: 10 }}>Grounded answer</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15.5, lineHeight: 1.65, color: '#C9D5E8' }}>{answer}</div>
            </div>
          )}

          {/* Run history */}
          {runs.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, padding: '14px 16px 0' }}>Run history</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
                <thead><tr>{['Question', 'Decision', 'Settled', 'Time'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', fontWeight: 700, padding: '0 14px 8px' }}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {runs.slice(0, 8).map((r) => (
                    <tr key={r.id} onClick={() => setQuestion(r.q)} style={{ cursor: 'pointer' }}>
                      <td style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.05)', maxWidth: 340 }}>
                        <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{r.q}</div>
                      </td>
                      <td style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.05)' }}><Badge tone={r.action === 'BUY' ? 'buy' : r.action === 'REUSE' ? 'reuse' : 'skip'} style={{ fontSize: 11 }}>{r.action}</Badge></td>
                      <td style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.05)', fontFamily: 'var(--font-mono)', fontSize: 12, color: r.amount ? 'var(--earned2)' : 'var(--faint)' }}>{r.amount ? '$' + r.amount.toFixed(6) : '—'}</td>
                      <td style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.05)', fontSize: 12, color: 'var(--faint)', whiteSpace: 'nowrap' }}>{new Date(r.at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty state */}
          {runs.length === 0 && idle && (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--faint)' }}>Type a question above and press <kbd style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 5, padding: '2px 7px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Enter</kbd> to run your agent.</div>
              <div style={{ fontSize: 12, color: 'var(--faint)', opacity: .6, marginTop: 8 }}>The agent will score permitted sources, decide what to buy, pay, and return a grounded answer with a receipt.</div>
            </div>
          )}
        </div>

        {/* ── Right: this run ──────────────────────────────── */}
        <div style={{ position: 'sticky', top: 20, display: 'grid', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, marginBottom: 14 }}>This run</div>
            {[
              ['Decision',     idle ? '—' : action,                             ACTION_COLOR[action] || 'var(--mut)'],
              ['Settled',      idle ? '—' : '$' + settledAmount.toFixed(6),     'var(--text)'],
              ['Verification', done && settledAmount > 0 ? 'passed' : done ? 'n/a' : '—', 'var(--earned)'],
              ['Session runs', totals.runs,                                      'var(--text)'],
              ['Total spent',  '$' + totals.spent.toFixed(6),                   totals.spent > 0 ? 'var(--buy)' : 'var(--faint)'],
            ].map(([l, v, c], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: i ? '1px solid rgba(255,255,255,.05)' : 'none', fontSize: 13 }}>
                <span style={{ color: 'var(--mut)' }}>{l}</span>
                <b style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: c }}>{String(v)}</b>
              </div>
            ))}
          </div>

          {done && paidSource && receiptId && (
            <Receipt tilt={false}
              title={'Paid ' + (paidSource.providerName || 'creator')}
              rows={[
                { k: 'amount',   v: '$' + settledAmount.toFixed(6) },
                { k: 'delivery', v: deliveryHash ? deliveryHash.slice(0, 18) + '…' : '—' },
                { k: 'receipt',  v: receiptId },
                ...(explorerUrl ? [{ k: 'explorer', v: explorerUrl }] : []),
              ]}
              amount={'$' + settledAmount.toFixed(3)}
              style={{ transform: 'none', width: '100%', borderRadius: 11 }}
            />
          )}
          {done && (!paidSource || !receiptId) && (
            <div style={{ background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.08)', borderRadius: 12, padding: 16, textAlign: 'center', color: 'var(--mut)', fontSize: 13 }}>
              No payment — {action === 'REUSE' ? 'reused owned paid context.' : 'nothing cleared the relevance floor.'}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit mandate overlay ──────────────────────────── */}
      {editMandate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.76)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'grid', placeItems: 'center', padding: 24 }} onClick={(e) => { if (e.target === e.currentTarget) setEditMandate(false); }}>
          <div style={{ background: '#0E1420', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 28, width: 'min(580px,100%)', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Edit mandate</div>
            <div style={{ fontSize: 13, color: 'var(--mut)', marginBottom: 22 }}>Set the rules your agent follows. It can never exceed these limits.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
              {[['Budget ($)', 'budget', '5.00'], ['Per-task ceiling ($)', 'ceiling', '0.05'], ['Max / source ($)', 'maxPer', '0.01']].map(([l, k, p]) => (
                <div key={k}>
                  <label style={labS}>{l}</label>
                  <input style={fieldS} type="number" step="0.001" value={mandateDraft[k]} onChange={(e) => setMandateDraft((d) => ({ ...d, [k]: e.target.value }))} placeholder={p} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={labS}>Require citation</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['yes', 'no'].map((v) => (
                  <span key={v} onClick={() => setMandateDraft((d) => ({ ...d, requireCite: v === 'yes' }))} style={{ padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 13, border: '1px solid ' + ((mandateDraft.requireCite ? 'yes' : 'no') === v ? '#2c5a70' : 'rgba(255,255,255,.08)'), background: (mandateDraft.requireCite ? 'yes' : 'no') === v ? 'rgba(91,192,235,.08)' : 'rgba(255,255,255,.03)', color: (mandateDraft.requireCite ? 'yes' : 'no') === v ? 'var(--buy)' : 'var(--mut)' }}>{v}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="primary" onClick={saveMandate}>Save mandate</Btn>
              <Btn variant="ghost" onClick={() => setEditMandate(false)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
window.AppConsole = AppConsole;
