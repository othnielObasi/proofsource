# ProofSource — Demo Script (target: 2:45)

Recorded walkthrough (Loom/YouTube/Vimeo), under 3 minutes. Build for a judge who will also click the live link without you in the room.

## 0:00–0:20 — The problem
> "AI agents are now the biggest consumers of content, and they read paid work as free substrate. The creator who filed the story earns nothing when a thousand agents cite it. ProofSource fixes that: content that earns every time an agent cites it — settled sub-cent on Arc."

On screen: the console header, a creator's listed article with a sub-cent price.

## 0:20–1:20 — The agent decides, then pays (BUY)
Type the licensing question. Hit Run. Narrate the decision panel as it renders:
> "The agent scores every source on relevance and freshness, divides by price to get value-per-cent, and checks its budget. It picked the licensing article — not the cheaper newsletter, not the irrelevant one."

Walk the lifecycle trace:
> "Policy gate, authorize, deliver over x402, verify delivery, and only then release the payment on Arc."

Point at the receipt + delivery hash + explorer link:
> "Tamper-evident receipt, with the on-chain settlement reference."

## 1:20–1:55 — Pay once, cite many (REUSE)
Click the reuse-query chip, Run.
> "Same knowledge, different question. The agent finds the paid context it already owns and reuses it — zero payment. You never pay twice for the same source."

Show spend = 0, no new receipt.

## 1:55–2:20 — It won't waste money (SKIP)
Click the off-topic chip, Run.
> "Off-topic question. Nothing clears the value bar, so the agent skips — no payment. This is a real economic decision, not auto-buy."

## 2:20–2:45 — Traction + Circle
Cut to the provider dashboard with real numbers:
> "Real creators earning, real readers paying — [N] creators, [M] payments on Arc testnet this week, average size well under a cent, all through Circle Gateway and x402. Pay-per-citation, finally economical. That's ProofSource."

End on the live URL + repo link.

## Shot list
1. Console — BUY run (decision panel, trace, receipt, explorer link).
2. Console — REUSE run (spend 0).
3. Console — SKIP run (reasoning).
4. Provider dashboard — creators earning.
5. Buyer dashboard — spend + reuse rate.

## Notes
- Record after day-3 real Arc settlement so the explorer link is live.
- Keep each segment tight; the decision panel + trace are the star — let them be on screen long enough to read.
