// Teste de interface: abre o site num Chromium com o supabase-js real, mas falando com uma API Supabase FALSA
// (test/fake-supabase.cjs). Valida a interface e as consultas do backend.js; não substitui testar no banco real.
//   npm i --no-save playwright @supabase/supabase-js@2.45.4 && npx playwright install chromium && node test/e2e.cjs
const { chromium } = require('playwright');
const fs = require('fs'), http = require('http'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..', 'public'), OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-shots-')) + '/';
const UMD = fs.readFileSync(process.env.SUPABASE_UMD || require.resolve('@supabase/supabase-js/dist/umd/supabase.js'), 'utf8');
const fake = require('./fake-supabase.cjs')(); fake.enableProjects();
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

  await p.goto('http://localhost:3222/'); await p.waitForSelector('.auth-card');
  await p.fill('input[type=email]', 't@x.com'); await p.fill('input[type=password]', 'senha123'); await p.click('button[type=submit]');
  await p.waitForSelector('.board .column');
  ok((await p.locator('#brand .brand-name').textContent()) === 'Geral' && (await p.locator('#brand.as-btn').count()) === 1, 'topo mostra o projeto atual (Geral) como seletor');
  await p.fill('.column:nth-child(1) .add-input', 'Task do Geral'); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(400);
  ok(fake.db.tasks[0].project_id === 1, 'task criada no projeto atual');
  // criar projeto novo pelo menu
  await p.click('#brand'); await p.click('.popover >> text=Novo projeto'); await p.waitForSelector('.modal input'); await p.fill('.modal input', 'Locativo'); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
  ok((await p.locator('#brand .brand-name').textContent()) === 'Locativo', 'projeto novo vira o atual');
  ok((await p.locator('.column').count()) === 4 && (await p.locator('.card').count()) === 0, 'projeto novo tem 4 colunas e nenhuma task do outro projeto');
  await p.fill('.column:nth-child(1) .add-input', 'Task da Locativo'); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(400);
  ok(fake.db.tasks.find((t) => t.title === 'Task da Locativo').project_id === 2, 'task nova entra no projeto novo');
  // voltar ao Geral: só a task dele
  await p.click('#brand'); await p.click('.popover >> text=Geral'); await p.waitForTimeout(700);
  ok((await p.locator('.card').count()) === 1 && (await p.locator('.card-title').textContent()) === 'Task do Geral', 'trocar de projeto mostra só as tasks dele');
  // convidar pelo modal
  await p.click('#brand'); await p.click('.popover >> text=Membros e configurações'); await p.waitForSelector('.member-row');
  await p.fill('.proj-body input[type=email]', 'm@x.com'); await p.click('.proj-body button:has-text("Convidar")'); await p.waitForTimeout(600);
  ok(fake.db.project_invites.length === 1, 'convite criado para a pessoa pelo e-mail');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // permissão de convidar: Maria (membro) ganha "pode convidar" pelo dono
  await p.click('#brand'); await p.click('.popover >> text=Membros e configurações'); await p.waitForSelector('.member-row');
  await p.locator('.member-row', { hasText: 'Maria' }).locator('input[type=checkbox]').check(); await p.waitForTimeout(700);
  ok(fake.db.project_members.find((m) => m.user_id === fake.uid2 && m.project_id === 1).can_invite === true, 'dono libera "pode convidar" para um membro');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // convite recebido para o projeto Locativo (Maria convida Thiago? simulamos um convite novo para Thiago em um projeto da Maria)
  fake.db.projects.push({ id: 9, name: 'Academia', owner_id: fake.uid2, created_at: new Date().toISOString() });
  fake.db.project_members.push({ project_id: 9, user_id: fake.uid2, role: 'owner', created_at: new Date().toISOString() });
  fake.db.project_invites.push({ id: 50, project_id: 9, invitee_id: fake.uid, invited_by: fake.uid2 });
  await p.evaluate(() => KBApp.loadBoard()); await p.waitForTimeout(500);
  ok((await p.locator('#brand .brand-dot').count()) === 1, 'convite pendente aparece como bolinha no topo');
  await p.click('#brand'); await p.click('.popover >> text=Aceitar convite: Academia'); await p.waitForTimeout(900);
  ok(fake.db.project_members.some((m) => m.project_id === 9 && m.user_id === fake.uid), 'aceitar convite entra no projeto');
  // sem nenhum projeto: tela de boas-vindas
  fake.db.project_members = fake.db.project_members.filter((m) => m.user_id !== fake.uid);
  await p.evaluate(() => KBApp.loadBoard()); await p.waitForTimeout(600);
  ok((await p.locator('.no-project').count()) === 1, 'sem projeto: aparece a tela para criar o primeiro');
  console.log('erros JS:', errors.length ? errors.join('\n') : 'nenhum');
  await b.close(); srv.close(); process.exit(fails || errors.length ? 1 : 0);
})();
