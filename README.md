# RajaBaji 2.0 — Interactive Wireframe Hub

Internal prototype for the 2026 RajaBaji Android app revamp. Single entry point with a V1/V2 toggle.

## Versions

| Version | Status | Style | URL |
|---|---|---|---|
| **Hub** | 🚪 Entry (toggle V1/V2/V3/V4) | Password gate + iframe switcher | https://rdjay94.github.io/rb2/ |
| **V1** | 🔒 Frozen (2026-05-18) · `v1.0` | Functional landscape wireframe, 22 screens | https://rdjay94.github.io/rb2/v1/ |
| **V2** | 📦 Frozen redesign | **3D immersive lobby**, glassmorphism, particles, parallax | https://rdjay94.github.io/rb2/v2/ |
| **V3** | ✨ Arcane Hall | **Mystical premium** — midnight purple + gold + emerald, hex grid, owl motif, ornate panels | https://rdjay94.github.io/rb2/v3/ |
| **V4** | ✨ TurboBet | **Speed/racing** — jet black + electric red + chrome, angular clip-paths, speed lines, racing UI | https://rdjay94.github.io/rb2/v4/ |
| V2 attempt 1 | 📦 Archived (avatar/PUBG approach) | — | https://rdjay94.github.io/rb2/v2-attempt-1/ |

V1 = the original utilitarian wireframe. V2 = a complete redesign emphasizing 3D depth. V3 = OWL GAMES inspired arcane/mystical hall (deep purple + gold + emerald, hexagonal geometry, owl watermark, drifting embers, Cinzel display type). V4 = TurboBet inspired speed/racing book (jet black + electric red + chrome, angular clip-path panels, diagonal speedlines, Russo One/Rajdhani type, F1 pit-lane aesthetic).

## Access
Single password gate at the hub. Once unlocked, toggle V1/V2 freely.

## V3 highlights — Arcane Hall (OWL GAMES inspired)
- **Mystical palette** — midnight (#07051A) + royal purple + Cinzel-served gold (#D4AF37)
- **Hexagonal background grid** with drifting amber embers and dual purple/gold halos
- **Faded owl watermark** behind the lobby as a sigil
- **Ornate hero showcase** — gold-trimmed flagship card + two hex side-cards (jackpot + tournament)
- Full V1 feature parity: lobby, live, slots, fishing, sports/cricket, bonus, VIP carousel (4 tiers), missions chest grid (14 levels), refer & earn, settings, inbox, deposit, withdraw, support, login, register
- **Cinzel + Cormorant Garamond** display type, italic mystical sub-copy
- **Right rail**: live wallet tally, daily quest progress bars, live wins ticker, glowing promo banner
- **Bottom dock**: Deposit (gold CTA), Withdraw, Refer, Rebate, Inbox, Support
- Click any rail item or dock button to swap screen, all chips/tabs/method selectors interactive

## V4 highlights — TurboBet (speed/racing)
- **Racing palette** — jet black + electric red (#FF2D20) + chrome + Rajabaji green accent
- **Diagonal speed-line streaks** crossing the stage (red/orange/green/chrome layers)
- **Checkerboard side strips** like a finish line + dotted bg grid
- **Angular clip-path panels** everywhere — hexagonal cards, slanted buttons, arrowed VIP tiles
- Russo One + Rajdhani display type — pit-lane signage feel
- **Hero zone** — flagship Aviator Turbo card + jackpot ticker + tournament ticker
- **Speedometer strip** showing payout speed, day's payouts, biggest win
- Full V1 feature parity: lobby, live, slots, fishing, sports book, bonus, VIP (4 tiers), mission grid, refer, settings, inbox, deposit, withdraw, support, login, register
- Sport book row with live blinking match cards + 3-way odds chips
- **Bottom dock**: Deposit (red CTA), Withdraw (green CTA), Refer, Rebate, Inbox, Support
- All interactions wired: rail nav, tabs, provider chips, amount chips, methods, modals close on overlay click + ESC

## V2 highlights (frozen)
- Animated gradient mesh, synthwave floor, parallax 3D card stack, daily spin barrel, wins ticker, tournament countdown — see commit history

## Local dev
```
cd rb2-repo
npx -y serve -l 5173
```
Open http://localhost:5173/

## Stack
- HTML + vanilla CSS animations + vanilla JS — no framework, no build
- Brand palette: `#9DE134` brand green · `#0A0A0A` jet black · cyan/amber/purple secondary glows
- Frame: 19.5:9 landscape (V1) · full-screen (V2)

## Security note
Password gate is client-side only — anyone who views source can bypass. Internal sharing only.
