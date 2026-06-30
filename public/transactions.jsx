/* ProofSource — Creator Transactions. Personal settlement history, each
   row a verifiable receipt with a link to the on-chain transaction.
   Exports window.AppTransactions. */

function AppTransactions({ go }) {
  const session = useStore((s) => s.session);
  const providerId = session?.providerId;

  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!providerId) { setLoading(false); return; }
    try {
      const data = await window.PS_API.earnings(providerId);
      setRows(data.recent || []);
    } catch { setRows([]); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [providerId]);
  useInterval(load, 10000, !!providerId);

  const S = {
    fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase',
    color: 'var(--faint)', fontWeight: 700, margin: '0 0 14px',
  };

  const list = rows || [];
  const total = list.reduce((s, r) => s + Number(r.amountUsdc || 0), 0);
  const verified = list.filter((r) => r.transaction).length;

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 1060, margin: '0 auto' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: 6 }}>Transactions</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>Your settlement history.</div>
          <div style={{ color: 'var(--mut)', fontSize: 13.5, marginTop: 6 }}>{list.length} citation{list.length === 1 ? '' : 's'} paid · {verified} on-chain verified</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 700 }}>Total received</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: 'var(--earned2)', marginTop: 4 }}>${total.toFixed(4)}</div>
        </div>
      </div>

      <div style={S}>All transactions</div>
      <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, overflow: 'hidden' }}>
        {list.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Piece', 'Amount', 'Date', 'Receipt', 'Verified tx'].map((h) => (
                  <th key={h} style={{ textAlign: h === 'Amount' ? 'right' : 'left', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', fontWeight: 700, padding: '12px 16px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={r.id || i}>
                  <td style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)', fontSize: 13.5, maxWidth: 220 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  </td>
                  <td style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--earned2)', textAlign: 'right', whiteSpace: 'nowrap' }}>+{r.amountUsdc}</td>
                  <td style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)', fontSize: 12.5, color: 'var(--mut)', whiteSpace: 'nowrap' }}>{new Date(r.at).toLocaleString()}</td>
                  <td style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--faint)' }}>{(r.receiptHash || '').slice(0, 14)}…</td>
                  <td style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                    {r.transaction && r.explorerUrl ? (
                      <a href={r.explorerUrl} target="_blank" rel="noopener" style={{ color: 'var(--buy)', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                        {r.transaction.slice(0, 10)}… ↗
                      </a>
                    ) : (
                      <span style={{ color: 'var(--faint)', fontSize: 11.5 }}>pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>
            {loading ? 'Loading…' : 'No settlements yet — once an AI agent cites and pays for your work, it shows up here.'}
          </div>
        )}
      </div>
    </div>
  );
}
window.AppTransactions = AppTransactions;
