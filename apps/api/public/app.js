// ProofSource shared client: auth state + a consistent header across every page.
const PS = {
  token(){ return localStorage.getItem('ps_token') || ''; },
  setToken(t){ t ? localStorage.setItem('ps_token', t) : localStorage.removeItem('ps_token'); },
  authHeaders(){ const t=this.token(); return t ? { authorization: 'Bearer '+t } : {}; },
  async me(){
    if(!this.token()) return null;
    try{ const r = await fetch('/v1/proofsource/auth/me',{headers:this.authHeaders()});
      if(!r.ok) return null; return await r.json(); }catch{ return null; }
  },
  signOut(){ this.setToken(''); location.href='/'; },
  async requireAuth(role){
    const me = await this.me();
    if(!me){ location.href='/auth.html'+(role?('?role='+role):''); return null; }
    if(role && me.role!==role){ location.href = me.role==='creator'?('/creator.html'):'/console.html'; return null; }
    return me;
  },
  async header(active){
    const me = await this.me();
    const home = me ? (me.role==='creator'?'/creator.html':'/console.html') : '/';
    const nav = me
      ? `${me.role==='operator'?`<a href="/console.html" class="${active==='console'?'active':''}">Console</a>`:''}
         ${me.role==='creator'?`<a href="/creator.html" class="${active==='creator'?'active':''}">Earnings</a>`:''}
         <a href="/traction.html" class="${active==='traction'?'active':''}">Traction</a>
         <span class="who">${me.name}${me.walletAddress?' · '+me.walletAddress.slice(0,6)+'…'+me.walletAddress.slice(-4):''}</span>
         <a href="#" onclick="PS.signOut();return false">Sign out</a>`
      : `<a href="/traction.html" class="${active==='traction'?'active':''}">Traction</a>
         <a href="/auth.html">Sign in</a>
         <a href="/auth.html?mode=create" class="btn sm primary" style="color:#04222e">Create account</a>`;
    const el = document.getElementById('ps-header');
    if(el) el.innerHTML =
      `<a class="brand" href="${home}"><b class="serif">ProofSource</b><span>proof-of-citation settlement</span></a>
       <nav class="ps-nav">${nav}</nav>`;
    return me;
  }
};
window.PS = PS;
