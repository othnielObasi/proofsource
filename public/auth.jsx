/* ProofSource — Auth. Clean, production-grade sign-in / create account.
   Proper validation, clear role selection, no manual wallet entry.
   Exports window.Auth. */

function Auth({ go, initialMode, initialRole }) {
  const [mode, setMode]   = useState(initialMode || 'create');
  const [role, setRole]   = useState(initialRole || 'creator');
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [err, setErr]     = useState('');
  const [busy, setBusy]   = useState(false);

  function validate() {
    if (!email.trim()) return 'Enter your email address.';
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email.trim())) return 'Enter a valid email address.';
    if (mode === 'create' && !name.trim()) return 'Enter your name or organization.';
    if (!pw) return 'Enter a password.';
    if (mode === 'create' && pw.length < 8) return 'Password must be at least 8 characters.';
    return null;
  }

  async function submit(e) {
    e && e.preventDefault();
    const e2 = validate();
    if (e2) { setErr(e2); return; }
    setErr(''); setBusy(true);
    try {
      let data;
      if (mode === 'create') {
        data = await window.PS_API.register({ name: name.trim() || email.split('@')[0], email: email.trim(), password: pw, role });
      } else {
        data = await window.PS_API.login({ email: email.trim(), password: pw });
      }
      const acct = data.account;
      window.Store.signIn({ name: acct.name, email: acct.email, role: acct.role, providerId: acct.providerId, walletAddress: acct.walletAddress, walletKind: acct.walletKind });
    } catch (err) {
      setErr(err.data?.error || err.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const field = {
    width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 9, padding: '11px 14px', color: 'var(--text)', font: 'inherit',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s',
  };
  const labS = {
    display: 'block', fontSize: 11, letterSpacing: '.07em', textTransform: 'uppercase',
    color: 'var(--faint)', fontWeight: 700, marginBottom: 6,
  };

  const isCreator = role === 'creator';

  return (
    <div style={{ minHeight: 'calc(100vh - 130px)', display: 'grid', placeItems: 'center', padding: '48px 22px', background: 'var(--canvas)' }}>
      <div style={{ width: 'min(440px,100%)' }}>

        {/* wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
            <span style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(84,180,136,.15)', border: '1px solid var(--earned-line)', display: 'grid', placeItems: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--earned)', boxShadow: 'var(--glow-earned)' }} />
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 17, letterSpacing: '-.02em' }}>ProofSource</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 26, letterSpacing: '-.04em', margin: '0 0 6px' }}>
            {mode === 'create' ? 'Open your account' : 'Welcome back'}
          </h1>
          <p style={{ color: 'var(--mut)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            {mode === 'create' ? 'Earn from every AI citation, or run a paying agent.' : 'Sign in to the settlement floor.'}
          </p>
        </div>

        <form onSubmit={submit} noValidate>
          {/* Role selector (create only) */}
          {mode === 'create' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { id: 'creator',  label: 'I create',       sub: 'Get paid when AI cites my work', accent: 'var(--earned2)', border: 'var(--earned-line)', bg: 'rgba(84,180,136,.07)' },
                { id: 'operator', label: 'I run agents',   sub: 'Pay sources, by my rules',        accent: 'var(--buy)',     border: 'rgba(91,192,235,.3)', bg: 'rgba(91,192,235,.06)' },
              ].map((r) => {
                const on = role === r.id;
                return (
                  <div key={r.id} onClick={() => setRole(r.id)} style={{ cursor: 'pointer', textAlign: 'center', background: on ? r.bg : 'rgba(255,255,255,.03)', border: '1px solid ' + (on ? r.border : 'rgba(255,255,255,.08)'), borderRadius: 11, padding: '16px 12px', transition: 'all .15s' }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: on ? r.accent : 'var(--text)', fontWeight: 600 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 5, lineHeight: 1.4 }}>{r.sub}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Name / Org */}
          {mode === 'create' && (
            <div style={{ marginBottom: 14 }}>
              <label style={labS}>{isCreator ? 'Your name' : 'Organization'}</label>
              <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={isCreator ? 'Ada Powell' : 'Northwind Research'} autoComplete="name" />
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={labS}>Email</label>
            <input style={field} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="you@example.com" autoComplete="email" />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...labS, marginBottom: 0 }}>Password</label>
              {mode === 'signin' && <a style={{ fontSize: 12, color: 'var(--mut)', cursor: 'pointer' }}>Forgot?</a>}
            </div>
            <input style={field} type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} placeholder={mode === 'create' ? 'Min. 8 characters' : '••••••••'} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} />
          </div>

          {/* Error */}
          {err && (
            <div style={{ marginBottom: 16, background: 'rgba(220,60,40,.08)', border: '1px solid rgba(220,60,40,.25)', borderRadius: 9, padding: '10px 13px', color: '#f4a09a', fontSize: 13 }}>
              {err}
            </div>
          )}

          {/* Submit */}
          <Btn
            variant={isCreator && mode === 'create' ? 'earn' : 'primary'}
            size="lg"
            type="submit"
            style={{ width: '100%', opacity: busy ? .7 : 1, pointerEvents: busy ? 'none' : 'auto' }}
          >
            {busy ? 'One moment…' : mode === 'create'
              ? (isCreator ? 'Create account — start earning' : 'Create account — run an agent')
              : 'Sign in'}
          </Btn>

          {/* Mode toggle */}
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13.5, color: 'var(--mut)' }}>
            {mode === 'create' ? 'Already have an account? ' : "Don't have an account? "}
            <a onClick={() => { setMode(mode === 'create' ? 'signin' : 'create'); setErr(''); }} style={{ color: isCreator ? 'var(--earned2)' : 'var(--buy)', cursor: 'pointer', fontWeight: 600 }}>
              {mode === 'create' ? 'Sign in' : 'Create one'}
            </a>
          </div>
        </form>

        {/* Trust line */}
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--faint)', fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>
          <span>scrypt-hashed</span><span>·</span><span>bearer tokens</span><span>·</span><span>wallet connects after sign-in</span>
        </div>
      </div>
    </div>
  );
}
window.Auth = Auth;
