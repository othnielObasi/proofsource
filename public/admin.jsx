/* ProofSource — Super-admin dashboard. Registered users + per-user login history.
   Exports window.AppAdmin. */

function AppAdmin({ go }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState(null);
  const [logins, setLogins] = useState([]);
  const [loginsLoading, setLoginsLoading] = useState(false);

  async function loadUsers() {
    try { setUsers(await window.PS_API.adminUsers()); setErr(''); }
    catch (e) { setErr(e.data?.error || e.message || 'Failed to load users.'); }
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);
  useInterval(loadUsers, 15000);

  async function selectUser(u) {
    setSelected(u);
    setLoginsLoading(true);
    try { setLogins(await window.PS_API.adminUserLogins(u.id)); }
    catch { setLogins([]); }
    setLoginsLoading(false);
  }

  const S = {
    fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase',
    color: 'var(--faint)', fontWeight: 700, margin: '0 0 14px',
  };
  const ROLE_COLOR = { creator: 'var(--earned2)', operator: 'var(--buy)', admin: 'var(--skip)' };

  const counts = users.reduce((m, u) => (m[u.role] = (m[u.role] || 0) + 1, m), {});

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 1100, margin: '0 auto' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: 6 }}>Super admin</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>Registered users.</div>
          <div style={{ color: 'var(--mut)', fontSize: 13.5, marginTop: 6 }}>{users.length} total · {counts.creator || 0} creators · {counts.operator || 0} operators</div>
        </div>
      </div>

      {err && (
        <div style={{ marginBottom: 20, background: 'rgba(220,60,40,.08)', border: '1px solid rgba(220,60,40,.25)', borderRadius: 9, padding: '12px 14px', color: '#f4a09a', fontSize: 13 }}>{err}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1.3fr 1fr' : '1fr', gap: 24 }} className="admin-cols">

        {/* users table */}
        <div>
          <div style={S}>All users</div>
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, overflow: 'hidden' }}>
            {users.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Name', 'Role', 'Joined', 'Last login'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', fontWeight: 700, padding: '12px 16px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} onClick={() => selectUser(u)} style={{ cursor: 'pointer', background: selected?.id === u.id ? 'rgba(91,192,235,.05)' : 'transparent' }}>
                      <td style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)', fontSize: 13.5 }}>
                        <div>{u.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: ROLE_COLOR[u.role] || 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{u.role}</span>
                      </td>
                      <td style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)', fontSize: 12.5, color: 'var(--mut)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)', fontSize: 12.5, color: 'var(--mut)' }}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>
                {loading ? 'Loading…' : 'No registered users yet.'}
              </div>
            )}
          </div>
        </div>

        {/* login history for selected user */}
        {selected && (
          <div>
            <div style={S}>Login history — {selected.name}</div>
            <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '4px 0' }}>
              {loginsLoading ? (
                <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>Loading…</div>
              ) : logins.length > 0 ? (
                <div style={{ display: 'grid', gap: 1, maxHeight: 420, overflowY: 'auto' }}>
                  {logins.map((l) => (
                    <div key={l.id} style={{ padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                      <div style={{ fontSize: 13, color: 'var(--text)' }}>{new Date(l.at).toLocaleString()}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>{l.ip || 'unknown ip'}{l.userAgent ? ' · ' + l.userAgent : ''}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>No logins recorded yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
window.AppAdmin = AppAdmin;
