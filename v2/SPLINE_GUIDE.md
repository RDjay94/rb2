# Adding Spline 3D scenes to V2

V2 is wired to accept **Spline** (spline.design) 3D scenes as drop-in replacements for any visual element. When a scene URL is set, that element renders as a real interactive WebGL 3D scene. When empty, it falls back to the existing 2D/CSS version.

## Quick start (15 minutes total)

### 1. Sign up for Spline
- Free account: https://app.spline.design/signup
- Free tier includes: unlimited public scenes, ~50MB asset library, basic interactions
- Paid ($9-$25/mo) adds: private scenes, custom domains, removing the Spline badge

### 2. Pick a scene to design first

The fastest path is to **fork a community template**, then tweak it.

| You want to replace | Search Spline Community for |
|---|---|
| Lobby avatar character (🤴) | "3d character", "mascot", "low poly character" |
| Daily spin wheel | "wheel of fortune", "spin wheel", "lucky wheel" |
| RajaBaji logo (splash + login) | "3d logo", "animated text" |
| Lobby background scene | "particles", "neon environment", "synthwave" |
| Slot machine | "slot machine", "casino" |
| Aviator plane | "low poly plane", "airplane" |
| Trophy (tournament) | "trophy", "3d cup" |
| Mystery gift box | "gift box", "mystery box", "loot box" |

Community library: **https://app.spline.design/community**

### 3. Design / fork your scene
1. Click a template you like → "Fork" (top right) → opens in your editor
2. Customize colors, materials, lighting to match RajaBaji brand:
   - **Primary**: `#9DE134` (brand green)
   - **Background**: `#0A0A0A` (jet black) — or transparent so our gradient mesh shows through
   - **Accent**: `#FFB627` (amber), `#22D3EE` (cyan)
3. Add interactions (optional):
   - Click events: rotate character on click, spin wheel on click
   - Mouse events: follow cursor, hover scale
   - Look-at: character looks toward mouse

### 4. Export the scene
1. Top-right corner → **"Export"** button
2. Choose **"Code"** tab
3. Copy the **Public URL** (it ends in `.splinecode`)
   - Example: `https://prod.spline.design/abcDEF123-xyz/scene.splinecode`

### 5. Paste into V2
Open `v2/screens.js` and find this block near the top:

```js
const SplineScenes = {
  avatar:    '', // ← paste your URL here
  wheel:     '',
  logo:      '',
  lobbyBg:   '',
  slotMachine: '',
  plane:     '',
  trophy:    '',
  giftBox:   '',
};
```

Paste your URL between the quotes:

```js
const SplineScenes = {
  avatar: 'https://prod.spline.design/abcDEF123-xyz/scene.splinecode',
  // ...
};
```

### 6. Reload the page
- Open https://rdjay94.github.io/rb2/ (or your local server)
- The avatar zone now renders your 3D scene instead of the 🤴 emoji
- A small "3D · LIVE" pill confirms it's working

That's it. Repeat for every slot you want to upgrade.

---

## What gets replaced where

| Config key | Used on | Recommended scene type |
|---|---|---|
| `avatar` | Lobby center stage | 3D character / mascot, transparent background |
| `wheel` | Lobby daily-spin card | Rotating fortune wheel |
| `logo` | Splash + Login pages | 3D "RAJABAJI" text or logo mark |
| `lobbyBg` | Lobby background layer | Ambient particles / abstract environment |
| `slotMachine` | Slot Room screen | 3D slot machine model with reels |
| `plane` | Aviator/Crash screen | Low-poly plane animation |
| `trophy` | Tournament/Leaderboard | 3D trophy with gold material |
| `giftBox` | Promotions + Calendar | 3D mystery box that opens |

---

## Performance notes

**Each Spline scene is 2–10MB** and renders via WebGL on the GPU. Things to keep in mind:

- ✅ Keep scene size under 5MB (poly count + texture compression matters)
- ✅ Use Spline's "Low" lighting preset for mobile-friendly performance
- ✅ Disable shadows on background scenes
- ✅ Test on mid-range Android before shipping
- ⚠️ Only load 1–2 Spline scenes per screen — too many will tank framerate
- ⚠️ Mobile Safari has known issues with some advanced Spline shaders — test there

**If a scene feels heavy, optimize in Spline:**
- Reduce poly count (right-click model → "Optimize geometry")
- Bake lighting (right-click light → "Bake")
- Lower texture resolution (Project Settings → Texture quality)
- Disable post-processing effects you don't need

---

## Hiding the Spline watermark

Free tier scenes show a small "Built with Spline" badge in the bottom corner. To remove it:

- **Paid plan**: toggle off in Project Settings → Embed → Watermark
- **CSS workaround** (already applied in V2): `spline-viewer::part(logo) { display: none; }` — works on most browsers but isn't officially supported. For a production launch, get the paid plan to comply with their TOS.

---

## Interactivity from Spline → our app

Spline scenes can fire events back to your page. To make the character emote when clicked in Spline:

1. In Spline: select the character → Events panel → "Mouse Down" → "Emit Event" → name it `characterClick`
2. In V2's `screens.js`, listen for the event:

```js
document.addEventListener('DOMContentLoaded', () => {
  const viewer = document.querySelector('spline-viewer');
  if (viewer) {
    viewer.addEventListener('mouseDown', (e) => {
      if (e.target.name === 'character') emote();
    });
  }
});
```

This lets the 3D scene drive our existing emote/coin-bump/confetti functions.

---

## Alternatives if Spline isn't a fit

| Tool | When to use |
|---|---|
| **Three.js** | Full control, need custom shaders, large scenes (>10MB) |
| **React Three Fiber** | If you migrate to React |
| **Babylon.js** | Microsoft's WebGL framework, similar to Three |
| **Lottie** | 2D animations (After Effects → JSON), much lighter than 3D |
| **Rive** | Interactive 2.5D animations, fast & vector-based |
| **Vanta.js** | One-line WebGL backgrounds (no 3D editing) |

For RajaBaji specifically: **Spline for hero elements** (avatar, wheel, logo) + **Lottie for UI flourishes** (confetti, coin bursts, button taps) is the most common pro stack.

---

## Recommended first scene to build

If you only have time for one, build the **avatar character** scene. Why:
- Biggest visual impact (it's the centerpiece of the lobby)
- Easy to fork from a community template
- Can wear different outfits — directly maps to your Avatar Skins shop category
- Looks immediately premium and signals "this is a serious app"

Once that's working, the next priority would be the **lucky wheel** (more spectacle on spins) or the **logo** (sets the first-impression tone on splash).
