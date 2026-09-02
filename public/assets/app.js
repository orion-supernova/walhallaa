/* SIGNAL — behaviour. The work list renders from APPS; the pinned device sits at the
   centre of the viewport and follows whichever entry is crossing the middle of the screen. */
(function () {
  'use strict';
  const M = window.Motion, APPS = window.APPS, P = window.PROFILE, LK = window.LINK_KINDS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const pad = (n) => String(n).padStart(2, '0');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ---------- load choreography ----------
  const start = () => requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  if (document.fonts?.ready) { let done = false; const go = () => { if (!done) { done = true; start(); } }; document.fonts.ready.then(go); setTimeout(go, 700); } else start();

  // ---------- work list ----------
  const PLATFORM = {
    ios: { label: 'iOS', cls: 'pill-ios' },
    macos: { label: 'macOS', cls: 'pill-mac' },
    android: { label: 'Android', cls: 'pill-android' },
    web: { label: 'Web', cls: 'pill-web' },
  };
  const STATUS = {
    now: { label: 'Current work', cls: 'pill-now' },
    dev: { label: 'In development', cls: 'pill-dev' },
    v2: { label: 'v2 in progress', cls: 'pill-dev' },
    retired: { label: 'Retired', cls: 'pill-retired' },
  };

  const tileFor = (a) => a.icon
    ? `<span class="e-glyph is-img"><img src="${a.icon}" alt="" width="60" height="60" loading="lazy" decoding="async"></span>`
    : `<span class="e-glyph" style="--c:${a.hue}" aria-hidden="true">${a.glyph}</span>`;

  // On narrow screens the pinned device is gone, so each cell carries its own screen.
  const shotFor = (a) => {
    if (!a.screen) return '';
    const s = a.screen;
    const inner = s.type === 'video'
      ? `<video src="${s.src}" poster="${s.poster || ''}" muted loop playsinline preload="none" aria-hidden="true"></video>`
      : `<img src="${s.src}" alt="" loading="lazy" decoding="async">`;
    return `<div class="e-shot e-shot-${a.device}"${s.fit === 'contain' ? ' data-fit="contain"' : ''}>${inner}</div>`;
  };

  // Every link leaves for a new tab; the ↗ marks the ones that also leave the site.
  const linkFor = (l) => {
    const k = LK[l.kind] || {};
    return `<a class="e-link e-link-${l.kind}" href="${l.href}" target="_blank" rel="noopener"><i aria-hidden="true">${k.icon || ''}</i>${l.label}${k.ext ? '<u aria-hidden="true">↗</u>' : ''}</a>`;
  };

  const ol = $('#entries');
  APPS.forEach((a, i) => {
    const li = document.createElement('li');
    li.className = 'entry'; li.dataset.id = a.id; li.style.setProperty('--c', a.hue); li.tabIndex = 0;
    li.setAttribute('aria-label', `${a.name} — ${a.tagline}`);

    const pills = a.platforms.map((p) => PLATFORM[p]).filter(Boolean)
      .map((p) => `<span class="pill ${p.cls}">${p.label}</span>`).join('');
    const status = a.status && STATUS[a.status]
      ? `<span class="pill ${STATUS[a.status].cls}">${a.statusLabel || STATUS[a.status].label}</span>` : '';

    const facts = [
      a.stack?.join(' · '),
      a.openSource ? 'Open source' : null,
      a.price && a.price !== 'Free' ? a.price : null,
      a.note || null,
      a.androidNote || null,
    ].filter(Boolean).join('  ·  ');

    li.innerHTML = `
      <div class="entry-head">
        <span class="e-n">${pad(i + 1)}</span>
        ${tileFor(a)}
        <span class="e-main">
          <span class="e-name">${a.name}</span>
          <span class="e-tag">${a.tagline}</span>
          <span class="e-badges">${status}${pills}</span>
        </span>
      </div>
      <div class="e-body">
        ${shotFor(a)}
        <p class="e-desc">${a.desc}</p>
        <p class="e-facts">${facts}</p>
        <div class="e-links">${a.links.map(linkFor).join('')}</div>
      </div>`;
    ol.appendChild(li);
  });

  const entries = $$('.entry');
  const byId = new Map(APPS.map((a) => [a.id, a]));
  $('#railTotal').textContent = '/ ' + APPS.length;

  // ---------- devices ----------
  const heroDv = window.Devices.mount($('#heroDevices'), { apps: APPS, mode: 'pair' });
  const wide = window.matchMedia('(min-width: 1000px)');
  let workDv = wide.matches ? window.Devices.mount($('#workDevices'), { apps: APPS, mode: 'single' }) : null;

  // ---------- the device rides the middle of the screen ----------
  // Not position:sticky — that pins the stage to a corner at the top and bottom of the
  // list. A spring tracks the viewport's centre line the whole way down and eases to a
  // stop at each end of the column, so the device floats against the scroll.
  const pin = $('.pin'), pinIn = $('.pin-in');
  if (workDv && pin && pinIn) {
    let colTop = 0, colH = 0, stageH = 0;
    const measure = () => {
      const r = pin.getBoundingClientRect();
      colTop = r.top + window.scrollY;
      colH = r.height;
      stageH = pinIn.offsetHeight;
    };
    const pinY = new M.Spring({ value: 0, response: 0.42, damping: 1, onUpdate: (v) => {
      pinIn.style.transform = `translate3d(0, ${v.toFixed(1)}px, 0)`;
    } });
    const place = () => {
      if (!colH || !stageH) measure();
      // where the stage would sit to be centred in the viewport, in column coordinates
      const want = window.scrollY + (window.innerHeight - stageH) / 2 - colTop;
      const y = clamp(want, 0, Math.max(0, colH - stageH));
      if (M.reduced()) pinIn.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      else pinY.set(y);
    };
    const remeasure = () => { measure(); place(); };
    new ResizeObserver(remeasure).observe(pin);
    window.addEventListener('resize', remeasure);
    M.onScroll(place);
    remeasure();
    // the stage's own aspect ratio settles once fonts/layout land
    setTimeout(remeasure, 400);
  }

  // hero: a slow tour through the work while the hero is on screen
  if (!M.reduced()) {
    let i = -1, paused = false, inView = true;
    const step = () => { i = (i + 1) % APPS.length; heroDv.show(APPS[i].id); };
    setTimeout(() => { step(); setInterval(() => { if (!paused && inView) step(); }, 4200); }, 2000);
    const stage = $('#heroDevices');
    stage.addEventListener('pointerenter', () => { paused = true; });
    stage.addEventListener('pointerleave', () => { paused = false; });
    new IntersectionObserver((en) => { inView = en[0].isIntersecting; }, { threshold: 0.2 }).observe(stage);
  }

  // ---------- the active entry is the one crossing the middle of the screen ----------
  const marker = $('#railMarker'), railN = $('#railN'), railGlyph = $('#railGlyph');
  const markerY = new M.Spring({ value: 0, response: 0.55, damping: 0.9, onUpdate: (v) => { marker.style.translate = `0 ${v.toFixed(1)}px`; } });
  let hovered = null, railEl = entries[0], active = null;

  function setActive(el) {
    if (active === el) return;
    if (active) active.classList.remove('is-active');
    active = el;
    if (!el) { workDv?.idle(); return; }
    el.classList.add('is-active');
    const a = byId.get(el.dataset.id);
    workDv?.show(a.id);
    railN.textContent = pad(entries.indexOf(el) + 1);
    railGlyph.innerHTML = a.icon ? `<img src="${a.icon}" alt="" width="42" height="42">` : a.glyph;
    railGlyph.classList.toggle('is-img', !!a.icon);
    railGlyph.style.setProperty('--c', a.hue);
    marker.classList.remove('is-bump'); void marker.offsetWidth; marker.classList.add('is-bump');
    setTimeout(() => marker.classList.remove('is-bump'), 450);
  }
  const resolve = () => setActive(hovered || railEl);

  // proximity to the centre line, as a 0..1 value each cell can style itself with
  function focusPass() {
    const mid = window.innerHeight * 0.5;
    for (const el of entries) {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      const near = 1 - clamp(d / (window.innerHeight * 0.62), 0, 1);
      el.style.setProperty('--near', near.toFixed(3));
    }
  }

  // inline screens only play while they're actually on screen
  if ('IntersectionObserver' in window) {
    const vids = $$('.e-shot video');
    if (vids.length) {
      const io = new IntersectionObserver((ents) => {
        ents.forEach((e) => {
          const v = e.target;
          if (e.isIntersecting && !M.reduced()) v.play?.().catch(() => {});
          else v.pause?.();
        });
      }, { threshold: 0.35 });
      vids.forEach((v) => io.observe(v));
    }
  }

  M.rail('.entry', { line: 0.5, onChange: (el) => { railEl = el; markerY.set(el.offsetTop); resolve(); } });
  if (!M.reduced()) { M.onScroll(focusPass); window.addEventListener('resize', focusPass); focusPass(); }

  const canHover = window.matchMedia('(hover:hover)').matches;
  entries.forEach((el) => {
    if (canHover) el.addEventListener('pointerenter', () => { hovered = el; resolve(); });
    el.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      hovered = el; resolve();
      el.scrollIntoView({ block: 'center', behavior: M.reduced() ? 'auto' : 'smooth' });
    });
    el.addEventListener('focusin', () => { hovered = el; resolve(); });
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest('a')) return;
      e.preventDefault();
      el.scrollIntoView({ block: 'center', behavior: M.reduced() ? 'auto' : 'smooth' });
    });
  });
  if (canHover) ol.addEventListener('pointerleave', () => { hovered = null; resolve(); });
  ol.addEventListener('focusout', (e) => { if (!ol.contains(e.relatedTarget)) { hovered = null; resolve(); } });
  new IntersectionObserver((en) => { if (!en[0].isIntersecting) workDv?.idle(); else resolve(); }, { threshold: 0.02 }).observe($('#work'));

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
  M.pressable('.btn, .stamp, .key, .e-link', { scale: 0.985 });
  M.magnetic('[data-magnetic]', { strength: 0.28, radius: 120 });
  M.reveal('.reveal', { stagger: 70 });

  // ---------- bar ----------
  const bar = $('#bar');
  M.onScroll((y) => bar.classList.toggle('is-scrolled', y > 8));
  M.spy('.bar-nav a', { offset: 0.4 });
})();
