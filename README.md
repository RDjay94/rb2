# RajaBaji 2.0 — Interactive Wireframe

Internal prototype for the 2026 RajaBaji Android app revamp.

## Versions

| Version | Status | URL |
|---|---|---|
| **V1** | 🔒 Frozen (2026-05-18) · git tag `v1.0` | https://rdjay94.github.io/rb2/v1/ |
| **V2** | 🚧 In progress (this folder) | https://rdjay94.github.io/rb2/ |

V1 is a stable snapshot — no further edits. All ongoing iteration happens in V2 at the repo root. V2 starts as an exact copy of V1; changes diverge from here.

## Access
Both versions are password-protected (ask RD Jay).

## What's inside
22 landscape screens at 19.5:9 ratio (modern Android landscape) with gaming-app interactivity:
- Spinning prize barrels, animated slot reels, flying-plane crash games
- Confetti bursts, ticking jackpots, live wins ticker
- Real game tile art (12 generated PNGs)
- Master-detail Coin Shop with 7 categories
- Cricket exchange with back/lay markets
- Daily calendar with horizontal mega-bonus + mystery box strips

## Stack
- Single-file HTML (`index.html`) + Tailwind via CDN + vanilla JS — no build step
- Brand palette: `#9DE134` brand green · `#0A0A0A` jet black · neutrals (10/60/30 ratio)
- Frame ratio: 19.5:9 landscape (884 × 408)

## Local dev
```
cd rb2-repo
npx -y serve -l 5173
```
Then open http://localhost:5173/

## Security note
Password gate is client-side only — anyone who views source can bypass. Internal sharing only.
