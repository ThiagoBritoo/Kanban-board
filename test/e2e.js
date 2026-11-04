// Teste de interface: abre o site num Chromium com o supabase-js real, mas falando com uma API Supabase FALSA
// (test/fake-supabase.js). Valida a interface e as consultas do backend.js; não substitui testar no banco real.
//   npm i --no-save playwright @supabase/supabase-js@2.45.4 && npx playwright install chromium && node test/e2e.js
const { chromium } = require('playwright');
const fs = require('fs'), http = require('http'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..', 'public'), OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-shots-')) + '/';
const UMD = fs.readFileSync(require.resolve('@supabase/supabase-js/dist/umd/supabase.js'), 'utf8');
const fake = require('./fake-supabase.js')();
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r === '/') r = '/index.html'; const f = path.join(ROOT, r);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(res); });
let fails = 0;
const mclick = async (p, loc) => { const bb = await loc.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.up(); };
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  await new Promise((r) => srv.listen(3222, r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1360, height: 860 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push('PAGEERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load|WebSocket/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
  await p.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: UMD }));
  await p.route('https://fonts.g*/**', (r) => r.abort());
  await p.route('**/*.supabase.co/**', fake.handle);
  await p.goto('http://localhost:3222/');
  await p.waitForSelector('.auth-card');
  await p.fill('input[type=email]', 't@x.com'); await p.fill('input[type=password]', 'errada'); await p.click('button[type=submit]');
  await p.waitForSelector('.err-msg:not(:empty)'); ok((await p.textContent('.err-msg')).includes('incorretos'), 'login com senha errada mostra erro em português');
  await p.fill('input[type=password]', 'senha123'); await p.click('button[type=submit]');
  await p.waitForSelector('.board .column'); ok((await p.locator('.column').count()) === 4, 'login ok e 4 colunas');
  await p.waitForTimeout(300);

  // criar tasks
  await p.keyboard.press('n');
  await p.fill('.big-input', 'Ajustes na função do espelho de ponto #ponto !alta ^hoje'); await p.keyboard.press('Control+Enter'); await p.waitForTimeout(400);
  await p.fill('.big-input', 'Cadastro de postos de combustível #mobile @maria'); await p.keyboard.press('Enter'); await p.waitForSelector('.overlay', { state: 'detached' });
  await p.fill('.column:nth-child(1) .add-input', 'Início do módulo financeiro #financeiro'); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(500);
  ok((await p.locator('.card').count()) === 3, '3 tasks criadas (modal rápido + inline)');
  ok(await p.locator('.chip.today').count() === 1, 'chip "Vencem hoje" aparece');

  // menu do card: mover + desfazer
  const first = p.locator('.column:nth-child(1) .card').first();
  await mclick(p, first.locator('.card-menu'));
  await p.click('.popover button:has-text("Mover para Em andamento")'); await p.waitForTimeout(500);
  ok((await p.locator('.column:nth-child(2) .card').count()) === 1, 'menu do card move para Em andamento');
  ok(await p.locator('.toast:has-text("Movida")').count() === 1, 'toast "Movida" com desfazer');
  await p.click('.toast-act'); await p.waitForTimeout(600);
  ok((await p.locator('.column:nth-child(2) .card').count()) === 0 && (await p.locator('.column:nth-child(1) .card').count()) === 3, 'desfazer devolve a task à coluna original');
  // mover de novo (fica em andamento e vira minha)
  await mclick(p, p.locator('.column:nth-child(1) .card').first().locator('.card-menu'));
  await p.click('.popover button:has-text("Mover para Em andamento")'); await p.waitForTimeout(500);

  // checklist + comentário
  await p.locator('.column:nth-child(2) .card').first().click(); await p.waitForSelector('.modal');
  await p.fill('.cl-add', 'Revisar função'); await p.press('.cl-add', 'Enter'); await p.waitForTimeout(250);
  await p.fill('.cl-add', 'Testar assinatura'); await p.press('.cl-add', 'Enter'); await p.waitForTimeout(250);
  await p.locator('.cl-item input[type=checkbox]').first().check(); await p.waitForTimeout(400);
  ok((await p.locator('.cl-item').count()) === 2, 'checklist com 2 itens');
  await p.fill('.modal .textarea[placeholder^="Escrever"]', 'Falei com o cliente\nvolta na sexta'); await p.keyboard.press('Control+Enter'); await p.waitForTimeout(500);
  ok(await p.locator('.cm-text:has-text("Falei com o cliente")').count() === 1, 'comentário aparece na linha do tempo');
  await p.screenshot({ path: OUT + 'v2-task.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok((await p.locator('.column:nth-child(2) .card .due:has-text("1/2")').count()) === 1, 'card mostra progresso do checklist 1/2');

  // excluir + desfazer
  const c3 = p.locator('.column:nth-child(1) .card').last(); await mclick(p, c3.locator('.card-menu'));
  await p.click('.popover button:has-text("Excluir")'); await p.waitForTimeout(400);
  ok((await p.locator('.card').count()) === 2, 'excluir tira da tela (lixeira)');
  await p.click('.toast:has-text("excluída") .toast-act'); await p.waitForTimeout(600);
  ok((await p.locator('.card').count()) === 3, 'desfazer restaura a task excluída');

  // filtros
  await p.locator('.card .tag-btn').first().click(); await p.waitForTimeout(200);
  ok((await p.locator('.card').count()) === 1, 'clicar na etiqueta filtra o quadro');
  await p.click('button:has-text("Limpar")'); await p.waitForTimeout(200);
  ok((await p.locator('.card').count()) === 3, 'limpar filtros');

  // cor da coluna
  await mclick(p, p.locator('.column:nth-child(1) .col-head .btn')); await p.click('.popover button:has-text("Cor da coluna")');
  await p.click('.popover button:has-text("Azul")'); await p.waitForTimeout(500);
  ok(await p.locator('.column.has-color').count() === 1, 'coluna recebe cor');

  // diário
  await p.click('text=Gerar diário'); await p.waitForSelector('.diary-text'); await p.waitForTimeout(600);
  const dayTxt = await p.inputValue('.diary-text'); ok(dayTxt.split('\n').every((l) => l.startsWith('- ')) && dayTxt.includes('Ajustes na função do espelho de ponto.'), 'diário do dia em bullets');
  await p.click('.seg button:has-text("Semana")'); await p.waitForTimeout(700);
  const wk = await p.inputValue('.diary-text'); ok(/^[A-ZÀ-Ú][a-zçé-]+(-feira)? \(\d\d\/\d\d\)\n- /.test(wk), 'diário da semana com título do dia');
  console.log('--- DIÁRIO SEMANA ---\n' + wk);
  await p.screenshot({ path: OUT + 'v2-diary.png' });
  await p.keyboard.press('Escape');

  // temas novos
  for (const t of ['terminal', 'gelo']) for (const m of ['light', 'dark']) {
    await p.evaluate(([t, m]) => { document.documentElement.dataset.theme = t; document.documentElement.dataset.mode = m; }, [t, m]);
    await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}v2-${t}-${m}.png` });
  }
  // sessão revogada: perfil some da lista de aprovados -> volta para a tela de aguardando
  fake.db.profiles[0].approved = false; await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  console.log('capturas em', OUT);
  console.log('chamadas REST distintas:', [...new Set(fake.db.calls.map((c) => c.split('?')[0]))].length);
  console.log('erros JS:', errors.length ? errors : 'nenhum'); if (errors.length) fails++;
  await b.close(); srv.close();
  console.log(fails ? `\n${fails} FALHA(S)` : '\nTODOS OS TESTES PASSARAM'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FALHOU', e); process.exit(1); });
