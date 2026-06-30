/* ProofSource — Public Analytics. Registered users by category + daily traffic.
   No auth required. Exports window.Analytics. */

function Analytics({ go }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);

  async function load() {
    try {
      const fresh = await window.PS_API.analytics();
      setData(fresh);
      setPulse(true);
      setTimeout(() => setPulse(false), 700);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useInterval(load, 8000);

  const S = {
    fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase',
    color: 'var(--faint)', fontWeight: 700, margin: '0 0 14px',
  };

  const categories = data?.usersByCategory ?? [];
  const maxCat = Math.max(...categories.map((c) => c.count), 1);
  const traffic = data?.dailyTraffic ?? [];
  const maxTraffic = Math.max(...traffic.map((d) => d.logins + d.signups), 1);

  const CAT_LABEL = { creator: 'Creators', operator: 'Operators' };
  const CAT_COLOR = { creator: 'var(--earned2)', operator: 'var(--buy)' };

  return (
    <div className="page">
      <section style={{ maxWidth: 1060, margin: '0 auto', padding: '40px 26px 80px' }}>

        {/* header */}
        <div style={{ marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: 6 }}>Analytics</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 32, letterSpacing: '-.03em', margin: '0 0 8px' }}>Who's on the floor.</h1>
            <p style={{ color: 'var(--mut)', fontSize: 14.5, margin: 0, lineHeight: 1.5 }}>Registered users and daily activity — derived from real accounts and sign-ins, updated live.</p>
          </div>
          <Tag tone="earned">Live · refreshes every 8s</Tag>
        </div>

        {/* total + category KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, marginBottom: 32, background: 'rgba(255,255,255,.05)', borderRadius: 13, overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)' }} className="metrics-grid">
          <div style={{ background: 'rgba(255,255,255,.025)', padding: '20px 22px', boxShadow: pulse ? 'inset 0 0 0 1px rgba(84,180,136,.4)' : 'inset 0 0 0 1px transparent', transition: 'box-shadow .5s' }}>
            <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 700 }}>Registered users</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, letterSpacing: '-.03em', marginTop: 8, color: 'var(--text)' }}>
              {data ? <CountUp to={data.totalUsers} dur={900} /> : '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>all-time</div>
          </div>
          {['creator', 'operator'].map((cat) => {
            const c = categories.find((x) => x.category === cat);
            return (
              <div key={cat} style={{ background: 'rgba(255,255,255,.025)', padding: '20px 22px', boxShadow: pulse ? 'inset 0 0 0 1px rgba(84,180,136,.4)' : 'inset 0 0 0 1px transparent', transition: 'box-shadow .5s' }}>
                <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 700 }}>{CAT_LABEL[cat]}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, letterSpacing: '-.03em', marginTop: 8, color: CAT_COLOR[cat] }}>
                  <CountUp to={c ? c.count : 0} dur={900} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>registered</div>
              </div>
            );
          })}
        </div>

        {/* category breakdown bars */}
        <div style={{ marginBottom: 32 }}>
          <div style={S}>Users by category</div>
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '18px 20px' }}>
            {categories.length > 0 ? categories.map((c) => (
              <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 90, fontSize: 13, color: 'var(--text)' }}>{CAT_LABEL[c.category] || c.category}</div>
                <div style={{ flex: 1, height: 10, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: (c.count / maxCat * 100) + '%', background: CAT_COLOR[c.category] || 'var(--text)', transition: 'width .6s' }} />
                </div>
                <div style={{ width: 32, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--mut)' }}>{c.count}</div>
              </div>
            )) : (
              <div style={{ padding: '14px 4px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>
                {loading ? 'Loading…' : 'No registered users yet.'}
              </div>
            )}
          </div>
        </div>

        {/* daily traffic */}
        <div>
          <div style={S}>Daily traffic — last {traffic.length || 14} days</div>
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '20px 20px 14px', position: 'relative' }}>
            {hoverIdx != null && traffic[hoverIdx] && (
              <div style={{ position: 'absolute', top: 10, right: 16, background: '#0E1420', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11.5, zIndex: 2, boxShadow: '0 8px 24px rgba(0,0,0,.4)', animation: 'pageIn .15s var(--ease)' }}>
                <div style={{ color: 'var(--text)', marginBottom: 4, fontWeight: 700 }}>{traffic[hoverIdx].date}</div>
                <div style={{ color: 'var(--buy)' }}>{traffic[hoverIdx].logins} logins</div>
                <div style={{ color: 'var(--earned2)' }}>{traffic[hoverIdx].signups} signups</div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
              {traffic.map((d, i) => {
                const total = d.logins + d.signups;
                const h = Math.max(2, total / maxTraffic * 120);
                const loginH = total ? (d.logins / total) * h : 0;
                const signupH = h - loginH;
                const isLast = i === traffic.length - 1;
                const on = hoverIdx === i;
                return (
                  <div
                    key={d.date}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', cursor: 'pointer' }}
                  >
                    <div style={{ width: '100%', maxWidth: 22, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 120, opacity: hoverIdx != null && !on ? .45 : 1, transition: 'opacity .2s', filter: on ? 'brightness(1.25)' : 'none' }}>
                      {signupH > 0 && <div style={{ width: '100%', height: signupH, background: 'var(--earned2)', borderRadius: '3px 3px 0 0', transition: 'height .5s var(--ease)', boxShadow: isLast ? '0 0 10px rgba(84,180,136,.5)' : 'none' }} />}
                      {loginH > 0 && <div style={{ width: '100%', height: loginH, background: 'var(--buy)', borderRadius: signupH > 0 ? 0 : '3px 3px 0 0', transition: 'height .5s var(--ease)', boxShadow: isLast ? '0 0 10px rgba(91,192,235,.5)' : 'none' }} />}
                      {total === 0 && <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,.08)' }} />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--faint)' }}>
              <span>{traffic[0]?.date?.slice(5) || ''}</span>
              <span>{traffic[traffic.length - 1]?.date?.slice(5) || ''}</span>
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mut)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--buy)' }} />Logins</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mut)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--earned2)' }} />Signups</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--faint)' }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--earned)', boxShadow: 'var(--glow-earned)', animation: 'tagdot 1.6s infinite' }} />
          {data ? `Live · updated ${new Date(data.generatedAt).toLocaleTimeString()}` : loading ? 'Loading…' : 'No data yet.'}
        </div>
      </section>
    </div>
  );
}
window.Analytics = Analytics;
