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
  const toTask = (r) => ({ ...r, created_at: ts(r.created_at), updated_at: ts(r.updated_at), completed_at: ts(r.completed_at), checklist: Array.isArray(r.checklist) ? r.checklist : [] });
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
      const [c, t, u] = await Promise.all([
        sb.from('board_columns').select('id,name,position,kind,color').order('position').order('id'),
        sb.from('tasks').select('*').is('deleted_at', null).order('position').order('id').limit(5000),
        sb.from('profiles').select('id,name,email,role,color,approved').eq('approved', true).order('created_at'),
      ]);
      return { columns: unwrap(c), tasks: unwrap(t).map(toTask), users: unwrap(u) };
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
      if (Object.keys(patch).length) unwrap(await sb.from('board_columns').update(patch).eq('id', id));
      if (body.dir === -1 || body.dir === 1) unwrap(await sb.rpc('move_column', { p_id: id, p_dir: body.dir }));
      return { ok: true };
    }],
    ['DELETE', /^\/api\/columns\/(\d+)$/, async ({ m, url }) => {
      const to = Number(url.searchParams.get('move_to')) || null;
      return unwrap(await sb.rpc('delete_column', { p_id: Number(m[1]), p_move_to: to }));
    }],

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
    async signIn(email, password) { need(); unwrap(await sb.auth.signInWithPassword({ email: email.trim(), password })); },
    async signUp(name, email, password) {
      need();
      const d = unwrap(await sb.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() }, emailRedirectTo: location.origin + location.pathname } }));
      return { needsConfirm: !d.session };
    },
    async resetPassword(email) { need(); unwrap(await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname })); },
    async setPassword(password) { need(); unwrap(await sb.auth.updateUser({ password })); },
    async signOut() { need(); await sb.auth.signOut(); },
    onRecovery(cb) { sb && sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') setTimeout(cb, 0); }); },
    subscribe(cb) {
      need();
      const ch = sb.channel('kanban');
      ['tasks', 'board_columns', 'profiles'].forEach((table) => ch.on('postgres_changes', { event: '*', schema: 'public', table }, cb));
      ch.subscribe();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) cb(); });
      setInterval(() => { if (!document.hidden) cb(); }, 60000); // rede de segurança se o websocket cair
    },
  };
})();
