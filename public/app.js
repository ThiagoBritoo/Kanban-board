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
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z"/>',
  clip: '<path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l9-9a3.3 3.3 0 0 1 5 5l-9 9a1.7 1.7 0 0 1-2.5-2.5L15 7"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  command: '<path d="M9 9h6v6H9zM9 9V6a3 3 0 1 0-3 3h3zm6 0V6a3 3 0 1 1 3 3h-3zM9 15v3a3 3 0 1 1-3-3h3zm6 0v3a3 3 0 1 0 3-3h-3z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  bento: '<rect x="3" y="3" width="8" height="10" rx="2"/><rect x="13" y="3" width="8" height="6" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="15" width="8" height="6" rx="2"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  move: '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
};
function icon(name) {
  const t = document.createElement('template');
  t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  return t.content.firstChild;
}

// replaceChildren transforma false/null em texto ("false"); aqui eles são ignorados, como em h().
const _replaceChildren = Element.prototype.replaceChildren;
Element.prototype.replaceChildren = function (...nodes) {
  return _replaceChildren.apply(this, nodes.flat(Infinity).filter((n) => n != null && n !== false && n !== true));
};

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

const api = async (method, url, body) => {
  if (method !== 'GET') S.lastWrite = Date.now();
  try { const r = await KB.api(method, url, body); if (S.offline) setOffline(false); return r; }
  catch (e) {
    if (/Sem conexão|Failed to fetch|NetworkError/i.test(e.message)) setOffline(true);
    if (/JWT|token is expired|not authenticated|invalid claim/i.test(e.message)) {
      // tenta renovar a sessão e repetir UMA vez; só desloga se a renovação falhar de forma definitiva
      let st = 'error'; try { st = await KB.refresh(); } catch { /* ok */ }
      if (st === 'ok') return KB.api(method, url, body);
      if (st === 'invalid') { try { await KB.signOut(); } catch { /* ok */ } location.reload(); }
      else setOffline(true);
    }
    throw e;
  }
};

function toast(msg, err = false, action = null) {
  const dismiss = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
  const el = h('div', { class: 'toast' + (err ? ' err' : '') }, !err && icon('check'), msg,
    action && h('button', { class: 'toast-act', onclick: () => { dismiss(); action.onClick(); } }, action.label));
  el.firstChild?.nodeName === 'svg' && Object.assign(el.firstChild.style, { width: '16px', height: '16px' });
  $('#toasts').append(el);
  setTimeout(dismiss, err ? 4200 : action ? 6500 : 2200);
}
function setOffline(off) {
  S.offline = off; let bar = document.getElementById('netbar');
  if (!off) { bar && bar.remove(); return; }
  if (bar) return;
  bar = h('div', { id: 'netbar', class: 'netbar', role: 'alert' }, h('span', null, 'Sem conexão com o servidor. Suas mudanças só serão salvas quando voltar.'),
    h('button', { class: 'btn sm', onclick: () => { loadBoard().catch(() => {}); } }, 'Tentar de novo'));
  const top = document.querySelector('.topbar'); top ? top.after(bar) : document.body.prepend(bar);
}
addEventListener('offline', () => setOffline(true));
addEventListener('online', () => { setOffline(false); if (S.me) loadBoard().catch(() => {}); });
const guard = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { toast(e.message, true); } };

/* ================= estado e preferências ================= */
const THEMES = [
  ['minimal', 'Minimal', 'limpo e neutro', 'Minimalistas', false],
  ['comando', 'Comando', 'teclas e coral sobre preto', 'Minimalistas', false],
  ['editorial', 'Editorial', 'pergaminho e serifa', 'Minimalistas', false],
  ['estudio', 'Estúdio', 'fino, industrial', 'Minimalistas', false],
  ['brasa', 'Brasa', 'pergaminho, tinta e âmbar', 'Minimalistas', false],
  ['suico', 'Suíço', 'réguas pretas, vermelho', 'Minimalistas', false],
  ['geist', 'Geist', 'preto e branco, azul preciso', 'Minimalistas', false],
  ['prisma', 'Prisma', 'azul-marinho e índigo', 'Minimalistas', false],
  ['warp', 'Warp', 'grafite e violeta', 'Minimalistas', false],
  ['paper', 'Papel', 'calmo, com grão', 'Minimalistas', false],
  ['gelo', 'Gelo', 'azul glacial, arejado', 'Minimalistas', false],
  ['sage', 'Sálvia', 'suave e verde', 'Minimalistas', false],
  ['ocean', 'Oceano', 'azul profundo', 'Suaves e coloridos', true],
  ['aurora', 'Aurora', 'vidro e luz', 'Suaves e coloridos', true],
  ['sunset', 'Sunset', 'gradiente quente', 'Suaves e coloridos', true],
  ['argila', 'Argila', '3D macio e tátil', 'Suaves e coloridos', false],
  ['adesivo', 'Adesivo', 'pastel e cores de adesivo', 'Suaves e coloridos', false],
  ['canelado', 'Canelado', 'vidro canelado sobre cor', 'Suaves e coloridos', true],
  ['espacial', 'Espacial', 'vidro visionOS, crepúsculo', 'Suaves e coloridos', false],
  ['limao', 'Limão', 'lima elétrica, cantos grandes', 'Suaves e coloridos', false],
  ['neon', 'Neon', 'cyber, contraste alto', 'Impactantes', false],
  ['brutal', 'Brutal', 'contorno grosso', 'Impactantes', false],
  ['lava', 'Lava', 'bolhas em movimento', 'Impactantes', true],
  ['vaporwave', 'Vaporwave', 'sol e grade retrô', 'Impactantes', true],
  ['galaxia', 'Galáxia', 'estrelas cintilando', 'Impactantes', true],
  ['y2k', 'Y2K', 'cromado e iridescente', 'Impactantes', true],
  ['caderno', 'Caderno', 'post-its / quadro negro', 'Únicos', false],
  ['blueprint', 'Blueprint', 'planta técnica', 'Únicos', false],
  ['topografia', 'Topografia', 'curvas de nível em 3D', 'Únicos', true],
  ['chuvaluz', 'Chuva de luz', 'fios de luz caindo', 'Únicos', true],
  ['singular', 'Singularidade', 'grade sugada por um buraco', 'Únicos', true],
  ['nanquim', 'Nanquim', 'tinta em fluxo', 'Únicos', true],
  ['cordilheira', 'Cordilheira', 'camadas com parallax', 'Únicos', true],
  ['hud', 'HUD', 'linhas finas e colchetes', 'Únicos', false],
  ['terminal', 'Terminal', 'verde sobre preto, CRT', 'Únicos', false],
  ['retro95', 'Retrô 95', 'janelas com relevo', 'Únicos', false],
  ['ouro', 'Ouro', 'preto e dourado, serifa', 'Únicos', false],
  ['liquido', 'Líquido', 'P&B com brilho iridescente', 'Únicos', true],
  ['galeria', 'Galeria', 'noturna, serifa leve', 'Únicos', false],
  ['meialuz', 'Meia-luz', 'painéis claros e escuros', 'Únicos', false],
  ['camara', 'Câmara Escura', 'breu quente, creme, tracejado', 'Únicos', false],
];
const DEFAULT_PREFS = { fxBg: '#05060f', fxC1: '#7c9cff', fxC2: '#ff5fd2', fxSp: 100, fxAmt: 100, pulse: 'off', cardLight: false, theme: 'minimal', mode: 'system', accent: null, font: 'auto', radius: null, density: 'comfortable', motion: true, autoAssign: true, hideOldDone: true, view: 'board', bg: 'theme', bgUrl: '', notify: false,
  shType: 'plane', shC1: '#52ff89', shC2: '#dbba95', shC3: '#d0bce1', shSpeed: 40, shStrength: 50, shDensity: 40, shGrain: 4, shDim: 0,
  trType: 'linhas', trBg: '#f1ecdf', trLine: '#4a5a4c', trAccent: '#c8522e', trSun: 170, trRelief: 100, trDensity: 110, trSpeed: 40, trCam: 100, trHover: 40, trInterval: 5, trSoft: 0,
  sidebar: true, fx: true, fxSpeed: 100, fxIntensity: 100, cardStyle: 'theme', border: 'theme', shadow: 'theme', size: 'normal' };
const S = { me: null, users: [], columns: [], tasks: [], prefs: { ...DEFAULT_PREFS }, filter: { q: '', who: 'all', due: null, label: null }, drafts: {}, drag: null, seen: null, showAllDone: false, online: new Set(), lastWrite: 0, loadedOnce: false };

const SHADER_PRESETS = [
  ['Menta', 'plane', '#52ff89', '#dbba95', '#d0bce1'], ['Pôr do sol', 'plane', '#ff7a59', '#ffd27a', '#b967ff'], ['Oceano', 'waves', '#0ea5e9', '#22d3ee', '#6366f1'],
  ['Neon', 'plane', '#ff2bd6', '#00f0ff', '#7c3aed'], ['Aurora', 'plane', '#34d399', '#38bdf8', '#a78bfa'], ['Brasa', 'orb', '#f54e00', '#c08532', '#26251e'],
  ['Grafite', 'orb', '#52525b', '#a1a1aa', '#18181b'], ['Algodão', 'waves', '#ffd6f2', '#cfe8ff', '#e5d4ff'],
];
const BGS = [
  ['theme', 'Do tema'],
  ['aurora', 'Aurora', 'linear-gradient(135deg,#e0e7ff,#fae8ff 50%,#cffafe)', 'linear-gradient(135deg,#0f0c29,#302b63 55%,#24243e)'],
  ['sunset', 'Pôr do sol', 'linear-gradient(135deg,#ffedd5,#fecdd3 55%,#ddd6fe)', 'linear-gradient(135deg,#1f0a0a,#5b1d2f 55%,#2b1055)'],
  ['mar', 'Mar', 'linear-gradient(160deg,#dbeafe,#e0f2fe 50%,#ccfbf1)', 'linear-gradient(160deg,#020c1b,#0b2a4a 60%,#064e3b)'],
  ['floresta', 'Floresta', 'linear-gradient(150deg,#ecfccb,#d1fae5 55%,#e0f2fe)', 'linear-gradient(150deg,#04130a,#0f3d2a 60%,#062b3a)'],
  ['grafite', 'Grafite', 'linear-gradient(180deg,#f4f4f5,#e4e4e7)', 'linear-gradient(180deg,#111113,#1c1c20)'],
  ['solido', 'Sólido', '#f5f5f4', '#0c0c0d'],
];
function bgCss(p, mode) {
  if (p.bg === 'custom') {
    try { const u = new URL(p.bgUrl); if (u.protocol === 'https:') return `url("${u.href.replace(/"/g, '%22')}") center / cover no-repeat`; } catch { /* url inválida */ }
    return null;
  }
  const b = BGS.find((x) => x[0] === p.bg && x[2]);
  return b ? (mode === 'dark' ? b[3] : b[2]) : null;
}

const sysDark = matchMedia('(prefers-color-scheme: dark)');
const resolvedMode = () => S.prefs.mode === 'system' ? (sysDark.matches ? 'dark' : 'light') : S.prefs.mode;

function applyPrefs() {
  const p = S.prefs, r = document.documentElement;
  r.dataset.theme = p.theme; r.dataset.mode = resolvedMode(); r.dataset.density = p.density;
  r.dataset.motion = p.motion ? 'on' : 'off';
  r.dataset.fx = p.fx === false ? 'off' : 'on';
  r.dataset.sidebar = p.sidebar === false ? 'off' : 'on';
  r.style.setProperty('--fx-speed', String((Number(p.fxSpeed) || 100) / 100));
  r.style.setProperty('--deco-o', String((p.fxIntensity == null ? 100 : Number(p.fxIntensity)) / 100));
  for (const [key, attr] of [['cardStyle', 'card'], ['border', 'bw'], ['shadow', 'shadow'], ['size', 'size']]) {
    const v = p[key]; v && v !== 'theme' && v !== 'normal' ? (r.dataset[attr] = v) : delete r.dataset[attr];
  }
  window.KBShader && window.KBShader.update(p, resolvedMode());
  window.KBTerrain && window.KBTerrain.update(p, resolvedMode(), p.theme);
  window.KBFx && window.KBFx.update(p, resolvedMode(), p.theme);
  r.dataset.pulse = p.pulse || 'off';
  r.dataset.cardlight = p.cardLight ? 'on' : 'off';
  const bg = bgCss(p, resolvedMode());
  if (bg) { r.style.setProperty('--bg-user', bg); r.dataset.bg = 'user'; } else { r.style.removeProperty('--bg-user'); delete r.dataset.bg; }
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
function openModal(content, { wide = false, xwide = false, drawer = false, onClose } = {}) {
  let downOnOverlay = false;
  const overlay = h('div', { class: 'overlay' + (drawer ? ' drawer' : ''),
    onmousedown: (e) => { downOnOverlay = e.target === overlay; },
    onmouseup: (e) => { if (downOnOverlay && e.target === overlay) close(); } },
    h('div', { class: 'modal' + (wide ? ' wide' : '') + (xwide ? ' xwide' : '') + (drawer ? ' drawer-panel' : ''), role: 'dialog', 'aria-modal': 'true' }, content));
  function close() {
    const i = modalStack.indexOf(entry); if (i < 0) return;
    modalStack.splice(i, 1); overlay.classList.add('out'); setTimeout(() => overlay.remove(), 130); onClose && onClose();
    if (modalStack.every((e) => e.drawer)) document.body.style.overflow = '';
  }
  const entry = { close, drawer };
  modalStack.push(entry);
  if (!drawer) document.body.style.overflow = 'hidden';
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
      it.checked !== undefined ? h('span', { class: 'ck' }, it.checked ? icon('check') : '') : (it.icon ? icon(it.icon) : null), it.dot !== undefined && h('span', { class: 'dot', style: { background: it.dot || 'var(--muted)' } }), it.label)));
  document.body.append(el);
  const a = anchor.getBoundingClientRect(), w = el.offsetWidth, hgt = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(innerWidth - w - 8, a.right - w)) + 'px';
  el.style.top = (a.bottom + hgt + 12 > innerHeight ? Math.max(8, a.top - hgt - 6) : a.bottom + 6) + 'px';
  el.querySelectorAll('svg').forEach((s) => Object.assign(s.style, { width: '15px', height: '15px' }));
  openPop = el;
}
function closePopover() { if (openPop) { const el = openPop; el.classList.add('out'); setTimeout(() => el.remove(), 90); } openPop = null; }
document.addEventListener('mousedown', (e) => { if (openPop && !openPop.contains(e.target)) closePopover(); });
addEventListener('scroll', closePopover, true);

/* ================= dados ================= */
let loadTimer;
function scheduleLoad() { clearTimeout(loadTimer); loadTimer = setTimeout(() => (S.drag != null ? (S.pendingLoad = true) : loadBoard()), 120); }
function notifyAssigned(t) {
  toast(`Task atribuída a você: ${t.title}`, false, { label: 'Abrir', onClick: () => openTask(t.id) });
  if (S.prefs.notify && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
    try { new Notification('Nova task para você', { body: t.title, icon: 'icon-192.png', tag: 'assign-' + t.id }); } catch { /* ok */ }
  }
}
async function loadBoard() {
  const d = await api('GET', '/api/board');
  const prevAssignee = S.loadedOnce ? new Map(S.tasks.map((t) => [t.id, t.assignee_id])) : null;
  S.columns = d.columns; S.tasks = d.tasks; S.users = d.users;
  if (prevAssignee && Date.now() - S.lastWrite > 4000) {
    d.tasks.filter((t) => t.assignee_id === S.me.id && prevAssignee.get(t.id) !== S.me.id).slice(0, 3).forEach(notifyAssigned);
  }
  S.loadedOnce = true;
  const me = d.users.find((u) => u.id === S.me.id);
  if (!me) return start(); // acesso foi revogado: volta para a tela de login/aprovação
  S.me = { ...S.me, ...me };
  renderBoard();
}
function connectStream() {
  KB.subscribe(scheduleLoad, { presence: { id: S.me.id, name: S.me.name }, onPresence: (ids) => { S.online = new Set(ids); renderToolbar(); } });
}
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

function openQuickAdd(prefill = '') {
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
  if (typeof prefill === 'string' && prefill) { input.value = prefill; updatePreview(); }
  setTimeout(() => input.focus(), 20);
}

/* ================= login, cadastro e aprovação ================= */
function authBackdrop() { // gradiente shader atrás do login; some quando o app inicia (applyPrefs)
  if (!window.KBShader || !window.KBShader.supported()) return;
  const dark = resolvedMode() === 'dark';
  window.KBShader.update({ ...S.prefs, bg: 'shader', shType: 'plane', shC1: dark ? '#3b2bd6' : '#8f9bff', shC2: dark ? '#c0267f' : '#ffc2e2', shC3: dark ? '#0e7490' : '#a5ecff', shSpeed: 35, shStrength: 60, shDensity: 35, shGrain: 5, shDim: 0 }, resolvedMode());
}
function authShell(...kids) {
  const app = $('#app');
  app.replaceChildren(h('div', { class: 'auth split' },
    h('div', { class: 'auth-hero' }, h('div', { class: 'auth-kicker' }, 'Kanban da equipe'), h('h2', null, 'Organize o trabalho.', h('br'), 'Registre o dia.'),
      h('p', null, 'Tasks, quem pegou o quê e um diário pronto no fim do expediente.')),
    h('div', { class: 'auth-card' }, h('div', { class: 'brand' }, h('span', { class: 'logo' }, icon('grid')), 'Kanban'), ...kids)));
  authBackdrop();
}
async function start() {
  // a leitura pode falhar por instantes (renovação do token ao trocar de aparelho/modo/aba): tenta de novo antes de mandar para o login
  let s = { user: null }, lastErr = null;
  for (const wait of [0, 500, 1500]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try { s = await KB.getSession(); lastErr = null; } catch (e) { lastErr = e; }
    if (s.user || !KB.hasStoredSession()) break; // sem sessão guardada = visitante novo: login na hora
  }
  if (lastErr) throw lastErr;
  s.user ? await boot(s.user) : renderAuth('login');
}
function renderAuth(mode = 'login') {
  const signup = mode === 'signup', forgot = mode === 'forgot';
  const err = h('div', { class: 'err-msg' }), info = h('div', { class: 'help' });
  const name = h('input', { class: 'input', placeholder: 'Seu nome', autocomplete: 'name' });
  let lastEmail = ''; try { lastEmail = localStorage.getItem('kb-email') || ''; } catch { /* ok */ }
  const email = h('input', { class: 'input', type: 'email', placeholder: 'voce@empresa.com', autocomplete: 'username', value: signup ? '' : lastEmail });
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
      } else { await KB.signIn(email.value, pass.value); try { localStorage.setItem('kb-email', email.value.trim()); } catch { /* ok */ } }
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
function moreMenu() {
  const A = window.KBApp;
  return [
    { label: 'Paleta de comandos (Ctrl+K)', icon: 'command', onClick: () => A.openPalette && A.openPalette() },
    'hr',
    { label: resolvedMode() === 'dark' ? 'Modo claro' : 'Modo escuro', icon: resolvedMode() === 'dark' ? 'sun' : 'moon', onClick: () => setPrefs({ mode: resolvedMode() === 'dark' ? 'light' : 'dark' }) },
    { label: 'Personalizar aparência', icon: 'palette', onClick: () => openSettings('look') },
    'hr',
    { label: 'Resumo da equipe', icon: 'chart', onClick: () => A.openSummary && A.openSummary() },
    { label: 'Atividade recente', icon: 'pulse', onClick: () => A.openActivity && A.openActivity() },
    { label: 'Lixeira (restaurar excluídas)', icon: 'trash', onClick: () => openTrash() },
    'hr',
    { label: 'Exportar tasks (CSV)', icon: 'download', onClick: () => A.exportCsv && A.exportCsv() },
    { label: 'Backup completo (JSON)', icon: 'download', onClick: () => A.exportJson && A.exportJson() },
  ];
}
function syncViewSeg() {
  document.querySelectorAll('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === (S.prefs.view || 'board')));
}
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
    h('button', { class: 'btn ghost icon hide-m', id: 'sbToggle', title: 'Mostrar ou ocultar a barra lateral', 'aria-label': 'Alternar barra lateral', onclick: () => setPrefs({ sidebar: S.prefs.sidebar === false }, { refreshSettings: false }) }, icon('menu')),
    h('div', { class: 'brand' }, h('span', { class: 'logo' }, icon('grid')), h('span', null, 'Kanban')),
    h('label', { class: 'search' }, icon('search'), search, h('kbd', null, '/')),
    h('div', { class: 'seg view-seg', id: 'viewSeg', role: 'tablist' }, [['board', 'grid', 'Quadro'], ['list', 'table', 'Lista'], ['calendar', 'calendar', 'Calendário'], ['painel', 'bento', 'Painel']].map(([k, ic, l]) =>
      h('button', { type: 'button', title: l, 'aria-label': l, dataset: { view: k }, onclick: () => setPrefs({ view: k }, { refreshSettings: false }) }, icon(ic)))),
    h('div', { class: 'grow' }),
    h('button', { class: 'btn', onclick: openDiary, title: 'Gerar diário do dia' }, icon('book'), h('span', { class: 'lbl' }, 'Gerar diário')),
    h('button', { class: 'btn primary keep', onclick: () => openQuickAdd(), title: 'Nova task (N)' }, icon('plus'), h('span', { class: 'lbl' }, 'Nova task')),
    h('button', { class: 'btn ghost icon', title: 'Mais (Ctrl+K)', 'aria-label': 'Mais opções', onclick: (e) => popover(e.currentTarget, moreMenu()) }, icon('more')),
    h('button', { class: 'btn ghost icon hide-m', id: 'modeBtn', onclick: () => setPrefs({ mode: resolvedMode() === 'dark' ? 'light' : 'dark' }) }),
    h('button', { class: 'btn ghost icon hide-m', title: 'Personalizar', onclick: () => openSettings('look') }, icon('palette')),
    h('button', { class: 'btn ghost icon', title: S.me.name, style: { padding: '4px' }, id: 'meBtn', onclick: (e) => popover(e.currentTarget, [
      { label: 'Minha conta', icon: 'edit', onClick: () => openSettings('account') },
      ...(S.me.role === 'admin' ? [{ label: 'Equipe', icon: 'take', onClick: () => openSettings('team') }] : []),
      'hr', { label: 'Sair', icon: 'logout', onClick: guard(async () => { await KB.signOut(); location.reload(); }) }]) }, avatar(S.me, 30)));
  app.append(top, h('div', { class: 'layout' }, h('aside', { id: 'sidebar', class: 'sidebar', 'aria-label': 'Filtros' }),
    h('div', { class: 'content' }, h('div', { id: 'toolbar', class: 'toolbar' }), h('main', { id: 'board', class: 'board' }))));
  renderTopbarMode();
}

const totalSecs = (t) => (t.time_spent || 0) + (t.timer_started_at ? Math.max(0, Math.floor((Date.now() - t.timer_started_at) / 1000)) : 0);
function fmtDur(sec) {
  sec = Math.max(0, Math.floor(sec));
  const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60;
  return hh ? `${hh}h${pad(mm)}` : mm ? `${mm}min` : `${ss}s`;
}
setInterval(() => {
  document.querySelectorAll('.timer-live[data-since]').forEach((el) => {
    const since = Number(el.dataset.since), base = Number(el.dataset.base || 0);
    const txt = fmtDur(base + (Date.now() - since) / 1000), n = el.lastChild;
    if (n && n.nodeType === 3 && n.textContent !== txt) n.textContent = txt;
  });
}, 1000);
const dueState = (t) => {
  const col = colById(t.column_id);
  if (!t.due_date || (col && col.kind === 'done')) return null;
  return t.due_date < ymd() ? 'late' : t.due_date === ymd() ? 'today' : null;
};
function matches(t) {
  const f = S.filter;
  if (f.who === 'me' && t.assignee_id !== S.me.id) return false;
  if (f.who === 'none' && t.assignee_id != null) return false;
  if (!['all', 'me', 'none'].includes(f.who) && t.assignee_id !== f.who) return false;
  if (f.label && !t.labels.some((l) => l.toLowerCase() === f.label.toLowerCase())) return false;
  if (f.due && dueState(t) !== f.due) return false;
  if (f.prio != null && t.priority !== f.prio) return false;
  if (f.q) { const hay = norm(t.title + ' ' + t.description + ' ' + t.labels.join(' ') + ' ' + (userById(t.assignee_id)?.name || '')); if (!norm(f.q).split(/\s+/).every((w) => hay.includes(w))) return false; }
  return true;
}
const filtersActive = () => S.filter.q || S.filter.who !== 'all' || S.filter.due || S.filter.label || S.filter.prio != null;
function clearFilters() { S.filter = { q: '', who: 'all', due: null, label: null }; const s = $('#search'); if (s) s.value = ''; renderBoard(); }

function renderToolbar() {
  const tb = $('#toolbar'); if (!tb) return;
  const chip = (label, who, extra) => h('button', { class: 'chip' + (S.filter.who === who ? ' on' : ''), onclick: () => { S.filter.who = S.filter.who === who && who !== 'all' ? 'all' : who; renderBoard(); } }, extra, label);
  const late = S.tasks.filter((t) => dueState(t) === 'late').length, today = S.tasks.filter((t) => dueState(t) === 'today').length;
  const dueChip = (key, label, n, cls) => (n > 0 || S.filter.due === key) && h('button', { class: 'chip ' + cls + (S.filter.due === key ? ' on' : ''), onclick: () => { S.filter.due = S.filter.due === key ? null : key; renderBoard(); } }, `${label} (${n})`);
  const labels = [...new Map(S.tasks.flatMap((t) => t.labels).map((l) => [l.toLowerCase(), l])).values()].sort((a, b) => a.localeCompare(b)).slice(0, 12);
  tb.replaceChildren(chip('Todas', 'all'), chip('Minhas', 'me'), chip('Sem dono', 'none'),
    ...S.users.filter((u) => u.id !== S.me.id).map((u) => chip(u.name.split(' ')[0], u.id, h('span', { class: 'av-wrap' + (S.online.has(u.id) ? ' online' : ''), title: S.online.has(u.id) ? 'online agora' : '' }, avatar(u, 18)))),
    (late > 0 || today > 0 || S.filter.due) && h('span', { class: 'sep' }), dueChip('late', 'Atrasadas', late, 'late'), dueChip('today', 'Vencem hoje', today, 'today'),
    labels.length > 0 && h('span', { class: 'sep' }),
    ...labels.map((l) => h('button', { class: 'tag tag-btn' + (S.filter.label && S.filter.label.toLowerCase() === l.toLowerCase() ? ' on' : ''), style: { '--h': hueOf(l) }, title: 'Filtrar por #' + l, onclick: () => { S.filter.label = S.filter.label && S.filter.label.toLowerCase() === l.toLowerCase() ? null : l; renderBoard(); } }, l)),
    filtersActive() && h('button', { class: 'btn ghost sm', onclick: clearFilters }, icon('x'), 'Limpar'));
  tb.querySelectorAll('svg').forEach((v) => Object.assign(v.style, { width: '13px', height: '13px' }));
}

function renderSidebar() {
  const sb = $('#sidebar'); if (!sb) return;
  const f = S.filter, open = S.tasks.filter((t) => (colById(t.column_id) || {}).kind !== 'done');
  const n = (fn) => open.filter(fn).length;
  const none = !f.q && f.who === 'all' && !f.due && !f.label && f.prio == null;
  const item = (label, count, active, onclick, lead, cls = '') => h('button', { type: 'button', class: 'sb-item' + (active ? ' on' : '') + (cls ? ' ' + cls : ''), 'aria-pressed': String(!!active), onclick },
    lead, h('span', { class: 'sb-label' }, label), count != null && h('span', { class: 'sb-count' }, count));
  const who = (v) => () => { f.who = f.who === v && v !== 'all' ? 'all' : v; renderBoard(); };
  const due = (v) => () => { f.due = f.due === v ? null : v; renderBoard(); };
  const prio = (v) => () => { f.prio = f.prio === v ? null : v; renderBoard(); };
  const labels = [...new Map(S.tasks.flatMap((t) => t.labels).map((l) => [l.toLowerCase(), l])).values()].sort((a, b) => a.localeCompare(b, 'pt-BR')).slice(0, 14);
  const dot = (css) => h('i', { class: 'sb-dot', style: css });
  sb.replaceChildren(
    h('div', { class: 'sb-sec' }, h('div', { class: 'sb-h' }, 'Tasks'),
      item('Todas', open.length, none, clearFilters, icon('list')),
      item('Minhas', n((t) => t.assignee_id === S.me.id), f.who === 'me', who('me'), avatar(S.me, 18)),
      item('Sem dono', n((t) => t.assignee_id == null), f.who === 'none', who('none'), avatar(null, 18))),
    h('div', { class: 'sb-sec' }, h('div', { class: 'sb-h' }, 'Prazos'),
      item('Atrasadas', n((t) => dueState(t) === 'late'), f.due === 'late', due('late'), dot({ background: 'var(--p3)' }), 'late'),
      item('Vencem hoje', n((t) => dueState(t) === 'today'), f.due === 'today', due('today'), dot({ background: 'var(--p2)' }))),
    h('div', { class: 'sb-sec' }, h('div', { class: 'sb-h' }, 'Prioridade'),
      item('Urgente', n((t) => t.priority === 3), f.prio === 3, prio(3), dot({ background: 'var(--p3)' })),
      item('Alta', n((t) => t.priority === 2), f.prio === 2, prio(2), dot({ background: 'var(--p2)' }))),
    S.users.length > 1 && h('div', { class: 'sb-sec' }, h('div', { class: 'sb-h' }, 'Equipe'),
      ...S.users.filter((u) => u.id !== S.me.id).map((u) => item(u.name.split(' ')[0], n((t) => t.assignee_id === u.id), f.who === u.id, who(u.id), h('span', { class: 'av-wrap' + (S.online.has(u.id) ? ' online' : '') }, avatar(u, 18))))),
    labels.length > 0 && h('div', { class: 'sb-sec' }, h('div', { class: 'sb-h' }, 'Etiquetas'),
      ...labels.map((l) => item(l, n((t) => t.labels.some((x) => x.toLowerCase() === l.toLowerCase())), f.label && f.label.toLowerCase() === l.toLowerCase(), () => { f.label = f.label && f.label.toLowerCase() === l.toLowerCase() ? null : l; renderBoard(); }, dot({ background: `hsl(${hueOf(l)} 65% 55%)` })))),
    h('div', { class: 'sb-foot' }, !none && h('button', { class: 'btn sm', onclick: clearFilters }, icon('x'), 'Limpar filtros'),
      h('div', { class: 'help' }, h('span', { class: 'kbd' }, 'N'), ' nova · ', h('span', { class: 'kbd' }, '/'), ' buscar · ', h('span', { class: 'kbd' }, 'Ctrl+K'))));
  sb.querySelectorAll('svg').forEach((v) => Object.assign(v.style, { width: '14px', height: '14px' }));
}

// esqueleto de carregamento (some quando o quadro chega)
function renderSkeleton() {
  const board = $('#board'); if (!board) return;
  board.className = 'board';
  board.replaceChildren(...[2, 3, 1, 2].map((n) => h('section', { class: 'column skeleton', 'aria-hidden': 'true' },
    h('div', { class: 'col-head' }, h('span', { class: 'sk sk-title' })),
    h('div', { class: 'col-body' }, Array.from({ length: n }, () => h('div', { class: 'card sk-card' }, h('span', { class: 'sk sk-line' }), h('span', { class: 'sk sk-line short' })))))));
}
function renderBoard() {
  const board = $('#board'); if (!board) return;
  const sx = board.scrollLeft; // lido antes de qualquer redesenho (senão o quadro volta para a 1ª coluna a cada atualização)
  renderToolbar(); renderSidebar(); syncViewSeg(); window.KBApp.updateIsland && window.KBApp.updateIsland();
  const view = S.prefs.view || 'board';
  if (view !== 'board' && window.KBApp.views[view]) {
    board.className = 'board alt view-' + view;
    board.replaceChildren(window.KBApp.views[view]());
    S.seen = new Set(S.tasks.map((t) => t.id));
    return;
  }
  board.className = 'board';
  const keep = { x: sx, y: {} };
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
  if (focusCol) { const el = board.querySelector(`.add-input[data-col="${focusCol.id}"]`); if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(focusCol.pos, focusCol.pos); } catch { /* ok */ } } }
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
  if (!list.length) body.append(h('div', { class: 'empty-hint' }, filtersActive() ? 'Nada com esse filtro' : (!S.tasks.length && col.id === S.columns[0].id) ? 'Comece pressionando N para criar a primeira task' : 'Solte uma task aqui'));
  if (hidden) body.append(h('button', { class: 'more-done', onclick: () => { S.showAllDone = true; renderBoard(); } }, `Mostrar ${hidden} concluída${hidden > 1 ? 's' : ''} antiga${hidden > 1 ? 's' : ''}`));

  const add = h('input', { class: 'add-input', placeholder: '+ Adicionar task (Enter)', dataset: { col: col.id }, maxLength: 300, autocomplete: 'off', value: S.drafts[col.id] || '',
    oninput: () => { S.drafts[col.id] = add.value; },
    onkeydown: guard(async (e) => {
      if (e.key === 'Escape') { add.value = ''; S.drafts[col.id] = ''; add.blur(); }
      if (e.key !== 'Enter' || !add.value.trim()) return;
      const text = add.value; add.value = ''; S.drafts[col.id] = '';
      try { await createFromText(text, col.id); const el = $(`.add-input[data-col="${col.id}"]`); el && el.focus(); } catch (x) { add.value = text; S.drafts[col.id] = text; throw x; }
    }) });

  const menuBtn = h('button', { class: 'btn ghost icon sm', title: 'Opções da coluna', onclick: (e) => popover(e.currentTarget, columnMenu(col, e.currentTarget)) }, icon('more'));
  const el = h('section', { class: 'column' + (col.color ? ' has-color' : ''), style: col.color ? { '--col-color': col.color } : null, dataset: { id: col.id, kind: col.kind } },
    h('div', { class: 'col-head' }, h('span', { class: 'col-dot' }), h('div', { class: 'col-title', title: col.name }, col.name), h('span', { class: 'col-count' + (col.wip_limit && all.length > col.wip_limit ? ' over' : ''), title: col.wip_limit ? `Limite: ${col.wip_limit} tasks` : '' }, col.wip_limit ? `${all.length}/${col.wip_limit}` : all.length), menuBtn),
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

const PRIO_RANK = (t) => -t.priority;
const COL_SORTS = [
  ['Prioridade (maior primeiro)', (a, b) => PRIO_RANK(a) - PRIO_RANK(b)],
  ['Prazo (mais cedo primeiro)', (a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : (a.due_date || '9999') > (b.due_date || '9999') ? 1 : 0],
  ['Título (A–Z)', (a, b) => a.title.localeCompare(b.title, 'pt-BR')],
  ['Mais recentes primeiro', (a, b) => b.created_at - a.created_at],
  ['Mais antigas primeiro', (a, b) => a.created_at - b.created_at],
];
const COL_COLORS = [['Padrão', null], ['Cinza', '#71717a'], ['Vermelho', '#ef4444'], ['Laranja', '#f97316'], ['Amarelo', '#eab308'], ['Verde', '#22c55e'], ['Azul', '#3b82f6'], ['Roxo', '#8b5cf6'], ['Rosa', '#ec4899']];
function columnMenu(col, anchor) {
  const idx = S.columns.findIndex((c) => c.id === col.id);
  const kinds = [['todo', 'A fazer'], ['doing', 'Em andamento'], ['done', 'Concluída']];
  return [
    { label: 'Renomear', icon: 'edit', onClick: guard(async () => { const n = await askText('Renomear coluna', col.name); if (n) { await api('PATCH', `/api/columns/${col.id}`, { name: n }); await loadBoard(); } }) },
    { label: 'Ordenar por…', icon: 'move', onClick: () => popover(anchor, COL_SORTS.map(([name, fn]) => ({ label: name, onClick: guard(async () => {
      const tasks = S.tasks.filter((t) => t.column_id === col.id).sort((a, b) => a.position - b.position || a.id - b.id);
      const ids = tasks.map((t, i) => [t, i]).sort((x, y) => fn(x[0], y[0]) || x[1] - y[1]).map((x) => x[0].id);
      await api('POST', `/api/columns/${col.id}/sort`, { ids }); await loadBoard(); toast('Coluna ordenada');
    }) }))) },
    { label: col.wip_limit ? `Limite de tasks (${col.wip_limit})…` : 'Definir limite de tasks…', icon: 'list', onClick: guard(async () => {
      const v = await askText('Limite de tasks nesta coluna (1 a 99)', col.wip_limit ? String(col.wip_limit) : '', { ok: 'Salvar', placeholder: 'Ex.: 3' });
      if (v == null) return; const n = parseInt(v, 10);
      if (!(n >= 1 && n <= 99)) return toast('Informe um número de 1 a 99', true);
      await api('PATCH', `/api/columns/${col.id}`, { wip_limit: n }); await loadBoard();
    }) },
    ...(col.wip_limit ? [{ label: 'Remover limite', icon: 'x', onClick: guard(async () => { await api('PATCH', `/api/columns/${col.id}`, { wip_limit: null }); await loadBoard(); }) }] : []),
    { label: 'Cor da coluna…', icon: 'palette', onClick: () => popover(anchor, COL_COLORS.map(([name, c]) => ({ label: name, dot: c, checked: (col.color || null) === c, onClick: guard(async () => { await api('PATCH', `/api/columns/${col.id}`, { color: c }); await loadBoard(); }) }))) },
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

function cardMenu(t) {
  const mine = t.assignee_id === S.me.id;
  return [
    { label: 'Abrir', icon: 'edit', onClick: () => openTask(t.id) },
    mine ? { label: 'Soltar (ficar sem dono)', icon: 'x', onClick: guard(async () => { upsertTask(await api('PATCH', `/api/tasks/${t.id}`, { assignee_id: null })); renderBoard(); }) }
      : { label: 'Pegar pra mim', icon: 'take', onClick: guard(async () => { upsertTask(await api('PATCH', `/api/tasks/${t.id}`, { assignee_id: S.me.id })); renderBoard(); toast('Task é sua'); }) },
    { label: 'Duplicar', icon: 'copy', onClick: guard(async () => {
      const n = await api('POST', '/api/tasks', { title: (t.title.slice(0, 288) + ' (cópia)'), column_id: t.column_id, description: t.description, diary: t.diary, priority: t.priority, due_date: t.due_date, assignee_id: t.assignee_id, labels: t.labels, checklist: (t.checklist || []).map((i) => ({ text: i.text, done: false })) });
      upsertTask(n); renderBoard(); toast('Task duplicada');
    }) },
    'hr', ...S.columns.map((c) => ({ label: 'Mover para ' + c.name, checked: c.id === t.column_id, onClick: guard(() => c.id === t.column_id ? null : moveTask(t.id, c.id, null)) })),
    'hr', { label: 'Excluir', icon: 'trash', danger: true, onClick: guard(() => deleteTask(t)) },
  ];
}
async function openTrash() {
  const list = h('div', { class: 'trash-list' }, h('div', { class: 'help' }, 'Carregando…'));
  const close = openModal([modalHead('Lixeira', () => close()), h('div', { class: 'modal-body' }, h('div', { class: 'help' }, 'Tasks excluídas ficam aqui para você restaurar (as 60 mais recentes).'), list)]);
  const row = (r, rows) => h('div', { class: 'trash-row' },
    h('div', { class: 'trash-info' }, h('div', { class: 'trash-title' }, r.title), h('div', { class: 'help' }, `${(colById(r.column_id) || { name: 'coluna removida' }).name} · excluída em ${fmtTime(r.deleted_at)}`)),
    h('button', { class: 'btn sm', onclick: guard(async () => { await api('POST', `/api/tasks/${r.id}/restore`); await loadBoard(); draw(rows.filter((x) => x.id !== r.id)); toast('Task restaurada'); }) }, 'Restaurar'));
  const draw = (rows) => list.replaceChildren(...(rows.length ? rows.map((r) => row(r, rows)) : [h('div', { class: 'empty-note' }, 'A lixeira está vazia.')]));
  try { draw(await api('GET', '/api/trash')); } catch (e) { list.replaceChildren(h('div', { class: 'err-msg' }, e.message)); }
}
async function deleteTask(t) {
  await api('DELETE', `/api/tasks/${t.id}`);
  S.tasks = S.tasks.filter((x) => x.id !== t.id); renderBoard();
  toast('Task excluída', false, { label: 'Desfazer', onClick: guard(async () => { await api('POST', `/api/tasks/${t.id}/restore`); await loadBoard(); toast('Task restaurada'); }) });
}

function renderCard(t, col) {
  const owner = userById(t.assignee_id);
  const ds = dueState(t);
  const cl = t.checklist || [], clDone = cl.filter((i) => i.done).length;
  const card = h('article', { class: 'card' + (col.kind === 'done' ? ' done' : '') + (S.seen && !S.seen.has(t.id) ? ' enter' : ''), draggable: true, tabIndex: 0, dataset: { id: t.id, p: t.priority },
    onclick: () => openTask(t.id), onkeydown: (e) => { if (e.key === 'Enter' && e.target === card) openTask(t.id); } },
    h('button', { class: 'card-menu btn ghost icon sm', title: 'Opções da task', 'aria-label': 'Opções da task', onclick: (e) => { e.stopPropagation(); popover(e.currentTarget, cardMenu(t)); } }, icon('more')),
    h('div', { class: 'card-title' }, t.title),
    t.description && h('div', { class: 'card-desc' }, t.description),
    h('div', { class: 'card-meta' },
      h('div', { class: 'cm-left' }, t.labels.map((l) => h('span', { class: 'tag tag-btn', style: { '--h': hueOf(l) }, title: 'Filtrar por #' + l, onclick: (e) => { e.stopPropagation(); S.filter.label = S.filter.label && S.filter.label.toLowerCase() === l.toLowerCase() ? null : l; renderBoard(); } }, l))),
      h('div', { class: 'cm-right' },
        cl.length > 0 && h('span', { class: 'due' + (clDone === cl.length ? ' ok' : '') }, icon('list'), `${clDone}/${cl.length}`),
        t.attachments > 0 && h('span', { class: 'due', title: 'Anexos' }, icon('clip'), t.attachments),
        (t.timer_started_at || t.time_spent > 0) && h('span', { class: 'due' + (t.timer_started_at ? ' timer-live running' : ''), title: t.timer_started_at ? 'Cronômetro rodando' : 'Tempo registrado',
          dataset: t.timer_started_at ? { since: t.timer_started_at, base: t.time_spent } : {} }, icon('timer'), fmtDur(totalSecs(t))),
        t.due_date && h('span', { class: 'due' + (ds === 'late' ? ' late' : ds === 'today' ? ' today' : '') }, icon('calendar'), fmtDay(t.due_date)),
        owner ? avatar(owner, 24) : h('button', { class: 'btn sm take', title: 'Pegar esta task', onclick: guard(async (e) => { e.stopPropagation(); upsertTask(await api('PATCH', `/api/tasks/${t.id}`, { assignee_id: S.me.id })); renderBoard(); toast('Task é sua'); }) }, icon('take'), 'Pegar'))));
  card.addEventListener('dragstart', (e) => { S.drag = t.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(t.id)); requestAnimationFrame(() => card.classList.add('dragging')); });
  card.addEventListener('dragend', () => {
    S.drag = null; card.classList.remove('dragging'); document.querySelectorAll('.drop-line').forEach((l) => l.remove()); document.querySelectorAll('.column.over').forEach((c) => c.classList.remove('over'));
    if (S.pendingLoad) { S.pendingLoad = false; scheduleLoad(); }
  });
  card.querySelectorAll('svg').forEach((v) => Object.assign(v.style, { width: '13px', height: '13px' }));
  return card;
}

async function moveTask(id, colId, beforeId, { undo = false } = {}) {
  // atualização otimista, igual à regra do servidor
  const t = S.tasks.find((x) => x.id === id); if (!t) return;
  const target = colById(colId), prevCol = t.column_id;
  const prevList = S.tasks.filter((x) => x.column_id === prevCol).sort((a, b) => a.position - b.position || a.id - b.id);
  const prevNext = (prevList[prevList.findIndex((x) => x.id === id) + 1] || {}).id || null;
  const list = S.tasks.filter((x) => x.column_id === colId && x.id !== id).sort((a, b) => a.position - b.position || a.id - b.id);
  let i = beforeId ? list.findIndex((x) => x.id === beforeId) : -1; if (i < 0) i = list.length;
  list.splice(i, 0, t); list.forEach((x, k) => { x.column_id = colId; x.position = k; });
  if (target.kind === 'doing' && !t.assignee_id) t.assignee_id = S.me.id;
  renderBoard();
  try { await api('POST', `/api/tasks/${id}/move`, { column_id: colId, before_id: beforeId }); } finally { await loadBoard(); }
  if (!undo && prevCol !== colId) toast(`Movida para ${target.name}`, false, { label: 'Desfazer', onClick: guard(() => moveTask(id, prevCol, prevNext, { undo: true })) });
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
    case 'comment': return 'comentou';
    case 'timer': return d.action === 'start' ? 'iniciou o cronômetro' : `parou o cronômetro (${fmtDur(d.seconds || 0)})`;
    case 'attachment': return `anexou ${d.name || 'um arquivo'}`;
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

  // checklist
  const items = (t.checklist || []).map((i) => ({ ...i }));
  const clBox = h('div', { class: 'checklist' });
  const saveCl = () => save({ checklist: items });
  const drawCl = () => {
    const done = items.filter((i) => i.done).length;
    clBox.replaceChildren(
      items.length > 0 && h('div', { class: 'cl-head' }, h('div', { class: 'cl-bar' }, h('i', { style: { width: (items.length ? (done / items.length) * 100 : 0) + '%' } })), h('span', { class: 'help' }, `${done}/${items.length}`)),
      ...items.map((it, idx) => h('div', { class: 'cl-item' + (it.done ? ' done' : '') },
        h('input', { type: 'checkbox', checked: it.done, 'aria-label': 'Concluir item', onchange: (e) => { it.done = e.target.checked; drawCl(); saveCl(); } }),
        h('input', { class: 'cl-text', value: it.text, maxLength: 200, onchange: (e) => { const v = e.target.value.trim(); if (!v) items.splice(idx, 1); else it.text = v; drawCl(); saveCl(); } }),
        h('button', { class: 'btn ghost icon sm', title: 'Remover item', 'aria-label': 'Remover item', onclick: () => { items.splice(idx, 1); drawCl(); saveCl(); } }, icon('x')))),
      items.length < 50 && h('input', { class: 'input cl-add', placeholder: '+ Adicionar item (Enter)', maxLength: 200, onkeydown: (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) { e.preventDefault(); items.push({ text: e.target.value.trim(), done: false }); drawCl(); saveCl(); const n = clBox.querySelector('.cl-add'); n && n.focus(); }
      } }));
    clBox.querySelectorAll('.btn svg').forEach((v) => Object.assign(v.style, { width: '14px', height: '14px' }));
  };
  drawCl();

  // cronômetro
  const timeBox = h('div', { class: 'timebox' });
  const drawTime = () => {
    const cur = S.tasks.find((x) => x.id === id) || t, running = !!cur.timer_started_at;
    timeBox.replaceChildren(
      h('span', { class: 'time-total' + (running ? ' timer-live running' : ''), dataset: running ? { since: cur.timer_started_at, base: cur.time_spent } : {} }, icon('timer'), fmtDur(totalSecs(cur))),
      h('button', { class: 'btn sm' + (running ? ' primary' : ''), onclick: guard(async () => { await api('POST', `/api/tasks/${id}/timer`); await loadBoard(); drawTime(); loadEvents(); }) }, icon(running ? 'pause' : 'play'), running ? 'Parar' : 'Iniciar'),
      running && cur.timer_user !== S.me.id && h('span', { class: 'help' }, `rodando com ${userById(cur.timer_user)?.name || 'alguém'}`));
    timeBox.querySelectorAll('svg').forEach((v) => Object.assign(v.style, { width: '14px', height: '14px' }));
  };
  drawTime();

  // anexos
  const attBox = h('div', { class: 'atts' });
  const fileInput = h('input', { type: 'file', multiple: true, class: 'hidden', onchange: () => { upload([...fileInput.files]); fileInput.value = ''; } });
  const fmtSize = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const openAtt = async (a) => { const w = window.open('about:blank', '_blank'); try { const url = await KB.attachmentUrl(a.path); if (w) w.location.href = url; } catch (e) { w && w.close(); toast(e.message, true); } };
  const drawAtts = (list) => {
    attBox.replaceChildren(...list.map((a) => {
      const thumb = h('span', { class: 'att-thumb' }, icon('clip'));
      if ((a.mime || '').startsWith('image/')) KB.attachmentUrl(a.path).then((u) => { const im = h('img', { src: u, alt: '', loading: 'lazy' }); thumb.replaceChildren(im); }).catch(() => {});
      return h('div', { class: 'att' }, thumb,
        h('button', { class: 'att-name', title: 'Abrir', onclick: () => openAtt(a) }, a.name, h('small', null, `${fmtSize(a.size)} · ${userById(a.user_id)?.name || ''}`)),
        h('button', { class: 'btn ghost icon sm', title: 'Remover anexo', 'aria-label': 'Remover anexo', onclick: guard(async () => { await KB.removeAttachment(a); loadAtts(); loadBoard(); }) }, icon('x')));
    }), h('div', { class: 'att-add' }, h('button', { class: 'btn sm', onclick: () => fileInput.click() }, icon('clip'), 'Anexar arquivo'), h('span', { class: 'help' }, 'ou cole um print (Ctrl+V) / arraste arquivos aqui · até 10 MB'), fileInput));
    attBox.querySelectorAll('.btn svg').forEach((v) => Object.assign(v.style, { width: '14px', height: '14px' }));
  };
  const loadAtts = async () => { try { drawAtts(await api('GET', `/api/tasks/${id}/attachments`)); } catch { drawAtts([]); } };
  const upload = guard(async (files) => {
    for (const f of files) { toast(`Enviando ${f.name}…`); await KB.uploadAttachment(id, f, S.me.id); }
    if (files.length) { toast(files.length > 1 ? 'Arquivos anexados' : 'Arquivo anexado'); loadAtts(); loadEvents(); loadBoard(); }
  });
  drawAtts([]); loadAtts();

  // comentários e histórico
  const comment = h('textarea', { class: 'textarea', style: { minHeight: '56px' }, placeholder: 'Escrever um comentário… (Ctrl+Enter envia)', maxLength: 2000,
    onkeydown: (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendComment(); } } });
  const sendComment = guard(async () => { const text = comment.value.trim(); if (!text) return; comment.value = ''; try { await api('POST', `/api/tasks/${id}/comments`, { text }); } catch (x) { comment.value = text; throw x; } loadEvents(); });
  const timeline = h('div', { class: 'timeline' });
  async function loadEvents() {
    try {
      const ev = await api('GET', `/api/tasks/${id}/events`);
      timeline.replaceChildren(...ev.map((e) => e.type === 'comment'
        ? h('div', { class: 'cm' }, h('div', null, h('b', null, e.user_name || 'Alguém'), ' comentou', h('time', null, fmtTime(e.at))), h('div', { class: 'cm-text' }, (e.data && e.data.text) || ''))
        : h('div', null, h('b', null, e.user_name || 'Alguém'), ' ' + eventText(e), h('time', null, fmtTime(e.at)))));
    } catch { /* ignora */ }
  }
  const worked = h('button', { class: 'btn sm', title: 'Marca esta task como trabalhada hoje (entra no diário)', onclick: guard(async () => { await api('POST', `/api/tasks/${id}/worked`); toast('Registrado no diário de hoje'); loadEvents(); }) }, icon('check'), 'Trabalhei hoje');

  const propField = (label, el) => h('div', { class: 'field' }, h('label', null, label), el);
  const close = openModal([
    h('div', { class: 'modal-head task-head' }, h('div', { class: 'grow' }, title), h('button', { class: 'btn ghost icon sm', 'aria-label': 'Fechar', onclick: () => { document.activeElement && document.activeElement.blur(); close(); } }, icon('x'))),
    h('div', { class: 'task-grid' },
      h('div', { class: 'task-main' },
        propField('Descrição', desc), propField('Checklist', clBox), propField('Anexos', attBox),
        h('div', { class: 'field' }, h('label', null, 'Comentários e histórico'), comment, h('div', null, h('button', { class: 'btn sm', onclick: sendComment }, 'Comentar')), timeline)),
      h('aside', { class: 'task-side', 'aria-label': 'Propriedades da task' },
        propField('Status', colSel), propField('Responsável', own), propField('Prazo', due), propField('Prioridade', h('div', { class: 'seg' }, prioBtns)),
        propField('Etiquetas', labelBox), propField('Tempo', timeBox), propField('Texto para o diário', diary))),
    h('div', { class: 'modal-foot' },
      h('button', { class: 'btn danger', onclick: guard(async () => { close(); await deleteTask(t); }) }, icon('trash'), 'Excluir'),
      h('span', { class: 'grow' }), t.assignee_id !== S.me.id && takeBtn, worked)], { xwide: true });
  loadEvents();
  const mEl = timeline.closest('.modal');
  if (mEl) {
    mEl.addEventListener('paste', (e) => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); upload(fs); } });
    mEl.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    mEl.addEventListener('drop', (e) => { const fs = [...(e.dataTransfer?.files || [])]; if (fs.length) { e.preventDefault(); upload(fs); } });
  }
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
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return ymd(new Date(y, m - 1, d + n)); };
const weekStart = (s) => { const [y, m, d] = s.split('-').map(Number); const dt = new Date(y, m - 1, d); return addDays(s, -((dt.getDay() + 6) % 7)); }; // segunda-feira
const dayTitle = (s) => { const [y, m, d] = s.split('-').map(Number); return `${cap(new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long' }))} (${pad(d)}/${pad(m)})`; };

function openDiary() {
  const o = { mode: 'day', date: ymd(), scope: 'me', doing: true, status: false };
  let days = []; // [{ date, items }]
  const area = h('textarea', { class: 'textarea diary-text', spellcheck: false });
  const count = h('span', { class: 'help' });
  const date = h('input', { class: 'input', type: 'date', value: o.date, max: ymd(), onchange: () => { o.mode = 'day'; o.date = date.value || ymd(); drawPresets(); load(); } });
  const presets = h('div', { class: 'seg' });
  const drawPresets = () => {
    const today = ymd(), yest = addDays(today, -1);
    const cur = o.mode === 'week' ? 'week' : o.date === today ? 'today' : o.date === yest ? 'yest' : 'other';
    presets.replaceChildren(...[['today', 'Hoje'], ['yest', 'Ontem'], ['week', 'Semana']].map(([k, l]) => h('button', { type: 'button', class: cur === k ? 'on' : '', onclick: () => {
      if (k === 'week') { o.mode = 'week'; o.date = today; } else { o.mode = 'day'; o.date = k === 'today' ? today : yest; }
      date.value = o.date; drawPresets(); load();
    } }, l)));
  };
  const seg = (key, opts) => { const wrap = h('div', { class: 'seg' }); const draw = () => wrap.replaceChildren(...opts.map(([v, label]) => h('button', { type: 'button', class: o[key] === v ? 'on' : '', onclick: () => { o[key] = v; draw(); load(); } }, label))); draw(); return wrap; };
  const build = () => {
    const total = days.reduce((n, d) => n + d.items.length, 0);
    area.value = o.mode === 'week'
      ? days.filter((d) => d.items.length).map((d) => dayTitle(d.date) + '\n' + d.items.map((i) => diaryLine(i, o.status)).join('\n')).join('\n\n')
      : (days[0] ? days[0].items.map((i) => diaryLine(i, o.status)).join('\n') : '');
    count.textContent = total ? `${total} ${total > 1 ? 'itens' : 'item'}` : '';
    area.placeholder = 'Nada registrado nesse período. Crie, mova ou edite tasks (ou use "Trabalhei hoje" na task) e gere de novo.';
  };
  let seq = 0;
  const load = guard(async () => {
    const my = ++seq, today = ymd();
    const list = o.mode === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(weekStart(o.date), i)).filter((d) => d <= today) : [o.date];
    const res = await Promise.all(list.map(async (dt) => {
      const [from, to] = dayRange(dt);
      const d = await api('GET', `/api/diary?from=${from}&to=${to}&scope=${o.scope}&doing=${o.doing && dt === today ? 1 : 0}`);
      return { date: dt, items: d.items };
    }));
    if (my !== seq) return; // resposta antiga
    days = res; build();
  });
  const doingCb = h('input', { type: 'checkbox', checked: o.doing, onchange: () => { o.doing = doingCb.checked; load(); } });
  const statusCb = h('input', { type: 'checkbox', checked: o.status, onchange: () => { o.status = statusCb.checked; build(); } });
  const close = openModal([modalHead('Diário de trabalho', () => close()),
    h('div', { class: 'modal-body' },
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', null, 'Período'), presets),
        h('div', { class: 'field' }, h('label', null, 'Ou escolha um dia'), date)),
      h('div', { class: 'field' }, h('label', null, 'De quem'), seg('scope', [['me', 'Só minhas'], ['team', 'Equipe toda']])),
      h('div', { class: 'row' }, h('label', { class: 'check' }, doingCb, 'Incluir tasks em andamento (só hoje)'), h('label', { class: 'check' }, statusCb, 'Mostrar status')),
      area,
      h('div', { class: 'help' }, 'Entram as tasks que você criou, moveu, editou, comentou ou marcou com "Trabalhei hoje". Use o campo ', h('b', null, 'Texto para o diário'), ' da task para escrever exatamente como quer que apareça. Você pode editar o texto aqui antes de copiar.')),
    h('div', { class: 'modal-foot' }, count, h('span', { class: 'grow' }),
      h('button', { class: 'btn primary', onclick: async (e) => {
        const btn = e.currentTarget; if (!area.value.trim()) return toast('Nada para copiar', true);
        const ok = await copyText(area.value); toast(ok ? 'Diário copiado' : 'Não consegui copiar, selecione o texto', false);
        const svg = btn.querySelector('svg'); if (ok && svg) { const ck = icon('check'); ck.classList.add('icon-swap'); svg.replaceWith(ck); setTimeout(() => { const cp = icon('copy'); cp.classList.add('icon-swap'); ck.replaceWith(cp); }, 1600); }
      } }, icon('copy'), 'Copiar'))], { wide: true });
  drawPresets(); load();
}

/* ================= personalização, conta e equipe ================= */
// Troca de aba com direção (ideia do Direction Aware Tabs): o conteúdo novo entra pelo lado de onde a aba veio. Só transform/opacity, 180 ms.
function slideIn(els) {
  const dir = S.tabDir || 1; S.tabDir = 0;
  els.forEach((e) => { e.style.setProperty('--dx', dir * 22 + 'px'); e.classList.remove('slide-in'); void e.offsetWidth; e.classList.add('slide-in'); });
}
function openSettings(tab = 'look') {
  const content = h('div'), tabsEl = h('div', { class: 'tabs' });
  const tabs = [['look', 'Aparência'], ['account', 'Conta'], ...(S.me.role === 'admin' ? [['team', 'Equipe']] : [])];
  const draw = () => {
    tabsEl.replaceChildren(...tabs.map(([k, l]) => h('button', { class: tab === k ? 'on' : '', onclick: () => { if (tab === k) return; S.tabDir = tabs.findIndex((x) => x[0] === k) > tabs.findIndex((x) => x[0] === tab) ? 1 : -1; tab = k; draw(); slideIn([content]); } }, l)));
    content.replaceChildren(({ look: viewLook, account: viewAccount, team: viewTeam })[tab]());
  };
  S.refreshSettings = () => { if (tab === 'look') { const pn = () => $('.drawer-panel'); const y = pn() ? pn().scrollTop : 0; draw(); if (pn() && y) pn().scrollTop = y; } };
  const close = openModal([modalHead('Personalizar', () => close()), tabsEl, content], { drawer: true, onClose: () => { S.refreshSettings = null; } });
  draw();
}

const themeFilterState = { q: '', fx: 'all' };
function filterThemes(field, patch) {
  Object.assign(themeFilterState, patch);
  const words = norm(themeFilterState.q).split(/\s+/).filter(Boolean);
  let shown = 0;
  field.querySelectorAll('.theme-tile').forEach((t) => {
    const ok = words.every((w) => t.dataset.search.includes(w)) && (themeFilterState.fx === 'all' || (themeFilterState.fx === 'fx') === (t.dataset.fx === '1'));
    t.classList.toggle('hidden', !ok); if (ok) shown++;
  });
  field.querySelectorAll('.theme-group').forEach((g) => g.classList.toggle('hidden', !g.querySelector('.theme-tile:not(.hidden)')));
  field.querySelector('.theme-empty').classList.toggle('hidden', shown > 0);
}
function benchRow(api) {
  const out = h('span', { class: 'help' });
  return h('div', { class: 'range-row' }, h('button', { class: 'btn sm', onclick: () => {
    const r = api && api.bench && api.bench(40);
    out.textContent = r ? `≈ ${r.ms.toFixed(1)} ms por quadro (${r.w}×${r.h}). Ideal: abaixo de 16 ms; o fundo roda a 30 fps, então até 33 ms é tranquilo.` : 'Ative o fundo para medir.';
  } }, 'Medir desempenho neste aparelho'), out);
}
function fxControls(p) {
  const slider = (key, label, min, max, fmt = (v) => v) => h('div', { class: 'range-row' }, h('span', { class: 'help', style: { width: '96px' } }, label),
    h('input', { type: 'range', min, max, value: p[key], oninput: (e) => { setPrefs({ [key]: Number(e.target.value) }, { refreshSettings: false }); e.target.nextSibling.textContent = fmt(e.target.value); } }), h('output', null, fmt(p[key])));
  const color = (key, label) => h('label', { class: 'color-pick', title: label }, h('input', { type: 'color', value: p[key], oninput: (e) => setPrefs({ [key]: e.target.value }, { refreshSettings: false }), onchange: () => S.refreshSettings && S.refreshSettings() }), h('span', null, label));
  const PR = (window.KBFx && window.KBFx.PRESETS) || {};
  const names = { neon: 'Neon', ambar: 'Âmbar', gelo: 'Gelo', mono: 'Mono' };
  return h('div', { class: 'shader-box' },
    h('div', { class: 'swatches' }, Object.entries(PR).map(([k, v]) => h('button', { type: 'button', class: 'preset-chip' + (p.fxBg === v.fxBg && p.fxC1 === v.fxC1 && p.fxC2 === v.fxC2 ? ' on' : ''), title: names[k], onclick: () => setPrefs({ ...v }),
      style: { background: `linear-gradient(135deg,${v.fxBg} 40%,${v.fxC2} 41%,${v.fxC1})` } }, h('span', null, names[k])))),
    h('div', { class: 'field' }, h('label', null, 'Cores'), h('div', { class: 'swatches' }, color('fxBg', 'Fundo'), color('fxC1', 'Cor 1'), color('fxC2', 'Cor 2'))),
    slider('fxSp', 'Velocidade', 10, 250, (v) => v + '%'), slider('fxAmt', 'Intensidade', 20, 200, (v) => v + '%'),
    benchRow(window.KBFx),
    h('div', { class: 'help' }, 'Mexa o mouse: o efeito reage. Com “Fundo animado” desligado (ou movimento reduzido no sistema) fica parado. No Parallax, role o quadro.'));
}
function terrainControls(p) {
  const slider = (key, label, min, max, fmt = (v) => v) => h('div', { class: 'range-row' }, h('span', { class: 'help', style: { width: '96px' } }, label),
    h('input', { type: 'range', min, max, value: p[key], oninput: (e) => { setPrefs({ [key]: Number(e.target.value) }, { refreshSettings: false }); e.target.nextSibling.textContent = fmt(e.target.value); } }), h('output', null, fmt(p[key])));
  const color = (key, label) => h('label', { class: 'color-pick', title: label }, h('input', { type: 'color', value: p[key], oninput: (e) => setPrefs({ [key]: e.target.value }, { refreshSettings: false }), onchange: () => S.refreshSettings && S.refreshSettings() }), h('span', null, label));
  const PR = (window.KBTerrain && window.KBTerrain.PRESETS) || {};
  const names = { papel: 'Papel', carvao: 'Carvão', synth: 'Synthwave', pontos: 'Pontos' };
  return h('div', { class: 'shader-box' },
    h('div', { class: 'swatches' }, Object.entries(PR).map(([k, v]) => h('button', { type: 'button', class: 'preset-chip' + (p.trBg === v.trBg && p.trLine === v.trLine && p.trAccent === v.trAccent && p.trType === v.trType ? ' on' : ''), title: names[k], onclick: () => setPrefs({ ...v }),
      style: { background: `linear-gradient(135deg,${v.trBg} 40%,${v.trAccent} 41%,${v.trLine})` } }, h('span', null, names[k])))),
    h('div', { class: 'row' },
      h('div', { class: 'field' }, h('label', null, 'Tipo'), h('div', { class: 'seg' }, [['linhas', 'Linhas'], ['synth', 'Synthwave'], ['pontos', 'Pontos']].map(([v, l]) => h('button', { type: 'button', class: p.trType === v ? 'on' : '', onclick: () => setPrefs({ trType: v }) }, l)))),
      h('div', { class: 'field' }, h('label', null, 'Cores'), h('div', { class: 'swatches' }, color('trBg', 'Fundo'), color('trLine', 'Linha'), color('trAccent', 'Destaque')))),
    slider('trDensity', 'Densidade', 20, 160), slider('trSpeed', 'Velocidade', 0, 150), slider('trRelief', 'Relevo', 0, 200, (v) => v + '%'), slider('trSun', 'Tamanho do sol', 0, 250, (v) => v + '%'),
    slider('trCam', 'Altura da câmera', 30, 200, (v) => v + '%'), slider('trHover', 'Hover (mouse)', 0, 200, (v) => v + '%'), slider('trInterval', 'Linha de destaque a cada', 2, 12), slider('trSoft', 'Suavizar linhas', 0, 80, (v) => v + '%'),
    benchRow(window.KBTerrain),
    h('div', { class: 'help' }, 'Mova o mouse: a câmera acompanha. Com “Fundo animado” desligado (ou movimento reduzido no sistema) o terreno fica parado.'));
}
function shaderControls(p) {
  const slider = (key, label, min, max, fmt = (v) => v) => h('div', { class: 'range-row' }, h('span', { class: 'help', style: { width: '90px' } }, label),
    h('input', { type: 'range', min, max, value: p[key], oninput: (e) => { setPrefs({ [key]: Number(e.target.value) }, { refreshSettings: false }); e.target.nextSibling.textContent = fmt(e.target.value); } }), h('output', null, fmt(p[key])));
  const color = (key, label) => h('label', { class: 'color-pick', title: label }, h('input', { type: 'color', value: p[key], oninput: (e) => setPrefs({ [key]: e.target.value }, { refreshSettings: false }), onchange: () => S.refreshSettings && S.refreshSettings() }), h('span', null, label));
  const supported = !window.KBShader || window.KBShader.supported();
  return h('div', { class: 'shader-box' },
    !supported && h('div', { class: 'help' }, 'Este navegador não tem WebGL: o fundo usa um gradiente simples com as mesmas cores.'),
    h('div', { class: 'swatches' }, SHADER_PRESETS.map(([name, type, a, b, c]) => h('button', { type: 'button', class: 'preset-chip' + (p.shC1 === a && p.shC2 === b && p.shC3 === c && p.shType === type ? ' on' : ''), title: name, onclick: () => setPrefs({ shType: type, shC1: a, shC2: b, shC3: c }),
      style: { background: `linear-gradient(135deg,${a},${b},${c})` } }, h('span', null, name)))),
    h('div', { class: 'row' },
      h('div', { class: 'field' }, h('label', null, 'Tipo'), h('div', { class: 'seg' }, [['plane', 'Fluxo'], ['waves', 'Ondas'], ['orb', 'Orbe']].map(([v, l]) => h('button', { type: 'button', class: p.shType === v ? 'on' : '', onclick: () => setPrefs({ shType: v }) }, l)))),
      h('div', { class: 'field' }, h('label', null, 'Cores'), h('div', { class: 'swatches' }, color('shC1', '1'), color('shC2', '2'), color('shC3', '3')))),
    slider('shSpeed', 'Velocidade', 0, 150, (v) => (v / 100).toFixed(1).replace('.', ',') + '×'), slider('shStrength', 'Força', 0, 100, (v) => v + '%'),
    slider('shDensity', 'Densidade', 0, 100, (v) => v + '%'), slider('shGrain', 'Grão', 0, 30, (v) => v + '%'), slider('shDim', 'Escurecer', 0, 80, (v) => v + '%'),
    benchRow(window.KBShader),
    h('div', { class: 'help' }, 'Dica: no modo escuro o fundo escurece sozinho. Com “Fundo animado” desligado (ou movimento reduzido no sistema) ele fica parado.'));
}
async function resetPrefs() {
  if (!(await confirmBox('Restaurar toda a aparência para o padrão? Logo em seguida você poderá desfazer.', 'Restaurar', false))) return;
  const prev = { ...S.prefs };
  setPrefs({ ...DEFAULT_PREFS });
  toast('Aparência restaurada', false, { label: 'Desfazer', onClick: () => setPrefs(prev) });
}
function viewLook() {
  const p = S.prefs, mode = resolvedMode();
  const seg = (key, opts) => h('div', { class: 'seg' }, opts.map(([v, l]) => h('button', { type: 'button', class: p[key] === v ? 'on' : '', onclick: () => setPrefs({ [key]: v }) }, l)));
  const toggle = (key, label) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!p[key], onchange: (e) => setPrefs({ [key]: e.target.checked }) }), label);
  const swatchColors = ['#6366f1', '#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7'];
  const G = {
    tema: [
      h('div', { class: 'field' }, h('label', null, `Tema (${THEMES.length})`),
        h('div', { class: 'theme-tools' },
          h('input', { class: 'input', style: { maxWidth: '220px' }, placeholder: 'Buscar tema…', type: 'search', value: themeFilterState.q, 'aria-label': 'Buscar tema', oninput: (e) => filterThemes(e.target.closest('.field'), { q: e.target.value }) }),
          h('div', { class: 'seg theme-filter' }, [['all', 'Todos'], ['fx', 'Animados'], ['static', 'Estáticos']].map(([k, l]) => h('button', { type: 'button', class: k === themeFilterState.fx ? 'on' : '', onclick: (e) => { const f = e.target.closest('.field'); f.querySelectorAll('.theme-filter button').forEach((b) => b.classList.toggle('on', b === e.target)); filterThemes(f, { fx: k }); } }, l))),
          h('button', { class: 'btn sm', onclick: () => { const others = THEMES.filter((t) => t[0] !== p.theme); setPrefs({ theme: others[Math.floor(Math.random() * others.length)][0] }); } }, 'Surpreenda-me')),
        h('span', { class: 'help' }, 'Todos têm modo claro e escuro. “Animado” = tem efeito de fundo (dá para desligar ou ajustar abaixo).'),
        [...new Set(THEMES.map((t) => t[3]))].map((cat) => h('div', { class: 'theme-group' }, h('div', { class: 'theme-cat' }, cat),
          h('div', { class: 'theme-grid' }, THEMES.filter((t) => t[3] === cat).map(([id, name, sub, , fx]) => h('button', { class: 'theme-tile' + (p.theme === id ? ' on' : ''), dataset: { theme: id, mode, search: norm(name + ' ' + sub + ' ' + cat), fx: fx ? '1' : '0' }, title: name, onclick: () => setPrefs({ theme: id }) },
            h('div', { class: 'theme-prev' }, h('i', null, h('b'), h('b')), h('i', null, h('b'), h('b'), h('b')), h('i', null, h('b'))),
            h('div', { class: 'theme-name' }, h('b', null, name, fx && h('span', { class: 'fx-badge' }, 'animado')), h('span', null, sub))))))),
        h('div', { class: 'help theme-empty hidden' }, 'Nenhum tema encontrado.')),
    ],
    cores: [
      h('div', { class: 'row' },
        h('div', { class: 'field' }, h('label', null, 'Modo'), seg('mode', [['light', 'Claro'], ['dark', 'Escuro'], ['system', 'Sistema']])),
        h('div', { class: 'field' }, h('label', null, 'Densidade'), seg('density', [['compact', 'Compacta'], ['comfortable', 'Normal'], ['roomy', 'Ampla']]))),
      h('div', { class: 'field' }, h('label', null, 'Cor de destaque'),
        h('div', { class: 'swatches' }, h('button', { class: 'btn sm' + (p.accent ? '' : ' primary'), onclick: () => setPrefs({ accent: null }) }, 'Do tema'),
          swatchColors.map((c) => h('button', { class: 'swatch' + (p.accent === c ? ' on' : ''), style: { background: c }, title: c, 'aria-label': c, onclick: () => setPrefs({ accent: c }) })),
          h('input', { type: 'color', value: p.accent || '#6366f1', title: 'Cor personalizada', oninput: (e) => setPrefs({ accent: e.target.value }, { refreshSettings: false }) }))),
      h('div', { class: 'field' }, h('label', null, 'Fonte'), seg('font', [['auto', 'Do tema'], ['sans', 'Inter'], ['serif', 'Serif'], ['grotesk', 'Grotesk'], ['rounded', 'Redonda'], ['hand', 'Manual'], ['mono', 'Mono']])),
        h('div', { class: 'field' }, h('label', null, `Cantos arredondados${p.radius == null ? ' (do tema)' : ': ' + p.radius + 'px'}`),
          h('input', { type: 'range', min: 0, max: 28, value: p.radius ?? 12, oninput: (e) => { setPrefs({ radius: Number(e.target.value) }, { refreshSettings: false }); e.target.previousSibling.textContent = `Cantos arredondados: ${e.target.value}px`; } }),
          p.radius != null && h('button', { class: 'btn sm ghost', style: { alignSelf: 'flex-start' }, onclick: () => setPrefs({ radius: null }) }, 'Voltar ao do tema')),
    ],
    fundo: [
      h('div', { class: 'field' }, h('label', null, 'Fundo'),
        h('div', { class: 'bg-grid' }, BGS.map(([id, name, l, d]) => h('button', { type: 'button', class: 'bg-tile' + (p.bg === id ? ' on' : ''), title: name, onclick: () => setPrefs({ bg: id }),
          style: l ? { background: mode === 'dark' ? d : l } : null }, h('span', null, name))),
          h('button', { type: 'button', class: 'bg-tile' + (p.bg === 'custom' ? ' on' : ''), title: 'Imagem (link)', onclick: () => setPrefs({ bg: 'custom' }) }, h('span', null, 'Imagem')),
          [['lightfall', 'Lightfall (luz caindo)', 'linear-gradient(180deg,#05060f,#1d2a6b 60%,#ff5fd2)'], ['gridhole', 'Grid Hole (buraco na grade)', 'radial-gradient(circle at 50% 50%,#05060f 0 18%,#7c9cff 19% 22%,#0b1030 24%)'], ['ink', 'Ink Flow (tinta em fluxo)', 'conic-gradient(from 200deg,#05060f,#7c9cff,#ff5fd2,#05060f)'], ['parallax', 'Parallax vertical (cristas)', 'linear-gradient(180deg,#05060f 30%,#3a3f8f 55%,#7c9cff 56%,#1a1d4a 75%,#ff5fd2 76%)']].map(([id, name, bgc]) => h('button', { type: 'button', class: 'bg-tile' + (p.bg === id ? ' on' : ''), title: name, onclick: () => setPrefs({ bg: id }), style: { background: bgc } }, h('span', null, name.split(' (')[0]))),
          h('button', { type: 'button', class: 'bg-tile' + (p.bg === 'terrain' ? ' on' : ''), title: 'Terreno de arame (curvas de nível em 3D)', onclick: () => setPrefs({ bg: 'terrain' }), style: { background: `linear-gradient(180deg,${p.trBg} 55%,${p.trAccent} 56%,${p.trLine})` } }, h('span', null, 'Terreno')),
        h('button', { type: 'button', class: 'bg-tile' + (p.bg === 'shader' ? ' on' : ''), title: 'Gradiente shader (WebGL)', onclick: () => setPrefs({ bg: 'shader' }), style: { background: `linear-gradient(135deg,${p.shC1},${p.shC2},${p.shC3})` } }, h('span', null, 'Shader'))),
        p.bg === 'terrain' && terrainControls(p),
        ['lightfall', 'gridhole', 'ink', 'parallax'].includes(p.bg) && fxControls(p),
      p.bg === 'shader' && shaderControls(p),
        p.bg === 'custom' && h('input', { class: 'input', placeholder: 'https://…/imagem.jpg (link https)', value: p.bgUrl || '', onchange: (e) => setPrefs({ bgUrl: e.target.value.trim() }) })),
      h('div', { class: 'field' }, h('label', null, 'Efeitos de fundo'),
        toggle('fx', 'Fundo animado (estrelas, lava, grade…) — desligue para ficar estático'),
        h('div', { class: 'range-row' }, h('span', { class: 'help', style: { width: '90px' } }, 'Velocidade'), h('input', { type: 'range', min: 40, max: 250, step: 10, value: p.fxSpeed ?? 100, oninput: (e) => { setPrefs({ fxSpeed: Number(e.target.value) }, { refreshSettings: false }); e.target.nextSibling.textContent = (e.target.value / 100).toFixed(1).replace('.', ',') + '×'; } }), h('output', null, ((p.fxSpeed ?? 100) / 100).toFixed(1).replace('.', ',') + '×')),
        h('div', { class: 'range-row' }, h('span', { class: 'help', style: { width: '90px' } }, 'Intensidade'), h('input', { type: 'range', min: 0, max: 100, step: 5, value: p.fxIntensity ?? 100, oninput: (e) => { setPrefs({ fxIntensity: Number(e.target.value) }, { refreshSettings: false }); e.target.nextSibling.textContent = e.target.value + '%'; } }), h('output', null, (p.fxIntensity ?? 100) + '%'))),
    ],
    cartoes: [
      h('div', { class: 'field' }, h('label', null, 'Efeitos nos cartões'),
        seg('pulse', [['off', 'Sem borda pulsante'], ['high', 'Pulsar: alta e urgente'], ['urgent', 'Pulsar: só urgente']]),
        toggle('cardLight', 'Luz caindo no cartão ao passar o mouse')),
      h('div', { class: 'row' },
        h('div', { class: 'field' }, h('label', null, 'Cartões'), seg('cardStyle', [['theme', 'Do tema'], ['solid', 'Sólido'], ['glass', 'Vidro'], ['outline', 'Contorno'], ['fold', 'Dobrado']])),
        h('div', { class: 'field' }, h('label', null, 'Bordas'), seg('border', [['theme', 'Do tema'], ['none', 'Sem'], ['thin', 'Finas'], ['thick', 'Grossas']]))),
      h('div', { class: 'row' },
        h('div', { class: 'field' }, h('label', null, 'Sombras'), seg('shadow', [['theme', 'Do tema'], ['none', 'Sem'], ['soft', 'Suaves'], ['hard', 'Duras']])),
        h('div', { class: 'field' }, h('label', null, 'Tamanho do texto'), seg('size', [['small', 'Pequeno'], ['normal', 'Normal'], ['large', 'Grande']]))),
    ],
    comportamento: [
      h('div', { class: 'field' }, h('label', null, 'Comportamento'),
        toggle('motion', 'Animações da interface (transições, entradas)'), toggle('autoAssign', 'Novas tasks já ficam comigo'), toggle('hideOldDone', 'Esconder concluídas com mais de 14 dias'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!p.notify, onchange: async (e) => {
          if (e.target.checked && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
            const r = await Notification.requestPermission();
            if (r !== 'granted') { e.target.checked = false; return toast('Permissão de notificação negada no navegador', true); }
          }
          setPrefs({ notify: e.target.checked });
        } }), 'Avisar no sistema quando alguém me atribuir uma task (com o app em segundo plano)'))
    ],
  };
  const tabs = [['tema', 'Tema'], ['cores', 'Cores'], ['fundo', 'Fundo'], ['cartoes', 'Cartões'], ['comportamento', 'Geral']];
  const cur = G[S.lookTab] ? S.lookTab : 'tema';
  if (cur === 'tema' && (themeFilterState.q || themeFilterState.fx !== 'all')) filterThemes(G.tema[0], {});
  return h('div', { class: 'modal-body' },
    h('div', { class: 'seg look-tabs', role: 'tablist' }, tabs.map(([k, l]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(k === cur), class: k === cur ? 'on' : '', onclick: () => { if (k === cur) return; S.tabDir = tabs.findIndex((x) => x[0] === k) > tabs.findIndex((x) => x[0] === cur) ? 1 : -1; S.lookTab = k; S.refreshSettings && S.refreshSettings(); slideIn([...document.querySelectorAll('.drawer-panel .modal-body > :not(.look-tabs):not(.set-foot)')]); } }, l))),
    ...G[cur],
    h('div', { class: 'set-foot' }, h('span', { class: 'help save-note' }, icon('check'), 'Salvo automaticamente na sua conta'), h('button', { class: 'btn sm', onclick: resetPrefs }, 'Restaurar padrões')));
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
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S.me) { e.preventDefault(); window.KBApp.openPalette && window.KBApp.openPalette(); return; }
  if (e.key === 'Escape') {
    if (openPop) return closePopover();
    const top = modalStack[modalStack.length - 1];
    if (top) { document.activeElement && document.activeElement.blur(); top.close(); }
    return;
  }
  if (!S.me || modalStack.length || e.ctrlKey || e.metaKey || e.altKey) return;
  // setas navegam entre cartões (Enter abre, como já era)
  const cur = document.activeElement;
  if (cur && cur.classList && cur.classList.contains('card') && /^Arrow(Up|Down|Left|Right)$/.test(e.key)) {
    const col = cur.closest('.column'); if (!col) return;
    const cards = [...col.querySelectorAll('.col-body > .card')], i = cards.indexOf(cur); let next = null;
    if (e.key === 'ArrowDown') next = cards[i + 1]; else if (e.key === 'ArrowUp') next = cards[i - 1];
    else { let c = col; do { c = e.key === 'ArrowRight' ? c.nextElementSibling : c.previousElementSibling; } while (c && !(c.classList.contains('column') && c.querySelector('.col-body > .card')));
      if (c) { const cs = c.querySelectorAll('.col-body > .card'); next = cs[Math.min(i, cs.length - 1)]; } }
    if (next) { e.preventDefault(); next.focus(); next.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    return;
  }
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  if (e.key === 'n' || e.key === 'c') { e.preventDefault(); openQuickAdd(); }
  else if (e.key === '/') { e.preventDefault(); $('#search') && $('#search').focus(); }
  else if (e.key === '?') { e.preventDefault(); openShortcuts(); }
});
function openShortcuts() {
  const rows = [['N ou C', 'Nova task'], ['/', 'Buscar'], ['← ↑ ↓ →', 'Navegar entre os cartões (com um cartão em foco)'], ['Ctrl+K', 'Paleta de comandos'], ['?', 'Esta lista'], ['Esc', 'Fechar janela ou menu'], ['Enter', 'Abrir a task em foco / criar (nos campos)'], ['Ctrl+Enter', 'Criar e continuar · enviar comentário'], ['Ctrl+V', 'Colar print como anexo (dentro da task)']];
  const close = openModal([modalHead('Atalhos do teclado', () => close()), h('div', { class: 'modal-body' }, h('div', { class: 'kbd-list' }, rows.map(([k, d]) => h('div', { class: 'kbd-row' }, h('span', { class: 'kbd' }, k), h('span', null, d)))))]);
}

/* ================= inicialização ================= */
async function boot(user) {
  if (!user.approved) return renderPending(user);
  S.me = user;
  S.prefs = { ...DEFAULT_PREFS, ...loadLocalPrefs(), ...(user.prefs || {}) };
  applyPrefs();
  try { localStorage.setItem('kb-prefs', JSON.stringify(S.prefs)); } catch { /* ok */ }
  renderShell();
  renderSkeleton();
  try { await loadBoard(); }
  catch (e) {
    $('#board').replaceChildren(h('div', { class: 'state-error' }, icon('x'), h('b', null, 'Não foi possível carregar o quadro'), h('p', null, e.message),
      h('button', { class: 'btn primary', onclick: () => boot(user) }, 'Tentar de novo')));
    return;
  }
  connectStream();
}
window.KBApp = {
  S, h, $, icon, api, toast, guard, openModal, modalHead, popover, askText, confirmBox, setPrefs, resolvedMode, THEMES,
  eventText, openTask, openQuickAdd, openDiary, openShortcuts, openTrash, openSettings, renderBoard, loadBoard, moveTask, deleteTask, upsertTask, userById, colById, avatar,
  matches, filtersActive, clearFilters, dueState, fmtDay, fmtTime, fmtDur, totalSecs, ymd, pad, addDays, norm, hueOf, cap, PRIO_NAME, views: {},
};
(async function init() {
  // espera os scripts de recursos (vistas, paleta, toque) registrarem-se antes de iniciar
  if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r));
  S.prefs = { ...DEFAULT_PREFS, ...loadLocalPrefs() };
  applyPrefs();
  if (!KB.configured) return renderNotConfigured();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  KB.onRecovery(askNewPassword);
  try { await start(); }
  catch (e) { $('#app').append(h('div', { class: 'auth' }, h('div', { class: 'auth-card' }, h('h1', null, 'Sem conexão'), h('p', null, e.message)))); }
})();
})();
