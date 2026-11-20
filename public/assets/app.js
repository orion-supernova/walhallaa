/* SIGNAL — behaviour.
   The work is a shelf: a grid rendered from APPS. Opening an app shows it on the stage — a
   pane beside the grid on wide screens, a bottom sheet on narrow ones. The address bar
   carries the open app (#swirl), so every app has a link and the phone's Back button closes
   the sheet. Around it: the poster's load choreography, the hero devices and the contact keys. */
(function () {
  'use strict';
  const M = window.Motion, APPS = window.APPS, P = window.PROFILE, LK = window.LINK_KINDS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wide = window.matchMedia('(min-width: 1100px)');
  const EASE = 'cubic-bezier(.2, .8, .2, 1)';

  const PLATFORM = { ios: 'iPhone', macos: 'Mac', android: 'Android', web: 'Web' };
  const STATUS = { now: 'Current work', dev: 'In development', v2: 'v2 in progress', retired: 'Retired' };
  const byId = new Map(APPS.map((a) => [a.id, a]));

  const grid = $('#grid'), filters = $('#filters'), stage = $('#stage'), body = $('#stageBody'), scrim = $('#scrim');
  const count = $('#count');

  // ---------- load choreography ----------
  const start = () => requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  if (document.fonts?.ready) { let done = false; const kick = () => { if (!done) { done = true; start(); } }; document.fonts.ready.then(kick); setTimeout(kick, 700); } else start();

  const iconFor = (a) => a.icon
    ? `<span class="ic" style="--c:${a.hue}"><img src="${a.icon}" alt="" width="192" height="192" decoding="async"></span>`
    : `<span class="ic" style="--c:${a.hue}" aria-hidden="true">${a.glyph}</span>`;

  // ---------- shelf ----------
  grid.innerHTML = APPS.map((a) => `<li data-id="${a.id}"><a class="tile" href="#${a.id}" data-id="${a.id}" aria-label="${a.name}: ${a.tagline}">${iconFor(a)}<span class="tile-text" aria-hidden="true"><span class="tile-name">${a.short}</span><span class="tile-cat">${a.cat}</span></span></a></li>`).join('');
  const NUM = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
  $('#workCount').textContent = `${NUM[APPS.length] || APPS.length} projects · strongest first`;
  grid.style.setProperty('--rows', Math.ceil(APPS.length / 2));
  const tiles = new Map($$('.tile', grid).map((t) => [t.dataset.id, t]));

  let filter = 'all';
  const visible = () => (filter === 'all' ? APPS : APPS.filter((a) => a.platforms.includes(filter)));
  const options = [['all', 'All'], ...Object.entries(PLATFORM)].filter(([k]) => k === 'all' || APPS.some((a) => a.platforms.includes(k)));
  filters.innerHTML = options.map(([k, label]) => {
    const n = k === 'all' ? APPS.length : APPS.filter((a) => a.platforms.includes(k)).length;
    return `<button class="seg" type="button" data-f="${k}" aria-pressed="${k === filter}">${label}<small>${n}</small></button>`;
  }).join('');
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('.seg'); if (!b || b.dataset.f === filter) return;
    filter = b.dataset.f;
    $$('.seg', filters).forEach((s) => s.setAttribute('aria-pressed', String(s.dataset.f === filter)));
    const keep = new Set(visible().map((a) => a.id));
    $$('li', grid).forEach((li) => { const off = !keep.has(li.dataset.id); li.classList.toggle('is-off', off); li.inert = off; });
    // on a wide screen the stage always shows something from the list you're looking at
    if (wide.matches && !keep.has(current)) go(visible()[0].id, { replace: true });
    else updateCount();
  });

  // ---------- stage content ----------
  const deviceFor = (a) => {
    const s = a.screen;
    let scr;
    if (!s) {
      scr = `<div class="scr scr-empty">${iconFor(a)}<b>${a.name}</b><span>${a.statusLabel || STATUS[a.status] || 'No screenshots yet'}</span></div>`;
    } else if (s.type === 'video') {
      scr = `<div class="scr"><video src="${s.src}" poster="${s.poster || ''}" muted loop playsinline preload="metadata" aria-label="Screen recording of ${a.name}"></video></div>`;
    } else {
      scr = `<div class="scr"><img class="scr-main" src="${s.src}" alt="${a.name} screenshot" decoding="async"></div>`;
    }
    const ar = s && s.w ? ` style="--aw:${s.w}; --ah:${s.h}"` : '';
    // a 16:9 screenshot comes from a home-button iPhone, so it's shown on one: the picture
    // fits its screen exactly instead of being stretched onto a taller display
    const classic = !!s && a.device !== 'mac' && s.frame !== false && s.w && s.h / s.w < 2.05;
    const buttons = '<i class="pb pb-action"></i><i class="pb pb-up"></i><i class="pb pb-down"></i><i class="pb pb-power"></i>';
    const all = a.more && s ? [s.src, ...a.more] : [];
    const dots = all.length ? `<div class="shots" role="group" aria-label="Screenshots">${all.map((src, i) => `<button type="button" class="shot-dot" data-src="${src}" aria-label="Screenshot ${i + 1} of ${all.length}" aria-pressed="${i === 0}"></button>`).join('')}</div>` : '';
    if (s && s.frame === false) return `<div class="plain${a.device === 'mac' ? '' : ' is-tall'}"${ar}>${scr}</div>${dots}`;
    return (a.device === 'mac'
      ? `<div class="mac"${ar}><div class="mac-lid">${scr}<i class="mac-notch"></i></div><div class="mac-base"></div></div>`
      : classic ? `<div class="phone is-classic">${buttons}<i class="pe"></i>${scr}</div>`
      : `<div class="phone has-island">${buttons}${scr}</div>`) + dots;
  };

  const isLegal = (l) => l.kind === 'privacy' || l.kind === 'eula' || l.kind === 'delete';
  const offSite = (l) => /^https?:/.test(l.href);
  const attrs = (l) => (offSite(l) ? ' target="_blank" rel="noopener"' : '');
  const linksFor = (a) => {
    const main = a.links.filter((l) => !isLegal(l));
    const legal = a.links.filter(isLegal);
    // the one thing you'd most likely want: get the app, or failing that, read its source
    const primary = main.find((l) => l.kind !== 'source' && offSite(l)) || main.find((l) => l.kind === 'source');
    const btn = (l) => `<a class="btn ${l === primary ? 'btn-ink' : 'btn-line'}" href="${l.href}"${attrs(l)}>${(LK[l.kind] || {}).icon || ''}${l.label}</a>`;
    return (main.length ? `<div class="d-links">${[primary, ...main.filter((l) => l !== primary)].filter(Boolean).map(btn).join('')}</div>` : '')
      + (legal.length ? `<div class="d-legal">${legal.map((l) => `<a href="${l.href}"${attrs(l)}>${l.label}</a>`).join('')}</div>` : '');
  };

  const factsFor = (a) => {
    const list = (xs) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1] : xs[0]);
    return [
      a.stack && a.stack.length ? `Built with <b>${list(a.stack)}</b>.` : '',
      a.openSource ? 'Open source.' : '',
      a.price ? (a.price === 'Free' ? 'Free.' : `${a.price} on the store.`) : '',
      a.first ? 'My first shipped app.' : '',
      a.note || '',
      a.androidNote || '',
    ].filter(Boolean).join(' ');
  };

  function render(a, dir) {
    const status = a.status && STATUS[a.status] ? `<li class="chip chip-status${a.status === 'retired' ? ' is-quiet' : a.status === 'dev' || a.status === 'v2' ? ' is-dev' : ''}">${a.statusLabel || STATUS[a.status]}</li>` : '';
    // "Mahmut: Clipboard Manager" reads as a name and a descriptor, so set it that way
    const [title, sub] = a.name.includes(': ') ? a.name.split(': ') : [a.name, ''];
    stage.style.setProperty('--hue', a.hue);
    body.classList.toggle('is-mac', a.device === 'mac');
    body.innerHTML = `
      <header class="d-head">${iconFor(a)}<div><h2 id="dName">${title}${sub ? `<span class="d-sub">${sub}</span>` : ''}</h2><p class="d-tag">${a.tagline}</p></div></header>
      <div class="d-media">${deviceFor(a)}</div>
      <div class="d-text">
        <ul class="chips">${status}${a.platforms.map((p) => `<li class="chip">${PLATFORM[p] || p}</li>`).join('')}<li class="chip chip-cat">${a.cat}</li></ul>
        <p class="d-desc">${a.desc}</p>
        <p class="d-facts">${factsFor(a)}</p>
        ${linksFor(a)}
        ${a.clip ? `<p class="d-clip"><img src="${a.clip.qr}" alt="QR code that opens ${title} as an App Clip" width="84" height="84"><span>${a.clip.note}</span></p>` : ''}
      </div>`;
    body.scrollTop = 0;
    if (!wide.matches || stageInView) playMedia();
    if (dir != null && !M.reduced() && body.animate) {
      body.animate([{ opacity: .55, transform: `translate3d(${dir * 18}px, ${dir ? 0 : 6}px, 0)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE });
    }
  }
  // an app with several screenshots: the dots pick one, and clicking the screen moves on
  function setShot(dot) {
    const img = $('.scr .scr-main', body); if (!img || !dot) return;
    $$('.shot-dot', body).forEach((d) => d.setAttribute('aria-pressed', String(d === dot)));
    const next = new Image();
    next.onload = () => { if (dot.getAttribute('aria-pressed') === 'true') img.src = next.src; };
    next.src = dot.dataset.src;
  }
  body.addEventListener('click', (e) => {
    const dot = e.target.closest('.shot-dot');
    if (dot) return setShot(dot);
    if (e.target.closest('.scr') && $('.shot-dot', body)) {
      const dots = $$('.shot-dot', body), i = dots.findIndex((d) => d.getAttribute('aria-pressed') === 'true');
      setShot(dots[(i + 1) % dots.length]);
    }
  });
  // fetch an app's screen (or a recording's poster) ahead of time, so opening it never
  // shows an empty device while the file arrives
  const warmed = new Set();
  function warm(a) {
    if (!a || !a.screen || warmed.has(a.id)) return;
    warmed.add(a.id);
    new Image().src = a.screen.type === 'video' ? (a.screen.poster || '') : a.screen.src;
  }
  grid.addEventListener('pointerover', (e) => { const t = e.target.closest('.tile'); if (t) warm(byId.get(t.dataset.id)); });
  grid.addEventListener('focusin', (e) => { const t = e.target.closest('.tile'); if (t) warm(byId.get(t.dataset.id)); });
  function playMedia() { const v = $('video', body); if (v && !M.reduced()) v.play().catch(() => {}); }
  function pauseMedia() { const v = $('video', body); if (v) v.pause(); }

  // ---------- state ----------
  let current = null, sheetOpen = false, lastTile = null;

  function updateCount() {
    const list = visible(), i = list.findIndex((a) => a.id === current);
    count.textContent = i < 0 ? '' : `${i + 1} of ${list.length}`;
  }
  function mark() {
    const on = wide.matches || sheetOpen ? current : null;
    tiles.forEach((t, id) => { if (id === on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
  }
  function show(a) {
    if (a.id !== current) {
      const order = APPS.map((x) => x.id);
      const dir = current == null ? null : Math.sign(order.indexOf(a.id) - order.indexOf(current));
      current = a.id;
      render(a, stepDir != null ? stepDir : (dir == null ? null : 0));
    }
    stepDir = null;
    updateCount();
    // the neighbours are the likeliest next stop
    const list = visible(), i = list.findIndex((x) => x.id === a.id);
    if (i >= 0) { warm(list[(i + 1) % list.length]); warm(list[(i - 1 + list.length) % list.length]); }
  }

  // The address is the source of truth; everything that changes what's open goes through go()/route().
  let stepDir = null;
  function go(id, { replace = false } = {}) {
    const url = id ? '#' + id : location.pathname + location.search;
    if (replace) history.replaceState(history.state, '', url);
    else history.pushState({ sheet: true }, '', url);
    route();
  }
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const a = byId.get(h);
    if (wide.matches) {
      settleSheet();
      show(a || byId.get(current) || visible()[0]);
    } else if (a) { show(a); openSheet(); } else closeSheet();
    mark();
  }
  function step(d) {
    let list = visible();
    if (!list.some((a) => a.id === current)) list = APPS;
    const i = list.findIndex((a) => a.id === current);
    stepDir = d;
    go(list[(i + d + list.length) % list.length].id, { replace: true });
  }
  // closing the sheet walks back through history when we were the ones who pushed it
  let closeVelocity = 0;
  function dismiss(velocity = 0) {
    closeVelocity = velocity;
    if (history.state && history.state.sheet) history.back();
    else go(null, { replace: true });
  }

  grid.addEventListener('click', (e) => {
    const t = e.target.closest('.tile'); if (!t || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    lastTile = t;
    go(t.dataset.id, { replace: wide.matches || sheetOpen });
  });
  $('#prev').addEventListener('click', () => step(-1));
  $('#next').addEventListener('click', () => step(1));
  $('#close').addEventListener('click', () => dismiss());
  scrim.addEventListener('click', () => dismiss());
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);
  wide.addEventListener('change', route);

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const showing = wide.matches ? stageInView : sheetOpen;
    if (e.key === 'Escape') { if (!wide.matches && sheetOpen) dismiss(); }
    else if (showing && e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (showing && e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  // arrow keys step through the apps only while the stage is what you're looking at,
  // and its recording only plays while it's on screen
  let stageInView = false;
  new IntersectionObserver((en) => {
    stageInView = en[0].isIntersecting;
    if (!wide.matches) return;
    if (stageInView) playMedia(); else pauseMedia();
  }, { threshold: 0.4 }).observe(stage);

  // ---------- the sheet (narrow screens) ----------
  // One spring owns the sheet's offset in px: 0 is open, its own height is closed. Dragging
  // writes the same value directly, so a release always continues from where the finger left it.
  let H = 0;
  const sheetY = new M.Spring({
    value: 0, response: 0.4, damping: 1, restDelta: 0.5, restSpeed: 2,
    onUpdate: (v) => {
      stage.style.transform = `translate3d(0, ${v.toFixed(1)}px, 0)`;
      scrim.style.opacity = H ? clamp(1 - v / H, 0, 1).toFixed(3) : '0';
    },
    onRest: (v) => {
      if (sheetOpen || v < H - 1) return;
      stage.classList.remove('is-open'); scrim.classList.remove('is-open');
      pauseMedia();
    },
  });
  function openSheet() {
    if (sheetOpen) return;
    const wasHidden = !stage.classList.contains('is-open');
    sheetOpen = true;
    stage.classList.add('is-open'); scrim.classList.add('is-open');
    document.documentElement.classList.add('sheet-open');
    stage.setAttribute('role', 'dialog'); stage.setAttribute('aria-modal', 'true');
    H = stage.offsetHeight;
    if (wasHidden) { sheetY.value = H; sheetY.velocity = 0; sheetY.onUpdate(H); }
    sheetY.set(0, { response: 0.42, damping: 1 });
    playMedia();
    stage.tabIndex = -1; stage.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    document.documentElement.classList.remove('sheet-open');
    H = stage.offsetHeight;
    sheetY.set(H, { velocity: closeVelocity, response: 0.36, damping: 1 });
    closeVelocity = 0;
    if (lastTile) lastTile.focus({ preventScroll: true });
  }
  // wide layout: the stage is an ordinary pane, so drop everything the sheet set on it
  function settleSheet() {
    sheetOpen = false; sheetY.stop();
    stage.style.transform = ''; scrim.style.opacity = '';
    stage.classList.remove('is-open'); scrim.classList.remove('is-open');
    document.documentElement.classList.remove('sheet-open');
    stage.removeAttribute('role'); stage.removeAttribute('aria-modal'); stage.removeAttribute('tabindex');
  }

  // pointer drag that only takes over once the finger has clearly chosen a direction,
  // so taps on the buttons and links underneath still land
  function drag(el, { axis, canStart, onMove, onEnd }) {
    let id = null, sx = 0, sy = 0, active = false, dragged = false, hist = [];
    el.addEventListener('pointerdown', (e) => {
      if ((e.pointerType === 'mouse' && e.button !== 0) || (canStart && !canStart(e))) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY; active = false; dragged = false; hist = [{ x: sx, y: sy, t: e.timeStamp }];
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!active) {
        if (Math.hypot(dx, dy) < 8) return;
        if ((axis === 'x') !== (Math.abs(dx) > Math.abs(dy))) { id = null; return; }
        active = dragged = true;
        try { el.setPointerCapture(id); } catch (_) {}
      }
      hist.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      while (hist.length > 2 && e.timeStamp - hist[0].t > 100) hist.shift();
      onMove(dx, dy);
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null; if (!active) return; active = false;
      const a = hist[0], b = hist[hist.length - 1], dt = Math.max(0.016, (b.t - a.t) / 1000);
      onEnd((b.x - a.x) / dt, (b.y - a.y) / dt, e.clientX - sx, e.clientY - sy);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('click', (e) => { if (dragged) { dragged = false; e.preventDefault(); e.stopPropagation(); } }, true);
  }

  // pull the sheet down by its top edge
  drag($('#stageTop'), {
    axis: 'y',
    canStart: () => !wide.matches && sheetOpen,
    onMove: (dx, dy) => {
      H = stage.offsetHeight;
      const y = dy >= 0 ? dy : -M.rubberband(-dy, H, 0.18);
      sheetY.stop(); sheetY.value = y; sheetY.onUpdate(y);
    },
    onEnd: (vx, vy) => {
      const landing = sheetY.value + M.project(vy, 0.992);
      if (vy > -200 && landing > H * 0.33) dismiss(vy);
      else sheetY.set(0, { velocity: vy, response: 0.36, damping: 0.85 });
    },
  });

  // swipe sideways through the apps
  drag(body, {
    axis: 'x',
    canStart: (e) => !wide.matches && sheetOpen && e.pointerType !== 'mouse',
    onMove: (dx) => { body.style.transform = `translate3d(${(dx * 0.85).toFixed(1)}px, 0, 0)`; body.style.opacity = String(clamp(1 - Math.abs(dx) / 420, 0.35, 1)); },
    onEnd: (vx, vy, dx) => {
      const from = body.style.transform, fromO = body.style.opacity;
      body.style.transform = ''; body.style.opacity = '';
      const landing = dx + M.project(vx, 0.99);
      if (Math.abs(landing) > 90 && Math.sign(landing) === Math.sign(dx)) step(dx < 0 ? 1 : -1);
      else if (body.animate) body.animate([{ transform: from, opacity: fromO }, { transform: 'none', opacity: 1 }], { duration: 300, easing: EASE });
    },
  });

  // ---------- hero devices: a slow tour through the work while the poster is on screen ----------
  const heroStage = $('#heroDevices');
  const heroDv = window.Devices.mount(heroStage, { apps: APPS, mode: 'pair' });
  if (!M.reduced()) {
    let i = -1, paused = false, inView = true;
    const tour = () => { i = (i + 1) % APPS.length; heroDv.show(APPS[i].id); };
    setTimeout(() => { tour(); setInterval(() => { if (!paused && inView && !sheetOpen) tour(); }, 4200); }, 2000);
    heroStage.addEventListener('pointerenter', () => { paused = true; });
    heroStage.addEventListener('pointerleave', () => { paused = false; });
    new IntersectionObserver((en) => { inView = en[0].isIntersecting; if (!inView) heroDv.idle(); }, { threshold: 0.2 }).observe(heroStage);
  }

  // ---------- contact ----------
  const keys = $('#keys');
  [['GitHub', 'orion-supernova', P.github], ['LinkedIn', 'in/muratcankoc', P.linkedin], ['App Store', 'Developer page', P.appstore]].forEach(([b, s, href]) => {
    const a = document.createElement('a'); a.className = 'key'; a.href = href; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = `<span class="key-t"><b>${b}</b><small>${s}</small></span><span class="key-arrow" aria-hidden="true">↗</span>`;
    keys.appendChild(a);
  });
  M.specular('.key', { response: 0.3, home: [0.5, 0.5] });
  M.copyEmail($('#copyEmail'), P.email);

  // ---------- physics & ambience ----------
  M.specular('.light', { response: 0.8 });
  M.parallax('[data-parallax]');
  M.tilt('.stamp', { max: 14, glare: false });
  M.pressable('.btn, .stamp, .key', { scale: 0.985 });
  M.magnetic('[data-magnetic]', { strength: 0.28, radius: 120 });
  M.reveal('.reveal', { stagger: 70 });

  // ---------- bar ----------
  const bar = $('#bar');
  M.onScroll((y) => bar.classList.toggle('is-scrolled', y > 8));
  M.spy('.bar-nav a', { offset: 0.4 });

  route();
  // a link straight to an app lands on the shelf, not the poster
  if (wide.matches && byId.has(decodeURIComponent(location.hash.slice(1)))) $('.work-grid').scrollIntoView();
})();
