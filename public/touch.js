// Arrastar cards com o dedo (celular/tablet): segure ~0,4 s no card, arraste e solte na coluna.
(() => {
  const A = window.KBApp; if (!A || !('ontouchstart' in window)) return;
  const S = A.S;
  let st = null, raf = 0;
  const line = document.createElement('div'); line.className = 'drop-line';

  const cleanup = () => {
    clearTimeout(st && st.timer); cancelAnimationFrame(raf);
    if (st) { st.card.classList.remove('dragging'); st.card.draggable = true; st.ghost && st.ghost.remove(); }
    line.remove(); document.querySelectorAll('.column.over').forEach((c) => c.classList.remove('over'));
    document.body.classList.remove('touch-dragging');
    if (st && st.active) { S.drag = null; if (S.pendingLoad) { S.pendingLoad = false; A.loadBoard(); } }
    st = null;
  };
  const target = (x, y) => {
    const el = document.elementFromPoint(x, y), col = el && el.closest && el.closest('.column[data-id]');
    return col || null;
  };
  const place = (x, y) => {
    document.querySelectorAll('.column.over').forEach((c) => c.classList.remove('over'));
    const col = target(x, y); if (!col) { line.remove(); return; }
    col.classList.add('over');
    const body = col.querySelector('.col-body');
    const after = [...body.querySelectorAll('.card:not(.dragging)')].find((c) => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
    after ? body.insertBefore(line, after) : body.append(line);
  };
  // Rolagem automática nas bordas: devagar e com espera. Só começa depois de ~0,35 s com o dedo na borda e acelera aos poucos
  // (antes passava direto da coluna que você queria). Velocidade máx.: 360 px/s na horizontal, 380 px/s na vertical.
  const ZONE_X = 56, ZONE_Y = 48, MAX_X = 360, MAX_Y = 380, DWELL = 350;
  const ramp = (d, z) => { const k = Math.max(0, Math.min(1, (z - d) / z)); return k * k; };
  const loop = (ts) => {
    if (!st || !st.active) return;
    const dt = Math.min(0.05, ((ts || performance.now()) - (st.t || ts || performance.now())) / 1000); st.t = ts || performance.now();
    const board = document.querySelector('.board'), { x, y } = st.last;
    const dirX = x < ZONE_X ? -ramp(x, ZONE_X) : x > innerWidth - ZONE_X ? ramp(innerWidth - x, ZONE_X) : 0;
    if (board && dirX) { st.hs = st.hs || st.t; if (st.t - st.hs > DWELL) board.scrollLeft += dirX * MAX_X * dt; } else st.hs = 0;
    const col = target(x, y), body = col && col.querySelector('.col-body');
    if (body) {
      const r = body.getBoundingClientRect();
      const dirY = y < r.top + ZONE_Y ? -ramp(y - r.top, ZONE_Y) : y > r.bottom - ZONE_Y ? ramp(r.bottom - y, ZONE_Y) : 0;
      if (dirY) { st.vs = st.vs || st.t; if (st.t - st.vs > DWELL) body.scrollTop += dirY * MAX_Y * dt; } else st.vs = 0;
    }
    place(x, y); raf = requestAnimationFrame(loop);
  };
  const activate = () => {
    if (!st) return;
    st.active = true; S.drag = st.id; document.body.classList.add('touch-dragging');
    if (navigator.vibrate) navigator.vibrate(12);
    const r = st.card.getBoundingClientRect();
    st.ghost = st.card.cloneNode(true); st.ghost.classList.add('touch-ghost'); st.ghost.style.width = r.width + 'px';
    st.dx = st.x0 - r.left; st.dy = st.y0 - r.top; document.body.append(st.ghost);
    st.ghost.style.transform = `translate(${r.left}px, ${r.top}px) scale(1.03)`;
    st.card.classList.add('dragging'); raf = requestAnimationFrame(loop);
  };

  document.addEventListener('touchstart', (e) => {
    if (st || e.touches.length !== 1 || A.S.prefs.view !== 'board') return;
    const card = e.target.closest && e.target.closest('.card[data-id]'); if (!card || e.target.closest('button, input, textarea, select, a')) return;
    const t = e.touches[0];
    card.draggable = false; // sem isto o Chrome do celular inicia o arrastar nativo (HTML5) no toque longo e cancela o nosso (touchcancel)
    st = { id: Number(card.dataset.id), card, x0: t.clientX, y0: t.clientY, last: { x: t.clientX, y: t.clientY }, active: false };
    st.timer = setTimeout(activate, 380);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!st) return;
    const t = e.touches[0];
    if (!st.active) { if (Math.hypot(t.clientX - st.x0, t.clientY - st.y0) > 10) cleanup(); return; } // era rolagem, não arrasto
    e.preventDefault();
    st.last = { x: t.clientX, y: t.clientY };
    st.ghost.style.transform = `translate(${t.clientX - st.dx}px, ${t.clientY - st.dy}px) scale(1.03)`;
  }, { passive: false });

  const finish = (drop) => {
    if (!st) return;
    if (!st.active) return cleanup();
    const { id, last } = st, col = drop ? target(last.x, last.y) : null;
    let colId = null, before = null;
    if (col) {
      colId = Number(col.dataset.id);
      const next = line.parentNode === col.querySelector('.col-body') ? line.nextElementSibling : null;
      before = next && next.classList.contains('card') ? Number(next.dataset.id) : null;
    }
    cleanup();
    if (colId != null) A.guard(() => A.moveTask(id, colId, before))();
  };
  document.addEventListener('touchend', () => finish(true));
  document.addEventListener('touchcancel', () => finish(false));
  document.addEventListener('dragstart', (e) => { if (st) e.preventDefault(); }, true);
  document.addEventListener('contextmenu', (e) => { if (st && st.active) e.preventDefault(); });
})();
