// Vistas extras e relatórios: Lista, Calendário, Resumo, Atividade e exportação.
(() => {
  const A = window.KBApp; if (!A) return;
  const { S, h, icon, api, toast, guard, openModal, modalHead, userById, colById, avatar, fmtDay, fmtTime, fmtDur, totalSecs, isRunning, ymd, pad, addDays, hueOf, cap, PRIO_NAME } = A;
  const svgIcons = (root, px = 14) => root.querySelectorAll('svg').forEach((v) => Object.assign(v.style, { width: px + 'px', height: px + 'px' }));
  const colColor = (c) => c.color || (c.kind === 'done' ? 'var(--ok)' : c.kind === 'doing' ? 'var(--p2)' : 'var(--muted)');

  /* ---------------- Lista ---------------- */
  function listView() {
    const sort = S.listSort || (S.listSort = { key: 'col', dir: 1 });
    const colIdx = (t) => S.columns.findIndex((c) => c.id === t.column_id);
    const keys = {
      title: (t) => t.title.toLowerCase(), col: (t) => colIdx(t) * 1e6 + t.position,
      owner: (t) => (userById(t.assignee_id) ? userById(t.assignee_id).name.toLowerCase() : '￿'),
      prio: (t) => -t.priority, due: (t) => t.due_date || '9999-99-99', time: (t) => -totalSecs(t),
    };
    const rows = S.tasks.filter(A.matches).sort((a, b) => { const x = keys[sort.key](a), y = keys[sort.key](b); return ((x < y ? -1 : x > y ? 1 : 0) * sort.dir) || a.id - b.id; });
    const th = (key, label, cls = '') => h('th', { class: cls }, h('button', { class: 'th-btn' + (sort.key === key ? ' on' : ''), onclick: () => { S.listSort = { key, dir: sort.key === key ? -sort.dir : 1 }; A.renderBoard(); } }, label + (sort.key === key ? (sort.dir > 0 ? ' ▲' : ' ▼') : '')));
    const table = h('table', { class: 'list-table' },
      h('thead', null, h('tr', null, th('title', 'Task'), th('col', 'Status'), th('owner', 'Responsável', 'c-owner'), th('prio', 'Prioridade', 'c-prio'), th('due', 'Prazo', 'c-due'), h('th', { class: 'c-labels' }, 'Etiquetas'), th('time', 'Tempo', 'c-time'))),
      h('tbody', null, rows.map((t) => {
        const c = colById(t.column_id) || {}, o = userById(t.assignee_id), ds = A.dueState(t), cl = t.checklist || [];
        return h('tr', { class: 'list-row' + (c.kind === 'done' ? ' done' : ''), tabIndex: 0, onclick: () => A.openTask(t.id), onkeydown: (e) => { if (e.key === 'Enter') A.openTask(t.id); } },
          h('td', { class: 'c-title' }, h('span', { class: 'lt-title' }, t.title),
            cl.length > 0 && h('span', { class: 'due' }, icon('list'), `${cl.filter((i) => i.done).length}/${cl.length}`),
            t.attachments > 0 && h('span', { class: 'due' }, icon('clip'), t.attachments)),
          h('td', null, h('span', { class: 'status-pill' }, h('i', { style: { background: colColor(c) } }), c.name)),
          h('td', { class: 'c-owner' }, o ? h('span', { class: 'owner' }, avatar(o, 20), o.name.split(' ')[0]) : h('span', { class: 'help' }, '—')),
          h('td', { class: 'c-prio' }, t.priority >= 2 ? h('span', { class: 'prio-badge p' + t.priority }, PRIO_NAME[t.priority]) : h('span', { class: 'help' }, PRIO_NAME[t.priority])),
          h('td', { class: 'c-due' }, t.due_date ? h('span', { class: 'due' + (ds === 'late' ? ' late' : ds === 'today' ? ' today' : '') }, fmtDay(t.due_date)) : h('span', { class: 'help' }, '—')),
          h('td', { class: 'c-labels' }, t.labels.map((l) => h('span', { class: 'tag', style: { '--h': hueOf(l) } }, l))),
          h('td', { class: 'c-time' }, totalSecs(t) > 0 && (t.started_at ? c.kind !== 'todo' : true) ? h('span', { class: 'due' + (isRunning(t) ? ' timer-live running' : ''), dataset: isRunning(t) ? { since: t.started_at, base: 0 } : {} }, icon('timer'), fmtDur(totalSecs(t))) : ''));
      })));
    const sortBar = h('div', { class: 'list-sort' }, h('label', { class: 'help' }, 'Ordenar por'),
      h('select', { class: 'input', 'aria-label': 'Ordenar lista por', onchange: (e) => { S.listSort = { key: e.target.value, dir: 1 }; A.renderBoard(); } },
        [['col', 'Status'], ['title', 'Task'], ['owner', 'Responsável'], ['prio', 'Prioridade'], ['due', 'Prazo'], ['time', 'Tempo']].map(([k, l]) => h('option', { value: k, selected: sort.key === k }, l))),
      h('button', { class: 'btn sm', type: 'button', 'aria-label': 'Inverter a ordem', title: 'Inverter a ordem', onclick: () => { S.listSort = { key: sort.key, dir: -sort.dir }; A.renderBoard(); } }, sort.dir > 0 ? '▲' : '▼'));
    const wrap = h('div', { class: 'list-wrap' }, sortBar, rows.length ? table : h('div', { class: 'empty-hint', style: { padding: '40px' } }, A.filtersActive() ? 'Nada com esse filtro' : 'Nenhuma task ainda. Pressione N para criar a primeira.'),
      h('div', { class: 'help', style: { padding: '8px 4px' } }, `${rows.length} task${rows.length === 1 ? '' : 's'}`));
    svgIcons(wrap, 13);
    return wrap;
  }

  /* ---------------- Calendário ---------------- */
  function calendarView() {
    const now = new Date(), cal = S.cal || (S.cal = { y: now.getFullYear(), m: now.getMonth() });
    const first = new Date(cal.y, cal.m, 1), offset = (first.getDay() + 6) % 7, today = ymd();
    const days = Array.from({ length: 42 }, (_, i) => new Date(cal.y, cal.m, 1 - offset + i));
    const tasks = S.tasks.filter(A.matches), byDay = {};
    tasks.filter((t) => t.due_date).forEach((t) => (byDay[t.due_date] = byDay[t.due_date] || []).push(t));
    const nav = (d) => { const dt = new Date(cal.y, cal.m + d, 1); S.cal = { y: dt.getFullYear(), m: dt.getMonth() }; A.renderBoard(); };
    const setDue = guard(async (id, date) => { const t = S.tasks.find((x) => x.id === id); if (!t || t.due_date === date) return; A.upsertTask(await api('PATCH', `/api/tasks/${id}`, { due_date: date })); A.renderBoard(); });
    const chip = (t) => {
      const c = colById(t.column_id) || {};
      const el = h('div', { class: 'cal-chip p' + t.priority + (c.kind === 'done' ? ' done' : ''), draggable: true, title: t.title, onclick: (e) => { e.stopPropagation(); A.openTask(t.id); } }, t.title);
      el.addEventListener('dragstart', (e) => { S.calDrag = t.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(t.id)); });
      el.addEventListener('dragend', () => { S.calDrag = null; document.querySelectorAll('.cal-day.over').forEach((d) => d.classList.remove('over')); });
      return el;
    };
    const grid = h('div', { class: 'cal-grid' }, ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => h('div', { class: 'cal-dow' }, d)),
      days.map((d) => {
        const key = ymd(d), list = byDay[key] || [], shown = S.calOpen === key ? list : list.slice(0, 3);
        const cell = h('div', { class: 'cal-day' + (d.getMonth() !== cal.m ? ' dim' : '') + (key === today ? ' today' : '') + (d.getDay() === 0 || d.getDay() === 6 ? ' wknd' : ''), dataset: { date: key } },
          h('div', { class: 'cal-num' }, h('span', { class: 'cal-n' }, String(d.getDate())), h('button', { class: 'cal-add', title: 'Criar task neste dia', 'aria-label': 'Criar task em ' + key, onclick: () => A.openQuickAdd(`^${pad(d.getDate())}/${pad(d.getMonth() + 1)} `) }, '+')),
          ...shown.map(chip),
          list.length > 3 && S.calOpen !== key && h('button', { class: 'cal-more', onclick: () => { S.calOpen = key; A.renderBoard(); } }, `+${list.length - 3} mais`));
        cell.addEventListener('dragover', (e) => { if (S.calDrag != null) { e.preventDefault(); cell.classList.add('over'); } });
        cell.addEventListener('dragleave', () => cell.classList.remove('over'));
        cell.addEventListener('drop', (e) => { if (S.calDrag == null) return; e.preventDefault(); cell.classList.remove('over'); setDue(S.calDrag, key); });
        return cell;
      }));
    const nodue = tasks.filter((t) => !t.due_date && (colById(t.column_id) || {}).kind !== 'done');
    const title = cap(first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
    const wrap = h('div', { class: 'cal-wrap' },
      h('div', { class: 'cal-head' }, h('button', { class: 'btn icon sm', 'aria-label': 'Mês anterior', onclick: () => nav(-1) }, icon('left')), h('h2', null, title),
        h('button', { class: 'btn icon sm', 'aria-label': 'Próximo mês', onclick: () => nav(1) }, icon('right')),
        h('button', { class: 'btn sm', onclick: () => { S.cal = { y: now.getFullYear(), m: now.getMonth() }; A.renderBoard(); } }, 'Hoje')),
      grid,
      nodue.length > 0 && h('div', { class: 'cal-nodue' }, h('div', { class: 'label' }, `Sem prazo (${nodue.length}) — arraste para um dia`), h('div', { class: 'cal-nodue-list' }, nodue.map(chip))));
    svgIcons(wrap, 15);
    return wrap;
  }

  A.views.list = listView; A.views.calendar = calendarView;

  /* ---------------- Resumo ---------------- */
  A.openSummary = function () {
    const o = { days: 14 }, body = h('div', { class: 'modal-body' });
    const draw = () => {
      const now = Date.now(), since = now - o.days * 864e5;
      const keys = Array.from({ length: o.days }, (_, i) => ymd(new Date(now - (o.days - 1 - i) * 864e5)));
      const created = Object.fromEntries(keys.map((k) => [k, 0])), done = { ...created };
      S.tasks.forEach((t) => {
        if (t.created_at >= since && created[ymd(new Date(t.created_at))] != null) created[ymd(new Date(t.created_at))]++;
        if (t.completed_at && t.completed_at >= since && done[ymd(new Date(t.completed_at))] != null) done[ymd(new Date(t.completed_at))]++;
      });
      const doneTasks = S.tasks.filter((t) => t.completed_at && t.completed_at >= since);
      const doing = S.tasks.filter((t) => (colById(t.column_id) || {}).kind === 'doing');
      const late = S.tasks.filter((t) => A.dueState(t) === 'late');
      const lead = doneTasks.length ? doneTasks.reduce((n, t) => n + (t.completed_at - t.created_at), 0) / doneTasks.length / 864e5 : null;
      const tracked = doneTasks.reduce((n, t) => n + totalSecs(t), 0);
      const kpi = (label, value, sub) => h('div', { class: 'kpi' }, h('div', { class: 'kpi-v' }, String(value)), h('div', { class: 'kpi-l' }, label), sub && h('div', { class: 'help' }, sub));
      // gráfico de barras (SVG)
      const W = 640, H = 150, pl = 8, pr = 8, pt = 8, pb = 22, max = Math.max(1, ...keys.map((k) => Math.max(created[k], done[k])));
      const bw = (W - pl - pr) / keys.length, bar = (v, i, off, cls) => { const hh = (v / max) * (H - pt - pb); return h('rect', { class: cls, x: pl + i * bw + bw * (0.12 + off * 0.38), y: H - pb - hh, width: bw * 0.36, height: Math.max(hh, v ? 2 : 0), rx: 2 }); };
      const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'chart'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Tasks criadas e concluídas por dia');
      const add = (tag, attrs, text) => { const el = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); if (text != null) el.textContent = text; svg.append(el); };
      add('line', { x1: pl, x2: W - pr, y1: H - pb, y2: H - pb, class: 'axis' });
      keys.forEach((k, i) => {
        if (created[k]) add('rect', { class: 'bar-c', x: pl + i * bw + bw * 0.12, y: H - pb - (created[k] / max) * (H - pt - pb), width: bw * 0.36, height: Math.max((created[k] / max) * (H - pt - pb), 2), rx: 2 });
        if (done[k]) add('rect', { class: 'bar-d', x: pl + i * bw + bw * 0.5, y: H - pb - (done[k] / max) * (H - pt - pb), width: bw * 0.36, height: Math.max((done[k] / max) * (H - pt - pb), 2), rx: 2 });
        if (o.days <= 14 || i % 3 === 0) add('text', { x: pl + i * bw + bw / 2, y: H - 6, class: 'tick', 'text-anchor': 'middle' }, k.slice(8) + '/' + k.slice(5, 7));
      });
      // por pessoa
      const people = [...S.users, { id: null, name: 'Sem responsável', color: '#94a3b8' }].map((u) => ({ u, done: doneTasks.filter((t) => (t.assignee_id || null) === u.id).length, doing: doing.filter((t) => (t.assignee_id || null) === u.id).length, late: late.filter((t) => (t.assignee_id || null) === u.id).length }))
        .filter((p) => p.done || p.doing || p.late);
      const pmax = Math.max(1, ...people.map((p) => p.done + p.doing));
      body.replaceChildren(
        h('div', { class: 'field' }, h('label', null, 'Período'), h('div', { class: 'seg' }, [[7, '7 dias'], [14, '14 dias'], [30, '30 dias']].map(([d, l]) => h('button', { type: 'button', class: o.days === d ? 'on' : '', onclick: () => { o.days = d; draw(); } }, l)))),
        h('div', { class: 'kpis' }, kpi('Criadas', Object.values(created).reduce((a, b) => a + b, 0)), kpi('Concluídas', doneTasks.length), kpi('Em andamento', doing.length), kpi('Atrasadas', late.length),
          kpi('Tempo médio até concluir', lead == null ? '—' : lead < 1 ? '< 1 dia' : lead.toFixed(1).replace('.', ',') + ' dias'), kpi('Tempo registrado (concluídas)', tracked ? fmtDur(tracked) : '—')),
        h('div', { class: 'field' }, h('label', null, 'Criadas × concluídas por dia'), svg, h('div', { class: 'legend' }, h('span', null, h('i', { class: 'lg-c' }), 'Criadas'), h('span', null, h('i', { class: 'lg-d' }), 'Concluídas'))),
        h('div', { class: 'field' }, h('label', null, 'Por pessoa'),
          people.length ? people.map((p) => h('div', { class: 'ppl-row' }, avatar(p.u.id ? p.u : null, 24), h('span', { class: 'ppl-name' }, p.u.name),
            h('div', { class: 'ppl-bar' }, h('i', { class: 'seg-d', style: { width: (p.done / pmax) * 100 + '%' } }), h('i', { class: 'seg-w', style: { width: (p.doing / pmax) * 100 + '%' } })),
            h('span', { class: 'help' }, `${p.done} concl. · ${p.doing} em andamento` + (p.late ? ` · ${p.late} atrasada${p.late > 1 ? 's' : ''}` : '')))) : h('div', { class: 'help' }, 'Sem dados no período.')));
    };
    const close = openModal([modalHead('Resumo da equipe', () => close()), body], { wide: true });
    draw();
  };

  /* ---------------- Atividade recente ---------------- */
  A.openActivity = function () {
    const body = h('div', { class: 'modal-body' }, h('div', { class: 'help' }, 'Carregando…'));
    const close = openModal([modalHead('Atividade recente', () => close()), body], { wide: true });
    guard(async () => {
      const ev = await api('GET', '/api/activity');
      if (!ev.length) return body.replaceChildren(h('div', { class: 'help' }, 'Ainda não há atividade.'));
      const label = (at) => { const k = ymd(new Date(at)); return k === ymd() ? 'Hoje' : k === addDays(ymd(), -1) ? 'Ontem' : fmtDay(k); };
      const groups = []; ev.forEach((e) => { const l = label(e.at), g = groups[groups.length - 1]; if (g && g.l === l) g.items.push(e); else groups.push({ l, items: [e] }); });
      body.replaceChildren(...groups.map((g) => h('div', { class: 'field' }, h('label', null, g.l),
        g.items.map((e) => {
          const u = userById(e.user_id), exists = S.tasks.some((t) => t.id === e.task_id);
          return h('button', { class: 'act-row', disabled: !exists, onclick: () => { close(); A.openTask(e.task_id); } }, avatar(u, 24),
            h('span', { class: 'act-text' }, h('b', null, e.user_name || 'Alguém'), ' ' + A.eventText({ ...e, user_id: e.user_id }) + ' — ', h('span', { class: 'act-task' }, e.task_title)),
            h('time', null, new Date(e.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })));
        }))));
      svgIcons(body, 14);
    })();
  };

  /* ---------------- Exportar ---------------- */
  const csvCell = (v) => { v = v == null ? '' : String(v); return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const dt = (ms) => (ms ? new Date(ms).toLocaleString('pt-BR') : '');
  function download(name, mime, content) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  A.exportCsv = () => {
    const head = ['ID', 'Título', 'Descrição', 'Status', 'Responsável', 'Prioridade', 'Prazo', 'Etiquetas', 'Checklist', 'Tempo (min)', 'Criada em', 'Concluída em'];
    const rows = S.tasks.map((t) => [t.id, t.title, t.description, (colById(t.column_id) || {}).name, (userById(t.assignee_id) || {}).name, PRIO_NAME[t.priority], t.due_date, t.labels.join(', '),
      (t.checklist || []).map((i) => (i.done ? '[x] ' : '[ ] ') + i.text).join(' | '), Math.round(totalSecs(t) / 60), dt(t.created_at), dt(t.completed_at)]);
    download(`tasks-${ymd()}.csv`, 'text/csv;charset=utf-8', '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n'));
    toast(`${rows.length} tasks exportadas`);
  };
  A.exportJson = () => {
    download(`kanban-backup-${ymd()}.json`, 'application/json', JSON.stringify({ exported_at: new Date().toISOString(), columns: S.columns, tasks: S.tasks, users: S.users.map((u) => ({ id: u.id, name: u.name, email: u.email })) }, null, 2));
    toast('Backup baixado');
  };

  /* ---------------- Painel (bento) ---------------- */
  // Vista "bento box": blocos modulares com o que importa agora (UI UX Pro Max: Bento Box Grid).
  function painelView() {
    const now = new Date(), hr = now.getHours(), greet = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
    const kind = (t) => (colById(t.column_id) || {}).kind, byDue = (a, b) => (a.due_date || '9').localeCompare(b.due_date || '9');
    const open = S.tasks.filter((t) => kind(t) !== 'done');
    const late = open.filter((t) => A.dueState(t) === 'late').sort(byDue), today = open.filter((t) => A.dueState(t) === 'today');
    const doing = S.tasks.filter((t) => kind(t) === 'doing');
    const upcoming = open.filter((t) => t.due_date && t.due_date > ymd()).sort(byDue).slice(0, 5);
    const oldest = doing.filter(isRunning).sort((a, b) => a.started_at - b.started_at).slice(0, 4);
    const row = (t) => { const ds = A.dueState(t); return h('button', { class: 'bt-row', onclick: () => A.openTask(t.id) }, avatar(userById(t.assignee_id), 20), h('span', { class: 'bt-title' }, t.title), t.due_date && h('span', { class: 'due' + (ds === 'late' ? ' late' : ds === 'today' ? ' today' : '') }, fmtDay(t.due_date))); };
    const list = (arr, empty) => h('div', { class: 'bt-list' }, arr.length ? arr.map(row) : h('div', { class: 'help' }, empty));
    const tile = (cls, title, ...kids) => h('section', { class: 'bt ' + cls }, h('div', { class: 'bt-h' }, title), ...kids);
    const stat = (n, label, cls = '') => h('div', { class: 'bt-stat ' + cls }, h('b', null, String(n)), h('span', null, label));
    // concluídas nos últimos 7 dias
    const days = Array.from({ length: 7 }, (_, i) => ymd(new Date(Date.now() - (6 - i) * 864e5)));
    const doneBy = Object.fromEntries(days.map((d) => [d, 0])); S.tasks.forEach((t) => { if (t.completed_at) { const k = ymd(new Date(t.completed_at)); if (k in doneBy) doneBy[k]++; } });
    const mx = Math.max(1, ...Object.values(doneBy));
    const chart = h('div', { class: 'bt-bars', role: 'img', 'aria-label': 'Tasks concluídas por dia, últimos 7 dias' }, days.map((d) => h('div', { class: 'bt-bar' }, h('i', { style: { height: Math.max(doneBy[d] ? 8 : 3, (doneBy[d] / mx) * 100) + '%' }, title: `${fmtDay(d)}: ${doneBy[d]}` }), h('span', null, d.slice(8)))));
    const team = h('div', { class: 'bt-list' }, S.users.map((u) => h('div', { class: 'bt-team' }, avatar(u, 22), h('span', { class: 'bt-title' }, u.name.split(' ')[0]),
      h('span', { class: 'help' }, `${open.filter((t) => t.assignee_id === u.id).length} abertas · ${S.tasks.filter((t) => t.assignee_id === u.id && t.completed_at && t.completed_at > Date.now() - 7 * 864e5).length} concl. (7d)`))));
    const act = h('div', { class: 'bt-list' }, h('div', { class: 'help' }, 'Carregando…'));
    const fill = (ev) => act.replaceChildren(...(ev.length ? ev.slice(0, 6).map((e) => h('button', { class: 'bt-row', onclick: () => A.openTask(e.task_id) }, avatar(userById(e.user_id), 20), h('span', { class: 'bt-title' }, h('b', null, (e.user_name || 'Alguém').split(' ')[0]), ' ' + A.eventText(e) + ' — ' + e.task_title))) : [h('div', { class: 'help' }, 'Sem atividade ainda.')]));
    if (S.actCache && Date.now() - S.actCache.at < 30000) fill(S.actCache.ev); else api('GET', '/api/activity').then((ev) => { S.actCache = { at: Date.now(), ev }; if (act.isConnected) fill(ev); }).catch(() => act.replaceChildren(h('div', { class: 'help' }, 'Não foi possível carregar.')));
    const wrap = h('div', { class: 'bento' },
      tile('w2 h2 hero', `${greet}, ${S.me.name.split(' ')[0]}`, h('div', { class: 'help' }, A.cap(now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))),
        h('div', { class: 'bt-stats' }, stat(late.length, 'atrasadas', late.length ? 'late' : ''), stat(today.length, 'vencem hoje', today.length ? 'today' : ''), stat(doing.length, 'em andamento'), stat(open.filter((t) => t.assignee_id === S.me.id).length, 'minhas abertas')),
        h('div', { class: 'bt-sub' }, 'Precisa de atenção'), list([...late, ...today].slice(0, 6), 'Nada atrasado nem vencendo hoje.')),
      tile('', 'Há mais tempo em andamento', h('div', { class: 'bt-list' }, oldest.length ? oldest.map((t) => h('button', { class: 'bt-row', onclick: () => A.openTask(t.id) }, avatar(userById(t.assignee_id), 20), h('span', { class: 'bt-title' }, t.title), h('span', { class: 'due timer-live running', dataset: { since: t.started_at, base: 0 } }, icon('timer'), A.fmtDur(A.totalSecs(t))))) : h('div', { class: 'help' }, 'Nada em andamento.'))),
      tile('', 'Em andamento', list(doing.slice(0, 5), 'Nada em andamento.')),
      tile('w2', 'Concluídas · 7 dias', chart),
      tile('', 'Próximos prazos', list(upcoming, 'Sem prazos à frente.')),
      tile('', 'Equipe', team),
      tile('w2', 'Atividade recente', act));
    svgIcons(wrap, 14);
    return wrap;
  }
  A.views.painel = painelView;
})();
