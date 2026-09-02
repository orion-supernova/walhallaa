/* legal.js — table of contents, scroll spy and the bar's scrolled state.
   The documents themselves are static HTML; this only adds navigation. */
(function () {
  'use strict';
  const doc = document.getElementById('doc');
  const tocNav = document.getElementById('toc');
  const bar = document.getElementById('bar');

  // ---------- bar ----------
  let ticking = false;
  const onScroll = (fn) => {
    const run = () => { ticking = false; fn(window.scrollY || 0); };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  };

  if (!doc || !tocNav) { if (bar) onScroll((y) => bar.classList.toggle('is-scrolled', y > 8)); return; }

  // ---------- build the contents from the document's own headings ----------
  const slug = (s) => s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60) || 'section';
  const used = new Set();
  const heads = Array.from(doc.querySelectorAll('h2, h3'));
  const links = [];

  heads.forEach((h) => {
    if (!h.id) {
      let s = slug(h.textContent); let n = 2;
      while (used.has(s)) s = slug(h.textContent) + '-' + n++;
      h.id = s;
    }
    used.add(h.id);
    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent.trim();
    a.className = h.tagName === 'H3' ? 'lvl-3' : 'lvl-2';
    tocNav.appendChild(a);
    links.push({ a, h });
  });

  if (!links.length) { document.querySelector('.toc')?.remove(); document.querySelector('.doc-wrap')?.style.setProperty('grid-template-columns', 'minmax(0, 1fr)'); }

  // ---------- which heading am I reading ----------
  let current = null;
  const mark = () => {
    const line = window.innerHeight * 0.28;
    let found = links[0];
    for (const l of links) { if (l.h.getBoundingClientRect().top <= line) found = l; }
    if (found === current) return;
    current?.a.classList.remove('is-here');
    current = found;
    current?.a.classList.add('is-here');
    // keep the active item visible in a long contents list
    const box = document.querySelector('.toc');
    if (box && current && box.scrollHeight > box.clientHeight) {
      const r = current.a.getBoundingClientRect(), b = box.getBoundingClientRect();
      if (r.top < b.top + 8 || r.bottom > b.bottom - 8) current.a.scrollIntoView({ block: 'nearest' });
    }
  };

  onScroll((y) => { bar?.classList.toggle('is-scrolled', y > 8); mark(); });
  window.addEventListener('resize', mark);
})();
