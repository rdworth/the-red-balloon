/* The last shot of scene 1 (Pascal under the lamppost, looking up at the
   red balloon) redrawn as a colored pencil drawing: every shape is filled
   with dense, directional pencil strokes and ringed with a bold dark outline,
   on white paper. Everything is generated here; there are no image files.

   renderPencilShot(canvas, seed) draws into any canvas (the output keeps a
   1040 x 620 design space). A different seed is a fresh pass of the pencil. */
(function () {
  const W = 1040, H = 620, M = 40;          // design units, panel margin
  const PW = 960, PH = 540;                 // the drawn panel

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  function renderPencilShot(canvas, seed = 7) {
    const R = rng(seed);
    const rand = (a, b) => a + (b - a) * R();
    const gauss = () => (R() + R() + R() - 1.5) / 1.5;
    const K = canvas.width / W;
    canvas.height = Math.round(H * K);

    // pigment goes on its own layer so the paper tooth can knock specks out of it
    const pig = document.createElement('canvas');
    pig.width = canvas.width; pig.height = canvas.height;
    const g = pig.getContext('2d');
    g.setTransform(K, 0, 0, K, M * K, M * K);
    g.lineCap = 'round';

    /* ---- shapes: hand-wobbled polygons ---- */
    const wob = (pts, a = .8) => pts.map(([x, y]) => [x + gauss() * a, y + gauss() * a]);
    const densify = (pts, step = 6) => {
      const out = [];
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / step));
        for (let k = 0; k < n; k++) out.push([p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n]);
      });
      return out;
    };
    const rect = (x, y, w, h, a = .8) => wob(densify([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], 14), a);
    const ell = (cx, cy, rx, ry, a = .5, n) => {
      n = n || Math.max(16, Math.round((rx + ry) * .7));
      const ph = R() * 6.28;
      return Array.from({ length: n }, (_, i) => { const t = i / n * Math.PI * 2, r = 1 + Math.sin(t * 3 + ph) * .015; return [cx + Math.cos(t) * rx * r + gauss() * a, cy + Math.sin(t) * ry * r + gauss() * a]; });
    };
    const poly = (pts, a = .6) => wob(densify(pts, 10), a);
    const path = pts => { const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; };
    const bbox = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };

    /* one pencil mark: a slightly bowed line with jittered pressure */
    function mark(x, y, ang, len, w, col, alpha) {
      const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2, bow = gauss() * len * .06;
      g.strokeStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${alpha})`;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x - dx, y - dy);
      g.quadraticCurveTo(x - dy / len * 2 * bow, y + dx / len * 2 * bow, x + dx, y + dy);
      g.stroke();
    }

    /* fill a shape with directional strokes. o.angle (deg) or o.flow(x,y) sets
       direction; o.shade darkens toward o.dir; o.accent sprinkles a second hue */
    function fill(pts, color, o = {}) {
      const p = path(pts), [x0, y0, x1, y1] = bbox(pts);
      const base = hex(color), dark = hex(o.shade || color), acc = o.accent && hex(o.accent);
      const dir = o.dir || [.4, 1], dl = Math.hypot(...dir), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const ext = (Math.abs(dir[0]) * (x1 - x0) + Math.abs(dir[1]) * (y1 - y0)) / dl / 2 || 1;
      const len = o.len || 11, w = o.w || .62, dens = o.density || 1;
      g.save();
      g.clip(p);
      // clear what's underneath so the front shape reads clean
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fill(p);
      g.globalCompositeOperation = 'source-over';
      const n = Math.round((x1 - x0 + len) * (y1 - y0 + len) / (len * w) * 4.2 * dens);
      const baseAng = (o.angle ?? 75) * Math.PI / 180;
      for (let i = 0; i < n; i++) {
        const x = rand(x0 - len / 2, x1 + len / 2), y = rand(y0 - len / 2, y1 + len / 2);
        if (o.skip && o.skip(x, y, R)) continue;
        const ang = (o.flow ? o.flow(x, y) : baseAng) + gauss() * .16;
        const t = Math.max(0, Math.min(1, ((x - cx) * dir[0] + (y - cy) * dir[1]) / dl / ext * .5 + .5));
        let col = mix(base, dark, Math.pow(t, 1.6) * (o.shadeAmt ?? .75) + gauss() * .12);
        if (acc && R() < (o.accentP || .07)) col = acc;
        col = col.map(v => Math.max(0, Math.min(255, v + gauss() * 10)));
        mark(x, y, ang, len * rand(.6, 1.35), w * rand(.75, 1.25), col, rand(.5, .9) * (o.alpha || 1));
      }
      g.restore();
    }

    /* strokes that run along a contour: short pieces of the line itself, each
       nudged sideways, so they hug corners instead of overshooting them */
    function contour(line, closed, col, o) {
      const n = line.length, at = i => closed ? line[((i % n) + n) % n] : line[Math.max(0, Math.min(n - 1, i))];
      for (let pass = 0; pass < o.passes; pass++) {
        for (let i = closed ? 0 : 0; i < (closed ? n : n - 1); i += 2) {
          const k = 2 + Math.floor(R() * 4), off = o.off();
          const a = at(i - 1), b = at(i + k + 1), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
          const nx = -Math.sin(ang) * off, ny = Math.cos(ang) * off;
          const c = col.map(v => Math.max(0, Math.min(255, v + gauss() * 8)));
          g.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${rand(o.a0, o.a1)})`;
          g.lineWidth = rand(o.w0, o.w1);
          g.beginPath();
          for (let j = 0; j <= k; j++) { const q = at(i + j); if (!closed && i + j > n - 1) break; j ? g.lineTo(q[0] + nx, q[1] + ny) : g.moveTo(q[0] + nx, q[1] + ny); }
          g.stroke();
        }
      }
    }
    /* the bold outline */
    function outline(pts, o = {}) {
      const col = hex(o.color || '#1d1719'), wt = o.w ?? 2.2, closed = o.closed !== false;
      const line = densify(closed ? pts : pts.slice(0, -1), 2.2);
      if (!closed) line.push(pts[pts.length - 1]);
      contour(line, closed, col, { passes: Math.round(wt * 1.6) + 1, off: () => gauss() * wt * .42, w0: .55, w1: .95, a0: .55, a1: .9 });
    }
    /* a band of the shade colour just inside the edge, like the reference's
       pressed-down rims */
    function rim(pts, color, width) {
      let area = 0;
      pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; area += p[0] * q[1] - q[0] * p[1]; });
      const inward = area > 0 ? 1 : -1;
      g.save(); g.clip(path(pts));
      contour(densify(pts, 2.4), true, hex(color), { passes: 3, off: () => inward * Math.abs(gauss()) * width, w0: .5, w1: .9, a0: .2, a1: .5 });
      g.restore();
    }
    const shape = (pts, color, o = {}, ol = {}) => { fill(pts, color, o); if (o.rim !== 0) rim(pts, o.shade || color, o.rim || 3.5); if (ol !== false) outline(pts, ol); return pts; };
    // a pencil line that isn't a shape (the balloon string, cobble seams)
    function line(pts, o = {}) { outline(pts, { closed: false, ...o }); }

    /* ================= the scene ================= */
    const C = {
      apricot: '#f0ae6c', apricotD: '#c46f36',
      sand: '#f6d58f', sandD: '#d99a4a',
      cream: '#f7e6b8', creamD: '#d8b477',
      blue: '#2552c4', blueD: '#132d7a',
      lit: '#ffd21f', litD: '#f08a0c',
      green: '#1f8a4c', greenD: '#0d4d2a',
      red: '#e8261b', redD: '#95100c',
      coat: '#2f78e0', coatD: '#173f9c',
      skin: '#f7b890', skinD: '#dd7b5c',
      hair: '#8a4a1f', hairD: '#4f2410',
      door: '#8e4b22', doorD: '#4f230c',
      stone: '#b9b2d6', stoneD: '#7b6fa8',
    };
    const vert = { angle: 82 }, diag = { angle: 62 };

    function windows(cols, rows, w, h, colSkin, lit, shutter) {
      for (const y of rows) for (const x of cols) {
        const on = lit.some(([lx, ly]) => Math.abs(lx - x) < 5 && Math.abs(ly - y) < 5);
        shape(rect(x - 1, y, w, h, .6), on ? C.lit : C.blue, { ...diag, shade: on ? C.litD : C.blueD, dir: [1, 1], len: 7, w: .55, density: 1.3, accent: on ? '#ffffff' : '#5a8ce8', accentP: .05 }, { w: 1.6 });
        if (shutter) {
          shape(rect(x - 7, y + 1, 4, h - 2, .4), shutter, { angle: 90, len: 5, w: .5, density: 1.2 }, { w: .9 });
          shape(rect(x + w + 2, y + 1, 4, h - 2, .4), shutter, { angle: 90, len: 5, w: .5, density: 1.2 }, { w: .9 });
        }
      }
    }

    // the left block, with its balcony ledge
    shape(rect(-12, -12, 336, 507, 1), C.apricot, { ...vert, shade: C.apricotD, dir: [1, .3], accent: '#e8584a' }, { w: 2.4 });
    windows([20, 75, 130, 185, 240, 295], [18, 80, 210, 275, 340], 24, 27, C.apricot, [[295, 18], [185, 80], [240, 80], [75, 340], [130, 340], [185, 340]], '#2f9e6a');
    windows([20, 75, 130, 185, 240, 295], [136], 24, 27, C.apricot, [[295, 136]], null);
    shape(rect(-10, 168, 332, 9, .5), C.cream, { angle: 4, shade: C.creamD, len: 9 }, { w: 1.6 });
    // the wrought-iron railing
    line([[-6, 138], [322, 138]], { w: 1.5 });
    line([[-6, 162], [322, 162]], { w: 1.2 });
    for (let x = 0; x < 320; x += 9) line([[x + gauss() * .6, 138], [x + gauss() * .6, 168]], { w: .8 });
    shape(rect(65, 446, 29, 46, .6), C.door, { angle: 88, shade: C.doorD, dir: [1, 0], len: 8 }, { w: 2 });

    // the lamppost's block
    shape(rect(322, -12, 540, 507, 1), C.sand, { ...vert, angle: 78, shade: C.sandD, dir: [.2, 1], accent: '#f28a3c' }, { w: 2.4 });
    windows([365, 455, 545, 635, 725, 815], [18, 80, 145, 210, 275, 340], 24, 27, C.sand, [[545, 18], [635, 18], [815, 145]], '#9a4fc0');
    shape(rect(580, 440, 30, 52, .6), C.door, { angle: 88, shade: C.doorD, dir: [1, 0], len: 8 }, { w: 2 });

    // the pale block on the right
    shape(rect(862, -12, 112, 507, 1), C.cream, { ...vert, angle: 86, shade: C.creamD, dir: [-1, .4], accent: '#9cc3e8' }, { w: 2.4 });
    windows([893, 945], [42, 105, 170, 235, 300, 365], 24, 27, C.cream, [[893, 235]], '#2f9e6a');

    // pavement and cobbles
    shape(rect(-12, 490, 984, 62, 1), C.stone, { angle: 8, shade: C.stoneD, dir: [0, 1], len: 13, accent: '#e0a8c8' }, { w: 2.4 });
    for (let x = -10; x < 970; x += 22) {
      const y = 522 + (x / 22 % 2 ? 8 : 0);
      line([[x, y + 3], [x + 3, y], [x + 9, y - 2], [x + 15, y], [x + 18, y + 3]], { w: .9, color: '#4c4270' });
    }
    line([[-8, 499], [970, 499]], { w: .9, color: '#fbf7ee' });

    // lamppost
    const LP = 488;
    shape(poly([[LP - 22, 494], [LP - 16, 470], [LP - 9, 458], [LP - 7, 436], [LP + 7, 436], [LP + 9, 458], [LP + 16, 470], [LP + 22, 494]]), C.green, { angle: 90, shade: C.greenD, dir: [1, 0], len: 8 }, { w: 2.2 });
    shape(poly([[LP - 6, 120], [LP + 6, 120], [LP + 7, 436], [LP - 7, 436]], .4), C.green, { angle: 90, shade: C.greenD, dir: [1, 0], len: 10 }, { w: 2.2 });
    shape(poly([[LP - 11, 262], [LP + 11, 262], [LP + 11, 272], [LP - 11, 272]], .3), C.green, { angle: 0, shade: C.greenD, len: 6 }, { w: 1.6 });
    // the lamplighter's bar the string is caught on, with curled ends
    shape(poly([[LP - 58, 145], [LP + 54, 145], [LP + 54, 154], [LP - 58, 154]], .3), C.green, { angle: 2, shade: C.greenD, dir: [0, 1], len: 10 }, { w: 2 });
    line([[LP - 58, 150], [LP - 64, 146], [LP - 64, 140], [LP - 58, 139]], { w: 1.8, color: '#0d3a20' });
    line([[LP + 54, 150], [LP + 60, 155], [LP + 60, 161], [LP + 54, 162]], { w: 1.8, color: '#0d3a20' });
    // lantern
    shape(poly([[LP - 22, 64], [LP + 22, 64], [LP + 16, 120], [LP - 16, 120]], .4), C.lit, { angle: 90, shade: C.litD, dir: [1, .5], len: 8, accent: '#fff6c2', accentP: .12 }, { w: 2.2 });
    line([[LP, 66], [LP, 118]], { w: 1.1 });
    shape(poly([[LP - 26, 64], [LP, 40], [LP + 26, 64]], .4), C.green, { angle: 30, shade: C.greenD, len: 7 }, { w: 2 });
    shape(ell(LP, 36, 5, 5, .3), C.green, { angle: 60, len: 4 }, { w: 1.4 });

    // the balloon's string: taut from the knot to the bar, then the loose end hangs
    line([[571, 101], [566, 118], [558, 136], [548, 148]], { w: 1.3 });
    line([[547, 151], [546, 200], [545, 280], [547, 360], [544, 430]], { w: 1.1 });

    // the balloon: strokes wrap around it, darker toward the lower right
    const BX = 580, BY = 58;
    shape(poly([[BX - 10, 96], [BX - 4, 103], [BX - 14, 104]], .3), C.red, { angle: 0, shade: C.redD, len: 5 }, { w: 1.4 });
    shape(ell(BX, BY, 38, 41, .4, 56), C.red, {
      flow: (x, y) => { const d = Math.min(1, Math.hypot(x - BX, y - BY) / 38), tan = Math.atan2(y - BY, x - BX) + Math.PI / 2; const u = Math.max(0, (d - .55) / .45); let t = tan - 1.0; t = Math.atan2(Math.sin(t), Math.cos(t)); return 1.0 + t * u; },
      shade: C.redD, dir: [.7, 1], shadeAmt: .95, len: 10, density: 1.25, accent: '#ff6a3d', accentP: .06,
      skip: (x, y, r) => { const d = Math.hypot((x - (BX - 14)) / 12, (y - (BY - 18)) / 8); return d < 1.2 && r() < 1.3 - d * .9; },
    }, { w: 2.6 });

    // the shine: paper left bare, feathered in with a few strokes
    g.save(); g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 260; i++) {
      const a = R() * 6.28, r = Math.sqrt(R());
      mark(BX - 14 + Math.cos(a) * r * 10, BY - 18 + Math.sin(a) * r * 6, .95 + gauss() * .15, rand(4, 8), rand(.6, 1), [0, 0, 0], rand(.3, .7) * (1.2 - r));
    }
    g.restore();

    // Pascal, looking up at it
    const PX = 412;
    // legs and socks, shoes
    shape(rect(PX - 6, 446, 7, 56, .4), '#9aa7b8', { angle: 90, shade: '#5d6b80', dir: [1, 0], len: 6 }, { w: 1.6 });
    shape(rect(PX + 6, 446, 7, 54, .4), '#9aa7b8', { angle: 90, shade: '#5d6b80', dir: [1, 0], len: 6 }, { w: 1.6 });
    shape(poly([[PX - 12, 500], [PX + 3, 498], [PX + 9, 506], [PX + 4, 512], [PX - 12, 512]], .3), '#2a2328', { angle: 10, shade: '#0c0a0c', len: 6 }, { w: 1.8 });
    shape(poly([[PX + 3, 498], [PX + 18, 497], [PX + 28, 506], [PX + 26, 513], [PX + 3, 513]], .3), '#2a2328', { angle: 10, shade: '#0c0a0c', len: 6 }, { w: 1.8 });
    // satchel on his back
    shape(poly([[PX - 38, 394], [PX - 20, 392], [PX - 18, 426], [PX - 38, 428]], .4), C.door, { angle: 85, shade: C.doorD, len: 7, accent: '#d08a45' }, { w: 1.8 });
    // coat
    shape(poly([[PX - 22, 356], [PX + 20, 356], [PX + 26, 380], [PX + 34, 450], [PX - 28, 452], [PX - 22, 400]], .6), C.coat, { angle: 95, shade: C.coatD, dir: [1, .2], len: 11, accent: '#7fb2ff' }, { w: 2.4 });
    line([[PX + 4, 358], [PX + 7, 450]], { w: .9 });
    for (const y of [376, 398, 420]) shape(ell(PX + 13, y, 3, 3, .2, 12), '#1d1719', { angle: 40, len: 3 }, { w: .8 });
    // sleeve and hand
    shape(poly([[PX + 12, 362], [PX + 24, 364], [PX + 30, 420], [PX + 20, 422]], .4), C.coat, { angle: 100, shade: C.coatD, len: 9 }, { w: 2 });
    shape(ell(PX + 26, 428, 6, 7, .3), C.skin, { angle: 70, shade: C.skinD, len: 5 }, { w: 1.6 });
    // collar
    shape(poly([[PX - 14, 352], [PX + 16, 352], [PX + 6, 364], [PX - 4, 364]], .3), C.coatD, { angle: 20, len: 6 }, { w: 1.6 });
    // head tipped back
    shape(ell(PX, 328, 22, 24, .4, 36), C.skin, { angle: 70, shade: C.skinD, dir: [-.5, 1], len: 8, accent: '#ef7a6a', accentP: .1 }, { w: 2.4 });
    shape(poly([[PX - 23, 330], [PX - 22, 312], [PX - 12, 303], [PX + 4, 302], [PX + 18, 308], [PX + 22, 316], [PX + 6, 314], [PX - 6, 318], [PX - 12, 330], [PX - 17, 338]], .5), C.hair, { angle: 30, shade: C.hairD, dir: [-1, 0], len: 8 }, { w: 2.2 });
    shape(ell(PX - 12, 333, 4, 5.5, .3, 14), C.skin, { angle: 80, shade: C.skinD, len: 4 }, { w: 1.3 });
    shape(ell(PX + 11, 322, 2.6, 3.4, .2, 12), '#1d1719', { angle: 60, len: 3, density: 2 }, { w: .7 });
    shape(ell(PX + 18, 341, 2.4, 3, .2, 12), '#6e1616', { angle: 60, len: 3, density: 2, rim: 0 }, { w: .9 });
    fill(ell(PX + 6, 335, 4.5, 3, .2, 12), '#f2665a', { angle: 20, len: 4, alpha: .6 });

    /* ---- paper tooth: specks of white the pencil skipped over ---- */
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    const specks = Math.round(pig.width * pig.height / 140);
    for (let i = 0; i < specks; i++) {
      g.fillStyle = `rgba(0,0,0,${rand(.25, .75)})`;
      const x = R() * pig.width, y = R() * pig.height;
      g.fillRect(x, y, rand(.6, 2.2) * K * .5, rand(.5, 1.2) * K * .5);
    }
    g.globalCompositeOperation = 'source-over';

    /* ---- composite onto white drawing paper ---- */
    const c = canvas.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#fbf9f4';
    c.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < canvas.width * canvas.height / 400; i++) {
      c.fillStyle = R() < .5 ? 'rgba(120,110,95,.05)' : 'rgba(255,255,255,.5)';
      c.fillRect(R() * canvas.width, R() * canvas.height, K * rand(.4, 1.4), K * rand(.4, 1.4));
    }
    // the drawing stops at a hand-drawn border, leaving a white margin
    const border = rect(0, 0, PW, PH, 1.4);
    c.save();
    c.setTransform(K, 0, 0, K, M * K, M * K);
    c.clip(path(border));
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(pig, 0, 0);
    c.restore();
    g.clearRect(0, 0, pig.width, pig.height);
    g.setTransform(K, 0, 0, K, M * K, M * K);
    outline(border, { w: 3.2 });
    c.drawImage(pig, 0, 0);
  }

  window.renderPencilShot = renderPencilShot;
})();
