(() => {
'use strict';

/* ================= utilidades ================= */
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4c3 0 5.6-2.5 5.6-5.5C23 6 18 2 12 2z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M8 7h8M8 11h6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  grid: '<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="4" height="7" rx="1.5"/>',
  take: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
};
function icon(name) {
  const t = document.createElement('template');
  t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  return t.content.firstChild;
}

// Cria elementos sem innerHTML (todo texto vira textContent => sem XSS).
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const $ = (s, r = document) => r.querySelector(s);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayRange = (s) => { const [y, m, d] = s.split('-').map(Number); return [new Date(y, m - 1, d).getTime(), new Date(y, m - 1, d + 1).getTime() - 1]; };
const fmtDay = (s) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '';
const fmtTime = (at) => new Date(at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const initials = (n) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const hueOf = (s) => { let x = 0; for (const c of norm(s)) x = (x * 31 + c.charCodeAt(0)) % 360; return x; };

const api = (method, url, body) => KB.api(method, url, body);

function toast(msg, err = false) {
  const el = h('div', { class: 'toast' + (err ? ' err' : '') }, !err && icon('check'), msg);
  el.firstChild?.nodeName === 'svg' && Object.assign(el.firstChild.style, { width: '16px', height: '16px' });
  $('#toasts').append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, err ? 4200 : 2200);
}
const guard = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { toast(e.message, true); } };

/* ================= estado e preferências ================= */
const THEMES = [
  ['minimal', 'Minimal', 'limpo e neutro'], ['paper', 'Papel', 'calmo, serifado'], ['sage', 'Sálvia', 'suave e verde'],
  ['ocean', 'Oceano', 'azul profundo'], ['aurora', 'Aurora', 'vidro e luz'], ['neon', 'Neon', 'cyber, contraste alto'],
  ['brutal', 'Brutal', 'ousado, contorno grosso'], ['sunset', 'Sunset', 'gradiente impactante'],
];
const DEFAULT_PREFS = { theme: 'minimal', mode: 'system', accent: null, font: 'auto', radius: null, density: 'comfortable', motion: true, autoAssign: true, hideOldDone: true };
const S = { me: null, users: [], columns: [], tasks: [], prefs: { ...DEFAULT_PREFS }, filter: { q: '', who: 'all' }, drafts: {}, drag: null, seen: null, showAllDone: false };

const sysDark = matchMedia('(prefers-color-scheme: dark)');
const resolvedMode = () => S.prefs.mode === 'system' ? (sysDark.matches ? 'dark' : 'light') : S.prefs.mode;

function applyPrefs() {
  const p = S.prefs, r = document.documentElement;
  r.dataset.theme = p.theme; r.dataset.mode = resolvedMode(); r.dataset.density = p.density;
  r.dataset.motion = p.motion ? 'on' : 'off';
  p.font && p.font !== 'auto' ? (r.dataset.font = p.font) : delete r.dataset.font;
  p.radius != null ? r.style.setProperty('--radius-u', p.radius + 'px') : r.style.removeProperty('--radius-u');
  if (p.accent && /^#[0-9a-f]{6}$/i.test(p.accent)) {
    const n = parseInt(p.accent.slice(1), 16), [R, G, B] = [n >> 16, (n >> 8) & 255, n & 255];
    r.style.setProperty('--accent', p.accent);
    r.style.setProperty('--accent-fg', (0.299 * R + 0.587 * G + 0.114 * B) > 160 ? '#000' : '#fff');
  } else { r.style.removeProperty('--accent'); r.style.removeProperty('--accent-fg'); }
}
let prefTimer;
function setPrefs(patch, { refreshSettings = true } = {}) {
  S.prefs = { ...S.prefs, ...patch };
  applyPrefs();
  try { localStorage.setItem('kb-prefs', JSON.stringify(S.prefs)); } catch { /* modo privado */ }
  if (S.me) { clearTimeout(prefTimer); prefTimer = setTimeout(() => api('PATCH', '/api/me', { prefs: S.prefs }).catch(() => {}), 500); }
  if (refreshSettings && S.refreshSettings) S.refreshSettings();
  if (S.me) { renderTopbarMode(); renderBoard(); }
}
sysDark.addEventListener('change', () => { if (S.prefs.mode === 'system') { applyPrefs(); S.me && renderTopbarMode(); } });
function loadLocalPrefs() { try { return JSON.parse(localStorage.getItem('kb-prefs') || '{}'); } catch { return {}; } }

const userById = (id) => S.users.find((u) => u.id === id);
const colById = (id) => S.columns.find((c) => c.id === id);

function avatar(user, size = 26) {
  if (!user) return h('span', { class: 'avatar empty', style: { '--s': size + 'px' }, title: 'Sem responsável' }, '?');
  return h('span', { class: 'avatar', style: { '--s': size + 'px', background: user.color }, title: user.name }, initials(user.name));
}

/* ================= modais, popovers, diálogos ================= */
const modalStack = [];
function openModal(content, { wide = false, onClose } = {}) {
  let downOnOverlay = false;
  const overlay = h('div', { class: 'overlay',
    onmousedown: (e) => { downOnOverlay = e.target === overlay; },
    onmouseup: (e) => { if (downOnOverlay && e.target === overlay) close(); } },
    h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' }, content));
  function close() {
    const i = modalStack.indexOf(entry); if (i < 0) return;
    modalStack.splice(i, 1); overlay.remove(); onClose && onClose();
    if (!modalStack.length) document.body.style.overflow = '';
  }
  const entry = { close };
  modalStack.push(entry);
  document.body.style.overflow = 'hidden';
  document.body.append(overlay);
  return close;
}
const modalHead = (title, close, extra) => h('div', { class: 'modal-head' }, h('h2', null, title), extra, h('button', { class: 'btn ghost icon sm', title: 'Fechar', 'aria-label': 'Fechar', onclick: close }, icon('x')));

function askText(title, value = '', { placeholder = '', ok = 'Salvar', type = 'text' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; close(); resolve(v); };
    const input = h('input', { class: 'input', value, placeholder, type, onkeydown: (e) => { if (e.key === 'Enter') finish(input.value.trim() || null); } });
    const close = openModal([modalHead(title, () => finish(null)), h('div', { class: 'modal-body' }, input),
      h('div', { class: 'modal-foot' }, h('button', { class: 'btn', onclick: () => finish(null) }, 'Cancelar'), h('button', { class: 'btn primary', onclick: () => finish(input.value.trim() || null) }, ok))], { onClose: () => finish(null) });
    setTimeout(() => { input.focus(); input.select(); }, 20);
  });
}
function confirmBox(msg, ok = 'Confirmar', danger = true) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; close(); resolve(v); };
    const close = openModal([modalHead('Tem certeza?', () => finish(false)), h('div', { class: 'modal-body' }, h('div', null, msg)),
      h('div', { class: 'modal-foot' }, h('button', { class: 'btn', onclick: () => finish(false) }, 'Cancelar'), h('button', { class: 'btn primary' + (danger ? ' danger' : ''), style: danger ? { background: 'var(--p3)', borderColor: 'var(--p3)', color: '#fff' } : null, onclick: () => finish(true) }, ok))], { onClose: () => finish(false) });
  });
}

let openPop = null;
function popover(anchor, items) {
  closePopover();
  const el = h('div', { class: 'popover', role: 'menu' }, items.map((it) => it === 'hr' ? h('hr') :
    h('button', { class: it.danger ? 'danger' : '', onclick: () => { closePopover(); it.onClick(); } },
      it.checked !== undefined ? h('span', { class: 'ck' }, it.checked ? icon('check') : '') : (it.icon ? icon(it.icon) : null), it.label)));
  document.body.append(el);
  const a = anchor.getBoundingClientRect(), w = el.offsetWidth, hgt = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(innerWidth - w - 8, a.right - w)) + 'px';
  el.style.top = (a.bottom + hgt + 12 > innerHeight ? Math.max(8, a.top - hgt - 6) : a.bottom + 6) + 'px';
  el.querySelectorAll('svg').forEach((s) => Object.assign(s.style, { width: '15px', height: '15px' }));
  openPop = el;
}
function closePopover() { openPop && openPop.remove(); openPop = null; }
document.addEventListener('mousedown', (e) => { if (openPop && !openPop.contains(e.target)) closePopover(); });
addEventListener('scroll', closePopover, true);

/* ================= dados ================= */
let loadTimer;
function scheduleLoad() { clearTimeout(loadTimer); loadTimer = setTimeout(() => (S.drag != null ? (S.pendingLoad = true) : loadBoard()), 120); }
async function loadBoard() {
  const d = await api('GET', '/api/board');
  S.columns = d.columns; S.tasks = d.tasks; S.users = d.users;
  const me = d.users.find((u) => u.id === S.me.id); if (me) S.me = { ...S.me, ...me };
  renderBoard();
}
function connectStream() { KB.subscribe(scheduleLoad); }
const upsertTask = (t) => { const i = S.tasks.findIndex((x) => x.id === t.id); i >= 0 ? (S.tasks[i] = t) : S.tasks.push(t); };

/* ================= criação rápida ================= */
const PRIO = { baixa: 0, normal: 1, alta: 2, urgente: 3 };
const PRIO_NAME = ['Baixa', 'Normal', 'Alta', 'Urgente'];
function parseQuick(text) {
  const out = { labels: [], assignee_id: undefined, priority: undefined, due_date: undefined };
  let t = ' ' + text + ' ';
  t = t.replace(/\s#([^\s#@!^]+)/g, (_, l) => { out.labels.push(l); return ' '; });
  t = t.replace(/\s@([^\s#@!^]+)/g, (m, n) => {
    const q = norm(n);
    const u = q === 'eu' ? S.me : S.users.find((x) => norm(x.name).split(/\s+/).some((p) => p.startsWith(q)) || norm(x.name).startsWith(q));
    if (u) { out.assignee_id = u.id; return ' '; } return m;
  });
  t = t.replace(/\s!(baixa|normal|alta|urgente|[0-3])(?=\s)/gi, (_, p) => { out.priority = /\d/.test(p) ? Number(p) : PRIO[p.toLowerCase()]; return ' '; });
  t = t.replace(/\s\^(hoje|amanha|amanhã|\d{1,2}\/\d{1,2})(?=\s)/gi, (m, d) => {
    const now = new Date(); d = norm(d);
    if (d === 'hoje') out.due_date = ymd(now);
    else if (d === 'amanha') out.due_date = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    else { const [dd, mm] = d.split('/').map(Number); const dt = new Date(now.getFullYear(), mm - 1, dd); if (dt.getMonth() === mm - 1) out.due_date = ymd(dt); else return m; }
    return ' ';
  });
  out.title = t.replace(/\s+/g, ' ').trim();
  return out;
}
async function createFromText(text, columnId) {
  const q = parseQuick(text);
  if (!q.title) return null;
  const body = { title: q.title, column_id: columnId, labels: q.labels };
  if (q.priority !== undefined) body.priority = q.priority;
  if (q.due_date) body.due_date = q.due_date;
  body.assignee_id = q.assignee_id !== undefined ? q.assignee_id : (S.prefs.autoAssign ? S.me.id : null);
  const t = await api('POST', '/api/tasks', body);
  upsertTask(t); renderBoard();
  return t;
}

function openQuickAdd() {
  const first = S.columns[0]; if (!first) return;
  const input = h('input', { class: 'input big-input', placeholder: 'O que precisa ser feito?', autocomplete: 'off', maxLength: 300 });
  const colSel = h('select', { class: 'select' }, S.columns.map((c) => h('option', { value: c.id }, c.name)));
  const mine = h('input', { type: 'checkbox', checked: S.prefs.autoAssign, onchange: () => setPrefs({ autoAssign: mine.checked }, { refreshSettings: false }) });
  const preview = h('div', { class: 'card-meta', style: { margin: 0, minHeight: '24px' } });
  const updatePreview = () => {
    const q = parseQuick(input.value); preview.replaceChildren();
    q.labels.forEach((l) => preview.append(h('span', { class: 'tag', style: { '--h': hueOf(l) } }, l)));
    if (q.assignee_id !== undefined) preview.append(avatar(userById(q.assignee_id), 22), h('span', { class: 'help' }, userById(q.assignee_id)?.name));
    if (q.priority !== undefined) preview.append(h('span', { class: 'badge' }, PRIO_NAME[q.priority]));
    if (q.due_date) preview.append(h('span', { class: 'due' }, icon('calendar'), fmtDay(q.due_date)));
  };
  input.addEventListener('input', updatePreview);
  const submit = guard(async (keepOpen) => {
    const text = input.value;
    if (!text.trim()) return;
    const q = parseQuick(text);
    const body = { title: q.title, column_id: Number(colSel.value), labels: q.labels };
    if (!q.title) return;
    if (q.priority !== undefined) body.priority = q.priority;
    if (q.due_date) body.due_date = q.due_date;
    body.assignee_id = q.assignee_id !== undefined ? q.assignee_id : (mine.checked ? S.me.id : null);
    if (keepOpen) { input.value = ''; updatePreview(); input.focus(); }
    try { upsertTask(await api('POST', '/api/tasks', body)); } catch (x) { if (keepOpen) { input.value = text; updatePreview(); } throw x; }
    renderBoard(); toast('Task criada');
    if (!keepOpen) close();
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(e.ctrlKey || e.metaKey); } });
  const close = openModal([modalHead('Nova task', () => close()),
    h('div', { class: 'modal-body' }, input, preview,
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', null, 'Coluna'), colSel),
        h('div', { class: 'field', style: { justifyContent: 'flex-end' } }, h('label', { class: 'check' }, mine, 'Pegar pra mim'))),
      h('div', { class: 'help' }, 'Atalhos no texto: ', h('span', { class: 'kbd' }, '#etiqueta'), ' ', h('span', { class: 'kbd' }, '@nome'), ' ', h('span', { class: 'kbd' }, '!alta'), ' ', h('span', { class: 'kbd' }, '^amanhã'), ' ', h('span', { class: 'kbd' }, '^25/12'))),
    h('div', { class: 'modal-foot' }, h('span', { class: 'help grow' }, h('span', { class: 'kbd' }, 'Enter'), ' cria · ', h('span', { class: 'kbd' }, 'Ctrl+Enter'), ' cria e continua'),
      h('button', { class: 'btn primary', onclick: () => submit(false) }, icon('plus'), 'Criar'))]);
  setTimeout(() => input.focus(), 20);
}

/* ================= login, cadastro e aprovação ================= */
function themeDots() {
  return h('div', { class: 'row', style: { justifyContent: 'center', gap: '6px' } }, THEMES.map(([id]) => h('button', { type: 'button', class: 'swatch', title: id, style: { background: 'var(--accent)', flex: '0 0 auto' }, 'data-theme': id, 'data-mode': resolvedMode(), onclick: () => setPrefs({ theme: id }, { refreshSettings: false }) })));
}
function authShell(...kids) {
  const app = $('#app'); app.replaceChildren(h('div', { class: 'auth' }, h('div', { class: 'auth-card' },
    h('div', { class: 'brand' }, h('span', { class: 'logo' }, icon('grid')), 'Kanban'), ...kids, themeDots())));
}
async function start() {
  const s = await KB.getSession();
  s.user ? await boot(s.user) : renderAuth('login');
}
function renderAuth(mode = 'login') {
  const signup = mode === 'signup', forgot = mode === 'forgot';
  const err = h('div', { class: 'err-msg' }), info = h('div', { class: 'help' });
  const name = h('input', { class: 'input', placeholder: 'Seu nome', autocomplete: 'name' });
  const email = h('input', { class: 'input', type: 'email', placeholder: 'voce@empresa.com', autocomplete: 'username' });
  const pass = h('input', { class: 'input', type: 'password', placeholder: signup ? 'Mínimo 6 caracteres' : 'Senha', autocomplete: signup ? 'new-password' : 'current-password' });
  const go = (m) => h('button', { type: 'button', class: 'btn ghost sm', onclick: () => renderAuth(m) });
  const submit = async (e) => {
    e.preventDefault(); err.textContent = ''; info.textContent = '';
    try {
      if (forgot) { await KB.resetPassword(email.value); info.textContent = 'Enviamos um link para redefinir a senha no seu e-mail.'; return; }
      if (signup) {
        if (!name.value.trim()) throw new Error('Informe seu nome');
        const r = await KB.signUp(name.value, email.value, pass.value);
        if (r.needsConfirm) { info.textContent = 'Conta criada! Confirme seu e-mail (veja a caixa de entrada) e depois entre.'; return; }
      } else await KB.signIn(email.value, pass.value);
      await start();
    } catch (x) { err.textContent = x.message; }
  };
  authShell(h('form', { onsubmit: submit, style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
    h('h1', null, signup ? 'Criar conta' : forgot ? 'Recuperar senha' : 'Entrar'),
    h('p', null, signup ? 'A primeira conta criada vira administradora. As demais precisam ser aprovadas por ela.' : forgot ? 'Informe o e-mail da conta.' : 'Acesse o quadro da equipe.'),
    signup && h('div', { class: 'field' }, h('label', null, 'Nome'), name),
    h('div', { class: 'field' }, h('label', null, 'E-mail'), email),
    !forgot && h('div', { class: 'field' }, h('label', null, 'Senha'), pass),
    err, info,
    h('button', { class: 'btn primary', type: 'submit', style: { padding: '11px' } }, signup ? 'Criar conta' : forgot ? 'Enviar link' : 'Entrar'),
    h('div', { class: 'row', style: { justifyContent: 'center', gap: '4px', flexWrap: 'wrap' } },
      mode !== 'login' && Object.assign(go('login'), { textContent: 'Já tenho conta' }),
      mode !== 'signup' && Object.assign(go('signup'), { textContent: 'Criar conta' }),
      mode === 'login' && Object.assign(go('forgot'), { textContent: 'Esqueci a senha' }))));
  (signup ? name : email).focus();
}
let pendingTimer;
function renderPending(user) {
  clearInterval(pendingTimer);
  pendingTimer = setInterval(async () => { try { const s = await KB.getSession(); if (s.user && s.user.approved) { clearInterval(pendingTimer); boot(s.user); } } catch { /* tenta de novo */ } }, 8000);
  authShell(h('h1', null, 'Aguardando aprovação'),
    h('p', null, `Sua conta (${user.email}) foi criada. Peça ao administrador para aprovar seu acesso — esta tela libera sozinha assim que ele aprovar.`),
    h('button', { class: 'btn', onclick: guard(start) }, 'Verificar agora'),
    h('button', { class: 'btn ghost', onclick: guard(async () => { clearInterval(pendingTimer); await KB.signOut(); location.reload(); }) }, 'Sair'));
}
function renderNotConfigured() {
  authShell(h('h1', null, 'Falta conectar o Supabase'),
    h('p', null, 'Abra ', h('b', null, 'public/config.js'), ' e preencha SUPABASE_URL e SUPABASE_ANON_KEY (Project Settings → API). Depois rode o SQL de ', h('b', null, 'supabase/migrations/0001_kanban.sql'), ' no SQL Editor. O README tem o passo a passo.'));
}
async function askNewPassword() {
  const pw = await askText('Defina sua nova senha', '', { type: 'password', ok: 'Salvar senha', placeholder: 'Mínimo 6 caracteres' });
  if (!pw) return;
  try { await KB.setPassword(pw); toast('Senha atualizada'); } catch (e) { toast(e.message, true); }
}

/* ================= shell: topbar e quadro ================= */
function renderTopbarMode() {
  const b = $('#modeBtn'); if (!b) return;
  b.replaceChildren(icon(resolvedMode() === 'dark' ? 'sun' : 'moon'));
  b.title = resolvedMode() === 'dark' ? 'Modo claro' : 'Modo escuro';
}
function renderShell() {
  const app = $('#app'); app.replaceChildren();
  const search = h('input', { id: 'search', placeholder: 'Buscar tasks', autocomplete: 'off', value: S.filter.q,
    oninput: () => { S.filter.q = search.value; renderBoard(); }, onkeydown: (e) => { if (e.key === 'Escape') { search.value = ''; S.filter.q = ''; search.blur(); renderBoard(); } } });
  const top = h('header', { class: 'topbar' },
    h('div', { class: 'brand' }, h('span', { class: 'logo' }, icon('grid')), h('span', null, 'Kanban')),
    h('label', { class: 'search' }, icon('search'), search, h('kbd', null, '/')),
    h('div', { class: 'grow' }),
    h('button', { class: 'btn', onclick: openDiary, title: 'Gerar diário do dia' }, icon('book'), h('span', { class: 'lbl' }, 'Gerar diário')),
    h('button', { class: 'btn primary keep', onclick: openQuickAdd, title: 'Nova task (N)' }, icon('plus'), h('span', { class: 'lbl' }, 'Nova task')),
    h('button', { class: 'btn ghost icon', id: 'modeBtn', onclick: () => setPrefs({ mode: resolvedMode() === 'dark' ? 'light' : 'dark' }) }),
    h('button', { class: 'btn ghost icon', title: 'Personalizar', onclick: () => openSettings('look') }, icon('palette')),
    h('button', { class: 'btn ghost icon', title: S.me.name, style: { padding: '4px' }, id: 'meBtn', onclick: (e) => popover(e.currentTarget, [
      { label: 'Minha conta', icon: 'edit', onClick: () => openSettings('account') },
      ...(S.me.role === 'admin' ? [{ label: 'Equipe', icon: 'take', onClick: () => openSettings('team') }] : []),
      'hr', { label: 'Sair', icon: 'logout', onClick: guard(async () => { await KB.signOut(); location.reload(); }) }]) }, avatar(S.me, 30)));
  app.append(top, h('div', { id: 'toolbar', class: 'toolbar' }), h('main', { id: 'board', class: 'board' }));
  renderTopbarMode();
}

function matches(t) {
  const f = S.filter;
  if (f.who === 'me' && t.assignee_id !== S.me.id) return false;
  if (f.who === 'none' && t.assignee_id != null) return false;
  if (!['all', 'me', 'none'].includes(f.who) && t.assignee_id !== f.who) return false;
  if (f.q) { const hay = norm(t.title + ' ' + t.description + ' ' + t.labels.join(' ') + ' ' + (userById(t.assignee_id)?.name || '')); if (!norm(f.q).split(/\s+/).every((w) => hay.includes(w))) return false; }
  return true;
}

function renderToolbar() {
  const tb = $('#toolbar'); if (!tb) return;
  const chip = (label, who, extra) => h('button', { class: 'chip' + (S.filter.who === who ? ' on' : ''), onclick: () => { S.filter.who = S.filter.who === who && who !== 'all' ? 'all' : who; renderBoard(); } }, extra, label);
  tb.replaceChildren(chip('Todas', 'all'), chip('Minhas', 'me'), chip('Sem dono', 'none'), h('span', { class: 'sep' }),
    ...S.users.filter((u) => u.id !== S.me.id).map((u) => chip(u.name.split(' ')[0], u.id, avatar(u, 18))));
}

function renderBoard() {
  const board = $('#board'); if (!board) return;
  renderToolbar();
  const keep = { x: board.scrollLeft, y: {} };
  board.querySelectorAll('.col-body').forEach((b) => { keep.y[b.parentElement.dataset.id] = b.scrollTop; });
  const fa = document.activeElement;
  const focusCol = fa && fa.classList && fa.classList.contains('add-input') ? { id: fa.dataset.col, pos: fa.selectionStart } : null;

  board.replaceChildren(...S.columns.map(renderColumn),
    h('button', { class: 'new-col', onclick: guard(async () => {
      const name = await askText('Nova coluna', '', { placeholder: 'Ex.: Em teste', ok: 'Criar' });
      if (name) { await api('POST', '/api/columns', { name }); await loadBoard(); }
    }) }, '+ Nova coluna'));

  board.scrollLeft = keep.x;
  board.querySelectorAll('.col-body').forEach((b) => { const y = keep.y[b.parentElement.dataset.id]; if (y) b.scrollTop = y; });
  if (focusCol) { const el = board.querySelector(`.add-input[data-col="${focusCol.id}"]`); if (el) { el.focus(); try { el.setSelectionRange(focusCol.pos, focusCol.pos); } catch { /* ok */ } } }
  S.seen = new Set(S.tasks.map((t) => t.id));
}

function renderColumn(col) {
  const all = S.tasks.filter((t) => t.column_id === col.id).sort((a, b) => a.position - b.position || a.id - b.id);
  let list = all.filter(matches), hidden = 0;
  if (col.kind === 'done' && S.prefs.hideOldDone && !S.showAllDone) {
    const cut = Date.now() - 14 * 864e5;
    const fresh = list.filter((t) => !t.completed_at || t.completed_at >= cut);
    hidden = list.length - fresh.length; list = fresh;
  }
  const line = h('div', { class: 'drop-line' });
  const body = h('div', { class: 'col-body' }, list.map((t) => renderCard(t, col)));
  if (!list.length) body.append(h('div', { class: 'empty-hint' }, S.filter.q || S.filter.who !== 'all' ? 'Nada com esse filtro' : 'Solte uma task aqui'));
  if (hidden) body.append(h('button', { class: 'more-done', onclick: () => { S.showAllDone = true; renderBoard(); } }, `Mostrar ${hidden} concluída${hidden > 1 ? 's' : ''} antiga${hidden > 1 ? 's' : ''}`));

  const add = h('input', { class: 'add-input', placeholder: '+ Adicionar task (Enter)', dataset: { col: col.id }, maxLength: 300, autocomplete: 'off', value: S.drafts[col.id] || '',
    oninput: () => { S.drafts[col.id] = add.value; },
    onkeydown: guard(async (e) => {
      if (e.key === 'Escape') { add.value = ''; S.drafts[col.id] = ''; add.blur(); }
      if (e.key !== 'Enter' || !add.value.trim()) return;
      const text = add.value; add.value = ''; S.drafts[col.id] = '';
      try { await createFromText(text, col.id); const el = $(`.add-input[data-col="${col.id}"]`); el && el.focus(); } catch (x) { add.value = text; S.drafts[col.id] = text; throw x; }
    }) });

  const menuBtn = h('button', { class: 'btn ghost icon sm', title: 'Opções da coluna', onclick: (e) => popover(e.currentTarget, columnMenu(col)) }, icon('more'));
  const el = h('section', { class: 'column', dataset: { id: col.id, kind: col.kind } },
    h('div', { class: 'col-head' }, h('span', { class: 'col-dot' }), h('div', { class: 'col-title', title: col.name }, col.name), h('span', { class: 'col-count' }, all.length), menuBtn),
    body, h('div', { class: 'col-foot' }, add));

  // arrastar e soltar
  const afterEl = (y) => [...body.querySelectorAll('.card:not(.dragging)')].find((c) => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
  body.addEventListener('dragover', (e) => {
    if (S.drag == null) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('over');
    const a = afterEl(e.clientY); a ? body.insertBefore(line, a) : body.append(line);
  });
  el.addEventListener('dragleave', (e) => { if (!el.contains(e.relatedTarget)) { el.classList.remove('over'); line.remove(); } });
  body.addEventListener('drop', guard(async (e) => {
    if (S.drag == null) return; e.preventDefault();
    const next = line.nextElementSibling, before = next && next.classList.contains('card') ? Number(next.dataset.id) : null;
    line.remove(); el.classList.remove('over');
    await moveTask(S.drag, col.id, before);
  }));
  return el;
}

function columnMenu(col) {
  const idx = S.columns.findIndex((c) => c.id === col.id);
  const kinds = [['todo', 'A fazer'], ['doing', 'Em andamento'], ['done', 'Concluída']];
  return [
    { label: 'Renomear', icon: 'edit', onClick: guard(async () => { const n = await askText('Renomear coluna', col.name); if (n) { await api('PATCH', `/api/columns/${col.id}`, { name: n }); await loadBoard(); } }) },
    'hr', ...kinds.map(([k, label]) => ({ label: 'Conta como: ' + label, checked: col.kind === k, onClick: guard(async () => { await api('PATCH', `/api/columns/${col.id}`, { kind: k }); await loadBoard(); }) })),
    'hr',
    ...(idx > 0 ? [{ label: 'Mover para a esquerda', icon: 'left', onClick: guard(async () => { await api('PATCH', `/api/columns/${col.id}`, { dir: -1 }); await loadBoard(); }) }] : []),
    ...(idx < S.columns.length - 1 ? [{ label: 'Mover para a direita', icon: 'right', onClick: guard(async () => { await api('PATCH', `/api/columns/${col.id}`, { dir: 1 }); await loadBoard(); }) }] : []),
    { label: 'Excluir coluna', icon: 'trash', danger: true, onClick: guard(async () => {
      if (S.columns.length <= 1) return toast('O quadro precisa de ao menos uma coluna', true);
      const n = S.tasks.filter((t) => t.column_id === col.id).length;
      const dest = S.columns[idx > 0 ? idx - 1 : 1];
      if (!(await confirmBox(n ? `Excluir "${col.name}"? As ${n} task(s) vão para "${dest.name}".` : `Excluir "${col.name}"?`, 'Excluir'))) return;
      await api('DELETE', `/api/columns/${col.id}?move_to=${dest.id}`); await loadBoard();
    }) },
  ];
}

function renderCard(t, col) {
  const owner = userById(t.assignee_id);
  const late = t.due_date && t.due_date < ymd() && col.kind !== 'done';
  const card = h('article', { class: 'card' + (col.kind === 'done' ? ' done' : '') + (S.seen && !S.seen.has(t.id) ? ' enter' : ''), draggable: true, tabIndex: 0, dataset: { id: t.id, p: t.priority },
    onclick: () => openTask(t.id), onkeydown: (e) => { if (e.key === 'Enter' && e.target === card) openTask(t.id); } },
    h('div', { class: 'card-title' }, t.title),
    t.description && h('div', { class: 'card-desc' }, t.description),
    h('div', { class: 'card-meta' },
      t.labels.map((l) => h('span', { class: 'tag', style: { '--h': hueOf(l) } }, l)),
      t.due_date && h('span', { class: 'due' + (late ? ' late' : '') }, icon('calendar'), fmtDay(t.due_date)),
      owner ? avatar(owner, 24) : h('button', { class: 'btn sm take', title: 'Pegar esta task', onclick: guard(async (e) => { e.stopPropagation(); upsertTask(await api('PATCH', `/api/tasks/${t.id}`, { assignee_id: S.me.id })); renderBoard(); toast('Task é sua'); }) }, icon('take'), 'Pegar')));
  card.addEventListener('dragstart', (e) => { S.drag = t.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(t.id)); requestAnimationFrame(() => card.classList.add('dragging')); });
  card.addEventListener('dragend', () => {
    S.drag = null; card.classList.remove('dragging'); document.querySelectorAll('.drop-line').forEach((l) => l.remove()); document.querySelectorAll('.column.over').forEach((c) => c.classList.remove('over'));
    if (S.pendingLoad) { S.pendingLoad = false; scheduleLoad(); }
  });
  card.querySelectorAll('svg').forEach((s) => Object.assign(s.style, { width: '13px', height: '13px' }));
  return card;
}

async function moveTask(id, colId, beforeId) {
  // atualização otimista, igual à regra do servidor
  const t = S.tasks.find((x) => x.id === id); if (!t) return;
  const target = colById(colId);
  const list = S.tasks.filter((x) => x.column_id === colId && x.id !== id).sort((a, b) => a.position - b.position || a.id - b.id);
  let i = beforeId ? list.findIndex((x) => x.id === beforeId) : -1; if (i < 0) i = list.length;
  list.splice(i, 0, t); list.forEach((x, k) => { x.column_id = colId; x.position = k; });
  if (target.kind === 'doing' && !t.assignee_id) t.assignee_id = S.me.id;
  renderBoard();
  try { await api('POST', `/api/tasks/${id}/move`, { column_id: colId, before_id: beforeId }); } finally { await loadBoard(); }
}

/* ================= detalhe da task ================= */
function eventText(e) {
  const d = e.data || {};
  switch (e.type) {
    case 'created': return `criou a task${d.column ? ' em ' + d.column : ''}`;
    case 'moved': return `moveu de ${d.from || '?'} para ${d.to || '?'}`;
    case 'assigned': return d.to == null ? 'removeu o responsável' : d.to === e.user_id ? 'pegou a task' : `atribuiu a ${userById(d.to)?.name || 'alguém'}`;
    case 'edited': return 'editou a task';
    case 'worked': return 'registrou trabalho';
    default: return e.type;
  }
}

function openTask(id) {
  const t = S.tasks.find((x) => x.id === id); if (!t) return;
  const save = guard(async (patch) => { const nt = await api('PATCH', `/api/tasks/${id}`, patch); upsertTask(nt); renderBoard(); loadEvents(); return nt; });

  const title = h('input', { class: 'title-input', value: t.title, maxLength: 300, onchange: () => title.value.trim() ? save({ title: title.value }) : (title.value = t.title) });
  const desc = h('textarea', { class: 'textarea', placeholder: 'Detalhes, links, o que precisa ser feito…', value: t.description, onchange: () => save({ description: desc.value }) });
  const diary = h('input', { class: 'input', placeholder: 'Opcional: como isso deve aparecer no diário', value: t.diary, maxLength: 500, onchange: () => save({ diary: diary.value }) });
  const colSel = h('select', { class: 'select', onchange: guard(async () => { await moveTask(id, Number(colSel.value), null); loadEvents(); }) },
    S.columns.map((c) => h('option', { value: c.id, selected: c.id === t.column_id }, c.name)));
  const own = h('select', { class: 'select', onchange: () => save({ assignee_id: own.value || null }) },
    h('option', { value: '' }, 'Sem responsável'), S.users.map((u) => h('option', { value: u.id, selected: u.id === t.assignee_id }, u.id === S.me.id ? `${u.name} (eu)` : u.name)));
  const takeBtn = h('button', { class: 'btn sm', onclick: async () => { await save({ assignee_id: S.me.id }); own.value = String(S.me.id); } }, icon('take'), 'Pegar pra mim');
  const due = h('input', { class: 'input', type: 'date', value: t.due_date || '', onchange: () => save({ due_date: due.value || null }) });

  let prio = t.priority;
  const prioBtns = PRIO_NAME.map((n, i) => h('button', { type: 'button', class: i === prio ? 'on' : '', onclick: () => { prio = i; prioBtns.forEach((b, k) => b.classList.toggle('on', k === i)); save({ priority: i }); } }, n));

  let labels = [...t.labels];
  const labelBox = h('div', { class: 'tags-edit' });
  const labelInput = h('input', { placeholder: labels.length ? '' : 'Digite e Enter (ex.: financeiro)', maxLength: 24 });
  const drawLabels = () => { labelBox.replaceChildren(...labels.map((l) => h('span', { class: 'tag', style: { '--h': hueOf(l) } }, l, h('button', { class: 'x', type: 'button', 'aria-label': 'Remover ' + l, onclick: () => { labels = labels.filter((x) => x !== l); drawLabels(); save({ labels }); } }, '×'))), labelInput); };
  const addLabel = () => { const v = labelInput.value.trim().replace(/^#/, '').replace(/,$/, ''); if (v && !labels.some((l) => l.toLowerCase() === v.toLowerCase()) && labels.length < 8) { labels.push(v); drawLabels(); save({ labels }); labelInput.focus(); } else labelInput.value = ''; };
  labelInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addLabel(); } else if (e.key === 'Backspace' && !labelInput.value && labels.length) { labels.pop(); drawLabels(); save({ labels }); labelInput.focus(); } });
  labelInput.addEventListener('blur', () => { if (labelInput.value.trim()) addLabel(); });
  drawLabels();

  const timeline = h('div', { class: 'timeline' });
  async function loadEvents() {
    try {
      const ev = await api('GET', `/api/tasks/${id}/events`);
      timeline.replaceChildren(...ev.map((e) => h('div', null, h('b', null, e.user_name || 'Alguém'), ' ' + eventText(e), h('time', null, fmtTime(e.at)))));
    } catch { /* ignora */ }
  }
  const worked = h('button', { class: 'btn sm', title: 'Marca esta task como trabalhada hoje (entra no diário)', onclick: guard(async () => { await api('POST', `/api/tasks/${id}/worked`); toast('Registrado no diário de hoje'); loadEvents(); }) }, icon('check'), 'Trabalhei hoje');

  const close = openModal([
    h('div', { class: 'modal-head' }, h('div', { class: 'grow' }, title), h('button', { class: 'btn ghost icon sm', 'aria-label': 'Fechar', onclick: () => { document.activeElement && document.activeElement.blur(); close(); } }, icon('x'))),
    h('div', { class: 'modal-body' },
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', null, 'Status'), colSel),
        h('div', { class: 'field' }, h('label', null, 'Responsável'), own)),
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', null, 'Prazo'), due),
        h('div', { class: 'field' }, h('label', null, 'Prioridade'), h('div', { class: 'seg' }, prioBtns))),
      h('div', { class: 'field' }, h('label', null, 'Etiquetas'), labelBox),
      h('div', { class: 'field' }, h('label', null, 'Descrição'), desc),
      h('div', { class: 'field' }, h('label', null, 'Texto para o diário'), diary),
      h('div', { class: 'field' }, h('label', null, 'Histórico'), timeline)),
    h('div', { class: 'modal-foot' },
      h('button', { class: 'btn danger', onclick: guard(async () => { if (!(await confirmBox(`Excluir "${t.title}"? Isso não pode ser desfeito.`, 'Excluir'))) return; await api('DELETE', `/api/tasks/${id}`); S.tasks = S.tasks.filter((x) => x.id !== id); renderBoard(); close(); toast('Task excluída'); }) }, icon('trash'), 'Excluir'),
      h('span', { class: 'grow' }), t.assignee_id !== S.me.id && takeBtn, worked)], { wide: false });
  loadEvents();
  if (!t.title) title.focus();
}

/* ================= gerar diário ================= */
function diaryLine(it, withStatus) {
  let s = (it.diary || it.title).trim().replace(/\s+/g, ' ').replace(/[.;,\s]+$/, '');
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (withStatus) s += it.kind === 'done' ? ' (concluído)' : it.kind === 'doing' ? ' (em andamento)' : '';
  return '- ' + s + '.';
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* http sem contexto seguro */ }
  const ta = h('textarea', { value: text, style: { position: 'fixed', opacity: '0' } }); document.body.append(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { /* ok */ } ta.remove(); return ok;
}
function openDiary() {
  const o = { date: ymd(), scope: 'me', doing: true, status: false };
  let items = [];
  const area = h('textarea', { class: 'textarea diary-text', spellcheck: false });
  const count = h('span', { class: 'help' });
  const date = h('input', { class: 'input', type: 'date', value: o.date, max: ymd(), onchange: () => { o.date = date.value || ymd(); load(); } });
  const seg = (key, opts) => { const wrap = h('div', { class: 'seg' }); const draw = () => wrap.replaceChildren(...opts.map(([v, label]) => h('button', { type: 'button', class: o[key] === v ? 'on' : '', onclick: () => { o[key] = v; draw(); load(); } }, label))); draw(); return wrap; };
  const build = () => {
    area.value = items.map((i) => diaryLine(i, o.status)).join('\n');
    count.textContent = items.length ? `${items.length} ${items.length > 1 ? 'itens' : 'item'}` : '';
    area.placeholder = 'Nada registrado nesse dia ainda. Crie, mova ou edite tasks (ou use "Trabalhei hoje" na task) e gere de novo.';
  };
  const load = guard(async () => {
    const [from, to] = dayRange(o.date);
    const d = await api('GET', `/api/diary?from=${from}&to=${to}&scope=${o.scope}&doing=${o.doing && o.date === ymd() ? 1 : 0}`);
    items = d.items; build();
  });
  const doingCb = h('input', { type: 'checkbox', checked: o.doing, onchange: () => { o.doing = doingCb.checked; load(); } });
  const statusCb = h('input', { type: 'checkbox', checked: o.status, onchange: () => { o.status = statusCb.checked; build(); } });
  const close = openModal([modalHead('Diário de trabalho', () => close()),
    h('div', { class: 'modal-body' },
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', null, 'Dia'), date),
        h('div', { class: 'field' }, h('label', null, 'De quem'), seg('scope', [['me', 'Só minhas'], ['team', 'Equipe toda']]))),
      h('div', { class: 'row' }, h('label', { class: 'check' }, doingCb, 'Incluir tasks em andamento (só hoje)'), h('label', { class: 'check' }, statusCb, 'Mostrar status')),
      area,
      h('div', { class: 'help' }, 'Entram as tasks que você criou, moveu, editou ou marcou com "Trabalhei hoje". Use o campo ', h('b', null, 'Texto para o diário'), ' da task para escrever exatamente como quer que apareça. Você pode editar o texto aqui antes de copiar.')),
    h('div', { class: 'modal-foot' }, count, h('span', { class: 'grow' }),
      h('button', { class: 'btn primary', onclick: async () => { if (!area.value.trim()) return toast('Nada para copiar', true); toast((await copyText(area.value)) ? 'Diário copiado' : 'Não consegui copiar, selecione o texto', false); } }, icon('copy'), 'Copiar'))], { wide: true });
  load();
}

/* ================= personalização, conta e equipe ================= */
function openSettings(tab = 'look') {
  const content = h('div'), tabsEl = h('div', { class: 'tabs' });
  const tabs = [['look', 'Aparência'], ['account', 'Conta'], ...(S.me.role === 'admin' ? [['team', 'Equipe']] : [])];
  const draw = () => {
    tabsEl.replaceChildren(...tabs.map(([k, l]) => h('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; draw(); } }, l)));
    content.replaceChildren(({ look: viewLook, account: viewAccount, team: viewTeam })[tab]());
  };
  S.refreshSettings = () => { if (tab === 'look') { const y = $('.overlay:last-of-type')?.scrollTop; draw(); const ov = $('.overlay:last-of-type'); if (ov && y) ov.scrollTop = y; } };
  const close = openModal([modalHead('Personalizar', () => close()), tabsEl, content], { wide: true, onClose: () => { S.refreshSettings = null; } });
  draw();
}

function viewLook() {
  const p = S.prefs, mode = resolvedMode();
  const seg = (key, opts) => h('div', { class: 'seg' }, opts.map(([v, l]) => h('button', { type: 'button', class: p[key] === v ? 'on' : '', onclick: () => setPrefs({ [key]: v }) }, l)));
  const toggle = (key, label) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!p[key], onchange: (e) => setPrefs({ [key]: e.target.checked }) }), label);
  const swatchColors = ['#6366f1', '#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7'];
  return h('div', { class: 'modal-body' },
    h('div', { class: 'field' }, h('label', null, 'Tema'),
      h('div', { class: 'theme-grid' }, THEMES.map(([id, name, sub]) => h('button', { class: 'theme-tile' + (p.theme === id ? ' on' : ''), dataset: { theme: id, mode }, onclick: () => setPrefs({ theme: id }) },
        h('div', { class: 'theme-prev' }, h('i', null, h('b'), h('b')), h('i', null, h('b'), h('b'), h('b')), h('i', null, h('b'))),
        h('div', { class: 'theme-name' }, name, h('span', null, sub)))))),
    h('div', { class: 'row' },
      h('div', { class: 'field' }, h('label', null, 'Modo'), seg('mode', [['light', 'Claro'], ['dark', 'Escuro'], ['system', 'Sistema']])),
      h('div', { class: 'field' }, h('label', null, 'Densidade'), seg('density', [['compact', 'Compacta'], ['comfortable', 'Normal'], ['roomy', 'Ampla']]))),
    h('div', { class: 'field' }, h('label', null, 'Cor de destaque'),
      h('div', { class: 'swatches' }, h('button', { class: 'btn sm' + (p.accent ? '' : ' primary'), onclick: () => setPrefs({ accent: null }) }, 'Do tema'),
        swatchColors.map((c) => h('button', { class: 'swatch' + (p.accent === c ? ' on' : ''), style: { background: c }, title: c, 'aria-label': c, onclick: () => setPrefs({ accent: c }) })),
        h('input', { type: 'color', value: p.accent || '#6366f1', title: 'Cor personalizada', oninput: (e) => setPrefs({ accent: e.target.value }, { refreshSettings: false }) }))),
    h('div', { class: 'row' },
      h('div', { class: 'field' }, h('label', null, 'Fonte'), seg('font', [['auto', 'Do tema'], ['sans', 'Inter'], ['serif', 'Serif'], ['grotesk', 'Grotesk'], ['mono', 'Mono']])),
      h('div', { class: 'field' }, h('label', null, `Cantos arredondados${p.radius == null ? ' (do tema)' : ': ' + p.radius + 'px'}`),
        h('input', { type: 'range', min: 0, max: 28, value: p.radius ?? 12, oninput: (e) => { setPrefs({ radius: Number(e.target.value) }, { refreshSettings: false }); e.target.previousSibling.textContent = `Cantos arredondados: ${e.target.value}px`; } }),
        p.radius != null && h('button', { class: 'btn sm ghost', style: { alignSelf: 'flex-start' }, onclick: () => setPrefs({ radius: null }) }, 'Voltar ao do tema'))),
    h('div', { class: 'field' }, h('label', null, 'Comportamento'),
      toggle('motion', 'Animações e fundos animados'), toggle('autoAssign', 'Novas tasks já ficam comigo'), toggle('hideOldDone', 'Esconder concluídas com mais de 14 dias')));
}

function viewAccount() {
  const name = h('input', { class: 'input', value: S.me.name, maxLength: 80 });
  const cur = h('input', { class: 'input', type: 'password', autocomplete: 'current-password' });
  const nw = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'Mínimo 6 caracteres' });
  return h('div', { class: 'modal-body' },
    h('div', { class: 'field' }, h('label', null, 'Nome'), h('div', { class: 'row' }, name, h('button', { class: 'btn', style: { flex: '0 0 auto' }, onclick: guard(async () => { if (!name.value.trim()) return; await api('PATCH', '/api/me', { name: name.value }); S.me.name = name.value.trim(); await loadBoard(); toast('Nome atualizado'); }) }, 'Salvar'))),
    h('div', { class: 'field' }, h('label', null, 'E-mail'), h('div', { class: 'help' }, S.me.email)),
    h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', null, 'Senha atual'), cur), h('div', { class: 'field' }, h('label', null, 'Nova senha'), nw)),
    h('div', null, h('button', { class: 'btn', onclick: guard(async () => { await api('PATCH', '/api/me', { current_password: cur.value, new_password: nw.value }); cur.value = nw.value = ''; toast('Senha alterada'); }) }, 'Trocar senha')));
}

function viewTeam() {
  const box = h('div', { class: 'modal-body' }, h('div', { class: 'help' }, 'Carregando…'));
  const draw = guard(async () => {
    const list = await api('GET', '/api/users');
    const pending = list.filter((u) => !u.approved), active = list.filter((u) => u.approved);
    const refresh = async () => { await loadBoard(); draw(); };
    box.replaceChildren(
      pending.length > 0 && h('div', { class: 'field' }, h('label', null, `Aguardando aprovação (${pending.length})`),
        pending.map((u) => h('div', { class: 'user-row' }, avatar(u, 32), h('div', { class: 'who' }, u.name, h('small', null, u.email)),
          h('button', { class: 'btn sm primary', onclick: guard(async () => { await api('PATCH', `/api/users/${u.id}`, { approved: true }); toast(`${u.name} aprovado(a)`); await refresh(); }) }, icon('check'), 'Aprovar')))),
      h('div', { class: 'field' }, h('label', null, `Equipe (${active.length})`),
        active.map((u) => h('div', { class: 'user-row' }, avatar(u, 32), h('div', { class: 'who' }, u.name + (u.id === S.me.id ? ' (você)' : ''), h('small', null, u.email)),
          h('select', { class: 'select', style: { width: 'auto' }, onchange: guard(async (e) => { try { await api('PATCH', `/api/users/${u.id}`, { role: e.target.value }); toast('Permissão atualizada'); await refresh(); } catch (x) { e.target.value = u.role; throw x; } }) },
            h('option', { value: 'member', selected: u.role === 'member' }, 'Membro'), h('option', { value: 'admin', selected: u.role === 'admin' }, 'Admin')),
          u.id !== S.me.id && h('button', { class: 'btn sm danger', title: 'Tirar o acesso desta pessoa', onclick: guard(async () => { if (!(await confirmBox(`Tirar o acesso de ${u.name}? As tasks dela ficam com ela até você reatribuir.`, 'Tirar acesso'))) return; await api('PATCH', `/api/users/${u.id}`, { approved: false }); await refresh(); }) }, 'Tirar acesso')))),
      h('div', { class: 'help' }, 'Para adicionar alguém: a pessoa abre o endereço do quadro e clica em ', h('b', null, 'Criar conta'), '. Ela aparece aqui para você aprovar.'));
  });
  draw();
  return box;
}

/* ================= atalhos ================= */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (openPop) return closePopover();
    const top = modalStack[modalStack.length - 1];
    if (top) { document.activeElement && document.activeElement.blur(); top.close(); }
    return;
  }
  if (!S.me || modalStack.length || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  if (e.key === 'n' || e.key === 'c') { e.preventDefault(); openQuickAdd(); }
  else if (e.key === '/') { e.preventDefault(); $('#search') && $('#search').focus(); }
});

/* ================= inicialização ================= */
async function boot(user) {
  if (!user.approved) return renderPending(user);
  S.me = user;
  S.prefs = { ...DEFAULT_PREFS, ...loadLocalPrefs(), ...(user.prefs || {}) };
  applyPrefs();
  try { localStorage.setItem('kb-prefs', JSON.stringify(S.prefs)); } catch { /* ok */ }
  renderShell();
  await loadBoard();
  connectStream();
}
(async function init() {
  S.prefs = { ...DEFAULT_PREFS, ...loadLocalPrefs() };
  applyPrefs();
  if (!KB.configured) return renderNotConfigured();
  KB.onRecovery(askNewPassword);
  try { await start(); }
  catch (e) { $('#app').append(h('div', { class: 'auth' }, h('div', { class: 'auth-card' }, h('h1', null, 'Sem conexão'), h('p', null, e.message)))); }
})();
})();
