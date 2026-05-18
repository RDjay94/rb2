// ============================== FRAMEWORK ==============================
let currentScreen = 'lobby';
const Screens = {};
const DockSlots = {};

function setScreen(name){
  if (!Screens[name]) return;
  // Cancel any pending auto-nav from the dome since we're navigating explicitly now.
  if (typeof domeNavTimer !== 'undefined') clearTimeout(domeNavTimer);
  currentScreen = name;
  // Sync the dome's centered item to the screen we're navigating to (if it's a category).
  if (typeof CategoryWheel !== 'undefined') {
    const catIdx = CategoryWheel.findIndex(c => c.target === name);
    if (catIdx !== -1) domeIndex = catIdx;
  }
  const root = document.getElementById('screen-root');
  root.innerHTML = Screens[name]();
  // Trigger slide-in animation by toggling the class
  root.classList.remove('screen-enter');
  void root.offsetWidth; // force reflow so the animation restarts on identical class
  root.classList.add('screen-enter');

  document.getElementById('topbar-root').innerHTML = TopBar(name);
  document.getElementById('dock-root').innerHTML = ActionDock(name);
  if (postRender[name]) postRender[name]();
}

// ============================== DOME DRAG / SWIPE / WHEEL ==============================
// Attach once at script load — works for every dome render thereafter via event delegation.
(function initDomeInteractions(){
  let dragX = null;
  let lastRotate = 0;
  const DRAG_THRESHOLD = 60;    // px before we trigger a rotation
  const ROTATE_COOLDOWN = 220;  // ms between rotations during continuous drag

  function tryRotate(deltaX) {
    const now = Date.now();
    if (now - lastRotate < ROTATE_COOLDOWN) return false;
    if (Math.abs(deltaX) < DRAG_THRESHOLD) return false;
    // Drag right (positive delta) → bring previous category to center
    // Drag left  (negative delta) → bring next category to center
    domeRotate(deltaX > 0 ? -1 : 1);
    lastRotate = now;
    return true;
  }

  // Mouse drag
  document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.dome-nav')) dragX = e.clientX;
  });
  document.addEventListener('mousemove', (e) => {
    if (dragX === null) return;
    const delta = e.clientX - dragX;
    if (tryRotate(delta)) dragX = e.clientX;
  });
  document.addEventListener('mouseup', () => { dragX = null; });

  // Touch swipe
  document.addEventListener('touchstart', (e) => {
    if (e.target.closest('.dome-nav')) dragX = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (dragX === null) return;
    const delta = e.touches[0].clientX - dragX;
    if (tryRotate(delta)) dragX = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchend', () => { dragX = null; });

  // Wheel scroll (trackpad swipe or mouse wheel over the dome)
  document.addEventListener('wheel', (e) => {
    if (!e.target.closest('.dome-nav')) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 5) return;
    e.preventDefault();
    const now = Date.now();
    if (now - lastRotate < 200) return;
    domeRotate(d > 0 ? 1 : -1);
    lastRotate = now;
  }, { passive: false });
})();

const postRender = {};

// ============================== TOP BAR ==============================
function TopBar(screen){
  const isLobby = screen === 'lobby';
  return `
  <div class="topbar">
    ${!isLobby ? `<button class="tb-back" onclick="setScreen('lobby')">← LOBBY</button>` : ''}
    <div class="avatar-chip" onclick="setScreen('profile')">RD</div>
    <div class="user-info">
      <div class="name">RD Jay</div>
      <div class="xp"><div class="xp-bar"><div style="width:33%"></div></div><span class="xp-num">LV 12</span></div>
    </div>
    ${!isLobby ? `<div class="tb-title">${(Screens[screen] && screen.toUpperCase()) || ''}</div>` : ''}
    <div class="bal-chips">
      <div class="bal-chip cash" onclick="setScreen('deposit')"><span class="icon">💵</span><span class="num" id="bal-cash">4,562</span><span class="plus">+</span></div>
      <div class="bal-chip coins" onclick="setScreen('shop')"><span class="icon">🪙</span><span class="num" id="bal-coins">1.2M</span></div>
      <div class="bal-chip gems" onclick="setScreen('shop')"><span class="icon">💎</span><span class="num" id="bal-gems">248</span></div>
    </div>
    <div class="icon-btn" onclick="alert('Search (V2.1)')" title="Search">🔍</div>
    <div class="icon-btn" onclick="setScreen('notif')" title="Inbox">🔔<span class="dot"></span></div>
    <div class="icon-btn" onclick="setScreen('settings')" title="Settings">⚙</div>
  </div>`;
}

// ============================== ACTION DOCK ==============================
// Category wheel — the round control in the center of the dock.
// 5 segments arranged around the wheel (top, top-right, bottom-right, bottom-left, top-left).
// Center button returns to the Lobby.
const CategoryWheel = [
  { key:'slots',   icon:'🎰', label:'SLOTS',   target:'slots',   pos:'s-top' },
  { key:'live',    icon:'🎲', label:'LIVE',    target:'live',    pos:'s-tr'  },
  { key:'cricket', icon:'🏏', label:'CRICKET', target:'cricket', pos:'s-br'  },
  { key:'crash',   icon:'✈',  label:'CRASH',   target:'crash',   pos:'s-bl'  },
  { key:'fishing', icon:'🎣', label:'FISHING', target:'fishing', pos:'s-tl'  },
];

// Half-sphere dome state — index of category at the apex (center top)
let domeIndex = 0;
let domeNavTimer = null;
const DOME_AUTO_NAV_DELAY = 450; // ms after the last rotation before auto-navigating

// Auto-navigate to whichever category is currently at the dome's apex.
// Debounced so rapid drags/wheel scrolls don't trigger multiple screen changes.
function scheduleDomeNav(){
  clearTimeout(domeNavTimer);
  domeNavTimer = setTimeout(() => {
    const target = CategoryWheel[domeIndex] && CategoryWheel[domeIndex].target;
    if (target && currentScreen !== target) setScreen(target);
  }, DOME_AUTO_NAV_DELAY);
}

function domeRotate(dir){
  const N = CategoryWheel.length;
  domeIndex = (domeIndex + dir + N) % N;
  document.getElementById('dock-root').innerHTML = ActionDock(currentScreen);
  beep(400, 30);
  scheduleDomeNav();
}
function domeSelectOrNav(idx){
  // Tapping the centered item navigates immediately (no debounce delay).
  // Tapping a side item brings it to the apex AND schedules auto-nav.
  if (idx === domeIndex) {
    clearTimeout(domeNavTimer);
    setScreen(CategoryWheel[idx].target);
  } else {
    domeIndex = idx;
    document.getElementById('dock-root').innerHTML = ActionDock(currentScreen);
    beep(500, 40);
    scheduleDomeNav();
  }
}
// Keep the dome's centered item in sync with whichever category screen is active.
function syncDomeToScreen(screen){
  const idx = CategoryWheel.findIndex(c => c.target === screen);
  if (idx !== -1) domeIndex = idx;
}

function ActionDock(active){
  const map = {
    lobby:'play', slots:'slots', fishing:'fishing',
    live:'live', cricket:'cricket', crash:'crash',
    wallet:'wallet', deposit:'wallet', withdraw:'wallet', shop:'shop',
    profile:'profile', settings:'profile', notif:'profile',
    missions:'missions', calendar:'missions',
    leaderboard:'tourney', vip:'tourney',
    refer:'refer', promo:'promo', support:'support'
  };
  const hi = map[active] || '';
  const utilBtn = (key, icon, lbl, target) => `<button class="dock-btn ${hi===key?'active':''}" onclick="setScreen('${target}')"><span class="icon">${icon}</span><span class="lbl">${lbl}</span></button>`;
  // NOTE: domeIndex is synced inside setScreen() once when navigating to a category.
  // We DO NOT sync here — that would overwrite the user's slide and break left/right rotation.
  const N = CategoryWheel.length;
  const centeredCat = CategoryWheel[domeIndex];
  const confirmLbl = active === 'lobby'
    ? `▶ ${centeredCat.label}`
    : (hi === centeredCat.key ? '⌂ LOBBY' : `▶ ${centeredCat.label}`);
  const confirmTarget = (active === 'lobby' || hi !== centeredCat.key) ? centeredCat.target : 'lobby';
  return `
  <div class="action-dock">
    <!-- Left utility buttons -->
    <div class="dock-section">
      ${utilBtn('wallet','💼','WALLET','wallet')}
      ${utilBtn('shop','🛒','SHOP','shop')}
      ${utilBtn('missions','🎯','MISSIONS','missions')}
    </div>
    <!-- Half-sphere dome category slider -->
    <div class="dome-nav" title="Slide ← / → to find a category · tap the centered one to play">
      <div class="dome-bg"></div>
      <button class="dome-arrow-d left" onclick="domeRotate(-1)" title="Previous">‹</button>
      <button class="dome-arrow-d right" onclick="domeRotate(1)" title="Next">›</button>
      ${CategoryWheel.map((c, i) => {
        let pos = i - domeIndex;
        if (pos > N/2) pos -= N;
        if (pos < -N/2) pos += N;
        return `<button class="dome-cat" data-pos="${pos}" onclick="domeSelectOrNav(${i})" title="${c.label}">
          <span class="cat-emoji">${c.icon}</span>
          <span class="cat-label">${c.label}</span>
        </button>`;
      }).join('')}
      <button class="dome-confirm" onclick="setScreen('${confirmTarget}')" title="${confirmTarget==='lobby'?'Return to Lobby':'Go to '+centeredCat.label}">${confirmLbl}</button>
    </div>
    <!-- Right utility buttons -->
    <div class="dock-section">
      ${utilBtn('tourney','🏆','TROPHY','leaderboard')}
      ${utilBtn('refer','👥','REFER','refer')}
      ${utilBtn('profile','👤','PROFILE','profile')}
    </div>
  </div>`;
}

function winsTickerHTML(){
  const data = [
    ['M****61','Aviator','৳124,000','12.4x','🥇'],['S****ad','Sweet Bonanza','৳89,500','347x','🎰'],
    ['R****na','Crazy Time','৳56,800','25x','🎡'],['F****ul','Super Ace','৳38,200','89x','🎰'],
    ['A****hi','Aviator','৳24,100','4.2x','✈️'],['K****bd','Mega Wheel','৳18,400','12x','🎯'],
  ];
  return [...data, ...data].map(([u,g,amt,mult,e])=>`<div class="win"><span class="em">${e}</span><span class="u">${u}</span><span class="amt">${amt}</span><span class="mult">${mult}</span></div>`).join('');
}

// ============================== BACKGROUND PARTICLES ==============================
(function spawnParticles(){
  const cont = document.getElementById('particles');
  if (!cont || cont.children.length) return;
  for (let i = 0; i < 36; i++){
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 2 + Math.random() * 6;
    p.style.width = p.style.height = size + 'px';
    p.style.left = Math.random()*100 + '%';
    p.style.bottom = '-20px';
    const dx = (Math.random() - 0.5) * 200;
    p.style.setProperty('--dx', dx + 'px');
    const dur = 8 + Math.random() * 10;
    const delay = Math.random() * 20;
    p.style.animation = `drift-up ${dur}s linear ${delay}s infinite`;
    const r = Math.random();
    if (r > 0.9) { p.style.background = '#FFB627'; p.style.boxShadow = '0 0 8px #FFB627, 0 0 16px #FFB627'; }
    else if (r > 0.7) { p.style.background = '#22D3EE'; p.style.boxShadow = '0 0 8px #22D3EE, 0 0 16px #22D3EE'; }
    cont.appendChild(p);
  }
})();

// ============================== MOUSE PARALLAX ==============================
(function parallax(){
  const stage = document.getElementById('stage');
  stage.addEventListener('mousemove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const layout = document.querySelector('.layout-lobby');
    const stack = document.getElementById('games-stack');
    if (layout) layout.style.transform = `translate(${x * -12}px, ${y * -8}px)`;
    if (stack) stack.style.transform = `rotateY(${x * 8}deg) rotateX(${y * -4}deg)`;
  });
  stage.addEventListener('mouseleave', () => {
    const layout = document.querySelector('.layout-lobby'); if (layout) layout.style.transform = '';
    const stack = document.getElementById('games-stack'); if (stack) stack.style.transform = '';
  });
})();

// ============================== UTILITIES ==============================
function beep(freq=600, dur=80){
  try {
    const ctx = window._ac || (window._ac = new (window.AudioContext||window.webkitAudioContext)());
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = freq; g.gain.value = 0.04;
    o.connect(g).connect(ctx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur/1000);
    o.stop(ctx.currentTime + dur/1000);
  } catch(e){}
}

function confetti(){
  const colors = ['#9DE134','#FFB627','#22D3EE','#A855F7','#EC4899','#FFE787'];
  const stage = document.getElementById('stage');
  for (let i = 0; i < 50; i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.background = colors[i % colors.length];
    c.style.left = (40 + Math.random()*30) + '%';
    c.style.top = '20%';
    c.style.animationDelay = (Math.random()*0.4) + 's';
    c.style.transform = `rotate(${Math.random()*360}deg)`;
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    stage.appendChild(c);
    setTimeout(() => c.remove(), 3000);
  }
}

function bumpBalance(kind, addAmount){
  const ids = { cash: 'bal-cash', coins: 'bal-coins', gems: 'bal-gems' };
  const el = document.getElementById(ids[kind]);
  if (!el) return;
  el.animate([
    { transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }
  ], { duration: 500, easing: 'cubic-bezier(.5,1.5,.5,1)' });
  const r = el.getBoundingClientRect();
  const flash = document.createElement('div');
  flash.textContent = '+' + (kind==='cash'?'৳':'') + addAmount.toLocaleString();
  flash.style.cssText = `position:fixed;left:${r.left + r.width/2}px;top:${r.top}px;color:${kind==='gems'?'#22D3EE':kind==='coins'?'#FFB627':'#9DE134'};font-family:'Orbitron';font-weight:900;font-size:14px;pointer-events:none;z-index:1000;`;
  document.body.appendChild(flash);
  flash.animate([{ transform: 'translate(-50%, 0)', opacity: 1 }, { transform: 'translate(-50%, -40px)', opacity: 0 }], { duration: 1200, easing: 'ease-out' });
  setTimeout(() => flash.remove(), 1300);
}

// ============================== GAME CAROUSEL HELPERS ==============================
function scrollCarousel(id, dir){
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollBy({ left: dir * 280, behavior: 'smooth' });
  beep(500, 30);
}

function launchGame(name, provider){
  beep(600, 80);
  setTimeout(() => beep(900, 100), 100);
  setTimeout(() => beep(1200, 150), 200);
  confetti();
  const toast = document.createElement('div');
  toast.className = 'launch-toast';
  toast.innerHTML = `
    <div class="lt-icon">🎮</div>
    <div class="lt-title">LAUNCHING</div>
    <div class="lt-title" style="font-size:24px;margin-top:4px;color:white;-webkit-text-fill-color:white;background:none;">${name}</div>
    <div class="lt-sub">${provider} · loading game session…</div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// Generic provider strip — used at the top of every category page
function ProviderStrip(providers, currentKey, onSelectName){
  return `<div class="provider-strip-wrap">
    <div class="provider-strip" id="${onSelectName}-strip">
      ${providers.map(p => `<button class="provider-card ${p.k === currentKey ? 'active' : ''}" onclick="${onSelectName}('${p.k}')">
        <div class="pc-emoji">${p.e}</div>
        <div class="pc-name">${p.n}</div>
        <div class="pc-count">${p.count || p.sub || ''}</div>
      </button>`).join('')}
    </div>
  </div>`;
}

// Generic game card carousel
function GameCarousel(id, games, mapper){
  return `<div class="carousel-wrap">
    <button class="carousel-arrow left" onclick="scrollCarousel('${id}', -1)">‹</button>
    <div class="game-carousel" id="${id}">
      ${games.map(mapper).join('')}
    </div>
    <button class="carousel-arrow right" onclick="scrollCarousel('${id}', 1)">›</button>
  </div>`;
}

// ============================== BENGALI GREETINGS ==============================
const greetings = [
  ['🏏 চলো খেলি!','Let\'s play!'],['🔥 দারুণ চলছে!','You\'re on fire!'],
  ['💰 টাকা চাই!','Need money!'],['🎯 ভাগ্য পরীক্ষা!','Test your luck!'],
  ['👑 রাজা বাজি!','King\'s bet!'],['⚡ দ্রুত জিতি!','Win fast!'],
  ['🎰 ঘুরাও!','Spin it!'],
];

function emote(){
  const g = greetings[Math.floor(Math.random() * greetings.length)];
  const bn = document.getElementById('bubble-bn'); if (bn) bn.textContent = g[0];
  const en = document.getElementById('bubble-en'); if (en) en.textContent = g[1];
  const bubble = document.getElementById('bubble');
  const ch = document.getElementById('character');
  if (bubble) bubble.classList.add('visible');
  if (ch) { ch.style.transition = 'transform .3s cubic-bezier(.5,1.7,.7,.9)'; ch.style.transform = 'scale(1.12) rotate(-6deg)'; }
  beep(700, 80); setTimeout(() => beep(1000, 100), 100);
  setTimeout(() => { if (ch) ch.style.transform = ''; }, 400);
  setTimeout(() => { if (bubble) bubble.classList.remove('visible'); }, 2400);
}

// ============================== DAILY SPIN BARREL ==============================
const prizes = [
  ['৳50','#9DE134'],['৳100','#FFB627'],['৳500','#9DE134'],['🎁','#FFB627'],
  ['৳1K','#9DE134'],['৳200','#FFB627'],['100🎰','#9DE134'],['৳5K','#FFB627'],
  ['৳50','#9DE134'],['৳100','#FFB627'],['৳500','#9DE134'],['💎','#FFB627'],
  ['৳1K','#9DE134'],['৳200','#FFB627'],['JACKPOT','#FFB627'],['৳5K','#9DE134'],
];

function buildBarrel(elId){
  const strip = document.getElementById(elId);
  if (!strip || strip.children.length) return;
  prizes.forEach(([p, c]) => {
    const t = document.createElement('div');
    t.className = 'barrel-tile';
    t.style.background = c;
    t.textContent = p;
    strip.appendChild(t);
  });
}

let spinning = false;
function spinBarrel(elId='barrel'){
  if (spinning) return;
  spinning = true;
  const w = document.getElementById(elId);
  if (!w) { spinning = false; return; }
  const tileWidth = 42;
  const landing = 8 + Math.floor(Math.random() * 7);
  const endX = -(landing * tileWidth + Math.random() * 10);
  const dur = 3500;
  const t0 = performance.now();
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  beep(400, 80);
  let lastTile = 0;
  function tick(now){
    const elapsed = now - t0;
    const p = Math.min(elapsed / dur, 1);
    const x = endX * easeOut(p);
    w.style.transform = `translateX(calc(-50% + ${x}px))`;
    const tiles = Math.floor(Math.abs(x) / tileWidth);
    if (tiles !== lastTile) { lastTile = tiles; beep(600 + (1-p)*400, 25); }
    if (p < 1) requestAnimationFrame(tick);
    else { spinning = false; beep(1100, 250); confetti(); bumpBalance('cash', 500); }
  }
  requestAnimationFrame(tick);
}

function collectCoins(e){
  beep(700, 100);
  const btn = e.currentTarget;
  const r = btn.getBoundingClientRect();
  for (let i = 0; i < 12; i++){
    const c = document.createElement('div');
    c.textContent = '🪙';
    c.style.cssText = `position:fixed;left:${r.left + r.width/2}px;top:${r.top + r.height/2}px;font-size:20px;pointer-events:none;z-index:1000;`;
    document.body.appendChild(c);
    const dx = (Math.random() - 0.5) * 200;
    const dy = -100 - Math.random() * 150;
    c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 }], { duration: 1200, easing: 'cubic-bezier(.5,1.2,.5,1)' });
    setTimeout(() => c.remove(), 1300);
  }
  bumpBalance('coins', 10000);
}

// ============================== ORBIT (lobby avatar) ==============================
function spawnOrbit(){
  const orbit = document.getElementById('orbit');
  if (!orbit || orbit.children.length) return;
  for (let i = 0; i < 6; i++){
    const op = document.createElement('div');
    op.className = 'orbit-particle';
    const dur = 6 + Math.random() * 3;
    op.style.animation = `orbit-anim ${dur}s linear infinite`;
    op.style.animationDelay = `-${(i / 6) * dur}s`;
    if (i % 3 === 0) { op.style.background = '#22D3EE'; op.style.boxShadow = '0 0 12px #22D3EE, 0 0 24px #22D3EE'; }
    else if (i % 3 === 1) { op.style.background = '#FFB627'; op.style.boxShadow = '0 0 12px #FFB627, 0 0 24px #FFB627'; }
    orbit.appendChild(op);
  }
}

// ============================== COUNTDOWNS (global ticking) ==============================
setInterval(() => {
  const s = document.getElementById('cd-s');
  if (s) { let n = parseInt(s.textContent); n--; if (n<0) n=59; s.textContent = String(n).padStart(2,'0'); }
  const t = document.getElementById('coins-timer');
  if (t) {
    const m = t.textContent.match(/(\d+):(\d+):(\d+)/);
    if (m) { let h=+m[1], mi=+m[2], sec=+m[3]; sec--; if(sec<0){sec=59;mi--;} if(mi<0){mi=59;h--;} if(h<0)h=2; t.textContent = String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0')+':'+String(sec).padStart(2,'0'); }
  }
  const dt = document.getElementById('daily-timer');
  if (dt) {
    const m = dt.textContent.match(/(\d+)h (\d+)m/);
    if (m) { let h=+m[1], mi=+m[2]; mi--; if(mi<0){mi=59;h--;} if(h<0)h=14; dt.textContent = h+'h '+String(mi).padStart(2,'0')+'m'; }
  }
}, 1000);

// ============================== LIVE JACKPOT TICKER ==============================
setInterval(() => {
  const el = document.getElementById('jackpot-val');
  if (!el) return;
  const cur = parseInt(el.textContent.replace(/[^0-9]/g,'')) || 12487302;
  el.textContent = '৳ ' + (cur + Math.floor(Math.random()*50+10)).toLocaleString('en-IN');
}, 200);

// ============================== LOBBY ==============================
// Quick-play hot games — small tiles under the avatar
const QuickPlayGames = [
  ['Aviator',        'Spribe',     'aviator'],
  ['Crazy Time',     'Evolution',  'crazy_time'],
  ['Super Ace',      'JILI',       'super_ace'],
  ['Sweet Bonanza',  'Pragmatic',  'sweet_bonanza'],
  ['Mega Wheel',     'Pragmatic',  'mega_wheel'],
  ['Plinko',         'Spribe',     'plinko'],
];

Screens.lobby = () => `
<div class="layout-lobby">
  <!-- LEFT -->
  <div class="stack-col">
    <div class="glass amber" style="padding:14px;">
      <div class="card-h">
        <div class="icon-box amber">🎯</div>
        <div class="label amber-c">Daily Spin</div>
        <div class="right num-mono" id="daily-timer">14h 22m</div>
      </div>
      <div class="barrel" style="margin-top:10px;">
        <div class="barrel-fade-l"></div><div class="barrel-fade-r"></div><div class="barrel-pointer"></div>
        <div class="barrel-strip" id="barrel"></div>
      </div>
      <button class="cta-neon amber full" style="margin-top:10px;" onclick="spinBarrel('barrel')">🎯 SPIN · UP TO ৳5K</button>
    </div>

    <button class="coins-btn" onclick="collectCoins(event)">
      <span class="coin-icon">💰</span>
      <div class="info"><div class="label">FREE COINS</div><div class="amount num-mono">+10,000</div></div>
      <div class="timer num-mono" id="coins-timer">02:14:36</div>
    </button>

    <div class="glass amber tourney-card" style="padding:14px;">
      <div class="card-h">
        <div class="icon-box amber">🏆</div>
        <div class="label amber-c">IPL Tournament</div>
      </div>
      <div style="font-family:'Orbitron';font-weight:700;font-size:11px;color:#fff;margin-top:6px;">Champions Cup</div>
      <div class="prize num-mono">৳ 50,00,000</div>
      <div class="countdown">
        <div><div class="n" id="cd-d">02</div><div class="l">days</div></div>
        <div><div class="n" id="cd-h">11</div><div class="l">hrs</div></div>
        <div><div class="n" id="cd-m">24</div><div class="l">min</div></div>
        <div><div class="n" id="cd-s">18</div><div class="l">sec</div></div>
      </div>
    </div>
  </div>

  <!-- CENTER: AVATAR + QUICK PLAY GAMES -->
  <div class="stack-col" style="min-height:0;">
    <!-- Avatar (top) — pure emoji character -->
    <div class="avatar-stage" style="flex:1;min-height:0;">
      <div class="spotlight"></div>
      <div class="energy-ring-2"></div>
      <div class="energy-ring"></div>
      <div class="character-wrap" id="character-wrap" onclick="emote()" style="width:220px;height:260px;">
        <div class="tier-emblem" style="z-index:8;"><span class="icon">🥈</span><span class="tier-name">SILVER II</span></div>
        <div class="orbit" id="orbit"></div>
        <div class="character" id="character" style="font-size:150px;">🤴</div>
        <div class="name-plate" style="z-index:8;"><div class="name" style="font-size:22px;">RD JAY</div><div class="skin">ROYAL PANJABI</div></div>
        <div class="bubble" id="bubble" style="z-index:8;"><div class="bn" id="bubble-bn">🏏 চলো খেলি!</div><div class="en" id="bubble-en">Let's play!</div></div>
      </div>
    </div>

    <!-- HOT GAMES QUICK-PLAY ROW -->
    <div style="flex-shrink:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px 8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-family:'Orbitron';font-weight:900;font-size:13px;color:#9DE134;letter-spacing:2px;">🔥 HOT GAMES</span>
          <span style="font-size:10px;color:#71717A;">tap to play instantly</span>
        </div>
        <button onclick="setScreen('slots')" style="font-size:10px;font-weight:700;color:#9DE134;background:none;border:none;cursor:pointer;font-family:inherit;">All games →</button>
      </div>
      <div class="quick-play-row">
        ${QuickPlayGames.map(([n,prov,img]) => `
          <button class="qp-tile" onclick="launchGame('${n}','${prov}')">
            <img src="${GAME_IMG(img)}" alt="${n}">
            <span class="qp-live"></span>
            <div class="qp-name">${n.toUpperCase()}</div>
          </button>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- RIGHT: LIVE WINS + MISSIONS + FRIENDS + PROMO -->
  <div class="stack-col lobby-right-stack">
    <!-- Live wins ticker -->
    <div class="glass lobby-right-card">
      <div class="card-h"><div class="icon-box">🏆</div><div class="label brand">LIVE BIG WINS</div><div class="right" style="font-size:9px;color:#9DE134;">● LIVE</div></div>
      <div class="lr-wins-list" style="margin-top:10px;">
        ${[
          ['🥇','M****61','Aviator','৳ 124,000'],
          ['🎰','S****ad','Sweet Bonanza','৳ 89,500'],
          ['🎡','R****na','Crazy Time','৳ 56,800'],
          ['🎰','F****ul','Super Ace','৳ 38,200'],
          ['✈️','A****hi','Aviator','৳ 24,100'],
        ].map(([em,u,g,a])=>`<div class="lr-win"><span class="em">${em}</span><div><div class="u">${u}</div><div class="g">${g}</div></div><div class="a">${a}</div></div>`).join('')}
      </div>
    </div>

    <!-- Today's missions widget -->
    <div class="glass lobby-right-card">
      <div class="card-h"><div class="icon-box">🎯</div><div class="label brand">TODAY'S MISSIONS</div><div class="right">2/3</div></div>
      <div style="margin-top:6px;">
        <div class="lr-mission done">
          <div class="m-icon">✓</div>
          <div class="m-info"><div class="m-title">Place 3 bets in any slot</div><div class="m-progress">3/3</div></div>
          <div class="m-reward">৳20</div>
        </div>
        <div class="lr-mission done">
          <div class="m-icon">✓</div>
          <div class="m-info"><div class="m-title">Deposit ৳ 500 or more</div><div class="m-progress">৳500/৳500</div></div>
          <div class="m-reward">৳30</div>
        </div>
        <div class="lr-mission">
          <div class="m-icon">🃏</div>
          <div class="m-info"><div class="m-title">Win a Baccarat hand</div><div class="m-progress">0/1 · in progress</div></div>
          <div class="m-reward">৳100</div>
        </div>
      </div>
      <button onclick="setScreen('missions')" class="cta-ghost" style="width:100%;margin-top:8px;font-size:10px;">View all missions →</button>
    </div>

    <!-- Friends online -->
    <div class="glass lobby-right-card">
      <div class="card-h"><div class="icon-box">👥</div><div class="label brand">FRIENDS ONLINE</div><div class="right">8</div></div>
      <div class="lr-friends">
        ${[
          ['🤴','online','RD'],
          ['🏏','online','SH'],
          ['🎮','away','FL'],
          ['👑','online','MR'],
          ['🌙','online','EL'],
          ['🐅','online','TG'],
          ['🎨','away','PB'],
          ['🃏','online','JR'],
        ].map(([em,st,_])=>`<div class="lr-friend ${st==='away'?'away':''}"><span class="fr-em">${em}</span><span class="fr-dot"></span></div>`).join('')}
      </div>
      <button onclick="setScreen('refer')" class="cta-ghost" style="width:100%;margin-top:8px;font-size:10px;">Invite more friends →</button>
    </div>

    <!-- Promo banner -->
    <div class="lr-promo" onclick="setScreen('promo')">
      <span class="p-tag">FLASH · 6H LEFT</span>
      <div class="p-title">POHELA BOISHAKH</div>
      <div class="p-amount">৳ 600 BONUS</div>
      <div class="p-sub">Triple deposit · auto-applied</div>
      <div class="p-timer">⏱ Ends in 05h 42m</div>
    </div>
  </div>
</div>`;

postRender.lobby = () => { buildBarrel('barrel'); spawnOrbit(); };


// ============================== CRASH GAMES ==============================
let crashProvider = 'spribe';
const CrashProviders = [
  { k:'spribe',     n:'Spribe',         e:'✈️', count:'4 games' },
  { k:'rajabaji',   n:'RajaBaji',       e:'🛩️', count:'1 game' },
  { k:'inout',      n:'InOut Games',    e:'🐔', count:'1 game' },
  { k:'smartsoft',  n:'SmartSoft',      e:'🚀', count:'1 game' },
  { k:'bcgames',    n:'BC Games',       e:'💥', count:'1 game' },
  { k:'turbo',      n:'Turbo Games',    e:'💎', count:'2 games' },
];
function setCrashProvider(p){ crashProvider = p; setScreen('crash'); }

const AllCrashGames = [
  ['Aviator','Spribe','spribe','aviator','2,847','HOT','✈️ Original crash · 100x peak'],
  ['Plinko','Spribe','spribe','plinko','943','NEW','🟢 Ball drop · 1000x multipliers'],
  ['Mini Mines','Spribe','spribe','plinko','512','HOT','💣 Dodge mines · collect gems'],
  ['Dice','Spribe','spribe','plinko','389',null,'🎲 Pick odds · 98% RTP'],
  ['Aviatrix','RajaBaji','rajabaji','aviator','1,234','HOT','🛩️ NFT planes · custom skins'],
  ['Chicken Road 2','InOut','inout','chicken_road','823','HOT','🐔 Cross lanes · 1000x'],
  ['JetX','SmartSoft','smartsoft','aviator','645',null,'🚀 Race the jet · 200x peaks'],
  ['Crash Royale','BC Games','bcgames','aviator','423',null,'💥 Auto-cashout · crypto style'],
  ['Crash X','Turbo Games','turbo','aviator','312',null,'⚡ Lightning rounds · 5s'],
  ['Cash or Crash','Turbo Games','turbo','aviator','289','NEW','💸 Cash out anytime'],
];

function crashCardHTML(g){
  const [n,prov,_pk,img,playing,tag,sub] = g;
  return `<div class="game-card-big" onclick="launchGame('${n}','${prov}')">
    <img src="${GAME_IMG(img)}" alt="${n}">
    <div class="gc-tags">
      ${tag?`<span class="gc-tag ${tag.toLowerCase()}">${tag}</span>`:'<span></span>'}
      <span class="gc-count">👥 ${playing}</span>
    </div>
    <div class="gc-info">
      <div class="gc-name">${n.toUpperCase()}</div>
      <div class="gc-meta">${prov}</div>
      <div class="gc-stats"><span>${sub}</span></div>
    </div>
    <div class="gc-play">▶ PLAY NOW</div>
  </div>`;
}

Screens.crash = () => {
  const provider = CrashProviders.find(p => p.k === crashProvider) || CrashProviders[0];
  const games = AllCrashGames.filter(g => g[2] === crashProvider);
  return `
<div class="stack-col" style="height:100%;gap:14px;">
  <div class="cat-header">
    <div>
      <div class="cat-title">✈️ CRASH GAMES</div>
      <div class="cat-sub">Choose a provider, slide to find your crash game</div>
    </div>
    <div class="cat-meta">${games.length} games · ${provider.n}</div>
  </div>
  ${ProviderStrip(CrashProviders, crashProvider, 'setCrashProvider')}
  ${GameCarousel('crash-car-' + crashProvider, games, crashCardHTML)}
</div>`;
};

// ============================== CRICKET / SPORTS ==============================
let sportsProvider = 'btisports';
const SportsProviders = [
  { k:'btisports', n:'BTI Sports',     e:'🅱️', count:'3 matches' },
  { k:'sabasport', n:'Saba Sports',    e:'⚡',  count:'2 matches' },
  { k:'imsports',  n:'IM Sports',      e:'🇧🇩', count:'3 matches' },
  { k:'sbo',       n:'SBO Bet',        e:'🎯', count:'1 match' },
  { k:'pinnacle',  n:'Pinnacle',       e:'📐', count:'1 match' },
  { k:'cmd368',    n:'CMD368',         e:'🃎', count:'9 matches' },
  { k:'pragmaticsports', n:'Pragmatic Sports', e:'🏆', count:'4 matches' },
];
function setSportsProvider(p){ sportsProvider = p; setScreen('cricket'); }

const AllCricketMatches = [
  ['MI vs CSK','IPL 2026 · Match 47','Wankhede','LIVE','19.2 ov · MI 186/4','btisports','crazy_time','MI need 19 in 4', 3.4, 3.6],
  ['BAN vs SL','Asia Cup · Group A','Mirpur','LIVE','16.4 ov · BAN 142/3','btisports','super_ace','SL won toss', 2.1, 2.3],
  ['ENG vs AUS','Ashes · Test Day 2','Lords','LIVE','Day 2 · ENG 89/2','btisports','super_ace','Steady start', 1.85, 2.0],
  ['IND vs PAK','T20 Series · Game 3','Dubai','SOON','Starts 8:30 PM','sabasport','crazy_time','Big rivalry · high stakes', 1.9, 1.95],
  ['SA vs NZ','ODI Series · Game 2','Cape Town','SOON','Starts tomorrow','sabasport','aviator','SA at home', 1.75, 2.15],
  ['LSG vs RCB','IPL 2026 · Match 48','Bengaluru','SOON','Tomorrow 7:30 PM','imsports','sweet_bonanza','Kohli vs Rahul', 2.0, 1.85],
  ['BAN vs IND','Asia Cup · Final','Colombo','SOON','Sunday 8:00 PM','imsports','money_coming','Trophy match', 2.4, 1.6],
  ['PAK vs SL','T20 Tri-Series','Karachi','LIVE','12.3 ov · PAK 88/2','imsports','aviator','Babar 50*', 2.5, 1.55],
  ['AUS vs NZ','Trans-Tasman ODI','Sydney','LIVE','35 ov · AUS 195/4','sbo','crazy_time','Smith hundred coming', 1.4, 3.0],
  ['WI vs SA','T20I · Game 1','Bridgetown','SOON','Tonight 11 PM','pinnacle','plinko','First clash this year', 2.7, 1.45],
];

function cricketCardHTML(m){
  const [match,event,venue,status,score,_pk,img,_note,b,l] = m;
  return `<div class="game-card-big" onclick="launchGame('${match}','${event}')">
    <img src="${GAME_IMG(img)}" alt="${match}">
    <div class="gc-tags">
      <span class="gc-tag ${status.toLowerCase() === 'live' ? 'live' : 'new'}">${status}</span>
      <span class="gc-count">🏏 ${event.split('·')[0].trim()}</span>
    </div>
    <div class="gc-info">
      <div class="gc-name">${match}</div>
      <div class="gc-meta">${venue} · ${score}</div>
      <div class="gc-stats" style="margin-top:10px;gap:6px;">
        <span style="background:rgba(34,211,238,.15);color:#22D3EE;font-weight:800;flex:1;text-align:center;">BACK ${b}</span>
        <span style="background:rgba(236,72,153,.15);color:#EC4899;font-weight:800;flex:1;text-align:center;">LAY ${l}</span>
      </div>
    </div>
    <div class="gc-play">📊 OPEN MARKETS</div>
  </div>`;
}

Screens.cricket = () => {
  const provider = SportsProviders.find(p => p.k === sportsProvider) || SportsProviders[0];
  const matches = AllCricketMatches.filter(m => m[5] === sportsProvider);
  return `
<div class="stack-col" style="height:100%;gap:14px;">
  <div class="cat-header">
    <div>
      <div class="cat-title">🏏 CRICKET</div>
      <div class="cat-sub">Choose a sportsbook, slide to find your match</div>
    </div>
    <div class="cat-meta">${matches.length} matches · ${provider.n}</div>
  </div>
  ${ProviderStrip(SportsProviders, sportsProvider, 'setSportsProvider')}
  ${matches.length > 0 ? GameCarousel('cricket-car-' + sportsProvider, matches, cricketCardHTML) : '<div style="flex:1;display:grid;place-items:center;color:#71717A;font-size:13px;">No matches from this sportsbook today · check back soon</div>'}
</div>`;
};

// ============================== FISHING ==============================
let fishingProvider = 'jili';
const FishingProviders = [
  { k:'jili',       n:'JILI Fishing',  e:'🐟', count:'4 games' },
  { k:'cq9',        n:'CQ9 Fishing',   e:'🐡', count:'3 games' },
  { k:'spadefish',  n:'Spadegaming',   e:'🐠', count:'2 games' },
  { k:'fachai',     n:'FaChai',        e:'🦈', count:'2 games' },
  { k:'kagaming',   n:'KA Gaming',     e:'🦑', count:'1 game' },
];
function setFishingProvider(p){ fishingProvider = p; setScreen('fishing'); }

const AllFishingGames = [
  ['Royal Fishing','JILI','jili','big_bass','1,234','HOT','👑 Multiplayer · multi-cannon'],
  ['Happy Fishing','JILI','jili','big_bass','892','LIVE','😊 Casual · 2-player tables'],
  ['Boom Legend','JILI','jili','aviator','745','HOT','💣 Boss fights · jackpot fish'],
  ['Dinosaur Tycoon','JILI','jili','aviator','512','NEW','🦖 Hunt dinos for jackpots'],
  ['Fishing God','CQ9','cq9','big_bass','589','HOT','🌊 Deep sea · 100x fish'],
  ['Fishing War','CQ9','cq9','aviator','345',null,'⚔️ PvP fishing battles'],
  ['Cai Shen Fishing','CQ9','cq9','money_coming','423',null,'💰 Fortune-themed fish'],
  ['Zombie Party','Spadegaming','spadefish','aviator','278',null,'🧟 Zombie sea hunt'],
  ['Fish Hunter','Spadegaming','spadefish','big_bass','189',null,'🎯 Classic arcade fish'],
  ['All Star Fishing','FaChai','fachai','big_bass','423','HOT','⭐ All-star roster'],
  ['Dragon Fortune','FaChai','fachai','money_coming','312',null,'🐉 Dragon-themed fish'],
  ['Wild Fishing','KA Gaming','kagaming','big_bass','156',null,'🌿 Forest river hunt'],
];

function fishingCardHTML(g){
  const [n,prov,_pk,img,playing,tag,sub] = g;
  return `<div class="game-card-big" onclick="launchGame('${n}','${prov}')">
    <img src="${GAME_IMG(img)}" alt="${n}">
    <div class="gc-tags">
      ${tag?`<span class="gc-tag ${tag.toLowerCase()}">${tag}</span>`:'<span></span>'}
      <span class="gc-count">👥 ${playing}</span>
    </div>
    <div class="gc-info">
      <div class="gc-name">${n.toUpperCase()}</div>
      <div class="gc-meta">${prov}</div>
      <div class="gc-stats"><span>${sub}</span></div>
    </div>
    <div class="gc-play">▶ CAST LINE</div>
  </div>`;
}

Screens.fishing = () => {
  const provider = FishingProviders.find(p => p.k === fishingProvider) || FishingProviders[0];
  const games = AllFishingGames.filter(g => g[2] === fishingProvider);
  return `
<div class="stack-col" style="height:100%;gap:14px;">
  <div class="cat-header">
    <div>
      <div class="cat-title">🎣 FISHING</div>
      <div class="cat-sub">Choose a provider, slide to find your fishing game</div>
    </div>
    <div class="cat-meta">${games.length} games · ${provider.n}</div>
  </div>
  ${ProviderStrip(FishingProviders, fishingProvider, 'setFishingProvider')}
  ${GameCarousel('fishing-car-' + fishingProvider, games, fishingCardHTML)}
</div>`;
};

// ============================== LIVE CASINO ==============================
let liveProvider = 'evolution';
const LiveProviders = [
  { k:'evolution', n:'Evolution',      e:'🎡', count:'9 tables' },
  { k:'pragmatic', n:'Pragmatic Live', e:'🍭', count:'5 tables' },
  { k:'ezugi',     n:'Ezugi',          e:'🃏', count:'3 tables' },
  { k:'aesexy',    n:'AE Sexy',        e:'💃', count:'2 tables' },
  { k:'biggaming', n:'Big Gaming',     e:'🐅', count:'2 tables' },
  { k:'wmcasino',  n:'WM Casino',      e:'🎴', count:'1 table' },
  { k:'sagaming',  n:'SA Gaming',      e:'♠️', count:'1 table' },
  { k:'beton',     n:'BetOn Games',    e:'🎯', count:'1 table' },
];
function setLiveProvider(p){ liveProvider = p; setScreen('live'); }

const AllLiveGames = [
  ['Crazy Time','Evolution','evolution','crazy_time','2,849','LIVE','Wheel · 5 bonus rounds'],
  ['Lightning Roulette','Evolution','evolution','lightning_roulette','1,124','LIVE','500x lightning numbers'],
  ['Funky Time','Evolution','evolution','funky_time','946','LIVE','70s disco game show'],
  ['Live Blackjack','Evolution','evolution','super_ace','1,289','LIVE','Multi-hand · multiplayer'],
  ['Auto Roulette','Evolution','evolution','lightning_roulette','945','LIVE','No dealer · 24/7'],
  ['Baccarat A','Evolution','evolution','super_ace','678','LIVE','Squeeze & speed modes'],
  ['Speed Bacc','Evolution','evolution','lightning_roulette','432','LIVE','27s per round'],
  ['Monopoly Big Baller','Evolution','evolution','crazy_time','834','HOT','Monopoly-themed bingo'],
  ['Dragon Tiger','Evolution','evolution','super_ace','421','LIVE','Highest card wins'],
  ['Mega Wheel','Pragmatic','pragmatic','mega_wheel','678','LIVE','54-segment wheel'],
  ['Candy Land','Pragmatic','pragmatic','sweet_bonanza','512','LIVE','Sweet bonus games'],
  ['Sweet Bonanza Live','Pragmatic','pragmatic','sweet_bonanza','623','HOT','Live + bonus rounds'],
  ['Mega Roulette','Pragmatic','pragmatic','lightning_roulette','445','LIVE','500x mega multipliers'],
  ['Speed Baccarat','Pragmatic','pragmatic','super_ace','389','LIVE','Fast 25s round'],
  ['Teen Patti','Ezugi','ezugi','super_ace','756','HOT','BD favorite · 3 card poker'],
  ['Andar Bahar','Ezugi','ezugi','super_ace','589','LIVE','Classic Indian card game'],
  ['Auto Roulette','Ezugi','ezugi','lightning_roulette','312','LIVE','No dealer · 24/7'],
  ['Sexy Baccarat','AE Sexy','aesexy','super_ace','1,156','HOT','Live · Asian dealers'],
  ['Sexy Roulette','AE Sexy','aesexy','lightning_roulette','678','LIVE','Asian live focus'],
  ['Bull Bull','Big Gaming','biggaming','super_ace','445','LIVE','Card combinations'],
  ['Sic Bo','Big Gaming','biggaming','crazy_time','289','LIVE','3-dice Asian classic'],
  ['Dragon Tiger','WM Casino','wmcasino','super_ace','512','LIVE','Asian dealer · fast'],
  ['SA Baccarat','SA Gaming','sagaming','super_ace','423','LIVE','Asian baccarat tables'],
  ['Virtual Horse','BetOn','beton','aviator','189','NEW','Virtual horse racing'],
];

function liveCardHTML(g){
  const [n,prov,_pk,img,playing,tag,sub] = g;
  return `<div class="game-card-big" onclick="launchGame('${n}','${prov}')">
    <img src="${GAME_IMG(img)}" alt="${n}">
    <div class="gc-tags">
      ${tag?`<span class="gc-tag ${tag.toLowerCase()}">${tag}</span>`:'<span></span>'}
      <span class="gc-count">👥 ${playing}</span>
    </div>
    <div class="gc-info">
      <div class="gc-name">${n.toUpperCase()}</div>
      <div class="gc-meta">${prov}</div>
      <div class="gc-stats">
        <span>${sub}</span>
      </div>
    </div>
    <div class="gc-play">▶ JOIN TABLE</div>
  </div>`;
}

Screens.live = () => {
  const provider = LiveProviders.find(p => p.k === liveProvider) || LiveProviders[0];
  const games = AllLiveGames.filter(g => g[2] === liveProvider);
  return `
<div class="stack-col" style="height:100%;gap:14px;">
  <div class="cat-header">
    <div>
      <div class="cat-title">🎲 LIVE CASINO</div>
      <div class="cat-sub">Choose a provider, slide to find your table</div>
    </div>
    <div class="cat-meta">${games.length} live · ${provider.n}</div>
  </div>
  ${ProviderStrip(LiveProviders, liveProvider, 'setLiveProvider')}
  ${GameCarousel('live-car-' + liveProvider, games, liveCardHTML)}
</div>`;
};

// ============================== SLOTS LOBBY ==============================
let slotsProvider = 'pragmatic';
const SlotsProviders = [
  { k:'pragmatic',   n:'Pragmatic Play', e:'⚡', count:'6 games' },
  { k:'jili',        n:'JILI Games',     e:'🃏', count:'6 games' },
  { k:'pgsoft',      n:'PG Soft',        e:'🐯', count:'5 games' },
  { k:'spribe',      n:'Spribe',         e:'✈️', count:'4 games' },
  { k:'habanero',    n:'Habanero',       e:'🌶️', count:'2 games' },
  { k:'spadegaming', n:'Spadegaming',    e:'♠️', count:'2 games' },
  { k:'cq9',         n:'CQ9 Gaming',     e:'🐉', count:'2 games' },
  { k:'redtiger',    n:'Red Tiger',      e:'🐅', count:'1 game' },
];
function setSlotsProvider(p){ slotsProvider = p; setScreen('slots'); }

const AllSlotGames = [
  ['Sweet Bonanza','Pragmatic','pragmatic','sweet_bonanza','96.5','2,847','HOT'],
  ['Gates of Olympus','Pragmatic','pragmatic','lightning_roulette','96.5','1,892','HOT'],
  ['Wild West Gold','Pragmatic','pragmatic','chicken_road','96.5','956',null],
  ['Big Bass Bonanza','Pragmatic','pragmatic','big_bass','96.7','1,234',null],
  ['The Dog House','Pragmatic','pragmatic','chicken_road','96.5','812',null],
  ['Sugar Rush','Pragmatic','pragmatic','sweet_bonanza','96.5','645','NEW'],
  ['Super Ace','JILI','jili','super_ace','96.0','2,103','JACKPOT'],
  ['Money Coming','JILI','jili','money_coming','97.0','1,892','HOT'],
  ['Boom Legend','JILI','jili','aviator','96.5','745',null],
  ['Golden Empire','JILI','jili','money_coming','96.7','612',null],
  ['Fortune Gems','JILI','jili','super_ace','96.0','489','NEW'],
  ['Crazy 777','JILI','jili','money_coming','96.2','356',null],
  ['Mahjong Ways','PG Soft','pgsoft','super_ace','96.9','1,456','HOT'],
  ['Treasures of Aztec','PG Soft','pgsoft','money_coming','96.7','823',null],
  ['Lucky Neko','PG Soft','pgsoft','chicken_road','96.7','712',null],
  ['Fortune Tiger','PG Soft','pgsoft','super_ace','96.8','1,089','HOT'],
  ['Fortune Ox','PG Soft','pgsoft','money_coming','96.7','645',null],
  ['Aviator','Spribe','spribe','aviator','97.0','2,847','HOT'],
  ['Plinko','Spribe','spribe','plinko','97.0','943','NEW'],
  ['Mini Mines','Spribe','spribe','plinko','97.0','512',null],
  ['Dice','Spribe','spribe','plinko','98.0','389',null],
  ['Hot Hot Fruit','Habanero','habanero','sweet_bonanza','96.7','267',null],
  ['Wealth Inn','Habanero','habanero','money_coming','96.7','189',null],
  ['Wow Prosperity','Spadegaming','spadegaming','money_coming','96.5','423',null],
  ['Fa Cai Shen','Spadegaming','spadegaming','super_ace','96.6','356',null],
  ['Fortune Lions','CQ9','cq9','aviator','96.0','512',null],
  ['Dancing Lion','CQ9','cq9','crazy_time','96.5','278',null],
  ['Daily Jackpot','Red Tiger','redtiger','lightning_roulette','95.7','445','JACKPOT'],
];

function slotCardHTML(g){
  const [n,prov,_pk,img,rtp,playing,tag] = g;
  return `<div class="game-card-big" onclick="launchGame('${n}','${prov}')">
    <img src="${GAME_IMG(img)}" alt="${n}">
    <div class="gc-tags">
      ${tag?`<span class="gc-tag ${tag.toLowerCase()}">${tag}</span>`:'<span></span>'}
      <span class="gc-count">👥 ${playing}</span>
    </div>
    <div class="gc-info">
      <div class="gc-name">${n.toUpperCase()}</div>
      <div class="gc-meta">${prov}</div>
      <div class="gc-stats">
        <span>RTP ${rtp}%</span>
        <span>৳20 min</span>
      </div>
    </div>
    <div class="gc-play">▶ PLAY NOW</div>
  </div>`;
}

Screens.slots = () => {
  const provider = SlotsProviders.find(p => p.k === slotsProvider) || SlotsProviders[0];
  const games = AllSlotGames.filter(g => g[2] === slotsProvider);
  return `
<div class="stack-col" style="height:100%;gap:14px;">
  <div class="cat-header">
    <div>
      <div class="cat-title">🎰 SLOTS</div>
      <div class="cat-sub">Choose a provider, slide to find your game</div>
    </div>
    <div class="cat-meta">${games.length} games · ${provider.n}</div>
  </div>
  ${ProviderStrip(SlotsProviders, slotsProvider, 'setSlotsProvider')}
  ${GameCarousel('slots-car-' + slotsProvider, games, slotCardHTML)}
</div>`;
};

// ============================== COIN SHOP (master-detail) ==============================
let shopCategory = 'skins';
let shopItemIdx = 0;
let avatarSkin = 'panjabi';
const AvatarSkins = {
  panjabi:   { e:'🤴' },
  cricket:   { e:'🏏' },
  eid:       { e:'🌙' },
  streetwear:{ e:'🧢' },
  esports:   { e:'🎮' },
  pohela:    { e:'🎨' },
  sultan:    { e:'👑' },
  sundarbans:{ e:'🐅' },
};
function setShopCategory(c){ shopCategory = c; shopItemIdx = 0; setScreen('shop'); }
function setShopItem(i){ shopItemIdx = i; setScreen('shop'); }
function equipSkin(id){ avatarSkin = id; beep(900, 100); setTimeout(()=>beep(1200, 150), 100); confetti(); setScreen('shop'); setTimeout(()=>setScreen('lobby'), 800); }

const ShopCategories = {
  skins:  { e:'👤', n:'Avatar Skins', accent:'brand' },
  coins:  { e:'🪙', n:'Coin Packs', accent:'brand' },
  gems:   { e:'💎', n:'Gems', accent:'cyan' },
  bundles:{ e:'🎁', n:'Bundles', accent:'amber' },
  vip:    { e:'🏆', n:'VIP Packs', accent:'purple' },
  boost:  { e:'🎯', n:'Boost Packs', accent:'brand' },
  pass:   { e:'📜', n:'Season Pass', accent:'amber' },
  my:     { e:'🛍', n:'My Purchases', accent:'zinc' },
};

const ShopData = {
  skins: [
    { e:'🤴', n:'Royal Panjabi', p:'Free', v:'Default · BD traditional', skin:'panjabi', desc:'Default Bangladeshi royal panjabi outfit. Free for all players.' },
    { e:'🏏', n:'Tiger Cricket Jersey', p:'৳ 250', v:'BD team kit', skin:'cricket', desc:'Wear the Bangladesh Tigers cricket jersey. Auto-equip during IPL/Asia Cup.' },
    { e:'🌙', n:'Eid Premium', p:'৳ 400', v:'Festive holiday set', skin:'eid', desc:'Crescent moon kurta with golden trim. Perfect for Eid season.' },
    { e:'🧢', n:'Dhaka Streetwear', p:'৳ 600', v:'Urban modern look', skin:'streetwear', desc:'Urban Dhaka streetwear — cap, hoodie, sneakers.' },
    { e:'🎮', n:'Esports Pro', p:'৳ 800', v:'Gaming gear', skin:'esports', desc:'Esports champion gear — headset, jersey, gaming glasses.' },
    { e:'🎨', n:'Pohela Boishakh', p:'৳ 1,200', v:'Bengali New Year', skin:'pohela', desc:'Festive set with traditional alpana patterns.' },
    { e:'👑', n:'Royal Sultan', p:'৳ 2,500', v:'Mughal royalty', skin:'sultan', desc:'Mughal-era royal robe and turban with jeweled accessories.' },
    { e:'🐅', n:'Sundarbans Tiger', p:'৳ 5,000', v:'Mythic tiger', skin:'sundarbans', desc:'Channel the spirit of the Royal Bengal Tiger. Rarest in the shop.' },
  ],
  coins: [
    { e:'💵', n:'Starter', p:'৳ 100', v:'+ 5K coins', desc:'Small top-up to try out games.' },
    { e:'💰', n:'Bronze', p:'৳ 500', v:'+ 30K coins · 5% bonus', desc:'Bronze tier saver with 5% extra bonus.' },
    { e:'💎', n:'Silver', p:'৳ 1,000', v:'+ 70K coins · 15% bonus', desc:'Sweet spot for regulars.' },
    { e:'🏆', n:'Gold', p:'৳ 3,000', v:'+ 250K coins · 30% bonus', desc:'Unlocks Gold daily missions for 7 days.' },
    { e:'👑', n:'Platinum', p:'৳ 5,000', v:'+ 500K coins · 50% bonus', desc:'Half a million coins + VIP gift box.' },
    { e:'💠', n:'Diamond', p:'৳ 10,000', v:'+ 1.2M coins · POPULAR', desc:'1.2M coins + premium daily perks for a week.' },
    { e:'🤴', n:'Royal', p:'৳ 25,000', v:'+ 3.5M coins · BEST', desc:'Best value per BDT. Month of premium perks.' },
    { e:'🐋', n:'Whale', p:'৳ 50,000', v:'+ 8M coins · VIP', desc:'Instant Diamond tier + dedicated host.' },
  ],
  gems: [
    { e:'💎', n:'Sparkle', p:'৳ 50', v:'50 gems', desc:'Sample gem pack.' },
    { e:'💎', n:'Shimmer', p:'৳ 200', v:'250 gems · 5%', desc:'+5% gem bonus.' },
    { e:'💎', n:'Glow', p:'৳ 500', v:'700 gems · 15%', desc:'Solid mid-tier pack.' },
    { e:'💎', n:'Brilliant', p:'৳ 1,500', v:'2.5K gems · 25%', desc:'Brilliant value.' },
    { e:'💎', n:'Radiant', p:'৳ 3,000', v:'6K gems · POPULAR', desc:'Most-bought gem pack.' },
    { e:'💎', n:'Galactic', p:'৳ 10,000', v:'25K gems · BEST', desc:'Galactic flagship purchase.' },
  ],
  bundles: [
    { e:'✈️', n:'Aviator Mega Pack', p:'৳ 1,500', v:'৳2K + 100 flights', desc:'Aviator favorite.', img:'aviator' },
    { e:'🎰', n:'Slots Bonanza', p:'৳ 2,500', v:'৳3K + 500 spins', desc:'For slot lovers.', img:'sweet_bonanza' },
    { e:'🏏', n:'Cricket Champion', p:'৳ 4,200', v:'৳5K + ৳500 free bet', desc:'IPL/Asia Cup pack.', img:'crazy_time' },
    { e:'🃏', n:'Live Casino Royal', p:'৳ 2,800', v:'৳3K + 24h 3x rebate', desc:'Royal pack for live casino.', img:'super_ace' },
    { e:'💥', n:'Crash Junkie', p:'৳ 800', v:'৳1K + auto cashout pro', desc:'For crash game fans.', img:'aviator' },
    { e:'📅', n:'Daily Grind', p:'৳ 3,200', v:'৳500/day for 7 days', desc:'Steady daily top-up.', img:'money_coming' },
  ],
  vip: [
    { e:'🥈', n:'Silver Box', p:'৳ 800', v:'৳ 5K + 50 gems', tier:'Silver', desc:'Silver-tier exclusive.' },
    { e:'🥇', n:'Gold Vault', p:'৳ 2,500', v:'৳ 18K + 200 gems', tier:'Gold', locked:true, desc:'Unlocks at Gold.' },
    { e:'💎', n:'Platinum Chest', p:'৳ 6,000', v:'৳ 50K + 800 gems', tier:'Platinum', locked:true, desc:'Massive value.' },
    { e:'💠', n:'Diamond Crown', p:'৳ 15,000', v:'৳ 150K + 3K gems', tier:'Diamond', locked:true, desc:'Top-tier flagship.' },
  ],
  boost: [
    { e:'♻️', n:'2x Rebate · 1h', p:'৳ 100', v:'Double rebate 1h', desc:'Activate for 1h.' },
    { e:'♻️', n:'2x Rebate · 24h', p:'৳ 1,200', v:'Full day · POPULAR', desc:'Best for grinders.' },
    { e:'📈', n:'5x XP · 1h', p:'৳ 200', v:'5x XP boost 1h', desc:'Race up the VIP ladder.' },
    { e:'📈', n:'5x XP · 24h', p:'৳ 2,000', v:'Full day · BEST', desc:'Massive XP boost.' },
    { e:'🎰', n:'100 free spins', p:'৳ 500', v:'Top-10 slots', desc:'100 spins across slots.' },
    { e:'✈️', n:'50 free flights', p:'৳ 800', v:'Aviator free bets', desc:'50 free Aviator rounds.' },
  ],
  pass: [
    { e:'⭐', n:'Tier 1-25 (Free)', p:'Free', v:'Free track rewards', desc:'Free track tiers 1-25.' },
    { e:'👑', n:'Premium · Tier 1-25', p:'Pass req.', v:'Premium · ৳999', desc:'Unlocked with Champions Pass.' },
    { e:'🏆', n:'Tier 26-50', p:'Pass req.', v:'Mid-pass rewards', desc:'Cash + gems + boosters.' },
    { e:'💎', n:'Tier 51-75', p:'Pass req.', v:'Premium frames', desc:'High-tier premium rewards.' },
    { e:'👑', n:'Tier 76-100 finale', p:'Pass req.', v:'Mega cash + Platinum', desc:'End-of-season finale.' },
  ],
  my: [
    { e:'🎁', n:'Festival Mega Bundle', p:'৳ 4,999', v:'Active · expires May 31', tag:'Active', date:'May 17', desc:'Festival bundle.' },
    { e:'📜', n:'Champions Pass S4', p:'৳ 999', v:'Active · ends in 21d', tag:'Active', date:'May 14', desc:'Premium track unlocked.' },
    { e:'🏆', n:'Gold Coin Pack', p:'৳ 3,000', v:'Completed', tag:'Done', date:'May 12', desc:'Gold pack used.' },
    { e:'💎', n:'Silver Gem Pack', p:'৳ 500', v:'Completed', tag:'Done', date:'May 10', desc:'Glow tier gems.' },
    { e:'♻️', n:'2x Rebate · 24h', p:'৳ 1,200', v:'Expired May 10', tag:'Expired', date:'May 09', desc:'24h booster used.' },
  ],
};

Screens.shop = () => {
  const cat = ShopCategories[shopCategory];
  const items = ShopData[shopCategory] || [];
  const sel = items[shopItemIdx] || items[0];
  const accentColors = {
    brand:  { ring:'#9DE134', glow:'rgba(157,225,52,.4)', btn:'cta-neon', txt:'#9DE134' },
    cyan:   { ring:'#22D3EE', glow:'rgba(34,211,238,.4)', btn:'cta-neon cyan', txt:'#22D3EE' },
    amber:  { ring:'#FFB627', glow:'rgba(255,182,39,.4)', btn:'cta-neon amber', txt:'#FFB627' },
    purple: { ring:'#A855F7', glow:'rgba(168,85,247,.4)', btn:'cta-neon purple', txt:'#A855F7' },
    zinc:   { ring:'#71717A', glow:'rgba(113,113,122,.4)', btn:'cta-neon', txt:'#A1A1AA' },
  };
  const acc = accentColors[cat.accent];
  const isSkin = shopCategory === 'skins';
  const isMy = shopCategory === 'my';
  const isVipLocked = shopCategory === 'vip' && sel && sel.locked;
  return `
<div class="screen-grid" style="grid-template-columns: 200px 1fr 300px;">
  <!-- Categories rail -->
  <div class="glass" style="padding:10px;display:flex;flex-direction:column;gap:4px;">
    <div class="label" style="padding:4px 6px;">SHOP</div>
    ${Object.entries(ShopCategories).map(([k,c])=>{
      const active = k === shopCategory;
      return `<button onclick="setShopCategory('${k}')" style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:10px;cursor:pointer;font-family:inherit;border:none;text-align:left;${active?'background:#9DE134;color:#0a0a0a':'background:transparent;color:#D4D4D8'}">
        <span style="font-size:16px;">${c.e}</span>
        <span style="font-size:11px;font-weight:${active?900:600};">${c.n}</span>
      </button>`;
    }).join('')}
    <div style="margin-top:auto;padding:10px;border-radius:10px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.06);">
      <div style="font-size:8px;color:#71717A;font-weight:800;letter-spacing:1px;">BALANCE</div>
      <div style="display:flex;flex-direction:column;gap:3px;margin-top:4px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;"><span style="color:#A1A1AA;">💵 Cash</span><span style="color:#9DE134;font-weight:800;" class="num-mono">৳4,562</span></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;"><span style="color:#A1A1AA;">🪙 Coins</span><span style="color:#FFB627;font-weight:800;" class="num-mono">1.2M</span></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;"><span style="color:#A1A1AA;">💎 Gems</span><span style="color:#22D3EE;font-weight:800;" class="num-mono">248</span></div>
      </div>
    </div>
  </div>

  <!-- Items grid 2-col -->
  <div class="glass" style="padding:10px;display:flex;flex-direction:column;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.06);">
      <div>
        <div style="font-family:'Orbitron';font-weight:900;font-size:13px;color:${acc.txt};letter-spacing:2px;">${cat.e} ${cat.n.toUpperCase()}</div>
        <div style="font-size:9px;color:#71717A;">${items.length} items</div>
      </div>
      <div style="display:flex;gap:4px;">
        <button class="cta-ghost" style="font-size:10px;">Sort ▾</button>
        <button class="cta-ghost" style="font-size:10px;">Filter ▾</button>
      </div>
    </div>
    <div class="scroll-y hide-scroll" style="flex:1;margin-top:8px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;align-content:start;">
      ${items.map((it, i) => {
        const active = i === shopItemIdx;
        const isEquipped = isSkin && it.skin === avatarSkin;
        return `<button onclick="setShopItem(${i})" style="display:flex;flex-direction:column;padding:0;overflow:hidden;border-radius:12px;cursor:pointer;font-family:inherit;text-align:left;background:rgba(15,15,18,.6);${active?`border:2px solid ${acc.ring};box-shadow:0 0 24px ${acc.glow};`:'border:2px solid rgba(255,255,255,.06);'}${it.locked?'opacity:.6':''}transition:all .2s;">
          <div style="position:relative;aspect-ratio:3/2;background:linear-gradient(135deg,rgba(255,255,255,.05),rgba(0,0,0,.4));display:grid;place-items:center;">
            ${it.img?`<img src="${GAME_IMG(it.img)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.5;">`:''}
            <div style="position:relative;font-size:42px;filter:drop-shadow(0 4px 12px rgba(0,0,0,.6));${active?'animation:char-idle 2s ease-in-out infinite':''}">${it.e}</div>
            ${isEquipped?'<span class="pill brand" style="position:absolute;top:6px;left:6px;font-size:8px;">EQUIPPED</span>':it.tag?`<span class="pill ${it.tag==='Active'?'brand':it.tag==='Done'?'ghost':'red'}" style="position:absolute;top:6px;left:6px;font-size:8px;">${it.tag}</span>`:''}
            ${it.locked?'<div style="position:absolute;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);display:grid;place-items:center;font-size:20px;">🔒</div>':''}
          </div>
          <div style="padding:6px 8px;">
            <div style="font-size:10px;font-weight:900;color:white;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${it.n}</div>
            <div style="font-size:8px;color:#71717A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${it.v}</div>
            <div style="font-family:'Orbitron';font-weight:900;color:${acc.txt};font-size:11px;margin-top:2px;" class="num-mono">${it.p}</div>
          </div>
        </button>`;
      }).join('')}
    </div>
  </div>

  <!-- Detail panel -->
  <div class="glass" style="padding:0;display:flex;flex-direction:column;overflow:hidden;">
    <!-- Hero -->
    <div style="position:relative;${isSkin?'height:180px':'height:120px'};background:linear-gradient(135deg,rgba(255,255,255,.05),rgba(0,0,0,.6));display:grid;place-items:center;overflow:hidden;">
      ${sel.img?`<img src="${GAME_IMG(sel.img)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.4;">`:''}
      ${isSkin?'<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 80%, rgba(157,225,52,.3), transparent 60%);"></div>':''}
      <div style="position:relative;font-size:${isSkin?'96px':'72px'};filter:drop-shadow(0 8px 24px rgba(0,0,0,.7));animation:char-idle 4s ease-in-out infinite;">${sel.e}</div>
      ${isSkin && avatarSkin === sel.skin ? '<span class="pill brand" style="position:absolute;top:8px;right:8px;">✓ EQUIPPED</span>' : ''}
      ${isVipLocked?`<div style="position:absolute;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:grid;place-items:center;"><div style="text-align:center;"><div style="font-size:32px;">🔒</div><div style="font-size:11px;font-weight:700;margin-top:4px;">Unlock at ${sel.tier}</div></div></div>`:''}
    </div>
    <!-- Body -->
    <div style="padding:14px;display:flex;flex-direction:column;flex:1;min-height:0;">
      <div style="font-size:9px;color:#71717A;">${cat.n}</div>
      <div style="font-family:'Orbitron';font-weight:900;font-size:16px;margin-top:2px;">${sel.n}</div>
      <div style="font-size:10px;color:${acc.txt};font-weight:700;margin-top:2px;">${sel.v}</div>
      <div class="scroll-y hide-scroll" style="font-size:11px;color:#A1A1AA;margin-top:10px;line-height:1.5;flex:1;">
        ${sel.desc}
      </div>
      <!-- Footer CTA -->
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);">
        ${isMy?`
          <button class="cta-ghost" style="width:100%;padding:8px;font-size:11px;">📄 Download invoice</button>
          <button class="${acc.btn} full" style="margin-top:6px;">${sel.tag==='Active'?'Manage':sel.tag==='Done'?'Buy again':'View receipt'}</button>
        `:isSkin?`
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
            <span style="font-size:9px;color:#71717A;">Price</span>
            <span style="font-family:'Orbitron';font-weight:900;color:${acc.txt};font-size:18px;" class="num-mono">${sel.p}</span>
          </div>
          ${avatarSkin === sel.skin?'<button disabled style="width:100%;padding:12px;border-radius:12px;background:rgba(157,225,52,.2);color:#9DE134;font-weight:900;border:2px solid #9DE134;font-family:inherit;">✓ EQUIPPED</button>':`<button class="${acc.btn} full" style="padding:14px;" onclick="equipSkin('${sel.skin}')">${sel.p==='Free'?'EQUIP':'BUY & EQUIP · '+sel.p}</button>`}
          <button class="cta-ghost" style="width:100%;margin-top:6px;padding:8px;font-size:11px;" onclick="setScreen('lobby')">↩ Preview in Lobby</button>
        `:`
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
            <span style="font-size:9px;color:#71717A;">Total</span>
            <span style="font-family:'Orbitron';font-weight:900;color:${acc.txt};font-size:18px;" class="num-mono">${sel.p}</span>
          </div>
          ${isVipLocked?`<button disabled style="width:100%;padding:12px;border-radius:12px;background:rgba(0,0,0,.4);color:#71717A;font-weight:900;border:1px solid rgba(255,255,255,.1);font-family:inherit;">🔒 LOCKED · Need ${sel.tier}</button>
          <button class="cta-ghost" style="width:100%;margin-top:6px;padding:8px;font-size:11px;" onclick="setScreen('vip')">View VIP journey →</button>`:`<button class="${acc.btn} full" style="padding:14px;" onclick="confetti();beep(1100,200);">BUY NOW · ${sel.p}</button>
          <button class="cta-ghost" style="width:100%;margin-top:6px;padding:8px;font-size:11px;">+ Add to cart</button>`}
        `}
      </div>
    </div>
  </div>
</div>`;
};

// ============================== WALLET ==============================
function WalletSubNav(active){
  const items = [['💰','Overview','wallet'],['↓','Deposit','deposit'],['↑','Withdraw','withdraw'],['⇄','Transfer','wallet'],['💎','Rebate','wallet'],['👥','Referral','refer'],['📋','History','wallet']];
  return `<div class="glass" style="padding:8px;display:flex;flex-direction:column;gap:3px;">
    ${items.map(([e,n,k])=>{
      const a = k === active;
      return `<button onclick="setScreen('${k}')" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-family:inherit;border:none;text-align:left;${a?'background:#9DE134;color:#0a0a0a;font-weight:800':'background:transparent;color:#D4D4D8'};font-size:11px;">
        <span style="font-size:14px;">${e}</span><span>${n}</span>
      </button>`;
    }).join('')}
  </div>`;
}

Screens.wallet = () => `
<div class="screen-grid" style="grid-template-columns:180px 1fr;">
  ${WalletSubNav('wallet')}
  <div class="stack-col">
    <!-- Total hero -->
    <div class="glass" style="padding:18px;background:linear-gradient(135deg,rgba(157,225,52,.25),rgba(15,15,18,.6));border-color:#9DE134;">
      <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:12px;align-items:center;">
        <div>
          <div style="font-size:10px;color:#9DE134;font-weight:800;letter-spacing:1px;">TOTAL BALANCE</div>
          <div style="font-family:'Orbitron';font-weight:900;font-size:32px;background:linear-gradient(180deg,#fff,#9DE134);-webkit-background-clip:text;background-clip:text;color:transparent;" class="num-mono">৳ 5,810.70</div>
        </div>
        <button class="cta-neon" onclick="setScreen('deposit')">+ DEPOSIT</button>
        <button class="cta-ghost" style="padding:12px;font-weight:800;" onclick="setScreen('withdraw')">↑ WITHDRAW</button>
        <button class="cta-ghost" style="padding:12px;font-weight:800;">⇄ TRANSFER</button>
      </div>
    </div>
    <!-- Sub-wallets -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">
      ${[
        ['Main','4,562.30','For games','💰','#9DE134'],
        ['Bonus','280.00','Wager 3x','🎁','#FFB627'],
        ['Rebate','112.00','Auto-claim','💎','#9DE134'],
        ['Referral','856.40','23 friends','👥','#22D3EE'],
        ['Cashback','0.00','Sun reset','♻️','#71717A'],
      ].map(([t,v,sub,e,c])=>`<div class="glass" style="padding:12px;border-color:${c}40;">
        <div style="font-size:18px;">${e}</div>
        <div style="font-size:9px;color:#71717A;margin-top:4px;">${t}</div>
        <div style="font-family:'Orbitron';font-weight:900;font-size:14px;color:${c};" class="num-mono">৳ ${v}</div>
        <div style="font-size:9px;color:#71717A;margin-top:2px;">${sub}</div>
        <button class="cta-ghost" style="margin-top:6px;width:100%;padding:5px;font-size:9px;">Move</button>
      </div>`).join('')}
    </div>
    <!-- Activity table -->
    <div class="glass" style="padding:0;flex:1;overflow:hidden;display:flex;flex-direction:column;">
      <div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.06);">
        <div class="label">RECENT ACTIVITY</div>
        <div style="display:flex;gap:6px;">
          <select style="padding:4px 8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:6px;color:white;font-size:10px;"><option>Last 7 days</option><option>Last 30 days</option></select>
          <select style="padding:4px 8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:6px;color:white;font-size:10px;"><option>All types</option></select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:30px 2fr 1fr 1fr 1fr;gap:8px;padding:8px 14px;background:rgba(255,255,255,.03);font-size:9px;font-weight:800;color:#71717A;letter-spacing:1px;text-transform:uppercase;">
        <div></div><div>Item</div><div>Amount</div><div>When</div><div>Status</div>
      </div>
      <div class="scroll-y hide-scroll" style="flex:1;">
        ${[
          ['↓','Deposit · bKash','+ 2,000.00','11:42 AM','Completed','#9DE134'],
          ['🎮','Bet · Aviator #28471','− 50.00','11:38 AM','Lost','#A1A1AA'],
          ['🏆','Win · Aviator 2.4x','+ 180.00','11:38 AM','Win','#9DE134'],
          ['💎','Rebate · Slots','+ 12.00','9:00 AM','Credit','#9DE134'],
          ['↑','Withdraw · Nagad ****5478','− 1,500.00','Yesterday','Paid','#A1A1AA'],
          ['🎁','Bonus · Daily spin','+ 50.00','Yesterday','Credit','#9DE134'],
        ].map(([i,t,a,when,st,c])=>`<div style="display:grid;grid-template-columns:30px 2fr 1fr 1fr 1fr;gap:8px;padding:10px 14px;border-top:1px solid rgba(255,255,255,.03);font-size:11px;align-items:center;">
          <div style="width:24px;height:24px;border-radius:6px;background:rgba(157,225,52,.1);display:grid;place-items:center;font-size:12px;">${i}</div>
          <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t}</div>
          <div style="color:${c};font-weight:800;" class="num-mono">${a}</div>
          <div style="color:#71717A;">${when}</div>
          <div style="color:#71717A;font-size:10px;">${st}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>`;

// ============================== DEPOSIT ==============================
Screens.deposit = () => `
<div class="screen-grid" style="grid-template-columns:180px 1fr 1fr;">
  ${WalletSubNav('deposit')}
  <!-- Left: method + amount -->
  <div class="stack-col">
    <div class="glass" style="padding:12px;border-color:rgba(157,225,52,.4);background:linear-gradient(135deg,rgba(157,225,52,.15),rgba(15,15,18,.6));">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:24px;">⚡</span>
        <div style="flex:1;">
          <div style="font-size:10px;color:#9DE134;font-weight:800;">FASTEST DEPOSIT IN BANGLADESH</div>
          <div style="font-family:'Orbitron';font-weight:900;font-size:18px;" class="num-mono">38s avg · 99.4% success</div>
        </div>
      </div>
    </div>
    <div>
      <div class="label" style="margin-bottom:8px;">PAYMENT METHOD</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        ${[['bKash','+3.5%','active'],['Nagad','+3.5%',''],['Rocket','+3.5%','']].map(([n,b,a])=>`<button class="glass" style="padding:10px;text-align:center;cursor:pointer;border:${a?'2px solid #9DE134':'1px solid rgba(255,255,255,.08)'};${a?'background:rgba(157,225,52,.1)':''};font-family:inherit;">
          <div style="font-size:24px;">💳</div>
          <div style="font-size:11px;font-weight:800;margin-top:4px;">${n}</div>
          <div style="font-size:9px;color:${a?'#9DE134':'#FFB627'};font-weight:800;">${b}</div>
        </button>`).join('')}
      </div>
    </div>
    <div>
      <div class="label" style="margin-bottom:8px;">GATEWAY</div>
      <div class="tab-pills">
        <button class="active">Dpay</button>
        <button>SureTech</button>
      </div>
    </div>
    <div class="glass" style="padding:14px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <span style="font-size:9px;color:#71717A;">AMOUNT</span>
        <span style="font-size:10px;color:#9DE134;font-weight:800;">+৳28 bonus</span>
      </div>
      <div style="font-family:'Orbitron';font-weight:900;font-size:28px;margin-top:4px;" class="num-mono">৳ 800</div>
      <input type="range" min="200" max="30000" value="800" style="width:100%;margin-top:6px;accent-color:#9DE134;">
      <div style="display:flex;justify-content:space-between;font-size:9px;color:#71717A;"><span>৳200</span><span>৳30,000</span></div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-top:8px;">
        ${['200','500','800','1k','3k','10k'].map((a,i)=>`<button style="padding:6px;border-radius:6px;font-size:10px;font-weight:800;cursor:pointer;font-family:inherit;border:none;${i===2?'background:#9DE134;color:#0a0a0a':'background:rgba(255,255,255,.04);color:#D4D4D8;border:1px solid rgba(255,255,255,.08)'}">${a}</button>`).join('')}
      </div>
    </div>
    <div class="glass amber" style="padding:10px;display:flex;align-items:center;gap:8px;">
      <span style="font-size:20px;">🎁</span>
      <div style="flex:1;">
        <div style="font-size:10px;font-weight:800;">Pohela Boishakh Bonus</div>
        <div style="font-size:9px;color:#71717A;">+200% up to ৳600</div>
      </div>
      <span style="color:#9DE134;font-size:16px;">✓</span>
    </div>
  </div>
  <!-- Right: summary + QR -->
  <div class="stack-col">
    <div class="glass" style="padding:14px;">
      <div class="label">SUMMARY</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;font-size:12px;">
        <div style="display:flex;justify-content:space-between;"><span style="color:#A1A1AA;">Deposit</span><span class="num-mono">৳ 800.00</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#A1A1AA;">+3.5% method bonus</span><span style="color:#9DE134;" class="num-mono">+ ৳ 28.00</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#A1A1AA;">Promo (Pohela)</span><span style="color:#9DE134;" class="num-mono">+ ৳ 200.00</span></div>
        <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:1px solid rgba(255,255,255,.06);font-weight:800;font-size:14px;"><span>You receive</span><span style="color:#9DE134;font-family:'Orbitron';" class="num-mono">৳ 1,028.00</span></div>
      </div>
    </div>
    <div class="glass" style="padding:14px;">
      <div class="label" style="margin-bottom:10px;">SEND TO</div>
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:90px;height:90px;border-radius:8px;background:#fff;padding:6px;">
          <div style="width:100%;height:100%;background:#000;display:grid;place-items:center;font-family:monospace;color:white;font-size:9px;">QR CODE</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:10px;color:#71717A;">bKash Personal</div>
          <div style="font-family:monospace;font-weight:800;font-size:14px;">+880 1730-456789</div>
          <button class="cta-ghost" style="padding:4px 10px;font-size:10px;margin-top:4px;">Copy</button>
          <div style="font-size:9px;color:#71717A;margin-top:6px;">Reference: <span style="color:#9DE134;font-family:monospace;font-weight:800;">D-4NAM26</span></div>
        </div>
      </div>
    </div>
    <button class="cta-neon full" style="padding:16px;font-size:14px;" onclick="confetti();beep(1100,250);">CONFIRM ৳ 800 →</button>
    <div style="text-align:center;font-size:10px;color:#71717A;">🔒 Funds available in ~38s after transfer</div>
  </div>
</div>`;

// ============================== WITHDRAW ==============================
Screens.withdraw = () => `
<div class="screen-grid" style="grid-template-columns:180px 1fr 1.2fr;">
  ${WalletSubNav('withdraw')}
  <div class="stack-col">
    <div class="glass" style="padding:14px;background:linear-gradient(135deg,rgba(157,225,52,.15),rgba(15,15,18,.6));border-color:#9DE134;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:28px;">⚡</span>
        <div style="flex:1;">
          <div style="font-size:9px;color:#9DE134;font-weight:800;">AVG WITHDRAWAL SPEED</div>
          <div style="font-family:'Orbitron';font-weight:900;font-size:22px;" class="num-mono">3m 12s</div>
          <div style="font-size:9px;color:#71717A;">99.8% paid under 10 min</div>
        </div>
      </div>
    </div>
    <div>
      <div class="label" style="margin-bottom:8px;">WITHDRAW TO</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${[['Nagad','**5478','test ben','active'],['bKash','**0535','test ben',''],['+ Add account','Max 3 allowed','','']].map(([n,sub,name,a])=>`<button class="glass" style="padding:10px;display:flex;align-items:center;gap:10px;cursor:pointer;font-family:inherit;text-align:left;border:${a?'2px solid #9DE134':'1px solid rgba(255,255,255,.08)'};${a?'background:rgba(157,225,52,.1)':''}">
          <div style="width:32px;height:32px;border-radius:6px;background:rgba(255,255,255,.04);display:grid;place-items:center;">${n==='+ Add account'?'+':'💳'}</div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:800;">${n}</div>
            <div style="font-size:10px;color:#71717A;">${sub}${name?' · '+name:''}</div>
          </div>
          ${a?'<span style="color:#9DE134;">✓</span>':''}
        </button>`).join('')}
      </div>
    </div>
  </div>
  <div class="stack-col">
    <div class="glass" style="padding:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:9px;color:#71717A;">AMOUNT</span>
        <button class="cta-ghost" style="padding:3px 10px;font-size:9px;color:#9DE134;">MAX ৳ 4,562</button>
      </div>
      <div style="font-family:'Orbitron';font-weight:900;font-size:28px;margin-top:4px;" class="num-mono">৳ 2,000</div>
      <input type="range" min="500" max="30000" value="2000" style="width:100%;margin-top:6px;accent-color:#9DE134;">
      <div style="font-size:9px;color:#71717A;margin-top:2px;">Min ৳500 · Max ৳30,000/day · Silver II tier</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:8px;">
        ${['500','1k','2k','5k','MAX'].map((a,i)=>`<button style="padding:6px;border-radius:6px;font-size:10px;font-weight:800;cursor:pointer;font-family:inherit;border:none;${i===2?'background:#9DE134;color:#0a0a0a':'background:rgba(255,255,255,.04);color:#D4D4D8;border:1px solid rgba(255,255,255,.08)'}">${a}</button>`).join('')}
      </div>
    </div>
    <div class="glass" style="padding:14px;">
      <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;">
        <div style="display:flex;justify-content:space-between;"><span style="color:#A1A1AA;">Withdraw amount</span><span class="num-mono">৳ 2,000.00</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#A1A1AA;">Fee</span><span style="color:#9DE134;" class="num-mono">Free</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#A1A1AA;">Turnover (3x bet)</span><span style="color:#9DE134;">✓ Met</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#A1A1AA;">Expected arrival</span><span style="color:#9DE134;" class="num-mono">~3 min</span></div>
        <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:1px solid rgba(255,255,255,.06);font-weight:800;font-size:14px;"><span>You receive</span><span class="num-mono">৳ 2,000.00</span></div>
      </div>
    </div>
    <button class="cta-neon full" style="padding:16px;font-size:14px;" onclick="confetti();beep(1100,250);">WITHDRAW → NAGAD ****5478</button>
    <div style="text-align:center;font-size:10px;color:#71717A;">Withdrawals processed 24/7 · usually instant via Nagad</div>
  </div>
</div>`;

// ============================== VIP JOURNEY ==============================
Screens.vip = () => `
<div class="screen-grid" style="grid-template-columns: 1.2fr 1fr;">
  <div class="stack-col">
    <!-- VIP hero -->
    <div class="glass amber" style="padding:18px;background:linear-gradient(135deg,rgba(255,182,39,.2),rgba(15,15,18,.6));">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="font-size:64px;">🥈</div>
        <div style="flex:1;">
          <div style="font-size:9px;color:#FFB627;font-weight:800;letter-spacing:2px;">CURRENT TIER</div>
          <div style="font-family:'Orbitron';font-weight:900;font-size:32px;">SILVER II</div>
          <div style="font-size:10px;color:#71717A;">Joined Apr 14, 2026</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;color:#71717A;">Daily withdraw</div>
          <div style="font-family:'Orbitron';font-weight:900;font-size:20px;color:#FFB627;" class="num-mono">৳ 50K</div>
        </div>
      </div>
      <div style="margin-top:12px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px;"><span style="color:#A1A1AA;">To Gold I</span><span style="color:#FFB627;font-weight:800;" class="num-mono">৳ 8,432 / ৳ 25,000</span></div>
        <div style="height:6px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden;"><div style="height:100%;width:33%;background:linear-gradient(90deg,#FFB627,#FFE787);box-shadow:0 0 12px #FFB627;"></div></div>
      </div>
    </div>
    <!-- Roadmap -->
    <div class="glass" style="padding:14px;flex:1;display:flex;flex-direction:column;min-height:0;">
      <div class="label">YOUR ROADMAP</div>
      <div class="scroll-y hide-scroll" style="flex:1;margin-top:10px;position:relative;">
        <div style="position:absolute;left:18px;top:8px;bottom:8px;width:2px;background:linear-gradient(180deg,#9DE134,rgba(255,255,255,.1));"></div>
        ${[
          ['Bronze','Achieved','Apr 1','✓','done'],
          ['Silver I','Achieved','Apr 10','✓','done'],
          ['Silver II','You are here','Apr 14','★','here'],
          ['Gold I','৳16,568 to go','—','🥇','locked'],
          ['Gold II','—','—','🥇','locked'],
          ['Platinum','—','—','💎','locked'],
          ['Diamond','—','—','💠','locked'],
        ].map(([n,s,d,i,st])=>`<div style="display:flex;align-items:center;gap:12px;padding:8px 0;position:relative;">
          <div style="position:relative;z-index:1;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:14px;${st==='done'?'background:#9DE134;color:#0a0a0a':st==='here'?'background:#050507;border:3px solid #FFB627;color:#FFB627;box-shadow:0 0 20px #FFB627':'background:rgba(255,255,255,.04);color:#71717A'}">${i}</div>
          <div style="flex:1;"><div style="font-weight:${st==='here'?900:700};font-size:13px;${st==='locked'?'color:#71717A':''}">${n}</div><div style="font-size:10px;color:${st==='here'?'#FFB627':'#71717A'};">${s}</div></div>
          <div style="font-size:10px;color:#71717A;">${d}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
  <div class="stack-col">
    <div class="glass" style="padding:14px;">
      <div class="label">YOUR ACTIVE PERKS</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;">
        ${[['Daily withdraw','৳ 50K'],['Rescue bonus','5%'],['Birthday gift','৳ 688'],['Cashback','+1%'],['VIP host','—'],['Priority chat','✓']].map(([l,v])=>`<div style="padding:8px;border-radius:8px;background:rgba(255,255,255,.04);"><div style="font-size:9px;color:#71717A;">${l}</div><div style="font-family:'Orbitron';font-weight:900;color:#FFB627;font-size:14px;" class="num-mono">${v}</div></div>`).join('')}
      </div>
    </div>
    <div class="glass" style="padding:0;flex:1;overflow:hidden;display:flex;flex-direction:column;">
      <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);"><div class="label">TIER COMPARISON</div></div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);padding:8px 14px;background:rgba(255,255,255,.03);font-size:9px;font-weight:800;color:#71717A;letter-spacing:1px;text-transform:uppercase;">
        <div>Perk</div><div style="text-align:center;">Silver</div><div style="text-align:center;color:#FFB627;">You</div><div style="text-align:center;">Gold</div><div style="text-align:center;">Plat</div>
      </div>
      <div class="scroll-y hide-scroll" style="flex:1;">
        ${[
          ['Daily withdraw','৳25K','৳50K','৳1L','৳2L'],
          ['Rescue %','3%','5%','6%','8%'],
          ['Cashback','—','+1%','+2%','+3%'],
          ['Birthday','৳288','৳688','৳1,288','৳2,888'],
          ['VIP host','—','—','✓','✓'],
        ].map(([p,s,m,g,pl])=>`<div style="display:grid;grid-template-columns:repeat(5,1fr);padding:8px 14px;border-top:1px solid rgba(255,255,255,.03);font-size:11px;align-items:center;">
          <div style="color:#A1A1AA;">${p}</div>
          <div style="text-align:center;color:#71717A;" class="num-mono">${s}</div>
          <div style="text-align:center;color:#FFB627;font-weight:800;" class="num-mono">${m}</div>
          <div style="text-align:center;color:#71717A;" class="num-mono">${g}</div>
          <div style="text-align:center;color:#71717A;" class="num-mono">${pl}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>`;

// ============================== MISSIONS ==============================
Screens.missions = () => `
<div class="screen-grid" style="grid-template-columns: 1fr 1.2fr;">
  <div class="stack-col">
    <!-- Progress ring -->
    <div class="glass" style="padding:18px;display:flex;align-items:center;gap:16px;">
      <div style="position:relative;width:90px;height:90px;">
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r="38" stroke="rgba(255,255,255,.06)" stroke-width="7" fill="none"/>
          <circle cx="45" cy="45" r="38" stroke="#9DE134" stroke-width="7" fill="none" stroke-dasharray="239" stroke-dashoffset="80" stroke-linecap="round" transform="rotate(-90 45 45)" style="filter:drop-shadow(0 0 8px #9DE134);"/>
        </svg>
        <div style="position:absolute;inset:0;display:grid;place-items:center;"><span style="font-family:'Orbitron';font-weight:900;font-size:24px;">2<span style="color:#71717A;font-size:14px;">/3</span></span></div>
      </div>
      <div style="flex:1;">
        <div style="font-family:'Orbitron';font-weight:800;font-size:15px;">Today's progress</div>
        <div style="font-size:11px;color:#71717A;margin-top:2px;">1 more to claim ৳ 50 bonus</div>
        <div style="font-size:10px;color:#9DE134;font-weight:800;margin-top:4px;">⏱ Resets in 14h 22m</div>
      </div>
    </div>
    <div class="glass" style="padding:14px;flex:1;display:flex;flex-direction:column;min-height:0;">
      <div class="label">TODAY'S MISSIONS</div>
      <div class="scroll-y hide-scroll" style="flex:1;margin-top:10px;display:flex;flex-direction:column;gap:6px;">
        ${[
          ['Place 3 bets in any slot','3/3','৳ 20','done','🎰'],
          ['Deposit ৳ 500 or more','৳500/৳500','৳ 30','done','💳'],
          ['Win a Baccarat hand','0/1','৳ 100','active','🃏'],
          ['Play 5 Aviator rounds','3/5','৳ 50','active','✈️'],
          ['Refer 1 friend today','0/1','৳ 200','locked','👥'],
        ].map(([t,p,r,s,e])=>`<div style="padding:10px;border-radius:10px;display:flex;align-items:center;gap:10px;${s==='active'?'background:rgba(157,225,52,.08);border:1px solid rgba(157,225,52,.3)':s==='done'?'background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);opacity:.6':'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)'}">
          <div style="width:32px;height:32px;border-radius:8px;background:${s==='done'?'rgba(157,225,52,.15)':'rgba(255,255,255,.04)'};display:grid;place-items:center;font-size:16px;">${s==='done'?'✓':e}</div>
          <div style="flex:1;">
            <div style="font-size:11px;font-weight:800;${s==='done'?'text-decoration:line-through;color:#71717A':''}">${t}</div>
            <div style="font-size:9px;color:#71717A;">Progress · <span class="num-mono">${p}</span></div>
          </div>
          <div style="text-align:right;"><div style="font-size:8px;color:#71717A;">Reward</div><div style="font-family:'Orbitron';font-weight:900;color:#9DE134;font-size:13px;" class="num-mono">${r}</div></div>
        </div>`).join('')}
      </div>
    </div>
  </div>
  <div class="stack-col">
    <div class="glass" style="padding:14px;">
      <div class="label">REWARD BOXES · 15 LEVELS</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px;">
        ${[
          ['💎','L1','done'],['🎁','L2','done'],['🎁','L3','ready'],['📦','L4','locked'],['📦','L5','locked'],
          ['🔒','L6','locked'],['🔒','L7','locked'],['🔒','L8','locked'],['🔒','L9','locked'],['🔒','L10','locked'],
          ['🔒','L11','locked'],['🔒','L12','locked'],['🔒','L13','locked'],['📱','L14','locked'],['🏆','L15','locked'],
        ].map(([e,l,s])=>`<button style="aspect-ratio:1;border-radius:10px;display:grid;place-items:center;cursor:pointer;font-family:inherit;border:none;position:relative;${s==='ready'?'background:rgba(157,225,52,.15);border:1px solid rgba(157,225,52,.3);box-shadow:0 0 16px rgba(157,225,52,.3);animation:glow-breathe 1.4s infinite':s==='done'?'background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);opacity:.5':'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)'}">
          <div style="font-size:24px;">${e}</div>
          <div style="position:absolute;bottom:4px;font-size:8px;font-weight:800;${s==='ready'?'color:#9DE134':'color:#71717A'}">${l}</div>
        </button>`).join('')}
      </div>
    </div>
    <div class="glass amber" style="padding:14px;background:linear-gradient(135deg,rgba(255,182,39,.15),rgba(15,15,18,.4));border-color:rgba(255,182,39,.4);">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:48px;">📱</div>
        <div style="flex:1;">
          <div style="font-size:10px;color:#FFB627;font-weight:800;">LEVEL 14 PRIZE</div>
          <div style="font-family:'Orbitron';font-weight:900;font-size:16px;">Samsung Galaxy S25 Ultra</div>
          <div style="font-size:10px;color:#71717A;">Wager ৳5,00,000 to unlock</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;color:#71717A;">Progress</div>
          <div style="font-family:'Orbitron';font-weight:900;color:#FFB627;font-size:16px;" class="num-mono">28%</div>
        </div>
      </div>
    </div>
  </div>
</div>`;

// ============================== LEADERBOARD / TOURNAMENT ==============================
Screens.leaderboard = () => `
<div class="screen-grid" style="grid-template-columns: 1.1fr 1fr;">
  <div class="stack-col">
    <div class="glass amber" style="padding:14px;background:linear-gradient(135deg,rgba(255,182,39,.18),rgba(15,15,18,.4));">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:36px;">🏆</span>
        <div style="flex:1;">
          <span class="pill amber">FINAL WEEK</span>
          <div style="font-family:'Orbitron';font-weight:900;font-size:18px;margin-top:6px;">RajaBaji Champions Cup</div>
          <div style="font-size:10px;color:#A1A1AA;">IPL 2026 · prize pool ৳ 50,00,000</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px;">
        ${[['02','DAYS'],['11','HRS'],['24','MIN'],['18','SEC']].map(([n,l])=>`<div style="padding:8px;border-radius:8px;background:rgba(0,0,0,.5);text-align:center;"><div style="font-family:'Orbitron';font-weight:900;font-size:18px;color:#FFB627;" class="num-mono">${n}</div><div style="font-size:8px;color:#71717A;letter-spacing:1px;">${l}</div></div>`).join('')}
      </div>
    </div>
    <!-- Podium -->
    <div class="glass" style="padding:14px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;align-items:end;">
        ${[['#2','S****ad','৳ 245K','silver',60],['#1','M****61','৳ 384K','gold',75],['#3','R****na','৳ 198K','bronze',45]].map(([r,u,p,m,h])=>`<div style="text-align:center;${m==='gold'?'order:2':m==='silver'?'order:1':'order:3'}">
          <div style="width:48px;height:48px;border-radius:50%;margin:0 auto;background:linear-gradient(135deg,#9DE134,rgba(157,225,52,.4));display:grid;place-items:center;font-family:'Space Grotesk';font-weight:900;color:#0a0a0a;font-size:18px;">${u[0]}</div>
          <div style="font-size:10px;font-weight:800;margin-top:4px;">${u}</div>
          <div style="font-size:9px;color:#71717A;">${p}</div>
          <div style="margin-top:8px;border-radius:8px 8px 0 0;background:${m==='gold'?'linear-gradient(180deg,#FFE787,#FFB627)':m==='silver'?'linear-gradient(180deg,#E5E5E5,#9CA3AF)':'linear-gradient(180deg,#D97706,#92400E)'};height:${h}px;display:grid;place-items:center;color:#0a0a0a;font-family:'Orbitron';font-weight:900;font-size:20px;">${r}</div>
        </div>`).join('')}
      </div>
    </div>
    <div class="stack-col" style="gap:6px;">
      ${[
        [4,'F****ul','৳ 156,200','#'],
        [5,'A****hi','৳ 142,800','#'],
        [142,'You · RD Jay','৳ 8,432','me'],
        [143,'K****bd','৳ 8,210','#'],
      ].map(([r,u,p,m])=>`<div style="padding:8px 10px;border-radius:10px;display:flex;align-items:center;gap:10px;${m==='me'?'background:rgba(157,225,52,.1);border:1px solid rgba(157,225,52,.4)':'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)'}">
        <div style="font-family:'Orbitron';font-weight:900;font-size:13px;width:30px;${m==='me'?'color:#9DE134':'color:#71717A'}" class="num-mono">${r}</div>
        <div style="width:28px;height:28px;border-radius:50%;${m==='me'?'background:#9DE134;color:#0a0a0a':'background:rgba(255,255,255,.06);color:#A1A1AA'};display:grid;place-items:center;font-size:11px;font-weight:900;">${u[0]}</div>
        <div style="flex:1;font-size:11px;font-weight:700;${m==='me'?'color:#9DE134':''}">${u}</div>
        <div style="font-family:'Orbitron';font-weight:900;font-size:13px;" class="num-mono">${p}</div>
      </div>`).join('')}
    </div>
  </div>
  <div class="stack-col">
    <div class="glass" style="padding:0;overflow:hidden;">
      <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);"><div class="label">PRIZE DISTRIBUTION</div></div>
      ${[['#1','৳ 10,00,000'],['#2-3','৳ 5,00,000'],['#4-10','৳ 1,00,000'],['#11-50','৳ 25,000'],['#51-200','৳ 5,000'],['#201-500','৳ 1,000']].map(([r,p])=>`<div style="display:grid;grid-template-columns:1fr 1fr;padding:10px 14px;border-top:1px solid rgba(255,255,255,.03);font-size:12px;align-items:center;">
        <div style="color:#A1A1AA;">${r}</div>
        <div style="color:#FFB627;font-family:'Orbitron';font-weight:900;text-align:right;" class="num-mono">${p}</div>
      </div>`).join('')}
    </div>
    <div class="glass" style="padding:14px;">
      <div class="label">HOW TO CLIMB</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">
        ${[['🎰','Slots','1 pt per ৳100 staked'],['🎲','Live Casino','2 pts per ৳100'],['🏏','Cricket','3 pts per ৳100'],['🎯','Daily missions','+50 bonus each']].map(([e,t,sub])=>`<div style="padding:8px;border-radius:8px;background:rgba(255,255,255,.04);display:flex;align-items:center;gap:10px;">
          <div style="font-size:18px;">${e}</div>
          <div style="flex:1;"><div style="font-size:11px;font-weight:800;">${t}</div><div style="font-size:9px;color:#71717A;">${sub}</div></div>
        </div>`).join('')}
      </div>
    </div>
    <button class="cta-neon full" style="padding:14px;">BOOST YOUR RANK · PLAY NOW</button>
  </div>
</div>`;

// ============================== CALENDAR (Daily rewards) ==============================
Screens.calendar = () => `
<div class="stack-col" style="height:100%;">
  <div style="display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div class="screen-title" style="font-size:20px;">DAILY REWARDS</div>
      <div style="font-size:10px;color:#71717A;">Don't break the chain 🔥</div>
    </div>
    <span class="pill amber">🔥 STREAK · 6 DAYS</span>
  </div>
  <!-- 7-day -->
  <div class="glass" style="padding:14px;">
    <div style="display:flex;justify-content:space-between;font-size:9px;color:#71717A;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
      <span>This week · Day 7 ready</span>
      <span style="color:#71717A;">Resets in 14h 22m</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;">
      ${[
        [1,'৳50','done','💵'],[2,'৳100','done','💵'],[3,'৳200','done','💰'],[4,'5 spins','done','🎰'],
        [5,'৳500','done','💎'],[6,'৳1,000','done','💎'],[7,'৳5,000','today','🏆'],
      ].map(([d,r,s,e])=>`<button style="border-radius:12px;padding:10px;text-align:center;cursor:pointer;font-family:inherit;border:none;position:relative;${s==='today'?'background:rgba(157,225,52,.15);border:2px solid #9DE134;box-shadow:0 0 24px rgba(157,225,52,.3);animation:glow-breathe 1.4s infinite':s==='done'?'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);opacity:.6':'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)'}" ${s==='today'?'onclick="confetti();bumpBalance(\'cash\', 5000);beep(900,250);"':''}>
        <div style="font-size:9px;font-weight:800;${s==='today'?'color:#9DE134':'color:#71717A'}">DAY ${d}</div>
        <div style="font-size:28px;margin:6px 0;${s==='today'?'animation:char-idle 2s ease-in-out infinite':''}">${e}</div>
        <div style="font-size:10px;font-weight:900;${s==='today'?'color:#FFB627':'color:#A1A1AA'}" class="num-mono">${r}</div>
        ${s==='done'?'<div style="position:absolute;top:4px;right:6px;font-size:10px;color:#9DE134;">✓</div>':''}
      </button>`).join('')}
    </div>
  </div>
  <!-- 30-day strip + weekly box -->
  <div class="glass" style="padding:12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div style="font-size:11px;font-weight:800;">📅 30-DAY MEGA BONUS <span style="color:#71717A;font-weight:400;">· Day 6/30</span></div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:120px;height:4px;border-radius:2px;background:rgba(255,255,255,.06);overflow:hidden;"><div style="height:100%;width:20%;background:#9DE134;box-shadow:0 0 8px #9DE134;"></div></div>
        <span style="font-size:11px;color:#FFB627;font-family:'Orbitron';font-weight:900;" class="num-mono">৳50,000</span>
      </div>
    </div>
    <div class="scroll-y hide-scroll" style="overflow-x:auto;padding-bottom:4px;">
      <div style="display:flex;gap:4px;min-width:max-content;">
        ${[...Array(30)].map((_,i)=>{
          const status = i<6?'done':i===6?'today':'locked';
          const rewards = ['৳50','৳100','৳200','5 spins','৳500','৳1K','৳5K','৳100','৳150','৳200','৳300','৳400','৳500','৳1K','৳2K','15 spins','৳500','৳800','৳1K','৳1.5K','৳2K','৳3K','৳5K','25 spins','৳3K','৳5K','৳7K','৳10K','৳15K','৳50K'];
          const emoji = i===29?'🏆':i%7===6?'💎':i%5===4?'🎰':i<7?'💵':'💰';
          return `<div style="flex-shrink:0;width:54px;border-radius:8px;padding:5px;text-align:center;position:relative;${status==='today'?'background:rgba(157,225,52,.15);border:1px solid #9DE134;box-shadow:0 0 12px rgba(157,225,52,.3)':status==='done'?'background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);opacity:.5':'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)'}">
            <div style="font-size:8px;font-weight:800;${status==='today'?'color:#9DE134':'color:#71717A'}">D${i+1}</div>
            <div style="font-size:16px;margin:3px 0;">${emoji}</div>
            <div style="font-size:8px;font-weight:900;${status==='today'?'color:#FFB627':status==='done'?'color:#71717A':'color:#A1A1AA'}">${rewards[i]}</div>
            ${i===29?'<div style="position:absolute;top:-6px;right:-4px;padding:1px 5px;border-radius:4px;background:#FFB627;color:#0a0a0a;font-size:7px;font-weight:900;">JACKPOT</div>':''}
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>
  <!-- Weekly box strip -->
  <div class="glass cyan" style="padding:12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div style="font-size:11px;font-weight:800;">🎁 WEEKLY MYSTERY BOXES <span style="color:#71717A;font-weight:400;">· every Monday</span></div>
      <span style="font-size:11px;color:#22D3EE;font-weight:800;">Up to ৳20,000</span>
    </div>
    <div class="scroll-y hide-scroll" style="overflow-x:auto;padding-bottom:4px;">
      <div style="display:flex;gap:8px;min-width:max-content;">
        ${[
          ['Wk 11','opened','৳3,400','📦','done'],['Wk 12','opened','৳1,200','📦','done'],
          ['Wk 13','opened','৳8,900','📦','done'],['Wk 14','opened','৳5,600','📦','done'],
          ['Wk 15','ready','TAP TO OPEN','🎁','ready'],
          ['Wk 16','locked','in 3d 4h','🔒','locked'],['Wk 17','locked','in 10d','🔒','locked'],
          ['Wk 18','locked','in 17d','🔒','locked'],['Wk 19','locked','in 24d','🔒','locked'],
          ['Wk 20','locked','+ ৳50K','🎰','locked'],
        ].map(([w,_,val,e,st])=>`<div style="flex-shrink:0;width:100px;border-radius:10px;padding:8px;text-align:center;${st==='ready'?'background:rgba(34,211,238,.15);border:1px solid #22D3EE;box-shadow:0 0 16px rgba(34,211,238,.3);animation:glow-breathe 1.6s infinite':st==='done'?'background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);opacity:.6':'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)'}">
          <div style="font-size:10px;font-weight:800;${st==='ready'?'color:#22D3EE':'color:#71717A'}">${w}</div>
          <div style="font-size:24px;margin:6px 0;${st==='ready'?'animation:char-idle 2s ease-in-out infinite':''}">${e}</div>
          <div style="font-size:9px;font-weight:800;${st==='ready'?'color:#67E8F9':st==='done'?'color:#9DE134':'color:#71717A'}" class="num-mono">${val}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
  <!-- Hourly + past months row -->
  <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:12px;">
    <div class="glass" style="padding:12px;border-color:rgba(157,225,52,.4);background:linear-gradient(135deg,rgba(157,225,52,.1),rgba(15,15,18,.4));">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:32px;animation:coin-bob 1.8s ease-in-out infinite;">💰</div>
        <div style="flex:1;">
          <div style="font-size:10px;color:#9DE134;font-weight:800;">FREE COINS · EVERY 4H</div>
          <div style="font-size:10px;color:#71717A;">Tap lobby chest · 10,000 coins</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;color:#71717A;">Next</div>
          <div style="font-family:'Orbitron';font-weight:900;color:#9DE134;font-size:16px;" class="num-mono">02:14:36</div>
        </div>
        <button class="cta-neon" style="padding:10px 14px;">CLAIM</button>
      </div>
    </div>
    <div class="glass" style="padding:10px;">
      <div style="font-size:9px;color:#71717A;font-weight:800;letter-spacing:1px;margin-bottom:6px;">PREVIOUS MONTHS</div>
      <div style="overflow-x:auto;" class="hide-scroll">
        <div style="display:flex;gap:6px;min-width:max-content;">
          ${['March','February','January','December','November','October'].map((m,i)=>`<div style="flex-shrink:0;width:64px;padding:6px;border-radius:6px;background:rgba(255,255,255,.04);text-align:center;">
            <div style="font-size:9px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m}</div>
            <div style="font-size:9px;color:#71717A;">${[28,21,15,30,22,18][i]}d</div>
            <div style="font-size:10px;font-family:'Orbitron';font-weight:900;color:#FFB627;" class="num-mono">৳${[42,18,9,50,28,14][i]}K</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>
</div>`;

// ============================== PROMOTIONS ==============================
Screens.promo = () => `
<div class="screen-grid cols-side">
  <div class="glass" style="padding:12px;">
    <div class="label">CATEGORY</div>
    <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px;">
      ${[['All 14','active'],['🔥 Trending',''],['✨ New',''],['🏏 Cricket',''],['⚽ Sports',''],['🎰 Slots',''],['🎲 Live',''],['🎯 Special',''],['🎁 VIP','']].map(([n,a])=>`<button style="text-align:left;padding:8px 10px;border-radius:8px;cursor:pointer;font-family:inherit;border:none;font-size:11px;${a?'background:#9DE134;color:#0a0a0a;font-weight:800':'background:transparent;color:#D4D4D8'}">${n}</button>`).join('')}
    </div>
  </div>
  <div class="scroll-y hide-scroll">
    <!-- Hero flash promo -->
    <div class="glass" style="padding:0;overflow:hidden;border:2px solid rgba(157,225,52,.4);background:linear-gradient(135deg,rgba(157,225,52,.2),rgba(15,15,18,.6));margin-bottom:12px;display:grid;grid-template-columns:1.2fr 1fr;">
      <div style="padding:18px;">
        <span class="pill brand">FLASH · 6H LEFT</span>
        <div style="font-family:'Orbitron';font-weight:900;font-size:24px;margin-top:8px;line-height:1.1;">POHELA BOISHAKH<br><span style="background:linear-gradient(180deg,#FFE787,#FFB627);-webkit-background-clip:text;background-clip:text;color:transparent;">৳ 600 BONUS</span></div>
        <div style="font-size:11px;color:#A1A1AA;margin-top:6px;">Triple your deposit + claim Boishakh rewards</div>
        <button class="cta-neon" style="margin-top:10px;">CLAIM NOW →</button>
      </div>
      <div style="display:grid;place-items:center;font-size:120px;animation:char-idle 4s ease-in-out infinite;">🎁</div>
    </div>
    <!-- Promo grid -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
      ${[
        ['Top Agents','Affiliate · monthly','৳ 1,00,000','👥'],
        ['Weekly Cashback','Up to 8%','Every Monday','♻️'],
        ['New Member','3x deposit','First deposit','🎁'],
        ['Cricket Special','+3% extra','IPL is live','🏏'],
        ['Slot Tournament','Top 100 paid','৳50K pool','🎰'],
        ['Lucky Friday','Free spins','Every Friday','🎲'],
        ['VIP Birthday','৳688 - ৳2,888','Your day','🎂'],
        ['Refer Triple','৳500 + 0.70%','Per friend','👯'],
      ].map(([t,sub,prize,e])=>`<button class="glass hover" style="padding:0;overflow:hidden;cursor:pointer;font-family:inherit;border:1px solid rgba(255,255,255,.08);text-align:left;display:grid;grid-template-columns:60px 1fr;">
        <div style="display:grid;place-items:center;font-size:32px;background:linear-gradient(135deg,rgba(157,225,52,.15),rgba(0,0,0,.4));">${e}</div>
        <div style="padding:10px;">
          <div style="font-size:9px;color:#9DE134;font-weight:800;letter-spacing:1px;">PROMOTION</div>
          <div style="font-size:11px;font-weight:800;margin-top:2px;">${t}</div>
          <div style="font-size:9px;color:#71717A;">${sub}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
            <div style="font-size:11px;font-family:'Orbitron';font-weight:900;color:#FFB627;" class="num-mono">${prize}</div>
            <span class="pill brand" style="padding:3px 9px;font-size:9px;">Get</span>
          </div>
        </div>
      </button>`).join('')}
    </div>
  </div>
</div>`;

// ============================== REFER & EARN ==============================
Screens.refer = () => `
<div class="screen-grid" style="grid-template-columns:1fr 1fr 1fr;">
  <!-- Left: stats -->
  <div class="stack-col">
    <div class="glass" style="padding:18px;text-align:center;background:linear-gradient(135deg,rgba(157,225,52,.25),rgba(15,15,18,.4));border-color:rgba(157,225,52,.4);">
      <div style="font-size:42px;">🎉</div>
      <div style="font-family:'Orbitron';font-weight:900;font-size:20px;margin-top:6px;">Earn <span style="color:#9DE134;">৳ 500</span> per friend</div>
      <div style="font-size:10px;color:#A1A1AA;margin-top:4px;">+ 0.70% lifetime commission</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
      ${[['23','Recruited'],['৳ 856','This week'],['৳ 1.2K','Lifetime']].map(([v,l])=>`<div class="glass" style="padding:10px;text-align:center;"><div style="font-family:'Orbitron';font-weight:900;font-size:16px;color:#9DE134;" class="num-mono">${v}</div><div style="font-size:9px;color:#71717A;">${l}</div></div>`).join('')}
    </div>
    <div class="glass" style="padding:14px;">
      <div style="font-size:10px;color:#71717A;">Weekly commission</div>
      <div style="font-family:'Orbitron';font-weight:900;font-size:22px;color:#9DE134;margin-top:4px;" class="num-mono">৳ 124.50</div>
      <div style="display:flex;align-items:end;gap:4px;height:48px;margin-top:8px;">
        ${[40,60,30,80,50,90,70].map((h,i)=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="width:100%;border-radius:3px 3px 0 0;height:${h}%;background:${i===6?'#9DE134':'rgba(157,225,52,.3)'};box-shadow:${i===6?'0 0 8px #9DE134':'none'};"></div><div style="font-size:8px;color:#71717A;">${['M','T','W','T','F','S','S'][i]}</div></div>`).join('')}
      </div>
    </div>
  </div>
  <!-- Middle: link + share -->
  <div class="stack-col">
    <div class="glass" style="padding:14px;">
      <div class="label" style="margin-bottom:8px;">YOUR REFERRAL LINK</div>
      <div style="display:flex;gap:6px;">
        <div style="flex:1;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,.04);font-family:monospace;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">rajabaji.net/r/4NAM26</div>
        <button class="cta-neon" style="padding:8px 14px;">Copy</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
        <div style="font-size:10px;color:#71717A;">My ID · <span style="color:#fff;">C4URB299</span></div>
        <div style="font-size:10px;color:#71717A;">Code · <span style="color:#fff;font-family:monospace;">4NAM26</span></div>
      </div>
    </div>
    <div class="glass" style="padding:14px;">
      <div class="label" style="margin-bottom:8px;">SHARE VIA</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
        ${[['💬','WhatsApp'],['✈️','Telegram'],['📷','Story'],['⬇','QR']].map(([e,l])=>`<button class="glass hover" style="padding:10px;text-align:center;cursor:pointer;font-family:inherit;border:1px solid rgba(255,255,255,.08);">
          <div style="font-size:20px;">${e}</div>
          <div style="font-size:9px;color:#A1A1AA;margin-top:2px;">${l}</div>
        </button>`).join('')}
      </div>
    </div>
    <div class="glass" style="padding:14px;flex:1;display:flex;flex-direction:column;">
      <div class="label" style="margin-bottom:8px;">QR CODE</div>
      <div style="flex:1;background:white;border-radius:10px;padding:10px;display:grid;place-items:center;">
        <div style="width:100%;aspect-ratio:1;background:#000;display:grid;place-items:center;color:white;font-family:monospace;font-size:14px;">QR CODE</div>
      </div>
      <button class="cta-ghost" style="margin-top:8px;width:100%;padding:8px;font-size:11px;">Save QR image</button>
    </div>
  </div>
  <!-- Right: preview + recent -->
  <div class="stack-col">
    <div>
      <div class="label" style="margin-bottom:8px;">WHAT THEY'LL SEE</div>
      <div class="glass" style="padding:0;overflow:hidden;">
        <div style="aspect-ratio:16/9;background:linear-gradient(135deg,rgba(157,225,52,.3),rgba(15,15,18,.4));display:grid;place-items:center;text-align:center;">
          <div>
            <div style="font-size:32px;">🎁</div>
            <div style="font-family:'Orbitron';font-weight:900;font-size:14px;margin-top:6px;">RD Jay invited you</div>
            <div style="font-size:10px;margin-top:2px;">Claim ৳500 + triple bonus</div>
          </div>
        </div>
      </div>
    </div>
    <div>
      <div class="label" style="margin-bottom:8px;">RECENT REFERRALS</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${[
          ['S****ad','Joined yesterday','+ ৳12.40','#9DE134'],
          ['F****ul','Joined Apr 12','+ ৳8.20','#9DE134'],
          ['K****bd','Pending deposit','—','#71717A'],
          ['M****ri','Joined Apr 10','+ ৳4.10','#9DE134'],
        ].map(([u,s,e,c])=>`<div class="glass" style="padding:8px 10px;display:flex;align-items:center;gap:10px;">
          <div style="width:24px;height:24px;border-radius:50%;background:rgba(157,225,52,.2);display:grid;place-items:center;font-size:10px;font-weight:800;color:#9DE134;">${u[0]}</div>
          <div style="flex:1;"><div style="font-size:11px;font-weight:800;">${u}</div><div style="font-size:9px;color:#71717A;">${s}</div></div>
          <div style="font-size:11px;font-weight:800;color:${c};" class="num-mono">${e}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>`;

// ============================== PROFILE ==============================
Screens.profile = () => `
<div class="screen-grid" style="grid-template-columns:1fr 1.3fr;">
  <div class="stack-col">
    <div class="glass" style="padding:18px;display:flex;align-items:center;gap:16px;">
      <div style="position:relative;">
        <div style="width:64px;height:64px;border-radius:14px;background:linear-gradient(135deg,#9DE134,rgba(157,225,52,.4));display:grid;place-items:center;font-family:'Space Grotesk';font-weight:900;color:#0a0a0a;font-size:22px;box-shadow:0 0 24px rgba(157,225,52,.4);">RD</div>
        <button style="position:absolute;bottom:-4px;right:-4px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.8);border:2px solid #050507;font-size:11px;cursor:pointer;">✏</button>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Orbitron';font-weight:900;font-size:18px;">RD JAY</div>
        <div style="font-size:10px;color:#71717A;">ID · C4URB299</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
          <span class="pill amber" style="padding:3px 9px;font-size:9px;">SILVER II</span>
          <span style="font-size:9px;color:#71717A;">since Apr 2026</span>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
      ${[['৳ 142K','Wagered'],['158','Games'],['72%','Win rate']].map(([v,l])=>`<div class="glass" style="padding:10px;text-align:center;"><div style="font-family:'Orbitron';font-weight:900;font-size:14px;color:#9DE134;" class="num-mono">${v}</div><div style="font-size:9px;color:#71717A;">${l}</div></div>`).join('')}
    </div>
    <div class="glass" style="padding:0;">
      <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);"><div class="label">BASIC INFO</div></div>
      ${[['Account','C4URB299'],['Username','Yourname61'],['Phone','+880 1758 496874 ✓'],['Email','— add'],['Birthday','— add'],['Gender','—']].map(([k,v])=>`<div style="padding:10px 14px;display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.03);font-size:12px;"><span style="color:#71717A;">${k}</span><span>${v}</span></div>`).join('')}
    </div>
  </div>
  <div class="stack-col">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div>
        <div class="label" style="margin-bottom:8px;">ACCOUNT</div>
        <div class="glass" style="padding:0;">
          ${[
            ['🎖','VIP Journey','vip','Silver II'],
            ['👥','Refer & Earn','refer','৳ 856'],
            ['💎','Rebate','wallet','৳ 112'],
            ['🎯','Missions','missions','2/3'],
            ['🏆','Tournaments','leaderboard','#142'],
            ['💳','Bank cards','wallet','2 saved'],
            ['📋','Betting history','wallet','158 bets'],
          ].map(([e,t,l,sub])=>`<button onclick="setScreen('${l}')" style="width:100%;padding:10px 12px;display:flex;align-items:center;gap:8px;border-top:1px solid rgba(255,255,255,.03);cursor:pointer;font-family:inherit;border:none;background:transparent;text-align:left;color:white;">
            <div style="width:26px;height:26px;border-radius:6px;background:rgba(157,225,52,.1);display:grid;place-items:center;font-size:13px;">${e}</div>
            <div style="flex:1;font-size:11px;font-weight:600;">${t}</div>
            <div style="font-size:10px;color:#71717A;">${sub}</div>
            <div style="color:#52525B;font-size:10px;">›</div>
          </button>`).join('')}
        </div>
      </div>
      <div>
        <div class="label" style="margin-bottom:8px;">SUPPORT & SETTINGS</div>
        <div class="glass" style="padding:0;">
          ${[
            ['💬','Live chat','support','Avg 24s'],
            ['❓','FAQ','support','—'],
            ['🔔','Notifications','notif','3 new'],
            ['🌐','Language','settings','English'],
            ['🌙','Theme','settings','Dark'],
            ['🔐','Security','settings','2FA on'],
            ['🚪','Logout','login','—'],
          ].map(([e,t,l,sub])=>`<button onclick="setScreen('${l}')" style="width:100%;padding:10px 12px;display:flex;align-items:center;gap:8px;border-top:1px solid rgba(255,255,255,.03);cursor:pointer;font-family:inherit;border:none;background:transparent;text-align:left;color:white;">
            <div style="width:26px;height:26px;border-radius:6px;background:rgba(157,225,52,.1);display:grid;place-items:center;font-size:13px;">${e}</div>
            <div style="flex:1;font-size:11px;font-weight:600;">${t}</div>
            <div style="font-size:10px;color:#71717A;">${sub}</div>
            <div style="color:#52525B;font-size:10px;">›</div>
          </button>`).join('')}
        </div>
      </div>
    </div>
  </div>
</div>`;

// ============================== SETTINGS ==============================
Screens.settings = () => `
<div class="screen-grid" style="grid-template-columns:180px 1fr 1fr;">
  <div class="glass" style="padding:10px;display:flex;flex-direction:column;gap:4px;">
    ${[['🔊','Preferences','active'],['🔐','Security',''],['🛡','Responsible play',''],['📦','About','']].map(([e,n,a])=>`<button style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;cursor:pointer;font-family:inherit;border:none;text-align:left;${a?'background:#9DE134;color:#0a0a0a;font-weight:800':'background:transparent;color:#D4D4D8'};font-size:11px;"><span style="font-size:14px;">${e}</span><span>${n}</span></button>`).join('')}
  </div>
  <div class="stack-col">
    <div class="glass" style="padding:0;">
      <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);"><div class="label">PREFERENCES</div></div>
      ${[['🌐','Language','English (BD)'],['🌙','Theme','Dark'],['🔔','Push','On'],['🔊','Sound effects','On'],['📳','Haptics','On'],['🎵','Background music','On']].map(([e,t,v])=>`<div style="padding:10px 14px;display:flex;align-items:center;gap:10px;border-top:1px solid rgba(255,255,255,.03);">
        <div style="width:26px;height:26px;border-radius:6px;background:rgba(157,225,52,.1);display:grid;place-items:center;font-size:13px;">${e}</div>
        <div style="flex:1;font-size:11px;">${t}</div>
        <div style="font-size:10px;color:#71717A;">${v}</div>
        <div style="width:32px;height:16px;border-radius:8px;background:#9DE134;padding:2px;cursor:pointer;"><div style="width:12px;height:12px;border-radius:50%;background:#0a0a0a;margin-left:auto;"></div></div>
      </div>`).join('')}
    </div>
    <div class="glass" style="padding:0;">
      <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);"><div class="label">SECURITY</div></div>
      ${[['🔐','Change password','Last 2w ago'],['👆','Biometric login','Enabled'],['📱','2-step verify','SMS'],['🛡','Trusted devices','3 active']].map(([e,t,v])=>`<button style="width:100%;padding:10px 14px;display:flex;align-items:center;gap:10px;border-top:1px solid rgba(255,255,255,.03);background:transparent;cursor:pointer;font-family:inherit;color:white;text-align:left;border-left:none;border-right:none;border-bottom:none;">
        <div style="width:26px;height:26px;border-radius:6px;background:rgba(157,225,52,.1);display:grid;place-items:center;font-size:13px;">${e}</div>
        <div style="flex:1;font-size:11px;">${t}</div>
        <div style="font-size:10px;color:#71717A;">${v}</div>
        <div style="color:#52525B;">›</div>
      </button>`).join('')}
    </div>
  </div>
  <div class="stack-col">
    <div class="glass" style="padding:0;">
      <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);"><div class="label">RESPONSIBLE PLAY</div></div>
      ${[['💰','Deposit limit','৳ 30,000/day'],['⏱','Session timer','60 min'],['📊','Reality check','Every 30 min'],['🚫','Self-exclusion','Off'],['🛌','Cool-off period','—']].map(([e,t,v])=>`<button style="width:100%;padding:10px 14px;display:flex;align-items:center;gap:10px;border-top:1px solid rgba(255,255,255,.03);background:transparent;cursor:pointer;font-family:inherit;color:white;text-align:left;border-left:none;border-right:none;border-bottom:none;">
        <div style="width:26px;height:26px;border-radius:6px;background:rgba(157,225,52,.1);display:grid;place-items:center;font-size:13px;">${e}</div>
        <div style="flex:1;font-size:11px;">${t}</div>
        <div style="font-size:10px;color:#71717A;">${v}</div>
        <div style="color:#52525B;">›</div>
      </button>`).join('')}
    </div>
    <div class="glass" style="padding:0;">
      <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);"><div class="label">ABOUT</div></div>
      ${[['📦','App version','2.0.0 (build 142)'],['📄','Terms of service','→'],['🔒','Privacy policy','→'],['📜','Licenses','→']].map(([e,t,v])=>`<button style="width:100%;padding:10px 14px;display:flex;align-items:center;gap:10px;border-top:1px solid rgba(255,255,255,.03);background:transparent;cursor:pointer;font-family:inherit;color:white;text-align:left;border-left:none;border-right:none;border-bottom:none;">
        <div style="width:26px;height:26px;border-radius:6px;background:rgba(157,225,52,.1);display:grid;place-items:center;font-size:13px;">${e}</div>
        <div style="flex:1;font-size:11px;">${t}</div>
        <div style="font-size:10px;color:#71717A;">${v}</div>
      </button>`).join('')}
    </div>
    <button style="width:100%;padding:14px;border-radius:12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#ef4444;font-weight:800;font-family:inherit;cursor:pointer;" onclick="setScreen('login')">LOG OUT</button>
  </div>
</div>`;

// ============================== NOTIFICATIONS ==============================
Screens.notif = () => `
<div class="screen-grid" style="grid-template-columns:180px 1.2fr 1fr;">
  <div class="glass" style="padding:10px;display:flex;flex-direction:column;gap:4px;">
    <div class="label" style="padding:4px 6px;">INBOX</div>
    ${[['📥','All','12','active'],['🏆','Wins','3',''],['🎁','Promos','4',''],['💳','Transactions','5',''],['⚠','System','—','']].map(([e,n,c,a])=>`<button style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;cursor:pointer;font-family:inherit;border:none;text-align:left;${a?'background:#9DE134;color:#0a0a0a;font-weight:800':'background:transparent;color:#D4D4D8'};font-size:11px;">
      <span style="font-size:14px;">${e}</span><span style="flex:1;">${n}</span><span style="font-size:9px;${a?'opacity:.7':'color:#71717A'}" class="num-mono">${c}</span>
    </button>`).join('')}
    <button class="cta-ghost" style="margin-top:8px;font-size:10px;padding:6px;">Mark all as read</button>
  </div>
  <div class="scroll-y hide-scroll" style="display:flex;flex-direction:column;gap:6px;">
    ${[
      ['🏆','You won ৳ 180','Aviator · 2.4x payout','2 min','unread','#9DE134'],
      ['🎁','Daily spin ready','Claim now · up to ৳ 5,000','15 min','unread','#9DE134'],
      ['💳','Deposit confirmed','৳ 2,000 added via bKash · 38s','1h','read',''],
      ['📣','Pohela Boishakh bonus','৳ 600 triple match · 6h left','3h','unread',''],
      ['👥','New referral joined','S****ad signed up · earn 0.7%','Yesterday','read',''],
      ['⚠','bKash maintenance','Tomorrow 02:00 - 04:00 BD','2d','read',''],
      ['🏏','Cricket match starting','IND vs PAK at 8:30 PM','3d','read',''],
    ].map(([e,t,sub,when,s,c])=>`<div class="glass" style="padding:10px;display:flex;align-items:start;gap:10px;${c?'border-color:rgba(157,225,52,.3)':''}${s==='read'?'opacity:.7':''}">
      <div style="width:32px;height:32px;border-radius:8px;background:${c?'rgba(157,225,52,.15)':'rgba(255,255,255,.04)'};display:grid;place-items:center;font-size:16px;">${e}</div>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:6px;"><div style="font-size:11px;font-weight:800;">${t}</div>${s==='unread'?'<span style="width:6px;height:6px;border-radius:50%;background:#9DE134;"></span>':''}</div>
        <div style="font-size:10px;color:#71717A;margin-top:2px;">${sub}</div>
        <div style="font-size:9px;color:#52525B;margin-top:2px;">${when}</div>
      </div>
    </div>`).join('')}
  </div>
  <div class="glass" style="padding:0;display:flex;flex-direction:column;">
    <div style="padding:10px 14px;"><div class="label">SELECTED</div></div>
    <div style="padding:14px;border-top:1px solid rgba(255,255,255,.06);background:rgba(157,225,52,.05);">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:40px;height:40px;border-radius:10px;background:rgba(157,225,52,.15);display:grid;place-items:center;font-size:20px;">🏆</div>
        <div>
          <div style="font-size:10px;color:#71717A;">2 minutes ago · Wins</div>
          <div style="font-size:13px;font-weight:800;">You won ৳ 180 on Aviator</div>
        </div>
      </div>
      <div style="margin-top:10px;padding:10px;border-radius:8px;background:rgba(0,0,0,.4);">
        <div style="font-size:10px;color:#71717A;">Round #28471 · 11:38 AM</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px;text-align:center;">
          <div><div style="font-size:9px;color:#71717A;">Bet</div><div style="font-family:'Orbitron';font-weight:900;font-size:14px;" class="num-mono">৳ 50</div></div>
          <div><div style="font-size:9px;color:#71717A;">Cashed at</div><div style="font-family:'Orbitron';font-weight:900;color:#9DE134;font-size:14px;" class="num-mono">3.6x</div></div>
          <div><div style="font-size:9px;color:#71717A;">Won</div><div style="font-family:'Orbitron';font-weight:900;color:#FFB627;font-size:14px;" class="num-mono">৳ 180</div></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px;">
        <button class="cta-neon">Play again</button>
        <button class="cta-ghost" style="padding:10px;">Share win</button>
      </div>
    </div>
  </div>
</div>`;

// ============================== SUPPORT ==============================
Screens.support = () => `
<div class="screen-grid" style="grid-template-columns:180px 1fr 1.4fr;">
  <div class="glass" style="padding:10px;display:flex;flex-direction:column;gap:4px;">
    ${[['💬','Live Chat','active'],['❓','FAQ',''],['📜','Guidelines',''],['🤝','Affiliate','']].map(([e,n,a])=>`<button style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;cursor:pointer;font-family:inherit;border:none;text-align:left;${a?'background:#9DE134;color:#0a0a0a;font-weight:800':'background:transparent;color:#D4D4D8'};font-size:11px;"><span style="font-size:14px;">${e}</span><span>${n}</span></button>`).join('')}
  </div>
  <div class="stack-col">
    <div class="glass" style="padding:14px;background:linear-gradient(135deg,rgba(157,225,52,.18),rgba(15,15,18,.4));border-color:rgba(157,225,52,.4);">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:44px;height:44px;border-radius:10px;background:#9DE134;color:#0a0a0a;display:grid;place-items:center;font-size:22px;">💬</div>
        <div>
          <div style="font-family:'Orbitron';font-weight:800;font-size:13px;">24/7 LIVE CHAT</div>
          <div style="font-size:10px;color:#71717A;display:flex;align-items:center;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:#9DE134;animation:live-pulse 1.4s infinite;"></span>Avg reply 24s</div>
        </div>
      </div>
      <button class="cta-neon full" style="margin-top:10px;">START CHAT →</button>
    </div>
    <div class="label">OR REACH US ON</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
      ${[
        ['💬 WhatsApp','~3 min','#1f3a2a'],
        ['✈️ Telegram','~1 min','#1f2a3a'],
        ['📞 Phone','24/7','#3a2a1f'],
        ['📧 Email','~2 hr','#2a1f3a'],
        ['📘 Facebook','~10 min','#1f2a3a'],
        ['🌐 Discord','~30 min','#2a1f2a'],
      ].map(([t,sub,bg])=>`<button class="glass hover" style="padding:10px;text-align:left;cursor:pointer;font-family:inherit;border:1px solid rgba(255,255,255,.08);">
        <div style="font-size:12px;font-weight:800;">${t}</div>
        <div style="font-size:9px;color:#71717A;margin-top:2px;">${sub}</div>
      </button>`).join('')}
    </div>
  </div>
  <div class="stack-col">
    <div class="glass" style="padding:14px;flex:1;display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;gap:10px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.06);">
        <div style="width:32px;height:32px;border-radius:50%;background:rgba(157,225,52,.15);display:grid;place-items:center;font-size:14px;">👤</div>
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:800;">Sarah from RajaBaji</div>
          <div style="font-size:9px;color:#9DE134;display:flex;align-items:center;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:#9DE134;animation:live-pulse 1.4s infinite;"></span>online</div>
        </div>
        <button class="cta-ghost" style="padding:4px 8px;">×</button>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px;margin-top:10px;">
        <div style="display:flex;gap:8px;"><div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.06);flex-shrink:0;"></div><div style="padding:8px 12px;border-radius:12px;background:rgba(255,255,255,.06);font-size:11px;max-width:80%;">Hi RD! How can I help you today?</div></div>
        <div style="display:flex;justify-content:end;"><div style="padding:8px 12px;border-radius:12px;background:#9DE134;color:#0a0a0a;font-size:11px;max-width:80%;font-weight:700;">Hi, I want to know about VIP upgrade requirements</div></div>
        <div style="display:flex;gap:8px;"><div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.06);flex-shrink:0;"></div><div style="padding:8px 12px;border-radius:12px;background:rgba(255,255,255,.06);font-size:11px;max-width:80%;">Sure! You're Silver II. ৳16,568 more turnover unlocks Gold I 🎖</div></div>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;">
        <input style="flex:1;padding:10px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:white;font-size:11px;outline:none;font-family:inherit;" placeholder="Type your message...">
        <button class="cta-neon" style="padding:10px 16px;">Send</button>
      </div>
    </div>
    <div class="label">POPULAR QUESTIONS</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
      ${["How do I withdraw to bKash?","My deposit hasn't arrived","How to claim VIP rewards?","Bonus turnover requirements","KYC verification time?","How to refer a friend?"].map(q=>`<button class="glass hover" style="padding:8px 10px;cursor:pointer;font-family:inherit;border:1px solid rgba(255,255,255,.08);text-align:left;font-size:10px;display:flex;align-items:center;justify-content:space-between;">
        <span>${q}</span><span style="color:#52525B;">›</span>
      </button>`).join('')}
    </div>
  </div>
</div>`;

// ============================== SPLASH ==============================
Screens.splash = () => `
<div style="position:absolute;inset:0;display:grid;place-items:center;">
  <div style="display:flex;align-items:center;gap:24px;">
    <div style="width:120px;height:120px;border-radius:30px;background:#9DE134;display:grid;place-items:center;font-family:'Orbitron';font-weight:900;color:#0a0a0a;font-size:64px;box-shadow:0 0 60px rgba(157,225,52,.6);animation:char-idle 4s ease-in-out infinite;">R</div>
    <div>
      <div style="font-family:'Orbitron';font-weight:900;font-size:48px;letter-spacing:4px;background:linear-gradient(180deg,#fff,#9DE134);-webkit-background-clip:text;background-clip:text;color:transparent;">RAJABAJI</div>
      <div style="font-size:11px;color:#9DE134;letter-spacing:6px;font-weight:800;margin-top:4px;">BANGLADESH'S #1 GAMING</div>
      <div style="margin-top:20px;width:280px;height:3px;border-radius:2px;background:rgba(255,255,255,.06);overflow:hidden;"><div style="height:100%;width:62%;background:linear-gradient(90deg,#9DE134,#FFE787);box-shadow:0 0 12px #9DE134;"></div></div>
      <div style="margin-top:8px;font-size:11px;color:#71717A;">Loading your lobby...</div>
    </div>
  </div>
</div>`;

// ============================== LOGIN ==============================
Screens.login = () => `
<div class="screen-grid" style="grid-template-columns:1.1fr 1fr;">
  <div class="glass" style="padding:32px;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(135deg,rgba(157,225,52,.18),rgba(15,15,18,.4));">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:40px;height:40px;border-radius:12px;background:#9DE134;color:#0a0a0a;display:grid;place-items:center;font-family:'Orbitron';font-weight:900;font-size:18px;">R</div>
      <div style="font-family:'Orbitron';font-weight:900;font-size:18px;">RAJABAJI</div>
    </div>
    <div>
      <div style="font-family:'Orbitron';font-weight:900;font-size:42px;line-height:1;background:linear-gradient(180deg,#fff,#9DE134);-webkit-background-clip:text;background-clip:text;color:transparent;">WELCOME<br>BACK<span style="color:#9DE134;">.</span></div>
      <div style="font-size:11px;color:#A1A1AA;margin-top:14px;">Cricket exchange · 200+ games · Bangladesh's fastest withdrawals · avg <span style="color:#9DE134;font-weight:800;">3m 12s</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:16px;">
        ${['JILI','Spribe','Evolution','PRG','PG','InOut'].map(p=>`<span class="pill ghost">${p}</span>`).join('')}
      </div>
    </div>
    <div style="font-size:10px;color:#52525B;">v2.0.0 · BD-18A · 99.4% uptime</div>
  </div>
  <div style="padding:40px;display:flex;flex-direction:column;justify-content:center;">
    <div class="tab-pills" style="margin-bottom:16px;max-width:240px;">
      <button class="active">Phone</button>
      <button>Username</button>
    </div>
    <div style="max-width:340px;display:flex;flex-direction:column;gap:12px;">
      <div>
        <div style="font-size:9px;color:#71717A;font-weight:800;letter-spacing:1px;margin-bottom:6px;">PHONE NUMBER</div>
        <div style="display:flex;gap:6px;">
          <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-size:12px;font-weight:600;">🇧🇩 +880</div>
          <input style="flex:1;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:white;font-size:12px;outline:none;font-family:inherit;" placeholder="1XXX-XXXXXX" value="1758 496874">
        </div>
      </div>
      <div>
        <div style="font-size:9px;color:#71717A;font-weight:800;letter-spacing:1px;margin-bottom:6px;">PASSWORD</div>
        <input type="password" style="width:100%;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:white;font-size:12px;outline:none;font-family:inherit;" value="••••••••••">
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;">
        <label style="display:flex;align-items:center;gap:6px;color:#A1A1AA;"><input type="checkbox" checked style="accent-color:#9DE134"> Remember me</label>
        <a style="color:#9DE134;cursor:pointer;">Forgot?</a>
      </div>
      <button class="cta-neon full" style="padding:14px;font-size:14px;" onclick="setScreen('lobby')">LOGIN</button>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding-top:8px;">
        <button class="cta-ghost" style="padding:10px;">👆</button>
        <button class="cta-ghost" style="padding:10px;">📱</button>
        <button class="cta-ghost" style="padding:10px;">🔑</button>
      </div>
      <div style="text-align:center;font-size:10px;color:#71717A;">Biometric · OTP · Passkey</div>
      <div style="text-align:center;font-size:11px;padding-top:8px;"><span style="color:#71717A;">New here?</span> <a style="color:#9DE134;font-weight:800;cursor:pointer;">Create account</a></div>
    </div>
  </div>
</div>`;

// ============================== INIT ==============================
setScreen('lobby');