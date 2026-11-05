// "Terreno de arame": paisagem 3D em perspectiva feita de linhas de nível (inspirado no componente Wire Terrain do OriginKit,
// recriado do zero em Canvas 2D). Sem WebGL e sem dependências. Controles: fundo, cor da linha, cor de destaque, densidade, velocidade,
// relevo, tamanho do sol, altura da câmera, hover (paralaxe do mouse) e intervalo das linhas de destaque.
(() => {
  const PRESETS = {
    papel:  { trType: 'linhas', trBg: '#f1ecdf', trLine: '#4a5a4c', trAccent: '#c8522e', trSun: 170, trRelief: 100, trDensity: 110, trSpeed: 40, trCam: 100, trHover: 40, trInterval: 5 },
    carvao: { trType: 'linhas', trBg: '#050403', trLine: '#b12b00', trAccent: '#ff3c00', trSun: 40, trRelief: 100, trDensity: 100, trSpeed: 60, trCam: 94, trHover: 60, trInterval: 6 },
    synth:  { trType: 'synth',  trBg: '#12042b', trLine: '#d946ef', trAccent: '#22d3ee', trSun: 110, trRelief: 110, trDensity: 70, trSpeed: 70, trCam: 80, trHover: 50, trInterval: 5 },
    pontos: { trType: 'pontos', trBg: '#04110f', trLine: '#34d399', trAccent: '#fb923c', trSun: 0, trRelief: 100, trDensity: 70, trSpeed: 55, trCam: 90, trHover: 60, trInterval: 7 },
  };
  // ---- ruído de gradiente 2D (suave) + fbm
  const perm = new Uint8Array(512);
  (() => { let s = 1337; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; })();
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10), lerp = (t, a, b) => a + t * (b - a);
  const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  function noise(x, y) {
    const fx = Math.floor(x), fy = Math.floor(y), X = fx & 255, Y = fy & 255; x -= fx; y -= fy;
    const u = fade(x), v = fade(y), a = perm[X] + Y, b = perm[X + 1] + Y;
    return lerp(v, lerp(u, grad(perm[a], x, y), grad(perm[b], x - 1, y)), lerp(u, grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1))) * 1.35;
  }
  const fbm = (x, y) => noise(x, y) * 0.58 + noise(x * 2.1 + 5.2, y * 2.1 + 1.7) * 0.28 + noise(x * 4.3 + 9.1, y * 4.3 + 3.3) * 0.14;
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const rgb = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  let cv, ctx, cfg = null, raf = 0, running = false, last = 0, t0 = performance.now(), mx = 0, my = 0, tmx = 0, tmy = 0, W = 2, H = 2;

  function init() {
    if (cv) return true;
    const deco = document.getElementById('deco'); if (!deco) return false;
    cv = document.createElement('canvas'); cv.id = 'terrainbg'; cv.setAttribute('aria-hidden', 'true'); deco.prepend(cv);
    ctx = cv.getContext('2d', { alpha: false }); if (!ctx) return false;
    addEventListener('resize', resize); resize();
    addEventListener('pointermove', (e) => { tmx = (e.clientX / innerWidth) * 2 - 1; tmy = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : run(); });
    return true;
  }
  function resize() {
    if (!cv) return;
    const s = Math.min(1, (window.devicePixelRatio || 1)) * 0.75; // meia resolução: linhas finas continuam nítidas e o custo cai
    W = Math.max(64, Math.round(innerWidth * s)); H = Math.max(64, Math.round(innerHeight * s));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    draw((performance.now() - t0) / 1000);
  }

  function draw(time) {
    if (!ctx || !cfg) return;
    const c = cfg, bg = rgb(c.bg), line = rgb(c.line), acc = rgb(c.accent), type = c.type;
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
    const hov = c.hover / 100, N = Math.max(24, Math.min(150, Math.round(c.density * 0.7))), M = type === 'pontos' ? 70 : 120;
    const horizon = H * (0.40 + my * 0.02 * hov), f = H * 0.13, cx = W / 2;
    const camX = -mx * 5 * hov, camH = 4.2 * (c.cam / 100), hmax = 13 * (c.relief / 100), scroll = time * c.speed / 100 * 3.2;
    // céu
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    if (type === 'synth') { sky.addColorStop(0, rgba(rgb('#07021a'), 1)); sky.addColorStop(1, rgba(rgb('#3b0a5c'), 1)); } else { sky.addColorStop(0, rgba(bg, 1)); sky.addColorStop(1, rgba(bg, 1)); }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // sol
    const sunR = H * 0.22 * (c.sun / 100);
    if (sunR > 2) {
      const sy = horizon - sunR * 0.3; ctx.save(); ctx.beginPath(); ctx.arc(cx - mx * W * 0.01 * hov, sy, sunR, 0, 6.2832); ctx.clip();
      if (type === 'synth') { const g = ctx.createLinearGradient(0, sy - sunR, 0, sy + sunR); g.addColorStop(0, '#ffe66d'); g.addColorStop(0.55, '#ff6ab0'); g.addColorStop(1, '#b967ff'); ctx.fillStyle = g; ctx.fillRect(0, sy - sunR, W, sunR * 2);
        ctx.fillStyle = rgba(rgb('#12042b'), 1); for (let k = 0; k < 7; k++) { const yy = sy + sunR * (0.05 + k * 0.14), hh = 1 + k * 1.6; ctx.fillRect(cx - sunR, yy, sunR * 2, hh); } }
      else { ctx.fillStyle = rgba(acc, type === 'pontos' ? 0.5 : 1); ctx.fillRect(cx - sunR, sy - sunR, sunR * 2, sunR * 2);
        ctx.fillStyle = rgba(bg, 0.5); for (let k = 0; k < 3; k++) ctx.fillRect(cx - sunR, sy - sunR * 0.35 + k * sunR * 0.22, sunR * 2, 1.5); }
      ctx.restore();
    }
    // terreno: linhas do mais perto para o mais longe; cada coluna guarda o ponto mais alto já visto (oclusão sem polígonos)
    const ys = [], vis = [], grid = [], minY = new Float32Array(M).fill(H + 50), halfW = W / 2, sym = type === 'synth';
    const sxs = new Float32Array(M); for (let j = 0; j < M; j++) sxs[j] = (j / (M - 1)) * W;
    const heightAt = (x, zw, z, t, dfrac) => {
      const valley = smooth(0.2, 0.72, dfrac), ramp = smooth(0.04, 0.4, t), nx = sym ? Math.abs(x) : x;
      const n = fbm(nx * 0.1 + 3.1, zw * 0.07) * 0.5 + 0.5, ridge = 1 - Math.abs(fbm(nx * 0.06, zw * 0.05 + 9));
      const mount = valley * ramp * (0.35 + 0.65 * n) * (0.55 + 0.9 * ridge) * hmax * (0.45 + z * 0.11);
      return mount + noise(x * 0.22, zw * 0.17) * 0.4 * (0.4 + 0.6 * ramp) * (c.relief / 100);
    };
    const K = 45, gstep = 1.5;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), z = 1 + Math.pow(t, 1.8) * 42, zw = z + scroll, y = new Float32Array(M), v = new Uint8Array(M);
      const path = sym ? 0 : Math.sin(zw * 0.045) * 4 + Math.sin(zw * 0.017) * 3, pathPx = (path * f) / z, prev = type === 'synth' ? minY.slice() : null;
      for (let j = 0; j < M; j++) {
        const x = ((sxs[j] - cx) / f) * z + camX, dfrac = Math.abs(sxs[j] - cx - pathPx) / halfW;
        const yy = horizon + ((camH - heightAt(x - path, zw, z, t, dfrac)) * f) / z; y[j] = yy;
        if (yy < minY[j] - 0.4) { v[j] = 1; minY[j] = yy; }
      }
      ys.push(y); vis.push(v);
      if (type === 'synth') { // grade do chão: linhas de x constante no mundo, convergindo para o horizonte
        const g = [];
        for (let k = -K; k <= K; k++) {
          const xw = k * gstep, sx = cx + ((xw - camX) * f) / z, dfrac = Math.abs(sx - cx) / halfW, yy = horizon + ((camH - heightAt(xw, zw, z, t, dfrac)) * f) / z;
          const col = Math.round((sx / W) * (M - 1)); g.push({ sx, yy, vis: col >= 0 && col < M && yy < prev[col] - 0.4 });
        }
        grid.push(g);
      }
    }
    // silhueta do terreno cobre o céu e o sol atrás das montanhas
    ctx.beginPath(); ctx.moveTo(0, H); for (let j = 0; j < M; j++) ctx.lineTo(sxs[j], Math.min(H, minY[j])); ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = type === 'synth' ? rgba(rgb('#0d0222'), 1) : rgba(bg, 1); ctx.fill();
    // névoa na linha do horizonte
    const mist = ctx.createLinearGradient(0, horizon - H * 0.06, 0, horizon + H * 0.12);
    const mc = type === 'synth' ? rgb('#3b0a5c') : bg; mist.addColorStop(0, rgba(mc, 0)); mist.addColorStop(0.5, rgba(mc, type === 'pontos' ? 0.35 : 0.6)); mist.addColorStop(1, rgba(mc, 0));
    ctx.fillStyle = mist; ctx.fillRect(0, horizon - H * 0.06, W, H * 0.18);
    // linhas (de longe para perto)
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let i = N - 1; i >= 0; i--) {
      const t = i / (N - 1), y = ys[i], v = vis[i], isAcc = i % c.interval === 0, col = isAcc ? acc : line;
      const a = Math.max(0.08, (1 - Math.pow(t, 1.4) * 0.88) * (1 - c.soft / 100));
      if (type === 'pontos') {
        ctx.fillStyle = rgba(col, a); const r = (isAcc ? 1.9 : 1.2) * (1.15 - t * 0.7);
        for (let j = 0; j < M; j += 1) if (v[j]) { ctx.beginPath(); ctx.arc(sxs[j], y[j], r, 0, 6.2832); ctx.fill(); }
        continue;
      }
      ctx.strokeStyle = rgba(col, a); ctx.lineWidth = (isAcc ? 1.7 : 1) * (1.2 - t * 0.6);
      ctx.beginPath(); let pen = false;
      for (let j = 0; j < M; j++) { if (v[j]) { pen ? ctx.lineTo(sxs[j], y[j]) : ctx.moveTo(sxs[j], y[j]); pen = true; } else pen = false; }
      ctx.stroke();
    }
    if (type === 'synth') { // verticais da grade (de x constante no mundo)
      ctx.lineWidth = 0.9;
      for (let i = 0; i < N - 1; i++) {
        const g = grid[i], g2 = grid[i + 1], a = Math.max(0.1, (1 - Math.pow(i / (N - 1), 1.4) * 0.85) * (1 - c.soft / 100)); ctx.strokeStyle = rgba(line, a * 0.7); ctx.beginPath();
        for (let k = 0; k < g.length; k++) if (g[k].vis && g2[k].vis) { ctx.moveTo(g[k].sx, g[k].yy); ctx.lineTo(g2[k].sx, g2[k].yy); }
        ctx.stroke();
      }
    }
    if (c.soft > 0) { ctx.fillStyle = rgba(bg, Math.min(0.7, c.soft / 130)); ctx.fillRect(0, 0, W, H); }
  }
  function frame(now) { raf = requestAnimationFrame(frame); if (now - last < 33) return; last = now; draw((now - t0) / 1000); }
  const animated = () => cfg && cfg.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function run() { if (cfg && ctx && animated() && !document.hidden && !running) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  window.KBTerrain = {
    PRESETS,
    // p = preferências; mode = claro/escuro; theme = id do tema (o tema "topografia" liga o terreno sozinho)
    update(p, mode, theme) {
      const auto = theme === 'topografia' && (!p.bg || p.bg === 'theme');
      const on = p.bg === 'terrain' || auto;
      document.documentElement.dataset.terrain = on ? 'on' : 'off';
      if (!on) { stop(); if (cv) cv.style.display = 'none'; return; }
      if (!init()) return;
      cv.style.display = '';
      const s = auto ? PRESETS[mode === 'dark' ? 'carvao' : 'papel'] : p;
      cfg = { type: s.trType || 'linhas', bg: s.trBg || '#f1ecdf', line: s.trLine || '#4a5a4c', accent: s.trAccent || '#c8522e', density: s.trDensity ?? 110, speed: s.trSpeed ?? 40,
        relief: s.trRelief ?? 100, sun: s.trSun ?? 170, cam: s.trCam ?? 100, hover: s.trHover ?? 40, interval: Math.max(2, s.trInterval ?? 5), soft: auto ? 0 : (p.trSoft ?? 0),
        animate: p.fx !== false && p.motion !== false };
      resize(); stop(); run();
    },
  };
})();
