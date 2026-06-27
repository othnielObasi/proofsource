/* ProofSource — Creator Earnings. Exports window.AppCreator. */

function AppCreator({ go }) {
  const session = useStore((s) => s.session);
  const creator = useStore((s) => s.creator);
  const [feedUrl, setFeedUrl] = useState('');
  const [feedPrice, setFeedPrice] = useState('');
  const [listing, setListing] = useState(false);
  const [listed, setListed] = useState(null); // null | number (count)
  const [showWallet, setShowWallet] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [earningsData, setEarningsData] = useState(null); // real API data
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  const providerId = session?.providerId;

  // Load real earnings from API when we have a providerId
  useEffect(() => {
    if (!providerId) { window.Store.seedCreator(); return; }
    async function load() {
      setLoadingEarnings(true);
      try {
        const data = await window.PS_API.earnings(providerId);
        setEarningsData(data);
        // Sync wallet from API into local store
        if (data.walletAddress && !creator.wallet) {
          window.Store.connectWallet(data.walletAddress, 'connected');
        }
      } catch { /* fall back to local store */ }
      finally { setLoadingEarnings(false); }
    }
    load();
  }, [providerId]);

  // Poll earnings every 8s when a providerId is known
  useInterval(async () => {
    if (!providerId) return;
    try {
      const data = await window.PS_API.earnings(providerId);
      setEarningsData(data);
    } catch {}
  }, 8000, !!providerId);

  // Fall back to local store accrual when no real API session
  useEffect(() => { if (!providerId) window.Store.seedCreator(); }, []);
  useInterval(() => { if (!providerId) window.Store.accrueCitation(); }, 4500, !providerId && creator.pieces.length > 0);

  // Derive display totals — prefer real API data when available
  const apiEarned  = earningsData ? Number(earningsData.totalEarnedUsdc) : null;
  const apiCites   = earningsData ? earningsData.citations : null;
  const apiPieces  = earningsData?.perPiece || null;
  const apiRecent  = earningsData?.recent || null;
  const localTotals = window.Store.creatorTotals();
  const earned = apiEarned !== null ? apiEarned : localTotals.earned;
  const cites  = apiCites  !== null ? apiCites  : localTotals.cites;
  const avg    = cites > 0 ? earned / cites : 0;
  const pieces = apiPieces || creator.pieces.map((p) => ({ title: p.title, citations: p.citations, earningsUsdc: p.earned.toFixed(6) }));
  const recent = apiRecent || creator.citations.map((c) => ({ title: c.title, amountUsdc: c.amount.toFixed(6), at: new Date(c.at).toISOString(), receiptHash: c.receipt }));

  async function connectWallet(type) {
    setConnecting(type);
    try {
      if (type === 'managed') {
        const data = await window.PS_API.wallet({ kind: 'managed' });
        window.Store.connectWallet(data.walletAddress, 'managed');
      } else {
        // MetaMask / WalletConnect: simulate for prototype; production uses wagmi
        await new Promise((r) => setTimeout(r, 1400));
        const addr = '0x' + window.Store._hash(40);
        await window.PS_API.wallet({ walletAddress: addr, kind: 'connected' }).catch(() => {});
        window.Store.connectWallet(addr, type);
      }
    } catch {}
    setConnecting(null); setShowWallet(false);
  }

  async function submitFeed(e) {
    e && e.preventDefault();
    if (!feedUrl.trim() && !feedPrice) return;
    setListing(true);
    try {
      const body = feedUrl.trim()
        ? { feedUrl: feedUrl.trim(), priceUsdc: feedPrice || undefined }
        : { sample: true, priceUsdc: feedPrice || undefined };
      const data = await window.PS_API.connectFeed(body);
      setListed(data.listed || 1);
      setFeedUrl(''); setFeedPrice('');
      // Reload earnings
      if (providerId) {
        const updated = await window.PS_API.earnings(providerId);
        setEarningsData(updated);
      }
    } catch {
      setListed(0);
    } finally {
      setListing(false);
    }
  }

  const inp = {
    background: 'var(--panel2)', border: '1px solid var(--line)',
    borderRadius: 9, padding: '11px 14px', color: 'var(--text)',
    fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none', width: '100%',
  };

  const WALLETS = [
    { id: 'metamask',     label: 'MetaMask',     sub: 'Browser extension wallet' },
    { id: 'walletconnect',label: 'WalletConnect', sub: 'Mobile or desktop wallet' },
    { id: 'managed',      label: 'Managed wallet', sub: 'We create and hold keys for you' },
  ];

  return (
    <div className="page" style={{ maxWidth: 880, margin: '0 auto', padding: '40px 32px 80px' }}>

      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 36, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: 8 }}>Creator earnings</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, letterSpacing: '-.04em', color: 'var(--earned2)', lineHeight: 1 }}>
            {earned > 0 ? '$' + earned.toFixed(4) : '$0.0000'}
          </div>
          <div style={{ color: 'var(--mut)', fontSize: 13, marginTop: 6 }}>{cites.toLocaleString()} verified citations · avg {avg > 0 ? '$' + avg.toFixed(4) : '—'} each</div>
        </div>
        <Btn variant="earn" onClick={() => {}} style={{ opacity: earned > 0 ? 1 : 0.45, marginTop: 4 }}>Withdraw to wallet</Btn>
      </div>

      {/* ── Wallet ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Payout wallet</div>
        {creator.wallet ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--card-fill)', border: '1px solid var(--earned-line)', borderRadius: 11 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--earned-fill)', border: '1px solid var(--earned-line)', display: 'grid', placeItems: 'center', color: 'var(--earned)', fontSize: 15, flexShrink: 0 }}>◈</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{creator.wallet}</div>
              <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 2 }}>{creator.walletKind === 'managed' ? 'Managed by ProofSource' : 'External wallet'} · earnings settled on Arc</div>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => window.Store.connectWallet(null, null)}>Disconnect</Btn>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--card-fill)', border: '1px solid var(--line)', borderRadius: 11 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(84,180,136,.08)', border: '1px dashed var(--line)', display: 'grid', placeItems: 'center', color: 'var(--faint)', fontSize: 15, flexShrink: 0 }}>◈</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>No wallet connected</div>
              <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 2 }}>Your earnings are accumulating and will be released when you connect.</div>
            </div>
            <Btn variant="primary" size="sm" onClick={() => setShowWallet(true)}>Connect wallet</Btn>
          </div>
        )}
      </div>

      {/* ── List work ───────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>List your work</div>
        <form onSubmit={submitFeed} style={{ background: 'var(--card-fill)', border: '1px solid var(--line)', borderRadius: 11, padding: '18px 18px 16px' }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--faint)', marginBottom: 7 }}>Feed URL — any RSS/Atom or RSSHub route</label>
          <input style={inp} placeholder="https://yourblog.com/rss · or an RSSHub route" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel2)', border: '1px solid var(--line)', borderRadius: 8, padding: '0 12px', height: 42, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--faint)' }}>Price</span>
              <input style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 14, width: 64, textAlign: 'right' }} placeholder={creator.priceDefault.toFixed(3)} value={feedPrice} onChange={(e) => setFeedPrice(e.target.value)} />
              <span style={{ fontSize: 12, color: 'var(--faint)' }}>USDC</span>
            </div>
            <Btn variant="earn" type="submit" disabled={listing} style={{ height: 42 }}>{listing ? 'Listing…' : 'List feed'}</Btn>
          </div>
          {listed !== null && listed > 0 && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--earned)', fontFamily: 'var(--font-mono)' }}>✓ {listed} piece(s) listed. Agents can now cite and pay for your work.</div>}
          {listed === 0 && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--skip)', fontFamily: 'var(--font-mono)' }}>Feed listed (0 items parsed — check the URL).</div>}
        </form>
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 32, padding: '0 0 24px', borderBottom: '1px solid var(--line)' }}>
        {[['Total earned', earned > 0 ? '$' + earned.toFixed(4) : '$0.0000', 'var(--earned2)'],
          ['Citations paid', cites.toLocaleString(), 'var(--buy)'],
          ['Pieces listed', pieces.length, null],
          ['Settlement', 'Arc · USDC', null]].map(([l, v, c], i) => (
          <div key={i}>
            <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 700, marginBottom: 5 }}>{l}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 19, letterSpacing: '-.02em', color: c || 'var(--text)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* ── Two-col: pieces + citations ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="creator-cols">
        <div>
          <div style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Your pieces</div>
          <div style={{ background: 'var(--card-fill)', border: '1px solid var(--line)', borderRadius: 11, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Piece', 'Cited', 'Earned'].map((h) => (
                  <th key={h} style={{ textAlign: h === 'Earned' ? 'right' : 'left', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', fontWeight: 700, padding: '10px 14px' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pieces.length === 0 && (
                  <tr><td colSpan="3" style={{ padding: '20px 14px', fontSize: 13, color: 'var(--faint)', textAlign: 'center', borderTop: '1px solid var(--line)' }}>Connect a feed to list work.</td></tr>
                )}
                {pieces.slice(0, 6).map((p, i) => (
                  <tr key={p.id || i}>
                    <td style={{ padding: '11px 14px', borderTop: '1px solid var(--line)', fontSize: 13, maxWidth: 180 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                    </td>
                    <td style={{ padding: '11px 14px', borderTop: '1px solid var(--line)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mut)', whiteSpace: 'nowrap' }}>{(p.citations || 0)}×</td>
                    <td style={{ padding: '11px 14px', borderTop: '1px solid var(--line)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--earned2)', textAlign: 'right', whiteSpace: 'nowrap' }}>{p.earningsUsdc || (p.earned || 0).toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Recent citations</div>
          <div style={{ display: 'grid', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
            {recent.length === 0 && (
              <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--faint)', textAlign: 'center', background: 'var(--card-fill)', border: '1px solid var(--line)', borderRadius: 11 }}>Citations appear here as your work is cited.</div>
            )}
            {recent.slice(0, 10).map((c, i) => (
              <div key={c.id || i} style={{ background: 'var(--card-fill)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.title}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--earned2)', flexShrink: 0 }}>+{c.amountUsdc || (c.amount || 0).toFixed(6)}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>
                  {c.receiptHash || c.receipt}
                  {c.transaction && <span> · <a href={c.explorerUrl} target="_blank" rel="noopener" style={{ color: 'var(--buy)' }}>{c.transaction.slice(0, 10)}…</a></span>}
                  <span> · {new Date(c.at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Wallet selector overlay ──────────────────────────── */}
      {showWallet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.76)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'grid', placeItems: 'center', padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget && !connecting) setShowWallet(false); }}>
          <div style={{ background: '#0E1420', border: '1px solid var(--line)', borderRadius: 16, padding: 28, width: 'min(400px,100%)', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Connect a wallet</div>
            <div style={{ fontSize: 13, color: 'var(--mut)', marginBottom: 22 }}>Choose how you want to receive your USDC earnings on Arc.</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {WALLETS.map((w) => (
                <div key={w.id} onClick={() => !connecting && connectWallet(w.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: connecting === w.id ? 'rgba(84,180,136,.08)' : 'var(--panel2)', border: '1px solid ' + (connecting === w.id ? 'var(--earned-line)' : 'var(--line)'), borderRadius: 10, cursor: connecting ? 'default' : 'pointer', transition: 'border-color .15s, background .15s' }}>
                  <span style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--mut)', fontSize: 14, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                    {w.id === 'metamask' ? '🦊' : w.id === 'walletconnect' ? '⬡' : '◈'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: connecting === w.id ? 'var(--earned)' : 'var(--text)' }}>{w.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 2 }}>{connecting === w.id ? 'Connecting…' : w.sub}</div>
                  </div>
                  {connecting !== w.id && <span style={{ color: 'var(--faint)', fontSize: 16 }}>›</span>}
                </div>
              ))}
            </div>
            <button onClick={() => !connecting && setShowWallet(false)} style={{ marginTop: 18, background: 'none', border: 'none', color: 'var(--faint)', fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'center' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
window.AppCreator = AppCreator;
