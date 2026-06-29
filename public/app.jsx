/* ProofSource — App shell. Sidebar layout for app, top nav for marketing. */

const SIDEBAR_BG = '#0F1623';
const CONTENT_BG = '#080C12';

/* ── Sidebar nav (app mode) ──────────────────────────────── */
function Sidebar({ session, page, go }) {
  const isCreator = session.role === 'creator';
  const links = isCreator
    ? [{ id: 'creator', label: 'Earnings' }, { id: 'traction', label: 'Traction' }]
    : [{ id: 'console', label: 'Console' }, { id: 'traction', label: 'Traction' }];

  return (
    <aside style={{ width: 220, minHeight: '100vh', background: SIDEBAR_BG, borderRight: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
      {/* logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }} onClick={() => go(isCreator ? 'creator' : 'console')}>
          <span style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(84,180,136,.18)', border: '1px solid var(--earned-line)', display: 'grid', placeItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--earned)', boxShadow: 'var(--glow-earned)' }} />
          </span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, letterSpacing: '-.02em' }}>ProofSource</span>
        </div>
      </div>

      {/* nav */}
      <nav style={{ padding: '14px 12px', flex: 1 }}>
        <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, padding: '0 8px 8px' }}>
          {isCreator ? 'Creator' : 'Operator'}
        </div>
        {links.map((l) => {
          const on = page === l.id;
          return (
            <div key={l.id} onClick={() => go(l.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: on ? 'rgba(255,255,255,.07)' : 'transparent', color: on ? 'var(--text)' : 'var(--mut)', fontSize: 14, fontWeight: on ? 600 : 400, transition: 'background .15s, color .15s' }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: on ? (isCreator ? 'var(--earned)' : 'var(--buy)') : 'transparent', boxShadow: on ? (isCreator ? 'var(--glow-earned)' : 'var(--glow-buy)') : 'none', flexShrink: 0, transition: 'all .2s' }} />
              {l.label}
            </div>
          );
        })}

        <div style={{ marginTop: 24, fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, padding: '0 8px 8px' }}>General</div>
        {[{ id: 'home', label: 'Marketing site' }, { id: 'demo', label: 'Live demo' }].map((l) => (
          <div key={l.id} onClick={() => go(l.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, color: 'var(--faint)', fontSize: 13.5, transition: 'color .15s' }}>
            {l.label}
          </div>
        ))}
      </nav>

      {/* user */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: isCreator ? 'var(--earned-fill)' : 'var(--buy-fill)', border: '1px solid ' + (isCreator ? 'var(--earned-line)' : 'rgba(91,192,235,.2)'), display: 'grid', placeItems: 'center', color: isCreator ? 'var(--earned2)' : 'var(--buy)', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
            {(session.name || '?')[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.name}</div>
            <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>{session.role}</div>
          </div>
        </div>
        {!isCreator && session.apiKey && <ApiKeyBadge apiKey={session.apiKey} />}
        <div onClick={() => { window.Store.signOut(); go('home'); }} style={{ fontSize: 12.5, color: 'var(--faint)', cursor: 'pointer', padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,.04)', textAlign: 'center', transition: 'background .15s', marginTop: 8 }}>Sign out</div>
      </div>
    </aside>
  );
}

function ApiKeyBadge({ apiKey }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const display = show ? apiKey : apiKey.slice(0, 12) + '…';
  function copy() {
    navigator.clipboard.writeText(apiKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div style={{ marginBottom: 8, background: 'rgba(91,192,235,.05)', border: '1px solid rgba(91,192,235,.15)', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 9.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, marginBottom: 4 }}>API key</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--buy)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display}</div>
        <span onClick={() => setShow((s) => !s)} style={{ cursor: 'pointer', fontSize: 10, color: 'var(--faint)', flexShrink: 0 }}>{show ? 'hide' : 'show'}</span>
        <span onClick={copy} style={{ cursor: 'pointer', fontSize: 10, color: copied ? 'var(--earned2)' : 'var(--faint)', flexShrink: 0 }}>{copied ? '✓' : 'copy'}</span>
      </div>
    </div>
  );
}

/* ── Marketing top nav (logged-out) ─────────────────────── */
function MarketingNav({ page, go }) {
  const PAGES = [{ id: 'home', label: 'Home' }, { id: 'demo', label: 'Live demo' }, { id: 'solutions', label: 'Solutions' }, { id: 'developers', label: 'Developers' }];
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', gap: 20, padding: '14px 26px', borderBottom: '1px solid var(--line)', background: 'rgba(8,11,17,.78)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
      <Wordmark onClick={() => go('home')} />
      <nav style={{ display: 'flex', alignItems: 'center', gap: 20, marginLeft: 28 }} className="nav-links">
        {PAGES.map((p) => {
          const on = page === p.id;
          return (
            <a key={p.id} onClick={() => go(p.id)} style={{ position: 'relative', cursor: 'pointer', fontSize: 13.5, color: on ? 'var(--text)' : 'var(--mut)', transition: 'color .15s', padding: '4px 0' }}>
              {p.label}
              {on && <span style={{ position: 'absolute', left: 0, right: 0, bottom: -6, height: 2, borderRadius: 99, background: 'var(--earned)', boxShadow: 'var(--glow-earned)' }} />}
            </a>
          );
        })}
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }} className="nav-right">
        <a onClick={() => go('auth')} style={{ cursor: 'pointer', fontSize: 13.5, color: 'var(--mut)' }} className="nav-signin">Sign in</a>
        <Btn variant="primary" size="sm" onClick={() => go('auth')}>Create account</Btn>
      </div>
    </header>
  );
}

function Footer({ go }) {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', background: 'rgba(7,10,16,.5)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 26px', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 28 }} className="footer-grid">
        <div>
          <Wordmark sub={false} />
          <p style={{ color: 'var(--mut)', fontSize: 13, lineHeight: 1.55, margin: '12px 0 0', maxWidth: 260 }}>Verified-delivery nanopayments for AI-cited content. Settled on Arc in USDC via Circle Gateway.</p>
          <div style={{ marginTop: 14 }}><Tag tone="earned">All systems settling</Tag></div>
        </div>
        {[
          { h: 'Product', items: [['Live demo', 'demo'], ['Solutions', 'solutions'], ['Developers', 'developers']] },
          { h: 'Creators', items: [['Get paid', 'auth'], ['Earnings', 'auth'], ['Connect a feed', 'auth']] },
          { h: 'Operators', items: [['Run an agent', 'auth'], ['Console', 'auth'], ['Traction', 'auth']] },
        ].map((col) => (
          <div key={col.h}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--faint)', fontWeight: 800, marginBottom: 12 }}>{col.h}</div>
            {col.items.map(([label, pg]) => <div key={label} onClick={() => go(pg)} style={{ color: 'var(--mut)', fontSize: 13.5, padding: '5px 0', cursor: 'pointer' }}>{label}</div>)}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--line-soft)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '14px 26px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', color: 'var(--faint)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          <span>© 2026 ProofSource · content that earns every time AI cites it</span>
          <span>Lepton Agents · Canteen × Circle × Arc</span>
        </div>
      </div>
    </footer>
  );
}

function App() {
  const session = useStore((s) => s.session);
  const [page, setPage] = useState(() => {
    if (session) return session.role === 'creator' ? 'creator' : 'console';
    return 'home';
  });

  const go = useCallback((p) => {
    if (p === 'creators') { setPage('auth'); window.__audience = 'creator'; return; }
    if (p === 'operators') { setPage('auth'); window.__audience = 'operator'; return; }
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!session) {
      if (['console', 'creator', 'traction'].includes(page)) setPage('home');
      return;
    }
    const isCreator = session.role === 'creator';
    const onMarketing = ['home', 'auth', 'demo', 'solutions', 'developers'].includes(page);
    const wrongApp = (isCreator && page === 'console') || (!isCreator && page === 'creator');
    if (onMarketing || wrongApp) setPage(isCreator ? 'creator' : 'console');
  }, [session]);

  const isApp = !!session && ['console', 'creator', 'traction'].includes(page);

  let body;
  if (!session || !isApp) {
    if (page === 'auth') body = <Auth go={go} initialRole={window.__audience || 'creator'} />;
    else if (page === 'demo') body = <Demo go={go} />;
    else if (page === 'solutions') body = <Solutions go={go} />;
    else if (page === 'developers') body = <Developers go={go} />;
    else body = <Home go={go} />;
  } else {
    if (page === 'console') body = <AppConsole go={go} />;
    else if (page === 'creator') body = <AppCreator go={go} />;
    else body = <AppTraction go={go} />;
  }

  if (isApp) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: CONTENT_BG }}>
        <Sidebar session={session} page={page} go={go} />
        <main style={{ flex: 1, minWidth: 0, background: CONTENT_BG, overflowX: 'hidden' }}>
          {body}
        </main>
      </div>
    );
  }

  return (
    <div>
      <MarketingNav page={page} go={go} />
      <main>{body}</main>
      <Footer go={go} />
    </div>
  );
}

const boot = document.getElementById('boot');
if (boot) boot.remove();
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
