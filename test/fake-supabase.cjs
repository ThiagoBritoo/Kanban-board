// API Supabase FALSA em memória, só para testar a interface (não é o banco real).
const crypto = require('crypto');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
module.exports = function makeFake() {
  const uid = 'aaaaaaaa-0000-0000-0000-000000000001', uid2 = 'bbbbbbbb-0000-0000-0000-000000000002';
  const db = {
    profiles: [
      { id: uid, name: 'Thiago', email: 't@x.com', role: 'admin', approved: true, color: '#6366f1', prefs: {}, created_at: '2026-01-01T00:00:00Z' },
      { id: uid2, name: 'Maria', email: 'm@x.com', role: 'member', approved: true, color: '#ec4899', prefs: {}, created_at: '2026-01-02T00:00:00Z' },
    ],
    board_columns: [['A fazer', 'todo'], ['Em andamento', 'doing'], ['Revisão', 'doing'], ['Concluído', 'done']].map(([name, kind], i) => ({ id: i + 1, name, position: i, kind, color: null, wip_limit: null, auto_days: null, auto_to: null, collapsed: false })),
    tasks: [], events: [], attachments: [], notes: [], api_tokens: [], nextNote: 1, files: {}, nextTask: 1, nextEv: 1, nextAtt: 1, calls: [],
  };
  let projectsOn = false;
  const now = () => new Date().toISOString();
  const ev = (task_id, user_id, type, data = {}) => db.events.push({ id: db.nextEv++, task_id, user_id, type, data, at: now() });
  const col = (id) => db.board_columns.find((c) => c.id === id);
  const parseFilters = (q) => {
    const f = [];
    for (const [k, v] of q.entries()) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
      const nm = /^not\.is\.(.*)$/.exec(v); if (nm) { f.push([k, 'notis', nm[1]]); continue; }
      const m = /^(eq|is)\.(.*)$/.exec(v); if (m) f.push([k, m[1], m[2]]);
    }
    return f;
  };
  const test = (row, [k, op, val]) => op === 'notis' ? !(val === 'null' ? row[k] == null : row[k] === (val === 'true')) : op === 'is' ? (val === 'null' ? row[k] == null : row[k] === (val === 'true')) : String(row[k]) === val;
  const filt = (rows, q) => rows.filter((r) => parseFilters(q).every((f) => test(r, f)));
  const order = (rows, q) => {
    const o = q.get('order'); if (!o) return rows;
    const keys = o.split(',').map((p) => p.split('.'));
    return [...rows].sort((a, b) => { for (const [k, d] of keys) { if (a[k] < b[k]) return d === 'desc' ? 1 : -1; if (a[k] > b[k]) return d === 'desc' ? -1 : 1; } return 0; });
  };
  const insertTask = (b, user) => {
    const id = db.nextTask++;
    const k = col(b.column_id);
    const t = { description: '', diary: '', assignee_id: null, priority: 1, due_date: null, labels: [], checklist: [], deleted_at: null, time_spent: 0, timer_started_at: null, timer_user: null, completed_at: k.kind === 'done' ? now() : null, started_at: k.kind !== 'todo' ? now() : null, finished_at: k.kind === 'done' ? now() : null, column_since: now(), notes: '', ...b, id, creator_id: user,
      position: Math.max(-1, ...db.tasks.filter((x) => x.column_id === b.column_id).map((x) => x.position)) + 1, created_at: now(), updated_at: now() };
    if (projectsOn) t.project_id = k.project_id;
    db.tasks.push(t); ev(id, user, 'created', { column: k.name }); if (t.assignee_id) ev(id, user, 'assigned', { to: t.assignee_id }); return t;
  };
  const patchTask = (t, b, user) => {
    const before = JSON.stringify([t.title, t.description, t.diary, t.priority, t.due_date, t.labels, t.checklist]);
    if ('assignee_id' in b && b.assignee_id !== t.assignee_id) ev(t.id, user, 'assigned', { to: b.assignee_id });
    Object.assign(t, b, { updated_at: now() });
    if (JSON.stringify([t.title, t.description, t.diary, t.priority, t.due_date, t.labels, t.checklist]) !== before) {
      const last = db.events.filter((e) => e.task_id === t.id).pop();
      if (last && last.type === 'edited' && last.user_id === user) last.at = now(); else ev(t.id, user, 'edited');
    }
  };
  const rpc = (fn, a, user) => {
    if (fn === 'move_task') {
      const t = db.tasks.find((x) => x.id === a.p_task); const to = col(a.p_column);
      if (t.column_id !== a.p_column) {
        ev(t.id, user, 'moved', { from: col(t.column_id).name, to: to.name, kind: to.kind });
        t.column_since = now();
        if (to.kind === 'done') { t.completed_at = t.completed_at || now(); t.finished_at = t.finished_at || now(); t.started_at = t.started_at || now(); }
        else { t.completed_at = null; t.finished_at = null; if (to.kind === 'doing') t.started_at = t.started_at || now(); }
        if (to.kind === 'doing' && !t.assignee_id) { t.assignee_id = user; ev(t.id, user, 'assigned', { to: user }); }
        t.column_id = a.p_column;
      }
      const arr = db.tasks.filter((x) => x.column_id === a.p_column && x.id !== t.id && !x.deleted_at).sort((p, q) => p.position - q.position || p.id - q.id);
      let i = a.p_before ? arr.findIndex((x) => x.id === a.p_before) : -1; if (i < 0) i = arr.length; arr.splice(i, 0, t); arr.forEach((x, k) => (x.position = k)); return null;
    }
    if (fn === 'create_project') {
      const pid = (db.projects.reduce((m, x) => Math.max(m, x.id), 0)) + 1; db.projects.push({ id: pid, name: a.p_name, owner_id: user, created_at: now() });
      db.project_members.push({ project_id: pid, user_id: user, role: 'owner', created_at: now() });
      ['A fazer:todo', 'Em andamento:doing', 'Revisão:doing', 'Concluído:done'].forEach((x, i) => db.board_columns.push({ id: 100 + db.board_columns.length, name: x.split(':')[0], kind: x.split(':')[1], position: i, project_id: pid, color: null, wip_limit: null, auto_days: null, auto_to: null, collapsed: false }));
      return pid;
    }
    if (fn === 'my_invites') return db.project_invites.filter((i) => i.invitee_id === user).map((i) => ({ id: i.id, project_id: i.project_id, project_name: db.projects.find((p) => p.id === i.project_id).name, inviter_name: (db.profiles.find((x) => x.id === i.invited_by) || {}).name }));
    if (fn === 'invite_to_project') { const u = db.profiles.find((x) => x.email === a.p_email); if (!u) throw { code: 'P0001', message: 'Não achei uma conta aprovada com esse e-mail' }; db.project_invites.push({ id: db.project_invites.length + 1, project_id: a.p_project, invitee_id: u.id, invited_by: user }); return null; }
    if (fn === 'respond_invite') { const i = db.project_invites.find((x) => x.id === a.p_invite); db.project_invites = db.project_invites.filter((x) => x !== i); if (a.p_accept) db.project_members.push({ project_id: i.project_id, user_id: i.invitee_id, role: 'member', created_at: now() }); return a.p_accept ? i.project_id : null; }
    if (fn === 'rename_project') { db.projects.find((p) => p.id === a.p_project).name = a.p_name; return null; }
    if (fn === 'remove_member') { db.project_members = db.project_members.filter((m) => !(m.project_id === a.p_project && m.user_id === a.p_user)); return null; }
    if (fn === 'delete_project') { db.projects = db.projects.filter((p) => p.id !== a.p_project); db.board_columns = db.board_columns.filter((c) => c.project_id !== a.p_project); db.tasks = db.tasks.filter((t) => t.project_id !== a.p_project); db.project_members = db.project_members.filter((m) => m.project_id !== a.p_project); return null; }
    if (fn === 'apply_column_rules') {
      let n = 0;
      db.board_columns.filter((c) => c.auto_days && c.auto_to).forEach((c) => {
        db.tasks.filter((t) => t.column_id === c.id && !t.deleted_at && Date.now() - Date.parse(t.column_since) > c.auto_days * 864e5).forEach((t) => {
          t.column_id = c.auto_to; t.column_since = now(); t.position = 1e6 + n; n++; ev(t.id, null, 'auto', { from: c.name, to: col(c.auto_to).name, days: c.auto_days });
        });
      }); return n;
    }
    if (fn === 'add_comment') { if (!a.p_text.trim()) throw { code: 'P0001', message: 'Comentário inválido (1 a 2000 caracteres)' }; ev(a.p_task, user, 'comment', { text: a.p_text.trim() }); return null; }
    if (fn === 'toggle_timer') {
      const t = db.tasks.find((x) => x.id === a.p_task);
      if (t.timer_started_at) { const secs = Math.max(0, Math.floor((Date.now() - Date.parse(t.timer_started_at)) / 1000)); t.time_spent += secs; t.timer_started_at = null; t.timer_user = null; ev(t.id, user, 'timer', { action: 'stop', seconds: secs }); }
      else { db.tasks.filter((x) => x.timer_user === user && x.timer_started_at).forEach((x) => { x.time_spent += Math.floor((Date.now() - Date.parse(x.timer_started_at)) / 1000); x.timer_started_at = null; x.timer_user = null; }); t.timer_started_at = now(); t.timer_user = user; ev(t.id, user, 'timer', { action: 'start' }); }
      return null;
    }
    if (fn === 'reorder_column') { a.p_ids.forEach((id, i) => { const t = db.tasks.find((x) => x.id === id); if (t && t.column_id === a.p_column) t.position = i; }); return null; }
    if (fn === 'log_worked') { ev(a.p_task, user, 'worked'); return null; }
    if (fn === 'move_column') { const arr = [...db.board_columns].sort((x, y) => x.position - y.position); const i = arr.findIndex((c) => c.id === a.p_id), j = i + a.p_dir; if (j >= 0 && j < arr.length) { [arr[i], arr[j]] = [arr[j], arr[i]]; arr.forEach((c, k) => (c.position = k)); } return null; }
    if (fn === 'diary') {
      const f = Date.parse(a.p_from), to = Date.parse(a.p_to); const out = []; const seen = new Set();
      for (const t of db.tasks.filter((x) => !x.deleted_at)) {
        const es = db.events.filter((e) => e.task_id === t.id && Date.parse(e.at) >= f && Date.parse(e.at) <= to && (a.p_team || e.user_id === user));
        if (es.length) { seen.add(t.id); out.push({ id: t.id, title: t.title, diary: t.diary, column_name: col(t.column_id).name, kind: col(t.column_id).kind, first_at: es[0].at, source: 'activity' }); }
      }
      if (a.p_doing) for (const t of db.tasks.filter((x) => !x.deleted_at && col(x.column_id).kind === 'doing' && x.assignee_id === user && !seen.has(x.id))) out.push({ id: t.id, title: t.title, diary: t.diary, column_name: col(t.column_id).name, kind: 'doing', first_at: t.created_at, source: 'doing' });
      return out;
    }
    throw { code: '42883', message: 'função desconhecida ' + fn };
  };

  const jwt = (u) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
  const userObj = (p) => ({ id: p.id, aud: 'authenticated', role: 'authenticated', email: p.email, app_metadata: {}, user_metadata: { name: p.name }, created_at: p.created_at });
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };

  async function handle(route) {
    const req = route.request(), url = new URL(req.url()), m = req.method();
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const send = (status, body, extra = {}) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json', ...extra }, body: body === undefined ? '' : JSON.stringify(body) });
    const p = url.pathname;
    try {
      if (p.startsWith('/auth/v1/token')) {
        const b = JSON.parse(req.postData() || '{}'); const u = db.profiles.find((x) => x.email === b.email);
        if (!u || b.password !== 'senha123') return send(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials', message: 'Invalid login credentials' });
        const exp = Math.floor(Date.now() / 1000) + 3600;
        return send(200, { access_token: jwt(u), token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'r' + u.id, user: userObj(u) });
      }
      if (p.startsWith('/auth/v1/user')) { const h = req.headers().authorization || ''; const sub = JSON.parse(Buffer.from(h.split('.')[1] || 'e30', 'base64url').toString() || '{}').sub; const u = db.profiles.find((x) => x.id === sub) || db.profiles[0]; return send(200, userObj(u)); }
      if (p.startsWith('/auth/v1/logout')) return send(204);
      if (p.startsWith('/storage/v1/object/sign/')) {
        if (m === 'POST') return send(200, { signedURL: p.replace('/storage/v1', '') + '?token=t' });
        return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'image/png' }, body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') });
      }
      if (p.startsWith('/storage/v1/object/public/avatars/')) return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'image/png' }, body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') });
      if (p.startsWith('/storage/v1/object/avatars/')) { if (m === 'POST' || m === 'PUT') { db.files['avatars/' + decodeURIComponent(p.replace('/storage/v1/object/avatars/', ''))] = 1; return send(200, { Key: 'avatars/x', Id: 'x' }); } }
      if (p.startsWith('/storage/v1/object/attachments')) {
        if (m === 'POST') { db.files[decodeURIComponent(p.replace('/storage/v1/object/attachments/', ''))] = (req.postDataBuffer() || Buffer.from('')).length; return send(200, { Key: 'attachments/x', Id: 'x' }); }
        if (m === 'DELETE') { const b = JSON.parse(req.postData() || '{}'); (b.prefixes || []).forEach((x) => delete db.files[x]); return send(200, []); }
      }
      if (!p.startsWith('/rest/v1/')) return send(404, { message: 'x' });
      const auth = req.headers().authorization || ''; const sub = JSON.parse(Buffer.from((auth.split('.')[1]) || 'e30', 'base64url').toString() || '{}').sub || uid;
      const name = p.replace('/rest/v1/', ''); const q = url.searchParams; const wantObj = /vnd\.pgrst\.object/.test(req.headers().accept || '');
      const body = req.postData() ? JSON.parse(req.postData()) : null;
      db.calls.push(`${m} ${name}${url.search ? '?' + url.search.slice(1, 80) : ''}`);
      const out = (rows) => wantObj ? (rows.length === 1 ? send(200, rows[0]) : send(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows` })) : send(200, rows);
      if (name.startsWith('rpc/')) { try { const r = rpc(name.slice(4), body || {}, sub); return send(200, r); } catch (e) { return send(400, { code: e.code || 'P0001', message: e.message }); } }
      if (name === 'events' && m === 'GET') { const rows = order(filt(db.events, q), q).map((e) => { const tk = db.tasks.find((x) => x.id === e.task_id); return { ...e, profiles: { name: (db.profiles.find((x) => x.id === e.user_id) || {}).name }, tasks: tk ? { title: tk.title, deleted_at: tk.deleted_at } : null }; }); return out(q.get('limit') ? rows.slice(0, Number(q.get('limit'))) : rows); }
      const table = db[name]; if (!table) return send(404, { code: 'PGRST205', message: "Could not find the table 'public." + name + "' in the schema cache" });
      if (m === 'GET' && name === 'project_members' && /profiles/.test(q.get('select') || '')) { return out(filt(table, q).map((r) => ({ ...r, profiles: db.profiles.find((x) => x.id === r.user_id) }))); }
      if (m === 'GET' && name === 'project_invites') { return out(filt(table, q).map((r) => ({ ...r, profiles: db.profiles.find((x) => x.id === r.invitee_id) }))); }
      if (m === 'GET') { let rows = order(filt(table, q), q); if (q.get('limit')) rows = rows.slice(0, Number(q.get('limit'))); return out(rows); }
      if (m === 'POST' && name === 'tasks') return send(201, insertTask(body, sub));
      if (m === 'POST' && name === 'attachments') { const a = { id: db.nextAtt++, created_at: now(), mime: null, ...body }; db.attachments.push(a); ev(a.task_id, sub, 'attachment', { name: a.name }); return send(201, a); }
      if (m === 'POST' && name === 'board_columns') { const c = { project_id: body.project_id, id: db.board_columns.length + 10, position: db.board_columns.length, color: null, kind: 'todo', ...body }; db.board_columns.push(c); return send(201, c); }
      if (m === 'POST' && (name === 'notes' || name === 'api_tokens')) { const r = { id: db.nextNote++, created_at: now(), updated_at: now(), created_by: sub, user_id: sub, title: '', body: '', ...body }; table.push(r); return send(201, r); }
      if (m === 'PATCH') {
        const rows = filt(table, q); rows.forEach((r) => (name === 'tasks' ? patchTask(r, body, sub) : Object.assign(r, body)));
        return out(rows);
      }
      if (m === 'DELETE') { if (name === 'notes' || name === 'api_tokens') { const ids = filt(table, q).map((r) => r.id); db[name] = table.filter((r) => !ids.includes(r.id)); return send(204); } if (name === 'attachments') { const ids = filt(db.attachments, q).map((r) => r.id); db.attachments = db.attachments.filter((r) => !ids.includes(r.id)); } return send(204); }
      return send(405, { message: 'nao suportado' });
    } catch (e) { return send(500, { message: String(e && e.message || e) }); }
  }
  // liga o modo "com projetos" (migração 0006): tabelas novas, tudo no projeto 1 "Geral"
  const enableProjects = () => {
    projectsOn = true;
    db.projects = [{ id: 1, name: 'Geral', owner_id: uid, created_at: now() }];
    db.project_members = [{ project_id: 1, user_id: uid, role: 'owner', created_at: now() }, { project_id: 1, user_id: uid2, role: 'member', created_at: now() }];
    db.project_invites = [];
    db.board_columns.forEach((c) => (c.project_id = 1)); db.tasks.forEach((t) => (t.project_id = 1));
  };
  return { db, handle, uid, uid2, enableProjects };
};
