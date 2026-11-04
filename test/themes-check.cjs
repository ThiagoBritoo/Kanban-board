// Folha de contato + contraste de todos os temas (usa a API Supabase falsa). Uso: SUPABASE_UMD=<supabase.js> node test/themes-check.cjs <pasta-de-saida>
const { chromium } = require('playwright'); const fs = require('fs'), http = require('http'), path = require('path');
const ROOT = path.join(__dirname, '..', 'public'), UMD = fs.readFileSync(process.env.SUPABASE_UMD, 'utf8'), fake = require('./fake-supabase.cjs')();
const OUT = process.argv[2];
const mk = (id, title, col, o = {}) => ({ id, title, description: o.d || '', diary: '', column_id: col, position: o.pos || 0, assignee_id: o.who || fake.uid, creator_id: fake.uid, priority: o.p ?? 1, due_date: o.due || null, labels: o.l || [], checklist: o.cl || [], deleted_at: null, time_spent: o.t || 0, timer_started_at: null, timer_user: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), completed_at: col === 4 ? new Date().toISOString() : null });
const today = new Date().toISOString().slice(0, 10);
fake.db.tasks.push(mk(1, 'Ajustes na função do espelho de ponto', 2, { p: 2, due: today, l: ['ponto'], cl: [{ text: 'a', done: true }, { text: 'b', done: false }], t: 4100 }), mk(2, 'Cadastro de postos de combustível', 1, { who: fake.uid2, l: ['mobile'], pos: 0 }), mk(3, 'Início do módulo financeiro', 1, { l: ['financeiro'], pos: 1, p: 3, due: '2026-10-01' }), mk(4, 'Correção do fluxo de assinatura por e-mail', 3, { l: ['ponto'] }), mk(5, 'Revisar relatório mensal', 4, { l: ['relatório'] }));
const srv = http.createServer((q, r) => { let u = new URL(q.url, 'http://x').pathname; if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); });
const lum = (rgb) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(rgb[0]) + .7152 * f(rgb[1]) + .0722 * f(rgb[2]); };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
(async () => {
  await new Promise((r) => srv.listen(3225, r)); const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1100, height: 640 } })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: UMD })); await p.route('https://fonts.g*/**', (r) => r.abort()); await p.route('**/*.supabase.co/**', fake.handle);
  await p.goto('http://localhost:3225/'); await p.fill('input[type=email]', 't@x.com'); await p.fill('input[type=password]', 'senha123'); await p.click('button[type=submit]'); await p.waitForSelector('.card');
  const themes = await p.evaluate(() => window.KBApp.THEMES.map((t) => t[0]));
  console.log('temas:', themes.length);
  const shots = { light: [], dark: [] }, report = [];
  for (const mode of ['light', 'dark']) for (const t of themes) {
    await p.evaluate(([t, m]) => { const r = document.documentElement; r.dataset.theme = t; r.dataset.mode = m; }, [t, mode]); await p.waitForTimeout(260);
    // contraste: texto/pop, muted/pop, accent-fg/accent
    const c = await p.evaluate(() => { const probe = (v) => { const e = document.createElement('i'); e.style.color = `var(${v})`; document.body.append(e); const col = getComputedStyle(e).color; e.remove(); return col.match(/[\d.]+/g).slice(0, 3).map(Number); }; return { text: probe('--text'), muted: probe('--muted'), pop: probe('--pop'), acc: probe('--accent'), fg: probe('--accent-fg') }; });
    report.push([t, mode, cr(c.text, c.pop).toFixed(1), cr(c.muted, c.pop).toFixed(1), cr(c.fg, c.acc).toFixed(1)]);
    shots[mode].push([t, (await p.screenshot()).toString('base64')]);
  }
  console.log('tema/modo | texto | muted | botão-acento (mín.: 4.5 / 3.0 / 4.5)');
  report.filter((r) => +r[2] < 7 || +r[3] < 3.5 || +r[4] < 4.5).forEach((r) => console.log('  ATENÇÃO', r.join(' | ')));
  console.log('  (demais passam)');
  for (const mode of ['light', 'dark']) {
    const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(4,540px);gap:6px;padding:6px;font:600 13px system-ui;color:#fff">${shots[mode].map(([t, d]) => `<div><div style="padding:2px 4px">${t}</div><img width=540 src="data:image/png;base64,${d}"></div>`).join('')}</body>`;
    const sp = await b.newPage({ viewport: { width: 2200, height: 1800 } }); await sp.setContent(html); await sp.screenshot({ path: `${OUT}/sheet-${mode}.png`, fullPage: true }); await sp.close();
  }
  console.log('erros JS:', errs.length ? errs : 'nenhum'); await b.close(); srv.close();
})();
