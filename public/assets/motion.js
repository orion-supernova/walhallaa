/* motion.js — tiny spring-physics toolkit shared by every design.
   Parameters follow Apple's designer-facing model: `damping` (ratio, 1 = no overshoot)
   and `response` (seconds to reach the target). Everything is interruptible and
   animates from the live value, never the logical one. No dependencies. */
(function () {
  'use strict';

  // ---------- reduced-motion (live) ----------
  const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedFlag = rmq.matches;
  rmq.addEventListener?.('change', (e) => { reducedFlag = e.matches; document.documentElement.classList.toggle('reduced-motion', reducedFlag); });
  document.documentElement.classList.toggle('reduced-motion', reducedFlag);
  const reduced = () => reducedFlag;

  // ---------- shared ticker ----------
  const subs = new Set();
  let running = false, last = 0;
  function loop(now) {
    if (!subs.size) { running = false; return; }
    const dt = Math.min(0.064, (now - last) / 1000 || 0.016);
    last = now;
    for (const fn of Array.from(subs)) fn(dt, now);
    requestAnimationFrame(loop);
  }
  function raf(fn) {
    subs.add(fn);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    return () => subs.delete(fn);
  }

  // ---------- Spring ----------
  class Spring {
    constructor({ value = 0, damping = 1, response = 0.4, onUpdate, onRest, restDelta = 0.01, restSpeed = 0.01 } = {}) {
      this.value = value; this.target = value; this.velocity = 0;
      this.damping = damping; this.response = response;
      this.onUpdate = onUpdate; this.onRest = onRest;
      this.restDelta = restDelta; this.restSpeed = restSpeed;
      this._unsub = null;
    }
    set(target, { velocity, damping, response } = {}) {
      this.target = target;
      if (velocity != null) this.velocity = velocity;
      if (damping != null) this.damping = damping;
      if (response != null) this.response = response;
      if (reduced()) return this.jump(target);
      if (!this._unsub) this._unsub = raf(this._tick.bind(this));
      return this;
    }
    jump(v) {
      this.value = this.target = v; this.velocity = 0;
      this.onUpdate?.(this.value, this);
      this._stop();
      this.onRest?.(this.value, this);
      return this;
    }
    stop() { this._stop(); return this; }
    _stop() { if (this._unsub) { this._unsub(); this._unsub = null; } }
    _tick(dt) {
      // semi-implicit Euler in fixed substeps for stability
      const w = (2 * Math.PI) / Math.max(0.02, this.response);
      const k = w * w, c = 2 * this.damping * w;
      let steps = Math.ceil(dt / (1 / 240)), h = dt / steps;
      for (let i = 0; i < steps; i++) {
        const a = -k * (this.value - this.target) - c * this.velocity;
        this.velocity += a * h;
        this.value += this.velocity * h;
      }
      const done = Math.abs(this.velocity) < this.restSpeed && Math.abs(this.value - this.target) < this.restDelta;
      if (done) { this.value = this.target; this.velocity = 0; }
      this.onUpdate?.(this.value, this);
      if (done) { this._stop(); this.onRest?.(this.value, this); }
    }
  }

  // ---------- helpers ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // Apple's momentum projection (exponential decay), velocity in px/s → distance in px
  const project = (velocity, decel = 0.998) => (velocity / 1000) * decel / (1 - decel);
  // progressive resistance past a boundary
  const rubberband = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));

  function els(target, root = document) {
    if (!target) return [];
    if (typeof target === 'string') return Array.from(root.querySelectorAll(target));
    if (target instanceof Element) return [target];
    return Array.from(target);
  }

  // ---------- scroll reveal ----------
  function reveal(target, { rootMargin = '0px 0px -12% 0px', threshold = 0.1, stagger = 70, once = true, className = 'is-in' } = {}) {
    const items = els(target);
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add(className)); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const el = en.target;
          const kids = el.hasAttribute('data-stagger') ? Array.from(el.children) : [];
          kids.forEach((k, i) => k.style.setProperty('--d', `${i * stagger}ms`));
          el.classList.add(className);
          if (once) io.unobserve(el);
        } else if (!once) {
          en.target.classList.remove(className);
        }
      });
    }, { rootMargin, threshold });
    items.forEach((el) => io.observe(el));
    return io;
  }

  // ---------- magnetic (spring-follow toward pointer) ----------
  function magnetic(target, { strength = 0.35, radius = 110, response = 0.35 } = {}) {
    els(target).forEach((el) => {
      if (reduced() || !window.matchMedia('(hover:hover)').matches) return;
      const sx = new Spring({ response, onUpdate: apply });
      const sy = new Spring({ response, onUpdate: apply });
      function apply() { el.style.translate = `${sx.value.toFixed(2)}px ${sy.value.toFixed(2)}px`; }
      function move(e) {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy);
        if (d < radius) { sx.set(dx * strength); sy.set(dy * strength); }
        else { sx.set(0); sy.set(0); }
      }
      const zone = el.closest('[data-magnet-zone]') || el.parentElement;
      zone.addEventListener('pointermove', move);
      zone.addEventListener('pointerleave', () => { sx.set(0, { damping: 0.8 }); sy.set(0, { damping: 0.8 }); });
    });
  }

  // ---------- 3-D tilt with springs; writes --rx --ry --gx --gy on the element ----------
  function tilt(target, { max = 10, response = 0.45, glare = true } = {}) {
    els(target).forEach((el) => {
      if (reduced() || !window.matchMedia('(hover:hover)').matches) return;
      const rx = new Spring({ response, onUpdate: apply });
      const ry = new Spring({ response, onUpdate: apply });
      const gx = new Spring({ value: 50, response, onUpdate: apply });
      const gy = new Spring({ value: 50, response, onUpdate: apply });
      function apply() {
        el.style.setProperty('--rx', `${rx.value.toFixed(2)}deg`);
        el.style.setProperty('--ry', `${ry.value.toFixed(2)}deg`);
        if (glare) { el.style.setProperty('--gx', `${gx.value.toFixed(1)}%`); el.style.setProperty('--gy', `${gy.value.toFixed(1)}%`); }
      }
      const zone = el.closest('[data-tilt-zone]') || el;
      zone.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = clamp((e.clientX - r.left) / r.width, -0.5, 1.5), py = clamp((e.clientY - r.top) / r.height, -0.5, 1.5);
        rx.set(-(py - 0.5) * max * 2); ry.set((px - 0.5) * max * 2);
        gx.set(px * 100); gy.set(py * 100);
      });
      zone.addEventListener('pointerleave', () => { rx.set(0); ry.set(0); gx.set(50); gy.set(50); });
    });
  }

  // ---------- press feedback: on pointer-down, not on release ----------
  function pressable(target, { scale = 0.97, down = 0.12, up = 0.4, upDamping = 0.85 } = {}) {
    els(target).forEach((el) => {
      const s = new Spring({ value: 1, onUpdate: (v) => { el.style.scale = v === 1 ? '' : v.toFixed(4); } });
      let isDown = false;
      el.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; isDown = true; s.set(scale, { response: down, damping: 1 }); });
      const release = () => { if (!isDown) return; isDown = false; s.set(1, { response: up, damping: upDamping }); };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('pointerleave', release);
      el.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { isDown = true; s.set(scale, { response: down }); } });
      el.addEventListener('keyup', release);
      el.addEventListener('blur', release);
    });
  }

  // ---------- copy an email with visible feedback ----------
  function copyEmail(button, email, { duration = 1600, liveRegion = true } = {}) {
    if (!button) return;
    let live = null;
    if (liveRegion) {
      live = document.createElement('span');
      live.setAttribute('aria-live', 'polite');
      live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;';
      button.appendChild(live);
    }
    let t;
    button.addEventListener('click', async () => {
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(email);
        else {
          const ta = document.createElement('textarea'); ta.value = email; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        }
        button.classList.add('is-copied');
        if (live) live.textContent = 'Email address copied';
        clearTimeout(t);
        t = setTimeout(() => { button.classList.remove('is-copied'); if (live) live.textContent = ''; }, duration);
      } catch { window.location.href = `mailto:${email}`; }
    });
  }

  // ---------- pointer drag with velocity tracking ----------
  function pointerDrag(el, { threshold = 4, onStart, onMove, onEnd, axis } = {}) {
    let id = null, sx = 0, sy = 0, lx = 0, ly = 0, active = false, hist = [];
    const push = (x, y) => { const t = performance.now(); hist.push({ x, y, t }); while (hist.length && t - hist[0].t > 100) hist.shift(); };
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      id = e.pointerId; sx = lx = e.clientX; sy = ly = e.clientY; active = false; hist = []; push(sx, sy);
      el.setPointerCapture?.(id);
    });
    el.addEventListener('pointermove', (e) => {
      if (id !== e.pointerId) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!active) {
        if (Math.hypot(dx, dy) < threshold) return;
        if (axis === 'x' && Math.abs(dy) > Math.abs(dx)) { id = null; return; }
        if (axis === 'y' && Math.abs(dx) > Math.abs(dy)) { id = null; return; }
        active = true; onStart?.(e);
      }
      push(e.clientX, e.clientY);
      onMove?.(dx, dy, e, e.clientX - lx, e.clientY - ly);
      lx = e.clientX; ly = e.clientY;
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      if (id !== e.pointerId) return;
      const wasActive = active; id = null; active = false;
      if (!wasActive) return;
      let vx = 0, vy = 0;
      if (hist.length > 1) {
        const a = hist[0], b = hist[hist.length - 1], dt = (b.t - a.t) / 1000 || 0.016;
        vx = (b.x - a.x) / dt; vy = (b.y - a.y) / dt;
      }
      onEnd?.(vx, vy, e.clientX - sx, e.clientY - sy, e);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    return { isActive: () => active };
  }

  // ---------- nav scroll-spy: toggles is-active on links whose hash matches the section in view ----------
  function spy(links, { offset = 0.35 } = {}) {
    const items = els(links).map((a) => ({ a, sec: document.querySelector(a.getAttribute('href')) })).filter((x) => x.sec);
    if (!items.length) return;
    let ticking = false;
    function update() {
      ticking = false;
      const y = window.innerHeight * offset;
      let current = null;
      for (const it of items) { if (it.sec.getBoundingClientRect().top <= y) current = it; }
      items.forEach((it) => it.a.classList.toggle('is-active', it === current));
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // ---------- coalesced scroll listener ----------
  function onScroll(fn) {
    let ticking = false;
    const h = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; fn(window.scrollY); }); } };
    window.addEventListener('scroll', h, { passive: true });
    fn(window.scrollY);
    return () => window.removeEventListener('scroll', h);
  }

  // ---------- split words for masked reveals ----------
  function splitWords(target, { wrap = 'w', inner = 'wi' } = {}) {
    els(target).forEach((el) => {
      if (el.dataset.split) return;
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach((wd, i) => {
        const o = document.createElement('span'); o.className = wrap; o.style.setProperty('--i', i);
        const n = document.createElement('span'); n.className = inner; n.textContent = wd;
        o.appendChild(n); el.appendChild(o);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
      el.dataset.split = '1';
    });
  }


  // ---------- specular: pointer-following light; writes --sx/--sy in px relative to the element ----------
  function specular(target, { response = 0.7, home = [0.5, 0.35] } = {}) {
    els(target).forEach((el) => {
      const set = (x, y) => { el.style.setProperty('--sx', `${x.toFixed(1)}px`); el.style.setProperty('--sy', `${y.toFixed(1)}px`); };
      const r0 = el.getBoundingClientRect();
      if (reduced() || !window.matchMedia('(hover:hover)').matches) { set(r0.width * home[0], r0.height * home[1]); return; }
      const sx = new Spring({ value: r0.width * home[0], response, onUpdate: apply });
      const sy = new Spring({ value: r0.height * home[1], response, onUpdate: apply });
      function apply() { set(sx.value, sy.value); }
      apply();
      window.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); sx.set(e.clientX - r.left, { response }); sy.set(e.clientY - r.top, { response }); }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => { const r = el.getBoundingClientRect(); sx.set(r.width * home[0], { response: 1.6 }); sy.set(r.height * home[1], { response: 1.6 }); });
    });
  }

  // ---------- parallax: elements with data-parallax="factor" drift with scroll (positive = faster than the page) ----------
  function parallax(target = '[data-parallax]', { response = 0.6 } = {}) {
    const items = els(target);
    if (!items.length || reduced()) return;
    const entries = items.map((el) => ({ el, f: parseFloat(el.dataset.parallax) || 0.2, cur: 0, anchor: 0,
      s: new Spring({ response, onUpdate: (v) => { en_set(el, v); } }) }));
    const map = new Map(entries.map((en) => [en.el, en]));
    function en_set(el, v) { const en = map.get(el); en.cur = v; el.style.translate = `0 ${v.toFixed(1)}px`; }
    // rest position = where the element sits when it first becomes visible: no offset at load, no shift before it enters
    const measure = () => entries.forEach((en) => { const r = en.el.getBoundingClientRect(); en.anchor = Math.max(0, r.top - en.cur + window.scrollY - window.innerHeight); });
    measure();
    window.addEventListener('resize', measure);
    onScroll((y) => entries.forEach((en) => { const d = clamp(y - en.anchor, 0, window.innerHeight * 2.5); en.s.set(-d * en.f); }));
    return { measure };
  }

  // ---------- rail: which entry sits at the reading line; onChange(el, index) when it changes ----------
  function rail(target, { line = 0.38, onChange } = {}) {
    const items = els(target);
    if (!items.length) return null;
    let current = -1;
    const update = () => {
      const y = window.innerHeight * line; let idx = 0;
      for (let i = 0; i < items.length; i++) { if (items[i].getBoundingClientRect().top <= y) idx = i; }
      if (idx !== current) { current = idx; onChange?.(items[idx], idx); }
    };
    onScroll(update); window.addEventListener('resize', update);
    return { update, items, get index() { return current; } };
  }

  window.Motion = { Spring, raf, reduced, clamp, lerp, project, rubberband, reveal, magnetic, tilt, pressable, copyEmail, pointerDrag, spy, onScroll, splitWords, specular, parallax, rail };
})();
