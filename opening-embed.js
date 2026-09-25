// Embed mode for the opening pages, used by opening-gallery.html.
//
// Each opening loads this in its <head>. It does nothing unless the page's URL
// has ?embed, so the pages behave exactly as before when opened on their own.
// In embed mode it:
//   - shows only the picture (no header, controls, shot list or corner tape),
//   - keeps the page silent (the gallery plays the one waltz for everyone),
//   - takes { type: 'seek', t } messages from the parent page and draws that frame,
//   - tells the parent its height and when its pieces are ready.
// It talks to the parent with postMessage, so it works even when the gallery
// can't reach into its frames (a sandboxed host gives each frame its own origin).
(function () {
  'use strict';
  if (!/[?&]embed\b/.test(location.search) || window.parent === window) return;

  const root = document.documentElement;
  root.classList.add('embed');
  const style = document.createElement('style');
  style.textContent = `
    html.embed, html.embed body { background: transparent !important; background-image: none !important; overflow: hidden !important; }
    html.embed body { margin: 0 !important; padding: 12px 10px 14px !important; min-height: 0 !important; }
    html.embed .wrap { max-width: none !important; margin: 0 !important; gap: 0 !important; padding: 0 !important; }
    html.embed .wrap > :not(.screen) { display: none !important; }
    html.embed canvas { cursor: default !important; }
    html.embed .tape { display: none !important; }`;
  (document.head || root).appendChild(style);

  // No music in embed mode: the page keeps the waltz's cue times for its animation, but its own
  // player never loads, renders or plays the samples.
  let theme;
  Object.defineProperty(window, 'OpeningThemeSampled', {
    configurable: true,
    get() { return theme && Object.assign(Object.create(theme), { load: () => new Promise(() => {}), render: () => new Promise(() => {}), play: () => ({ stop() {} }) }); },
    set(v) { theme = v; },
  });

  const post = msg => window.parent.postMessage(Object.assign({ source: 'red-balloon-opening' }, msg), '*');
  const scene = () => window.openingScene || window.opening3dScene || window.clayScene || window.pixelScene || null;
  const isReady = s => {
    if (!s) return false;
    if (typeof s.ready === 'boolean') return s.ready;
    const l = document.getElementById('loading');
    return !l || l.hidden;
  };

  let wanted = 0, ready = false;
  function draw() {
    const s = scene();
    if (!s) return;
    if (Math.round(s.time * s.fps) !== Math.round(wanted * s.fps)) s.seek(wanted, false);
  }
  window.addEventListener('message', e => {
    if (e.source !== window.parent || !e.data || e.data.type !== 'seek' || typeof e.data.t !== 'number') return;
    wanted = e.data.t;
    draw();
  });

  document.addEventListener('DOMContentLoaded', () => {
    const screen = document.querySelector('.screen');
    // measure the picture, not the body: these pages have no doctype, so the body stretches to the frame
    const size = () => { if (screen) post({ type: 'size', height: Math.ceil(screen.getBoundingClientRect().bottom + 14) }); };
    size();
    if (screen && window.ResizeObserver) new ResizeObserver(size).observe(screen);
    post({ type: 'hello' });
    // the pieces finish at their own pace, and each page jumps to its own start frame when they do
    const watch = setInterval(() => {
      if (!isReady(scene())) return;
      clearInterval(watch);
      ready = true;
      draw();
      post({ type: 'ready' });
    }, 100);
    // keep pulling the page back to the gallery's frame in case it moved itself
    setInterval(() => { if (ready) draw(); }, 500);
  });
})();
