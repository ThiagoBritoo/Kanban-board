// Melhorias do projeto Geral (07/11): olho da senha, Personalizar não abre duas vezes, Ctrl+Enter, abrir card ao criar, selo de prioridade.
// Mesmo esquema do e2e.cjs (API Supabase falsa).
const { chromium } = require('playwright');
const fs = require('fs'), http = require('http'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..', 'public'), OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-shots-')) + '/';
const UMD = fs.readFileSync(process.env.SUPABASE_UMD || require.resolve('@supabase/supabase-js/dist/umd/supabase.js'), 'utf8');
const fake = require('./fake-supabase.cjs')();
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const VH = {}; JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8')).headers[0].headers.forEach((x) => (VH[x.key] = x.value));
const srv = http.createServer((req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r === '/') r = '/index.html'; const f = path.join(ROOT, r);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { ...VH, 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(res); });
let fails = 0;
const mclick = async (p, loc) => { const bb = await loc.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.up(); };
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  await new Promise((r) => srv.listen(3223, r));
  const b = await chromium.launch();
  const errors = [];
  const open = async (viewport) => {
    const ctx = await b.newContext({ viewport }); const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push('PAGEERR ' + e.message));
    await p.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: UMD }));
    await p.route('https://fonts.g*/**', (r) => r.abort());
    await p.route('**/*.supabase.co/**', fake.handle);
    await p.goto('http://localhost:3223/'); await p.waitForSelector('.auth-card');
    return p;
  };
  const p = await open({ width: 1360, height: 860 });
  // #50 olho da senha
  await p.fill('input[type=password]', 'senha123');
  await p.click('.pw-eye'); ok(await p.locator('.pw-wrap input').getAttribute('type') === 'text', 'olho mostra a senha');
  ok(await p.locator('.pw-eye').getAttribute('aria-pressed') === 'true', 'olho anuncia estado (aria-pressed)');
  await p.click('.pw-eye'); ok(await p.locator('.pw-wrap input').getAttribute('type') === 'password', 'olho oculta de novo');
  await p.screenshot({ path: OUT + 'login-olho.png' });
  await p.fill('input[type=email]', 't@x.com'); await p.click('button[type=submit]');
  await p.waitForSelector('.board .column'); await p.waitForTimeout(300);
  // #18 Personalizar: clicar de novo fecha, não empilha
  const pal = p.locator('button[title="Personalizar"]');
  await pal.click(); await p.waitForSelector('.drawer-panel'); await pal.click(); await p.waitForTimeout(300);
  ok(await p.locator('.drawer-panel').count() === 0, 'segundo clique no ícone fecha o Personalizar');
  for (let i = 0; i < 4; i++) { await pal.click(); await p.waitForTimeout(60); }
  await p.waitForTimeout(300); ok(await p.locator('.drawer-panel').count() === 0, '4 cliques = abre/fecha, nunca 2 painéis');
  await pal.click(); await p.waitForTimeout(250); ok(await p.locator('.drawer-panel').count() === 1, 'abre de novo com 1 painel');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // #38 Ctrl+Enter abre nova task na coluna "A fazer"
  await p.keyboard.press('Control+Enter'); await p.waitForSelector('.big-input');
  const sel = await p.$eval('.modal select', (s) => s.options[s.selectedIndex].text);
  ok(/a fazer/i.test(sel), 'Ctrl+Enter abre "Nova task" com A fazer selecionado (' + sel + ')');
  // #36 Enter cria e abre o card inteiro; prioridade vira selo
  await p.fill('.big-input', 'Teste selo !urgente'); await p.keyboard.press('Enter');
  await p.waitForSelector('.task-side', { timeout: 5000 }).catch(() => {}); ok(await p.locator('.task-side').count() === 1, 'criar abre o card inteiro (computador)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const card = p.locator('.card', { hasText: 'Teste selo' });
  ok(await card.locator('.prio-badge').count() === 1, 'card urgente mostra selo "Urgente"');
  const before = await card.evaluate((c) => getComputedStyle(c, '::before').content);
  ok(before === 'none' || before === 'normal', 'sem faixa lateral (::before vazio)');
  await p.screenshot({ path: OUT + 'quadro-selo.png' });
  // #52 um destaque só: escolher "Borda pulsante" tira o selo; urgente pulsa diferente de alta
  await p.evaluate(() => KBApp.setPrefs({ prioMark: 'pulse', prioWho: 'high' })); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.documentElement.dataset.pulse) === 'high' && await card.locator('.prio-badge').isHidden(), 'Borda pulsante liga o pulso e esconde o selo (um indicador só)');
  ok(await p.evaluate(() => document.documentElement.dataset.beam) === 'off', 'feixe fica desligado quando o destaque é o pulso');
  const dur = await card.evaluate((c) => getComputedStyle(c).animationDuration);
  ok(dur === '1.5s', 'urgente pulsa mais rápido que alta (' + dur + ')');
  await p.evaluate(() => KBApp.setPrefs({ prioMark: 'chip', prioWho: 'urgent' })); await p.waitForTimeout(200);
  ok(await card.locator('.prio-badge').isVisible(), '"Só urgente" mantém o selo do urgente');
  await p.evaluate(() => KBApp.setPrefs({ prioMark: 'chip', prioWho: 'high' }));
  // #51 linha de soltura não pisca: arrastar parado sobre o mesmo lugar não reinsere a linha
  await p.fill('.column:nth-child(1) .add-input', 'Segunda'); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(400);
  await p.evaluate(() => { window.__ins = 0; new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains('drop-line')) window.__ins++; }))).observe(document.body, { childList: true, subtree: true }); });
  const src = p.locator('.column:nth-child(1) .card').first(), bb = await src.boundingBox();
  const dt = await p.evaluateHandle(() => new DataTransfer());
  await src.dispatchEvent('dragstart', { dataTransfer: dt });
  const body1 = p.locator('.column:nth-child(1) .col-body');
  for (let i = 0; i < 25; i++) { await body1.dispatchEvent('dragover', { dataTransfer: dt, clientX: bb.x + 20, clientY: bb.y + 4 }); await p.waitForTimeout(20); }
  const ins = await p.evaluate(() => window.__ins);
  ok(ins <= 1, `25 dragover no mesmo lugar = linha inserida ${ins}x (antes: 25x)`);
  await body1.dispatchEvent('drop', { dataTransfer: dt, clientX: bb.x + 20, clientY: bb.y + 4 }); await src.dispatchEvent('dragend', { dataTransfer: dt }).catch(() => {}); await p.waitForTimeout(500);
  ok(await p.locator('.drop-line').count() === 0 && await p.locator('.card.dragging').count() === 0, 'soltar no mesmo lugar não deixa linha nem cartão "arrastando"');
  // celular: criar não abre o card
  const m = await open({ width: 390, height: 800 });
  await m.fill('input[type=email]', 't@x.com'); await m.fill('input[type=password]', 'senha123'); await m.click('button[type=submit]');
  await m.waitForSelector('.board .column'); await m.waitForTimeout(300);
  await m.waitForTimeout(400);
  await m.evaluate(() => KBApp.openQuickAdd()); await m.waitForSelector('.big-input', { timeout: 5000 });
  await m.fill('.big-input', 'Do celular'); await m.keyboard.press('Enter'); await m.waitForTimeout(600);
  ok(await m.locator('.task-side').count() === 0 && await m.locator('.overlay').count() === 0, 'no celular só cria (não abre o card)');
  await m.screenshot({ path: OUT + 'celular.png' });
  console.log('capturas em', OUT);
  console.log('erros JS:', errors.length ? errors : 'nenhum'); if (errors.length) fails++;
  await b.close(); srv.close();
  console.log(fails ? `\n${fails} FALHA(S)` : '\nTODOS OS TESTES PASSARAM'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FALHOU', e); process.exit(1); });
