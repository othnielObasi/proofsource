/* ProofSource — app state. localStorage-backed, pub/sub. window.Store.
   This is the real account model the live app would wire to its API:
   a session, an operator workspace (mandate + run history + budget), and a
   creator profile (wallet, listed pieces, citation ledger). */

// API helpers — all fetch() calls go through here
window.PS_API = (function () {
  const BASE = (window.PS_API_BASE || '/v1/proofsource');
  const TOKEN_KEY = 'ps_token_v1';

  function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
  function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch {} }

  async function request(path, opts = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opts.headers || {}) };
    const res = await fetch(BASE + path, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data });
    return data;
  }

  async function register(body)  { const d = await request('/auth/register', { method: 'POST', body: JSON.stringify(body) }); setToken(d.token); return d; }
  async function login(body)     { const d = await request('/auth/login',    { method: 'POST', body: JSON.stringify(body) }); setToken(d.token); return d; }
  async function me()            { return request('/auth/me'); }
  async function wallet(body)    { return request('/auth/wallet', { method: 'POST', body: JSON.stringify(body) }); }

  async function runAgent(body)  { return request('/demo/research-agent/run', { method: 'POST', body: JSON.stringify(body) }); }
  async function getMandate(wsId) { return request('/mandate?workspaceId=' + (wsId || 'ws_demo')); }
  async function getReceipt(id)   { return request('/receipts/' + id); }
  async function setMandate(body) { return request('/mandate', { method: 'PUT', body: JSON.stringify(body) }); }
  async function seed()           { return request('/demo/seed', { method: 'POST' }); }

  async function earnings(providerId) { return request('/creators/' + providerId + '/earnings'); }
  async function connectFeed(body)    { return request('/creators/connect-feed', { method: 'POST', body: JSON.stringify(body) }); }
  async function listItem(body)       { return request('/creators/list-item', { method: 'POST', body: JSON.stringify(body) }); }

  async function traction() { return request('/dashboard/traction'); }
  async function analytics() { return request('/dashboard/analytics'); }
  async function buyerDash() { return request('/dashboard/buyer'); }
  async function receipts() { return request('/receipts'); }

  async function adminUsers()          { return request('/admin/users'); }
  async function adminUserLogins(id)   { return request('/admin/users/' + id + '/logins'); }

  return { getToken, setToken, request, register, login, me, wallet, runAgent, getMandate, setMandate, seed, earnings, connectFeed, listItem, traction, analytics, buyerDash, getReceipt, receipts, adminUsers, adminUserLogins };
})();

window.Store = (function () {
  const KEY = 'ps_app_v1';

  const DEFAULTS = {
    session: null, // { name, email, role:'creator'|'operator', wallet, walletKind }
    operator: {
      mandate: { budget: 5.0, ceiling: 0.05, maxPer: 0.01, requireCite: true },
      spent: 0,
      runs: [], // { id, q, action, amount, paid, at, verified }
    },
    creator: {
      wallet: null, walletKind: null,
      priceDefault: 0.002,
      pieces: [], // { id, title, price, citations, earned, at }
      citations: [], // { id, title, amount, receipt, tx, at }
    },
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Object.assign(clone(DEFAULTS), saved);
    } catch { return clone(DEFAULTS); }
  }
  let state = load();
  const subs = new Set();
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
  function emit() { subs.forEach((f) => f(state)); }
  function get() { return state; }
  function set(patch) {
    const next = typeof patch === 'function' ? patch(state) : patch;
    state = Object.assign({}, state, next);
    persist(); emit();
  }
  function setIn(domain, patch) {
    set({ [domain]: Object.assign({}, state[domain], typeof patch === 'function' ? patch(state[domain]) : patch) });
  }
  function subscribe(f) { subs.add(f); return () => subs.delete(f); }
  function id(p) { return p + Math.random().toString(36).slice(2, 8); }
  function hash(n) { const c = '0123456789abcdef'; let s = ''; for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * 16)]; return s; }

  /* ---------- auth ---------- */
  function signIn({ name, email, role, providerId, walletAddress, walletKind, apiKey }) {
    set({ session: { name: name || '', email: email || '', role, providerId: providerId || null, wallet: walletAddress || (state.session && state.session.wallet) || null, walletKind: walletKind || (state.session && state.session.walletKind) || null, apiKey: apiKey || (state.session && state.session.apiKey) || null } });
  }
  function signOut() { window.PS_API.setToken(null); set({ session: null }); }

  /* ---------- creator ---------- */
  function seedCreator() { /* no-op — real API data only */ }
  function connectWallet(addr, kind) { setIn('creator', { wallet: addr, walletKind: kind }); set({ session: Object.assign({}, state.session, { wallet: addr, walletKind: kind }) }); }
  function listFeed(titles, price) {
    const p = parseFloat(price) || state.creator.priceDefault;
    setIn('creator', (c) => ({ priceDefault: p, pieces: titles.map((t) => ({ id: id('pc_'), title: t, price: p, citations: 0, earned: 0, at: Date.now() })).concat(c.pieces) }));
  }
  function accrueCitation() { /* no-op — real API data only */ }
  function creatorTotals() {
    const c = state.creator;
    const earned = c.pieces.reduce((s, p) => s + p.earned, 0);
    const cites = c.pieces.reduce((s, p) => s + p.citations, 0);
    return { earned, cites, avg: cites ? earned / cites : 0, pieces: c.pieces.length };
  }

  /* ---------- operator ---------- */
  function setMandate(patch) { setIn('operator', (o) => ({ mandate: Object.assign({}, o.mandate, patch) })); }
  function recordRun({ q, action, amount, paid, verified }) {
    const run = { id: id('run_'), q, action, amount, paid, verified, at: Date.now() };
    setIn('operator', (o) => ({ runs: [run].concat(o.runs).slice(0, 50), spent: +(o.spent + (amount || 0)).toFixed(6) }));
    return run;
  }
  function operatorTotals() {
    const o = state.operator;
    const buys = o.runs.filter((r) => r.action === 'BUY').length;
    return { runs: o.runs.length, buys, spent: o.spent, remaining: Math.max(0, o.mandate.budget - o.spent) };
  }

  return { get, set, setIn, subscribe, signIn, signOut, seedCreator, connectWallet, listFeed, accrueCitation, creatorTotals, setMandate, recordRun, operatorTotals, _id: id, _hash: hash };
})();
