/* devices.js — a CSS-3D iPhone and MacBook on one stage.
   Devices.mount(el, { apps }) → { show(appId), idle(), front('phone'|'mac'), el }
   The phone's home screen is the portfolio; showing an iOS app opens its detail card on the
   phone, showing a macOS app brings the MacBook forward with that app's window open. */
(function () {
  'use strict';
  const M = window.Motion;
  const lerp = (a, b, t) => a + (b - a) * t;

  const STATUS_SVG = '<svg viewBox="0 0 40 12" aria-hidden="true"><rect x="0" y="7" width="3" height="5" rx=".8"/><rect x="4.5" y="5" width="3" height="7" rx=".8"/><rect x="9" y="3" width="3" height="9" rx=".8"/><rect x="13.5" y="1" width="3" height="11" rx=".8"/><path d="M22 4.5a6 6 0 0 1 8 0M23.7 6.8a3.5 3.5 0 0 1 4.6 0M26 9.5l.01 0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><rect x="33" y="1.5" width="6" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1"/><rect x="34.2" y="2.7" width="3.6" height="6.6" rx="1"/></svg>';

  function timeNow() { const d = new Date(); return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`; }

  // mode: 'pair'   → iPhone and MacBook side by side, both always visible (hero)
  //       'single' → one device at a time, swapping with a spring (pinned beside a list)
  //       'layer'  → the active device in front, the other receding behind it
  function mount(el, { apps = window.APPS, profile = window.PROFILE, initial = 'phone', tilt = 8, mode = 'layer' } = {}) {
    const G = profile.glyphs;
    el.classList.add('dv-stage', 'dv-' + mode);
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="dv-glow"></div>
      <div class="dv-wrap dv-wrap-mac"><div class="dv-float"><div class="dv-mac">
        <div class="dv-mac-shadow"></div>
        <div class="dv-mac-base"><div class="dv-mac-kb"></div><div class="dv-mac-tp"></div></div>
        <div class="dv-mac-lip"></div>
        <div class="dv-mac-lid">
          <div class="dv-mac-screen">
            <div class="dv-menubar"><b class="dv-mb-app">Finder</b><span>File</span><span>Edit</span><span>View</span><span>Window</span><span class="dv-mb-r"><i></i><span class="dv-mb-time">${timeNow()}</span></span></div>
            <div class="dv-desk-app"></div><div class="dv-desk-hint"></div>
            <div class="dv-window"><div class="dv-win-bar"><i></i><i></i><i></i><span class="dv-win-title"></span></div><div class="dv-win-body"></div></div>
            <div class="dv-media dv-mac-media"></div>
            <div class="dv-mac-dock"></div>
          </div>
          <div class="dv-mac-notch"></div>
          <div class="dv-mac-sheen"></div>
        </div>
      </div></div></div>
      <div class="dv-wrap dv-wrap-phone"><div class="dv-float"><div class="dv-phone">
        <div class="dv-ph-body">
          <span class="dv-ph-side mute"></span><span class="dv-ph-side v1"></span><span class="dv-ph-side v2"></span><span class="dv-ph-side pw"></span>
          <div class="dv-ph-screen">
            <div class="dv-wall"></div>
            <div class="dv-ph-status"><span class="dv-ph-time">${timeNow()}</span><span>${STATUS_SVG}</span></div>
            <div class="dv-ph-island"></div>
            <div class="dv-ph-home"><div class="dv-grid"></div><div class="dv-dock"></div></div>
            <div class="dv-ph-detail"></div>
            <div class="dv-media dv-ph-media"></div>
          </div>
          <div class="dv-sheen"></div>
        </div>
      </div></div></div>`;

    const $ = (s) => el.querySelector(s);
    const wrapPhone = $('.dv-wrap-phone'), wrapMac = $('.dv-wrap-mac');
    const home = $('.dv-ph-home'), detail = $('.dv-ph-detail'), grid = $('.dv-grid'), dock = $('.dv-dock');
    const win = $('.dv-window'), winTitle = $('.dv-win-title'), winBody = $('.dv-win-body'), mbApp = $('.dv-mb-app');
    const deskApp = $('.dv-desk-app'), deskHint = $('.dv-desk-hint'), macDock = $('.dv-mac-dock');
    const phMedia = $('.dv-ph-media'), macMedia = $('.dv-mac-media');

    // an app tile: the real icon when the project ships one, the drawn glyph otherwise
    const tile = (a, cls = 'dv-sq') => a.icon
      ? `<div class="${cls} is-img" style="--c:${a.hue}"><img src="${a.icon}" alt="" loading="lazy" decoding="async"></div>`
      : `<div class="${cls}" style="--c:${a.hue}">${a.glyph}</div>`;

    // phone home screen
    const icons = new Map();
    apps.filter((a) => a.device === 'phone').slice(0, 12).forEach((a, i) => {
      const ic = document.createElement('div'); ic.className = 'dv-icon'; ic.style.setProperty('--i', i);
      ic.innerHTML = `${tile(a)}<div class="dv-lb">${a.short}</div>`;
      grid.appendChild(ic); icons.set(a.id, ic);
    });
    [['#0A84FF', G.mail], ['#0077B5', G.linkedin], ['#24292F', G.github], ['#1B8CFF', G.appstore]].forEach(([c, g]) => {
      const d = document.createElement('div'); d.className = 'dv-dk'; d.style.setProperty('--c', c); d.innerHTML = g; dock.appendChild(d);
    });
    // mac dock: the mac apps
    const macApps = apps.filter((a) => a.device === 'mac');
    const macDockItems = new Map();
    macApps.forEach((a) => {
      const d = document.createElement('div'); d.className = 'dv-dk'; d.style.setProperty('--c', a.hue);
      d.innerHTML = a.icon ? `<img src="${a.icon}" alt="" loading="lazy" decoding="async">` : a.glyph;
      if (a.icon) d.classList.add('is-img');
      macDock.appendChild(d); macDockItems.set(a.id, d);
    });
    // desktop idle state
    deskApp.style.setProperty('--c', '#8E8E93'); deskApp.innerHTML = G.appstore;
    deskHint.textContent = macApps.map((a) => a.short).join(' · ');

    setInterval(() => { $('.dv-ph-time').textContent = timeNow(); $('.dv-mb-time').textContent = timeNow(); }, 15000);

    // ---------- springs ----------
    // p: 0 = phone front, 1 = mac front
    let W = el.clientWidth || 520;
    const ro = new ResizeObserver(() => { W = el.clientWidth || W; applyP(pos.value); });
    ro.observe(el);
    function applyP(p) {
      let ph, mc, phFront;
      if (mode === 'pair') {
        ph = { x: .31 * W, y: .03 * W, s: 1, o: 1 }; mc = { x: -.18 * W, y: -.02 * W, s: 1, o: 1 }; phFront = true;
      } else if (mode === 'single') {
        ph = { x: 0, y: .05 * W * p, s: 1 - .08 * p, o: Math.max(0, 1 - 1.8 * p) };
        mc = { x: 0, y: .05 * W * (1 - p), s: .92 + .08 * p, o: Math.max(0, 1 - 1.8 * (1 - p)) }; phFront = p < .5;
      } else {
        ph = { x: lerp(.06, .22, p) * W, y: lerp(.02, .08, p) * W, s: lerp(1, .64, p), o: lerp(1, .6, p) };
        mc = { x: lerp(-.09, 0, p) * W, y: lerp(-.12, .02, p) * W, s: lerp(.84, 1, p), o: lerp(.8, 1, p) }; phFront = p < .5;
      }
      wrapPhone.style.transform = `translate(-50%, -50%) translate3d(${ph.x.toFixed(1)}px, ${ph.y.toFixed(1)}px, 0) scale(${ph.s.toFixed(4)})`;
      wrapPhone.style.opacity = ph.o.toFixed(3);
      wrapMac.style.transform = `translate(-50%, -50%) translate3d(${mc.x.toFixed(1)}px, ${mc.y.toFixed(1)}px, 0) scale(${mc.s.toFixed(4)})`;
      wrapMac.style.opacity = mc.o.toFixed(3);
      wrapPhone.style.zIndex = phFront ? 3 : 2; wrapMac.style.zIndex = phFront ? 2 : 3;
      wrapPhone.style.visibility = ph.o <= 0 ? 'hidden' : ''; wrapMac.style.visibility = mc.o <= 0 ? 'hidden' : '';
    }
    const pos = new M.Spring({ value: initial === 'mac' ? 1 : 0, response: .65, damping: 1, onUpdate: applyP });
    applyP(pos.value);

    // phone detail swap
    const swap = new M.Spring({ value: 0, response: .5, damping: 1, onUpdate: (q) => {
      home.style.transform = `scale(${1 - .08 * q})`; home.style.opacity = String(Math.max(0, 1 - 1.25 * q));
      detail.style.opacity = String(q); detail.style.transform = `scale(${.92 + .08 * q}) translateY(${(1 - q) * 4}cqw)`;
    } });
    // mac window open
    const open = new M.Spring({ value: 0, response: .5, damping: 1, onUpdate: (q) => {
      win.style.opacity = String(q); win.style.transform = `scale(${.94 + .06 * q}) translateY(${(1 - q) * 2}cqw)`;
      deskApp.style.opacity = deskHint.style.opacity = String(1 - q);
    } });

    // ---------- real screens ----------
    // Each app that ships a recording or a screenshot gets it played inside the device
    // itself. Elements are built once, on first use, and paused whenever they go away.
    const mediaCache = new Map();
    function mediaFor(a) {
      if (!a.screen) return null;
      let node = mediaCache.get(a.id);
      if (node) return node;
      const s = a.screen;
      if (s.type === 'video') {
        node = document.createElement('video');
        node.src = s.src; node.poster = s.poster || '';
        node.muted = true; node.loop = true; node.playsInline = true;
        node.preload = 'none'; node.setAttribute('aria-hidden', 'true');
      } else {
        node = document.createElement('img');
        node.src = s.src; node.alt = ''; node.loading = 'lazy'; node.decoding = 'async';
      }
      node.className = 'dv-media-el';
      node.style.objectFit = s.fit || 'cover';
      if (s.fit === 'contain') node.classList.add('is-contain');
      mediaCache.set(a.id, node);
      return node;
    }
    let shownMedia = null;
    function showMedia(a) {
      const layer = a.device === 'mac' ? macMedia : phMedia;
      const other = a.device === 'mac' ? phMedia : macMedia;
      const node = mediaFor(a);
      clearMedia(other);
      if (!node) { clearMedia(layer); return false; }
      if (node.parentNode !== layer) { layer.replaceChildren(node); }
      if (node.tagName === 'VIDEO' && !M.reduced()) { node.play?.().catch(() => {}); }
      layer.classList.add('is-on');
      shownMedia = node;
      return true;
    }
    function clearMedia(layer) {
      if (!layer) return;
      layer.classList.remove('is-on');
      const v = layer.querySelector('video');
      if (v) v.pause();
    }
    function clearAllMedia() { clearMedia(phMedia); clearMedia(macMedia); shownMedia = null; }

    let hot = null;
    function setHot(id) {
      if (hot) { icons.get(hot)?.classList.remove('is-hot'); macDockItems.get(hot)?.classList.remove('is-hot'); }
      hot = id;
      if (id) { icons.get(id)?.classList.add('is-hot'); macDockItems.get(id)?.classList.add('is-hot'); }
    }
    const platformLabel = (a) => a.platforms.map((p) => ({ ios: 'iOS', macos: 'macOS', android: 'Android', web: 'Web' })[p] || p).join(' · ');

    function renderPhoneDetail(a) {
      detail.innerHTML = `${tile(a, 'dv-d-ic')}<div class="dv-d-name">${a.name}</div>
        <div class="dv-d-meta">${platformLabel(a)} · ${a.cat}</div><div class="dv-d-desc">${a.tagline}</div>
        <div class="dv-d-links">${a.links.slice(0, 3).map((l) => `<span>${l.label}</span>`).join('')}</div>`;
    }
    function renderMacWindow(a) {
      mbApp.textContent = a.short; winTitle.textContent = a.name; win.style.setProperty('--c', a.hue);
      const side = `<div class="dv-win-side"><div class="dv-app-id">${tile(a)}${a.short}</div><u class="on"></u><u></u><u></u><u></u></div>`;
      const main = `<div class="dv-title">${a.name}</div><div class="dv-sub">${a.tagline}</div>
        <div class="dv-row"><i></i>${platformLabel(a)}<u></u></div><div class="dv-row"><i></i>${a.cat}<u></u></div>`;
      winBody.innerHTML = side + `<div class="dv-win-main" style="--c:${a.hue}">${main}</div>`;
    }

    function show(id) {
      const a = apps.find((x) => x.id === id); if (!a) return;
      setHot(id);
      const hasMedia = showMedia(a);
      if (a.device === 'mac') {
        if (hasMedia) { winBody.replaceChildren(); } else renderMacWindow(a);
        open.set(hasMedia ? 0 : 1); pos.set(1); swap.set(0);
      } else {
        if (hasMedia) { detail.replaceChildren(); } else renderPhoneDetail(a);
        swap.set(1); pos.set(0); open.set(0);   // either way the home screen recedes
      }
    }
    function idle() { setHot(null); clearAllMedia(); swap.set(0, { response: .45 }); open.set(0, { response: .45 }); }
    function front(which) { pos.set(which === 'mac' ? 1 : 0); }

    // tilt: the stage's --rx/--ry are inherited by both devices
    M.tilt(el, { max: tilt, response: .5 });
    requestAnimationFrame(() => el.classList.add('is-ready'));
    return { show, idle, front, el, apps };
  }

  window.Devices = { mount };
})();
