/* ProofSource redesign — shared UI primitives. Exports to window. */

const { useState, useEffect, useRef, useCallback } = React;

/* ---------- store hook ---------- */
function useStore(selector) {
  const sel = selector || ((s) => s);
  const [v, setV] = useState(() => sel(window.Store.get()));
  useEffect(() => window.Store.subscribe((s) => {
    const next = sel(s);
    setV((prev) => {
      // skip re-render if primitive/same-reference
      if (prev === next) return prev;
      // for plain objects, do shallow-key compare to avoid re-renders from clone()
      if (prev && next && typeof prev === 'object' && typeof next === 'object' && !Array.isArray(prev)) {
        const pk = Object.keys(prev), nk = Object.keys(next);
        if (pk.length === nk.length && pk.every((k) => prev[k] === next[k])) return prev;
      }
      return next;
    });
  }), []);
  return v;
}

/* ---------- helpers ---------- */
function useInterval(fn, ms, on = true) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms, on]);
}
const usd = (n, d = 6) => '$' + Number(n).toFixed(d);
const ACTION_COLOR = { BUY: 'var(--buy)', REUSE: 'var(--reuse)', SKIP: 'var(--skip)', BLOCK: 'var(--block)' };
const TONE_FILL = { buy: 'var(--buy-fill)', reuse: 'var(--reuse-fill)', skip: 'var(--skip-fill)', block: 'var(--block-fill)', earned: 'var(--earned-fill)' };
const TONE_INK = { buy: 'var(--buy)', reuse: 'var(--reuse)', skip: 'var(--skip)', block: 'var(--block)', earned: 'var(--earned2)' };

/* ---------- Wordmark ---------- */
function Wordmark({ size = 19, sub = true, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'baseline', gap: 9, cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--earned)', boxShadow: 'var(--glow-earned)', alignSelf: 'center' }} />
        <b style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: size, letterSpacing: '-.03em' }}>ProofSource</b>
      </span>
      {sub && <span style={{ color: 'var(--mut)', fontSize: 12 }}>settlement floor</span>}
    </div>
  );
}

/* ---------- Button ---------- */
function Btn({ variant = 'default', size = 'md', children, style, ...rest }) {
  const [h, setH] = useState(false), [p, setP] = useState(false);
  const v = {
    default: { background: 'var(--panel2)', color: 'var(--text)', border: '1px solid var(--line)' },
    primary: { background: 'var(--buy)', color: 'var(--on-buy)', border: '1px solid transparent' },
    earn: { background: 'var(--earned)', color: 'var(--on-earned)', border: '1px solid transparent' },
    ghost: { background: 'transparent', color: 'var(--mut)', border: '1px solid transparent' },
    outline: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--line)' },
  }[variant];
  const sz = size === 'sm' ? { padding: '8px 13px', fontSize: 13 } : size === 'lg' ? { padding: '14px 22px', fontSize: 15 } : { padding: '11px 18px', fontSize: 14 };
  const hov = h ? (variant === 'primary' || variant === 'earn' ? { filter: 'brightness(1.08)' } : variant === 'ghost' ? { color: 'var(--text)' } : { borderColor: 'var(--mut)' }) : null;
  return (
    <button onMouseEnter={() => setH(1)} onMouseLeave={() => { setH(0); setP(0); }} onMouseDown={() => setP(1)} onMouseUp={() => setP(0)}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontWeight: 650, lineHeight: 1, borderRadius: 9, cursor: 'pointer', transition: 'filter .16s, border-color .16s, color .16s, transform .06s', transform: p ? 'translateY(1px)' : 'none', ...v, ...sz, ...hov, ...style }} {...rest}>
      {children}
    </button>
  );
}

/* ---------- Eyebrow ---------- */
function Eyebrow({ tone, children, style }) {
  const c = tone ? TONE_INK[tone] : 'var(--faint)';
  return <p style={{ margin: '0 0 11px', fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: c, ...style }}>{children}</p>;
}

/* ---------- Tag / status pill ---------- */
function Tag({ tone = 'earned', dot = true, children, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--mut)', border: '1px solid var(--line)', borderRadius: 999, padding: '5px 12px', background: 'rgba(21,29,43,.4)', whiteSpace: 'nowrap', ...style }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: TONE_INK[tone], boxShadow: tone === 'earned' ? 'var(--glow-earned)' : tone === 'buy' ? 'var(--glow-buy)' : 'none', animation: 'tagdot 1.6s infinite' }} />}
      {children}
    </span>
  );
}

/* ---------- Decision badge ---------- */
function Badge({ tone = 'buy', children, style }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 12, letterSpacing: '.04em', padding: '4px 12px', borderRadius: 7, background: TONE_FILL[tone], color: TONE_INK[tone], border: tone === 'earned' ? '1px solid var(--earned-line)' : 'none', ...style }}>{children}</span>;
}

/* ---------- Animated counter ---------- */
function CountUp({ to, prefix = '', suffix = '', decimals = 0, dur = 1400, style }) {
  const [v, setV] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setV(to * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return <span style={style}>{prefix}{v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/* ---------- Live settlement ticker — real receipts only ---------- */
function Ticker() {
  const [items, setItems] = useState([]);

  function load() {
    window.PS_API.receipts().then((data) => {
      if (Array.isArray(data) && data.length > 0) setItems(data);
    }).catch(() => {});
  }

  useEffect(() => { load(); }, []);
  useInterval(load, 12000);

  // Render nothing until real settlements exist
  if (items.length === 0) return null;

  // Triple the array so the CSS infinite scroll never gaps
  const strip = [...items, ...items, ...items];
  const speed = Math.max(28, items.length * 5);

  return (
    <div style={{ position: 'relative', borderTop: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)', overflow: 'hidden', background: 'rgba(7,10,16,.5)' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 60, zIndex: 2, background: 'linear-gradient(90deg,#06080d,transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, zIndex: 2, background: 'linear-gradient(270deg,#06080d,transparent)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', gap: 30, padding: '11px 0', whiteSpace: 'nowrap', animation: `tickerflow ${speed}s linear infinite`, width: 'max-content' }}>
        {strip.map((s, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--earned)', boxShadow: 'var(--glow-earned)' }} />
            <span style={{ color: 'var(--mut)' }}>{s.providerName || s.providerId}</span>
            <span style={{ color: 'var(--faint)' }}>
              {String(s.resourceTitle || s.resourceId || '').slice(0, 28) || 'cited content'}
            </span>
            <span style={{ color: 'var(--earned2)' }}>+{Number(s.amountUsdc || 0).toFixed(6)}</span>
            <span style={{ color: 'var(--faint)', fontSize: 11 }}>{s.id}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Pipeline (lit nodes) ---------- */
function Pipeline({ steps, reached = 0, vertical = false, gateStep = 'verify' }) {
  return (
    <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: vertical ? 10 : 6, flexWrap: vertical ? 'nowrap' : 'wrap', alignItems: vertical ? 'stretch' : 'center' }}>
      {steps.map((s, i) => {
        const done = i < reached, active = i === reached - 1, gate = s === gateStep;
        return (
          <span key={s + i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11.5,
            color: done ? (gate ? 'var(--buy)' : 'var(--text)') : 'var(--faint)',
            background: done ? '#0e1622' : 'transparent', border: '1px solid ' + (gate && done ? '#2c5a70' : done ? 'var(--line)' : 'var(--line-soft)'),
            borderRadius: 7, padding: '6px 10px', transition: 'all .35s var(--ease)', opacity: done || active ? 1 : .55 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, transition: 'all .35s',
              background: done ? (gate ? 'var(--buy)' : 'var(--earned)') : '#334155',
              boxShadow: active ? (gate ? 'var(--glow-buy)' : 'var(--glow-earned)') : 'none' }} />
            {s}{gate && done ? ' ✓' : ''}
          </span>
        );
      })}
    </div>
  );
}

/* ---------- Receipt (paper, optional print/tear) ---------- */
function Receipt({ title = 'Proof of citation', stamp = 'VERIFIED', rows = [], amount, amountLabel = 'settled', printing = false, style }) {
  return (
    <div style={{ position: 'relative', width: 'min(330px,100%)', color: 'var(--paper-ink)', background: 'var(--paper-fill)', boxShadow: 'var(--shadow-paper)', transform: 'rotate(-1.4deg)', padding: '22px 24px 24px', borderRadius: 14, fontFamily: 'var(--font-mono)', clipPath: printing ? 'inset(0 0 100% 0)' : 'inset(0 0 0 0)', animation: printing ? 'receiptPrint 1.1s var(--ease) forwards' : 'none', ...style }}>
      {/* perforated top edge */}
      <div style={{ position: 'absolute', top: -1, left: 8, right: 8, height: 6, background: 'repeating-linear-gradient(90deg, transparent 0 5px, rgba(0,0,0,.12) 5px 6px)' }} />
      <div style={{ position: 'absolute', inset: '10px 15px', border: '1px dashed rgba(0,0,0,.18)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-.045em', fontWeight: 700, fontSize: 18 }}>{title}</div>
        {stamp && <div style={{ border: '2px solid var(--stamp)', color: 'var(--stamp)', fontSize: 8, fontWeight: 900, letterSpacing: '.11em', padding: '4px 6px', borderRadius: 2, transform: 'rotate(6deg)' }}>{stamp}</div>}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '8px 0', borderBottom: '1px dashed rgba(0,0,0,.16)', fontSize: 10.5 }}>
          <span style={{ color: 'var(--paper-mut)' }}>{r.k}</span>
          <strong style={{ textAlign: 'right', fontWeight: 600 }}>{r.v}</strong>
        </div>
      ))}
      {amount != null && (
        <div style={{ position: 'relative', zIndex: 1, margin: '18px 0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 16 }}>
          <span style={{ color: 'var(--paper-mut)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em' }}>{amountLabel}</span>
          <strong style={{ fontFamily: 'var(--font-serif)', color: '#0c2d22', fontSize: 38, letterSpacing: '-.08em', lineHeight: .9 }}>{amount}</strong>
        </div>
      )}
    </div>
  );
}

/* ---------- Section heading ---------- */
function SectionHead({ eyebrow, title, lead, center, tone, style }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', maxWidth: center ? 720 : 820, margin: center ? '0 auto' : 0, ...style }}>
      {eyebrow && <Eyebrow tone={tone} style={center ? { } : null}>{eyebrow}</Eyebrow>}
      <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.03, letterSpacing: '-.05em', margin: 0 }}>{title}</h2>
      {lead && <p style={{ color: 'var(--mut)', fontSize: 16, lineHeight: 1.6, margin: center ? '14px auto 0' : '14px 0 0', maxWidth: 640 }}>{lead}</p>}
    </div>
  );
}

/* keyframes injected once */
(function injectKF() {
  if (document.getElementById('ps-kf')) return;
  const s = document.createElement('style'); s.id = 'ps-kf';
  s.textContent = `
    @keyframes tickerflow{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    @keyframes tagdot{0%,100%{opacity:1}50%{opacity:.4}}
    @keyframes receiptPrint{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
    @keyframes flashEarn{0%{transform:translateY(0);filter:brightness(1)}34%{transform:translateY(-3px);filter:brightness(1.5)}100%{transform:translateY(0);filter:brightness(1)}}
    @keyframes floaty{0%,100%{transform:translateY(0) rotate(-1.4deg)}50%{transform:translateY(-7px) rotate(-1.4deg)}}
    @keyframes sweep{0%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
  `;
  document.head.appendChild(s);
})();

Object.assign(window, { useStore, useInterval, usd, ACTION_COLOR, TONE_FILL, TONE_INK, Wordmark, Btn, Eyebrow, Tag, Badge, CountUp, Ticker, Pipeline, Receipt, SectionHead });
