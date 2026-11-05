// Acabamento (ideias do Rolling Number / Progressive Blur, recriadas com código próprio):
//  1) números que "rolam" até o novo valor (contadores da barra lateral, das colunas e do Painel);
//  2) marcas de rolagem nas colunas para o desfoque progressivo das bordas (CSS em app.css).
// Sem dependências. Respeita prefers-reduced-motion e a chave "animações da interface" (data-motion="off").
(() => {
  const SEL = '.sb-count,.col-count,.kpi-v';
  const NUM = /^(\d+)(\/\d+)?$/;
  const prev = new Map();
  const noMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
  const txt = (el) => (el ? el.textContent.trim() : '');
  const keyOf = (el) => {
    if (el.matches('.sb-count')) return 'sb:' + txt(el.closest('.sb-item')?.querySelector('.sb-label'));
    if (el.matches('.col-count')) return 'col:' + txt(el.closest('.column')?.querySelector('.col-title'));
    return 'kpi:' + txt(el.closest('.kpi')?.querySelector('.kpi-l'));
  };
  const ease = (t) => 1 - Math.pow(1 - t, 4);

  function roll(el, node, from, to, rest) {
    const t0 = performance.now(), dur = Math.min(520, 220 + Math.abs(to - from) * 40);
    const step = (now) => {
      if (!node.isConnected) return;
      const t = Math.min(1, (now - t0) / dur);
      node.nodeValue = Math.round(from + (to - from) * ease(t)) + rest;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function numbers() {
    for (const el of document.querySelectorAll(SEL)) {
      const node = el.firstChild;
      if (!node || node.nodeType !== 3 || el.__rolling === node) continue;
      const m = NUM.exec(node.nodeValue.trim()); if (!m) continue;
      const key = keyOf(el), to = Number(m[1]), rest = m[2] || '', before = prev.get(key);
      prev.set(key, to);
      if (before == null || before === to || noMotion()) continue;
      el.__rolling = node; node.nodeValue = before + rest;
      roll(el, node, before, to, rest);
    }
  }

  function edges(body) {
    const top = body.scrollTop > 2, bot = body.scrollHeight - body.scrollTop - body.clientHeight > 2;
    if (body.dataset.sct !== (top ? '1' : '0')) body.dataset.sct = top ? '1' : '0';
    if (body.dataset.scb !== (bot ? '1' : '0')) body.dataset.scb = bot ? '1' : '0';
  }
  const allEdges = () => document.querySelectorAll('.col-body').forEach(edges);

  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; numbers(); allEdges(); }); };
  document.addEventListener('scroll', (e) => { if (e.target.classList && e.target.classList.contains('col-body')) edges(e.target); }, true);
  addEventListener('resize', later);
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  later();
})();
