// "Ilha" flutuante do cronômetro (ideia do Dynamic Island do Skiper UI / Cult UI):
// aparece embaixo, no centro, enquanto você tem um cronômetro rodando. Sem pulsar; entra e sai em < 200 ms.
(() => {
  const A = window.KBApp; if (!A) return;
  const { S, h, icon, guard, api } = A;
  let el = null;
  A.updateIsland = function () {
    const t = S.me && S.tasks.find((x) => x.timer_started_at && x.timer_user === S.me.id);
    if (!t) {
      if (el) { const old = el; el = null; old.classList.add('out'); document.body.classList.remove('has-island'); setTimeout(() => old.remove(), 170); }
      return;
    }
    const key = t.id + ':' + t.timer_started_at;
    if (el && el.dataset.key === key) { const title = el.querySelector('.island-title'); if (title) title.textContent = t.title; return; }
    if (!el) { el = h('div', { class: 'island', role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
    el.dataset.key = key; document.body.classList.add('has-island');
    el.replaceChildren(
      h('button', { class: 'island-main', title: 'Abrir a task do cronômetro', onclick: () => A.openTask(t.id) }, icon('timer'),
        h('span', { class: 'island-title' }, t.title),
        h('span', { class: 'island-time timer-live running', dataset: { since: t.timer_started_at, base: t.time_spent } }, A.fmtDur(A.totalSecs(t)))),
      h('button', { class: 'island-stop', title: 'Parar cronômetro', 'aria-label': 'Parar cronômetro', onclick: guard(async () => { await api('POST', `/api/tasks/${t.id}/timer`); await A.loadBoard(); }) }, icon('pause')));
    el.querySelectorAll('svg').forEach((v) => Object.assign(v.style, { width: '15px', height: '15px' }));
  };
})();
