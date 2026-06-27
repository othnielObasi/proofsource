/* ProofSource redesign — mock data. Richer, more varied settlement data.
   Plain JS on window.PS_DATA. */
window.PS_DATA = (function () {
  const creators = [
    'Ada Powell', 'Marcus Okafor', 'Leila Reyes', 'Kieran Singh', 'Jules Albright',
    'Pierre Nadeau', 'Rosa Castellanos', 'Temi Ibe', 'Nadia Holloway', 'Stefan Varga',
    'Amara Diallo', 'Wei Chen', 'Priya Mehta', 'Olga Nowak',
  ];
  const works = [
    'The case for per-use content licensing',
    'Who owns a sentence an AI repeats?',
    'Play-weighted royalty splits in practice',
    'Freshness decay and dynamic citation pricing',
    'Citizen journalism, funded per verified story',
    'What a verified delivery actually proves',
    'Pricing knowledge by the cent',
    'The receipt is the product',
    'How probabilistic ranking meets deterministic payment',
    'Sub-cent economics and creator sustainability',
    'From RSS feed to provable earnings',
    'Attribution without negotiation',
    'Agent budgets as editorial policy',
    'When AI reads, should authors get paid?',
  ];
  const topics = ['licensing', 'royalties', 'journalism', 'pricing', 'rights', 'provenance', 'attribution', 'policy'];

  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function price() {
    // more realistic: most sub-cent, occasional higher
    const tiers = [0.0008, 0.0012, 0.0018, 0.0024, 0.0031, 0.0038, 0.0045, 0.0052];
    return tiers[Math.floor(Math.random() * tiers.length)] + (Math.random() * 0.0003);
  }
  function hash(n) {
    const c = '0123456789abcdef'; let s = '';
    for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * 16)];
    return s;
  }

  function settlement() {
    return {
      creator: rnd(creators),
      work: rnd(works),
      topic: rnd(topics),
      amount: price(),
      receipt: 'rcpt_' + hash(8),
      delivery: 'sha256:' + hash(6) + '…' + hash(4),
      tx: '0x' + hash(6) + '…',
      at: Date.now(),
    };
  }

  // Three canonical demo scenarios
  const runs = {
    licensing: {
      label: 'Content licensing',
      q: 'What are the key arguments around AI content licensing and creator compensation?',
      action: 'BUY',
      reasoning: 'Highest value-per-cent permitted source clears the bar — authorize, deliver, verify, release.',
      candidates: [
        { work: 'The case for per-use content licensing', creator: 'Ada Powell',   rel: 0.92, price: 0.002, verdict: 'bought',                 tone: 'buy' },
        { work: 'Who owns a sentence an AI repeats?',     creator: 'Marcus Okafor',rel: 0.74, price: 0.003, verdict: 'skipped: lower value/cent',tone: 'skip' },
        { work: 'Attribution without negotiation',         creator: 'Leila Reyes',  rel: 0.61, price: 0.004, verdict: 'blocked by operator policy',tone: 'block' },
      ],
      pipeline: ['discover', 'decide', 'policy', 'authorize', 'deliver', 'verify', 'release', 'receipt'],
      answer: 'The strongest arguments converge on <mark>per-use compensation tied to verified delivery</mark> — creators set a price, agents pay only when an answer is grounded in the work, and every citation leaves a receipt.',
      paid: 'Ada Powell', amount: 0.002,
    },
    royalties: {
      label: 'Play-weighted royalties',
      q: 'How should music royalties be split by what listeners actually played?',
      action: 'REUSE',
      reasoning: 'Owned paid context already covers this topic — no new payment required this task.',
      candidates: [
        { work: 'Play-weighted royalty splits in practice', creator: 'Ada Powell',  rel: 0.81, price: 0.002, verdict: 'reused (owned)',      tone: 'reuse' },
        { work: 'Sub-cent economics and creator sustainability', creator: 'Kieran Singh', rel: 0.58, price: 0.003, verdict: 'skipped: below floor', tone: 'skip' },
      ],
      pipeline: ['discover', 'decide', 'reuse', 'answer'],
      answer: 'Split by <mark>actual plays per listener</mark>, not pooled averages — the agent reused a previously-purchased source and settled <mark>$0.000</mark> this task.',
      paid: null, amount: 0,
    },
    sourdough: {
      label: '⊘ Off-topic',
      q: 'What is the best sourdough bread recipe?',
      action: 'SKIP',
      reasoning: 'Nothing in the permitted catalog clears the relevance floor — answer from general knowledge, no payment.',
      candidates: [
        { work: 'The case for per-use content licensing', creator: 'Ada Powell',  rel: 0.09, price: 0.002, verdict: 'skipped: below floor', tone: 'skip' },
        { work: 'Pricing knowledge by the cent',          creator: 'Leila Reyes', rel: 0.06, price: 0.004, verdict: 'skipped: below floor', tone: 'skip' },
      ],
      pipeline: ['discover', 'decide', 'skip', 'answer'],
      answer: 'No licensed source is relevant. The agent answered from general knowledge and <mark>spent nothing</mark> — exactly the behavior the mandate enforces.',
      paid: null, amount: 0,
    },
  };

  const useCases = [
    { tag: 'RFB 6', title: 'Publishers & newsrooms',   body: 'List every article as a priced, hash-verified source. Earn each time an AI grounds an answer in your reporting — with a receipt that proves it.' },
    { tag: 'RFB 6', title: 'Independent writers',      body: 'Connect a feed, set a sub-cent price, get a managed wallet. No crypto knowledge required to start earning from AI citations.' },
    { tag: 'RFB 1', title: 'Research agents',          body: 'Give an agent a budget and a policy. It pays only for permitted sources that clear a value-per-cent bar — and never uses one without paying.' },
    { tag: 'RFB 1', title: 'Enterprise knowledge',     body: 'Meter internal and licensed corpora per use. Every grounded answer is auditable back to a settled, verifiable payment.' },
  ];

  const endpoints = [
    { m: 'POST', p: '/v1/proofsource/demo/research-agent/run',  d: 'Ask a question; get the decision, lifecycle trace, answer, and receipt.' },
    { m: 'PUT',  p: '/v1/proofsource/mandate',                  d: 'Set budget, per-task ceiling, max price, preferred/blocked creators.' },
    { m: 'POST', p: '/v1/proofsource/connectors/rss/ingest',    d: 'Ingest an RSS/RSSHub feed into priced, hash-verified resources.' },
    { m: 'GET',  p: '/v1/proofsource/dashboard/traction',       d: 'Live metrics computed from settled receipts, not seeded.' },
  ];

  return { creators, works, topics, settlement, runs, useCases, endpoints };
})();
