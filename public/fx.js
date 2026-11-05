// Fundos de efeito (Canvas 2D, sem dependências): Lightfall, Grid Hole, Ink Flow Field e Parallax vertical.
// Recriados do zero a partir do nome/ideia do efeito (as páginas originais não estavam acessíveis). Controles: cores, velocidade, intensidade.
// ~30 fps, meia resolução, pausa com a aba oculta; parado com "fundo animado" desligado ou movimento reduzido.
(() => {
  const PRESETS = {
    neon:  { fxBg: '#05060f', fxC1: '#7c9cff', fxC2: '#ff5fd2' },
    ambar: { fxBg: '#0c0703', fxC1: '#ffb347', fxC2: '#ff5a36' },
    gelo:  { fxBg: '#f3f8fb', fxC1: '#2b6cb0', fxC2: '#0e9aa7' },
    mono:  { fxBg: '#0a0a0a', fxC1: '#f4f4f5', fxC2: '#71717a' },
  };
  const AUTO = {
    chuvaluz: ['lightfall', { fxBg: '#f4f7fb', fxC1: '#2b5fd9', fxC2: '#0e9aa7' }, { fxBg: '#04050d', fxC1: '#7c9cff', fxC2: '#ff5fd2' }],
    singular: ['gridhole', { fxBg: '#f6f3ee', fxC1: '#3a3a46', fxC2: '#d2461e' }, { fxBg: '#030308', fxC1: '#6d7dff', fxC2: '#ff7a1a' }],
    nanquim: ['ink', { fxBg: '#f4efe6', fxC1: '#1b2a41', fxC2: '#b4432a' }, { fxBg: '#07090c', fxC1: '#5ad1c4', fxC2: '#e8c15a' }],
    cordilheira: ['parallax', { fxBg: '#f6efe8', fxC1: '#7a5a8a', fxC2: '#e8825a' }, { fxBg: '#0a0814', fxC1: '#7c6cf0', fxC2: '#ff7ab0' }],
  };
  const TYPES = ['lightfall', 'gridhole', 'ink', 'parallax'];
  const rgb = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const lum = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  let cv, ctx, cfg = null, raf = 0, running = false, last = 0, t0 = performance.now(), W = 2, H = 2;
  let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, scrollY = 0, scrollT = 0;
  let streaks = [], parts = [], inkReset = true, ema = 0, qual = 1;

  function init() {
    if (cv) return true;
    const deco = document.getElementById('deco'); if (!deco) return false;
    cv = document.createElement('canvas'); cv.id = 'fxbg'; cv.setAttribute('aria-hidden', 'true'); deco.prepend(cv);
    ctx = cv.getContext('2d', { alpha: false }); if (!ctx) return false;
    addEventListener('resize', resize);
    addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth; ty = e.clientY / innerHeight; }, { passive: true });
    // rolagem de qualquer contêiner (o quadro tem várias colunas com rolagem própria) alimenta o parallax vertical
    document.addEventListener('scroll', (e) => { const el = e.target === document ? document.scrollingElement : e.target; if (el && el.scrollTop != null) scrollT = el.scrollTop; }, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : run(); });
    return true;
  }
  function resize() {
    if (!cv) return;
    const s = Math.min(1, window.devicePixelRatio || 1) * 0.6;
    W = Math.max(64, Math.round(innerWidth * s)); H = Math.max(64, Math.round(innerHeight * s));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    streaks = []; parts = []; inkReset = true;
    draw((performance.now() - t0) / 1000, 0.033);
  }
  const fill = (c) => { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = rgba(c, 1); ctx.fillRect(0, 0, W, H); };

  // ---------- Lightfall: fios de luz caindo, com brilho na ponta e reação ao mouse
  function lightfall(t, dt) {
    const c = cfg, bg = c.bgc; fill(bg);
    const want = Math.round((W / 9) * c.amt * qual);
    while (streaks.length < want) streaks.push({ x: rnd() * W, y: rnd() * H * 1.4 - H * 0.4, v: 0.35 + rnd() * 0.9, len: 0.08 + rnd() * 0.22, k: rnd(), w: 0.6 + rnd() * 1.4 });
    streaks.length = Math.min(streaks.length, want);
    const dark = lum(bg) < 0.5; ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'; ctx.lineCap = 'round';
    for (const s of streaks) {
      s.y += s.v * H * 0.38 * c.sp * dt; if (s.y - s.len * H > H) { s.y = -rnd() * H * 0.3; s.x = rnd() * W; s.k = rnd(); }
      const col = mix(c.c1, c.c2, s.k), L = s.len * H, near = Math.max(0, 1 - Math.abs(s.x / W - mx) * 5);
      const g = ctx.createLinearGradient(0, s.y - L, 0, s.y); g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, (dark ? 0.55 : 0.7) + near * 0.35));
      ctx.strokeStyle = g; ctx.lineWidth = s.w * (1 + near * 0.8); ctx.beginPath(); ctx.moveTo(s.x, s.y - L); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.fillStyle = rgba(col, dark ? 0.8 : 0.9); ctx.beginPath(); ctx.arc(s.x, s.y, s.w * 0.9, 0, 6.3); ctx.fill();
    }
  }

  // ---------- Grid Hole: grade que é sugada por um buraco que segue o mouse
  function gridhole(t) {
    const c = cfg, bg = c.bgc; fill(bg);
    const hx = (0.5 + (mx - 0.5) * 0.9) * W, hy = (0.5 + (my - 0.5) * 0.9) * H + Math.sin(t * 0.2 * c.sp) * H * 0.03;
    const R = Math.min(W, H) * 0.13 * (0.7 + c.amt * 0.3), reach = Math.min(W, H) * 0.75;
    const step = Math.max(14, Math.round(Math.min(W, H) / (14 * c.amt ** 0.4))), off = (t * 6 * c.sp) % step;
    const warp = (x, y) => { const dx = x - hx, dy = y - hy, d = Math.hypot(dx, dy) || 1, pull = Math.exp(-d / (reach * 0.35)) * 0.92, nd = Math.max(R * 0.55, d * (1 - pull) + (d < R * 3 ? 0 : 0));
      return [hx + (dx / d) * nd, hy + (dy / d) * nd, 1 - Math.min(1, d / reach)]; };
    ctx.lineWidth = 1; const seg = 6;
    const line = (x0, y0, x1, y1) => {
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / seg)); let px, py, pg;
      for (let i = 0; i <= n; i++) {
        const [x, y, g] = warp(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n);
        if (i) { ctx.strokeStyle = rgba(mix(c.c1, c.c2, g), 0.18 + g * 0.62); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); }
        px = x; py = y; pg = g;
      }
    };
    for (let x = -step + off; x < W + step; x += step) line(x, -step, x, H + step);
    for (let y = -step + off; y < H + step; y += step) line(-step, y, W + step, y);
    const g = ctx.createRadialGradient(hx, hy, R * 0.4, hx, hy, R * 1.9); g.addColorStop(0, rgba(bg, 1)); g.addColorStop(0.5, rgba(bg, 0.95)); g.addColorStop(0.62, rgba(c.c2, 0.55)); g.addColorStop(1, rgba(c.c2, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, R * 1.9, 0, 6.3); ctx.fill();
  }

  // ---------- Ink Flow Field: partículas seguem um campo de fluxo e deixam rastros de tinta
  const ang = (x, y, t) => (Math.sin(x * 0.0042 + t * 0.21) + Math.cos(y * 0.0051 - t * 0.17) + Math.sin((x + y) * 0.0026 + t * 0.11) * 1.3) * 1.9;
  function ink(t, dt) {
    const c = cfg, bg = c.bgc;
    if (inkReset) { fill(bg); inkReset = false; }
    const want = Math.round(520 * c.amt * qual * (W * H) / (1000 * 600)); const N = Math.max(80, Math.min(1400, want));
    while (parts.length < N) parts.push({ x: rnd() * W, y: rnd() * H, a: rnd(), life: 60 + rnd() * 200 });
    parts.length = Math.min(parts.length, N);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = rgba(bg, 0.045); ctx.fillRect(0, 0, W, H);
    const dark = lum(bg) < 0.5, sp = 1.1 * c.sp, mxp = mx * W, myp = my * H; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    for (const p of parts) {
      let a = ang(p.x, p.y, t); const dx = p.x - mxp, dy = p.y - myp, d = Math.hypot(dx, dy);
      if (d < 140) a += (1 - d / 140) * 2.2; // o mouse gira o fluxo em volta dele
      const nx = p.x + Math.cos(a) * sp, ny = p.y + Math.sin(a) * sp, k = (Math.sin(a * 0.5 + p.a * 6) + 1) / 2;
      ctx.strokeStyle = rgba(mix(c.c1, c.c2, k), dark ? 0.5 : 0.42); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
      p.x = nx; p.y = ny; if (--p.life < 0 || nx < -5 || ny < -5 || nx > W + 5 || ny > H + 5) { p.x = rnd() * W; p.y = rnd() * H; p.life = 80 + rnd() * 220; }
    }
  }

  // ---------- Parallax vertical: camadas de cristas que sobem/descem em velocidades diferentes com a rolagem
  function parallax(t) {
    const c = cfg, bg = c.bgc; fill(bg);
    scrollY += (scrollT - scrollY) * 0.12;
    const layers = 6, dark = lum(bg) < 0.5;
    // sol/lua que quase não se mexe
    const sx = W * (0.7 - (mx - 0.5) * 0.03), sy = H * 0.3 - scrollY * 0.03; const g0 = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.35); g0.addColorStop(0, rgba(c.c2, 0.5)); g0.addColorStop(1, rgba(c.c2, 0));
    ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < layers; i++) {
      const d = (i + 1) / layers, depth = 0.04 + d * 0.5; // camadas da frente andam mais
      const base = H * (0.42 + d * 0.5) - scrollY * depth * 0.55 * c.amt + Math.sin(t * 0.15 * c.sp + i) * 3, amp = H * (0.07 + (1 - d) * 0.05), f = 0.8 + i * 0.55;
      const sh = (mx - 0.5) * depth * W * 0.08 + t * 3 * c.sp * (0.2 + d * 0.8);
      const col = mix(bg, mix(c.c1, c.c2, d), 0.12 + d * 0.5 * (dark ? 0.8 : 0.9));
      ctx.fillStyle = rgba(col, 1); ctx.beginPath(); ctx.moveTo(0, H + 4);
      for (let x = 0; x <= W; x += 6) {
        const u = (x + sh) / W * Math.PI * 2 * f; ctx.lineTo(x, base + Math.sin(u + i * 1.7) * amp + Math.sin(u * 2.3 + i * 0.6) * amp * 0.45 + Math.sin(u * 5.1 + i) * amp * 0.12);
      }
      ctx.lineTo(W, H + 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(mix(c.c1, c.c2, d), 0.3 + d * 0.3); ctx.lineWidth = 1; ctx.stroke();
    }
  }

  function draw(t, dt) {
    if (!ctx || !cfg) return;
    mx += (tx - mx) * 0.07; my += (ty - my) * 0.07;
    ({ lightfall, gridhole, ink, parallax }[cfg.type] || lightfall)(t, dt || 0.033);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame); if (now - last < 33) return; const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const s = performance.now(); draw((now - t0) / 1000, dt); const d = performance.now() - s; ema = ema ? ema * 0.9 + d * 0.1 : d;
    if (ema > 22 && qual > 0.46) { qual = Math.max(0.45, qual * 0.8); ema = 14; }
  }
  const animated = () => cfg && cfg.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function run() { if (cfg && ctx && animated() && !document.hidden && !running) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  window.KBFx = {
    PRESETS, TYPES,
    bench(n = 40) {
      if (!ctx || !cfg) return null;
      const s = performance.now(); for (let i = 0; i < n; i++) draw(i / 30, 0.033); ctx.getImageData(0, 0, 1, 1);
      return { ms: (performance.now() - s) / n, w: W, h: H };
    },
    // mode = claro/escuro; theme = id (os temas de AUTO ligam o fundo sozinhos quando o fundo é "do tema")
    update(p, mode, theme) {
      const au = AUTO[theme] && (!p.bg || p.bg === 'theme') ? AUTO[theme] : null;
      const on = !!au || TYPES.includes(p.bg), type = au ? au[0] : p.bg;
      if (au) p = { ...p, ...au[mode === 'dark' ? 2 : 1] };
      document.documentElement.dataset.fxbg = on ? type : 'off';
      if (!on) { stop(); if (cv) cv.style.display = 'none'; return; }
      if (!init()) return;
      cv.style.display = '';
      const bgc = rgb(p.fxBg || '#05060f');
      cfg = { type, bgc, c1: rgb(p.fxC1 || '#7c9cff'), c2: rgb(p.fxC2 || '#ff5fd2'), sp: Math.max(0.05, (p.fxSp ?? 100) / 100), amt: Math.max(0.2, (p.fxAmt ?? 100) / 100),
        animate: p.fx !== false && p.motion !== false };
      qual = 1; ema = 0; streaks = []; parts = []; inkReset = true; seed = 7; resize(); stop();
      if (!animated()) for (let i = 0; i < (cfg.type === 'ink' ? 260 : 3); i++) draw(i / 30, 0.033); // quadro estático já "desenvolvido"
      run();
    },
  };
})();
