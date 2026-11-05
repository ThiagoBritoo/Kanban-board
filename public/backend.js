// Camada de dados: Supabase (Auth + Postgres + Realtime). Expõe window.KB.
(() => {
  const cfg = window.KB_CONFIG || {};
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !/SEU-PROJETO|SUA-CHAVE/.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY));
  const sb = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;

  const friendly = (e) => {
    const m = (e && (e.message || e.msg)) || String(e);
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos';
    if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada)';
    if (/already registered|already been registered/i.test(m)) return 'Já existe uma conta com esse e-mail';
    if (/at least \d+ characters/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem conexão com o servidor';
    if (/row-level security/i.test(m)) return 'Sem permissão (sua conta ainda não foi aprovada?)';
    return m;
  };
  const unwrap = ({ data, error }) => { if (error) throw new Error(friendly(error)); return data; };
  const ts = (v) => (v ? Date.parse(v) : null);
  const toTask = (r) => ({ ...r, created_at: ts(r.created_at), updated_at: ts(r.updated_at), completed_at: ts(r.completed_at), timer_started_at: ts(r.timer_started_at), time_spent: r.time_spent || 0, attachments: 0, checklist: Array.isArray(r.checklist) ? r.checklist : [] });
  const cleanChecklist = (arr) => {
    if (!Array.isArray(arr)) throw new Error('Checklist inválido');
    return arr.slice(0, 50).map((i) => ({ text: String((i && i.text) || '').trim().slice(0, 200), done: !!(i && i.done) })).filter((i) => i.text);
  };
  const cleanLabels = (arr) => {
    if (!Array.isArray(arr)) throw new Error('Etiquetas inválidas');
    const seen = new Set(), out = [];
    for (let l of arr) { l = String(l).trim().replace(/^#/, '').slice(0, 24); if (l && !seen.has(l.toLowerCase())) { seen.add(l.toLowerCase()); out.push(l); } }
    return out.slice(0, 8);
  };
  const need = () => { if (!sb) throw new Error('Supabase não configurado'); };

  async function profile(uid) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) throw new Error(friendly(error));
    return data;
  }
  const userOut = (p) => ({ id: p.id, name: p.name, email: p.email, role: p.role, color: p.color, approved: p.approved, prefs: p.prefs || {} });

  const routes = [
    ['GET', /^\/api\/board$/, async () => {
      const [c, t, u, a] = await Promise.all([
        sb.from('board_columns').select('id,name,position,kind,color,wip_limit').order('position').order('id'),
        sb.from('tasks').select('*').is('deleted_at', null).order('position').order('id').limit(5000),
        sb.from('profiles').select('id,name,email,role,color,approved').eq('approved', true).order('created_at'),
        sb.from('attachments').select('task_id').limit(5000),
      ]);
      const counts = {}; unwrap(a).forEach((r) => { counts[r.task_id] = (counts[r.task_id] || 0) + 1; });
      return { columns: unwrap(c), tasks: unwrap(t).map((r) => ({ ...toTask(r), attachments: counts[r.id] || 0 })), users: unwrap(u) };
    }],
    ['POST', /^\/api\/tasks$/, async ({ body }) => {
      const title = String(body.title || '').trim();
      if (!title) throw new Error('Título é obrigatório');
      const row = { title, column_id: body.column_id };
      for (const k of ['description', 'diary', 'assignee_id', 'priority', 'due_date']) if (body[k] !== undefined) row[k] = body[k];
      if (body.labels) row.labels = cleanLabels(body.labels);
      if (body.checklist) row.checklist = cleanChecklist(body.checklist);
      return toTask(unwrap(await sb.from('tasks').insert(row).select().single()));
    }],
    ['PATCH', /^\/api\/tasks\/(\d+)$/, async ({ m, body }) => {
      const patch = {};
      for (const k of ['title', 'description', 'diary', 'assignee_id', 'priority', 'due_date']) if (k in body) patch[k] = body[k];
      if ('title' in patch) { patch.title = String(patch.title).trim(); if (!patch.title) throw new Error('Título é obrigatório'); }
      if ('labels' in body) patch.labels = cleanLabels(body.labels);
      if ('checklist' in body) patch.checklist = cleanChecklist(body.checklist);
      return toTask(unwrap(await sb.from('tasks').update(patch).eq('id', Number(m[1])).select().single()));
    }],
    ['POST', /^\/api\/tasks\/(\d+)\/move$/, async ({ m, body }) => unwrap(await sb.rpc('move_task', { p_task: Number(m[1]), p_column: Number(body.column_id), p_before: body.before_id ?? null }))],
    ['POST', /^\/api\/tasks\/(\d+)\/worked$/, async ({ m }) => unwrap(await sb.rpc('log_worked', { p_task: Number(m[1]) }))],
    // exclusão vai para a lixeira (dá para desfazer); nada é apagado de verdade
    ['DELETE', /^\/api\/tasks\/(\d+)$/, async ({ m }) => unwrap(await sb.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', Number(m[1])))],
    ['POST', /^\/api\/tasks\/(\d+)\/restore$/, async ({ m }) => unwrap(await sb.from('tasks').update({ deleted_at: null }).eq('id', Number(m[1])))],
    ['POST', /^\/api\/tasks\/(\d+)\/comments$/, async ({ m, body }) => unwrap(await sb.rpc('add_comment', { p_task: Number(m[1]), p_text: String(body.text || '') }))],
    ['GET', /^\/api\/tasks\/(\d+)\/events$/, async ({ m }) => unwrap(await sb.from('events').select('id,type,data,at,user_id,profiles(name)').eq('task_id', Number(m[1])).order('id', { ascending: false }).limit(50))
      .map((e) => ({ id: e.id, type: e.type, data: e.data, user_id: e.user_id, user_name: e.profiles && e.profiles.name, at: ts(e.at) }))],

    ['POST', /^\/api\/columns$/, async ({ body }) => {
      const name = String(body.name || '').trim();
      if (!name) throw new Error('Nome é obrigatório');
      return unwrap(await sb.from('board_columns').insert({ name, kind: ['todo', 'doing', 'done'].includes(body.kind) ? body.kind : 'todo' }).select().single());
    }],
    ['PATCH', /^\/api\/columns\/(\d+)$/, async ({ m, body }) => {
      const id = Number(m[1]), patch = {};
      if ('name' in body) { patch.name = String(body.name).trim(); if (!patch.name) throw new Error('Nome é obrigatório'); }
      if ('kind' in body) patch.kind = body.kind;
      if ('color' in body) patch.color = body.color || null;
      if ('wip_limit' in body) patch.wip_limit = body.wip_limit || null;
      if (Object.keys(patch).length) unwrap(await sb.from('board_columns').update(patch).eq('id', id));
      if (body.dir === -1 || body.dir === 1) unwrap(await sb.rpc('move_column', { p_id: id, p_dir: body.dir }));
      return { ok: true };
    }],
    ['DELETE', /^\/api\/columns\/(\d+)$/, async ({ m, url }) => {
      const to = Number(url.searchParams.get('move_to')) || null;
      return unwrap(await sb.rpc('delete_column', { p_id: Number(m[1]), p_move_to: to }));
    }],

    ['POST', /^\/api\/tasks\/(\d+)\/timer$/, async ({ m }) => unwrap(await sb.rpc('toggle_timer', { p_task: Number(m[1]) }))],
    ['GET', /^\/api\/tasks\/(\d+)\/attachments$/, async ({ m }) => unwrap(await sb.from('attachments').select('id,name,path,size,mime,user_id,created_at').eq('task_id', Number(m[1])).order('created_at', { ascending: false }))],
    ['POST', /^\/api\/columns\/(\d+)\/sort$/, async ({ m, body }) => unwrap(await sb.rpc('reorder_column', { p_column: Number(m[1]), p_ids: (body.ids || []).map(Number) }))],
    ['GET', /^\/api\/activity$/, async () => unwrap(await sb.from('events').select('id,type,data,at,user_id,task_id,profiles(name),tasks(title,deleted_at)').order('id', { ascending: false }).limit(120))
      .filter((e) => e.tasks && !e.tasks.deleted_at)
      .map((e) => ({ id: e.id, type: e.type, data: e.data, at: ts(e.at), user_id: e.user_id, user_name: e.profiles && e.profiles.name, task_id: e.task_id, task_title: e.tasks.title }))],
    ['GET', /^\/api\/diary$/, async ({ url }) => {
      const q = url.searchParams;
      const rows = unwrap(await sb.rpc('diary', { p_from: new Date(Number(q.get('from'))).toISOString(), p_to: new Date(Number(q.get('to'))).toISOString(), p_team: q.get('scope') === 'team', p_doing: q.get('doing') === '1' }));
      return { items: rows };
    }],

    ['PATCH', /^\/api\/me$/, async ({ body }) => {
      const { data: { session } } = await sb.auth.getSession();
      const uid = session.user.id, patch = {};
      if ('name' in body) { patch.name = String(body.name).trim(); if (!patch.name) throw new Error('Nome é obrigatório'); }
      if ('prefs' in body) patch.prefs = body.prefs || {};
      if (Object.keys(patch).length) unwrap(await sb.from('profiles').update(patch).eq('id', uid));
      if ('new_password' in body) {
        if (String(body.new_password).length < 6) throw new Error('A nova senha precisa ter pelo menos 6 caracteres');
        const chk = await sb.auth.signInWithPassword({ email: session.user.email, password: String(body.current_password || '') });
        if (chk.error) throw new Error('Senha atual incorreta');
        unwrap(await sb.auth.updateUser({ password: String(body.new_password) }));
      }
      return { ok: true };
    }],
    ['GET', /^\/api\/users$/, async () => unwrap(await sb.from('profiles').select('id,name,email,role,color,approved,created_at').order('created_at'))],
    ['PATCH', /^\/api\/users\/([0-9a-f-]{36})$/, async ({ m, body }) => {
      const patch = {};
      for (const k of ['role', 'approved']) if (k in body) patch[k] = body[k];
      unwrap(await sb.from('profiles').update(patch).eq('id', m[1]));
      return { ok: true };
    }],
  ];

  async function api(method, path, body) {
    need();
    const url = new URL(path, location.origin);
    for (const [mt, re, fn] of routes) {
      if (mt !== method) continue;
      const m = re.exec(url.pathname);
      if (m) {
        try { return await fn({ m, body: body || {}, url }); } catch (e) { throw new Error(friendly(e)); }
      }
    }
    throw new Error('Rota não encontrada: ' + method + ' ' + path);
  }

  window.KB = {
    configured, api,
    async getSession() {
      need();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return { user: null };
      const p = await profile(session.user.id);
      return p ? { user: userOut(p) } : { user: null };
    },
    hasStoredSession() { try { return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k) && localStorage.getItem(k)); } catch { return false; } },
    // renova o token: 'ok' | 'invalid' (sessão realmente inválida) | 'error' (rede/instabilidade: não deslogar)
    async refresh() {
      need();
      const { data, error } = await sb.auth.refreshSession();
      if (data && data.session) return 'ok';
      return error && /refresh_token|invalid|not found|expired|already used/i.test(error.message || '') && !/fetch|network/i.test(error.message || '') ? 'invalid' : 'error';
    },
    async signIn(email, password) { need(); unwrap(await sb.auth.signInWithPassword({ email: email.trim(), password })); },
    async signUp(name, email, password) {
      need();
      const d = unwrap(await sb.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() }, emailRedirectTo: location.origin + location.pathname } }));
      return { needsConfirm: !d.session };
    },
    async resetPassword(email) { need(); unwrap(await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname })); },
    async setPassword(password) { need(); unwrap(await sb.auth.updateUser({ password })); },
    async uploadAttachment(taskId, file, userId) {
      need();
      if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: maior que 10 MB`);
      const safe = (file.name || 'arquivo').replace(/[^\w.\-]+/g, '_').slice(-80) || 'arquivo';
      const path = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
      unwrap(await sb.storage.from('attachments').upload(path, file, { contentType: file.type || 'application/octet-stream' }));
      return unwrap(await sb.from('attachments').insert({ task_id: taskId, name: (file.name || 'arquivo').slice(0, 200), path, size: file.size, mime: file.type || null, user_id: userId }).select().single());
    },
    async attachmentUrl(path) { need(); return unwrap(await sb.storage.from('attachments').createSignedUrl(path, 3600)).signedUrl; },
    async removeAttachment(a) { need(); unwrap(await sb.from('attachments').delete().eq('id', a.id)); try { await sb.storage.from('attachments').remove([a.path]); } catch { /* arquivo órfão não atrapalha */ } },
    async signOut() { need(); await sb.auth.signOut(); },
    onRecovery(cb) { sb && sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') setTimeout(cb, 0); }); },
    subscribe(cb, opts = {}) {
      need();
      const ch = sb.channel('kanban', opts.presence ? { config: { presence: { key: opts.presence.id } } } : undefined);
      ['tasks', 'board_columns', 'profiles', 'attachments'].forEach((table) => ch.on('postgres_changes', { event: '*', schema: 'public', table }, cb));
      if (opts.onPresence) ch.on('presence', { event: 'sync' }, () => { try { opts.onPresence(Object.keys(ch.presenceState())); } catch { /* ok */ } });
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && opts.presence) { try { await ch.track({ id: opts.presence.id, name: opts.presence.name, at: Date.now() }); } catch { /* presença é opcional */ } }
      });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) cb(); });
      setInterval(() => { if (!document.hidden) cb(); }, 60000); // rede de segurança se o websocket cair
    },
  };
})();
