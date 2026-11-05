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
  const toTask = (r) => ({ ...r, created_at: ts(r.created_at), updated_at: ts(r.updated_at), completed_at: ts(r.completed_at), timer_started_at: ts(r.timer_started_at), started_at: ts(r.started_at), finished_at: ts(r.finished_at), column_since: ts(r.column_since), notes: r.notes || '', time_spent: r.time_spent || 0, attachments: 0, checklist: Array.isArray(r.checklist) ? r.checklist : [] });
  const cleanChecklist = (arr) => {
    if (!Array.isArray(arr)) throw new Error('Checklist inválido');
    return arr.slice(0, 150).map((i) => ({ text: String((i && i.text) || '').trim().slice(0, 2000), done: !!(i && i.done) })).filter((i) => i.text);
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
  const userOut = (p) => ({ id: p.id, name: p.name, email: p.email, role: p.role, color: p.color, approved: p.approved, avatar_url: p.avatar_url || null, prefs: p.prefs || {} });

  // Projetos: só ligam se a migração 0006 existir no banco (senão o app segue no modo antigo, sem projetos)
  let projectsOn = false, curProject = null;
  const missingTable = (e) => e && (e.code === '42P01' || e.code === 'PGRST205' || /schema cache|does not exist|Could not find the table/i.test(e.message || ''));
  const inProject = (q) => (projectsOn && curProject ? q.eq('project_id', curProject) : q);

  const routes = [
    ['GET', /^\/api\/board$/, async () => {
      if (projectsOn && !curProject) { // ainda sem nenhum projeto
        const me = unwrap(await sb.from('profiles').select('id,name,email,role,color,approved,avatar_url').eq('approved', true));
        return { columns: [], tasks: [], users: me };
      }
      const users = projectsOn
        ? sb.from('project_members').select('profiles(id,name,email,role,color,approved,avatar_url),role,created_at').eq('project_id', curProject).order('created_at')
        : sb.from('profiles').select('id,name,email,role,color,approved,avatar_url').eq('approved', true).order('created_at');
      const [c, t, u, a] = await Promise.all([
        inProject(sb.from('board_columns').select('id,name,position,kind,color,wip_limit,auto_days,auto_to,collapsed' + (projectsOn ? ',project_id' : ''))).order('position').order('id'),
        inProject(sb.from('tasks').select('*')).is('deleted_at', null).order('position').order('id').limit(5000),
        users,
        sb.from('attachments').select('task_id').limit(5000),
      ]);
      const counts = {}; unwrap(a).forEach((r) => { counts[r.task_id] = (counts[r.task_id] || 0) + 1; });
      const ulist = projectsOn ? unwrap(u).filter((r) => r.profiles && r.profiles.approved).map((r) => ({ ...r.profiles, prole: r.role })) : unwrap(u);
      return { columns: unwrap(c), tasks: unwrap(t).map((r) => ({ ...toTask(r), attachments: counts[r.id] || 0 })), users: ulist };
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
      for (const k of ['title', 'description', 'diary', 'assignee_id', 'priority', 'due_date', 'notes', 'started_at', 'finished_at']) if (k in body) patch[k] = body[k];
      if ('title' in patch) { patch.title = String(patch.title).trim(); if (!patch.title) throw new Error('Título é obrigatório'); }
      if ('labels' in body) patch.labels = cleanLabels(body.labels);
      if ('checklist' in body) patch.checklist = cleanChecklist(body.checklist);
      return toTask(unwrap(await sb.from('tasks').update(patch).eq('id', Number(m[1])).select().single()));
    }],
    ['POST', /^\/api\/tasks\/(\d+)\/move$/, async ({ m, body }) => unwrap(await sb.rpc('move_task', { p_task: Number(m[1]), p_column: Number(body.column_id), p_before: body.before_id ?? null }))],
    ['GET', /^\/api\/projects$/, async () => {
      const { data: { session } } = await sb.auth.getSession();
      const r = await sb.from('projects').select('id,name,owner_id,created_at').order('id');
      if (r.error) { if (missingTable(r.error)) { projectsOn = false; return { available: false, projects: [], invites: [] }; } throw new Error(friendly(r.error)); }
      projectsOn = true;
      const mem = unwrap(await sb.from('project_members').select('project_id,role,can_invite').eq('user_id', session.user.id));
      const role = Object.fromEntries(mem.map((x) => [x.project_id, x.role])), canInv = Object.fromEntries(mem.map((x) => [x.project_id, x.role === 'owner' || x.can_invite]));
      const inv = unwrap(await sb.rpc('my_invites'));
      const list = r.data.filter((p) => role[p.id]).map((p) => ({ ...p, role: role[p.id], can_invite: !!canInv[p.id] }));
      if (!list.some((p) => p.id === curProject)) curProject = list[0] ? list[0].id : null;
      return { available: true, projects: list, invites: inv, current: curProject };
    }],
    ['POST', /^\/api\/projects$/, async ({ body }) => ({ id: unwrap(await sb.rpc('create_project', { p_name: String(body.name || '') })) })],
    ['PATCH', /^\/api\/projects\/(\d+)$/, async ({ m, body }) => unwrap(await sb.rpc('rename_project', { p_project: Number(m[1]), p_name: String(body.name || '') }))],
    ['DELETE', /^\/api\/projects\/(\d+)$/, async ({ m }) => unwrap(await sb.rpc('delete_project', { p_project: Number(m[1]) }))],
    ['GET', /^\/api\/projects\/(\d+)\/members$/, async ({ m }) => {
      const id = Number(m[1]);
      const mem = unwrap(await sb.from('project_members').select('user_id,role,can_invite,profiles(id,name,email,color,avatar_url)').eq('project_id', id).order('created_at'));
      const inv = await sb.from('project_invites').select('id,invitee_id,profiles!project_invites_invitee_id_fkey(name,email)').eq('project_id', id);
      return { members: mem.map((x) => ({ id: x.user_id, role: x.role, can_invite: x.can_invite, ...(x.profiles || {}) })), invites: inv.error ? [] : inv.data.map((i) => ({ id: i.id, name: i.profiles && i.profiles.name, email: i.profiles && i.profiles.email })) };
    }],
    ['POST', /^\/api\/projects\/(\d+)\/invite$/, async ({ m, body }) => unwrap(await sb.rpc('invite_to_project', { p_project: Number(m[1]), p_email: String(body.email || '') }))],
    ['DELETE', /^\/api\/projects\/(\d+)\/members\/([0-9a-f-]{36})$/, async ({ m }) => unwrap(await sb.rpc('remove_member', { p_project: Number(m[1]), p_user: m[2] }))],
    ['POST', /^\/api\/projects\/(\d+)\/members\/([0-9a-f-]{36})\/role$/, async ({ m, body }) => unwrap(await sb.rpc('set_member_role', { p_project: Number(m[1]), p_user: m[2], p_role: body.role }))],
    ['POST', /^\/api\/projects\/(\d+)\/members\/([0-9a-f-]{36})\/can_invite$/, async ({ m, body }) => unwrap(await sb.rpc('set_member_can_invite', { p_project: Number(m[1]), p_user: m[2], p_can: !!body.can }))],
    ['POST', /^\/api\/invites\/(\d+)\/respond$/, async ({ m, body }) => ({ project: unwrap(await sb.rpc('respond_invite', { p_invite: Number(m[1]), p_accept: !!body.accept })) })],
    ['DELETE', /^\/api\/invites\/(\d+)$/, async ({ m }) => unwrap(await sb.rpc('cancel_invite', { p_invite: Number(m[1]) }))],
    ['POST', /^\/api\/rules\/apply$/, async () => ({ moved: unwrap(await sb.rpc('apply_column_rules')) })],
    ['GET', /^\/api\/notes$/, async () => unwrap(await inProject(sb.from('notes').select('*')).order('updated_at', { ascending: false }).limit(500))],
    ['POST', /^\/api\/notes$/, async ({ body }) => unwrap(await sb.from('notes').insert({ title: String(body.title || '').slice(0, 120), body: String(body.body || '').slice(0, 20000), ...(projectsOn && curProject ? { project_id: curProject } : {}) }).select().single())],
    ['PATCH', /^\/api\/notes\/(\d+)$/, async ({ m, body }) => {
      const patch = { updated_at: new Date().toISOString() };
      if ('title' in body) patch.title = String(body.title).slice(0, 120);
      if ('body' in body) patch.body = String(body.body).slice(0, 20000);
      return unwrap(await sb.from('notes').update(patch).eq('id', Number(m[1])).select().single());
    }],
    ['DELETE', /^\/api\/notes\/(\d+)$/, async ({ m }) => unwrap(await sb.from('notes').delete().eq('id', Number(m[1])))],
    ['GET', /^\/api\/tokens$/, async () => unwrap(await sb.from('api_tokens').select('id,name,created_at,last_used_at').order('id'))],
    ['POST', /^\/api\/tokens$/, async ({ body }) => {
      const raw = 'kb_' + [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)))].map((b) => b.toString(16).padStart(2, '0')).join('');
      unwrap(await sb.from('api_tokens').insert({ name: String(body.name || 'token').slice(0, 60), token_hash: hash }));
      return { token: raw };
    }],
    ['DELETE', /^\/api\/tokens\/(\d+)$/, async ({ m }) => unwrap(await sb.from('api_tokens').delete().eq('id', Number(m[1])))],
    ['POST', /^\/api\/tasks\/(\d+)\/worked$/, async ({ m }) => unwrap(await sb.rpc('log_worked', { p_task: Number(m[1]) }))],
    // exclusão vai para a lixeira (dá para desfazer); nada é apagado de verdade
    ['DELETE', /^\/api\/tasks\/(\d+)$/, async ({ m }) => unwrap(await sb.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', Number(m[1])))],
    ['GET', /^\/api\/trash$/, async () => unwrap(await inProject(sb.from('tasks').select('id,title,deleted_at,column_id')).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(60))],
    ['POST', /^\/api\/tasks\/(\d+)\/restore$/, async ({ m }) => unwrap(await sb.from('tasks').update({ deleted_at: null }).eq('id', Number(m[1])))],
    ['POST', /^\/api\/tasks\/(\d+)\/comments$/, async ({ m, body }) => unwrap(await sb.rpc('add_comment', { p_task: Number(m[1]), p_text: String(body.text || '') }))],
    ['GET', /^\/api\/tasks\/(\d+)\/events$/, async ({ m }) => unwrap(await sb.from('events').select('id,type,data,at,user_id,profiles(name)').eq('task_id', Number(m[1])).order('id', { ascending: false }).limit(50))
      .map((e) => ({ id: e.id, type: e.type, data: e.data, user_id: e.user_id, user_name: e.profiles && e.profiles.name, at: ts(e.at) }))],

    ['POST', /^\/api\/columns$/, async ({ body }) => {
      const name = String(body.name || '').trim();
      if (!name) throw new Error('Nome é obrigatório');
      return unwrap(await sb.from('board_columns').insert({ name, kind: ['todo', 'doing', 'done'].includes(body.kind) ? body.kind : 'todo', ...(projectsOn && curProject ? { project_id: curProject } : {}) }).select().single());
    }],
    ['PATCH', /^\/api\/columns\/(\d+)$/, async ({ m, body }) => {
      const id = Number(m[1]), patch = {};
      if ('name' in body) { patch.name = String(body.name).trim(); if (!patch.name) throw new Error('Nome é obrigatório'); }
      if ('kind' in body) patch.kind = body.kind;
      if ('color' in body) patch.color = body.color || null;
      if ('wip_limit' in body) patch.wip_limit = body.wip_limit || null;
      if ('auto_days' in body) patch.auto_days = body.auto_days || null;
      if ('auto_to' in body) patch.auto_to = body.auto_to || null;
      if ('collapsed' in body) patch.collapsed = !!body.collapsed;
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
    ['GET', /^\/api\/activity$/, async () => unwrap(await sb.from('events').select('id,type,data,at,user_id,task_id,profiles(name),tasks(title,deleted_at,project_id)').order('id', { ascending: false }).limit(300))
      .filter((e) => e.tasks && !e.tasks.deleted_at && (!projectsOn || !curProject || e.tasks.project_id === curProject)).slice(0, 120)
      .map((e) => ({ id: e.id, type: e.type, data: e.data, at: ts(e.at), user_id: e.user_id, user_name: e.profiles && e.profiles.name, task_id: e.task_id, task_title: e.tasks.title }))],
    ['GET', /^\/api\/diary$/, async ({ url }) => {
      const q = url.searchParams;
      const rows = unwrap(await sb.rpc('diary', { p_from: new Date(Number(q.get('from'))).toISOString(), p_to: new Date(Number(q.get('to'))).toISOString(), p_team: q.get('scope') === 'team', p_doing: q.get('doing') === '1', ...(projectsOn && curProject ? { p_project: curProject } : {}) }));
      return { items: rows };
    }],

    ['PATCH', /^\/api\/me$/, async ({ body }) => {
      const { data: { session } } = await sb.auth.getSession();
      const uid = session.user.id, patch = {};
      if ('name' in body) { patch.name = String(body.name).trim(); if (!patch.name) throw new Error('Nome é obrigatório'); }
      if ('prefs' in body) patch.prefs = body.prefs || {};
      if ('avatar_url' in body) patch.avatar_url = body.avatar_url || null;
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
    setProject(id) { curProject = id || null; },
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
    async uploadAvatar(file, userId) {
      need();
      const path = `${userId}/${Date.now()}.jpg`;
      unwrap(await sb.storage.from('avatars').upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true }));
      return path;
    },
    avatarUrl(path) { return path && sb ? sb.storage.from('avatars').getPublicUrl(path).data.publicUrl : null; },
    async attachmentUrl(path) { need(); return unwrap(await sb.storage.from('attachments').createSignedUrl(path, 3600)).signedUrl; },
    async removeAttachment(a) { need(); unwrap(await sb.from('attachments').delete().eq('id', a.id)); try { await sb.storage.from('attachments').remove([a.path]); } catch { /* arquivo órfão não atrapalha */ } },
    async signOut() { need(); await sb.auth.signOut(); },
    onRecovery(cb) { sb && sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') setTimeout(cb, 0); }); },
    subscribe(cb, opts = {}) {
      need();
      const ch = sb.channel('kanban', opts.presence ? { config: { presence: { key: opts.presence.id } } } : undefined);
      ['tasks', 'board_columns', 'profiles', 'attachments', 'notes', ...(projectsOn ? ['projects', 'project_members', 'project_invites'] : [])].forEach((table) => ch.on('postgres_changes', { event: '*', schema: 'public', table }, cb));
      if (opts.onPresence) ch.on('presence', { event: 'sync' }, () => { try { opts.onPresence(Object.keys(ch.presenceState())); } catch { /* ok */ } });
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && opts.presence) { try { await ch.track({ id: opts.presence.id, name: opts.presence.name, at: Date.now() }); } catch { /* presença é opcional */ } }
      });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) cb(); });
      setInterval(() => { if (!document.hidden) cb(); }, 60000); // rede de segurança se o websocket cair
    },
  };
})();
