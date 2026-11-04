// Paleta de comandos (Ctrl/Cmd+K): busca tasks e executa ações sem tirar a mão do teclado.
(() => {
  const A = window.KBApp; if (!A) return;
  const { S, h, icon, norm, openModal } = A;

  function commands(close) {
    const run = (fn) => () => { close(); setTimeout(fn, 30); };
    const view = (v) => run(() => A.setPrefs({ view: v }, { refreshSettings: false }));
    const filt = (patch) => run(() => { S.filter = { q: '', who: 'all', due: null, label: null, ...patch }; const s = A.$('#search'); if (s) s.value = ''; A.renderBoard(); });
    const list = [
      ['Nova task', 'plus', run(() => A.openQuickAdd()), 'n'],
      ['Gerar diário', 'book', run(A.openDiary)],
      ['Resumo da equipe', 'chart', run(() => A.openSummary())],
      ['Atividade recente', 'pulse', run(() => A.openActivity())],
      ['Ir para o Quadro', 'grid', view('board')], ['Ir para a Lista', 'table', view('list')], ['Ir para o Calendário', 'calendar', view('calendar')],
      ['Filtrar: minhas tasks', 'take', filt({ who: 'me' })], ['Filtrar: sem dono', 'take', filt({ who: 'none' })],
      ['Filtrar: atrasadas', 'calendar', filt({ due: 'late' })], ['Filtrar: vencem hoje', 'calendar', filt({ due: 'today' })], ['Limpar filtros', 'x', filt({})],
      ['Alternar claro / escuro', 'moon', run(() => A.setPrefs({ mode: A.resolvedMode() === 'dark' ? 'light' : 'dark' }))],
      ['Personalizar aparência', 'palette', run(() => A.openSettings('look'))], ['Minha conta', 'edit', run(() => A.openSettings('account'))],
      ['Exportar tasks (CSV)', 'download', run(() => A.exportCsv())], ['Backup completo (JSON)', 'download', run(() => A.exportJson())],
    ];
    if (S.me.role === 'admin') list.push(['Equipe e aprovações', 'take', run(() => A.openSettings('team'))]);
    A.THEMES.forEach(([id, name]) => list.push([`Tema: ${name}`, 'palette', run(() => A.setPrefs({ theme: id }, { refreshSettings: false }))]));
    return list.map(([label, ic, fn, hint]) => ({ kind: 'Ação', label, ic, fn, hint, hay: norm(label) }));
  }
  function taskItems(close) {
    return S.tasks.map((t) => {
      const c = A.colById(t.column_id) || {}, o = A.userById(t.assignee_id);
      return { kind: 'Task', label: t.title, sub: [c.name, o && o.name, t.labels.map((l) => '#' + l).join(' ')].filter(Boolean).join(' · '), ic: 'list', fn: () => { close(); setTimeout(() => A.openTask(t.id), 30); }, hay: norm(t.title + ' ' + t.labels.join(' ') + ' ' + (o ? o.name : '') + ' ' + (c.name || '')) };
    });
  }

  A.openPalette = function () {
    let items = [], sel = 0, close;
    const input = h('input', { class: 'input big-input', placeholder: 'Buscar task ou digitar um comando…', autocomplete: 'off', 'aria-label': 'Paleta de comandos' });
    const list = h('div', { class: 'pal-list', role: 'listbox' });
    const draw = () => {
      const words = norm(input.value).split(/\s+/).filter(Boolean);
      const all = [...commands(() => close()), ...taskItems(() => close())];
      items = all.filter((it) => words.every((w) => it.hay.includes(w)))
        .sort((a, b) => (words.length ? (norm(b.label).startsWith(words[0]) - norm(a.label).startsWith(words[0])) : 0)).slice(0, 14);
      sel = Math.min(sel, Math.max(0, items.length - 1));
      list.replaceChildren(...(items.length ? items.map((it, i) => h('button', { class: 'pal-item' + (i === sel ? ' on' : ''), role: 'option', onmousemove: () => { if (sel !== i) { sel = i; mark(); } }, onclick: () => it.fn() },
        icon(it.ic), h('span', { class: 'pal-main' }, h('span', null, it.label), it.sub && h('small', null, it.sub)), h('span', { class: 'pal-kind' }, it.hint ? h('kbd', null, it.hint) : it.kind))) : [h('div', { class: 'empty-hint' }, 'Nada encontrado')]));
      list.querySelectorAll('svg').forEach((v) => Object.assign(v.style, { width: '16px', height: '16px' }));
    };
    const mark = () => { [...list.children].forEach((el, i) => el.classList.toggle('on', i === sel)); const el = list.children[sel]; el && el.scrollIntoView({ block: 'nearest' }); };
    input.addEventListener('input', () => { sel = 0; draw(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); items[sel] && items[sel].fn(); }
    });
    close = openModal(h('div', { class: 'palette' }, input, list));
    const ov = list.closest('.overlay'); if (ov) ov.classList.add('pal-overlay');
    draw(); setTimeout(() => input.focus(), 20);
  };
})();
