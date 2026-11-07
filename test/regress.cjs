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


  // 1) filtro "Animados" continua depois de escolher um tema
  await p.click('button[title*="Personalizar"], button[aria-label*="Personalizar"]').catch(() => {});
  if (!(await p.locator('.drawer-panel').count())) await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Personalizar/.test(x.title + x.textContent + (x.getAttribute('aria-label') || ''))); b && b.click(); });
  await p.waitForSelector('.drawer-panel'); await p.click('.theme-filter button:has-text("Animados")'); await p.waitForTimeout(150);
  const vis = () => p.evaluate(() => [...document.querySelectorAll('.theme-tile:not(.hidden)')].filter((t) => t.offsetParent).length);
  const before = await vis(); const tile = p.locator('.theme-tile:not(.hidden)').nth(2); await tile.click(); await p.waitForTimeout(400);
  ok((await p.locator('.look-tabs button.on').textContent()) === 'Tema', 'continua na aba Tema após escolher tema animado');
  ok((await p.locator('.theme-filter button.on').textContent()) === 'Animados', 'filtro "Animados" continua ligado');
  ok((await vis()) === before && before > 0 && before < 38, 'lista continua filtrada (' + before + ' temas)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.evaluate(() => KBApp.setPrefs({ theme: 'minimal' }, { refreshSettings: false })); await p.waitForTimeout(150);
  // filtro de prioridade e atalhos
  await p.fill('.column:nth-child(1) .add-input', 'Normal aqui'); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(300);
  await p.fill('.column:nth-child(1) .add-input', 'Urgente aqui !urgente'); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(400);
  const total = await p.locator('.card').count();
  await p.click('.sb-item:has-text("Urgente")'); await p.waitForTimeout(200);
  ok((await p.locator('.card').count()) === 1 && total > 1, 'filtro de prioridade: só as urgentes (' + total + ' -> 1)');
  await p.click('.sb-foot .btn:has-text("Limpar")'); await p.waitForTimeout(200);
  await p.keyboard.press('?'); await p.waitForSelector('.kbd-list'); ok(true, 'tecla ? abre a lista de atalhos'); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // duplicar task pelo menu do cartão
  const nCards = await p.locator('.card').count();
  await p.locator('.card').first().locator('.card-menu').evaluate((e) => e.click()); await p.click('.popover >> text=Duplicar'); await p.waitForTimeout(500);
  ok((await p.locator('.card').count()) === nCards + 1 && (await p.locator('.card-title', { hasText: '(cópia)' }).count()) === 1, 'Duplicar cria a cópia');
  // prazo rápido no menu do cartão
  await p.locator('.card').first().locator('.card-menu').evaluate((e) => e.click()); await p.click('.popover >> text=Prazo: hoje'); await p.waitForTimeout(500);
  ok((await p.locator('.card').first().locator('.due').count()) >= 1, 'Prazo: hoje coloca o prazo no cartão');
  // menu do cartão cabe em tela baixa e rola sem fechar
  await p.setViewportSize({ width: 390, height: 420 }); await p.waitForTimeout(200);
  await p.locator('.card').first().hover(); await p.locator('.card').first().locator('.card-menu').evaluate((e) => e.click()); await p.waitForSelector('.popover');
  const pb = await p.evaluate(() => { const e = document.querySelector('.popover'); const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), innerHeight, e.scrollHeight > e.clientHeight]; });
  ok(pb[0] >= 0 && pb[1] <= pb[2], 'menu do cartão cabe na tela baixa (' + pb.join(',') + ')');
  await p.evaluate(() => { document.querySelector('.popover').scrollTop = 80; }); await p.waitForTimeout(150);
  ok((await p.locator('.popover').count()) === 1, 'rolar o menu não o fecha'); await p.keyboard.press('Escape'); await p.setViewportSize({ width: 1360, height: 860 }); await p.waitForTimeout(200);
  // lixeira: excluir, ver na lixeira e restaurar
  const n0 = await p.locator('.card').count();
  await p.locator('.card').first().locator('.card-menu').evaluate((e) => e.click()); await p.click('.popover >> text=Excluir'); await p.waitForTimeout(500);
  ok((await p.locator('.card').count()) === n0 - 1, 'excluir tira o cartão');
  await p.evaluate(() => KBApp.openTrash()); await p.waitForSelector('.trash-row'); ok((await p.locator('.trash-row').count()) === 1, 'lixeira lista a task excluída');
  await p.click('.trash-row .btn'); await p.waitForTimeout(600); ok((await p.locator('.card').count()) === n0, 'restaurar devolve o cartão ao quadro');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // setas navegam entre cartões
  await p.locator('.column:nth-child(1) .card').first().focus(); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.activeElement.classList.contains('card') && document.activeElement === document.querySelectorAll('.column:nth-child(1) .col-body > .card')[1]), 'seta para baixo vai para o próximo cartão');
  // regra automática + coluna recolhida
  await p.evaluate(async () => { await KBApp.api('PATCH', '/api/columns/3', { collapsed: true }); await KBApp.api('PATCH', '/api/columns/1', { auto_days: 1, auto_to: 3 }); await KBApp.loadBoard(); });
  await p.waitForTimeout(300);
  ok((await p.locator('.column').count()) === 3 && (await p.locator('.show-hidden').count()) === 1, 'coluna recolhida some do quadro e aparece o botão "Mostrar"');
  await p.click('.show-hidden'); await p.waitForTimeout(250); ok((await p.locator('.column').count()) === 4, '"Mostrar" revela a coluna recolhida');
  fake.db.tasks.filter((t) => t.column_id === 1).forEach((t) => (t.column_since = new Date(Date.now() - 3 * 864e5).toISOString()));
  const moved = await p.evaluate(() => KBApp.api('POST', '/api/rules/apply')); await p.evaluate(() => KBApp.loadBoard()); await p.waitForTimeout(400);
  ok(moved.moved >= 1 && (await p.locator('.column:nth-child(1) .card').count()) === 0, 'regra move as tasks antigas para a coluna de destino (' + moved.moved + ')');
  await p.evaluate(async () => { await KBApp.api('PATCH', '/api/columns/3', { collapsed: false }); await KBApp.api('PATCH', '/api/columns/1', { auto_days: null, auto_to: null }); await KBApp.loadBoard(); });
  // foto de perfil
  await p.evaluate(() => KBApp.openSettings('account')); await p.waitForSelector('.drawer-panel'); await p.click('.tabs button:has-text("Conta")').catch(() => {}); await p.waitForTimeout(300);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  await p.setInputFiles('.photo-row ~ input[type=file], .field input[accept^="image"]', { name: 'eu.png', mimeType: 'image/png', buffer: png }); await p.waitForTimeout(1200);
  ok(!!fake.db.profiles[0].avatar_url && Object.keys(fake.db.files).some((k) => k.startsWith('avatars/')), 'foto de perfil enviada e salva no perfil');
  ok((await p.locator('.topbar .avatar.has-img img, .photo-row .avatar.has-img img').count()) >= 1, 'avatar mostra a foto');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // token de API
  await p.evaluate(() => KBApp.openSettings('account')); await p.waitForSelector('.drawer-panel'); await p.click('.tabs button:has-text("Conta")').catch(() => {}); await p.waitForTimeout(300);
  await p.click('button:has-text("Gerar token")'); await p.waitForTimeout(400); await p.locator('.overlay').last().locator('input').first().fill('VS Code'); await p.keyboard.press('Enter'); await p.waitForSelector('input[aria-label="Token"]');
  const tok = await p.inputValue('input[aria-label="Token"]');
  ok(/^kb_[0-9a-f]{48}$/.test(tok) && fake.db.api_tokens.length === 1 && fake.db.api_tokens[0].token_hash !== tok && fake.db.api_tokens[0].token_hash.length === 64, 'token gerado (kb_…) e só o hash vai para o banco');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // anotações gerais e da task
  await p.evaluate(() => KBApp.openNotes()); await p.waitForSelector('.notes-wrap'); await p.click('.notes-side .btn:has-text("Nova")'); await p.waitForTimeout(300);
  await p.fill('.notes-editor input', 'Ideias'); await p.fill('.notes-editor textarea', 'comprar domínio'); await p.waitForTimeout(900);
  ok(fake.db.notes.length === 1 && fake.db.notes[0].title === 'Ideias' && fake.db.notes[0].body === 'comprar domínio', 'anotação geral é criada e salva sozinha');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  await p.locator('.card').first().click(); await p.waitForSelector('.modal'); await p.fill('textarea[placeholder^="Anotações desta"]', 'rodar npm test'); await p.locator('textarea[placeholder^="Anotações desta"]').blur(); await p.waitForTimeout(500);
  ok(fake.db.tasks.some((t) => t.notes === 'rodar npm test'), 'anotações da task são salvas'); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // Popover Form: + da coluna abre mini formulário e cria
  const isVis = (q) => p.evaluate((q) => { const e = document.querySelector(q); return !!e && getComputedStyle(e).display !== 'none' && e.offsetParent !== null; }, q);
  ok((await isVis('.column .add-input')) && !(await isVis('.col-quick')), 'tema padrão usa o campo de texto no rodapé (sem botão +)');
  await p.evaluate(() => KBApp.setPrefs({ addStyle: 'popover' }, { refreshSettings: false })); await p.waitForTimeout(150);
  ok(!(await isVis('.column .add-input')) && (await isVis('.col-quick')), 'estilo "Botão +" esconde o campo do rodapé e mostra o botão');
  await p.evaluate(() => KBApp.setPrefs({ theme: 'aurora', addStyle: 'auto' }, { refreshSettings: false })); await p.waitForTimeout(150);
  ok(!(await isVis('.column .add-input')) && (await isVis('.col-quick')), 'tema suave (Aurora) usa o botão + por padrão');
  await p.evaluate(() => KBApp.setPrefs({ theme: 'minimal', addStyle: 'both' }, { refreshSettings: false })); await p.waitForTimeout(150);
  const antes = await p.locator('.card').count();
  await p.locator('.column:nth-child(1) .col-quick').click(); await p.waitForSelector('.qform');
  await p.fill('.qform input[type=text], .qform input:not([type])', 'Criada pelo formulário rápido'); await p.locator('.qform .seg button', { hasText: 'Alta' }).click(); await p.click('.qform .btn.primary'); await p.waitForTimeout(900);
  ok((await p.locator('.card').count()) === antes + 1 && fake.db.tasks.some((t) => t.title === 'Criada pelo formulário rápido' && t.priority === 2), 'Popover Form cria a task com prioridade');
  ok((await p.locator('.qform').count()) === 0, 'formulário rápido fecha sozinho depois de criar');
  await p.evaluate(() => KBApp.setPrefs({ addStyle: 'auto' }, { refreshSettings: false }));
  // Expandable Card: abre no lugar e marca item do checklist
  await p.evaluate(() => KBApp.api('PATCH', `/api/tasks/${KBApp.S.tasks[0].id}`, { checklist: [{ text: 'item um', done: false }, { text: 'item dois', done: true }], description: 'descrição longa do cartão' }).then(() => KBApp.loadBoard())); await p.waitForTimeout(500);
  const card0 = p.locator('.card').filter({ hasText: 'item um' }).first().or(p.locator('.card').first());
  await p.locator('.card .card-exp').first().click({ force: true }); await p.waitForTimeout(350);
  ok((await p.locator('.card.expanded').count()) === 1 && (await p.locator('.card.expanded .cm-check input').count()) === 2, 'cartão expande no lugar e mostra o checklist');
  await p.locator('.card.expanded .cm-check input').first().check(); await p.waitForTimeout(500);
  ok(fake.db.tasks.some((t) => (t.checklist || []).filter((i) => i.done).length === 2), 'marcar item no cartão expandido salva');
  // Border Beam: opt-in
  await p.evaluate(() => KBApp.setPrefs({ prioMark: 'beam', prioWho: 'high' }, { refreshSettings: false })); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const c = document.querySelector('.card[data-p="2"], .card[data-p="3"]'); if (!c) return true; const st = getComputedStyle(c, '::after'); return st.backgroundImage.includes('conic-gradient') && parseFloat(st.width) > 100 && parseFloat(st.height) > 20; }), 'Border Beam desenha o feixe nos cartões de prioridade alta');
  await p.evaluate(() => KBApp.setPrefs({ prioMark: 'chip' }, { refreshSettings: false }));
  // app instalado: compartilhar para o Runtime e atalho Nova task
  await p.goto('http://localhost:3222/?title=Ler&text=artigo%20sobre%20kanban&url=https://x.com/a'); await p.waitForSelector('.big-input', { timeout: 8000 });
  ok((await p.inputValue('.big-input')).includes('Ler') && (await p.inputValue('.big-input')).includes('artigo sobre kanban'), 'compartilhar para o Runtime abre "Nova task" já preenchida');
  ok(!/title=/.test(await p.evaluate(() => location.search)), 'o endereço é limpo depois de abrir');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  await p.goto('http://localhost:3222/?new=1'); await p.waitForSelector('.big-input', { timeout: 8000 }); ok(true, 'atalho ?new=1 abre "Nova task"'); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  const tc = await p.evaluate(() => document.querySelector('meta[name="theme-color"]').content); ok(/^#[0-9a-f]{6}$/.test(tc), 'cor da barra do app segue o tema (' + tc + ')');
  const man = await p.evaluate(() => fetch('manifest.webmanifest').then((r) => r.json())); ok(man.shortcuts && man.share_target && man.id, 'manifesto com atalho, compartilhar e id');
  // 2) sessão sobrevive a recarregar, mesmo se a leitura do perfil falhar na 1ª vez
  let n = 0;
  await p.route('**/rest/v1/profiles?*', (r) => { if (n++ < 1) return r.abort(); return fake.handle(r); });
  await p.reload(); await p.waitForTimeout(2600);
  ok((await p.locator('.board .column').count()) === 4 && (await p.locator('.auth-card').count()) === 0, 'recarregar com falha momentânea NÃO manda para o login (tentativas: ' + n + ')');
  await p.unroute('**/rest/v1/profiles?*');
  // 3) viewport mobile <-> desktop sem sair
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(300); await p.reload(); await p.waitForSelector('.board .column');
  await p.setViewportSize({ width: 1360, height: 860 }); await p.waitForTimeout(300); await p.reload(); await p.waitForSelector('.board .column');
  ok(true, 'trocar de largura e recarregar continua logado');
  console.log('erros JS:', errors.length ? errors.join('\n') : 'nenhum');
  await b.close(); srv.close(); process.exit(fails || errors.length ? 1 : 0);
})();
