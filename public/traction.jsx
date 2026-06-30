/* ProofSource — Traction Dashboard. Production pass.
   Exports window.AppTraction. */

function AppTraction({ go }) {
  const opTotals = window.Store.operatorTotals();
  const crTotals = window.Store.creatorTotals();

  const [apiData, setApiData] = useState(null);
  const [feed, setFeed]     = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    try {
      const [t, r] = await Promise.all([window.PS_API.traction(), window.PS_API.receipts()]);
      setApiData(t);
      setFeed(Array.isArray(r) ? r : []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);
  useInterval(loadAll, 10000);

  const platPaid    = apiData ? Number(apiData.totalPayoutUsdc)      : 0;
  const platSettled = apiData ? apiData.paymentCount                 : 0;
  const avgPayment  = apiData ? Number(apiData.avgTransactionUsdc)   : 0;
  const numCreators = apiData ? apiData.creatorsEarning              : 0;
  const reuseRate   = apiData ? Math.round(apiData.reuseRate * 100)  : 0;
  const convRate    = apiData ? Math.round(apiData.readerToPayerConversion * 100) : 0;
  const costPerTask = apiData ? apiData.costPerTaskUsdc              : '0.0000';

  const CREATORS = apiData?.perCreator?.length
    ? apiData.perCreator.map((r) => ({ c: r.creator, n: r.sales, e: Number(r.earningsUsdc) }))
    : [];
  const maxE = Math.max(...CREATORS.map((r) => r.e), 0.001);

  const S = { // section label
    fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase',
    color: 'var(--faint)', fontWeight: 700, margin: '0 0 14px',
  };

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 1060, margin: '0 auto' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: 6 }}>Traction</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 600, letterSpacing: '-.03em' }}>Real creators, paid by AI agents.</div>
          <div style={{ color: 'var(--mut)', fontSize: 13.5, marginTop: 6 }}>Derived from settled receipts — not seeded. Session data included.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(84,180,136,.07)', border: '1px solid var(--earned-line)', borderRadius: 9, padding: '8px 13px' }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--earned)', boxShadow: 'var(--glow-earned)', animation: 'tagdot 1.4s infinite', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--earned2)' }}>Arc testnet · settling</span>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, marginBottom: 32, background: 'rgba(255,255,255,.05)', borderRadius: 13, overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)' }}>
        {[
          { l: 'Paid to creators',  v: '$' + platPaid.toFixed(4),         c: 'var(--earned2)', sub: 'USDC, all-time' },
          { l: 'Settlements',       v: platSettled.toLocaleString(),       c: 'var(--buy)',     sub: 'on-chain' },
          { l: 'Avg payment',       v: '$' + avgPayment.toFixed(4),        c: 'var(--text)',    sub: 'per citation' },
          { l: 'Creators earning',  v: String(numCreators),                c: 'var(--earned2)', sub: 'distinct sources' },
        ].map(({ l, v, c, sub }, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,.025)', padding: '20px 22px' }}>
            <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 700 }}>{l}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, letterSpacing: '-.03em', marginTop: 8, color: c }}>{v}</div>
            <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* funnel inline */}
      <div style={{ display: 'flex', gap: 36, padding: '0 0 24px', marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,.07)', flexWrap: 'wrap' }}>
        {[['Reader-agents', apiData ? String(apiData.readers) : '—'], ['Tasks run', platSettled.toLocaleString()], ['→ pays', convRate + '%'], ['Reuse rate', reuseRate + '%'], ['Cost / task', '$' + costPerTask]].map(([l, v], i) => (
          <div key={i}>
            <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, marginBottom: 4 }}>{l}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 19, letterSpacing: '-.02em', color: 'var(--text)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* two-col: creator table + live feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24 }} className="traction-cols">

        {/* creator earnings */}
        <div>
          <div style={S}>Creators earning</div>
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, overflow: 'hidden' }}>
            {CREATORS.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Creator', 'Citations', 'Earned'].map((h) => (
                      <th key={h} style={{ textAlign: h === 'Earned' ? 'right' : 'left', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', fontWeight: 700, padding: '12px 16px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CREATORS.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)', fontSize: 13.5 }}>{r.c}</td>
                      <td style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: (r.e / maxE * 100) + '%', background: 'linear-gradient(90deg,#2f6f51,var(--earned))', transition: 'width .6s' }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--mut)', fontSize: 12, width: 34, textAlign: 'right' }}>{r.n}×</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--earned2)', textAlign: 'right' }}>{r.e.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>
                {loading ? 'Loading…' : 'No creators earning yet — run an agent to generate citations.'}
              </div>
            )}
          </div>
        </div>

        {/* live feed — real receipts from API */}
        <div>
          <div style={S}>Recent settlements</div>
          <div style={{ display: 'grid', gap: 7, maxHeight: 420, overflowY: 'auto' }}>
            {feed.length > 0 ? feed.map((s, i) => (
              <div key={s.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: i === 0 ? 'rgba(84,180,136,.04)' : 'rgba(255,255,255,.02)', border: '1px solid ' + (i === 0 ? 'rgba(84,180,136,.18)' : 'rgba(255,255,255,.06)'), borderRadius: 9, padding: '10px 13px', animation: i === 0 ? 'pageIn .4s ease' : 'none' }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--earned)', boxShadow: i === 0 ? 'var(--glow-earned)' : 'none', flexShrink: 0, marginTop: 3 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text)' }}>{s.providerName || s.providerId}</span>
                    <span style={{ color: 'var(--mut)', margin: '0 5px' }}>·</span>
                    <span style={{ color: 'var(--mut)', fontSize: 12.5 }}>
                      {String(s.resourceTitle || s.resourceId || '').slice(0, 32) || '—'}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)', marginTop: 3 }}>{s.id}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--earned2)', flexShrink: 0 }}>+{Number(s.amountUsdc || 0).toFixed(6)}</span>
              </div>
            )) : (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--faint)', fontSize: 13, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 9 }}>
                {loading ? 'Loading settlements…' : 'No settlements yet — run an agent from the Console to generate your first paid citation.'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--faint)', borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 16 }}>
        {apiData
          ? `Live from API · updated ${new Date(apiData.generatedAt).toLocaleTimeString()} · mode: ${apiData.paymentMode}`
          : loading ? 'Loading…' : 'No settled data yet — run an agent from the Console to populate this dashboard.'}
      </div>
    </div>
  );
}
window.AppTraction = AppTraction;
