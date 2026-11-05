// Teste de interface: abre o site num Chromium com o supabase-js real, mas falando com uma API Supabase FALSA
// (test/fake-supabase.cjs). Valida a interface e as consultas do backend.js; não substitui testar no banco real.
//   npm i --no-save playwright @supabase/supabase-js@2.45.4 && npx playwright install chromium && node test/e2e.cjs
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
  await new Promise((r) => srv.listen(3222, r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1360, height: 860 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push('PAGEERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_|Failed to load|WebSocket/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
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
  await p.click('button:visible:has-text("Limpar")'); await p.waitForTimeout(200);
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


  /* ========== v3: vistas, paleta, resumo, exportar, cronômetro, anexos, limite, ordenar, fundo ========== */
  const dayStr = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const moreItem = async (label) => { await p.click('button[title^="Mais"]'); await p.click(`.popover button:has-text("${label}")`); };

  // lista
  await p.click('#viewSeg button[data-view="list"]'); await p.waitForSelector('.list-table');
  ok((await p.locator('.list-row').count()) === 3, 'vista Lista mostra as 3 tasks');
  await p.screenshot({ path: OUT + 'v3-lista.png' });
  await p.click('.th-btn:has-text("Task")'); await p.waitForTimeout(150);
  ok((await p.locator('.list-row .lt-title').first().textContent()).startsWith('Ajustes'), 'lista ordena por título (A–Z)');
  await p.click('.th-btn:has-text("Task")'); await p.waitForTimeout(150);
  ok((await p.locator('.list-row .lt-title').first().textContent()).startsWith('Início'), 'lista inverte a ordem (Z–A)');
  await p.locator('.list-row').first().click(); await p.waitForSelector('.modal'); await p.keyboard.press('Escape');

  // calendário + arrastar para mudar o prazo
  await p.click('#viewSeg button[data-view="calendar"]'); await p.waitForSelector('.cal-grid');
  ok((await p.locator('.cal-day.today .cal-chip').count()) === 1, 'calendário mostra a task que vence hoje');
  await p.screenshot({ path: OUT + 'v3-calendario.png' });
  const tomorrow = dayStr(1);
  await p.locator('.cal-day.today .cal-chip').dragTo(p.locator(`.cal-day[data-date="${tomorrow}"]`)); await p.waitForTimeout(500);
  ok(fake.db.tasks.find((t) => t.title.startsWith('Ajustes')).due_date === tomorrow, 'arrastar no calendário muda o prazo');
  fake.db.tasks.find((t) => t.title.startsWith('Ajustes')).due_date = dayStr(0); // volta (para os próximos testes)
  await p.click('#viewSeg button[data-view="board"]'); await p.waitForSelector('.column'); await p.waitForTimeout(300);

  // paleta de comandos
  await p.keyboard.press('Control+k'); await p.waitForSelector('.palette input');
  await p.fill('.palette input', 'tema terminal'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.dataset.theme) === 'terminal', 'paleta troca o tema');
  await p.keyboard.press('Control+k'); await p.fill('.palette input', 'cadastro'); await p.waitForTimeout(150); await p.keyboard.press('Enter'); await p.waitForSelector('.modal .title-input');
  ok((await p.inputValue('.modal .title-input')).startsWith('Cadastro'), 'paleta encontra e abre uma task');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.evaluate(() => { document.documentElement.dataset.theme = 'minimal'; });

  // resumo e atividade
  await moreItem('Resumo da equipe'); await p.waitForSelector('.kpis');
  ok((await p.locator('.kpi').count()) === 6 && (await p.locator('svg.chart rect').count()) > 0, 'resumo com 6 indicadores e gráfico');
  await p.screenshot({ path: OUT + 'v3-resumo.png' }); await p.keyboard.press('Escape');
  await moreItem('Atividade recente'); await p.waitForSelector('.act-row');
  ok((await p.locator('.act-row').count()) > 3, 'atividade recente lista eventos');
  await p.keyboard.press('Escape');

  // exportar CSV
  const [dl] = await Promise.all([p.waitForEvent('download'), moreItem('Exportar tasks')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  ok(csv.includes('Título;Descrição;Status') && csv.includes('Cadastro de postos'), 'exportar CSV baixa as tasks');

  // cronômetro
  await p.locator('.column:nth-child(2) .card').first().click(); await p.waitForSelector('.timebox');
  await p.click('.timebox button:has-text("Iniciar")'); await p.waitForTimeout(700);
  ok(!!fake.db.tasks.find((t) => t.title.startsWith('Ajustes')).timer_started_at, 'cronômetro inicia');
  ok((await p.locator('.timebox button:has-text("Parar")').count()) === 1, 'botão vira "Parar"');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok((await p.locator('.card .timer-live.running').count()) === 1, 'card mostra cronômetro rodando');
  await p.locator('.column:nth-child(2) .card').first().click(); await p.waitForSelector('.timebox');
  await p.click('.timebox button:has-text("Parar")'); await p.waitForTimeout(500);
  ok(fake.db.tasks.find((t) => t.title.startsWith('Ajustes')).timer_started_at == null, 'cronômetro para');

  // anexos (upload + miniatura + contagem no card)
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  await p.setInputFiles('.modal input[type=file]', { name: 'print.png', mimeType: 'image/png', buffer: png }); await p.waitForTimeout(900);
  ok((await p.locator('.att-name:has-text("print.png")').count()) === 1, 'anexo enviado aparece na lista');
  ok(fake.db.attachments.length === 1 && Object.keys(fake.db.files).length === 1, 'arquivo foi para o storage e o registro para o banco');
  await p.waitForSelector('.att-thumb img'); ok(true, 'miniatura da imagem carregou');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok((await p.locator('.column:nth-child(2) .card .due[title="Anexos"]').count()) === 1, 'card mostra contagem de anexos');

  // limite de tasks (WIP) + ordenar coluna
  await mclick(p, p.locator('.column:nth-child(1) .col-head .btn'));
  await p.click('.popover button:has-text("Definir limite")'); await p.fill('.modal input', '1'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  ok((await p.locator('.column:nth-child(1) .col-count.over').textContent()) === '2/1', 'limite da coluna excedido aparece em vermelho (2/1)');
  await mclick(p, p.locator('.column:nth-child(1) .col-head .btn'));
  await p.click('.popover button:has-text("Ordenar por")'); await p.click('.popover button:has-text("Mais recentes")'); await p.waitForTimeout(600);
  ok((await p.locator('.column:nth-child(1) .card .card-title').first().textContent()).startsWith('Início'), 'ordenar coluna por mais recentes');

  // fundo personalizado
  await p.click('button[title="Personalizar"]'); await p.waitForSelector('.look-tabs'); await p.click('.look-tabs button:has-text("Fundo")'); await p.waitForSelector('.bg-grid');
  await p.click('.bg-tile[title="Aurora"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.documentElement.dataset.bg === 'user' && getComputedStyle(document.documentElement).getPropertyValue('--bg-user').includes('gradient')), 'fundo Aurora aplicado');
  await p.screenshot({ path: OUT + 'v3-fundo.png' });
  await p.click('.bg-tile[title="Do tema"]'); await p.keyboard.press('Escape');

  // painel bento + ilha do cronômetro + cartão dobrado + fundo shader
  await p.click('#viewSeg button[data-view="painel"]'); await p.waitForSelector('.bento'); await p.waitForTimeout(500);
  ok((await p.locator('.bento .bt').count()) === 7, 'painel bento com 7 blocos');
  ok((await p.locator('.bt.hero .bt-stat').count()) === 4, 'painel mostra os 4 indicadores');
  await p.click('#viewSeg button[data-view="board"]'); await p.waitForSelector('.column');
  await p.locator('.column:nth-child(2) .card').first().click(); await p.waitForSelector('.timebox'); await p.click('.timebox button:has-text("Iniciar")'); await p.waitForTimeout(600);
  await p.keyboard.press('Escape'); await p.waitForTimeout(350);
  ok((await p.locator('.island').count()) === 1, 'ilha do cronômetro aparece ao iniciar');
  await p.click('.island-stop'); await p.waitForTimeout(600);
  ok((await p.locator('.island').count()) === 0, 'ilha some ao parar o cronômetro');
  await p.evaluate(() => window.KBApp.setPrefs({ cardStyle: 'fold' }, { refreshSettings: false }));
  ok(await p.evaluate(() => document.documentElement.dataset.card === 'fold'), 'estilo de cartão dobrado aplicado');
  await p.evaluate(() => window.KBApp.setPrefs({ cardStyle: 'theme' }, { refreshSettings: false }));
  await p.evaluate(() => window.KBApp.setPrefs({ bg: 'shader' }, { refreshSettings: false })); await p.waitForTimeout(400);
  ok(await p.evaluate(() => ['on', 'fallback'].includes(document.documentElement.dataset.shader) && (document.documentElement.dataset.shader === 'fallback' || !!document.getElementById('shaderbg'))), 'fundo shader ativado (WebGL ou fallback)');
  await p.evaluate(() => window.KBApp.setPrefs({ bg: 'theme' }, { refreshSettings: false })); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.documentElement.dataset.shader === 'off'), 'fundo shader desligado volta ao tema');

  // estrutura nova: barra lateral, modal em duas colunas, configurações agrupadas, sem conexão
  await p.click('.sb-item:has-text("Minhas")'); await p.waitForTimeout(250);
  ok((await p.locator('.card').count()) === 2, 'barra lateral: "Minhas" filtra as tasks do usuário');
  await p.click('.sb-item:has-text("Todas")'); await p.waitForTimeout(250);
  ok((await p.locator('.card').count()) === 3, 'barra lateral: "Todas" limpa o filtro');
  ok(await p.locator('.sb-item .sb-count').first().isVisible(), 'barra lateral mostra contadores');
  await p.locator('.column:nth-child(2) .card').first().click(); await p.waitForSelector('.task-grid');
  ok((await p.locator('.task-main').count()) === 1 && (await p.locator('.task-side .field').count()) === 7, 'modal da task em duas colunas (7 propriedades à direita)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  await p.evaluate(() => window.KBApp.setPrefs({ theme: 'brasa' }, { refreshSettings: false }));
  await p.click('button[title="Personalizar"]'); await p.waitForSelector('.look-tabs');
  ok((await p.locator('.look-tabs button').count()) === 5, 'Personalizar agrupado em 5 abas');
  ok(await p.locator('.drawer-panel').count() === 1 && (await p.locator('.column').first().isVisible()), 'Personalizar é um painel lateral e o quadro continua visível');
  await p.click('button:has-text("Restaurar padrões")'); await p.click('.modal:has-text("Restaurar toda a aparência") button:has-text("Restaurar")'); await p.waitForTimeout(350);
  ok(await p.evaluate(() => document.documentElement.dataset.theme === 'minimal'), 'restaurar padrões volta ao tema padrão');
  await p.click('.toast:has-text("restaurada") .toast-act'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.dataset.theme === 'brasa'), 'desfazer devolve a aparência anterior');
  await p.evaluate(() => window.KBApp.setPrefs({ theme: 'minimal' }, { refreshSettings: false })); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  await p.evaluate(() => window.dispatchEvent(new Event('offline'))); await p.waitForTimeout(150);
  ok((await p.locator('#netbar').count()) === 1, 'faixa de "sem conexão" aparece');
  await p.evaluate(() => window.dispatchEvent(new Event('online'))); await p.waitForTimeout(400);
  ok((await p.locator('#netbar').count()) === 0, 'faixa de "sem conexão" some ao voltar');

  // arrastar com o dedo (tablet/celular)
  const tctx = await b.newContext({ viewport: { width: 1100, height: 800 }, hasTouch: true, isMobile: false });
  const tp = await tctx.newPage();
  await tp.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: UMD }));
  await tp.route('https://fonts.g*/**', (r) => r.abort()); await tp.route('**/*.supabase.co/**', fake.handle);
  await tp.goto('http://localhost:3222/'); await tp.evaluate(() => localStorage.setItem('kb-prefs', JSON.stringify({ sidebar: false }))); await tp.fill('input[type=email]', 't@x.com'); await tp.fill('input[type=password]', 'senha123'); await tp.click('button[type=submit]');
  await tp.waitForSelector('.card'); await tp.waitForTimeout(400);
  const cdp = await tctx.newCDPSession(tp);
  const mover = fake.db.tasks.find((t) => t.title.startsWith('Início')), fromCol = mover.column_id;
  const cb = await tp.locator(`.card[data-id="${mover.id}"]`).boundingBox(), tb = await tp.locator('.column:nth-child(3) .col-body').boundingBox();
  const tx = tb.x + tb.width / 2, ty = tb.y + 40, sx = cb.x + cb.width / 2, sy = cb.y + cb.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy }] });
  await tp.waitForTimeout(550);
  ok(await tp.evaluate(() => document.body.classList.contains('touch-dragging')), 'toque longo no card inicia o arrasto');
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + ((tx - sx) * i) / 6, y: sy + ((ty - sy) * i) / 6 }] }); await tp.waitForTimeout(40); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await tp.waitForTimeout(700);
  ok(fake.db.tasks.find((t) => t.id === mover.id).column_id === 3 && fromCol !== 3, 'soltar o dedo em outra coluna move a task');
  await tctx.close();

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
