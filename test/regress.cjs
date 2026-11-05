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
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // filtro de prioridade e atalhos
  await p.fill('.column:nth-child(1) .add-input', 'Normal aqui'); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(300);
  await p.fill('.column:nth-child(1) .add-input', 'Urgente aqui !urgente'); await p.press('.column:nth-child(1) .add-input', 'Enter'); await p.waitForTimeout(400);
  const total = await p.locator('.card').count();
  await p.click('.sb-item:has-text("Urgente")'); await p.waitForTimeout(200);
  ok((await p.locator('.card').count()) === 1 && total > 1, 'filtro de prioridade: só as urgentes (' + total + ' -> 1)');
  await p.click('.sb-foot .btn:has-text("Limpar")'); await p.waitForTimeout(200);
  await p.keyboard.press('?'); await p.waitForSelector('.kbd-list'); ok(true, 'tecla ? abre a lista de atalhos'); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
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
