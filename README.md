# RajaBaji 2.0 — Interactive Wireframe Hub

Internal prototype for the 2026 RajaBaji Android app revamp. Single entry point with a V1/V2 toggle.

## Versions

| Version | Status | Style | URL |
|---|---|---|---|
| **Hub** | 🚪 Entry (toggle V1/V2) | Password gate + iframe switcher | https://rdjay94.github.io/rb2/ |
| **V1** | 🔒 Frozen (2026-05-18) · `v1.0` | Functional landscape wireframe, 22 screens | https://rdjay94.github.io/rb2/v1/ |
| **V2** | ✨ Active redesign | **3D immersive lobby**, glassmorphism, particles, parallax | https://rdjay94.github.io/rb2/v2/ |
| V2 attempt 1 | 📦 Archived (avatar/PUBG approach) | — | https://rdjay94.github.io/rb2/v2-attempt-1/ |

V1 = the original utilitarian wireframe. V2 = a complete redesign emphasizing 3D depth, animated gradient meshes, floating particles, glassmorphism panels, mouse parallax, and gaming-app spectacle.

## Access
Single password gate at the hub. Once unlocked, toggle V1/V2 freely.

## V2 highlights
- Animated **gradient mesh background** that slowly morphs hue
- **Synthwave grid floor** with perspective + scrolling animation
- **Floating particle field** (36 particles in green/cyan/amber) drifting upward
- **Glass header bar** with backdrop-blur + triple-currency chips
- **Avatar stage** — character with double rotating energy rings, 6 orbiting particles, spotlight beam from above
- **Mouse parallax** — layout shifts subtly, game card stack rotates in 3D as cursor moves
- **3D game card stack** — 5 cards fanned in 3D space, hover pops them forward with neon glow
- **Daily spin barrel** with JS-driven physics + tick sounds
- **Free coins button** that spawns floating coin emojis on click
- **Wins ticker** scrolling at the bottom dock
- **Tournament card** with live ticking countdown
- **Big neon CTAs** with glow-breathe animation
- Confetti on every win
- Web Audio API beeps

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
