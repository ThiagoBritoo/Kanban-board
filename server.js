// Kanban da empresa — servidor sem dependências (Node >= 22.13, SQLite embutido).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_MS = 30 * 24 * 3600 * 1000;

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'kanban.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', color TEXT NOT NULL,
  prefs TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS board_columns(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, position INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'todo');
CREATE TABLE IF NOT EXISTS tasks(
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  diary TEXT NOT NULL DEFAULT '', column_id INTEGER NOT NULL REFERENCES board_columns(id),
  position INTEGER NOT NULL DEFAULT 0,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  priority INTEGER NOT NULL DEFAULT 1, due_date TEXT, labels TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, completed_at INTEGER);
CREATE TABLE IF NOT EXISTS events(
  id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, type TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}', at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ev_at ON events(at);
CREATE INDEX IF NOT EXISTS ev_task ON events(task_id);
CREATE INDEX IF NOT EXISTS task_col ON tasks(column_id, position);
`);
if (!db.prepare('SELECT 1 FROM board_columns LIMIT 1').get()) {
  const ins = db.prepare('INSERT INTO board_columns(name, position, kind) VALUES (?,?,?)');
  [['A fazer', 'todo'], ['Em andamento', 'doing'], ['Revisão', 'doing'], ['Concluído', 'done']]
    .forEach(([n, k], i) => ins.run(n, i, k));
}

/* ---------- helpers ---------- */
const all = (sql, ...p) => db.prepare(sql).all(...p);
const get = (sql, ...p) => db.prepare(sql).get(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);
const tx = (fn) => { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (m) => new HttpError(400, m);
const notFound = (m = 'Não encontrado') => new HttpError(404, m);

const USER_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ef4444', '#22c55e'];
const KINDS = ['todo', 'doing', 'done'];

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return salt.toString('hex') + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
}
function checkPassword(pw, stored) {
  const [s, h] = stored.split(':');
  const a = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function str(v, max, { required = false, label = 'Campo' } = {}) {
  if (v == null) v = '';
  if (typeof v !== 'string') throw bad(`${label} inválido`);
  v = v.trim();
  if (required && !v) throw bad(`${label} é obrigatório`);
  if (v.length > max) throw bad(`${label} muito longo (máx. ${max})`);
  return v;
}
function cleanLabels(arr) {
  if (!Array.isArray(arr)) throw bad('Etiquetas inválidas');
  const seen = new Set(), out = [];
  for (let l of arr) {
    if (typeof l !== 'string') continue;
    l = l.trim().replace(/^#/, '').slice(0, 24);
    if (l && !seen.has(l.toLowerCase())) { seen.add(l.toLowerCase()); out.push(l); }
  }
  return out.slice(0, 8);
}
const cleanDate = (v) => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw bad('Data inválida');
  return v;
};
const cleanPriority = (v) => {
  const n = Number(v);
  if (![0, 1, 2, 3].includes(n)) throw bad('Prioridade inválida');
  return n;
};

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, color: u.color });
const taskOut = (t) => ({ ...t, labels: JSON.parse(t.labels) });

function logEvent(taskId, userId, type, data = {}) {
  const now = Date.now();
  // junta edições seguidas da mesma pessoa na mesma task (evita ruído na linha do tempo)
  if (type === 'edited' || type === 'worked') {
    const last = get('SELECT id, user_id, type, at FROM events WHERE task_id=? ORDER BY id DESC LIMIT 1', taskId);
    if (last && last.type === type && last.user_id === userId && now - last.at < 5 * 60 * 1000) {
      run('UPDATE events SET at=? WHERE id=?', now, last.id);
      return;
    }
  }
  run('INSERT INTO events(task_id,user_id,type,data,at) VALUES (?,?,?,?,?)', taskId, userId, type, JSON.stringify(data), now);
}

/* ---------- tempo real (SSE) ---------- */
const streams = new Set();
function broadcast() { for (const res of streams) res.write(`data: ${Date.now()}\n\n`); }
setInterval(() => { for (const res of streams) res.write(': ping\n\n'); }, 25000).unref();

/* ---------- login: limite de tentativas ---------- */
const fails = new Map();
function checkRate(key) {
  const f = fails.get(key);
  if (f && f.n >= 8 && Date.now() - f.t < 10 * 60 * 1000) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
}
function noteFail(key) { const f = fails.get(key); fails.set(key, { n: (f && Date.now() - f.t < 10 * 60 * 1000 ? f.n : 0) + 1, t: Date.now() }); }

/* ---------- sessões ---------- */
function startSession(res, userId, secure) {
  const token = crypto.randomBytes(32).toString('base64url');
  run('INSERT INTO sessions(token,user_id,expires_at) VALUES (?,?,?)', sha(token), userId, Date.now() + SESSION_MS);
  res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}${secure ? '; Secure' : ''}`);
}
function userFromReq(req) {
  const m = /(?:^|;\s*)sid=([\w-]+)/.exec(req.headers.cookie || '');
  if (!m) return null;
  const row = get('SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?', sha(m[1]));
  if (!row) return null;
  if (row.expires_at < Date.now()) { run('DELETE FROM sessions WHERE token=?', sha(m[1])); return null; }
  return row;
}

/* ---------- regras de negócio ---------- */
function moveTask(id, colId, beforeId, userId) {
  const t = get('SELECT * FROM tasks WHERE id=?', id);
  if (!t) throw notFound('Task não encontrada');
  const col = get('SELECT * FROM board_columns WHERE id=?', colId);
  if (!col) throw bad('Coluna inválida');
  const now = Date.now();
  tx(() => {
    const list = all('SELECT id FROM tasks WHERE column_id=? AND id!=? ORDER BY position, id', colId, id).map((r) => r.id);
    let idx = beforeId ? list.indexOf(Number(beforeId)) : -1;
    if (idx < 0) idx = list.length;
    list.splice(idx, 0, id);
    const up = db.prepare('UPDATE tasks SET column_id=?, position=? WHERE id=?');
    list.forEach((tid, i) => up.run(colId, i, tid));
    if (t.column_id !== colId) {
      const from = get('SELECT name FROM board_columns WHERE id=?', t.column_id);
      run('UPDATE tasks SET completed_at=?, updated_at=? WHERE id=?', col.kind === 'done' ? (t.completed_at || now) : null, now, id);
      logEvent(id, userId, 'moved', { from: from?.name, to: col.name, kind: col.kind });
      // quem puxa uma task sem dono para "em andamento" fica com ela
      if (col.kind === 'doing' && !t.assignee_id) {
        run('UPDATE tasks SET assignee_id=? WHERE id=?', userId, id);
        logEvent(id, userId, 'assigned', { to: userId });
      }
    }
  });
}

/* ---------- rotas ---------- */
const routes = [];
const route = (method, pattern, handler, { auth = true, admin = false } = {}) =>
  routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler, auth, admin });

route('GET', '/api/session', ({ user }) => ({
  user: user ? publicUser(user) && { ...publicUser(user), prefs: JSON.parse(user.prefs) } : null,
  needsSetup: !get('SELECT 1 FROM users LIMIT 1'),
}), { auth: false });

route('POST', '/api/setup', ({ body, res, secure }) => {
  if (get('SELECT 1 FROM users LIMIT 1')) throw new HttpError(403, 'A instalação já foi feita');
  const user = createUser(body, 'admin');
  startSession(res, user.id, secure);
  return { user: publicUser(user) };
}, { auth: false });

route('POST', '/api/login', ({ body, res, ip, secure }) => {
  const email = str(body.email, 200, { required: true, label: 'E-mail' });
  const key = ip + '|' + email.toLowerCase();
  checkRate(key);
  const u = get('SELECT * FROM users WHERE email=?', email);
  if (!u || !checkPassword(String(body.password || ''), u.pass)) { noteFail(key); throw new HttpError(401, 'E-mail ou senha incorretos'); }
  fails.delete(key);
  startSession(res, u.id, secure);
  return { user: { ...publicUser(u), prefs: JSON.parse(u.prefs) } };
}, { auth: false });

route('POST', '/api/logout', ({ req, res }) => {
  const m = /(?:^|;\s*)sid=([\w-]+)/.exec(req.headers.cookie || '');
  if (m) run('DELETE FROM sessions WHERE token=?', sha(m[1]));
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  return { ok: true };
}, { auth: false });

function createUser(body, role) {
  const name = str(body.name, 80, { required: true, label: 'Nome' });
  const email = str(body.email, 200, { required: true, label: 'E-mail' });
  if (!/^[^@\s]+@[^@\s]+$/.test(email)) throw bad('E-mail inválido');
  const password = String(body.password || '');
  if (password.length < 6) throw bad('A senha precisa ter pelo menos 6 caracteres');
  if (get('SELECT 1 FROM users WHERE email=?', email)) throw bad('Já existe uma conta com esse e-mail');
  const n = get('SELECT COUNT(*) AS n FROM users').n;
  const r = run('INSERT INTO users(name,email,pass,role,color,created_at) VALUES (?,?,?,?,?,?)',
    name, email, hashPassword(password), role, USER_COLORS[n % USER_COLORS.length], Date.now());
  return get('SELECT * FROM users WHERE id=?', Number(r.lastInsertRowid));
}

route('GET', '/api/board', () => ({
  columns: all('SELECT id,name,position,kind FROM board_columns ORDER BY position'),
  tasks: all('SELECT * FROM tasks ORDER BY position, id').map(taskOut),
  users: all('SELECT id,name,email,role,color FROM users ORDER BY id'),
}));

route('GET', '/api/stream', ({ req, res }) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 3000\n\n');
  streams.add(res);
  req.on('close', () => streams.delete(res));
  return undefined;
});

/* tasks */
route('POST', '/api/tasks', ({ body, user }) => {
  const title = str(body.title, 300, { required: true, label: 'Título' });
  const colId = body.column_id ?? get('SELECT id FROM board_columns ORDER BY position LIMIT 1')?.id;
  const col = get('SELECT * FROM board_columns WHERE id=?', colId);
  if (!col) throw bad('Coluna inválida');
  let assignee = body.assignee_id ?? null;
  if (assignee != null && !get('SELECT 1 FROM users WHERE id=?', assignee)) throw bad('Responsável inválido');
  const now = Date.now();
  const pos = (get('SELECT COALESCE(MAX(position),-1)+1 AS p FROM tasks WHERE column_id=?', col.id)).p;
  const id = tx(() => {
    const r = run(`INSERT INTO tasks(title,description,diary,column_id,position,assignee_id,creator_id,priority,due_date,labels,created_at,updated_at,completed_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      title, str(body.description, 10000, { label: 'Descrição' }), str(body.diary, 500, { label: 'Texto do diário' }),
      col.id, pos, assignee, user.id, body.priority == null ? 1 : cleanPriority(body.priority), cleanDate(body.due_date),
      JSON.stringify(body.labels ? cleanLabels(body.labels) : []), now, now, col.kind === 'done' ? now : null);
    const tid = Number(r.lastInsertRowid);
    logEvent(tid, user.id, 'created', { column: col.name });
    if (assignee) logEvent(tid, user.id, 'assigned', { to: assignee });
    return tid;
  });
  return taskOut(get('SELECT * FROM tasks WHERE id=?', id));
});

route('PATCH', '/api/tasks/:id', ({ params, body, user }) => {
  const id = Number(params.id);
  const t = get('SELECT * FROM tasks WHERE id=?', id);
  if (!t) throw notFound('Task não encontrada');
  const sets = [], vals = [];
  const set = (k, v) => { sets.push(`${k}=?`); vals.push(v); };
  let edited = false, assigned = false;
  if ('title' in body) { set('title', str(body.title, 300, { required: true, label: 'Título' })); edited = true; }
  if ('description' in body) { set('description', str(body.description, 10000, { label: 'Descrição' })); edited = true; }
  if ('diary' in body) { set('diary', str(body.diary, 500, { label: 'Texto do diário' })); edited = true; }
  if ('priority' in body) { set('priority', cleanPriority(body.priority)); edited = true; }
  if ('due_date' in body) { set('due_date', cleanDate(body.due_date)); edited = true; }
  if ('labels' in body) { set('labels', JSON.stringify(cleanLabels(body.labels))); edited = true; }
  if ('assignee_id' in body) {
    const a = body.assignee_id;
    if (a != null && !get('SELECT 1 FROM users WHERE id=?', a)) throw bad('Responsável inválido');
    if (a !== t.assignee_id) { set('assignee_id', a); assigned = true; }
  }
  tx(() => {
    if (sets.length) run(`UPDATE tasks SET ${sets.join(',')}, updated_at=? WHERE id=?`, ...vals, Date.now(), id);
    if (assigned) logEvent(id, user.id, 'assigned', { to: body.assignee_id });
    if (edited) logEvent(id, user.id, 'edited');
  });
  return taskOut(get('SELECT * FROM tasks WHERE id=?', id));
});

route('POST', '/api/tasks/:id/move', ({ params, body, user }) => {
  moveTask(Number(params.id), Number(body.column_id), body.before_id, user.id);
  return { ok: true };
});

route('POST', '/api/tasks/:id/worked', ({ params, user }) => {
  const id = Number(params.id);
  if (!get('SELECT 1 FROM tasks WHERE id=?', id)) throw notFound('Task não encontrada');
  logEvent(id, user.id, 'worked');
  return { ok: true };
});

route('DELETE', '/api/tasks/:id', ({ params }) => {
  run('DELETE FROM tasks WHERE id=?', Number(params.id));
  return { ok: true };
});

route('GET', '/api/tasks/:id/events', ({ params }) =>
  all(`SELECT e.id, e.type, e.data, e.at, e.user_id, u.name AS user_name FROM events e
       LEFT JOIN users u ON u.id=e.user_id WHERE e.task_id=? ORDER BY e.id DESC LIMIT 50`, Number(params.id))
    .map((e) => ({ ...e, data: JSON.parse(e.data) })));

/* colunas */
route('POST', '/api/columns', ({ body }) => {
  const name = str(body.name, 40, { required: true, label: 'Nome' });
  const kind = KINDS.includes(body.kind) ? body.kind : 'todo';
  const pos = get('SELECT COALESCE(MAX(position),-1)+1 AS p FROM board_columns').p;
  const r = run('INSERT INTO board_columns(name,position,kind) VALUES (?,?,?)', name, pos, kind);
  return get('SELECT * FROM board_columns WHERE id=?', Number(r.lastInsertRowid));
});

route('PATCH', '/api/columns/:id', ({ params, body }) => {
  const id = Number(params.id);
  const c = get('SELECT * FROM board_columns WHERE id=?', id);
  if (!c) throw notFound('Coluna não encontrada');
  tx(() => {
    if ('name' in body) run('UPDATE board_columns SET name=? WHERE id=?', str(body.name, 40, { required: true, label: 'Nome' }), id);
    if ('kind' in body) {
      if (!KINDS.includes(body.kind)) throw bad('Tipo inválido');
      run('UPDATE board_columns SET kind=? WHERE id=?', body.kind, id);
    }
    if (body.dir === -1 || body.dir === 1) {
      const list = all('SELECT id FROM board_columns ORDER BY position').map((r) => r.id);
      const i = list.indexOf(id), j = i + body.dir;
      if (j >= 0 && j < list.length) { [list[i], list[j]] = [list[j], list[i]]; list.forEach((cid, k) => run('UPDATE board_columns SET position=? WHERE id=?', k, cid)); }
    }
  });
  return { ok: true };
});

route('DELETE', '/api/columns/:id', ({ params, url }) => {
  const id = Number(params.id);
  if (get('SELECT COUNT(*) AS n FROM board_columns').n <= 1) throw bad('O quadro precisa ter pelo menos uma coluna');
  const n = get('SELECT COUNT(*) AS n FROM tasks WHERE column_id=?', id).n;
  tx(() => {
    if (n) {
      const to = Number(url.searchParams.get('move_to'));
      if (!to || to === id || !get('SELECT 1 FROM board_columns WHERE id=?', to)) throw bad('Escolha para onde levar as tasks desta coluna');
      const base = get('SELECT COALESCE(MAX(position),-1)+1 AS p FROM tasks WHERE column_id=?', to).p;
      all('SELECT id FROM tasks WHERE column_id=? ORDER BY position, id', id).forEach((t, i) => run('UPDATE tasks SET column_id=?, position=? WHERE id=?', to, base + i, t.id));
    }
    run('DELETE FROM board_columns WHERE id=?', id);
    all('SELECT id FROM board_columns ORDER BY position').forEach((c, i) => run('UPDATE board_columns SET position=? WHERE id=?', i, c.id));
  });
  return { ok: true };
});

/* diário: tudo que a pessoa mexeu no intervalo (ms) */
route('GET', '/api/diary', ({ url, user }) => {
  const from = Number(url.searchParams.get('from')), to = Number(url.searchParams.get('to'));
  if (!Number.isFinite(from) || !Number.isFinite(to)) throw bad('Período inválido');
  const team = url.searchParams.get('scope') === 'team';
  const withDoing = url.searchParams.get('doing') === '1';
  const rows = all(`
    SELECT t.id, t.title, t.diary, k.name AS column_name, k.kind, MIN(e.at) AS first_at
    FROM events e JOIN tasks t ON t.id=e.task_id JOIN board_columns k ON k.id=t.column_id
    WHERE e.at BETWEEN ? AND ? ${team ? '' : 'AND e.user_id = ?'}
    GROUP BY t.id ORDER BY first_at`, ...(team ? [from, to] : [from, to, user.id]));
  const items = rows.map((r) => ({ ...r, source: 'activity' }));
  if (withDoing) {
    const have = new Set(items.map((i) => i.id));
    const extra = all(`SELECT t.id, t.title, t.diary, k.name AS column_name, k.kind, t.created_at AS first_at
      FROM tasks t JOIN board_columns k ON k.id=t.column_id
      WHERE k.kind='doing' ${team ? 'AND t.assignee_id IS NOT NULL' : 'AND t.assignee_id = ?'} ORDER BY t.position`, ...(team ? [] : [user.id]));
    for (const r of extra) if (!have.has(r.id)) items.push({ ...r, source: 'doing' });
  }
  return { items };
});

/* conta e equipe */
route('PATCH', '/api/me', ({ body, user }) => {
  if ('name' in body) run('UPDATE users SET name=? WHERE id=?', str(body.name, 80, { required: true, label: 'Nome' }), user.id);
  if ('prefs' in body) {
    const s = JSON.stringify(body.prefs ?? {});
    if (s.length > 4000) throw bad('Preferências grandes demais');
    run('UPDATE users SET prefs=? WHERE id=?', s, user.id);
  }
  if ('new_password' in body) {
    if (!checkPassword(String(body.current_password || ''), user.pass)) throw new HttpError(403, 'Senha atual incorreta');
    if (String(body.new_password).length < 6) throw bad('A nova senha precisa ter pelo menos 6 caracteres');
    run('UPDATE users SET pass=? WHERE id=?', hashPassword(String(body.new_password)), user.id);
  }
  return { ok: true };
});

route('POST', '/api/users', ({ body }) => publicUser(createUser(body, body.role === 'admin' ? 'admin' : 'member')), { admin: true });

route('PATCH', '/api/users/:id', ({ params, body, user }) => {
  const id = Number(params.id);
  const u = get('SELECT * FROM users WHERE id=?', id);
  if (!u) throw notFound('Usuário não encontrado');
  if ('name' in body) run('UPDATE users SET name=? WHERE id=?', str(body.name, 80, { required: true, label: 'Nome' }), id);
  if ('role' in body) {
    const role = body.role === 'admin' ? 'admin' : 'member';
    if (role !== 'admin' && id === user.id && get("SELECT COUNT(*) AS n FROM users WHERE role='admin'").n <= 1) throw bad('Precisa existir ao menos um administrador');
    run('UPDATE users SET role=? WHERE id=?', role, id);
  }
  if ('password' in body) {
    if (String(body.password).length < 6) throw bad('A senha precisa ter pelo menos 6 caracteres');
    run('UPDATE users SET pass=? WHERE id=?', hashPassword(String(body.password)), id);
    run('DELETE FROM sessions WHERE user_id=?', id);
  }
  return { ok: true };
}, { admin: true });

route('DELETE', '/api/users/:id', ({ params, user }) => {
  const id = Number(params.id);
  if (id === user.id) throw bad('Você não pode remover a si mesmo');
  run('DELETE FROM users WHERE id=?', id);
  return { ok: true };
}, { admin: true });

/* ---------- servidor HTTP ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 1e6) { reject(new HttpError(413, 'Requisição grande demais')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); resolve(v && typeof v === 'object' ? v : {}); } catch { reject(bad('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'");
  try {
    const url = new URL(req.url, 'http://x');
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url.pathname);

    const method = req.method;
    if (method !== 'GET' && req.headers.origin) {
      let oh; try { oh = new URL(req.headers.origin).host; } catch { oh = ''; }
      if (oh !== req.headers.host) throw new HttpError(403, 'Origem não permitida');
    }
    let match = null;
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(url.pathname);
      if (m) { match = { r, params: m.groups || {} }; break; }
    }
    if (!match) throw notFound('Rota não encontrada');
    const user = userFromReq(req);
    if (match.r.auth && !user) throw new HttpError(401, 'Faça login');
    if (match.r.admin && user.role !== 'admin') throw new HttpError(403, 'Apenas administradores');
    const body = method === 'GET' || method === 'DELETE' ? {} : await readBody(req);
    const ctx = { req, res, url, params: match.params, body, user,
      ip: req.socket.remoteAddress, secure: req.headers['x-forwarded-proto'] === 'https' };
    const out = match.r.handler(ctx);
    if (out === undefined) return; // resposta já tratada (SSE)
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(out));
    if (method !== 'GET' && match.r.auth) broadcast();
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: status === 500 ? 'Erro interno' : e.message }));
  }
});

server.listen(PORT, HOST, () => console.log(`Kanban rodando em http://localhost:${PORT}`));
